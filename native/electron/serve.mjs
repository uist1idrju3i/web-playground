// Shared static-asset serving logic for the native shells. Kept free of
// Electron APIs so tests/unit can exercise it with plain Node. The Electron
// shell binds a loopback HTTP server to it; Tauri and Wails re-implement the
// same semantics in Rust and Go.

import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.map', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.ico', 'image/x-icon'],
  ['.txt', 'text/plain; charset=utf-8'],
  ['.webmanifest', 'application/manifest+json'],
  ['.woff2', 'font/woff2'],
]);

/**
 * Matches a _headers-style pattern against a request path.
 * - "/dir/*" matches everything under /dir/
 * - "*.ext" matches by file extension
 * - anything else is an exact match
 */
export function matchesPattern(path, pattern) {
  if (pattern.startsWith('*.')) return path.endsWith(pattern.slice(1));
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -1);
    return path === prefix.slice(0, -1) || path.startsWith(prefix);
  }
  return path === pattern;
}

/**
 * Collects the headers that apply to a request path: the global set plus every
 * rule whose pattern matches. Returns a plain object.
 */
export function headersFor(path, spec) {
  const headers = { ...spec.global };
  for (const rule of spec.rules ?? []) {
    if (rule.headers && matchesPattern(path, rule.pattern)) Object.assign(headers, rule.headers);
  }
  return headers;
}

/**
 * Content type for a file path. Rules in headers.json can override the table
 * (the .wasm -> application/wasm rule comes from _headers).
 */
export function contentTypeFor(path, spec) {
  for (const rule of spec.rules ?? []) {
    if (rule.contentType && matchesPattern(path, rule.pattern)) return rule.contentType;
  }
  const type = contentTypes.get(extname(path).toLowerCase());
  return type ?? 'application/octet-stream';
}

/**
 * Maps a request path to a file inside root. Returns null when the path would
 * escape the root (traversal) or has no URL-safe decode.
 */
export function resolveInside(root, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(urlPath);
  } catch {
    return null;
  }
  const normalizedRoot = resolve(root);
  let relative = normalize(decoded).replace(/^([/\\])+/, '');
  if (relative === '' || relative.endsWith(sep)) relative = join(relative, 'index.html');
  const candidate = resolve(normalizedRoot, relative);
  if (candidate !== normalizedRoot && !candidate.startsWith(normalizedRoot + sep)) return null;
  return candidate;
}

/**
 * Serves root on a random loopback port with the _headers-equivalent rules.
 * Returns { server, origin } once listening.
 */
export async function serveDirectory(root, spec) {
  const server = createServer((request, response) => {
    const { method, url } = request;
    if (method !== 'GET' && method !== 'HEAD') {
      response.writeHead(405).end('Method not allowed');
      return;
    }
    const { pathname } = new URL(url, 'http://localhost');
    const filePath = resolveInside(root, pathname);
    const send = (status, message) => response.writeHead(status).end(message);
    if (filePath === null) return send(403, 'Forbidden');
    stat(filePath)
      .then((info) => {
        if (!info.isFile()) return send(404, 'Not found');
        const headers = headersFor(pathname, spec);
        headers['Content-Type'] = contentTypeFor(filePath, spec);
        headers['Content-Length'] = info.size;
        response.writeHead(200, headers);
        if (method === 'HEAD') return response.end();
        createReadStream(filePath).pipe(response);
      })
      .catch(() => send(404, 'Not found'));
  });
  await new Promise((resolveListen, rejectListen) => {
    server.once('error', rejectListen);
    server.listen(0, '127.0.0.1', resolveListen);
  });
  const { port } = server.address();
  return { server, origin: `http://127.0.0.1:${port}` };
}
