import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import bcd from '@mdn/browser-compat-data/forLegacyNode';
import { features } from 'web-features';
import { escapeMarkdownTableCell } from './markdown-table.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const jsonPath = resolve(root, 'public_html/library/data/web-features.json');
const markdownPath = resolve(root, 'docs/web-platform-features.md');
const bcdPackage = JSON.parse(
  await readFile(resolve(root, 'node_modules/@mdn/browser-compat-data/package.json'), 'utf8'),
);
const webFeaturesPackage = JSON.parse(
  await readFile(resolve(root, 'node_modules/web-features/package.json'), 'utf8'),
);

function nestedValue(rootObject, key) {
  return key.split('.').reduce((value, part) => value?.[part], rootObject);
}

function firstSupport(key, browser) {
  const statements = nestedValue(bcd, key)?.__compat?.support?.[browser];
  const list = Array.isArray(statements) ? statements : statements ? [statements] : [];
  return list.find((entry) => entry.version_added !== false) ?? null;
}

function versionOf(key, browser) {
  const entry = firstSupport(key, browser);
  if (!entry) return '—';
  return entry.version_added === true ? 'Yes' : String(entry.version_added);
}

function baselineOf(feature) {
  const baseline = feature.status?.baseline;
  const status =
    baseline === 'high'
      ? 'widely'
      : baseline === 'low'
        ? 'newly'
        : baseline === false
          ? 'limited'
          : 'unknown';
  return {
    status,
    low_date: feature.status?.baseline_low_date ?? null,
    high_date: feature.status?.baseline_high_date ?? null,
  };
}

function featureGroup(feature) {
  const groups = feature.group ?? feature.status?.group ?? [];
  return (Array.isArray(groups) ? groups : [groups]).join(', ') || 'Other';
}

function isExcluded(feature) {
  return exclusionReasons(feature).length > 0;
}

function exclusionReasons(feature) {
  return ['discouraged', 'moved', 'split'].filter(
    (reason) => feature[reason] || feature.status?.[reason],
  );
}

function browserSupport(feature, browser) {
  const datasetVersion = feature.status?.support?.[browser];
  if (datasetVersion === undefined || datasetVersion === false || datasetVersion === null) {
    return { supported: false, version: '—' };
  }
  if (datasetVersion !== true) return { supported: true, version: String(datasetVersion) };
  const keys = feature.compat_features ?? [];
  const version = keys.map((key) => versionOf(key, browser)).find((value) => value !== '—');
  return { supported: true, version: version ?? 'Yes' };
}

const allFeatureRecords = Object.entries(features)
  .filter(([, feature]) => feature.kind === 'feature')
  .map(([id, feature]) => {
    const keys = [...(feature.compat_features ?? [])].sort();
    const chrome = browserSupport({ ...feature, compat_features: keys }, 'chrome');
    const chromeAndroid = browserSupport({ ...feature, compat_features: keys }, 'chrome_android');
    const safari = browserSupport({ ...feature, compat_features: keys }, 'safari');
    const safariIos = browserSupport({ ...feature, compat_features: keys }, 'safari_ios');
    const edge = browserSupport({ ...feature, compat_features: keys }, 'edge');
    const firefox = browserSupport({ ...feature, compat_features: keys }, 'firefox');
    return {
      id,
      name: feature.name ?? id,
      description: feature.description ?? '',
      group: featureGroup(feature),
      baseline: baselineOf(feature),
      support: {
        chrome: chrome.supported ? chrome.version : null,
        chrome_android: chromeAndroid.supported ? chromeAndroid.version : null,
        safari: safari.supported ? safari.version : null,
        safari_ios: safariIos.supported ? safariIos.version : null,
        edge: edge.supported ? edge.version : null,
        firefox: firefox.supported ? firefox.version : null,
      },
      compat_features: keys,
      spec: [...(Array.isArray(feature.spec) ? feature.spec : feature.spec ? [feature.spec] : [])]
        .map((spec) => (typeof spec === 'string' ? spec : spec?.url))
        .filter(Boolean)
        .sort(),
      ...(feature.caniuse ? { caniuse: feature.caniuse } : {}),
      excluded: isExcluded(feature),
      exclusionReasons: exclusionReasons(feature),
    };
  })
  .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

