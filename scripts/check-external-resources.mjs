import { readdir, readFile } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const publicRoot = resolve(fileURLToPath(new URL('../public_html/', import.meta.url)));
const siteOrigin = 'https://web-playground.xn--uist1idrju3i.jp';
const cdnjsOrigin = 'https://cdnjs.cloudflare.com';
const pinnedCdnjsPath = /^\/ajax\/libs\/[^/]+\/\d+\.\d+\.\d+\//;

function isStrongIntegrity(value) {
  if (typeof value !== 'string') return false;
  return value
    .trim()
    .split(/\s+/)
    .some(
      (token) =>
        /^sha384-[A-Za-z0-9+/]{64}$/.test(token) || /^sha512-[A-Za-z0-9+/]{86}==$/.test(token),
    );
}

function parseAttributes(source) {
  const attributes = new Map();
  const pattern = /([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  for (const match of source.matchAll(pattern)) {
    attributes.set(match[1].toLowerCase(), match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attributes;
}

function resourceUrl(value) {
  const trimmed = value.trim();
  if (!/^(?:https?:)?\/\//i.test(trimmed)) return null;
  return new URL(trimmed.startsWith('//') ? `https:${trimmed}` : trimmed, siteOrigin);
}

function lineNumber(source, offset) {
  return source.slice(0, offset).split('\n').length;
}

function walkResourceTargets(value, visit) {
  if (typeof value === 'string') {
    visit(value);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const child of Object.values(value)) walkResourceTargets(child, visit);
}

function collectImportMapIntegrity(source, file, violations, validModuleUrls) {
  const scriptPattern = /<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi;
  for (const match of source.matchAll(scriptPattern)) {
    const attributes = parseAttributes(match[1]);
    if (attributes.get('type')?.toLowerCase() !== 'importmap') continue;

    let importMap;
    try {
      importMap = JSON.parse(match[2]);
    } catch {
      violations.push({
        file,
        line: lineNumber(source, match.index),
        message: 'Import map must contain valid JSON.',
      });
      continue;
    }

    const integrityEntries = new Map(Object.entries(importMap.integrity ?? {}));
    const targets = [];
    walkResourceTargets(importMap.imports ?? {}, (target) => targets.push(target));
    walkResourceTargets(importMap.scopes ?? {}, (target) => targets.push(target));
    targets.push(...integrityEntries.keys());

    const checkedUrls = new Set();
    for (const target of targets) {
      const url = resourceUrl(target);
      if (!url) continue;
      if (checkedUrls.has(url.href)) continue;
      checkedUrls.add(url.href);
      if (url.origin !== siteOrigin && url.origin !== cdnjsOrigin) {
        violations.push({
          file,
          line: lineNumber(source, match.index),
          message: `Import-map resource origin is not allowed: ${url.origin}.`,
        });
        continue;
      }
      if (url.origin !== cdnjsOrigin) continue;

      if (!pinnedCdnjsPath.test(url.pathname)) {
        violations.push({
          file,
          line: lineNumber(source, match.index),
          message: `cdnjs URL must use an exact /ajax/libs/<name>/<x.y.z>/ version: ${url.href}`,
        });
      }
      if (!isStrongIntegrity(integrityEntries.get(url.href) ?? '')) {
        violations.push({
          file,
          line: lineNumber(source, match.index),
          message: `cdnjs module import-map entry needs sha384 or sha512 integrity: ${url.href}`,
        });
        continue;
      }
      validModuleUrls.add(url.href);
    }
  }
}

function validateResource(value, context) {
  const url = resourceUrl(value);
  if (!url) return;
  if (url.origin !== siteOrigin && url.origin !== cdnjsOrigin) {
    context.violations.push({
      file: context.file,
      line: context.line,
      message: `Resource origin is not allowed: ${url.origin}.`,
    });
    return;
  }
  if (url.origin !== cdnjsOrigin) return;

  if (!pinnedCdnjsPath.test(url.pathname)) {
    context.violations.push({
      file: context.file,
      line: context.line,
      message: `cdnjs URL must use an exact /ajax/libs/<name>/<x.y.z>/ version: ${url.href}`,
    });
  }

  if (context.attributes) {
    if (!isStrongIntegrity(context.attributes.get('integrity') ?? '')) {
      context.violations.push({
        file: context.file,
        line: context.line,
        message: `cdnjs ${context.kind} must include sha384 or sha512 integrity.`,
      });
    }
    if (context.attributes.get('crossorigin')?.toLowerCase() !== 'anonymous') {
      context.violations.push({
        file: context.file,
        line: context.line,
        message: `cdnjs ${context.kind} must set crossorigin="anonymous".`,
      });
    }
  }

  if (context.moduleImport && !context.validModuleUrls.has(url.href)) {
    context.violations.push({
      file: context.file,
      line: context.line,
      message: `cdnjs ES module imports need an import-map integrity entry: ${url.href}`,
    });
  }
}

function checkHtml(source, file, violations, validModuleUrls) {
  const context = { file, violations, validModuleUrls };

  for (const match of source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script\s*>/gi)) {
    const attributes = parseAttributes(match[1]);
    const type = attributes.get('type')?.toLowerCase();
    const isImportMap = type === 'importmap';
    const sourceUrl = attributes.get('src');
    if (sourceUrl) {
      validateResource(sourceUrl, {
        ...context,
        line: lineNumber(source, match.index),
        kind: 'script',
        attributes,
        moduleImport: type === 'module',
      });
      continue;
    }
    if (isImportMap) continue;
    if (
      type &&
      !['module', 'text/javascript', 'application/javascript', 'text/ecmascript'].includes(type)
    ) {
      continue;
    }
    const bodyStart = match.index + match[0].indexOf('>') + 1;
    checkJavaScript(match[2], file, violations, validModuleUrls, lineNumber(source, bodyStart) - 1);
  }

  for (const match of source.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style\s*>/gi)) {
    const bodyStart = match.index + match[0].indexOf('>') + 1;
    checkCss(match[1], file, violations, lineNumber(source, bodyStart) - 1);
  }

  for (const match of source.matchAll(/<[a-z][\w:-]*\b([^>]*)>/gi)) {
    const style = parseAttributes(match[1]).get('style');
    if (style === undefined) continue;
    checkCss(style, file, violations, lineNumber(source, match.index) - 1);
  }

  for (const match of source.matchAll(/<link\b([^>]*)\/?>/gi)) {
    const attributes = parseAttributes(match[1]);
    const rel = new Set((attributes.get('rel') ?? '').toLowerCase().split(/\s+/));
    if (!rel.has('stylesheet') && !rel.has('modulepreload')) continue;
    const href = attributes.get('href');
    if (!href) continue;
    validateResource(href, {
      ...context,
      line: lineNumber(source, match.index),
      kind: 'link',
      attributes,
      moduleImport: rel.has('modulepreload'),
    });
  }
}

function checkJavaScript(source, file, violations, validModuleUrls, lineOffset = 0) {
  const context = { file, violations, validModuleUrls, moduleImport: true };
  const patterns = [
    /\bimport\s+(?:[^'";]*?\s+from\s+)?(['"])([^'"]+)\1/g,
    /\bimport\s*\(\s*(['"])([^'"]+)\1\s*\)/g,
    /\bimport\s*\(\s*`([^`$]+)`\s*\)/g,
  ];
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const specifier = match[2] ?? match[1];
      validateResource(specifier, {
        ...context,
        line: lineOffset + lineNumber(source, match.index),
      });
    }
  }
}

function checkCss(source, file, violations, lineOffset = 0) {
  const seen = new Set();
  const context = { file, violations };
  const patterns = [
    /\burl\(\s*(?:(["'])(.*?)\1|([^'"\s)][^)]*?))\s*\)/gi,
    /@import\s+(?:(["'])(.*?)\1|([^\s;]+))/gi,
  ];

  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const value = match[2] ?? match[3];
      const line = lineOffset + lineNumber(source, match.index);
      const key = `${line}:${value}`;
      if (!value || seen.has(key)) continue;
      seen.add(key);
      validateResource(value, { ...context, line });
    }
  }
}

async function findResourceFiles(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      const relativePath = relative(root, path);
      const segments = relativePath.split(sep);
      if (segments[0] === 'library' && segments[1] === 'data') continue;
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile() && ['.html', '.js', '.css'].includes(extname(path))) {
        files.push(path);
      }
    }
  }
  await visit(root);
  return files.sort();
}

export async function checkExternalResources(root = publicRoot) {
  const resolvedRoot = resolve(root);
  const violations = [];
  const files = await findResourceFiles(resolvedRoot);
  const validModuleUrls = new Set();
  const contents = await Promise.all(files.map((file) => readFile(file, 'utf8')));

  files.forEach((file, index) => {
    if (extname(file) === '.html') {
      collectImportMapIntegrity(
        contents[index],
        relative(resolvedRoot, file),
        violations,
        validModuleUrls,
      );
    }
  });

  files.forEach((file, index) => {
    const source = contents[index];
    const relativePath = relative(resolvedRoot, file);
    switch (extname(file)) {
      case '.html':
        checkHtml(source, relativePath, violations, validModuleUrls);
        break;
      case '.js':
        checkJavaScript(source, relativePath, violations, validModuleUrls);
        break;
      case '.css':
        checkCss(source, relativePath, violations);
        break;
      default:
        break;
    }
  });

  return violations;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const violations = await checkExternalResources();
  if (violations.length) {
    for (const violation of violations) {
      console.error(`${violation.file}:${violation.line}: ${violation.message}`);
    }
    console.error(`Found ${violations.length} external-resource policy violation(s).`);
    process.exitCode = 1;
  } else {
    console.log('External resource policy check passed.');
  }
}
