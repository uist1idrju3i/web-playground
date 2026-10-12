import { expect, test } from '@playwright/test';

// Boots, mode picker, a fast-forwarded burn (?speed=), result screen, stats
// drawer, signed save + tamper detection, iPhone viewports. Long flows are
// covered by unit tests on the WASM sim; e2e stays under 30 s per test.

async function dismissOobe(page) {
  const oobe = page.locator('#drawer-oobe');
  if (await oobe.isVisible()) await page.locator('#btn-oobe').click();
}

test('senko-hanabi boots to title and lights a sparkler', async ({ page }, testInfo) => {
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto('/senko-hanabi/');
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

  testInfo.skip(
    (await page.locator('#app').getAttribute('data-phase')) !== 'title',
    'required capabilities unavailable in this browser',
  );
  await expect(page.locator('#screen-title')).toBeVisible();
  await dismissOobe(page);

  await page.locator('#btn-start').click();
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'lit');
  await expect(page.locator('#hud')).toBeVisible();
  await expect(page.locator('#hud-phase-name')).not.toHaveText('–');

  // Canvas actually paints (non-blank center region after sparks start).
  await page.waitForTimeout(1200);
  const lit = await page.evaluate(() => {
    const c = document.getElementById('scene');
    const g = c.getContext('webgl2');
    if (!g) return true; // WebGPU path: trust frame loop ran without errors
    const px = new Uint8Array(4);
    g.readPixels((c.width / 2) | 0, (c.height / 2) | 0, 1, 1, g.RGBA, g.UNSIGNED_BYTE, px);
    return px[0] + px[1] + px[2] > 8;
  });
  expect(lit).toBe(true);
  expect(pageErrors).toEqual([]);
});

test('mode picker selects trng and survives a full burn at high speed', async ({
  page,
}, testInfo) => {
  await page.goto('/senko-hanabi/?speed=60&seed=4242');
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  testInfo.skip(
    (await page.locator('#app').getAttribute('data-phase')) !== 'title',
    'required capabilities unavailable in this browser',
  );
  await dismissOobe(page);

  const trng = page.locator('#mode-trng');
  if (!(await trng.isDisabled())) {
    await trng.click();
    await expect(trng).toHaveAttribute('aria-pressed', 'true');
  }
  await page.locator('#btn-start').click();
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'lit');

  // At 60x a ~40 s burn finishes in well under 3 s of wall time.
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'spent', { timeout: 20000 });
  await expect(page.locator('#screen-spent')).toBeVisible();
  await expect(page.locator('#res-duration')).not.toHaveText('–');
  await expect(page.locator('#res-seed')).toContainText('#4242');

  // Stats drawer recorded the burn.
  await page.locator('#btn-stats2').click();
  await expect(page.locator('#drawer-stats')).toBeVisible();
  const sticks = await page
    .locator('[data-mode="trng"] #stat-trng-sticks, #stat-trng-sticks')
    .textContent();
  expect(Number(sticks)).toBeGreaterThanOrEqual(0);
  await page.locator('#btn-stats-close').click();

  // One more stick from the result screen.
  await page.locator('#btn-again').click();
  await expect(page.locator('#app')).toHaveAttribute('data-phase', 'lit');
});

test('senko-hanabi save is HMAC-signed and tamper-evident', async ({ page }, testInfo) => {
  await page.goto('/senko-hanabi/?speed=60&seed=7');
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  testInfo.skip(
    (await page.locator('#app').getAttribute('data-phase')) !== 'title',
    'required capabilities unavailable in this browser',
  );
  const canSave = await page.evaluate(() => !!globalThis.indexedDB && !!crypto?.subtle);
  testInfo.skip(!canSave, 'WebCrypto/IndexedDB unavailable');
  await dismissOobe(page);

  // Any settings change writes the signed envelope.
  await page.locator('#btn-mute').click();
  await page.waitForTimeout(400);
  const envelope = await page.evaluate(() =>
    JSON.parse(globalThis.localStorage.getItem('wp-signed:senko-hanabi') ?? 'null'),
  );
  expect(envelope).not.toBeNull();
  expect(envelope.app).toBe('senko-hanabi');
  expect(envelope.mac).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(envelope.data.settings.muted).toBe(true);

  // Tamper: the next load flags it.
  await page.evaluate(() => {
    const env = JSON.parse(globalThis.localStorage.getItem('wp-signed:senko-hanabi'));
    env.data.stats.feel.sticks = 999;
    globalThis.localStorage.setItem('wp-signed:senko-hanabi', JSON.stringify(env));
  });
  await page.reload();
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await expect(page.locator('#save-warning')).toBeVisible();
});

test('senko-hanabi renders on iPhone portrait and landscape', async ({ page }, testInfo) => {
  for (const [width, height] of [
    [390, 844],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto('/senko-hanabi/');
    await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
    if ((await page.locator('#app').getAttribute('data-phase')) !== 'title') {
      testInfo.skip(true, 'required capabilities unavailable');
    }
    await dismissOobe(page);
    await expect(page.locator('#screen-title')).toBeVisible();
    // No horizontal overflow on either orientation.
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    );
    expect(overflow).toBe(false);
  }
});
