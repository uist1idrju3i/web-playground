import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const headersPath = fileURLToPath(new URL('../../public_html/_headers', import.meta.url));

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

function parseCsp(value) {
  return Object.fromEntries(
    value.split(';').map((directive) => {
      const [name, ...sources] = directive.trim().split(/\s+/);
      return [name, sources];
    }),
  );
}

test('locks the global CSP and security-header scopes', async () => {
  const blocks = parseHeaderBlocks(await readFile(headersPath, 'utf8'));
  const global = blocks.find(({ pattern }) => pattern === '/*');
  assert.ok(global);
  const csp = parseCsp(global.headers['content-security-policy']);
  assert.deepEqual(csp, {
    'default-src': ["'self'"],
    'script-src': [
      "'self'",
      "'wasm-unsafe-eval'",
      "'report-sample'",
      'https://cdnjs.cloudflare.com',
    ],
    'style-src': ["'self'", "'report-sample'", 'https://cdnjs.cloudflare.com'],
    'img-src': ["'self'", 'data:'],
    'connect-src': ["'self'"],
    'font-src': ["'self'"],
    'object-src': ["'none'"],
    'base-uri': ["'self'"],
    'frame-ancestors': ["'none'"],
  });

  for (const block of blocks) {
    const value = block.headers['content-security-policy'];
    if (!value) continue;
    const directives = parseCsp(value);
    for (const [name, sources] of Object.entries(directives)) {
      for (const source of sources) {
        assert.ok(!["'unsafe-inline'", "'unsafe-eval'", '*', 'http:', 'https:'].includes(source));
        if (source === 'data:') assert.equal(name, 'img-src');
        if (source.startsWith('https://')) assert.equal(source, 'https://cdnjs.cloudflare.com');
      }
    }
  }

  assert.equal(global.headers['x-content-type-options'], 'nosniff');
  assert.equal(global.headers['referrer-policy'], 'strict-origin-when-cross-origin');
  assert.equal(global.headers['cross-origin-resource-policy'], 'same-origin');
  const browserFeatures = blocks.find(({ pattern }) => pattern === '/browser-features/*');
  assert.equal(browserFeatures.headers['cross-origin-opener-policy'], 'same-origin');
  assert.equal(browserFeatures.headers['cross-origin-embedder-policy'], 'require-corp');
  assert.equal(
    blocks.find(({ pattern }) => pattern === '/*.wasm').headers['content-type'],
    'application/wasm',
  );
});
