---
name: browser-app-ux
description: UX design method for apps in this repository, distilled from VibeBB UX-creator-agent - jobs-to-be-done reframing, core loops with rewards, onboarding inside the loop, explicit statecharts, Nielsen feedback budgets, multimodal feedback with captions, palette roles with WCAG contrast tests, theory lenses (HIG, MDA, flow, self-determination), and iPhone/touch layout rules. Use when designing or reviewing any app screen, interaction, game loop, or mobile layout.
---

# Browser app UX

The method follows [VibeBB UX-creator-agent](https://github.com/VibeBB/UX-creator-agent)
(`plugins/ux/skills/`: `ux-workflow`, `ux-jtbd`, `ux-theory-lenses`, `ux-interaction-content`,
`ux-cmf`; BSD 3-Clause, copyright (c) 2026 VibeBB). That agent writes a UX contract and gates it deterministically; here the same rules
become code structure and tests.

## 1. Reframe the request

Never take the request literally. Write the jobs the app is hired for, each with all three
dimensions:

- **Functional** — the task ("stack all 47 prefectures").
- **Emotional** — how the user wants to feel ("the thrill of a tower that nearly falls").
- **Social** — how they want to be seen ("a screenshot worth sharing").

Score importance and current satisfaction from 1 to 10. Opportunity =
`importance + max(importance - satisfaction, 0)`; at 15 or more the job is underserved and gets
the most design effort. Breaking a guideline on purpose is allowed only for an underserved job,
with the broken guideline and the reason written in the plan.

## 2. Core loop and journey

- Define the core loop as `action -> feedback -> reward`, with a cadence: moment (seconds),
  session (minutes), and long-term (collection, records, achievements). Every loop must close
  with a reward; an open loop is where engagement dies.
- Journey stages: discover, onboard, use, recover, exit. App surfaces always have an onboard
  stage: teach inside the loop, not in a manual; the first success happens within 60 seconds.
- Recover is designed, not accidental: unsupported browser, lost WebGL/WebGPU context, audio
  interrupted, corrupt or tampered save, offline.

## 3. Statechart

- Model phases in a small module (see `public_html/baked-mochocho/js/statechart.js`): a frozen
  phase list and an `event -> { from, to }` table; illegal transitions throw.
- Exactly one initial state, every state reachable, no non-final dead ends, and deterministic
  guards (the same state and event never lead to two targets without distinct guards).
- Mirror the phase on `document.body.dataset.phase` so E2E tests and CSS can follow it.
- Unit-test the table: reachability, dead ends, illegal transitions.

## 4. Feedback budgets

Every user action gets a perceivable response (Nielsen limits):

| Response time | Rule                                                               |
| ------------- | ------------------------------------------------------------------ |
| <= 100 ms     | Direct manipulation feedback: press state, sound, haptic, particle |
| <= 1 s        | Allowed without a progress indicator                               |
| 1-10 s        | Must show progress (WASM download, shader compile, data load)      |
| > 10 s        | Not acceptable; split, stream, or cache the work                   |

Feedback is multimodal: visual plus audio (plus haptic where supported). Never rely on sound
alone: every sound has a matching on-screen caption or visual, and every color signal also has
a shape, icon, or text.

## 5. Visual design system

- Define palette roles as CSS custom properties: `primary`, `secondary`, `accent`, `signal`
  (status only), `neutral`. Keep signal colors for status feedback.
- Contrast is tested, not eyeballed: add a unit test like
  `tests/unit/baked-mochocho-contrast.test.js` for the pairs the UI renders. Text needs 4.5:1
  (3:1 for large text); non-text UI and graphics need 3:1.
- Typography: system font stacks or self-hosted, license-compatible fonts only (no font CDNs;
  see `AGENTS.md`).
- Motion: honor `prefers-reduced-motion` (reduce camera shake, particles, haptics, parallax),
  and use the Web Animations API or CSS transitions for UI, the canvas for the scene.
- Provide Japanese and English text through a small i18n table; set `<html lang>` and keep
  the language toggle reachable.

## 6. Theory lenses

Cite the lens in the plan when it decides a trade-off.

- **Apple HIG** — clarity, deference, depth; content is the hero and chrome recedes; direct
  manipulation, consistent controls, user control over sound and motion.
- **MDA** — reason mechanics -> dynamics -> aesthetics, then check the aesthetics the player
  should feel (sensation, challenge, discovery, expression...).
- **Flow** — balance challenge against skill along a difficulty curve; both anxiety and boredom
  are failures. Tune with measured values (spawn rates, tolerances), not guesses.
- **Self-determination** — autonomy (meaningful choices), competence (clear progress, fair
  judgement), relatedness (sharing, shared records).
- **QCD** — make quality, cost, and delivery trade-offs explicit in the plan.

## iPhone and touch

iPhone is a first-class target. All iOS browsers use WebKit, so desktop Chromium results say
nothing about iPhone behavior.

- Viewport: `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">`.
  Prefer `touch-action` on the play surface over `user-scalable=no` (iOS ignores the latter for
  accessibility anyway).
- Layout with `100dvh`/`100svh` (not `100vh`), and pad fixed UI with
  `max(<gap>, env(safe-area-inset-*))` for the notch, Dynamic Island, and home indicator.
- Design both portrait and landscape. Test at least 375x667, 390x844, and 430x932 plus their
  landscape forms (see the iPhone viewport tests in `tests/e2e/baked-mochocho.spec.js`): every
  control stays inside the viewport without page scroll.
- Touch targets are at least 44x44 CSS px. Use Pointer Events with `setPointerCapture`; never
  depend on hover. Map the same actions to mouse, keyboard, and (optionally) gamepad.
- Audio: create or resume the `AudioContext` inside a user-gesture handler. WebKit can put a
  context into `interrupted` (calls, Siri); resume on the next gesture. A page cannot read the
  silent switch, so show a one-time hint on Apple touch devices and always show captions.
- Haptics: `navigator.vibrate` is not available on iOS WebKit; treat haptics as optional.
- Rendering: cap the device pixel ratio (iPhones report 3) and scale resolution adaptively.
  Low Power Mode can throttle `requestAnimationFrame`, so step simulations with measured delta
  time and a fixed-step accumulator.
- Lifecycle: on `visibilitychange` pause the loop, suspend audio, and save.
- Home screen: add a web app manifest, `apple-touch-icon`, and `theme-color` for apps that
  benefit from standalone launch (see `public_html/baked-mochocho/`).
