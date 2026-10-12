# WebAssembly Probes and Compiler Profiles

The Browser Features app separates executable Layer 1 feature probes from Layer 2 outputs produced by compiler toolchains. Everything is served as static files; there is no production build step or CDN dependency.

## Layer 1 probes

The WebAssembly section fetches each committed module from `public_html/library/wasm/probes/`, compiles and instantiates it on the main thread, and executes it in a time-limited Worker. The result is compared with the value declared by the probe. Shared-memory threads additionally perform an `Atomics.wait`/`Atomics.notify` round-trip and require cross-origin isolation.

Failures use these reason codes: `compile-failed`, `instantiate-failed`, `wrong-result`, `blocked-by-csp`, `needs-cross-origin-isolation`, and `timeout`. JSPI, JavaScript string builtins, streaming instantiation, and resizable memory buffers have corresponding JavaScript API checks.

The WAT sources live in `wasm/probes/`. Binaryen is pinned as an exact npm development dependency. Regenerate the committed modules and verify determinism with:

```sh
npm ci
npm run generate
npm run check:generated
```

## Layer 2 toolchains

The source programs are in `wasm/toolchains/`; the built glue, WebAssembly modules, and SHA-256 manifest are committed under `public_html/library/wasm/toolchains/`. The ten profiles are:

- Emscripten: default, legacy C++ exceptions, exception references, pthreads, SIMD, JSPI, and memory64.
- Rust: wasm-bindgen, wasm-bindgen with SIMD, and `wasm32-wasip1` with the in-repository preview-1 shim.

Each profile computes a deterministic result. The UI shows a pass/fail mark and lists missing Layer 1 requirements rather than attempting a profile whose required browser feature failed.

Install the pinned toolchains on a development VM with:

```sh
git init "$HOME/emsdk"
git -C "$HOME/emsdk" remote add origin https://github.com/emscripten-core/emsdk.git
git -C "$HOME/emsdk" fetch --depth=1 origin 35ff8a6d150541276abbc6bae512ca90bcfbe220
git -C "$HOME/emsdk" checkout --detach 35ff8a6d150541276abbc6bae512ca90bcfbe220
"$HOME/emsdk/emsdk" install 6.0.12
"$HOME/emsdk/emsdk" activate 6.0.12
source "$HOME/emsdk/emsdk_env.sh"
rustup toolchain install 1.99.0 --profile minimal --target wasm32-unknown-unknown --target wasm32-wasip1
cargo install wasm-bindgen-cli --version 0.2.129 --locked
scripts/build-wasm-toolchains.sh
```

The emsdk manager is pinned to commit `35ff8a6d150541276abbc6bae512ca90bcfbe220` and verifies its SDK artifacts using the hashes in its release manifest. Rustup validates the signed Rust distribution manifest and component checksums; Cargo verifies crates against the lockfile checksums. Keep the generated `manifest.json` and all generated modules in the same commit as source or flag changes.

## Verification

`npm test` covers all three Playwright engines and asserts their expected Layer 1 proposal results. Chromium is expected to support the stable probes. Firefox's expected gaps are relaxed SIMD and JSPI for the pinned Playwright engine. WebKit's expected gaps include relaxed SIMD, memory64, multi-memory, and features newer than its bundled WebKit build, including JSPI and JS string builtins. A mismatch is a test failure to investigate; do not change the expectation merely to make the test pass.

Two consecutive builds with the pinned toolchains produced an identical manifest SHA-256, including every profile's generated-file hashes. The `WebAssembly Toolchains` workflow therefore rebuilds the profiles and checks the generated files byte-for-byte against the committed outputs. Reassess this only after comparing clean builds with the same pinned toolchains and documenting any reproducibility change.

## Notices

See [THIRD_PARTY_NOTICES.md](../THIRD_PARTY_NOTICES.md) for Binaryen, Emscripten runtime, Rust standard-library, feature-data, and browser-compatibility-data licensing.
