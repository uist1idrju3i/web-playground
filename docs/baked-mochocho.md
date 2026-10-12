# Baked Mochocho

`/baked-mochocho/` is a griddle-cake game that combines several browser technologies in one app. All graphics, music, and sound effects are generated at runtime; the app loads no images, audio files, fonts, or third-party code.

## How to play

1. Brush oil over the plate (**Oil**).
2. Hold a cavity to pour batter (**Batter**). Stop when the cavity is full; overflow is scored as a spill.
3. Add the ordered filling to the top-row cavities (**Filling**).
4. Watch the bubbles and browning, and adjust the heat slider.
5. Fold each top cavity onto the cavity below it (**Flip**).
6. Take the cake out (**Serve**) to see its score and price.

Every tool has a button, and every sound has a matching on-screen caption.

## Architecture

| Layer        | Implementation                                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Simulation   | Rust (`no_std`, no dependencies) in `wasm/apps/baked-mochocho/`, built as baseline and SIMD modules by `scripts/build-app-wasm.sh`          |
| Rendering    | WebGPU (`js/render/webgpu.js`, `wgsl.js`) with a WebGL2 fallback (`webgl2.js`, `glsl.js`), sharing camera and uniforms in `scene.js`        |
| Audio        | Web Audio synthesis (`js/audio/engine.js`) with an AudioWorklet sizzle generator and an original score (`music.js`)                         |
| Save data    | `public_html/library/js/signed-storage.js`: HMAC-SHA-256 envelopes with a non-extractable key in IndexedDB and a monotonic rollback counter |
| Requirements | `checkRequirements` requires WebGL, WebAssembly, Web Crypto, and IndexedDB; WebGPU, Web Audio, and AudioWorklet are optional                |

The simulation models batter flow on a 176 × 112 grid (1.5 mm cells) with lubrication-theory spreading, heat transfer through the iron plate, browning, setting, bubbles, steam, and the fold between paired cavities. The renderer reads the simulation fields directly from WebAssembly memory every frame.

## Limitations

- Save signing detects accidental edits, tampering by scripts or other users, and rollback to an older save. It cannot stop the owner of the device, who controls the key store.
- A web page cannot read the iPhone silent switch. When the app starts on an Apple touch device, it shows a one-time hint to check silent mode; captions are always shown.
- WebGPU output was verified with a software adapter in Chromium. Physical iPhone behavior must be checked on a device (see [device testing](device-testing.md)).
