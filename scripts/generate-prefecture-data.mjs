// Generates public_html/tsumiki/data/prefectures.json from the committed
// Natural Earth 10m admin-1 extract (scripts/geo/ne-10m-admin-1-japan.geojson).
//
// Data source: Natural Earth (https://www.naturalearthdata.com) — public domain.
// Pipeline per prefecture: keep the largest outer ring (tsumiki-style single
// piece), Douglas-Peucker simplify to a vertex budget, force CCW winding,
// ear-clip triangulate for physics colliders, then centre and scale for play.
// Output is deterministic: fixed ordering, fixed coordinate rounding.

import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('..', import.meta.url));
const sourcePath = `${root}scripts/geo/ne-10m-admin-1-japan.geojson`;
const outPath = `${root}public_html/tsumiki/data/prefectures.json`;

const REGION_ORDER = [
  'Hokkaido',
  'Tohoku',
  'Kanto',
  'Chubu',
  'Kinki',
  'Chugoku',
  'Shikoku',
  'Kyushu',
  'Okinawa',
];
const REGION_JA = {
  Hokkaido: '北海道',
  Tohoku: '東北',
  Kanto: '関東',
  Chubu: '中部',
  Kinki: '近畿',
  Chugoku: '中国',
  Shikoku: '四国',
  Kyushu: '九州',
  Okinawa: '沖縄',
};
const REGION_FIXES = { Saga: 'Kyushu', Nagasaki: 'Kyushu' };

function ringArea(ring) {
  let sum = 0;
  for (let i = 0; i < ring.length - 1; i++) {
    sum += ring[i][0] * ring[i + 1][1] - ring[i + 1][0] * ring[i][1];
  }
  return sum / 2;
}

function dedupe(ring) {
  const out = [];
  for (const point of ring) {
    const last = out[out.length - 1];
    if (!last || last[0] !== point[0] || last[1] !== point[1]) out.push(point);
  }
  if (
    out.length > 1 &&
    out[0][0] === out[out.length - 1][0] &&
    out[0][1] === out[out.length - 1][1]
  ) {
    out.pop();
  }
  return out;
}

function perpendicularDistance(point, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const length = Math.hypot(dx, dy);
  if (length === 0) return Math.hypot(point[0] - a[0], point[1] - a[1]);
  return Math.abs(dy * point[0] - dx * point[1] + b[0] * a[1] - b[1] * a[0]) / length;
}

function douglasPeucker(points, tolerance) {
  if (points.length <= 2) return points.slice();
  let maxDistance = 0;
  let maxIndex = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const distance = perpendicularDistance(points[i], points[0], points[points.length - 1]);
    if (distance > maxDistance) {
      maxDistance = distance;
      maxIndex = i;
    }
  }
  if (maxDistance <= tolerance) return [points[0], points[points.length - 1]];
  const left = douglasPeucker(points.slice(0, maxIndex + 1), tolerance);
  const right = douglasPeucker(points.slice(maxIndex), tolerance);
  return left.slice(0, -1).concat(right);
}

function baseTolerance(ring) {
  const xs = ring.map((p) => p[0]);
  const ys = ring.map((p) => p[1]);
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  return span / 600;
}

function simplifyToBudget(ring, budget) {
  let tolerance = baseTolerance(ring);
  let result = ring.slice(0, -1);
  for (let attempt = 0; attempt < 24 && result.length > budget; attempt++) {
    result = dedupe(douglasPeucker(ring.slice(0, -1), tolerance));
    tolerance *= 1.35;
  }
  return result.length <= budget ? result : result.slice(0, budget);
}

