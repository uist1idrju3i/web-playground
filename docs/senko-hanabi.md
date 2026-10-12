# Senko-hanabi Simulator

`/senko-hanabi/` simulates a Japanese senkō hanabi (線香花火) sparkler — the small
firework of black powder folded into a washi twist — from ignition to the
moment the molten ball drops. All visuals, simulation, and sound are
generated at runtime; the app ships no images, audio files, or third-party
code.

## How to play

1. Pick a randomness mode on the title screen (see below).
2. Press **ともす / Light it** and watch the sparkler burn through its four
   stages: bud (蕾) → peony (牡丹) → pine needle (松葉) → falling chrysanthemum
   (散り菊).
3. Drag on the canvas to tilt the stick.
4. When the ball drops and goes dark, the result screen shows burn time and
   split count. The **統計 / Stats** drawer accumulates per-mode histograms.

## The two random modes

| Mode                        | Source of randomness                                             | What it produces                                                                                                                                                                                                                                              |
| --------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 真の乱数 / True randomness  | `crypto.getRandomValues`, fed each step into a WASM entropy ring | Independent, memoryless draws: exponential ejection intervals, uniform directions, geometric stage durations — nature's clumping and streaks included                                                                                                         |
| 体感乱数 / Perceived random | Seeded xoshiro128\*\* with game-industry shaping                 | The same decision sequence, reshaped so humans perceive it as fair-random: Warcraft III-style PRD (C·n) for stage transitions, Tetris-style quantile shuffle bags for intervals/counts/depths, and a longest-unused-bin azimuth coverage for spark directions |

The distribution differences are visible in the stats drawer: the feel mode
concentrates burn times near the mean while the TRNG mode shows the wider,
clumpier profile of iid sampling.

## Architecture

| Layer        | Implementation                                                                                                                        |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Simulation   | Rust (`no_std`, no dependencies) in `wasm/apps/senko-hanabi/`, built as baseline and SIMD modules by `scripts/build-app-wasm.sh`      |
| Rendering    | WebGPU (`js/render/webgpu.js`) with a WebGL2 fallback (`webgl2.js`, `glsl.js`), both reading the shared scene model in `scene.js`     |
| Audio        | Web Audio synthesis (`js/audio/engine.js`): ignition whoosh, ejection crackle, cascade pops, landing thud, night pad in `music.js`    |
| Save data    | `public_html/library/js/signed-storage.js`: HMAC-SHA-256 envelopes holding settings and per-mode records                              |
| Requirements | `checkRequirements` requires ES modules, WebAssembly, WebGL, pointer events, fetch; WebGPU, Web Audio, Web Crypto random are optional |

The simulation models the molten-salt fireball (~1–2.5 mm) hanging at the
cord tip with pendulum sway and hand tremor, surface-bubble ejections of hot
droplets, and droplet cascades that micro-explode into child sparks up to
eight generations — the pine-needle pattern documented in Inoue et al. (PRL
2017). It is a reduced-order approximation, not CFD.

If the browser lacks `crypto.getRandomValues` (detected by the
`web-crypto-random` capability), the TRNG mode is disabled and the UI says so.

## Limitations

- TRNG mode falls back to the seeded PRNG (marking a starvation counter) if
  the JS entropy feed cannot keep up — on normal hardware it always can.
- Save signing detects tampering but cannot stop the device owner.
