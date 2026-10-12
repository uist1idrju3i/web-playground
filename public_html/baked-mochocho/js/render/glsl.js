// GLSL ES 3.00 shaders for the WebGL2 backend. The WGSL backend mirrors this file.
const common = /* glsl */ `#version 300 es
precision highp float;
precision highp int;
layout(std140) uniform Frame {
  mat4 uViewProj;
  vec4 uEyeTime;
  vec4 uFlips;
  vec4 uCursor;
  vec4 uFilling[6];
  vec4 uScreen;
  vec4 uExtra;
};
const int W = 176;
const int H = 112;
const int B = 10;
const float CELL = 1.5;
const float PI = 3.14159265;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) {
  vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) { float s = 0.0; float a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p *= 2.03; a *= 0.5; } return s; }
// Filmic tone curve: Krzysztof Narkowicz's published ACES fit (a numeric approximation).
vec3 aces(vec3 x) { return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0); }
vec3 outColor(vec3 hdr, vec2 frag) {
  vec2 uv = frag / uScreen.xy;
  float vig = 1.0 - 0.35 * dot(uv - 0.5, uv - 0.5) * 2.2;
  return pow(aces(hdr * vig * 1.05), vec3(1.0 / 2.2));
}
`;

const grid = /* glsl */ `
uniform highp sampler2D uFieldA;
uniform highp sampler2D uFieldB;
uniform highp sampler2D uMold;
bool inside(ivec2 c) { return c.x >= 0 && c.y >= 0 && c.x < W && c.y < H; }
float moldAt(ivec2 c) {
  ivec2 cc = clamp(c, ivec2(0), ivec2(W - 1, H - 1));
  ivec2 d = max(max(-c, c - ivec2(W - 1, H - 1)), ivec2(0));
  float o = float(max(d.x, d.y));
  return o <= 0.0 ? texelFetch(uMold, cc, 0).r : -min(16.0, o * o * 1.6);
}
vec4 fieldA(ivec2 c) { return inside(c) ? texelFetch(uFieldA, c, 0) : vec4(0.0); }
vec4 fieldB(ivec2 c) { return inside(c) ? texelFetch(uFieldB, c, 0) : vec4(0.0); }
int cavityOf(vec2 p) {
  int col = int(clamp(floor(p.x / 88.0), 0.0, 2.0));
  int row = p.y < 84.0 ? 0 : 1;
  vec2 center = vec2(42.0 + 90.0 * float(col), 42.0 + 84.0 * float(row));
  return length(p - center) <= 38.0 ? row * 3 + col : -1;
}
vec3 hinge(vec3 p, float t) {
  float s = sin(t); float co = cos(t); float dy = p.y - 84.0;
  vec3 r = vec3(p.x, 84.0 + dy * co + p.z * s, -dy * s + p.z * co);
  r.z -= 14.0 * smoothstep(0.55 * PI, PI, t);
  return r;
}
vec3 hingeN(vec3 n, float t) { float s = sin(t); float co = cos(t); return vec3(n.x, n.y * co + n.z * s, -n.y * s + n.z * co); }
vec3 toWorld(vec3 s) { return vec3(s.x, s.z, s.y); }
`;

