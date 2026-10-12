// Scene model shared by the WebGL2 and WebGPU backends: builds one packed
// instance buffer per frame plus ball/cord/camera state.

import { P, PHASE } from '../sim.js';

export const WORLD = {
  // World units are millimetres. The view fits `height` vertically.
  height: 470,
  centerY: -135, // midpoint between pivot (55) and floor (-330)
  pivotY: 55,
  stickTopY: 108, // stick body continues off the top of the frame
  floorY: -330,
};

// Instance layout (8 f32): x, y, dirX, dirY, len, width, heat, gen
export const INST_F32 = 8;

export function createScene(cap) {
  return {
    inst: new Float32Array(cap * INST_F32),
    instCount: 0,
    ball: { x: 0, y: 0, r: 1, heat: 0, swell: 0, tilt: 0, detached: 0, vy: 0 },
    phase: 0,
    elapsed: 0,
    ambientGlow: 0,
  };
}

export function updateScene(scene, sim) {
  const { particles, particleCap, inst } = {
    particles: sim.particles,
    particleCap: sim.particleCap,
    inst: scene.inst,
  };
  let n = 0;
  for (let i = 0; i < particleCap; i += 1) {
    const b = i * 12;
    const heat = particles[b + P.HEAT];
    if (heat <= 0.04) continue;
    const vx = particles[b + P.VX];
    const vy = particles[b + P.VY];
    const speed = Math.hypot(vx, vy);
    const o = n * INST_F32;
    // Streak direction: velocity when moving, radial jitter when near-still.
    let dx = 0;
    let dy = -1;
    if (speed > 1) {
      dx = vx / speed;
      dy = vy / speed;
    }
    const len = Math.min(42, Math.max(2.2, speed * 0.05));
    const width = Math.max(0.55, 1.05 - particles[b + P.GEN] * 0.12);
    inst[o] = particles[b + P.X];
    inst[o + 1] = particles[b + P.Y];
    inst[o + 2] = dx;
    inst[o + 3] = dy;
    inst[o + 4] = len;
    inst[o + 5] = width;
    inst[o + 6] = heat;
    inst[o + 7] = particles[b + P.GEN] + particles[b + P.Z] * 0.01;
    n += 1;
  }
  scene.instCount = n;
  sim.ballInto(scene.ball);
  const s = sim.stateInto();
  scene.phase = s.phase;
  scene.elapsed = s.elapsed;
  // Gentle scene illumination that breathes with spark density.
  const density = Math.min(1, n / 500);
  scene.ambientGlow =
    (scene.phase === PHASE.IDLE ? 0 : 0.12 + density * 0.3) * Math.max(0.1, scene.ball.heat);
}

// Camera transform: maps world (mm) to clip space; aspect-aware.
export function viewTransform(width, height) {
  const scaleY = 2 / WORLD.height;
  const scaleX = scaleY * (height / Math.max(1, width));
  return { scaleX, scaleY, cx: 0, cy: WORLD.centerY };
}
