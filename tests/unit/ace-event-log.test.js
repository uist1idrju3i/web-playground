import assert from 'node:assert/strict';
import test from 'node:test';
import { appendEditorEvent, formatEditorEvent } from '../../public_html/ace/event-log.js';

test('Ace event log formats change, selection, and mode events', () => {
  const time = new Date('2026-01-02T03:04:05Z');
  const events = [
    formatEditorEvent('change', { action: 'insert', lines: ['hello'] }, time),
    formatEditorEvent('changeSelection', { selection: { getAllRanges: () => [1, 2] } }, time),
    formatEditorEvent('changeMode', { mode: { $id: 'ace/mode/json' } }, time),
  ];
  assert.deepEqual(
    events.map(({ event, summary }) => [event, summary]),
    [
      ['change', 'insert · 1 line(s)'],
      ['changeSelection', '2 selection(s)'],
      ['changeMode', 'ace/mode/json'],
    ],
  );
  assert.ok(events.every(({ timestamp }) => timestamp.length > 0));
});

test('Ace event log retains only its latest entries', () => {
  const log = appendEditorEvent([1, 2, 3], 4, 3);
  assert.deepEqual(log, [2, 3, 4]);
});
