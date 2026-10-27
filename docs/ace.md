# Ace Lab

Ace Lab is a static reference app for learning the Ace editor API. Pick a language, change an
option, then compare the live editor with the JavaScript in the API panel. The original samples
are local examples, not copied from third-party tutorials.

## Try it

Use the Editor tab to edit JavaScript, HTML, CSS, JSON, Markdown, Ruby, or Python. Ace workers
validate JavaScript, HTML, CSS, and JSON; a malformed JSON document produces an annotation in the
gutter. Autocomplete includes Ace language tools, mode snippets, and a small app-owned completer.
The toolbar also demonstrates search, settings, beautification, markers, and programmatic
annotations. Vim, Emacs, VS Code, and Sublime key handlers are the handlers bundled with Ace 1.45.2.
The Vim handler supports its normal-mode commands; `dd` deletes the current line.

The Inline diff tab uses Ace's bundled `ace/ext/diff` `InlineDiffView`. The API tab shows the
current option-to-API mapping, a bounded log of `change`, `changeSelection`, and `changeMode`
events, cursor and selection metrics, load time, and the measured transfer/encoded size of
same-origin vendor resources.

## Architecture

| Path                            | Responsibility                                                                  |
| ------------------------------- | ------------------------------------------------------------------------------- |
| `public_html/ace/index.html`    | Accessible tabs, controls, and same-origin runtime/CSS links                    |
| `public_html/ace/app.js`        | Capability checks, Ace setup, workers, events, tabs, settings, and signed saves |
| `public_html/ace/settings.js`   | Original sample documents, save schema, migration, and status copy              |
| `public_html/ace/editor-api.js` | Pure mapping from visible controls to Ace options and API example               |
| `public_html/ace/event-log.js`  | Pure event formatting and bounded log                                           |
| `scripts/vendor-ace.mjs`        | Allowlisted, deterministic vendoring and `--check`                              |

The app calls `checkRequirements` before initializing Ace. Editor settings and documents are saved
through `createSignedStore` under the `ace-lab` name. Only a save with a valid signature is
restored. Corrupt, tampered, rolled-back, key-missing, unavailable, and version-mismatched states
are reported without loading their data; Reset creates a fresh workspace.

The HMAC signature is tamper evidence, not encryption or anti-cheat. It does not hide document
contents from someone with access to browser storage or DevTools. The signing key stays in this
browser; clearing site data or browser storage can make the signature unverifiable.

## CSP and workers

The CSP in `public_html/_headers` is unchanged. The app calls
`ace.config.set('useStrictCSP', true)` before it creates the editor and links Ace's `ace.css` and
theme CSS as same-origin stylesheets. Ace's strict-CSP CSS importer in the pinned
`ace-builds/src-min-noconflict/ace.js` implementation returns before making a `<style>` element
(the minified distribution is one source line). Ace settings, search, autocomplete, and diff styles
are supplied by the vendored `css/ace.css` instead.

`basePath`, `modePath`, `themePath`, `workerPath`, and `snippetPath` point to the local vendor
directory. `loadWorkerFromBlob` is false, so mode workers use the same-origin JavaScript files.
The E2E suite checks JSON worker annotations, the worker resource request, and zero app CSP
violations. No `eval` or `new Function` path is used by the app.

## Regeneration and limitations

The site has no build step. Install the exact-pinned package with
`npm install --save-dev --save-exact --ignore-scripts ace-builds@1.45.2`, then run
`node scripts/vendor-ace.mjs`. `node scripts/vendor-ace.mjs --check` and
`npm run check:generated` verify the deterministic allowlist and CSS asset references. The
allowlist contains only the languages and extensions used by this app. The upstream BSD-3-Clause
license is copied to `public_html/ace/vendor/LICENSE` and recorded in `THIRD_PARTY_NOTICES.md`.

This is an editor API reference, not a game or graphics demo. It intentionally has no WebGPU
renderer, synthesized background music or effects, or WebAssembly code: those would not help
explain Ace's editor, worker, and extension APIs. This demo is static and does not execute user
code. Worker diagnostics are syntax/tooling feedback, not a security sandbox.

## Sources

- [Ace repository and documentation](https://github.com/ajaxorg/ace)
- [ace-builds 1.45.2 on npm](https://www.npmjs.com/package/ace-builds/v/1.45.2)
- Upstream package license: `public_html/ace/vendor/LICENSE`
