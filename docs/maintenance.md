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

### Runtime and runner policy

Use Node 24 LTS, pinned by `.nvmrc` and the package engine range. Ubuntu 26.04 is a public runner-image preview. Revisit it when generally available or if the preview breaks; fall back to Ubuntu 24.04 in that case and document the reason.

### Dataset and WASM updates

Change source data or generators, run `npm run generate`, inspect generated diffs, and run `npm run check:generated`. For Layer 2, run `scripts/build-wasm-toolchains.sh`, inspect the manifest and binaries, and update [third-party notices](../THIRD_PARTY_NOTICES.md).

### servoshell pin

`tests/servo/` drives the pinned servoshell nightly from `servo/servo-nightly-builds`. To update: pick a dated release tag, download `servo-x86_64-linux-gnu.tar.gz` plus its `.sha256` sidecar, update `tag`, `asset`, and `sha256` in `tests/servo/servo-version.json`, run `node scripts/fetch-servo.mjs`, then `npm run test:servo`. Treat a servoshell update like a dependency bump: check the release notes and record the outcome here. Do not track the floating `latest` artifacts — the pin plus sidecar checksum is the integrity gate.

### Dependabot and releases

Review grouped Dependabot PRs together with their release notes and security advisories. Verify signature and lockfile changes before merge. Deployments and rollbacks use Cloudflare Pages deployments; owner-side DNS and project configuration remain outside this repository.
