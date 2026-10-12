// Quiet Japanese-style ambient: a sparse koto-like plucked melody on the
// yonanuki (minor pentatonic) scale over a barely-there low drone. Notes are
// scheduled ahead of the audio clock in one looping phrase (~40s) so the
// timing stays steady even when the tab throttles timers.
//
// The phrase is an original composition for this app: slow descending
// contours around A, long rests, no percussion — calm enough to sit under
// the sparkler's own hiss and crackle.

const A3 = 220.0;
const C4 = 261.63;
const D4 = 293.66;
const E4 = 329.63;
const G4 = 392.0;
const A4 = 440.0;
const C5 = 523.25;
const D5 = 587.33;
const E5 = 659.25;

// [freq, seconds after phrase start]; rests are just gaps in the list.
const PHRASE = [
  [A4, 0.0],
  [E5, 2.4],
  [D5, 4.8],
  [C5, 7.6],
  [A4, 10.0],
  [G4, 13.2],
  [E4, 15.6],
  [D4, 18.4],
  [C4, 20.8],
  [A3, 23.2],
  [C4, 26.8],
  [E4, 28.8],
  [A4, 32.0],
  [G4, 34.4],
  [E4, 36.4],
  [D4, 38.8],
  [A3, 41.2],
];
const PHRASE_LEN = 46.0;

export function createMusic(ctx, bus) {
  let timer = null;
  let enabled = true;
  let running = false;
  let phraseStart = 0;
  const live = { oscs: [], gains: [] };

  // Plucked-string voice: triangle fundamental + a quiet second partial,
  // through a lowpass that darkens as the note decays.
  function koto(freq, t, vel) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vel, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.9);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.setValueAtTime(1600, t);
    lp.frequency.exponentialRampToValueAtTime(500, t + 1.8);
    g.connect(lp).connect(bus);
    for (const [mult, v] of [
      [1, 1],
      [2, 0.22],
    ]) {
      const o = ctx.createOscillator();
      o.type = 'triangle';
      o.frequency.value = freq * mult;
      const og = ctx.createGain();
      og.gain.value = v;
      // Slow, gentle vibrato on the sustain for a hand-plucked feel.
      const lfo = ctx.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 4.6;
      const lfoG = ctx.createGain();
      lfoG.gain.setValueAtTime(0, t);
      lfoG.gain.linearRampToValueAtTime(freq * mult * 0.004, t + 0.5);
      lfo.connect(lfoG).connect(o.frequency);
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + 2.0);
      lfo.start(t);
      lfo.stop(t + 2.0);
      live.oscs.push(o, lfo);
    }
    live.gains.push(g, lp);
  }

  // Low, stable drone under the phrase (A2 + E3 fifth), very quiet.
  function drone(t) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.012, t + 4);
    g.gain.setTargetAtTime(0, t + PHRASE_LEN - 4, 2);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 320;
    g.connect(lp).connect(bus);
    for (const f of [110.0, 164.81]) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      o.connect(g);
      o.start(t);
      o.stop(t + PHRASE_LEN + 2);
      live.oscs.push(o);
    }
    live.gains.push(g, lp);
  }

  function schedulePhrase(t0) {
    drone(t0);
    for (const [freq, at] of PHRASE) {
      // Alternate soft/softer touch so repeated plucks feel played, not metronomic.
      const vel = at % 9 < 4 ? 0.055 : 0.045;
      koto(freq, t0 + at, vel);
    }
  }

  function clearLive() {
    for (const o of live.oscs) {
      try {
        o.stop();
      } catch {
        /* already stopped */
      }
    }
    live.oscs.length = 0;
    live.gains.length = 0;
  }

  return {
    start() {
      if (running || !enabled) return;
      running = true;
      phraseStart = ctx.currentTime + 0.1;
      schedulePhrase(phraseStart);
      // Reschedule the next loop a beat before the current one tails out.
      timer = setTimeout(
        function loop() {
          if (!running) return;
          phraseStart += PHRASE_LEN;
          schedulePhrase(phraseStart);
          timer = setTimeout(loop, (PHRASE_LEN - 2) * 1000);
        },
        (PHRASE_LEN - 2) * 1000,
      );
    },
    stop() {
      running = false;
      if (timer) clearTimeout(timer);
      timer = null;
      clearLive();
    },
    setEnabled(on) {
      enabled = on;
      if (!on) this.stop();
    },
  };
}
