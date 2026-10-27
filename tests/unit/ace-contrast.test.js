import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const appCss = readFileSync('public_html/ace/app.css', 'utf8');
const aceCss = readFileSync('node_modules/ace-builds/css/theme/chrome.css', 'utf8');
const nightCss = readFileSync('node_modules/ace-builds/css/theme/tomorrow_night.css', 'utf8');

function color(hex) {
  const match = hex.match(/^#([0-9a-f]{6})$/iu);
  assert.ok(match, `expected six-digit color, got ${hex}`);
  return match[1].match(/../gu).map((part) => Number.parseInt(part, 16) / 255);
}

function luminance(hex) {
  const [r, g, b] = color(hex).map((channel) =>
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4,
  );
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(first, second) {
  const [light, dark] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (light + 0.05) / (dark + 0.05);
}

function variable(name) {
  const value = appCss.match(new RegExp(`${name}:\\s*(#[0-9a-f]{6})`, 'iu'))?.[1];
  assert.ok(value, `${name} should be present in the Ace palette`);
  return value;
}

test('Ace Lab text and accent colors meet WCAG AA on the paper surface', () => {
  const paper = variable('--ace-paper');
  for (const name of [
    '--ace-ink',
    '--ace-muted',
    '--ace-blue',
    '--ace-gold',
    '--ace-green',
    '--ace-red',
  ]) {
    const ratio = contrast(variable(name), paper);
    assert.ok(ratio >= 4.5, `${name} contrast ${ratio.toFixed(2)} is below 4.5:1`);
  }
});

test('bundled light and dark editor themes keep editor text readable', () => {
  assert.match(aceCss, /\.ace-chrome\s*\{[^}]*color:\s*black/isu);
  assert.match(aceCss, /\.ace-chrome\s*\{[^}]*background-color:\s*#ffffff/isu);
  assert.match(nightCss, /\.ace-tomorrow-night\s*\{[^}]*color:\s*#c5c8c6/isu);
  assert.match(nightCss, /\.ace-tomorrow-night\s*\{[^}]*background-color:\s*#1d1f21/isu);
  assert.ok(contrast('#000000', '#ffffff') >= 4.5);
  assert.ok(contrast('#c5c8c6', '#1d1f21') >= 4.5);
});
