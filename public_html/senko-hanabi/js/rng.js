// Reference implementations of the two randomness regimes, in JavaScript so
// unit tests can verify the same math the WASM sim implements.
//
// - trng: memoryless draws. Every probability is an independent uniform —
//   nature-like, with all the clumping and streaks that brings.
// - feel: seeded xoshiro128** plus game-industry shaping (Warcraft III PRD,
//   Tetris-style shuffle bags over distribution quantiles, azimuth coverage).

// xoshiro128** — same construction as the Rust side (splitmix32 expansion).
export function createXoshiro(seed) {
  let x = (seed + 0x9e3779b9) | 0;
  const s = new Uint32Array(4);
  for (let i = 0; i < 4; i += 1) {
    x ^= x >>> 16;
    x = Math.imul(x, 0x21f0aaad) | 0;
    x ^= x >>> 15;
    x = Math.imul(x, 0x735a2d97) | 0;
    x ^= x >>> 15;
    s[i] = x >>> 0;
  }
  return {
    next() {
      const r = Math.imul(s[1], 5);
      const rotated = ((r << 7) | (r >>> 25)) >>> 0;
      const result = Math.imul(rotated, 9) >>> 0;
      const t = s[1] << 9;
      s[2] ^= s[0];
      s[3] ^= s[1];
      s[1] ^= s[2];
      s[0] ^= s[3];
      s[2] ^= t;
      s[3] = ((s[3] << 11) | (s[3] >>> 21)) >>> 0;
      return result;
    },
    f32() {
      return (this.next() >>> 8) / 16777216;
    },
  };
}

// PRD (pseudo-random distribution): probability on the N-th step since the
// last success is C·N, matching the Warcraft III engine. The survival
// function is Rayleigh-shaped, so durations cluster near the mean.
// mean of Rayleigh(sigma=1/sqrt(C)) = sqrt(pi/(2C))  =>  C = pi/(2 M^2)
export function prdConstant(meanSteps) {
  return Math.PI / (2 * meanSteps * meanSteps);
}

// A shuffle bag over normalized quantiles {(k+0.5)/n}: each cycle yields a
// permutation of evenly spread samples — expected value preserved, variance
// and clumping reduced. `draw` returns a uniform u32->f32 source.
export function createQuantileBag(rand, size = 8) {
  let bag = [];
  let pos = size;
  return () => {
    if (pos >= size) {
      bag = Array.from({ length: size }, (_, k) => (k + 0.5) / size);
      for (let i = size - 1; i > 0; i -= 1) {
        const j = Math.floor(rand() * (i + 1));
        [bag[i], bag[j]] = [bag[j], bag[i]];
      }
      pos = 0;
    }
    return bag[pos++];
  };
}

// Exponential interval from a normalized draw: trng passes u() directly,
// feel passes a bagged draw. Same mean, tighter spacing.
export function expInterval(mean, u) {
  return -Math.log(1 - Math.min(u, 0.9999)) * mean;
}