const lighting = /* glsl */ `
const vec3 KEY_DIR = normalize(vec3(-0.45, 0.82, 0.35));
const vec3 KEY = vec3(3.1, 2.55, 2.0);
const vec3 RIM_DIR = normalize(vec3(0.6, 0.45, -0.66));
const vec3 RIM = vec3(0.9, 0.7, 0.5);
vec3 envColor(vec3 r) {
  float up = clamp(r.y, -1.0, 1.0);
  vec3 sky = mix(vec3(0.05, 0.035, 0.03), vec3(0.32, 0.2, 0.12), smoothstep(-0.1, 0.8, up));
  float lanterns = smoothstep(0.72, 0.98, vnoise(vec2(atan(r.x, r.z) * 6.0, up * 3.0))) * smoothstep(0.05, 0.4, up);
  return sky + lanterns * vec3(2.2, 0.9, 0.35);
}
vec3 shade(vec3 albedo, vec3 n, vec3 p, float rough, float metal, float wrap, float ao) {
  vec3 v = normalize(uEyeTime.xyz - p);
  vec3 f0 = mix(vec3(0.04), albedo, metal);
  vec3 col = vec3(0.0);
  for (int i = 0; i < 2; i++) {
    vec3 l = i == 0 ? KEY_DIR : RIM_DIR;
    vec3 lc = i == 0 ? KEY : RIM;
    vec3 h = normalize(l + v);
    float ndl = max((dot(n, l) + wrap) / (1.0 + wrap), 0.0);
    float ndh = max(dot(n, h), 0.0);
    float a = rough * rough; float a2 = a * a;
    float d = a2 / (PI * pow(ndh * ndh * (a2 - 1.0) + 1.0, 2.0));
    vec3 f = f0 + (1.0 - f0) * pow(1.0 - max(dot(h, v), 0.0), 5.0);
    float g = 0.25 / max(0.1, max(dot(n, l), 0.0) * max(dot(n, v), 0.0) + 0.1);
    col += lc * (albedo * (1.0 - metal) / PI * ndl + d * f * g * max(dot(n, l), 0.0));
  }
  vec3 r = reflect(-v, n);
  vec3 fr = f0 + (1.0 - f0) * pow(1.0 - max(dot(n, v), 0.0), 5.0);
  col += envColor(r) * fr * (1.0 - rough * 0.85);
  col += albedo * (1.0 - metal) * mix(vec3(0.05, 0.035, 0.03), vec3(0.16, 0.11, 0.08), n.y * 0.5 + 0.5);
  return col * ao;
}
vec3 browning(float b) {
  vec3 c0 = vec3(0.96, 0.88, 0.7);
  vec3 c1 = vec3(0.93, 0.73, 0.43);
  vec3 c2 = vec3(0.78, 0.47, 0.19);
  vec3 c3 = vec3(0.5, 0.25, 0.08);
  vec3 c4 = vec3(0.14, 0.07, 0.035);
  if (b < 0.3) return mix(c0, c1, b / 0.3);
  if (b < 0.62) return mix(c1, c2, (b - 0.3) / 0.32);
  if (b < 0.95) return mix(c2, c3, (b - 0.62) / 0.33);
  return mix(c3, c4, clamp((b - 0.95) / 0.35, 0.0, 1.0));
}
`;

export const backgroundVS = `${common}
out vec2 vUv;
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  vUv = p;
  gl_Position = vec4(p * 2.0 - 1.0, 0.9999, 1.0);
}`;

export const backgroundFS = `${common}
in vec2 vUv;
out vec4 frag;
void main() {
  vec2 uv = vUv;
  float aspect = uScreen.x / uScreen.y;
  vec3 col = mix(vec3(0.03, 0.02, 0.018), vec3(0.11, 0.065, 0.04), uv.y);
  for (int i = 0; i < 14; i++) {
    float fi = float(i);
    vec2 c = vec2(hash(vec2(fi, 3.1)), 0.62 + 0.38 * hash(vec2(fi, 7.7)));
    float r = 0.04 + 0.08 * hash(vec2(fi, 1.3));
    float flicker = uScreen.z > 0.5 ? 1.0 : 0.85 + 0.15 * sin(uEyeTime.w * (1.0 + fi * 0.37) + fi);
    vec2 d = (uv - c) * vec2(aspect, 1.0);
    float disk = smoothstep(r, r * 0.6, length(d));
    vec3 tint = mix(vec3(1.0, 0.42, 0.12), vec3(1.0, 0.75, 0.35), hash(vec2(fi, 9.2)));
    col += disk * tint * 0.35 * flicker;
  }
  float wood = fbm(vec2(uv.x * 3.0, uv.y * 40.0)) * 0.5 + 0.5;
  vec3 counter = mix(vec3(0.16, 0.085, 0.045), vec3(0.3, 0.17, 0.09), wood) * (0.4 + 0.6 * (1.0 - uv.y));
  col = mix(counter, col, smoothstep(0.32, 0.5, uv.y));
  frag = vec4(outColor(col, gl_FragCoord.xy), 1.0);
}`;

export const plateVS = `${common}${grid}
out vec3 vWorld;
out vec3 vNormal;
out vec2 vSim;
out float vMold;
void main() {
  int cols = W + 2 * B;
  ivec2 c = ivec2(gl_VertexID % cols - B, gl_VertexID / cols - B);
  vec2 p = (vec2(c) + 0.5) * CELL;
  float z = moldAt(c);
  float dx = moldAt(c + ivec2(1, 0)) - moldAt(c - ivec2(1, 0));
  float dy = moldAt(c + ivec2(0, 1)) - moldAt(c - ivec2(0, 1));
  vec3 n = normalize(vec3(-dx, -dy, 2.0 * CELL));
  vSim = p;
  vMold = z;
  vWorld = toWorld(vec3(p, z));
  vNormal = toWorld(n);
  gl_Position = uViewProj * vec4(vWorld, 1.0);
}`;

