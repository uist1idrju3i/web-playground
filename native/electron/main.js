// Electron shell for Web Playground's Browser Features app.
// Serves the unmodified public_html/ tree over a loopback HTTP server so
// absolute paths, ES modules, fetch, Workers, COOP/COEP isolation and the
// site's security headers behave exactly like the deployed site. Loopback is
// a secure context, so clipboard/storage APIs work the same as on the web.

import { BrowserWindow, app, shell } from 'electron';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serveDirectory } from './serve.mjs';

const shellDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = app.isPackaged ? process.resourcesPath : join(shellDir, '..', '..');
const headerSpec = JSON.parse(await readFile(join(repoRoot, 'native', 'headers.json'), 'utf8'));
const publicRoot = join(repoRoot, 'public_html');

const { origin } = await serveDirectory(publicRoot, headerSpec);
const homeUrl = `${origin}/browser-features/`;

app.whenReady().then(() => {
  const window = new BrowserWindow({
    width: 1280,
    height: 900,
    title: 'Browser Features',
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(shellDir, 'preload.cjs'),
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  const { webContents } = window;
  webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://') || url.startsWith(origin)) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });
  webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(origin)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
  webContents.session.setPermissionRequestHandler((_contents, _permission, callback) => {
    callback(false);
  });
  webContents.session.on('will-download', (_event, item) => {
    item.setSavePath(join(app.getPath('downloads'), item.getFilename()));
  });

  window.loadURL(homeUrl);
});
