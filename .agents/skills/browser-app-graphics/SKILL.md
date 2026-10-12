---
name: browser-app-graphics
description: How to build high-fidelity real-time graphics for apps in this repository - WebGPU first with a WebGL2 fallback that renders the same scene, procedural assets, lighting/material/post-processing recipes, adaptive resolution for iPhone, device-loss recovery, CSP-safe shader loading, and screenshot/E2E verification. Use when an app draws a scene, game, visualization, or animated canvas.
---

# Browser app graphics

Goal: visuals that look premium on a phone, run at a steady frame rate, and never leave a
user with a blank canvas. Reference implementations: `public_html/baked-mochocho/js/render/`
(`scene.js` shared scene model, `webgpu.js`, `webgl2.js`) and `public_html/tsumiki/js/`
(`renderer.js` WebGL2, `renderer-webgpu.js` WebGPU sky and effects).

## Backend strategy

1. Put scene state, camera, palette, and animation curves in a backend-neutral module
   (`scene.js`). Renderers only translate that model into draw calls, so both backends show the
   same picture and unit tests can cover the model without a GPU.
2. Try WebGPU: `navigator.gpu?.requestAdapter()` can return `null` and `requestDevice()` can
   reject; treat both as "fall back", not as an error. Prefer
   `navigator.gpu.getPreferredCanvasFormat()`, `alphaMode: 'premultiplied'` only when the canvas
   is composited over UI.
3. Fall back to WebGL2 (`canvas.getContext('webgl2', { antialias, alpha, powerPreference })`).
   Use WebGL1 or Canvas 2D only when the app is still meaningful there.
4. Declare `webgl` as required only if the app cannot work without it; `webgpu` is optional.
5. Expose the chosen backend on `document.body.dataset.renderer` for E2E tests and show it in
   a debug overlay (`?debug=1`).
6. Recover from loss: handle `GPUDevice.lost` and `webglcontextlost` /
   `webglcontextrestored` (call `preventDefault()` on lost), rebuild resources from the scene
   model, and fall back from WebGPU to WebGL2 if the device cannot be recreated.

## Making it beautiful

Work from a written art direction (palette roles from `browser-app-ux`, mood, lighting
reference described in words, never a copied artwork). Techniques that pay off on mobile GPUs:

- **Lighting**: physically motivated shading (Lambert/GGX-lite), hemisphere ambient, rim light
  for silhouettes, baked or analytic soft shadows (blob, SDF, or screen-space contact) instead
  of large shadow maps.
- **Materials**: procedural textures in shaders (value/simplex noise, fbm, domain warping,
  voronoi) for dough, wood, metal, sky, water; vary roughness and albedo with noise so
  surfaces do not look flat. A data texture from the simulation (as `baked-mochocho` does with
  its browning field) beats a static texture.
- **Atmosphere**: gradient skies driven by state (time, altitude, score), fog with height
  falloff, stars and clouds as procedural quads.
- **Effects**: instanced particles for feedback bursts (confetti, steam, sparks), squash and
  stretch, eased camera moves, screen shake gated by `prefers-reduced-motion`.
- **Post-processing** (WebGPU path first, simplified on WebGL2): HDR in `rgba16float`, bloom
  from a downsampled bright pass, ACES-style tone mapping, vignette, subtle grain, FXAA when
  MSAA is unavailable. Output in sRGB; keep colors consistent between backends.
- **Compute** (WebGPU): particle and fluid updates in compute shaders; on WebGL2 move the same
  work to WebAssembly or transform feedback.
- Draw UI text and controls in the DOM, not in the canvas, so they stay crisp, accessible, and
  translatable.

## Performance budget

- Target 60 fps (16.7 ms) on a recent iPhone and never below 30 fps on a mid-range one.
- Cap DPR (`Math.min(devicePixelRatio, 2..3)`) and scale render resolution adaptively from a
  smoothed frame time; drop expensive passes before dropping resolution below about 0.5.
- Do one `requestAnimationFrame` loop for the whole app; pause it on `visibilitychange`.
- Avoid per-frame allocations: preallocate typed arrays and uniform buffers, write with
  `queue.writeBuffer` / `bufferSubData`, batch with instancing, and keep draw calls low.
- Compile pipelines and shaders during boot behind a progress indicator (feedback budget:
  1-10 s needs progress). Use `createRenderPipelineAsync` and `KHR_parallel_shader_compile`
  where available.
- Size canvases with `ResizeObserver` (`devicePixelContentBoxSize` where supported) and keep the
  aspect ratio correct in both orientations.

## CSP and licensing constraints

- Shader source lives in JavaScript modules as template strings or in same-origin files
  fetched with `fetch()`; never use `eval`, `new Function`, `blob:` scripts, or inline styles.
- Do not load textures, models, HDRIs, or fonts from other origins. Prefer procedural assets;
  any bundled asset needs a compatible license entered in `THIRD_PARTY_NOTICES.md`.
- `img-src` allows `self` and `data:` only.

## Verification

- Unit-test the backend-neutral scene model (palette, curves, geometry helpers).
- E2E: assert `data-renderer`, a non-blank canvas (sample pixels, or compare luminance
  variance), no console errors, and no CSP violations, in Chromium, WebKit, and Firefox.
- Headless CI runners have no WebGPU adapter: write the WebGPU-specific test to skip with a
  reason when `requestAdapter()` returns `null`. Never loosen assertions to make it pass.
- Headless WebKit uses a software rasterizer that can show moire or snow artifacts in WebGL
  scenes; compare with Chromium before debugging shaders.
- Take screenshots at desktop and iPhone portrait/landscape sizes and inspect them by eye.
  Report that real-GPU and physical-iPhone rendering were not verified unless they were.
