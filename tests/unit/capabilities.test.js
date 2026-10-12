import test from 'node:test';
import assert from 'node:assert/strict';
import { uniqueCodecMimeTypes } from '../../public_html/library/js/capabilities.js';

test('deduplicates WebRTC codec lists by case-insensitive mimeType', () => {
  assert.deepEqual(
    uniqueCodecMimeTypes([
      { mimeType: 'audio/telephone-event' },
      { mimeType: 'audio/opus' },
      { mimeType: 'AUDIO/TELEPHONE-EVENT' },
      {},
    ]),
    ['audio/telephone-event', 'audio/opus'],
  );
});
