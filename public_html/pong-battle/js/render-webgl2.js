// WebGL2 renderer for the backend-neutral scene model. One sprite batch:
// quads with per-instance center/size/color/kind, drawn with additive-ish
// glow blending. Falls back gracefully on context loss.
export function createWebGL2Renderer(canvas) {
  const gl = canvas.getContext('webgl2', { antialias: true, alpha: false, preserveDrawingBuffer: true });
  if (!gl) return null;

  const VS = `#version 300 es
layout(location=0) in vec2 aCorner;        // unit quad -0.5..0.5
layout(location=1) in vec4 aRect;          // cx, cy, w, h
layout(location=2) in vec4 aColor;
layout(location=3) in vec2 aKind;          // kind, param
uniform vec2 uView;
out vec4 vColor;
flat out vec2 vKind;
out vec2 vLocal;
void main() {
  vec2 pos = aRect.xy + aCorner * aRect.zw;
  vLocal = aCorner;
  vColor = aColor;
  vKind = aKind;
  gl_Position = vec4(pos.x / uView.x * 2.0 - 1.0, 1.0 - pos.y / uView.y * 2.0, 0.0, 1.0);
}`;

  const FS = `#version 300 es
precision mediump float;
in vec4 vColor;
flat in vec2 vKind;
in vec2 vLocal;
out vec4 outColor;
void main() {
  float d = length(vLocal) * 2.0;
  float a = vColor.a;
  if (vKind.x < 0.5) {          // rect
    outColor = vColor;
  } else if (vKind.x < 1.5) {   // circle
    if (d > 1.0) discard;
    a *= smoothstep(1.0, 0.82, d);
    outColor = vec4(vColor.rgb, a);
  } else if (vKind.x < 2.5) {   // glow: soft radial
    float k = exp(-d * d * 3.0);
    outColor = vec4(vColor.rgb, a * k);
  } else if (vKind.x < 3.5) {   // dash: fade at both ends
    float k = 1.0 - abs(vLocal.x) * 2.0;
    outColor = vec4(vColor.rgb, a * smoothstep(0.0, 0.35, k));
  } else {                      // line segment encoded as thin rect
    outColor = vColor;
  }
  outColor.rgb *= outColor.a > 0.0 ? 1.0 : 1.0;
}`;

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS))
      throw new Error(`shader: ${gl.getShaderInfoLog(s)}`);
    return s;
  }
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS))
    throw new Error(`link: ${gl.getProgramInfoLog(prog)}`);

  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, 0.5]),
    gl.STATIC_DRAW,
  );
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  const inst = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, inst);
  const stride = 12 * 4; // rect4 + color4 + kind2 + pad2
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, stride, 0);
  gl.vertexAttribDivisor(1, 1);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 4, gl.FLOAT, false, stride, 16);
  gl.vertexAttribDivisor(2, 1);
  gl.enableVertexAttribArray(3);
  gl.vertexAttribPointer(3, 2, gl.FLOAT, false, stride, 32);
  gl.vertexAttribDivisor(3, 1);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE); // additive glow pipeline
  gl.useProgram(prog);
  const uView = gl.getUniformLocation(prog, 'uView');

  let lost = false;
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    lost = true;
  });
  canvas.addEventListener('webglcontextrestored', () => {
    lost = false;
  });

  const KIND = { rect: 0, circle: 1, glow: 2, dash: 3, line: 4 };

  function render(scene, shake) {
    if (lost) return;
    const { width, height } = canvas;
    gl.viewport(0, 0, width, height);
    const t = scene.bgTop;
    const b = scene.bgBottom;
    gl.clearColor(b[0], b[1], b[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(uView, width, height);

    // Vertical gradient strip as two giant glow quads.
    const data = [];
    const sx = shake?.x ?? 0;
    const sy = shake?.y ?? 0;
    const push = (s) => {
      const k = KIND[s.type] ?? 0;
      data.push(
        s.x + sx,
        s.y + sy,
        s.w,
        s.h,
        s.color[0],
        s.color[1],
        s.color[2],
        s.color[3],
        k,
        s.extra ?? 0,
        0,
        0,
      );
    };
    push({
      type: 'glow',
      x: width / 2,
      y: height * 0.1,
      w: width * 2,
      h: height * 1.1,
      color: [t[0] - b[0], t[1] - b[1], t[2] - b[2], 0.9],
    });
    for (const s of scene.sprites) {
      if (s.type === 'line') {
        // Pack a segment as a rotated rect is overkill; draw as a very
        // thin long rect horizontally between endpoints.
        const len = Math.hypot(s.w, s.h);
        // Emit a glow dot trail along the segment.

        const n = Math.max(2, Math.ceil(len / 6));
        for (let i = 0; i <= n; i++)
          push({
            type: 'circle',
            x: s.x + (s.w * i) / n - 1.5,
            y: s.y + (s.h * i) / n - 1.5,
            w: 3,
            h: 3,
            color: s.color,
          });
        continue;
      }
      push(s);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, inst);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.DYNAMIC_DRAW);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, data.length / 12);
  }

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    const w = Math.round(canvas.clientWidth * dpr);
    const h = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  return {
    kind: 'webgl2',
    render,
    resize,
    get lost() {
      return lost;
    },
  };
}
