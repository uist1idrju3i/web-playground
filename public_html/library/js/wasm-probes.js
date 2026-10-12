const probeDefinitions = [
  ['wasm-simd', 'WebAssembly SIMD', 11],
  ['wasm-relaxed-simd', 'WebAssembly relaxed SIMD', 10],
  ['wasm-threads', 'WebAssembly threads', 0],
  ['wasm-bigint', 'WebAssembly BigInt', '9007199254740993'],
  ['wasm-exceptions-legacy', 'WebAssembly legacy exceptions', 42],
  ['wasm-exnref', 'WebAssembly exception references', 42],
  ['wasm-tail-call', 'WebAssembly tail calls', 42],
  ['wasm-gc', 'WebAssembly GC', 42],
  ['wasm-memory64', 'WebAssembly memory64', 42],
  ['wasm-multi-memory', 'WebAssembly multi-memory', 42],
  ['wasm-extended-const', 'WebAssembly extended const', 42],
  ['wasm-bulk-memory', 'WebAssembly bulk memory', 42],
  ['wasm-reference-types', 'WebAssembly reference types', 42],
  ['wasm-jspi', 'WebAssembly JSPI', 42],
  ['wasm-js-string-builtins', 'WebAssembly JS string builtins', 42],
  ['wasm-streaming', 'WebAssembly streaming compilation', 42],
];

const resultPromises = new Map();
let probeQueue = Promise.resolve();

function failure(reason, detail) {
  return { status: 'unsupported', reason, detail };
}

function expectedValue(id, value) {
  return id === 'wasm-bigint' ? String(value) : value;
}

function workerResult(id, timeoutMs) {
  return new Promise((resolve) => {
    const worker = new Worker('/library/js/wasm-probe-worker.js', { type: 'module' });
    const timeoutId = setTimeout(() => {
      worker.terminate();
      resolve(failure('timeout', 'The WebAssembly worker probe timed out.'));
    }, timeoutMs);
    worker.onmessage = ({ data }) => {
      if (data.ready && id === 'wasm-threads') {
        const shared = new Int32Array(data.buffer);
        Atomics.store(shared, 1, 1);
        Atomics.notify(shared, 1, 1);
        return;
      }
      clearTimeout(timeoutId);
      worker.terminate();
      resolve(
        data.error ? failure('instantiate-failed', data.error) : { value: data.value, ...data },
      );
    };
    worker.onerror = (event) => {
      clearTimeout(timeoutId);
      worker.terminate();
      resolve(
        failure(
          /content security policy|wasm-unsafe-eval/i.test(event.message)
            ? 'blocked-by-csp'
            : 'instantiate-failed',
          event.message,
        ),
      );
    };
    worker.postMessage({ probeId: id });
  });
}

async function runApiCheck(id, bytes, instance) {
  if (id === 'wasm-exnref') {
    if (typeof WebAssembly.Tag !== 'function' || typeof WebAssembly.Exception !== 'function') {
      return failure(
        'compile-failed',
        'WebAssembly.Tag and WebAssembly.Exception are unavailable.',
      );
    }
    const tag = new WebAssembly.Tag({ parameters: ['i32'] });
    try {
      throw new WebAssembly.Exception(tag, [42]);
    } catch (error) {
      return error instanceof WebAssembly.Exception && error.getArg(tag, 0) === 42
        ? { value: await instance.exports.run() }
        : failure('wrong-result', 'The WebAssembly exception did not preserve its payload.');
    }
  }
  if (id === 'wasm-jspi') {
    if (
      typeof WebAssembly.Suspending !== 'function' ||
      typeof WebAssembly.promising !== 'function'
    ) {
      return failure('compile-failed', 'WebAssembly.Suspending and promising are unavailable.');
    }
    const module = await WebAssembly.compile(bytes);
    const jspiInstance = await WebAssembly.instantiate(module, {
      env: { async_value: new WebAssembly.Suspending(async () => 42) },
    });
    const value = await WebAssembly.promising(jspiInstance.exports.run)();
    return value === 42 ? { value } : failure('wrong-result', `JSPI returned ${value}.`);
  }
  if (id === 'wasm-js-string-builtins') {
    try {
      await WebAssembly.compile(bytes, { builtins: ['js-string'] });
      return { value: await instance.exports.run() };
    } catch (error) {
      return failure('compile-failed', error?.message ?? 'JS string builtins are unavailable.');
    }
  }
  if (id === 'wasm-streaming') {
    if (typeof WebAssembly.instantiateStreaming !== 'function') {
      return failure('compile-failed', 'WebAssembly.instantiateStreaming is unavailable.');
    }
    const response = await fetch(`/library/wasm/probes/${id}.wasm`);
    const { instance: streamingInstance } = await WebAssembly.instantiateStreaming(response);
    return { value: streamingInstance.exports.run() };
  }
  return { value: await instance.exports.run() };
}

