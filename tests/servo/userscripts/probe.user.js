// Injected into every page load by servoshell --userscripts.
// Collects CSP violations and page errors into window.__probe for the
// WebDriver-driven assertions in run.mjs. Keep dependency-free.
(function () {
  window.__probe = { violations: [], errors: [] };
  window.addEventListener('securitypolicyviolation', (event) => {
    window.__probe.violations.push({
      directive: event.violatedDirective,
      blockedURI: event.blockedURI,
      sample: event.sample,
      sourceFile: event.sourceFile,
      line: event.lineNumber,
    });
  });
  window.addEventListener('error', (event) => {
    window.__probe.errors.push(String(event.message));
  });
  window.addEventListener('unhandledrejection', (event) => {
    window.__probe.errors.push(`unhandledrejection: ${String(event.reason)}`);
  });
})();
