import { checkRequirements } from '/library/js/requirements.js';
import { createDomBridge } from '/ruby-wasm/dom-bridge.js';
import { snippetGroups } from '/ruby-wasm/snippets.js';

const els = {
  requirements: document.querySelector('#requirements'),
  loadError: document.querySelector('#load-error'),
  bootStatus: document.querySelector('#boot-status'),
  bootSteps: [...document.querySelectorAll('#boot-steps li')],
  bootMetrics: document.querySelector('#boot-metrics'),
  gallery: document.querySelector('#snippet-gallery'),
  editor: document.querySelector('#code-editor'),
  runButton: document.querySelector('#run-button'),
  killButton: document.querySelector('#kill-button'),
  restartButton: document.querySelector('#restart-button'),
  shareButton: document.querySelector('#share-button'),
  vmState: document.querySelector('#vm-state'),
  modePicker: document.querySelector('#mode-picker'),
  stdinBox: document.querySelector('#stdin-box'),
  irbLog: document.querySelector('#irb-log'),
  clearLog: document.querySelector('#clear-log'),
  resetStage: document.querySelector('#reset-stage'),
  stageCanvas: document.querySelector('#stage-canvas'),
  stageOut: document.querySelector('#stage-out'),
  runAll: document.querySelector('#run-all'),
  featureList: document.querySelector('#feature-list'),
  fsRefresh: document.querySelector('#fs-refresh'),
  fsTree: document.querySelector('#fs-tree'),
  fsView: document.querySelector('#fs-view'),
};

const requirementState = await checkRequirements({
  required: ['fetch', 'es-modules', 'webassembly', 'web-workers', 'compression-streams'],
  optional: ['webmcp', 'web-audio', 'wasm-streaming'],
  container: els.requirements,
});

function failLoad(message) {
  els.loadError.textContent = message;
  els.loadError.hidden = false;
  setVmState('dead', 'unavailable');
  document.body.dataset.appReady = 'true';
}

if (!requirementState.ok) {
  failLoad('This browser lacks a required capability for the Ruby VM. See the checks above.');
  throw new Error('requirements unmet');
}

/* ---------- worker host ---------- */

let worker = null;
let bridge = null;
let reqSeq = 0;
const pending = new Map();
let state = 'booting'; // booting | ready | running | dead
let runCount = 0;
const commandHistory = [];
let historyIndex = -1;
let runStartedAt = 0;
let runTimer = null;

function setVmState(next, label) {
  state = next;
  const names = {
    booting: 'booting…',
    ready: 'ready',
    running: 'running',
    dead: 'VM stopped',
  };
  els.vmState.textContent = label ?? names[next] ?? next;
  els.vmState.className = `status-chip ${
    next === 'ready'
      ? 'status-supported'
      : next === 'running'
        ? 'status-running'
        : next === 'dead'
          ? 'status-dead'
          : 'status-info'
  }`;
  els.runButton.disabled = next !== 'ready';
  els.shareButton.disabled = next === 'dead' || next === 'booting';
  els.killButton.hidden = next !== 'running';
  els.killButton.disabled = next !== 'running';
  els.restartButton.hidden = next !== 'dead';
  els.runAll.disabled = next !== 'ready' && next !== 'running';
  els.fsRefresh.disabled = next !== 'ready';
  els.modePicker
    .querySelectorAll('input')
    .forEach((input) => (input.disabled = next === 'running' || next === 'dead'));
}

function bootStage(stage) {
  const order = ['fetch', 'compile', 'instantiate', 'prelude', 'ready'];
  const index = order.indexOf(stage);
  for (const li of els.bootSteps) {
    const liIndex = order.indexOf(li.dataset.stage);
    li.classList.toggle('is-done', liIndex < index);
    li.classList.toggle('is-active', liIndex === index);
  }
  els.bootStatus.textContent = stage;
}

function send(op, extra = {}) {
  const id = ++reqSeq;
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve, reject });
    worker.postMessage({ id, op, ...extra });
  });
}

