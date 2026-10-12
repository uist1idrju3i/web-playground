---
name: browser-app-saves
description: How to persist app state safely in this repository - the shared HMAC-SHA-256 signed store (public_html/library/js/signed-storage.js) with a non-extractable Web Crypto key in IndexedDB, load-status handling, schema versions, save timing, multi-tab and iPhone storage caveats, the honest threat model, and tamper/rollback tests. Use when an app saves progress, settings, scores, collections, or any data across sessions.
---

# Browser app saves

Every app that persists state signs it with Web Crypto HMAC. Use the shared store; do not write
a new signing scheme (`public_html/tsumiki/js/save.js` predates the shared module).

## API

```js
import { createSignedStore } from '/library/js/signed-storage.js';

const store = await createSignedStore({ name: '<app>', version: SAVE_VERSION });
const result = await store.load(); // { status, data, detail }
await store.save(data); // canonical JSON, signed, monotonic counter
await store.clear();
```

- Storage: the signed envelope in `localStorage` under `wp-signed:<name>`; the HMAC-SHA-256 key
  is generated as a non-extractable `CryptoKey` and kept in IndexedDB with a counter.
- `load()` statuses: `ok`, `empty`, `corrupt`, `tampered`, `rollback`, `key-missing`,
  `version-mismatch`, `unavailable`. Only `ok` returns data.
- Data must be JSON-serializable plain data (canonical JSON is signed); keep it small.

## Rules

- Declare `web-crypto` and `indexeddb` (plus `local-storage`) in `checkRequirements` as
  required if the app cannot run without saves, otherwise optional with a "progress is not
  saved" notice.
- Handle every status in the UI: `empty` starts fresh; `tampered`, `rollback`, `corrupt`, and
  `key-missing` show a calm, translated message, offer a fresh start, and never crash or
  silently load the data. `version-mismatch` runs an explicit migration from known older
  versions or resets with a message.
- Bump `SAVE_VERSION` when the data shape changes and add the migration with a unit test.
- Save on meaningful events (end of round, purchase, settings change), debounced, and on
  `visibilitychange` hidden / `pagehide`. Never save every frame.
- Keep settings (sound toggles, language, reduced effects) in the same signed object so they
  survive reloads.
- Multiple tabs: the counter makes a stale tab's write look like a rollback to the newer tab.
  Coordinate with `BroadcastChannel` or `navigator.locks` when an app is likely to be open
  twice.
- Never store secrets or personal data. Never send saves anywhere (`connect-src 'self'`).

## Threat model (state it in `docs/<app>.md`)

- HMAC gives tamper evidence against editing `localStorage` by hand or replaying an older
  envelope; it is not encryption and not anti-cheat against someone running code in DevTools.
- The key never leaves the browser, so a save cannot be verified on another device or after
  site data is cleared; an export/import feature must re-sign on import and say so.
- Safari can evict script-writable storage for sites the user has not interacted with for a
  while (Intelligent Tracking Prevention); home-screen web apps are treated differently.
  `navigator.storage.persist()` may help but some browsers prompt, so only call it from a user
  action.

## Tests

- Unit tests inject `storage`, `keyStore`, and `subtle` (`node:crypto` `webcrypto.subtle`);
  see `tests/unit/signed-storage.test.js` for the in-memory key store.
- Cover round-trip, every failure status, migration, and settings persistence.
- Tamper deterministically: flip a character to a different value
  (`` `${mac[0] === '0' ? '1' : '0'}${mac.slice(1)}` ``). Replacing it with a constant is a
  no-op one time in sixteen and makes the test flaky.
- E2E: reload keeps progress; editing the stored envelope shows the tamper message.
