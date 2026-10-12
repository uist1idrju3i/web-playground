// HMAC-signed save data (shared signed-storage): progress, settings and
// the user's Ruby program. Tamper evidence, not encryption.
import { createSignedStore } from '/library/js/signed-storage.js';

const SAVE_VERSION = 1;
const APP_NAME = 'pong-battle';

export const DEFAULT_SAVE = {
  wins: 0,
  matches: 0,
  best: { rookie: null, club: null, ace: null }, // {gamesFor, gamesAgainst}
  unlocked: 1, // highest enemy level reached (1..3)
  sample: 'chaser',
  code: null, // user's edited brain source
  showThought: true,
  muted: false,
  lang: null, // 'ja' | 'en' | null = auto
};

export async function createSave() {
  const store = await createSignedStore({ name: APP_NAME, version: SAVE_VERSION });
  const data = { ...DEFAULT_SAVE, best: { ...DEFAULT_SAVE.best } };
  let status;
  try {
    const result = await store.load();
    status = result.status;
    if (result.status === 'ok' && result.data && typeof result.data === 'object') {
      for (const key of Object.keys(DEFAULT_SAVE)) {
        if (key in result.data) data[key] = result.data[key];
      }
      if (typeof data.best !== 'object' || data.best === null) data.best = { ...DEFAULT_SAVE.best };
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
  };
}
