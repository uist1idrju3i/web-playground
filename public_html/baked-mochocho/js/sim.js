export const FIELD_CHANNELS = 4;

const CAVITY_STRIDE = 16;
const PARTICLE_STRIDE = 8;
const STATS_STRIDE = 16;
const SIMD_TEST = Uint8Array.from([
  0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00, 0x01, 0x04, 0x01, 0x60, 0x00, 0x00, 0x03, 0x02,
  0x01, 0x00, 0x0a, 0x17, 0x01, 0x15, 0x00, 0xfd, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
  0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x1a, 0x0b,
]);

const CAVITY_FIELDS = [
  'state',
  'batterMl',
  'fillingKind',
  'fillingX',
  'fillingY',
  'fillingG',
  'topSetMean',
  'bottomBrownMean',
  'topBrownMean',
  'coreTempC',
  'flipAngle',
  'flipLanded',
  'plateTempC',
  'burntFraction',
  'rawFraction',
  'bakeSeconds',
];

const AUDIO_FIELDS = [
  'sizzle',
  'bubblePops',
  'pourFlowMlS',
  'contactBurst',
  'flipLandedEvents',
  'burning',
  'steamRate',
  'reserved',
];

const STATS_FIELDS = [
  'topBrownMean',
  'topBrownStd',
  'bottomBrownMean',
  'bottomBrownStd',
  'burntFraction',
  'rawFraction',
  'volumeMl',
  'spillMl',
  'fillingKind',
  'fillingG',
  'fillingOffsetMm',
  'coreTempC',
  'ringWhiteness',
  'oilCoverage',
  'bubbleMarksMean',
  'bakeSeconds',
];

function namedValues(view, offset, fields) {
  return Object.fromEntries(fields.map((field, index) => [field, view[offset + index]]));
}

// Per-frame reads reuse the caller's object to avoid allocating every frame.
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
  const url = new URL(`../wasm/mochocho-sim${simd ? '-simd' : ''}.wasm`, import.meta.url);
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
    'sim_time',
    'set_heat',
    'set_nozzle',
    'grease',
    'add_filling',
    'start_flip',
    'take_out',
    'reset_pair',
    'grid_w',
    'grid_h',
    'cell_mm',
    'cavity_count',
    'cavity_x',
    'cavity_y',
    'cavity_radius',
    'cavity_depth',
    'mold_z',
    'field_a_ptr',
    'field_b_ptr',
    'particle_ptr',
    'particle_count',
    'cavity_ptr',
    'audio_ptr',
    'stats_ptr',
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

  const grid = { w: exports.grid_w(), h: exports.grid_h(), cell: exports.cell_mm() };
  const cavities = Array.from({ length: exports.cavity_count() }, (_, index) => ({
    x: exports.cavity_x(index),
    y: exports.cavity_y(index),
  }));
  const fieldA = new Uint16Array(
    exports.memory.buffer,
    exports.field_a_ptr(),
    grid.w * grid.h * FIELD_CHANNELS,
  );
  const fieldB = new Uint16Array(
    exports.memory.buffer,
    exports.field_b_ptr(),
    grid.w * grid.h * FIELD_CHANNELS,
  );
  const cavityView = new Float32Array(
    exports.memory.buffer,
    exports.cavity_ptr(),
    exports.cavity_count() * CAVITY_STRIDE,
  );
  const audioView = new Float32Array(
    exports.memory.buffer,
    exports.audio_ptr(),
    AUDIO_FIELDS.length,
  );
  const statsView = new Float32Array(
    exports.memory.buffer,
    exports.stats_ptr(),
    exports.cavity_count() * STATS_STRIDE,
  );
  const particleView = new Float32Array(
    exports.memory.buffer,
    exports.particle_ptr(),
    4096 * PARTICLE_STRIDE,
  );

  return {
    simd: useSimd,
    grid,
    cavities,
    radius: exports.cavity_radius(),
    depth: exports.cavity_depth(),
    moldZ: (x, y) => exports.mold_z(x, y),
    step: (dt) => exports.sim_step(dt),
    time: () => exports.sim_time(),
    setHeat: (level) => exports.set_heat(level),
    setNozzle: (x, y, rate) => exports.set_nozzle(x, y, rate),
    grease: (x, y, radius, amount) => exports.grease(x, y, radius, amount),
    addFilling: (cavity, kind, x, y) => exports.add_filling(cavity, kind, x, y),
    startFlip: (pair) => exports.start_flip(pair),
    takeOut(pair) {
      const code = exports.take_out(pair);
      if (code !== 0) return { ok: false, code };
      return namedValues(statsView, pair * STATS_STRIDE, STATS_FIELDS);
    },
    resetPair: (pair) => exports.reset_pair(pair),
    fieldA,
    fieldB,
    particles() {
      return particleView.subarray(0, exports.particle_count() * PARTICLE_STRIDE);
    },
    cavity(index) {
      if (!Number.isInteger(index) || index < 0 || index >= cavities.length) {
        throw new RangeError(`Invalid cavity index: ${index}`);
      }
      return namedValues(cavityView, index * CAVITY_STRIDE, CAVITY_FIELDS);
    },
    cavityInto(index, target) {
      if (!Number.isInteger(index) || index < 0 || index >= cavities.length) {
        throw new RangeError(`Invalid cavity index: ${index}`);
      }
      return namedValuesInto(target, cavityView, index * CAVITY_STRIDE, CAVITY_FIELDS);
    },
    audio() {
      return namedValues(audioView, 0, AUDIO_FIELDS);
    },
    audioInto(target) {
      return namedValuesInto(target, audioView, 0, AUDIO_FIELDS);
    },
  };
}
