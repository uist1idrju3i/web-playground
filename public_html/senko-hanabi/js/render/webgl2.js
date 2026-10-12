// WebGL2 backend: one instanced-quad program for spark streaks, a radial
// glow quad for the ball, a line program for the cord, and a fullscreen
// triangle for the night-sky background. Additive blending for emissives.

import { BG_VS, BG_FS, STREAK_VS, STREAK_FS, GLOW_VS, GLOW_FS, CORD_VS, CORD_FS } from './glsl.js';
import { INST_F32, WORLD, viewTransform } from './scene.js';

function compile(gl, type, src) {
  const sh = gl.createShader(type);
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    throw new Error(`shader compile: ${gl.getShaderInfoLog(sh)}`);
  }
  return sh;
}

function program(gl, vs, fs) {
  const p = gl.createProgram();
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, vs));
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, fs));
  gl.linkProgram(p);
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    throw new Error(`program link: ${gl.getProgramInfoLog(p)}`);
  }
  return p;
}

export function createWebGL2(canvas) {
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: true,
    powerPreference: 'high-performance',
  });
  if (!gl) throw new Error('WebGL2 unavailable');

  const bgProg = program(gl, BG_VS, BG_FS);
  const streakProg = program(gl, STREAK_VS, STREAK_FS);
  const glowProg = program(gl, GLOW_VS, GLOW_FS);
  const cordProg = program(gl, CORD_VS, CORD_FS);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const tri = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, tri);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const inst = gl.createBuffer();

  const uni = (p, n) => gl.getUniformLocation(p, n);
  const u = {
    bg: {
      res: uni(bgProg, 'uRes'),
      glow: uni(bgProg, 'uGlow'),
      time: uni(bgProg, 'uTime'),
      ball: uni(bgProg, 'uBall'),
      scale: uni(bgProg, 'uScale'),
      cam: uni(bgProg, 'uCam'),
    },
    st: { scale: uni(streakProg, 'uScale'), cam: uni(streakProg, 'uCam') },
    gl: {
      scale: uni(glowProg, 'uScale'),
      cam: uni(glowProg, 'uCam'),
      ballR: uni(glowProg, 'uBallR'),
      heat: uni(glowProg, 'uHeat'),
      swell: uni(glowProg, 'uSwell'),
    },
    co: {
      scale: uni(cordProg, 'uScale'),
      cam: uni(cordProg, 'uCam'),
      line: uni(cordProg, 'uLine'),
      w: uni(cordProg, 'uW'),
      lit: uni(cordProg, 'uLit'),
    },
  };

  let width = 0;
  let height = 0;
  let time = 0;

  function resize() {
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    const w = Math.max(2, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(2, Math.round(canvas.clientHeight * dpr));
    if (w !== width || h !== height) {
      width = w;
      height = h;
      canvas.width = w;
      canvas.height = h;
    }
  }

  function draw(scene, dt) {
    time += dt;
    resize();
    gl.viewport(0, 0, width, height);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);

    const vt = viewTransform(width, height);
    const sx = vt.scaleX;
    const sy = vt.scaleY;

    // Background
    gl.blendFunc(gl.ONE, gl.ZERO);
    gl.useProgram(bgProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, tri);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.uniform2f(u.bg.res, width, height);
    gl.uniform1f(u.bg.glow, scene.ambientGlow);
    gl.uniform1f(u.bg.time, time % 1000);
    gl.uniform2f(u.bg.ball, scene.ball.x, scene.ball.y);
    gl.uniform2f(u.bg.scale, sx, sy);
    gl.uniform2f(u.bg.cam, vt.cx, vt.cy);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // Cord (pivot -> ball), opaque-ish
    gl.useProgram(cordProg);
    gl.uniform2f(u.co.scale, sx, sy);
    gl.uniform2f(u.co.cam, vt.cx, vt.cy);
    gl.uniform4f(u.co.line, 0, WORLD.stickTopY, scene.ball.x, scene.ball.y);
    gl.uniform1f(u.co.w, 0.7);
    gl.uniform1f(u.co.lit, Math.min(1, scene.ball.heat));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    gl.disableVertexAttribArray(0);

    // Additive emissives
    gl.blendFunc(gl.ONE, gl.ONE);

    // Ball glow
    gl.useProgram(glowProg);
    gl.bindBuffer(gl.ARRAY_BUFFER, quad);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    const glowR = Math.max(2.6, scene.ball.r * 8);
    gl.uniform2f(u.gl.scale, sx, sy);
    gl.uniform2f(u.gl.cam, vt.cx, vt.cy);
    gl.uniform3f(u.gl.ballR, scene.ball.x, scene.ball.y, glowR);
    gl.uniform1f(u.gl.heat, scene.ball.heat);
    gl.uniform1f(u.gl.swell, scene.ball.swell + time);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // Spark streaks (instanced)
    if (scene.instCount > 0) {
      gl.useProgram(streakProg);
      gl.uniform2f(u.st.scale, sx, sy);
      gl.uniform2f(u.st.cam, vt.cx, vt.cy);
      gl.bindBuffer(gl.ARRAY_BUFFER, quad);
      gl.enableVertexAttribArray(0);
      gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, inst);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        scene.inst.subarray(0, scene.instCount * INST_F32),
        gl.DYNAMIC_DRAW,
      );
      const stride = INST_F32 * 4;
      const attrs = [
        [1, 2, 0],
        [2, 2, 8],
        [3, 2, 16],
        [4, 2, 24],
      ];
      for (const [loc, size, off] of attrs) {
        gl.enableVertexAttribArray(loc);
        gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, off);
        gl.vertexAttribDivisor(loc, 1);
      }
      gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, scene.instCount);
      for (const [loc] of attrs) gl.vertexAttribDivisor(loc, 0);
    }
  }

  return {
    kind: 'webgl2',
    draw,
    resize,
    async snapshot() {
      draw._last = true;
      return new Promise((resolve) => {
        requestAnimationFrame(() => resolve(canvas.toDataURL('image/png')));
      });
    },
  };
}
