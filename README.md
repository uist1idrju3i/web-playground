# web-playground

# Web Playground

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/uist1idrju3i/web-playground)

A static, open learning playground for modern browser and web-platform technologies. The first app, **Browser Features**, reports browser environment details and probes browser capabilities without requesting permissions.

Live site: <https://web-playground.xn--uist1idrju3i.jp>

## Repository structure

- `public_html/` — static files served by Cloudflare Pages.
- `public_html/library/` — shared styles, browser detection, feature data, and requirement checks.
- `public_html/browser-features/` — the first learning app.
- `wasm/` — executable WebAssembly probes and compiler-toolchain source examples.
- `docs/` — architecture, deployment, CI/CD, browser support, WebAssembly, and generated platform feature reference.
- `scripts/` — deterministic feature/probe generation, toolchain builds, and a local static server.

## Local development

Use the Node.js version in `.nvmrc`.

```sh
npm ci
npm run serve
```

Open <http://localhost:4173>. Run the complete local quality suite with:

```sh
npm test
```

Playwright browsers may need to be installed once with `npx playwright install --with-deps chromium webkit firefox`.

## Security and external resources

Prioritize security and stability first, then runtime performance. Keep the site static and load JavaScript and CSS only from this origin or version-pinned cdnjs resources protected by SRI and anonymous CORS. See [the external-resources policy](docs/external-resources.md).

Build and verify the WebAssembly compiler profiles with the pinned toolchains described in
[docs/webassembly.md](docs/webassembly.md).

## Feature data

The app data and complete Chrome/Safari feature comparison are generated from pinned `web-features` and MDN browser-compat-data versions:

```sh
npm run generate
```

Review upstream changes before updating either dataset version, and commit both generated outputs.

## Deployment

Cloudflare Pages serves `public_html/` directly with no build step. See [Cloudflare Pages setup](docs/cloudflare-pages.md) for project configuration and custom-domain details.

The workflow map and owner-side repository settings are documented in [docs/ci-cd.md](docs/ci-cd.md).

## License

Original project code is licensed under BSD-3-Clause; see [LICENSE](LICENSE). Generated data has the upstream licenses described in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
