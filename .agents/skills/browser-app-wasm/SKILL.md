---
name: browser-app-wasm
description: How to make apps in this repository fast with WebAssembly - choosing hot paths, a zero-dependency Rust no_std crate built deterministically into baseline and SIMD modules, feature-detected loading, zero-copy typed-array interfaces, fixed-step simulation loops, Workers, threads under COOP/COEP, size and frame budgets, and cross-engine tests. Use when an app simulates, solves, or processes anything per frame, or when it feels slow.
---

# Browser app WebAssembly

Reference implementation: the `baked-mochocho` batter simulation (`wasm/apps/baked-mochocho/`
Rust crate, `scripts/build-app-wasm.sh`, `public_html/baked-mochocho/js/sim.js` loader and
wrapper). The `tsumiki` app uses the vendored Rapier physics engine
(`public_html/tsumiki/vendor/`), an example of a licensed third-party WASM build.
For the site's WASM probes and toolchain profiles see [docs/webassembly.md](../../../docs/webassembly.md)
and the `maintaining-web-playground` skill.

## Decide what goes into WebAssembly

- Move work that is numeric, loop-heavy, and runs every frame or on large data: physics,
  fluid/heat/cellular grids, pathfinding, procedural generation, image or audio DSP, solvers.
- Keep DOM, input, WebGPU/WebGL calls, and orchestration in JavaScript.
- Measure first: time the JS version with `performance.now()`; WebAssembly must earn its place
  with a measured gain or by enabling a larger, richer simulation.

## Crate layout and build

- One crate per app at `wasm/apps/<app>/`, `#![no_std]`, zero dependencies by default (any
  crate dependency needs a license check and a `THIRD_PARTY_NOTICES.md` entry), committed
  `Cargo.lock`, release profile with `opt-level = 3`, `lto = true`, `codegen-units = 1`,
  `panic = "abort"`.
- Static memory: fixed-size arrays in a struct, no allocator, so there is no `memory.grow`
  and typed-array views never detach. If growth is unavoidable, re-create views after every call
  that can grow memory.
- Export plain `extern "C"` functions taking and returning numbers; expose buffer pointers and
  lengths so JavaScript builds zero-copy `Float32Array`/`Uint16Array` views (f16 halves are a
  good format for data textures uploaded straight to the GPU).
- Build with the pinned toolchain through `scripts/build-app-wasm.sh` (currently Rust 1.99.0,
  `wasm32-unknown-unknown`, `--locked`, `--remap-path-prefix` for reproducible bytes). Extend
  the script for a new app instead of writing a second build path, and produce two outputs:
  baseline and `-C target-feature=+simd128`.
- Commit the `.wasm` outputs next to the app (`public_html/<app>/wasm/`); rebuilding must give
  identical bytes. Document the rebuild command in `docs/<app>.md`.

## Loading

- Feature-detect SIMD with `WebAssembly.validate()` on a tiny SIMD test module and load the
  matching file; `webassembly` is required, `wasm-simd` optional.
- Use `WebAssembly.instantiateStreaming(fetch(url))` and fall back to `instantiate()` on an
  `ArrayBuffer` when streaming fails. The CSP allows compilation through
  `'wasm-unsafe-eval'`; never add `'unsafe-eval'`.
- Show load progress if it can exceed one second, and keep the module small (target well under
  1 MB; check `ls -l` in the PR).

## Runtime loop

- Fixed timestep simulation (for example 120 Hz) with an accumulator fed by measured
  `requestAnimationFrame` deltas, clamped after tab switches; render with interpolation.
- Cross the JS/WASM boundary a few times per frame, not per element: batch inputs into a
  shared buffer, call one `step(n)`, read results through views.
- Keep a JavaScript-side debug readout (`?debug=1`) of step cost and frame time; adapt quality
  (grid resolution, substeps, particles) from measurements.
- Move long tasks to a module Worker (`new Worker(url, { type: 'module' })`, same-origin) and
  transfer `ArrayBuffer`s; combine with `OffscreenCanvas` when rendering can move too.
- WebAssembly threads need `SharedArrayBuffer`, which needs cross-origin isolation (COOP +
  COEP). The site sends those headers only for specific paths; adding an app path changes
  `public_html/_headers`, `native/headers.json`, and their lock tests, and COEP blocks
  non-CORP subresources. Only do it when the measured gain justifies it, and keep a
  single-thread fallback.
- Use deterministic seeded PRNGs inside the simulation (seed from `crypto.getRandomValues`)
  so tests and replays are reproducible.

## Verification

- Unit tests (`node --test`) load the built `.wasm` directly and check invariants
  (conservation, bounds, determinism for a seed, SIMD and baseline modules agree).
- E2E in all engines asserts the module loaded (debug handle or data attribute) and the core
  loop advances. Servo has no `SharedArrayBuffer`, so thread paths must degrade there.
- Profile on a throttled CPU in Chromium DevTools and report frame-time numbers in the PR.
