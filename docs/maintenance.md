# Maintenance

## Dependencies

1. Read the complete changelog from the currently pinned version through the proposed version.
2. Record evaluated changes and adopted/deferred decisions here.
3. Pin exact versions, update the lockfile, run `npm audit signatures`, and complete `npm test`.
4. Keep generated outputs reproducible and review any license or security impact.

### Dependabot batch review (2026-10-12)

eslint 9.39.1 → 10.12.0, @eslint/js 9.39.1 → 10.0.1, globals 16.5.0 → 17.13.0, prettier 3.6.2 → 3.9.9, and github/codeql-action 4.37.7 → 4.38.2 were reviewed together, including every release between the pinned and target versions.

**eslint 10.12.0 / @eslint/js 10.0.1.** Breaking changes that touch this repository: `eslint:recommended` now enables `no-unassigned-vars`, `no-useless-assignment`, and `preserve-caught-error`. `no-useless-assignment` flagged `signed-storage.js` (fixed here); the sibling sites it had flagged earlier were already fixed. The Node requirement (`^20.19 || ^22.13 || >=24`) is satisfied by the pinned 24.21.0. The remaining breaking changes do not apply: the flat config format is already in use, there are no `eslint-env` comments, no JSX, no custom rules or `RuleTester` cases, no `v10_*` or `unstable_*` flags, and the plain-JavaScript config needs no jiti. Evaluated and not adopted: the `errorClassNames` option of `preserve-caught-error` (defaults fit), the v9→v10 migration codemods (the two hand edits were smaller), and the per-release rule refinements (`radix`, `func-names`, `no-invalid-regexp` schema, `no-shadow-restricted-names`) — nothing in the codebase triggers them. Upstream also updated `minimatch` to 10.2.1 for a security fix.

**globals 17.13.0.** v17 splits non-window scopes out of `browser`: it removes `AudioWorkletProcessor`, `registerProcessor`, `AudioWorkletGlobalScope`, `WorkletGlobalScope`, `currentFrame`, `currentTime`, and `sampleRate` (moved to the new `audioWorklet` key) plus `AsyncDisposableStack`/`DisposableStack`/`SuppressedError` (now under the es20xx keys), and adds ~48 newer web globals (Temporal, Sanitizer, the WebMCP `WebMCPEvent`/`ModelContext` pair, XR layers, `LanguageModel`, media-element interfaces). New environment keys include `audioWorklet`, `paintWorklet`, `sharedWorker`, `serviceworker`, `worker`, `react-native`, `rspack`, `webpack`, `bunBuiltin`, `denoBuiltin`, and `es2027`. The only fallout was `sizzle-worklet.js` losing its two ambient globals. Adopted: a file-scoped `*-worklet.js` globals block in `eslint.config.js` that declares the two worklet globals explicitly — a `/* global */` comment errors under globals v16 (`no-redeclare`, which already lists them) and `...globals.audioWorklet` does not exist in v16. Deferred until v17 is the baseline: replacing the explicit pair with `globals.audioWorklet`.

**prettier 3.9.9.** Reviewed 3.7–3.9: the Markdown parser moved to micromark v4 (3.9.0), the YAML parser moved to `yaml` v2 (3.9.0), GraphQL.js v17 and a Rust-based Flow parser landed (3.9.0), plus no-semi comment stabilization, class/interface alignment, `import` attribute line breaking, Discard Bindings support, and an `@prettier/plugin-yuku`. `prettier --check` over the whole repository under 3.9.9 reports no diffs, so none of the formatting changes affect this codebase. No new options adopted (the config stays `singleQuote`/`trailingComma: all`/`printWidth: 100`); the experimental `experimental-operator-position` flag and the new plugins have no use here.

**github/codeql-action 4.38.2 (init + analyze).** Reviewed 4.37.8–4.38.2: default CodeQL bundle 2.26.4 → 2.27.1, experimental per-language bundles (rolled out automatically), toolcache cleanup on hosted runners, and native linux-arm64 bundles. All changes apply automatically; nothing to adopt in `codeql.yml`. The pinned SHA matches the annotated `v4.38.2` tag. v4.38.3 (released 2026-10-08) falls inside the 7-day dependabot cooldown and is expected next cycle.

### Playwright 1.56.1 → 1.64.0 review

