import { createHash } from 'node:crypto';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputRoot = path.join(repositoryRoot, 'public_html/library/wasm/toolchains');
const profiles = [
  ['emscripten-default', 'emscripten-default.js', 'emscripten-default.wasm', [], 'emscripten'],
  [
    'emscripten-cxx-eh-legacy',
    'emscripten-cxx-eh-legacy.js',
    'emscripten-cxx-eh-legacy.wasm',
    [],
    'emscripten',
  ],
  [
    'emscripten-cxx-eh-exnref',
    'emscripten-cxx-eh-exnref.js',
    'emscripten-cxx-eh-exnref.wasm',
    ['wasm-exnref'],
    'emscripten',
  ],
  [
    'emscripten-pthreads',
    'emscripten-pthreads.js',
    'emscripten-pthreads.wasm',
    ['wasm-threads'],
    'emscripten',
  ],
  ['emscripten-simd', 'emscripten-simd.js', 'emscripten-simd.wasm', ['wasm-simd'], 'emscripten'],
  ['emscripten-jspi', 'emscripten-jspi.js', 'emscripten-jspi.wasm', ['wasm-jspi'], 'emscripten'],
  [
    'emscripten-wasm64',
    'emscripten-wasm64.js',
    'emscripten-wasm64.wasm',
    ['wasm-memory64'],
    'emscripten',
  ],
  ['rust-bindgen', 'rust-bindgen.js', 'rust-bindgen_bg.wasm', [], 'wasm-bindgen'],
  [
    'rust-bindgen-simd',
    'rust-bindgen-simd.js',
    'rust-bindgen-simd_bg.wasm',
    ['wasm-simd'],
    'wasm-bindgen',
  ],
  ['rust-wasip1', null, 'rust-wasi.wasm', [], 'wasi'],
];

async function sha256(file) {
  const contents = await readFile(path.join(outputRoot, file));
  return createHash('sha256').update(contents).digest('hex');
}

const files = (await readdir(outputRoot)).filter((file) => file !== 'manifest.json').sort();
const manifest = {
  version: 1,
  toolchains: {
    emscripten: process.env.EMSCRIPTEN_VERSION,
    rust: process.env.RUST_VERSION,
    wasmBindgen: process.env.WASM_BINDGEN_VERSION,
  },
  profiles: await Promise.all(
    profiles.map(async ([id, entry, wasm, requires, runtime]) => ({
      id,
      entry,
      wasm,
      requires,
      runtime,
      expected: id === 'rust-wasip1' ? 2 : 42,
      flags:
        process.env[`FLAGS_${id.replaceAll('-', '_').toUpperCase()}`]?.split(' ').filter(Boolean) ??
        [],
      sha256: {
        ...(entry ? { entry: await sha256(entry) } : {}),
        wasm: await sha256(wasm),
      },
    })),
  ),
  generatedFiles: await Promise.all(
    files.map(async (file) => ({ file, sha256: await sha256(file) })),
  ),
};

await writeFile(`${outputRoot}/manifest.json`, `${JSON.stringify(manifest, null, 2)}\n`);
