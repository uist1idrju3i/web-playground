import assert from 'node:assert/strict';
import test from 'node:test';

import { setLanguage, stageName, t } from '../../public_html/senko-hanabi/js/i18n.js';
import { mergeSave, DEFAULT_SAVE } from '../../public_html/senko-hanabi/js/save.js';
import {
  bucketInterval,
  bucketSeconds,
  recordBurn,
} from '../../public_html/senko-hanabi/js/stats.js';
import { canTransition, transition } from '../../public_html/senko-hanabi/js/statechart.js';
import {
  createQuantileBag,
  createXoshiro,
  expInterval,
  prdConstant,
} from '../../public_html/senko-hanabi/js/rng.js';

test('statechart: legal path and illegal throws', () => {
  assert.equal(transition('boot', 'ready'), 'title');
  assert.equal(transition('title', 'light'), 'lit');
  assert.equal(transition('lit', 'spent'), 'spent');
  assert.equal(transition('spent', 'light'), 'lit');
  assert.equal(transition('lit', 'home'), 'title');
  assert.throws(() => transition('title', 'spent'), RangeError);
  assert.throws(() => transition('boot', 'light'), RangeError);
  assert.throws(() => transition('lit', 'ready'), RangeError);
  assert.equal(canTransition('spent', 'home'), true);
  assert.equal(canTransition('spent', 'spent'), false);
});

test('i18n: ja default, en override, interpolation, stage names', () => {
  setLanguage('ja');
  assert.match(t('title'), /線香花火/);
  setLanguage('en');
  assert.match(t('title'), /Senkō/);
  assert.equal(t('engine', { gpu: 'WebGPU', simd: '+SIMD' }), 'WebGPU · WASM+SIMD');
  assert.equal(stageName(3), 'pine');
  assert.equal(stageName(0), 'ready');
  setLanguage('ja');
});

test('save merge: overrides defaults, drops unknown buckets, garbage-safe', () => {
  const merged = mergeSave({
    settings: { lang: 'en', volume: 0.4 },
    stats: { feel: { sticks: 2, hist: [1, 2, 3, 0, 0, 0, 0, 0] } },
    bogus: { x: 1 },
  });
  assert.equal(merged.settings.lang, 'en');
  assert.equal(merged.settings.volume, 0.4);
  assert.equal(merged.settings.muted, false);
  assert.equal(merged.stats.feel.sticks, 2);
  assert.equal(merged.stats.feel.hist[0], 1);
  assert.equal(merged.stats.trng.sticks, 0);
  assert.equal(merged.bogus, undefined);
  assert.deepEqual(mergeSave(null), DEFAULT_SAVE);
  assert.equal(mergeSave(42).settings.lang, 'ja');
});

test('stats: burn records land in the right buckets', () => {
  const rec = { sticks: 0, longest: 0, lastDur: 0, hist: Array(8).fill(0), ints: Array(8).fill(0) };
  recordBurn(rec, { duration: 37.2, intervals: [0.07, 0.9, 6.1] });
  assert.equal(rec.sticks, 1);
  assert.ok(Math.abs(rec.longest - 37.2) < 1e-6);
  assert.equal(rec.hist[bucketSeconds(37.2)], 1);
  assert.equal(rec.ints[bucketInterval(0.07)], 1);
  assert.equal(rec.ints[7], 2); // 0.9 s and clamped 6.1 s share the last bucket
});

test('xoshiro: deterministic per seed and roughly uniform', () => {
  const a = createXoshiro(123);
  const b = createXoshiro(123);
  for (let i = 0; i < 100; i += 1) assert.equal(a.next(), b.next());
  const r = createXoshiro(7);
  let sum = 0;
  for (let i = 0; i < 5000; i += 1) sum += r.f32();
  const mean = sum / 5000;
  assert.ok(mean > 0.47 && mean < 0.53, `mean ${mean}`);
});

test('PRD constant yields the intended Rayleigh mean', () => {
  const M = 100;
  const C = prdConstant(M);
  const mean = Math.sqrt(Math.PI / (2 * C));
  assert.ok(Math.abs(mean - M) < 1e-9);
});

test('quantile bag: every 8 draws is a permutation of even quantiles', () => {
  const r = createXoshiro(9);
  const bag = createQuantileBag(() => r.f32(), 8);
  const seen = Array.from({ length: 8 }, () => bag());
  const sorted = [...seen].sort((x, y) => x - y);
  sorted.forEach((v, i) => assert.ok(Math.abs(v - (i + 0.5) / 8) < 1e-9));
});

test('expInterval: positive, mean-preserving', () => {
  const r = createXoshiro(5);
  let sum = 0;
  for (let i = 0; i < 2000; i += 1) sum += expInterval(0.85, r.f32());
  const mean = sum / 2000;
  assert.ok(mean > 0.65 && mean < 1.1, `mean ${mean}`);
  assert.ok(expInterval(1, 0) === 0); // -0 is fine
});

test('contrast: text tokens on app background meet 4.5:1', () => {
  const hex = (s) => [1, 3, 5].map((i) => parseInt(s.slice(i, i + 2), 16));
  const lum = ([r, g, b]) => {
    const f = (c) => {
      c /= 255;
      return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const bg = hex('#0b0a18');
  assert.ok(ratio(hex('#f2ede4'), bg) > 4.5);
  assert.ok(ratio(hex('#cfc4b0'), bg) > 4.5);
});