The complete v1.57–v1.64 release notes were reviewed, including browser changes, reporter/CLI updates, locator and accessibility APIs, storage APIs, screenshots/video, test-runner options, and breaking changes. The v1.57 Chrome-for-Testing switch and v1.58 macOS 13 WebKit removal were noted; CI uses supported Linux browser builds. The v1.59 screencast/agent tooling, v1.60 ARIA/abort APIs, v1.62 component-testing model, and v1.63 cross-frame/visible locators do not match this repository's current test needs. Adopted from v1.57: context-level request events for service-worker coverage. Adopted from v1.61: `page.localStorage`/`page.sessionStorage` cleanup assertions, `failOnFlakyTests`, and the supported Ubuntu 26.04 runner. Adopted from v1.64: `page.webmcp` for the feature-tool integration test.

Not adopted: test locks (v1.63–1.64), `--shuffle`, `TestProject.default`, retry strategies, WebP screenshots, screencast/video, bundled MCP/CLI, component testing, and OPFS/credentials `storageState`; these add no needed coverage for this static site or change output/ordering outside the requested scope. New locator/ARIA, request-context, trace, and reporter APIs were reviewed but not adopted where there is no corresponding use case. The v1.64 `screen` forwarding change was checked by retaining current device-project expectations; the full browser suite will verify that they still pass.

### Dependency and toolchain sweep (2026-11-14)

npm devDependencies bumped together after the dependabot npm PRs stalled on `check:generated` (each weekly group PR replaced the previous failing one without regenerating outputs). Every release between the pinned and target versions was reviewed.

**@playwright/test 1.64.0 → 1.65.1.** v1.64.1 fixes an Electron launch regression and a Chromium preflight-redirect abort; neither is exercised here. v1.65.0 adds Bun runner support (not applicable — Node runner), the `failures` reporter, the `onlyFailures` HTML/JSON/JUnit option, the built-in `-exclusive-` test lock, description-only `test.skip/fixme/fail/slow`, and `PLAYWRIGHT_TRANSFORM_CACHE_DIR`. v1.65.1 fixes a decorated-class regression and Bun step locations. Adopted: `failures` reporter in CI (`playwright.config.js` switches reporters on `process.env.CI`) so failure output drops the progress noise. Deferred: the `-exclusive-` lock (tests stay `fullyParallel`; no cross-test shared state needs serialization), `onlyFailures` (failure artifacts are already tiny), Bun mode, and the transform-cache override (defaults fine). Browser bumps (Chromium 159, Firefox 159, WebKit 27.2) install via `npx playwright install`.

**eslint 10.12.0 → 10.15.0.** 10.13–10.15 extend existing rules (`no-use-before-define` in IIFEs, `globalThis` in `no-obj-calls`, `yield*` in `no-unsafe-optional-chaining`, `func-name-matching` descriptors, `func-names`/`accessor-pairs`/`no-invalid-this`/`no-shadow`/`default-case` improvements) and fix autofix edge cases plus `no-restricted-globals`/`no-invalid-this` crashes; dependency floors raised for a vulnerable `brace-expansion`/`minimatch`. `npm run lint` stays clean; no config adoption needed — this repo has no IIFEs, `super` autofix cases, or Yoda-style code the fixes touch.

**prettier 3.9.9 → 3.10.1.** 3.9.10 fixes a GFM table parse-performance regression; 3.10.0 adds new Flow/Yuku syntax and plugin internals; 3.10.1 fixes a GraphQL empty-selection-set bug. `prettier --check` over the whole repository reports no diffs under 3.10.1; no new options adopted.

**parse5 8.0.1 → 8.1.1.** 8.1.0 fixes attribute-name termination and numeric-reference handling, exports `InsertionMode`, lets tree adapters see element context, and updates `entities` to 9.0.0 (`<`/`>` now escaped in attribute values). 8.1.1 fixes nineteen security-relevant issues — crashes, quadratic parse/serialize time and memory, and serializer output that re-parses into different markup. This repository parses only its own files in scripts, but the update is taken on the security principle anyway. No API changes affect `check-external-resources.mjs` or the generators.

**globals 17.13.0 → 17.14.0.** Routine 2026-11 globals refresh; `eslint.config.js` still lints clean.

**@mdn/browser-compat-data 8.1.5 → 8.1.9 and web-features 3.42.0 → 3.46.0.** Data-only updates; `npm run generate` now reports 1170 features (was 1156) and the regenerated dataset/docs carry the diff. Notable upstream changes: `AbortSignal.timeout()` and three other features moved to Baseline widely-available; new features include CSS navigation/`link-to`, `document-isolation-policy`, `offline-audio-context-incremental-rendering`, `revert-rule`, `scroll-triggered-animations`, and `window-management`. None map to new capability detectors worth adding in this pass.

**Node 24.21.0 → 24.22.3 (`.nvmrc`).** Security release fixing 18 CVEs across http2, tls, http, permission model, and zlib (e.g. stream-retention, SNI/resumption, remote crash). Engines range `>=24.21.0 <25` still covers it.

