# Architecture

The site is a static collection of HTML, CSS, and JavaScript modules. Cloudflare Pages serves the contents of `public_html/` as-is; there is no build pipeline or runtime package dependency.

Each app lives in a top-level directory under `public_html/` and imports shared modules and styles from `public_html/library/`. The shared library provides environment discovery, capability detection, data probes, and `checkRequirements` for app startup. App-specific UI stays in its own directory.

`scripts/generate-feature-data.mjs` transforms the pinned web-features and MDN browser-compat-data packages into the feature JSON used by the app and the human-readable comparison in `docs/`. Generated outputs must be committed and refreshed with `npm run generate`.

The local server mirrors Pages behavior for static paths, `_headers`, and 404 responses. Browser Features alone receives COOP and COEP headers to expose `crossOriginIsolated`.
