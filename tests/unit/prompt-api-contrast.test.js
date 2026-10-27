import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const css = readFileSync('public_html/prompt-api/app.css', 'utf8');
const colors = Object.fromEntries(
  [...css.matchAll(/(--pl-[\w-]+):\s*(#[\da-f]{3,6});/giu)].map(([, name, value]) => [name, value]),
);

function rgb(hex) {
  const value = hex.slice(1);
  const expanded = value.length === 3 ? [...value].map((part) => part + part).join('') : value;
  return expanded.match(/../gu).map((part) => Number.parseInt(part, 16) / 255);
}

function luminance(hex) {
  const [red, green, blue] = rgb(hex).map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(foreground, background) {
  const [high, low] = [luminance(foreground), luminance(background)].sort(
    (left, right) => right - left,
  );
  return (high + 0.05) / (low + 0.05);
}

test('Prompt API Lab text and availability status colors meet WCAG AA contrast', () => {
  const pairs = [
    ['--pl-ink', '--pl-card'],
    ['--pl-muted', '--pl-card'],
    ['--pl-blue', '--pl-card'],
    ['--pl-teal', '--pl-card'],
    ['--pl-green', '--pl-card'],
    ['--pl-red', '--pl-card'],
    ['--pl-amber', '--pl-card'],
    ['--pl-green', '#eaf6ee'],
    ['--pl-amber', '#fff5d8'],
    ['#174f78', '#e7f2fa'],
    ['--pl-red', '#fff0ee'],
  ];

  for (const [foreground, background] of pairs) {
    const fg = colors[foreground] ?? foreground;
    const bg = colors[background] ?? background;
    assert.ok(
      fg.startsWith('#') && bg.startsWith('#'),
      `missing contrast color: ${foreground} on ${background}`,
    );
    const ratio = contrast(fg, bg);
    assert.ok(ratio >= 4.5, `${foreground} on ${background}: ${ratio.toFixed(2)} < 4.5`);
  }
});
