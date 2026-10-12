// Optional WebGPU sky pass: a second canvas sits behind the WebGL canvas and
// renders the same procedural sunset in WGSL. When active, the GL sky is
// skipped and the GL canvas clears to transparent.

const WGSL = `
struct SkyOut {
  @builtin(position) pos: vec4f,
  @location(0) uv: vec2f,
};

@vertex fn vs(@builtin(vertex_index) i: u32) -> SkyOut {
  var pts = array<vec2f, 3>(vec2f(-1.0, -1.0), vec2f(3.0, -1.0), vec2f(-1.0, 3.0));
  var out: SkyOut;
  let p = pts[i];
  out.pos = vec4f(p.x, p.y, 0.9999, 1.0);
  out.uv = p * 0.5 + vec2f(0.5, 0.5);
  return out;
}

struct Camera {
  fwd: vec3f,
  tanFov: f32,
  right: vec3f,
  aspect: f32,
  up: vec3f,
  time: f32,
}
@group(0) @binding(0) var<uniform> cam: Camera;

fn hash3(p3: vec3f) -> f32 {
  var p = fract(p3 * vec3f(0.3183099, 0.3183099, 0.3183099) + vec3f(0.1, 0.2, 0.3));
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
fn noise2(p: vec2f) -> f32 {
  let i = floor(p);
  let f = fract(p);
  let u = f * f * (3.0 - 2.0 * f);
  let a = hash3(vec3f(i, 1.0));
  let b = hash3(vec3f(i + vec2f(1.0, 0.0), 1.0));
  let c = hash3(vec3f(i + vec2f(0.0, 1.0), 1.0));
  let d = hash3(vec3f(i + vec2f(1.0, 1.0), 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
fn fbm(p0: vec2f) -> f32 {
  var p = p0;
  var v = 0.0;
  var a = 0.55;
  for (var i = 0; i < 4; i++) {
    v += a * noise2(p);
    p = p * 2.13 + vec2f(31.7, 11.3);
    a *= 0.5;
  }
  return v;
}

@fragment fn fs(@location(0) uv: vec2f) -> @location(0) vec4f {
  let ndc = (uv - vec2f(0.5, 0.5)) * 2.0;
  let dir = normalize(cam.fwd + cam.right * (ndc.x * cam.tanFov * cam.aspect) + cam.up * (ndc.y * cam.tanFov));
  let sun = vec3f(0.55, 0.28, -0.79);
  let top = vec3f(0.19, 0.12, 0.34);
  let mid = vec3f(0.55, 0.28, 0.46);
  let horizon = vec3f(0.98, 0.55, 0.28);

  let h = clamp(dir.y, -1.0, 1.0);
  var sky = mix(horizon, mid, smoothstep(-0.02, 0.28, h));
  sky = mix(sky, top, smoothstep(0.18, 0.75, h));
  sky = mix(vec3f(0.24, 0.12, 0.3), sky, smoothstep(-0.35, 0.0, h));

  let sunD = max(dot(dir, sun), 0.0);
  sky += vec3f(1.0, 0.55, 0.25) * pow(sunD, 90.0) * 1.6;
  sky += vec3f(1.0, 0.45, 0.2) * pow(sunD, 7.0) * 0.45;
  sky += vec3f(1.0, 0.7, 0.4) * pow(sunD, 2.2) * 0.16;

  let starMask = smoothstep(0.12, 0.6, h) * (1.0 - pow(sunD, 2.0));
  let cell = floor(dir * 90.0);
  let star = step(0.996, hash3(cell));
  let twinkle = 0.6 + 0.4 * sin(cam.time * 2.5 + hash3(cell + vec3f(7.0)) * 40.0);
  sky += vec3f(0.9, 0.9, 1.0) * star * twinkle * starMask * 0.9;

  if (h > -0.05 && h < 0.5) {
    let cp = dir.xz / max(dir.y + 0.28, 0.05);
    let clouds = fbm(cp * 0.9 + vec2f(cam.time * 0.008, 0.0));
    let band = smoothstep(0.55, 0.8, clouds) * (1.0 - smoothstep(0.05, 0.45, h));
    let cloudCol = mix(vec3f(1.0, 0.62, 0.45), vec3f(0.45, 0.22, 0.42), smoothstep(0.0, 0.5, h));
    sky = mix(sky, cloudCol, band * 0.55);
  }
  return vec4f(sky, 1.0);
}
`;

export async function createWebgpuSky(canvas) {
  if (!globalThis.navigator?.gpu) return null;
  let device;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return null;
    device = await adapter.requestDevice();
  } catch {
    return null;
  }
  const context = canvas.getContext('webgpu');
  if (!context) return null;
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: 'opaque' });

  const module = device.createShaderModule({ code: WGSL });
  const pipeline = device.createRenderPipeline({
    layout: 'auto',
    vertex: { module, entryPoint: 'vs' },
    fragment: { module, entryPoint: 'fs', targets: [{ format }] },
    primitive: { topology: 'triangle-list' },
  });
  const uniformBuffer = device.createBuffer({
    size: 48,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const bindGroup = device.createBindGroup({
    layout: pipeline.getBindGroupLayout(0),
    entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
  });
  const uniforms = new Float32Array(12);

  function resize() {
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2.5);
    const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }
  }

  function draw({ time, camera }) {
    resize();
    const cp = Math.cos(camera.pitch);
    const fx = -Math.sin(camera.yaw) * cp;
    const fy = Math.sin(camera.pitch);
    const fz = -Math.cos(camera.yaw) * cp;
    const aspect = canvas.width / canvas.height;
    uniforms.set([
      fx,
      fy,
      fz,
      Math.tan(camera.fov / 2),
      Math.cos(camera.yaw),
      0,
      -Math.sin(camera.yaw),
      aspect,
      -Math.sin(camera.yaw) * Math.sin(camera.pitch),
      Math.cos(camera.pitch),
      -Math.cos(camera.yaw) * Math.sin(camera.pitch),
      time,
    ]);
    device.queue.writeBuffer(uniformBuffer, 0, uniforms);
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: context.getCurrentTexture().createView(),
          loadOp: 'clear',
          storeOp: 'store',
          clearValue: { r: 0, g: 0, b: 0, a: 1 },
        },
      ],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bindGroup);
    pass.draw(3);
    pass.end();
    device.queue.submit([encoder.finish()]);
  }

  return { draw, label: 'WebGPU' };
}
