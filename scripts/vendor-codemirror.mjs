import { parse } from 'acorn';
import { simple } from 'acorn-walk';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const packageRoot = join(repoRoot, 'node_modules');
const outputRoot = join(repoRoot, 'public_html', 'codemirror', 'vendor');

// These entries are the ESM entry points used by the lab. Most packages expose
// dist/index.js; the smaller utility packages and Ruby legacy mode expose the
// module path advertised by their package metadata.
export const vendorModules = [
  ['@codemirror/state', 'dist/index.js'],
  ['@codemirror/view', 'dist/index.js'],
  ['@codemirror/commands', 'dist/index.js'],
  ['@codemirror/language', 'dist/index.js'],
  ['@codemirror/autocomplete', 'dist/index.js'],
  ['@codemirror/search', 'dist/index.js'],
  ['@codemirror/lint', 'dist/index.js'],
  ['@codemirror/merge', 'dist/index.js'],
  ['@codemirror/lang-javascript', 'dist/index.js'],
  ['@codemirror/lang-html', 'dist/index.js'],
  ['@codemirror/lang-css', 'dist/index.js'],
  ['@codemirror/lang-json', 'dist/index.js'],
  ['@codemirror/lang-markdown', 'dist/index.js'],
  ['@codemirror/legacy-modes/mode/ruby', 'mode/ruby.js'],
  ['@codemirror/streamparser', 'dist/index.js'],
  ['@lezer/common', 'dist/index.js'],
  ['@lezer/highlight', 'dist/index.js'],
  ['@lezer/lr', 'dist/index.js'],
  ['@lezer/javascript', 'dist/index.js'],
  ['@lezer/css', 'dist/index.js'],
  ['@lezer/html', 'dist/index.js'],
  ['@lezer/json', 'dist/index.js'],
  ['@lezer/markdown', 'dist/index.js'],
  ['style-mod', 'src/style-mod.js'],
  ['w3c-keyname', 'index.js'],
  ['crelt', 'index.js'],
  ['@marijn/find-cluster-break', 'src/index.js'],
  ['@replit/codemirror-vim', 'dist/index.js'],
  ['@replit/codemirror-vim-core', 'vim.js'],
];

export const vendorPatches = [
  {
    file: '@codemirror-autocomplete.js',
    find: 'return new RegExp(`[\\w${escaped}]`, "g");',
    replace: 'return new RegExp(`[\\\\w${escaped}]`, "g");',
    reason:
      'Template literal drops the backslash, so the fallback class matches the letter w instead of word characters (CodeQL js/useless-regexp-character-escape); unreachable where Unicode property escapes are supported; present in @codemirror/autocomplete 6.20.4.',
    upstream: 'https://code.haverbeke.berlin/codemirror/autocomplete',
  },
];

function packageName(specifier) {
  if (specifier.startsWith('@')) return specifier.split('/').slice(0, 2).join('/');
  return specifier.split('/')[0];
}

function fileName(specifier) {
  return `${specifier.replaceAll('/', '-')}.js`;
}

function packageDirectory(name) {
  return join(packageRoot, ...packageName(name).split('/'));
}

function targetPath(specifier) {
  return join(outputRoot, fileName(specifier));
}

function importLiteral(node, source) {
  if (!node || node.type !== 'Literal' || typeof node.value !== 'string') {
    throw new Error(`Non-literal module specifier in ${source}`);
  }
  return node;
}

function moduleReferences(ast) {
  const nodes = [];
  for (const statement of ast.body) {
    if (
      statement.type === 'ImportDeclaration' ||
      statement.type === 'ExportAllDeclaration' ||
      statement.type === 'ExportNamedDeclaration'
    ) {
      if (statement.source) nodes.push(statement.source);
    }
  }
  simple(ast, {
    ImportExpression(node) {
      if (node.source) nodes.push(node.source);
    },
  });
  return nodes;
}

export function rewriteModuleSource(source, sourceName, specifierTargets = new Map()) {
  let ast;
  try {
    ast = parse(source, { ecmaVersion: 'latest', sourceType: 'module' });
  } catch (error) {
    throw new Error(`Unable to parse ESM source ${sourceName}: ${error.message}`, {
      cause: error,
    });
  }
  const hasModuleSyntax = ast.body.some((statement) =>
    [
      'ImportDeclaration',
      'ExportAllDeclaration',
      'ExportDefaultDeclaration',
      'ExportNamedDeclaration',
    ].includes(statement.type),
  );
  if (!hasModuleSyntax) {
    throw new Error(
      `Expected ESM source for ${sourceName}, but no import/export syntax was found.`,
    );
  }

  const replacements = [];
  for (const node of moduleReferences(ast)) {
    const literal = importLiteral(node, sourceName);
    const specifier = literal.value;
    if (
      specifier.startsWith('.') ||
      specifier.startsWith('/') ||
      specifier.startsWith('#') ||
      /^[a-z][a-z\d+.-]*:/iu.test(specifier)
    ) {
      continue;
    }
    const target = specifierTargets.get(specifier);
    if (!target) {
      throw new Error(`Unresolved bare specifier "${specifier}" in ${sourceName}.`);
    }
    const relativePath = relative(dirname(targetPath(sourceName)), targetPath(target)).replaceAll(
      '\\',
      '/',
    );
    const rewritten = relativePath.startsWith('.') ? relativePath : `./${relativePath}`;
    const quote = source[literal.start];
    replacements.push({
      start: literal.start,
      end: literal.end,
      text: `${quote}${rewritten}${quote}`,
    });
  }
  let rewritten = source;
  for (const replacement of replacements.reverse()) {
    rewritten =
      rewritten.slice(0, replacement.start) + replacement.text + rewritten.slice(replacement.end);
  }
  const lineEnding = rewritten.includes('\r\n') ? '\r\n' : '\n';
  return rewritten.replace(/[ \t]+(?=\r?$)/gmu, '').replace(/(?:\r?\n)+$/u, '') + lineEnding;
}

