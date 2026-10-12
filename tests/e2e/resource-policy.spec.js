import { existsSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect, test } from '@playwright/test';

const publicRoot = fileURLToPath(new URL('../../public_html/', import.meta.url));
const cdnjsPath = /^\/ajax\/libs\/[^/]+\/\d+\.\d+\.\d+\//;

function htmlPages(directory = publicRoot) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return htmlPages(path);
    if (!entry.isFile() || !['.html', '.htm'].includes(path.slice(path.lastIndexOf('.')))) {
      return [];
    }
    const relativePath = relative(publicRoot, path).split(sep).join('/');
    if (relativePath === 'index.html') return ['/'];
    if (relativePath.endsWith('/index.html')) return [`/${relativePath.slice(0, -10)}`];
    return [`/${relativePath}`];
  });
}

const pages = htmlPages();
const appPaths = readdirSync(publicRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory() && existsSync(join(publicRoot, entry.name, 'index.html')))
  .map((entry) => `/${entry.name}/`);

for (const path of pages) {
  test(`static resource policy: ${path}`, async ({ browser, baseURL }) => {
    const context = await browser.newContext();
    const page = await context.newPage();
    const allowedOrigin = new URL(baseURL).origin;
    const externalRequests = new Set();
    const cspViolations = [];
    const pageErrors = [];
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
        });
      });
    });
    page.on('websocket', (socket) => {
      const url = new URL(socket.url());
      if (url.origin !== allowedOrigin) externalRequests.add(url.href);
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    try {
      await page.goto(path, { waitUntil: 'load' });
      await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
      cspViolations.push(...(await page.evaluate(() => window.__resourcePolicyViolations)));
      expect(
        {
          externalRequests: [...externalRequests],
          cspViolations,
          pageErrors,
        },
        path,
      ).toEqual({ externalRequests: [], cspViolations: [], pageErrors: [] });
    } finally {
      await context.close();
    }
  });
}

test('portal links resolve and every app index is registered', async ({ page, baseURL }) => {
  await page.goto('/');
  const links = await page.locator('a[href]').evaluateAll((anchors) =>
    anchors.map((anchor) => anchor.href),
  );
  const origin = new URL(baseURL).origin;
  const internalLinks = [...new Set(links.filter((href) => new URL(href).origin === origin))];
  for (const appPath of appPaths) {
    expect(links.map((href) => new URL(href).pathname)).toContain(appPath);
  }
  for (const href of internalLinks) {
    const response = await page.request.get(href);
    expect(response.status(), href).toBeLessThan(400);
  }
});
