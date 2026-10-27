import assert from 'node:assert/strict';
import test from 'node:test';
import { getAceVendorPlan, rewriteCssAssetUrls } from '../../scripts/vendor-ace.mjs';

test('Ace vendor plan includes only the app modes, workers, keymaps, extensions, and assets', () => {
  const files = new Set(getAceVendorPlan().map(({ destination }) => destination));
  for (const required of [
    'ace.js',
    'mode-javascript.js',
    'mode-json.js',
    'worker-base.js',
    'worker-json.js',
    'ext-language_tools.js',
    'ext-diff.js',
    'keybinding-vim.js',
    'keybinding-emacs.js',
    'keybinding-vscode.js',
    'keybinding-sublime.js',
    'snippets/javascript.js',
    'css/ace.css',
    'css/theme/chrome.css',
    'css/theme/tomorrow_night.css',
    'css/chrome-1.png',
    'LICENSE',
  ]) {
    assert.ok(files.has(required), `${required} should be vendored`);
  }
  assert.equal(files.has('mode-go.js'), false);
  assert.equal(files.has('ext-emmet.js'), false);
});

test('Ace CSS asset URLs are rewritten relative to the vendored path', () => {
  assert.equal(
    rewriteCssAssetUrls(
      'a { mask: url("../icons/marker.svg"); }',
      'css/themes/clean.css',
      'css/theme/clean.css',
    ),
    'a { mask: url("../icons/marker.svg"); }',
  );
  assert.throws(
    () =>
      rewriteCssAssetUrls(
        'a { background: url("https://example.test/icon.png"); }',
        'css/ace.css',
        'css/ace.css',
      ),
    /external URL/u,
  );
});
