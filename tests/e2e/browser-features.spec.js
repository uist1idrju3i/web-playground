import { expect, test } from '@playwright/test';

test('the portal links to Browser Features', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'See what your browser can do.' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Browser Features/ })).toHaveAttribute(
    'href',
    '/browser-features/',
  );
});

test('Browser Features loads without console errors', async ({ page }) => {
  const errors = [];
  await page.addInitScript(() => {
    window.__securityPolicyViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      window.__securityPolicyViolations.push({
        directive: event.violatedDirective,
        blockedURI: event.blockedURI,
        sourceFile: event.sourceFile,
        line: event.lineNumber,
      });
    });
  });
  page.on('console', (message) => {
    const messageText = message.text();
    if (
      message.type() === 'error' ||
      /content security policy|refused to apply|style-src/i.test(messageText)
    ) {
      errors.push(messageText);
    }
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/browser-features/');
  await expect(page.getByRole('heading', { name: 'Highlight capabilities' })).toBeVisible();
  await expect(page.locator('[data-capability-id="web-crypto"]')).toBeVisible();
  await expect(page.locator('body')).toHaveAttribute('data-app-ready', 'true');
  const violations = await page.evaluate(() => window.__securityPolicyViolations);
  expect({ errors, violations }).toEqual({ errors: [], violations: [] });
});

test('Permissions Policy features are disclosed as wrapped chips', async ({ page }) => {
  await page.goto('/browser-features/');
  await expect(page.locator('body')).toHaveAttribute('data-app-ready', 'true');
  const disclosure = page.locator('.permissions-policy-details');
  const summary = await disclosure.locator('summary').textContent();
  const count = Number(summary?.match(/^\d+/)?.[0] ?? 0);
  expect(summary).toMatch(/allowed features|No feature list exposed/);
  await disclosure.locator('summary').click();
  await expect(disclosure).toHaveAttribute('open', '');
  const chips = disclosure.locator('.permissions-policy-features li');
  await expect(chips).toHaveCount(count);
  if (count) {
    await expect(page.locator('.permissions-policy-item')).toHaveClass(/is-expanded/);
    const widths = await page.evaluate(() => ({
      card: document.querySelector('.permissions-policy-item').getBoundingClientRect().width,
      grid: document.querySelector('#environment-grid').getBoundingClientRect().width,
      list: getComputedStyle(document.querySelector('.permissions-policy-features')).flexWrap,
    }));
    expect(Math.abs(widths.card - widths.grid)).toBeLessThan(1);
    expect(widths.list).toBe('wrap');
  }
});

test('WebRTC details list each audio and video codec mimeType once', async ({ page }) => {
  await page.goto('/browser-features/');
  await expect(page.locator('body')).toHaveAttribute('data-app-ready', 'true');
  const detail = await page
    .locator('[data-capability-id="webrtc"] .capability-copy p')
    .textContent();
  for (const kind of ['audio', 'video']) {
    const match = detail?.match(new RegExp(`${kind} codecs: ([^;]+)`));
    if (!match) continue;
    const codecs = match[1].split(', ');
    expect(new Set(codecs).size).toBe(codecs.length);
  }
});

test('the app fits a mobile-width viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/browser-features/');
  await expect(page.getByRole('heading', { name: 'Browser Features' })).toBeVisible();
  const dimensions = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport);
});

test('Baseline-widely features do not produce false unsupported results', async ({
  page,
  browserName,
}) => {
  await page.goto('/browser-features/');
  await expect(page.locator('body')).toHaveAttribute('data-app-ready', 'true');
  const results = await page.evaluate(async () => {
    const data = await fetch('/library/data/web-features.json').then((response) => response.json());
    const { probeFeature } = await import('/library/js/feature-probe.js');
    const counts = { supported: 0, partial: 0, unsupported: 0, untestable: 0 };
    const widelyUnsupported = [];
    for (const feature of data.features) {
      const status = probeFeature(feature).status;
      const category = status.startsWith('partial(') ? 'partial' : status;
      counts[category] += 1;
      if (feature.baseline.status === 'widely' && status === 'unsupported') {
        widelyUnsupported.push(feature.id);
      }
    }
    return { counts, widelyUnsupported };
  });

  const unsupportedAllowlist = new Map([
    // This bundled WebKit build omits the credential-management interfaces.
    [
      'credential-management',
      'The bundled WebKit runtime does not expose Credential or CredentialsContainer.',
    ],
    // The desktop WebKit test context cannot exercise device sensor interfaces.
    [
      'device-orientation-events',
      'This desktop WebKit context exposes no device-motion or device-orientation interfaces.',
    ],
    // The bundled WebKit media stack omits Encrypted Media Extensions.
    [
      'encrypted-media-extensions',
      'The bundled WebKit media stack exposes no MediaKeys or MediaKeySystemAccess interfaces.',
    ],
    // Its HTMLElement implementation does not reflect enterkeyhint in this build.
    [
      'enterkeyhint',
      'HTMLElement.prototype in the bundled WebKit runtime lacks the enterKeyHint reflection.',
    ],
    // forced-color-adjust is not implemented by this WebKit build.
    [
      'forced-colors',
      'The bundled WebKit runtime does not recognize the forced-color-adjust CSS property.',
    ],
    // This bundled WebKit build omits MediaRecorder and BlobEvent.
    [
      'mediastream-recording',
      'The bundled WebKit runtime exposes neither MediaRecorder nor BlobEvent.',
    ],
    // The bundled WebKit build does not expose Origin Private File System handles.
    [
      'origin-private-file-system',
      'The bundled WebKit runtime does not expose the OPFS FileSystemHandle interfaces.',
    ],
    // This WebKit build does not expose the StorageManager interface.
    [
      'storage-manager',
      'The bundled WebKit runtime exposes neither Navigator.storage nor StorageManager.',
    ],
  ]);
  expect(
    results.widelyUnsupported.filter((id) => !unsupportedAllowlist.has(id)),
    `${browserName} Baseline-widely unsupported features: ${results.widelyUnsupported.join(', ')}`,
  ).toEqual([]);
  expect([...unsupportedAllowlist.values()].every(Boolean)).toBe(true);
});

