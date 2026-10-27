import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PACKAGE_DIR = path.join(ROOT, 'node_modules/ace-builds');
const OUTPUT_DIR = path.join(ROOT, 'public_html/ace/vendor');
const PACKAGE_VERSION = '1.45.2';
const SCRIPT_FILES = [
  'ace.js',
  'ext-beautify.js',
  'ext-diff.js',
  'ext-language_tools.js',
  'ext-searchbox.js',
  'ext-settings_menu.js',
  'ext-statusbar.js',
  'keybinding-emacs.js',
  'keybinding-sublime.js',
  'keybinding-vim.js',
  'keybinding-vscode.js',
  'mode-css.js',
  'mode-html.js',
  'mode-javascript.js',
  'mode-json.js',
  'mode-markdown.js',
  'mode-python.js',
  'mode-ruby.js',
  'theme-chrome.js',
  'theme-tomorrow_night.js',
  'worker-base.js',
  'worker-css.js',
  'worker-html.js',
  'worker-javascript.js',
  'worker-json.js',
  'snippets/css.js',
  'snippets/html.js',
  'snippets/javascript.js',
  'snippets/json.js',
  'snippets/markdown.js',
  'snippets/python.js',
  'snippets/ruby.js',
  'snippets/snippets.js',
];
const CSS_FILES = [
  'ace.css',
  'theme/chrome.css',
  'theme/tomorrow_night.css',
  ...Array.from({ length: 4 }, (_, index) => `main-${index + 1}.png`),
  ...Array.from({ length: 8 }, (_, index) => `main-${index + 5}.svg`),
  ...Array.from({ length: 12 }, (_, index) => `main-${index + 13}.png`),
  'main-25.svg',
  'main-26.png',
  'chrome-1.png',
  'chrome-2.png',
  'tomorrow_night-1.png',
  'tomorrow_night-2.png',
];
const FILES = [
  { source: 'LICENSE', destination: 'LICENSE', type: 'text' },
  ...SCRIPT_FILES.map((file) => ({
    source: path.join('src-min-noconflict', file),
    destination: file,
    type: 'binary',
  })),
  ...CSS_FILES.map((file) => ({
    source: path.join('css', file),
    destination: path.join('css', file),
    type: file.endsWith('.css') ? 'css' : 'binary',
  })),
];

export function rewriteCssAssetUrls(css, sourcePath, destinationPath) {
  return css.replace(
    /url\(\s*(?:(["'])(.*?)\1|([^)]*?))\s*\)/gu,
    (match, quote, quotedUrl, unquotedUrl) => {
      const url = (quotedUrl ?? unquotedUrl).trim();
      if (/^(?:data:|#)/iu.test(url)) return match;
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/iu.test(url)) {
        throw new Error(`Ace CSS must not reference an external URL: ${url}`);
      }

      const cleanUrl = url.split(/[?#]/u, 1)[0];
      const sourceAsset = path.posix.normalize(
        path.posix.join(path.posix.dirname(sourcePath), cleanUrl),
      );
      if (sourceAsset.startsWith('../') || path.posix.isAbsolute(sourceAsset)) {
        throw new Error(`Ace CSS asset escapes its package directory: ${url}`);
      }
      const outputAsset = sourceAsset;
      const relativeUrl = path.posix.relative(path.posix.dirname(destinationPath), outputAsset);
      const suffix = url.slice(cleanUrl.length);
      return `url("${relativeUrl}${suffix}")`;
    },
  );
}

export function getAceVendorPlan() {
  return FILES.map((file) => ({ ...file }));
}

async function collectFiles(directory, prefix = '') {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory())
      files.push(...(await collectFiles(path.join(directory, entry.name), relative)));
    else files.push(relative);
  }
  return files.sort();
}

async function generatedContents(file) {
  const sourcePath = path.join(PACKAGE_DIR, file.source);
  if (file.type === 'css') {
    const css = await readFile(sourcePath, 'utf8');
    return Buffer.from(rewriteCssAssetUrls(css, file.source, file.destination));
  }
  return readFile(sourcePath);
}

async function writeVendorFiles() {
  const manifest = JSON.parse(await readFile(path.join(PACKAGE_DIR, 'package.json'), 'utf8'));
  if (manifest.version !== PACKAGE_VERSION) {
    throw new Error(`Expected ace-builds ${PACKAGE_VERSION}; found ${manifest.version}.`);
  }
  for (const file of FILES) {
    const destination = path.join(OUTPUT_DIR, file.destination);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, await generatedContents(file));
  }
}

async function checkVendorFiles() {
  const expected = new Set(FILES.map(({ destination }) => destination).sort());
  let actual = [];
  try {
    actual = await collectFiles(OUTPUT_DIR);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  const differences = [];
  for (const file of FILES) {
    const destination = path.join(OUTPUT_DIR, file.destination);
    let actualContent;
    try {
      actualContent = await readFile(destination);
    } catch {
      differences.push(`missing: ${file.destination}`);
      continue;
    }
    if (!actualContent.equals(await generatedContents(file))) {
      differences.push(`changed: ${file.destination}`);
    }
  }
  for (const file of actual) {
    if (!expected.has(file)) differences.push(`unexpected: ${file}`);
  }
  if (differences.length) {
    throw new Error(`Ace vendor files are out of date:\n${differences.join('\n')}`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
    throw new Error('Usage: node scripts/vendor-ace.mjs [--check]');
  }
  if (args[0] === '--check') {
    await checkVendorFiles();
    console.log(`Ace ${PACKAGE_VERSION} vendor files are current (${FILES.length} files).`);
  } else {
    await writeVendorFiles();
    console.log(`Vendored Ace ${PACKAGE_VERSION} (${FILES.length} files).`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
