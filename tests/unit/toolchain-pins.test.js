import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Toolchain pins live in several files at once (build script, CI workflow,
// notices, generated manifest). This test fails the moment they drift apart.

const root = fileURLToPath(new URL('../../', import.meta.url));
const read = (path) => readFile(new URL(path, `file://${root}`), 'utf8');

test('wasm-bindgen pin is identical across crate, scripts, CI and notices', async () => {
  const cargoToml = await read('wasm/toolchains/rust-bindgen/Cargo.toml');
  const buildScript = await read('scripts/build-wasm-toolchains.sh');
  const workflow = await read('.github/workflows/wasm-toolchains.yml');
  const notices = await read('THIRD_PARTY_NOTICES.md');

  const cratePin = cargoToml.match(/wasm-bindgen = "=(\d+\.\d+\.\d+)"/)?.[1];
  const scriptPin = buildScript.match(/expected_bindgen=(\d+\.\d+\.\d+)/)?.[1];
  const ciPin = workflow.match(/wasm-bindgen-cli --version (\d+\.\d+\.\d+)/)?.[1];
  const noticePin = notices.match(/\*\*wasm-bindgen (\d+\.\d+\.\d+)\*\*/)?.[1];

  assert.ok(cratePin, 'wasm-bindgen pin missing from rust-bindgen Cargo.toml');
  assert.equal(scriptPin, cratePin, 'build-wasm-toolchains.sh expected_bindgen drifted');
  assert.equal(ciPin, cratePin, 'wasm-toolchains.yml wasm-bindgen-cli drifted');
  assert.equal(noticePin, cratePin, 'THIRD_PARTY_NOTICES.md wasm-bindgen drifted');
});

test('Emscripten pin is identical across script, CI, manifest and notices', async () => {
  const buildScript = await read('scripts/build-wasm-toolchains.sh');
  const workflow = await read('.github/workflows/wasm-toolchains.yml');
  const notices = await read('THIRD_PARTY_NOTICES.md');
  const manifest = JSON.parse(await read('public_html/library/wasm/toolchains/manifest.json'));

  const scriptPin = buildScript.match(/expected_emscripten=(\d+\.\d+\.\d+)/)?.[1];
  const ciPin = workflow.match(/emsdk" install (\d+\.\d+\.\d+)/)?.[1];
  const noticePin = notices.match(/\*\*Emscripten (\d+\.\d+\.\d+) runtime code\*\*/)?.[1];

  assert.ok(scriptPin, 'expected_emscripten missing from build-wasm-toolchains.sh');
  assert.equal(ciPin, scriptPin, 'wasm-toolchains.yml emsdk install version drifted');
  assert.equal(manifest.toolchains.emscripten, scriptPin, 'toolchain manifest emscripten drifted');
  assert.equal(noticePin, scriptPin, 'THIRD_PARTY_NOTICES.md Emscripten drifted');
});

test('Rust channel is identical across toolchain file, scripts and CI', async () => {
  const toolchain = await read('rust-toolchain.toml');
  const buildAppScript = await read('scripts/build-app-wasm.sh');
  const wasmWorkflow = await read('.github/workflows/wasm-toolchains.yml');
  const nativeWorkflow = await read('.github/workflows/native-build.yml');

  const channel = toolchain.match(/channel = "(\d+\.\d+\.\d+)"/)?.[1];
  const appScriptPin = buildAppScript.match(/expected_rust=(\d+\.\d+\.\d+)/)?.[1];
  const wasmCiPin = wasmWorkflow.match(/rustup toolchain install (\d+\.\d+\.\d+)/)?.[1];
  const nativeCiPin = nativeWorkflow.match(/rustup toolchain install (\d+\.\d+\.\d+)/)?.[1];

  assert.ok(channel, 'rust-toolchain.toml channel missing');
  assert.equal(appScriptPin, channel, 'build-app-wasm.sh expected_rust drifted');
  assert.equal(wasmCiPin, channel, 'wasm-toolchains.yml rustup drifted');
  assert.equal(nativeCiPin, channel, 'native-build.yml rustup drifted');

  const manifest = JSON.parse(await read('public_html/library/wasm/toolchains/manifest.json'));
  assert.equal(manifest.toolchains.rust, channel, 'toolchain manifest rust drifted');
});

test('servoshell pin carries tag, asset and sha256 together', async () => {
  const pin = JSON.parse(await read('tests/servo/servo-version.json'));
  assert.match(pin.tag, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(pin.asset, 'servo-x86_64-linux-gnu.tar.gz');
  assert.match(pin.sha256, /^[0-9a-f]{64}$/);
});
