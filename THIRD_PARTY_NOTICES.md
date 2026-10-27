# Third-Party Notices

This project includes generated data from the following projects:

- **Rapier 0.21.0 (@dimforge/rapier2d-compat)** — vendored WASM rigid-body physics used by the tsumiki game (`public_html/tsumiki/vendor/`). Licensed under the Apache License 2.0; copyright Dimforge (see `rapier.LICENSE.txt`).
- **Natural Earth 10m admin-1 (Japan)** — prefecture polygons distilled into `public_html/tsumiki/data/prefectures.json` by `scripts/generate-prefecture-data.mjs`. Public domain.
- **web-features 3.42.0** — Web Platform Baseline feature metadata. Licensed under the Apache License 2.0.
- **@mdn/browser-compat-data 8.1.5** — browser compatibility data. Dedicated to the public domain under CC0 1.0 Universal.
- **Binaryen 132.0.0** — used to assemble the generated WebAssembly feature probes. Licensed under the Apache License 2.0.
- **Emscripten 6.0.12 runtime code** — embedded in the generated Emscripten modules. Licensed under the MIT License and NCSA License.
- **Rust standard library** — portions may be embedded in the generated Rust WebAssembly modules. Licensed under MIT or Apache License 2.0.
- **Playwright 1.64.0** — development and browser-test tooling. Licensed under Apache License 2.0.
- **parse5 8.0.1**, **Acorn 8.19.0**, and **acorn-walk 8.3.5** — development-time parser tooling. Licensed under the MIT License.
- **@ruby/wasm-wasi 2.10.1** — vendored as `public_html/ruby-wasm/vendor/browser.umd.js`. Copyright (c) 2022 Yuta Saito. Licensed under the MIT License.
- **@ruby/3.4-wasm-wasi 2.10.1** — CRuby 3.4.1 with stdlib compiled to WebAssembly, shipped compressed as `public_html/ruby-wasm/ruby+stdlib.wasm.gz`. Ruby itself is distributed under the Ruby License or the 2-clause BSDL; bundled stdlib and extension libraries carry their own permissive licenses (see the upstream `LEGAL` file in the ruby source).
- **CodeMirror 6.65.7** — editor component loaded from cdnjs with SRI (core, `mode/ruby`, `closebrackets`, `matchbrackets`). Copyright (c) Marijn Haverbeke and others. Licensed under the MIT License.
- **CodeMirror 6 packages** — the CodeMirror 6 Lab vendors `@codemirror/state` 6.7.6,
  `@codemirror/view` 6.43.15, `@codemirror/commands` 6.11.1, `@codemirror/language` 6.13.1,
  `@codemirror/autocomplete` 6.20.4, `@codemirror/search` 6.7.2, `@codemirror/lint` 6.9.7,
  `@codemirror/merge` 6.12.3, `@codemirror/lang-javascript` 6.2.5,
  `@codemirror/lang-html` 6.4.12, `@codemirror/lang-css` 6.3.1,
  `@codemirror/lang-json` 6.0.2, `@codemirror/lang-markdown` 6.5.2,
  `@codemirror/legacy-modes` 6.5.5, and `@codemirror/streamparser` 6.0.0.
  Copyright (C) 2018–2022 by Marijn Haverbeke and others. Licensed under the MIT License.
  License texts are preserved in `public_html/codemirror/vendor/licenses/@codemirror-*.LICENSE`.
- **Lezer parser packages** — `@lezer/common` 1.5.4, `@lezer/highlight` 1.2.5,
  `@lezer/lr` 1.4.11, `@lezer/javascript` 1.5.6, `@lezer/css` 1.3.9,
  `@lezer/html` 1.3.13, `@lezer/json` 1.0.3, and `@lezer/markdown` 1.8.1.
  Copyright (C) 2018–2020 by Marijn Haverbeke, Arun Srinivasan, and others. Licensed under
  the MIT License. License texts are preserved in
  `public_html/codemirror/vendor/licenses/@lezer-*.LICENSE`.
- **CodeMirror support packages** — `style-mod` 4.1.4, `w3c-keyname` 2.2.8, `crelt` 1.0.7,
  and `@marijn/find-cluster-break` 1.0.4. Copyright (C) 2016–2024 by Marijn Haverbeke and
  others. Licensed under the MIT License. License texts are preserved in
  `public_html/codemirror/vendor/licenses/style-mod.LICENSE`,
  `w3c-keyname.LICENSE`, `crelt.LICENSE`, and `@marijn-find-cluster-break.LICENSE`.
- **@replit/codemirror-vim** 6.4.0 and **@replit/codemirror-vim-core** 0.1.0 — Copyright (C)
  2018–2021 by Marijn Haverbeke and others; the core package is authored by Yunchi Luo.
  Licensed under the MIT License. License texts are preserved in
  `public_html/codemirror/vendor/licenses/@replit-codemirror-vim.LICENSE` and
  `@replit-codemirror-vim-core.LICENSE`.

Design methods adapted into the project skills under `.agents/skills/`:

- **VibeBB UX-creator-agent** — UX method (jobs to be done, ODI scoring, feedback budgets, statechart rules) summarized in `browser-app-ux`. BSD 3-Clause License; copyright (c) 2026, VibeBB.
- **VibeBB bard-agent** — sound-cue purpose and duration table and originality rules adapted in `browser-app-sound`. BSD 3-Clause License; copyright (c) 2026, VibeBB.

The generated feature data is distributed under the corresponding upstream terms. Source and license details are also recorded in the generated JSON metadata.
