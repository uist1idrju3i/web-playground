import { parse as parseJavaScript } from 'acorn';
import * as walk from 'acorn-walk';
import { parse as parseHtml } from 'parse5';
import { readdir, readFile } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const publicRoot = resolve(fileURLToPath(new URL('../public_html/', import.meta.url)));
const siteOrigin = 'https://web-playground.xn--uist1idrju3i.jp';
const cdnjsOrigin = 'https://cdnjs.cloudflare.com';
const pinnedCdnjsPath = /^\/ajax\/libs\/[^/]+\/\d+\.\d+\.\d+\//;
const sourceExtensions = new Set(['.html', '.htm', '.js', '.mjs', '.css', '.svg', '.webmanifest']);
const dataKinds = new Set(['img', 'source', 'icon']);
const urlAttributes = {
  img: ['src', 'srcset'],
  source: ['src', 'srcset'],
  video: ['src', 'poster'],
  audio: ['src', 'poster'],
  track: ['src'],
  iframe: ['src'],
  frame: ['src'],
  embed: ['src'],
  object: ['data'],
  form: ['action'],
  base: ['href'],
  script: ['src'],
};
const svgUrlElements = new Set(['image', 'use', 'script', 'feimage']);
const srcsetAttributes = new Set(['srcset']);
const jsUrlProperties = new Set(['src', 'href', 'srcset', 'data', 'action', 'poster']);
const htmlResourceAttributes = new Set([
  'src',
  'href',
  'srcset',
  'data',
  'action',
  'poster',
  'xlink:href',
]);

function addViolation(violations, file, line, message) {
  violations.push({ file, line, message });
}

function hasStrongIntegrity(value) {
  return (
    typeof value === 'string' &&
    value
      .trim()
      .split(/\s+/)
      .some(
        (token) =>
          /^sha384-[A-Za-z0-9+/]{64}$/.test(token) || /^sha512-[A-Za-z0-9+/]{86}==$/.test(token),
      )
  );
}

function staticString(node) {
  if (node?.type === 'Literal' && typeof node.value === 'string') return node.value;
  if (node?.type === 'TemplateLiteral' && node.expressions.length === 0) {
    return node.quasis[0].value.cooked ?? node.quasis[0].value.raw;
  }
  return null;
}

function propertyName(node) {
  if (node?.type === 'ChainExpression') return propertyName(node.expression);
  if (node?.type !== 'MemberExpression') return null;
  if (!node.computed && node.property.type === 'Identifier') return node.property.name;
  return node.computed && node.property.type === 'Literal' ? String(node.property.value) : null;
}

function memberPath(node) {
  if (node?.type === 'ChainExpression') return memberPath(node.expression);
  if (node?.type === 'Identifier') return [node.name];
  if (node?.type !== 'MemberExpression') return [];
  const property = propertyName(node);
  const parent = memberPath(node.object);
  return property == null ? [] : [...parent, String(property)];
}

function getAttribute(node, name) {
  return node.attrs?.find((attribute) => attribute.name === name)?.value;
}

function getAttributeLine(node, name) {
  return (
    node.sourceCodeLocation?.attrs?.[name]?.startLine ?? node.sourceCodeLocation?.startLine ?? 1
  );
}

function textContent(node) {
  return (node.childNodes ?? [])
    .map((child) => (child.value === undefined ? textContent(child) : child.value))
    .join('');
}

function validateResource(value, context) {
  if (typeof value !== 'string' || !value.trim()) return;
  let url;
  try {
    url = new URL(value.trim(), siteOrigin);
  } catch {
    addViolation(context.violations, context.file, context.line, `Invalid resource URL: ${value}`);
    return;
  }

  if (url.protocol === 'data:') {
    if (!context.allowData) {
      addViolation(
        context.violations,
        context.file,
        context.line,
        `data: resources are not allowed for ${context.kind}.`,
      );
    } else if (!/^data:image\//i.test(value.trim())) {
      addViolation(
        context.violations,
        context.file,
        context.line,
        `data: ${context.kind} resources must use an image MIME type.`,
      );
    }
    return;
  }
  if (url.origin === siteOrigin) return;
  if (url.origin !== cdnjsOrigin) {
    addViolation(
      context.violations,
      context.file,
      context.line,
      `Resource origin is not allowed: ${url.origin}.`,
    );
    return;
  }
  if (!context.allowCdnjs) {
    addViolation(
      context.violations,
      context.file,
      context.line,
      `cdnjs resources are not allowed for ${context.kind}.`,
    );
    return;
  }
  if (!pinnedCdnjsPath.test(url.pathname)) {
    addViolation(
      context.violations,
      context.file,
      context.line,
      'cdnjs URL must use an exact /ajax/libs/<name>/<x.y.z>/ version.',
    );
  }
  if (context.attributes) {
    if (!hasStrongIntegrity(context.attributes.integrity)) {
      addViolation(
        context.violations,
        context.file,
        context.line,
        `cdnjs ${context.kind} must include sha384 or sha512 integrity.`,
      );
    }
    if (context.attributes.crossorigin?.toLowerCase() !== 'anonymous') {
      addViolation(
        context.violations,
        context.file,
        context.line,
        `cdnjs ${context.kind} must set crossorigin="anonymous".`,
      );
    }
  }
  if (context.moduleImport && !context.validModuleUrls?.has(url.href)) {
    addViolation(
      context.violations,
      context.file,
      context.line,
      'cdnjs ES module imports need an import-map integrity entry.',
    );
  }
}

