// WebGL2 renderer: procedural dawn sky, Mt. Fuji + torii pedestal, lacquered
// prefecture blocks with fake bevel, sakura/dust particles, and a bloom +
// vignette post chain. All imagery is generated in shaders/geometry — no
// image assets are used at all.
import { buildPieceMesh, outlineStrip, pieceColor } from './geometry.js';
import { WORLD } from './physics.js';

const VS_FULL = `#version 300 es
layout(location=0) in vec2 aPos;
out vec2 vUv;
void main(){ vUv = aPos*0.5+0.5; gl_Position = vec4(aPos,0.,1.); }
`;

const FS_SKY = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform float uTime;
uniform vec2 uRes;
uniform vec2 uCam;      // world-space camera centre
uniform float uWorldH;  // world units visible vertically
uniform vec2 uSun;      // sun position in sky uv
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1,0)),u.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),u.x),u.y);
}
float fbm(vec2 p){ float a=0.5,v=0.; for(int i=0;i<5;i++){ v+=a*noise(p); p*=2.03; a*=0.5;} return v; }
void main(){
  vec2 uv = vUv;
  // world-space y for parallax
  float wy = uv.y * uWorldH + uCam.y - uWorldH*0.5;
  float h = clamp(wy/ max(uWorldH,6.0)*0.5 + 0.5, 0.0, 1.0);
  // dawn gradient -> stratosphere -> space, rising with altitude (wy in km)
  vec3 horizon = mix(vec3(1.0,0.72,0.42), vec3(0.85,0.45,0.5), clamp(wy/300.,0.,1.));
  vec3 mid     = mix(vec3(0.45,0.35,0.60), vec3(0.18,0.22,0.5), clamp(wy/500.,0.,1.));
  vec3 zenith  = mix(vec3(0.10,0.14,0.33), vec3(0.008,0.012,0.05), clamp(wy/900.,0.,1.));
  vec3 col = mix(horizon, mid, smoothstep(0.0,0.45,h));
  col = mix(col, zenith, smoothstep(0.35,1.0,h));
  // stars fade in past ~120 km, dense by ~400 km
  float star = step(0.9985, hash(floor(uv*uRes/2.))) * smoothstep(120.,400.,wy);
  col += star * (0.6+0.4*sin(uTime*2.0+uv.x*50.));
  // sun: position rides up with the camera; halo thins out in space
  float atmosphere = smoothstep(600.,200.,wy);
  vec2 sun = uSun;
  vec2 d = (uv - sun) * vec2(uRes.x/uRes.y, 1.0);
  float sd = length(d);
  col += vec3(1.0,0.85,0.6) * (0.012/(sd+0.012));            // core glow
  col += vec3(1.0,0.6,0.35) * 0.35 * exp(-sd*3.0) * atmosphere; // halo
  // god rays: angular streaks from the sun (atmosphere only)
  float ang = atan(d.y, d.x);
  float rays = pow(abs(sin(ang*7.0 + fbm(vec2(ang*3.0,uTime*0.05))*2.0)), 24.0);
  col += vec3(1.0,0.75,0.45) * rays * 0.10 * exp(-sd*1.6) * atmosphere;
  // layered clouds drifting horizontally, thinning out by ~60 km
  float c1 = fbm(vec2(uv.x*3.0 + uTime*0.012 + wy*0.02, uv.y*5.0));
  float c2 = fbm(vec2(uv.x*6.0 - uTime*0.02, uv.y*9.0) + 7.3);
  float clouds = smoothstep(0.55,0.8,c1)*0.5 + smoothstep(0.6,0.85,c2)*0.3;
  vec3 cloudCol = mix(vec3(1.0,0.8,0.7), vec3(0.9,0.7,0.8), h);
  col = mix(col, cloudCol, clouds * smoothstep(60.,15.,wy) * 0.8);
  // distant haze band near the ground
  col += vec3(1.0,0.75,0.5) * 0.18 * exp(-abs(h-0.16)*14.0) * smoothstep(50.,10.,wy);
  o = vec4(col, 1.0);
}
`;

const VS_SHAPE = `#version 300 es
layout(location=0) in vec2 aPos;
layout(location=1) in vec3 aAux;   // bevel, nx, ny
uniform mat3 uCam;
uniform vec2 uPos;
uniform float uRot;
uniform float uScale;
out vec3 vAux;
out vec2 vLocal;
out vec2 vWorld;
void main(){
  float c = cos(uRot), s = sin(uRot);
  vec2 p = aPos * uScale;
  p = vec2(p.x*c - p.y*s, p.x*s + p.y*c) + uPos;
  vAux = aAux;
  vLocal = aPos;
  vWorld = p;
  gl_Position = vec4(uCam * vec3(p,1.0), 1.0);
}
`;

const FS_SHAPE = `#version 300 es
precision highp float;
in vec3 vAux;
in vec2 vLocal;
in vec2 vWorld;
out vec4 o;
uniform vec3 uMain;
uniform vec3 uEdge;
uniform float uGhost;   // 0 solid, 1 ghost preview
uniform float uAlpha;
uniform float uTime;
void main(){
  float bevel = vAux.x;
  float topLight = 0.5 + 0.5 * vAux.z;            // faces pointing up are lit
  vec3 col = uMain;
  // lacquer: darken at rim, brighten with top light, warm sheen band
  col *= 0.72 + 0.28 * smoothstep(1.0, 0.25, bevel);
  col += uMain * 0.35 * topLight * smoothstep(0.2,0.9,bevel);
  float sheen = exp(-pow((bevel - 0.62)*9.0, 2.0)) * (0.5+0.5*sin(vAux.z*3.0+1.2));
  col += vec3(1.0,0.9,0.75) * sheen * 0.16;
  // thin lacquer edge
  float rim = smoothstep(0.90, 0.985, bevel);
  col = mix(col, uEdge, rim*0.85);
  // subtle grain: two anisotropic bands
  float grain = sin(vLocal.x*23.0 + vLocal.y*7.0)*0.5+0.5;
  col *= 0.97 + 0.06*grain;
  float alpha = uAlpha;
  if (uGhost > 0.5) { col = mix(col, vec3(1.0), 0.45); alpha = 0.42 * uAlpha; }
  o = vec4(col, alpha);
}
`;

const FS_FLAT = `#version 300 es
precision highp float;
in vec3 vAux;
in vec2 vLocal;
in vec2 vWorld;
out vec4 o;
uniform vec3 uColor;
uniform float uAlpha;
void main(){ o = vec4(uColor, uAlpha); }
`;

const VS_PARTICLE = `#version 300 es
layout(location=0) in vec2 aQuad;
layout(location=1) in vec4 aInst0; // x,y,rot,scale
layout(location=2) in vec4 aInst1; // r,g,b,alpha
uniform mat3 uCam;
out vec2 vUv;
out vec4 vCol;
void main(){
  vUv = aQuad*0.5+0.5;
  float c = cos(aInst0.z), s = sin(aInst0.z);
  vec2 p = (aQuad * aInst0.w);
  p = vec2(p.x*c - p.y*s, p.x*s + p.y*c) + aInst0.xy;
  vCol = aInst1;
  gl_Position = vec4(uCam * vec3(p,1.0), 1.0);
}
`;

const FS_PARTICLE = `#version 300 es
precision highp float;
in vec2 vUv;
in vec4 vCol;
out vec4 o;
uniform float uKind; // 0 petal, 1 dust, 2 sparkle
void main(){
  vec2 d = vUv - 0.5;
  float a;
  if (uKind < 0.5) {
    // petal: rounded rect-ish with a notch
    float r = length(d*vec2(1.0,1.6));
    a = smoothstep(0.5,0.42,r) * step(0.05,length(d - vec2(0.0,0.32)));
  } else if (uKind < 1.5) {
    a = smoothstep(0.5,0.0,length(d)) * 0.7;
  } else {
    float r = length(d);
    a = (smoothstep(0.5,0.0,r) * 0.4) + pow(max(0.0,1.0-r*2.2),3.0);
  }
  o = vec4(vCol.rgb, vCol.a * a);
}
`;

const FS_BRIGHT = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uTex;
void main(){
  vec3 c = texture(uTex, vUv).rgb;
  float l = dot(c, vec3(0.299,0.587,0.114));
  o = vec4(c * smoothstep(0.72, 1.0, l), 1.0);
}
`;

