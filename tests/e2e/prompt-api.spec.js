import { expect, test } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import { filterWebKitUaStyleDiagnostics } from './csp-violations.js';

const fixturePath = fileURLToPath(new URL('./fixtures/fake-language-model.js', import.meta.url));

function trackExternalRequests(page, baseURL) {
  const sameOrigin = new URL(baseURL).origin;
  const externalRequests = [];
  const listener = (request) => {
    if (new URL(request.url()).origin !== sameOrigin) externalRequests.push(request.url());
  };
  page.context().on('request', listener);
  return { externalRequests, stop: () => page.context().off('request', listener) };
}

async function collectDiagnostics(page) {
  const consoleErrors = [];
  const pageErrors = [];
  await page.addInitScript(() => {
    window.__securityPolicyViolations = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      window.__securityPolicyViolations.push({
        directive: event.violatedDirective,
        blockedURI: event.blockedURI,
        sample: event.sample,
      });
    });
  });
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(String(error)));
  return { consoleErrors, pageErrors };
}

async function assertClean(page, diagnostics, browserName) {
  await page.waitForTimeout(100);
  const filtered = filterWebKitUaStyleDiagnostics(
    await page.evaluate(() => window.__securityPolicyViolations ?? []),
    diagnostics.consoleErrors,
    browserName,
  );
  expect(filtered.violations).toEqual([]);
  expect(filtered.consoleErrors).toEqual([]);
  expect(diagnostics.pageErrors).toEqual([]);
}

async function installFake(page) {
  await page.addInitScript({ path: fixturePath });
}

async function installNoApi(page) {
  await page.addInitScript(() => {
    delete globalThis.LanguageModel;
  });
}

async function openFakeApp(page) {
  await installFake(page);
  await page.goto('/prompt-api/');
  await expect(page.locator('body')).toHaveAttribute('data-app-ready', 'true');
}

test('boot without LanguageModel keeps a readable learning page', async ({
  page,
  baseURL,
  browserName,
}) => {
  const diagnostics = await collectDiagnostics(page);
  const requestTracker = trackExternalRequests(page, baseURL);
  await installNoApi(page);
  await page.goto('/prompt-api/');
  await expect(page.getByRole('heading', { name: 'Prompt API Lab' })).toBeVisible();
  await expect(page.locator('#availability-notice')).toBeVisible();
  await expect(page.locator('#create-session')).toBeDisabled();
  expect(await page.evaluate(() => typeof globalThis.LanguageModel)).toBe('undefined');
  await expect(page.locator('#availability-matrix tr')).toHaveCount(35);
  await expect(page.locator('body')).toHaveAttribute('data-app-ready', 'true');
  await assertClean(page, diagnostics, browserName);
  expect(requestTracker.externalRequests).toEqual([]);
  requestTracker.stop();
});

