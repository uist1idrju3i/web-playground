import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  contentTypeFor,
  headersFor,
  matchesPattern,
  resolveInside,
  serveDirectory,
} from '../../native/electron/serve.mjs';

const headersPath = fileURLToPath(new URL('../../public_html/_headers', import.meta.url));
const specPath = fileURLToPath(new URL('../../native/headers.json', import.meta.url));
const publicRoot = fileURLToPath(new URL('../../public_html/', import.meta.url));

function parseHeaderBlocks(source) {
  const blocks = [];
  let current;
  for (const line of source.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: {} };
      blocks.push(current);
    } else if (current) {
      const separator = line.indexOf(':');
      if (separator > -1) {
        current.headers[line.slice(0, separator).trim().toLowerCase()] = line
          .slice(separator + 1)
          .trim();
      }
    }
  }
  return blocks;
}

test('native/headers.json mirrors public_html/_headers', async () => {
  const [headersSource, specSource] = await Promise.all([
    readFile(headersPath, 'utf8'),
    readFile(specPath, 'utf8'),
  ]);
  const spec = JSON.parse(specSource);
  const blocks = parseHeaderBlocks(headersSource);

  const global = blocks.find((block) => block.pattern === '/*');
  assert.ok(global, '_headers must define a /* block');
  assert.deepEqual(
    Object.fromEntries(Object.entries(spec.global).map(([k, v]) => [k.toLowerCase(), v])),
    global.headers,
    'spec.global must equal the _headers /* block',
  );

  // Every _headers block after /* maps to a spec rule. The _headers syntax
  // "/*.ext" is written "*.ext" in the spec; path rules keep their slash.
  const rules = spec.rules ?? [];
  for (const block of blocks.filter((b) => b.pattern !== '/*')) {
    const pattern = block.pattern.startsWith('/*') ? block.pattern.slice(1) : block.pattern;
    const rule = rules.find((r) => r.pattern === pattern);
    assert.ok(rule, `no spec rule for _headers pattern ${block.pattern}`);
    for (const [name, value] of Object.entries(block.headers)) {
      if (name.toLowerCase() === 'content-type') {
        assert.equal(
          rule.contentType,
          value,
          `rule ${rule.pattern} contentType must equal _headers Content-Type`,
        );
      } else {
        assert.ok(rule.headers, `rule ${rule.pattern} lacks headers`);
        const specValue = Object.entries(rule.headers).find(
          ([k]) => k.toLowerCase() === name.toLowerCase(),
        )?.[1];
        assert.equal(specValue, value, `rule ${rule.pattern} header ${name} mismatch`);
      }
    }
  }
});

test('matchesPattern supports exact, prefix, and extension patterns', () => {
  assert.ok(matchesPattern('/browser-features/app.js', '/browser-features/*'));
  assert.ok(matchesPattern('/browser-features', '/browser-features/*'));
  assert.ok(!matchesPattern('/library/wasm-probe.js', '/browser-features/*'));
  assert.ok(matchesPattern('/a/b/c.wasm', '*.wasm'));
  assert.ok(!matchesPattern('/a/b/c.wasm.map', '*.wasm'));
  assert.ok(matchesPattern('/library/js/wasm-probe-worker.js', '/library/js/wasm-probe-worker.js'));
});

test('headersFor merges global headers with matching rules', async () => {
  const spec = JSON.parse(await readFile(specPath, 'utf8'));
  const merged = headersFor('/browser-features/index.html', spec);
  assert.equal(merged['Cross-Origin-Opener-Policy'], 'same-origin');
  assert.equal(merged['Cross-Origin-Embedder-Policy'], 'require-corp');
  assert.equal(merged['X-Content-Type-Options'], 'nosniff');
  assert.ok(merged['Content-Security-Policy'].includes("'wasm-unsafe-eval'"));
  const plain = headersFor('/index.html', spec);
  assert.equal(plain['Cross-Origin-Opener-Policy'], undefined);
  assert.equal(plain['Content-Security-Policy'], merged['Content-Security-Policy']);
});

test('contentTypeFor honours the .wasm rule and extension table', async () => {
  const spec = JSON.parse(await readFile(specPath, 'utf8'));
  assert.equal(contentTypeFor('/x/probe.wasm', spec), 'application/wasm');
  assert.equal(contentTypeFor('/x/app.js', spec), 'text/javascript; charset=utf-8');
  assert.equal(contentTypeFor('/x/index.html', spec), 'text/html; charset=utf-8');
  assert.equal(contentTypeFor('/x/unknown.bin', spec), 'application/octet-stream');
});

test('resolveInside stays inside the root and serves index.html', () => {
  const root = '/srv/public';
  assert.equal(resolveInside(root, '/'), '/srv/public/index.html');
  assert.equal(
    resolveInside(root, '/browser-features/'),
    '/srv/public/browser-features/index.html',
  );
  assert.equal(resolveInside(root, '/a/b.js'), '/srv/public/a/b.js');
  // ".." segments clamp at the root rather than escaping it.
  assert.equal(resolveInside(root, '/../secrets'), '/srv/public/secrets');
  assert.equal(resolveInside(root, '/%2e%2e/secrets'), '/srv/public/secrets');
  assert.equal(resolveInside(root, '/a/../../b.js'), '/srv/public/b.js');
  assert.equal(resolveInside(root, '/%ff'), null);
});

test('serveDirectory serves the real site with _headers semantics', async (t) => {
  const spec = JSON.parse(await readFile(specPath, 'utf8'));
  const { server, origin } = await serveDirectory(publicRoot, spec);
  t.after(() => server.close());

  const page = await fetch(`${origin}/browser-features/`);
  assert.equal(page.status, 200);
  assert.equal(page.headers.get('cross-origin-opener-policy'), 'same-origin');
  assert.equal(page.headers.get('cross-origin-embedder-policy'), 'require-corp');
  assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
  assert.match(page.headers.get('content-type') ?? '', /text\/html/);
  const body = await page.text();
  assert.ok(body.includes('Browser Features'), 'index page must render');

  const wasmPath = '/library/wasm/capability-probes.wasm';
  const wasmExists = await stat(resolveInside(publicRoot, wasmPath)).then(
    (info) => info.isFile(),
    () => false,
  );
  if (wasmExists) {
    const wasm = await fetch(`${origin}${wasmPath}`);
    assert.equal(wasm.headers.get('content-type'), 'application/wasm');
  }

  const traversal = await fetch(`${origin}/%2e%2e/etc/passwd`);
  assert.ok([403, 404].includes(traversal.status));

  const post = await fetch(`${origin}/index.html`, { method: 'POST' });
  assert.equal(post.status, 405);
});
