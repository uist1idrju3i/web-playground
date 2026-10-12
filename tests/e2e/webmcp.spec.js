import { expect, test } from '@playwright/test';

test('WebMCP exposes the browser feature tools in Chromium', async ({ browserName, baseURL }) => {
  test.skip(browserName !== 'chromium', 'WebMCP is enabled only in the Chromium project.');
  const { chromium } = await import('@playwright/test');
  const browser = await chromium.launch({ args: ['--enable-features=WebMCP'] });
  try {
    const page = await browser.newPage();
    await page.goto(new URL('/browser-features/', baseURL).href);
    if (!page.webmcp) {
      test.skip(
        true,
        'This headless Chromium build does not expose page.webmcp with --enable-features=WebMCP.',
      );
    }
    const tools = await page.webmcp.tools();
    const toolNames = tools.map(({ name }) => name);
    expect(toolNames).toEqual(
      expect.arrayContaining([
        'get_browser_environment',
        'get_feature_support',
        'get_highlight_capabilities',
      ]),
    );
    const result = await page.webmcp.callTool('get_highlight_capabilities', {});
    const text = result.content.find(({ type }) => type === 'text')?.text;
    expect(() => JSON.parse(text)).not.toThrow();
  } finally {
    await browser.close();
  }
});
