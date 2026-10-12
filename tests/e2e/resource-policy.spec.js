import { expect, test } from '@playwright/test';
import { appPaths, cdnjsPath, htmlPages } from '../pages.mjs';
import {
  attachConsoleWarnings,
  filterWebKitUaStyleDiagnostics,
  WEBKIT_UA_STYLE_CONSOLE_ERROR,
  WEBKIT_UA_STYLE_SAMPLES,
} from './csp-violations.js';

const pages = htmlPages();
const apps = appPaths();

for (const path of pages) {
  test(`static resource policy: ${path}`, async ({ browser, browserName, baseURL }, testInfo) => {
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
      const diagnostics = filterWebKitUaStyleDiagnostics(
        await page.evaluate(() => window.__resourcePolicyViolations),
        consoleErrors,
        browserName,
      );
      cspViolations.push(...diagnostics.violations);
      await attachConsoleWarnings(testInfo, consoleWarnings);
      expect(
        {
          externalRequests: [...externalRequests],
          cspViolations,
          pageErrors,
          consoleErrors: diagnostics.consoleErrors,
        },
        path,
      ).toEqual({ externalRequests: [], cspViolations: [], pageErrors: [], consoleErrors: [] });
    } finally {
      await context.close();
    }
  });
}

test('WebKit user-agent style CSP canary remains exact-match', async ({
  browserName,
  page,
  baseURL,
}) => {
  test.skip(
    browserName !== 'webkit',
    'This canary verifies WebKit-specific native select behavior.',
  );
  await page.addInitScript(() => {
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
  const consoleErrors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  await page.goto(new URL('/__tests__/webkit-select-csp.html', baseURL).href);
  // Violation events are delivered asynchronously after load; wait for them.
  // If WebKit stops emitting this violation the poll times out and the canary
  // still fails, which is the signal this test exists to detect.
  await expect
    .poll(() => page.evaluate(() => window.__resourcePolicyViolations.length), {
      timeout: 8000,
    })
    .toBeGreaterThan(0);
  const violations = await page.evaluate(() => window.__resourcePolicyViolations);
  expect(
    violations.every(
      ({ directive, blockedURI }) => directive === 'style-src-attr' && blockedURI === 'inline',
    ),
  ).toBe(true);
  expect([...new Set(violations.map(({ sample }) => sample))].sort()).toEqual(
    [...WEBKIT_UA_STYLE_SAMPLES].sort(),
  );
  await expect
    .poll(() => consoleErrors.length, { timeout: 8000 })
    .toBe(violations.length);
  expect(consoleErrors).toEqual(Array(violations.length).fill(WEBKIT_UA_STYLE_CONSOLE_ERROR));
});

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
