import { readdir, readFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFragment } from 'parse5';

const root = resolve(fileURLToPath(new URL('../', import.meta.url)));

function appendText(node, parts) {
  if (node.nodeName === '#text') {
    parts.push(node.value);
    return;
  }
  if (node.tagName === 'script' || node.tagName === 'style') return;
  for (const child of node.childNodes ?? []) appendText(child, parts);
}

export function slugHeading(text) {
  const markdown = text.replace(/`([^`]*)`/g, '$1').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1');
  const parts = [];
  appendText(parseFragment(markdown), parts);
  return parts
    .join(' ')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export function headingSlugs(markdown) {
  const result = new Set();
  for (const match of markdown.matchAll(/^#{1,6}\s+(.+?)\s*#*\s*$/gm)) {
    const base = slugHeading(match[1]);
    let slug = base;
    let suffix = 0;
    while (result.has(slug)) slug = `${base}-${++suffix}`;
    result.add(slug);
  }
  for (const match of markdown.matchAll(/<a\s+(?:[^>]*\s)?id=["']([^"']+)["']/gi)) {
    result.add(match[1]);
  }
  return result;
}

async function markdownFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === '.git') continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await markdownFiles(path)));
    else if (entry.isFile() && extname(path).toLowerCase() === '.md') files.push(path);
  }
  return files;
}

function withoutFencedCode(markdown) {
  return markdown.replace(/(^|\n)(```|~~~)[\s\S]*?\n\2[^\n]*/g, (block) =>
    block.replace(/[^\n]/g, ' '),
  );
}

export async function checkMarkdownLinks(files, repositoryRoot = root) {
  const violations = [];
  for (const file of files) {
    const source = await readFile(file, 'utf8');
    const markdown = withoutFencedCode(source);
    for (const match of markdown.matchAll(/!?\[[^\]]*\]\((<[^>]+>|[^)\s]+)(?:\s+[^)]*)?\)/g)) {
      const target = match[1].replace(/^<|>$/g, '');
      if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(target)) continue;
      const [pathAndQuery, anchor] = target.split('#', 2);
      const pathname = pathAndQuery.split('?', 1)[0];
      let destination;
      try {
        const decodedPath = decodeURIComponent(pathname);
        destination = decodedPath
          ? pathname.startsWith('/')
            ? resolve(repositoryRoot, `.${decodedPath}`)
            : resolve(dirname(file), decodedPath)
          : file;
      } catch {
        violations.push(`${relative(repositoryRoot, file)}: invalid link ${target}`);
        continue;
      }
      const relativeFile = relative(repositoryRoot, file);
      try {
        let targetText;
        try {
          targetText = await readFile(destination, 'utf8');
        } catch (error) {
          if (error.code !== 'EISDIR') throw error;
          destination = resolve(destination, 'index.html');
          targetText = await readFile(destination, 'utf8');
        }
        const relativeDestination = relative(repositoryRoot, destination);
        if (anchor && extname(destination).toLowerCase() === '.md') {
          const decodedAnchor = decodeURIComponent(anchor);
          if (!headingSlugs(targetText).has(decodedAnchor)) {
            violations.push(
              `${relativeFile}: missing anchor #${decodedAnchor} in ${relativeDestination}`,
            );
          }
        }
      } catch {
        violations.push(`${relativeFile}: missing target ${target}`);
      }
    }
  }
  return violations;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const rootMarkdown = (await readdir(root, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && extname(entry.name).toLowerCase() === '.md')
    .map((entry) => resolve(root, entry.name));
  const files = [
    ...rootMarkdown,
    ...(await markdownFiles(resolve(root, 'docs'))),
    ...(await markdownFiles(resolve(root, '.agents'))),
  ].sort();
  const violations = await checkMarkdownLinks(files, root);
  if (violations.length) {
    for (const violation of violations) console.error(violation);
    console.error(`Found ${violations.length} broken Markdown link(s).`);
    process.exitCode = 1;
  } else {
    console.log(`Checked ${files.length} Markdown files; all local links resolve.`);
  }
}