const FS_BLUR = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uTex;
uniform vec2 uDir;
void main(){
  vec3 c = texture(uTex, vUv).rgb * 0.227;
  c += texture(uTex, vUv + uDir*1.384).rgb * 0.316;
  c += texture(uTex, vUv - uDir*1.384).rgb * 0.316;
  c += texture(uTex, vUv + uDir*3.230).rgb * 0.070;
  c += texture(uTex, vUv - uDir*3.230).rgb * 0.070;
  o = vec4(c, 1.0);
}
`;

const FS_COMPOSITE = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 o;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform float uTime;
uniform float uVignette;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
void main(){
  vec3 c = texture(uScene, vUv).rgb;
  c += texture(uBloom, vUv).rgb * 0.6;
  // gentle tonemap
  c = c / (c + vec3(0.55)) * 1.32;
  float d = distance(vUv, vec2(0.5));
  c *= 1.0 - uVignette * smoothstep(0.35, 0.85, d);
  c += (hash(vUv*913.0 + uTime) - 0.5) * 0.02; // film grain
  o = vec4(c, 1.0);
}
`;

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function compile(gl, type, src) {
  const s = gl.createShader(type);
  gl.shaderSource(s, src);
  gl.compileShader(s);
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    throw new Error(`shader: ${gl.getShaderInfoLog(s)}`);
  }
  return s;
}

