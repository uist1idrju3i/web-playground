#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
crate_manifest="$repository_root/wasm/apps/baked-mochocho/Cargo.toml"
output="$repository_root/public_html/baked-mochocho/wasm"
expected_rust=1.99.0

if [[ "$(rustc --version)" != *"$expected_rust"* ]]; then
  echo "Expected Rust $expected_rust." >&2
  exit 1
fi

build_root="$(mktemp -d)"
trap 'rm -rf "$build_root"' EXIT
mkdir -p "$output"

rust_sysroot="$(rustc --print sysroot)"
common_flags="--remap-path-prefix=$repository_root=/build --remap-path-prefix=$HOME/.cargo=/cargo --remap-path-prefix=$rust_sysroot=/rustup"

RUSTFLAGS="$common_flags" \
  CARGO_TARGET_DIR="$build_root/baseline-target" \
  cargo build --locked --release --target wasm32-unknown-unknown --manifest-path "$crate_manifest"
cp "$build_root/baseline-target/wasm32-unknown-unknown/release/mochocho_sim.wasm" \
  "$output/mochocho-sim.wasm"

RUSTFLAGS="$common_flags -C target-feature=+simd128" \
  CARGO_TARGET_DIR="$build_root/simd-target" \
  cargo build --locked --release --target wasm32-unknown-unknown --manifest-path "$crate_manifest"
cp "$build_root/simd-target/wasm32-unknown-unknown/release/mochocho_sim.wasm" \
  "$output/mochocho-sim-simd.wasm"