export const plateFS = `${common}${grid}${lighting}
in vec3 vWorld;
in vec3 vNormal;
in vec2 vSim;
in float vMold;
out vec4 frag;
void main() {
  vec2 uvField = vSim / vec2(float(W) * CELL, float(H) * CELL);
  vec4 b = texture(uFieldB, uvField);
  float grain = fbm(vSim * 0.35);
  float pits = smoothstep(0.62, 0.8, vnoise(vSim * 1.7));
  vec3 iron = mix(vec3(0.045, 0.042, 0.04), vec3(0.085, 0.075, 0.068), grain) * (1.0 - 0.25 * pits);
  float oil = clamp(b.b, 0.0, 1.0);
  iron = mix(iron, iron * vec3(1.15, 1.0, 0.7) + vec3(0.03, 0.02, 0.0), oil * 0.6);
  float rough = mix(0.62 - 0.2 * grain, 0.16, oil);
  float heat = clamp((b.r - 200.0) / 160.0, 0.0, 1.0);
  iron += vec3(0.06, 0.03, 0.05) * heat * (0.5 + 0.5 * vnoise(vSim * 0.2));
  float ao = 1.0 - 0.45 * smoothstep(-2.0, -14.0, vMold) * (1.0 - smoothstep(-14.0, -12.0, vMold) * 0.5);
  vec3 n = normalize(vNormal + vec3(grain - 0.5, 0.0, pits - 0.5) * 0.08);
  vec3 col = shade(iron, n, vWorld, rough, 0.85, 0.0, ao);
  float d = length(vSim - uCursor.xy);
  float ring = uCursor.w * smoothstep(1.2, 0.0, abs(d - uCursor.z)) ;
  col += ring * vec3(1.0, 0.75, 0.35) * 0.9;
  frag = vec4(outColor(col, gl_FragCoord.xy), 1.0);
}`;

export const batterVS = `${common}${grid}
out vec3 vWorld;
out vec3 vNormal;
out vec2 vSim;
out float vH;
flat out int vSide;
flat out int vCavity;
float surf(ivec2 c, int side) {
  float h = fieldA(c).r;
  if (side == 1) return moldAt(c) + min(h, 0.2) * 0.0;
  int cav = cavityOf((vec2(c) + 0.5) * CELL);
  float fill = cav >= 0 && uFilling[cav].w > 0.5 ? fieldB(c).a : 0.0;
  return moldAt(c) + h + fill;
}
void main() {
  int cols = W + 2 * B;
  int side = gl_InstanceID;
  ivec2 c = ivec2(gl_VertexID % cols - B, gl_VertexID / cols - B);
  vec2 p = (vec2(c) + 0.5) * CELL;
  float h = fieldA(c).r;
  float z = surf(c, side);
  float dx = surf(c + ivec2(1, 0), side) - surf(c - ivec2(1, 0), side);
  float dy = surf(c + ivec2(0, 1), side) - surf(c - ivec2(0, 1), side);
  vec3 n = normalize(vec3(-dx, -dy, 2.0 * CELL));
  if (side == 1) { n = -n; z -= 0.05; }
  vec3 s = vec3(p, z + (side == 0 ? 0.04 : 0.0));
  int cav = cavityOf(p);
  if (cav >= 0 && cav < 3 && uFlips[cav] > 0.0) {
    s = hinge(s, uFlips[cav]);
    n = hingeN(n, uFlips[cav]);
  }
  vSim = p;
  vH = h;
  vSide = side;
  vCavity = cav;
  vWorld = toWorld(s);
  vNormal = toWorld(n);
  gl_Position = uViewProj * vec4(vWorld, 1.0);
}`;

