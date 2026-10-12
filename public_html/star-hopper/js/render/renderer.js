// WebGL2 renderer for Star Hopper: procedural sunset sky, instanced floating
// islands, spinning shards with additive halos, drifting clouds, a soft blob
// shadow, and a CPU particle pool. No textures and no external assets — every
// surface is generated geometry and shader color.

import { forwardVector, fpsView, multiply, perspective } from './math.js';
import {
  CLOUD_FRAG,
  CLOUD_VERT,
  FOG_COLOR,
  HALO_FRAG,
  HALO_VERT,
  ISLAND_FRAG,
  ISLAND_VERT,
  PARTICLE_FRAG,
  PARTICLE_VERT,
  SHADOW_FRAG,
  SHADOW_VERT,
  SHARD_FRAG,
  SHARD_VERT,
  SKY_FRAG,
  SKY_TOP,
  SKY_VERT,
  SUN_DIR,
} from './shaders.js';
import { Particles } from './particles.js';

function compile(gl, type, source, label) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(shader);
    throw new Error(`${label} shader failed: ${log}`);
  }
  return shader;
}

function program(gl, vs, fs, label) {
  const prog = gl.createProgram();
  gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, vs, `${label}.vert`));
  gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, fs, `${label}.frag`));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    throw new Error(`${label} link failed: ${gl.getProgramInfoLog(prog)}`);
  }
  return prog;
}

function uniforms(gl, prog, names) {
  const out = {};
  for (const name of names) out[name] = gl.getUniformLocation(prog, name);
  return out;
}

// Unit island: grass disc (part=0) from y=0 down to a skirt, then a rock cone
// (part=1) tapering to depth -1. Radius and depth are per-instance scales.
function buildIslandMesh() {
  const SEG = 24;
  const pos = [];
  const nrm = [];
  const part = [];
  const idx = [];
  const push = (x, y, z, nx, ny, nz, p) => {
    pos.push(x, y, z);
    nrm.push(nx, ny, nz);
    part.push(p);
    return pos.length / 3 - 1;
  };
  // Grass top: center + 2 rings with a gentle dome, edge curls down slightly.
  push(0, 0.06, 0, 0, 1, 0, 0);
  const ring1 = [];
  const ring2 = [];
  const ring3 = [];
  for (let i = 0; i < SEG; i += 1) {
    const a = (i / SEG) * Math.PI * 2;
    const c = Math.cos(a);
    const s = Math.sin(a);
    const w = 1 + 0.12 * Math.sin(i * 2.7) * Math.cos(i * 1.3);
    ring1.push(push(c * 0.45, 0.09 + 0.02 * Math.sin(i * 3.1), s * 0.45, 0, 1, 0, 0));
    ring2.push(push(c * 0.8, 0.03, s * 0.8, 0, 1, 0, 0));
    ring3.push(push(c * w, -0.06, s * w, 0, 1, 0, 0));
  }
  for (let i = 0; i < SEG; i += 1) {
    const j = (i + 1) % SEG;
    idx.push(0, ring1[i], ring1[j]);
    idx.push(ring1[i], ring2[i], ring2[j], ring1[i], ring2[j], ring1[j]);
    idx.push(ring2[i], ring3[i], ring3[j], ring2[i], ring3[j], ring2[j]);
  }
  // Rock cone: reuse ring3 as the rim, taper to a noisy point.
  const mid = [];
  const tip = push(0, -1.05, 0, 0, -1, 0, 1);
  for (let i = 0; i < SEG; i += 1) {
    const a = (i / SEG) * Math.PI * 2;
    const jitter = 0.55 + 0.1 * Math.sin(i * 4.3);
    mid.push(
      push(
        Math.cos(a) * jitter,
        -0.55 - 0.08 * Math.cos(i * 2.1),
        Math.sin(a) * jitter,
        Math.cos(a),
        -0.45,
        Math.sin(a),
        1,
      ),
    );
  }
  for (let i = 0; i < SEG; i += 1) {
    const j = (i + 1) % SEG;
    idx.push(ring3[i], mid[i], mid[j], ring3[i], mid[j], ring3[j]);
    idx.push(mid[i], tip, mid[j]);
  }
  return {
    pos: new Float32Array(pos),
    nrm: new Float32Array(nrm),
    part: new Float32Array(part),
    idx: new Uint16Array(idx),
  };
}

