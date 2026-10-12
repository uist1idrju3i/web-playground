// GLSL sources for the WebGL2 backend. One instanced quad program covers
// spark streaks, the ball glow and the cord by way of a `kind` vertex attr;
// a fullscreen triangle paints the background.

export const BG_VS = `#version 300 es
layout(location=0) in vec2 aPos;
out vec2 vUv;
void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.,1.); }`;

export const BG_FS = `#version 300 es
precision highp float;
in vec2 vUv; out vec4 frag;
uniform vec2 uRes; uniform float uGlow; uniform float uTime; uniform vec2 uBall;
uniform vec2 uScale; uniform vec2 uCam;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
void main(){
  vec2 w = vec2((vUv.x*2.-1.)/uScale.x + uCam.x, (vUv.y*2.-1.)/uScale.y + uCam.y);
  // Deep indigo night with a cool zenith and a faint warm floor.
  float v = clamp(-w.y/420.+0.35, 0., 1.);
  vec3 col = mix(vec3(0.012,0.010,0.030), vec3(0.028,0.022,0.070), pow(1.-v,1.5));
  col += vec3(0.06,0.028,0.006) * smoothstep(-280.,-340.,w.y); // ground warmth
  // Subtle film grain keeps gradients banding-free.
  col += (hash(vUv*uRes+uTime)-0.5)*0.012;
  // Warm ambience the ball throws on its surroundings.
  float d = distance(w, uBall);
  col += vec3(1.0,0.45,0.12) * uGlow * 900.0 / (900.0 + d*d);
  frag = vec4(col, 1.);
}`;

export const STREAK_VS = `#version 300 es
layout(location=0) in vec2 aQuad;          // (along:-1..1, across:-1..1)
layout(location=1) in vec2 aPos;
layout(location=2) in vec2 aDir;
layout(location=3) in vec2 aLenW;          // len, width
layout(location=4) in vec2 aHeatGen;       // heat, gen+z
uniform vec2 uScale; uniform vec2 uCam;
out vec2 vQ; out float vHeat; out float vGen;
void main(){
  vec2 t = aDir; vec2 nrm = vec2(-t.y, t.x);
  vec2 w = aPos + t*(aQuad.x*aLenW.x*0.5) + nrm*(aQuad.y*aLenW.y*0.5);
  vQ = aQuad; vHeat = aHeatGen.x; vGen = aHeatGen.y;
  gl_Position = vec4((w-uCam)*uScale, 0., 1.);
}`;

// Streak fragment: hot core with a soft halo, blackbody-ish ramp by heat.
export const STREAK_FS = `#version 300 es
precision highp float;
in vec2 vQ; in float vHeat; in float vGen;
out vec4 frag;
vec3 blackbody(float h){
  vec3 c = mix(vec3(0.30,0.05,0.01), vec3(1.0,0.42,0.05), clamp(h*1.3,0.,1.));
  return mix(c, vec3(1.0,0.90,0.62), smoothstep(0.6,1.0,h));
}
void main(){
  float along = vQ.x;
  float across = abs(vQ.y);
  // core: bright centre of the streak; halo: broader falloff
  float core = smoothstep(1.0, 0.0, across) * smoothstep(1.0, 0.6, abs(along));
  float halo = exp(-across*across*3.0) * exp(-along*along*1.2);
  float a = (core*2.2 + halo*0.85) * clamp(vHeat*1.4, 0., 1.);
  vec3 col = blackbody(vHeat) * a;
  frag = vec4(col, a);
}`;

export const GLOW_VS = `#version 300 es
layout(location=0) in vec2 aQuad;
uniform vec2 uScale; uniform vec2 uCam; uniform vec3 uBallR; // x,y,r
out vec2 vQ;
void main(){
  vQ = aQuad;
  vec2 w = uBallR.xy + aQuad*uBallR.z;
  gl_Position = vec4((w-uCam)*uScale, 0., 1.);
}`;

export const GLOW_FS = `#version 300 es
precision highp float;
in vec2 vQ; uniform float uHeat; uniform float uSwell;
out vec4 frag;
void main(){
  float r = length(vQ);
  float core = smoothstep(0.55,0.12,r);
  float halo = exp(-r*r*2.6);
  vec3 col = mix(vec3(0.12,0.015,0.0), vec3(1.0,0.30,0.03), clamp(uHeat,0.,1.));
  col = mix(col, vec3(1.0,0.75,0.38), core*smoothstep(0.3,0.95,uHeat));
  float a = (core*0.9 + halo*0.30) * clamp(uHeat*1.4,0.,1.);
  // Swelling shimmer: slight flicker tied to pressure.
  a *= 0.85 + 0.15*sin(uSwell*40.0);
  frag = vec4(col*a, a);
}`;

export const CORD_VS = `#version 300 es
layout(location=0) in vec2 aQuad;      // (t:-0..0 | side:-1..1)
uniform vec2 uScale; uniform vec2 uCam; uniform vec4 uLine; // x1,y1,x2,y2
uniform float uW;
out float vT;
void main(){
  float tt = aQuad.x*0.5+0.5;
  vT = tt;
  vec2 a = uLine.xy, b = uLine.zw;
  vec2 t = normalize(b-a); vec2 n = vec2(-t.y,t.x);
  vec2 w = mix(a,b,tt) + n*(aQuad.y*uW);
  gl_Position = vec4((w-uCam)*uScale, 0., 1.);
}`;

export const CORD_FS = `#version 300 es
precision highp float;
in float vT; uniform float uLit;
out vec4 frag;
void main(){
  vec3 col = mix(vec3(0.16,0.14,0.12), vec3(0.9,0.55,0.2), uLit*smoothstep(0.6,1.0,vT));
  frag = vec4(col, 1.0);
}`;
