# Browser Support

Browser Features targets current Chromium, WebKit, and Firefox desktop browsers, with responsive support for mobile-sized screens. Feature availability remains specific to the browser, operating system, secure context, and user configuration.

| Platform                 | Typical engine                              | Notes                                                                                    |
| ------------------------ | ------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Windows, Linux, ChromeOS | Chromium for Chrome/Edge; Gecko for Firefox | Some device APIs are Chromium-only or require HTTPS.                                     |
| macOS                    | Chromium, WebKit, or Gecko                  | Safari APIs are reported separately from Chromium APIs.                                  |
| Android                  | Chromium for Chrome; Gecko for Firefox      | Hardware and permissions affect API availability.                                        |
| iOS and iPadOS           | WebKit in every browser, including Chrome   | The browser brand does not change the engine; Chromium-only features remain unavailable. |

Engine inference uses UA Client Hints when available and user-agent fallbacks otherwise. iPadOS can identify as MacIntel, so touch-point detection is used as an additional heuristic.

The app only performs read-only feature checks. Device discovery and permission requests must be explicitly initiated by future app UI, never during detection. Secure-context-only capabilities may be absent on non-local HTTP origins. Browser Features itself is served with COOP and COEP to expose `crossOriginIsolated`.

See the generated [web platform feature comparison](web-platform-features.md) for feature-by-feature Chrome and Safari version data.
