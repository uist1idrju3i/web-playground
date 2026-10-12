// WebKit 27.2 reports this native select shadow-DOM style as an inline violation.
export const WEBKIT_UA_STYLE_SAMPLES = new Set(['text-overflow:inherit']);
// WebKit mirrors each filtered user-agent style violation as this exact console error.
export const WEBKIT_UA_STYLE_CONSOLE_ERROR =
  "Refused to apply a stylesheet because its hash, its nonce, or 'unsafe-inline' does not appear in the style-src directive of the Content Security Policy.";

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

export function filterWebKitUaStyleDiagnostics(violations, consoleErrors, browserName) {
  const filteredViolations = filterWebKitUaStyleViolations(violations, browserName);
  let matchingReports = violations.length - filteredViolations.length;
  const filteredConsoleErrors = consoleErrors.filter((message) => {
    if (
      browserName === 'webkit' &&
      matchingReports > 0 &&
      message === WEBKIT_UA_STYLE_CONSOLE_ERROR
    ) {
      matchingReports -= 1;
      return false;
    }
    return true;
  });
  return { violations: filteredViolations, consoleErrors: filteredConsoleErrors };
}

export async function attachConsoleWarnings(testInfo, warnings) {
  if (warnings.length) {
    await testInfo.attach('console-warnings', {
      body: warnings.join('\n'),
      contentType: 'text/plain',
    });
  }
}
