import { expect, test } from '@playwright/test';
import { attachConsoleWarnings, filterWebKitUaStyleDiagnostics } from './csp-violations.js';

test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status === testInfo.expectedStatus) return;
  const screenshotPath = testInfo.outputPath('failure.png');
  try {
    await page.screenshot({ path: screenshotPath });
    await testInfo.attach('failure-screenshot', { path: screenshotPath, contentType: 'image/png' });
  } catch (error) {
    await testInfo.attach('failure-screenshot-error', {
      body: String(error),
      contentType: 'text/plain',
    });
  }
});

function trackExternalRequests(page, baseURL) {
  const sameOrigin = new URL(baseURL).origin;
  const externalRequests = [];
  const listener = (request) => {
    if (new URL(request.url()).origin !== sameOrigin) externalRequests.push(request.url());
  };
  page.context().on('request', listener);
  return { externalRequests, stop: () => page.context().off('request', listener) };
}

async function watchPage(page, baseURL) {
  const consoleErrors = [];
  const consoleWarnings = [];
  const pageErrors = [];
  const requestTracker = trackExternalRequests(page, baseURL);
  let collecting = true;
  await page.addInitScript(() => {
    window.__securityPolicyViolations = [];
    window.__securityPolicyListener = (event) => {
      window.__securityPolicyViolations.push({
        directive: event.violatedDirective,
        blockedURI: event.blockedURI,
        sample: event.sample,
        sourceFile: event.sourceFile,
        line: event.lineNumber,
      });
    };
    document.addEventListener('securitypolicyviolation', window.__securityPolicyListener);
  });
  const consoleListener = (message) => {
    if (!collecting) return;
    if (message.type() === 'error') consoleErrors.push(message.text());
    if (message.type() === 'warning') consoleWarnings.push(message.text());
  };
  const pageErrorListener = (error) => {
    if (collecting) pageErrors.push(error.message);
  };
  page.on('console', consoleListener);
  page.on('pageerror', pageErrorListener);
  return {
    externalRequests: requestTracker.externalRequests,
    async assertClean(testInfo, browserName) {
      const diagnostics = filterWebKitUaStyleDiagnostics(
        await page.evaluate(() => window.__securityPolicyViolations),
        consoleErrors,
        browserName,
      );
      await attachConsoleWarnings(testInfo, consoleWarnings);
      expect({
        consoleErrors: diagnostics.consoleErrors,
        pageErrors,
        violations: diagnostics.violations,
        externalRequests: requestTracker.externalRequests,
      }).toEqual({ consoleErrors: [], pageErrors: [], violations: [], externalRequests: [] });
    },
    async stop() {
      collecting = false;
      page.off('console', consoleListener);
      page.off('pageerror', pageErrorListener);
      requestTracker.stop();
      await page.evaluate(() =>
        document.removeEventListener('securitypolicyviolation', window.__securityPolicyListener),
      );
    },
  };
}

async function clickAtCenter(page, selector) {
  const target = page.locator(selector);
  await expect(target).toBeVisible();
  const point = await target.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    return { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 };
  });
  await page.mouse.click(point.x, point.y);
}

// Engine-limited environments (e.g. headless Firefox without WebGL) stop at
// the unsupported phase; report and skip rather than fail, matching the
// tsumiki spec's capability-skip pattern.
async function requireTitleOrSkip(page, testInfo) {
  const body = page.locator('body');
  await page.waitForFunction(
    () => ['title', 'unsupported'].includes(document.body.dataset.phase),
    null,
    { timeout: 15_000 },
  );
  testInfo.skip(
    (await body.getAttribute('data-phase')) === 'unsupported',
    'required capabilities unavailable in this browser',
  );
}

async function startAndAssertGate(
  page,
  baseURL,
  browserName,
  testInfo,
  path = '/baked-mochocho/?debug=1&speed=40',
) {
  const watcher = await watchPage(page, baseURL);
  await page.goto(path);
  await requireTitleOrSkip(page, testInfo);
  const body = page.locator('body');
  await expect(body).toHaveAttribute('data-phase', 'title');
  await expect(body).toHaveAttribute('data-renderer', /^(WebGPU|WebGL2)$/);
  await expect(page.locator('#start-button')).toBeEnabled();
  await clickAtCenter(page, '#start-button');
  await expect(body).toHaveAttribute('data-phase', 'playing');
  const initialFrames = Number(await body.getAttribute('data-frames'));
  await page.waitForFunction(
    (frames) => Number(document.body.dataset.frames) > frames,
    initialFrames,
  );
  await watcher.assertClean(testInfo, browserName);
  await page.evaluate(() => {
    globalThis.mochochoDebug.paused = true;
  });
  return watcher;
}

