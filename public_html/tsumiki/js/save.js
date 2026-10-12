// Save data integrity via WebCrypto HMAC-SHA-256. The HMAC key is generated
// once and kept as a non-extractable CryptoKey in IndexedDB. The payload is
// readable JSON — this is tamper evidence, not encryption.
const DB_NAME = 'wp-tsumiki';
const STORE = 'keys';
const KEY_ID = 'hmac-sha256';
const SAVE_KEY = 'wp-tsumiki-save-v1';
const CORRUPT_KEY = 'wp-tsumiki-save-v1.corrupt';

function canonicalize(value) {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
  const keys = Object.keys(value).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalize(value[k])}`).join(',')}}`;
}

const encoder = new TextEncoder();

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getOrCreateKey() {
  const db = await openDb();
  try {
    const existing = await new Promise((resolve, reject) => {
      const request = db.transaction(STORE).objectStore(STORE).get(KEY_ID);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    if (existing) return existing;
    const key = await crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, false, [
      'sign',
      'verify',
    ]);
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(key, KEY_ID);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    return key;
  } finally {
    db.close();
  }
}

async function sign(key, data) {
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(canonicalize(data)));
  return toHex(mac);
}

// verify via sign + constant-time compare for compatibility across engines
async function verify(key, data, macHex) {
  const expected = await sign(key, data);
  if (expected.length !== macHex.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ macHex.charCodeAt(i);
  return diff === 0;
}

export class SaveStore {
  constructor() {
    this.key = null;
    this.available = false;
    this.reason = null;
  }

  async init() {
    try {
      if (!crypto?.subtle || !indexedDB) {
        this.reason = 'WebCrypto or IndexedDB unavailable';
        return false;
      }
      this.key = await getOrCreateKey();
      this.available = true;
      return true;
    } catch (error) {
      this.reason = String(error?.name ?? error);
      return false;
    }
  }

  defaultData() {
    return {
      bestScore: 0,
      bestHeight: 0,
      collected: [],
      totalDrops: 0,
      runs: 0,
      oobeDone: false,
      settings: { muted: false, volume: 0.8, reduceMotion: false },
    };
  }

  async load() {
    if (!this.available) return { status: 'unavailable', data: this.defaultData() };
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { status: 'empty', data: this.defaultData() };
    try {
      const envelope = JSON.parse(raw);
      if (envelope?.v !== 1 || typeof envelope.hmac !== 'string') {
        throw new Error('bad envelope');
      }
      const ok = await verify(this.key, envelope.data, envelope.hmac);
      if (!ok) {
        localStorage.setItem(CORRUPT_KEY, raw);
        localStorage.removeItem(SAVE_KEY);
        return { status: 'tampered', data: this.defaultData() };
      }
      return { status: 'ok', data: { ...this.defaultData(), ...envelope.data } };
    } catch {
      localStorage.setItem(CORRUPT_KEY, raw);
      localStorage.removeItem(SAVE_KEY);
      return { status: 'tampered', data: this.defaultData() };
    }
  }

  async save(data) {
    if (!this.available) return false;
    const envelope = { v: 1, data, hmac: await sign(this.key, data) };
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(envelope));
      return true;
    } catch {
      return false;
    }
  }
}

export { canonicalize, sign, verify };
