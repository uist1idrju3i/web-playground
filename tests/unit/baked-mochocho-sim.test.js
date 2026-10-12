import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import test from 'node:test';
import { createSimulation } from '../../public_html/baked-mochocho/js/sim.js';

const wasmBuilds = await Promise.all(
  [
    {
      name: 'baseline',
      simd: false,
      path: new URL('../../public_html/baked-mochocho/wasm/mochocho-sim.wasm', import.meta.url),
    },
    {
      name: 'SIMD',
      simd: true,
      path: new URL(
        '../../public_html/baked-mochocho/wasm/mochocho-sim-simd.wasm',
        import.meta.url,
      ),
    },
  ].map(async ({ path, ...build }) => ({ ...build, source: await readFile(path) })),
);

function makeSimulation(build, seed = 1) {
  return createSimulation({ seed, simd: build.simd, source: build.source });
}

function halfToFloat(bits) {
  const sign = bits & 0x8000 ? -1 : 1;
  const exponent = (bits >> 10) & 0x1f;
  const fraction = bits & 0x3ff;
  if (exponent === 0) return sign * 2 ** -14 * (fraction / 1024);
  if (exponent === 0x1f) return fraction ? NaN : sign * Infinity;
  return sign * 2 ** (exponent - 15) * (1 + fraction / 1024);
}

function fieldMassMl(simulation) {
  let sum = 0;
  for (let index = 0; index < simulation.fieldA.length; index += 4) {
    sum += halfToFloat(simulation.fieldA[index]) * simulation.grid.cell ** 2;
  }
  return sum / 1000;
}

async function pour(simulation, cavity, volumeMl, rateMlS = 4, maxStep = 0.5) {
  const { x, y } = simulation.cavities[cavity];
  simulation.setNozzle(x, y, rateMlS);
  let remaining = volumeMl / rateMlS;
  while (remaining > 0) {
    const dt = Math.min(maxStep, remaining);
    simulation.step(dt);
    remaining -= dt;
  }
  simulation.setNozzle(x, y, 0);
  simulation.step(maxStep);
}

async function createPouredPair(build, seed = 1, volumeMl = 40) {
  const simulation = await makeSimulation(build, seed);
  await pour(simulation, 0, volumeMl);
  await pour(simulation, 3, volumeMl);
  return simulation;
}

async function landFlip(simulation, pair = 0) {
  let elapsed = 0;
  while (elapsed < 1 && simulation.cavity(pair).flipLanded !== 1) {
    simulation.step(0.0833);
    elapsed += 0.0833;
  }
}

function assertFiniteFields(simulation) {
  for (const value of [...simulation.fieldA, ...simulation.fieldB]) {
    assert.notEqual(value & 0x7c00, 0x7c00, 'half-float fields must not contain NaN or infinity');
  }
  for (const value of simulation.particles()) assert.ok(Number.isFinite(value));
  for (let cavity = 0; cavity < simulation.cavities.length; cavity += 1) {
    for (const value of Object.values(simulation.cavity(cavity))) {
      assert.ok(Number.isFinite(value));
    }
  }
}

test('both WASM artifacts stay below 64 KiB', () => {
  for (const build of wasmBuilds) {
    assert.ok(
      build.source.byteLength < 64 * 1024,
      `${build.name}: ${build.source.byteLength} bytes`,
    );
  }
});

test('both builds export the plate geometry and stable field views', async () => {
  for (const build of wasmBuilds) {
    const simulation = await makeSimulation(build);
    assert.deepEqual(simulation.grid, { w: 176, h: 112, cell: 1.5 });
    assert.equal(simulation.cavities.length, 6);
    assert.deepEqual(simulation.cavities[0], { x: 42, y: 42 });
    assert.deepEqual(simulation.cavities[3], { x: 42, y: 126 });
    assert.equal(simulation.radius, 36);
    assert.equal(simulation.depth, 14);
    assert.equal(simulation.moldZ(42, 42), -14);
    assert.equal(simulation.moldZ(78, 42), 0);
    assert.equal(simulation.moldZ(0, 0), 0);
    assert.equal(simulation.fieldA.length, 176 * 112 * 4);
    assert.equal(simulation.fieldB.length, 176 * 112 * 4);
  }
});

