---
name: maintaining-web-playground
description: Procedures for repository maintenance in web-playground - adding a capability detector, updating generated datasets and WASM probes, changing GitHub workflows, updating dependencies, bumping the pinned Servo build, running and debugging the four-engine test suite (Playwright Chromium/WebKit/Firefox and servoshell WebDriver), and checking production after deploys. Use for any change outside a single app's own files, or when tests fail in a confusing way.
---

# Maintaining web-playground

`AGENTS.md` holds the invariants; this skill holds the procedures.

## Recipes

- **New capability**: add metadata and a conservative detector in
  `public_html/library/js/capabilities.js` (secure context, engine limit, and Permissions
  Policy fields when relevant; never prompt during detection); route app usage through
  `checkRequirements`; run `npm run generate` to refresh `docs/capability-reference.md`; add
  focused unit coverage in `tests/unit/capabilities.test.js` and E2E coverage where it can run.
- **Dataset update**: change the source or generator under `scripts/`, run
  `npm run generate`, review the generated data and totals, then run
  `npm run check:generated`.
- **WASM probes and toolchains**: edit WAT or toolchain sources under `wasm/`, regenerate Layer 1
  outputs (`npm run generate`), build Layer 2 outputs (`scripts/build-wasm-toolchains.sh`),
  update the manifest and notices and the cross-engine tests, then update
  [docs/webassembly.md](../../../docs/webassembly.md) and the capability reference.
- **App WASM**: see the `browser-app-wasm` skill (`scripts/build-app-wasm.sh`).
- **Workflow change**: pin every action to a full 40-character SHA with a version comment; use
  empty top-level permissions and minimal job permissions, `persist-credentials: false`, and
  `step-security/harden-runner`. Validate with `uvx zizmor .` and `actionlint`
  (`.github/actionlint.yaml` declares the `ubuntu-26.04` runner label).
- **Dependency update**: read the complete changelog from the pinned version to the target,
  adopt relevant improvements, and record evaluated, adopted, and deferred changes in
  [docs/maintenance.md](../../../docs/maintenance.md). Vendored third-party code needs entries in
  both `eslint.config.js` ignores and `.prettierignore`, plus `THIRD_PARTY_NOTICES.md`.
- **Servo bump**: update the tag and sha256 in `tests/servo/servo-version.json` together, fetch
  with `node scripts/fetch-servo.mjs`, and record the bump in `docs/maintenance.md`.
- **Header change**: `public_html/_headers` and `native/headers.json` must stay in parity
  (`tests/unit/native-headers.test.js`); the CSP is locked by `tests/unit/headers.test.js`.

## Running tests

- `npm ci --ignore-scripts && npm audit signatures`, then `npx playwright install` for the
  pinned browsers and `node scripts/fetch-servo.mjs` for servoshell.
- Run the local tier from the `AGENTS.md` definition of done; the full `npm test` is for
  headers, CSP, resource gates, capabilities, and test tooling. CI always runs everything.
- The E2E server on port 4173 is reused locally; a stale server from an earlier run serves old
  headers and files. Kill it before trusting results.
- `scripts/check-external-resources.mjs` parses all app JavaScript; unusual code shapes can
  break the gate itself, so run `npm run lint` before pushing.

## Engine-specific pitfalls

- Playwright WebKit screenshots inject a temporary inline stylesheet; assert CSP diagnostics
  before taking screenshots.
- WebKit emits its own `style-src-attr` violation (sample `text-overflow:inherit`) on native
  controls. `tests/e2e/csp-violations.js` filters only that exact sample and a canary test
  fails when WebKit stops emitting it. Never broaden the filter to cover app-originated
  violations; fix the source.
- Headless runners have no WebGPU adapter and no audio output; such tests skip with a reason.
- servoshell is driven over W3C WebDriver (sync `execute` only, one session per process), not
  Playwright. Its `style-src-attr` violations with `blockedURI: 'inline'` are diagnostics in
  `test-results/servo/diagnostics.json`, not failures. Servo has no `SharedArrayBuffer`.
- Playwright `page.waitForFunction(fn, arg)` takes one argument; pass arrays for several values.
- Pages with several canvases make `locator('canvas')` a strict-mode violation; select by ID.

## After deploy

Cloudflare zone features (Rocket Loader, automatic Web Analytics, Speed Brain) can rewrite
production HTML even when CI is green. `deploy-smoke.yml` runs the resource-policy spec against
production. Before claiming production is fine, compare served HTML with `public_html/` and
open the pages in all three Playwright engines. Never re-enable HTML-rewriting Cloudflare
features.

Signs that a zone feature is active again: a `Speculation-Rules: "/cdn-cgi/speculation"`
response header (Speed Brain), or production smoke failures listing `[Report Only]` CSP
violations for same-origin scripts (an injected `Content-Security-Policy-Report-Only` header).
These are dashboard settings; report them to the owner instead of filtering the test.
