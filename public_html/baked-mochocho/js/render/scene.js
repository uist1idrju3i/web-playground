// Backend-independent scene description: camera, grid topology, picking and palette.
// World space (GL convention, right-handed, millimetres): X = sim x, Y = up (sim z), Z = sim y.

export const PLATE = { w: 264, h: 168, border: 10 };

export function perspective(fovY, aspect, near, far, zeroToOne) {
  const f = 1 / Math.tan(fovY / 2);
  const out = new Float32Array(16);
  out[0] = f / aspect;
  out[5] = f;
  out[11] = -1;
  if (zeroToOne) {
    out[10] = far / (near - far);
    out[14] = (near * far) / (near - far);
  } else {
    out[10] = (far + near) / (near - far);
    out[14] = (2 * far * near) / (near - far);
  }
  return out;
}

const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const normalize = (a) => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

export function lookAt(eye, target, up) {
  const f = normalize(sub(target, eye));
  const s = normalize(cross(f, up));
  const u = cross(s, f);
  return new Float32Array([
    s[0],
    u[0],
    -f[0],
    0,
    s[1],
    u[1],
    -f[1],
    0,
    s[2],
    u[2],
    -f[2],
    0,
    -dot(s, eye),
    -dot(u, eye),
    dot(f, eye),
    1,
  ]);
}

export function multiply(a, b) {
  const out = new Float32Array(16);
  for (let c = 0; c < 4; c += 1) {
    for (let r = 0; r < 4; r += 1) {
      let sum = 0;
      for (let k = 0; k < 4; k += 1) sum += a[k * 4 + r] * b[c * 4 + k];
      out[c * 4 + r] = sum;
    }
  }
  return out;
}

export function invert(m) {
  const inv = new Float32Array(16);
  const [a00, a01, a02, a03, a10, a11, a12, a13, a20, a21, a22, a23, a30, a31, a32, a33] = m;
  const b00 = a00 * a11 - a01 * a10;
  const b01 = a00 * a12 - a02 * a10;
  const b02 = a00 * a13 - a03 * a10;
  const b03 = a01 * a12 - a02 * a11;
  const b04 = a01 * a13 - a03 * a11;
  const b05 = a02 * a13 - a03 * a12;
  const b06 = a20 * a31 - a21 * a30;
  const b07 = a20 * a32 - a22 * a30;
  const b08 = a20 * a33 - a23 * a30;
  const b09 = a21 * a32 - a22 * a31;
  const b10 = a21 * a33 - a23 * a31;
  const b11 = a22 * a33 - a23 * a32;
  const det = b00 * b11 - b01 * b10 + b02 * b09 + b03 * b08 - b04 * b07 + b05 * b06 || 1e-12;
  const d = 1 / det;
  inv[0] = (a11 * b11 - a12 * b10 + a13 * b09) * d;
  inv[1] = (a02 * b10 - a01 * b11 - a03 * b09) * d;
  inv[2] = (a31 * b05 - a32 * b04 + a33 * b03) * d;
  inv[3] = (a22 * b04 - a21 * b05 - a23 * b03) * d;
  inv[4] = (a12 * b08 - a10 * b11 - a13 * b07) * d;
  inv[5] = (a00 * b11 - a02 * b08 + a03 * b07) * d;
  inv[6] = (a32 * b02 - a30 * b05 - a33 * b01) * d;
  inv[7] = (a20 * b05 - a22 * b02 + a23 * b01) * d;
  inv[8] = (a10 * b10 - a11 * b08 + a13 * b06) * d;
  inv[9] = (a01 * b08 - a00 * b10 - a03 * b06) * d;
  inv[10] = (a30 * b04 - a31 * b02 + a33 * b00) * d;
  inv[11] = (a21 * b02 - a20 * b04 - a23 * b00) * d;
  inv[12] = (a11 * b07 - a10 * b09 - a12 * b06) * d;
  inv[13] = (a00 * b09 - a01 * b07 + a02 * b06) * d;
  inv[14] = (a31 * b01 - a30 * b03 - a32 * b00) * d;
  inv[15] = (a20 * b03 - a21 * b01 + a22 * b00) * d;
  return inv;
}

// Returns the divided NDC x/y, the divided NDC z and the clip-space w.
// Picking needs the real z: without it unprojecting [nx, ny, 0|1] is meaningless.
function project(m, p) {
  const x = m[0] * p[0] + m[4] * p[1] + m[8] * p[2] + m[12];
  const y = m[1] * p[0] + m[5] * p[1] + m[9] * p[2] + m[13];
  const z = m[2] * p[0] + m[6] * p[1] + m[10] * p[2] + m[14];
  const w = m[3] * p[0] + m[7] * p[1] + m[11] * p[2] + m[15];
  return [x / w, y / w, z / w, w];
}

