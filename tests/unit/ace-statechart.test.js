import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ACE_APP_PHASES,
  createAceAppState,
  transitionAceAppState,
} from '../../public_html/ace/statechart.js';

test('Ace app statechart reaches ready, unsupported, and recoverable error phases', () => {
  assert.deepEqual(ACE_APP_PHASES, ['initializing', 'ready', 'unsupported', 'error']);
  assert.equal(transitionAceAppState(createAceAppState(), 'READY').phase, 'ready');
  assert.equal(transitionAceAppState(createAceAppState(), 'UNSUPPORTED').phase, 'unsupported');
  assert.equal(
    transitionAceAppState(transitionAceAppState(createAceAppState(), 'ERROR'), 'RETRY').phase,
    'initializing',
  );
  assert.throws(
    () => transitionAceAppState({ phase: 'ready' }, 'ERROR'),
    /Illegal Ace Lab transition/u,
  );
});
