import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extensionSource,
  enabledFeatures,
} from '../../public_html/codemirror/js/extension-config.js';
import { diagnosticsFor } from '../../public_html/codemirror/js/lint-rules.js';
import { formatTransactionLog } from '../../public_html/codemirror/js/transaction-log.js';

test('lint rules report JSON errors and JavaScript var warnings', () => {
  assert.equal(diagnosticsFor('json', '{"broken":}')[0].severity, 'error');
  assert.equal(diagnosticsFor('javascript', 'var oldName = 1;')[0].severity, 'warning');
  assert.equal(diagnosticsFor('css', '.ok {}').length, 0);
});

test('extension configuration reflects enabled settings', () => {
  const settings = { lineNumbers: true, autocomplete: true, readOnly: false };
  assert.deepEqual(enabledFeatures(settings), ['line numbers', 'autocomplete']);
  assert.match(extensionSource(settings, 'javascript'), /lineNumbers\(\)/u);
  assert.match(extensionSource(settings, 'javascript'), /javascript\(\)/u);
});

test('transaction log formatting is stable and capped by the caller', () => {
  assert.deepEqual(formatTransactionLog([{ changes: 'none', selection: '0-0', effects: 'none' }]), [
    '01 · changes: none · selection: 0-0 · effects: none',
  ]);
});
