'use strict';

// Deterministic Pong simulation. No DOM access — the same module drives the
// page, Node unit tests, and headless matches. All constants are mirrored to
// the Ruby brains through the per-tick state JSON (`rules`), so a predictor
// written in Ruby sees the exact same physics.

export const COURT = Object.freeze({ W: 100, H: 60 });
export const PADDLE = Object.freeze({
  CX_LEFT: 4,
  CX_RIGHT: 96,
  W: 2,
  H: 12,
  SPEED: 50,
});
export const BALL = Object.freeze({
  R: 1.2,
  START_SPEED: 36,
  MAX_SPEED: 95,
  ACCEL: 1.04,
});
// Rally pressure: once a rally outlasts RALLY_BOOST_START paddle hits, the
// speed ceiling keeps rising by RALLY_BOOST_STEP per hit until ABS_MAX_SPEED.
// Perfect prediction on both sides otherwise deadlocks a match — escalation
// guarantees one side eventually faces an unreachable intercept, which is
// also exactly the payoff aimed returns are looking for.
export const RALLY_BOOST_START = 14;
export const RALLY_BOOST_STEP = 3;
export const ABS_MAX_SPEED = 160;

// Disturbance: long rallies make the referee restless — once a rally
// outlasts START_HITS paddle hits, a base wind fades in and gust bursts
// start blowing. A brain that locks its intercept once gets punished; one
// that keeps re-predicting — or better, corrects for `wind.ay` — rides the
// weather. Everything derives from the match RNG, so replays stay
// deterministic and fair to both sides.
export const GUST = Object.freeze({
  START_HITS: 8,
  FADE_PER_HIT: 0.25, // base wind ramps to full strength over ~4 more hits
  MIN_GAP_S: 1.2,
  MAX_GAP_S: 3.0,
  MIN_LEN_S: 0.4,
  MAX_LEN_S: 0.9,
  MIN_AY: 25,
  MAX_AY: 70,
  BASE_MIN: 15,
  BASE_MAX: 45,
});
export const HIT_JITTER_DEG = 1.3;

// Stamina: every unit a paddle travels drains a little stamina, and the
// paddle's speed scales with what remains. Aimed offense is therefore a
// resource weapon — corner shots literally exhaust the opponent — while a
// brain that scrambles after everything tires itself out. Without it a
// centered defender is mathematically unbeatable at any ball speed
// (26u to the corner vs 50u/s coverage).
export const STAMINA = Object.freeze({
  DRAIN_PER_UNIT: 0.004, // a full-court scramble costs ~22% stamina
  MIN_SPEED_FACTOR: 0.45,
  // No regen during a rally: stamina resets on each serve, so long rallies
  // decay both sides into genuinely reachable corner kills.
});

export function paddleEffSpeed(game, side) {
  const stamina = game.stamina?.[side] ?? 1;
  return PADDLE.SPEED * (STAMINA.MIN_SPEED_FACTOR + (1 - STAMINA.MIN_SPEED_FACTOR) * stamina);
}

export function speedCap(rally) {
  return Math.min(
    ABS_MAX_SPEED,
    BALL.MAX_SPEED + Math.max(0, rally - RALLY_BOOST_START) * RALLY_BOOST_STEP,
  );
}

export const MAX_BOUNCE_DEG = 55;
export const SERVE_MAX_DEG = 25;
export const SERVE_DELAY_S = 0.8;
export const STEP_HZ = 120;
export const STEP_DT = 1 / STEP_HZ;

export const SIDES = Object.freeze({ LEFT: 'left', RIGHT: 'right' });

const DEG = Math.PI / 180;
const LEFT_FACE = PADDLE.CX_LEFT + PADDLE.W / 2; // x plane the ball bounces off (left)
const RIGHT_FACE = PADDLE.CX_RIGHT - PADDLE.W / 2; // x plane the ball bounces off (right)

