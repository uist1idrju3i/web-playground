import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

function luminance(hex) {
  const rgb = hex
    .slice(1)
    .match(/../gu)
    .map((part) => Number.parseInt(part, 16) / 255)
    .map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4));
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}
function ratio(a, b) {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
}

test('original light and dark editor palettes meet normal-text contrast', async () => {
  const css = await readFile(
    new URL('../../public_html/codemirror/app.css', import.meta.url),
    'utf8',
  );
  assert.ok(ratio('#18324a', '#fffdf8') >= 4.5);
  assert.ok(ratio('#e9f1f4', '#17252f') >= 4.5);
  assert.match(css, /--cm-accent/u);
});
