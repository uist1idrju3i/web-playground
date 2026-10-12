// dom-bridge.js — main-thread side of the Ruby DOM bridge. The worker sends
// ops; this module performs them against real page objects. Objects are kept
// in a handle registry and cross the boundary as "h:<n>" strings, so the Ruby
// side can pass live DOM elements, contexts, and buffers between calls.

const HANDLE_RE = /^h:\d+$/;

const EVENT_KEYS = [
  'type',
  'key',
  'code',
  'button',
  'buttons',
  'clientX',
  'clientY',
  'offsetX',
  'offsetY',
  'deltaX',
  'deltaY',
  'repeat',
  'altKey',
  'ctrlKey',
  'shiftKey',
  'metaKey',
];

function serializeEvent(event) {
  const data = {};
  for (const key of EVENT_KEYS) {
    if (event[key] !== undefined) data[key] = event[key];
  }
  const target = event.target;
  if (target) {
    if (target.id) data.id = target.id;
    if ('value' in target) data.value = target.value;
    if ('checked' in target) data.checked = target.checked;
  }
  return data;
}

export function createDomBridge(worker) {
  const handles = new Map();
  const listeners = new Map();
  const rafLoops = new Map();
  let nextHandle = 0;
  let audioContext = null;

  const put = (value) => {
    const id = `h:${++nextHandle}`;
    handles.set(id, value);
    return id;
  };

  const resolveArg = (value) =>
    typeof value === 'string' && HANDLE_RE.test(value) && handles.has(value)
      ? handles.get(value)
      : value;

  // Primitives cross as-is; anything else is parked in the handle registry.
  const pack = (value) => {
    if (value === undefined || value === null) return null;
    const t = typeof value;
    if (t === 'string' || t === 'number' || t === 'boolean') return value;
    if (Array.isArray(value)) return value.map(pack);
    return { __h: put(value) };
  };

  function removeProc(procId) {
    const listener = listeners.get(procId);
    if (listener) {
      listener.el.removeEventListener(listener.event, listener.fn);
      listeners.delete(procId);
    }
    const rafId = rafLoops.get(procId);
    if (rafId !== undefined) {
      cancelAnimationFrame(rafId);
      rafLoops.delete(procId);
    }
  }

  function reset() {
    for (const procId of [...listeners.keys()]) removeProc(procId);
    for (const procId of [...rafLoops.keys()]) removeProc(procId);
    handles.clear();
  }

  function ensureAudioContext() {
    const Ctor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Ctor) throw new Error('Web Audio is not available in this browser.');
    audioContext ??= new Ctor();
    if (audioContext.state === 'suspended') {
      audioContext.resume().catch(() => {});
    }
    return audioContext;
  }

  function playSamples(samples, rate) {
    const ctx = ensureAudioContext();
    const length = Array.isArray(samples) ? samples.length : 0;
    if (!length) return;
    const buffer = ctx.createBuffer(1, length, Math.max(3000, Number(rate) || 24000));
    buffer.copyToChannel(
      Float32Array.from(samples, (v) => Math.max(-1, Math.min(1, v))),
      0,
    );
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  }

  const ops = {
    qs: ([sel]) => pack(document.querySelector(String(sel))),
    call: ([handle, method, ...args]) => {
      const target = resolveArg(handle);
      if (target == null) throw new Error(`Unknown handle ${handle}.`);
      const fn = target[method];
      if (typeof fn !== 'function') {
        throw new Error(`${String(method)} is not callable on this object.`);
      }
      return pack(fn.apply(target, args.map(resolveArg)));
    },
    get: ([handle, key]) => pack(resolveArg(handle)?.[key]),
    set: ([handle, key, value]) => {
      const target = resolveArg(handle);
      if (target == null) throw new Error(`Unknown handle ${handle}.`);
      target[key] = resolveArg(value);
      return null;
    },
    text: ([sel, value]) => {
      const el = document.querySelector(String(sel));
      if (!el) throw new Error(`No element matches ${sel}.`);
      el.textContent = value;
      return null;
    },
    batch: ([json]) => {
      const list = JSON.parse(String(json));
      return list.map(([op, ...args]) => ops[op]?.(args));
    },
    on: ([sel, event, procId]) => {
      const el = document.querySelector(String(sel));
      if (!el) throw new Error(`No element matches ${sel}.`);
      removeProc(procId);
      const fn = (domEvent) =>
        worker.postMessage({
          __rbDom: true,
          kind: 'event',
          procId,
          arg: serializeEvent(domEvent),
        });
      el.addEventListener(String(event), fn);
      listeners.set(procId, { el, event: String(event), fn });
      return null;
    },
    raf: ([procId]) => {
      removeProc(procId);
      const tick = (time) => {
        worker.postMessage({ __rbDom: true, kind: 'raf', procId, arg: time });
        rafLoops.set(procId, requestAnimationFrame(tick));
      };
      rafLoops.set(procId, requestAnimationFrame(tick));
      return null;
    },
    off: ([procId]) => {
      removeProc(procId);
      return null;
    },
    audio: ([json, rate]) => {
      playSamples(JSON.parse(String(json)), rate);
      return null;
    },
    reset: () => {
      reset();
      return null;
    },
  };

  return {
    // Called from the Run click (a real user gesture) so the AudioContext is
    // allowed to start before Ruby code asks for it.
    prewarmAudio() {
      try {
        ensureAudioContext();
      } catch {
        // Reported later if a snippet actually uses audio.
      }
    },
    reset,
    handle(data) {
      let result = null;
      let ok = true;
      let error = null;
      try {
        const op = ops[data.op];
        if (!op) throw new Error(`Unknown bridge op ${data.op}.`);
        result = op(data.args ?? []);
      } catch (e) {
        ok = false;
        error = String(e?.message ?? e);
      }
      worker.postMessage({ __rbDom: true, reqId: data.reqId, op: data.op, ok, result, error });
    },
  };
}
