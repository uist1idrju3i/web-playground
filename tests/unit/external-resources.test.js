import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { checkExternalResources } from '../../scripts/check-external-resources.mjs';

const goodFixture = fileURLToPath(new URL('./fixtures/external-resources/good/', import.meta.url));
const badFixture = fileURLToPath(new URL('./fixtures/external-resources/bad/', import.meta.url));

test('allows same-origin resources and compliant version-pinned cdnjs resources', async () => {
  assert.deepEqual(await checkExternalResources(goodFixture), []);
});

test('rejects external origins, unpinned cdnjs, missing SRI, and unprotected module imports', async () => {
  const violations = await checkExternalResources(badFixture);
  const messages = violations.map(({ message }) => message);

  assert.ok(messages.some((message) => message.includes('https://example.com')));
  assert.ok(messages.some((message) => message.includes('exact /ajax/libs')));
  assert.ok(messages.some((message) => message.includes('must include sha384 or sha512')));
  assert.ok(messages.some((message) => message.includes('crossorigin="anonymous"')));
  assert.ok(messages.some((message) => message.includes('ES module imports need an import-map')));
  assert.ok(messages.some((message) => message.includes('https://example.org')));
  assert.ok(messages.some((message) => message.includes('https://fonts.googleapis.com')));
  assert.ok(!messages.some((message) => message.includes('developer.mozilla.org')));
});
