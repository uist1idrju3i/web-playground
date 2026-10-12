const probeModules = new Map(
  [
    'wasm-simd',
    'wasm-relaxed-simd',
    'wasm-threads',
    'wasm-bigint',
    'wasm-exceptions-legacy',
    'wasm-exnref',
    'wasm-tail-call',
    'wasm-gc',
    'wasm-memory64',
    'wasm-multi-memory',
    'wasm-extended-const',
    'wasm-bulk-memory',
    'wasm-reference-types',
    'wasm-jspi',
    'wasm-js-string-builtins',
    'wasm-streaming',
  ].map((probeId) => [probeId, `/library/wasm/probes/${probeId}.wasm`]),
);

self.addEventListener('message', async (event) => {
  if (event.origin && event.origin !== self.location.origin) return;
  const probeId = event.data?.probeId;
  const modulePath = probeModules.get(probeId);
  if (!modulePath) return;
  try {
    const response = await fetch(modulePath);
    if (!response.ok) throw new Error(`Probe module request failed with ${response.status}.`);
    const bytes = await response.arrayBuffer();
    const imports = probeId === 'wasm-jspi' ? { env: { async_value: () => 42 } } : {};
    const { instance } = await WebAssembly.instantiate(bytes, imports);
    const value = await instance.exports.run();
    if (probeId === 'wasm-threads') {
      const shared = new Int32Array(instance.exports.memory.buffer);
      Atomics.store(shared, 1, 0);
      self.postMessage({ ready: true, buffer: instance.exports.memory.buffer });
      Atomics.wait(shared, 1, 0, 1500);
      self.postMessage({
        value: typeof value === 'bigint' ? value.toString() : value,
        threadValue: Atomics.load(shared, 1),
      });
      return;
    }
    self.postMessage({ value: typeof value === 'bigint' ? value.toString() : value });
  } catch (error) {
    self.postMessage({ error: error?.message ?? String(error), name: error?.name ?? 'Error' });
  }
});
