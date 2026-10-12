import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dataPath = fileURLToPath(
  new URL('../../public_html/tsumiki/data/prefectures.json', import.meta.url),
);
const data = JSON.parse(readFileSync(dataPath, 'utf8'));

const REGIONS = new Set([
  'Hokkaido',
  'Tohoku',
  'Kanto',
  'Chubu',
  'Kinki',
  'Chugoku',
  'Shikoku',
  'Kyushu',
  'Okinawa',
]);

function ringArea(poly) {
  let a = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, y1] = poly[i];
    const [x2, y2] = poly[(i + 1) % poly.length];
    a += x1 * y2 - x2 * y1;
  }
  return a / 2;
}

test('prefecture data contains 47 well-formed pieces', () => {
  assert.equal(data.artifact_kind, 'wp_tsumiki_prefectures');
  assert.equal(data.pieces.length, 47);
  const codes = new Set();
  for (const piece of data.pieces) {
    codes.add(piece.code);
    assert.match(piece.code, /^JP-\d{2}$/);
    assert.ok(piece.nameJa.length > 0, `${piece.code} missing nameJa`);
    assert.ok(REGIONS.has(piece.region), `${piece.code} bad region ${piece.region}`);
    assert.ok(piece.realArea > 0);
    // real prefecture dimensions in km (1 world unit = 1 km)
    assert.ok(piece.kmSize[0] > 30 && piece.kmSize[0] < 700);
    assert.ok(piece.kmSize[1] > 30 && piece.kmSize[1] < 600);
    assert.ok(Array.isArray(piece.map) && piece.map.length === 2);
    assert.ok(piece.poly.length >= 6, `${piece.code} poly too small (${piece.poly.length})`);
    // polygon must be counter-clockwise for the renderer/physics convention
    assert.ok(ringArea(piece.poly) > 0, `${piece.code} not CCW`);
    assert.equal(piece.tris.length % 3, 0, `${piece.code} tris not tripled`);
    for (const i of piece.tris) {
      assert.ok(Number.isInteger(i) && i >= 0 && i < piece.poly.length);
    }
    const xs = piece.poly.map((p) => p[0]);
    const ys = piece.poly.map((p) => p[1]);
    const [bx0, by0, bx1, by1] = piece.bbox;
    assert.ok(Math.abs(Math.min(...xs) - bx0) < 0.01);
    assert.ok(Math.abs(Math.min(...ys) - by0) < 0.01);
    assert.ok(Math.abs(Math.max(...xs) - bx1) < 0.01);
    assert.ok(Math.abs(Math.max(...ys) - by1) < 0.01);
    // centred on the centroid: |bbox centre| stays near the origin
    assert.ok(Math.abs((bx0 + bx1) / 2) < (bx1 - bx0) * 0.5);
    for (const [x, y] of piece.poly) {
      assert.ok(Number.isFinite(x) && Number.isFinite(y));
    }
  }
  assert.equal(codes.size, 47);
});

test('prefecture data records license provenance', () => {
  assert.match(data.source.name, /Natural Earth/);
  assert.match(data.source.license, /public domain/i);
  const sourceHost = new URL(data.source.url).hostname;
  assert.ok(
    sourceHost === 'naturalearthdata.com' || sourceHost.endsWith('.naturalearthdata.com'),
    `unexpected source host: ${sourceHost}`,
  );
});
