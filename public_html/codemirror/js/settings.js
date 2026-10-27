export const settingsVersion = 1;
export const defaultSettings = Object.freeze({
  language: 'javascript',
  lineNumbers: true,
  foldGutter: true,
  bracketMatching: true,
  closeBrackets: true,
  autocomplete: true,
  search: true,
  multipleSelections: true,
  activeLine: true,
  lint: true,
  readOnly: false,
  lineWrapping: false,
  tabSize: 2,
  fontSize: 15,
  theme: 'light',
  keymap: 'default',
  mergeMode: 'side-by-side',
});

const choices = {
  language: ['javascript', 'html', 'css', 'json', 'markdown', 'ruby'],
  theme: ['light', 'dark'],
  keymap: ['default', 'vim'],
  mergeMode: ['side-by-side', 'unified'],
};

export function normalizeSettings(input = {}) {
  const result = { ...defaultSettings };
  for (const key of Object.keys(defaultSettings)) {
    const value = input[key];
    if (typeof defaultSettings[key] === 'boolean' && typeof value === 'boolean')
      result[key] = value;
    if (typeof defaultSettings[key] === 'string' && choices[key]?.includes(value))
      result[key] = value;
    if (key === 'tabSize' && Number.isInteger(value)) result[key] = Math.min(8, Math.max(1, value));
    if (key === 'fontSize' && Number.isInteger(value))
      result[key] = Math.min(24, Math.max(12, value));
  }
  return result;
}

export function savePayload(settings, documents) {
  return {
    version: settingsVersion,
    settings: normalizeSettings(settings),
    documents: { ...documents },
  };
}

export function restorePayload(value) {
  if (
    !value ||
    value.version !== settingsVersion ||
    !value.documents ||
    typeof value.documents !== 'object'
  ) {
    return { settings: { ...defaultSettings }, documents: {} };
  }
  return { settings: normalizeSettings(value.settings), documents: { ...value.documents } };
}
