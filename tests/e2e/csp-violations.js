// WebKit 27.2 reports this native select shadow-DOM style as an inline violation.
export const WEBKIT_UA_STYLE_SAMPLES = new Set(['text-overflow:inherit']);

export function filterWebKitUaStyleViolations(violations, browserName) {
  return violations.filter(
    ({ directive, blockedURI, sample }) =>
      !(
        browserName === 'webkit' &&
        directive === 'style-src-attr' &&
        blockedURI === 'inline' &&
        WEBKIT_UA_STYLE_SAMPLES.has(sample)
      ),
  );
}

export async function attachConsoleWarnings(testInfo, warnings) {
  if (warnings.length) {
    await testInfo.attach('console-warnings', {
      body: warnings.join('\n'),
      contentType: 'text/plain',
    });
  }
}
