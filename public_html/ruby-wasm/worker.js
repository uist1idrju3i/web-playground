'use strict';
/* global importScripts */

// Ruby VM host: boots @ruby/3.4-wasm-wasi inside a dedicated worker so that
// long-running or blocking evals never freeze the page and can be terminated.

const WASM_URL = '/ruby-wasm/ruby+stdlib.wasm.gz';
const UMD_URL = '/ruby-wasm/vendor/browser.umd.js';
const PRELUDE_URL = '/ruby-wasm/prelude.rb';
const JS_COMPAT_URL = '/ruby-wasm/js-compat.rb';

const textDecoder = new TextDecoder();
const textEncoder = new TextEncoder();

let rubyModule = null;
let vm = null;
let wasi = null;
let FileCtor = null;
const fdOffsets = { 1: 0, 2: 0 };

// ---- Main-thread DOM bridge ----
// The VM lives in this worker where `document` does not exist. Page-facing
// calls go through self.__dom and are forwarded to dom-bridge.js on the main
// thread. Object results come back as opaque "h:<n>" handles. Ruby procs passed
// to on/raf become JS functions stored here and are re-entered when the main
// thread reports an event or frame.
let bridgeSeq = 0;
const bridgePending = new Map();
const bridgeProcs = new Map();
let procSeq = 0;
let vmBusy = 0;
const pendingCallbacks = [];
const latestRaf = new Map();

function bridgeRequest(op, args) {
  const reqId = ++bridgeSeq;
  return new Promise((resolve, reject) => {
    bridgePending.set(reqId, { resolve, reject });
    self.postMessage({ __rbDom: true, reqId, op, args });
  });
}

function bridgeNotify(op, args) {
  // Fire-and-forget: we still tag a reqId so main can report failures back.
  self.postMessage({ __rbDom: true, reqId: ++bridgeSeq, notify: true, op, args });
}

function normalizeHandle(value) {
  return value && typeof value === 'object' && typeof value.__h === 'string' ? value.__h : value;
}

self.__dom = {
  qs: (sel) => bridgeRequest('qs', [sel]).then(normalizeHandle),
  call: (handle, method, ...args) =>
    bridgeRequest('call', [handle, String(method), ...args]).then(normalizeHandle),
  get: (handle, key) => bridgeRequest('get', [handle, String(key)]).then(normalizeHandle),
  set: (handle, key, value) => {
    bridgeNotify('set', [handle, String(key), value]);
    return undefined;
  },
  text: (sel, value) => {
    bridgeNotify('text', [sel, value]);
    return undefined;
  },
  batch: (opsJson) =>
    bridgeRequest('batch', [String(opsJson)]).then((results) =>
      Array.isArray(results) ? results.map(normalizeHandle) : results,
    ),
  on: (sel, ev, fn) => {
    const procId = `p:${++procSeq}`;
    bridgeProcs.set(procId, fn);
    bridgeNotify('on', [sel, ev, procId]);
    return procId;
  },
  raf: (fn) => {
    const procId = `p:${++procSeq}`;
    bridgeProcs.set(procId, fn);
    bridgeNotify('raf', [procId]);
    return procId;
  },
  off: (procId) => {
    bridgeProcs.delete(procId);
    bridgeNotify('off', [procId]);
    return undefined;
  },
  audio: (samplesJson, rate) => {
    bridgeNotify('audio', [String(samplesJson), rate]);
    return undefined;
  },
  reset: () => {
    bridgeProcs.clear();
    bridgeNotify('reset', []);
    return undefined;
  },
};

function dispatchProc(procId, arg) {
  const fn = bridgeProcs.get(procId);
  if (!fn) return;
  try {
    fn(arg);
  } catch (error) {
    self.postMessage({
      type: 'bridge-callback-error',
      message: truncate(error?.message ?? String(error), 1024),
    });
  }
}