async function executeProbe(id, expected, timeoutMs) {
  if (id === 'wasm-threads' && !globalThis.crossOriginIsolated) {
    return failure(
      'needs-cross-origin-isolation',
      'Shared-memory WebAssembly threads require cross-origin isolation.',
    );
  }
  const url = `/library/wasm/probes/${id}.wasm`;
  try {
    const response = await fetch(url);
    if (!response.ok)
      return failure('compile-failed', `Probe module returned HTTP ${response.status}.`);
    const bytes = await response.arrayBuffer();
    let module;
    try {
      module = await WebAssembly.compile(bytes);
    } catch (error) {
      return failure(
        /content security policy|wasm-unsafe-eval/i.test(error?.message)
          ? 'blocked-by-csp'
          : 'compile-failed',
        error?.message ?? 'The browser could not compile the module.',
      );
    }
    const imports = id === 'wasm-jspi' ? { env: { async_value: () => 42 } } : {};
    let instance;
    try {
      instance = await WebAssembly.instantiate(module, imports);
    } catch (error) {
      return failure(
        'instantiate-failed',
        error?.message ?? 'The module could not be instantiated.',
      );
    }
    let mainResult;
    try {
      mainResult = await runApiCheck(id, bytes, instance);
    } catch (error) {
      return failure('instantiate-failed', error?.message ?? 'The probe failed to execute.');
    }
    if (mainResult.status) return mainResult;
    if (expectedValue(id, mainResult.value) !== expectedValue(id, expected)) {
      return failure(
        'wrong-result',
        `Main thread returned ${mainResult.value}; expected ${expected}.`,
      );
    }
    const worker = await workerResult(id, timeoutMs);
    if (worker.status) return worker;
    if (expectedValue(id, worker.value) !== expectedValue(id, expected)) {
      return failure('wrong-result', `Worker returned ${worker.value}; expected ${expected}.`);
    }
    if (id === 'wasm-threads' && worker.threadValue !== 1) {
      return failure(
        'wrong-result',
        'Worker Atomics.wait/notify did not complete the shared-memory round-trip.',
      );
    }
    return {
      status: 'supported',
      detail:
        id === 'wasm-threads'
          ? 'Main thread executed the atomic operation; Worker completed the shared-memory wait/notify round-trip.'
          : `Main thread and Worker returned ${expectedValue(id, expected)}.`,
      mainThread: mainResult.value,
      worker: worker.value,
    };
  } catch (error) {
    return failure(
      /content security policy|wasm-unsafe-eval/i.test(error?.message)
        ? 'blocked-by-csp'
        : 'compile-failed',
      error?.message ?? 'The WebAssembly probe failed.',
    );
  }
}

export function runWasmProbe(id, { timeoutMs = 3000 } = {}) {
  if (!resultPromises.has(id)) {
    const definition = probeDefinitions.find(([probeId]) => probeId === id);
    const promise = probeQueue.then(() =>
      definition
        ? executeProbe(id, definition[2], timeoutMs)
        : failure('compile-failed', `Unknown WebAssembly probe: ${id}.`),
    );
    probeQueue = promise.catch(() => {});
    resultPromises.set(id, promise);
  }
  return resultPromises.get(id);
}

export function probeResizableMemoryBuffer() {
  try {
    const memory = new WebAssembly.Memory({ initial: 1, maximum: 2 });
    if (typeof memory.toResizableBuffer !== 'function') {
      return failure('compile-failed', 'WebAssembly.Memory.toResizableBuffer is unavailable.');
    }
    const buffer = memory.toResizableBuffer();
    return buffer.resizable
      ? { status: 'supported', detail: 'toResizableBuffer returned a resizable ArrayBuffer.' }
      : failure('wrong-result', 'toResizableBuffer returned a fixed-length ArrayBuffer.');
  } catch (error) {
    return failure('instantiate-failed', error?.message ?? 'Resizable memory buffer probe failed.');
  }
}
