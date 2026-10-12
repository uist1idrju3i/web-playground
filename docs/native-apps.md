# Native desktop apps

The repository ships three native shells under [`native/`](../native/) that run
the unmodified `public_html/` BrowserFeatures app:

- **Electron** (`native/electron`) — bundles Chromium 152, serves the site over a
  loopback HTTP server so every `_headers` rule and `application/wasm` MIME type
  applies verbatim.
- **Tauri v2** (`native/tauri`) — uses the system webview (WebKitGTK on Linux)
  with a `tauri://` custom scheme; COOP/COEP/CORP are re-declared in
  `tauri.conf.json` because Tauri only supports a fixed allowlist of headers.
- **Wails v3** (`native/wails`) — uses the system webview with an internal asset
  handler implemented in Go that mirrors the serving rules in `native/headers.json`.

## Why

BrowserFeatures measures the engine it is hosted in. Running it inside these
shells compares engine capabilities directly:

| Measurement           | Electron (Chromium 152) | Tauri/Wails (WebKitGTK 2.50)  |
| --------------------- | ----------------------- | ----------------------------- |
| Secure context        | Yes                     | Yes                           |
| `crossOriginIsolated` | Yes (COOP+COEP applied) | No (`tauri:`/`wails:` scheme) |
| wasm-threads          | Supported               | Unsupported                   |
| JSPI / memory64       | per browser profile     | Unsupported                   |

WebKitGTK does not enable cross-origin isolation on custom schemes, so
SharedArrayBuffer-dependent probes correctly report Unsupported there — that is
a genuine engine result, not a configuration gap.

## Shared header contract

`native/headers.json` mirrors `public_html/_headers` in a JSON shape every
runtime can consume:

- `global` — headers applied to every response (CSP, CORP, nosniff, …).
- `rules` — `pattern` (extension `*.wasm`, prefix `/dir/*`, or exact path) plus
  `headers` and/or `contentType`.

`tests/unit/native-headers.test.js` asserts the file stays in parity with
`_headers` and exercises the shared serving semantics (pattern matching,
traversal clamping, GET/HEAD-only, 405 otherwise). Edit `_headers` and
`headers.json` together — the test fails otherwise.

## Requirements

### Electron

Node 24 (`npm ci` in `native/electron`). Build artifacts:
`npx electron-builder --config electron-builder.yml` (AppImage/deb on Linux,
DMG/zip on macOS, NSIS/zip on Windows; not exercised in CI).

### Tauri v2

- Rust toolchain (repo `rust-toolchain.toml` channel applies).
- `@tauri-apps/cli` via `npm ci` in `native/tauri`.
- Linux system packages: `libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev`
  (or the Tauri prerequisite list for your distro).

Run `npx tauri dev`, build with `npx tauri build` (add `--no-bundle` to skip
installers). Known limitation: Tauri's `HeaderConfig` allowlist does not include
`Referrer-Policy`, so that header is intentionally omitted in `tauri.conf.json`.

### Wails v3 (beta)

- Go ≥ 1.25 (repo pins `go 1.25` in `native/wails/go.mod`).
- Wails CLI `v3.0.0-beta.28` for `wails3 dev` (optional; `go build` works alone).
- Linux: `libwebkit2gtk-4.1-dev libgtk-3-dev pkg-config`. The default Wails GTK4
  backend needs GTK ≥ 4.10; build with `-tags gtk3` on older GTK, which selects
  the GTK3 + WebKitGTK 4.1 backend this shell was verified with:

  ```sh
  cd native/wails && go build -tags gtk3 -o browser-features .
  ```

The binary locates the site via `BROWSER_FEATURES_ROOT`, then the working
directory, then the executable's directory, so `go run`, `wails3 dev`, and a
built binary run from the repo root all work unmodified.

## CI

`.github/workflows/native-build.yml` compiles each shell on every PR (Electron
headless smoke test, `cargo build --release`, `go build -tags gtk3`). It is
informational, not a required check. Packaging (`electron-builder`,
`tauri build` bundling, `wails3 build`) is intentionally out of CI scope.

## Verification notes

All three shells were verified on Ubuntu 22.04 by running them and screenshotting
the rendered app. This box's `webkit2gtk-4.1` 2.50.4 has a latent
`gst_init` crash affecting _all_ WebKitGTK apps (including system MiniBrowser);
for local verification only we preloaded a tiny `gst_init` shim via `LD_PRELOAD`.
That is a system-package bug, not something the shells ship or need on normal
systems.
