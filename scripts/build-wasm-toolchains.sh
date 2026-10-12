#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
emsdk_root="${EMSDK:-$HOME/emsdk}"
source "$emsdk_root/emsdk_env.sh" >/dev/null

expected_emscripten=6.0.12
expected_rust=1.99.0
expected_bindgen=0.2.129
if [[ "$(emcc --version | head -n 1)" != *"$expected_emscripten"* ]]; then
  echo "Expected Emscripten $expected_emscripten." >&2
  exit 1
fi
if [[ "$(rustc --version)" != *"$expected_rust"* ]]; then
  echo "Expected Rust $expected_rust." >&2
  exit 1
fi
if [[ "$(wasm-bindgen --version)" != "wasm-bindgen $expected_bindgen" ]]; then
  echo "Expected wasm-bindgen $expected_bindgen." >&2
  exit 1
fi

output="$repository_root/public_html/library/wasm/toolchains"
build_root="$(mktemp -d)"
trap 'rm -rf "$build_root"' EXIT
mkdir -p "$output"
rm -f "$output"/*
source_dir="$repository_root/wasm/toolchains/emscripten"
common_flags=(-Oz -sMODULARIZE=1 -sEXPORT_ES6=1 -sENVIRONMENT=web,worker -sEXPORTED_FUNCTIONS=['_run'] -sNO_EXIT_RUNTIME=1 --no-entry)

build_emscripten() {
  local id="$1"
  local source="$2"
  shift 2
  local flags=("$@")
  local variable="FLAGS_${id//-/_}"
  variable="${variable^^}"
  printf -v "$variable" '%s' "${flags[*]}"
  local compiler=emcc
  if [[ "$source" == *.cpp ]]; then
    compiler=em++
  fi
  "$compiler" "$source" "${common_flags[@]}" "${flags[@]}" -o "$output/$id.js"
}

build_emscripten emscripten-default "$source_dir/probe.c"
build_emscripten emscripten-cxx-eh-legacy "$source_dir/exceptions.cpp" -fexceptions
build_emscripten emscripten-cxx-eh-exnref "$source_dir/exceptions.cpp" -fwasm-exceptions -sWASM_LEGACY_EXCEPTIONS=0
build_emscripten emscripten-pthreads "$source_dir/pthreads.c" -pthread -sPTHREAD_POOL_SIZE=2
build_emscripten emscripten-simd "$source_dir/simd.c" -msimd128
build_emscripten emscripten-jspi "$source_dir/probe.c" -sJSPI=1
build_emscripten emscripten-wasm64 "$source_dir/probe.c" -m64

rust_manifest="$repository_root/wasm/toolchains/rust-bindgen/Cargo.toml"
cargo build --locked --release --manifest-path "$rust_manifest" --target wasm32-unknown-unknown --target-dir "$build_root/rust"
wasm-bindgen --target web --out-name rust-bindgen --out-dir "$output" "$build_root/rust/wasm32-unknown-unknown/release/rust_bindgen.wasm"
RUSTFLAGS='-C target-feature=+simd128' cargo build --locked --release --manifest-path "$rust_manifest" --target wasm32-unknown-unknown --target-dir "$build_root/rust-simd"
wasm-bindgen --target web --out-name rust-bindgen-simd --out-dir "$output" "$build_root/rust-simd/wasm32-unknown-unknown/release/rust_bindgen.wasm"
cargo build --locked --release --manifest-path "$repository_root/wasm/toolchains/rust-wasi/Cargo.toml" --target wasm32-wasip1 --target-dir "$build_root/rust-wasi"
cp "$build_root/rust-wasi/wasm32-wasip1/release/rust_wasi.wasm" "$output/rust-wasi.wasm"
cp "$repository_root/wasm/toolchains/wasi-shim.js" "$output/wasi-shim.js"

export EMSCRIPTEN_VERSION="$expected_emscripten"
export RUST_VERSION="$expected_rust"
export WASM_BINDGEN_VERSION="$expected_bindgen"
for profile in emscripten-default emscripten-cxx-eh-legacy emscripten-cxx-eh-exnref emscripten-pthreads emscripten-simd emscripten-jspi emscripten-wasm64 rust-bindgen rust-bindgen-simd rust-wasip1; do
  variable="FLAGS_${profile//-/_}"
  variable="${variable^^}"
  export "$variable"
done
node "$repository_root/scripts/write-wasm-toolchain-manifest.mjs"
