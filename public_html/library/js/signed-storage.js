const encoder = new TextEncoder();

export function canonicalJson(value) {
  const ancestors = new Set();

  function serialize(item) {
    if (item === null) return 'null';
    if (typeof item === 'string' || typeof item === 'boolean') return JSON.stringify(item);
    if (typeof item === 'number') {
      if (!Number.isFinite(item)) throw new TypeError('Canonical JSON requires finite numbers.');
      return JSON.stringify(item);
    }
    if (typeof item === 'undefined' || typeof item === 'function' || typeof item === 'symbol') {
      throw new TypeError('Canonical JSON does not support undefined or executable values.');
    }
    if (typeof item !== 'object') throw new TypeError('Canonical JSON supports JSON values only.');
    if (ancestors.has(item))
      throw new TypeError('Canonical JSON cannot contain circular references.');
    ancestors.add(item);

    let result;
    if (Array.isArray(item)) {
      const values = [];
      for (let index = 0; index < item.length; index += 1) {
        if (!Object.hasOwn(item, index))
          throw new TypeError('Canonical JSON cannot contain array holes.');
        values.push(serialize(item[index]));
      }
      result = `[${values.join(',')}]`;
    } else {
      const prototype = Object.getPrototypeOf(item);
      if (prototype !== Object.prototype && prototype !== null) {
        throw new TypeError('Canonical JSON supports plain objects only.');
      }
      if (Object.getOwnPropertySymbols(item).length > 0) {
        throw new TypeError('Canonical JSON cannot contain symbol keys.');
      }
      const keys = Object.keys(item).sort();
      result = `{${keys.map((key) => `${JSON.stringify(key)}:${serialize(item[key])}`).join(',')}}`;
    }
    ancestors.delete(item);
    return result;
  }

  return serialize(value);
}

export function createIndexedDbKeyStore({
  dbName = 'web-playground-signed-storage',
  storeName = 'keys',
} = {}) {
  function open() {
    if (!globalThis.indexedDB) return Promise.reject(new Error('IndexedDB is unavailable.'));
    return new Promise((resolve, reject) => {
      const request = globalThis.indexedDB.open(dbName);
      request.onerror = () => reject(request.error ?? new Error('Unable to open IndexedDB.'));
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
      };
      request.onsuccess = () => {
        const db = request.result;
        if (db.objectStoreNames.contains(storeName)) {
          resolve(db);
          return;
        }
        const nextVersion = db.version + 1;
        db.close();
        const upgrade = globalThis.indexedDB.open(dbName, nextVersion);
        upgrade.onerror = () =>
          reject(upgrade.error ?? new Error('Unable to create the IndexedDB key store.'));
        upgrade.onupgradeneeded = () => {
          const upgraded = upgrade.result;
          if (!upgraded.objectStoreNames.contains(storeName)) {
            upgraded.createObjectStore(storeName);
          }
        };
        upgrade.onsuccess = () => resolve(upgrade.result);
      };
    });
  }

  function request(method, name, record) {
    return open().then(
      (db) =>
        new Promise((resolve, reject) => {
          let result;
          let transaction;
          try {
            transaction = db.transaction(storeName, method === 'get' ? 'readonly' : 'readwrite');
            const store = transaction.objectStore(storeName);
            const operation =
              method === 'get'
                ? store.get(name)
                : method === 'put'
                  ? store.put(record, name)
                  : store.delete(name);
            operation.onsuccess = () => {
              result = operation.result;
            };
            operation.onerror = () =>
              reject(operation.error ?? new Error('IndexedDB key-store request failed.'));
            transaction.oncomplete = () => resolve(result);
            transaction.onerror = () =>
              reject(transaction.error ?? new Error('IndexedDB key-store transaction failed.'));
            transaction.onabort = () =>
              reject(transaction.error ?? new Error('IndexedDB key-store transaction aborted.'));
          } catch (error) {
            reject(error);
          } finally {
            transaction?.addEventListener('complete', () => db.close(), { once: true });
            transaction?.addEventListener('abort', () => db.close(), { once: true });
          }
        }),
    );
  }

  return {
    get: (name) => request('get', name),
    put: (name, record) => request('put', name, record),
    delete: (name) => request('delete', name),
  };
}

function encodeBase64Url(bytes) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return globalThis.btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/u, '');
}

