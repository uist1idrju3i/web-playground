# Browser support

The app detects the current runtime; this table describes measured Layer 1 WebAssembly execution results, not a promise for all versions or devices.

| Engine | Passing probes | Measured missing probes |
| --- | ---: | --- |
| Chromium | 17/17 | None in the tested build |
| Firefox | 15/17 | `wasm-relaxed-simd`, `wasm-jspi` |
| WebKit | 13/17 | `wasm-relaxed-simd`, `wasm-memory64`, `wasm-multi-memory`, `wasm-jspi` |

See [device testing](device-testing.md) for OS-to-engine mapping. All iOS and iPadOS browsers use WebKit. Device APIs can depend on secure context, permission, user gesture, hardware, and embedding policy; the app does not prompt on load.

`untestable` means the probe could not safely establish support. It is not equivalent to `unsupported`. Browser versions, flags, policies, and platform builds can change results; inspect the live capability detail and report the exact environment.
