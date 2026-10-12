import test from 'node:test';
import assert from 'node:assert/strict';
import { headingSlugs, slugHeading } from '../../scripts/check-doc-links.mjs';

test('heading slugs normalize formatting and suffix duplicate headings', () => {
  assert.equal(slugHeading('Quick `start` guide'), 'quick-start-guide');
  assert.deepEqual(
    [...headingSlugs('# Quick Start\n## Quick Start\n### Support (iOS)')],
    ['quick-start', 'quick-start-1', 'support-ios'],
  );
});