function spawnWorker() {
  worker = new Worker('/ruby-wasm/worker.js');
  bridge = createDomBridge(worker);
  worker.addEventListener('message', (event) => {
    const data = event.data ?? {};
    if (data.__rbDom) {
      bridge.handle(data);
      return;
    }
    if (data.op === 'boot-progress') {
      bootStage(data.stage);
      return;
    }
    if (data.type === 'bridge-callback-error') {
      appendNote(`event handler error: ${data.message}`, 'error');
      return;
    }
    if (data.type === 'bridge-op-error') {
      appendNote(`bridge ${data.op} failed: ${data.message}`, 'error');
      return;
    }
    const { id } = data;
    const settle = pending.get(id);
    if (settle) {
      pending.delete(id);
      settle.resolve(data);
    }
  });
}

/* ---------- boot ---------- */

async function boot() {
  setVmState('booting');
  els.bootStatus.textContent = 'booting';
  els.bootStatus.className = 'status-chip status-running';
  try {
    const { ok, info, error } = await send('boot');
    if (!ok) throw new Error(error?.message ?? 'boot failed');
    bootStage('ready');
    els.bootStatus.textContent = 'ready';
    els.bootStatus.className = 'status-chip status-supported';
    renderBootMetrics(info);
    setVmState('ready');
    els.irbLog.replaceChildren();
    refreshFs();
    // Load the demo snippet so the first click already paints something.
    if (!code().trim()) loadSnippet('rainbow');
  } catch (error) {
    els.bootStatus.textContent = 'failed';
    els.bootStatus.className = 'status-chip status-dead';
    failLoad(`Ruby VM could not start: ${error?.message ?? error}`);
  }
}

function renderBootMetrics(info) {
  const rows = [
    ['RUBY_DESCRIPTION', info.description],
    ['Platform', `${info.platform} (${info.engine} ${info.version}p${info.patchlevel})`],
    ['Runtime download', info.gzBytes ? `${(info.gzBytes / 1e6).toFixed(2)} MB gzip` : '—'],
    ['Fetch', `${info.fetchMs} ms`],
    ['Compile', `${info.compileMs} ms (${info.streamingPath})`],
    ['Instantiate', `${info.instantiateMs} ms`],
    ['Total boot', `${info.totalMs} ms`],
  ];
  els.bootMetrics.replaceChildren(
    ...rows.map(([key, value]) => {
      const wrap = document.createElement('div');
      wrap.className = 'environment-item';
      const dt = document.createElement('dt');
      dt.textContent = key;
      const dd = document.createElement('dd');
      dd.textContent = value;
      wrap.append(dt, dd);
      return wrap;
    }),
  );
  els.bootMetrics.hidden = false;
}

/* ---------- editor ---------- */

const editor =
  typeof window.CodeMirror === 'function'
    ? window.CodeMirror.fromTextArea(els.editor, {
        mode: 'ruby',
        lineNumbers: true,
        autoCloseBrackets: true,
        matchBrackets: true,
        indentUnit: 2,
        tabSize: 2,
        extraKeys: {
          'Ctrl-Enter': runCurrent,
          'Cmd-Enter': runCurrent,
          Up: (cm) =>
            cm.getCursor().line === 0 && recall(-1) ? undefined : cm.execCommand('goLineUp'),
          Down: (cm) =>
            cm.getCursor().line === cm.lineCount() - 1 && recall(1)
              ? undefined
              : cm.execCommand('goLineDown'),
        },
      })
    : null;

function code() {
  return editor ? editor.getValue() : els.editor.value;
}

function setCode(text) {
  if (editor) {
    editor.setValue(text);
    editor.focus();
  } else {
    els.editor.value = text;
    els.editor.focus();
  }
}

function setCursorEnd() {
  if (editor) {
    const last = editor.lastLine();
    editor.setCursor(last, editor.getLine(last).length);
  }
}

function recall(direction) {
  if (!commandHistory.length) return false;
  const next = historyIndex + direction;
  if (next < 0 || next > commandHistory.length - 1) {
    if (next === commandHistory.length) {
      historyIndex = next;
      setCode('');
      return true;
    }
    return false;
  }
  historyIndex = next;
  setCode(commandHistory[historyIndex]);
  return true;
}

