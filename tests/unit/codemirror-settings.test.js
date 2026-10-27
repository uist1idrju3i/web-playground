import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { createSignedStore } from '../../public_html/library/js/signed-storage.js';
import {
  defaultSettings,
  normalizeSettings,
  restorePayload,
  savePayload,
} from '../../public_html/codemirror/js/settings.js';

function memoryStore() {
  const data = new Map();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => data.set(key, value),
    data,
  };
}

test('CodeMirror settings normalize and round-trip', () => {
  const settings = normalizeSettings({ theme: 'dark', tabSize: 99, fontSize: 2, keymap: 'vim' });
  const restored = restorePayload(savePayload(settings, { javascript: 'const answer = 42;' }));
  assert.equal(restored.settings.theme, 'dark');
  assert.equal(restored.settings.tabSize, 8);
  assert.equal(restored.settings.fontSize, 12);
  assert.equal(restored.settings.keymap, 'vim');
  assert.equal(restored.documents.javascript, 'const answer = 42;');
  assert.equal(defaultSettings.language, 'javascript');
});

test('signed CodeMirror save rejects a tampered envelope', async () => {
  const storage = memoryStore();
  const key = await webcrypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, true, [
    'sign',
    'verify',
  ]);
  const keyStore = {
    async get() {
      return { key, counter: 0 };
    },
    async put() {},
    async delete() {},
  };
  const store = await createSignedStore({
    name: 'codemirror-test',
    version: 1,
    storage,
    keyStore,
    subtle: webcrypto.subtle,
  });
  assert.equal((await store.save(savePayload(defaultSettings, {}))).counter, 1);
  const envelope = JSON.parse(storage.data.get('wp-signed:codemirror-test'));
  envelope.data.settings.theme = 'dark';
  storage.data.set('wp-signed:codemirror-test', JSON.stringify(envelope));
  assert.equal((await store.load()).status, 'tampered');
});
