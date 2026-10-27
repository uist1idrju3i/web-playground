import assert from 'node:assert/strict';
import test from 'node:test';
import { calculate } from '../../public_html/prompt-api/js/calc.js';

test('safe calculator respects precedence, parentheses, decimals, and unary signs', () => {
  assert.equal(calculate('2 + 3 * 4'), 14);
  assert.equal(calculate('(2 + 3) * 4'), 20);
  assert.equal(calculate('-2 * (+3.5)'), -7);
  assert.equal(calculate('8 / 4 / 2'), 1);
});

test('safe calculator rejects identifiers, injection syntax, and malformed expressions', () => {
  for (const expression of [
    'globalThis.process.exit()',
    'require("node:fs")',
    '1; process.exit(1)',
    'Function("return 1")()',
    '1 ** 2',
    '2(3)',
    '1..5',
  ]) {
    assert.throws(() => calculate(expression), SyntaxError, expression);
  }
});

test('safe calculator rejects division by zero and non-finite results', () => {
  assert.throws(() => calculate('3 / 0'), RangeError);
  assert.throws(() => calculate('9'.repeat(400)), SyntaxError);
});
