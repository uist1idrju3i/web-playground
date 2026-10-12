# Adding an App

1. Create `public_html/<app-name>/index.html` and keep app-only code, styles, and assets in that directory.
2. Import shared code only from `/library/`; shared runtime modules belong in `public_html/library/`.
3. Before accessing APIs, call `checkRequirements` from `/library/js/requirements.js`. State required capabilities separately from optional enhancements, and show the returned missing-feature banner. The app decides whether to stop when `ok` is false.
4. Add the app to the application list in `/index.html`.
5. Avoid permission prompts on page load. Explain any user-initiated permission flow in the app itself.
6. Keep content in English, use semantic accessible markup, and add focused tests.

```js
import { checkRequirements } from '/library/js/requirements.js';

const { ok } = await checkRequirements({
  required: ['fetch'],
  optional: ['webmcp'],
  container: document.querySelector('#requirements'),
});
if (!ok) {
  // Do not start code that depends on missing required capabilities.
}
```
