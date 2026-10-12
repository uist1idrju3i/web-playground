# WebAssembly

The Browser Features app runs 17 Layer 1 feature-specific modules. Each module is instantiated and executed, with the returned value compared to an expected result. Probes run on the main thread and, where appropriate, in a time-limited Worker.

## Result taxonomy

Results distinguish compile failure, instantiate failure, wrong result, CSP blocking, missing cross-origin isolation, and timeout. A failed execution is not silently treated as “unsupported”; the recorded reason identifies the failed stage.

## Measured Layer 1 results

All 17 probes passed on the Playwright 1.64 browser engines measured here: Chromium 156, Firefox 157, and WebKit 27.2. Real Safari and Firefox release channels can differ from these bundled engine builds.

| Engine   | Version | Passing probes |
| -------- | ------: | -------------: |
| Chromium |     156 |          17/17 |
| Firefox  |     157 |          17/17 |
| WebKit   |    27.2 |          17/17 |

## App modules

`wasm/apps/baked-mochocho/` is a dependency-free `no_std` Rust crate for the [Baked Mochocho](baked-mochocho.md) physics simulation. `scripts/build-app-wasm.sh` builds a baseline and a SIMD module into `public_html/baked-mochocho/wasm/` with the pinned Rust toolchain and remapped paths, and the `wasm-toolchains` workflow rebuilds them and fails on any difference. The app detects SIMD support and loads the matching module.

`wasm/apps/star-hopper/` is a second `no_std` crate driving the [ほしがりホッパー](../public_html/star-hopper/) game: it owns world generation, 240 Hz substepped platforming physics, pickup/combo scoring, and the run-state event ring. The same build script emits its baseline and SIMD modules into `public_html/star-hopper/wasm/`.

## Layer 2 toolchains

`wasm/` contains WAT and native source profiles. `scripts/build-wasm-toolchains.sh` uses pinned Emscripten and Rust toolchains, records flags and SHA-256 hashes in `public_html/library/wasm/toolchains/manifest.json`, and emits small static test modules. The `wasm-toolchains` workflow rebuilds and compares committed artifacts.

| Profile                                                | Purpose                            |
| ------------------------------------------------------ | ---------------------------------- |
| `emscripten-default`                                   | Baseline Emscripten                |
| `emscripten-cxx-eh-legacy`, `emscripten-cxx-eh-exnref` | C++ exception models               |
| `emscripten-pthreads`, `emscripten-simd`               | Threads and SIMD                   |
| `emscripten-jspi`, `emscripten-wasm64`                 | JSPI and memory64                  |
| `rust-bindgen`, `rust-bindgen-simd`, `rust-wasip1`     | Rust targets and minimal WASI shim |

Review [browser support](browser-support.md), [CI/CD](ci-cd.md), and [troubleshooting](troubleshooting.md) before changing the profile matrix. Embedded runtime licensing is recorded in `THIRD_PARTY_NOTICES`.
