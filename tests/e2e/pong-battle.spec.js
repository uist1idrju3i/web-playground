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

  // Pickers populated; enemy list has four levels with lock states.
  await expect(page.locator('#sample-list .pick')).toHaveCount(5);
  await expect(page.locator('#enemy-list .pick')).toHaveCount(4);
  // NOVA is the locked boss card.
  await expect(page.locator('#enemy-list .pick.boss')).toHaveClass(/locked/);

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

  // Pickers lock while a match is live (deploy-time only inputs).
  await expect(page.locator('#sample-list .pick').first()).toBeDisabled();
  await expect(page.locator('#enemy-list .pick').first()).toBeDisabled();

  // Execution-line trace is on by default: brain ticks report the brain.rb
  // lines they ran. Assert on the debug hook — CodeMirror virtualizes rows,
  // so executed lines below the viewport may have no DOM to highlight.
  await page.waitForFunction(() => globalThis.__pong.execLines.length > 0, { timeout: 5000 });

  expect(pageErrors).toEqual([]);
});

// Match-2 regression: force match 1 to end, rematch, and verify the enemy
// paddle still moves — before the Runner wrapper, brain @ivars leaked across
// deploys and parked the paddle for a whole second match. Separate test so
// both stay under 30 s on WebKit.
test('pong-battle rematch: overlay hides and the enemy still moves', async ({ page }) => {
  await page.goto('/pong-battle/?debug=1');
  await page.locator('#hero-cta').click();
  // Same escape hatch as the boot test: if the VM cannot reach 'ready'
  // inside the budget on a slow engine, skip rather than flake — the
  // primary regression coverage is the real-Ruby unit test.
  await page.waitForFunction(() => ['ready', 'unsupported'].includes(document.body.dataset.phase), {
    timeout: 20000,
  });
  test.skip(
    (await page.locator('body').getAttribute('data-phase')) !== 'ready',
    'VM boot exceeded the test budget on this engine',
  );

  await page.locator('#deploy').click();
  await page.waitForFunction(() => document.body.dataset.phase === 'playing', {
    timeout: 15000,
  });

  // Force match 1 to end: the overlay + rematch button must appear. Set
  // status='rally' explicitly — during 'serving' the ball position is ignored
  // and launchServe re-centers it, which made this a race on slower engines.
  await page.evaluate(() => {
    const g = globalThis.__pong.game;
    g.score.left = 2;
    g.status = 'rally';
    g.ball.x = 120; // past the right goal — next tick scores for the player
  });
  await page.waitForFunction(() => document.body.dataset.phase === 'match-over', {
    timeout: 8000,
  });
  await expect(page.locator('#phase-overlay')).toBeVisible();
  await expect(page.locator('#rematch')).toBeVisible();

  await page.locator('#rematch').click();
  await page.waitForFunction(() => document.body.dataset.phase === 'playing', {
    timeout: 15000,
  });
  await expect(page.locator('#phase-overlay')).toBeHidden();

  // The first serve direction and arrival height are random by design —
  // the enemy brain would legitimately stay in its deadband when the ball
  // opens toward the player or near center. Send the ball at the enemy's
  // far corner instead, so a live brain is guaranteed to chase it.
  await page.waitForFunction(() => globalThis.__pong.game.status === 'rally', { timeout: 10000 });
  await page.evaluate(() => {
    const g = globalThis.__pong.game;
    g.ball.x = 40;
    g.ball.y = 8;
    g.ball.vx = Math.abs(g.ball.vx || 40);
    g.ball.vy = 4;
  });

  const enemyY = () => page.evaluate(() => globalThis.__pong.game.paddles.right.y);
  const y0 = await enemyY();
  let moved = false;
  for (let i = 0; i < 10 && !moved; i++) {
    await page.waitForTimeout(300);
    moved = Math.abs((await enemyY()) - y0) > 1;
  }
  expect(moved).toBe(true);
});

test('pong-battle debug tools: slow motion chips and variable watch', async ({ page }) => {
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  await page.goto('/pong-battle/?debug=1');
  await page.locator('#hero-cta').click();
  await page.waitForFunction(() => document.body.dataset.phase === 'ready', { timeout: 25000 });

  // Speed control: four chips, 1x active by default, selection persists.
  await expect(page.locator('.seg-btn')).toHaveCount(4);
  await expect(page.locator('.seg-btn[data-speed="1"]')).toHaveClass(/on/);
  await page.locator('.seg-btn[data-speed="0.25"]').click();
  expect(await page.evaluate(() => globalThis.__pong.save.data.speed)).toBe(0.25);
  await page.locator('.seg-btn[data-speed="1"]').click();

  // Variable watch: deploy a brain with @ivars and the panel lists them.
  await page.evaluate(() => {
    globalThis.__pong.editor.setValue(
      'brain "W" do |g|\n  @shots = (@shots || 0) + 1\n  @target = g.ball.y\n  g.seek(@target)\nend',
    );
  });
  await page.locator('#deploy').click();
  await page.waitForFunction(() => document.body.dataset.phase === 'playing', { timeout: 15000 });
  await page.waitForFunction(() => (globalThis.__pong.watchVars?.shots ?? 0) > 2, {
    timeout: 8000,
  });
  await expect(page.locator('#watch-panel .wv').first()).toBeVisible();

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
