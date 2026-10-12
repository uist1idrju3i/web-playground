# Maintenance

## Dependencies

1. Read the complete changelog from the currently pinned version through the proposed version.
2. Record evaluated changes and adopted/deferred decisions here.
3. Pin exact versions, update the lockfile, run `npm audit signatures`, and complete `npm test`.
4. Keep generated outputs reproducible and review any license or security impact.

### Playwright 1.56.1 → 1.64.0 review

The complete v1.57–v1.64 release notes were reviewed, including browser changes, reporter/CLI updates, locator and accessibility APIs, storage APIs, screenshots/video, test-runner options, and breaking changes. The v1.57 Chrome-for-Testing switch and v1.58 macOS 13 WebKit removal were noted; CI uses supported Linux browser builds. The v1.59 screencast/agent tooling, v1.60 ARIA/abort APIs, v1.62 component-testing model, and v1.63 cross-frame/visible locators do not match this repository's current test needs. Adopted from v1.57: context-level request events for service-worker coverage. Adopted from v1.61: `page.localStorage`/`page.sessionStorage` cleanup assertions, `failOnFlakyTests`, and the supported Ubuntu 26.04 runner. Adopted from v1.64: `page.webmcp` for the feature-tool integration test.

Not adopted: test locks (v1.63–1.64), `--shuffle`, `TestProject.default`, retry strategies, WebP screenshots, screencast/video, bundled MCP/CLI, component testing, and OPFS/credentials `storageState`; these add no needed coverage for this static site or change output/ordering outside the requested scope. New locator/ARIA, request-context, trace, and reporter APIs were reviewed but not adopted where there is no corresponding use case. The v1.64 `screen` forwarding change was checked by retaining current device-project expectations; the full browser suite will verify that they still pass.

### Runtime and runner policy

Use Node 24 LTS, pinned by `.nvmrc` and the package engine range. Ubuntu 26.04 is a public runner-image preview. Revisit it when generally available or if the preview breaks; fall back to Ubuntu 24.04 in that case and document the reason.

### Dataset and WASM updates

Change source data or generators, run `npm run generate`, inspect generated diffs, and run `npm run check:generated`. For Layer 2, run `scripts/build-wasm-toolchains.sh`, inspect the manifest and binaries, and update [third-party notices](../THIRD_PARTY_NOTICES.md).

### servoshell pin

`tests/servo/` drives the pinned servoshell nightly from `servo/servo-nightly-builds`. To update: pick a dated release tag, download `servo-x86_64-linux-gnu.tar.gz` plus its `.sha256` sidecar, update `tag`, `asset`, and `sha256` in `tests/servo/servo-version.json`, run `node scripts/fetch-servo.mjs`, then `npm run test:servo`. Treat a servoshell update like a dependency bump: check the release notes and record the outcome here. Do not track the floating `latest` artifacts — the pin plus sidecar checksum is the integrity gate.

### Dependabot and releases

Review grouped Dependabot PRs together with their release notes and security advisories. Verify signature and lockfile changes before merge. Deployments and rollbacks use Cloudflare Pages deployments; owner-side DNS and project configuration remain outside this repository.