const sourceFeatures = allFeatureRecords
  .filter((feature) => !feature.excluded)
  .map(({ excluded: _excluded, exclusionReasons: _reasons, ...feature }) => feature);
const excludedFeatures = allFeatureRecords
  .filter((feature) => feature.excluded)
  .map(({ excluded: _excluded, ...feature }) => feature);

const groups = {
  'Chrome + Safari': [],
  'Chrome only': [],
  'Safari only': [],
  Neither: [],
};
for (const feature of sourceFeatures) {
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
  ].push(feature);
}

const lines = [
  '# Web Platform Features Supported by Chrome and Safari',
  '',
  `Generated from web-features ${webFeaturesPackage.version} and @mdn/browser-compat-data ${bcdPackage.version}.`,
  '',
  `Total features: **${sourceFeatures.length}** — Chrome and Safari: **${groups['Chrome + Safari'].length}**, Chrome only: **${groups['Chrome only'].length}**, Safari only: **${groups['Safari only'].length}**, neither: **${groups.Neither.length}**.`,
  '',
  'Chrome and Safari versions and support groups come from the WebDX feature dataset, which incorporates browser-compat-data. Where a feature has no specific version, the generator checks BCD compatibility keys; “Yes” means support is recorded without a version. Discouraged, moved, and split features are excluded from these totals and listed separately.',
  '',
];
for (const [group, entries] of Object.entries(groups)) {
  lines.push(
    `## ${group} (${entries.length})`,
    '',
    '| Feature | Chrome | Safari | Baseline | Summary |',
    '| --- | --- | --- | --- | --- |',
  );
  for (const item of entries) {
    const summary = escapeMarkdownTableCell(item.description.replace(/\s+/g, ' ').trim());
    lines.push(
      `| ${escapeMarkdownTableCell(item.name)} | ${escapeMarkdownTableCell(item.support.chrome ?? '—')} | ${escapeMarkdownTableCell(item.support.safari ?? '—')} | ${item.baseline.status} | ${summary} |`,
    );
  }
  lines.push('');
}
lines.push(
  `## Discouraged or superseded (${excludedFeatures.length})`,
  '',
  'These features are excluded from the JSON dataset and headline counts because the source dataset marks them as discouraged, moved, or split.',
  '',
  '| Feature | Reason | Chrome | Safari | Baseline | Summary |',
  '| --- | --- | --- | --- | --- | --- |',
);
for (const item of excludedFeatures) {
  const summary = escapeMarkdownTableCell(item.description.replace(/\s+/g, ' ').trim());
  lines.push(
    `| ${escapeMarkdownTableCell(item.name)} | ${escapeMarkdownTableCell(item.exclusionReasons.join(', '))} | ${escapeMarkdownTableCell(item.support.chrome ?? '—')} | ${escapeMarkdownTableCell(item.support.safari ?? '—')} | ${item.baseline.status} | ${summary} |`,
  );
}

const data = {
  meta: {
    source: 'web-features',
    web_features_version: webFeaturesPackage.version,
    web_features_license: 'Apache-2.0',
    browser_compat_data_source: '@mdn/browser-compat-data',
    browser_compat_data_version: bcdPackage.version,
    browser_compat_data_license: 'CC0-1.0',
  },
  features: sourceFeatures,
};

await mkdir(dirname(jsonPath), { recursive: true });
await mkdir(dirname(markdownPath), { recursive: true });
await writeFile(jsonPath, `${JSON.stringify(data)}\n`);
await writeFile(markdownPath, `${lines.join('\n').trimEnd()}\n`);
console.log(`Generated ${sourceFeatures.length} features.`);
