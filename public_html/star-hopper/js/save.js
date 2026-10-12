// Save data integrity via the shared signed-storage library: HMAC-SHA-256
// over a canonical JSON envelope, key held as a non-extractable CryptoKey in
// IndexedDB. Tamper evidence, not encryption — the payload stays readable.

import { createSignedStore } from '/library/js/signed-storage.js';

const SAVE_VERSION = 1;
const APP_NAME = 'star-hopper';

export const DEFAULT_SAVE = {
  bestScore: 0,
  bestTimeLeft: 0,
  bestCombo: 0,
  wins: 0,
  runs: 0,
  totalShards: 0,
  muted: false,
  volume: 0.8,
  bgm: true,
  lang: 'ja',
  oobeSeen: false,
};

export async function createSave() {
  const store = await createSignedStore({ name: APP_NAME, version: SAVE_VERSION });
  const data = { ...DEFAULT_SAVE };
  let status = 'empty';
  try {
    const result = await store.load();
    status = result.status;
    if (result.status === 'ok' && result.data && typeof result.data === 'object') {
      for (const key of Object.keys(DEFAULT_SAVE)) {
        if (key in result.data) data[key] = result.data[key];
      }
    }
  } catch {
    status = 'unavailable';
  }
  return {
    data,
    status,
    async persist() {
      try {
        await store.save(data);
        return 'ok';
      } catch {
        return 'unavailable';
      }
    },
    async clear() {
      try {
        await store.clear();
      } catch {
        /* clearing is best-effort */
      }
    },
  };
}