function flushCallbacks() {
  while (pendingCallbacks.length) {
    const { procId, arg } = pendingCallbacks.shift();
    dispatchProc(procId, arg);
  }
  for (const [procId, arg] of latestRaf) {
    dispatchProc(procId, arg);
  }
  latestRaf.clear();
}

function handleBridgeMessage(data) {
  if (data.reqId) {
    const pending = bridgePending.get(data.reqId);
    if (pending) {
      bridgePending.delete(data.reqId);
      if (data.ok) pending.resolve(normalizeHandle(data.result));
      else pending.reject(new Error(data.error ?? 'DOM bridge call failed.'));
    } else if (!data.ok) {
      self.postMessage({
        type: 'bridge-op-error',
        op: data.op,
        message: truncate(String(data.error ?? 'DOM bridge call failed.'), 1024),
      });
    }
    return;
  }
  // Event/rAF callbacks must not re-enter the VM while an eval is running.
  if (vmBusy > 0) {
    if (data.kind === 'raf') latestRaf.set(data.procId, data.arg);
    else pendingCallbacks.push({ procId: data.procId, arg: data.arg });
    return;
  }
  dispatchProc(data.procId, data.arg);
}

function resetDrain() {
  fdOffsets[1] = 0;
  fdOffsets[2] = 0;
}

function drainFd(fd) {
  const data = wasi.fds[fd].file.data;
  const text = textDecoder.decode(data.subarray(fdOffsets[fd]));
  fdOffsets[fd] = data.length;
  return text;
}

function flushStdio() {
  try {
    vm.eval('$stdout.flush; $stderr.flush; nil');
  } catch {
    // Flushing is best-effort; a broken VM should not mask the real error.
  }
}

function truncate(text, limit = 4096) {
  const value = String(text);
  return value.length > limit ? `${value.slice(0, limit)}…` : value;
}

function safeJs(value) {
  if (value === undefined) return { kind: 'undefined' };
  try {
    JSON.stringify(value);
    return { kind: 'json', value };
  } catch {
    return { kind: 'opaque', value: truncate(String(value)) };
  }
}

function describeResult(result) {
  let className = null;
  try {
    className = result.call('class').call('to_s').toString();
  } catch {
    className = null;
  }
  if (!className) {
    try {
      className = `JS::Object(${result.call('typeof').toString()})`;
    } catch {
      className = 'JS::Object';
    }
  }
  let js;
  try {
    js = safeJs(result.toJS());
  } catch {
    js = { kind: 'opaque', value: '(unconvertible)' };
  }
  let value;
  try {
    value = truncate(result.toString());
  } catch {
    value = '(unprintable result)';
  }
  return { className, js, value };
}

async function collect(run) {
  vmBusy += 1;
  let outcome;
  try {
    outcome = { ok: true, ...describeResult(await run()) };
  } catch (error) {
    outcome = {
      ok: false,
      error: {
        name: error?.constructor?.name ?? 'Error',
        message: truncate(error?.message ?? String(error), 2048),
      },
    };
  } finally {
    vmBusy -= 1;
  }
  flushStdio();
  outcome.stdout = truncate(drainFd(1));
  outcome.stderr = truncate(drainFd(2));
  flushCallbacks();
  return outcome;
}

async function compileRubyModule(progress) {
  if (rubyModule) return rubyModule;
  progress('fetch');
  const fetchStart = performance.now();
  const response = await fetch(WASM_URL);
  if (!response.ok) throw new Error(`Runtime download failed with HTTP ${response.status}.`);
  const gzBytes = Number(response.headers.get('content-length')) || null;
  const body = response.body;
  if (!body) throw new Error('Runtime download returned no body stream.');
  let decompressed;
  try {
    decompressed = body.pipeThrough(new DecompressionStream('gzip'));
  } catch (error) {
    throw new Error(`gzip decompression is unavailable: ${error?.message ?? error}`);
  }
  const fetchMs = performance.now() - fetchStart;
  progress('compile');
  const compileStart = performance.now();
  let streamingPath = 'streaming';
  try {
    rubyModule = await WebAssembly.compileStreaming(
      new Response(decompressed, { headers: { 'content-type': 'application/wasm' } }),
    );
  } catch {
    streamingPath = 'buffered';
    rubyModule = await WebAssembly.compile(await new Response(decompressed).arrayBuffer());
  }
  const compileMs = performance.now() - compileStart;
  return { module: rubyModule, gzBytes, fetchMs, compileMs, streamingPath };
}

