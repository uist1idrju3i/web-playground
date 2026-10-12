// WebGPU backend. Mirrors the WebGL2 scene: fullscreen background triangle,
// a quad program shared by cord + ball glow, and instanced spark streaks.

import { INST_F32, WORLD, viewTransform } from './scene.js';

const WGSL = /* wgsl */ `
struct U {
  res: vec2f, time: f32, glow: f32,
  scale: vec2f, cam: vec2f,
  ball: vec4f,      // x, y, glowR, heat
  misc: vec4f,      // kind, swell, lit, w
  line: vec4f,      // x1,y1,x2,y2 (cord)
};
@group(0) @binding(0) var<uniform> u : U;

fn worldToClip(w: vec2f) -> vec4f { return vec4f((w - u.cam) * u.scale, 0., 1.); }
fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1, 311.7))) * 43758.5453); }
fn blackbody(h: f32) -> vec3f {
  let c = mix(vec3f(0.30,0.05,0.01), vec3f(1.0,0.42,0.05), clamp(h*1.3,0.,1.));
  return mix(c, vec3f(1.0,0.90,0.62), smoothstep(0.6,1.0,h));
}

@vertex fn vsBg(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let p = vec2f(f32((i << 1u) & 2u), f32(i & 2u)) * 2. - 1.;
  return vec4f(p, 0., 1.);
}
@fragment fn fsBg(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  let vUv = pos.xy / u.res;
  let w = vec2f((vUv.x*2.-1.)/u.scale.x + u.cam.x, (1.-vUv.y)*2.-1.);
  let wpos = vec2f((vUv.x*2.-1.)/u.scale.x, ((1.-vUv.y)*2.-1.)/u.scale.y) + u.cam;
  let v = clamp(-wpos.y/420.+0.35, 0., 1.);
  var col = mix(vec3f(0.012,0.010,0.030), vec3f(0.028,0.022,0.070), pow(1.-v,1.5));
  col += vec3f(0.06,0.028,0.006) * smoothstep(-280.,-340.,wpos.y);
  col += (hash(vUv*u.res+u.time)-0.5)*0.012;
  let d = distance(wpos, u.ball.xy);
  col += vec3f(1.0,0.45,0.12) * u.glow * 900.0 / (900.0 + d*d);
  let _ = w;
  return vec4f(col, 1.);
}

@vertex fn vsQuad(@builtin(vertex_index) i: u32) -> @builtin(position) vec4f {
  let q = vec2f(f32(i & 1u) * 2. - 1., f32(i >> 1u) * 2. - 1.);
  // kind 0 = ball glow quad; kind 1 = cord (u.line + u.misc.w width, q.y side)
  if (u.misc.x > 0.5) {
    let a = u.line.xy; let b = u.line.zw;
    let t = normalize(b - a); let n = vec2f(-t.y, t.x);
    let w = mix(a, b, q.x * 0.5 + 0.5) + n * (q.y * u.misc.w);
    return worldToClip(w);
  }
  return worldToClip(u.ball.xy + q * u.ball.z);
}
@fragment fn fsQuad(@builtin(position) pos: vec4f) -> @location(0) vec4f {
  // kind 1: flat cord colour
  if (u.misc.x > 0.5) {
    let col = mix(vec3f(0.16,0.14,0.12), vec3f(0.5,0.35,0.16), u.misc.z);
    return vec4f(col, 1.);
  }
  // reconstruct quad-local coords is unnecessary: glow uses radial falloff
  // around the ball centre in world space via screen distance.
  return vec4f(0., 0., 0., 0.);
}

struct StreakOut { @builtin(position) p: vec4f, @location(0) q: vec2f, @location(1) hg: vec2f };
@group(0) @binding(1) var<storage, read> inst : array<vec4f>; // 2 vec4 per instance
@vertex fn vsStreak(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> StreakOut {
  let a = inst[ii * 2u]; let b = inst[ii * 2u + 1u];
  let q = vec2f(f32(vi & 1u) * 2. - 1., f32(vi >> 1u) * 2. - 1.);
  let t = a.zw; let n = vec2f(-t.y, t.x);
  let w = a.xy + t * (q.x * b.x * 0.5) + n * (q.y * b.y * 0.5);
  var o: StreakOut;
  o.p = worldToClip(w); o.q = q; o.hg = b.zw;
  return o;
}
@fragment fn fsStreak(in: StreakOut) -> @location(0) vec4f {
  let along = in.q.x; let across = abs(in.q.y);
  let core = smoothstep(1.0, 0.0, across) * smoothstep(1.0, 0.6, abs(along));
  let halo = exp(-across*across*3.0) * exp(-along*along*1.2);
  let a = (core*2.2 + halo*0.85) * clamp(in.hg.x*1.4, 0., 1.);
  return vec4f(blackbody(in.hg.x) * a, a);
}
`;