export const batterFS = `${common}${grid}${lighting}
in vec3 vWorld;
in vec3 vNormal;
in vec2 vSim;
in float vH;
flat in int vSide;
flat in int vCavity;
out vec4 frag;
void main() {
  if (vH < 0.12) discard;
  vec2 uvField = vSim / vec2(float(W) * CELL, float(H) * CELL);
  vec4 a = texture(uFieldA, uvField);
  vec4 b = texture(uFieldB, uvField);
  float mott = fbm(vSim * 0.55) - 0.5;
  float brown = (vSide == 0 ? a.g : a.b) + mott * 0.09;
  float pores = vSide == 0 ? b.g * smoothstep(0.55, 0.85, vnoise(vSim * 2.6)) : 0.0;
  vec3 albedo = browning(max(0.0, brown));
  float wet = vSide == 0 ? clamp(a.a, 0.0, 1.0) : 0.0;
  albedo = mix(albedo, vec3(0.97, 0.9, 0.74), wet * (1.0 - smoothstep(0.1, 0.4, a.g)) * 0.6);
  albedo *= 1.0 - pores * 0.35;
  float rough = mix(0.72, 0.18, wet);
  rough = mix(rough, 0.45, smoothstep(0.5, 1.1, brown) * (1.0 - wet));
  if (vSide == 0 && vCavity >= 0 && uFilling[vCavity].w > 0.5) {
    float f = smoothstep(0.25, 1.2, b.a);
    vec3 fc = uFilling[vCavity].rgb * (0.85 + 0.3 * vnoise(vSim * 3.0));
    albedo = mix(albedo, fc, f);
    rough = mix(rough, 0.22, f);
  }
  float edge = smoothstep(0.12, 1.2, vH);
  vec3 n = normalize(vNormal);
  float aoMix = mix(0.65, 1.0, edge);
  vec3 col = shade(albedo, n, vWorld, rough, 0.0, 0.45, aoMix);
  // Angel's ring: the pale band on the cake's side between the browned faces.
  float band = (1.0 - abs(n.y)) * smoothstep(0.18, 0.42, brown) * (1.0 - smoothstep(0.42, 0.8, brown));
  col = mix(col, vec3(0.98, 0.94, 0.8) * aoMix, band * 0.6);
  col += albedo * vec3(0.35, 0.18, 0.06) * wet * 0.25;
  // Fake subsurface: warm light bleeding through the thin edges.
  vec3 vv = normalize(uEyeTime.xyz - vWorld);
  col += albedo * KEY * 0.05 * pow(max(dot(n, KEY_DIR), 0.0), 2.0) * pow(1.0 - max(dot(n, vv), 0.0), 3.0);
  frag = vec4(outColor(col, gl_FragCoord.xy), 1.0);
}`;

export const particleVS = `${common}
layout(location = 0) in vec4 aPos;
layout(location = 1) in vec4 aInfo;
out vec2 vUv;
out vec4 vInfo;
void main() {
  int corner = gl_VertexID % 6;
  vec2 q = vec2(corner == 1 || corner == 2 || corner == 4 ? 1.0 : -1.0, corner >= 2 && corner <= 4 ? 1.0 : -1.0);
  if (corner == 5) q = vec2(-1.0, 1.0);
  vec3 world = vec3(aPos.x, aPos.z, aPos.y);
  float kind = aInfo.y;
  float size = kind < 0.5 ? aPos.w * (1.0 + (1.0 - aInfo.x) * 1.6) : aPos.w;
  vec4 clip = uViewProj * vec4(world, 1.0);
  clip.xy += q * size * vec2(3.12 * uScreen.y / uScreen.x, 3.12);
  vUv = q;
  vInfo = aInfo;
  gl_Position = clip;
}`;

export const particleFS = `${common}
in vec2 vUv;
in vec4 vInfo;
out vec4 frag;
void main() {
  float r = dot(vUv, vUv);
  if (r > 1.0) discard;
  if (vInfo.y < 0.5) {
    float soft = (1.0 - r) * (1.0 - r);
    float n = 0.7 + 0.3 * vnoise(vUv * 2.0 + vInfo.w * 40.0 + uEyeTime.w * 0.4);
    // Steam brightens to smoke when the batch is burning (uExtra.x).
    float burn = clamp(uExtra.x, 0.0, 1.0);
    vec3 steamCol = mix(vec3(0.95, 0.92, 0.88), vec3(0.2, 0.16, 0.14), burn);
    float alpha = soft * vInfo.z * n * (0.28 + 0.22 * burn) * smoothstep(0.0, 0.25, vInfo.x);
    frag = vec4(steamCol * alpha, alpha);
  } else {
    vec3 n = vec3(vUv, sqrt(1.0 - r));
    float l = max(dot(n, normalize(vec3(-0.4, 0.6, 0.7))), 0.0);
    vec3 c = vec3(0.96, 0.88, 0.7) * (0.35 + 0.9 * l) + pow(l, 24.0) * 0.6;
    frag = vec4(outColor(c, gl_FragCoord.xy), 1.0);
  }
}`;