test('the app starts without console, CSP, or external-request violations', async ({
  page,
  baseURL,
  browserName,
}, testInfo) => {
  const watcher = await startAndAssertGate(page, baseURL, browserName, testInfo);
  try {
    await page.screenshot();
  } finally {
    await watcher.stop();
  }
});

for (const { width, height } of [
  { width: 390, height: 844 },
  { width: 844, height: 390 },
  { width: 375, height: 667 },
]) {
  test(`iPhone viewport ${width}×${height} keeps controls in bounds`, async ({
    page,
  }, testInfo) => {
    await page.setViewportSize({ width, height });
    await page.goto('/baked-mochocho/?debug=1&speed=40');
    await requireTitleOrSkip(page, testInfo);
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'title');
    const titleBounds = await page.evaluate(() => {
      const button = document.querySelector('#start-button');
      const rect = button.getBoundingClientRect();
      return {
        visible: Boolean(
          rect.width && rect.height && getComputedStyle(button).visibility !== 'hidden',
        ),
        left: rect.left,
        top: rect.top,
        right: rect.right,
        bottom: rect.bottom,
        scrollY: window.scrollY,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        documentWidth: document.documentElement.scrollWidth,
      };
    });
    expect(titleBounds.documentWidth).toBeLessThanOrEqual(titleBounds.viewportWidth);
    expect(titleBounds.visible).toBe(true);
    expect(titleBounds.left).toBeGreaterThanOrEqual(0);
    expect(titleBounds.top).toBeGreaterThanOrEqual(0);
    expect(titleBounds.right).toBeLessThanOrEqual(titleBounds.viewportWidth);
    expect(titleBounds.bottom).toBeLessThanOrEqual(titleBounds.viewportHeight);
    expect(titleBounds.scrollY).toBe(0);

    await clickAtCenter(page, '#start-button');
    await expect(page.locator('body')).toHaveAttribute('data-phase', 'playing');
    await page.waitForFunction(() => globalThis.mochochoDebug?.lastFrame);
    await page.evaluate(() => {
      globalThis.mochochoDebug.paused = true;
    });
    const controls = await page.evaluate(() => {
      const rect = (element) => {
        const box = element.getBoundingClientRect();
        return {
          visible:
            box.width > 0 &&
            box.height > 0 &&
            getComputedStyle(element).visibility !== 'hidden' &&
            getComputedStyle(element).display !== 'none',
          left: box.left,
          top: box.top,
          right: box.right,
          bottom: box.bottom,
          width: box.width,
          height: box.height,
        };
      };
      return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        documentWidth: document.documentElement.scrollWidth,
        tools: [...document.querySelectorAll('.tool')].map(rect),
        heat: rect(document.querySelector('#heat')),
      };
    });
    expect(controls.documentWidth).toBeLessThanOrEqual(controls.viewportWidth);
    for (const [index, tool] of controls.tools.entries()) {
      expect(tool.visible, `tool ${index} is visible`).toBe(true);
      expect(tool.width, `tool ${index} width`).toBeGreaterThanOrEqual(44);
      expect(tool.height, `tool ${index} height`).toBeGreaterThanOrEqual(44);
      expect(tool.left, `tool ${index} left`).toBeGreaterThanOrEqual(0);
      expect(tool.top, `tool ${index} top`).toBeGreaterThanOrEqual(0);
      expect(tool.right, `tool ${index} right`).toBeLessThanOrEqual(controls.viewportWidth);
      expect(tool.bottom, `tool ${index} bottom`).toBeLessThanOrEqual(controls.viewportHeight);
    }
    expect(controls.heat.visible, 'heat control is visible').toBe(true);
    expect(controls.heat.height, 'heat hit box height').toBeGreaterThanOrEqual(44);
    expect(controls.heat.left).toBeGreaterThanOrEqual(0);
    expect(controls.heat.top).toBeGreaterThanOrEqual(0);
    expect(controls.heat.right).toBeLessThanOrEqual(controls.viewportWidth);
    expect(controls.heat.bottom).toBeLessThanOrEqual(controls.viewportHeight);
    const boxes = [...controls.tools, controls.heat];
    for (let first = 0; first < boxes.length; first += 1) {
      for (let second = first + 1; second < boxes.length; second += 1) {
        const intersects =
          boxes[first].left < boxes[second].right &&
          boxes[first].right > boxes[second].left &&
          boxes[first].top < boxes[second].bottom &&
          boxes[first].bottom > boxes[second].top;
        expect(intersects, `controls ${first} and ${second} intersect`).toBe(false);
      }
    }
  });
}

