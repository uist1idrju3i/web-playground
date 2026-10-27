const KEYBINDING_HANDLERS = Object.freeze({
  default: null,
  vim: 'ace/keyboard/vim',
  emacs: 'ace/keyboard/emacs',
  vscode: 'ace/keyboard/vscode',
  sublime: 'ace/keyboard/sublime',
});

export function optionsToAce(options, language) {
  return {
    mode: `ace/mode/${language}`,
    theme: `ace/theme/${options.theme}`,
    keyboardHandler: KEYBINDING_HANDLERS[options.keybinding] ?? null,
    readOnly: Boolean(options.readOnly),
    wrap: options.wrap ? 'free' : false,
    tabSize: Number(options.tabSize),
    fontSize: `${Number(options.fontSize)}px`,
    showInvisibles: Boolean(options.showInvisibles),
    displayIndentGuides: Boolean(options.indentGuides),
    showFoldWidgets: Boolean(options.foldWidgets),
    enableMultiselect: Boolean(options.multipleCursors),
    behavioursEnabled: Boolean(options.closeBrackets),
    enableBasicAutocompletion: Boolean(options.autoComplete),
    enableLiveAutocompletion: Boolean(options.autoComplete),
    enableSnippets: Boolean(options.autoComplete),
    showGutter: true,
    showPrintMargin: false,
    highlightActiveLine: true,
    useWorker: true,
  };
}

export function formatApiExample(options, language) {
  const mapped = optionsToAce(options, language);
  const values = JSON.stringify(mapped, null, 2)
    .split('\n')
    .map((line, index) => (index === 0 ? line : `  ${line}`))
    .join('\n');
  return `ace.config.set('useStrictCSP', true);\nace.config.set('basePath', vendorPath);\nace.config.set('modePath', vendorPath);\nace.config.set('themePath', vendorPath);\nace.config.set('workerPath', vendorPath);\nace.config.set('loadWorkerFromBlob', false);\neditor.setOptions(${values});`;
}
