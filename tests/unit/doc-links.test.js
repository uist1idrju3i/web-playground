import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { checkMarkdownLinks, headingSlugs, slugHeading } from '../../scripts/check-doc-links.mjs';

test('heading slugs normalize formatting and suffix duplicate headings', () => {
  assert.equal(slugHeading('Quick `start` guide'), 'quick-start-guide');
  assert.deepEqual(
    [...headingSlugs('# Quick Start\n## Quick Start\n### Support (iOS)')],
    ['quick-start', 'quick-start-1', 'support-ios'],
  );
});

test('directory links resolve to their index page', async () => {
  const root = await mkdtemp(join(tmpdir(), 'web-playground-doc-links-'));
  const page = join(root, 'docs', 'learning-path.md');
  try {
    await mkdir(join(root, 'public_html', 'browser-features'), { recursive: true });
    await mkdir(join(root, 'docs'), { recursive: true });
    await writeFile(page, '[Browser Features](../public_html/browser-features/)\n');
    await writeFile(join(root, 'public_html', 'browser-features', 'index.html'), '<main></main>');
    assert.deepEqual(await checkMarkdownLinks([page], root), []);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
