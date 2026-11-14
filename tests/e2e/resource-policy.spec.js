import { expect, test } from '@playwright/test';
import { appPaths, cdnjsPath, htmlPages } from '../pages.mjs';
import { attachConsoleWarnings } from './csp-violations.js';

const pages = htmlPages();
const apps = appPaths();

for (const path of pages) {
  test(`static resource policy: ${path}`, async ({ browser, baseURL }, testInfo) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const allowedOrigin = new URL(baseURL).origin;
    const externalRequests = new Set();
    const cspViolations = [];
    const pageErrors = [];
    const consoleErrors = [];
    const consoleWarnings = [];
    context.on('request', (request) => {
      const url = new URL(request.url());
      if (
        url.origin !== allowedOrigin &&
        !(url.origin === 'https://cdnjs.cloudflare.com' && cdnjsPath.test(url.pathname))
      ) {
        externalRequests.add(url.href);
      }
    });
    await context.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (
        url.origin !== allowedOrigin &&
        !(url.origin === 'https://cdnjs.cloudflare.com' && cdnjsPath.test(url.pathname))
      ) {
        externalRequests.add(url.href);
        await route.abort();
        return;
      }
      await route.continue();
    });
    await context.addInitScript(() => {
      window.__resourcePolicyViolations = [];
      document.addEventListener('securitypolicyviolation', (event) => {
        window.__resourcePolicyViolations.push({
          directive: event.violatedDirective,
          blockedURI: event.blockedURI,
          sample: event.sample,
          sourceFile: event.sourceFile,
          line: event.lineNumber,
        });
      });
    });
    page.on('console', (message) => {
      if (message.type() === 'error') consoleErrors.push(message.text());
      if (message.type() === 'warning') consoleWarnings.push(message.text());
    });
    page.on('websocket', (socket) => {
      const url = new URL(socket.url());
      if (url.origin !== allowedOrigin) externalRequests.add(url.href);
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    try {
      await page.goto(path, { waitUntil: 'load' });
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      // Violation events and console errors are delivered asynchronously
      // after load; a synchronous read here can race them. Wait briefly for
      // the batch, then give stragglers a moment to land. Pages that emit no
      // violations exit the first wait via its timeout.
      await page
        .waitForFunction(() => window.__resourcePolicyViolations.length > 0, null, {
          timeout: 2000,
        })
        .catch(() => {});
      await page.waitForTimeout(250);
      cspViolations.push(...(await page.evaluate(() => window.__resourcePolicyViolations)));
      await attachConsoleWarnings(testInfo, consoleWarnings);
      expect(
        {
          externalRequests: [...externalRequests],
          cspViolations,
          pageErrors,
          consoleErrors,
        },
        path,
      ).toEqual({ externalRequests: [], cspViolations: [], pageErrors: [], consoleErrors: [] });
    } finally {
      await context.close();
    }
  });
}

test('portal links resolve and every app index is registered', async ({ page, baseURL }) => {
  await page.goto('/');
  const links = await page
    .locator('a[href]')
    .evaluateAll((anchors) => anchors.map((anchor) => anchor.href));
  const origin = new URL(baseURL).origin;
  const internalLinks = [...new Set(links.filter((href) => new URL(href).origin === origin))];
  for (const appPath of apps) {
    expect(links.map((href) => new URL(href).pathname)).toContain(appPath);
  }
  for (const href of internalLinks) {
    const response = await page.request.get(href);
    expect(response.status(), href).toBeLessThan(400);
  }
});
