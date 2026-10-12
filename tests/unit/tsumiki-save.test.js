import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalize, sign, verify } from '../../public_html/tsumiki/js/save.js';

async function testKey() {
  return crypto.subtle.generateKey({ name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

test('canonicalize is deterministic across key order', () => {
  const a = canonicalize({ b: 2, a: { d: [1, 2], c: 'x' } });
  const b = canonicalize({ a: { c: 'x', d: [1, 2] }, b: 2 });
  assert.equal(a, b);
  assert.equal(a, '{"a":{"c":"x","d":[1,2]},"b":2}');
});

test('HMAC sign/verify round-trips and detects tampering', async () => {
  const key = await testKey();
  const data = { bestScore: 1200, collected: ['JP-13', 'JP-01'], settings: { muted: false } };
  const mac = await sign(key, data);
  assert.match(mac, /^[0-9a-f]{64}$/);
  assert.ok(await verify(key, data, mac));
  // tampered payload fails
  const tampered = { ...data, bestScore: 999999 };
  assert.ok(!(await verify(key, tampered, mac)));
  // tampered mac fails
  const badMac = `0${mac.slice(1)}`;
  assert.ok(!(await verify(key, data, badMac)));
  // a different key fails
  const other = await testKey();
  assert.ok(!(await verify(other, data, mac)));
});
