# Native desktop shells

Native wrappers that run the unmodified `public_html/` BrowserFeatures app inside
each framework's embedded webview. Because the app measures the engine it runs
in, each shell produces a different engine profile (Chromium vs WebKitGTK),
which is exactly what these wrappers exist to compare.

See [docs/native-apps.md](../docs/native-apps.md) for architecture, requirements,
and the engine comparison.

## Layout

| Directory      | Shell                   | Engine                         |
| -------------- | ----------------------- | ------------------------------ |
| `electron/`    | Electron 44             | Chromium 152 (bundled)         |
| `tauri/`       | Tauri v2                | WebKitGTK (system webview)     |
| `wails/`       | Wails v3 beta           | WebKitGTK (system webview)     |
| `headers.json` | shared security headers | mirrors `public_html/_headers` |

`headers.json` is the single source both shells and the unit test consume;
`tests/unit/native-headers.test.js` fails if it drifts from `_headers`.

## Quick start

```sh
# Electron (no system deps beyond Electron's usual)
cd native/electron && npm ci && npx electron .

# Tauri (needs Rust + the crates in src-tauri/Cargo.lock)
cd native/tauri && npm ci && npx tauri dev

# Wails (needs Go ≥1.25 and GTK/WebKitGTK dev packages; on Linux use gtk3)
cd native/wails && go build -tags gtk3 -o browser-features . && ./browser-features
```

See [docs/native-apps.md](../docs/native-apps.md) for Linux package lists,
packaging commands, and known limitations.
