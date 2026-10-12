// Sparse night-time pad: a slow three-voice drone cycling a minor-seventh
// voicing every ~18s, synthesized from detuned sines with a slow LFO on the
// filter — quiet enough to sit under the crackle bed.

export function createMusic(ctx, bus) {
  let voices = [];
  let timer = null;
  let enabled = true;
  let running = false;
  // A minor add9 spread over two octaves, waltz-slow.
  const VOICINGS = [
    [220.0, 329.6, 493.9], // A3 E4 B4
    [196.0, 293.7, 493.9], // G3 D4 B4
    [174.6, 261.6, 440.0], // F3 C4 A4
    [220.0, 277.2, 523.3], // A3 C#4 C5 -> gentle lift
  ];
  let idx = 0;

  function pad(freqs) {
    const t = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.035, t + 3);
    out.gain.setTargetAtTime(0, t + 15, 2.5);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    lp.connect(out).connect(bus);
    const oscs = freqs.map((f, i) => {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * (1 + i * 0.0008);
      o.connect(lp);
      o.start(t);
      o.stop(t + 20);
      return o;
    });
    voices = oscs;
    setTimeout(() => {
      for (const o of oscs) o.disconnect();
      lp.disconnect();
      out.disconnect();
    }, 21000);
  }

  return {
    start() {
      if (running || !enabled) return;
      running = true;
      pad(VOICINGS[idx]);
      timer = setInterval(() => {
        idx = (idx + 1) % VOICINGS.length;
        pad(VOICINGS[idx]);
      }, 18000);
    },
    stop() {
      running = false;
      if (timer) clearInterval(timer);
      timer = null;
      for (const o of voices) {
        try {
          o.stop();
        } catch {
          /* already stopped */
        }
      }
      voices = [];
    },
    setEnabled(on) {
      enabled = on;
      if (!on) this.stop();
    },
  };
}
