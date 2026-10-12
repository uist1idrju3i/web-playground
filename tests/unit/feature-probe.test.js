import test from 'node:test';
import assert from 'node:assert/strict';
import {
  probeCompatKey,
  probeFeature,
  summarizeFeatureProbes,
} from '../../public_html/library/js/feature-probe.js';

test('probes API globals, constructors, members, and safely ignores nested members', () => {
  class Example {}
  Example.prototype.read = () => {};
  Example.prototype.onready = null;
  Example.prototype[Symbol.iterator] = function* iterator() {};
  Example.write = () => {};
  const target = { Example, fetch() {}, onmessage() {} };

  assert.equal(probeCompatKey('api.Example', { global: target }).status, 'supported');
  assert.equal(probeCompatKey('api.Missing', { global: target }).status, 'unsupported');
  assert.equal(probeCompatKey('api.Example.Example', { global: target }).status, 'supported');
  assert.equal(probeCompatKey('api.Example.read', { global: target }).status, 'supported');
  assert.equal(probeCompatKey('api.Example.write_static', { global: target }).status, 'supported');
  assert.equal(probeCompatKey('api.Example.ready_event', { global: target }).status, 'supported');
  assert.equal(
    probeCompatKey('api.Example.missing_event', { global: target }).status,
    'untestable',
  );
  assert.equal(probeCompatKey('api.Example.@@iterator', { global: target }).status, 'supported');
  assert.equal(
    probeCompatKey('api.Example.read.options_parameter', { global: target }).status,
    'untestable',
  );
  assert.equal(
    probeCompatKey('api.WindowOrWorkerGlobalScope.fetch', { global: target }).status,
    'supported',
  );
  assert.equal(
    probeCompatKey('api.EXT_shader_texture_lod', { global: target }).status,
    'untestable',
  );
  assert.equal(
    probeCompatKey('api.WorkerNavigator.storage', { global: target }).status,
    'untestable',
  );
});

test('probes only global JavaScript built-ins and leaves syntax features untestable', () => {
  const target = { Array: class Array {} };
  assert.equal(probeCompatKey('javascript.builtins.Array', { global: target }).status, 'supported');
  assert.equal(
    probeCompatKey('javascript.builtins.Missing', { global: target }).status,
    'unsupported',
  );
  assert.equal(
    probeCompatKey('javascript.builtins.Other', { global: target }).status,
    'unsupported',
  );
  assert.equal(
    probeCompatKey('javascript.builtins.Array.from', { global: target }).status,
    'untestable',
  );
  assert.equal(
    probeCompatKey('javascript.operators.await', { global: target }).status,
    'untestable',
  );
  assert.equal(
    probeCompatKey('javascript.grammar.array_literals', { global: target }).status,
    'untestable',
  );
  assert.equal(
    probeCompatKey('javascript.builtins.AsyncFunction', { global: target }).status,
    'untestable',
  );
});

test('probes CSS properties and values without treating unknown values as unsupported', () => {
  const calls = [];
  const global = {
    CSS: {
      supports(query, value) {
        calls.push([query, value]);
        return (
          (query === 'display' && value === 'initial') ||
          (query === 'color' && value === 'rebeccapurple')
        );
      },
    },
  };

  assert.equal(probeCompatKey('css.properties.display', { global }).status, 'supported');
  assert.equal(probeCompatKey('css.properties.no-such-property', { global }).status, 'unsupported');
  assert.equal(
    probeCompatKey('css.properties.color.rebeccapurple', { global }).status,
    'supported',
  );
  assert.equal(probeCompatKey('css.properties.color.some_value', { global }).status, 'untestable');
  assert.equal(probeCompatKey('css.properties.custom-property', { global }).status, 'untestable');
  assert.deepEqual(calls.at(-1), ['color', 'some-value']);
  assert.equal(probeCompatKey('css.types.color', { global }).status, 'untestable');
  assert.equal(
    probeCompatKey('css.properties.display.initial.more', { global }).status,
    'untestable',
  );
});

test('probes CSS at-rules and pseudo-classes or pseudo-elements conservatively', () => {
  const global = {
    CSS: {
      supports(query) {
        return [
          'at-rule(@media)',
          'at-rule(@container)',
          'selector(:focus-within)',
          'selector(::before)',
          'selector(:has(*))',
          'selector(:is(a))',
        ].includes(query);
      },
    },
  };
  assert.equal(probeCompatKey('css.at-rules.container', { global }).status, 'supported');
  assert.equal(probeCompatKey('css.at-rules.unknown', { global }).status, 'unsupported');
  assert.equal(probeCompatKey('css.selectors.focus_within', { global }).status, 'supported');
  assert.equal(probeCompatKey('css.selectors.before', { global }).status, 'supported');
  assert.equal(probeCompatKey('css.selectors.has', { global }).status, 'supported');
  assert.equal(probeCompatKey('css.selectors.no-such-selector', { global }).status, 'unsupported');
  assert.equal(probeCompatKey('css.selectors.has.nested_feature', { global }).status, 'untestable');
  assert.equal(
    probeCompatKey('css.selectors.no-such-selector', {
      global: { CSS: { supports: () => false } },
    }).status,
    'untestable',
  );
  assert.equal(probeCompatKey('css.at-rules.media', { global: {} }).status, 'untestable');
  assert.equal(
    probeCompatKey('css.at-rules.media', { global: { CSS: { supports: () => false } } }).status,
    'untestable',
  );
});

test('probes HTML elements and attributes without false unsupported results', () => {
  const global = {
    HTMLElement: { prototype: { className: '', contentEditable: '', tabIndex: 0 } },
  };
  const doc = {
    createElement(name) {
      return {
        href: '',
        constructor: { name: name === 'mystery-tag' ? 'HTMLUnknownElement' : 'HTMLDivElement' },
      };
    },
  };

  assert.equal(probeCompatKey('html.elements.div', { global, document: doc }).status, 'supported');
  assert.equal(
    probeCompatKey('html.elements.mystery-tag', { global, document: doc }).status,
    'unsupported',
  );
  assert.equal(
    probeCompatKey('html.elements.a.href', { global, document: doc }).status,
    'supported',
  );
  assert.equal(
    probeCompatKey('html.elements.a.download', { global, document: doc }).status,
    'untestable',
  );
  assert.equal(
    probeCompatKey('html.elements.a.href.href_sms', { global, document: doc }).status,
    'untestable',
  );
  assert.equal(
    probeCompatKey('html.global_attributes.class', { global, document: doc }).status,
    'supported',
  );
  assert.equal(
    probeCompatKey('html.global_attributes.contenteditable', { global, document: doc }).status,
    'supported',
  );
  assert.equal(
    probeCompatKey('html.global_attributes.tabindex', { global, document: doc }).status,
    'supported',
  );
  assert.equal(
    probeCompatKey('html.global_attributes.unrecognized', { global, document: doc }).status,
    'untestable',
  );
  assert.equal(
    probeCompatKey('html.global_attributes.contenteditable.plaintext-only', {
      global,
      document: doc,
    }).status,
    'untestable',
  );
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
