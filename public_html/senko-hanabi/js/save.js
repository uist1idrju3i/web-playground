// HMAC-signed persistence via the shared library. Buckets keep the schema
// shape stable so future fields can merge over DEFAULT_SAVE.

import { createSignedStore } from '../../library/js/signed-storage.js';

export const APP_ID = 'senko-hanabi';

export const DEFAULT_SAVE = Object.freeze({
  settings: {
    lang: 'ja',
    volume: 0.8,
    muted: false,
    bgm: true,
    mode: 'feel',
    oobeSeen: false,
  },
  // Per-mode records: sticks lit, longest burn, per-mode histograms of burn
  // seconds (8 x 5s buckets, cap 40s+) and ejection intervals (8 x 50ms).
  stats: {
    feel: {
      sticks: 0,
      longest: 0,
      lastDur: 0,
      hist: [0, 0, 0, 0, 0, 0, 0, 0],
      ints: [0, 0, 0, 0, 0, 0, 0, 0],
    },
    trng: {
      sticks: 0,
      longest: 0,
      lastDur: 0,
      hist: [0, 0, 0, 0, 0, 0, 0, 0],
      ints: [0, 0, 0, 0, 0, 0, 0, 0],
    },
  },
  ui: {},
  play: {},
  sys: {},
});

export function mergeSave(raw) {
  const merged = structuredClone(DEFAULT_SAVE);
  if (!raw || typeof raw !== 'object') return merged;
  const src = raw.data ?? raw;
  const assign = (dst, s) => {
    if (!s || typeof s !== 'object') return;
    for (const [k, v] of Object.entries(s)) {
      if (v && typeof v === 'object' && dst[k] && typeof dst[k] === 'object' && !Array.isArray(v)) {
        assign(dst[k], v);
      } else if (v !== undefined) {
        dst[k] = v;
      }
    }
  };
  assign(merged, src);
  for (const key of Object.keys(merged)) {
    if (!(key in DEFAULT_SAVE)) delete merged[key];
  }
  return merged;
}

export async function openSave() {
  const store = await createSignedStore({ name: APP_ID, version: 1 });
  const loaded = await store.load();
  const data = mergeSave(loaded.data);
  return {
    store,
    data,
    status: loaded.status ?? 'clean',
    save() {
      return store.save(data);
    },
  };
}