test('both builds keep fields finite, temperatures bounded, and browning monotone', async () => {
  for (const build of wasmBuilds) {
    const simulation = await makeSimulation(build, 73);
    await pour(simulation, 0, 30);
    simulation.grease(42, 42, 22, 0.5);
    const cell = Math.round(42 / 1.5) * simulation.grid.w * 4 + Math.round(42 / 1.5) * 4;
    let previousBottomBrown = halfToFloat(simulation.fieldA[cell + 2]);
    let previousTopBrown = halfToFloat(simulation.fieldA[cell + 1]);
    let previousSet = simulation.cavity(0).topSetMean;
    for (let frame = 0; frame < 24; frame += 1) {
      simulation.step(0.0833);
      const bottomBrown = halfToFloat(simulation.fieldA[cell + 2]);
      const topBrown = halfToFloat(simulation.fieldA[cell + 1]);
      const topSet = simulation.cavity(0).topSetMean;
      assert.ok(bottomBrown + 0.001 >= previousBottomBrown);
      assert.ok(topBrown + 0.001 >= previousTopBrown);
      assert.ok(topSet + 0.001 >= previousSet);
      previousBottomBrown = bottomBrown;
      previousTopBrown = topBrown;
      previousSet = topSet;
    }
    assertFiniteFields(simulation);
    for (let index = 0; index < simulation.fieldB.length; index += 4) {
      const temperature = halfToFloat(simulation.fieldB[index]);
      assert.ok(temperature >= 15 && temperature <= 400);
    }
  }
});

test('both builds conserve poured volume through flow and flip merge', async () => {
  for (const build of wasmBuilds) {
    const simulation = await createPouredPair(build, 19);
    const pouredMl = fieldMassMl(simulation);
    assert.ok(Math.abs(pouredMl - 80) / 80 < 0.005, `${build.name}: poured ${pouredMl} ml`);
    assert.equal(simulation.startFlip(0), 0);
    await landFlip(simulation);
    assert.equal(simulation.cavity(0).flipLanded, 1);
    assert.ok(Math.abs(simulation.cavity(0).flipAngle - Math.PI) < 0.01);
    assert.ok(simulation.cavity(0).batterMl < 0.01);
    const mergedMl = fieldMassMl(simulation);
    assert.ok(Math.abs(mergedMl - pouredMl) / pouredMl < 0.005);
    assert.ok(simulation.cavity(3).batterMl > 25);
  }
});

test('both builds spread and self-level batter within the cavity', async () => {
  for (const build of wasmBuilds) {
    const simulation = await makeSimulation(build, 29);
    simulation.setHeat(0.6);
    const { x, y } = simulation.cavities[0];
    let capacityMl = 0;
    for (let row = 0; row < simulation.grid.h; row += 1) {
      for (let column = 0; column < simulation.grid.w; column += 1) {
        const xMm = (column + 0.5) * simulation.grid.cell;
        const yMm = (row + 0.5) * simulation.grid.cell;
        if ((xMm - x) ** 2 + (yMm - y) ** 2 <= simulation.radius ** 2) {
          capacityMl +=
            (Math.max(0, -simulation.moldZ(xMm, yMm)) * simulation.grid.cell ** 2) / 1000;
        }
      }
    }
    const pouredMl = capacityMl * 0.85;
    const pourDuration = pouredMl / 6;
    simulation.setNozzle(x, y, 6);
    let pouredSeconds = 0;
    while (pouredSeconds < pourDuration) {
      const dt = Math.min(0.05, pourDuration - pouredSeconds);
      simulation.step(dt);
      pouredSeconds += dt;
    }
    simulation.setNozzle(x, y, 0);
    for (let frame = 0; frame < 60; frame += 1) simulation.step(0.05);

    let maxHeight = 0;
    let innerCells = 0;
    let wetCells = 0;
    let minSurface = Infinity;
    let maxSurface = -Infinity;
    for (let row = 0; row < simulation.grid.h; row += 1) {
      for (let column = 0; column < simulation.grid.w; column += 1) {
        const height = halfToFloat(simulation.fieldA[(row * simulation.grid.w + column) * 4]);
        maxHeight = Math.max(maxHeight, height);
        const xMm = (column + 0.5) * simulation.grid.cell;
        const yMm = (row + 0.5) * simulation.grid.cell;
        if ((xMm - x) ** 2 + (yMm - y) ** 2 <= 30 ** 2) {
          innerCells += 1;
          if (height > 0.5) {
            wetCells += 1;
            const surface = simulation.moldZ(xMm, yMm) + height;
            minSurface = Math.min(minSurface, surface);
            maxSurface = Math.max(maxSurface, surface);
          }
        }
      }
    }
    assert.ok(maxHeight <= simulation.depth + 2, `${build.name}: max height ${maxHeight} mm`);
    assert.ok(wetCells / innerCells >= 0.85, `${build.name}: ${wetCells}/${innerCells} cells wet`);
    assert.ok(
      maxSurface - minSurface < 3,
      `${build.name}: surface range ${maxSurface - minSurface} mm`,
    );
    const volumeMl = fieldMassMl(simulation);
    assert.ok(
      Math.abs(volumeMl - pouredMl) / pouredMl < 0.005,
      `${build.name}: volume ${volumeMl} ml, expected ${pouredMl} ml`,
    );
  }
});

