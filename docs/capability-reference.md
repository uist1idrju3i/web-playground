# Capability reference

These identifiers are accepted by `checkRequirements` and exported from the shared capability library.

A dash means the capability metadata does not specify that constraint. Permission and user-gesture requirements are not currently represented as capability fields.

| ID | Name | Category | Secure context | Engine limit | Permissions Policy feature |
| --- | --- | --- | --- | --- | --- |
| `webmcp` | WebMCP | AI and agents | — | — | — |
| `web-bluetooth` | Web Bluetooth | Devices | Yes | Chromium only | — |
| `web-serial` | Web Serial | Devices | Yes | Chromium only | — |
| `webusb` | WebUSB | Devices | Yes | Chromium only | — |
| `websocket` | WebSocket | Networking | — | — | — |
| `webtransport` | WebTransport | Networking | Yes | — | — |
| `webgl` | WebGL | Graphics | — | — | — |
| `webrtc` | WebRTC | Media | — | — | — |
| `web-audio` | Web Audio | Media | — | — | — |
| `web-crypto` | Web Crypto | Security | Yes | — | — |
| `webgpu` | WebGPU | Graphics | Yes | — | — |
| `webhid` | WebHID | Devices | Yes | Chromium only | — |
| `web-nfc` | Web NFC | Devices | Yes | Chromium only | — |
| `webcodecs` | WebCodecs | Media | — | — | — |
| `webxr` | WebXR | Immersive | Yes | — | — |
| `webauthn` | WebAuthn and passkeys | Security | Yes | — | — |
| `translator-api` | Translator API | AI and agents | — | Chromium only | — |
| `language-detector-api` | Language Detector API | AI and agents | — | Chromium only | — |
| `summarizer-api` | Summarizer API | AI and agents | — | Chromium only | — |
| `prompt-api` | Prompt API | AI and agents | — | Chromium only | — |
| `webassembly` | WebAssembly | JavaScript | — | — | — |
| `wasm-simd` | WebAssembly SIMD | WebAssembly | — | — | — |
| `wasm-relaxed-simd` | WebAssembly relaxed SIMD | WebAssembly | — | — | — |
| `wasm-threads` | WebAssembly threads | WebAssembly | — | — | — |
| `wasm-bigint` | WebAssembly BigInt | WebAssembly | — | — | — |
| `wasm-exceptions-legacy` | WebAssembly legacy exceptions | WebAssembly | — | — | — |
| `wasm-exnref` | WebAssembly exception references | WebAssembly | — | — | — |
| `wasm-tail-call` | WebAssembly tail calls | WebAssembly | — | — | — |
| `wasm-gc` | WebAssembly GC | WebAssembly | — | — | — |
| `wasm-memory64` | WebAssembly memory64 | WebAssembly | — | — | — |
| `wasm-multi-memory` | WebAssembly multi-memory | WebAssembly | — | — | — |
| `wasm-extended-const` | WebAssembly extended const | WebAssembly | — | — | — |
| `wasm-bulk-memory` | WebAssembly bulk memory | WebAssembly | — | — | — |
| `wasm-reference-types` | WebAssembly reference types | WebAssembly | — | — | — |
| `wasm-jspi` | WebAssembly JSPI | WebAssembly | — | — | — |
| `wasm-js-string-builtins` | WebAssembly JS string builtins | WebAssembly | — | — | — |
| `wasm-streaming` | WebAssembly streaming compilation | WebAssembly | — | — | — |
| `web-share` | Web Share | Files and storage | Yes | — | — |
| `file-system-access` | File System Access | Files and storage | Yes | Chromium only | — |
| `opfs` | Origin Private File System | Storage | — | — | — |
| `storage-estimate` | Storage estimate | Storage | — | — | — |
| `storage-persisted` | Storage persistence | Storage | — | — | — |
| `service-worker` | Service Worker | Offline and background | — | — | — |
| `push-api` | Push API | Offline and background | Yes | — | — |
| `notifications` | Notifications | Offline and background | Yes | — | — |
| `wake-lock` | Wake Lock | Device and sensors | Yes | — | — |
| `screen-capture` | Screen Capture | Media | Yes | — | — |
| `web-locks` | Web Locks | Offline and background | — | — | — |
| `view-transitions` | View Transitions | Rendering and input | — | — | — |
| `popover` | Popover API | Rendering and input | — | — | — |
| `compute-pressure` | Compute Pressure | Device and sensors | Yes | — | — |
| `idle-detection` | Idle Detection | Device and sensors | Yes | Chromium only | — |
| `gamepad` | Gamepad | Device and sensors | — | — | — |
| `geolocation` | Geolocation | Device and sensors | Yes | — | — |
| `web-workers` | Web Workers | JavaScript | — | — | — |
| `shared-workers` | Shared Workers | JavaScript | — | — | — |
| `broadcast-channel` | Broadcast Channel | Networking | — | — | — |
| `indexeddb` | IndexedDB | Storage | — | — | — |
| `cache-storage` | Cache Storage | Storage | — | — | — |
| `local-storage` | Local Storage | Storage | — | — | — |
| `session-storage` | Session Storage | Storage | — | — | — |
| `cookies` | Cookies | Storage | — | — | — |
| `clipboard-api` | Clipboard API | Files and storage | Yes | — | — |
| `file-api` | File API | Files and storage | — | — | — |
| `drag-and-drop` | Drag and Drop | Rendering and input | — | — | — |
| `pointer-events` | Pointer Events | Rendering and input | — | — | — |
| `custom-elements` | Custom Elements | Rendering and input | — | — | — |
| `shadow-dom` | Shadow DOM | Rendering and input | — | — | — |
| `css-container-queries` | CSS Container Queries | Rendering and input | — | — | — |
| `css-nesting` | CSS Nesting | Rendering and input | — | — | — |
| `css-grid` | CSS Grid | Rendering and input | — | — | — |
| `web-animations` | Web Animations | Rendering and input | — | — | — |
| `offscreen-canvas` | OffscreenCanvas | Graphics | — | — | — |
| `canvas-2d` | Canvas 2D | Graphics | — | — | — |
| `audio-worklet` | AudioWorklet | Media | — | — | — |
| `media-devices` | Media Devices | Media | Yes | — | — |
| `media-recorder` | MediaRecorder | Media | — | — | — |
| `eventsource` | Server-Sent Events | Networking | — | — | — |
| `compression-streams` | Compression Streams | Networking | — | — | — |
| `websocket-streams` | WebSocketStream | Networking | — | — | — |
| `shared-array-buffer` | SharedArrayBuffer | JavaScript | — | — | — |
| `atomics` | Atomics | JavaScript | — | — | — |
| `web-speech` | Web Speech | Media | — | — | — |
| `media-session` | Media Session | Media | — | — | — |
| `picture-in-picture` | Picture-in-Picture | Media | — | — | — |
| `fullscreen` | Fullscreen | Rendering and input | — | — | — |
| `resize-observer` | Resize Observer | Rendering and input | — | — | — |
| `intersection-observer` | Intersection Observer | Rendering and input | — | — | — |
| `mutation-observer` | Mutation Observer | Rendering and input | — | — | — |
| `web-crypto-random` | Cryptographic Randomness | Security | — | — | — |
| `permissions-api` | Permissions API | Security | — | — | — |
| `fetch` | Fetch | Networking | — | — | — |
| `es-modules` | JavaScript modules | JavaScript | — | — | — |

WebAssembly probe IDs (16): wasm-simd, wasm-relaxed-simd, wasm-threads, wasm-bigint, wasm-exceptions-legacy, wasm-exnref, wasm-tail-call, wasm-gc, wasm-memory64, wasm-multi-memory, wasm-extended-const, wasm-bulk-memory, wasm-reference-types, wasm-jspi, wasm-js-string-builtins, wasm-streaming.