function selectedMode() {
  return els.modePicker.querySelector('input:checked')?.value ?? 'eval';
}

/* ---------- snippet gallery ---------- */

const snippetsById = new Map();

function renderGallery() {
  const groups = snippetGroups.map((group, groupIndex) => {
    const details = document.createElement('details');
    details.className = 'snippet-group';
    if (groupIndex === 0) details.open = true;
    const summary = document.createElement('summary');
    const title = document.createElement('span');
    title.textContent = group.title;
    const count = document.createElement('span');
    count.className = 'group-count';
    count.textContent = `${group.items.length} snippets`;
    summary.append(title, count);
    const items = document.createElement('div');
    items.className = 'snippet-items';
    for (const item of group.items) {
      snippetsById.set(item.id, item);
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'snippet-item';
      button.dataset.snippet = item.id;
      button.title = item.note ?? item.title;
      button.textContent = item.title;
      if (item.needsAsync) {
        const badge = document.createElement('span');
        badge.className = 'needs-async';
        badge.textContent = 'async';
        button.append(badge);
      }
      button.addEventListener('click', () => loadSnippet(item.id));
      items.append(button);
    }
    details.append(summary, items);
    return details;
  });
  els.gallery.replaceChildren(...groups);
}

function loadSnippet(id) {
  const item = snippetsById.get(id);
  if (!item) return;
  if (item.needsAsync) {
    const radio = els.modePicker.querySelector('input[value="evalAsync"]');
    if (radio) radio.checked = true;
  }
  setCode(item.code);
  setCursorEnd();
}

/* ---------- IRB session log ---------- */

function scrollLog() {
  els.irbLog.scrollTop = els.irbLog.scrollHeight;
}

function appendNote(text, kind = 'error') {
  const div = document.createElement('div');
  div.className = `irb-${kind}`;
  div.textContent = text;
  els.irbLog.append(div);
  scrollLog();
}

function appendEntry(code, outcome, ms) {
  runCount += 1;
  const entry = document.createElement('div');
  entry.className = 'irb-entry';

  const prompt = document.createElement('div');
  prompt.className = 'irb-prompt';
  const no = document.createElement('span');
  no.className = 'prompt-no';
  no.textContent = `irb(main):${String(runCount).padStart(3, '0')}> `;
  prompt.append(no, document.createTextNode(code));
  entry.append(prompt);

  if (outcome.stdout) {
    const stdout = document.createElement('div');
    stdout.className = 'irb-stdout';
    stdout.textContent = outcome.stdout;
    entry.append(stdout);
  }
  if (outcome.stderr) {
    const stderr = document.createElement('div');
    stderr.className = 'irb-stderr';
    stderr.textContent = outcome.stderr;
    entry.append(stderr);
  }
  if (outcome.ok) {
    const result = document.createElement('div');
    result.className = 'irb-result';
    result.append(document.createTextNode(`=> ${outcome.value}`));
    const badge = document.createElement('span');
    badge.className = 'irb-class';
    badge.textContent = outcome.className ?? '?';
    result.append(badge);
    const timing = document.createElement('span');
    timing.className = 'irb-ms';
    timing.textContent = `${ms} ms`;
    result.append(timing);
    entry.append(result);
  } else {
    const error = document.createElement('div');
    error.className = 'irb-error';
    error.textContent = `${outcome.error?.name ?? 'Error'}: ${outcome.error?.message ?? ''}`;
    entry.append(error);
  }
  els.irbLog.append(entry);
  scrollLog();
}

/* ---------- run / kill / restart ---------- */

async function runCurrent() {
  if (state !== 'ready') return;
  const source = code();
  const mode = selectedMode();
  setVmState('running');
  runStartedAt = performance.now();
  runTimer = setInterval(() => {
    els.vmState.textContent = `running ${((performance.now() - runStartedAt) / 1000).toFixed(1)}s`;
  }, 100);
  bridge.prewarmAudio();
  const stdinText = els.stdinBox.value;
  let outcome;
  try {
    if (stdinText) await send('stdin', { text: stdinText });
    outcome = await send(mode, { code: source });
  } catch (error) {
    clearInterval(runTimer);
    appendNote(String(error?.message ?? error), 'error');
    return;
  }
  clearInterval(runTimer);
  const ms = Math.round(performance.now() - runStartedAt);
  history.push(source);
  historyIndex = history.length;
  appendEntry(source, outcome, ms);
  setVmState('ready');
  refreshFs();
}

