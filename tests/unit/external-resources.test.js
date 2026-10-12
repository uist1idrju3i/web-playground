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

  assert.ok(messages.includes('Resource origin is not allowed: https://example.com.'));
  assert.ok(
    messages.includes(
      'cdnjs URL must use an exact /ajax/libs/<name>/<x.y.z>/ version: https://cdnjs.cloudflare.com/ajax/libs/dayjs/latest/dayjs.min.js',
    ),
  );
  assert.ok(messages.includes('cdnjs link must include sha384 or sha512 integrity.'));
  assert.ok(messages.includes('cdnjs link must set crossorigin="anonymous".'));
  assert.ok(
    messages.includes(
      'cdnjs ES module imports need an import-map integrity entry: https://cdnjs.cloudflare.com/ajax/libs/dayjs/1.11.10/dayjs.min.js',
    ),
  );
  assert.ok(messages.includes('Resource origin is not allowed: https://example.org.'));
  assert.ok(messages.includes('Resource origin is not allowed: https://fonts.googleapis.com.'));
  assert.ok(!messages.includes('Resource origin is not allowed: https://developer.mozilla.org.'));
});
