// WebAudio engine: lookahead-scheduled adaptive BGM plus the cue set.
// Layered synths (no samples): sho-like pad, taiko, koto pluck, flute lead.
import { BPM, CHORDS, CUES, KOTO_DIV, MELODY, TAIKO } from './score.js';

const BAR = (60 / BPM) * 4; // seconds per 4/4 bar

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.bgmGain = null;
    this.sfxGain = null;
    this.reverb = null;
    this.reverbSend = null;
    this.muted = false;
    this.volume = 0.8;
    this.playing = false;
    this.step = 0; // scheduler tick in eighths
    this.nextTime = 0;
    this.timer = null;
    this.intensity = 0; // 0..3 layers enabled by tower height
    this.onWarning = null;
  }

  ensure() {
    if (this.ctx) return true;
    const AC = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AC) return false;
    this.ctx = new AC({ latencyHint: 'interactive' });
    const c = this.ctx;
    this.master = c.createGain();
    const compressor = c.createDynamicsCompressor();
    compressor.threshold.value = -18;
    compressor.ratio.value = 4;
    this.master.connect(compressor);
    compressor.connect(c.destination);
    this.bgmGain = c.createGain();
    this.sfxGain = c.createGain();
    this.bgmGain.connect(this.master);
    this.sfxGain.connect(this.master);
    // Procedural impulse response -> convolver reverb for grandeur.
    const len = Math.floor(c.sampleRate * 2.4);
    const ir = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = ir.getChannelData(ch);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2.4 * 0.55;
      }
    }
    this.reverb = c.createConvolver();
    this.reverb.buffer = ir;
    this.reverbSend = c.createGain();
    this.reverbSend.gain.value = 0.33;
    this.reverbSend.connect(this.reverb);
    this.reverb.connect(this.master);
    this.applyVolume();
    return true;
  }

  resume() {
    if (!this.ctx) return;
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  suspend() {
    if (this.ctx?.state === 'running') void this.ctx.suspend();
  }

  applyVolume() {
    if (!this.master) return;
    const v = this.muted ? 0 : this.volume;
    this.master.gain.setTargetAtTime(v * v, this.ctx.currentTime, 0.05);
  }

  setMuted(m) {
    this.muted = m;
    this.applyVolume();
  }

  setVolume(v) {
    this.volume = Math.min(1, Math.max(0, v));
    this.applyVolume();
  }

  // ----- instruments (each renders one note into a given bus) -----
  pad(freq, t, dur) {
    const c = this.ctx;
    const out = c.createGain();
    out.gain.value = 0;
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.055, t + dur * 0.4);
    out.gain.linearRampToValueAtTime(0.02, t + dur);
    out.gain.linearRampToValueAtTime(0, t + dur + 0.9);
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1400;
    for (const detune of [-6, 0, 6]) {
      const o = c.createOscillator();
      o.type = 'sawtooth';
      o.frequency.value = freq;
      o.detune.value = detune;
      o.connect(filter);
      o.start(t);
      o.stop(t + dur + 1.0);
    }
    filter.connect(out);
    out.connect(this.bgmGain);
    out.connect(this.reverbSend);
  }

  taiko(t, vel, low) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(low ? 160 : 240, t);
    o.frequency.exponentialRampToValueAtTime(low ? 48 : 90, t + 0.16);
    g.gain.setValueAtTime(0.7 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    o.connect(g).connect(this.bgmGain);
    const noise = this.noiseBurst(0.06, 900);
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.25 * vel, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.09);
    noise.connect(ng).connect(this.bgmGain);
    o.start(t);
    o.stop(t + 0.45);
    noise.start(t);
    noise.stop(t + 0.1);
  }

  koto(freq, t, vel = 1) {
    const c = this.ctx;
    const g = c.createGain();
    g.gain.setValueAtTime(0.16 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    const bp = c.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = freq * 2;
    bp.Q.value = 1.1;
    for (const dt of [-3, 0]) {
      const o = c.createOscillator();
      o.type = 'triangle';
      o.frequency.value = freq;
      o.detune.value = dt;
      o.connect(bp);
      o.start(t);
      o.stop(t + 1.0);
    }
    bp.connect(g).connect(this.bgmGain);
    g.connect(this.reverbSend);
  }

  flute(freq, t, dur, vel = 1) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'sine';
    o.frequency.value = freq;
    const vib = c.createOscillator();
    vib.frequency.value = 4.6;
    const vibG = c.createGain();
    vibG.gain.value = freq * 0.008;
    vib.connect(vibG);
    vibG.connect(o.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.1 * vel, t + Math.min(0.12, dur * 0.3));
    g.gain.setValueAtTime(0.1 * vel, t + dur * 0.8);
    g.gain.linearRampToValueAtTime(0, t + dur * 1.05);
    const noise = this.noiseBurst(dur, freq * 3);
    const ng = c.createGain();
    ng.gain.setValueAtTime(0.012 * vel, t);
    o.connect(g).connect(this.bgmGain);
    g.connect(this.reverbSend);
    noise.connect(ng).connect(this.bgmGain);
    o.start(t);
    o.stop(t + dur * 1.1);
    vib.start(t);
    vib.stop(t + dur * 1.1);
    noise.start(t);
    noise.stop(t + dur);
  }

  noiseBurst(dur, freq) {
    const c = this.ctx;
    const src = c.createBufferSource();
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur) + 64, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    src.buffer = buf;
    src.loop = true;
    const f = c.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = freq;
    f.Q.value = 0.8;
    src.connect(f);
    f.start = (t) => src.start(t);
    f.stop = (t) => src.stop(t);
    return f;
  }

  cueTone(freq, t, dur, vel = 1) {
    const c = this.ctx;
    const o = c.createOscillator();
    o.type = 'triangle';
    o.frequency.value = Math.min(freq, 2500); // bard rule: fundamental <= 2.5 kHz
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22 * vel, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t + Math.max(0.05, dur));
    o.connect(g).connect(this.sfxGain);
    g.connect(this.reverbSend);
    o.start(t);
    o.stop(t + dur + 0.1);
  }

  // ----- cue set (bard contract) -----
  playCue(id, intensity = 1) {
    if (!this.ctx || this.muted) return;
    const cue = CUES[id];
    if (!cue) return;
    const t = this.ctx.currentTime + 0.02;
    cue.notes.forEach((f, i) => {
      this.cueTone(f, t + i * Math.min(cue.dur, 0.28), Math.min(cue.dur * 1.6, 0.3), intensity);
    });
  }

  landCue(strength) {
    // Landing thump: scaled by impact — a louder taiko-like hit.
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime + 0.01;
    const vel = Math.min(1, 0.35 + strength);
    this.taikoAt(this.sfxGain, t, vel, true);
  }

  taikoAt(bus, t, vel, low) {
    const c = this.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(low ? 150 : 230, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.14);
    g.gain.setValueAtTime(0.6 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + 0.4);
  }

  // ----- BGM sequencer -----
  startBgm() {
    if (!this.ctx || this.playing) return;
    this.playing = true;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.08;
    const tick = () => {
      if (!this.playing) return;
      const eighth = BAR / 8;
      while (this.nextTime < this.ctx.currentTime + 0.3) {
        this.scheduleStep(this.step, this.nextTime);
        this.step += 1;
        this.nextTime += eighth;
      }
      this.timer = setTimeout(tick, 60);
    };
    tick();
  }

  stopBgm() {
    this.playing = false;
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
  }

  // One eighth-note step. `step` counts eighths from BGM start.
  scheduleStep(step, t) {
    const barPos = (step / 8) % 4; // beats within the 4-bar chord cycle
    const chordIndex = Math.floor(step / 32) % CHORDS.length;
    // Pad chord at each bar start (always on — the "sho" bed).
    if (step % 8 === 0) {
      for (const f of CHORDS[chordIndex]) this.pad(f, t, BAR);
    }
    // Taiko enters at intensity >= 1.
    if (this.intensity >= 1) {
      for (const [b, v, kind] of TAIKO) {
        if (Math.abs(barPos - b) < 1e-6) this.taiko(t, v, kind === 'low');
      }
    }
    // Koto arpeggio enters at intensity >= 2.
    if (this.intensity >= 2 && step % 2 === 0) {
      const chord = CHORDS[chordIndex];
      const f = chord[(step / 2) % chord.length] * 2;
      this.koto(f, t, 0.9);
    }
    // Flute lead enters at intensity >= 3 (or always after 8 loops).
    const beatInLoop = barPos + 4 * (Math.floor(step / 8) % 4);
    if (this.intensity >= 3) {
      for (const [b, f, d] of MELODY) {
        if (Math.abs(beatInLoop - b) < 1e-6) this.flute(f, t, d * (BAR / 4), 1);
      }
    }
    void KOTO_DIV;
  }

  setIntensity(n) {
    this.intensity = Math.max(0, Math.min(3, n));
  }
}
