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
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/browser-features/');
  await expect(page.getByRole('heading', { name: 'Highlight capabilities' })).toBeVisible();
  await expect(page.locator('[data-capability-id="web-crypto"]')).toBeVisible();
  expect(errors).toEqual([]);
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
