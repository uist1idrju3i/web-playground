# Agent Guidelines

- Priorities: security and stability first, then runtime performance.
- Keep this a static site with no build step. Load JavaScript/CSS only from this origin or `https://cdnjs.cloudflare.com`. cdnjs resources must be version-pinned and use `integrity` (SRI sha384/sha512 from the cdnjs API) with `crossorigin="anonymous"`. Do not use any other third-party origin.
- Put shared runtime code only in `public_html/library/`.
- Every app must call `checkRequirements` before using its required capabilities. Never trigger permission prompts while a page loads.
- Never weaken or bypass the static resource gate, runtime resource E2E gate, CSP lock test, or CodeQL. The only runtime CSP exception is the exact WebKit user-agent sample in `tests/e2e/csp-violations.js`; never broaden it to cover app-originated violations. Fix the source instead. Never add `'unsafe-inline'` or `'unsafe-eval'`.
- Never add secrets or private credentials. Write repository documentation and comments in English.
- Before every commit, recheck copyright, licenses, and attribution of everything staged: only original or compatibly licensed material, upstream notices kept, `THIRD_PARTY_NOTICES.md` updated, and no imitation of existing works, brands, or characters.

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
| `wasm/`                         | WAT probes, native toolchain profiles, Rust app crates        | Hand-written source                                             |
| `tests/`                        | Unit tests and four-engine browser tests                      | Hand-written                                                    |
| `docs/web-platform-features.md` | Generated browser-compatibility dataset                       | Generated; edit source/generator, never this output             |
| `docs/capability-reference.md`  | Generated capability API index                                | Generated from the shared runtime                               |
| `.github/workflows/`            | CI, CodeQL, security, deployment smoke and toolchain checks   | Hand-written, SHA-pinned                                        |
| `.agents/skills/`               | Project skills: app-building and maintenance procedures       | Hand-written                                                    |

## Commands

| Command                                           | Purpose                                                                                                           |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `npm ci --ignore-scripts && npm audit signatures` | Install the lockfile and verify package signatures                                                                |
| `npm run generate`                                | Regenerate datasets, capability reference, and WASM probes                                                        |
| `npm test`                                        | Lint, security/doc gates, format, generated checks, unit, Chromium/WebKit/Firefox E2E, and Servo WebDriver checks |
| `scripts/build-wasm-toolchains.sh`                | Build deterministic Layer 2 WebAssembly profiles                                                                  |
| `uvx zizmor . && actionlint`                      | Check workflow security and syntax                                                                                |

## Skills

Procedures live in project skills under `.agents/skills/`. Read the matching skill before starting; this file keeps only the invariants.

| Skill                                                                            | Use it for                                                                                   |
| -------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| [building-browser-apps](.agents/skills/building-browser-apps/SKILL.md)           | Any new app or major app feature: research, deep plan, app defaults, license recheck, done   |
| [browser-platform-apis](.agents/skills/browser-platform-apis/SKILL.md)           | Choosing Web Platform capabilities, permission/gesture rules, iPhone and CSP limits          |
| [browser-app-ux](.agents/skills/browser-app-ux/SKILL.md)                         | UX method (jobs, core loop, statechart, feedback budgets, contrast) and iPhone/touch layout  |
| [browser-app-graphics](.agents/skills/browser-app-graphics/SKILL.md)             | WebGPU with WebGL2 fallback, high-fidelity procedural visuals, adaptive resolution           |
| [browser-app-sound](.agents/skills/browser-app-sound/SKILL.md)                   | Original Web Audio BGM and sound effects, cue design, iPhone audio unlock                    |
| [browser-app-wasm](.agents/skills/browser-app-wasm/SKILL.md)                     | WebAssembly hot paths: Rust `no_std` crates, SIMD builds, loading, frame budgets             |
| [browser-app-saves](.agents/skills/browser-app-saves/SKILL.md)                   | HMAC-signed saves with `signed-storage.js`, status handling, tamper tests                    |
| [maintaining-web-playground](.agents/skills/maintaining-web-playground/SKILL.md) | Capabilities, datasets, WASM probes, workflows, dependencies, Servo, test debugging, deploys |

## App defaults

Unless the requester says otherwise, every app: is researched and planned before code; uses the browser fully through `checkRequirements`; works on iPhone (WebKit, portrait and landscape, safe areas, touch); renders with WebGPU and a WebGL2 fallback; plays original, synthesized Web Audio BGM and effects; runs hot paths in WebAssembly; signs saves with Web Crypto HMAC through `public_html/library/js/signed-storage.js`; and has its licenses rechecked before every commit. Details and deviations: [building-browser-apps](.agents/skills/building-browser-apps/SKILL.md).

## Definition of done

- CI (`ci-ok`) passes; it runs `npm test` on all four browser engines (Chromium, WebKit, Firefox, servoshell).
- Locally, run only the tier that matches the change:

  | Change                                                      | Local checks                                                                                                                                      |
  | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
  | Docs and skills only                                        | `npm run lint`, `npm run format:check`                                                                                                            |
  | One app                                                     | Above + `npm run test:unit` + `npx playwright test tests/e2e/<app>.spec.js tests/e2e/resource-policy.spec.js --project=chromium --project=webkit` |
  | Shared library, generators, or data                         | Above for every affected app + `npm run check:generated`                                                                                          |
  | Headers, CSP, resource gates, capabilities, or test tooling | Full `npm test`                                                                                                                                   |

- Generated files are current; portal registration and relevant documentation are updated.
- Rendered pages are visually checked at desktop and iPhone widths (portrait and landscape) in Chromium and WebKit.
- Licenses and attribution of every added file are rechecked before each commit.
- Any untested browser, physical-device, or hosted deployment behavior is reported explicitly.

## Pitfalls

- iOS and iPadOS browsers use WebKit; do not infer device behavior from desktop Chromium.
- COEP can block cross-origin assets even when ordinary CORS would allow them.
- Never hand-edit generated files; fix their source and regenerate.
- `untestable` is not the same as `unsupported`.
- The WebKit CSP sample filter is exact-match only and may never be broadened to cover app-originated violations.
- Never re-enable HTML-rewriting Cloudflare features such as Rocket Loader, Speed Brain (`Speculation-Rules: "/cdn-cgi/speculation"`), or automatic Web Analytics injection.
- Keep every E2E test under 30 seconds. Do not add tests that play an app through in real time; cover long flows with unit tests on the simulation, rules, and statechart.
- Use Node 24 LTS. Ubuntu 26.04 is a public preview; revisit it at GA or fall back to 24.04 if the preview breaks.
