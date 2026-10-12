import * as glsl from './glsl.js';
import { gridIndices, packUniforms } from './scene.js';

const MAX_PARTICLES = 4096;

function compile(gl, vs, fs) {
  const program = gl.createProgram();
  for (const [type, source] of [
    [gl.VERTEX_SHADER, vs],
    [gl.FRAGMENT_SHADER, fs],
  ]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(`WebGL2 shader compile failed: ${gl.getShaderInfoLog(shader)}`);
    }
    gl.attachShader(program, shader);
  }
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(`WebGL2 program link failed: ${gl.getProgramInfoLog(program)}`);
  }
  const block = gl.getUniformBlockIndex(program, 'Frame');
  if (block !== gl.INVALID_INDEX) gl.uniformBlockBinding(program, block, 0);
  gl.useProgram(program);
  ['uFieldA', 'uFieldB', 'uMold'].forEach((name, unit) => {
    const loc = gl.getUniformLocation(program, name);
    if (loc) gl.uniform1i(loc, unit);
  });
  return program;
}

function texture(gl, internal, format, type, w, h, filter) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texStorage2D(gl.TEXTURE_2D, 1, internal, w, h);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  tex.upload = (data) => {
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, w, h, format, type, data);
  };
  return tex;
}

export function createWebGL2Renderer(canvas, { grid, mold, border }) {
  const gl = canvas.getContext('webgl2', {
    antialias: true,
    alpha: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  });
  if (!gl) throw new Error('WebGL2 is unavailable.');
  const programs = {
    background: compile(gl, glsl.backgroundVS, glsl.backgroundFS),
    plate: compile(gl, glsl.plateVS, glsl.plateFS),
    batter: compile(gl, glsl.batterVS, glsl.batterFS),
    particle: compile(gl, glsl.particleVS, glsl.particleFS),
  };
  const { indices } = gridIndices(grid.w, grid.h, border);
  const vao = gl.createVertexArray();
  gl.bindVertexArray(vao);
  const ibo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);
  const particleVao = gl.createVertexArray();
  gl.bindVertexArray(particleVao);
  const particleBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, MAX_PARTICLES * 32, gl.DYNAMIC_DRAW);
  for (const loc of [0, 1]) {
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, 32, loc * 16);
    gl.vertexAttribDivisor(loc, 1);
  }
  gl.bindVertexArray(null);
  const ubo = gl.createBuffer();
  gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);
  gl.bufferData(gl.UNIFORM_BUFFER, 256, gl.DYNAMIC_DRAW);
  gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, ubo);
  const fieldA = texture(gl, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, grid.w, grid.h, gl.LINEAR);
  const fieldB = texture(gl, gl.RGBA16F, gl.RGBA, gl.HALF_FLOAT, grid.w, grid.h, gl.LINEAR);
  const moldTex = texture(gl, gl.R32F, gl.RED, gl.FLOAT, grid.w, grid.h, gl.NEAREST);
  moldTex.upload(mold);
  const uniforms = new Float32Array(64);
  const units = [fieldA, fieldB, moldTex];

  return {
    name: 'WebGL2',
    zeroToOne: false,
    render(camera, frame) {
      fieldA.upload(frame.fieldA);
      fieldB.upload(frame.fieldB);
      packUniforms(uniforms, camera, frame);
      gl.bindBuffer(gl.UNIFORM_BUFFER, ubo);
      gl.bufferSubData(gl.UNIFORM_BUFFER, 0, uniforms);
      units.forEach((tex, unit) => {
        gl.activeTexture(gl.TEXTURE0 + unit);
        gl.bindTexture(gl.TEXTURE_2D, tex);
      });
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0.03, 0.02, 0.015, 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.disable(gl.BLEND);
      gl.disable(gl.CULL_FACE);
      gl.bindVertexArray(vao);
      gl.useProgram(programs.plate);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_INT, 0);
      gl.useProgram(programs.batter);
      gl.drawElementsInstanced(gl.TRIANGLES, indices.length, gl.UNSIGNED_INT, 0, 2);
      gl.useProgram(programs.background);
      gl.depthMask(false);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      const count = Math.min(MAX_PARTICLES, frame.particleCount);
      if (count > 0) {
        gl.bindVertexArray(particleVao);
        gl.bindBuffer(gl.ARRAY_BUFFER, particleBuffer);
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, frame.particles, 0, count * 8);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        gl.useProgram(programs.particle);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, count);
      }
      gl.depthMask(true);
      gl.bindVertexArray(null);
    },
    destroy() {
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    },
  };
}
