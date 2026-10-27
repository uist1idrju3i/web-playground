import assert from 'node:assert/strict';
import test from 'node:test';
import { validateSchema } from '../../public_html/prompt-api/js/schema-validate.js';

const schema = {
  type: 'object',
  required: ['sentiment', 'hashtags', 'rating'],
  additionalProperties: false,
  properties: {
    sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
    hashtags: {
      type: 'array',
      maxItems: 3,
      items: { type: 'string', pattern: '^#[A-Za-z0-9_]+$' },
    },
    rating: { type: 'number', minimum: 0, maximum: 5 },
    published: { type: 'boolean' },
  },
};

test('schema validator accepts the structured-output preset shape', () => {
  assert.deepEqual(
    validateSchema(
      { sentiment: 'positive', hashtags: ['#clear', '#useful'], rating: 4, published: true },
      schema,
    ),
    { valid: true, path: '$', message: 'Object matches the schema.' },
  );
});

test('schema validator reports each supported failure kind', () => {
  const cases = [
    [null, schema, 'Expected an object.'],
    [{ hashtags: [], rating: 2 }, schema, 'Required property is missing.'],
    [
      { sentiment: 'positive', hashtags: [], rating: 2, extra: true },
      schema,
      'Additional property is not allowed.',
    ],
    [
      { sentiment: 'unknown', hashtags: [], rating: 2 },
      schema,
      'Value is not in the allowed enum.',
    ],
    [
      { sentiment: 'positive', hashtags: ['no-hash'], rating: 2 },
      schema,
      'String does not match the pattern.',
    ],
    [
      { sentiment: 'positive', hashtags: ['#a', '#b', '#c', '#d'], rating: 2 },
      schema,
      'Expected at most 3 items.',
    ],
    [{ sentiment: 'positive', hashtags: [], rating: -1 }, schema, 'Value is below 0.'],
    [{ sentiment: 'positive', hashtags: [], rating: 6 }, schema, 'Value is above 5.'],
    [{ sentiment: 'positive', hashtags: [], rating: '2' }, schema, 'Expected a finite number.'],
    [
      { sentiment: 'positive', hashtags: [], rating: 2, published: 'yes' },
      schema,
      'Expected a boolean.',
    ],
    ['not an array', { type: 'array' }, 'Expected an array.'],
    [1, { type: 'string' }, 'Expected a string.'],
  ];
  for (const [value, constraint, message] of cases) {
    const result = validateSchema(value, constraint);
    assert.equal(result.valid, false, message);
    assert.equal(result.message, message);
  }
});
