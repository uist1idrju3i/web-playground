'use strict';
/* global importScripts */

// One brain, one VM: a dedicated worker boots a vendored CRuby (WASI) instance,
// loads pong_kit.rb plus a single brain, and answers Battle.tick(state) calls.
// Kept dependency-free so the same file serves the player's and the enemy's VM.

const WASM_URL = '/ruby-wasm/ruby+stdlib.wasm.gz';
const UMD_URL = '/ruby-wasm/vendor/browser.umd.js';
const KIT_URL = '/pong-battle/ruby/pong_kit.rb';

const textDecoder = new TextDecoder();

let rubyModule = null;
let vm = null;
let wasi = null;
const fdOffsets = { 1: 0, 2: 0 };

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
    // Best-effort; a broken VM must not mask the real error.
  }
}

function drainStdio() {
  flushStdio();
  return {
    stdout: drainFd(1).slice(0, 4000),
    stderr: drainFd(2).slice(0, 4000),
  };
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
  const decompressed = body.pipeThrough(new DecompressionStream('gzip'));
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

async function boot() {
  const started = performance.now();
  if (!rubyModule) importScripts(UMD_URL);
  const compile = await compileRubyModule((stage) =>
    self.postMessage({ op: 'boot-progress', stage }),
  );
  const instantiateStart = performance.now();
  const factory = self['ruby-wasm-wasi'];
  if (!factory?.DefaultRubyVM) throw new Error('The vendored ruby-wasm-wasi bundle did not load.');
  const instance = await factory.DefaultRubyVM(rubyModule, { consolePrint: false });
  const instantiateMs = performance.now() - instantiateStart;
  vm = instance.vm;
  wasi = instance.wasi;
  fdOffsets[1] = 0;
  fdOffsets[2] = 0;
  self.postMessage({ op: 'boot-progress', stage: 'sdk' });
  const kitResponse = await fetch(KIT_URL);
  if (!kitResponse.ok) throw new Error(`SDK download failed with HTTP ${kitResponse.status}.`);
  const kit = await kitResponse.text();
  vm.eval(kit);
  drainStdio();
  return {
    description: vm.eval('RUBY_DESCRIPTION').toString(),
    gzBytes: compile.gzBytes,
    fetchMs: Math.round(compile.fetchMs),
    compileMs: Math.round(compile.compileMs),
    instantiateMs: Math.round(instantiateMs),
    totalMs: Math.round(performance.now() - started),
    streamingPath: compile.streamingPath,
  };
}

function evalJson(rubyCall) {
  const value = vm.eval(rubyCall);
  const text = value.toString();
  return JSON.parse(text);
}

// Embed arbitrary text as a Ruby single-quoted literal (no interpolation —
// double quotes would let a `#{}` in the source corrupt the call).
function rubyString(text) {
  return `'${String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")}'`;
}

async function handle(message) {
  switch (message.op) {
    case 'boot':
      return { ok: true, info: await boot() };
    case 'load': {
      const started = performance.now();
      const result = evalJson(`Battle.load_brain(${rubyString(message.source)})`);
      const stdio = drainStdio();
      return { ...result, cpu_ms: round3(performance.now() - started), ...stdio };
    }
    case 'tick': {
      const started = performance.now();
      const result = evalJson(`Battle.tick(${rubyString(message.state)})`);
      const stdio = drainStdio();
      return {
        ok: true,
        ...result,
        cpu_ms: round3(performance.now() - started),
        ...stdio,
      };
    }
    default:
      return { ok: false, error: { class: 'Error', message: `Unknown op: ${message.op}` } };
  }
}

function round3(v) {
  return Math.round(v * 1000) / 1000;
}

let opChain = Promise.resolve();

self.addEventListener('message', async (event) => {
  const { id, op } = event.data ?? {};
  const run = opChain.then(() => handle({ op, ...event.data }));
  opChain = run.catch(() => {});
  try {
    const result = await run;
    self.postMessage({ id, ...result });
  } catch (error) {
    self.postMessage({
      id,
      ok: false,
      error: {
        class: error?.constructor?.name ?? 'Error',
        message: String(error?.message ?? error).slice(0, 2048),
      },
    });
  }
});
