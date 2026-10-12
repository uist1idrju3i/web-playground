import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { CUE_DURATION_MS } from '../../public_html/star-hopper/js/audio/engine.js';
import { BPM } from '../../public_html/star-hopper/js/audio/music.js';
import { setLanguage, STRING_KEYS, t } from '../../public_html/star-hopper/js/i18n.js';

const engineSource = await readFile(
  new URL('../../public_html/star-hopper/js/audio/engine.js', import.meta.url),
  'utf8',
);
const musicSource = await readFile(
  new URL('../../public_html/star-hopper/js/audio/music.js', import.meta.url),
  'utf8',
);

test('cue durations satisfy the confirm/warning contract', () => {
  // Short acknowledge cues stay within 300 ms.
  const confirms = ['ui', 'jump', 'doubleJump', 'pickup', 'land', 'respawn', 'tick'];
  for (const name of confirms) {
    assert.ok(name in CUE_DURATION_MS, `missing duration for ${name}`);
    assert.ok(
      CUE_DURATION_MS[name] <= 300,
      `${name} is a confirm cue and must stay ≤300ms (got ${CUE_DURATION_MS[name]})`,
    );
  }
  // Every cue stays under the 2.5 s cap and every name is distinct by design.
  for (const [name, ms] of Object.entries(CUE_DURATION_MS)) {
    assert.ok(ms >= 50 && ms <= 2500, `${name} duration ${ms} out of cuecraft range`);
  }
  // The warning cue exists and is a repeating pattern (two blips with a rest).
  assert.ok('warning' in CUE_DURATION_MS);
  const warningBody = engineSource.match(/case 'warning': \{([\s\S]*?)\n {6}\}/);
  assert.ok(warningBody, 'warning cue case not found');
  const toneCalls = warningBody[1].match(/this\.tone\(/g) ?? [];
  assert.ok(toneCalls.length >= 2, 'warning cue must repeat with a rest between blips');
});

test('synthesized cue fundamentals stay out of the 2500–4000 Hz speech band', () => {
  const freqs = new Set();
  for (const match of engineSource.matchAll(/(\d{3,4}(?:\.\d+)?)/g)) {
    const value = Number(match[1]);
    // 3-4 digit literals in engine.js are cue frequencies, filter edges, or
    // millisecond durations; all must avoid the band anyway.
    if (value >= 100 && value <= 10000) freqs.add(value);
  }
  assert.ok(freqs.size > 5, 'expected to extract cue frequencies from engine.js');
  for (const f of freqs) {
    assert.ok(f <= 2500 || f >= 4000, `fundamental ${f} Hz is inside the forbidden 2500–4000 band`);
  }
});

test('BGM is an original pop tempo and its notes are in range', () => {
  assert.ok(BPM >= 110 && BPM <= 140, `pop BGM tempo expected, got ${BPM}`);
  const notes = musicSource.match(/\d{3,4}\.\d{2}/g) ?? [];
  assert.ok(notes.length >= 10, 'expected pitched note literals in music.js');
  for (const n of notes.map(Number)) {
    assert.ok(n >= 20 && n <= 5000, `note ${n} Hz outside instrument range`);
  }
});

test('Japanese and English translations have matching keys', () => {
  assert.deepEqual(STRING_KEYS.ja.toSorted(), STRING_KEYS.en.toSorted());
  for (const key of STRING_KEYS.ja) {
    setLanguage('ja');
    assert.notEqual(t(key), key, `ja string missing for ${key}`);
    setLanguage('en');
    assert.notEqual(t(key), key, `en string missing for ${key}`);
  }
  setLanguage('ja');
});

test('every data-i18n key used by index.html resolves', async () => {
  const html = await readFile(
    new URL('../../public_html/star-hopper/index.html', import.meta.url),
    'utf8',
  );
  const keys = [...html.matchAll(/data-i18n(?:-aria)?="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(keys.length >= 10, 'expected data-i18n attributes in index.html');
  for (const key of keys) {
    assert.ok(STRING_KEYS.ja.includes(key), `HTML references unknown i18n key: ${key}`);
  }
});

test('i18n parameter substitution fills named slots', () => {
  setLanguage('ja');
  assert.equal(t('msg.combo', { combo: 5 }), '5 コンボ！');
  assert.equal(t('msg.fall', { penalty: 4 }), 'おちちゃった！ -4びょう');
});
