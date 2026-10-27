export const featureLabels = Object.freeze({
  lineNumbers: 'line numbers',
  foldGutter: 'fold gutter',
  bracketMatching: 'bracket matching',
  closeBrackets: 'close brackets',
  autocomplete: 'autocomplete',
  search: 'search and replace',
  multipleSelections: 'multiple selections',
  activeLine: 'active line',
  lint: 'lint diagnostics',
  readOnly: 'read-only',
  lineWrapping: 'line wrapping',
});

export function enabledFeatures(settings) {
  return Object.entries(featureLabels)
    .filter(([key]) => settings[key])
    .map(([, label]) => label);
}

export function extensionSource(settings, language) {
  const expressions = [];
  if (settings.lineNumbers) expressions.push('lineNumbers()');
  if (settings.foldGutter) expressions.push('foldGutter()');
  if (settings.bracketMatching) expressions.push('bracketMatching()');
  if (settings.closeBrackets) expressions.push('closeBrackets()');
  if (settings.autocomplete) expressions.push('autocompletion({ override: [customCompletions] })');
  if (settings.search) expressions.push('search()');
  if (settings.multipleSelections)
    expressions.push(
      'EditorState.allowMultipleSelections.of(true)',
      'rectangularSelection()',
      'crosshairCursor()',
    );
  if (settings.activeLine) expressions.push('highlightActiveLine()');
  if (settings.lint) expressions.push('linter(diagnosticsFor)', 'lintGutter()');
  if (settings.readOnly)
    expressions.push('EditorState.readOnly.of(true)', 'EditorView.editable.of(false)');
  if (settings.lineWrapping) expressions.push('EditorView.lineWrapping');
  expressions.push(
    `themeExtension('${settings.theme}')`,
    `EditorState.tabSize.of(${settings.tabSize})`,
  );
  expressions.push(`EditorView.theme({ fontSize: '${settings.fontSize}px' })`);
  expressions.push(`keymap.of(${settings.keymap === 'vim' ? 'vim()' : 'defaultKeymap'})`);
  expressions.push(
    {
      javascript: 'javascript()',
      html: 'html()',
      css: 'css()',
      json: 'json()',
      markdown: 'markdown()',
      ruby: 'StreamLanguage.define(ruby)',
    }[language],
  );
  return `const extensions = [\n${expressions.map((expression) => `  ${expression}`).join(',\n')}\n];`;
}