test('both builds keep separately poured cavities isolated at coarse and fine timesteps', async () => {
  for (const build of wasmBuilds) {
    const runVolumes = [];
    for (const maxStep of [0.5, 0.05]) {
      const simulation = await makeSimulation(build, 37);
      await pour(simulation, 0, 40, 4, maxStep);
      await pour(simulation, 3, 40, 4, maxStep);
      const volumes = [simulation.cavity(0).batterMl, simulation.cavity(3).batterMl];
      for (const [index, volume] of volumes.entries()) {
        assert.ok(
          Math.abs(volume - 40) / 40 < 0.03,
          `${build.name}, step ${maxStep}, cavity ${index === 0 ? 0 : 3}: ${volume} ml`,
        );
      }
      runVolumes.push(volumes);
    }
    for (const index of [0, 1]) {
      assert.ok(
        Math.abs(runVolumes[0][index] - runVolumes[1][index]) / 40 < 0.02,
        `${build.name}, cavity ${index === 0 ? 0 : 3}: coarse/fine volumes differ`,
      );
    }
  }
});

test('filling and flip APIs return specified errors and move fillings on landing', async () => {
  for (const build of wasmBuilds) {
    const simulation = await makeSimulation(build);
    assert.equal(simulation.addFilling(6, 1, 0, 0), -1);
    assert.equal(simulation.addFilling(0, 9, 0, 0), -1);
    assert.equal(simulation.addFilling(3, 1, 42, 126), -2);
    assert.equal(simulation.addFilling(0, 1, 42, 42), -3);
    assert.equal(simulation.startFlip(3), -1);
    assert.equal(simulation.startFlip(0), -2);
    const pair = await createPouredPair(build, 43, 30);
    assert.equal(pair.addFilling(0, 1, 50, 45), 0);
    assert.equal(pair.addFilling(0, 2, 42, 42), -4);
    assert.equal(pair.startFlip(0), 0);
    assert.equal(pair.startFlip(0), -3);
    await landFlip(pair);
    assert.equal(pair.cavity(0).fillingKind, 0);
    assert.equal(pair.cavity(3).fillingKind, 1);
    assert.equal(pair.cavity(3).fillingG, 25);
    assert.equal(pair.cavity(3).fillingY, 123);
    assert.equal(pair.addFilling(3, 1, 42, 126), -2);
  }
});

test('take-out returns sane stats, filling offset, and clears both cavities', async () => {
  for (const build of wasmBuilds) {
    const simulation = await createPouredPair(build, 59, 32);
    assert.equal(simulation.addFilling(0, 2, 50, 45), 0);
    assert.equal(simulation.startFlip(0), 0);
    await landFlip(simulation);
    const stats = simulation.takeOut(0);
    assert.ok(stats.volumeMl > 63 && stats.volumeMl < 65);
    assert.equal(stats.fillingKind, 2);
    assert.equal(stats.fillingG, 25);
    assert.ok(Math.abs(stats.fillingOffsetMm - Math.hypot(8, 3)) < 0.1);
    assert.ok(stats.coreTempC >= 15 && stats.coreTempC <= 400);
    assert.equal(simulation.cavity(0).state, 0);
    assert.equal(simulation.cavity(3).state, 0);
    assert.deepEqual(simulation.takeOut(0), { ok: false, code: -2 });
  }
});

test('take-out statistics detect batter spilled beside a cavity', async () => {
  for (const build of wasmBuilds) {
    const simulation = await createPouredPair(build, 61, 32);
    simulation.setNozzle(80, 126, 2);
    for (let frame = 0; frame < 10; frame += 1) simulation.step(0.5);
    simulation.setNozzle(80, 126, 0);
    simulation.step(0.5);
    assert.equal(simulation.startFlip(0), 0);
    await landFlip(simulation);
    const stats = simulation.takeOut(0);
    assert.ok(stats.spillMl > 0, `${build.name}: no spill reported in stats`);
    assert.ok(stats.volumeMl > 63);
  }
});

