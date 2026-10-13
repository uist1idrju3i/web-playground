// Unit tests for the Pong Programming Battle simulation.
// Covers physics invariants, the disturbance/stamina model, side symmetry
// of brain snapshots, and — via real Ruby.wasm VMs — that the enemy brains
// produce the intended skill ordering.
import assert from 'node:assert/strict';
import { describe, test, before } from 'node:test';
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  createGame,
  stepGame,
  brainState,
  COURT,
  PADDLE,
  BALL,
  STEP_DT,
  GUST,
  SIDES,
} from '../../public_html/pong-battle/js/sim.js';

const APP = join(dirname(fileURLToPath(import.meta.url)), '../../public_html/pong-battle');

// JS port of a "perfect tracker": seek the nominal wall-fold intercept,
// recover to center — used to prove side symmetry and lethal escalation.
function trackerMove(game, side) {
  const s = brainState(game, side);
  const { ball: b, me, court, rules } = s;
  const face = side === 'left' ? rules.face_left : rules.face_right;
  const toward = side === 'left' ? b.vx < 0 : b.vx > 0;
  let target;
  if (toward && b.vx !== 0) {
    const t = (face - b.x) / b.vx;
    if (t < 0) return 0;
    const r = rules.ball_r;
    const span = court.h - 2 * r;
    const raw = b.y + b.vy * t;
    let m = (raw - r) % (2 * span);
    if (m < 0) m += 2 * span;
    target = m > span ? r + 2 * span - m : r + m;
  } else {
    target = court.center_y;
  }
  const dy = target - me.y;
  return Math.abs(dy) <= 1 ? 0 : Math.max(-1, Math.min(1, dy / 3));
}

describe('pong sim invariants', () => {
  test('ball stays in court vertically and speed never exceeds absolute cap', () => {
    const game = createGame({ seed: 7 });
    for (let i = 0; i < 30000 && game.status !== 'over'; i++) {
      stepGame(game, { left: trackerMove(game, 'left'), right: trackerMove(game, 'right') });
      assert.ok(game.ball.y >= BALL.R - 1e-6);
      assert.ok(game.ball.y <= COURT.H - BALL.R + 1e-6);
      assert.ok(game.ball.speed <= 160 + 1e-9);
    }
  });

  test('seeded matches are deterministic', () => {
    const a = createGame({ seed: 42 });
    const b = createGame({ seed: 42 });
    for (let i = 0; i < 5000; i++) {
      stepGame(a, { left: 0.3, right: -0.2 });
      stepGame(b, { left: 0.3, right: -0.2 });
    }
    assert.deepEqual(a.ball, b.ball);
    assert.equal(a.wind.ay, b.wind.ay);
    assert.deepEqual(a.stamina, b.stamina);
  });

  test('conceder receives the next serve', () => {
    const game = createGame({ seed: 3, pointsToWin: 5 });
    // Park both paddles far from the ball: one side concedes the serve.
    game.paddles.left.y = COURT.H - PADDLE.H / 2;
    game.paddles.right.y = PADDLE.H / 2;
    let scored = null;
    for (let i = 0; i < 20000 && !scored; i++) {
      for (const e of stepGame(game, { left: 0, right: 0 })) {
        if (e.type === 'score') scored = e;
      }
    }
    assert.notEqual(scored, null);
    // Whoever was scored on gets the ball served toward them.
    const conceder = scored.side === 'left' ? 'right' : 'left';
    const expectedDir = conceder === 'right' ? 1 : -1;
    assert.equal(game.serveDir, expectedDir);
  });

  test('long rallies escalate: wind wakes after START_HITS and stamina drains', () => {
    const game = createGame({ seed: 11 });
    let windSeen = false;
    let drained = false;
    for (let i = 0; i < 60000 && game.status !== 'over'; i++) {
      stepGame(game, { left: trackerMove(game, 'left'), right: trackerMove(game, 'right') });
      if (game.rally >= GUST.START_HITS && game.wind.ay !== 0) windSeen = true;
      if (game.stamina.left < 1 || game.stamina.right < 1) drained = true;
    }
    assert.equal(windSeen, true);
    assert.equal(drained, true);
  });

  // A missed paddle must not score at the face plane: the ball keeps flying
  // out of court first, so a goal visibly reads as a goal (not a freeze).
  test('missed paddle: ball flies out before the point registers', () => {
    const game = createGame({ seed: 1 });
    game.status = 'rally';
    game.ball.x = 93.7;
    game.ball.y = 55;
    game.ball.vx = 50;
    game.ball.vy = 0;
    game.ball.speed = 50;
    game.paddles.right.y = 10; // far away — a clean miss
    const ev = stepGame(game, { left: 0, right: 0 });
    assert.equal(game.ball.dead, 'right');
    assert.ok(!ev.some((e) => e.type === 'score'));
    assert.equal(game.status, 'rally');
    let scored = false;
    for (let i = 0; i < 400 && !scored; i++) {
      for (const e of stepGame(game, { left: 0, right: 0 })) {
        if (e.type === 'score') scored = e;
      }
    }
    assert.equal(scored?.side, 'left');
    assert.equal(game.score.left, 1);
  });

  // The dead ball must not be able to collide with a paddle on its way out.
  test('dead ball passes through paddle positions untouched', () => {
    const game = createGame({ seed: 1 });
    game.status = 'rally';
    game.ball.dead = 'left';
    game.ball.x = 3;
    game.ball.y = 30;
    game.ball.vx = -60;
    game.ball.vy = 0;
    game.ball.speed = 60;
    game.paddles.left.y = 30; // dead ball flies straight through the paddle
    const ev = stepGame(game, { left: 0, right: 0 });
    assert.ok(!ev.some((e) => e.type === 'paddle-hit'));
  });

  test('brainState is side-symmetric for a symmetric game', () => {
    const game = createGame({ seed: 5 });
    for (let i = 0; i < 2000; i++) stepGame(game, { left: 0, right: 0 });
    const l = brainState(game, SIDES.LEFT);
    const r = brainState(game, SIDES.RIGHT);
    assert.equal(l.me.face_x, r.me.face_x === 95 ? 5 : r.me.face_x);
    assert.equal(l.me.dir, -1);
    assert.equal(r.me.dir, 1);
    assert.equal(l.enemy.dir, 1);
    assert.equal(r.enemy.dir, -1);
    assert.equal(l.court.center_y, r.court.center_y);
    assert.deepEqual(l.rules, r.rules);
  });
});

