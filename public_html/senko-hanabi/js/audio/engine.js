// All audio is synthesized in Web Audio — no audio files. Cues: ignition
// whoosh, ejection crackle ticks, cascade pops (throttled), landing tap with
// steam hiss, spent evaporation hiss. A continuous hiss tracks spark density.
// Ambient music lives in music.js (quiet yonanuki-scale koto phrase).

import { createMusic } from './music.js';

export function createAudioEngine() {
  let ctx = null;
  let master = null;
  let sfxBus = null;
  let ambBus = null;
  let music = null;
  let hiss = null;
  let hissGain = null;
  let hissTarget = 0;
  let started = false;
  let lastCrackAt = 0;
  let lastPopAt = 0;

  function ensure() {
    if (ctx) return ctx;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.8;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain();
    sfxBus.gain.value = 1;
    sfxBus.connect(master);
    ambBus = ctx.createGain();
    ambBus.gain.value = 1;
    ambBus.connect(master);

    // Continuous hiss bed: filtered white noise, gain driven per-frame.
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) d[i] = Math.random() * 2 - 1;
    hiss = ctx.createBufferSource();
    hiss.buffer = buf;
    hiss.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 2400;
    bp.Q.value = 0.7;
    hissGain = ctx.createGain();
    hissGain.gain.value = 0;
    hiss.connect(bp).connect(hissGain).connect(ambBus);
    hiss.start();

    music = createMusic(ctx, ambBus);
    started = true;
    return ctx;
  }

  function tick(duration, { freq = 2600, q = 6, gain = 0.2, sweep = 0.3 } = {}) {
    const c = ensure();
    const t = c.currentTime;
    const src = c.createBufferSource();
    const len = Math.max(1, Math.floor(c.sampleRate * duration));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i += 1) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    src.buffer = buf;
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(freq, t);
    bp.frequency.exponentialRampToValueAtTime(Math.max(200, freq * sweep), t + duration);
    bp.Q.value = q;
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + duration);
    src.connect(bp).connect(g).connect(sfxBus);
    src.start(t);
  }

  function thump({ freq = 120, gain = 0.5, dur = 0.18 } = {}) {
    const c = ensure();
    const t = c.currentTime;
    const osc = c.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, t);
    osc.frequency.exponentialRampToValueAtTime(freq * 0.4, t + dur);
    const g = c.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(sfxBus);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  return {
    ensure,
    get context() {
      return ctx;
    },
    async unlock() {
      const c = ensure();
      if (c && c.state === 'suspended') {
        try {
          await c.resume();
        } catch {
          /* resume() rejects if the gesture was already consumed */
        }
      }
      return c;
    },
    get started() {
      return started;
    },
    setVolume(v) {
      if (ctx) master.gain.value = Math.max(0, Math.min(1, v));
      this.volume = v;
    },
    volume: 0.8,
    muted: false,
    setMuted(m) {
      this.muted = m;
      if (ctx) master.gain.value = m ? 0 : this.volume;
    },
    setBgm(on) {
      if (music) music.setEnabled(on);
      if (ambBus) ambBus.gain.value = on ? 1 : 0.35;
    },
    // Called every frame with live spark density -> hiss bed.
    setHiss(level) {
      hissTarget = Math.max(0, Math.min(1, level));
      if (hissGain && ctx) {
        hissGain.gain.setTargetAtTime(hissTarget * 0.05, ctx.currentTime, 0.08);
      }
    },
    ignite() {
      // Fuse whoosh: descending band noise + soft knock.
      tick(0.35, { freq: 3400, q: 2, gain: 0.16, sweep: 0.2 });
      thump({ freq: 90, gain: 0.12, dur: 0.2 });
    },
    // Ejection crackle: cluster of short ticks; count scales the cluster.
    crack(count = 1) {
      const c = ensure();
      const now = c.currentTime;
      if (now - lastCrackAt < 0.03) return;
      lastCrackAt = now;
      const n = Math.min(4, Math.max(1, count));
      for (let i = 0; i < n; i += 1) {
        setTimeout(
          () =>
            tick(0.03 + Math.random() * 0.05, {
              freq: 1800 + Math.random() * 2600,
              q: 7,
              gain: 0.1 + Math.random() * 0.08,
              sweep: 0.5,
            }),
          i * (12 + Math.random() * 30),
        );
      }
    },
    // Cascade micro-pop: single faint tick, caller throttles.
    pop() {
      const c = ensure();
      const now = c.currentTime;
      if (now - lastPopAt < 0.02) return;
      lastPopAt = now;
      tick(0.015 + Math.random() * 0.03, {
        freq: 3000 + Math.random() * 3000,
        q: 9,
        gain: 0.05,
        sweep: 0.6,
      });
    },
    land() {
      // Ember meets the ground: a soft tap under a short steam hiss.
      thump({ freq: 110, gain: 0.08, dur: 0.12 });
      tick(0.5, { freq: 1600, q: 1.2, gain: 0.05, sweep: 0.25 });
    },
    spent() {
      // Quiet evaporation: noise swept down through a lowpass, fading over
      // ~1.6s — the ember sizzles out ("ju..."/"shu...") instead of chimes.
      const c = ensure();
      const t = c.currentTime;
      const len = Math.floor(c.sampleRate * 1.6);
      const buf = c.createBuffer(1, len, c.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i += 1) d[i] = Math.random() * 2 - 1;
      const src = c.createBufferSource();
      src.buffer = buf;
      const lp = c.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(2400, t);
      lp.frequency.exponentialRampToValueAtTime(300, t + 1.5);
      const g = c.createGain();
      g.gain.setValueAtTime(0.06, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
      src.connect(lp).connect(g).connect(sfxBus);
      src.start(t);
    },
    startBgm() {
      if (music) music.start();
    },
    stopBgm() {
      if (music) music.stop();
    },
    dispose() {
      if (ctx) ctx.close();
      ctx = null;
    },
  };
}