test('no-API learning notice stays near the top at all requested viewports', async ({ page }) => {
  await installNoApi(page);
  for (const viewport of [
    { width: 1280, height: 800 },
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/prompt-api/');
    await expect(page.locator('body')).toHaveAttribute('data-app-ready', 'true');
    await expect(page.locator('#availability-notice')).toBeVisible();
    const noticeTop = await page
      .locator('#availability-notice')
      .evaluate((element) => element.getBoundingClientRect().top);
    expect(noticeTop).toBeGreaterThanOrEqual(0);
    expect(noticeTop).toBeLessThan(viewport.height / 2);
  }
});

test('fake API renders the availability matrix without creating on load', async ({ page }) => {
  await openFakeApp(page);
  await expect(page.locator('#availability-notice')).toBeHidden();
  await expect(page.locator('#availability-matrix tr')).toHaveCount(35);
  await expect(page.locator('#matrix-summary')).toContainText('available');
  await expect(page.locator('#matrix-summary')).toContainText('downloadable');
  await expect(page.locator('#matrix-summary')).toContainText('unavailable');
  await expect(page.locator('#api-surface-count')).toContainText('present');
  await expect(page.locator('#create-session')).toBeEnabled();
  expect(await page.evaluate(() => window.__fakeLanguageModelCalls.create.length)).toBe(0);
  expect(
    await page.evaluate(() => window.__fakeLanguageModelCalls.availability.length),
  ).toBeGreaterThan(0);
});

test('explicit creation reports progress and chat supports streaming, stop, clone, append, and destroy', async ({
  page,
}) => {
  await openFakeApp(page);
  await page.locator('#create-session').click();
  await expect(page.locator('#session-state')).toContainText('Session ready');
  await expect
    .poll(() => page.evaluate(() => window.__fakeLanguageModelCalls.progress), { timeout: 5000 })
    .toEqual([0, 1]);

  await page.locator('#tab-chat').click();
  await page.locator('#chat-input').fill('Say something short.');
  await page.locator('#send-prompt').click();
  await expect(page.locator('.chat-message[data-role="assistant"]').last()).toContainText(
    'Fake model reply.',
  );
  await expect(page.locator('#context-notice')).toContainText('Context overflow');

  await page.locator('#clone-session').click();
  await expect(page.locator('#clone-pane')).toBeVisible();
  await page.locator('#clone-input').fill('A cloned question');
  await page.locator('#clone-send').click();
  await expect(page.locator('#clone-result')).toContainText('Fake model reply.');

  await page.locator('#append-only').check();
  await page.locator('#chat-input').fill('Keep this in context.');
  await page.locator('#send-prompt').click();
  await expect(page.locator('#app-status')).toContainText('appended without generating');

  await page.locator('#append-only').uncheck();
  await page.locator('#chat-input').fill('Stop this response.');
  await page.locator('#send-prompt').click();
  await expect(page.locator('#stop-prompt')).toBeEnabled();
  await page.locator('#stop-prompt').click();
  await expect(page.locator('#context-notice')).toContainText('stopped');

  await page.locator('#destroy-session').click();
  await expect(page.locator('#session-state')).toContainText('Destroyed');
  await expect(page.locator('#chat-input')).toBeDisabled();
});

test('structured output runs the local validator on fake constrained output', async ({ page }) => {
  await openFakeApp(page);
  await page.locator('#tab-structured').click();
  await page.locator('#run-structured').click();
  await expect(page.locator('#structured-status')).toContainText('PASS');
  await expect(page.locator('#structured-result')).toContainText('"sentiment":"positive"');
});

test('tools require explicit approval and report rejection through the tool protocol', async ({
  page,
}) => {
  await openFakeApp(page);
  await page.locator('#tab-tools').click();
  await page.locator('#run-tools').click();
  const card = page.locator('.tool-card').last();
  await expect(card).toContainText('Approve calculator?');
  await expect(page.locator('#tools-code')).toContainText('tools: TOOL_DEFINITIONS');
  await expect(page.locator('#tools-code')).not.toContainText('...');
  await card.getByRole('button', { name: 'Approve' }).click();
  await expect(page.locator('#tools-result')).toContainText('approved tool result');

  await page.locator('#run-tools').click();
  const rejectedCard = page.locator('.tool-card').last();
  await expect(rejectedCard).toContainText('Approve calculator?');
  await rejectedCard.getByRole('button', { name: 'Reject' }).click();
  await expect(page.locator('#tools-result')).toContainText('rejected tool call');
});

test('error lab reports the documented error names with the fake API', async ({ page }) => {
  await openFakeApp(page);
  await page.locator('#tab-errors').click();
  const cases = page.locator('.error-case');
  await expect(cases).toHaveCount(7);
  for (let index = 0; index < 7; index += 1) {
    const card = cases.nth(index);
    const expected = (await card.locator('p').textContent()).match(/Expected: (\w+)/u)?.[1];
    await card.getByRole('button', { name: 'Run case' }).click();
    await expect(card.locator('output')).toContainText(`Actual: ${expected}`);
  }
});

test('every Prompt API tab stays within portrait and landscape phone bounds', async ({ page }) => {
  await installFake(page);
  const tabs = ['availability', 'chat', 'structured', 'multimodal', 'tools', 'sampling', 'errors'];
  for (const viewport of [
    { width: 390, height: 844 },
    { width: 844, height: 390 },
  ]) {
    await page.setViewportSize(viewport);
    await page.goto('/prompt-api/');
    await expect(page.getByRole('heading', { name: 'Prompt API Lab' })).toBeVisible();
    for (const tab of tabs) {
      await page.locator(`#tab-${tab}`).click();
      if (tab === 'tools') {
        await page.locator('#run-tools').click();
        const toolCard = page.locator('.tool-card').last();
        await expect(toolCard).toBeVisible();
        await toolCard.getByRole('button', { name: 'Approve' }).click();
        await expect(page.locator('#tools-result')).toContainText('approved tool result');
      }
      if (tab === 'sampling') {
        await page.locator('#run-sampling').click();
        await expect(page.locator('.sampling-card').first()).toBeVisible();
      }
      const bounds = await page.evaluate(() => {
        const panel = document.querySelector('.tab-panel:not([hidden])');
        const width = window.innerWidth;
        const elements = [panel, ...panel.querySelectorAll('*')];
        return {
          viewportWidth: width,
          documentScrollWidth: document.documentElement.scrollWidth,
          bodyScrollWidth: document.body.scrollWidth,
          offenders: elements
            .map((element) => {
              const rect = element.getBoundingClientRect();
              return {
                name: `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${element.className && typeof element.className === 'string' ? `.${element.className.trim().replaceAll(/\s+/gu, '.')}` : ''}`,
                left: rect.left,
                right: rect.right,
                width: rect.width,
                hidden: rect.width === 0 || rect.height === 0,
              };
            })
            .filter(
              ({ left, right, width: elementWidth, hidden }) =>
                !hidden && (left < -1 || right > width + 1 || elementWidth > width + 1),
            ),
        };
      });
      expect(bounds.documentScrollWidth).toBeLessThanOrEqual(bounds.viewportWidth);
      expect(bounds.bodyScrollWidth).toBeLessThanOrEqual(bounds.viewportWidth);
      expect(bounds.offenders, `${viewport.width}px · ${tab}`).toEqual([]);
    }
  }
});

test('fake API page has no CSP, console, page, or external-request diagnostics', async ({
  page,
  baseURL,
  browserName,
}) => {
  const diagnostics = await collectDiagnostics(page);
  const requestTracker = trackExternalRequests(page, baseURL);
  await openFakeApp(page);
  await assertClean(page, diagnostics, browserName);
  expect(requestTracker.externalRequests).toEqual([]);
  requestTracker.stop();
});
