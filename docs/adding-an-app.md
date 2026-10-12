# Add an app

Each app is a static directory under `public_html/`. The resource-policy E2E discovers every `.html` file automatically; still add the app's index link to the root portal so visitors can find it.

## Minimal template

`public_html/example/index.html`:

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Example · Web Playground</title>
    <link rel="stylesheet" href="/library/css/base.css" />
    <script type="module" src="/example/app.js"></script>
  </head>
  <body>
    <header><a href="/">Web Playground</a></header>
    <main>
      <h1>Example</h1>
      <div id="requirements" aria-live="polite"></div>
      <p id="result"></p>
    </main>
  </body>
</html>
```

`public_html/example/app.js`:

```js
import { checkRequirements } from '../library/js/requirements.js';

const results = await checkRequirements({
  required: ['fetch'],
  optional: ['webmcp'],
  container: document.querySelector('#requirements'),
});
if (results.some((result) => result.required && result.status !== 'supported')) return;
document.querySelector('#result').textContent = 'The required browser features are available.';
```

Use the required list only for features without which the app cannot work; put progressive enhancements in `optional`. Do not request permission during page load.

## Checklist

- Use shared code from `public_html/library/`; keep the app independent and static.
- Call `checkRequirements` before using required browser APIs.
- Keep JavaScript/CSS on the same origin or use a pinned, SRI-protected cdnjs resource.
- Add a portal entry in `public_html/index.html`, then update relevant docs and generated references.
- Run `npm run generate` and `npm test`. Inspect a desktop and mobile rendering.
