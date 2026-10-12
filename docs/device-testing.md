# Device testing

## Engine coverage

| Device / OS | Browser examples | Engine expected by this project | Guidance |
| --- | --- | --- | --- |
| Windows 11 | Chrome, Edge | Chromium | Compare with Chromium E2E results |
| Windows 11 | Firefox | Gecko | Desktop Firefox result is a reference, not mobile parity |
| macOS | Safari | WebKit | Record Safari and OS versions |
| iPhone / iPad | Safari, Chrome, Firefox and other browsers | WebKit | All iOS/iPadOS browsers use WebKit |
| Android | Chrome | Chromium | Test permission and sensor behavior on hardware |
| Android | Firefox | GeckoView | Do not assume desktop Firefox parity |
| ChromeOS | Chrome | Chromium | Note managed-device policy restrictions |

## WebAssembly reference

The current Layer 1 suite measures Chromium 17/17; Firefox 15/17, without relaxed SIMD and JSPI; and WebKit 13/17, without relaxed SIMD, memory64, multi-memory, and JSPI. Device builds can differ.

## Report a result

Include device model, OS build, browser name/version, engine if known, secure-context state, `crossOriginIsolated`, capability ID, observed status/detail, and a screenshot or console excerpt with private information removed. State whether permission was already granted and whether a user gesture was used. Never include tokens or private data.

Physical-device behavior is not comprehensively covered by CI. Do not describe desktop browser tests as device certification.
