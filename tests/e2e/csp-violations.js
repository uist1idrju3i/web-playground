// No CSP exceptions: WebKit fixed its user-agent select style report, so every
// securitypolicyviolation event and console error on any engine is fatal.
export async function attachConsoleWarnings(testInfo, warnings) {
  if (warnings.length) {
    await testInfo.attach('console-warnings', {
      body: warnings.join('\n'),
      contentType: 'text/plain',
    });
  }
}
