# Browser support

The app detects the current runtime. All 17 Layer 1 probes passed on the Playwright 1.64 engines measured below; these results are not a promise for every browser version or device.

| Engine   | Version | Passing probes | Measured missing probes |
| -------- | ------: | -------------: | ----------------------- |
| Chromium |     156 |          17/17 | None                    |
| Firefox  |     157 |          17/17 | None                    |
| WebKit   |    27.2 |          17/17 | None                    |

Real Safari and Firefox release channels can differ from the Playwright engine builds.

See [device testing](device-testing.md) for OS-to-engine mapping. All iOS and iPadOS browsers use WebKit. Device APIs can depend on secure context, permission, user gesture, hardware, and embedding policy; the app does not prompt on load.

`untestable` means the probe could not safely establish support. It is not equivalent to `unsupported`. Browser versions, flags, policies, and platform builds can change results; inspect the live capability detail and report the exact environment.