// Real-Ruby headless matches: the vendored UMD boots under Node so the
// actual enemy/sample brains play each other. Kept small — these VMs cost
// ~70MB each and a match runs thousands of ticks.
describe('ruby brains (real ruby.wasm)', () => {
  const require = createRequire(import.meta.url);
  let factory, mod, kit;
  const brains = {};

  before(async () => {
    const umd = join(
      dirname(fileURLToPath(import.meta.url)),
      '../../public_html/ruby-wasm/vendor/browser.umd.js',
    );
    const { mkdtempSync, cpSync } = await import('node:fs');
    const { tmpdir } = await import('node:os');
    const cjs = join(mkdtempSync(join(tmpdir(), 'pong-wasm-')), 'browser.umd.cjs');
    cpSync(umd, cjs);
    factory = require(cjs);
    const wasmBytes = gunzipSync(
      readFileSync(
        join(
          dirname(fileURLToPath(import.meta.url)),
          '../../public_html/ruby-wasm/ruby+stdlib.wasm.gz',
        ),
      ),
    );
    mod = await WebAssembly.compile(wasmBytes);
    kit = readFileSync(join(APP, 'ruby/pong_kit.rb'), 'utf8');
  });

  async function bootVm(source) {
    const inst = await factory.DefaultRubyVM(mod, { consolePrint: false });
    const vm = inst.vm;
    vm.eval(kit);
    const lit = `'${source.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
    const res = JSON.parse(vm.eval(`Battle.load_brain(${lit})`).toString());
    if (!res.ok) throw new Error(`brain load failed: ${JSON.stringify(res.error)}`);
    return vm;
  }

  function tick(vm, state) {
    return JSON.parse(vm.eval(`Battle.tick('${JSON.stringify(state)}')`).toString());
  }

  async function playMatch(srcLeft, srcRight, { points = 3, seed = 1, maxTicks = 90000 } = {}) {
    const vmL = await bootVm(srcLeft);
    const vmR = await bootVm(srcRight);
    const game = createGame({ seed, pointsToWin: points });
    let mL = 0;
    let mR = 0;
    let ticks = 0;
    while (game.status !== 'over' && ticks < maxTicks) {
      if (ticks % 4 === 0) {
        mL = tick(vmL, brainState(game, 'left')).move ?? 0;
        mR = tick(vmR, brainState(game, 'right')).move ?? 0;
      }
      stepGame(game, { left: mL, right: mR }, STEP_DT);
      ticks += 1;
    }
    return { winner: game.winner, ticks };
  }

  // Regression: brain @ivars must reset on every deploy. Before the Runner
  // wrapper, Proc brains ran on top-level `main`, so @think_at leaked across
  // matches and the enemy parked for a whole second match.
  test('brain @ivars reset on each deploy', { timeout: 120_000 }, async () => {
    const src = `brain "counter" do |g|
  @n = (@n || 0) + 1
  brain_debug note: "n=#{@n}"
  g.seek(g.center)
end
`;
    const vm = await bootVm(src);
    const game = createGame({ seed: 9 });
    assert.equal(tick(vm, brainState(game, 'left')).debug?.note, 'n=1');
    assert.equal(tick(vm, brainState(game, 'left')).debug?.note, 'n=2');
    // Re-deploy the same source — the next match must start with fresh state.
    const lit = `'${src.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
    const res = JSON.parse(vm.eval(`Battle.load_brain(${lit})`).toString());
    assert.equal(res.ok, true);
    assert.equal(tick(vm, brainState(createGame({ seed: 10 }), 'left')).debug?.note, 'n=1');
  });

  // TracePoint(:line) capture: tick opts {trace: true} returns the set of
  // brain.rb lines executed that tick plus the final line.
  test('tick trace returns executed brain.rb lines', { timeout: 120_000 }, async () => {
    const src = `brain "traced" do |g|
  if g.ball.moving_toward?(g.me)
    g.seek(g.ball.y)
  else
    g.seek(g.center)
  end
end
`;
    const vm = await bootVm(src);
    const game = createGame({ seed: 5 });
    game.status = 'rally';
    game.ball.vx = -30; // toward the left paddle
    const lit = `'${JSON.stringify(brainState(game, 'left')).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
    const r = JSON.parse(vm.eval(`Battle.tick(${lit}, {trace: true})`).toString());
    assert.ok(Array.isArray(r.lines.run));
    assert.ok(r.lines.run.includes(3)); // the seek(g.ball.y) branch line
    assert.ok(!r.lines.run.includes(5)); // the else branch did not run
    assert.equal(r.lines.last, 3);
  });

  // A brain returning NaN/Infinity must stun (move 0), not corrupt the
  // worker's JSON.parse with a bare NaN literal.
  test('tick normalizes non-finite moves to 0', { timeout: 120_000 }, async () => {
    const src = `brain "nan" do |g|
  0.0 / 0
end
`;
    const vm = await bootVm(src);
    const game = createGame({ seed: 5 });
    const lit = `'${JSON.stringify(brainState(game, 'left')).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
    const r = JSON.parse(vm.eval(`Battle.tick(${lit}, {trace: true, watch: true})`).toString());
    assert.equal(r.move, 0);
  });

  // Variable watch: the brain's @ivars surface in tick output as primitives.
  test('tick watch reports brain @ivars', { timeout: 120_000 }, async () => {
    const src = `brain "watched" do |g|
  @target = (@target || 0) + 1.5
  g.seek(@target)
end
`;
    const vm = await bootVm(src);
    const game = createGame({ seed: 5 });
    const lit = `'${JSON.stringify(brainState(game, 'left')).replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
    const r = JSON.parse(vm.eval(`Battle.tick(${lit}, {watch: true})`).toString());
    assert.equal(r.vars?.target, 1.5);
  });

  test('skill ordering: rookie loses to samples and enemies', { timeout: 180_000 }, async () => {
    for (const [name, path] of [
      ['rookie', 'ruby/enemy/rookie.rb'],
      ['club', 'ruby/enemy/club.rb'],
      ['ace', 'ruby/enemy/ace.rb'],
      ['nova', 'ruby/enemy/nova.rb'],
      ['chaser', 'ruby/samples/chaser.rb'],
    ])
      brains[name] = readFileSync(join(APP, path), 'utf8');

    // Every serious brain should beat the rookie decisively.
    const [r1, r2, r3, r4, r5] = await Promise.all([
      playMatch(brains.chaser, brains.rookie, { points: 2, seed: 701 }),
      playMatch(brains.club, brains.rookie, { points: 2, seed: 702 }),
      playMatch(brains.ace, brains.rookie, { points: 2, seed: 703 }),
      // The boss must out-plan Ace from BOTH sides on measured seeds —
      // near the perfect-prediction ceiling, serve draws and escalation
      // luck decide individual matches, so these assert nova wins on each
      // side rather than sweeping every seed.
      playMatch(brains.nova, brains.ace, { points: 2, seed: 704 }),
      playMatch(brains.ace, brains.nova, { points: 2, seed: 705 }),
    ]);
    assert.equal(r1.winner, 'left');
    assert.equal(r2.winner, 'left');
    assert.equal(r3.winner, 'left');
    assert.equal(r4.winner, 'left', `nova should beat ace on the left (${r4.ticks} ticks)`);
    assert.equal(r5.winner, 'right', `nova should beat ace on the right (${r5.ticks} ticks)`);
    assert.ok(Math.max(r1.ticks, r2.ticks, r3.ticks) < 90000);
  });
});
