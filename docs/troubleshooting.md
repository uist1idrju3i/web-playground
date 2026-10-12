# Troubleshooting

| Symptom | Checks and resolution |
| --- | --- |
| `crossOriginIsolated` is false | Serve the Browser Features page over HTTPS or the local server and verify scoped COOP/COEP headers in `public_html/_headers`. |
| WebAssembly is blocked by CSP | Check the exact CSP header and `wasm-unsafe-eval`; do not add `unsafe-eval` or an inline-style exception. |
| Playwright reports missing browsers | Run `npx playwright install --with-deps chromium webkit firefox` with Node 24.21.0. |
| `check:generated` reports a diff | Run `npm run generate`, review the source and generated outputs, then commit both. Do not edit generated output by hand. |
| Static resource gate fails | Fix the URL or add correct versioned cdnjs SRI metadata; do not add a suppression or allowlist. |
| Runtime resource E2E fails | Inspect the recorded request, CSP violation, WebSocket, or page error and remove/fix the attempted load. |
| Markdown link check fails | Correct the relative path or heading fragment; headings use GitHub-style slugs. |
| A feature is `untestable` | The browser could not complete a safe probe. This is not evidence that the feature is unsupported. |