function parseSrcset(value) {
  return value
    .split(',')
    .map((candidate) => candidate.trim().split(/\s+/, 1)[0])
    .filter(Boolean);
}

function walkHtml(node, visit) {
  visit(node);
  for (const child of node.childNodes ?? []) walkHtml(child, visit);
  if (node.content) walkHtml(node.content, visit);
}

function walkImportMapValues(value, visit) {
  if (typeof value === 'string') {
    visit(value);
  } else if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const child of Object.values(value)) walkImportMapValues(child, visit);
  }
}

function collectImportMapIntegrity(source, file, violations, validModuleUrls) {
  const document = parseHtml(source, { sourceCodeLocationInfo: true });
  walkHtml(document, (node) => {
    if (node.tagName !== 'script' || getAttribute(node, 'type')?.toLowerCase() !== 'importmap') {
      return;
    }
    const scriptText = textContent(node);
    let importMap;
    try {
      importMap = JSON.parse(scriptText);
    } catch {
      addViolation(
        violations,
        file,
        node.sourceCodeLocation?.startLine ?? 1,
        'Import map must contain valid JSON.',
      );
      return;
    }

    const integrity = new Map();
    for (const [key, value] of Object.entries(importMap.integrity ?? {})) {
      try {
        integrity.set(new URL(key, siteOrigin).href, value);
      } catch {
        continue;
      }
    }
    const targets = [];
    walkImportMapValues(importMap.imports ?? {}, (value) => targets.push(value));
    walkImportMapValues(importMap.scopes ?? {}, (value) => targets.push(value));
    for (const target of targets) {
      let url;
      try {
        url = new URL(target, siteOrigin);
      } catch {
        addViolation(
          violations,
          file,
          node.sourceCodeLocation?.startLine ?? 1,
          `Invalid import-map resource URL: ${target}`,
        );
        continue;
      }
      if (url.origin === siteOrigin) continue;
      if (url.origin !== cdnjsOrigin) {
        validateResource(target, {
          file,
          line: node.sourceCodeLocation?.startLine ?? 1,
          violations,
          kind: 'import map',
          validModuleUrls,
        });
        continue;
      }
      if (!pinnedCdnjsPath.test(url.pathname)) {
        addViolation(
          violations,
          file,
          node.sourceCodeLocation?.startLine ?? 1,
          'cdnjs URL must use an exact /ajax/libs/<name>/<x.y.z>/ version.',
        );
      }
      if (!hasStrongIntegrity(integrity.get(url.href))) {
        addViolation(
          violations,
          file,
          node.sourceCodeLocation?.startLine ?? 1,
          'cdnjs module import-map entry needs sha384 or sha512 integrity.',
        );
        continue;
      }
      validModuleUrls.add(url.href);
    }
  });
}

function checkCss(source, file, violations, lineOffset = 0) {
  const patterns = [
    /\burl\(\s*(?:(["'])(.*?)\1|([^'"\s)][^)]*?))\s*\)/gi,
    /@import\s+(?:(["'])(.*?)\1|(?!url\()([^\s;]+))/gi,
  ];
  const seen = new Set();
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      const value = match[2] ?? match[3];
      if (!value) continue;
      const line = lineOffset + source.slice(0, match.index).split('\n').length;
      const key = `${line}:${value}`;
      if (seen.has(key)) continue;
      seen.add(key);
      validateResource(value, {
        file,
        line,
        violations,
        kind: 'CSS resource',
        allowCdnjs: false,
      });
    }
  }
}

