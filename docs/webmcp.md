# WebMCP

WebMCP is an experimental browser interface that exposes tools registered by a page to compatible agents. It is optional; the app must continue to work when the API is absent.

## Origin Trial

1. Review the current Chrome WebMCP Origin Trial eligibility and terms from the official Chrome developer documentation.
2. Register the exact production origin in the trial console and obtain its token.
3. Add the token only through an approved, non-secret deployment configuration mechanism; do not commit a private credential.
4. Recheck the resource policy, CSP, and application behavior for the enrolled origin.

Do not claim Origin Trial availability until the owner enables it and verifies the deployed origin.

## Testing

Playwright 1.64 exposes `page.webmcp`. The Chromium-only test launches with `--enable-features=WebMCP`, inspects the registered tools, and parses the highlight-capabilities result. A local build without `page.webmcp` is reported as a precise skipped test; no test workaround is added.

See the [capability reference](capability-reference.md) for the WebMCP capability ID.
