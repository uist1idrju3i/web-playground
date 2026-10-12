# Cloudflare Pages

Cloudflare Pages serves the committed `public_html/` directory as static content. There is no production build command; generators run before commit and in CI only.

## Owner-side setup

1. Create or select the Pages project and connect the repository.
2. Set the output directory to `public_html/` and leave the build command empty.
3. Configure the custom domain and DNS for `web-playground.xn--uist1idrju3i.jp`.
4. Confirm Pages applies `public_html/_headers`.
5. After the domain is configured, review the `deploy-smoke` workflow on pushes to `main`.

The repository cannot verify account ownership, DNS propagation, or Cloudflare dashboard settings. A local test or successful workflow is not proof that the public custom domain is live.

The site may use version-pinned, SRI-protected cdnjs scripts/styles when necessary. Other third-party resource origins are prohibited; see [external resources](external-resources.md).
