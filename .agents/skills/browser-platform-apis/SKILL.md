---
name: browser-platform-apis
description: Catalog for using the browser to its full extent in this repository's apps - which Web Platform capability to reach for (input, sensors, media, speech, sharing, files, storage, offline, multi-tab, graphics, AI, devices), each capability's checkRequirements ID, gesture/permission/secure-context rules, iPhone (WebKit) caveats, and CSP or static-hosting limits, plus how to add a missing capability. Use when choosing APIs for an app or when an app should "use every browser feature".
---

# Browser platform APIs

"Use the browser fully" means: for every user job, pick the most capable native API, gate it
with `checkRequirements`, and degrade gracefully where it is missing. Never pull in a
third-party library or service for something the platform already does.

## Rules for every capability

1. Look up the ID in [docs/capability-reference.md](../../../docs/capability-reference.md) and
   support data in [docs/web-platform-features.md](../../../docs/web-platform-features.md).
   If the API is missing from `public_html/library/js/capabilities.js`, add it first (see the
   `maintaining-web-playground` skill), then use it.
2. Classify it as `required` (the app is meaningless without it) or `optional` (enhancement
   with a fallback). Keep the required list short.
3. Permission prompts, sensors, camera, microphone, clipboard writes, share sheets,
   fullscreen, and audio start only from an explicit user gesture, after the UI explains why.
   Never on page load.
4. Respect the platform limits of this static site: no server, `connect-src 'self'`, no
   third-party origins, no inline script or style, `wasm-unsafe-eval` only. APIs that need a
   backend (Push, WebAuthn registration, WebTransport, signaling for WebRTC) are only usable in
   a self-contained way, or not at all.
5. iPhone runs WebKit: check every API's iOS status, not desktop Safari only.
6. Report `untestable` with the reason when CI cannot exercise an API (no camera, no GPU, no
   sensors), and list it in the PR as unverified.

## Catalog by user job

| Job                           | Capabilities (IDs)                                                                                  | Notes                                                                                                                                                                                 |
| ----------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Draw a rich scene             | `webgpu`, `webgl`, `canvas-2d`, `offscreen-canvas`                                                  | See `browser-app-graphics`. WebGPU optional with WebGL2 fallback.                                                                                                                     |
| Smooth layout and motion      | `css-container-queries`, `css-grid`, `css-nesting`, `view-transitions`, `web-animations`, `popover` | Popover and `<dialog>` for menus and results; View Transitions between phases (feature-detect, skip under reduced motion).                                                            |
| Observe size and visibility   | `resize-observer`, `intersection-observer`, `mutation-observer`                                     | Canvas sizing, lazy work, pausing off-screen animations.                                                                                                                              |
| Touch, mouse, keyboard        | `pointer-events`, `drag-and-drop`                                                                   | Pointer Events with capture for all pointer types; keyboard shortcuts for desktop; never hover-only.                                                                                  |
| Controllers                   | `gamepad`                                                                                           | Map the same actions as touch; poll in the frame loop; works on iOS with supported pads.                                                                                              |
| Motion and tilt controls      | Device orientation/motion (add a capability first)                                                  | iOS requires `DeviceOrientationEvent.requestPermission()` from a gesture; always offer a touch alternative.                                                                           |
| Haptics                       | `navigator.vibrate` (feature-detect)                                                                | Not available in iOS WebKit; always paired with visual and audio feedback; off under reduced motion.                                                                                  |
| Immersion                     | `fullscreen`, `wake-lock`, `webxr`                                                                  | iPhone Safari does not offer element fullscreen; hide the button when unsupported. Release wake locks when paused. WebXR is optional and gesture-started.                             |
| Sound and music               | `web-audio`, `audio-worklet`, `media-session`                                                       | See `browser-app-sound`. Media Session for lock-screen controls when the app plays long music.                                                                                        |
| Voice                         | `web-speech`                                                                                        | Speech synthesis for read-aloud or character voices (original lines only); recognition support is uneven, treat as optional.                                                          |
| Camera, microphone, recording | `media-devices`, `media-recorder`, `screen-capture`, `webcodecs`, `picture-in-picture`              | Permission from a gesture; process frames locally (WebCodecs, WebGPU, WASM); `canvas.captureStream()` + MediaRecorder to record gameplay clips.                                       |
| Share results                 | `web-share`, `clipboard-api`                                                                        | `navigator.share` (check `canShare({ files })` before sharing a rendered PNG); clipboard copy as fallback; both from a gesture.                                                       |
| Files                         | `file-api`, `file-system-access`, `drag-and-drop`, `compression-streams`                            | Import/export through `<input type=file>` and downloads everywhere; File System Access is a Chromium enhancement. Compress exports with CompressionStream.                            |
| Persistence                   | `indexeddb`, `local-storage`, `opfs`, `cache-storage`, `storage-estimate`, `storage-persisted`      | Saves go through the signed store (`browser-app-saves`); large binary data in OPFS or IndexedDB.                                                                                      |
| Integrity and randomness      | `web-crypto`, `web-crypto-random`                                                                   | HMAC saves, SHA-256 digests for content addressing, `getRandomValues` for seeds; never `Math.random` for anything security-relevant.                                                  |
| Offline and install           | `service-worker`, `web-locks`, `broadcast-channel`, `notifications`                                 | A web app manifest plus icons for home-screen launch. A service worker must be scoped to the app path, version its caches, cache only same-origin files.                              |
| Multi-tab coordination        | `broadcast-channel`, `web-locks`, `shared-workers`                                                  | Keep one writer for saves; sync settings across tabs.                                                                                                                                 |
| Heavy compute                 | `webassembly`, `wasm-simd`, `wasm-threads`, `web-workers`, `shared-array-buffer`, `atomics`         | See `browser-app-wasm`. Threads need cross-origin isolation headers for the path.                                                                                                     |
| Adapt to the device           | `compute-pressure`, `idle-detection`, `permissions-api`                                             | Compute Pressure (Chromium) can drive quality tiers; also adapt from measured frame time everywhere. `permissions-api` reads state without prompting.                                 |
| Localization and text         | `Intl` (built in)                                                                                   | `Intl.NumberFormat`, `PluralRules`, `RelativeTimeFormat`, `Segmenter` for Japanese and English UI text.                                                                               |
| Agents and on-device AI       | `webmcp`, `translator-api`, `language-detector-api`, `summarizer-api`, `prompt-api`                 | Register app tools with `registerTools` from `public_html/library/js/webmcp.js` (see [docs/webmcp.md](../../../docs/webmcp.md)). On-device AI APIs are Chromium-only optional extras. |
| Hardware devices              | `web-bluetooth`, `web-serial`, `webusb`, `webhid`, `web-nfc`                                        | Chromium-only; optional; chooser prompts from a gesture; never required by an app that should run on iPhone.                                                                          |
| Network                       | `fetch`, `websocket`, `eventsource`, `webtransport`, `webrtc`, `websocket-streams`                  | Same-origin only under the CSP. Peer-to-peer WebRTC needs signaling and ICE servers, which this static site does not provide.                                                         |
| Identity                      | `webauthn`                                                                                          | Needs a relying-party server for real accounts; do not fake authentication client-side.                                                                                               |

## Choosing well

- Start from the jobs in the UX plan and walk this table; list every capability that would
  make a job better, then cut the ones that cost stability or security.
- Prefer one robust path that works on iPhone plus enhancements over a Chromium-only design.
- Expose capability results in the app's requirements panel so users see why a feature is
  off.
