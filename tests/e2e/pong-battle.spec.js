import { expect, test } from '@playwright/test';

// Boot → hero → pickers/editor → deploy → countdown → playing phase, HUD,
// renderer marker, enemy source view. Real match outcomes are covered by
// unit tests (sim + headless real-Ruby matches); e2e stays under 30 s.

test('pong-battle boots, deploys a sample brain and plays', async ({ page }, testInfo) => {
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto('/pong-battle/?debug=1');
  await page.waitForLoadState('networkidle', { timeout: 8000 }).catch(() => {});

  // Requirements container exists (dedicated div per requirements.js).
  await expect(page.locator('#requirements')).toBeAttached();

  await page.locator('#hero-cta').click();
  await expect(page.locator('#hero')).toBeHidden();

  // VM boot can take a few seconds: wait for phase to leave boot.
  await page.waitForFunction(() => ['ready', 'unsupported'].includes(document.body.dataset.phase), {
    timeout: 25000,
  });
  testInfo.skip(
    (await page.locator('body').getAttribute('data-phase')) !== 'ready',
    'required capabilities unavailable in this browser',
  );

  // Pickers populated; enemy list has three levels with lock states.
  await expect(page.locator('#sample-list .pick')).toHaveCount(5);
  await expect(page.locator('#enemy-list .pick')).toHaveCount(3);

  // Editor holds the loaded sample; enemy source is readable.
  await expect(page.locator('#enemy-code')).toContainText('brain');

  // Deploy: countdown -> playing.
  await page.locator('#deploy').click();
  await page.waitForFunction(() => document.body.dataset.phase === 'playing', { timeout: 15000 });

  // Renderer picked a backend and the canvas painted non-blank pixels.
  const renderer = await page.locator('#court').getAttribute('data-renderer');
  expect(['webgpu', 'webgl2']).toContain(renderer);
  await page.waitForTimeout(700);
  const painted = await page.evaluate(() => {
    const c = document.getElementById('court');
    const g = c.getContext('webgl2');
    if (!g) return true; // webgpu path: frame loop running is enough here
    const px = new Uint8Array(4 * c.width);
    g.readPixels(0, (c.height / 2) | 0, c.width, 1, g.RGBA, g.UNSIGNED_BYTE, px);
    let lit = 0;
    for (let i = 0; i < px.length; i += 4) if (px[i] + px[i + 1] + px[i + 2] > 40) lit++;
    return lit > 3;
  });
  expect(painted).toBe(true);

  // HUD shows score + stamina meters.
  await expect(page.locator('#score-l')).toHaveText(/^[0-9]+$/);
  await expect(page.locator('#stam-l')).toBeAttached();

  // Regression: the phase overlay must stay hidden during play — before the
  // [hidden] display guard, the last-written title ('GO!') stayed on screen.
  await expect(page.locator('#phase-overlay')).toBeHidden();

  // Force match 1 to end: the overlay + rematch button must appear.
  await page.evaluate(() => {
    const g = globalThis.__pong.game;
    g.score.left = 2;
    g.ball.x = 120; // past the right goal — next tick scores for the player
  });
  await page.waitForFunction(() => document.body.dataset.phase === 'match-over', {
    timeout: 8000,
  });
  await expect(page.locator('#phase-overlay')).toBeVisible();
  await expect(page.locator('#rematch')).toBeVisible();

  // Match 2 via rematch: the enemy brain must actually move — before the
  // Runner wrapper, @ivars leaked across deploys and the paddle parked.
  await page.locator('#rematch').click();
  await page.waitForFunction(() => document.body.dataset.phase === 'playing', {
    timeout: 15000,
  });
  await expect(page.locator('#phase-overlay')).toBeHidden();
  const enemyY = () => page.evaluate(() => globalThis.__pong.game.paddles.right.y);
  const y0 = await enemyY();
  let moved = false;
  for (let i = 0; i < 12 && !moved; i++) {
    await page.waitForTimeout(500);
    moved = Math.abs((await enemyY()) - y0) > 1;
  }
  expect(moved).toBe(true);

  expect(pageErrors).toEqual([]);
});

test('pong-battle works on iPhone portrait and landscape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/pong-battle/');
  await expect(page.locator('#hero-cta')).toBeVisible();
  await page.locator('#hero-cta').click();
  await expect(page.locator('#court')).toBeVisible();
  await expect(page.locator('#deploy')).toBeVisible();

  await page.setViewportSize({ width: 844, height: 390 });
  await expect(page.locator('#court')).toBeVisible();
  await expect(page.locator('#deploy')).toBeVisible();
});
