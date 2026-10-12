import test from 'node:test';
import assert from 'node:assert/strict';
import {
  probeCompatKey,
  probeFeature,
  summarizeFeatureProbes,
} from '../../public_html/library/js/feature-probe.js';

test('probes API globals and members on prototypes', () => {
  class Example {}
  Example.prototype.read = () => {};
  const target = { Example };

  assert.equal(probeCompatKey('api.Example', { global: target }).status, 'supported');
  assert.equal(probeCompatKey('api.Example.read', { global: target }).status, 'supported');
  assert.equal(probeCompatKey('api.Missing', { global: target }).status, 'unsupported');
});

test('probes CSS, HTML elements, and global attributes', () => {
  const global = {
    CSS: {
      supports: (query, value) =>
        (query === 'display' && value === 'initial') ||
        query.includes('grid') ||
        query.includes('selector'),
    },
    HTMLElement: { prototype: { draggable: false } },
  };
  const doc = {
    createElement(name) {
      return {
        constructor: { name: name === 'mystery-tag' ? 'HTMLUnknownElement' : 'HTMLDivElement' },
      };
    },
  };

  assert.equal(probeCompatKey('css.properties.display', { global }).status, 'supported');
  assert.equal(probeCompatKey('css.selectors.has', { global }).status, 'supported');
  assert.equal(probeCompatKey('html.elements.div', { global, document: doc }).status, 'supported');
  assert.equal(
    probeCompatKey('html.elements.div.href', { global, document: doc }).status,
    'supported',
  );
  assert.equal(
    probeCompatKey('html.elements.mystery-tag', { global, document: doc }).status,
    'unsupported',
  );
  assert.equal(probeCompatKey('html.global_attributes.draggable', { global }).status, 'supported');
  assert.equal(probeCompatKey('unknown.feature.key', { global }).status, 'untestable');
});

test('summarizes mixed probe results', () => {
  const feature = {
    compat_features: ['api.Example', 'api.Missing', 'unsupported.key'],
  };
  const result = probeFeature(feature, { global: { Example: {} } });
  assert.deepEqual(
    result.results.map((entry) => entry.status),
    ['supported', 'unsupported', 'untestable'],
  );
  assert.equal(result.status, 'partial(1/3)');
  assert.equal(summarizeFeatureProbes([{ status: 'untestable' }]), 'untestable');
});