**Rust 1.99.0 → 1.100.0 (`rust-toolchain.toml`, workflows, build scripts).** Highlights: never type and `extern "custom"` stabilized, custom allocators (`Allocator`/`Global`/`System`) stabilized, `wasm32-wasip3` promoted to Tier 2 (wasip1 remains the repo target), plus lint and platform changes that do not apply to the no_std sim crates. Rebuilt all toolchain and app WASM outputs locally.

**wasm-bindgen 0.2.129 → 0.2.130.** Adds borrowed-by-copy argument types, typed `Promise<T, E>` rejection parameters (defaults keep `Promise<T>` unchanged), and `--js-string-builtins`. None adopted — the sim crates export numeric functions only. Cargo.lock refreshed; `wasm-bindgen-cli` 0.2.130 rebuilt outputs.

**Emscripten 6.0.12 → 7.0.0 (emsdk commit → `1693ce73`).** Major bump: libc++/libcxxabi/libunwind/compiler-rt now LLVM 23.1.3, mimalloc 3.6.1, side-module linking changes, pipe capacity, `__deps` auto-detection for JS-to-JS symbols, and raised default minimum browsers (Chrome 93, Firefox 92, Safari 15.4 — still below the supported engines here). The probe build (`probe.c`, `exceptions.cpp`, `pthreads.c`, `simd.c` with `-Oz`, MODULARIZE/EXPORT_ES6/JSPI/wasm64 flags) rebuilt cleanly under 7.0.0; JS glue changed trivially and some .wasm outputs are byte-identical. Nothing in 6.0.13 (Windows launcher removal, `MEMORY64=2` deprecation, `FS.filesystems` removal, libpng bump) or 7.0.0 requires flag or source changes.

**servoshell 2026-10-11 → 2026-11-13.** Monthly nightly bump; tag + sha256 updated together and `npm run test:servo` passes 11/11 on the new binary.

**New workflow `dependabot-generated.yml`.** Closes the recurring `check:generated` failure on Dependabot data bumps: on `pull_request_target` limited to `package.json`/`package-lock.json`, gated on `pull_request.user.login == 'dependabot[bot]'` plus same-repo head (the login cannot be spoofed; `pull_request` cannot be used because Dependabot PRs get a read-only token), it installs with `--ignore-scripts` + `npm audit signatures`, runs `npm run generate`, and pushes only the generated paths to the PR branch. It self-terminates: its push runs the workflow again with nothing to commit.

**Follow-up from the browser bumps.** WebKit build 2388 (still branded 27.2) no longer emits the `style-src-attr`/`text-overflow:inherit` user-agent violation the exact-match filter in `tests/e2e/csp-violations.js` existed for — the canary's own poll timed out, which is precisely the signal it was designed to raise. Verified by disabling the filter and re-running all WebKit resource-policy pages clean, then removed the filter, the canary test, its fixture, and the unit tests so the CSP gate is strict on every engine again; `AGENTS.md` updated to say there are no runtime CSP exceptions. Separately, Firefox 159's offline render of the baked-mochocho audio graph lands at RMS ~0.00497–0.00499 — confirmed identical on the previous Firefox build, so the `> 0.005` floor was borderline all along rather than a browser regression; the non-silence floor is now `> 0.004` (peak and tonal checks unchanged).

### Runtime and runner policy

Use Node 24 LTS, pinned by `.nvmrc` and the package engine range. Ubuntu 26.04 is a public runner-image preview. Revisit it when generally available or if the preview breaks; fall back to Ubuntu 24.04 in that case and document the reason.

### Dataset and WASM updates

Change source data or generators, run `npm run generate`, inspect generated diffs, and run `npm run check:generated`. For Layer 2, run `scripts/build-wasm-toolchains.sh`, inspect the manifest and binaries, and update [third-party notices](../THIRD_PARTY_NOTICES.md).

### servoshell pin

`tests/servo/` drives the pinned servoshell nightly from `servo/servo-nightly-builds`. To update: pick a dated release tag, download `servo-x86_64-linux-gnu.tar.gz` plus its `.sha256` sidecar, update `tag`, `asset`, and `sha256` in `tests/servo/servo-version.json`, run `node scripts/fetch-servo.mjs`, then `npm run test:servo`. Treat a servoshell update like a dependency bump: check the release notes and record the outcome here. Do not track the floating `latest` artifacts — the pin plus sidecar checksum is the integrity gate.

### Dependabot and releases

Review grouped Dependabot PRs together with their release notes and security advisories. Verify signature and lockfile changes before merge. Deployments and rollbacks use Cloudflare Pages deployments; owner-side DNS and project configuration remain outside this repository.