async function instantiateModule({ env } = {}) {
  const factory = self['ruby-wasm-wasi'];
  if (!factory?.DefaultRubyVM) throw new Error('The vendored ruby-wasm-wasi bundle did not load.');
  return factory.DefaultRubyVM(rubyModule, { consolePrint: false, env });
}

async function boot(options = {}) {
  const started = performance.now();
  if (!rubyModule) {
    importScripts(UMD_URL);
  }
  const compile = await compileRubyModule((stage) =>
    self.postMessage({ op: 'boot-progress', stage }),
  );
  const instantiateStart = performance.now();
  const instance = await instantiateModule({ env: options.env });
  const instantiateMs = performance.now() - instantiateStart;
  if (!options.env) {
    vm = instance.vm;
    wasi = instance.wasi;
    FileCtor = wasi.fds[0].file.constructor;
    resetDrain();
    self.__rubyHost = {
      double: (n) => n * 2,
      describe: (value) => `host saw ${JSON.stringify(value)}`,
    };
    self.postMessage({ op: 'boot-progress', stage: 'prelude' });
    const preludeResponse = await fetch(PRELUDE_URL);
    if (!preludeResponse.ok) {
      throw new Error(`Prelude download failed with HTTP ${preludeResponse.status}.`);
    }
    const prelude = await preludeResponse.text();
    const compatResponse = await fetch(JS_COMPAT_URL);
    if (!compatResponse.ok) {
      throw new Error(`js-compat download failed with HTTP ${compatResponse.status}.`);
    }
    const compat = await compatResponse.text();
    // `require "js"` cannot run under this page's CSP (its loader calls
    // JS.eval at load time, which needs unsafe-eval). js-compat.rb reimplements
    // the loader without string eval; sync eval installs it before evalAsync
    // starts depending on JS.__eval_async_rb.
    vm.eval(compat);
    vm.eval(prelude);
  }
  const target = options.env ? instance.vm : vm;
  const info = {
    description: target.eval('RUBY_DESCRIPTION').toString(),
    platform: target.eval('RUBY_PLATFORM').toString(),
    engine: target.eval('RUBY_ENGINE').toString(),
    version: target.eval('RUBY_VERSION').toString(),
    patchlevel: target.eval('RUBY_PATCHLEVEL').toString(),
  };
  return {
    ...info,
    gzBytes: compile.gzBytes,
    fetchMs: Math.round(compile.fetchMs),
    compileMs: Math.round(compile.compileMs),
    instantiateMs: Math.round(instantiateMs),
    totalMs: Math.round(performance.now() - started),
    streamingPath: compile.streamingPath,
    env: options.env ?? null,
  };
}

function fsRoot() {
  return wasi.fds[3].dir;
}

function fsNode(path) {
  const parts = String(path).split('/').filter(Boolean);
  let node = fsRoot();
  for (const part of parts) {
    if (!(node?.contents instanceof Map)) return null;
    node = node.contents.get(part);
    if (!node) return null;
  }
  return node;
}

function fsList() {
  const entries = [];
  const walk = (dir, prefix) => {
    for (const [name, node] of dir.contents) {
      const path = `${prefix}/${name}`;
      if (node?.contents instanceof Map) {
        entries.push({ path, type: 'directory' });
        walk(node, path);
      } else if (node?.data instanceof Uint8Array) {
        entries.push({ path, type: 'file', size: node.data.length });
      }
    }
  };
  walk(fsRoot(), '');
  return entries;
}

