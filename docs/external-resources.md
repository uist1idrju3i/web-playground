# External-resource policy

Priorities are security and stability first, then runtime performance. JavaScript and CSS load only from the site origin or `https://cdnjs.cloudflare.com`. cdnjs URLs must use an exact `/ajax/libs/<name>/<x.y.z>/` path, strong sha384/sha512 SRI, and `crossorigin="anonymous"`. External navigation links (for example, MDN or specifications) are allowed because they do not load a page resource.

## Layered enforcement

1. **Static parser gate** (`scripts/check-external-resources.mjs`) examines HTML, inline script/style, JavaScript URL sinks, CSS resources, SVG, and web manifests. It rejects unknown origins, invalid cdnjs use, and parse failures.
2. **Runtime E2E gate** (`tests/e2e/resource-policy.spec.js`) discovers every HTML page, records and aborts disallowed requests, observes WebSockets and CSP violations, and rejects page errors.
3. **CSP lock test** (`tests/unit/headers.test.js`) requires the exact global directive map and scoped isolation/security headers.
4. **Browser CSP** in `public_html/_headers` applies policy at runtime.

Fix a source violation; never bypass or weaken a gate. Do not add `'unsafe-inline'` or `'unsafe-eval'`.

## Fonts

Do not use Google Fonts or Cloudflare Fonts. Cloudflare Fonts injects inline styles (which would require weakening `style-src`) and can fall back to `fonts.gstatic.com`, creating an unapproved third-party dependency. Prefer the Japanese-capable system font stack in `public_html/library/css/base.css`.

If a product need requires a bundled font, self-host OFL-licensed WOFF2 subsets under `public_html/library/fonts/`, define precise `unicode-range` blocks, set `font-display: swap`, and include the complete applicable SIL Open Font License text in the repository notices. Do not add font binaries without reviewing size, coverage, and licensing.
