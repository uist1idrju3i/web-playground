import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import {
  BPM,
  CHORDS,
  CUES,
  CUE_DURATION_MS,
  LOOP_SECONDS,
  MELODY,
  contour,
  cueDuration,
  inMode,
  melodyEvents,
} from '../../public_html/baked-mochocho/js/audio/music.js';
import {
  makeOrder,
  mulberry32,
  priceFor,
  scoreCake,
  WEIGHTS,
} from '../../public_html/baked-mochocho/js/score.js';
import { setLanguage, STRING_KEYS, t } from '../../public_html/baked-mochocho/js/i18n.js';

test('music cues satisfy duration, note-count, and contour requirements', () => {
  for (const [name, cue] of Object.entries(CUES)) {
    const [minimum, maximum] = CUE_DURATION_MS[cue.purpose];
    const duration = cueDuration(cue);
    assert.ok(duration >= minimum && duration <= maximum, `${name}: ${duration} ms`);
    assert.ok(cue.notes.length >= 2, `${name}: fewer than two notes`);
  }

  assert.ok(contour(CUES.confirm) > 0);
  assert.ok(contour(CUES.success) > 0);
  assert.ok(contour(CUES.completion) > 0);
  assert.ok(contour(CUES.warning) < 0);
  assert.ok(contour(CUES.error) < 0);
  assert.equal(contour(CUES.notification), 0);
});

test('melody and non-error cues stay in mode and the loop fits eight bars', () => {
  for (const [barIndex, bar] of MELODY.entries()) {
    assert.equal(
      bar.reduce((sum, [, eighths]) => sum + eighths, 0),
      8,
      `bar ${barIndex + 1}`,
    );
    for (const [midi] of bar) {
      if (midi !== null) assert.ok(inMode(midi), `bar ${barIndex + 1}: MIDI ${midi}`);
    }
  }
  assert.equal(MELODY.length, 8);
  assert.equal(CHORDS.length, MELODY.length);
  assert.equal(LOOP_SECONDS, (8 * 4 * 60) / BPM);

  for (const [name, cue] of Object.entries(CUES)) {
    if (name === 'error') continue;
    for (const [midi] of cue.notes) {
      assert.ok(inMode(midi), `${name}: MIDI ${midi}`);
    }
  }

  const events = melodyEvents();
  for (let index = 0; index < events.length; index += 1) {
    const event = events[index];
    if (index > 0) assert.ok(event.start > events[index - 1].start);
    assert.ok(event.start + event.dur <= LOOP_SECONDS + 1e-9);
  }
});

test('scoring, order, and pricing follow the game contract', () => {
  const ideal = {
    topBrownMean: 0.62,
    bottomBrownMean: 0.62,
    topBrownStd: 0.02,
    bottomBrownStd: 0.02,
    burntFraction: 0,
    rawFraction: 0,
    coreTempC: 85,
    fillingKind: 1,
    fillingG: 25,
    fillingOffsetMm: 0,
    spillMl: 0,
    volumeMl: 80,
    ringWhiteness: 1,
  };
  const matching = scoreCake(ideal, { filling: 1 });
  assert.ok(matching.total >= 95);
  assert.equal(matching.stars, 5);
  assert.equal(matching.comment, 'comment.great');
  assert.equal(matching.total - scoreCake(ideal, { filling: 2 }).total, WEIGHTS.order);

  const burnt = scoreCake({
    ...ideal,
    topBrownMean: 1.3,
    bottomBrownMean: 1.3,
    burntFraction: 0.2,
  });
  assert.equal(burnt.comment, 'comment.burnt');
  assert.ok(burnt.stars <= 2);
  assert.equal(scoreCake({ ...ideal, rawFraction: 0.5, coreTempC: 40 }).comment, 'comment.raw');
  assert.equal(scoreCake({ ...ideal, spillMl: 6 }).comment, 'comment.spill');
  assert.equal(
    scoreCake({ ...ideal, topBrownMean: 0.2, bottomBrownMean: 0.2 }).comment,
    'comment.pale',
  );

  assert.equal(priceFor({ stars: 5, total: 100 }), 250);
  assert.equal(priceFor({ stars: 1, total: 20 }), 40);

  const rng = mulberry32(7);
  for (let sample = 0; sample < 200; sample += 1) {
    for (const round of [0, 1]) assert.equal(makeOrder(rng, round).filling, 1);
    for (const round of [2, 3, 4]) assert.ok([1, 2].includes(makeOrder(rng, round).filling));
    assert.ok([1, 2, 3, 4].includes(makeOrder(rng, 5).filling));
  }

  const first = mulberry32(7);
  const second = mulberry32(7);
  const values = Array.from({ length: 5 }, () => first());
  assert.deepEqual(
    values,
    Array.from({ length: 5 }, () => second()),
  );
  assert.ok(values.every((value) => value >= 0 && value < 1));
});

test('Japanese and English translations have matching keys and all references resolve', async () => {
  const [html, app, score] = await Promise.all([
    readFile(new URL('../../public_html/baked-mochocho/index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../public_html/baked-mochocho/app.js', import.meta.url), 'utf8'),
    readFile(new URL('../../public_html/baked-mochocho/js/score.js', import.meta.url), 'utf8'),
  ]);
  const japaneseKeys = new Set(STRING_KEYS.ja);
  assert.deepEqual([...STRING_KEYS.ja].sort(), [...STRING_KEYS.en].sort());

  for (const [, key] of html.matchAll(/\bdata-i18n="([^"]+)"/g)) {
    assert.ok(japaneseKeys.has(key), `index.html data-i18n="${key}"`);
  }
  for (const [, key] of app.matchAll(/\bt\(\s*['"]([^'"]+)['"]/g)) {
    assert.ok(japaneseKeys.has(key), `app.js t("${key}")`);
  }
  for (const [, key] of app.matchAll(/\bcaption\(\s*['"](cap\.[^'"]+)['"]/g)) {
    assert.ok(japaneseKeys.has(key), `app.js caption("${key}")`);
  }
  for (const [, key] of score.matchAll(/['"](comment\.[^'"]+)['"]/g)) {
    assert.ok(japaneseKeys.has(key), `score.js "${key}"`);
  }

  const originalDocument = globalThis.document;
  globalThis.document = { documentElement: {}, querySelectorAll: () => [] };
  try {
    setLanguage('en');
    assert.equal(t('start'), 'Start baking');
  } finally {
    setLanguage('ja');
    if (originalDocument === undefined) delete globalThis.document;
    else globalThis.document = originalDocument;
  }
});
