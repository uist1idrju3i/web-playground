import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { features as sourceFeatures } from 'web-features';

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
  const data = JSON.parse(beforeJson);
  const groups = {
    'Chrome + Safari': 0,
    'Chrome only': 0,
    'Safari only': 0,
    Neither: 0,
  };
  for (const feature of data.features) {
    const chrome = Boolean(feature.support.chrome);
    const safari = Boolean(feature.support.safari);
    groups[
      chrome && safari
        ? 'Chrome + Safari'
        : chrome
          ? 'Chrome only'
          : safari
            ? 'Safari only'
            : 'Neither'
    ]++;
  }
  const headline =
    `Total features: **${data.features.length}** — Chrome and Safari: **${groups['Chrome + Safari']}**, ` +
    `Chrome only: **${groups['Chrome only']}**, Safari only: **${groups['Safari only']}**, neither: **${groups.Neither}**.`;
  assert.ok(markdown.includes(headline));
  for (const heading of ['Chrome + Safari', 'Chrome only', 'Safari only', 'Neither']) {
    assert.ok(markdown.includes(`## ${heading} (${groups[heading]})`));
  }
  const excluded = Object.values(sourceFeatures).filter(
    (feature) =>
      feature.kind === 'feature' &&
      (feature.discouraged ||
        feature.moved ||
        feature.split ||
        feature.status?.discouraged ||
        feature.status?.moved ||
        feature.status?.split),
  );
  assert.equal(data.features.length + excluded.length, 1214);
  assert.ok(markdown.includes(`## Discouraged or superseded (${excluded.length})`));
  for (const feature of excluded) {
    assert.ok(markdown.includes(`| ${feature.name.replace(/\|/g, '\\|')} |`));
  }
});
