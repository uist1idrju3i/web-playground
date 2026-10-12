import assert from 'node:assert/strict';
import test from 'node:test';
import { webcrypto } from 'node:crypto';
import { canonicalJson, createSignedStore } from '../../public_html/library/js/signed-storage.js';

function memoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  };
}

function memoryKeyStore() {
  const values = new Map();
  return {
    get: async (key) => values.get(key),
    put: async (key, value) => values.set(key, value),
    delete: async (key) => values.delete(key),
  };
}

function makeStore(options = {}) {
  return createSignedStore({
    name: 'test-app',
    version: 1,
    storage: memoryStorage(),
    keyStore: memoryKeyStore(),
    subtle: webcrypto.subtle,
    ...options,
  });
}

test('canonical JSON sorts nested object keys without whitespace', () => {
  assert.equal(
    canonicalJson({ z: 1, nested: { b: true, a: ['x', null] }, a: 'value' }),
    '{"a":"value","nested":{"a":["x",null],"b":true},"z":1}',
  );
});

test('canonical JSON rejects non-finite and non-JSON values', () => {
  for (const value of [NaN, Infinity, -Infinity, undefined, () => {}, Symbol('key'), 1n]) {
    assert.throws(() => canonicalJson(value), TypeError);
  }
  assert.throws(() => canonicalJson({ value: undefined }), TypeError);
  const sparse = [];
  sparse.length = 1;
  assert.throws(() => canonicalJson(sparse), TypeError);
});

test('signed storage round-trips data and advances a non-extractable key counter', async () => {
  const storage = memoryStorage();
  const keyStore = memoryKeyStore();
  const store = await makeStore({ storage, keyStore });

  assert.deepEqual(await store.load(), {
    status: 'empty',
    data: null,
    detail: 'No saved data.',
  });
  assert.deepEqual(await store.save({ score: 42, options: { muted: true } }), { counter: 1 });
  assert.deepEqual(await store.load(), {
    status: 'ok',
    data: { score: 42, options: { muted: true } },
    detail: 'Signature verified.',
  });
  const record = await keyStore.get('test-app');
  assert.equal(record.counter, 1);
  assert.equal(record.key.extractable, false);
  assert.deepEqual(await store.save({ score: 43 }), { counter: 2 });
});

test('a failed second envelope write preserves the first saved data', async () => {
  const backingStorage = memoryStorage();
  let writeCount = 0;
  const storage = {
    ...backingStorage,
    setItem(key, value) {
      writeCount += 1;
      if (writeCount === 2) throw new Error('Storage quota exceeded.');
      backingStorage.setItem(key, value);
    },
  };
  const store = await makeStore({ storage, keyStore: memoryKeyStore() });
  await store.save({ score: 42 });

  await assert.rejects(store.save({ score: 43 }), /Unable to save signed data/);
  assert.deepEqual(await store.load(), {
    status: 'ok',
    data: { score: 42 },
    detail: 'Signature verified.',
  });
});

test('signed storage detects data tampering', async () => {
  const storage = memoryStorage();
  const store = await makeStore({ storage, keyStore: memoryKeyStore() });
  await store.save({ score: 42 });

  const envelope = JSON.parse(storage.getItem('wp-signed:test-app'));
  envelope.data.score = 100;
  storage.setItem('wp-signed:test-app', JSON.stringify(envelope));
  assert.equal((await store.load()).status, 'tampered');
});

test('signed storage detects signature tampering', async () => {
  const storage = memoryStorage();
  const store = await makeStore({ storage, keyStore: memoryKeyStore() });
  await store.save({ score: 42 });

  const envelope = JSON.parse(storage.getItem('wp-signed:test-app'));
  envelope.mac = `${envelope.mac[0] === 'A' ? 'B' : 'A'}${envelope.mac.slice(1)}`;
  storage.setItem('wp-signed:test-app', JSON.stringify(envelope));
  assert.equal((await store.load()).status, 'tampered');
});

test('signed storage rejects replay of an older signed envelope', async () => {
  const storage = memoryStorage();
  const keyStore = memoryKeyStore();
  const store = await makeStore({ storage, keyStore });
  await store.save({ score: 1 });
  const oldEnvelope = storage.getItem('wp-signed:test-app');
  await store.save({ score: 2 });
  storage.setItem('wp-signed:test-app', oldEnvelope);

  assert.equal((await store.load()).status, 'rollback');
});

test('signed storage reports a missing signing key', async () => {
  const storage = memoryStorage();
  const keyStore = memoryKeyStore();
  const store = await makeStore({ storage, keyStore });
  await store.save({ score: 42 });
  await keyStore.delete('test-app');

  assert.equal((await store.load()).status, 'key-missing');
});

test('signed storage reports unavailable when Web Crypto is missing', async () => {
  const store = await makeStore({ subtle: null });
  assert.equal((await store.load()).status, 'unavailable');
});

test('signed storage distinguishes corrupt JSON and version mismatch', async () => {
  const storage = memoryStorage();
  const keyStore = memoryKeyStore();
  const oldStore = await makeStore({ storage, keyStore });
  storage.setItem('wp-signed:test-app', '{');
  assert.equal((await oldStore.load()).status, 'corrupt');

  await oldStore.save({ score: 42 });
  const newStore = await makeStore({ storage, keyStore, version: 2 });
  assert.equal((await newStore.load()).status, 'version-mismatch');
});