function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(`link: ${gl.getProgramInfoLog(p)}`);
  }
  return p;
}

const MAX_PARTICLES = 700;

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    const gl = canvas.getContext('webgl2', {
      alpha: true,
      antialias: true,
      premultipliedAlpha: false,
      powerPreference: 'high-performance',
    });
    if (!gl) throw new Error('WebGL2 unavailable');
    this.gl = gl;
    this.cam = { x: 0, y: 160, h: 520, shake: 0, t: 0 };
    this.spaceActors = this._buildSpaceActors();
    this.meshes = new Map(); // code -> {vao,count,outlineVao,outlineCount}
    this.particles = [];
    this.time = 0;
    this.quality = 1;
    this.sun = [0.5, 0.42];
    this.webgpuSky = false; // when true the sky pass is skipped
    this._initPrograms();
    this._initBuffers();
  }

  _initPrograms() {
    const gl = this.gl;
    this.pSky = program(gl, VS_FULL, FS_SKY);
    this.pShape = program(gl, VS_SHAPE, FS_SHAPE);
    this.pFlat = program(gl, VS_SHAPE, FS_FLAT);
    this.pPart = program(gl, VS_PARTICLE, FS_PARTICLE);
    this.pBright = program(gl, VS_FULL, FS_BRIGHT);
    this.pBlur = program(gl, VS_FULL, FS_BLUR);
    this.pComp = program(gl, VS_FULL, FS_COMPOSITE);
    this.u = {
      sky: {
        t: gl.getUniformLocation(this.pSky, 'uTime'),
        res: gl.getUniformLocation(this.pSky, 'uRes'),
        cam: gl.getUniformLocation(this.pSky, 'uCam'),
        h: gl.getUniformLocation(this.pSky, 'uWorldH'),
        sun: gl.getUniformLocation(this.pSky, 'uSun'),
      },
      shape: {
        cam: gl.getUniformLocation(this.pShape, 'uCam'),
        pos: gl.getUniformLocation(this.pShape, 'uPos'),
        rot: gl.getUniformLocation(this.pShape, 'uRot'),
        scale: gl.getUniformLocation(this.pShape, 'uScale'),
        main: gl.getUniformLocation(this.pShape, 'uMain'),
        edge: gl.getUniformLocation(this.pShape, 'uEdge'),
        ghost: gl.getUniformLocation(this.pShape, 'uGhost'),
        alpha: gl.getUniformLocation(this.pShape, 'uAlpha'),
        time: gl.getUniformLocation(this.pShape, 'uTime'),
      },
      flat: {
        cam: gl.getUniformLocation(this.pFlat, 'uCam'),
        pos: gl.getUniformLocation(this.pFlat, 'uPos'),
        rot: gl.getUniformLocation(this.pFlat, 'uRot'),
        scale: gl.getUniformLocation(this.pFlat, 'uScale'),
        color: gl.getUniformLocation(this.pFlat, 'uColor'),
        alpha: gl.getUniformLocation(this.pFlat, 'uAlpha'),
      },
      part: {
        cam: gl.getUniformLocation(this.pPart, 'uCam'),
        kind: gl.getUniformLocation(this.pPart, 'uKind'),
      },
      comp: {
        t: gl.getUniformLocation(this.pComp, 'uTime'),
        vig: gl.getUniformLocation(this.pComp, 'uVignette'),
        scene: gl.getUniformLocation(this.pComp, 'uScene'),
        bloom: gl.getUniformLocation(this.pComp, 'uBloom'),
      },
      bright: { tex: gl.getUniformLocation(this.pBright, 'uTex') },
      blur: {
        tex: gl.getUniformLocation(this.pBlur, 'uTex'),
        dir: gl.getUniformLocation(this.pBlur, 'uDir'),
      },
    };
  }

  _initBuffers() {
    const gl = this.gl;
    // fullscreen triangle
    this.vaoFull = gl.createVertexArray();
    gl.bindVertexArray(this.vaoFull);
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    // particle instanced buffers
    this.vaoPart = gl.createVertexArray();
    gl.bindVertexArray(this.vaoPart);
    const qb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, qb);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, 1, 1, -1, -1, 1, 1, -1, 1]),
      gl.STATIC_DRAW,
    );
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.pb0 = gl.createBuffer();
    this.pb1 = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pb0);
    gl.bufferData(gl.ARRAY_BUFFER, MAX_PARTICLES * 16, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(1, 1);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.pb1);
    gl.bufferData(gl.ARRAY_BUFFER, MAX_PARTICLES * 16, gl.DYNAMIC_DRAW);
    gl.enableVertexAttribArray(2);
    gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 0, 0);
    gl.vertexAttribDivisor(2, 1);
    gl.bindVertexArray(null);
    // scenery geometry is rebuilt when needed
    this.scenery = this._buildScenery();
    this._initFbos();
  }

  _initFbos() {
    const gl = this.gl;
    const mk = (w, h) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, w, h);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      return { f, t, w, h };
    };
    this.fboScene = mk(this.canvas.width || 4, this.canvas.height || 4);
    this.fboA = mk(
      Math.max(2, (this.canvas.width || 4) >> 1),
      Math.max(2, (this.canvas.height || 4) >> 1),
    );
    this.fboB = mk(this.fboA.w, this.fboA.h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  resize() {
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    const w = Math.floor(this.canvas.clientWidth * dpr) || 1;
    const h = Math.floor(this.canvas.clientHeight * dpr) || 1;
    if (w === this.canvas.width && h === this.canvas.height) return;
    this.canvas.width = w;
    this.canvas.height = h;
    const gl = this.gl;
    const mk = (ww, hh) => {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, ww, hh);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      const f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      return { f, t, w: ww, h: hh };
    };
    for (const key of ['fboScene', 'fboA', 'fboB']) {
      gl.deleteFramebuffer(this[key].f);
      gl.deleteTexture(this[key].t);
    }
    this.fboScene = mk(w, h);
    this.fboA = mk(Math.max(2, w >> 1), Math.max(2, h >> 1));
    this.fboB = mk(this.fboA.w, this.fboA.h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // ----- meshes for pieces -----
  meshFor(piece) {
    let m = this.meshes.get(piece.code);
    if (m) return m;
    const gl = this.gl;
    const data = buildPieceMesh(piece);
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 20, 0);
    gl.enableVertexAttribArray(1);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 20, 8);
    const oVao = gl.createVertexArray();
    gl.bindVertexArray(oVao);
    const ob = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, ob);
    gl.bufferData(gl.ARRAY_BUFFER, outlineStrip(piece), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    const cols = pieceColor(piece);
    m = {
      vao,
      count: piece.tris.length,
      outlineVao: oVao,
      outlineCount: piece.poly.length + 1,
      main: hexToRgb(cols.main),
      edge: hexToRgb(cols.edge),
    };
    this.meshes.set(piece.code, m);
    return m;
  }

  _buildScenery() {
    // Flat colored geometry below/around the platform: stone pedestal,
    // torii gate, Mt. Fuji, and layered hills (all original procedural art).
    const gl = this.gl;
    const quads = [];
    const push = (x, y, w, h, rot, color, alpha = 1) =>
      quads.push({ verts: rectVerts(w, h), x, y, rot, color, alpha });
    const tri = (pts, color, alpha = 1) =>
      quads.push({ verts: new Float32Array(pts), x: 0, y: 0, rot: 0, color, alpha });

    // Decorative scenery scaled to the km world (~60x the old unit scale).
    const K = 60;
    const triK = (pts, color, alpha = 1) =>
      tri(
        pts.map((v) => v * K),
        color,
        alpha,
      );
    const pushK = (x, y, w, h, rot, color, alpha = 1) =>
      push(x * K, y * K, w * K, h * K, rot, color, alpha);

    // Mt. Fuji far left-behind: tall triangle + snow cap
    const fx = -5.2,
      fy = -0.4,
      fw = 9.5,
      fh = 6.4;
    triK([fx - fw / 2, fy, fx + fw / 2, fy, fx, fy + fh], [0.3, 0.34, 0.55], 1);
    triK(
      [fx - fw * 0.18, fy + fh * 0.66, fx + fw * 0.18, fy + fh * 0.66, fx, fy + fh],
      [0.93, 0.93, 0.97],
      1,
    );
    // hills
    triK([-8, -0.6, -2.4, -0.6, -5.0, 1.5], [0.23, 0.3, 0.44], 1);
    triK([2.0, -0.6, 9.0, -0.6, 6.0, 2.0], [0.26, 0.33, 0.48], 1);
    triK([-1.0, -0.6, 5.5, -0.6, 2.6, 1.1], [0.2, 0.27, 0.4], 1);

    // floating island under the platform
    triK([-3.1, -0.3, 3.1, -0.3, 0, -2.6], [0.36, 0.28, 0.24], 1);
    triK([-2.4, -0.3, 2.4, -0.3, -0.4, -1.9], [0.42, 0.33, 0.28], 1);
    // grass cap strip
    pushK(0, -0.14, 6.3, 0.32, 0, [0.36, 0.55, 0.35]);
    // stone pedestal (matches physics platform — already in km)
    push(
      0,
      WORLD.platformY - WORLD.platformHalfH,
      WORLD.platformHalfW * 2,
      WORLD.platformHalfH * 2,
      0,
      [0.62, 0.58, 0.55],
    );
    push(0, WORLD.platformY - 0.5, WORLD.platformHalfW * 2 + 10, 4, 0, [0.74, 0.7, 0.66]);

    // torii gate standing on the pedestal, framing the drop zone
    const ver = [0.63, 0.16, 0.13];
    pushK(-1.58, 1.75, 0.45, 3.8, 0.03, ver);
    pushK(1.58, 1.75, 0.45, 3.8, -0.03, ver);
    pushK(0, 3.5, 4.33, 0.37, 0, [0.55, 0.13, 0.11]); // kasagi (curved ends faked)
    pushK(-2.28, 3.56, 0.5, 0.33, 0.3, [0.55, 0.13, 0.11]);
    pushK(2.28, 3.56, 0.5, 0.33, -0.3, [0.55, 0.13, 0.11]);
    pushK(0, 2.9, 3.85, 0.3, 0, ver); // nuki
    pushK(0, 3.18, 0.3, 0.55, 0, ver); // gakuzuka

    const built = quads.map((q) => {
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const vb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      gl.bufferData(gl.ARRAY_BUFFER, q.verts, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
      return { ...q, vao, count: q.verts.length / 2 };
    });
    return built;
  }

  // Original procedural space actors (all quads/triangles, no assets):
  // a rocket that streaks past on each new tower-height record, and the
  // ISS with a tethered astronaut cruising past ~380 km. Everything in km.
  _buildSpaceActors() {
    const gl = this.gl;
    const quad = (w, h) => [
      -w / 2,
      -h / 2,
      w / 2,
      -h / 2,
      w / 2,
      h / 2,
      -w / 2,
      -h / 2,
      w / 2,
      h / 2,
      -w / 2,
      h / 2,
    ];
    const mk = (verts, color, ox = 0, oy = 0, rot = 0, alpha = 1) => {
      const vao = gl.createVertexArray();
      gl.bindVertexArray(vao);
      const vb = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindVertexArray(null);
      return { vao, count: verts.length / 2, color, ox, oy, rot, alpha };
    };
    const white = [0.94, 0.94, 0.97];
    const red = [0.78, 0.22, 0.2];
    const panel = [0.16, 0.28, 0.72];
    const rocket = {
      on: false,
      x: 0,
      y: 0,
      rot: 0.3,
      parts: [
        mk(quad(9, 34), white), // body
        mk([-4.5, 17, 4.5, 17, 0, 32], red), // nose cone
        mk([-4.5, -17, -15, -25, -4.5, -6], red), // fin L
        mk([4.5, -17, 15, -25, 4.5, -6], red), // fin R
        mk(quad(6, 6), [0.35, 0.6, 0.9], 0, 6), // window
        mk([-3.5, -17, 3.5, -17, 0, -34], [1.0, 0.68, 0.2], 0, 0, 0, 0.9), // flame
      ],
    };
    const iss = {
      x: 0,
      y: 0,
      rot: 0.1,
      parts: [
        mk(quad(90, 5), [0.78, 0.8, 0.88]), // truss
        mk(quad(26, 11), [0.9, 0.9, 0.95]), // module
        mk(quad(12, 8), [0.85, 0.85, 0.9], -16, 0), // docked capsule
        mk(quad(36, 15), panel, -55, 0), // solar panel L
        mk(quad(36, 15), panel, 55, 0), // solar panel R
        mk(quad(5, 5), [1, 0.8, 0.35], 16, 8, 0, 0.9), // beacon
      ],
    };
    const astro = {
      x: 0,
      y: 0,
      rot: 0.4,
      parts: [
        mk(quad(1.5, 14), [0.85, 0.85, 0.85], -8, -4), // tether
        mk(quad(7, 10), [0.96, 0.96, 0.99]), // suit body
        mk(quad(6, 5.5), [0.7, 0.85, 1.0], 0, 8), // helmet visor
        mk(quad(4, 7), [0.6, 0.63, 0.7], -4, -1), // backpack
      ],
    };
    return { list: [rocket, iss, astro], rocket, iss, astro };
  }

  // Called by the game each time the tower sets a new height record.
  rocketFlyby() {
    const r = this.spaceActors.rocket;
    if (r.on) return;
    r.on = true;
    const side = Math.random() < 0.5 ? -1 : 1;
    r.x = this.cam.x + side * this.cam.h * 0.42;
    r.y = this.cam.y - this.cam.h * 0.35;
    r.rot = -side * 0.26 + (Math.random() - 0.5) * 0.12;
  }

  _updateSpaceActors(dt) {
    const alt = this.cam.y;
    const r = this.spaceActors.rocket;
    if (r.on) {
      r.y += 320 * dt;
      r.x += 90 * dt * Math.sign(-r.rot);
      if (r.y > this.cam.y + this.cam.h * 0.75) r.on = false;
    }
    r.visible = r.on;

    const iss = this.spaceActors.iss;
    const astro = this.spaceActors.astro;
    if (alt > 340) {
      const span = this.cam.h * 0.8;
      iss.visible = true;
      iss.x = this.cam.x + Math.sin(this.time * 0.07) * span * 0.55;
      iss.y = this.cam.y + this.cam.h * 0.2 + Math.sin(this.time * 0.23) * 14;
      astro.visible = true;
      astro.x = iss.x + 30 + Math.sin(this.time * 0.5) * 8;
      astro.y = iss.y - 30 + Math.sin(this.time * 0.4) * 10;
      astro.rot = 0.4 + Math.sin(this.time * 0.3) * 0.2;
    } else {
      iss.visible = false;
      astro.visible = false;
    }
  }

  // ----- particles -----
  emit(kind, x, y, n, opts = {}) {
    for (let i = 0; i < n && this.particles.length < MAX_PARTICLES; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = (opts.speed ?? 1.2) * (0.4 + Math.random());
      this.particles.push({
        kind,
        x: x + (Math.random() - 0.5) * (opts.spread ?? 0.3),
        y: y + (Math.random() - 0.5) * (opts.spread ?? 0.3) * 0.4,
        vx: Math.cos(a) * sp * (opts.vx ?? 1) + (opts.windX ?? 0),
        vy: Math.abs(Math.sin(a)) * sp * (opts.up ?? 1.4),
        rot: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 6,
        scale: (opts.scale ?? 0.12) * (0.6 + Math.random() * 0.8),
        r: opts.r ?? 1,
        g: opts.g ?? 0.75,
        b: opts.b ?? 0.8,
        a: opts.alpha ?? 1,
        life: 0,
        ttl: (opts.ttl ?? 1.6) * (0.7 + Math.random() * 0.6),
      });
    }
  }

  sakuraAmbient(dt) {
    // ambient petals drifting across the view
    if (Math.random() < dt * 6) {
      this.particles.push({
        kind: 0,
        x: this.cam.x + (Math.random() - 0.5) * this.cam.h,
        y: this.cam.y + this.cam.h * 0.6,
        vx: -30 - Math.random() * 36,
        vy: -15 - Math.random() * 18,
        rot: Math.random() * 6,
        vr: (Math.random() - 0.5) * 4,
        scale: 5 + Math.random() * 4,
        r: 1,
        g: 0.72,
        b: 0.8,
        a: 0.9,
        life: 0,
        ttl: 6 + Math.random() * 4,
      });
    }
  }

  updateParticles(dt) {
    for (const p of this.particles) {
      p.life += dt;
      p.vy -= 70 * dt * (p.kind === 0 ? 0.25 : 1); // petals glide
      p.vx += Math.sin(p.life * 3 + p.rot) * 0.25 * dt * (p.kind === 0 ? 1 : 0.2);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    this.particles = this.particles.filter((p) => p.life < p.ttl);
  }

  cameraFollow(targetY, targetH, dt) {
    this.cam.h += (targetH - this.cam.h) * Math.min(1, dt * 1.6);
    const desired = Math.max(160, targetY + this.cam.h * 0.28);
    this.cam.y += (desired - this.cam.y) * Math.min(1, dt * 2.2);
  }

  shake(amount) {
    this.cam.shake = Math.min(30, this.cam.shake + amount);
  }

  camMatrix() {
    const h = this.cam.h;
    const w = h * (this.canvas.width / Math.max(1, this.canvas.height));
    const sx = Math.sin(this.time * 51) * this.cam.shake;
    const sy = Math.cos(this.time * 43) * this.cam.shake * 0.7;
    const cx = this.cam.x + sx;
    const cy = this.cam.y + sy;
    // world -> NDC
    return [2 / w, 0, 0, 0, 2 / h, 0, -cx * (2 / w), -cy * (2 / h), 1];
  }

  render(state) {
    const gl = this.gl;
    this.resize();
    const dt = Math.min(0.05, state.dt ?? 0.016);
    this.time += dt;
    this.cam.shake *= Math.pow(0.02, dt);
    this.updateParticles(dt);
    if (!state.reduceMotion && this.cam.y < 80) this.sakuraAmbient(dt);
    this.cameraFollow(state.camTarget ?? 160, state.camH ?? 520, dt);
    this._updateSpaceActors(dt);
    const M = this.camMatrix();

    // ---- scene into fboScene ----
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboScene.f);
    gl.viewport(0, 0, this.fboScene.w, this.fboScene.h);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    if (!this.webgpuSky) {
      gl.useProgram(this.pSky);
      gl.uniform1f(this.u.sky.t, this.time);
      gl.uniform2f(this.u.sky.res, this.fboScene.w, this.fboScene.h);
      gl.uniform2f(this.u.sky.cam, this.cam.x, this.cam.y);
      gl.uniform1f(this.u.sky.h, this.cam.h);
      const sunY = Math.min(0.55, 0.3 + this.cam.y * 0.0008);
      gl.uniform2f(this.u.sky.sun, 0.62, sunY);
      gl.bindVertexArray(this.vaoFull);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    // scenery
    gl.useProgram(this.pFlat);
    gl.uniformMatrix3fv(this.u.flat.cam, false, M);
    for (const q of this.scenery) {
      gl.uniform2f(this.u.flat.pos, q.x, q.y);
      gl.uniform1f(this.u.flat.rot, q.rot);
      gl.uniform1f(this.u.flat.scale, 1);
      gl.uniform3fv(this.u.flat.color, q.color);
      gl.uniform1f(this.u.flat.alpha, q.alpha);
      gl.bindVertexArray(q.vao);
      gl.drawArrays(gl.TRIANGLES, 0, q.count);
    }
    // space actors: rocket flybys past 100 km, ISS + astronaut past ~380 km
    for (const a of this.spaceActors.list) {
      if (!a.visible) continue;
      const c = Math.cos(a.rot);
      const s = Math.sin(a.rot);
      for (const pt of a.parts) {
        gl.uniform2f(this.u.flat.pos, a.x + pt.ox * c - pt.oy * s, a.y + pt.ox * s + pt.oy * c);
        gl.uniform1f(this.u.flat.rot, a.rot + pt.rot);
        gl.uniform1f(this.u.flat.scale, 1);
        gl.uniform3fv(this.u.flat.color, pt.color);
        gl.uniform1f(this.u.flat.alpha, pt.alpha);
        gl.bindVertexArray(pt.vao);
        gl.drawArrays(gl.TRIANGLES, 0, pt.count);
      }
    }

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // piece shadows: offset dark copy, alpha falls with height above surface
    gl.useProgram(this.pShape);
    gl.uniformMatrix3fv(this.u.shape.cam, false, M);
    gl.uniform1f(this.u.shape.time, this.time);
    for (const p of state.bodies) {
      const m = this.meshFor(p.rec.piece);
      const groundD = Math.max(0, p.y - WORLD.platformY);
      const a = Math.max(0, 0.35 - groundD * 0.004);
      if (a <= 0.01) continue;
      gl.uniform2f(this.u.shape.pos, p.x + 8, p.y - 10 - groundD * 0.03);
      gl.uniform1f(this.u.shape.rot, p.angle);
      gl.uniform1f(this.u.shape.scale, 1.02);
      gl.uniform3f(this.u.shape.main, 0.05, 0.05, 0.1);
      gl.uniform3f(this.u.shape.edge, 0.05, 0.05, 0.1);
      gl.uniform1f(this.u.shape.ghost, 0);
      gl.uniform1f(this.u.shape.alpha, a);
      gl.bindVertexArray(m.vao);
      gl.drawArrays(gl.TRIANGLES, 0, m.count);
    }

    // pieces
    for (const p of state.bodies) {
      const m = this.meshFor(p.rec.piece);
      gl.uniform2f(this.u.shape.pos, p.x, p.y);
      gl.uniform1f(this.u.shape.rot, p.angle);
      gl.uniform1f(this.u.shape.scale, 1);
      gl.uniform3fv(this.u.shape.main, m.main);
      gl.uniform3fv(this.u.shape.edge, m.edge);
      gl.uniform1f(this.u.shape.ghost, 0);
      gl.uniform1f(this.u.shape.alpha, 1);
      gl.bindVertexArray(m.vao);
      gl.drawArrays(gl.TRIANGLES, 0, m.count);
    }

    // ghost preview while aiming
    if (state.ghost) {
      const m = this.meshFor(state.ghost.piece);
      gl.uniform2f(this.u.shape.pos, state.ghost.x, state.ghost.y);
      gl.uniform1f(this.u.shape.rot, state.ghost.angle);
      gl.uniform1f(this.u.shape.scale, 1);
      gl.uniform3fv(this.u.shape.main, m.main);
      gl.uniform3fv(this.u.shape.edge, m.edge);
      gl.uniform1f(this.u.shape.ghost, 1);
      gl.uniform1f(this.u.shape.alpha, 1);
      gl.bindVertexArray(m.vao);
      gl.drawArrays(gl.TRIANGLES, 0, m.count);
      // aim guide: dashed vertical drop line as thin flat quads
      gl.useProgram(this.pFlat);
      for (let i = 0; i < 14; i++) {
        const y = state.ghost.y - 30 - i * 42;
        if (y < WORLD.platformY + 10) break;
        gl.uniform2f(this.u.flat.pos, state.ghost.x, y);
        gl.uniform1f(this.u.flat.rot, 0);
        gl.uniform1f(this.u.flat.scale, 1);
        gl.uniform3f(this.u.flat.color, 1, 1, 1);
        gl.uniform1f(this.u.flat.alpha, Math.max(0, 0.4 - i * 0.025));
        gl.bindVertexArray(this.dashVao ?? (this.dashVao = this._dashVao()));
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
      gl.useProgram(this.pShape);
      gl.uniformMatrix3fv(this.u.shape.cam, false, M);
      gl.uniform1f(this.u.shape.time, this.time);
    }

    // particles
    this._drawParticles(M);

    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);

    // ---- post: bright -> blur x2 -> composite ----
    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboA.f);
    gl.viewport(0, 0, this.fboA.w, this.fboA.h);
    gl.useProgram(this.pBright);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fboScene.t);
    gl.uniform1i(this.u.bright.tex, 0);
    gl.bindVertexArray(this.vaoFull);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboB.f);
    gl.useProgram(this.pBlur);
    gl.bindTexture(gl.TEXTURE_2D, this.fboA.t);
    gl.uniform1i(this.u.blur.tex, 0);
    gl.uniform2f(this.u.blur.dir, 1 / this.fboA.w, 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, this.fboA.f);
    gl.bindTexture(gl.TEXTURE_2D, this.fboB.t);
    gl.uniform2f(this.u.blur.dir, 0, 1 / this.fboB.h);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.useProgram(this.pComp);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.fboScene.t);
    gl.uniform1i(this.u.comp.scene, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.fboA.t);
    gl.uniform1i(this.u.comp.bloom, 1);
    gl.uniform1f(this.u.comp.t, this.time);
    gl.uniform1f(this.u.comp.vig, 0.55);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  _dashVao() {
    const gl = this.gl;
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    const vb = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vb);
    gl.bufferData(gl.ARRAY_BUFFER, rectVerts(4, 26), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.bindVertexArray(null);
    return vao;
  }

  _drawParticles(M) {
    const gl = this.gl;
    if (!this.particles.length) return;
    gl.useProgram(this.pPart);
    gl.uniformMatrix3fv(this.u.part.cam, false, M);
    gl.bindVertexArray(this.vaoPart);
    // draw in 3 kind groups; simple approach: 3 passes
    const kinds = [0, 1, 2];
    const i0 = new Float32Array(MAX_PARTICLES * 4);
    const i1 = new Float32Array(MAX_PARTICLES * 4);
    for (const kind of kinds) {
      let n = 0;
      for (const p of this.particles) {
        if (p.kind !== kind) continue;
        const fade = p.kind === 2 ? 1 - p.life / p.ttl : Math.min(1, (p.ttl - p.life) / 0.5);
        i0[n * 4] = p.x;
        i0[n * 4 + 1] = p.y;
        i0[n * 4 + 2] = p.rot;
        i0[n * 4 + 3] = p.scale;
        i1[n * 4] = p.r;
        i1[n * 4 + 1] = p.g;
        i1[n * 4 + 2] = p.b;
        i1[n * 4 + 3] = p.a * Math.max(0, fade);
        n++;
      }
      if (!n) continue;
      gl.uniform1f(this.u.part.kind, kind);
      gl.bindBuffer(gl.ARRAY_BUFFER, this.pb0);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, i0.subarray(0, n * 4));
      gl.bindBuffer(gl.ARRAY_BUFFER, this.pb1);
      gl.bufferSubData(gl.ARRAY_BUFFER, 0, i1.subarray(0, n * 4));
      gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, n);
    }
    gl.bindVertexArray(null);
    gl.useProgram(this.pShape);
  }
}

function rectVerts(w, h) {
  const x = w / 2,
    y = h / 2;
  return new Float32Array([-x, -y, x, -y, x, y, -x, -y, x, y, -x, y]);
}