els.runButton.addEventListener('click', runCurrent);

els.killButton.addEventListener('click', () => {
  if (state !== 'running') return;
  worker.terminate();
  for (const { reject } of pending.values()) reject(new Error('VM killed by user.'));
  pending.clear();
  setVmState('dead');
  appendNote('VM terminated — all Ruby state is gone. Press Restart VM to boot a fresh one.');
});

els.restartButton.addEventListener('click', () => {
  spawnWorker();
  boot();
});

els.clearLog.addEventListener('click', () => {
  els.irbLog.replaceChildren();
  runCount = 0;
});

els.resetStage.addEventListener('click', async () => {
  els.stageOut.textContent = '';
  els.stageCanvas.getContext('2d').clearRect(0, 0, els.stageCanvas.width, els.stageCanvas.height);
  if (state !== 'booting') await send('dom-reset');
});

/* ---------- share ---------- */

function base64UrlEncode(text) {
  const bytes = new TextEncoder().encode(text);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

function base64UrlDecode(encoded) {
  const pad = '='.repeat((4 - (encoded.length % 4)) % 4);
  const binary = atob(encoded.replaceAll('-', '+').replaceAll('_', '/') + pad);
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

els.shareButton.addEventListener('click', async () => {
  const url = `${location.origin}${location.pathname}#c=${base64UrlEncode(code())}`;
  window.history.replaceState(null, '', `#c=${base64UrlEncode(code())}`);
  try {
    await navigator.clipboard.writeText(url);
    els.shareButton.textContent = 'URL copied ✓';
  } catch {
    els.shareButton.textContent = 'URL updated in bar';
  }
  setTimeout(() => (els.shareButton.textContent = 'Copy share URL'), 1600);
});

function loadFromHash() {
  if (!location.hash.startsWith('#c=')) return;
  try {
    setCode(base64UrlDecode(location.hash.slice(3)));
  } catch {
    // Malformed share hash — start with the default snippet instead.
  }
}

/* ---------- feature matrix ---------- */

const evalOk = (result, needle) =>
  result.ok && String(result.value ?? result.js?.value ?? '').includes(String(needle));

const checks = [
  {
    group: 'eval & state',
    items: [
      {
        name: 'Synchronous eval',
        desc: 'vm.eval returns an RbValue synchronously',
        run: async () => evalOk(await send('eval', { code: '6 * 7' }), '42'),
      },
      {
        name: 'Persistent VM state',
        desc: 'globals defined in one run survive into the next',
        run: async () => {
          await send('eval', { code: '$matrix_state = 42' });
          return evalOk(await send('eval', { code: '$matrix_state * 2' }), '84');
        },
      },
      {
        name: 'Async eval',
        desc: 'vm.evalAsync resolves through Asyncify',
        run: async () => evalOk(await send('evalAsync', { code: '21 * 2' }), '42'),
      },
      {
        name: 'Sleep in a Worker',
        desc: 'Kernel.sleep blocks the worker thread, not the page',
        run: async () => evalOk(await send('eval', { code: 'sleep 0.02; :slept' }), 'slept'),
      },
    ],
  },
  {
    group: 'stdio & stdin',
    items: [
      {
        name: 'stdout capture',
        desc: 'puts lands in fd 1 and is drained to the log',
        run: async () => {
          const r = await send('eval', { code: 'puts "fd1 speaks"; nil' });
          return r.ok && r.stdout.includes('fd1 speaks');
        },
      },
      {
        name: 'stderr capture',
        desc: 'warn lands in fd 2',
        run: async () => {
          const r = await send('eval', { code: 'warn "fd2 speaks"; nil' });
          return r.ok && r.stderr.includes('fd2 speaks');
        },
      },
      {
        name: 'stdin feed',
        desc: 'gets reads bytes the page wrote into fd 0',
        run: async () => {
          await send('stdin', { text: 'from stdin\n' });
          return evalOk(await send('eval', { code: 'gets.chomp' }), 'from stdin');
        },
      },
    ],
  },
  {
    group: 'exceptions',
    items: [
      {
        name: 'Rescue inside Ruby',
        desc: 'raise/rescue handled by Ruby itself',
        run: async () =>
          evalOk(
            await send('eval', { code: 'begin; raise "x"; rescue => e; e.message; end' }),
            'x',
          ),
      },
      {
        name: 'Uncaught raise → RbError',
        desc: 'an uncaught exception crosses to JS as RbError',
        run: async () => {
          const r = await send('eval', { code: 'raise "boom"' });
          return !r.ok && /RbError/.test(r.error?.name ?? '') && r.error.message.includes('boom');
        },
      },
      {
        name: 'exit → SystemExit',
        desc: 'Kernel#exit surfaces as a catchable RbError',
        run: async () => {
          const r = await send('eval', { code: 'exit' });
          return !r.ok && /RbError/.test(r.error?.name ?? '');
        },
      },
      {
        name: 'Syntax error → RbError',
        desc: 'invalid Ruby is reported, not fatal',
        run: async () => {
          const r = await send('eval', { code: 'def broken(' });
          return !r.ok && /syntax error|RbError/.test(r.error?.message ?? r.error?.name ?? '');
        },
      },
    ],
  },
  {
    group: 'bundled stdlib',
    items: [
      {
        name: 'require "json"',
        run: async () =>
          evalOk(await send('eval', { code: 'require "json"; JSON.generate({a: 1})' }), 'a'),
      },
      {
        name: 'require "zlib" (deflate/inflate)',
        run: async () =>
          evalOk(
            await send('eval', {
              code: 'require "zlib"; Zlib::Inflate.inflate(Zlib::Deflate.deflate("round-trip"))',
            }),
            'round-trip',
          ),
      },
      {
        name: 'require "securerandom" / "digest"',
        run: async () =>
          evalOk(
            await send('eval', {
              code: 'require "securerandom"; require "digest"; Digest::SHA256.hexdigest(SecureRandom.hex(4)).length',
            }),
            '64',
          ),
      },
      {
        name: 'require "yaml" / "csv" / "erb" / "base64"',
        run: async () =>
          evalOk(
            await send('eval', {
              code: '%w[yaml csv erb base64].map { |l| require l }; YAML.load("a: 1")["a"]',
            }),
            '1',
          ),
      },
      {
        name: 'require "date" / "benchmark"',
        run: async () =>
          evalOk(
            await send('eval', {
              code: 'require "date"; require "benchmark"; Date.today.year >= 2020',
            }),
            'true',
          ),
      },
    ],
  },
  {
    group: 'fiber & GC',
    items: [
      {
        name: 'Fiber.yield / resume',
        run: async () =>
          evalOk(
            await send('eval', {
              code: 'f = Fiber.new { Fiber.yield 7; 8 }; [f.resume, f.resume].last',
            }),
            '8',
          ),
      },
      {
        name: 'GC.start / GC.stat',
        run: async () =>
          evalOk(
            await send('eval', { code: 'GC.start; GC.stat[:heap_allocated_pages] > 0' }),
            'true',
          ),
      },
      {
        name: 'ObjectSpace enumeration',
        run: async () =>
          evalOk(
            await send('eval', { code: 'ObjectSpace.each_object(String).take(1).length' }),
            '1',
          ),
      },
    ],
  },
  {
    group: 'JS interop',
    items: [
      {
        name: 'JS.eval',
        desc: 'evaluate JS inside the VM',
        run: async () => evalOk(await send('eval', { code: 'JS.eval("return 6 * 7")' }), '42'),
      },
      {
        name: 'JS.global → host object',
        desc: 'Ruby calls a JS function exposed on the worker global',
        run: async () =>
          evalOk(await send('eval', { code: 'JS.global[:__rubyHost].call(:double, 21)' }), '42'),
      },
      {
        name: 'vm.wrap (JS → Ruby)',
        desc: 'a plain JS object becomes JS::Object inside Ruby',
        run: async () => {
          const r = await send('wrapCall', {
            code: '->(o) { o[:v] + 1 }',
            method: 'call',
            arg: { v: 41 },
          });
          return evalOk(r, '42');
        },
      },
      {
        name: 'callAsync + .await',
        desc: 'RbValue.callAsync can await JS promises inside Ruby',
        run: async () => {
          const r = await send('callAsync', {
            code: '->(n) { JS.eval("return new Promise(r => setTimeout(() => r(n * 2), 5))").await }',
            method: 'call',
            args: [21],
          });
          return evalOk(r, '42');
        },
      },
      {
        name: 'JS::Object property access',
        desc: 'o[:key] reads a JS property',
        run: async () =>
          evalOk(
            await send('eval', { code: 'JS.eval("return {deep: {n: 42}}")[:deep][:n]' }),
            '42',
          ),
      },
    ],
  },
  {
    group: 'network & async',
    items: [
      {
        name: 'fetch same-origin',
        desc: 'JS fetch awaited from Ruby (connect-src self only)',
        run: async () => {
          const r = await send('evalAsync', {
            code: 'JS.global.call(:fetch, "/favicon.svg").await[:status]',
          });
          return evalOk(r, '200');
        },
      },
      {
        name: 'Promise resolution via .await',
        run: async () =>
          evalOk(
            await send('evalAsync', {
              code: 'JS.eval("return Promise.resolve(42)").await',
            }),
            '42',
          ),
      },
      {
        name: 'Missing same-origin path',
        desc: 'a 404 response is a normal resolved promise, not an error',
        run: async () => {
          const r = await send('evalAsync', {
            code: 'JS.global.call(:fetch, "/no-such-path-42").await[:status]',
          });
          return evalOk(r, '404');
        },
      },
    ],
  },
  {
    group: 'WASI filesystem',
    items: [
      {
        name: 'File.write → File.read',
        desc: 'Ruby writes into the preopen and reads it back',
        run: async () =>
          evalOk(
            await send('eval', {
              code: 'File.write("/_matrix.txt", "wasi"); File.read("/_matrix.txt")',
            }),
            'wasi',
          ),
      },
      {
        name: 'JS-side file visible to Ruby',
        desc: 'the page writes bytes into fd preopen; Ruby reads them',
        run: async () => {
          await send('fs-write', { path: '/_from_js.txt', content: 'made by JS' });
          return evalOk(await send('eval', { code: 'File.read("/_from_js.txt")' }), 'made by JS');
        },
      },
      {
        name: 'Dir.glob listing',
        run: async () =>
          evalOk(
            await send('eval', { code: 'Dir.glob("/*.txt").any? { |f| f.include?("_matrix") }' }),
            'true',
          ),
      },
    ],
  },
  {
    group: 'env, time & limits',
    items: [
      {
        name: 'ENV via second VM',
        desc: 'a fresh VM boots with custom env vars (isolated state)',
        run: async () => {
          const r = await send('env-boot', { env: { RUBY_WASM_ENV: 'hello-env' } });
          return r.ok && r.envValue === 'hello-env' && r.isolation === 'nil';
        },
      },
      {
        name: 'Time.now',
        desc: 'WASI clock_realtime gives real wall-clock time',
        run: async () => evalOk(await send('eval', { code: 'Time.now.year >= 2025' }), 'true'),
      },
      {
        name: 'Thread.new (documented limit)',
        desc: 'WASI Preview1 has no thread APIs — raises NotImplementedError',
        expectedLimit: true,
        run: async () => {
          const r = await send('eval', {
            code: 'begin; Thread.new {}; "worked"; rescue NotImplementedError; "limited"; end',
          });
          return evalOk(r, 'limited');
        },
      },
      {
        name: 'require "net/http" (documented limit)',
        desc: 'no sockets in this build — LoadError',
        expectedLimit: true,
        run: async () => {
          const r = await send('eval', {
            code: 'begin; require "net/http"; "worked"; rescue LoadError; "limited"; end',
          });
          return evalOk(r, 'limited');
        },
      },
    ],
  },
];

const checkRows = [];

function renderFeatureMatrix() {
  els.featureList.replaceChildren(
    ...checks.flatMap((group) => {
      const header = document.createElement('li');
      header.className = 'feature-row';
      const name = document.createElement('span');
      name.className = 'feature-name';
      name.textContent = group.group;
      header.append(name);
      return [
        header,
        ...group.items.map((check) => {
          const row = document.createElement('li');
          row.className = 'feature-row';
          const nameEl = document.createElement('span');
          nameEl.className = 'feature-name';
          nameEl.textContent = check.name;
          const desc = document.createElement('span');
          desc.className = 'feature-desc';
          desc.textContent = check.desc ?? '';
          const chip = document.createElement('span');
          chip.className = 'status-chip status-info';
          chip.textContent = 'idle';
          const runButton = document.createElement('button');
          runButton.className = 'feature-run ghost-button';
          runButton.type = 'button';
          runButton.textContent = 'Run';
          const detail = document.createElement('pre');
          detail.className = 'feature-detail';
          detail.hidden = true;
          const meta = document.createElement('div');
          meta.style.display = 'flex';
          meta.style.gap = '8px';
          meta.style.alignItems = 'center';
          meta.append(chip, runButton);
          row.append(nameEl, desc, meta, detail);
          checkRows.push({ check, chip, detail });
          runButton.addEventListener('click', () => runCheck({ check, chip, detail }));
          return row;
        }),
      ];
    }),
  );
}

async function runCheck(row) {
  if (state === 'dead' || state === 'booting') return;
  const { check, chip, detail } = row;
  chip.className = 'status-chip status-running';
  chip.textContent = 'running';
  try {
    const result = await check.run();
    const pass = result === true || (result && typeof result === 'object' && result.ok);
    const limit = check.expectedLimit;
    chip.className = `status-chip ${
      pass ? (limit ? 'status-partial' : 'status-supported') : 'status-unsupported'
    }`;
    chip.textContent = pass ? (limit ? 'limited' : 'pass') : 'fail';
    detail.hidden = false;
    detail.textContent =
      typeof result === 'object' ? JSON.stringify(result, null, 2) : String(result);
    if (result === true) detail.textContent = 'passed';
  } catch (error) {
    chip.className = 'status-chip status-unsupported';
    chip.textContent = 'error';
    detail.hidden = false;
    detail.textContent = String(error?.message ?? error);
  }
}

els.runAll.addEventListener('click', async () => {
  els.runAll.disabled = true;
  for (const row of checkRows) {
    if (state === 'dead') break;
    if (row.chip.textContent === 'running') continue;
    await runCheck(row);
  }
  els.runAll.disabled = state === 'dead';
  refreshFs();
});

/* ---------- WASI filesystem browser ---------- */

async function refreshFs() {
  if (!worker || state !== 'ready') return;
  const { entries = [] } = await send('fs-list');
  els.fsTree.replaceChildren(
    ...entries
      .sort((a, b) =>
        a.type === b.type ? a.path.localeCompare(b.path) : a.type === 'directory' ? -1 : 1,
      )
      .map((entry) => {
        const li = document.createElement('li');
        const depth = entry.path.split('/').filter(Boolean).length - 1;
        li.style.paddingLeft = `${depth * 14 + 4}px`;
        if (entry.type === 'directory') {
          li.textContent = `📁 ${entry.path.split('/').pop()}/`;
        } else {
          li.className = 'is-file';
          li.innerHTML = '';
          li.append(document.createTextNode(`📄 ${entry.path.split('/').pop()}`));
          const size = document.createElement('span');
          size.className = 'fs-size';
          size.textContent = `${entry.size} B`;
          li.append(size);
          li.addEventListener('click', async () => {
            const result = await send('fs-read', { path: entry.path });
            els.fsView.textContent = result.ok ? result.content : result.error;
          });
        }
        return li;
      }),
  );
}

els.fsRefresh.addEventListener('click', refreshFs);

/* ---------- init ---------- */

renderGallery();
loadFromHash();
renderFeatureMatrix();
spawnWorker();
await boot();
document.body.dataset.appReady = 'true';
