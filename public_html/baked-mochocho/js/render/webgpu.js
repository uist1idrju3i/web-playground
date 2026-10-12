import { shader } from './wgsl.js';
import { gridIndices, packUniforms } from './scene.js';

const MAX_PARTICLES = 4096;
const SAMPLES = 4;

export async function createWebGPURenderer(canvas, { grid, mold, border, present = true }) {
  const adapter = await navigator.gpu?.requestAdapter({ powerPreference: 'high-performance' });
  if (!adapter) throw new Error('No WebGPU adapter.');
  const device = await adapter.requestDevice();
  const context = canvas.getContext('webgpu');
  if (!context) throw new Error('No WebGPU canvas context.');
  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({
    device,
    format,
    alphaMode: 'opaque',
  });
  device.pushErrorScope('validation');
  const module = device.createShaderModule({ code: shader });
  const info = await module.getCompilationInfo();
  const errors = info.messages.filter((m) => m.type === 'error');
  if (errors.length)
    throw new Error(`WGSL: ${errors.map((m) => `${m.lineNum}:${m.message}`).join('; ')}`);

  const { indices } = gridIndices(grid.w, grid.h, border);
  const indexBuffer = device.createBuffer({
    size: indices.byteLength,
    usage: GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(indexBuffer, 0, indices);
  const uniformBuffer = device.createBuffer({
    size: 256,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const particleBuffer = device.createBuffer({
    size: MAX_PARTICLES * 32,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  const tex = (fmt) =>
    device.createTexture({
      size: [grid.w, grid.h],
      format: fmt,
      usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST,
    });
  const fieldA = tex('rgba16float');
  const fieldB = tex('rgba16float');
  const moldTex = tex('r32float');
  device.queue.writeTexture({ texture: moldTex }, mold, { bytesPerRow: grid.w * 4 }, [
    grid.w,
    grid.h,
  ]);
  const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
  const layout = device.createBindGroupLayout({
    entries: [
      { binding: 0, visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT, buffer: {} },
      {
        binding: 1,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        texture: { sampleType: 'float' },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        texture: { sampleType: 'float' },
      },
      {
        binding: 3,
        visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
        texture: { sampleType: 'unfilterable-float' },
      },
      { binding: 4, visibility: GPUShaderStage.FRAGMENT, sampler: {} },
      { binding: 5, visibility: GPUShaderStage.VERTEX, buffer: { type: 'read-only-storage' } },
    ],
  });
  const bindGroup = device.createBindGroup({
    layout,
    entries: [
      { binding: 0, resource: { buffer: uniformBuffer } },
      { binding: 1, resource: fieldA.createView() },
      { binding: 2, resource: fieldB.createView() },
      { binding: 3, resource: moldTex.createView() },
      { binding: 4, resource: sampler },
      { binding: 5, resource: { buffer: particleBuffer } },
    ],
  });
  const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts: [layout] });
  const pipeline = (vs, fs, { blend = undefined, depthWrite = true } = {}) =>
    device.createRenderPipeline({
      layout: pipelineLayout,
      vertex: { module, entryPoint: vs },
      fragment: { module, entryPoint: fs, targets: [{ format, blend }] },
      primitive: { topology: 'triangle-list', cullMode: 'none' },
      depthStencil: {
        format: 'depth24plus',
        depthWriteEnabled: depthWrite,
        depthCompare: 'less-equal',
      },
      multisample: { count: SAMPLES },
    });
  const premultiplied = {
    color: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
    alpha: { srcFactor: 'one', dstFactor: 'one-minus-src-alpha' },
  };
  const pipelines = {
    plate: pipeline('plateVS', 'plateFS'),
    batter: pipeline('batterVS', 'batterFS'),
    background: pipeline('bgVS', 'bgFS', { depthWrite: false }),
    particle: pipeline('particleVS', 'particleFS', { blend: premultiplied, depthWrite: false }),
  };
  const validation = await device.popErrorScope();
  if (validation) throw new Error(`WebGPU validation: ${validation.message}`);
  let lost = false;
  device.addEventListener('uncapturederror', (event) =>
    console.warn('WebGPU error:', event.error.message),
  );
  device.lost.then((info) => {
    lost = true;
    console.warn('WebGPU device lost:', info.reason, info.message);
  });

  let msaa = null;
  let depth = null;
  const ensureTargets = () => {
    if (msaa && msaa.width === canvas.width && msaa.height === canvas.height) return;
    msaa?.destroy();
    depth?.destroy();
    const size = [canvas.width, canvas.height];
    msaa = device.createTexture({
      size,
      format,
      sampleCount: SAMPLES,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
    depth = device.createTexture({
      size,
      format: 'depth24plus',
      sampleCount: SAMPLES,
      usage: GPUTextureUsage.RENDER_ATTACHMENT,
    });
  };
  const uniforms = new Float32Array(64);
  const rowBytes = grid.w * 8;

  return {
    name: 'WebGPU',
    adapter,
    zeroToOne: true,
    get lost() {
      return lost;
    },
    render(camera, frame) {
      if (present) draw(camera, frame);
    },
    // Test-only readback: draws one frame into an offscreen texture and reads it back.
    async snapshot(camera, frame) {
      const target = device.createTexture({
        size: [canvas.width, canvas.height],
        format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC,
      });
      draw(camera, frame, target);
      const bytesPerRow = Math.ceil((target.width * 4) / 256) * 256;
      const buffer = device.createBuffer({
        size: bytesPerRow * target.height,
        usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
      });
      const encoder = device.createCommandEncoder();
      encoder.copyTextureToBuffer({ texture: target }, { buffer, bytesPerRow }, [
        target.width,
        target.height,
      ]);
      device.queue.submit([encoder.finish()]);
      await buffer.mapAsync(GPUMapMode.READ);
      const rows = new Uint8Array(buffer.getMappedRange());
      const pixels = new Uint8ClampedArray(target.width * target.height * 4);
      const bgra = format.startsWith('bgra');
      for (let y = 0; y < target.height; y += 1) {
        for (let x = 0; x < target.width; x += 1) {
          const i = y * bytesPerRow + x * 4;
          const o = (y * target.width + x) * 4;
          pixels[o] = rows[i + (bgra ? 2 : 0)];
          pixels[o + 1] = rows[i + 1];
          pixels[o + 2] = rows[i + (bgra ? 0 : 2)];
          pixels[o + 3] = 255;
        }
      }
      buffer.destroy();
      target.destroy();
      return { width: target.width, height: target.height, pixels };
    },
    destroy() {
      device.destroy();
    },
  };

  function draw(camera, frame, target = context.getCurrentTexture()) {
    ensureTargets();
    packUniforms(uniforms, camera, frame);
    device.queue.writeBuffer(uniformBuffer, 0, uniforms);
    device.queue.writeTexture({ texture: fieldA }, frame.fieldA, { bytesPerRow: rowBytes }, [
      grid.w,
      grid.h,
    ]);
    device.queue.writeTexture({ texture: fieldB }, frame.fieldB, { bytesPerRow: rowBytes }, [
      grid.w,
      grid.h,
    ]);
    const count = Math.min(MAX_PARTICLES, frame.particleCount);
    if (count > 0) device.queue.writeBuffer(particleBuffer, 0, frame.particles, 0, count * 8);
    const encoder = device.createCommandEncoder();
    const pass = encoder.beginRenderPass({
      colorAttachments: [
        {
          view: msaa.createView(),
          resolveTarget: target.createView(),
          clearValue: { r: 0.03, g: 0.02, b: 0.015, a: 1 },
          loadOp: 'clear',
          storeOp: 'discard',
        },
      ],
      depthStencilAttachment: {
        view: depth.createView(),
        depthClearValue: 1,
        depthLoadOp: 'clear',
        depthStoreOp: 'discard',
      },
    });
    pass.setBindGroup(0, bindGroup);
    pass.setIndexBuffer(indexBuffer, 'uint32');
    pass.setPipeline(pipelines.plate);
    pass.drawIndexed(indices.length);
    pass.setPipeline(pipelines.batter);
    pass.drawIndexed(indices.length, 2);
    pass.setPipeline(pipelines.background);
    pass.draw(3);
    if (count > 0) {
      pass.setPipeline(pipelines.particle);
      pass.draw(6, count);
    }
    pass.end();
    device.queue.submit([encoder.finish()]);
  }
}
