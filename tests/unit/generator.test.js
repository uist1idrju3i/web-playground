import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

const jsonPath = new URL('../../public_html/library/data/web-features.json', import.meta.url);
const markdownPath = new URL('../../docs/web-platform-features.md', import.meta.url);

test('generated feature data has the expected schema and pinned source metadata', async () => {
  const data = JSON.parse(await readFile(jsonPath, 'utf8'));
  assert.equal(data.meta.source, 'web-features');
  assert.equal(data.meta.web_features_version, '3.42.0');
  assert.equal(data.meta.web_features_license, 'Apache-2.0');
  assert.equal(data.meta.browser_compat_data_version, '8.1.5');
  assert.equal(data.meta.browser_compat_data_license, 'CC0-1.0');
  assert.ok(data.features.length > 1000);
  assert.deepEqual(
    data.features.map((feature) => feature.id),
    [...data.features.map((feature) => feature.id)].sort(),
  );
  for (const feature of data.features.slice(0, 10)) {
    assert.equal(typeof feature.name, 'string');
    assert.equal(typeof feature.description, 'string');
    assert.equal(typeof feature.group, 'string');
    assert.ok(['widely', 'newly', 'limited', 'unknown'].includes(feature.baseline.status));
    assert.deepEqual(Object.keys(feature.support), [
      'chrome',
      'chrome_android',
      'safari',
      'safari_ios',
      'edge',
      'firefox',
    ]);
    assert.ok(Array.isArray(feature.compat_features));
    assert.ok(Array.isArray(feature.spec));
  }
});

test('generation is deterministic and documents every active feature group', async () => {
  const beforeJson = await readFile(jsonPath, 'utf8');
  const beforeMarkdown = await readFile(markdownPath, 'utf8');
  execFileSync(process.execPath, ['scripts/generate-feature-data.mjs'], { stdio: 'pipe' });
  assert.equal(await readFile(jsonPath, 'utf8'), beforeJson);
  const markdown = await readFile(markdownPath, 'utf8');
  assert.equal(markdown, beforeMarkdown);
  assert.match(
    markdown,
    /Total features: \*\*1214\*\* — Chrome and Safari: \*\*870\*\*, Chrome only: \*\*230\*\*, Safari only: \*\*39\*\*, neither: \*\*75\*\*/,
  );
  for (const heading of ['Chrome + Safari', 'Chrome only', 'Safari only', 'Neither']) {
    assert.ok(markdown.includes(`## ${heading}`));
  }
});
