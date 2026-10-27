# CodeMirror 6 Lab

The CodeMirror 6 Lab is a static, same-origin editor demonstration. Choose a language, change
extensions, inspect the generated configuration, compare the document with its original sample,
and open the Extension composition tab to see transactions. The six original samples cover
JavaScript, HTML, CSS, JSON, Markdown, and Ruby through the legacy stream-parser bridge.

## Architecture

`app.js` owns the DOM and CodeMirror view. Pure modules under `public_html/codemirror/js/` contain
samples, settings normalization, extension labels, transaction formatting, and diagnostics. Each
feature toggle is a `Compartment`, so a setting is reconfigured without recreating the page.
Documents and settings are persisted with `createSignedStore` under the `codemirror-lab` name.
Tampered, corrupt, missing-key, version-mismatch, and unavailable saves are ignored with a calm
status message rather than loaded.

The editor requires ES modules and reports clipboard, IndexedDB, and Web Crypto as optional
capabilities. The page remains a learning page when optional capabilities are absent.

## Vendoring and regeneration

Dependencies are exact-pinned in `package.json`. Run `npm install --ignore-scripts`, then:

```sh
node scripts/vendor-codemirror.mjs
node scripts/vendor-codemirror.mjs --check
```

The script copies ESM entry points into `public_html/codemirror/vendor/`, rewrites bare imports to
relative same-origin files, and copies upstream MIT license texts into `vendor/licenses/`. Most
packages use `dist/index.js`; utility packages and Ruby/Vim core use the ESM entry path advertised
by their package metadata. Unknown bare imports and non-ESM entries fail loudly.

The script applies the explicit post-copy patches in `vendorPatches`; each records its target,
exact source fragment, replacement, reason, and upstream. The current patch fixes the fallback
word-character class in `@codemirror/autocomplete` 6.20.4. Each patch must match exactly once, so a
dependency update or upstream fix fails loudly. When upstream contains the fix, remove the patch
entry and regenerate instead of editing the vendored file directly. `--check` compares against the
patched output.

## CSP-compatible editor mounting

CodeMirror views are mounted inside open shadow roots. Each host gets a same-origin
`editor.css` link and a container, and the view receives the shadow root through its `root`
option. This is required because the vendored `style-mod` `StyleSet` only creates a constructed
`CSSStyleSheet` and adopts it when `!root.head`; with a `Document` root it creates a `<style>`
element instead. See `node_modules/style-mod/src/style-mod.js:94-101` in the pinned 4.1.4 source.
The shadow-root mount keeps CodeMirror themes, autocomplete/lint tooltips, search panels, Vim
panels, and merge views same-origin and avoids inline-style CSP violations without changing CSP.

## Limitations and deliberate deviations

This is an editor/library reference app, not a game. It intentionally does not use WebGPU,
WebAudio BGM/SFX, or WebAssembly. Those capabilities would distract from the CodeMirror state and
extension model and would not improve the demonstrated API. Vim is included; Emacs support was
dropped because a currently maintained MIT release could not be established for the pinned
package set.

The merge view compares against the original sample in the current language. The built-in linter
reports JSON parse errors and a deliberately small JavaScript `var` warning; it is not a complete
language linter. Real iPhone hardware and assistive-technology combinations remain subject to
browser implementation differences.

## Save threat model

`createSignedStore` signs local records with Web Crypto HMAC and keeps the key in IndexedDB. This
detects accidental edits and ordinary same-origin tampering of the localStorage envelope, plus
rollback counters. It does not protect data from a user who controls the browser profile, browser
extensions, or JavaScript served by the origin. No document content is sent over the network.

## Sources

- [CodeMirror 6 reference](https://codemirror.net/docs/ref/)
- [CodeMirror 6 repository](https://github.com/codemirror/dev)
- [CodeMirror legacy modes](https://github.com/codemirror/legacy-modes)
- [CodeMirror merge package](https://github.com/codemirror/merge)
- [Replit CodeMirror Vim](https://github.com/replit/codemirror-vim)
