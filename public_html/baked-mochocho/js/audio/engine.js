import { CHORDS, CUES, LOOP_SECONDS, melodyEvents, midiToHz, BPM, swungTime } from './music.js';

// All sound is synthesized at runtime: no audio files are loaded.
export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.bgmEnabled = true;
    this.nextLoop = 0;
    this.warningUntil = 0;
    this.lastPop = 0;
  }

  async unlock() {
    if (this.ctx) {
      if (this.ctx.state !== 'running') await this.ctx.resume();
      return true;
    }
    const AudioContextClass = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!AudioContextClass) return false;
    const ctx = new AudioContextClass({ latencyHint: 'interactive' });
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = this.enabled ? 0.9 : 0;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.music = ctx.createGain();
    this.music.gain.value = this.bgmEnabled ? 0.34 : 0;
    this.music.connect(this.master);
    this.fx = ctx.createGain();
    this.fx.gain.value = 0.85;
    this.fx.connect(this.master);
    this.reverb = this.makeReverb();
    this.reverb.connect(this.master);
    this.noise = this.makeNoiseBuffer(2);
    await this.makeSizzle();
    this.makePour();
    this.makeSteam();
    if (ctx.state !== 'running') await ctx.resume();
    this.nextLoop = ctx.currentTime + 0.1;
    return true;
  }

  setEnabled(on) {
    this.enabled = on;
    if (this.master) this.master.gain.setTargetAtTime(on ? 0.9 : 0, this.ctx.currentTime, 0.05);
  }

  setBgm(on) {
    this.bgmEnabled = on;
    if (this.music) this.music.gain.setTargetAtTime(on ? 0.34 : 0, this.ctx.currentTime, 0.2);
  }

  suspend() {
    return this.ctx?.suspend();
  }

  resume() {
    return this.ctx?.resume();
  }

  makeNoiseBuffer(seconds) {
    const { ctx } = this;
    const buffer = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let seed = 1234567;
    for (let i = 0; i < data.length; i += 1) {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      data[i] = seed / 2147483648 - 1;
    }
    return buffer;
  }

  makeReverb() {
    const { ctx } = this;
    const convolver = ctx.createConvolver();
    const length = Math.floor(ctx.sampleRate * 1.6);
    const impulse = ctx.createBuffer(2, length, ctx.sampleRate);
    let seed = 42;
    for (let c = 0; c < 2; c += 1) {
      const data = impulse.getChannelData(c);
      for (let i = 0; i < length; i += 1) {
        seed = (seed * 1103515245 + 12345) >>> 0;
        data[i] = (seed / 2147483648 - 1) * (1 - i / length) ** 3 * 0.5;
      }
    }
    convolver.buffer = impulse;
    const send = ctx.createGain();
    send.gain.value = 0.22;
    send.connect(convolver);
    this.reverbSend = send;
    return convolver;
  }

  noiseSource(loop = true) {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = loop;
    return src;
  }

  async makeSizzle() {
    const { ctx } = this;
    this.sizzleGain = ctx.createGain();
    this.sizzleGain.gain.value = 0;
    const band = ctx.createBiquadFilter();
    band.type = 'highpass';
    band.frequency.value = 2200;
    const shelf = ctx.createBiquadFilter();
    shelf.type = 'peaking';
    shelf.frequency.value = 6500;
    shelf.gain.value = 5;
    this.sizzleGain.connect(band).connect(shelf).connect(this.fx);
    try {
      await ctx.audioWorklet.addModule(new URL('./sizzle-worklet.js', import.meta.url));
      this.sizzleNode = new AudioWorkletNode(ctx, 'mochocho-sizzle', { outputChannelCount: [1] });
      this.sizzleNode.connect(this.sizzleGain);
      this.sizzleParam = this.sizzleNode.parameters.get('intensity');
    } catch {
      const src = this.noiseSource();
      src.connect(this.sizzleGain);
      src.start();
      this.sizzleParam = null;
    }
  }

  makePour() {
    const { ctx } = this;
    const src = this.noiseSource();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 700;
    lp.Q.value = 6;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 5.5;
    const depth = ctx.createGain();
    depth.gain.value = 260;
    lfo.connect(depth).connect(lp.frequency);
    this.pourGain = ctx.createGain();
    this.pourGain.gain.value = 0;
    src.connect(lp).connect(this.pourGain).connect(this.fx);
    src.start();
    lfo.start();
  }

  makeSteam() {
    const { ctx } = this;
    const src = this.noiseSource();
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1400;
    bp.Q.value = 0.6;
    this.steamGain = ctx.createGain();
    this.steamGain.gain.value = 0;
    src.connect(bp).connect(this.steamGain).connect(this.fx);
    src.start();
  }

  // Called every frame with the simulation's audio block.
  update(audio) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const now = this.ctx.currentTime;
    const sizzle = Math.min(1, audio.sizzle + audio.contactBurst * 0.6);
    if (this.sizzleParam) this.sizzleParam.setTargetAtTime(sizzle, now, 0.05);
    this.sizzleGain.gain.setTargetAtTime(this.sizzleParam ? 0.9 : sizzle * 0.12, now, 0.05);
    this.pourGain.gain.setTargetAtTime(Math.min(0.5, audio.pourFlowMlS / 30), now, 0.04);
    this.steamGain.gain.setTargetAtTime(audio.steamRate * 0.07, now, 0.2);
    const pops = Math.min(3, audio.bubblePops);
    for (let i = 0; i < pops; i += 1) {
      if (now - this.lastPop > 0.035) {
        this.lastPop = now;
        this.pop(now + Math.random() * 0.03);
      }
    }
    if (audio.flipLandedEvents > 0) this.thunk(now);
    if (audio.burning > 0.4) this.warn(now);
    this.scheduleMusic(now);
  }

  pop(when) {
    const { ctx } = this;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const base = 380 + Math.random() * 500;
    osc.frequency.setValueAtTime(base, when);
    osc.frequency.exponentialRampToValueAtTime(base * 2.2, when + 0.03);
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.18, when + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
    osc.connect(gain).connect(this.fx);
    osc.start(when);
    osc.stop(when + 0.06);
  }

  thunk(when) {
    const { ctx } = this;
    const body = ctx.createOscillator();
    const bodyGain = ctx.createGain();
    body.frequency.setValueAtTime(110, when);
    body.frequency.exponentialRampToValueAtTime(48, when + 0.14);
    bodyGain.gain.setValueAtTime(0.7, when);
    bodyGain.gain.exponentialRampToValueAtTime(0.0001, when + 0.2);
    body.connect(bodyGain).connect(this.fx);
    body.start(when);
    body.stop(when + 0.22);
    for (const [ratio, level] of [
      [1, 0.08],
      [2.76, 0.05],
      [5.4, 0.03],
    ]) {
      const ring = ctx.createOscillator();
      const g = ctx.createGain();
      ring.frequency.value = 620 * ratio;
      g.gain.setValueAtTime(level, when);
      g.gain.exponentialRampToValueAtTime(0.0001, when + 0.35 / ratio + 0.05);
      ring.connect(g).connect(this.fx);
      g.connect(this.reverbSend);
      ring.start(when);
      ring.stop(when + 0.5);
    }
    const click = this.noiseSource(false);
    const cg = ctx.createGain();
    cg.gain.setValueAtTime(0.25, when);
    cg.gain.exponentialRampToValueAtTime(0.0001, when + 0.03);
    click.connect(cg).connect(this.fx);
    click.start(when, Math.random());
    click.stop(when + 0.04);
  }

  warn(now) {
    if (now < this.warningUntil) return;
    const cue = CUES.warning;
    this.cue('warning');
    this.warningUntil = now + (cue.notes.reduce((s, [, ms]) => s + ms, 0) + cue.restMs) / 1000;
  }

  cue(name) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const cue = CUES[name];
    let when = this.ctx.currentTime + 0.01;
    for (const [midi, ms] of cue.notes) {
      this.voice(cue.wave, midiToHz(midi), when, ms / 1000, this.fx, 0.32);
      when += ms / 1000;
    }
  }

  voice(kind, hz, when, dur, bus, level) {
    const { ctx } = this;
    const gain = ctx.createGain();
    const osc = ctx.createOscillator();
    const tail = kind === 'bell' ? 0.6 : kind === 'marimba' ? 0.35 : 0.05;
    if (kind === 'square') {
      osc.type = 'triangle';
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.linearRampToValueAtTime(level * 0.8, when + 0.01);
      gain.gain.setValueAtTime(level * 0.8, when + dur - 0.02);
      gain.gain.linearRampToValueAtTime(0.0001, when + dur + tail);
    } else {
      osc.type = 'sine';
      const mod = ctx.createOscillator();
      const modGain = ctx.createGain();
      mod.frequency.value = hz * (kind === 'bell' ? 3.5 : 4);
      modGain.gain.setValueAtTime(hz * (kind === 'bell' ? 1.2 : 2), when);
      modGain.gain.exponentialRampToValueAtTime(1, when + 0.08);
      mod.connect(modGain).connect(osc.frequency);
      mod.start(when);
      mod.stop(when + dur + tail);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(level, when + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + dur + tail);
    }
    osc.frequency.value = hz;
    osc.connect(gain).connect(bus);
    gain.connect(this.reverbSend);
    osc.start(when);
    osc.stop(when + dur + tail + 0.02);
  }

  scheduleMusic(now) {
    if (!this.bgmEnabled || now + 0.6 < this.nextLoop) return;
    const start = Math.max(this.nextLoop, now + 0.05);
    for (const event of melodyEvents()) {
      this.voice(
        'marimba',
        midiToHz(event.midi),
        start + event.start,
        event.dur * 0.8,
        this.music,
        0.22,
      );
    }
    const beat = 60 / BPM;
    const eighth = beat / 2;
    CHORDS.forEach((chord, bar) => {
      const barStart = start + bar * 4 * beat;
      for (const [eighthIndex, degree] of [
        [0, 0],
        [3, 7],
        [4, 0],
        [7, 7],
      ]) {
        this.bass(
          midiToHz(chord.root - 12 + degree),
          barStart + swungTime(eighthIndex, eighth),
          eighth * 0.9,
        );
      }
      for (const off of [2, 6]) {
        for (const tone of chord.tones) {
          this.voice(
            'marimba',
            midiToHz(chord.root + 12 + tone),
            barStart + swungTime(off, eighth),
            eighth,
            this.music,
            0.06,
          );
        }
      }
      for (let i = 0; i < 8; i += 1)
        this.shaker(barStart + swungTime(i, eighth), i % 2 ? 0.05 : 0.025);
    });
    this.nextLoop = start + LOOP_SECONDS;
  }

  bass(hz, when, dur) {
    const { ctx } = this;
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    const gain = ctx.createGain();
    osc.frequency.value = hz;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(0.35, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    osc.connect(gain).connect(this.music);
    osc.start(when);
    osc.stop(when + dur + 0.02);
  }

  shaker(when, level) {
    const src = this.noiseSource(false);
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 7000;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(level, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.05);
    src.connect(hp).connect(gain).connect(this.music);
    src.start(when, Math.random());
    src.stop(when + 0.06);
  }
}
