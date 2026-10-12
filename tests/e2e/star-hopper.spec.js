import { expect, test } from '@playwright/test';

// The resource-policy spec already asserts a clean load for every page; these
// specs cover the game flow: gate -> title -> OOBE -> countdown -> play -> save.

async function startRun(page) {
  await page.locator('#btn-start').click();
  // First run shows the onboarding cards; the close button dismisses them.
  if (await page.locator('#screen-oobe.visible').count()) {
    await page.locator('#oobe-close').click();
  }
  // Countdown takes ~2.8s before the HUD counts as playing; wait for the
  // timer to tick rather than sleeping a fixed real-time duration.
  await expect(page.locator('#hud')).toHaveClass(/visible/);
  await expect
    .poll(() => page.locator('#hud-time').textContent(), { timeout: 8000 })
    .not.toBe('240');
}

test('star-hopper boots to the title screen and starts a run', async ({ page }, testInfo) => {
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto('/star-hopper/');
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

  const appHidden = await page.locator('#app').evaluate((el) => el.hidden);
  testInfo.skip(appHidden, 'required capabilities unavailable in this browser');
  await expect(page.locator('#boot-error')).toBeHidden();
  await expect(page.locator('#screen-title')).toBeVisible();

  await startRun(page);
  await expect(page.locator('#screen-title')).not.toBeVisible();

  // Move forward and jump: the player should stay on the wide start island.
  await page.keyboard.down('KeyW');
  await page.keyboard.press('Space');
  await page.waitForTimeout(600);
  await page.keyboard.up('KeyW');
  await page.waitForTimeout(600);
  expect(pageErrors).toEqual([]);

  // HUD keeps tracking the run.
  await expect(page.locator('#hud-time')).toContainText(/^(23\d|240)$/);

  // Pause and resume through the pause screen.
  await page.locator('#btn-pause').click();
  await expect(page.locator('#screen-pause')).toBeVisible();
  await page.locator('#btn-resume').click();
  await expect(page.locator('#screen-pause')).not.toBeVisible();
  await expect(page.locator('#hud')).toHaveClass(/visible/);
});

test('star-hopper save is HMAC-signed and tamper-evident', async ({ page }, testInfo) => {
  await page.goto('/star-hopper/');
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  const appHidden = await page.locator('#app').evaluate((el) => el.hidden);
  testInfo.skip(appHidden, 'required capabilities unavailable in this browser');
  const canSave = await page.evaluate(() => !!globalThis.indexedDB && !!crypto?.subtle);
  testInfo.skip(!canSave, 'WebCrypto/IndexedDB unavailable');

  await startRun(page);

  // Toggling mute persists the signed save.
  await page.locator('#mute-btn').click();
  await page.waitForTimeout(500);
  const envelope = await page.evaluate(() =>
    JSON.parse(globalThis.localStorage.getItem('wp-signed:star-hopper') ?? 'null'),
  );
  expect(envelope).not.toBeNull();
  expect(envelope.app).toBe('star-hopper');
  expect(envelope.v).toBe(1);
  expect(envelope.n).toBeGreaterThanOrEqual(1);
  expect(envelope.mac).toMatch(/^[A-Za-z0-9_-]{43}$/);
  expect(envelope.data.muted).toBe(true);

  // Tamper with the payload: the next load must flag it.
  await page.evaluate(() => {
    const env = JSON.parse(globalThis.localStorage.getItem('wp-signed:star-hopper'));
    env.data.bestScore = 424242;
    globalThis.localStorage.setItem('wp-signed:star-hopper', JSON.stringify(env));
  });
  await page.reload();
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});
  await expect(page.locator('#save-warning')).toBeVisible();
});
