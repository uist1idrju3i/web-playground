import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildInitialPrompts,
  buildPromptMessages,
  validateMessages,
} from '../../public_html/prompt-api/js/messages.js';

test('initial prompts put the system instruction first and preserve a complete example', () => {
  assert.deepEqual(
    buildInitialPrompts({
      system: '  Be concise. ',
      example: { user: 'Question', assistant: 'Answer' },
      history: [
        { role: 'user', content: 'Next' },
        { role: 'system', content: 'ignored' },
      ],
    }),
    [
      { role: 'system', content: 'Be concise.' },
      { role: 'user', content: 'Question' },
      { role: 'assistant', content: 'Answer' },
      { role: 'user', content: 'Next' },
    ],
  );
});

test('message validation enforces system-first and final assistant-prefix rules', () => {
  assert.throws(
    () =>
      validateMessages([
        { role: 'user', content: 'first' },
        { role: 'system', content: 'late' },
      ]),
    TypeError,
  );
  assert.throws(
    () =>
      validateMessages([
        { role: 'system', content: 'one' },
        { role: 'system', content: 'two' },
      ]),
    TypeError,
  );
  assert.throws(
    () =>
      validateMessages([
        { role: 'assistant', content: 'prefix', prefix: true },
        { role: 'user', content: 'later' },
      ]),
    SyntaxError,
  );
  assert.throws(
    () => validateMessages([{ role: 'user', content: 'bad', prefix: true }]),
    SyntaxError,
  );
});

test('prompt builder places an optional assistant prefix last', () => {
  assert.deepEqual(buildPromptMessages('continue', { prefix: true }), [
    { role: 'user', content: 'continue' },
    { role: 'assistant', content: '', prefix: true },
  ]);
});
