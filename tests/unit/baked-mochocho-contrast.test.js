import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

// WCAG contrast for the colour pairs the UI actually renders:
// --bm-* custom properties plus the fixed card/overlay backgrounds.
const css = readFileSync('public_html/baked-mochocho/app.css', 'utf8');

const vars = {};
for (const m of css.matchAll(/--bm-[\w-]+:\s*([^;]+);/g)) vars[m[0].split(':')[0]] = m[1].trim();

function rgb(spec) {
  const hex = spec.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    const h = hex[1];
    const f = h.length === 3 ? h.split('').map((c) => c + c) : h.match(/../g);
    return f.slice(0, 3).map((c) => parseInt(c, 16) / 255);
  }
  const m = spec.match(/^rgba?\((\d+)[\s/]+(\d+)[\s/]+(\d+)(?:[\s/]+([\d.%]+))?\)$/);
  assert.ok(m, `unparseable colour: ${spec}`);
  return [m[1], m[2], m[3]].map((v) => Number(v) / 255);
}

// composite `fg` over `bg` then measure
function mix(fg, bg, alpha) {
  const a = alpha ?? 1;
  const f = rgb(fg);
  const b = rgb(bg);
  return `rgb(${f.map((c, i) => Math.round((c * a + b[i] * (1 - a)) * 255)).join(' ')})`;
}

function luminanceOf(spec) {
  const [r, g, b] = rgb(spec).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const ratio = (fg, bg) => {
  const [hi, lo] = [luminanceOf(fg), luminanceOf(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

test('body text meets WCAG AA on the dark overlay card', () => {
  const card = '#241811'; // overlay-card background ≈ rgb(36 24 17)
  const pairs = [
    ['--bm-cream', card],
    ['--bm-ink', card],
    ['--bm-gold', card],
    ['--bm-muted', card],
  ];
  for (const [v, bg] of pairs) {
    assert.ok(vars[v], `${v} not defined`);
    const r = ratio(vars[v], bg);
    assert.ok(r >= 4.5, `${v} on card: ${r.toFixed(2)} < 4.5`);
  }
});

test('tool button labels meet WCAG AA', () => {
  // Tools sit on --bm-glass (72% over the near-black backdrop).
  const toolBg = mix('#1b130e', '#000000', 0.72);
  const r = ratio(vars['--bm-cream'], toolBg);
  assert.ok(r >= 4.5, `tool label: ${r.toFixed(2)}`);
});

test('guide text meets WCAG AA over the stage backdrop', () => {
  const r = ratio(vars['--bm-cream'], '#0a0705');
  assert.ok(r >= 4.5, `guide: ${r.toFixed(2)}`);
});