// The ball glow needs radial coordinates; use a separate tiny pipeline so
// fragment math stays exact (quad-local uv from a second vertex output).
const WGSL_GLOW = /* wgsl */ `
struct U {
  res: vec2f, time: f32, glow: f32,
  scale: vec2f, cam: vec2f,
  ball: vec4f, misc: vec4f, line: vec4f,
};
@group(0) @binding(0) var<uniform> u : U;
struct Out { @builtin(position) p: vec4f, @location(0) q: vec2f };
@vertex fn vs(@builtin(vertex_index) i: u32) -> Out {
  let q = vec2f(f32(i & 1u) * 2. - 1., f32(i >> 1u) * 2. - 1.);
  var o: Out;
  o.q = q; o.p = vec4f((u.ball.xy + q * u.ball.z - u.cam) * u.scale, 0., 1.);
  return o;
}
@fragment fn fs(in: Out) -> @location(0) vec4f {
  let r = length(in.q);
  let core = smoothstep(0.55,0.12,r);
  let halo = exp(-r*r*2.6);
  var col = mix(vec3f(0.12,0.015,0.0), vec3f(1.0,0.30,0.03), clamp(u.ball.w,0.,1.));
  col = mix(col, vec3f(1.0,0.75,0.38), core*smoothstep(0.3,0.95,u.ball.w));
  var a = (core*0.9 + halo*0.30) * clamp(u.ball.w*1.4,0.,1.);
  a *= 0.85 + 0.15*sin(u.misc.y*40.0);
  return vec4f(col*a, a);
}
`;

export async function createWebGPU(canvas) {
  const gpu = globalThis.navigator?.gpu;
  if (!gpu) throw new Error('WebGPU unavailable');
  const adapter = await gpu.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('WebGPU adapter unavailable');
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  const format = gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'opaque' });

  const module = device.createShaderModule({ code: WGSL });
  const glowModule = device.createShaderModule({ code: WGSL_GLOW });
  const uniform = device.createBuffer({
    size: 80,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const instBuf = device.createBuffer({
    size: 2048 * INST_F32 * 4,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const layout = device.createBindGroupLayout({
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        buffer: { type: 'uniform' },
      },
      { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
    ],
  });
  const bind = device.createBindGroup({
    layout,
    entries: [
      { binding: 0, resource: { buffer: uniform } },
      { binding: 1, resource: { buffer: instBuf } },
    ],
  });
  const pipeLayout = device.createPipelineLayout({ bindGroupLayouts: [layout] });
  const mk = (vs, fs, mod = module, blend = 'add') =>
    device.createRenderPipeline({
      layout: pipeLayout,
      vertex: { module: mod, entryPoint: vs },
      fragment: {
        module: mod,
        entryPoint: fs,
        targets: [
          {
            format,
            blend:
              blend === 'add'
                ? {
                    color: { srcFactor: 'one', dstFactor: 'one' },
                    alpha: { srcFactor: 'one', dstFactor: 'one' },
                  }
                : undefined,
          },
        ],
      },
      primitive: { topology: 'triangle-strip' },
    });
  const bgPipe = mk('vsBg', 'fsBg', module, 'replace');
  const quadPipe = mk('vsQuad', 'fsQuad', module, 'replace');
  const streakPipe = mk('vsStreak', 'fsStreak');
  const glowPipe = mk('vs', 'fs', glowModule);

  const uData = new Float32Array(20);
  let time = 0;

  function writeUniforms(scene, width, height) {
    const vt = viewTransform(width, height);
    uData.set([
      width,
      height,
      time % 1000,
      scene.ambientGlow,
      vt.scaleX,
      vt.scaleY,
      vt.cx,
      vt.cy,
      scene.ball.x,
      scene.ball.y,
      Math.max(2.6, scene.ball.r * 8),
      scene.ball.heat,
    ]);
  }

  function draw(scene, dt) {
    time += dt;
    const dpr = Math.min(2, globalThis.devicePixelRatio || 1);
    const w = Math.max(2, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(2, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      context.configure({ device, format, alphaMode: 'opaque' });
    }
    writeUniforms(scene, w, h);
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: 'clear',
          clearValue: { r: 0, g: 0, b: 0.02, a: 1 },
          storeOp: 'store',
        },
      ],
    });
    pass.setBindGroup(0, bind);

    uData[12] = 0; // kind=bg (unused)
    device.queue.writeBuffer(uniform, 0, uData.subarray(0, 16));
    pass.setPipeline(bgPipe);
    pass.draw(3);

    // Cord: kind=1
    uData[12] = 1;
    uData[13] = 0;
    uData[14] = Math.min(1, scene.ball.heat);
    uData[15] = 0.7;
    uData[16] = 0;
    uData[17] = WORLD.stickTopY;
    uData[18] = scene.ball.x;
    uData[19] = scene.ball.y;
    device.queue.writeBuffer(uniform, 0, uData);
    pass.setPipeline(quadPipe);
    pass.draw(4);

    // Ball glow
    uData[12] = 0;
    uData[13] = scene.ball.swell + time;
    uData[14] = 0;
    uData[15] = 0;
    device.queue.writeBuffer(uniform, 0, uData);
    pass.setPipeline(glowPipe);
    pass.draw(4);

    if (scene.instCount > 0) {
      device.queue.writeBuffer(instBuf, 0, scene.inst.subarray(0, scene.instCount * INST_F32));
      pass.setPipeline(streakPipe);
      pass.draw(4, scene.instCount);
    }
    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  return {
    kind: 'webgpu',
    draw,
    resize() {},
    async snapshot() {
      return canvas.toDataURL('image/png');
    },
  };
}
