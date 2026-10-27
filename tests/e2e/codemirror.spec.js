import { expect, test } from '@playwright/test';
import { attachConsoleWarnings, filterWebKitUaStyleDiagnostics } from './csp-violations.js';

async function openLab(page) {
  await page.goto('/codemirror/', { waitUntil: 'load' });
  await page.waitForFunction(() => document.body.dataset.appReady === 'true');
}

async function typeInEditor(page, text) {
  const editor = page.locator('.cm-content');
  await editor.click();
  await page.keyboard.press('ControlOrMeta+A');
  await editor.pressSequentially(text);
}

test('boots, accepts text, switches language, and opens autocomplete', async ({ page }) => {
  await openLab(page);
  await expect(page.locator('#boot-status')).toHaveText('Ready');
  await typeInEditor(page, 'obser');
  await expect(page.locator('.cm-tooltip-autocomplete')).toBeVisible();
  await page.locator('#language-select').selectOption('json');
  await expect(page.locator('#language-select')).toHaveValue('json');
});

test('opens search and reports JSON diagnostics', async ({ page }) => {
  await openLab(page);
  await page.locator('#search-button').click();
  await expect(page.locator('.cm-search')).toBeVisible();
  await page.locator('#language-select').selectOption('json');
  await typeInEditor(page, '{"broken":}');
  await expect(page.locator('.cm-lintRange-error')).toHaveCount(1);
});

test('read-only toggle blocks typing and merge view renders', async ({ page }) => {
  await openLab(page);
  const before = await page.locator('.cm-content').innerText();
  await page.locator('input[data-setting="readOnly"]').check();
  await typeInEditor(page, 'blocked');
  await expect
    .poll(async () => (await page.locator('.cm-content').innerText()).replace(/\s+/gu, ''))
    .toBe(before.replace(/\s+/gu, ''));
  await page.locator('#tab-merge').click();
  await expect(page.locator('#merge-host .cm-mergeView')).toBeVisible();
  await page.locator('#merge-mode').selectOption('unified');
  await expect(page.locator('#merge-host .cm-editor')).toBeVisible();
});

test('reload restores the signed document', async ({ page }) => {
  await openLab(page);
  await typeInEditor(page, 'saved observation');
  await page.waitForTimeout(700);
  await page.reload();
  await page.waitForFunction(() => document.body.dataset.appReady === 'true');
  await expect(page.locator('.cm-content')).toContainText('saved observation');
});

test('all tabs stay within phone bounds', async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await openLab(page);
    for (const tab of ['#tab-editor', '#tab-merge', '#tab-composition']) {
      await page.locator(tab).click();
      await page.waitForTimeout(100);
      const result = await page.evaluate(() => {
        const width = window.innerWidth;
        const elements = [];
        const collect = (root) => {
          for (const element of root.querySelectorAll('*')) {
            if (!element.closest('.cm-scroller')) elements.push(element);
            if (element.shadowRoot) collect(element.shadowRoot);
          }
        };
        collect(document);
        const offenders = elements.filter((element) => {
          const rect = element.getBoundingClientRect();
          return rect.right > width + 1 || rect.left < -1;
        }).length;
        return { offenders, scrollWidth: document.documentElement.scrollWidth };
      });
      expect(result, `${viewport.width}x${viewport.height} ${tab}`).toEqual({
        offenders: 0,
        scrollWidth: viewport.width,
      });
    }
  }
});

test('emits no CSP violations', async ({ page, browserName }, testInfo) => {
  const consoleErrors = [];
  const warnings = [];
  await page.addInitScript(() => {
    window.__cmCsp = [];
    document.addEventListener('securitypolicyviolation', (event) =>
      window.__cmCsp.push({
        directive: event.violatedDirective,
        blockedURI: event.blockedURI,
        sample: event.sample,
      }),
    );
  });
  page.on('console', (message) =>
    (message.type() === 'error' ? consoleErrors : warnings).push(message.text()),
  );
  await openLab(page);
  await page.waitForTimeout(250);
  const diagnostics = filterWebKitUaStyleDiagnostics(
    await page.evaluate(() => window.__cmCsp),
    consoleErrors,
    browserName,
  );
  await attachConsoleWarnings(testInfo, warnings);
  expect(diagnostics).toEqual({ violations: [], consoleErrors: [] });
});