test('the rendered scene is non-black and non-uniform', async ({
  page,
  baseURL,
  browserName,
}, testInfo) => {
  const watcher = await startAndAssertGate(page, baseURL, browserName, testInfo);
  try {
    const bounds = await page.locator('#stage').boundingBox();
    expect(bounds).not.toBeNull();
    const screenshotPath = testInfo.outputPath('canvas.png');
    const screenshot = await page.screenshot({ path: screenshotPath, clip: bounds });
    await testInfo.attach('canvas-render', { path: screenshotPath, contentType: 'image/png' });
    const statistics = await page.evaluate(
      async (dataUrl) => {
        const image = new Image();
        image.src = dataUrl;
        await image.decode();
        const canvas = document.createElement('canvas');
        canvas.width = image.naturalWidth;
        canvas.height = image.naturalHeight;
        const context = canvas.getContext('2d');
        context.drawImage(image, 0, 0);
        const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
        let sum = 0;
        let sumSquares = 0;
        const count = pixels.length / 4;
        for (let index = 0; index < pixels.length; index += 4) {
          const luminance =
            0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2];
          sum += luminance;
          sumSquares += luminance * luminance;
        }
        const mean = sum / count;
        return { mean, standardDeviation: Math.sqrt(sumSquares / count - mean * mean) };
      },
      `data:image/png;base64,${screenshot.toString('base64')}`,
    );
    expect(statistics.mean).toBeGreaterThan(20);
    expect(statistics.standardDeviation).toBeGreaterThan(8);
  } finally {
    await watcher.stop();
  }
});

test('the batter tool pours into cavity zero through pointer input', async ({ page }, testInfo) => {
  await page.goto('/baked-mochocho/?debug=1&speed=40');
  await requireTitleOrSkip(page, testInfo);
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'title');
  await clickAtCenter(page, '#start-button');
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'playing');
  await page.waitForFunction(
    () => globalThis.mochochoDebug?.camera && globalThis.mochochoDebug?.lastFrame,
  );
  await clickAtCenter(page, '[data-tool="batter"]');
  const point = await page.evaluate(async () => {
    const { toScreen } = await import('/baked-mochocho/js/render/scene.js');
    const simulation = globalThis.mochochoDebug.sim;
    const cavity = simulation.cavities[0];
    const canvas = document.querySelector('#stage');
    const screen = toScreen(
      globalThis.mochochoDebug.camera,
      cavity.x,
      cavity.y,
      0,
      canvas.clientWidth,
      canvas.clientHeight,
    );
    const bounds = canvas.getBoundingClientRect();
    return { x: bounds.left + screen.x, y: bounds.top + screen.y };
  });
  await page.mouse.move(point.x, point.y);
  await page.mouse.down();
  try {
    await expect
      .poll(() => page.evaluate(() => globalThis.mochochoDebug.sim.cavity(0).batterMl))
      .toBeGreaterThan(5);
  } finally {
    await page.mouse.up();
  }
});

