import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRequirements } from '../../public_html/library/js/requirements.js';

const environment = {
  secureContext: true,
  isIOS: false,
  engine: 'Blink',
  permissionsPolicy: ['usb'],
};

function capability(id, options = {}) {
  return {
    id,
    name: options.name ?? id,
    requiresSecureContext: options.requiresSecureContext ?? false,
    chromiumOnly: options.chromiumOnly ?? false,
    permissionsPolicyFeature: options.permissionsPolicyFeature ?? null,
  };
}

test('classifies missing requirements and keeps optional failures non-blocking', async () => {
  const capabilities = new Map([
    ['bluetooth', capability('bluetooth', { chromiumOnly: true })],
    ['webmcp', capability('webmcp')],
    ['usb-policy', capability('usb-policy', { permissionsPolicyFeature: 'serial' })],
    ['optional', capability('optional')],
  ]);
  const detections = new Map([
    ['bluetooth', { status: 'unsupported', detail: 'Missing.' }],
    [
      'webmcp',
      { status: 'unsupported', reason: 'needs-flag-or-origin-trial', detail: 'Experimental.' },
    ],
    ['usb-policy', { status: 'unsupported', detail: 'Blocked.' }],
    ['optional', { status: 'unsupported', detail: 'Optional.' }],
  ]);
  const result = await checkRequirements(
    { required: ['bluetooth', 'webmcp', 'usb-policy'], optional: ['optional'], render: false },
    {
      environment: { ...environment, isIOS: true },
      capabilities,
      detectCapability: (item) => detections.get(item.id),
      featureData: { features: [] },
    },
  );

  assert.equal(result.ok, false);
  assert.deepEqual(
    result.results.map((item) => item.reason),
    [
      'ios-webkit',
      'needs-flag-or-origin-trial',
      'blocked-by-permissions-policy',
      'unsupported-browser',
    ],
  );
  assert.equal(result.results[3].required, false);
});

test('classifies secure-context failures and permits supported requirements', async () => {
  const capabilities = new Map([
    ['secure-api', capability('secure-api', { requiresSecureContext: true })],
    ['works', capability('works')],
  ]);
  const result = await checkRequirements(
    { required: ['secure-api', 'works'], render: false },
    {
      environment: { ...environment, secureContext: false },
      capabilities,
      detectCapability: (item) =>
        item.id === 'secure-api'
          ? { status: 'supported', detail: 'Present' }
          : { status: 'supported', detail: 'Present' },
      featureData: { features: [] },
    },
  );

  assert.equal(result.ok, false);
  assert.equal(result.results[0].reason, 'insecure-context');
  assert.equal(result.results[1].status, 'supported');
});

test('falls back to generated feature ids and returns browser support versions', async () => {
  const result = await checkRequirements(
    { required: ['sample-feature'], render: false },
    {
      environment,
      capabilities: new Map(),
      featureData: {
        features: [
          {
            id: 'sample-feature',
            name: 'Sample feature',
            support: { chrome: '100', safari: '17' },
            compat_features: ['api.Example'],
          },
        ],
      },
      probeFeature: () => ({ status: 'supported', results: [] }),
    },
  );
  assert.equal(result.ok, true);
  assert.deepEqual(result.results[0].support, { chrome: '100', safari: '17' });
});
