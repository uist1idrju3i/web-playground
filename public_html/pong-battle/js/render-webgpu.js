// WebGPU renderer for the backend-neutral scene model. Mirrors the
// WebGL2 sprite batch so both backends draw the same picture.
export async function createWebGPURenderer(canvas) {
  if (!navigator.gpu?.requestAdapter) return null;
  const adapter = await navigator.gpu.requestAdapter().catch(() => null);
  if (!adapter) return null; // fallback, not an error
  const device = await adapter.requestDevice();
  const ctx = canvas.getContext('webgpu');
  if (!ctx) return null;
  const format = navigator.gpu.getPreferredCanvasFormat();
  ctx.configure({ device, format, alphaMode: 'opaque' });

  const shader = device.createShaderModule({
    code: `
struct Inst { rect: vec4f, color: vec4f, kind: vec2f, pad: vec2f };
struct Out {
  @builtin(position) pos: vec4f,
  @location(0) color: vec4f,
  @location(1) local: vec2f,
  @location(2) @interpolate(flat) kind: vec2f,
};
@group(0) @binding(0) var<uniform> view: vec2f;
@group(0) @binding(1) var<storage, read> insts: array<Inst>;
@vertex fn vs(@builtin(vertex_index) vi: u32, @builtin(instance_index) ii: u32) -> Out {
  var corners = array<vec2f,4>(vec2f(-0.5,-0.5), vec2f(0.5,-0.5), vec2f(-0.5,0.5), vec2f(0.5,0.5));
  let c = corners[vi];
  let inst = insts[ii];
  let world = inst.rect.xy + c * inst.rect.zw;
  var o: Out;
  o.pos = vec4f(world.x / view.x * 2.0 - 1.0, 1.0 - world.y / view.y * 2.0, 0.0, 1.0);
  o.color = inst.color;
  o.local = c;
  o.kind = inst.kind;
  return o;
}
@fragment fn fs(o: Out) -> @location(0) vec4f {
  let d = length(o.local) * 2.0;
  var a = o.color.a;
  var col = o.color.rgb;
  if (o.kind.x < 0.5) { }
  else if (o.kind.x < 1.5) { if (d > 1.0) { discard; } a *= smoothstep(1.0, 0.82, d); }
  else if (o.kind.x < 2.5) { a *= exp(-d * d * 3.0); }
  else if (o.kind.x < 3.5) { a *= smoothstep(0.0, 0.35, 1.0 - abs(o.local.x) * 2.0); }
  return vec4f(col, a);
}`,
  });

  const uniform = device.createBuffer({
    size: 8,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const instBuf = device.createBuffer({
    size: 12 * 4 * 4096,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const bindLayout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX, buffer: { type: 'uniform' } },
      { binding: 1, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
    ],
  });
  const pipeline = device.createRenderPipeline({
    layout: device.createPipelineLayout({ bindGroupLayouts: [bindLayout] }),
    vertex: { module: shader, entryPoint: 'vs' },
    fragment: {
      module: shader,
      entryPoint: 'fs',
      targets: [
        {
          format,
          blend: {
            color: { srcFactor: 'src-alpha', dstFactor: 'one', operation: 'add' },
            alpha: { srcFactor: 'one', dstFactor: 'one', operation: 'add' },
          },
        },
      ],
    },
    primitive: { topology: 'triangle-strip', stripIndexFormat: undefined },
  });
  const bind = device.createBindGroup({
    layout: bindLayout,
    entries: [
      { binding: 0, resource: { buffer: uniform } },
      { binding: 1, resource: { buffer: instBuf } },
    ],
  });

  const KIND = { rect: 0, circle: 1, glow: 2, dash: 3, line: 4 };
  let lost = false;
  device.lost.then(() => {
    lost = true;
  });

  function render(scene, shake) {
    if (lost) return;
    const { width, height } = canvas;
    const sx = shake?.x ?? 0;
    const sy = shake?.y ?? 0;
    const data = [];
    const push = (s) => {
      data.push(
        s.x + sx,
        s.y + sy,
        s.w,
        s.h,
        s.color[0],
        s.color[1],
        s.color[2],
        s.color[3],
        KIND[s.type] ?? 0,
        s.extra ?? 0,
        0,
        0,
      );
    };
    const b = scene.bgBottom;
    push({
      type: 'glow',
      x: width / 2,
      y: height * 0.1,
      w: width * 2,
      h: height * 1.1,
      color: [scene.bgTop[0] - b[0], scene.bgTop[1] - b[1], scene.bgTop[2] - b[2], 0.9],
    });
    for (const s of scene.sprites) {
      if (s.type === 'line') {
        const len = Math.hypot(s.w, s.h);
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
    const count = Math.min(data.length / 12, 4096);
    device.queue.writeBuffer(uniform, 0, new Float32Array([width, height]));
    device.queue.writeBuffer(instBuf, 0, new Float32Array(data.slice(0, count * 12)));
    const enc = device.createCommandEncoder();
    const pass = enc.beginRenderPass({
      colorAttachments: [
        {
          view: ctx.getCurrentTexture().createView(),
          clearValue: { r: b[0], g: b[1], b: b[2], a: 1 },
          loadOp: 'clear',
          storeOp: 'store',
        },
      ],
    });
    pass.setPipeline(pipeline);
    pass.setBindGroup(0, bind);
    pass.draw(4, count);
    pass.end();
    device.queue.submit([enc.finish()]);
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
    kind: 'webgpu',
    render,
    resize,
    get lost() {
      return lost;
    },
  };
}
