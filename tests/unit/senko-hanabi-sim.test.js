import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  createSimulation,
  EVENT,
  P,
  P_STRIDE,
  PHASE,
  RNG_MODE,
} from '../../public_html/senko-hanabi/js/sim.js';

const wasmBuilds = await Promise.all(
  [
    {
      name: 'baseline',
      simd: false,
      path: new URL('../../public_html/senko-hanabi/wasm/senko-sim.wasm', import.meta.url),
    },
    {
      name: 'SIMD',
      simd: true,
      path: new URL('../../public_html/senko-hanabi/wasm/senko-sim-simd.wasm', import.meta.url),
    },
  ].map(async ({ path, ...build }) => ({ ...build, source: await readFile(path) })),
);

function stepSeconds(sim, seconds, chunk = 1 / 60, onStep = null) {
  let t = 0;
  while (t < seconds) {
    sim.step(Math.min(chunk, seconds - t));
    t += chunk;
    if (onStep) onStep();
  }
}

for (const build of wasmBuilds) {
  test(`feel mode is deterministic across ${build.name} builds`, async () => {
    const opts = { seed: 777, mode: RNG_MODE.FEEL, simd: build.simd, source: build.source };
    const a = await createSimulation(opts);
    const b = await createSimulation(opts);
    a.light();
    b.light();
    stepSeconds(a, 15);
    stepSeconds(b, 15);
    assert.deepEqual([...a.state], [...b.state]);
    assert.deepEqual([...a.particles], [...b.particles]);
    assert.deepEqual([...a.ball], [...b.ball]);
  });

  test(`phases advance in order and the stick finishes (${build.name})`, async () => {
    const sim = await createSimulation({
      seed: 42,
      mode: RNG_MODE.FEEL,
      simd: build.simd,
      source: build.source,
    });
    sim.light();
    const phases = [];
    stepSeconds(sim, 60, 1 / 60, () => {
      sim.drainEvents((kind, a) => {
        if (kind === EVENT.PHASE) phases.push(a);
      });
    });
    // PHASE events include the initial tsubomi entry emitted by sim_light().
    assert.deepEqual(phases, [
      PHASE.TSUBOMI,
      PHASE.BOTAN,
      PHASE.MATSUBA,
      PHASE.CHIRIGIKU,
      PHASE.FALL,
      PHASE.SPENT,
    ]);
    assert.equal(sim.state[6], 1); // finished
    assert.ok(sim.state[1] > 10, `elapsed ${sim.state[1]} should be a real burn`);
    assert.ok(sim.state[7] > 20, `ejected ${sim.state[7]}`);
    assert.ok(sim.state[8] > 100, `bursts ${sim.state[8]}`);
  });

  test(`feel-mode ejections sweep every direction bin (${build.name})`, async () => {
    const sim = await createSimulation({
      seed: 7,
      mode: RNG_MODE.FEEL,
      simd: build.simd,
      source: build.source,
    });
    sim.light();
    const bins = new Array(16).fill(0);
    const dt = 1 / 240;
    stepSeconds(sim, 40, dt, () => {
      for (let i = 0; i < sim.particles.length / P_STRIDE; i += 1) {
        const b = i * P_STRIDE;
        if (
          sim.particles[b + P.GEN] === 1 &&
          sim.particles[b + P.AGE] < dt * 1.5 &&
          sim.particles[b + P.HEAT] > 0
        ) {
          const angle = Math.atan2(sim.particles[b + P.VY], sim.particles[b + P.VX]);
          const wrapped = (angle + Math.PI * 2) % (Math.PI * 2);
          bins[Math.floor((wrapped / (Math.PI * 2)) * 16)] += 1;
        }
      }
    });
    // Every azimuth bin must be used — the coverage picker sweeps the circle.
    assert.ok(
      bins.every((n) => n > 0),
      `direction coverage ${bins}`,
    );
  });

  test(`feel-mode ejection intervals keep a floor (${build.name})`, async () => {
    const sim = await createSimulation({
      seed: 5,
      mode: RNG_MODE.FEEL,
      simd: build.simd,
      source: build.source,
    });
    sim.light();
    const intervals = [];
    stepSeconds(sim, 50, 1 / 60, () => {
      sim.drainEvents((kind, a, b) => {
        if (kind === EVENT.EJECT) intervals.push(b);
      });
    });
    assert.ok(intervals.length > 30);
    // Matsuba mean is 0.07s; the floor is 25% of the phase mean (0.0175s),
    // asserted with a small margin — no two pops may feel simultaneous.
    assert.ok(Math.min(...intervals) >= 0.016, `min eject interval ${Math.min(...intervals)}`);
  });

  test(`feel-mode matsuba intervals vary less than trng (${build.name})`, async () => {
    const collect = async (mode, extra = {}) => {
      const sim = await createSimulation({
        seed: 9,
        mode,
        simd: build.simd,
        source: build.source,
        ...extra,
      });
      sim.light();
      const v = [];
      let phase = 0;
      stepSeconds(sim, 50, 1 / 60, () => {
        sim.drainEvents((kind, a, b) => {
          if (kind === EVENT.PHASE) phase = a;
          else if (kind === EVENT.EJECT && phase === PHASE.MATSUBA) v.push(b);
        });
      });
      return v;
    };
    let counter = 0;
    const randomSource = (u32) => {
      for (let i = 0; i < u32.length; i += 1) u32[i] = (counter += 0x9e3779b9) >>> 0;
    };
    const feel = await collect(RNG_MODE.FEEL);
    const trng = await collect(RNG_MODE.TRNG, { randomSource });
    const cv = (xs) => {
      const m = xs.reduce((a, x) => a + x, 0) / xs.length;
      return Math.sqrt(xs.reduce((a, x) => a + (x - m) ** 2, 0) / xs.length) / m;
    };
    assert.ok(feel.length > 10 && trng.length > 10);
    assert.ok(cv(feel) < cv(trng), `cv feel ${cv(feel)} trng ${cv(trng)}`);
  });

  test(`trng mode consumes the JS-fed entropy ring (${build.name})`, async () => {
    // Deterministic "true random" source for the test: fixed pattern.
    let counter = 0;
    const randomSource = (u32) => {
      for (let i = 0; i < u32.length; i += 1) u32[i] = (counter += 0x9e3779b9) >>> 0;
    };
    const sim = await createSimulation({
      seed: 1,
      mode: RNG_MODE.TRNG,
      simd: build.simd,
      source: build.source,
      randomSource,
    });
    sim.feedEntropy();
    sim.light();
    const phases = [];
    stepSeconds(sim, 60, 1 / 60, () => {
      sim.drainEvents((kind, a) => {
        if (kind === EVENT.PHASE) phases.push(a);
      });
    });
    assert.equal(sim.state[6], 1); // still completes a burn
    assert.equal(phases.length, 6);
    assert.equal(sim.state[12], 0); // no starvation events
  });

  test(`trng mode marks starvation when the ring runs dry (${build.name})`, async () => {
    // Never feed entropy: replace getRandomValues feed with a no-op so the
    // ring stays empty and the sim must fall back, counting STARVE.
    const sim = await createSimulation({
      seed: 1,
      mode: RNG_MODE.TRNG,
      simd: build.simd,
      source: build.source,
      randomSource: (u32) => u32.fill(0),
    });
    sim.feedEntropy = () => {};
    sim.light();
    let starveEvents = 0;
    stepSeconds(sim, 10, 1 / 60, () => {
      sim.drainEvents((kind) => {
        if (kind === EVENT.STARVE) starveEvents += 1;
      });
    });
    assert.ok(sim.state[12] > 0, 'starved counter should increment');
    assert.ok(starveEvents > 0, 'STARVE events should be emitted');
  });

  test(`restart resets to a new stick (${build.name})`, async () => {
    const sim = await createSimulation({
      seed: 11,
      mode: RNG_MODE.FEEL,
      simd: build.simd,
      source: build.source,
    });
    sim.light();
    stepSeconds(sim, 30);
    assert.ok(sim.state[1] > 0);
    sim.restart(22, RNG_MODE.FEEL);
    assert.equal(sim.state[0], PHASE.IDLE);
    assert.equal(sim.state[1], 0);
    assert.equal(sim.state[7], 0);
    sim.light();
    assert.equal(sim.state[0], PHASE.TSUBOMI);
  });
}
