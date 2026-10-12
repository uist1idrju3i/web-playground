# Browser support

The app detects the current runtime. All 17 Layer 1 probes passed on the Playwright 1.64 engines measured below; these results are not a promise for every browser version or device.

| Engine   | Version | Passing probes | Measured missing probes |
| -------- | ------: | -------------: | ----------------------- |
| Chromium |     156 |          17/17 | None                    |
| Firefox  |     157 |          17/17 | None                    |
| WebKit   |    27.2 |          17/17 | None                    |
| Servo    |   0.7.0 |          16/17 | WebAssembly threads     |

Real Safari and Firefox release channels can differ from the Playwright engine builds.

Servo is measured by `tests/servo/` against the pinned nightly in `tests/servo/servo-version.json` (servoshell 0.7.0, driven headless over W3C WebDriver). Servo lacks shared-memory WebAssembly threads and shows partial results elsewhere; its user agent contains a `Servo/` token the app reports directly. Servo also reports `style-src-attr` CSP violations for UA/author stylesheet rules — those `'inline'` violations are recorded in `test-results/servo/diagnostics.json` and are not failures.

See [device testing](device-testing.md) for OS-to-engine mapping. All iOS and iPadOS browsers use WebKit. Device APIs can depend on secure context, permission, user gesture, hardware, and embedding policy; the app does not prompt on load.

`untestable` means the probe could not safely establish support. It is not equivalent to `unsupported`. Browser versions, flags, policies, and platform builds can change results; inspect the live capability detail and report the exact environment.
