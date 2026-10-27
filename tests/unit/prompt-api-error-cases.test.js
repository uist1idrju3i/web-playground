import assert from 'node:assert/strict';
import test from 'node:test';
import { ERROR_CASES } from '../../public_html/prompt-api/js/error-cases.js';

test('error lab cases have unique identifiers, expectations, and citations', () => {
  assert.equal(ERROR_CASES.length, 7);
  assert.equal(new Set(ERROR_CASES.map(({ id }) => id)).size, ERROR_CASES.length);
  for (const row of ERROR_CASES) {
    assert.match(row.id, /^[a-z][a-z-]+$/u);
    assert.ok(row.title.length > 0);
    assert.ok(
      ['TypeError', 'SyntaxError', 'AbortError', 'NotSupportedError'].includes(row.expected),
    );
    assert.match(row.citation, /^(README|Explainer|IDL) · .+/u);
  }
  assert.deepEqual(
    ERROR_CASES.map(({ id, expected }) => [id, expected]),
    [
      ['system-order', 'TypeError'],
      ['prefix-order', 'SyntaxError'],
      ['omit-constraint', 'TypeError'],
      ['destroyed-prompt', 'AbortError'],
      ['invalid-content', 'TypeError'],
      ['abort-prompt', 'AbortError'],
      ['undeclared-image', 'NotSupportedError'],
    ],
  );
});
