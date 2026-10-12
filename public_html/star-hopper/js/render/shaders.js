// GLSL ES 3.00 sources for the WebGL2 renderer. The sky gradient doubles as
// the fog color so islands melt into the horizon.

export const SUN_DIR = [0.55, 0.28, -0.79]; // toward the low evening sun
export const SKY_TOP = [0.19, 0.12, 0.34]; // violet dusk zenith
export const SKY_MID = [0.55, 0.28, 0.46]; // pink band
export const SKY_HORIZON = [0.98, 0.55, 0.28]; // warm orange horizon
export const FOG_COLOR = [0.82, 0.47, 0.4];

export const SKY_VERT = `#version 300 es
layout(location=0) in vec2 a_pos;
out vec2 v_uv;
void main() {
  v_uv = a_pos * 0.5 + 0.5;
  gl_Position = vec4(a_pos, 0.9999, 1.0);
}`;

export const SKY_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform vec3 u_fwd;
uniform vec3 u_right;
uniform vec3 u_up;
uniform float u_tanFov;
uniform float u_aspect;
uniform vec3 u_sun;
uniform float u_time;
uniform vec3 u_top;
uniform vec3 u_mid;
uniform vec3 u_horizon;
out vec4 outColor;

float hash(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(vec3(i, 1.0));
  float b = hash(vec3(i + vec2(1.0, 0.0), 1.0));
  float c = hash(vec3(i + vec2(0.0, 1.0), 1.0));
  float d = hash(vec3(i + vec2(1.0, 1.0), 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.55;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.13 + vec2(31.7, 11.3);
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 ndc = (v_uv - 0.5) * 2.0;
  vec3 dir = normalize(u_fwd + u_right * (ndc.x * u_tanFov * u_aspect) + u_up * (ndc.y * u_tanFov));

  float h = clamp(dir.y, -1.0, 1.0);
  vec3 sky = mix(u_horizon, u_mid, smoothstep(-0.02, 0.28, h));
  sky = mix(sky, u_top, smoothstep(0.18, 0.75, h));
  // Below the horizon: deep dusk haze.
  sky = mix(vec3(0.24, 0.12, 0.3), sky, smoothstep(-0.35, 0.0, h));

  float sunD = max(dot(dir, u_sun), 0.0);
  sky += vec3(1.0, 0.55, 0.25) * pow(sunD, 90.0) * 1.6; // sun disc
  sky += vec3(1.0, 0.45, 0.2) * pow(sunD, 7.0) * 0.45; // halo
  sky += vec3(1.0, 0.7, 0.4) * pow(sunD, 2.2) * 0.16; // broad glow

  // Stars fade in toward the zenith.
  float starMask = smoothstep(0.12, 0.6, h) * (1.0 - pow(sunD, 2.0));
  vec3 cell = floor(dir * 90.0);
  float star = step(0.996, hash(cell));
  float twinkle = 0.6 + 0.4 * sin(u_time * 2.5 + hash(cell + 7.0) * 40.0);
  sky += vec3(0.9, 0.9, 1.0) * star * twinkle * starMask * 0.9;

  // Slow cloud bands near the horizon.
  if (h > -0.05 && h < 0.5) {
    vec2 cp = dir.xz / max(dir.y + 0.28, 0.05);
    float clouds = fbm(cp * 0.9 + vec2(u_time * 0.008, 0.0));
    float band = smoothstep(0.55, 0.8, clouds) * (1.0 - smoothstep(0.05, 0.45, h));
    vec3 cloudCol = mix(vec3(1.0, 0.62, 0.45), vec3(0.45, 0.22, 0.42), smoothstep(0.0, 0.5, h));
    sky = mix(sky, cloudCol, band * 0.55);
  }

  outColor = vec4(sky, 1.0);
}`;

export const ISLAND_VERT = `#version 300 es
layout(location=0) in vec3 a_pos;      // unit-space vertex (radius=1 disc, depth=1 cone)
layout(location=1) in vec3 a_normal;
layout(location=2) in float a_part;    // 0 = grass top, 1 = rock
layout(location=3) in vec3 i_center;
layout(location=4) in vec4 i_shape;    // radius, thickness, tone, wobble
uniform mat4 u_vp;
uniform float u_time;
out vec3 v_normal;
out vec3 v_world;
out float v_part;
out float v_tone;
out float v_dist;
void main() {
  // The underside sways gently while the top surface stays physics-stable.
  float sway = max(0.0, -a_pos.y);
  float bob = sin(u_time * 0.9 + i_shape.w * 6.2831) * 0.35 * sway;
  // Grass part keeps its authored height; only the rock cone stretches.
  float ly = a_part < 0.5 ? a_pos.y : a_pos.y * i_shape.y;
  vec3 local = vec3(a_pos.x * i_shape.x, ly + bob, a_pos.z * i_shape.x);
  vec3 world = local + i_center;
  v_normal = normalize(vec3(a_normal.x / max(i_shape.x, 0.001), a_normal.y / max(i_shape.y, 0.001), a_normal.z / max(i_shape.x, 0.001)));
  v_world = world;
  v_part = a_part;
  v_tone = i_shape.z;
  vec4 clip = u_vp * vec4(world, 1.0);
  v_dist = clip.w;
  gl_Position = clip;
}`;

export const ISLAND_FRAG = `#version 300 es
precision highp float;
in vec3 v_normal;
in vec3 v_world;
in float v_part;
in float v_tone;
in float v_dist;
uniform vec3 u_sun;
uniform vec3 u_fog;
uniform vec3 u_cam;
uniform float u_time;
out vec4 outColor;

float hash3(vec3 p) {
  p = fract(p * 0.3183099 + vec3(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

void main() {
  vec3 n = normalize(v_normal);
  float diff = max(dot(n, u_sun), 0.0);
  vec3 viewDir = normalize(u_cam - v_world);
  float rim = pow(1.0 - max(dot(n, viewDir), 0.0), 3.0);

  vec3 albedo;
  if (v_part < 0.5) {
    // Meadow top: hue drifts with the island tone.
    vec3 g1 = mix(vec3(0.35, 0.75, 0.42), vec3(0.55, 0.82, 0.3), v_tone);
    vec3 g2 = mix(vec3(0.2, 0.55, 0.35), vec3(0.38, 0.6, 0.26), v_tone);
    float checker = step(0.5, fract(v_world.x * 0.7) + fract(v_world.z * 0.7) * 0.5);
    float grass = hash3(floor(v_world * 6.0)) * 0.35;
    albedo = mix(g2, g1, 0.5 + grass) - checker * 0.04;
  } else {
    // Warm rock with strata bands.
    float strata = 0.5 + 0.5 * sin(v_world.y * 3.5 + v_tone * 6.0);
    vec3 r1 = mix(vec3(0.45, 0.3, 0.28), vec3(0.55, 0.35, 0.32), v_tone);
    vec3 r2 = mix(vec3(0.3, 0.2, 0.26), vec3(0.38, 0.24, 0.3), v_tone);
    albedo = mix(r2, r1, strata) + hash3(floor(v_world * 4.0)) * 0.05;
  }

  vec3 col = albedo * (0.35 + 0.75 * diff);
  col += vec3(1.0, 0.5, 0.3) * rim * 0.35 * max(u_sun.y + 0.4, 0.0);
  // Sunset ambient from below.
  col += vec3(0.9, 0.45, 0.35) * max(-n.y, 0.0) * 0.12;

  float fogF = 1.0 - exp(-v_dist * 0.012);
  col = mix(col, u_fog, fogF * 0.85);
  outColor = vec4(col, 1.0);
}`;

export const SHARD_VERT = `#version 300 es
layout(location=0) in vec3 a_pos;
layout(location=1) in vec3 i_pos;
layout(location=2) in vec4 i_state;    // taken, kind, phase, reserved
uniform mat4 u_vp;
uniform float u_time;
out vec3 v_color;
out float v_glow;
out float v_dist;
void main() {
  float taken = i_state.x;
  float kind = i_state.y;
  float base = kind > 0.5 ? 0.62 : 0.38;
  float scale = base * (1.0 - taken);
  float phase = i_state.z * 6.2831;
  // Spin + bob, then squash out when collected (burst covers the pickup).
  float ang = u_time * 1.8 + phase;
  float c = cos(ang);
  float s = sin(ang);
  vec3 p = a_pos * scale * (1.0 + 0.12 * sin(u_time * 3.0 + phase));
  vec3 rot = vec3(p.x * c - p.z * s, p.y + sin(u_time * 2.0 + phase) * 0.18, p.x * s + p.z * c);
  vec3 world = rot + i_pos;
  v_glow = 0.75 + 0.25 * sin(u_time * 4.0 + phase * 2.0);
  vec4 clip = u_vp * vec4(world, 1.0);
  v_dist = clip.w;
  v_color = kind > 0.5 ? vec3(0.85, 0.5, 1.0) : vec3(1.0, 0.85, 0.35);
  gl_Position = clip;
}`;

export const SHARD_FRAG = `#version 300 es
precision highp float;
in vec3 v_color;
in float v_glow;
in float v_dist;
uniform vec3 u_fog;
out vec4 outColor;
void main() {
  vec3 col = v_color * (0.9 + v_glow * 0.6);
  float fogF = 1.0 - exp(-v_dist * 0.012);
  col = mix(col, u_fog, fogF * 0.7);
  outColor = vec4(col, 1.0);
}`;

// Additive halo billboards behind shards.
export const HALO_VERT = `#version 300 es
layout(location=0) in vec2 a_corner;   // -1..1 quad corner
layout(location=1) in vec3 i_pos;
layout(location=2) in vec4 i_state;    // taken, kind, phase, reserved
uniform mat4 u_vp;
uniform float u_time;
uniform vec3 u_right;
uniform vec3 u_up;
out vec2 v_uv;
out vec4 v_col;
void main() {
  float taken = i_state.x;
  float kind = i_state.y;
  float phase = i_state.z * 6.2831;
  float base = kind > 0.5 ? 0.62 : 0.38;
  float scale = base * (1.0 - taken) * 2.6;
  float pulse = 0.85 + 0.3 * sin(u_time * 3.0 + phase);
  vec3 world = i_pos + (u_right * a_corner.x + u_up * a_corner.y) * scale * pulse;
  v_uv = a_corner;
  vec3 tint = kind > 0.5 ? vec3(0.8, 0.45, 1.0) : vec3(1.0, 0.8, 0.3);
  v_col = vec4(tint, 0.35 * (1.0 - taken));
  gl_Position = u_vp * vec4(world, 1.0);
}`;

export const HALO_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
in vec4 v_col;
out vec4 outColor;
void main() {
  float d = length(v_uv);
  float a = smoothstep(1.0, 0.0, d);
  outColor = vec4(v_col.rgb, v_col.a * a * a);
}`;

export const CLOUD_VERT = `#version 300 es
layout(location=0) in vec2 a_corner;
layout(location=1) in vec3 i_pos;
layout(location=2) in vec4 i_size;     // w, h, phase, alpha
uniform mat4 u_vp;
uniform vec3 u_right;
uniform vec3 u_up;
uniform float u_time;
out vec2 v_uv;
out float v_alpha;
out float v_phase;
void main() {
  vec3 drift = vec3(sin(u_time * 0.05 + i_size.z * 6.28) * 6.0, 0.0, cos(u_time * 0.04 + i_size.z * 6.28) * 4.0);
  vec3 world = i_pos + drift + (u_right * a_corner.x * i_size.x + u_up * a_corner.y * i_size.y);
  v_uv = a_corner;
  v_alpha = i_size.w;
  v_phase = i_size.z;
  gl_Position = u_vp * vec4(world, 1.0);
}`;

export const CLOUD_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
in float v_alpha;
in float v_phase;
uniform float u_time;
out vec4 outColor;
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
void main() {
  float d = length(v_uv);
  float n = noise(v_uv * 3.0 + v_phase * 20.0 + u_time * 0.05);
  float a = smoothstep(1.0, 0.15, d) * smoothstep(0.25, 0.75, n) * v_alpha;
  vec3 col = mix(vec3(1.0, 0.75, 0.6), vec3(0.85, 0.55, 0.65), v_phase);
  outColor = vec4(col, a);
}`;

export const PARTICLE_VERT = `#version 300 es
layout(location=0) in vec3 a_pos;
layout(location=1) in vec4 a_col;      // rgb, size
uniform mat4 u_vp;
uniform float u_pxScale;               // pixel ratio * half-height
out vec4 v_col;
void main() {
  vec4 clip = u_vp * vec4(a_pos, 1.0);
  gl_Position = clip;
  gl_PointSize = clamp(a_col.a * u_pxScale / max(clip.w, 0.1), 1.0, 64.0);
  v_col = vec4(a_col.rgb, 1.0);
}`;

export const PARTICLE_FRAG = `#version 300 es
precision highp float;
in vec4 v_col;
out vec4 outColor;
void main() {
  vec2 p = gl_PointCoord * 2.0 - 1.0;
  float d = dot(p, p);
  if (d > 1.0) discard;
  float a = 1.0 - d;
  outColor = vec4(v_col.rgb, a * 0.9);
}`;

// Soft blob shadow under the player, projected onto the island's top plane.
export const SHADOW_VERT = `#version 300 es
layout(location=0) in vec2 a_corner;
uniform mat4 u_vp;
uniform vec3 u_center;
uniform vec2 u_scale;                  // xz radius
out vec2 v_uv;
void main() {
  v_uv = a_corner;
  vec3 world = u_center + vec3(a_corner.x * u_scale.x, 0.0, a_corner.y * u_scale.y);
  gl_Position = u_vp * vec4(world, 1.0);
}`;

export const SHADOW_FRAG = `#version 300 es
precision highp float;
in vec2 v_uv;
uniform float u_alpha;
out vec4 outColor;
void main() {
  float a = u_alpha * max(0.0, 1.0 - dot(v_uv, v_uv));
  outColor = vec4(0.1, 0.05, 0.15, a);
}`;
