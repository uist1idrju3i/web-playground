// Minimal context-isolated bridge. Sandboxed preloads must stay CommonJS and
// may only require 'electron'. The site itself is unchanged and does not
// consume this; it exists so native-only diagnostics are available to future
// pages without enabling nodeIntegration.

const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('nativeShell', {
  runtime: 'electron',
  versions: {
    electron: process.versions.electron,
    chrome: process.versions.chrome,
    node: process.versions.node,
  },
});