function checkHtml(source, file, violations, validModuleUrls, lineOffset = 0) {
  const document = parseHtml(source, { sourceCodeLocationInfo: true });
  walkHtml(document, (node) => {
    if (!node.tagName) return;
    const tag = node.tagName.toLowerCase();
    const attributes = Object.fromEntries(node.attrs.map(({ name, value }) => [name, value]));
    const line = (name) => lineOffset + getAttributeLine(node, name);
    const check = (name, kind = tag, options = {}) => {
      const value = attributes[name];
      if (value === undefined) return;
      const values = srcsetAttributes.has(name) ? parseSrcset(value) : [value];
      for (const resource of values) {
        validateResource(resource, {
          file,
          line: line(name),
          violations,
          kind,
          allowCdnjs: options.allowCdnjs ?? false,
          allowData: options.allowData ?? dataKinds.has(kind),
          attributes,
          moduleImport: options.moduleImport ?? false,
          validModuleUrls,
        });
      }
    };

    if (tag === 'script') {
      const type = attributes.type?.toLowerCase();
      if (attributes.src !== undefined) {
        check('src', 'script', { allowCdnjs: true, moduleImport: type === 'module' });
      } else if (type === 'importmap') {
        return;
      } else if (
        !type ||
        ['module', 'text/javascript', 'application/javascript', 'text/ecmascript'].includes(type)
      ) {
        checkJavaScript(
          textContent(node),
          file,
          violations,
          validModuleUrls,
          lineOffset + (node.sourceCodeLocation?.startTag?.endLine ?? 1) - 1,
        );
      }
    } else if (tag === 'style') {
      checkCss(
        textContent(node),
        file,
        violations,
        lineOffset + (node.sourceCodeLocation?.startTag?.endLine ?? 1) - 1,
      );
    }

    if (urlAttributes[tag]) {
      for (const name of urlAttributes[tag]) {
        if (tag === 'script' && name === 'src') continue;
        if (tag === 'base' && name === 'href') check(name, 'base');
        else check(name, name === 'srcset' ? tag : tag);
      }
    }
    if (svgUrlElements.has(tag)) {
      check('href', tag);
      check('xlink:href', tag);
    }
    if (tag === 'link') {
      const rel = new Set((attributes.rel ?? '').toLowerCase().split(/\s+/).filter(Boolean));
      const resourceRelations = [
        'stylesheet',
        'modulepreload',
        'preload',
        'prefetch',
        'icon',
        'apple-touch-icon',
        'manifest',
        'mask-icon',
      ];
      if (resourceRelations.some((relation) => rel.has(relation))) {
        check('href', rel.has('icon') || rel.has('apple-touch-icon') ? 'icon' : 'link', {
          allowCdnjs: rel.has('stylesheet') || rel.has('modulepreload') || rel.has('preload'),
          allowData: rel.has('icon') || rel.has('apple-touch-icon'),
          moduleImport: rel.has('modulepreload'),
        });
      }
    }
    if (tag === 'input' && attributes.type?.toLowerCase() === 'image') check('src', 'input');
    if (tag === 'meta' && attributes['http-equiv']?.toLowerCase() === 'refresh') {
      const match = attributes.content?.match(/(?:^|;)\s*url\s*=\s*(['"]?)(.*?)\1\s*$/i);
      if (match?.[2]) {
        validateResource(match[2], {
          file,
          line: line('content'),
          violations,
          kind: 'meta refresh',
        });
      }
    }
    if (attributes.style !== undefined) {
      checkCss(
        attributes.style,
        file,
        violations,
        lineOffset +
          (node.sourceCodeLocation?.attrs?.style?.startLine ??
            node.sourceCodeLocation?.startLine ??
            1) -
          1,
      );
    }
  });
}

function checkJavaScript(source, file, violations, validModuleUrls, lineOffset = 0) {
  let ast;
  let parseError;
  for (const sourceType of ['module', 'script']) {
    try {
      ast = parseJavaScript(source, {
        ecmaVersion: 'latest',
        sourceType,
        locations: true,
        allowHashBang: true,
      });
      break;
    } catch (error) {
      parseError = error;
    }
  }
  if (!ast) {
    addViolation(
      violations,
      file,
      lineOffset + (parseError?.loc?.line ?? 1),
      `JavaScript parse failed: ${parseError?.message ?? 'unknown syntax error'}`,
    );
    return;
  }

  const xhrNames = new Set();
  walk.simple(ast, {
    VariableDeclarator(node) {
      if (
        node.id.type === 'Identifier' &&
        node.init?.type === 'NewExpression' &&
        memberPath(node.init.callee).at(-1) === 'XMLHttpRequest'
      ) {
        xhrNames.add(node.id.name);
      }
    },
  });
  const report = (node, value, options = {}) => {
    if (value === null) return;
    const line = lineOffset + node.loc.start.line;
    if (options.html) {
      checkHtml(value, file, violations, validModuleUrls, line - 1);
      return;
    }
    const values = options.srcset ? parseSrcset(value) : [value];
    for (const resource of values) {
      validateResource(resource, {
        file,
        line,
        violations,
        kind: options.kind ?? 'JavaScript resource',
        allowCdnjs: false,
        moduleImport: options.moduleImport ?? false,
        validModuleUrls,
      });
    }
  };
  const reportModule = (node, sourceNode) =>
    report(node, staticString(sourceNode), { moduleImport: true, kind: 'module import' });

  walk.simple(ast, {
    ImportDeclaration(node) {
      reportModule(node, node.source);
    },
    ExportNamedDeclaration(node) {
      if (node.source) reportModule(node, node.source);
    },
    ExportAllDeclaration(node) {
      reportModule(node, node.source);
    },
    ImportExpression(node) {
      reportModule(node, node.source);
    },
    NewExpression(node) {
      const constructor = memberPath(node.callee).at(-1);
      if (
        ['Worker', 'SharedWorker', 'WebSocket', 'EventSource', 'WebTransport', 'URL'].includes(
          constructor,
        )
      ) {
        report(node, staticString(node.arguments[0]), { kind: `new ${constructor}` });
      }
    },
    CallExpression(node) {
      const path = memberPath(node.callee);
      const method = path.at(-1);
      const callee = node.callee.type === 'ChainExpression' ? node.callee.expression : node.callee;
      if (method === 'fetch' || method === 'importScripts') {
        const args = method === 'importScripts' ? node.arguments : node.arguments.slice(0, 1);
        for (const argument of args) report(node, staticString(argument), { kind: method });
      }
      if (path.join('.') === 'navigator.serviceWorker.register') {
        report(node, staticString(node.arguments[0]), { kind: 'serviceWorker.register' });
      }
      if (path.join('.') === 'navigator.sendBeacon') {
        report(node, staticString(node.arguments[0]), { kind: 'navigator.sendBeacon' });
      }
      if (
        method === 'open' &&
        callee.type === 'MemberExpression' &&
        (callee.object.type === 'NewExpression'
          ? memberPath(callee.object.callee).at(-1) === 'XMLHttpRequest'
          : callee.object.type === 'Identifier' && xhrNames.has(callee.object.name))
      ) {
        report(node, staticString(node.arguments[1]), { kind: 'XMLHttpRequest.open' });
      }
      if (method === 'setAttribute') {
        const attribute = staticString(node.arguments[0])?.toLowerCase();
        if (htmlResourceAttributes.has(attribute)) {
          report(node, staticString(node.arguments[1]), {
            kind: `setAttribute(${attribute})`,
            srcset: attribute === 'srcset',
          });
        }
      }
      if (method === 'insertAdjacentHTML') {
        report(node, staticString(node.arguments[1]), { html: true });
      }
    },
    AssignmentExpression(node) {
      if (node.left.type === 'MemberExpression') {
        const name = propertyName(node.left);
        const property = typeof name === 'string' ? name.toLowerCase() : null;
        if (jsUrlProperties.has(property)) {
          report(node, staticString(node.right), {
            kind: `.${property} assignment`,
            srcset: property === 'srcset',
          });
        }
      }
      const innerName = propertyName(node.left);
      if (
        node.left.type === 'MemberExpression' &&
        typeof innerName === 'string' &&
        ['innerhtml', 'outerhtml'].includes(innerName.toLowerCase())
      ) {
        report(node, staticString(node.right), { html: true });
      }
    },
  });
}

function checkWebManifest(source, file, violations) {
  let manifest;
  try {
    manifest = JSON.parse(source);
  } catch (error) {
    addViolation(violations, file, 1, `Web manifest parse failed: ${error.message}`);
    return;
  }
  const iconGroups = [manifest.icons, manifest.screenshots];
  for (const shortcut of manifest.shortcuts ?? []) iconGroups.push(shortcut.icons);
  for (const group of iconGroups) {
    for (const item of group ?? []) {
      validateResource(item.src, {
        file,
        line: 1,
        violations,
        kind: 'icon',
        allowData: true,
      });
    }
  }
}

async function findResourceFiles(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      const relativePath = relative(root, path).split(sep);
      if (relativePath[0] === 'library' && relativePath[1] === 'data') continue;
      if (entry.isDirectory()) {
        await visit(path);
      } else if (entry.isFile() && sourceExtensions.has(extname(path).toLowerCase())) {
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
    const extension = extname(file).toLowerCase();
    const relativePath = relative(resolvedRoot, file).split(sep).join('/');
    if (['.html', '.htm'].includes(extension)) {
      collectImportMapIntegrity(contents[index], relativePath, violations, validModuleUrls);
    }
  });

  files.forEach((file, index) => {
    const extension = extname(file).toLowerCase();
    const relativePath = relative(resolvedRoot, file).split(sep).join('/');
    switch (extension) {
      case '.html':
      case '.htm':
      case '.svg':
        checkHtml(contents[index], relativePath, violations, validModuleUrls);
        break;
      case '.js':
      case '.mjs':
        checkJavaScript(contents[index], relativePath, violations, validModuleUrls);
        break;
      case '.css':
        checkCss(contents[index], relativePath, violations);
        break;
      case '.webmanifest':
        checkWebManifest(contents[index], relativePath, violations);
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
