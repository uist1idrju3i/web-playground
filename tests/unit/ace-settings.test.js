import assert from 'node:assert/strict';
import test from 'node:test';
import { webcrypto } from 'node:crypto';
import { createSignedStore } from '../../public_html/library/js/signed-storage.js';
import {
  createDefaultSave,
  DEFAULT_DOCUMENTS,
  DEFAULT_OPTIONS,
  formatSaveStatus,
  migrateAceSave,
} from '../../public_html/ace/settings.js';

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

test('default Ace save contains every original sample and option', () => {
  const save = createDefaultSave();
  assert.deepEqual(Object.keys(save.documents), Object.keys(DEFAULT_DOCUMENTS));
  assert.deepEqual(save.options, DEFAULT_OPTIONS);
});

test('Ace save migration upgrades the first schema and ignores untrusted keys', () => {
  const migrated = migrateAceSave({
    schemaVersion: 0,
    language: 'python',
    docs: { python: 'print("saved")', injected: '<bad>' },
    settings: { theme: 'tomorrow_night', tabSize: 40, keybinding: 'unknown' },
  });
  assert.equal(migrated.schemaVersion, 1);
  assert.equal(migrated.activeLanguage, 'python');
  assert.equal(migrated.documents.python, 'print("saved")');
  assert.equal(migrated.documents.injected, undefined);
  assert.equal(migrated.options.theme, 'tomorrow_night');
  assert.equal(migrated.options.tabSize, 8);
  assert.equal(migrated.options.keybinding, 'default');
});

test('invalid saves fall back to a fresh workspace and status copy is explicit', () => {
  assert.deepEqual(migrateAceSave(null), createDefaultSave());
  assert.deepEqual(migrateAceSave({ schemaVersion: 9 }), createDefaultSave());
  assert.match(formatSaveStatus('tampered'), /integrity check/u);
  assert.match(formatSaveStatus('unavailable'), /stay in this tab/u);
});

test('Ace save round-trips through signed storage and detects tampering', async () => {
  const storage = memoryStorage();
  const keyStore = memoryKeyStore();
  const store = await createSignedStore({
    name: 'ace-lab-test',
    version: 1,
    storage,
    keyStore,
    subtle: webcrypto.subtle,
  });
  const save = createDefaultSave();
  save.documents.javascript += '\n// saved';
  await store.save(save);
  assert.deepEqual((await store.load()).data, save);

  const envelope = JSON.parse(storage.getItem('wp-signed:ace-lab-test'));
  envelope.mac = `${envelope.mac[0] === '0' ? '1' : '0'}${envelope.mac.slice(1)}`;
  storage.setItem('wp-signed:ace-lab-test', JSON.stringify(envelope));
  assert.equal((await store.load()).status, 'tampered');
});
