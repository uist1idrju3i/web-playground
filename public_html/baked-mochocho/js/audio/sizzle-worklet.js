// AudioWorklet: griddle sizzle = band-limited hiss plus random crackles whose density follows
// the simulated evaporation intensity (parameter "intensity", 0..1).
class SizzleProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [
      { name: 'intensity', defaultValue: 0, minValue: 0, maxValue: 1, automationRate: 'k-rate' },
    ];
  }

  constructor() {
    super();
    this.seed = 0x9e3779b9;
    this.lp = 0;
    this.hp = 0;
    this.crackle = 0;
    this.env = 0;
  }

  random() {
    let x = this.seed;
    x ^= x << 13;
    x ^= x >>> 17;
    x ^= x << 5;
    this.seed = x >>> 0;
    return this.seed / 4294967296;
  }

  process(_inputs, outputs, parameters) {
    const out = outputs[0];
    const intensity = parameters.intensity[0];
    const density = intensity * intensity * 0.012;
    const channel = out[0];
    for (let i = 0; i < channel.length; i += 1) {
      const white = this.random() * 2 - 1;
      this.lp += 0.45 * (white - this.lp);
      const hiss = white - this.lp;
      if (this.random() < density) this.env = 0.6 + this.random() * 0.4;
      this.env *= 0.93;
      this.crackle = this.env * (this.random() * 2 - 1);
      channel[i] = (hiss * 0.18 * intensity + this.crackle * 0.6) * Math.min(1, intensity * 3);
    }
    for (let c = 1; c < out.length; c += 1) out[c].set(channel);
    return true;
  }
}

registerProcessor('mochocho-sizzle', SizzleProcessor);