// Portrait screens view the plate from its right side so the long edge runs vertically.
export function makeCamera(
  width,
  height,
  { zeroToOne = false, safeTop = 0.16, safeBottom = 0.3 } = {},
) {
  const aspect = width / Math.max(1, height);
  const portrait = aspect < 0.9;
  const center = [PLATE.w / 2, 0, PLATE.h / 2];
  const pitch = portrait ? 0.98 : 0.86;
  const fov = 0.62;
  const dir = portrait
    ? [Math.cos(pitch), Math.sin(pitch), 0]
    : [0, Math.sin(pitch), Math.cos(pitch)];
  const corners = [];
  // The rim extends PLATE.border cells (1.5 mm each) beyond the field.
  const rim = PLATE.border * 1.5 + 3;
  for (const x of [-rim, PLATE.w + rim])
    for (const z of [-rim, PLATE.h + rim]) for (const y of [-12, 30]) corners.push([x, y, z]);
  const top = 1 - 2 * safeTop;
  const bottom = -1 + 2 * safeBottom;
  const offset = (top + bottom) / 2;
  let lo = 150;
  let hi = 3000;
  let result = null;
  for (let i = 0; i < 30; i += 1) {
    const dist = (lo + hi) / 2;
    const eye = [center[0] + dir[0] * dist, center[1] + dir[1] * dist, center[2] + dir[2] * dist];
    const view = lookAt(eye, center, [0, 1, 0]);
    const proj = perspective(fov, aspect, 20, dist * 3, zeroToOne);
    proj[9] -= offset;
    const viewProj = multiply(proj, view);
    const fits = corners.every((c) => {
      const [x, y] = project(viewProj, c);
      return Math.abs(x) <= 0.94 && y <= top && y >= bottom;
    });
    if (fits) {
      hi = dist;
      result = { eye, view, proj, viewProj, inverse: invert(viewProj), portrait };
    } else {
      lo = dist;
    }
  }
  return result;
}

// Screen (CSS px) → point on the plate plane (sim mm), or null.
export function pick(camera, px, py, width, height, zeroToOne = false) {
  const nx = (px / width) * 2 - 1;
  const ny = 1 - (py / height) * 2;
  const near = project(camera.inverse, [nx, ny, zeroToOne ? 0 : -1]);
  const far = project(camera.inverse, [nx, ny, 1]);
  const dy = far[1] - near[1];
  if (Math.abs(dy) < 1e-6) return null;
  const t = -near[1] / dy;
  return { x: near[0] + (far[0] - near[0]) * t, y: near[2] + (far[2] - near[2]) * t };
}

export function toScreen(camera, x, y, z, width, height) {
  const [nx, ny] = project(camera.viewProj, [x, z, y]);
  return { x: ((nx + 1) / 2) * width, y: ((1 - ny) / 2) * height };
}

// Grid of (w + 2*b) × (h + 2*b) vertices; vertices outside the field form the plate rim.
export function gridIndices(w, h, border) {
  const cols = w + border * 2;
  const rows = h + border * 2;
  const indices = new Uint32Array((cols - 1) * (rows - 1) * 6);
  let k = 0;
  for (let y = 0; y < rows - 1; y += 1) {
    for (let x = 0; x < cols - 1; x += 1) {
      const i = y * cols + x;
      indices.set([i, i + cols, i + 1, i + 1, i + cols, i + cols + 1], k);
      k += 6;
    }
  }
  return { indices, cols, rows };
}

export function moldTexture(sim) {
  const { w, h, cell } = sim.grid;
  const data = new Float32Array(w * h);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) data[y * w + x] = sim.moldZ((x + 0.5) * cell, (y + 0.5) * cell);
  }
  return data;
}

export const FILLING_RGB = {
  0: [0, 0, 0],
  1: [0.24, 0.08, 0.08],
  2: [0.96, 0.77, 0.32],
  3: [0.98, 0.9, 0.62],
  4: [0.46, 0.62, 0.22],
};

// Packs per-frame uniforms shared by both backends (std140/WGSL compatible, 64 floats).
export function packUniforms(out, camera, frame) {
  out.set(camera.viewProj, 0);
  out[16] = camera.eye[0];
  out[17] = camera.eye[1];
  out[18] = camera.eye[2];
  out[19] = frame.time;
  out[20] = frame.flips[0];
  out[21] = frame.flips[1];
  out[22] = frame.flips[2];
  out[23] = frame.plateTemp;
  out[24] = frame.cursor.x;
  out[25] = frame.cursor.y;
  out[26] = frame.cursor.radius;
  out[27] = frame.cursor.active ? 1 : 0;
  for (let c = 0; c < 6; c += 1) {
    const rgb = FILLING_RGB[frame.fillingKinds[c]] ?? FILLING_RGB[0];
    out.set([rgb[0], rgb[1], rgb[2], frame.fillingKinds[c] ? 1 : 0], 28 + c * 4);
  }
  out[52] = frame.width;
  out[53] = frame.height;
  out[54] = frame.reducedMotion ? 1 : 0;
  out[55] = frame.heat;
  return out;
}
