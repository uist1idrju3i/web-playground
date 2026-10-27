import { checkRequirements } from '/library/js/requirements.js';
import { createSignedStore } from '/library/js/signed-storage.js';
import { EditorState, Compartment } from './vendor/@codemirror-state.js';
import {
  EditorView,
  crosshairCursor,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  rectangularSelection,
} from './vendor/@codemirror-view.js';
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from './vendor/@codemirror-commands.js';
import {
  bracketMatching,
  defaultHighlightStyle,
  foldGutter,
  indentOnInput,
  foldKeymap,
  StreamLanguage,
  syntaxHighlighting,
} from './vendor/@codemirror-language.js';
import {
  autocompletion,
  closeBrackets,
  closeBracketsKeymap,
  completeFromList,
} from './vendor/@codemirror-autocomplete.js';
import { lintGutter, linter } from './vendor/@codemirror-lint.js';
import { search, searchKeymap, openSearchPanel } from './vendor/@codemirror-search.js';
import { javascript } from './vendor/@codemirror-lang-javascript.js';
import { html } from './vendor/@codemirror-lang-html.js';
import { css } from './vendor/@codemirror-lang-css.js';
import { json } from './vendor/@codemirror-lang-json.js';
import { markdown } from './vendor/@codemirror-lang-markdown.js';
import { ruby } from './vendor/@codemirror-legacy-modes-mode-ruby.js';
import { vim } from './vendor/@replit-codemirror-vim.js';
import { MergeView, unifiedMergeView } from './vendor/@codemirror-merge.js';
import { diagnosticsFor } from './js/lint-rules.js';
import { extensionSource } from './js/extension-config.js';
import { formatTransactionLog, summarizeTransaction } from './js/transaction-log.js';
import { languages, samples } from './js/samples.js';
import { defaultSettings, normalizeSettings, restorePayload, savePayload } from './js/settings.js';

const started = performance.now();
performance.mark('codemirror-lab-start');
const requirements = await checkRequirements({
  required: ['es-modules'],
  optional: ['clipboard-api', 'indexeddb', 'web-crypto'],
  container: document.querySelector('#requirements'),
});
const $ = (selector) => document.querySelector(selector);
const settingsCompartments = new Map();
const settingsKeys = [
  'lineNumbers',
  'foldGutter',
  'bracketMatching',
  'closeBrackets',
  'autocomplete',
  'search',
  'multipleSelections',
  'activeLine',
  'lint',
  'readOnly',
  'lineWrapping',
  'theme',
  'keymap',
  'tabSize',
  'fontSize',
];
let settings = { ...defaultSettings };
let documents = { ...samples };
let currentLanguage = settings.language;
let editorView;
let mergeView;
let store;
let saveTimer;
let transactionEntries = [];

function shadowMount(host) {
  const root = host.shadowRoot ?? host.attachShadow({ mode: 'open' });
  root.replaceChildren();
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./editor.css', import.meta.url).href;
  const ready = new Promise((resolve) => {
    link.addEventListener('load', resolve, { once: true });
    link.addEventListener('error', resolve, { once: true });
  });
  root.append(link);
  const container = document.createElement('div');
  container.className = 'cm-root';
  root.append(container);
  return { root, container, ready };
}

const editorMount = shadowMount($('#editor-host'));
const mergeMount = shadowMount($('#merge-host'));

function languageExtension(language) {
  return language === 'ruby'
    ? StreamLanguage.define(ruby)
    : { javascript, html, css, json, markdown }[language]();
}

function themeExtension(theme) {
  return EditorView.theme(
    {
      '&': {
        color: theme === 'dark' ? '#e9f1f4' : '#18324a',
        backgroundColor: theme === 'dark' ? '#17252f' : '#fffdf8',
      },
      '.cm-content': { caretColor: theme === 'dark' ? '#f6c177' : '#a13f55' },
      '.cm-gutters': {
        color: theme === 'dark' ? '#a8c0cc' : '#587087',
        backgroundColor: theme === 'dark' ? '#203640' : '#edf2f3',
      },
      '.cm-activeLine': { backgroundColor: theme === 'dark' ? '#243b46' : '#f4eee3' },
      '.cm-activeLineGutter': { backgroundColor: theme === 'dark' ? '#29434f' : '#e7ded1' },
    },
    { dark: theme === 'dark' },
  );
}

function customCompletions(context) {
  return completeFromList([
    { label: 'observe', type: 'keyword', info: 'A small action for the lab.' },
    { label: 'compose', type: 'function', info: 'Combine focused extensions.' },
    { label: 'CodeMirror', type: 'class' },
  ])(context);
}

