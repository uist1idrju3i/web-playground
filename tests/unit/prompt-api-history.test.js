import assert from 'node:assert/strict';
import test from 'node:test';
import { webcrypto } from 'node:crypto';
import { createSignedStore } from '../../public_html/library/js/signed-storage.js';
import { makeHistory, restoreInitialPrompts } from '../../public_html/prompt-api/js/history.js';

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

test('chat history round-trips into system and conversation initial prompts', () => {
  const saved = makeHistory({
    system: 'Be concise.',
    messages: [
      { role: 'user', content: 'Question' },
      { role: 'assistant', content: 'Answer' },
      { role: 'tool', content: 'not persisted' },
    ],
    settings: { inputLanguage: 'ja', outputLanguage: 'en' },
  });

  assert.equal(saved.schemaVersion, 1);
  assert.deepEqual(saved.settings, { inputLanguage: 'ja', outputLanguage: 'en' });
  assert.deepEqual(restoreInitialPrompts(saved), [
    { role: 'system', content: 'Be concise.' },
    { role: 'user', content: 'Question' },
    { role: 'assistant', content: 'Answer' },
  ]);
});

test('signed chat history detects an edited saved conversation', async () => {
  const storage = memoryStorage();
  const store = await createSignedStore({
    name: 'prompt-api-history-test',
    version: 1,
    storage,
    keyStore: memoryKeyStore(),
    subtle: webcrypto.subtle,
  });
  await store.save(
    makeHistory({ system: 'Be concise.', messages: [{ role: 'user', content: 'Hi' }] }),
  );
  assert.equal((await store.load()).status, 'ok');

  const envelope = JSON.parse(storage.getItem('wp-signed:prompt-api-history-test'));
  envelope.data.messages[0].content = 'Edited';
  storage.setItem('wp-signed:prompt-api-history-test', JSON.stringify(envelope));

  assert.equal((await store.load()).status, 'tampered');
});
