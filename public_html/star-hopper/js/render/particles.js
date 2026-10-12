// Tiny CPU particle pool: bursts on pickups, dust on jumps/landings, streaks
// while falling. Rendered as additive point sprites.

const MAX = 320;
const STRIDE = 7; // x, y, z, r, g, b, size

export class Particles {
  constructor() {
    this.data = new Float32Array(MAX * STRIDE);
    this.vel = new Float32Array(MAX * 3);
    this.life = new Float32Array(MAX);
    this.maxLife = new Float32Array(MAX);
    this.head = 0;
    this.alive = 0;
  }

  spawn(x, y, z, vx, vy, vz, r, g, b, size, life) {
    const i = this.head;
    this.head = (this.head + 1) % MAX;
    const base = i * STRIDE;
    this.data[base] = x;
    this.data[base + 1] = y;
    this.data[base + 2] = z;
    this.data[base + 3] = r;
    this.data[base + 4] = g;
    this.data[base + 5] = b;
    this.data[base + 6] = size;
    this.vel[i * 3] = vx;
    this.vel[i * 3 + 1] = vy;
    this.vel[i * 3 + 2] = vz;
    this.life[i] = life;
    this.maxLife[i] = life;
  }

  burst(x, y, z, color, count = 14, speed = 5) {
    for (let n = 0; n < count; n += 1) {
      const a = Math.random() * Math.PI * 2;
      const up = Math.random() * 0.9 + 0.3;
      const v = speed * (0.4 + Math.random() * 0.8);
      this.spawn(
        x,
        y,
        z,
        Math.cos(a) * v,
        up * v,
        Math.sin(a) * v,
        color[0],
        color[1],
        color[2],
        0.5 + Math.random() * 0.8,
        0.5 + Math.random() * 0.4,
      );
    }
  }

  dust(x, y, z, count = 8) {
    for (let n = 0; n < count; n += 1) {
      const a = Math.random() * Math.PI * 2;
      const v = 1.5 + Math.random() * 2.5;
      this.spawn(
        x,
        y + 0.05,
        z,
        Math.cos(a) * v,
        0.6 + Math.random() * 1.2,
        Math.sin(a) * v,
        0.85,
        0.7,
        0.6,
        0.35 + Math.random() * 0.4,
        0.35 + Math.random() * 0.3,
      );
    }
  }

  streak(x, y, z, count = 2) {
    for (let n = 0; n < count; n += 1) {
      this.spawn(
        x + (Math.random() - 0.5) * 1.2,
        y + Math.random() * 1.5,
        z + (Math.random() - 0.5) * 1.2,
        0,
        0,
        0,
        0.9,
        0.8,
        1.0,
        0.3,
        0.25,
      );
    }
  }

  update(dt) {
    for (let i = 0; i < MAX; i += 1) {
      if (this.life[i] <= 0) continue;
      this.life[i] -= dt;
      const base = i * STRIDE;
      if (this.life[i] <= 0) {
        this.data[base + 6] = 0;
        continue;
      }
      this.vel[i * 3 + 1] -= 6 * dt; // gravity-ish
      this.data[base] += this.vel[i * 3] * dt;
      this.data[base + 1] += this.vel[i * 3 + 1] * dt;
      this.data[base + 2] += this.vel[i * 3 + 2] * dt;
      // Shrink with age.
      const k = this.life[i] / this.maxLife[i];
      this.data[base + 6] *= 0.92 + 0.08 * k;
    }
  }
}
