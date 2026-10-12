// Synthesized Web Audio for Pong Programming Battle — original cues and a
// small procedural pop loop. Every cue also has a visual twin (see app.js).
// AudioContext is created/resumed only inside a user gesture.
export function createAudio() {
  let ctx = null;
  let master, fx, musicBus;
  let muted = false;
  let musicTimer = null;
  let intensity = 0;

  function ensure() {
    if (ctx) return true;
    const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!AC) return false;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.connect(ctx.destination);
    master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(comp);
    fx = ctx.createGain();
    fx.gain.value = 1;
    fx.connect(master);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.32;
    musicBus.connect(master);
    return true;
  }

  async function unlock() {
    if (!ensure()) return false;
    if (ctx.state === 'suspended') await ctx.resume();
    return ctx.state === 'running';
  }

  function env(gain, t0, a, peak, d) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + a + d);
    g.connect(gain);
    return g;
  }

  function osc(type, f0, f1, t0, dur, dest, peak = 0.5) {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(f1, 1), t0 + dur);
    o.connect(env(dest, t0, 0.004, peak, dur));
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  function noise(t0, dur, dest, peak = 0.3, hp = 800) {
    const len = Math.ceil(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = hp;
    src.connect(f);
    f.connect(env(dest, t0, 0.003, peak, dur));
    src.start(t0);
  }

  const cues = {
    click: (t) => osc('triangle', 880, 660, t, 0.06, fx, 0.25),
    deploy: (t) => {
      osc('sine', 440, 440, t, 0.09, fx, 0.3);
      osc('sine', 660, 660, t + 0.09, 0.09, fx, 0.3);
      osc('sine', 880, 880, t + 0.18, 0.14, fx, 0.32);
    },
    countdown: (t) => osc('square', 620, 620, t, 0.07, fx, 0.18),
    go: (t) => osc('square', 880, 1180, t, 0.16, fx, 0.28),
    hit: (t, speed = 60) => {
      const f = 380 + speed * 3;
      osc('square', f, f * 0.7, t, 0.07, fx, 0.4);
      noise(t, 0.05, fx, 0.12, 2000);
    },
    wall: (t) => osc('triangle', 300, 220, t, 0.05, fx, 0.2),
    scoreFor: (t) => {
      [523, 659, 784, 1046].forEach((f, i) => osc('sine', f, f, t + i * 0.07, 0.12, fx, 0.3));
      noise(t, 0.2, fx, 0.1, 3000);
    },
    scoreAgainst: (t) => {
      [392, 330, 262].forEach((f, i) => osc('sine', f, f * 0.97, t + i * 0.09, 0.14, fx, 0.28));
    },
    gust: (t) => noise(t, 0.6, fx, 0.14, 400),
    brainError: (t) => {
      osc('sawtooth', 220, 160, t, 0.18, fx, 0.2);
      osc('sawtooth', 165, 110, t + 0.12, 0.22, fx, 0.2);
    },
    win: (t) => {
      [523, 659, 784, 1046, 1318].forEach((f, i) =>
        osc('triangle', f, f, t + i * 0.1, 0.3, fx, 0.32),
      );
      noise(t + 0.3, 0.5, fx, 0.1, 2500);
    },
    lose: (t) => {
      [392, 349, 311, 262].forEach((f, i) =>
        osc('triangle', f, f * 0.97, t + i * 0.14, 0.3, fx, 0.24),
      );
    },
  };

  function cue(name, opts = {}) {
    if (!ctx || muted) return;
    const fn = cues[name];
    if (fn) fn(ctx.currentTime + 0.001, opts.speed);
  }

  // Procedural pop loop: 4-bar I–V–vi–IV over a bright square lead,
  // triangle bass and a noise hat. Intensity adds an arp layer on long
  // rallies.
  const BPM = 132;
  const STEP = 60 / BPM / 4;
  const BASS = [65.4, 82.4, 55, 73.4]; // C2 E2 A1 B1ish roots
  const LEAD = [
    523, 0, 659, 0, 784, 0, 659, 0, 587, 0, 523, 0, 659, 784, 0, 0, 440, 0, 523, 0, 659, 0, 523, 0,
    494, 0, 440, 0, 523, 587, 0, 0, 349, 0, 440, 0, 523, 0, 440, 0, 392, 0, 349, 0, 440, 523, 0, 0,
    392, 0, 494, 0, 587, 0, 494, 0, 659, 0, 784, 0, 880, 0, 0, 0,
  ];
  let step = 0;
  let nextT = 0;

  function schedule() {
    if (!ctx || muted) return;
    const horizon = ctx.currentTime + 0.12;
    while (nextT < horizon) {
      const bar = Math.floor(step / 16) % 4;
      const s16 = step % 16;
      const idx = bar * 16 + s16;
      if (s16 % 8 === 0)
        osc('triangle', BASS[bar] * 2, BASS[bar] * 2, nextT, STEP * 6, musicBus, 0.5);
      if (s16 % 2 === 1) noise(nextT, 0.03, musicBus, 0.08, 6000); // hat
      const f = LEAD[idx];
      if (f) osc('square', f, f, nextT, STEP * 1.8, musicBus, 0.11);
      if (intensity > 0.5 && s16 % 4 === 2)
        osc('sine', 1046 + (s16 % 8) * 130, 1046 + (s16 % 8) * 130, nextT, STEP, musicBus, 0.07);
      step += 1;
      nextT += STEP;
    }
  }

  function startMusic() {
    if (!ctx || musicTimer) return;
    step = 0;
    nextT = ctx.currentTime + 0.05;
    musicTimer = setInterval(schedule, 30);
  }
  function stopMusic() {
    if (musicTimer) clearInterval(musicTimer);
    musicTimer = null;
  }
  function setIntensity(v) {
    intensity = Math.max(0, Math.min(1, v));
  }
  function setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 0.85;
  }

  return {
    unlock,
    cue,
    startMusic,
    stopMusic,
    setIntensity,
    setMuted,
    get muted() {
      return muted;
    },
    get ready() {
      return !!ctx;
    },
  };
}