export function applyVendorPatches(generated, patches = vendorPatches) {
  const patched = new Map(generated);
  for (const patch of patches) {
    if (!patched.has(patch.file)) {
      throw new Error(`Vendor patch target is missing: ${patch.file} (${patch.upstream}).`);
    }
    const source = patched.get(patch.file);
    const matchCount = source.split(patch.find).length - 1;
    if (matchCount !== 1) {
      throw new Error(
        `Vendor patch ${patch.file} (${patch.upstream}) matched ${matchCount} times; expected exactly once.`,
      );
    }
    patched.set(patch.file, source.replace(patch.find, patch.replace));
  }
  return generated.map(([file]) => [file, patched.get(file)]);
}

async function packageManifest(name) {
  const path = join(packageDirectory(name), 'package.json');
  if (!existsSync(path)) throw new Error(`Package is not installed: ${name}`);
  return JSON.parse(await readFile(path, 'utf8'));
}

async function buildExpectedFiles() {
  const specifierTargets = new Map(vendorModules.map(([specifier]) => [specifier, specifier]));
  const generated = [];
  const licenses = new Map();
  for (const [specifier, sourceRelative] of vendorModules) {
    const packageNameValue = packageName(specifier);
    const manifest = await packageManifest(specifier);
    const declaredVersion = JSON.parse(await readFile(join(repoRoot, 'package.json'), 'utf8'))
      .devDependencies?.[packageNameValue];
    if (!declaredVersion || declaredVersion !== manifest.version) {
      throw new Error(
        `Package ${packageNameValue} is not pinned to its installed version ${manifest.version}.`,
      );
    }
    const sourcePath = join(packageDirectory(specifier), sourceRelative);
    if (!existsSync(sourcePath)) {
      throw new Error(`Missing ESM entry for ${specifier}: ${sourceRelative}`);
    }
    const source = await readFile(sourcePath, 'utf8');
    const output = rewriteModuleSource(source, specifier, specifierTargets);
    generated.push([fileName(specifier), output]);
    if (!licenses.has(packageNameValue)) {
      const licensePath = join(packageDirectory(specifier), 'LICENSE');
      if (!existsSync(licensePath)) throw new Error(`Missing LICENSE file for ${packageNameValue}`);
      licenses.set(packageNameValue, await readFile(licensePath, 'utf8'));
    }
  }
  return { generated, licenses };
}

async function generatedFiles() {
  const { generated, licenses } = await buildExpectedFiles();
  return {
    generated: applyVendorPatches(generated),
    licenses: [...licenses].map(([name, source]) => [
      `licenses/${name.replaceAll('/', '-')}.LICENSE`,
      source,
    ]),
  };
}

async function check() {
  const expected = await generatedFiles();
  const expectedPaths = new Set([
    ...expected.generated.map(([name]) => name),
    ...expected.licenses.map(([name]) => name),
  ]);
  const actualPaths = new Set();
  for (const entry of await readdir(outputRoot, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name !== 'licenses') throw new Error(`Unexpected vendor directory: ${entry.name}`);
      for (const child of await readdir(join(outputRoot, entry.name))) {
        actualPaths.add(`${entry.name}/${child}`);
      }
    } else {
      actualPaths.add(entry.name);
    }
  }
  for (const path of expectedPaths) {
    const actualPath = join(outputRoot, path);
    if (!existsSync(actualPath)) throw new Error(`Missing generated vendor file: ${path}`);
    const actual = await readFile(actualPath, 'utf8');
    const expectedContent =
      expected.generated.find(([name]) => name === path)?.[1] ??
      expected.licenses.find(([name]) => name === path)?.[1];
    if (actual !== expectedContent) throw new Error(`Stale generated vendor file: ${path}`);
  }
  for (const path of actualPaths) {
    if (!expectedPaths.has(path)) throw new Error(`Unexpected generated vendor file: ${path}`);
  }
  console.log(`CodeMirror vendor check passed (${expected.generated.length} modules).`);
}

async function generate() {
  const expected = await generatedFiles();
  await rm(outputRoot, { recursive: true, force: true });
  await mkdir(join(outputRoot, 'licenses'), { recursive: true });
  for (const [name, source] of expected.generated) {
    await writeFile(join(outputRoot, name), source);
  }
  for (const [name, source] of expected.licenses) {
    await writeFile(join(outputRoot, name), source);
  }
  await check();
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  if (process.argv.includes('--check')) {
    await check();
  } else {
    await generate();
  }
}