function decodeBase64Url(value) {
  if (typeof value !== 'string' || !/^[\w-]*$/u.test(value)) {
    throw new TypeError('Invalid base64url data.');
  }
  const base64 = value.replaceAll('-', '+').replaceAll('_', '/');
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
  const binary = globalThis.atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function unavailable(detail) {
  return { status: 'unavailable', data: null, detail };
}

function isDataObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export async function createSignedStore({
  name,
  version,
  storage = globalThis.localStorage,
  keyStore,
  subtle = globalThis.crypto?.subtle,
}) {
  const usesIndexedDb = keyStore === undefined;
  keyStore ??= createIndexedDbKeyStore();
  const storageKey = `wp-signed:${name}`;

  function available() {
    if (
      !storage ||
      typeof storage.getItem !== 'function' ||
      typeof storage.setItem !== 'function'
    ) {
      return 'Local storage is unavailable.';
    }
    if (!subtle || typeof subtle.sign !== 'function' || typeof subtle.verify !== 'function') {
      return 'Web Crypto is unavailable.';
    }
    if (usesIndexedDb && !globalThis.indexedDB) return 'IndexedDB is unavailable.';
    if (
      !keyStore ||
      typeof keyStore.get !== 'function' ||
      typeof keyStore.put !== 'function' ||
      typeof keyStore.delete !== 'function'
    ) {
      return 'IndexedDB key storage is unavailable.';
    }
    return null;
  }

  async function load() {
    const unavailableReason = available();
    if (unavailableReason) return unavailable(unavailableReason);

    let serialized;
    try {
      serialized = storage.getItem(storageKey);
    } catch (error) {
      return unavailable(`Unable to read local storage: ${error.message}`);
    }
    if (serialized === null) return { status: 'empty', data: null, detail: 'No saved data.' };

    let envelope;
    try {
      envelope = JSON.parse(serialized);
    } catch {
      return { status: 'corrupt', data: null, detail: 'Saved envelope is not valid JSON.' };
    }
    if (
      !isDataObject(envelope) ||
      envelope.app !== name ||
      !Number.isSafeInteger(envelope.n) ||
      envelope.n < 1 ||
      typeof envelope.t !== 'string' ||
      !Number.isFinite(Date.parse(envelope.t)) ||
      typeof envelope.mac !== 'string' ||
      !isDataObject(envelope.data)
    ) {
      return { status: 'corrupt', data: null, detail: 'Saved envelope has an invalid shape.' };
    }
    try {
      canonicalJson(envelope.data);
    } catch {
      return { status: 'corrupt', data: null, detail: 'Saved data is not canonical JSON.' };
    }
    let record;
    try {
      record = await keyStore.get(name);
    } catch (error) {
      return unavailable(`Unable to read the signing key: ${error.message}`);
    }
    if (!record?.key) {
      return { status: 'key-missing', data: null, detail: 'The signing key is missing.' };
    }
    if (envelope.v !== version) {
      return { status: 'version-mismatch', data: null, detail: 'Saved data uses another version.' };
    }
    if (!Number.isSafeInteger(record.counter) || record.counter < 0) {
      return { status: 'corrupt', data: null, detail: 'Signing-key counter is invalid.' };
    }
    if (envelope.n < record.counter) {
      return {
        status: 'rollback',
        data: null,
        detail: 'Saved data predates the signing-key counter.',
      };
    }

    const { mac, ...unsigned } = envelope;
    let verified = false;
    try {
      verified = await subtle.verify(
        { name: 'HMAC' },
        record.key,
        decodeBase64Url(mac),
        encoder.encode(canonicalJson(unsigned)),
      );
    } catch {
      verified = false;
    }
    if (!verified)
      return { status: 'tampered', data: null, detail: 'Saved data signature is invalid.' };
    if (envelope.n > record.counter) {
      try {
        await keyStore.put(name, { ...record, counter: envelope.n });
      } catch (error) {
        return unavailable(`Unable to update the signing-key counter: ${error.message}`);
      }
    }
    return { status: 'ok', data: envelope.data, detail: 'Signature verified.' };
  }

  async function save(data) {
    const unavailableReason = available();
    if (unavailableReason) throw new Error(unavailableReason);
    if (!isDataObject(data)) throw new TypeError('Signed storage data must be an object.');
    canonicalJson(data);

    let record;
    try {
      record = await keyStore.get(name);
      if (!record?.key) {
        record = {
          key: await subtle.generateKey({ name: 'HMAC', hash: 'SHA-256', length: 256 }, false, [
            'sign',
            'verify',
          ]),
          counter: 0,
        };
      }
      if (!Number.isSafeInteger(record.counter) || record.counter < 0) {
        throw new Error('Signing-key counter is invalid.');
      }
      const counter = record.counter + 1;
      const envelope = {
        app: name,
        v: version,
        n: counter,
        t: new Date().toISOString(),
        data,
      };
      const signature = await subtle.sign(
        { name: 'HMAC' },
        record.key,
        encoder.encode(canonicalJson(envelope)),
      );
      // Write the envelope before advancing the counter so a failed write never looks like a rollback.
      storage.setItem(
        storageKey,
        JSON.stringify({ ...envelope, mac: encodeBase64Url(new Uint8Array(signature)) }),
      );
      await keyStore.put(name, { ...record, counter });
      return { counter };
    } catch (error) {
      throw new Error(`Unable to save signed data: ${error.message}`, { cause: error });
    }
  }

  async function clear() {
    if (!storage || typeof storage.removeItem !== 'function') {
      throw new Error('Local storage is unavailable.');
    }
    storage.removeItem(storageKey);
    await keyStore.delete(name);
  }

  return { load, save, clear };
}
