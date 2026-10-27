import assert from 'node:assert/strict';
import test from 'node:test';
import { canTransition, transition } from '../../public_html/prompt-api/js/statechart.js';

test('statechart follows checking, creation, prompt, destruction, and recovery phases', () => {
  assert.equal(transition('checking', 'CHECK', 'downloadable'), 'downloadable');
  assert.equal(transition('downloadable', 'CREATE'), 'creating');
  assert.equal(transition('creating', 'CREATED'), 'ready');
  assert.equal(transition('ready', 'PROMPT'), 'prompting');
  assert.equal(transition('prompting', 'PROMPTED'), 'ready');
  assert.equal(transition('ready', 'DESTROY'), 'destroyed');
  assert.equal(transition('destroyed', 'RECOVER'), 'checking');
  assert.equal(transition('ready', 'FAIL'), 'error');
  assert.equal(transition('error', 'RESUME'), 'ready');
  assert.equal(canTransition('error', 'RESUME'), true);
});

test('statechart rejects illegal events and targets', () => {
  assert.throws(() => transition('unsupported', 'CREATE'), /Illegal transition/);
  assert.throws(() => transition('checking', 'CHECK', 'ready'), /Illegal target/);
  assert.equal(canTransition('unsupported', 'CREATE'), false);
});
