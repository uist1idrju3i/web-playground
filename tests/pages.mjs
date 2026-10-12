import { existsSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const publicRoot = fileURLToPath(new URL('../public_html/', import.meta.url));
export const cdnjsPath = /^\/ajax\/libs\/[^/]+\/\d+\.\d+\.\d+\//;

export function htmlPages(directory = publicRoot) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return htmlPages(path);
    if (!entry.isFile() || !['.html', '.htm'].includes(path.slice(path.lastIndexOf('.')))) {
      return [];
    }
    const relativePath = relative(publicRoot, path).split(sep).join('/');
    if (relativePath === 'index.html') return ['/'];
    if (relativePath.endsWith('/index.html')) return [`/${relativePath.slice(0, -10)}`];
    return [`/${relativePath}`];
  });
}

export function appPaths(root = publicRoot) {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(root, entry.name, 'index.html')))
    .map((entry) => `/${entry.name}/`);
}
