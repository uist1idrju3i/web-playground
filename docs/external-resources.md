# External Resources

## Origin policy

Prioritize security and stability first, then runtime performance. The site is static and has no build step. JavaScript and CSS must come from this origin or from `https://cdnjs.cloudflare.com`; do not add other third-party origins.

Pin every cdnjs URL to an exact library version. Obtain the SRI value from the cdnjs API and include `integrity="sha384-..."` or `integrity="sha512-..."` together with `crossorigin="anonymous"` on each external `<script>` or stylesheet `<link>`. The CSP allows cdnjs for scripts and styles, while fonts and connections remain same-origin only. `require-sri-for` is omitted because it is not enforced by supported browsers.

Prefer classic scripts with SRI. Do not import ES modules from cdnjs unless an import map provides an integrity value for every cdnjs module URL. The external-resource checker runs as part of `npm run lint`.

The style policy also includes a SHA-256 source for the exact `body {}` stylesheet that Playwright's WebKit screenshotter injects while synchronizing screenshots. WebKit reported a CSP violation once per screenshot without this fixed hash; page-load checks were clean. This does not enable arbitrary inline styles or use `'unsafe-inline'`.

## Fonts

Do not use Cloudflare Fonts or Google Fonts. Cloudflare Fonts injects an inline `<style>` block, which would require weakening `style-src` with `'unsafe-inline'`, and can fall back to `fonts.gstatic.com`. Google Fonts adds a third-party font origin and another runtime dependency.

If custom fonts become necessary, self-host carefully reviewed OFL-licensed WOFF2 subsets under `public_html/library/fonts/`. Keep the font files and their license text in the repository, retain the full SIL Open Font License text required by the font, and define subsets with explicit `unicode-range` descriptors. Use `font-display: swap` so text remains visible while fonts load. For example:

```css
@font-face {
  font-family: 'Example Sans';
  src: url('/library/fonts/example-sans-latin.woff2') format('woff2');
  font-style: normal;
  font-weight: 400;
  font-display: swap;
  unicode-range: U+0000-00FF;
}
```

No font files are currently included; the site uses Japanese-capable system font stacks.
