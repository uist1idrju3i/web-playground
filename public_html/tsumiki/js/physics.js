// Rapier (WASM) physics wrapper for the tsumiki game.
import RAPIER from '../vendor/rapier.js';

export const WORLD = {
  gravity: -9.8,
  platformY: 0,
  platformHalfW: 2.75,
  platformHalfH: 0.28,
  killY: -6.5, // below this a body escaped
  escapeX: 5.2, // beyond this horizontally a body escaped
  spawnMargin: 0.25,
  fixedDt: 1 / 60,
};

let ready = false;
export async function initPhysics() {
  if (!ready) {
    await RAPIER.init();
    ready = true;
  }
  return RAPIER;
}

export class Physics {
  constructor() {
    this.world = new RAPIER.World({ x: 0, y: WORLD.gravity });
    this.world.timestep = WORLD.fixedDt;
    this.bodies = new Map(); // handle -> record
    this.nextId = 1;
    // Stone pedestal: static cuboid.
    const ground = this.world.createRigidBody(
      RAPIER.RigidBodyDesc.fixed().setTranslation(0, WORLD.platformY - WORLD.platformHalfH),
    );
    this.world.createCollider(
      RAPIER.ColliderDesc.cuboid(WORLD.platformHalfW, WORLD.platformHalfH).setFriction(0.92),
      ground,
    );
    this.groundBody = ground;
    this.wind = { x: 0, y: 0 };
    this._free = new RAPIER.Vector2(0, 0);
  }

  // Spawn a prefecture piece as a compound of triangle colliders.
  spawnPiece(piece, x, y, angle = 0) {
    const desc = RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(x, y)
      .setRotation(angle)
      .setLinearDamping(0.02)
      .setAngularDamping(0.4)
      .setCcdEnabled(true);
    const body = this.world.createRigidBody(desc);
    const poly = piece.poly;
    // Rapier rejects convex hulls thinner than ~1e-3; ear-clipping produces
    // many hairline ears along smooth boundaries. Skip ears whose minimum
    // altitude falls below a safe margin — they carry negligible area.
    const MIN_ALT = 0.006;
    for (let i = 0; i < piece.tris.length; i += 3) {
      const a = poly[piece.tris[i]];
      const b = poly[piece.tris[i + 1]];
      const c = poly[piece.tris[i + 2]];
      const area2 = Math.abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]));
      const e1 = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const e2 = Math.hypot(c[0] - b[0], c[1] - b[1]);
      const e3 = Math.hypot(a[0] - c[0], a[1] - c[1]);
      const alt = area2 / Math.max(e1, e2, e3);
      if (alt < MIN_ALT) continue;
      const points = new Float32Array([a[0], a[1], b[0], b[1], c[0], c[1]]);
      const colliderDesc = RAPIER.ColliderDesc.convexHull(points)
        .setFriction(0.85)
        .setRestitution(0.02)
        .setDensity(1.6);
      if (colliderDesc) this.world.createCollider(colliderDesc, body);
    }
    const id = this.nextId++;
    const record = { id, body, piece, still: 0, settled: false, escaped: false, maxY: y };
    this.bodies.set(id, record);
    body.userData = id;
    return record;
  }

  // Kinematic preview body used while aiming (no collision).
  spawnGhost() {
    const desc = RAPIER.RigidBodyDesc.kinematicPositionBased().setTranslation(0, 0);
    return this.world.createRigidBody(desc);
  }

  step(onEvents) {
    // Wind acts as a force on dynamic bodies that are still falling.
    for (const rec of this.bodies.values()) {
      if (!rec.settled && !rec.escaped && (this.wind.x !== 0 || this.wind.y !== 0)) {
        const m = rec.body.mass();
        rec.body.addForce({ x: this.wind.x * m, y: this.wind.y * m }, true);
      }
    }
    this.world.step();
    const events = [];
    for (const rec of this.bodies.values()) {
      const t = rec.body.translation();
      const lv = rec.body.linvel();
      const speed = Math.hypot(lv.x, lv.y);
      const av = Math.abs(rec.body.angvel());
      if (t.y > rec.maxY) rec.maxY = t.y;
      if (!rec.settled) {
        if (speed < 0.24 && av < 0.6 && rec.body.isSleeping()) {
          rec.still += WORLD.fixedDt;
          if (rec.still > 0.55) {
            rec.settled = true;
            events.push({ kind: 'settled', rec });
          }
        } else if (speed < 0.08 && av < 0.25) {
          rec.still += WORLD.fixedDt;
          if (rec.still > 1.4) {
            rec.settled = true;
            events.push({ kind: 'settled', rec });
          }
        } else {
          rec.still = 0;
        }
      }
      if (!rec.escaped && (t.y < WORLD.killY || Math.abs(t.x) > WORLD.escapeX)) {
        rec.escaped = true;
        events.push({ kind: 'escaped', rec });
      }
    }
    for (const ev of events) {
      if (ev.kind === 'escaped') {
        this.world.removeRigidBody(ev.rec.body);
        this.bodies.delete(ev.rec.id);
      }
      onEvents?.(ev);
    }
    return events;
  }

  setWind(x, y) {
    this.wind.x = x;
    this.wind.y = y;
  }

  // Remove every dynamic body (restart).
  clear() {
    for (const rec of this.bodies.values()) this.world.removeRigidBody(rec.body);
    this.bodies.clear();
  }

  // Current snapshot for rendering.
  poses() {
    const out = [];
    for (const rec of this.bodies.values()) {
      const t = rec.body.translation();
      const r = rec.body.rotation();
      out.push({ rec, x: t.x, y: t.y, angle: r });
    }
    return out;
  }

  topY() {
    let top = WORLD.platformY;
    for (const rec of this.bodies.values()) {
      const t = rec.body.translation();
      if (t.y > top) top = t.y;
    }
    return top;
  }

  // Highest point of SETTLED pieces only — drives camera and tower height.
  topSettledY() {
    let top = WORLD.platformY;
    for (const rec of this.bodies.values()) {
      if (!rec.settled) continue;
      const t = rec.body.translation();
      const halfH = (rec.piece.bbox[3] - rec.piece.bbox[1]) / 2;
      if (t.y + halfH > top) top = t.y + halfH;
    }
    return top;
  }

  settledCount() {
    let n = 0;
    for (const rec of this.bodies.values()) if (rec.settled) n += 1;
    return n;
  }
}
