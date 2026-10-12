# Agent Guidelines

- Priorities: security and stability first, then runtime performance.
- Keep this a static site with no build step. Load JavaScript/CSS only from this origin or `https://cdnjs.cloudflare.com`. cdnjs resources must be version-pinned and use `integrity` (SRI sha384/sha512 from the cdnjs API) with `crossorigin="anonymous"`. Do not use any other third-party origin.
- Put shared runtime code only in `public_html/library/`.
- Every app must call `checkRequirements` before using its required capabilities. Never trigger permission prompts while a page loads.
- Never weaken or bypass the static resource gate, runtime resource E2E gate, CSP lock test, or CodeQL. The only runtime CSP exception is the exact WebKit user-agent sample in `tests/e2e/csp-violations.js`; never broaden it to cover app-originated violations. Fix the source instead. Never add `'unsafe-inline'` or `'unsafe-eval'`.
- Never add secrets or private credentials. Write repository documentation and comments in English.

## Tie-break examples

- Reject a third-party script even when it would simplify implementation; choose a self-hosted or native alternative.
- Prefer a clear `untestable` result over prompting for permission or reporting unsupported without evidence.
- Keep a feature stable and secure before optimizing its runtime cost.
- When browser support is uncertain, expose the measured result and limitation rather than loosening a gate.

## Repository map

| Path                            | Purpose                                                       | Ownership                                                       |
| ------------------------------- | ------------------------------------------------------------- | --------------------------------------------------------------- |
| `public_html/`                  | Cloudflare Pages static site and apps                         | Hand-written HTML/CSS/JS except generated datasets and WASM     |
| `public_html/library/`          | Shared capability, requirements, WebMCP, CSS and WASM runtime | Hand-written runtime; `data/` and `wasm/` outputs are generated |
| `scripts/`                      | Generators, local server, resource/doc gates, WASM builds     | Hand-written tooling                                            |
| `wasm/`                         | WAT and native toolchain source profiles                      | Hand-written source                                             |
| `tests/`                        | Unit tests and three-engine browser tests                     | Hand-written                                                    |
| `docs/web-platform-features.md` | Generated browser-compatibility dataset                       | Generated; edit source/generator, never this output             |
| `docs/capability-reference.md`  | Generated capability API index                                | Generated from the shared runtime                               |
| `.github/workflows/`            | CI, CodeQL, security, deployment smoke and toolchain checks   | Hand-written, SHA-pinned                                        |

## Commands

| Command                                           | Purpose                                                                                   |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `npm ci --ignore-scripts && npm audit signatures` | Install the lockfile and verify package signatures                                        |
| `npm run generate`                                | Regenerate datasets, capability reference, and WASM probes                                |
| `npm test`                                        | Lint, security/doc gates, format, generated checks, unit, and Chromium/WebKit/Firefox E2E |
| `scripts/build-wasm-toolchains.sh`                | Build deterministic Layer 2 WebAssembly profiles                                          |
| `uvx zizmor . && actionlint`                      | Check workflow security and syntax                                                        |

## Recipes

- **New app:** add an app directory with `index.html`, shared-library imports, a clear entry in `/index.html`, and an E2E page. The resource-policy test discovers every HTML page automatically.
- **New capability:** add metadata and a conservative detector in `public_html/library/js/capabilities.js`; route app usage through `checkRequirements`; regenerate the capability reference; add focused unit/E2E coverage.
- **Dataset update:** change the source or generator, run `npm run generate`, review generated data and totals, then run `npm run check:generated`.
- **Workflow change:** pin every action to a full 40-character SHA with a version comment; use empty top-level permissions and minimal job permissions, `persist-credentials: false`, and `step-security/harden-runner`. Validate with `uvx zizmor .` and `actionlint`.
- **WASM change:** edit WAT or toolchain sources under `wasm/`, regenerate Layer 1 outputs, build Layer 2 outputs, update manifest/notices and cross-engine tests, then update the WASM and capability references.
- **Dependency update:** read the complete changelog from the pinned version to the target, adopt relevant improvements, and record evaluated/adopted/deferred changes in `docs/maintenance.md`.

## Definition of done

- `npm test` passes on all three browser engines.
- Generated files are current; portal registration and relevant documentation are updated.
- Rendered pages are visually checked at desktop and mobile widths.
- Any untested browser, physical-device, or hosted deployment behavior is reported explicitly.

## Pitfalls

- iOS and iPadOS browsers use WebKit; do not infer device behavior from desktop Chromium.
- COEP can block cross-origin assets even when ordinary CORS would allow them.
- Never hand-edit generated files; fix their source and regenerate.
- `untestable` is not the same as `unsupported`.
- Playwright WebKit screenshotting injects a temporary inline stylesheet; assert CSP diagnostics before screenshotting.
- The WebKit CSP sample filter is exact-match only and may never be broadened to cover app-originated violations.
- Use Node 24 LTS. Ubuntu 26.04 is a public preview; revisit it at GA or fall back to 24.04 if the preview breaks.