test('seeded output is deterministic and baseline/SIMD agree within tolerance', async () => {
  const baseline = wasmBuilds[0];
  const first = await makeSimulation(baseline, 991);
  const second = await makeSimulation(baseline, 991);
  for (const simulation of [first, second]) {
    simulation.grease(42, 42, 25, 0.65);
    await pour(simulation, 0, 35, 5);
    for (let frame = 0; frame < 30; frame += 1) simulation.step(0.0833);
  }
  assert.deepEqual(first.fieldA, second.fieldA);
  const simd = await makeSimulation(wasmBuilds[1], 991);
  simd.grease(42, 42, 25, 0.65);
  await pour(simd, 0, 35, 5);
  for (let frame = 0; frame < 30; frame += 1) simd.step(0.0833);
  for (const simulation of [first, second, simd]) await pour(simulation, 3, 35, 5);
  const expected = first.cavity(0);
  const actual = simd.cavity(0);
  for (const field of ['batterMl', 'bottomBrownMean', 'topSetMean', 'coreTempC']) {
    const scale = Math.max(Math.abs(expected[field]), 1);
    assert.ok(Math.abs(expected[field] - actual[field]) / scale <= 1e-3);
  }
  for (const simulation of [first, second, simd]) {
    assert.equal(simulation.startFlip(0), 0);
    await landFlip(simulation);
  }
  const expectedStats = first.takeOut(0);
  const actualStats = simd.takeOut(0);
  for (const field of Object.keys(expectedStats)) {
    const scale = Math.max(Math.abs(expectedStats[field]), 1);
    assert.ok(Math.abs(expectedStats[field] - actualStats[field]) / scale <= 1e-3);
  }
});

test('browning and set calibration stay in the heat windows', async () => {
  const measurements = [];
  for (const build of wasmBuilds) {
    for (const heat of [0.2, 0.6, 1.0]) {
      const simulation = await makeSimulation(build, 107);
      simulation.setHeat(heat);
      await pour(simulation, 0, 40, 4);
      let elapsed = simulation.time();
      let goldenAt = null;
      let burntAt = null;
      let setAt = null;
      const limit = heat === 0.2 ? 450 : 600;
      while (elapsed < limit && (goldenAt === null || burntAt === null || setAt === null)) {
        simulation.step(0.5);
        elapsed = simulation.time();
        const cavity = simulation.cavity(0);
        if (goldenAt === null && cavity.bottomBrownMean >= 0.6) goldenAt = elapsed;
        if (burntAt === null && cavity.bottomBrownMean >= 1.2) burntAt = elapsed;
        if (setAt === null && cavity.topSetMean >= 0.5) setAt = elapsed;
      }
      measurements.push({ build: build.name, heat, goldenAt, burntAt, setAt });
    }
  }
  console.log(`Baked Mochocho calibration: ${JSON.stringify(measurements)}`);
  for (const { heat, goldenAt, burntAt, setAt } of measurements) {
    if (heat === 0.2) {
      assert.ok(goldenAt === null || goldenAt > 300);
      assert.ok(burntAt === null || burntAt > 300);
    }
    if (heat === 0.6) {
      assert.ok(goldenAt >= 120 && goldenAt <= 180, `golden at ${goldenAt}s`);
      assert.ok(burntAt === null || burntAt >= 280, `burnt at ${burntAt}s`);
      assert.ok(setAt >= 150 && setAt <= 240, `top set at ${setAt}s`);
    }
    if (heat === 1.0) {
      assert.ok(goldenAt !== null && goldenAt < 180);
      assert.ok(burntAt !== null && burntAt < 280);
    }
  }
});

test('SIMD simulation step meets the median performance budget', async () => {
  const simulation = await createPouredPair(wasmBuilds[1], 113, 35);
  const samples = [];
  for (let frame = 0; frame < 60; frame += 1) {
    const start = performance.now();
    simulation.step(0.0833);
    samples.push(performance.now() - start);
  }
  samples.sort((left, right) => left - right);
  const medianMs = samples[Math.floor(samples.length / 2)];
  console.log(`Baked Mochocho SIMD sim_step median: ${medianMs.toFixed(3)} ms`);
  assert.ok(medianMs < 8, `median sim_step took ${medianMs.toFixed(3)} ms`);
});
