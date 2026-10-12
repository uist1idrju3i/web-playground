# WebMCP

The current experimental WebMCP surface is `document.modelContext`. This app registers read-only tools with `registerTool({ name, title, description, inputSchema, execute, annotations: { readOnlyHint: true } })`. Tool registration is a no-op when the API is absent. The shared helper also detects `navigator.modelContext` and labels it as legacy.

WebMCP is experimental and may require an Origin Trial token or an enabled browser flag. To use the trial, register the production origin at <https://developer.chrome.com/origintrials/> and configure the resulting `Origin-Trial` header in Cloudflare Pages `_headers`. Never commit private credentials; trial tokens are public-origin configuration, but should only be added after project-owner approval.

For local experimentation, Chrome may expose the API after enabling `chrome://flags/#enable-webmcp-testing`. A commented header placeholder is present in `public_html/_headers`; no token is included.
