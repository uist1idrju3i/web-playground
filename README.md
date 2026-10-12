# Web Playground

[![CI](https://github.com/uist1idrju3i/web-playground/actions/workflows/ci.yml/badge.svg)](https://github.com/uist1idrju3i/web-playground/actions/workflows/ci.yml)
[![CodeQL](https://github.com/uist1idrju3i/web-playground/actions/workflows/codeql.yml/badge.svg)](https://github.com/uist1idrju3i/web-playground/actions/workflows/codeql.yml)
[![Scorecard](https://api.securityscorecards.dev/projects/github.com/uist1idrju3i/web-playground/badge)](https://securityscorecards.dev/viewer/?uri=github.com/uist1idrju3i/web-playground)
[![License: BSD 3-Clause](https://img.shields.io/badge/License-BSD_3--Clause-blue.svg)](LICENSE)
[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/uist1idrju3i/web-playground)

A static playground for learning what the browser you are using can actually do.

Site URL: <https://web-playground.xn--uist1idrju3i.jp> (custom-domain DNS and Pages settings are owner-managed).

## Choose a path

| Persona       | Start here                                                    |
| ------------- | ------------------------------------------------------------- |
| Learner       | [Learning path](docs/learning-path.md)                        |
| Device tester | [Device testing guide](docs/device-testing.md)                |
| App author    | [Add an app](docs/adding-an-app.md)                           |
| AI agent      | [Agent constitution](AGENTS.md)                               |
| Maintainer    | [Maintenance](docs/maintenance.md) and [CI/CD](docs/ci-cd.md) |

## Apps

- **Browser Features** (`/browser-features/`) — measured capability support, permission-policy information, and WebAssembly probes.

## Quick start

Requires Node.js 24.21.0 (see `.nvmrc`).

```sh
nvm install
nvm use
npm ci --ignore-scripts
npm audit signatures
npm run serve
```

Open <http://127.0.0.1:4173>. Run `npm test` for lint, security and documentation gates, generated-file checks, unit tests, and Chromium/WebKit/Firefox E2E.

## Support summary

Capability results are measured at runtime and may be `supported`, `partial`, `unsupported`, or `untestable`. Layer 1 WebAssembly execution probes currently measure Chromium **17/17**, Firefox **15/17** (relaxed SIMD and JSPI absent), and WebKit **13/17** (relaxed SIMD, memory64, multi-memory, and JSPI absent). See [browser support](docs/browser-support.md) for caveats and device guidance.

## Security and external resources

Security and stability come before runtime performance. Pages load JavaScript and CSS only from their own origin or version-pinned, SRI-protected cdnjs URLs. Static parser checks, runtime browser tests, a locked CSP test, and CodeQL enforce the policy. Navigation links may point elsewhere; they do not load resources. Fonts use system stacks by default. See [external-resource policy](docs/external-resources.md) and [SECURITY.md](SECURITY.md).

## Documentation

See [the documentation index](docs/README.md) for persona-based reading order, architecture, WebAssembly, WebMCP, hosting, support, and troubleshooting.

## Limitations

- Physical devices are not comprehensively tested; desktop engine results are not a substitute.
- WebMCP is experimental and may not be available in every Chromium build.
- Device APIs may require a secure context, a user gesture, or permission; the app does not prompt on page load.
- The custom domain, DNS, Pages project, and owner-side repository settings must be configured by the repository owner.

## License

BSD 3-Clause. See [LICENSE](LICENSE).
