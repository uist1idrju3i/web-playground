import { createReadStream, promises as fs } from 'node:fs';
import { createServer } from 'node:http';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('../public_html/', import.meta.url)));
const fixtureRoot = resolve(fileURLToPath(new URL('../tests/e2e/fixtures/', import.meta.url)));
const headersFile = resolve(root, '_headers');
const headersText = await fs.readFile(headersFile, 'utf8');
const contentTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.ico', 'image/x-icon'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.md', 'text/markdown; charset=utf-8'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

function globToRegExp(glob) {
  const escaped = glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*');
  return new RegExp(`^${escaped}$`);
}

function parseHeaderRules(contents) {
  const rules = [];
  let current;
  for (const line of contents.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('#')) continue;
    if (!/^\s/.test(line)) {
      current = { pattern: line.trim(), headers: {} };
      rules.push(current);
    } else if (current) {
      const separator = line.indexOf(':');
      if (separator > -1) {
        current.headers[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
      }
    }
  }
  return rules.map((rule) => ({ ...rule, matcher: globToRegExp(rule.pattern) }));
}

const headerRules = parseHeaderRules(headersText);

function resolveRequestPath(requestPath, base) {
  const decoded = decodeURIComponent(requestPath);
  const target = resolve(base, `.${decoded}`);
  return target === base || target.startsWith(`${base}${sep}`) ? target : null;
}

function responseHeaders(pathname) {
  const headers = {
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Content-Security-Policy':
      "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  };
  for (const rule of headerRules) {
    if (rule.matcher.test(pathname)) Object.assign(headers, rule.headers);
  }
  return headers;
}

async function findFile(pathname) {
  const isFixture = pathname.startsWith('/__tests__/');
  const base = isFixture ? fixtureRoot : root;
  const localPath = isFixture ? pathname.slice('/__tests__'.length) : pathname;
  let target = resolveRequestPath(localPath, base);
  if (!target) return null;
  try {
    let stat = await fs.stat(target);
    if (stat.isDirectory()) {
      target = resolve(target, 'index.html');
      stat = await fs.stat(target);
    }
    return stat.isFile() ? target : null;
  } catch {
    return null;
  }
}

const server = createServer(async (request, response) => {
  let pathname;
  try {
    pathname = new URL(request.url, 'http://localhost').pathname;
  } catch {
    response.writeHead(400).end('Bad request');
    return;
  }

  if (pathname.startsWith('/__tests__/')) {
    const fixture = await findFile(pathname);
    if (!fixture) {
      response.writeHead(404).end('Not found');
      return;
    }
    response.writeHead(200, {
      'Content-Type': contentTypes.get(extname(fixture)) ?? 'application/octet-stream',
      ...responseHeaders(pathname),
    });
    createReadStream(fixture).pipe(response);
    return;
  }

  const filename = await findFile(pathname);
  const notFound = filename ? null : resolve(root, '404.html');
  const servedFile = filename ?? notFound;
  if (!servedFile) {
    response.writeHead(404).end('Not found');
    return;
  }
  response.writeHead(filename ? 200 : 404, {
    'Content-Type': contentTypes.get(extname(servedFile)) ?? 'application/octet-stream',
    ...responseHeaders(pathname),
  });
  createReadStream(servedFile).pipe(response);
});

const port = Number(process.env.PORT ?? 4173);
const host = process.env.HOST ?? '127.0.0.1';
server.listen(port, host, () => {
  console.log(`Static server listening on http://${host}:${port}`);
});
