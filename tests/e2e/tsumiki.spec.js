import { expect, test } from '@playwright/test';

// The resource-policy spec already asserts a clean load for every page; these
// specs cover the game flow itself: gate -> title -> OOBE -> drop -> save.

test('tsumiki boots to the title screen and starts a run', async ({ page }, testInfo) => {
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto('/tsumiki/');
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

  // If the environment lacks a required capability the gate hides the app —
  // report and skip rather than fail on engine limitations.
  const appHidden = await page.locator('#app').evaluate((el) => el.hidden);
  testInfo.skip(appHidden, 'required capabilities unavailable in this browser');
  await expect(page.locator('#boot-error')).toBeHidden();
  await expect(page.locator('#screen-title')).toBeVisible();

  await page.locator('#btn-start').click();
  // First run shows the onboarding cards.
  if (await page.locator('#screen-oobe.visible').count()) {
    for (let i = 0; i < 3; i++) await page.locator('#oobe-next').click();
  }
  await expect(page.locator('#hud')).toHaveClass(/visible/);
  await expect(page.locator('#screen-title')).not.toBeVisible();

  // Drag on the canvas and release to drop a piece.
  const canvas = page.locator('#game-canvas');
  const box = await canvas.boundingBox();
  await page.mouse.move(box.x + box.width / 2, box.y + box.height * 0.6);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + 30, box.y + box.height * 0.6, { steps: 5 });
  await page.mouse.up();
  await page.waitForTimeout(2600);
  expect(pageErrors).toEqual([]);
});

test('tsumiki save is HMAC-signed and tamper-evident', async ({ page }, testInfo) => {
  await page.goto('/tsumiki/');
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  const appHidden = await page.locator('#app').evaluate((el) => el.hidden);
  testInfo.skip(appHidden, 'required capabilities unavailable in this browser');
  const canSave = await page.evaluate(() => !!globalThis.indexedDB && !!crypto?.subtle);
  testInfo.skip(!canSave, 'WebCrypto/IndexedDB unavailable');

  // Start a run so the HUD (which hosts the mute button) is reachable —
  // the title screen overlay intercepts pointer events while visible.
  await page.locator('#btn-start').click();
  if (await page.locator('#screen-oobe.visible').count()) {
    for (let i = 0; i < 3; i++) await page.locator('#oobe-next').click();
  }
  await expect(page.locator('#hud')).toHaveClass(/visible/);

  // Toggling mute persists the save.
  await page.locator('#mute-btn').click();
  await page.waitForTimeout(400);
  const envelope = await page.evaluate(() =>
    JSON.parse(globalThis.localStorage.getItem('wp-tsumiki-save-v1') ?? 'null'),
  );
  expect(envelope).not.toBeNull();
  expect(envelope.v).toBe(1);
  expect(envelope.hmac).toMatch(/^[0-9a-f]{64}$/);
  expect(envelope.data.settings.muted).toBe(true);

  // Tamper with the payload: the next load must quarantine it and warn.
  await page.evaluate(() => {
    const env = JSON.parse(globalThis.localStorage.getItem('wp-tsumiki-save-v1'));
    env.data.bestScore = 424242;
    globalThis.localStorage.setItem('wp-tsumiki-save-v1', JSON.stringify(env));
  });
  await page.reload();
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await expect(page.locator('#save-warning')).toBeVisible();
  const corrupt = await page.evaluate(() =>
    globalThis.localStorage.getItem('wp-tsumiki-save-v1.corrupt'),
  );
  expect(corrupt).not.toBeNull();
});