test('the ten requested highlight capabilities remain in order', async ({ page }) => {
  await page.goto('/browser-features/');
  await expect(page.locator('[data-capability-id="web-crypto"]')).toBeVisible();
  const ids = await page
    .locator('[data-capability-id]')
    .evaluateAll((items) => items.slice(0, 10).map((item) => item.dataset.capabilityId));
  expect(ids).toEqual([
    'webmcp',
    'web-bluetooth',
    'web-serial',
    'webusb',
    'websocket',
    'webtransport',
    'webgl',
    'webrtc',
    'web-audio',
    'web-crypto',
  ]);
});

test('search and group filters narrow the feature results', async ({ page }) => {
  await page.goto('/browser-features/');
  await expect(page.locator('[data-capability-id="web-crypto"]')).toBeVisible();
  const initial = await page.locator('#filter-summary').textContent();
  await page.locator('#feature-search').fill('Web Bluetooth');
  await expect(page.locator('#filter-summary')).toContainText('1 matching feature');
  await page.locator('#feature-search').fill('');
  const group = await page.locator('#group-filter option').nth(1).getAttribute('value');
  await page.locator('#group-filter').selectOption(group);
  const filtered = await page.locator('#filter-summary').textContent();
  expect(filtered).not.toEqual(initial);
});

test('the JSON export is valid and reports cross-origin isolation', async ({
  page,
  browserName,
}) => {
  await page.goto('/browser-features/');
  await expect(page.locator('[data-capability-id="web-crypto"]')).toBeVisible();
  await page.locator('#copy-json').click();
  await expect(page.locator('#export-output')).not.toBeEmpty();
  const result = await page
    .locator('#export-output')
    .evaluate((element) => JSON.parse(element.value));
  expect(result.features.length).toBeGreaterThan(1000);
  const isolated = await page.evaluate(() => crossOriginIsolated);
  if (browserName === 'chromium') expect(isolated).toBe(true);
  expect(result.environment.crossOriginIsolated).toBe(isolated);
});

test('local and session storage complete write/read/remove round-trips', async ({ page }) => {
  await page.goto('/browser-features/');
  const storageIds = [
    'local-storage',
    'session-storage',
    'indexeddb',
    'cookies',
    'cache-storage',
    'opfs',
    'storage-estimate',
    'storage-persisted',
  ];
  for (const id of storageIds) {
    await expect(page.locator(`[data-capability-id="${id}"] .capability-category`)).toHaveText(
      'Storage',
    );
  }
  for (const id of ['local-storage', 'session-storage']) {
    const capability = page.locator(`[data-capability-id="${id}"]`);
    await expect(capability.locator('.status-chip')).toHaveText('Supported');
    await expect(capability.locator('.capability-copy p')).toContainText(
      'set/get/remove round-trip',
    );
  }
});

test('WebAssembly compiles and instantiates under the served CSP', async ({ page }) => {
  const response = await page.goto('/browser-features/');
  expect(response?.headers()['content-security-policy']).toContain(
    "script-src 'self' 'wasm-unsafe-eval'",
  );
  const result = await page.evaluate(async () => {
    const bytes = new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0]);
    const { module, instance } = await WebAssembly.instantiate(bytes);
    const { capabilities, detectCapability } = await import('/library/js/capabilities.js');
    const capability = capabilities.find((item) => item.id === 'webassembly');
    return {
      compiled: module instanceof WebAssembly.Module,
      instantiated: instance instanceof WebAssembly.Instance,
      capability: await detectCapability(capability),
    };
  });
  expect(result.compiled).toBe(true);
  expect(result.instantiated).toBe(true);
  expect(result.capability.status).toBe('supported');
});

test('the requirements helper announces missing required features', async ({ page }) => {
  await page.goto('/__tests__/requirements.html');
  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Required browser features are missing');
  await expect(alert.getByRole('link', { name: 'missing-required' })).toHaveAttribute(
    'href',
    '/browser-features/#missing-required',
  );
});
