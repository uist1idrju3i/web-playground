# Cloudflare Pages

Configure the Pages project with:

- Production branch: `main`
- Framework preset: `None`
- Build command: leave empty
- Build output directory: `public_html`
- Root directory: repository root
- Build environment variable: `SKIP_DEPENDENCY_INSTALL=1`
- Custom domain: `web-playground.xn--uist1idrju3i.jp`
- Preview deployments: enabled

The site is plain static HTML, CSS, and JavaScript modules. Do not add a build step or external CDN resources. Cloudflare Pages honors `public_html/_headers`; keep its security policy in sync with local `scripts/serve.mjs`. COOP/COEP are scoped to `/browser-features/*` to enable cross-origin isolation there. Do not add a Permissions-Policy that disables browser APIs this project reports.
