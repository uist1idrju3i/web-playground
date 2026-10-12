// Dependency-free 3D cake preview for the result screen: a software
// rasterized cylinder the player can drag to spin. When a snapshot of the
// simulation field is provided, the actual browning maps (top face,
// underside, rim thickness) drive every face's color so the cake on
// screen is the cake that was baked — not an averaged illustration.

const SEGS = 48;

function brownRgb(b, stops) {
  for (let i = 1; i < stops.length; i += 1) {
    if (b <= stops[i][0]) {
      const k = (b - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
      return stops[i - 1][1].map((c, j) => Math.round(c + (stops[i][1][j] - c) * k));
    }
  }
  return stops.at(-1)[1];
}

const STOPS = [
  [0, [245, 224, 178]],
  [0.3, [237, 186, 110]],
  [0.62, [199, 120, 48]],
  [0.95, [128, 64, 20]],
  [1.3, [36, 18, 9]],
];
const CREAM = [250, 236, 205];
const LIGHT = [-0.45, 0.75, 0.5];

export function makeCakeView(canvas, stats, { radius = 36, tex = null } = {}) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const heightMm = 14 + Math.min(10, Math.max(4, (stats.volumeMl ?? 40) * 0.16));
  const mottle = (i, j) => {
    const s = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453;
    return s - Math.floor(s) - 0.5;
  };

  // Sample the captured browning map at a local position in [-r, r]^2.
  const sample = (map, x, z) => {
    const n = tex.size;
    const i = Math.min(n - 1, Math.max(0, Math.round(((x / radius + 1) / 2) * (n - 1))));
    const j = Math.min(n - 1, Math.max(0, Math.round(((z / radius + 1) / 2) * (n - 1))));
    return map[j * n + i];
  };

  // Pale angel's-ring band around mid-height fading into the browned rims.
  const sideColor = (t, thick) => {
    const edge = Math.min(1, Math.abs(t - 0.5) * 2.4);
    const brown = brownRgb(stats.bottomBrownMean * (0.55 + 0.45 * edge), STOPS);
    const k = Math.min(1, (stats.ringWhiteness ?? 0.6) * (1 - edge) * (0.6 + 0.4 * thick));
    return brown.map((c, i) => Math.round(c + (CREAM[i] - c) * k));
  };

  const capColor = (map, mean, x, z, i, cap) => {
    if (tex) return brownRgb(sample(map, x, z) + mottle(i, cap) * 0.05, STOPS);
    return brownRgb(mean + mottle(i, cap) * 0.18, STOPS);
  };

  let yaw = 0.4;
  let targetSpin = 0.5;
  let dragging = false;
  let lastX = 0;
  let raf = 0;
  let dead = false;

  function render() {
    if (dead) return;
    ctx.clearRect(0, 0, w, h);
    const scale = (w * 0.34) / radius;
    const cy0 = h * 0.52;
    const cx0 = w / 2;
    const pitch = 0.62;
    const cosY = Math.cos(yaw);
    const sinY = Math.sin(yaw);
    const cosP = Math.cos(pitch);
    const sinP = Math.sin(pitch);
    const project = ([x, y, z]) => {
      const X = x * cosY + z * sinY;
      const Z = -x * sinY + z * cosY;
      const Y = y * cosP - Z * sinP;
      return [cx0 + X * scale, cy0 - Y * scale, Z];
    };

    const faces = [];
    // Top and bottom caps (fans of triangles; real browning when tex exists).
    for (const [cap, map, mean] of [
      [heightMm / 2, tex?.top, stats.topBrownMean],
      [-heightMm / 2, tex?.bottom, stats.bottomBrownMean],
    ]) {
      for (let i = 0; i < SEGS; i += 1) {
        const a0 = (i / SEGS) * Math.PI * 2;
        const a1 = ((i + 1) / SEGS) * Math.PI * 2;
        const cx = Math.cos((a0 + a1) / 2) * radius * 0.66;
        const cz = Math.sin((a0 + a1) / 2) * radius * 0.66;
        const v = [
          [0, cap, 0],
          [Math.cos(a0) * radius, cap, Math.sin(a0) * radius],
          [Math.cos(a1) * radius, cap, Math.sin(a1) * radius],
        ];
        faces.push({
          pts: v.map(project),
          color: capColor(map, mean, cx, cz, i, cap),
          nz: Math.sign(cap),
        });
      }
    }
    // Side strip.
    for (let i = 0; i < SEGS; i += 1) {
      const a0 = (i / SEGS) * Math.PI * 2;
      const a1 = ((i + 1) / SEGS) * Math.PI * 2;
      const nx = Math.cos((a0 + a1) / 2);
      const nz = Math.sin((a0 + a1) / 2);
      const thick = tex ? sample(tex.rim, nx * radius * 0.9, nz * radius * 0.9) : 1;
      const c0 = sideColor(0, thick);
      const c1 = sideColor(1, thick);
      const light = 0.5 + 0.5 * Math.max(0, nx * LIGHT[0] + nz * LIGHT[2] + 0.6 * LIGHT[1]);
      const v = [
        [Math.cos(a0) * radius, -heightMm / 2, Math.sin(a0) * radius],
        [Math.cos(a1) * radius, -heightMm / 2, Math.sin(a1) * radius],
        [Math.cos(a1) * radius, heightMm / 2, Math.sin(a1) * radius],
        [Math.cos(a0) * radius, heightMm / 2, Math.sin(a0) * radius],
      ];
      const top = c1.map((c) => Math.round(c * light));
      const bottom = c0.map((c) => Math.round(c * light));
      faces.push({ pts: v.map(project), color: top, bottom, nz: null });
    }

    // Painter's sort on averaged rotated z.
    for (const f of faces) f.depth = f.pts.reduce((s, p) => s + p[2], 0) / f.pts.length;
    faces.sort((a, b) => b.depth - a.depth);
    for (const f of faces) {
      ctx.beginPath();
      f.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      if (f.bottom) {
        const g = ctx.createLinearGradient(...f.pts[0].slice(0, 2), ...f.pts[2].slice(0, 2));
        g.addColorStop(0, `rgb(${f.color.join(',')})`);
        g.addColorStop(1, `rgb(${f.bottom.join(',')})`);
        ctx.fillStyle = g;
      } else {
        ctx.fillStyle = `rgb(${f.color.join(',')})`;
      }
      ctx.fill();
    }
    if (!dragging) yaw += 0.006 * targetSpin;
    raf = requestAnimationFrame(render);
  }

  const down = (e) => {
    dragging = true;
    lastX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
  };
  const move = (e) => {
    if (!dragging) return;
    yaw += (e.clientX - lastX) * 0.012;
    lastX = e.clientX;
  };
  const up = () => {
    dragging = false;
  };
  canvas.addEventListener('pointerdown', down);
  canvas.addEventListener('pointermove', move);
  canvas.addEventListener('pointerup', up);
  canvas.style.touchAction = 'none';
  render();
  return {
    dispose() {
      dead = true;
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', down);
      canvas.removeEventListener('pointermove', move);
      canvas.removeEventListener('pointerup', up);
    },
  };
}
