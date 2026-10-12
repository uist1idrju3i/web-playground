import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PHASES,
  canTransition,
  transition,
} from '../../public_html/baked-mochocho/js/statechart.js';

test('boot moves only to title or unsupported', () => {
  assert.equal(transition('boot', 'ready'), 'title');
  assert.equal(transition('boot', 'unsupported'), 'unsupported');
  assert.throws(() => transition('boot', 'start'), RangeError);
});

test('playing is only reachable from the title', () => {
  assert.equal(transition('title', 'start'), 'playing');
  for (const from of PHASES.filter((p) => !['title', 'error'].includes(p))) {
    assert.equal(canTransition(from, 'start'), false, from);
  }
});

test('error is reachable from every phase and terminal', () => {
  for (const from of PHASES) assert.equal(transition(from, 'error'), 'error');
  assert.throws(() => transition('error', 'start'), RangeError);
  assert.throws(() => transition('unsupported', 'ready'), RangeError);
  assert.throws(() => transition('title', 'bogus'), RangeError);
});
