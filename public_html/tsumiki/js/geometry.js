// Loads and prepares the generated prefecture shapes for physics and rendering.
export async function loadPrefectures(url = '/tsumiki/data/prefectures.json') {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`prefecture data failed: ${response.status}`);
  const data = await response.json();
  if (data.artifact_kind !== 'wp_tsumiki_prefectures' || !Array.isArray(data.pieces)) {
    throw new Error('prefecture data has an unexpected shape');
  }
  return data;
}

// Region display palette (original design; CMF palette lives in app.css/docs).
export const REGION_COLORS = {
  Hokkaido: { main: '#b7e3a1', edge: '#5d8f57', name: 'Hokkaido' },
  Tohoku: { main: '#a1d9c9', edge: '#4f8a7a', name: 'Tohoku' },
  Kanto: { main: '#f0c98f', edge: '#a9763f', name: 'Kanto' },
  Chubu: { main: '#a8c5ea', edge: '#5576a8', name: 'Chubu' },
  Kinki: { main: '#d9b7e3', edge: '#8a5fa3', name: 'Kinki' },
  Chugoku: { main: '#f0a8a1', edge: '#a85b52', name: 'Chugoku' },
  Shikoku: { main: '#f0e0a1', edge: '#a8913f', name: 'Shikoku' },
  Kyushu: { main: '#a1d3e8', edge: '#4f7d9c', name: 'Kyushu' },
  Okinawa: { main: '#f5c1d4', edge: '#a85f7d', name: 'Okinawa' },
};

export function pieceColor(piece) {
  return REGION_COLORS[piece.region] ?? { main: '#cccccc', edge: '#666666' };
}

// Builds a flat Float32Array [x,y,bevel,nx,ny] per vertex for one piece:
// triangles for the fill plus a radial "bevel" coordinate and the vertex's
// unit direction from the centroid (used for fake top-light in the shader).
export function buildPieceMesh(piece) {
  const poly = piece.poly;
  const out = new Float32Array(piece.tris.length * 5);
  const r = Math.max(piece.bbox[2] - piece.bbox[0], piece.bbox[3] - piece.bbox[1]) / 2 || 1;
  for (let i = 0; i < piece.tris.length; i++) {
    const v = poly[piece.tris[i]];
    const len = Math.hypot(v[0], v[1]) || 1;
    out[i * 5] = v[0];
    out[i * 5 + 1] = v[1];
    out[i * 5 + 2] = Math.min(len / r, 1);
    out[i * 5 + 3] = v[0] / len;
    out[i * 5 + 4] = v[1] / len;
  }
  return out;
}

// Outline strip (x,y pairs) for drawing the piece border with line-ish quads.
export function outlineStrip(piece) {
  const out = new Float32Array((piece.poly.length + 1) * 2);
  piece.poly.forEach(([x, y], i) => {
    out[i * 2] = x;
    out[i * 2 + 1] = y;
  });
  const last = out.length - 2;
  out[last] = piece.poly[0][0];
  out[last + 1] = piece.poly[0][1];
  return out;
}