test('tool, language, and menu controls respond through the UI', async ({ page }, testInfo) => {
  await page.goto('/baked-mochocho/?debug=1&speed=40');
  await requireTitleOrSkip(page, testInfo);
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'title');
  const languageState = await page.evaluate(() => {
    const button = document.querySelector('#lang-button');
    const start = document.querySelector('#start-button');
    const visible =
      button.getClientRects().length > 0 && getComputedStyle(button).visibility !== 'hidden';
    button.click();
    const english = start.textContent.trim();
    button.click();
    return { visible, english, japanese: start.textContent.trim() };
  });
  expect(languageState.visible).toBe(true);
  expect(languageState.english).toBe('Start baking');
  expect(languageState.japanese).toBe('焼きはじめる');

  await clickAtCenter(page, '#start-button');
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'playing');
  await page.waitForFunction(() => globalThis.mochochoDebug?.lastFrame);
  await page.evaluate(() => {
    globalThis.mochochoDebug.paused = true;
  });
  const toolStates = await page.evaluate(() =>
    ['oil', 'batter', 'filling', 'flip', 'serve'].map((tool) => {
      const button = document.querySelector(`[data-tool="${tool}"]`);
      const visible =
        button.getClientRects().length > 0 && getComputedStyle(button).visibility !== 'hidden';
      button.click();
      return {
        tool,
        visible,
        pressed: button.getAttribute('aria-pressed'),
        selectedCount: document.querySelectorAll('.tool[aria-pressed="true"]').length,
      };
    }),
  );
  for (const { visible, pressed, selectedCount } of toolStates) {
    expect(visible).toBe(true);
    expect(pressed).toBe('true');
    expect(selectedCount).toBe(1);
  }

  const menuState = await page.evaluate(() => {
    const visible = (element) =>
      element.getClientRects().length > 0 && getComputedStyle(element).visibility !== 'hidden';
    const menuButton = document.querySelector('#menu-button');
    const menu = document.querySelector('#menu-screen');
    const closeButton = document.querySelector('#close-menu');
    const menuButtonVisible = visible(menuButton);
    menuButton.click();
    const menuVisible = visible(menu);
    const closeVisible = visible(closeButton);
    closeButton.click();
    return { menuButtonVisible, menuVisible, closeVisible, menuHidden: !visible(menu) };
  });
  expect(menuState).toEqual({
    menuButtonVisible: true,
    menuVisible: true,
    closeVisible: true,
    menuHidden: true,
  });
});

test('signed save verifies after reload and detects localStorage tampering', async ({
  page,
}, testInfo) => {
  if (test.info().project.name === 'chromium') test.setTimeout(60_000);
  await page.goto('/baked-mochocho/?debug=1&speed=40');
  await requireTitleOrSkip(page, testInfo);
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'title');
  await clickAtCenter(page, '#start-button');
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'playing');
  await page.waitForFunction(() => globalThis.mochochoDebug?.lastFrame);
  await page.evaluate(() => {
    globalThis.mochochoDebug.paused = true;
  });
  await clickAtCenter(page, '#menu-button');
  await clickAtCenter(page, '#sound-toggle');
  await expect(page.locator('#save-line')).toHaveText('保存しました（HMAC 署名）');

  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-save', 'ok');
  await page.evaluate(() => {
    const key = 'wp-signed:baked-mochocho';
    const envelope = JSON.parse(localStorage.getItem(key));
    envelope.data.coins += 1;
    localStorage.setItem(key, JSON.stringify(envelope));
  });
  await page.reload();
  await expect(page.locator('body')).toHaveAttribute('data-save', 'tampered');
  await expect(page.locator('#save-line')).not.toBeEmpty();
});

test('WebGPU offscreen snapshot renders a non-black, non-uniform scene', async ({
  page,
  browserName,
}) => {
  test.skip(browserName !== 'chromium', 'WebGPU snapshot is Chromium-only.');
  await page.goto('/baked-mochocho/');
  const hasAdapter = await page.evaluate(async () =>
    Boolean(await navigator.gpu?.requestAdapter()),
  );
  test.skip(!hasAdapter, 'No WebGPU adapter in this runner.');

  await page.goto('/baked-mochocho/?debug=1&present=0');
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'title');
  await clickAtCenter(page, '#start-button');
  await expect(page.locator('body')).toHaveAttribute('data-phase', 'playing');
  await expect(page.locator('body')).toHaveAttribute('data-renderer', 'WebGPU');
  await page.waitForFunction(() => globalThis.mochochoDebug?.lastFrame);
  const statistics = await page.evaluate(async () => {
    const { pixels } = await globalThis.mochochoDebug.renderer.snapshot(
      globalThis.mochochoDebug.camera,
      globalThis.mochochoDebug.lastFrame,
    );
    let sum = 0;
    let sumSquares = 0;
    const count = pixels.length / 4;
    for (let index = 0; index < pixels.length; index += 4) {
      const luminance =
        0.2126 * pixels[index] + 0.7152 * pixels[index + 1] + 0.0722 * pixels[index + 2];
      sum += luminance;
      sumSquares += luminance * luminance;
    }
    const mean = sum / count;
    return { mean, standardDeviation: Math.sqrt(sumSquares / count - mean * mean) };
  });
  expect(statistics.mean).toBeGreaterThan(20);
  expect(statistics.standardDeviation).toBeGreaterThan(8);
});