function featureExtension(key) {
  if (key === 'lineNumbers') return settings.lineNumbers ? lineNumbers() : [];
  if (key === 'foldGutter') return settings.foldGutter ? [foldGutter(), keymap.of(foldKeymap)] : [];
  if (key === 'bracketMatching') return settings.bracketMatching ? bracketMatching() : [];
  if (key === 'closeBrackets')
    return settings.closeBrackets ? [closeBrackets(), keymap.of(closeBracketsKeymap)] : [];
  if (key === 'autocomplete')
    return settings.autocomplete ? autocompletion({ override: [customCompletions] }) : [];
  if (key === 'search') return settings.search ? [search(), keymap.of(searchKeymap)] : [];
  if (key === 'multipleSelections')
    return settings.multipleSelections
      ? [EditorState.allowMultipleSelections.of(true), rectangularSelection(), crosshairCursor()]
      : [];
  if (key === 'activeLine')
    return settings.activeLine ? [highlightActiveLine(), highlightActiveLineGutter()] : [];
  if (key === 'lint')
    return settings.lint
      ? [linter((view) => diagnosticsFor(currentLanguage, view.state.doc.toString())), lintGutter()]
      : [];
  if (key === 'readOnly')
    return [EditorState.readOnly.of(settings.readOnly), EditorView.editable.of(!settings.readOnly)];
  if (key === 'lineWrapping') return settings.lineWrapping ? EditorView.lineWrapping : [];
  if (key === 'theme') return themeExtension(settings.theme);
  if (key === 'keymap')
    return settings.keymap === 'vim'
      ? vim()
      : keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]);
  if (key === 'tabSize') return EditorState.tabSize.of(settings.tabSize);
  if (key === 'fontSize') return EditorView.theme({ '&': { fontSize: `${settings.fontSize}px` } });
  return [];
}

function updateCodePanel() {
  $('#extensions-code').textContent = extensionSource(settings, currentLanguage);
}

function updateStatus() {
  if (!editorView) return;
  const state = editorView.state;
  const head = state.selection.main.head;
  const line = state.doc.lineAt(head);
  $('#editor-status').textContent =
    `Cursor ${line.number}:${head - line.from + 1} · selections ${state.selection.ranges.length} · document ${state.doc.length} chars`;
}

function addTransaction(transaction) {
  transactionEntries = [summarizeTransaction(transaction), ...transactionEntries].slice(0, 12);
  $('#transaction-log').innerHTML = '';
  for (const line of formatTransactionLog(transactionEntries)) {
    const item = document.createElement('li');
    item.textContent = line;
    $('#transaction-log').append(item);
  }
}

function editorExtensions() {
  const compartments = [];
  for (const key of settingsKeys) {
    settingsCompartments.set(key, settingsCompartments.get(key) ?? new Compartment());
    compartments.push(settingsCompartments.get(key).of(featureExtension(key)));
  }
  return [
    languageExtension(currentLanguage),
    history(),
    indentOnInput(),
    syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
    drawSelection(),
    EditorView.updateListener.of((update) => {
      if (update.docChanged) {
        documents[currentLanguage] = update.state.doc.toString();
        clearTimeout(saveTimer);
        saveTimer = setTimeout(save, 500);
      }
      if (update.selectionSet || update.docChanged) updateStatus();
      for (const transaction of update.transactions) addTransaction(transaction);
    }),
    ...compartments,
  ];
}

function rebuildEditor() {
  editorView?.destroy();
  editorView = new EditorView({
    state: EditorState.create({ doc: documents[currentLanguage], extensions: editorExtensions() }),
    parent: editorMount.container,
    root: editorMount.root,
  });
  updateCodePanel();
  updateStatus();
}

function reconfigure(key) {
  if (!editorView) return;
  editorView.dispatch({
    effects: settingsCompartments.get(key).reconfigure(featureExtension(key)),
  });
  updateCodePanel();
}

function syncControls() {
  for (const input of document.querySelectorAll('[data-setting]'))
    input.checked = settings[input.dataset.setting];
  $('#language-select').value = currentLanguage;
  $('#theme-select').value = settings.theme;
  $('#keymap-select').value = settings.keymap;
  $('#tab-size').value = String(settings.tabSize);
  $('#font-size').value = String(settings.fontSize);
  $('#merge-mode').value = settings.mergeMode;
}

async function save() {
  if (!store) return;
  const result = await store.save(savePayload(settings, documents));
  $('#save-status').textContent = `Signed save: saved (revision ${result.counter})`;
}

