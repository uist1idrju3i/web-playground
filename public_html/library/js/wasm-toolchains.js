import { createWasiPreview1 } from '/library/wasm/toolchains/wasi-shim.js';

const basePath = '/library/wasm/toolchains/';

async function runEmscriptenProfile(profile) {
  const modulePath = `${basePath}${profile.entry}`;
  const { default: createModule } = await import(modulePath);
  const module = await createModule({
    locateFile: (file) => (file.endsWith('.wasm') ? `${basePath}${profile.wasm}` : file),
  });
  return module._run();
}

async function runRustBindgenProfile(profile) {
  const modulePath = `${basePath}${profile.entry}`;
  const { default: initialize, run } = await import(modulePath);
  await initialize(`${basePath}${profile.wasm}`);
  return run();
}

async function runWasiProfile(profile) {
  const response = await fetch(`${basePath}${profile.wasm}`);
  if (!response.ok) throw new Error(`WASI module returned HTTP ${response.status}.`);
  const bytes = await response.arrayBuffer();
  const memoryRef = { current: null };
  const output = [];
  const imports = {
    wasi_snapshot_preview1: createWasiPreview1(memoryRef, output),
  };
  const { instance } = await WebAssembly.instantiate(bytes, imports);
  memoryRef.current = instance.exports.memory;
  const value = instance.exports.run();
  return { value, output: output.join('') };
}

async function executeProfile(profile) {
  if (profile.runtime === 'emscripten') return runEmscriptenProfile(profile);
  if (profile.runtime === 'wasm-bindgen') return runRustBindgenProfile(profile);
  const result = await runWasiProfile(profile);
  return result.value === profile.expected && result.output === '42' ? result.value : result;
}

export async function runWasmToolchains(layerOneResults) {
  const response = await fetch(`${basePath}manifest.json`);
  if (!response.ok) {
    return { error: `Toolchain manifest returned HTTP ${response.status}.`, profiles: [] };
  }
  const manifest = await response.json();
  const profiles = await Promise.all(
    manifest.profiles.map(async (profile) => {
      const missing = profile.requires.filter(
        (id) => layerOneResults.get(id)?.status !== 'supported',
      );
      if (missing.length) {
        return { ...profile, status: 'unsupported', detail: `Requires ${missing.join(', ')}.` };
      }
      try {
        const result = await executeProfile(profile);
        const value = typeof result === 'object' ? result.value : result;
        return value === profile.expected
          ? { ...profile, status: 'supported', detail: `Returned ${value}.` }
          : {
              ...profile,
              status: 'unsupported',
              detail: `Returned ${value}; expected ${profile.expected}.`,
            };
      } catch (error) {
        return {
          ...profile,
          status: 'unsupported',
          detail: error?.message ?? 'The profile failed to run.',
        };
      }
    }),
  );
  return { manifest, profiles };
}
