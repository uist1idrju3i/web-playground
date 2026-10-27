import { expect, test } from '@playwright/test';
import { attachConsoleWarnings, filterWebKitUaStyleDiagnostics } from './csp-violations.js';

async function openLab(page) {
  await page.addInitScript(() => {
    window.__aceCspViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      window.__aceCspViolations.push({
        directive: event.violatedDirective,
        blockedURI: event.blockedURI,
        sample: event.sample,
        sourceFile: event.sourceFile,
      });
    });
  });
  await page.goto('/ace/?debug=1', { waitUntil: 'load' });
  await expect(page.locator('body')).toHaveAttribute('data-app-ready', 'true');
  await expect(page.locator('#editor .ace_text-input')).toBeVisible();
}

async function setEditorValue(page, value) {
  await page.evaluate((text) => window.__aceLab.editor.setValue(text, -1), value);
}

test('Ace editor accepts direct keyboard input', async ({ page }) => {
  await openLab(page);
  await page.evaluate(() => window.__aceLab.editor.focus());
  await page.keyboard.type('hello ace');
  await expect
    .poll(() => page.evaluate(() => window.__aceLab.editor.getValue()))
    .toContain('hello ace');
});

test('Ace Lab boots, switches languages, and reports JSON worker diagnostics', async ({
  page,
  context,
}) => {
  const workerRequests = [];
  context.on('request', (request) => {
    if (request.url().includes('worker-json.js')) workerRequests.push(request.url());
  });
  await openLab(page);
  await expect(page.getByRole('heading', { name: 'Ace Lab' })).toBeVisible();
  await page.locator('#language').selectOption('json');
  await setEditorValue(page, '{"broken": }');
  await expect(page.locator('#editor .ace_gutter-cell.ace_error').first()).toBeVisible();
  await expect.poll(() => workerRequests.length, { timeout: 5000 }).toBeGreaterThan(0);
  await page.locator('#language').selectOption('python');
  await expect(page.locator('#document-status')).toContainText('Python');
});

test('Ace language tools show autocomplete and the search box opens', async ({ page }) => {
  await openLab(page);
  await page.locator('#language').selectOption('javascript');
  await page.evaluate(() => {
    const editor = window.__aceLab.editor;
    editor.setValue('aceL', 1);
    editor.moveCursorTo(0, editor.getValue().length);
    editor.focus();
    editor.execCommand('startAutocomplete');
  });
  await expect(page.locator('.ace_autocomplete')).toBeVisible({ timeout: 5000 });
  await expect(page.locator('.ace_autocomplete')).toContainText('aceLabNote');
  await page.keyboard.press('Escape');
  await page.locator('#search-button').click();
  await expect(page.locator('#editor .ace_search')).toBeVisible();
});

test('read-only mode blocks edits and the Vim handler performs normal-mode dd', async ({
  page,
}) => {
  await openLab(page);
  await setEditorValue(page, 'first line\nsecond line');
  await page.locator('#read-only').check();
  const before = await page.evaluate(() => window.__aceLab.editor.getValue());
  await page.locator('#editor .ace_text-input').press('x');
  expect(await page.evaluate(() => window.__aceLab.editor.getValue())).toBe(before);

  await page.locator('#read-only').uncheck();
  await page.locator('#keybinding').selectOption('vim');
  await page.evaluate(() => {
    window.__aceLab.editor.setValue('remove this line\nkeep this line', -1);
    window.__aceLab.editor.focus();
  });
  await page.keyboard.press('d');
  await page.keyboard.press('d');
  await expect
    .poll(() => page.evaluate(() => window.__aceLab.editor.getValue()))
    .toBe('keep this line');
});

test('signed save restores the editor after reload', async ({ page }) => {
  await openLab(page);
  await setEditorValue(page, 'a restored Ace document');
  await expect(page.locator('#save-notice')).toContainText(
    'Workspace saved with a local integrity signature',
    { timeout: 5000 },
  );
  await page.reload({ waitUntil: 'load' });
  await expect(page.locator('body')).toHaveAttribute('data-app-ready', 'true');
  await expect
    .poll(() => page.evaluate(() => window.__aceLab.editor.getValue()))
    .toBe('a restored Ace document');
});

test('diff and settings extensions render with zero CSP violations', async ({
  page,
  browserName,
}, testInfo) => {
  const consoleErrors = [];
  const consoleWarnings = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
    if (message.type() === 'warning') consoleWarnings.push(message.text());
  });
  await openLab(page);
  await page.locator('#settings-button').click();
  await expect(page.locator('#ace_settingsmenu')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.locator('#tab-diff').click();
  await expect(page.locator('#diff-editor .ace_editor')).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.__aceLab.diffView?.chunks.length ?? 0))
    .toBeGreaterThan(0);
  const diagnostics = filterWebKitUaStyleDiagnostics(
    await page.evaluate(() => window.__aceCspViolations),
    consoleErrors,
    browserName,
  );
  await attachConsoleWarnings(testInfo, consoleWarnings);
  expect(diagnostics.violations).toEqual([]);
  expect(diagnostics.consoleErrors).toEqual([]);
});

test('every tab stays within iPhone portrait and landscape viewports', async ({ page }) => {
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await openLab(page);
    for (const tab of ['tab-editor', 'tab-diff', 'tab-api']) {
      await page.locator(`#${tab}`).click();
      await expect(page.locator(`#${tab.replace('tab-', 'panel-')}`)).toBeVisible();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${viewport.width}x${viewport.height} should not overflow horizontally on ${tab}`,
      ).toBe(true);
    }
  }
});
