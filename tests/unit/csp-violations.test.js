import assert from 'node:assert/strict';
import test from 'node:test';
import {
  filterWebKitUaStyleDiagnostics,
  WEBKIT_UA_STYLE_CONSOLE_ERROR,
} from '../e2e/csp-violations.js';

test('pairs exact WebKit user-agent console echoes with discarded CSP reports', () => {
  const violation = {
    directive: 'style-src-attr',
    blockedURI: 'inline',
    sample: 'text-overflow:inherit',
  };
  const diagnostics = filterWebKitUaStyleDiagnostics(
    [violation, violation],
    [WEBKIT_UA_STYLE_CONSOLE_ERROR, WEBKIT_UA_STYLE_CONSOLE_ERROR, WEBKIT_UA_STYLE_CONSOLE_ERROR],
    'webkit',
  );
  assert.deepEqual(diagnostics, {
    violations: [],
    consoleErrors: [WEBKIT_UA_STYLE_CONSOLE_ERROR],
  });
});

test('does not filter WebKit extras or matching console errors in other engines', () => {
  const violation = {
    directive: 'style-src-attr',
    blockedURI: 'inline',
    sample: 'text-overflow:inherit',
  };
  const errors = [WEBKIT_UA_STYLE_CONSOLE_ERROR];
  assert.deepEqual(filterWebKitUaStyleDiagnostics([violation], errors, 'chromium'), {
    violations: [violation],
    consoleErrors: errors,
  });
  assert.deepEqual(
    filterWebKitUaStyleDiagnostics(
      [{ ...violation, blockedURI: 'https://example.test' }],
      errors,
      'webkit',
    ),
    { violations: [{ ...violation, blockedURI: 'https://example.test' }], consoleErrors: errors },
  );
});
