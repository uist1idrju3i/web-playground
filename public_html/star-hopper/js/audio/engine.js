// WebAudio synth engine for Star Hopper. Every cue is synthesized (no sample
// files) and follows the product-cue contract: confirm cues stay ≤300 ms,
// warning cues loop with rests, fundamentals stay ≤2500 Hz, and each cue is
// distinguishable by contour and timbre.

const CUE_DURATION_MS = {
  ui: 80,
  jump: 140,
  doubleJump: 220,
  pickup: 300,
  combo: 420,
  land: 160,
  fall: 700,
  respawn: 260,
  tick: 60,
  warning: 320,
  win: 2400,
  timeout: 1600,
};
export { CUE_DURATION_MS };

const PENTA = [659.25, 783.99, 880.0, 987.77, 1174.66, 1318.51]; // E5 F#5 G#5 B5 D6 E6

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxBus = null;
    this.musicBus = null;
    this.enabled = true;
    this.bgmEnabled = true;
    this.volume = 0.8;
    this.music = null;
  }

  get ok() {
    return typeof AudioContext === 'function' || typeof webkitAudioContext === 'function';
  }

  // Must be called from a user gesture before any cue plays.
  unlock() {
    if (!this.ok) return false;
    if (!this.ctx) {
      const AC = globalThis.AudioContext ?? globalThis.webkitAudioContext;
      this.ctx = new AC({ latencyHint: 'interactive' });
      this.master = this.ctx.createGain();
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.knee.value = 24;
      comp.ratio.value = 6;
      this.master.connect(comp).connect(this.ctx.destination);
      this.sfxBus = this.ctx.createGain();
      this.sfxBus.gain.value = 0.9;
      this.sfxBus.connect(this.master);
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.42;
      this.musicBus.connect(this.master);
      this.applyGain();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return true;
  }

  applyGain() {
    if (!this.master) return;
    const target = this.enabled ? this.volume : 0;
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, 0.03);
  }

  setVolume(volume) {
    this.volume = Math.min(1, Math.max(0, volume));
    this.applyGain();
  }

  setMuted(muted) {
    this.enabled = !muted;
    this.applyGain();
  }

  get muted() {
    return !this.enabled;
  }

  setBgmEnabled(on) {
    this.bgmEnabled = on;
    if (this.music) this.music.setEnabled(on);
  }

  attachMusic(music) {
    this.music = music;
  }

  now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  env(node, t0, attack, decay, peak = 1, end = 0.0001) {
    node.gain.setValueAtTime(0.0001, t0);
    node.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + attack);
    node.gain.exponentialRampToValueAtTime(end, t0 + attack + decay);
  }

  tone({ type = 'sine', f0 = 440, f1 = null, t0, attack = 0.008, decay = 0.15, gain = 0.5, dest }) {
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(f0, t0);
    if (f1 !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + decay);
    const amp = this.ctx.createGain();
    this.env(amp, t0, attack, decay, gain);
    osc.connect(amp).connect(dest ?? this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + attack + decay + 0.05);
    return osc;
  }

  noise({
    t0,
    attack = 0.005,
    decay = 0.12,
    gain = 0.3,
    type = 'lowpass',
    f0 = 800,
    f1 = null,
    q = 1,
    dest,
  }) {
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * (attack + decay + 0.05)));
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(f0, t0);
    if (f1 !== null) filter.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t0 + decay);
    filter.Q.value = q;
    const amp = this.ctx.createGain();
    this.env(amp, t0, attack, decay, gain);
    src
      .connect(filter)
      .connect(amp)
      .connect(dest ?? this.sfxBus);
    src.start(t0);
    src.stop(t0 + attack + decay + 0.05);
  }

  cue(name, param = 0) {
    if (!this.ctx || this.ctx.state !== 'running' || !this.enabled) return;
    const t0 = this.now();
    switch (name) {
      case 'ui': {
        this.tone({ type: 'triangle', f0: 880, t0, decay: 0.05, gain: 0.25 });
        break;
      }
      case 'jump': {
        // Rising chirp: "up and away".
        this.tone({ type: 'square', f0: 300, f1: 620, t0, decay: 0.11, gain: 0.16 });
        this.tone({ type: 'sine', f0: 600, f1: 1240, t0, decay: 0.12, gain: 0.12 });
        break;
      }
      case 'doubleJump': {
        // Flip-pop: two quick rising notes with a band-pass swoosh.
        this.tone({ type: 'square', f0: 520, f1: 700, t0, decay: 0.07, gain: 0.14 });
        this.tone({ type: 'square', f0: 700, f1: 990, t0: t0 + 0.06, decay: 0.09, gain: 0.15 });
        this.noise({ t0, decay: 0.14, gain: 0.07, type: 'bandpass', f0: 900, f1: 2200, q: 2.5 });
        break;
      }
      case 'pickup': {
        // Pentatonic chime; pitch rises with combo.
        const idx = Math.min(PENTA.length - 1, Math.max(0, Math.round(param) - 1));
        const f = PENTA[idx];
        this.tone({ type: 'sine', f0: f, t0, decay: 0.18, gain: 0.3 });
        this.tone({ type: 'sine', f0: f * 2, t0, decay: 0.12, gain: 0.1 });
        this.tone({ type: 'triangle', f0: f * 1.5, t0: t0 + 0.05, decay: 0.16, gain: 0.16 });
        break;
      }
      case 'combo': {
        // Milestone: fast 4-note ascend.
        [880, 1108.7, 1318.5, 1760].forEach((f, i) => {
          this.tone({ type: 'triangle', f0: f, t0: t0 + i * 0.06, decay: 0.16, gain: 0.2 });
        });
        break;
      }
      case 'land': {
        // Soft thud.
        this.tone({ type: 'sine', f0: 130, f1: 70, t0, decay: 0.1, gain: 0.35 });
        this.noise({ t0, decay: 0.07, gain: 0.1, type: 'lowpass', f0: 500 });
        break;
      }
      case 'fall': {
        // Descending whistle + airy noise.
        this.tone({ type: 'sine', f0: 900, f1: 180, t0, decay: 0.55, gain: 0.22 });
        this.noise({ t0, decay: 0.4, gain: 0.08, type: 'bandpass', f0: 1600, f1: 400, q: 1.5 });
        break;
      }
      case 'respawn': {
        // Bouncy pop.
        this.tone({ type: 'triangle', f0: 300, f1: 520, t0, decay: 0.1, gain: 0.3 });
        this.tone({ type: 'sine', f0: 520, f1: 780, t0: t0 + 0.08, decay: 0.12, gain: 0.2 });
        break;
      }
      case 'tick': {
        this.tone({ type: 'square', f0: 1567.98, t0, decay: 0.04, gain: 0.08 });
        break;
      }
      case 'warning': {
        // Loop-with-rest pattern (caller re-triggers each beat).
        this.tone({ type: 'square', f0: 880, t0, decay: 0.09, gain: 0.1 });
        this.tone({ type: 'square', f0: 880, t0: t0 + 0.16, decay: 0.09, gain: 0.1 });
        break;
      }
      case 'win': {
        // Fanfare arpeggio E G# B E — original melody.
        [659.25, 830.61, 987.77, 1318.51].forEach((f, i) => {
          this.tone({ type: 'triangle', f0: f, t0: t0 + i * 0.14, decay: 0.5, gain: 0.26 });
          this.tone({ type: 'sine', f0: f * 2, t0: t0 + i * 0.14, decay: 0.3, gain: 0.06 });
        });
        this.noise({
          t0: t0 + 0.5,
          attack: 0.05,
          decay: 1.0,
          gain: 0.05,
          type: 'highpass',
          f0: 4000,
        });
        break;
      }
      case 'timeout': {
        // Gentle descend, not a harsh alarm.
        [660, 550, 440].forEach((f, i) => {
          this.tone({ type: 'triangle', f0: f, t0: t0 + i * 0.22, decay: 0.4, gain: 0.22 });
        });
        break;
      }
      default:
        break;
    }
  }
}