function buildOctahedron() {
  // 8 triangles forming a gem: each entry is a flat [x,y,z] vertex, one per
  // face corner so normals stay faceted via shader-side derivatives.
  const v = [
    [0, 1, 0],
    [1, 0, 0],
    [0, 0, 1],
    [-1, 0, 0],
    [0, 0, -1],
    [0, -1, 0],
  ];
  const faces = [
    [0, 1, 2],
    [0, 2, 3],
    [0, 3, 4],
    [0, 4, 1],
    [5, 2, 1],
    [5, 3, 2],
    [5, 4, 3],
    [5, 1, 4],
  ];
  const pos = new Float32Array(faces.flatMap((face) => face.flatMap((i) => v[i])));
  const idx = new Uint16Array(faces.map((_, i) => i));
  return { pos, idx };
}

const QUAD = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
const SKY_TRI = new Float32Array([-1, -1, 3, -1, -1, 3]);

export function createRenderer(canvas) {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    antialias: true,
    powerPreference: 'high-performance',
  });
  if (!gl) throw new Error('WebGL2 is unavailable');

  const progs = {
    sky: program(gl, SKY_VERT, SKY_FRAG, 'sky'),
    island: program(gl, ISLAND_VERT, ISLAND_FRAG, 'island'),
    shard: program(gl, SHARD_VERT, SHARD_FRAG, 'shard'),
    halo: program(gl, HALO_VERT, HALO_FRAG, 'halo'),
    cloud: program(gl, CLOUD_VERT, CLOUD_FRAG, 'cloud'),
    particle: program(gl, PARTICLE_VERT, PARTICLE_FRAG, 'particle'),
    shadow: program(gl, SHADOW_VERT, SHADOW_FRAG, 'shadow'),
  };
  const U = {
    sky: uniforms(gl, progs.sky, [
      'u_fwd',
      'u_right',
      'u_up',
      'u_tanFov',
      'u_aspect',
      'u_sun',
      'u_time',
      'u_top',
      'u_mid',
      'u_horizon',
    ]),
    island: uniforms(gl, progs.island, ['u_vp', 'u_time', 'u_sun', 'u_fog', 'u_cam']),
    shard: uniforms(gl, progs.shard, ['u_vp', 'u_time', 'u_fog']),
    halo: uniforms(gl, progs.halo, ['u_vp', 'u_time', 'u_right', 'u_up']),
    cloud: uniforms(gl, progs.cloud, ['u_vp', 'u_time', 'u_right', 'u_up']),
    particle: uniforms(gl, progs.particle, ['u_vp', 'u_pxScale']),
    shadow: uniforms(gl, progs.shadow, ['u_vp', 'u_center', 'u_scale', 'u_alpha']),
  };

  // --- sky fullscreen triangle ---
  const skyVao = gl.createVertexArray();
  gl.bindVertexArray(skyVao);
  const skyBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf);
  gl.bufferData(gl.ARRAY_BUFFER, SKY_TRI, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // --- islands ---
  const islandMesh = buildIslandMesh();
  const islandVao = gl.createVertexArray();
  gl.bindVertexArray(islandVao);
  const islandVbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, islandVbo);
  gl.bufferData(gl.ARRAY_BUFFER, islandMesh.pos, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  const islandNbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, islandNbo);
  gl.bufferData(gl.ARRAY_BUFFER, islandMesh.nrm, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
  const islandPbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, islandPbo);
  gl.bufferData(gl.ARRAY_BUFFER, islandMesh.part, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 1, gl.FLOAT, false, 0, 0);
  const islandInstanceBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, islandInstanceBuf);
  gl.enableVertexAttribArray(3);
  gl.vertexAttribPointer(3, 3, gl.FLOAT, false, 32, 0);
  gl.vertexAttribDivisor(3, 1);
  gl.enableVertexAttribArray(4);
  gl.vertexAttribPointer(4, 4, gl.FLOAT, false, 32, 12);
  gl.vertexAttribDivisor(4, 1);
  const islandEbo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, islandEbo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, islandMesh.idx, gl.STATIC_DRAW);

  // --- shards (octahedron, instanced over the sim shard block) ---
  const octa = buildOctahedron();
  const shardVao = gl.createVertexArray();
  gl.bindVertexArray(shardVao);
  const octaVbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, octaVbo);
  gl.bufferData(gl.ARRAY_BUFFER, octa.pos, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
  const shardInstanceBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, shardInstanceBuf);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 0);
  gl.vertexAttribDivisor(1, 1);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 12);
  gl.vertexAttribDivisor(2, 1);
  const octaEbo = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, octaEbo);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, octa.idx, gl.STATIC_DRAW);

  // --- halo billboards (same instance data as shards) ---
  const haloVao = gl.createVertexArray();
  gl.bindVertexArray(haloVao);
  const quadBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.bufferData(gl.ARRAY_BUFFER, QUAD, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  gl.bindBuffer(gl.ARRAY_BUFFER, shardInstanceBuf);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 0);
  gl.vertexAttribDivisor(1, 1);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 12);
  gl.vertexAttribDivisor(2, 1);

  // --- clouds ---
  const cloudVao = gl.createVertexArray();
  gl.bindVertexArray(cloudVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
  const cloudInstanceBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, cloudInstanceBuf);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 32, 0);
  gl.vertexAttribDivisor(1, 1);
  gl.enableVertexAttribArray(2);
  gl.vertexAttribPointer(2, 4, gl.FLOAT, false, 32, 16);
  gl.vertexAttribDivisor(2, 1);

  // --- shadow blob ---
  const shadowVao = gl.createVertexArray();
  gl.bindVertexArray(shadowVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // --- particles ---
  const particleVao = gl.createVertexArray();
  gl.bindVertexArray(particleVao);
  const particleBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, particleBuf);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 28, 0);
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 28, 12);
  gl.bindVertexArray(null);

  const particles = new Particles();

  const proj = new Float32Array(16);
  const view = new Float32Array(16);
  const vp = new Float32Array(16);

  const state = {
    gl,
    particles,
    canvas,
    fov: 1.31, // ~75 deg
    aspect: 1,
    skyMode: 'gl', // 'gl' or 'webgpu' (WebGPU canvas draws the sky behind)
  };

  function resize() {
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2.5);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
    state.aspect = w / h;
  }

  function setClouds(data) {
    gl.bindBuffer(gl.ARRAY_BUFFER, cloudInstanceBuf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    state.cloudCount = data.length / 8;
  }

  function draw({ time, camera, islands, shards, shadow, drawSky = true }) {
    resize();
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.disable(gl.DEPTH_TEST);
    gl.disable(gl.BLEND);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const [fx, fy, fz] = forwardVector(camera.yaw, camera.pitch);
    const right = [Math.cos(camera.yaw), 0, -Math.sin(camera.yaw)];
    const upX = -Math.sin(camera.yaw) * Math.sin(camera.pitch);
    const upY = Math.cos(camera.pitch);
    const upZ = -Math.cos(camera.yaw) * Math.sin(camera.pitch);

    perspective(proj, camera.fov ?? state.fov, state.aspect, 0.08, 700);
    fpsView(view, camera.x, camera.y, camera.z, camera.yaw, camera.pitch);
    multiply(vp, proj, view);

    // Sky (GL fallback when the WebGPU pass is inactive).
    if (drawSky) {
      gl.useProgram(progs.sky);
      gl.uniform3f(U.sky.u_fwd, fx, fy, fz);
      gl.uniform3f(U.sky.u_right, right[0], right[1], right[2]);
      gl.uniform3f(U.sky.u_up, upX, upY, upZ);
      gl.uniform1f(U.sky.u_tanFov, Math.tan((camera.fov ?? state.fov) / 2));
      gl.uniform1f(U.sky.u_aspect, state.aspect);
      gl.uniform3f(U.sky.u_sun, SUN_DIR[0], SUN_DIR[1], SUN_DIR[2]);
      gl.uniform1f(U.sky.u_time, time);
      gl.uniform3f(U.sky.u_top, SKY_TOP[0], SKY_TOP[1], SKY_TOP[2]);
      gl.uniform3f(U.sky.u_mid, 0.55, 0.28, 0.46);
      gl.uniform3f(U.sky.u_horizon, 0.98, 0.55, 0.28);
      gl.bindVertexArray(skyVao);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }

    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);

    // Islands.
    gl.useProgram(progs.island);
    gl.uniformMatrix4fv(U.island.u_vp, false, vp);
    gl.uniform1f(U.island.u_time, time);
    gl.uniform3f(U.island.u_sun, SUN_DIR[0], SUN_DIR[1], SUN_DIR[2]);
    gl.uniform3f(U.island.u_fog, FOG_COLOR[0], FOG_COLOR[1], FOG_COLOR[2]);
    gl.uniform3f(U.island.u_cam, camera.x, camera.y, camera.z);
    gl.bindVertexArray(islandVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, islandInstanceBuf);
    gl.bufferData(gl.ARRAY_BUFFER, islands, gl.DYNAMIC_DRAW);
    gl.drawElementsInstanced(
      gl.TRIANGLES,
      islandMesh.idx.length,
      gl.UNSIGNED_SHORT,
      0,
      islands.length / 8,
    );

    // Blob shadow under the player.
    if (shadow && shadow.alpha > 0.01) {
      gl.useProgram(progs.shadow);
      gl.uniformMatrix4fv(U.shadow.u_vp, false, vp);
      gl.uniform3f(U.shadow.u_center, shadow.x, shadow.y, shadow.z);
      gl.uniform2f(U.shadow.u_scale, shadow.scale, shadow.scale);
      gl.uniform1f(U.shadow.u_alpha, shadow.alpha);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      gl.bindVertexArray(shadowVao);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    }

    // Clouds: transparent, under the islands.
    gl.useProgram(progs.cloud);
    gl.uniformMatrix4fv(U.cloud.u_vp, false, vp);
    gl.uniform1f(U.cloud.u_time, time);
    gl.uniform3f(U.cloud.u_right, right[0], right[1], right[2]);
    gl.uniform3f(U.cloud.u_up, upX, upY, upZ);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    gl.bindVertexArray(cloudVao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, state.cloudCount ?? 0);
    gl.depthMask(true);
    gl.disable(gl.BLEND);

    // Shards.
    gl.useProgram(progs.shard);
    gl.uniformMatrix4fv(U.shard.u_vp, false, vp);
    gl.uniform1f(U.shard.u_time, time);
    gl.uniform3f(U.shard.u_fog, FOG_COLOR[0], FOG_COLOR[1], FOG_COLOR[2]);
    gl.bindVertexArray(shardVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, shardInstanceBuf);
    gl.bufferData(gl.ARRAY_BUFFER, shards, gl.DYNAMIC_DRAW);
    gl.drawElementsInstanced(
      gl.TRIANGLES,
      octa.idx.length,
      gl.UNSIGNED_SHORT,
      0,
      shards.length / 8,
    );

    // Shard halos: additive.
    gl.useProgram(progs.halo);
    gl.uniformMatrix4fv(U.halo.u_vp, false, vp);
    gl.uniform1f(U.halo.u_time, time);
    gl.uniform3f(U.halo.u_right, right[0], right[1], right[2]);
    gl.uniform3f(U.halo.u_up, upX, upY, upZ);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.depthMask(false);
    gl.bindVertexArray(haloVao);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, shards.length / 8);

    // Particles.
    gl.useProgram(progs.particle);
    gl.uniformMatrix4fv(U.particle.u_vp, false, vp);
    gl.uniform1f(
      U.particle.u_pxScale,
      canvas.height / (2 * Math.tan((camera.fov ?? state.fov) / 2)),
    );
    gl.bindVertexArray(particleVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, particleBuf);
    gl.bufferData(gl.ARRAY_BUFFER, particles.data, gl.DYNAMIC_DRAW);
    gl.drawArrays(gl.POINTS, 0, particles.data.length / 7);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(null);
  }

  return {
    gl,
    canvas,
    particles,
    setClouds,
    resize,
    draw,
    get webgl() {
      return 'WebGL2';
    },
  };
}