function refreshMerge() {
  mergeView?.destroy();
  $('#merge-host').replaceChildren();
  const baseline = samples[currentLanguage];
  const current = documents[currentLanguage];
  if (settings.mergeMode === 'unified') {
    const state = EditorState.create({
      doc: current,
      extensions: [languageExtension(currentLanguage), unifiedMergeView({ original: baseline })],
    });
    mergeView = new EditorView({ state, parent: mergeMount.container, root: mergeMount.root });
  } else {
    mergeView = new MergeView({
      parent: mergeMount.container,
      root: mergeMount.root,
      a: { doc: baseline, extensions: [languageExtension(currentLanguage)] },
      b: { doc: current, extensions: [languageExtension(currentLanguage)] },
      collapseUnchanged: { margin: 3, minSize: 4 },
    });
  }
}

function showPanel(id) {
  for (const panel of document.querySelectorAll('[role=tabpanel]'))
    panel.classList.toggle('is-hidden', panel.id !== id);
  for (const tab of document.querySelectorAll('[role=tab]')) {
    const active = tab.dataset.panel === id;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', String(active));
  }
  if (id === 'merge-panel') refreshMerge();
}

function wireControls() {
  for (const tab of document.querySelectorAll('[role=tab]'))
    tab.addEventListener('click', () => showPanel(tab.dataset.panel));
  for (const input of document.querySelectorAll('[data-setting]'))
    input.addEventListener('change', () => {
      settings = normalizeSettings({ ...settings, [input.dataset.setting]: input.checked });
      reconfigure(input.dataset.setting);
      save();
    });
  $('#language-select').addEventListener('change', () => {
    documents[currentLanguage] = editorView.state.doc.toString();
    currentLanguage = $('#language-select').value;
    settings = normalizeSettings({ ...settings, language: currentLanguage });
    rebuildEditor();
    save();
  });
  $('#theme-select').addEventListener('change', () => {
    settings = normalizeSettings({ ...settings, theme: $('#theme-select').value });
    reconfigure('theme');
    save();
  });
  $('#keymap-select').addEventListener('change', () => {
    settings = normalizeSettings({ ...settings, keymap: $('#keymap-select').value });
    reconfigure('keymap');
    save();
  });
  $('#tab-size').addEventListener('change', () => {
    settings = normalizeSettings({ ...settings, tabSize: Number($('#tab-size').value) });
    reconfigure('tabSize');
    save();
  });
  $('#font-size').addEventListener('input', () => {
    settings = normalizeSettings({ ...settings, fontSize: Number($('#font-size').value) });
    reconfigure('fontSize');
  });
  $('#search-button').addEventListener('click', () => openSearchPanel(editorView));
  $('#reset-document').addEventListener('click', () => {
    documents[currentLanguage] = samples[currentLanguage];
    rebuildEditor();
    save();
  });
  $('#save-now').addEventListener('click', save);
  $('#merge-mode').addEventListener('change', () => {
    settings = normalizeSettings({ ...settings, mergeMode: $('#merge-mode').value });
    refreshMerge();
    save();
  });
  $('#refresh-merge').addEventListener('click', refreshMerge);
}

const requirementOk = requirements.ok;
if (!requirementOk)
  $('#boot-status').textContent =
    'Some optional capabilities are unavailable; the editor remains usable.';
try {
  store = await createSignedStore({ name: 'codemirror-lab', version: 1 });
  const loaded = await store.load();
  if (loaded.status === 'ok') {
    const restored = restorePayload(loaded.data);
    settings = restored.settings;
    documents = { ...documents, ...restored.documents };
    $('#save-status').textContent = 'Signed save: restored';
  } else if (loaded.status !== 'empty') {
    $('#save-status').textContent = `Signed save: ${loaded.status}; using fresh samples`;
  }
} catch {
  $('#save-status').textContent = 'Signed save: unavailable';
}
currentLanguage = settings.language;
for (const language of languages)
  $('#language-select').add(new Option(language.label, language.id));
wireControls();
syncControls();
await Promise.all([editorMount.ready, mergeMount.ready]);
rebuildEditor();
performance.mark('codemirror-lab-ready');
const vendorBytes = performance
  .getEntriesByType('resource')
  .filter((entry) => entry.name.includes('/codemirror/vendor/'))
  .reduce((total, entry) => total + (entry.transferSize || entry.encodedBodySize || 0), 0);
$('#load-metrics').textContent =
  `Load ${(performance.now() - started).toFixed(0)} ms · vendor ${vendorBytes.toLocaleString()} bytes`;
$('#boot-status').textContent = 'Ready';
document.body.dataset.appReady = 'true';
