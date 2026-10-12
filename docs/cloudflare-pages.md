# Cloudflare Pages

Cloudflare Pages serves the committed `public_html/` directory as static content. There is no production build command; generators run before commit and in CI only.

## Owner-side setup

1. Create or select the Pages project and connect the repository.
2. Set the output directory to `public_html/` and leave the build command empty.
3. Configure the custom domain and DNS for `web-playground.xn--uist1idrju3i.jp`.
4. Confirm Pages applies `public_html/_headers`.
5. Keep Rocket Loader off (Speed → Optimization → Content Optimization). It rewrites module script types and injects a Rocket Loader script, changing the HTML and behavior covered by the resource-policy tests.
6. Disable automatic Web Analytics injection for the Pages project or domain. Its beacon script is blocked by this site's Content Security Policy and produces browser errors.
7. Review the scheduled `deploy-smoke` workflow and its production browser-policy results after configuring the domain.

Production must serve the same application HTML that was tested from the repository; Cloudflare HTML rewriting and injected scripts can change application behavior or violate the site's CSP.

The repository cannot verify account ownership, DNS propagation, or Cloudflare dashboard settings. A local test or successful workflow is not proof that the public custom domain is live.

Page Shield and script-monitor CSP reports may send report-only requests to `csp-reporting.cloudflare.com`. The per-page production test records requests to non-allowed origins, so these reports may make it fail. Do not allowlist the reporting host to hide that result.

The site may use version-pinned, SRI-protected cdnjs scripts/styles when necessary. Other third-party resource origins are prohibited; see [external resources](external-resources.md).
