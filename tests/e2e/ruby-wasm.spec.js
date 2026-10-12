import { expect, test } from '@playwright/test';
import { filterWebKitUaStyleDiagnostics } from './csp-violations.js';

function trackExternalRequests(page, baseURL) {
  const sameOrigin = new URL(baseURL).origin;
  const cdnjs = /^\/ajax\/libs\/[^/]+\/\d+\.\d+\.\d+\//;
  const externalRequests = [];
  const listener = (request) => {
    const url = new URL(request.url());
    if (
      url.origin !== sameOrigin &&
      !(url.origin === 'https://cdnjs.cloudflare.com' && cdnjs.test(url.pathname))
    ) {
      externalRequests.push(request.url());
    }
  };
  page.context().on('request', listener);
  return { externalRequests, stop: () => page.context().off('request', listener) };
}

async function collectDiagnostics(page) {
  const consoleErrors = [];
  const pageErrors = [];
  const violations = [];
  await page.addInitScript(() => {
    window.__securityPolicyViolations = [];
    window.__securityPolicyListener = (event) => {
      window.__securityPolicyViolations.push({
        directive: event.violatedDirective,
        blockedURI: event.blockedURI,
        sample: event.sample,
      });
    };
    document.addEventListener('securitypolicyviolation', window.__securityPolicyListener);
  });
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  return { consoleErrors, pageErrors, violations };
}

async function assertClean(page, diagnostics, browserName) {
  const violations = await page.evaluate(() => window.__securityPolicyViolations ?? []);
  const filtered = filterWebKitUaStyleDiagnostics(
    violations,
    diagnostics.consoleErrors,
    browserName,
  );
  expect(filtered.violations).toEqual([]);
  expect(filtered.consoleErrors).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
}

async function openSnippetGroup(page, snippetId) {
  await page
    .locator(`details.snippet-group:has(.snippet-item[data-snippet="${snippetId}"])`)
    .evaluate((el) => {
      el.open = true;
    });
}

async function waitForBoot(page) {
  await expect(page.locator('#vm-state')).toContainText('ready', { timeout: 60_000 });
}

test('Ruby.wasm app boots the VM and runs Ruby', async ({ page, baseURL, browserName }) => {
  const diagnostics = await collectDiagnostics(page);
  const requestTracker = trackExternalRequests(page, baseURL);
  await page.goto('/ruby-wasm/');
  await expect(page.getByRole('heading', { name: 'Ruby.wasm Playground' })).toBeVisible();
  await waitForBoot(page);
  await expect(page.locator('#boot-metrics')).toContainText('ruby 3.4');
  await expect(page.locator('#boot-metrics')).toContainText('wasm32-wasi');
  await expect(page.locator('body')).toHaveAttribute('data-app-ready', 'true');
  await assertClean(page, diagnostics, browserName);
  expect(requestTracker.externalRequests).toEqual([]);
  requestTracker.stop();
});

test('eval runs Ruby code and shows the IRB-style result', async ({ page, browserName }) => {
  const diagnostics = await collectDiagnostics(page);
  await page.goto('/ruby-wasm/');
  await waitForBoot(page);

  // Type a small program into the editor (CodeMirror or plain textarea).
  const cm = page.locator('.CodeMirror');
  if (await cm.count()) {
    await cm.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('puts "hello from spec"; 6 * 7');
  } else {
    await page.locator('#code-editor').fill('puts "hello from spec"; 6 * 7');
  }
  await page.locator('#run-button').click();
  const entry = page.locator('.irb-entry').last();
  await expect(entry).toContainText('hello from spec', { timeout: 15_000 });
  await expect(entry).toContainText('=> 42');
  await assertClean(page, diagnostics, browserName);
});

test('snippet gallery loads and runs the click counter on the stage', async ({
  page,
  browserName,
}) => {
  const diagnostics = await collectDiagnostics(page);
  await page.goto('/ruby-wasm/');
  await waitForBoot(page);

  await openSnippetGroup(page, 'counter');
  await page.locator('.snippet-item[data-snippet="counter"]').click();
  await page.locator('#run-button').click();
  await expect(page.locator('.irb-entry').last()).toContainText('listener armed', {
    timeout: 15_000,
  });
  await page.locator('#stage-btn').click();
  await expect(page.locator('#stage-out')).toContainText('clicked 1 time', { timeout: 15_000 });
  await assertClean(page, diagnostics, browserName);
});

test('canvas snippet paints pixels through the DOM bridge', async ({ page, browserName }) => {
  const diagnostics = await collectDiagnostics(page);
  await page.goto('/ruby-wasm/');
  await waitForBoot(page);

  await openSnippetGroup(page, 'rainbow');
  await page.locator('.snippet-item[data-snippet="rainbow"]').click();
  await page.locator('#run-button').click();
  await expect(page.locator('.irb-entry').last()).toContainText('=>', { timeout: 15_000 });
  const painted = await page.locator('#stage-canvas').evaluate((canvas) => {
    const ctx = canvas.getContext('2d');
    const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let colored = 0;
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) colored += 1;
    return colored;
  });
  expect(painted).toBeGreaterThan(100);
  await assertClean(page, diagnostics, browserName);
});

test('feature matrix rows report support status', async ({ page, browserName }) => {
  const diagnostics = await collectDiagnostics(page);
  await page.goto('/ruby-wasm/');
  await waitForBoot(page);

  const rows = page.locator('.feature-row', { has: page.locator('.feature-run') });
  const jsonRow = rows.filter({ hasText: 'require "json"' });
  await jsonRow.locator('.feature-run').click();
  await expect(jsonRow.locator('.status-chip')).toContainText('pass', { timeout: 15_000 });
  const threadRow = rows.filter({ hasText: 'Thread.new' });
  await threadRow.locator('.feature-run').click();
  await expect(threadRow.locator('.status-chip')).toContainText('limited', { timeout: 15_000 });
  await assertClean(page, diagnostics, browserName);
});

test('kill button terminates a hung VM and restart recovers it', async ({ page, browserName }) => {
  const diagnostics = await collectDiagnostics(page);
  await page.goto('/ruby-wasm/');
  await waitForBoot(page);

  const cm = page.locator('.CodeMirror');
  if (await cm.count()) {
    await cm.click();
    await page.keyboard.press('ControlOrMeta+a');
    await page.keyboard.type('loop { }');
  } else {
    await page.locator('#code-editor').fill('loop { }');
  }
  await page.locator('#run-button').click();
  await page.locator('#kill-button').click();
  await expect(page.locator('#vm-state')).toContainText('stopped');
  await page.locator('#restart-button').click();
  await expect(page.locator('#vm-state')).toContainText('ready', { timeout: 60_000 });
  await assertClean(page, diagnostics, browserName);
});
