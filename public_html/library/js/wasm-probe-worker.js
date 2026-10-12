self.addEventListener('message', async ({ data }) => {
  try {
    const response = await fetch(data.url);
    if (!response.ok) throw new Error(`Probe module request failed with ${response.status}.`);
    const bytes = await response.arrayBuffer();
    const imports = data.id === 'wasm-jspi' ? { env: { async_value: () => 42 } } : {};
    const { instance } = await WebAssembly.instantiate(bytes, imports);
    const value = await instance.exports.run();
    if (data.id === 'wasm-threads') {
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
