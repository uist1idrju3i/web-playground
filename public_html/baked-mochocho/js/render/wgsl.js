// WGSL mirror of glsl.js for the WebGPU backend.
export const shader = /* wgsl */ `
struct Frame {
  viewProj: mat4x4f,
  eyeTime: vec4f,
  flips: vec4f,
  cursor: vec4f,
  filling: array<vec4f, 6>,
  screen: vec4f,
};
struct Particle { pos: vec4f, info: vec4f };
@group(0) @binding(0) var<uniform> u: Frame;
@group(0) @binding(1) var fieldATex: texture_2d<f32>;
@group(0) @binding(2) var fieldBTex: texture_2d<f32>;
@group(0) @binding(3) var moldTex: texture_2d<f32>;
@group(0) @binding(4) var linearSampler: sampler;
@group(0) @binding(5) var<storage, read> particles: array<Particle>;

const W: i32 = 176;
const H: i32 = 112;
const B: i32 = 10;
const CELL: f32 = 1.5;
const PI: f32 = 3.14159265;

fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }
fn vnoise(p: vec2f) -> f32 {
  let i = floor(p); let f = fract(p); let w = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2f(1, 0)), w.x), mix(hash(i + vec2f(0, 1)), hash(i + vec2f(1, 1)), w.x), w.y);
}
fn fbm(q: vec2f) -> f32 {
  var p = q; var s = 0.0; var a = 0.5;
  for (var i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; }
  return s;
}
// Filmic tone curve: Krzysztof Narkowicz's published ACES fit (a numeric approximation).
fn aces(x: vec3f) -> vec3f { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), vec3f(0), vec3f(1)); }
fn outColor(hdr: vec3f, frag: vec2f) -> vec3f {
  let uv = frag / u.screen.xy;
  let vig = 1.0 - 0.35 * dot(uv - 0.5, uv - 0.5) * 2.2;
  return pow(aces(hdr * vig * 1.05), vec3f(1.0 / 2.2));
}
fn inside(c: vec2i) -> bool { return c.x >= 0 && c.y >= 0 && c.x < W && c.y < H; }
fn moldAt(c: vec2i) -> f32 {
  let cc = clamp(c, vec2i(0), vec2i(W - 1, H - 1));
  let d = max(max(-c, c - vec2i(W - 1, H - 1)), vec2i(0));
  let o = f32(max(d.x, d.y));
  if (o <= 0.0) { return textureLoad(moldTex, cc, 0).r; }
  return -min(16.0, o * o * 1.6);
}
fn fieldA(c: vec2i) -> vec4f { if (inside(c)) { return textureLoad(fieldATex, c, 0); } return vec4f(0); }
fn fieldB(c: vec2i) -> vec4f { if (inside(c)) { return textureLoad(fieldBTex, c, 0); } return vec4f(0); }
fn cavityOf(p: vec2f) -> i32 {
  let col = i32(clamp(floor(p.x / 88.0), 0.0, 2.0));
  let row = select(1, 0, p.y < 84.0);
  let center = vec2f(42.0 + 90.0 * f32(col), 42.0 + 84.0 * f32(row));
  return select(-1, row * 3 + col, length(p - center) <= 38.0);
}
fn hinge(p: vec3f, t: f32) -> vec3f {
  let s = sin(t); let co = cos(t); let dy = p.y - 84.0;
  var r = vec3f(p.x, 84.0 + dy * co + p.z * s, -dy * s + p.z * co);
  r.z -= 14.0 * smoothstep(0.55 * PI, PI, t);
  return r;
}
fn hingeN(n: vec3f, t: f32) -> vec3f { let s = sin(t); let co = cos(t); return vec3f(n.x, n.y * co + n.z * s, -n.y * s + n.z * co); }
fn toWorld(s: vec3f) -> vec3f { return vec3f(s.x, s.z, s.y); }
fn cellOf(id: u32) -> vec2i { let cols = W + 2 * B; return vec2i(i32(id) % cols - B, i32(id) / cols - B); }

const KEY_DIR = vec3f(-0.4612, 0.8405, 0.3587);
const KEY = vec3f(3.1, 2.55, 2.0);
const RIM_DIR = vec3f(0.6181, 0.4636, -0.6799);
const RIM = vec3f(0.9, 0.7, 0.5);
fn envColor(r: vec3f) -> vec3f {
  let up = clamp(r.y, -1.0, 1.0);
  let sky = mix(vec3f(0.05, 0.035, 0.03), vec3f(0.32, 0.2, 0.12), smoothstep(-0.1, 0.8, up));
  let lanterns = smoothstep(0.72, 0.98, vnoise(vec2f(atan2(r.x, r.z) * 6.0, up * 3.0))) * smoothstep(0.05, 0.4, up);
  return sky + lanterns * vec3f(2.2, 0.9, 0.35);
}
fn shade(albedo: vec3f, n: vec3f, p: vec3f, rough: f32, metal: f32, wrap: f32, ao: f32) -> vec3f {
  let v = normalize(u.eyeTime.xyz - p);
  let f0 = mix(vec3f(0.04), albedo, metal);
  var col = vec3f(0);
  for (var i = 0; i < 2; i++) {
    let l = select(RIM_DIR, KEY_DIR, i == 0);
    let lc = select(RIM, KEY, i == 0);
    let h = normalize(l + v);
    let ndl = max((dot(n, l) + wrap) / (1.0 + wrap), 0.0);
    let ndh = max(dot(n, h), 0.0);
    let a = rough * rough; let a2 = a * a;
    let dd = ndh * ndh * (a2 - 1.0) + 1.0;
    let d = a2 / (PI * dd * dd);
    let f = f0 + (1.0 - f0) * pow(1.0 - max(dot(h, v), 0.0), 5.0);
    let g = 0.25 / max(0.1, max(dot(n, l), 0.0) * max(dot(n, v), 0.0) + 0.1);
    col += lc * (albedo * (1.0 - metal) / PI * ndl + d * f * g * max(dot(n, l), 0.0));
  }
  let r = reflect(-v, n);
  let fr = f0 + (1.0 - f0) * pow(1.0 - max(dot(n, v), 0.0), 5.0);
  col += envColor(r) * fr * (1.0 - rough * 0.85);
  col += albedo * (1.0 - metal) * mix(vec3f(0.05, 0.035, 0.03), vec3f(0.16, 0.11, 0.08), n.y * 0.5 + 0.5);
  return col * ao;
}
fn browning(b: f32) -> vec3f {
  let c0 = vec3f(0.96, 0.88, 0.7); let c1 = vec3f(0.93, 0.73, 0.43); let c2 = vec3f(0.78, 0.47, 0.19);
  let c3 = vec3f(0.5, 0.25, 0.08); let c4 = vec3f(0.14, 0.07, 0.035);
  if (b < 0.3) { return mix(c0, c1, b / 0.3); }
  if (b < 0.62) { return mix(c1, c2, (b - 0.3) / 0.32); }
  if (b < 0.95) { return mix(c2, c3, (b - 0.62) / 0.33); }
  return mix(c3, c4, clamp((b - 0.95) / 0.35, 0.0, 1.0));
}

struct BgOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
@vertex fn bgVS(@builtin(vertex_index) id: u32) -> BgOut {
  let p = vec2f(f32((id << 1u) & 2u), f32(id & 2u));
  return BgOut(vec4f(p * 2.0 - 1.0, 0.9999, 1.0), vec2f(p.x, p.y));
}
@fragment fn bgFS(v: BgOut) -> @location(0) vec4f {
  let uv = v.uv;
  let aspect = u.screen.x / u.screen.y;
  var col = mix(vec3f(0.03, 0.02, 0.018), vec3f(0.11, 0.065, 0.04), uv.y);
  for (var i = 0; i < 14; i++) {
    let fi = f32(i);
    let c = vec2f(hash(vec2f(fi, 3.1)), 0.62 + 0.38 * hash(vec2f(fi, 7.7)));
    let r = 0.04 + 0.08 * hash(vec2f(fi, 1.3));
    let flicker = select(0.85 + 0.15 * sin(u.eyeTime.w * (1.0 + fi * 0.37) + fi), 1.0, u.screen.z > 0.5);
    let d = (uv - c) * vec2f(aspect, 1.0);
    let disk = smoothstep(r, r * 0.6, length(d));
    let tint = mix(vec3f(1.0, 0.42, 0.12), vec3f(1.0, 0.75, 0.35), hash(vec2f(fi, 9.2)));
    col += disk * tint * 0.35 * flicker;
  }
  let wood = fbm(vec2f(uv.x * 3.0, uv.y * 40.0)) * 0.5 + 0.5;
  let counter = mix(vec3f(0.16, 0.085, 0.045), vec3f(0.3, 0.17, 0.09), wood) * (0.4 + 0.6 * (1.0 - uv.y));
  col = mix(counter, col, smoothstep(0.32, 0.5, uv.y));
  let frag = vec2f(v.pos.x, u.screen.y - v.pos.y);
  return vec4f(outColor(col, frag), 1.0);
}

struct GridOut {
  @builtin(position) pos: vec4f,
  @location(0) world: vec3f,
  @location(1) normal: vec3f,
  @location(2) sim: vec2f,
  @location(3) h: f32,
  @location(4) @interpolate(flat) side: i32,
  @location(5) @interpolate(flat) cavity: i32,
};
@vertex fn plateVS(@builtin(vertex_index) id: u32) -> GridOut {
  let c = cellOf(id);
  let p = (vec2f(c) + 0.5) * CELL;
  let z = moldAt(c);
  let dx = moldAt(c + vec2i(1, 0)) - moldAt(c - vec2i(1, 0));
  let dy = moldAt(c + vec2i(0, 1)) - moldAt(c - vec2i(0, 1));
  let n = normalize(vec3f(-dx, -dy, 2.0 * CELL));
  let world = toWorld(vec3f(p, z));
  return GridOut(u.viewProj * vec4f(world, 1.0), world, toWorld(n), p, z, 0, -1);
}
@fragment fn plateFS(v: GridOut) -> @location(0) vec4f {
  let uvField = v.sim / vec2f(f32(W) * CELL, f32(H) * CELL);
  let b = textureSampleLevel(fieldBTex, linearSampler, uvField, 0.0);
  let grain = fbm(v.sim * 0.35);
  let pits = smoothstep(0.62, 0.8, vnoise(v.sim * 1.7));
  var iron = mix(vec3f(0.045, 0.042, 0.04), vec3f(0.085, 0.075, 0.068), grain) * (1.0 - 0.25 * pits);
  let oil = clamp(b.b, 0.0, 1.0);
  iron = mix(iron, iron * vec3f(1.15, 1.0, 0.7) + vec3f(0.03, 0.02, 0.0), oil * 0.6);
  let rough = mix(0.62 - 0.2 * grain, 0.16, oil);
  let heat = clamp((b.r - 200.0) / 160.0, 0.0, 1.0);
  iron += vec3f(0.06, 0.03, 0.05) * heat * (0.5 + 0.5 * vnoise(v.sim * 0.2));
  let mold = v.h;
  let ao = 1.0 - 0.45 * smoothstep(-2.0, -14.0, mold) * (1.0 - smoothstep(-14.0, -12.0, mold) * 0.5);
  let n = normalize(v.normal + vec3f(grain - 0.5, 0.0, pits - 0.5) * 0.08);
  var col = shade(iron, n, v.world, rough, 0.85, 0.0, ao);
  let d = length(v.sim - u.cursor.xy);
  col += u.cursor.w * smoothstep(1.2, 0.0, abs(d - u.cursor.z)) * vec3f(1.0, 0.75, 0.35) * 0.9;
  return vec4f(outColor(col, vec2f(v.pos.x, u.screen.y - v.pos.y)), 1.0);
}
fn surf(c: vec2i, side: i32) -> f32 {
  if (side == 1) { return moldAt(c); }
  let cav = cavityOf((vec2f(c) + 0.5) * CELL);
  var fill = 0.0;
  if (cav >= 0) { if (u.filling[cav].w > 0.5) { fill = fieldB(c).a; } }
  return moldAt(c) + fieldA(c).r + fill;
}
@vertex fn batterVS(@builtin(vertex_index) id: u32, @builtin(instance_index) inst: u32) -> GridOut {
  let side = i32(inst);
  let c = cellOf(id);
  let p = (vec2f(c) + 0.5) * CELL;
  let h = fieldA(c).r;
  var z = surf(c, side);
  let dx = surf(c + vec2i(1, 0), side) - surf(c - vec2i(1, 0), side);
  let dy = surf(c + vec2i(0, 1), side) - surf(c - vec2i(0, 1), side);
  var n = normalize(vec3f(-dx, -dy, 2.0 * CELL));
  if (side == 1) { n = -n; z -= 0.05; } else { z += 0.04; }
  var s = vec3f(p, z);
  let cav = cavityOf(p);
  if (cav >= 0 && cav < 3) {
    let t = u.flips[cav];
    if (t > 0.0) { s = hinge(s, t); n = hingeN(n, t); }
  }
  let world = toWorld(s);
  return GridOut(u.viewProj * vec4f(world, 1.0), world, toWorld(n), p, h, side, cav);
}
@fragment fn batterFS(v: GridOut) -> @location(0) vec4f {
  if (v.h < 0.12) { discard; }
  let uvField = v.sim / vec2f(f32(W) * CELL, f32(H) * CELL);
  let a = textureSampleLevel(fieldATex, linearSampler, uvField, 0.0);
  let b = textureSampleLevel(fieldBTex, linearSampler, uvField, 0.0);
  let mott = fbm(v.sim * 0.55) - 0.5;
  let top = v.side == 0;
  let brown = select(a.b, a.g, top) + mott * 0.09;
  let pores = select(0.0, b.g * smoothstep(0.55, 0.85, vnoise(v.sim * 2.6)), top);
  var albedo = browning(max(0.0, brown));
  let wet = select(0.0, clamp(a.a, 0.0, 1.0), top);
  albedo = mix(albedo, vec3f(0.97, 0.9, 0.74), wet * (1.0 - smoothstep(0.1, 0.4, a.g)) * 0.6);
  albedo *= 1.0 - pores * 0.35;
  var rough = mix(0.72, 0.18, wet);
  rough = mix(rough, 0.45, smoothstep(0.5, 1.1, brown) * (1.0 - wet));
  if (top && v.cavity >= 0) {
    let fk = u.filling[v.cavity];
    if (fk.w > 0.5) {
      let f = smoothstep(0.25, 1.2, b.a);
      let fc = fk.rgb * (0.85 + 0.3 * vnoise(v.sim * 3.0));
      albedo = mix(albedo, fc, f);
      rough = mix(rough, 0.22, f);
    }
  }
  let edge = smoothstep(0.12, 1.2, v.h);
  var col = shade(albedo, normalize(v.normal), v.world, rough, 0.0, 0.45, mix(0.65, 1.0, edge));
  col += albedo * vec3f(0.35, 0.18, 0.06) * wet * 0.25;
  return vec4f(outColor(col, vec2f(v.pos.x, u.screen.y - v.pos.y)), 1.0);
}

struct PartOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f, @location(1) info: vec4f };
@vertex fn particleVS(@builtin(vertex_index) vid: u32, @builtin(instance_index) inst: u32) -> PartOut {
  let corner = vid % 6u;
  var q = vec2f(select(-1.0, 1.0, corner == 1u || corner == 2u || corner == 4u), select(-1.0, 1.0, corner >= 2u && corner <= 4u));
  if (corner == 5u) { q = vec2f(-1.0, 1.0); }
  let pt = particles[inst];
  let world = vec3f(pt.pos.x, pt.pos.z, pt.pos.y);
  var size = pt.pos.w;
  if (pt.info.y < 0.5) { size = pt.pos.w * (1.0 + (1.0 - pt.info.x) * 1.6); }
  var clip = u.viewProj * vec4f(world, 1.0);
  clip = vec4f(clip.xy + q * size * vec2f(3.12 * u.screen.y / u.screen.x, 3.12), clip.zw);
  return PartOut(clip, q, pt.info);
}
@fragment fn particleFS(v: PartOut) -> @location(0) vec4f {
  let r = dot(v.uv, v.uv);
  if (r > 1.0) { discard; }
  if (v.info.y < 0.5) {
    let soft = (1.0 - r) * (1.0 - r);
    let n = 0.7 + 0.3 * vnoise(v.uv * 2.0 + v.info.w * 40.0 + u.eyeTime.w * 0.4);
    let alpha = soft * v.info.z * n * 0.28 * smoothstep(0.0, 0.25, v.info.x);
    return vec4f(vec3f(0.95, 0.92, 0.88) * alpha, alpha);
  }
  let n = vec3f(v.uv, sqrt(1.0 - r));
  let l = max(dot(n, normalize(vec3f(-0.4, 0.6, 0.7))), 0.0);
  let c = vec3f(0.96, 0.88, 0.7) * (0.35 + 0.9 * l) + pow(l, 24.0) * 0.6;
  return vec4f(outColor(c, vec2f(v.pos.x, u.screen.y - v.pos.y)), 1.0);
}
`;
