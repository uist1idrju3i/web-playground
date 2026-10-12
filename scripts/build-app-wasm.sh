#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
expected_rust=1.99.0

# Each app: <crate dir under wasm/apps>|<crate lib name>|<wasm output stem>|<public dir>
apps=(
  "baked-mochocho|mochocho_sim|mochocho-sim|public_html/baked-mochocho/wasm"
  "star-hopper|starhopper_sim|starhopper-sim|public_html/star-hopper/wasm"
  "senko-hanabi|senko_sim|senko-sim|public_html/senko-hanabi/wasm"
)

if [[ $# -gt 0 ]]; then
  filter="$1"
else
  filter=""
fi

if [[ "$(rustc --version)" != *"$expected_rust"* ]]; then
  echo "Expected Rust $expected_rust." >&2
  exit 1
fi

build_root="$(mktemp -d)"
trap 'rm -rf "$build_root"' EXIT

rust_sysroot="$(rustc --print sysroot)"
common_flags="--remap-path-prefix=$repository_root=/build --remap-path-prefix=$HOME/.cargo=/cargo --remap-path-prefix=$rust_sysroot=/rustup"

for app in "${apps[@]}"; do
  IFS='|' read -r app_dir lib_name wasm_name output <<<"$app"
  if [[ -n "$filter" && "$app_dir" != "$filter" ]]; then
    continue
  fi
  crate_manifest="$repository_root/wasm/apps/$app_dir/Cargo.toml"
  out_dir="$repository_root/$output"
  mkdir -p "$out_dir"

  RUSTFLAGS="$common_flags" \
    CARGO_TARGET_DIR="$build_root/$app_dir-baseline-target" \
    cargo build --locked --release --target wasm32-unknown-unknown --manifest-path "$crate_manifest"
  cp "$build_root/$app_dir-baseline-target/wasm32-unknown-unknown/release/$lib_name.wasm" \
    "$out_dir/$wasm_name.wasm"

  RUSTFLAGS="$common_flags -C target-feature=+simd128" \
    CARGO_TARGET_DIR="$build_root/$app_dir-simd-target" \
    cargo build --locked --release --target wasm32-unknown-unknown --manifest-path "$crate_manifest"
  cp "$build_root/$app_dir-simd-target/wasm32-unknown-unknown/release/$lib_name.wasm" \
    "$out_dir/$wasm_name-simd.wasm"
done