// Deterministic PRNG (mulberry32) so seeded matches replay identically.
export function createRng(seed) {
  let a = seed >>> 0;
  return function rng() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function createGame({ seed = 1, pointsToWin = 5 } = {}) {
  const rng = createRng(seed);
  return {
    tick: 0,
    time: 0,
    status: 'serving', // serving | rally | over
    serveTimer: SERVE_DELAY_S,
    // First serve direction is drawn, not fixed: a fixed dir=1 handed the
    // left side the serve-receiver handicap every match (measured: the
    // receiver's opening sprint spends stamina that never regens mid-rally,
    // so mirror matches always collapse on the receiver's side).
    serveDir: rng() < 0.5 ? -1 : 1,
    pointsToWin,
    score: { left: 0, right: 0 },
    rally: 0,
    winner: null,
    rng,
    wind: { base: 0, gust: 0, until: 0, ay: 0, sign: 0, strength: 0 },
    stamina: { left: 1, right: 1 },
    nextGustAt: 0,
    ball: { x: COURT.W / 2, y: COURT.H / 2, vx: 0, vy: 0, speed: BALL.START_SPEED, dead: null },
    paddles: {
      left: { x: PADDLE.CX_LEFT, y: COURT.H / 2, move: 0 },
      right: { x: PADDLE.CX_RIGHT, y: COURT.H / 2, move: 0 },
    },
  };
}

function launchServe(game, dir) {
  const angle = (game.rng() * 2 - 1) * SERVE_MAX_DEG * DEG;
  const speed = BALL.START_SPEED;
  game.ball.x = COURT.W / 2;
  game.ball.y = COURT.H / 2;
  game.ball.speed = speed;
  game.ball.vx = Math.cos(angle) * speed * dir;
  game.ball.vy = Math.sin(angle) * speed;
  game.rally = 0;
  // Fresh weather for the point: direction and strength are drawn now but
  // stay quiet until the rally drags past GUST.START_HITS.
  game.wind.sign = game.rng() < 0.5 ? -1 : 1;
  game.wind.strength = GUST.BASE_MIN + game.rng() * (GUST.BASE_MAX - GUST.BASE_MIN);
  game.wind.base = 0;
  game.wind.gust = 0;
  game.wind.ay = 0;
  game.nextGustAt = 0;
  game.stamina.left = 1;
  game.stamina.right = 1;
  game.ball.dead = null;
  game.status = 'rally';
}

function clamp(value, lo, hi) {
  return value < lo ? lo : value > hi ? hi : value;
}

function movePaddle(game, side, dt) {
  const paddle = game.paddles[side];
  const half = PADDLE.H / 2;
  const before = paddle.y;
  const eff = paddleEffSpeed(game, side);
  paddle.y = clamp(paddle.y + clamp(paddle.move, -1, 1) * eff * dt, half, COURT.H - half);
  const traveled = Math.abs(paddle.y - before);
  const stamina = game.stamina[side];
  game.stamina[side] = clamp(stamina - traveled * STAMINA.DRAIN_PER_UNIT, 0, 1);
}

function bounceOffPaddle(game, side) {
  const ball = game.ball;
  const paddle = game.paddles[side];
  const reach = PADDLE.H / 2 + BALL.R;
  const offset = clamp((ball.y - paddle.y) / reach, -1, 1);
  // Tiny seeded contact jitter: brains re-read the true velocity after the
  // hit, so this only punishes brains that commit before contact happens.
  const jitter = (game.rng() * 2 - 1) * HIT_JITTER_DEG * DEG;
  const angle = offset * MAX_BOUNCE_DEG * DEG + jitter;
  const speed = Math.min(ball.speed * BALL.ACCEL, speedCap(game.rally));
  const dir = side === SIDES.LEFT ? 1 : -1;
  ball.vx = Math.cos(angle) * speed * dir;
  ball.vy = Math.sin(angle) * speed;
  ball.speed = speed;
  game.rally += 1;
  return { type: 'paddle-hit', side, offset, speed };
}

function stepWind(game) {
  const wind = game.wind;
  // The referee's patience: base wind fades in once a rally drags on.
  const over = Math.max(0, game.rally - GUST.START_HITS);
  wind.base = over <= 0 ? 0 : Math.min(1, over * GUST.FADE_PER_HIT) * wind.strength * wind.sign;
  if (wind.gust !== 0 && game.time >= wind.until) wind.gust = 0;
  if (game.status === 'rally' && wind.base !== 0) {
    if (game.nextGustAt === 0) game.nextGustAt = game.time + GUST.MIN_GAP_S;
    if (game.time >= game.nextGustAt) {
      const rng = game.rng;
      wind.gust = (rng() < 0.5 ? -1 : 1) * (GUST.MIN_AY + rng() * (GUST.MAX_AY - GUST.MIN_AY));
      wind.until = game.time + GUST.MIN_LEN_S + rng() * (GUST.MAX_LEN_S - GUST.MIN_LEN_S);
      game.nextGustAt = wind.until + GUST.MIN_GAP_S + rng() * (GUST.MAX_GAP_S - GUST.MIN_GAP_S);
    }
  }
  wind.ay = wind.base + wind.gust;
}

function stepBall(game, dt, events) {
  const ball = game.ball;
  if (game.wind.ay !== 0) ball.vy += game.wind.ay * dt;
  if (ball.dead) {
    // Conceded ball: it already crossed the face plane and now just flies
    // out of court. Keeping it visible until it exits makes a missed paddle
    // read as a goal instead of a freeze-frame 'touch'.
    ball.x += ball.vx * dt;
    ball.y += ball.vy * dt;
    if (ball.y < BALL.R) {
      ball.y = BALL.R;
      ball.vy = -ball.vy;
    } else if (ball.y > COURT.H - BALL.R) {
      ball.y = COURT.H - BALL.R;
      ball.vy = -ball.vy;
    }
    if (ball.x < -BALL.R * 2) {
      events.push({ type: 'score', side: SIDES.RIGHT });
      awardPoint(game, SIDES.RIGHT);
    } else if (ball.x > COURT.W + BALL.R * 2) {
      events.push({ type: 'score', side: SIDES.LEFT });
      awardPoint(game, SIDES.LEFT);
    }
    return;
  }
  let remaining = dt;
  // Swept collision: advance to the earliest plane crossing, resolve, continue.
  for (let guard = 0; guard < 8 && remaining > 1e-9; guard += 1) {
    let tHit = remaining;
    let hit = null;
    const tryPlane = (t, kind, data) => {
      if (t >= 0 && t < tHit) {
        tHit = t;
        hit = { kind, ...data };
      }
    };
    if (ball.vx < 0) {
      const plane = LEFT_FACE + BALL.R;
      tryPlane((plane - ball.x) / ball.vx, 'paddle', { side: SIDES.LEFT });
    } else if (ball.vx > 0) {
      const plane = RIGHT_FACE - BALL.R;
      tryPlane((plane - ball.x) / ball.vx, 'paddle', { side: SIDES.RIGHT });
    }
    if (ball.vy < 0) {
      tryPlane((BALL.R - ball.y) / ball.vy, 'wall', { wall: 'top' });
    } else if (ball.vy > 0) {
      tryPlane((COURT.H - BALL.R - ball.y) / ball.vy, 'wall', { wall: 'bottom' });
    }
    ball.x += ball.vx * tHit;
    ball.y += ball.vy * tHit;
    remaining -= tHit;
    if (!hit) break;
    if (hit.kind === 'wall') {
      ball.vy = -ball.vy;
      ball.y = clamp(ball.y, BALL.R, COURT.H - BALL.R);
      events.push({ type: 'wall', wall: hit.wall });
      continue;
    }
    const paddle = game.paddles[hit.side];
    const reach = PADDLE.H / 2 + BALL.R;
    if (Math.abs(ball.y - paddle.y) <= reach) {
      events.push(bounceOffPaddle(game, hit.side));
    } else {
      // Missed the paddle: mark the ball dead — it flies out of court and
      // the point registers when it exits, so the goal reads as a goal.
      ball.dead = hit.side;
      return;
    }
  }
  // Ball slipped past the plane without a swept hit (already behind it).
  if (game.status === 'rally') {
    if (ball.x < -BALL.R * 2) {
      events.push({ type: 'score', side: SIDES.RIGHT });
      awardPoint(game, SIDES.RIGHT);
    } else if (ball.x > COURT.W + BALL.R * 2) {
      events.push({ type: 'score', side: SIDES.LEFT });
      awardPoint(game, SIDES.LEFT);
    }
  }
}

function awardPoint(game, scorer) {
  game.score[scorer] += 1;
  if (game.score[scorer] >= game.pointsToWin) {
    game.status = 'over';
    game.winner = scorer;
    return;
  }
  game.status = 'serving';
  game.serveTimer = SERVE_DELAY_S;
  // Service alternates every point. Receiving is a real handicap (the
  // sprint to the serve drains stamina that never regens mid-rally), so
  // conceder-receives snowballed: whoever scored first kept handing the
  // opponent the bad end of the court. Alternating splits the handicap
  // fairly and lets skill decide the match.
  game.serveDir = -game.serveDir;
  game.ball.vx = 0;
  game.ball.vy = 0;
}

// moves: {left: -1..1, right: -1..1}; returns the frame's events.
export function stepGame(game, moves, dt = STEP_DT) {
  const events = [];
  game.paddles.left.move = moves.left ?? 0;
  game.paddles.right.move = moves.right ?? 0;
  movePaddle(game, SIDES.LEFT, dt);
  movePaddle(game, SIDES.RIGHT, dt);
  if (game.status === 'serving') {
    game.serveTimer -= dt;
    if (game.serveTimer <= 0) launchServe(game, game.serveDir);
  } else if (game.status === 'rally') {
    stepWind(game);
    stepBall(game, dt, events);
  }
  game.tick += 1;
  game.time += dt;
  return events;
}

// Snapshot handed to a brain, mirrored so `me` is always the asking side.
export function brainState(game, side) {
  const meSide = side === SIDES.LEFT ? SIDES.LEFT : SIDES.RIGHT;
  const enemySide = side === SIDES.LEFT ? SIDES.RIGHT : SIDES.LEFT;
  const me = game.paddles[meSide];
  const enemy = game.paddles[enemySide];
  const dir = meSide === SIDES.LEFT ? -1 : 1;
  return {
    tick: game.tick,
    time: Math.round(game.time * 1000) / 1000,
    status: game.status,
    ball: {
      x: round2(game.ball.x),
      y: round2(game.ball.y),
      vx: round2(game.ball.vx),
      vy: round2(game.ball.vy),
      speed: round2(game.ball.speed),
    },
    me: {
      x: me.x,
      y: round2(me.y),
      h: PADDLE.H,
      w: PADDLE.W,
      side: meSide,
      dir,
      speed_cap: Math.round(paddleEffSpeed(game, meSide) * 10) / 10,
      stamina: Math.round((game.stamina[meSide] ?? 1) * 100) / 100,
    },
    enemy: {
      y: round2(enemy.y),
      side: enemySide,
      dir: -dir,
      stamina: Math.round((game.stamina[enemySide] ?? 1) * 100) / 100,
      speed_cap: Math.round(paddleEffSpeed(game, enemySide) * 10) / 10,
    },
    court: { w: COURT.W, h: COURT.H, center_y: COURT.H / 2 },
    score: {
      me: game.score[meSide],
      you: game.score[enemySide],
      total: game.score[meSide] + game.score[enemySide],
      win_at: game.pointsToWin,
    },
    rally: game.rally,
    wind: {
      ay: round2(game.wind.ay),
      base: round2(game.wind.base),
      gust: round2(game.wind.gust),
    },
    serve: game.status === 'serving' ? { in: true, dir: game.serveDir } : { in: false },
    rules: {
      ball_r: BALL.R,
      start_speed: BALL.START_SPEED,
      max_speed: BALL.MAX_SPEED,
      abs_max_speed: ABS_MAX_SPEED,
      rally_boost_start: RALLY_BOOST_START,
      rally_boost_step: RALLY_BOOST_STEP,
      accel: BALL.ACCEL,
      paddle_speed: PADDLE.SPEED,
      paddle_h: PADDLE.H,
      paddle_w: PADDLE.W,
      face_left: LEFT_FACE,
      face_right: RIGHT_FACE,
      max_bounce_deg: MAX_BOUNCE_DEG,
      step_hz: STEP_HZ,
      court_w: COURT.W,
      court_h: COURT.H,
    },
  };
}

function round2(v) {
  return Math.round(v * 100) / 100;
}
