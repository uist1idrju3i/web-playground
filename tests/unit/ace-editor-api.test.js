import assert from 'node:assert/strict';
import test from 'node:test';
import { formatApiExample, optionsToAce } from '../../public_html/ace/editor-api.js';

const options = {
  theme: 'tomorrow_night',
  keybinding: 'vim',
  readOnly: true,
  wrap: true,
  tabSize: 4,
  fontSize: 18,
  showInvisibles: true,
  indentGuides: false,
  foldWidgets: true,
  autoComplete: false,
  closeBrackets: true,
  multipleCursors: true,
};

test('Ace options map to the documented public editor API', () => {
  assert.deepEqual(optionsToAce(options, 'json'), {
    mode: 'ace/mode/json',
    theme: 'ace/theme/tomorrow_night',
    keyboardHandler: 'ace/keyboard/vim',
    readOnly: true,
    wrap: 'free',
    tabSize: 4,
    fontSize: '18px',
    showInvisibles: true,
    displayIndentGuides: false,
    showFoldWidgets: true,
    enableMultiselect: true,
    behavioursEnabled: true,
    enableBasicAutocompletion: false,
    enableLiveAutocompletion: false,
    enableSnippets: false,
    showGutter: true,
    showPrintMargin: false,
    highlightActiveLine: true,
    useWorker: true,
  });
});

test('API example reflects the current options and same-origin worker policy', () => {
  const example = formatApiExample(options, 'json');
  assert.match(example, /useStrictCSP/u);
  assert.match(example, /loadWorkerFromBlob', false/u);
  assert.match(example, /ace\/keyboard\/vim/u);
  assert.match(example, /"readOnly": true/u);
  assert.match(example, /"mode": "ace\/mode\/json"/u);
});
