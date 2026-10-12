// Servo end-to-end checks driven over the W3C WebDriver subset that
// servoshell implements (sync execute only, one session per process).
//
// Assertions stay deterministic: navigation succeeds, the page renders,
// every fetched resource stays on the allowed origins, no CSP violation
// targets a disallowed URL, and servoshell itself does not crash.
// Servo-reported 'inline' CSP violations (UA/author-stylesheet noise) and
// page errors are recorded as diagnostics, not failures.
import assert from 'node:assert/strict';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { appPaths, cdnjsPath, htmlPages } from '../pages.mjs';
import { WebDriver } from './webdriver.mjs';

const servoDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = join(servoDir, '..', '..');
const resultsDir = join(repoRoot, 'test-results', 'servo');
const binary = process.env.SERVO_BINARY ?? join(servoDir, 'bin', 'servo', 'servoshell');
const baseURL = process.env.SERVO_BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL ?? null;

// App-level render expectations keyed by app path: an expression that must
// evaluate to a positive number once the app finished rendering verdicts.
const APP_CHECKS = {
  '/browser-features/': `document.querySelectorAll('.status-chip').length`,
};

const PAGE_PROBE = `return JSON.stringify({
  title: document.title,
  readyState: document.readyState,
  resources: [...new Set(performance.getEntriesByType('resource').map((e) => e.name))],
  bodyLength: document.body ? document.body.innerText.length : 0,
  probe: window.__probe || null,
})`;

function pageSlug(path) {
  const slug = path
    .replace(/\.html$/, '')
    .replace(/\/+$/, '')
    .replace(/\//g, '-');
  return slug === '/' || slug === '' ? 'index' : slug.replace(/^-/, '');
}

function originAllowed(href, allowedOrigin) {
  if (href.startsWith('data:') || href.startsWith('blob:')) return true;
  try {
    const url = new URL(href);
    return (
      url.origin === allowedOrigin ||
      (url.origin === 'https://cdnjs.cloudflare.com' && cdnjsPath.test(url.pathname))
    );
  } catch {
    return false;
  }
}

async function freePort() {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address();
  await new Promise((resolve) => server.close(resolve));
  return port;
}

async function waitForHttp(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    if (Date.now() > deadline) throw new Error(`Timed out waiting for ${url}`);
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
}

const servoshellReady = existsSync(binary);
test(
  'servoshell end-to-end',
  {
    skip: servoshellReady
      ? false
      : `servoshell binary not found at ${binary}; run node scripts/fetch-servo.mjs`,
  },
  async (t) => {
    mkdirSync(resultsDir, { recursive: true });
    const version = execFileSync(binary, ['--version'], { encoding: 'utf8' }).trim();
    let origin;
    let serverProcess;
    if (baseURL) {
      origin = new URL(baseURL).origin;
    } else {
      serverProcess = spawn(process.execPath, [join(repoRoot, 'scripts', 'serve.mjs')], {
        stdio: 'ignore',
      });
      origin = 'http://127.0.0.1:4173';
      await waitForHttp(origin);
    }

    const port = await freePort();
    const servoLog = [];
    let earlyExitCode = null;
    let cleaningUp = false;
    const servo = spawn(binary, [
      '--headless',
      `--webdriver=${port}`,
      '--hard-fail',
      '--screen-size=1280x900',
      `--userscripts=${join(servoDir, 'userscripts')}`,
    ]);
    servo.stderr.on('data', (chunk) => servoLog.push(chunk.toString()));
    servo.stdout.on('data', (chunk) => servoLog.push(chunk.toString()));
    const servoExit = new Promise((resolve) =>
      servo.on('exit', (code) => {
        if (!cleaningUp) earlyExitCode = code;
        resolve(code);
      }),
    );

    const driver = new WebDriver({ port });
    const diagnostics = { version, origin, pages: {} };
    try {
      await driver.waitForStatus();
      await driver.newSession();
      await driver.setTimeouts({ script: 30000, pageLoad: 60000 });

      for (const path of htmlPages()) {
        await t.test(`page ${path}`, async () => {
          await driver.navigateTo(`${origin}${path}`);
          const deadline = Date.now() + 15000;
          for (;;) {
            const ready = await driver.executeSync('return document.readyState');
            if (ready === 'complete' || Date.now() > deadline) break;
            await new Promise((resolve) => setTimeout(resolve, 250));
          }
          // Short settle window for dynamic app code, like networkidle.
          await new Promise((resolve) => setTimeout(resolve, 1000));
          const snapshot = JSON.parse(await driver.executeSync(PAGE_PROBE));

          assert.notEqual(snapshot.title, '', `${path} has an empty title`);
          assert.equal(
            snapshot.readyState,
            'complete',
            `${path} never reached readyState complete`,
          );
          assert.ok(snapshot.bodyLength > 0, `${path} rendered an empty body`);

          const external = snapshot.resources.filter((href) => !originAllowed(href, origin));
          assert.deepEqual(external, [], `${path} fetched disallowed origins: ${external}`);

          const probe = snapshot.probe ?? { violations: [], errors: [] };
          const urlViolations = probe.violations.filter(({ blockedURI }) => {
            if (!blockedURI || blockedURI === 'inline' || blockedURI === 'eval') return false;
            return !originAllowed(blockedURI, origin);
          });
          assert.deepEqual(
            urlViolations,
            [],
            `${path} reported CSP violations against disallowed URLs`,
          );

          if (APP_CHECKS[path]) {
            const verdicts = await driver.executeSync(`return ${APP_CHECKS[path]}`);
            assert.ok(verdicts > 0, `${path} produced no verdict chips`);
          }

          writeFileSync(join(resultsDir, `${pageSlug(path)}.png`), await driver.screenshot());
          diagnostics.pages[path] = {
            title: snapshot.title,
            resources: snapshot.resources.length,
            inlineCspViolations: probe.violations.length - urlViolations.length,
            pageErrors: probe.errors,
          };
        });
      }

      const uncheckedApps = appPaths().filter((path) => !(path in APP_CHECKS));
      if (uncheckedApps.length) diagnostics.uncheckedApps = uncheckedApps;
      writeFileSync(join(resultsDir, 'diagnostics.json'), JSON.stringify(diagnostics, null, 2));
    } finally {
      await driver.deleteSession().catch(() => {});
      cleaningUp = true;
      // servoshell ignores SIGTERM; SIGINT triggers a clean shutdown request.
      servo.kill('SIGINT');
      const exited = await Promise.race([
        servoExit.then(() => true),
        new Promise((resolve) => setTimeout(() => resolve(false), 5000)),
      ]);
      if (!exited) {
        servo.kill('SIGKILL');
        await Promise.race([servoExit, new Promise((resolve) => setTimeout(resolve, 3000))]);
      }
      writeFileSync(join(resultsDir, 'servoshell.log'), servoLog.join(''));
      serverProcess?.kill('SIGKILL');
      assert.equal(
        earlyExitCode,
        null,
        `servoshell exited early with code ${earlyExitCode}; see test-results/servo/servoshell.log`,
      );
    }
  },
);