function pointInTriangle(p, a, b, c) {
  const d1 = (p[0] - b[0]) * (a[1] - b[1]) - (a[0] - b[0]) * (p[1] - b[1]);
  const d2 = (p[0] - c[0]) * (b[1] - c[1]) - (b[0] - c[0]) * (p[1] - c[1]);
  const d3 = (p[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (p[1] - a[1]);
  const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
  const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(hasNeg && hasPos);
}

function earClip(ring) {
  const indices = ring.map((_, i) => i);
  const triangles = [];
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  let guard = 0;
  while (indices.length > 3 && guard++ < 4096) {
    let clipped = false;
    for (let i = 0; i < indices.length; i++) {
      const prev = indices[(i - 1 + indices.length) % indices.length];
      const curr = indices[i];
      const next = indices[(i + 1) % indices.length];
      const a = ring[prev];
      const b = ring[curr];
      const c = ring[next];
      if (cross(a, b, c) <= 1e-12) continue;
      let ear = true;
      for (const j of indices) {
        if (j === prev || j === curr || j === next) continue;
        if (pointInTriangle(ring[j], a, b, c)) {
          ear = false;
          break;
        }
      }
      if (!ear) continue;
      triangles.push(prev, curr, next);
      indices.splice(i, 1);
      clipped = true;
      break;
    }
    if (!clipped) return null;
  }
  if (indices.length === 3) triangles.push(indices[0], indices[1], indices[2]);
  return triangles;
}

function centroid(ring) {
  let cx = 0;
  let cy = 0;
  let area = 0;
  for (let i = 0; i < ring.length; i++) {
    const j = (i + 1) % ring.length;
    const w = ring[i][0] * ring[j][1] - ring[j][0] * ring[i][1];
    area += w;
    cx += (ring[i][0] + ring[j][0]) * w;
    cy += (ring[i][1] + ring[j][1]) * w;
  }
  area /= 2;
  if (Math.abs(area) < 1e-12) {
    return ring.reduce(
      (acc, p) => [acc[0] + p[0] / ring.length, acc[1] + p[1] / ring.length],
      [0, 0],
    );
  }
  return [cx / (6 * area), cy / (6 * area)];
}

function round3(value) {
  return Math.round(value * 1000) / 1000;
}

const source = JSON.parse(await readFile(sourcePath, 'utf8'));
const pieces = [];

for (const feature of source.features) {
  const props = feature.properties;
  const geometry = feature.geometry;
  const polygons = geometry.type === 'MultiPolygon' ? geometry.coordinates : [geometry.coordinates];
  let largest = null;
  let largestArea = -1;
  for (const polygon of polygons) {
    const outer = dedupe(polygon[0].map(([x, y]) => [x, y]));
    if (outer.length < 4) continue;
    const area = Math.abs(ringArea([...outer, outer[0]]));
    if (area > largestArea) {
      largestArea = area;
      largest = outer;
    }
  }
  if (!largest) throw new Error(`No usable polygon for ${props.name}`);

  let ring = null;
  let tris = null;
  for (const budget of [72, 60, 48, 36, 24]) {
    const candidate = simplifyToBudget([...largest, largest[0]], budget);
    if (candidate.length < 8) continue;
    if (ringArea([...candidate, candidate[0]]) < 0) candidate.reverse();
    const attempt = earClip(candidate);
    if (attempt) {
      ring = candidate;
      tris = attempt;
      break;
    }
  }
  if (!ring || !tris) throw new Error(`Triangulation failed for ${props.name}`);

  const [cx, cy] = centroid(ring);
  const geoCenter = [cx, cy];
  const centered = ring.map(([x, y]) => [x - cx, y - cy]);
  const xs = centered.map((p) => p[0]);
  const ys = centered.map((p) => p[1]);
  const diagonal = Math.hypot(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));

  const region = REGION_FIXES[props.name] ?? props.region;
  if (!REGION_ORDER.includes(region)) throw new Error(`Unknown region for ${props.name}`);

  pieces.push({
    code: props.iso_3166_2,
    name: props.name,
    nameJa: props.name_ja ?? props.name_local ?? props.name,
    shortJa: (props.name_ja ?? props.name_local ?? props.name).replace(/[都府県]$/, ''),
    region,
    regionJa: REGION_JA[region],
    realArea: round3(largestArea),
    geoCenter: geoCenter.map(round3),
    geoRing: ring,
    diagonal,
    poly: centered.map(([x, y]) => [round3(x), round3(y)]),
    tris,
  });
}

pieces.sort((a, b) => a.code.localeCompare(b.code));

// Playable scale: piece bounding diagonal in world units grows with the
// square-root-ish of the real area, clamped so every piece stays stackable.
const maxArea = Math.max(...pieces.map((p) => p.realArea));
for (const piece of pieces) {
  const ratio = piece.realArea / maxArea;
  const targetDiagonal = 0.55 + 1.35 * Math.pow(ratio, 0.28);
  piece.scale = round3(targetDiagonal / piece.diagonal);
  piece.poly = piece.poly.map(([x, y]) => [round3(x * piece.scale), round3(y * piece.scale)]);
  const xs = piece.poly.map((p) => p[0]);
  const ys = piece.poly.map((p) => p[1]);
  piece.bbox = [
    round3(Math.min(...xs)),
    round3(Math.min(...ys)),
    round3(Math.max(...xs)),
    round3(Math.max(...ys)),
  ];
  delete piece.diagonal;
}

// Geographic offsets for the collection map: place each piece's centroid back
// at its real position so the 47 pieces reassemble into Japan (y flipped: the
// map canvas grows downward). Scaled so the whole map spans ~8 units.
{
  const lons = pieces.map((p) => p.geoCenter[0]);
  const lats = pieces.map((p) => p.geoCenter[1]);
  const minLon = Math.min(...lons);
  const maxLon = Math.max(...lons);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const span = Math.max(maxLon - minLon, maxLat - minLat);
  const k = 8 / span;
  for (const piece of pieces) {
    piece.map = [
      round3((piece.geoCenter[0] - minLon) * k),
      round3((maxLat - piece.geoCenter[1]) * k),
    ];
    delete piece.geoCenter;
  }
}

// Shared-space map polygons for the collection map: an equirectangular
// projection around 36°N, normalised into one [0,1] box so the 46 main
// prefectures reassemble into the real shape of Japan (y flipped for the
// canvas). Okinawa is normalised into its own box and drawn as an inset,
// the standard way atlases place the Ryukyu arc.
{
  const COS_36 = Math.cos((36 * Math.PI) / 180);
  const proj = ([x, y]) => [x * COS_36, y];
  const main = pieces.filter((p) => p.code !== 'JP-47');
  const okinawa = pieces.find((p) => p.code === 'JP-47');
  const pts = main.flatMap((p) => p.geoRing.map(proj));
  const xs = pts.map((p) => p[0]);
  const ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs);
  const maxY = Math.max(...ys);
  const span = Math.max(Math.max(...xs) - minX, maxY - Math.min(...ys));
  for (const piece of main) {
    piece.mapPoly = piece.geoRing.map((pt) => {
      const [x, y] = proj(pt);
      return [round3((x - minX) / span), round3((maxY - y) / span)];
    });
  }
  const opts = okinawa.geoRing.map(proj);
  const oxs = opts.map((p) => p[0]);
  const oys = opts.map((p) => p[1]);
  const oMinX = Math.min(...oxs);
  const oMaxY = Math.max(...oys);
  const oSpan = Math.max(Math.max(...oxs) - oMinX, oMaxY - Math.min(...oys));
  okinawa.mapPoly = okinawa.geoRing.map((pt) => {
    const [x, y] = proj(pt);
    return [round3((x - oMinX) / oSpan), round3((oMaxY - y) / oSpan)];
  });
  for (const piece of pieces) delete piece.geoRing;
}

const output = {
  artifact_kind: 'wp_tsumiki_prefectures',
  schema_version: 1,
  source: {
    name: 'Natural Earth 10m admin-1 states and provinces',
    license: 'Public domain',
    url: 'https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/',
    extract: 'scripts/geo/ne-10m-admin-1-japan.geojson',
  },
  notes:
    'Each prefecture is reduced to its largest outer ring (tsumiki-style single piece) ' +
    'and simplified to at most 72 vertices. Coordinates are centred on the polygon ' +
    'centroid and pre-scaled to playable size; y points north (up). `map` holds ' +
    'normalised centroid offsets and `mapPoly` the shared-space polygon for the ' +
    'collection map (equirectangular projection, Okinawa in its own inset box).',
  count: pieces.length,
  pieces,
};

await writeFile(outPath, `${JSON.stringify(output, null, 1)}\n`, 'utf8');
const stats = await readFile(outPath, 'utf8');
console.log(
  `Wrote ${outPath}: ${pieces.length} pieces, ${stats.length} bytes, ` +
    `${pieces.reduce((acc, p) => acc + p.poly.length, 0)} vertices, ` +
    `${pieces.reduce((acc, p) => acc + p.tris.length / 3, 0)} triangles`,
);
