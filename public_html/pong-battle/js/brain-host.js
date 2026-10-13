'use strict';

// Main-thread handle for one brain worker (player side or enemy side).
// The host owns the worker lifecycle — boot, brain deploys, per-tick calls —
// and exposes health signals so the match loop can reboot a hung brain
// without touching the opponent.

export const TICK_TIMEOUT_MS = 1500;
export const TICK_DEGRADED_MS = 350;

export class BrainHost {
  constructor(name, workerUrl = '/pong-battle/brain-worker.js') {
    this.name = name;
    this.workerUrl = workerUrl;
    this.worker = null;
    this.reqSeq = 0;
    this.pending = new Map();
    this.bootInfo = null;
    this.brainName = null;
    this.lastSource = null;
    this.state = 'dead'; // dead | booting | ready | busy
    this.pendingTick = null;
    this.lastReplyAt = 0;
    this.onMessage = null; // (event-like payloads: boot-progress, log)
  }

  #spawn() {
    this.worker = new Worker(this.workerUrl);
    this.worker.addEventListener('message', (event) => {
      const data = event.data ?? {};
      if (data.op === 'boot-progress') {
        this.onMessage?.({ type: 'boot-progress', stage: data.stage });
        return;
      }
      const { id } = data;
      const settle = this.pending.get(id);
      if (settle) {
        this.pending.delete(id);
        settle.resolve(data);
      }
    });
  }

  #send(op, extra = {}) {
    const id = ++this.reqSeq;
    return new Promise((resolve) => {
      this.pending.set(id, { resolve });
      this.worker.postMessage({ id, op, ...extra });
    });
  }

  async boot() {
    if (!this.worker) this.#spawn();
    this.state = 'booting';
    const { ok, info, error } = await this.#send('boot');
    if (!ok) {
      this.state = 'dead';
      throw new Error(error?.message ?? 'VM boot failed');
    }
    this.bootInfo = info;
    this.state = 'ready';
    this.lastReplyAt = performance.now();
    return info;
  }

  // Deploy brain source. Returns { ok, name?, error?, stdout, stderr }.
  async load(source) {
    if (this.state === 'dead') throw new Error('brain host is dead');
    const result = await this.#send('load', { source });
    if (result.ok) {
      this.lastSource = source;
      this.brainName = result.name ?? this.name;
    }
    this.#emitLog(result);
    return result;
  }

  // Ask the brain for a move. Returns immediately (null) while a tick is
  // still in flight — the freshest state always wins over a queued backlog.
  requestTick(stateJson, { trace = false, watch = false } = {}) {
    if (this.state !== 'ready' || this.pendingTick) return false;
    const sentAt = performance.now();
    const promise = this.#send('tick', { state: stateJson, trace, watch });
    this.pendingTick = { sentAt, promise };
    promise.then((result) => {
      this.pendingTick = null;
      this.lastReplyAt = performance.now();
      this.#emitLog(result);
      this.onMessage?.({ type: 'tick', ...result });
    });
    return true;
  }

  // Health check for the match loop.
  health(now = performance.now()) {
    if (this.state === 'dead') return 'dead';
    if (this.state === 'booting') return 'booting';
    if (this.pendingTick) {
      const age = now - this.pendingTick.sentAt;
      if (age > TICK_TIMEOUT_MS) return 'hung';
      if (age > TICK_DEGRADED_MS) return 'slow';
    }
    return 'ok';
  }

  // Terminate and reboot, redeploying the last good brain source.
  async reboot() {
    this.terminate();
    this.#spawn();
    const info = await this.boot();
    if (this.lastSource) await this.load(this.lastSource);
    return info;
  }

  terminate() {
    this.worker?.terminate();
    this.worker = null;
    this.pendingTick = null;
    for (const { resolve } of this.pending.values()) {
      resolve({ ok: false, error: { class: 'Terminated', message: 'VM terminated' } });
    }
    this.pending.clear();
    this.state = 'dead';
  }

  #emitLog(result) {
    if (result?.stdout) this.onMessage?.({ type: 'stdout', text: result.stdout });
    if (result?.stderr) this.onMessage?.({ type: 'stderr', text: result.stderr });
  }
}
