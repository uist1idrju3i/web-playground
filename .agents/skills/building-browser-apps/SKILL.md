---
name: building-browser-apps
description: Default workflow for creating or substantially extending any app under public_html/ — research and a deep plan first, full use of browser capabilities (WebGPU/WebGL2 graphics, synthesized Web Audio BGM and sound effects, WebAssembly hot paths, HMAC-signed saves), iPhone-first layout, a license recheck before every commit, and the app definition of done. Use whenever a task adds a new app or game, a major app feature, or asks for "beautiful", "smooth", "pop" or "full browser" experiences.
---

# Building browser apps

This skill is the standing brief for every app in this repository. Requesters should not have
to repeat it. It extends `AGENTS.md`; when they conflict, `AGENTS.md` wins (security and
stability first, then runtime performance).

## Defaults for every app

Apply each default unless the app's purpose makes it meaningless (for example, a pure API
reference page has no BGM). State every deviation and its reason in the plan and the PR.

| Area        | Default                                                                                                                      | Detail skill                                                  |
| ----------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Platform    | Use the browser to its full extent: pick the most capable APIs, gate them with `checkRequirements`, degrade gracefully       | [browser-platform-apis](../browser-platform-apis/SKILL.md)    |
| UX          | Jobs-to-be-done framing, a closed core loop, onboarding inside the loop, explicit statechart, multimodal feedback budgets    | [browser-app-ux](../browser-app-ux/SKILL.md)                  |
| Device      | iPhone (WebKit, portrait and landscape, safe areas, touch) is a first-class target, not a desktop afterthought               | [browser-app-ux](../browser-app-ux/SKILL.md#iphone-and-touch) |
| Graphics    | WebGPU renderer with a WebGL2 fallback that shows the same scene; physically motivated, procedural, high-fidelity visuals    | [browser-app-graphics](../browser-app-graphics/SKILL.md)      |
| Sound       | Original BGM and sound effects synthesized with Web Audio; bright, "pop" character unless the app's mood says otherwise      | [browser-app-sound](../browser-app-sound/SKILL.md)            |
| Performance | Hot loops (simulation, physics, image/audio DSP) in WebAssembly with a SIMD variant; steady frame rate on a mid-range iPhone | [browser-app-wasm](../browser-app-wasm/SKILL.md)              |
| Saves       | All persisted app state goes through `public_html/library/js/signed-storage.js` (Web Crypto HMAC-SHA-256)                    | [browser-app-saves](../browser-app-saves/SKILL.md)            |
| Licensing   | Original or permissively licensed material only; recheck licenses and notices before every commit                            | [License recheck](#license-recheck-before-every-commit)       |

## Workflow

### 1. Research before planning

- Read `AGENTS.md`, `docs/adding-an-app.md`, the detail skills above, and at least one existing
  app with similar needs (`public_html/tsumiki/`, `public_html/baked-mochocho/`,
  `public_html/ruby-wasm/`, `public_html/browser-features/`). Reuse their proven patterns and
  shared modules instead of reinventing them.
- Research the subject itself until the model is grounded in facts: real dimensions, physics,
  data sources, cultural details. Existing apps model real scale (km-scale prefectures, mm-scale
  batter flow); prefer physically motivated models over arbitrary constants. Record the sources.
- Check browser support for every API you intend to use in `docs/web-platform-features.md`,
  `docs/capability-reference.md`, and `docs/browser-support.md`. iPhone means WebKit on every
  iOS browser.
- Check the license of every dataset, library, font, and reference you might use (see
  [License recheck](#license-recheck-before-every-commit)).

### 2. Write a deep plan, then implement

The plan covers, at minimum:

1. Jobs (functional, emotional, social), the primary persona, and the core loop with its reward.
2. Statechart: phases, events, guards, the unsupported/error/recover states.
3. Capabilities: `required` versus `optional` IDs for `checkRequirements`, and the fallback for
   each optional one.
4. Architecture: module layout under `public_html/<app>/`, rendering backends, audio graph,
   WebAssembly modules, Workers, save schema and version.
5. Assets and data with their sources and licenses (prefer procedural generation).
6. iPhone layout for portrait and landscape, input mapping (touch, mouse, keyboard, gamepad).
7. Performance budget: target frame time, WASM step cost, memory, download size.
8. Test plan: unit, E2E on all engines, iPhone viewports, offline audio render, save tamper.
9. Risks and what cannot be verified in CI (physical iPhone, real GPU, real audio output).

Share the plan with the requester before large implementations. Plans are working documents:
do not commit them.

### 3. Implement in reviewable increments

Keep each pushed commit self-consistent and passing. Follow the recipes in `AGENTS.md`
(new app, new capability, WASM change). Shared code that a second app would reuse belongs in
`public_html/library/`.

### 4. Verify (app definition of done)

- CI passes; locally run the tier from the `AGENTS.md` definition of done (for one app: lint,
  format, unit, and that app's E2E plus the resource-policy spec in Chromium and WebKit).
- Unit tests cover: statechart transitions, scoring/game rules, WCAG contrast of the palette,
  save envelope tamper/rollback handling, music theory invariants (notes in mode), and any
  pure simulation helpers.
- E2E covers: boot to the first interactive phase, each control of the core loop (via the `?debug=1` hooks, not by
  playing in real time; every test stays under 30 s), renderer
  selection (`data-renderer`), iPhone viewports in portrait and landscape keeping every
  control in bounds, reduced motion, and no CSP violations.
- Audio is rendered with `OfflineAudioContext` in a test and checked for non-silence and no
  clipping.
- Screenshots at desktop and iPhone widths are inspected by eye, in Chromium and WebKit. Look
  for clipped controls, unreadable text, black or noisy canvases.
- `docs/<app>.md` (how to play, architecture table, limitations), a portal entry in
  `public_html/index.html`, `docs/README.md` links, and `THIRD_PARTY_NOTICES.md` are updated.
- Report what was not verified: physical iPhone, real WebGPU adapter, speaker output, haptics.

## License recheck before every commit

Run this check on the staged diff before **every** commit, not only before the PR:

1. `git diff --cached --name-status` — classify each added or modified file as original,
   generated from a source, or third-party.
2. Third-party files (vendored JS/WASM, cdnjs resources, datasets, fonts): the exact version is
   pinned, the upstream license file sits next to the vendored copy, and
   `THIRD_PARTY_NOTICES.md` names the project, version, license, and path. Compatible licenses
   for this BSD-3-Clause repository: MIT, BSD, ISC, Apache-2.0, Zlib, CC0, public domain, OFL
   (fonts), CC-BY (with attribution). Reject GPL/AGPL/LGPL code, CC-BY-SA, NC, ND, and
   "free for personal use" terms; ask the requester when in doubt.
3. Generated data keeps its upstream terms; record the source and license in the generator
   output metadata and in the notices.
4. Original files carry no third-party copyright notices. Never copy code from a source
   without its license.
5. Creative content must be original: no copyrighted or trademarked characters, logos, brand
   names, mascots, the distinctive look of existing games, melodies, jingles, sound logos, or voice
   imitations. Do not name real products or artists as "in the style of" references.
6. Dependencies of WebAssembly crates and npm packages are checked the same way
   (`cargo tree --edges normal`, `npm ls --omit=dev`). Prefer zero-dependency crates.
7. Mention the recheck result in the PR body.

## Pitfalls

- Required capabilities block the app; keep the required list to what the app cannot work
  without. Everything in this skill's defaults except saves and WebAssembly is usually optional.
- Never prompt for a permission or start audio on page load; wait for a user gesture.
- The CSP forbids inline scripts and styles, `eval`, and third-party origins other than
  pinned cdnjs. Compile shaders from strings in modules, set styles through CSSOM or classes,
  and inline WebAssembly only through `WebAssembly.instantiate` (allowed by
  `'wasm-unsafe-eval'`).
- Headless CI has no WebGPU adapter and no audio device; make those tests self-skip with a
  reason instead of weakening assertions.
