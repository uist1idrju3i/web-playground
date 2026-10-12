import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { readFileSync } from 'node:fs';
import {
  achievementGroups,
  ANCIENT_CIRCUITS,
  CULTURAL_GROUPS,
} from '../../public_html/tsumiki/js/groups.js';

const data = JSON.parse(
  readFileSync(new URL('../../public_html/tsumiki/data/prefectures.json', import.meta.url)),
);
const codes = new Set(data.pieces.map((p) => p.code));

const checkGroup = (g, label) => {
  assert.ok(g.id && g.name, `${label}: id/name missing`);
  assert.ok(Array.isArray(g.codes) && g.codes.length > 0, `${label}: empty group`);
  for (const c of g.codes) assert.ok(codes.has(c), `${label}: unknown code ${c}`);
};

describe('tsumiki achievement groups', () => {
  it('modern regions cover every prefecture exactly once', () => {
    const { modern } = achievementGroups(data.pieces);
    const seen = [];
    for (const g of modern) {
      checkGroup(g, g.id);
      seen.push(...g.codes);
    }
    assert.equal(seen.length, codes.size);
    assert.equal(new Set(seen).size, codes.size);
  });

  it('ancient circuits cover every prefecture exactly once (Gokishichido)', () => {
    const seen = [];
    for (const g of ANCIENT_CIRCUITS) {
      checkGroup(g, g.id);
      seen.push(...g.codes);
    }
    assert.equal(new Set(seen).size, codes.size, 'ancient circuits must cover all 47');
    assert.equal(seen.length, codes.size, 'ancient circuits must not overlap');
  });

  it('cultural groups reference only real prefecture codes', () => {
    for (const g of CULTURAL_GROUPS) checkGroup(g, g.id);
  });
});
