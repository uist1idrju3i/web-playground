// Backend-neutral scene model for Pong Programming Battle.
// Renderers (WebGL2/WebGPU) only translate this into draw calls, so both
// backends show the same picture and unit tests can cover the model.
import { COURT, PADDLE, BALL } from './sim.js';

// Palette roles (see browser-app-ux): signal colors stay reserved for
// status; everything else derives from three neon hues on a deep court.
export const PALETTE = Object.freeze({
  bgTop: [0.035, 0.05, 0.09, 1],
  bgBottom: [0.015, 0.02, 0.045, 1],
  grid: [0.16, 0.24, 0.34, 0.35],
  net: [0.35, 0.5, 0.66, 0.5],
  player: [0.2, 0.95, 0.65, 1], // left paddle: mint
  playerGlow: [0.2, 0.95, 0.65, 0.16],
  enemy: [1.0, 0.36, 0.55, 1], // right paddle: coral
  enemyGlow: [1.0, 0.36, 0.55, 0.16],
  ball: [1.0, 0.9, 0.45, 1],
  ballGlow: [1.0, 0.85, 0.3, 0.22],
  trail: [1.0, 0.85, 0.35, 0.35],
  thoughtPlayer: [0.2, 0.95, 0.65, 0.55],
  thoughtEnemy: [1.0, 0.36, 0.55, 0.55],
  wind: [0.55, 0.75, 1.0, 0.4],
  staminaWarn: [1.0, 0.62, 0.2, 1],
});

// Court logical size 100x60 -> pixels. Fit inside the canvas with margin
// for HUD chrome; expose the transform for overlay alignment.
export function layout(width, height) {
  const margin = Math.min(width, height) * 0.055;
  const availW = width - margin * 2;
  const availH = height - margin * 2;
  const scale = Math.min(availW / COURT.W, availH / COURT.H);
  const w = COURT.W * scale;
  const h = COURT.H * scale;
  return { scale, x: (width - w) / 2, y: (height - h) / 2 + h * 0.04, w, h };
}

export function toPx(l, x, y) {
  return [l.x + x * l.scale, l.y + y * l.scale];
}

// Sprite list the renderer batches. Types: 'glow' | 'rect' | 'circle' |
// 'line' | 'dash'. Every entry is flat numbers so renderers can memcpy.
export function buildScene({ game, layout: l, ballTrail, debugL, debugR, shakeT }) {
  const sprites = [];
  const push = (type, x, y, w, h, color, extra = 0) =>
    sprites.push({ type, x, y, w, h, color, extra });

  const [cx, cy] = [l.x, l.y];
  const S = l.scale;

  // Court frame + center net.
  push('rect', cx, cy, l.w, 1.5, PALETTE.grid);
  push('rect', cx, cy + l.h - 1.5, l.w, 1.5, PALETTE.grid);
  for (let i = 0; i < 12; i++)
    push(
      'rect',
      cx + l.w / 2 - 1,
      cy + (i + 0.5) * (l.h / 12) - l.h / 48,
      2,
      l.h / 24,
      PALETTE.net,
    );

  // Paddles with glow; tired paddles flash the stamina warning tint.
  for (const [side, base, glow] of [
    ['left', PALETTE.player, PALETTE.playerGlow],
    ['right', PALETTE.enemy, PALETTE.enemyGlow],
  ]) {
    const p = game.paddles[side];
    const stamina = game.stamina?.[side] ?? 1;
    const color = stamina < 0.35 && Math.floor(shakeT * 8) % 2 === 0 ? PALETTE.staminaWarn : base;
    const [px, py] = [cx + p.x * S, cy + p.y * S];
    // Glow hugs the real paddle: oversized halos read as part of the hit box
    // and make clean misses look like contact.
    push('glow', px, py, PADDLE.W * S * 2.6, PADDLE.H * S * 1.12, glow);
    push(
      'rect',
      px - (PADDLE.W / 2) * S,
      py - (PADDLE.H / 2) * S,
      PADDLE.W * S,
      PADDLE.H * S,
      color,
    );
  }

  // Ball trail then ball.
  if (ballTrail) {
    for (let i = 0; i < ballTrail.length; i++) {
      const t = ballTrail[i];
      const a = PALETTE.trail[3] * ((i + 1) / ballTrail.length);
      push('glow', cx + t[0] * S, cy + t[1] * S, BALL.R * S * 2.2, BALL.R * S * 2.2, [
        PALETTE.trail[0],
        PALETTE.trail[1],
        PALETTE.trail[2],
        a,
      ]);
    }
  }
  const [bx, by] = [cx + game.ball.x * S, cy + game.ball.y * S];
  push('glow', bx, by, BALL.R * S * 3.5, BALL.R * S * 3.5, PALETTE.ballGlow);
  push('circle', bx - BALL.R * S, by - BALL.R * S, BALL.R * 2 * S, BALL.R * 2 * S, PALETTE.ball);

  // Wind: two drifting streak columns, direction by sign of ay.
  const ay = game.wind?.ay ?? 0;
  if (ay !== 0) {
    const dir = Math.sign(ay);
    const strength = Math.min(1, Math.abs(ay) / 90);
    for (let i = 0; i < 10; i++) {
      const yy = ((i * 7.3 + shakeT * 6) % 1) * l.h;
      const len = l.w * (0.06 + 0.1 * strength);
      const xx = cx + ((i * 37.7 + shakeT * 18) % 1) * (l.w - len);
      push('dash', xx, cy + yy, len, 1.5 + strength * 2, PALETTE.wind, dir);
    }
  }

  // Thought overlays: target line + aim marker per brain.
  for (const [dbg, paddle, color] of [
    [debugL, game.paddles.left, PALETTE.thoughtPlayer],
    [debugR, game.paddles.right, PALETTE.thoughtEnemy],
  ]) {
    if (!dbg) continue;
    if (typeof dbg.target === 'number')
      push('dash', cx + paddle.x * S - 8, cy + dbg.target * S, 16, 1.5, color);
    if (Array.isArray(dbg.aim)) {
      const [ax, ay2] = dbg.aim;
      push(
        'line',
        cx + paddle.x * S,
        cy + paddle.y * S,
        (ax - paddle.x) * S,
        (ay2 - paddle.y) * S,
        color,
      );
      push('circle', cx + ax * S - 3, cy + ay2 * S - 3, 6, 6, color);
    }
  }

  return { sprites, layout: l, bgTop: PALETTE.bgTop, bgBottom: PALETTE.bgBottom };
}

// Pull newest game event effects for the renderer/audio layer.
export function eventEffects(events) {
  const out = { hit: null, wall: false, score: null, serve: false };
  for (const e of events) {
    if (e.type === 'paddle-hit') out.hit = e;
    else if (e.type === 'wall') out.wall = true;
    else if (e.type === 'score') out.score = e;
    else if (e.type === 'serve') out.serve = true;
  }
  return out;
}
