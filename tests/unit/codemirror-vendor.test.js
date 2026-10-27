import test from 'node:test';
import assert from 'node:assert/strict';
import { rewriteModuleSource } from '../../scripts/vendor-codemirror.mjs';

test('vendor rewriting maps bare imports to same-origin modules', () => {
  assert.equal(
    rewriteModuleSource(
      "import {x} from '@codemirror/state'; export {x};",
      '@codemirror/view',
      new Map([['@codemirror/state', '@codemirror/state']]),
    ),
    "import {x} from './@codemirror-state.js'; export {x};\n",
  );
});

test('vendor rewriting rejects unknown bare imports', () => {
  assert.throws(
    () => rewriteModuleSource("import x from 'unknown-package';", '@codemirror/view', new Map()),
    /Unresolved bare specifier/u,
  );
});

test('vendor rewriting removes trailing whitespace and blank lines', () => {
  assert.equal(
    rewriteModuleSource('export const x = 1;  \n\n', '@codemirror/view', new Map()),
    'export const x = 1;\n',
  );
});
