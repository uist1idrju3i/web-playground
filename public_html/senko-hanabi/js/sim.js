// Thin wrapper over the senko_sim WebAssembly module. Simulation state lives
// in flat f32 blocks inside wasm memory; JS reads them through typed-array
// views and feeds entropy words for the "trng" mode through a u32 ring.

export const P_STRIDE = 12;
export const BALL_STRIDE = 8;
export const STATE_STRIDE = 16;
export const EVENT_STRIDE = 4;

const SIMD_TEST = Uint8Array.from([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x04, 0x01, 0x60, 0x00, 0x00, 0x03, 0x02,
  0x01, 0x00, 0x0a, 0x17, 0x01, 0x15, 0x00, 0xfd, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1a, 0x0b,
]);

export const BALL_FIELDS = ['x', 'y', 'r', 'heat', 'swell', 'tilt', 'detached', 'vy'];
export const STATE_FIELDS = [
  'phase',
  'elapsed',
  'phaseT',
  'tilt',
  'breeze',
  'sparks',
  'finished',
  'ejected',
  'bursts',
  'mode',
  'lastInt',
  'pressure',
  'starved',
  'seed',
  'r0',
  'r1',
];

// Particle field indices inside one 12-float stride.
export const P = {
  X: 0,
  Y: 1,
  Z: 2,
  VX: 3,
  VY: 4,
  VZ: 5,
  AGE: 6,
  HEAT: 7,
  GEN: 8,
  BURST: 9,
  LIFE: 10,
  DEPTH: 11,
};

export const PHASE = { IDLE: 0, TSUBOMI: 1, BOTAN: 2, MATSUBA: 3, CHIRIGIKU: 4, FALL: 5, SPENT: 6 };
export const RNG_MODE = { FEEL: 0, TRNG: 1 };

export const EVENT = {
  LIGHT: 1,
  PHASE: 2,
  EJECT: 3,
  BURST: 4,
  FALL: 5,
  LAND: 6,
  SPENT: 7,
  STARVE: 8,
};

function namedValuesInto(target, view, offset, fields) {
  for (let index = 0; index < fields.length; index += 1) {
    target[fields[index]] = view[offset + index];
  }
  return target;
}

function instantiateResponse(response) {
  if (typeof WebAssembly.instantiateStreaming === 'function') {
    return WebAssembly.instantiateStreaming(response.clone(), {});
  }
  return response.arrayBuffer().then((bytes) => WebAssembly.instantiate(bytes, {}));
}

async function instantiateSource(source) {
  if (source instanceof WebAssembly.Module) {
    return { instance: await WebAssembly.instantiate(source, {}) };
  }
  if (source && typeof source.arrayBuffer === 'function' && typeof source.clone === 'function') {
    try {
      return await instantiateResponse(source);
    } catch {
      return WebAssembly.instantiate(await source.arrayBuffer(), {});
    }
  }
  return WebAssembly.instantiate(source, {});
}

async function loadWasm(source, simd) {
  if (source !== undefined) return instantiateSource(source);
  const url = new URL(`../wasm/senko-sim${simd ? '-simd' : ''}.wasm`, import.meta.url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load simulation WebAssembly: ${response.status}`);
  try {
    return await instantiateResponse(response);
  } catch {
    return WebAssembly.instantiate(await response.arrayBuffer(), {});
  }
}

function requireExports(exports) {
  const required = [
    'memory',
    'sim_init',
    'sim_light',
    'sim_step',
    'set_tilt',
    'set_breeze',
    'feed_entropy',
    'entropy_free',
    'entropy_head',
    'entropy_ptr',
    'entropy_cap',
    'particle_cap',
    'particle_ptr',
    'ball_ptr',
    'state_ptr',
    'event_ptr',
    'event_head',
    'event_cap',
  ];
  for (const name of required) {
    if (!(name in exports)) throw new Error(`Simulation WASM is missing export "${name}".`);
  }
}

// crypto.getRandomValues is the default trng source; tests inject a
// deterministic one through `randomSource(u32array)`.
function defaultEntropy(target) {
  globalThis.crypto.getRandomValues(target);
}

export async function createSimulation({
  seed = 1,
  mode = RNG_MODE.FEEL,
  simd = undefined,
  source = undefined,
  randomSource = undefined,
} = {}) {
  const useSimd = simd ?? WebAssembly.validate(SIMD_TEST);
  const { instance } = await loadWasm(source, useSimd);
  const { exports } = instance;
  requireExports(exports);
  exports.sim_init(seed >>> 0, mode === RNG_MODE.TRNG ? 1 : 0);

  const particleCap = exports.particle_cap();
  const eventCap = exports.event_cap();
  const entropyCap = exports.entropy_cap();
  const particles = new Float32Array(
    exports.memory.buffer,
    exports.particle_ptr(),
    particleCap * P_STRIDE,
  );
  const ball = new Float32Array(exports.memory.buffer, exports.ball_ptr(), BALL_STRIDE);
  const state = new Float32Array(exports.memory.buffer, exports.state_ptr(), STATE_STRIDE);
  const events = new Float32Array(
    exports.memory.buffer,
    exports.event_ptr(),
    eventCap * EVENT_STRIDE,
  );
  const entropy = new Uint32Array(exports.memory.buffer, exports.entropy_ptr(), entropyCap);

  const ballTarget = {};
  const stateTarget = {};
  const fill = randomSource ?? defaultEntropy;
  const scratch = new Uint32Array(512);
  let eventCursor = exports.event_head();

  function feedEntropy() {
    if (api.mode !== RNG_MODE.TRNG) return;
    let free = exports.entropy_free();
    while (free > 0) {
      const head = exports.entropy_head();
      const offset = head % entropyCap;
      const chunk = Math.min(scratch.length, free, entropyCap - offset);
      fill(scratch.subarray(0, chunk));
      entropy.set(scratch.subarray(0, chunk), offset);
      exports.feed_entropy(chunk);
      free = exports.entropy_free();
    }
  }

  const api = {
    simd: useSimd,
    mode,
    seed,
    particles,
    particleCap,
    ball,
    state,
    events,
    eventCap,
    light: () => exports.sim_light(),
    step: (dt) => {
      api.feedEntropy();
      exports.sim_step(dt);
    },
    // Restart with a fresh stick; callers pick the seed (crypto-seeded).
    restart: (nextSeed, nextMode = api.mode) => {
      api.mode = nextMode;
      exports.sim_init(nextSeed >>> 0, nextMode === RNG_MODE.TRNG ? 1 : 0);
      eventCursor = exports.event_head();
    },
    setTilt: (x) => exports.set_tilt(x),
    setBreeze: (x) => exports.set_breeze(x),
    feedEntropy,
    ballInto(target = ballTarget) {
      return namedValuesInto(target, ball, 0, BALL_FIELDS);
    },
    stateInto(target = stateTarget) {
      return namedValuesInto(target, state, 0, STATE_FIELDS);
    },
    drainEvents(callback) {
      const head = exports.event_head();
      if (head === eventCursor) return;
      let from = eventCursor;
      if (head - from > eventCap) from = head - eventCap;
      for (let seq = from; seq < head; seq += 1) {
        const slot = (seq % eventCap) * EVENT_STRIDE;
        callback(events[slot], events[slot + 1], events[slot + 2], events[slot + 3]);
      }
      eventCursor = head;
    },
  };
  return api;
}
