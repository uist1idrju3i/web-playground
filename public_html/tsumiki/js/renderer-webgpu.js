// Optional WebGPU sky backdrop rendered behind the WebGL2 canvas. When this
// succeeds, the WebGL renderer skips its own sky pass. Falls back cleanly.
const WGSL = `
struct VSOut { @builtin(position) pos: vec4f, @location(0) uv: vec2f };
@vertex fn vs(@builtin(vertex_index) i: u32) -> VSOut {
  var p = array<vec2f,3>(vec2f(-1.,-1.), vec2f(3.,-1.), vec2f(-1.,3.));
  var o: VSOut;
  o.pos = vec4f(p[i], 0., 1.);
  o.uv = p[i]*0.5+0.5;
  return o;
}
fn hash(p: vec2f) -> f32 { return fract(sin(dot(p, vec2f(127.1,311.7)))*43758.5453); }
fn noise(p: vec2f) -> f32 {
  let i = floor(p); let f = fract(p);
  let u = f*f*(3.-2.*f);
  return mix(mix(hash(i), hash(i+vec2f(1.,0.)), u.x),
             mix(hash(i+vec2f(0.,1.)), hash(i+vec2f(1.,1.)), u.x), u.y);
}
fn fbm(p: vec2f) -> f32 {
  var a = 0.5; var v = 0.; var q = p;
  for (var i = 0; i < 5; i++) { v += a*noise(q); q *= 2.03; a *= 0.5; }
  return v;
}
struct U { t: f32, camY: f32, worldH: f32, pad: f32, res: vec2f, pad2: vec2f };
@group(0) @binding(0) var<uniform> u: U;
@fragment fn fs(in: VSOut) -> @location(0) vec4f {
  let uv = in.uv;
  let wy = uv.y * u.worldH + u.camY - u.worldH*0.5;
  let h = clamp(wy/max(u.worldH,6.)*0.5+0.5, 0., 1.);
  var horizon = mix(vec3f(1.0,0.72,0.42), vec3f(0.85,0.45,0.5), clamp(wy/300.,0.,1.));
  var mid = mix(vec3f(0.45,0.35,0.60), vec3f(0.18,0.22,0.5), clamp(wy/500.,0.,1.));
  var zenith = mix(vec3f(0.10,0.14,0.33), vec3f(0.008,0.012,0.05), clamp(wy/900.,0.,1.));
  var col = mix(horizon, mid, smoothstep(0.,0.45,h));
  col = mix(col, zenith, smoothstep(0.35,1.,h));
  let atmosphere = smoothstep(600.,200.,wy);
  let sun = vec2f(0.62, min(0.55, 0.30 + u.camY*0.0008));
  let d = (uv - sun) * vec2f(u.res.x/max(u.res.y,1.), 1.);
  let sd = length(d);
  col += vec3f(1.,0.85,0.6) * (0.012/(sd+0.012));
  col += vec3f(1.,0.6,0.35) * 0.35 * exp(-sd*3.) * atmosphere;
  let ang = atan2(d.y, d.x);
  let rays = pow(abs(sin(ang*7. + fbm(vec2f(ang*3., u.t*0.05))*2.)), 24.);
  col += vec3f(1.,0.75,0.45) * rays * 0.10 * exp(-sd*1.6) * atmosphere;
  let c1 = fbm(vec2f(uv.x*3. + u.t*0.012 + wy*0.02, uv.y*5.));
  let c2 = fbm(vec2f(uv.x*6. - u.t*0.02, uv.y*9.) + 7.3);
  let clouds = smoothstep(0.55,0.8,c1)*0.5 + smoothstep(0.6,0.85,c2)*0.3;
  let cloudCol = mix(vec3f(1.,0.8,0.7), vec3f(0.9,0.7,0.8), h);
  col = mix(col, cloudCol, clouds * smoothstep(60.,15.,wy) * 0.8);
  col += vec3f(1.,0.75,0.5) * 0.18 * exp(-abs(h-0.16)*14.) * smoothstep(50.,10.,wy);
  let star = step(0.9985, hash(floor(uv*u.res/2.))) * smoothstep(120.,400.,wy);
  col += vec3f(star) * (0.6+0.4*sin(u.t*2.+uv.x*50.));
  return vec4f(col, 1.);
}
`;

export async function initWebgpuSky(canvas) {
  if (!('gpu' in navigator)) return null;
  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) return null;
    const device = await adapter.requestDevice();
    const ctx = canvas.getContext('webgpu');
    const format = navigator.gpu.getPreferredCanvasFormat();
    ctx.configure({ device, format, alphaMode: 'opaque' });
    const module = device.createShaderModule({ code: WGSL });
    const pipeline = device.createRenderPipeline({
      layout: 'auto',
      vertex: { module, entryPoint: 'vs' },
      fragment: { module, entryPoint: 'fs', targets: [{ format }] },
      primitive: { topology: 'triangle-list' },
    });
    const ubuf = device.createBuffer({
      size: 32,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    const bind = device.createBindGroup({
      layout: pipeline.getBindGroupLayout(0),
      entries: [{ binding: 0, resource: { buffer: ubuf } }],
    });
    return {
      render(t, camY, worldH) {
        const dpr = Math.min(devicePixelRatio || 1, 2);
        const w = Math.max(1, Math.floor(canvas.clientWidth * dpr));
        const h = Math.max(1, Math.floor(canvas.clientHeight * dpr));
        if (canvas.width !== w || canvas.height !== h) {
          canvas.width = w;
          canvas.height = h;
        }
        device.queue.writeBuffer(ubuf, 0, new Float32Array([t, camY, worldH, 0, w, h, 0, 0]));
        const enc = device.createCommandEncoder();
        const pass = enc.beginRenderPass({
          colorAttachments: [
            {
              view: ctx.getCurrentTexture().createView(),
              loadOp: 'clear',
              storeOp: 'store',
              clearValue: { r: 0, g: 0, b: 0, a: 1 },
            },
          ],
        });
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bind);
        pass.draw(3);
        pass.end();
        device.queue.submit([enc.finish()]);
      },
    };
  } catch {
    return null;
  }
}
