// Thin wrapper over the starhopper_sim WebAssembly module. All simulation
// state lives in flat f32 blocks inside wasm memory; JS reads them through
// typed-array views mapped by the *_ptr exports.

export const ISLAND_STRIDE = 8;
export const SHARD_STRIDE = 8;
export const PLAYER_STRIDE = 16;
export const STATE_STRIDE = 16;
export const EVENT_STRIDE = 4;

const SIMD_TEST = Uint8Array.from([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x04, 0x01, 0x60, 0x00, 0x00, 0x03, 0x02,
  0x01, 0x00, 0x0a, 0x17, 0x01, 0x15, 0x00, 0xfd, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1a, 0x0b,
]);

export const ISLAND_FIELDS = [
  'x',
  'topY',
  'z',
  'radius',
  'thickness',
  'tone',
  'wobble',
  'reserved',
];
export const SHARD_FIELDS = ['x', 'y', 'z', 'taken', 'kind', 'phase', 'r0', 'r1'];
export const PLAYER_FIELDS = [
  'x',
  'y',
  'z',
  'vx',
  'vy',
  'vz',
  'yaw',
  'pitch',
  'grounded',
  'coyote',
  'buffer',
  'airJumps',
  'lastIsland',
  'island',
  'landImpact',
  'reserved',
];
export const STATE_FIELDS = [
  'timeLeft',
  'elapsed',
  'score',
  'combo',
  'comboTimer',
  'taken',
  'falls',
  'bestCombo',
  'finished',
  'finishReason',
  'respawnT',
  'r0',
  'r1',
  'r2',
  'r3',
  'r4',
];

export const EVENT = {
  PICKUP: 1,
  JUMP: 2,
  DOUBLE_JUMP: 3,
  LAND: 4,
  FALL: 5,
  FINISH: 6,
  COMBO: 7,
};
export const REASON = { WIN: 1, TIMEOUT: 2 };
export const KIND = { NORMAL: 0, BONUS: 1 };

function namedValues(view, offset, fields) {
  return Object.fromEntries(fields.map((field, index) => [field, view[offset + index]]));
}

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
  const url = new URL(`../wasm/starhopper-sim${simd ? '-simd' : ''}.wasm`, import.meta.url);
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
    'sim_step',
    'sim_teleport',
    'set_move',
    'set_look',
    'set_jump',
    'island_count',
    'shard_count',
    'eye_height',
    'time_limit',
    'event_head',
    'event_cap',
    'island_ptr',
    'shard_ptr',
    'player_ptr',
    'state_ptr',
    'event_ptr',
  ];
  for (const name of required) {
    if (!(name in exports)) throw new Error(`Simulation WASM is missing export "${name}".`);
  }
}

export async function createSimulation({ seed = 1, simd = undefined, source = undefined } = {}) {
  const useSimd = simd ?? WebAssembly.validate(SIMD_TEST);
  const { instance } = await loadWasm(source, useSimd);
  const { exports } = instance;
  requireExports(exports);
  exports.sim_init(seed >>> 0);

  const islandCount = exports.island_count();
  const shardCount = exports.shard_count();
  const eventCap = exports.event_cap();
  const islands = new Float32Array(
    exports.memory.buffer,
    exports.island_ptr(),
    islandCount * ISLAND_STRIDE,
  );
  const shards = new Float32Array(
    exports.memory.buffer,
    exports.shard_ptr(),
    shardCount * SHARD_STRIDE,
  );
  const player = new Float32Array(exports.memory.buffer, exports.player_ptr(), PLAYER_STRIDE);
  const state = new Float32Array(exports.memory.buffer, exports.state_ptr(), STATE_STRIDE);
  const events = new Float32Array(
    exports.memory.buffer,
    exports.event_ptr(),
    eventCap * EVENT_STRIDE,
  );

  let eventCursor = exports.event_head();

  const playerTarget = {};
  const stateTarget = {};

  return {
    simd: useSimd,
    islands,
    shards,
    player,
    state,
    events,
    islandCount,
    shardCount,
    eventCap,
    eyeHeight: exports.eye_height(),
    timeLimit: exports.time_limit(),
    step: (dt) => exports.sim_step(dt),
    teleport: (x, y, z) => exports.sim_teleport(x, y, z),
    setMove: (x, z) => exports.set_move(x, z),
    setLook: (yaw, pitch) => exports.set_look(yaw, pitch),
    setJump: (held) => exports.set_jump(held ? 1 : 0),
    // Re-runs sim_init: same seed rebuilds the identical world and resets the
    // run; the event ring restarts from zero so the cursor is re-synced here.
    restart: (seed = 1) => {
      exports.sim_init(seed >>> 0);
      eventCursor = exports.event_head();
    },
    island(index) {
      if (!Number.isInteger(index) || index < 0 || index >= islandCount) {
        throw new RangeError(`Invalid island index: ${index}`);
      }
      return namedValues(islands, index * ISLAND_STRIDE, ISLAND_FIELDS);
    },
    shard(index) {
      if (!Number.isInteger(index) || index < 0 || index >= shardCount) {
        throw new RangeError(`Invalid shard index: ${index}`);
      }
      return namedValues(shards, index * SHARD_STRIDE, SHARD_FIELDS);
    },
    playerInto(target = playerTarget) {
      return namedValuesInto(target, player, 0, PLAYER_FIELDS);
    },
    stateInto(target = stateTarget) {
      return namedValuesInto(target, state, 0, STATE_FIELDS);
    },
    // Walks events emitted since the last call. U32 wrap is safe: the head is
    // a wrapping counter and the ring holds the most recent `eventCap` events.
    drainEvents(callback) {
      const head = exports.event_head();
      if (head === eventCursor) return;
      let from = eventCursor;
      if (head - from > eventCap) from = head - eventCap; // ring overflowed
      for (let seq = from; seq < head; seq += 1) {
        const slot = (seq % eventCap) * EVENT_STRIDE;
        callback(events[slot], events[slot + 1], events[slot + 2], events[slot + 3]);
      }
      eventCursor = head;
    },
    resetEvents() {
      eventCursor = exports.event_head();
    },
  };
}
