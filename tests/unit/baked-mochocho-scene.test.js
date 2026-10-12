import test from 'node:test';
import assert from 'node:assert/strict';

import { makeCamera, pick, toScreen } from '../../public_html/baked-mochocho/js/render/scene.js';

// Six cavities in two rows; centres match the simulation layout.
const CAVITIES = [
  [42, 42],
  [132, 42],
  [222, 42],
  [42, 126],
  [132, 126],
  [222, 126],
];
const VIEWPORTS = [
  [390, 844],
  [844, 390],
  [1280, 720],
];

test('screen-to-world picking round-trips through the camera', () => {
  for (const [width, height] of VIEWPORTS) {
    for (const zeroToOne of [false, true]) {
      const camera = makeCamera(width, height, { zeroToOne });
      let worst = 0;
      for (let i = 0; i < 40; i += 1) {
        const x = Math.random() * 264;
        const z = Math.random() * 168;
        const screen = toScreen(camera, x, z, 0, width, height);
        const p = pick(camera, screen.x, screen.y, width, height, zeroToOne);
        worst = Math.max(worst, Math.hypot(p.x - x, p.y - z));
      }
      assert.ok(worst < 0.5, `${width}x${height} zt=${zeroToOne} worst=${worst}`);
    }
  }
});

test('tapping a cavity on screen lands on that cavity', () => {
  for (const [width, height] of VIEWPORTS) {
    const camera = makeCamera(width, height, {});
    for (const [cx, cz] of CAVITIES) {
      const screen = toScreen(camera, cx, cz, 0, width, height);
      assert.ok(
        screen.x >= 0 && screen.x <= width && screen.y >= 0 && screen.y <= height,
        `cavity (${cx},${cz}) off screen at ${width}x${height}`,
      );
      const p = pick(camera, screen.x, screen.y, width, height, false);
      assert.ok(Math.hypot(p.x - cx, p.y - cz) < 0.5, `cavity (${cx},${cz})`);
      const nearest = CAVITIES.reduce(
        (best, [x, z]) =>
          Math.hypot(p.x - x, p.y - z) < best.d
            ? { i: CAVITIES.indexOf(best.c ?? [x, z]), d: Math.hypot(p.x - x, p.y - z), c: [x, z] }
            : best,
        { i: -1, d: Infinity, c: null },
      );
      assert.ok(nearest.d < 45, `nearest cavity for (${cx},${cz}) is ${nearest.d}mm away`);
    }
  }
});
