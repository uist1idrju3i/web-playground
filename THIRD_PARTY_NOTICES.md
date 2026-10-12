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

Design methods adapted into the project skills under `.agents/skills/`:

- **VibeBB UX-creator-agent** — UX method (jobs to be done, ODI scoring, feedback budgets, statechart rules) summarized in `browser-app-ux`. BSD 3-Clause License; copyright (c) 2026, VibeBB.
- **VibeBB bard-agent** — sound-cue purpose and duration table and originality rules adapted in `browser-app-sound`. BSD 3-Clause License; copyright (c) 2026, VibeBB.

The generated feature data is distributed under the corresponding upstream terms. Source and license details are also recorded in the generated JSON metadata.
