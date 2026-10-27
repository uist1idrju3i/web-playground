export const LANGUAGES = Object.freeze(['en', 'ja', 'es', 'de', 'fr']);
export const SAMPLING_MODES = Object.freeze([
  'most-predictable',
  'predictable',
  'slightly-predictable',
  'balanced',
  'slightly-creative',
  'creative',
  'most-creative',
]);

export function matrixCases() {
  const cases = [];
  for (const input of LANGUAGES) {
    for (const output of LANGUAGES) {
      const options = {
        expectedInputs: [{ type: 'text', languages: [input] }],
        expectedOutputs: [{ type: 'text', languages: [output] }],
      };
      cases.push({
        id: `text-${input}-${output}`,
        label: `Text ${input} input → ${output} output`,
        options,
        group: 'Language',
      });
    }
  }
  for (const modality of ['image', 'audio']) {
    cases.push({
      id: `${modality}-en`,
      label: `${modality[0].toUpperCase()}${modality.slice(1)} input · English`,
      options: {
        expectedInputs: [{ type: 'text', languages: ['en'] }, { type: modality }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
      },
      group: 'Modality',
    });
  }
  cases.push({
    id: 'tools-en',
    label: 'Tool-call + tool-response · English',
    options: {
      expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'tool-response' }],
      expectedOutputs: [{ type: 'text', languages: ['en'] }, { type: 'tool-call' }],
      tools: [],
    },
    group: 'Tools',
  });
  for (const samplingMode of SAMPLING_MODES) {
    cases.push({
      id: `sampling-${samplingMode}`,
      label: `Sampling · ${samplingMode}`,
      options: {
        expectedInputs: [{ type: 'text', languages: ['en'] }],
        expectedOutputs: [{ type: 'text', languages: ['en'] }],
        samplingMode,
      },
      group: 'Sampling',
    });
  }
  return cases;
}

export const SESSION_PRESETS = Object.freeze({
  'text-en': {
    expectedInputs: [{ type: 'text', languages: ['en'] }],
    expectedOutputs: [{ type: 'text', languages: ['en'] }],
  },
  'image-en': {
    expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'image' }],
    expectedOutputs: [{ type: 'text', languages: ['en'] }],
  },
  'audio-en': {
    expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'audio' }],
    expectedOutputs: [{ type: 'text', languages: ['en'] }],
  },
  'tools-en': {
    expectedInputs: [{ type: 'text', languages: ['en'] }, { type: 'tool-response' }],
    expectedOutputs: [{ type: 'text', languages: ['en'] }, { type: 'tool-call' }],
    tools: [],
  },
});
