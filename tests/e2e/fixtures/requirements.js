import { checkRequirements } from '/library/js/requirements.js';

await checkRequirements(
  {
    required: ['missing-required'],
    render: true,
    container: document.querySelector('#requirements'),
  },
  {
    environment: {
      secureContext: true,
      isIOS: false,
      engine: 'Blink',
      permissionsPolicy: [],
    },
    capabilities: new Map(),
    featureData: { features: [] },
  },
);
