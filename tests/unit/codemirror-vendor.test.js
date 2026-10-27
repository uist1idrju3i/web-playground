import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { applyVendorPatches, rewriteModuleSource } from '../../scripts/vendor-codemirror.mjs';

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

test('vendored autocomplete fallback retains its word-character class', async () => {
  const source = await readFile(
    new URL('../../public_html/codemirror/vendor/@codemirror-autocomplete.js', import.meta.url),
    'utf8',
  );
  const template = source.match(/return new RegExp\(`([^`]+)`, "g"\);/u)?.[1];
  assert.equal(template, '[\\\\w${escaped}]');

  const regexSource = template.replace('${escaped}', '').replaceAll('\\\\', '\\');
  for (const character of ['a', '5', '_']) {
    assert.ok(new RegExp(regexSource).test(character), `${character} should match the fallback`);
  }
});

test('vendor patches require exactly one match', () => {
  const patch = {
    file: 'module.js',
    find: 'needle',
    replace: 'patched',
    reason: 'test patch',
    upstream: 'test upstream',
  };

  assert.throws(() => applyVendorPatches([['module.js', 'no match']], [patch]), /matched 0 times/u);
  assert.throws(
    () => applyVendorPatches([['module.js', 'needle needle']], [patch]),
    /matched 2 times/u,
  );
});
