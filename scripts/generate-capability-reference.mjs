import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { capabilities } from '../public_html/library/js/capabilities.js';
import { escapeMarkdownTableCell } from './markdown-table.mjs';

const output = resolve(fileURLToPath(new URL('../docs/capability-reference.md', import.meta.url)));
const wasmProbeIds = new Set(
  capabilities.filter(({ category }) => category === 'WebAssembly').map(({ id }) => id),
);
const lines = [
  '# Capability reference',
  '',
  'These identifiers are accepted by `checkRequirements` and exported from the shared capability library.',
  '',
  'A dash means the capability metadata does not specify that constraint. Permission and user-gesture requirements are not currently represented as capability fields.',
  '',
  '| ID | Name | Category | Secure context | Engine limit | Permissions Policy feature |',
  '| --- | --- | --- | --- | --- | --- |',
];

for (const item of capabilities) {
  lines.push(
    `| \`${escapeMarkdownTableCell(item.id)}\` | ${escapeMarkdownTableCell(item.name)} | ${escapeMarkdownTableCell(item.category)} | ${item.requiresSecureContext ? 'Yes' : '—'} | ${item.chromiumOnly ? 'Chromium only' : '—'} | ${escapeMarkdownTableCell(item.permissionsPolicyFeature ?? '—')} |`,
  );
}

lines.push(
  '',
  `WebAssembly probe IDs (${wasmProbeIds.size}): ${[...wasmProbeIds].join(', ')}.`,
  '',
);
await mkdir(dirname(output), { recursive: true });
await writeFile(output, lines.join('\n'));
console.log(`Generated ${capabilities.length} capability reference entries.`);