function fsRead(path) {
  const node = fsNode(path);
  if (!(node?.data instanceof Uint8Array)) return { ok: false, error: `No file at ${path}.` };
  return {
    ok: true,
    content: truncate(textDecoder.decode(node.data), 8192),
    size: node.data.length,
  };
}

function fsWrite(path, content) {
  const parts = String(path).split('/').filter(Boolean);
  if (!parts.length) return { ok: false, error: 'A file name is required.' };
  const name = parts.pop();
  let dir = fsRoot();
  for (const part of parts) {
    const next = dir.contents.get(part);
    if (!(next?.contents instanceof Map)) return { ok: false, error: `No directory at /${part}.` };
    dir = next;
  }
  dir.contents.set(name, new FileCtor(textEncoder.encode(content)));
  return { ok: true, size: dir.contents.get(name).data.length };
}

function writeStdin(text) {
  wasi.fds[0].file = new FileCtor(textEncoder.encode(text));
  wasi.fds[0].file_pos = 0n;
  return { ok: true };
}

async function envBoot(env) {
  const { vm: vm2 } = await instantiateModule({ env });
  const envValue = vm2.eval('ENV["RUBY_WASM_ENV"]').toString();
  const isolation = vm2.eval('defined?(PLAYGROUND_STATE).inspect').toString();
  return { envValue, isolation };
}

async function handle(message) {
  switch (message.op) {
    case 'boot': {
      const info = await boot(message.options ?? {});
      return { ok: true, info };
    }
    case 'eval':
      return collect(() => vm.eval(String(message.code ?? '')));
    case 'evalAsync':
      return collect(() => vm.evalAsync(String(message.code ?? '')));
    case 'wrapCall': {
      const target = vm.eval(String(message.code ?? ''));
      const wrapped = vm.wrap(message.arg);
      return collect(() => target.call(String(message.method ?? 'call'), wrapped));
    }
    case 'callAsync': {
      const target = vm.eval(String(message.code ?? ''));
      return collect(() =>
        target.callAsync(String(message.method ?? 'call'), ...(message.args ?? [])),
      );
    }
    case 'stdin':
      return writeStdin(String(message.text ?? ''));
    case 'dom-reset': {
      bridgeProcs.clear();
      pendingCallbacks.length = 0;
      latestRaf.clear();
      bridgeNotify('reset', []);
      // Handles are gone on the main side; let the prelude re-resolve them.
      try {
        await vm.evalAsync('Playground.rebind()');
      } catch (error) {
        return { ok: false, error: { name: 'Error', message: String(error?.message ?? error) } };
      }
      return { ok: true };
    }
    case 'fs-list':
      return { ok: true, entries: fsList() };
    case 'fs-read':
      return fsRead(message.path);
    case 'fs-write':
      return fsWrite(message.path, String(message.content ?? ''));
    case 'env-boot':
      return { ok: true, ...(await envBoot(message.env ?? {})) };
    default:
      return { ok: false, error: { name: 'Error', message: `Unknown op: ${message.op}` } };
  }
}

let opChain = Promise.resolve();

self.addEventListener('message', async (event) => {
  const data = event.data ?? {};
  if (data.__rbDom) {
    handleBridgeMessage(data);
    return;
  }
  const { id, op } = data;
  // Serialize VM ops: a second eval while one is in flight must wait, and
  // dom-reset rebinds handles through evalAsync so it needs the VM idle.
  const run = opChain.then(() => handle({ op, ...data }));
  opChain = run.catch(() => {});
  try {
    const result = await run;
    self.postMessage({ id, ...result });
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: {
        name: error?.constructor?.name ?? 'Error',
        message: truncate(error?.message ?? String(error), 2048),
      },
    });
  }
});
