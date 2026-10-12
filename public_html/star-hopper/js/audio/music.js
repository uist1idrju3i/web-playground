// Original 128 BPM pop loop for Star Hopper: E major, I–vi–IV–V, synth kick,
// hats, bass, and a pentatonic arp. Scheduled with a lookahead timer so it
// keeps playing at tempo while tabs throttle RAF.

export const BPM = 128;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const LOOP_BARS = 4;

// Chord roots for E  C#m  A  B (one per bar).
const BASS_NOTES = [82.41, 103.83, 110.0, 123.47]; // E2 C#3 A2 B2
const CHORDS = [
  [329.63, 415.3, 493.88], // E4 G#4 B4
  [277.18, 329.63, 415.3], // C#4 E4 G#4
  [220.0, 277.18, 329.63], // A3 C#4 E4
  [246.94, 311.13, 369.99], // B3 D#4 F#4
];
// Pentatonic arp per bar (E major pentatonic).
const ARP = [
  [659.25, 830.61, 987.77, 1318.51, 987.77, 830.61],
  [554.37, 659.25, 830.61, 1108.73, 830.61, 659.25],
  [440.0, 554.37, 659.25, 880.0, 659.25, 554.37],
  [493.88, 622.25, 739.99, 987.77, 739.99, 622.25],
];
// Simple original lead motif over bars 2 and 4.
const LEAD = [
  { bar: 1, at: 0.0, f: 1318.51, d: 0.35 },
  { bar: 1, at: 0.5, f: 987.77, d: 0.2 },
  { bar: 1, at: 1.0, f: 830.61, d: 0.3 },
  { bar: 1, at: 2.0, f: 987.77, d: 0.5 },
  { bar: 3, at: 0.0, f: 880.0, d: 0.3 },
  { bar: 3, at: 0.5, f: 987.77, d: 0.25 },
  { bar: 3, at: 1.0, f: 1174.66, d: 0.45 },
  { bar: 3, at: 2.0, f: 1318.51, d: 0.6 },
];

export class Music {
  constructor(engine) {
    this.engine = engine;
    this.playing = false;
    this.enabled = true;
    this.timer = null;
    this.nextTime = 0;
    this.beatIndex = 0;
  }

  setEnabled(on) {
    this.enabled = on;
    if (!on) this.stop();
  }

  start() {
    if (!this.enabled || this.playing || !this.engine.ctx) return;
    const ctx = this.engine.ctx;
    if (ctx.state !== 'running') return;
    this.playing = true;
    this.nextTime = ctx.currentTime + 0.05;
    this.beatIndex = 0;
    this.timer = setInterval(() => this.pump(), 40);
    this.pump();
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.playing = false;
  }

  pump() {
    if (!this.playing || !this.enabled) return;
    const ctx = this.engine.ctx;
    if (ctx.state !== 'running') return;
    // Schedule up to 0.15s ahead.
    while (this.nextTime < ctx.currentTime + 0.15) {
      this.scheduleBeat(this.beatIndex, this.nextTime);
      this.beatIndex += 1;
      this.nextTime += BEAT;
    }
  }

  scheduleBeat(beat, t0) {
    const bar = Math.floor(beat / 4) % LOOP_BARS;
    const inBar = beat % 4;
    const dest = this.engine.musicBus;

    // Kick on every beat.
    this.kick(t0, dest);
    // Snare-ish clap on 2 and 4.
    if (inBar === 1 || inBar === 3) this.clap(t0, dest);
    // Hats on off-beats.
    this.hat(t0 + BEAT / 2, dest, inBar === 3 ? 0.12 : 0.07);
    // Bass: root on the beat, fifth on the off-beat.
    const root = BASS_NOTES[bar];
    this.bass(root, t0, BEAT * 0.45, dest);
    this.bass(root * 1.5, t0 + BEAT / 2, BEAT * 0.4, dest, 0.5);
    // Chord stabs on beats 2 and 3.5.
    if (inBar === 1) this.chord(CHORDS[bar], t0, BEAT * 0.6, dest);
    if (inBar === 2) this.chord(CHORDS[bar], t0 + BEAT * 0.5, BEAT * 0.4, dest, 0.6);
    // Arp: six eighth-ish notes per bar.
    const arp = ARP[bar];
    for (let i = 0; i < arp.length; i += 1) {
      this.pluck(arp[i], t0 + (i * BAR) / arp.length, 0.22, dest);
    }
    // Lead motif.
    for (const note of LEAD) {
      if (note.bar === bar && Math.abs(note.at - inBar) < 0.5) {
        this.lead(note.f, t0 + (note.at - inBar) * BEAT, note.d * BEAT * 2, dest);
      }
    }
  }

  osc(type, f, t0, d, gain, dest, f1 = null) {
    const ctx = this.engine.ctx;
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f, t0);
    if (f1 !== null) o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + d);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain), t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g).connect(dest);
    o.start(t0);
    o.stop(t0 + d + 0.02);
  }

  kick(t0, dest) {
    this.osc('sine', 150, t0, 0.16, 0.5, dest, 45);
  }

  clap(t0, dest) {
    const ctx = this.engine.ctx;
    const len = Math.floor(ctx.sampleRate * 0.1);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 1800;
    f.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.005);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.09);
    src.connect(f).connect(g).connect(dest);
    src.start(t0);
    src.stop(t0 + 0.12);
  }

  hat(t0, dest, gain) {
    const ctx = this.engine.ctx;
    const len = Math.floor(ctx.sampleRate * 0.05);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const f = ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = 7500;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.04);
    src.connect(f).connect(g).connect(dest);
    src.start(t0);
    src.stop(t0 + 0.06);
  }

  bass(f, t0, d, dest, gain = 0.8) {
    this.osc('triangle', f, t0, d, 0.32 * gain, dest);
    this.osc('square', f, t0, d * 0.6, 0.06 * gain, dest);
  }

  chord(freqs, t0, d, dest, gain = 0.8) {
    for (const f of freqs) {
      this.osc('triangle', f, t0, d, 0.07 * gain, dest);
    }
  }

  pluck(f, t0, d, dest) {
    this.osc('square', f, t0, d * 0.7, 0.05, dest);
    this.osc('sine', f * 2, t0, d * 0.5, 0.03, dest);
  }

  lead(f, t0, d, dest) {
    this.osc('sawtooth', f, t0, d, 0.06, dest);
    this.osc('sine', f, t0, d, 0.08, dest);
  }
}