// Screen position of a cavity centre via the renderer's own toScreen().
async function cavityScreen(page, index) {
  return page.evaluate(async (i) => {
    const { toScreen } = await import('/baked-mochocho/js/render/scene.js');
    const s = globalThis.mochochoDebug;
    const cv = document.querySelector('#stage');
    const c = s.sim.cavities[i];
    const pos = toScreen(s.camera, c.x, c.y, 0, cv.clientWidth, cv.clientHeight);
    const r = cv.getBoundingClientRect();
    return { x: r.left + pos.x, y: r.top + pos.y };
  }, index);
}

async function holdOn(page, index, ms) {
  const p = await cavityScreen(page, index);
  await page.mouse.move(p.x, p.y);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

async function tapAt(page, index) {
  const p = await cavityScreen(page, index);
  await page.mouse.click(p.x, p.y);
}

test('a full batch bakes through the UI: oil, pour, fill, flip, serve, score', async ({
  page,
  baseURL,
  browserName,
}, testInfo) => {
  test.slow();
  test.setTimeout(240_000);
  await startAndAssertGate(
    page,
    baseURL,
    browserName,
    testInfo,
    '/baked-mochocho/?debug=1&speed=80',
  );
  await page.evaluate(() => {
    globalThis.mochochoDebug.paused = false;
  });
  const tool = (name) => clickAtCenter(page, `[data-tool="${name}"]`);

  await tool('oil');
  for (const i of [0, 1, 2, 3, 4, 5]) await holdOn(page, i, 60);

  // Pour a cavity to the target ml and fill tops immediately — batter keeps
  // relaxing and leaks out of the mold over time, so actions must not lag.
  const pourUntil = async (i, ml) => {
    const p = await cavityScreen(page, i);
    await page.mouse.move(p.x, p.y);
    await page.mouse.down();
    try {
      await page.waitForFunction(
        (pair) => globalThis.mochochoDebug.sim.cavity(pair[0]).batterMl >= pair[1],
        [i, ml],
        {
          timeout: 30_000,
        },
      );
    } finally {
      await page.mouse.up();
    }
  };
  await tool('batter');
  for (const i of [0, 1, 2]) {
    await pourUntil(i, 42);
    await tool('filling');
    await tapAt(page, i);
    try {
      await page.waitForFunction((idx) => globalThis.mochochoDebug.sim.cavity(idx).state === 2, i, {
        timeout: 15_000,
      });
    } catch (error) {
      const dump = await page.evaluate(() => ({
        tool: globalThis.mochochoDebug.tool,
        states: [0, 1, 2].map((k) => globalThis.mochochoDebug.sim.cavity(k).state),
        mls: [0, 1, 2].map((k) => Math.round(globalThis.mochochoDebug.sim.cavity(k).batterMl)),
        toast: document.querySelector('#toast')?.textContent ?? '',
      }));
      console.log('fill wait failed:', JSON.stringify(dump));
      throw error;
    }
    await tool('batter');
  }
  // start_flip requires >=25ml in BOTH halves of a pair; pour the bottoms too.
  for (const i of [3, 4, 5]) await pourUntil(i, 48);

  // Let the tops set before flipping.
  await page.waitForFunction(() => globalThis.mochochoDebug.sim.cavity(0).topSetMean >= 0.45, {
    timeout: 60_000,
  });

  // Bottom halves leak during the set wait — top any back up to 30+ ml.
  await tool('batter');
  for (const i of [3, 4, 5]) {
    const ml = await page.evaluate((k) => globalThis.mochochoDebug.sim.cavity(k).batterMl, i);
    if (ml < 30) await pourUntil(i, 40);
  }

  await tool('flip');
  for (const i of [0, 1, 2]) await tapAt(page, i);
  // State 4 = the flipped half landed in the lower cavity.
  await page.waitForFunction(() => globalThis.mochochoDebug.sim.cavity(3).state === 4, {
    timeout: 30_000,
  });

  // Finish the bake on the merged cakes.
  await page.waitForFunction(() => globalThis.mochochoDebug.sim.cavity(3).bottomBrownMean >= 0.45, {
    timeout: 90_000,
  });

  await tool('serve');
  await tapAt(page, 3);
  await expect(page.locator('#result-screen')).toBeVisible();
  await expect(page.locator('#result-stars')).toContainText('★');
  await clickAtCenter(page, '#next-button');
  await expect(page.locator('#result-screen')).toBeHidden();
});
