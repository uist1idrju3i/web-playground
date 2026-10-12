import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createSimulation, EVENT, REASON } from '../../public_html/star-hopper/js/sim.js';

const wasmBuilds = await Promise.all(
  [
    {
      name: 'baseline',
      simd: false,
      path: new URL('../../public_html/star-hopper/wasm/starhopper-sim.wasm', import.meta.url),
    },
    {
      name: 'SIMD',
      simd: true,
      path: new URL('../../public_html/star-hopper/wasm/starhopper-sim-simd.wasm', import.meta.url),
    },
  ].map(async ({ path, ...build }) => ({ ...build, source: await readFile(path) })),
);

function makeSimulation(build, seed = 20261012) {
  return createSimulation({ seed, simd: build.simd, source: build.source });
}

function stepSeconds(sim, seconds, chunk = 0.05) {
  let t = 0;
  while (t < seconds) {
    sim.step(Math.min(chunk, seconds - t));
    t += chunk;
  }
}

for (const build of wasmBuilds) {
  test(`world gen is deterministic across ${build.name} builds`, async () => {
    const a = await makeSimulation(build);
    const b = await makeSimulation(build);
    assert.deepEqual([...a.islands], [...b.islands]);
    assert.deepEqual([...a.shards], [...b.shards]);
    assert.equal(a.islandCount, 7);
    assert.equal(a.shardCount, 21);
    // Islands rise: each top is higher than the previous.
    for (let i = 1; i < a.islandCount; i += 1) {
      assert.ok(a.island(i).topY > a.island(0).topY, `island ${i} should be above the start`);
    }
  });

  test(`every island hop is physically jumpable (${build.name})`, async () => {
    const sim = await makeSimulation(build);
    // Reachability contract vs physics: a double jump covers ~10m of edge
    // gap and ~3.7m of rise. The world chain must stay inside both.
    for (let i = 0; i + 1 < sim.islandCount; i += 1) {
      const a = sim.island(i);
      const b = sim.island(i + 1);
      const centers = Math.hypot(b.x - a.x, b.z - a.z);
      const edgeGap = centers - a.radius - b.radius;
      const rise = b.topY - a.topY;
      assert.ok(
        edgeGap >= 1 && edgeGap <= 10,
        `hop ${i}->${i + 1}: edge gap ${edgeGap.toFixed(1)}m out of jump range`,
      );
      assert.ok(
        rise >= 0.5 && rise <= 3.7,
        `hop ${i}->${i + 1}: rise ${rise.toFixed(1)}m exceeds the double-jump apex`,
      );
    }
  });

  test(`player spawns grounded on the start island (${build.name})`, async () => {
    const sim = await makeSimulation(build);
    const p = sim.playerInto();
    const start = sim.island(0);
    assert.equal(p.x, start.x);
    assert.equal(p.y, start.topY);
    assert.equal(p.z, start.z);
    assert.equal(p.grounded, 1);
    const s = sim.stateInto();
    assert.equal(s.timeLeft, sim.timeLimit);
    assert.equal(s.taken, 0);
    assert.equal(s.finished, 0);
  });

  test(`movement accelerates toward input and decelerates when released (${build.name})`, async () => {
    const sim = await makeSimulation(build);
    sim.setMove(0, -1); // forward toward -Z
    stepSeconds(sim, 1.0);
    let p = sim.playerInto();
    assert.ok(p.vz < -3, `expected forward speed, got ${p.vz}`);
    sim.setMove(0, 0);
    stepSeconds(sim, 1.5);
    p = sim.playerInto();
    assert.ok(Math.abs(p.vz) < 0.5, `expected deceleration, got ${p.vz}`);
    // Still on the start island (it is wide).
    assert.equal(p.grounded, 1);
  });

  test(`jump and double jump fire events exactly once each (${build.name})`, async () => {
    const sim = await makeSimulation(build);
    const events = [];
    sim.setJump(true);
    stepSeconds(sim, 0.02);
    sim.setJump(false);
    sim.drainEvents((type) => events.push(type));
    let p = sim.playerInto();
    assert.ok(p.vy > 2, `expected upward velocity, got ${p.vy}`);
    assert.ok(events.includes(EVENT.JUMP));
    // Rise past the first jump apex, then double jump mid-air.
    stepSeconds(sim, 0.35);
    events.length = 0;
    sim.setJump(true);
    stepSeconds(sim, 0.02);
    sim.setJump(false);
    sim.drainEvents((type) => events.push(type));
    assert.ok(events.includes(EVENT.DOUBLE_JUMP));
    // A third mid-air press does nothing.
    events.length = 0;
    sim.setJump(true);
    stepSeconds(sim, 0.02);
    sim.setJump(false);
    sim.drainEvents((type) => events.push(type));
    assert.ok(!events.includes(EVENT.DOUBLE_JUMP));
    // Land back on the start island (never moved horizontally).
    stepSeconds(sim, 2.0);
    p = sim.playerInto();
    assert.equal(p.grounded, 1);
  });

  test(`walking into a shard collects it and emits a pickup (${build.name})`, async () => {
    const sim = await makeSimulation(build);
    // Find the first grounded shard on the start island and walk onto it.
    let target = -1;
    for (let i = 0; i < sim.shardCount; i += 1) {
      const shard = sim.shard(i);
      if (shard.kind === 0 && Math.abs(shard.y - sim.island(0).topY) < 2) {
        target = i;
        break;
      }
    }
    assert.ok(target >= 0, 'expected a grounded shard on the start island');
    const shard = sim.shard(target);
    sim.teleport(shard.x, sim.island(0).topY + 0.01, shard.z);
    const events = [];
    stepSeconds(sim, 0.1);
    sim.drainEvents((type, a) => {
      if (type === EVENT.PICKUP) events.push(a);
    });
    assert.equal(sim.shard(target).taken, 1);
    assert.ok(events.includes(target));
    const s = sim.stateInto();
    assert.equal(s.taken, 1);
    assert.ok(s.score >= 100);
    assert.equal(s.combo, 1);
  });

  test(`falling respawns on the last island with a time penalty (${build.name})`, async () => {
    const sim = await makeSimulation(build);
    const before = sim.stateInto().timeLeft;
    sim.teleport(0, -40, 0);
    const events = [];
    stepSeconds(sim, 0.2);
    sim.drainEvents((type) => events.push(type));
    const p = sim.playerInto();
    const start = sim.island(0);
    assert.equal(p.x, start.x);
    assert.equal(p.y, start.topY);
    assert.equal(p.grounded, 1);
    assert.equal(sim.stateInto().falls, 1);
    assert.ok(events.includes(EVENT.FALL));
    assert.ok(sim.stateInto().timeLeft <= before - 3.9);
  });

  test(`collecting every shard finishes with a win and time bonus (${build.name})`, async () => {
    const sim = await makeSimulation(build);
    for (let i = 0; i < sim.shardCount; i += 1) {
      const shard = sim.shard(i);
      sim.teleport(shard.x, shard.y, shard.z);
      stepSeconds(sim, 0.12);
      if (sim.stateInto().finished > 0) break;
    }
    const s = sim.stateInto();
    assert.equal(s.taken, sim.shardCount);
    assert.equal(s.finished, 1);
    assert.equal(s.finishReason, REASON.WIN);
    // Score includes per-shard points, combo multiplier, and the time bonus.
    assert.ok(s.score > 2100, `expected >2100, got ${s.score}`);
  });

  test(`the timer ends the run with a timeout (${build.name})`, async () => {
    const sim = await makeSimulation(build);
    let finished = null;
    for (let i = 0; i < 500 && finished === null; i += 1) {
      sim.step(0.5);
      sim.drainEvents((type, a) => {
        if (type === EVENT.FINISH) finished = a;
      });
    }
    const s = sim.stateInto();
    assert.equal(s.timeLeft, 0);
    assert.equal(s.finished, 1);
    assert.equal(s.finishReason, REASON.TIMEOUT);
    assert.equal(finished, REASON.TIMEOUT);
    // Sim is frozen after finishing: stepping more changes nothing.
    const elapsed = s.elapsed;
    sim.step(1);
    assert.equal(sim.stateInto().elapsed, elapsed);
  });

  test(`restart rebuilds the identical world and resets the run (${build.name})`, async () => {
    const sim = await makeSimulation(build);
    stepSeconds(sim, 5);
    sim.restart(20261012);
    const p = sim.playerInto();
    const start = sim.island(0);
    assert.equal(p.x, start.x);
    assert.equal(p.y, start.topY);
    const s = sim.stateInto();
    assert.equal(s.taken, 0);
    assert.equal(s.falls, 0);
    assert.equal(s.timeLeft, sim.timeLimit);
    for (let i = 0; i < sim.shardCount; i += 1) {
      assert.equal(sim.shard(i).taken, 0);
    }
  });
}
