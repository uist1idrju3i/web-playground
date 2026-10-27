import { checkRequirements } from '../library/js/requirements.js';
import { createSignedStore } from '../library/js/signed-storage.js';
import { appendEditorEvent, formatEditorEvent } from './event-log.js';
import { formatApiExample, optionsToAce } from './editor-api.js';
import { createAceAppState, transitionAceAppState } from './statechart.js';
import {
  createDefaultSave,
  formatSaveStatus,
  LANGUAGES,
  migrateAceSave,
  SAVE_VERSION,
} from './settings.js';

const startedAt = performance.now();
const byId = (id) => document.getElementById(id);
let appState = createAceAppState();
const requirementResults = await checkRequirements({
  required: ['es-modules'],
  optional: ['clipboard-api', 'indexeddb', 'local-storage', 'web-crypto'],
  container: byId('requirements'),
});
if (!requirementResults.ok) {
  byId('requirements').textContent = 'This browser cannot run the JavaScript required by Ace Lab.';
  appState = transitionAceAppState(appState, 'UNSUPPORTED');
  document.body.dataset.phase = appState.phase;
  document.body.dataset.appReady = 'true';
} else if (!globalThis.ace) {
  byId('requirements').textContent =
    'Ace did not load from this site. Check that the vendored files are available.';
  appState = transitionAceAppState(appState, 'ERROR');
  document.body.dataset.phase = appState.phase;
  document.body.dataset.appReady = 'true';
} else {
  try {
    await startAceLab();
  } catch (error) {
    byId('requirements').textContent = new URLSearchParams(location.search).has('debug')
      ? `Ace Lab could not initialize: ${error.message}`
      : 'Ace Lab could not initialize. Reload to try again.';
    appState = transitionAceAppState(appState, 'ERROR');
    document.body.dataset.phase = appState.phase;
    document.body.dataset.appReady = 'true';
  }
}

async function startAceLab() {
  const ace = globalThis.ace;
  let state = createDefaultSave();
  let saveStore;
  let saveTimer;
  let editor;
  let diffView;
  let eventLog = [];
  const saveNotice = byId('save-notice');
  const tabButtons = [...document.querySelectorAll('[role="tab"]')];

  function showSaveMessage(message, isError = false) {
    saveNotice.textContent = message;
    saveNotice.dataset.state = isError ? 'error' : 'ok';
  }

  try {
    saveStore = await createSignedStore({ name: 'ace-lab', version: SAVE_VERSION });
    const loaded = await saveStore.load();
    if (loaded.status === 'ok') state = migrateAceSave(loaded.data);
    showSaveMessage(
      formatSaveStatus(loaded.status),
      loaded.status !== 'ok' && loaded.status !== 'empty',
    );
  } catch {
    showSaveMessage(formatSaveStatus('unavailable'), true);
  }

  const vendorPath = new URL('./vendor/', import.meta.url).href;
  ace.config.set('useStrictCSP', true);
  ace.config.set('basePath', vendorPath);
  ace.config.set('modePath', vendorPath);
  ace.config.set('themePath', vendorPath);
  ace.config.set('workerPath', vendorPath);
  ace.config.set('loadWorkerFromBlob', false);

  const languageTools = ace.require('ace/ext/language_tools');
  languageTools.addCompleter({
    getCompletions(_editor, _session, _position, prefix, callback) {
      callback(
        null,
        prefix
          ? [
              {
                caption: 'aceLabNote',
                value: 'aceLabNote',
                meta: 'custom completer',
                score: 1000,
              },
            ]
          : [],
      );
    },
  });
  const settingsMenu = ace.require('ace/ext/settings_menu');

  editor = ace.edit('editor');
  settingsMenu.init(editor);
  editor.setOptions(optionsToAce(state.options, LANGUAGES[state.activeLanguage].mode));
  editor.setValue(state.documents[state.activeLanguage], -1);
  editor.session.setUseWorker(true);
  new (ace.require('ace/ext/statusbar').StatusBar)(editor, byId('ace-status'));
  registerControls();
  connectEditorEvents();
  restoreControls();
  updateApi();
  updateMetrics();
  updateLoadTime();
  renderEventLog();
  if (new URLSearchParams(location.search).has('debug')) {
    window.__aceLab = {
      editor,
      state,
      get diffView() {
        return diffView;
      },
    };
  }
  appState = transitionAceAppState(appState, 'READY');
  document.body.dataset.phase = appState.phase;
  document.body.dataset.appReady = 'true';

  function readControls() {
    state.options = {
      theme: byId('theme').value,
      keybinding: byId('keybinding').value,
      readOnly: byId('read-only').checked,
      wrap: byId('wrap').checked,
      tabSize: Number(byId('tab-size').value),
      fontSize: Number(byId('font-size').value),
      showInvisibles: byId('invisibles').checked,
      indentGuides: byId('guides').checked,
      foldWidgets: byId('fold-widgets').checked,
      autoComplete: byId('autocomplete').checked,
      closeBrackets: byId('close-brackets').checked,
      multipleCursors: byId('multi-cursor').checked,
    };
  }

  function restoreControls() {
    byId('language').value = state.activeLanguage;
    byId('theme').value = state.options.theme;
    byId('keybinding').value = state.options.keybinding;
    byId('read-only').checked = state.options.readOnly;
    byId('wrap').checked = state.options.wrap;
    byId('invisibles').checked = state.options.showInvisibles;
    byId('guides').checked = state.options.indentGuides;
    byId('fold-widgets').checked = state.options.foldWidgets;
    byId('autocomplete').checked = state.options.autoComplete;
    byId('close-brackets').checked = state.options.closeBrackets;
    byId('multi-cursor').checked = state.options.multipleCursors;
    byId('tab-size').value = String(state.options.tabSize);
    byId('font-size').value = String(state.options.fontSize);
    setThemeStylesheet();
  }

  function setThemeStylesheet() {
    const dark = state.options.theme === 'tomorrow_night';
    byId('theme-light').disabled = dark;
    byId('theme-dark').disabled = !dark;
  }

  function saveWorkspace() {
    if (!saveStore) return;
    state.documents[state.activeLanguage] = editor.getValue();
    saveStore.save(state).then(
      () => showSaveMessage('Workspace saved with a local integrity signature.'),
      () => showSaveMessage(formatSaveStatus('unavailable'), true),
    );
  }

  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(saveWorkspace, 300);
  }

  function updateApi() {
    const sample = formatApiExample(state.options, LANGUAGES[state.activeLanguage].mode);
    byId('api-example').textContent = sample;
    byId('api-example-secondary').textContent = sample;
  }

  function updateMetrics() {
    const cursor = editor.getCursorPosition();
    byId('metric-cursor').textContent = `${cursor.row + 1}:${cursor.column + 1}`;
    byId('metric-selections').textContent = String(editor.selection.getAllRanges().length);
    byId('metric-length').textContent = editor.getValue().length.toLocaleString('en');
    const bytes = performance
      .getEntriesByType('resource')
      .filter((entry) => new URL(entry.name).pathname.includes('/ace/vendor/'))
      .reduce((sum, entry) => sum + (entry.transferSize || entry.encodedBodySize || 0), 0);
    byId('metric-vendor-bytes').textContent = `${bytes.toLocaleString('en')} B`;
    byId('document-status').textContent =
      `${LANGUAGES[state.activeLanguage].label} · ${editor.session.getLength()} lines`;
  }

  function updateLoadTime() {
    const elapsed = Math.max(0, performance.now() - startedAt);
    byId('metric-load').textContent = `${elapsed.toFixed(0)} ms`;
  }

  function renderEventLog() {
    const list = byId('event-log');
    list.replaceChildren();
    for (const event of eventLog) {
      const item = document.createElement('li');
      item.textContent = `${event.timestamp} · ${event.event} · ${event.summary}`;
      list.append(item);
    }
  }

  function recordEvent(name, detail) {
    eventLog = appendEditorEvent(eventLog, formatEditorEvent(name, detail));
    renderEventLog();
    updateMetrics();
  }

  function connectEditorEvents() {
    editor.on('change', (delta) => {
      state.documents[state.activeLanguage] = editor.getValue();
      recordEvent('change', delta);
      scheduleSave();
    });
    editor.on('changeSelection', (event) => {
      recordEvent('changeSelection', { ...event, selection: editor.selection });
    });
    editor.on('changeMode', (event) => recordEvent('changeMode', event));
    editor.session.on('changeAnnotation', () => {
      const annotations = editor.session.getAnnotations();
      const count = annotations.length;
      byId('worker-status').textContent = count
        ? `Ace worker reported ${count} annotation${count === 1 ? '' : 's'}.`
        : 'Worker validation is active; no annotations are reported.';
    });
  }

  function applyOptions() {
    readControls();
    editor.setOptions(optionsToAce(state.options, LANGUAGES[state.activeLanguage].mode));
    setThemeStylesheet();
    editor.session.setUseWorker(true);
    updateApi();
    updateMetrics();
    scheduleSave();
  }

  function registerControls() {
    byId('language').addEventListener('change', (event) => {
      state.documents[state.activeLanguage] = editor.getValue();
      state.activeLanguage = event.target.value;
      editor.setValue(state.documents[state.activeLanguage], -1);
      editor.session.setMode(`ace/mode/${LANGUAGES[state.activeLanguage].mode}`);
      editor.session.setUseWorker(true);
      editor.focus();
      updateApi();
      updateMetrics();
      scheduleSave();
    });
    for (const id of [
      'theme',
      'keybinding',
      'read-only',
      'wrap',
      'invisibles',
      'guides',
      'fold-widgets',
      'autocomplete',
      'close-brackets',
      'multi-cursor',
      'tab-size',
      'font-size',
    ]) {
      byId(id).addEventListener('change', applyOptions);
    }
    byId('search-button').addEventListener('click', () => {
      ace.require('ace/ext/searchbox').Search(editor);
      editor.focus();
    });
    byId('settings-button').addEventListener('click', () => {
      editor.showSettingsMenu();
    });
    byId('beautify-button').addEventListener('click', () => {
      ace.require('ace/ext/beautify').beautify(editor.session);
      editor.focus();
    });
    byId('marker-button').addEventListener('click', () => {
      const Range = ace.require('ace/range').Range;
      const endColumn = Math.min(18, editor.session.getLine(0).length);
      editor.session.addMarker(new Range(0, 0, 0, endColumn), 'ace_selected-word', 'text', false);
      editor.focus();
    });
    byId('annotation-button').addEventListener('click', () => {
      editor.session.setAnnotations([
        { row: 0, column: 0, text: 'An annotation added through EditSession.', type: 'info' },
      ]);
      editor.focus();
    });
    byId('reset-button').addEventListener('click', async () => {
      clearTimeout(saveTimer);
      state = createDefaultSave();
      restoreControls();
      editor.setOptions(optionsToAce(state.options, LANGUAGES[state.activeLanguage].mode));
      editor.setValue(state.documents[state.activeLanguage], -1);
      editor.session.setUseWorker(true);
      if (saveStore) await saveStore.clear().catch(() => {});
      updateApi();
      updateMetrics();
      showSaveMessage('Fresh workspace ready.');
      saveWorkspace();
    });

    for (const button of tabButtons) {
      button.addEventListener('click', () => selectTab(button));
      button.addEventListener('keydown', handleTabKeydown);
    }
  }

  function selectTab(button) {
    for (const tab of tabButtons) {
      const selected = tab === button;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      byId(tab.getAttribute('aria-controls')).hidden = !selected;
    }
    if (button.id === 'tab-diff') renderInlineDiff();
    else if (button.id === 'tab-editor') editor.resize();
    updateMetrics();
  }

  function handleTabKeydown(event) {
    const current = tabButtons.indexOf(event.currentTarget);
    const next =
      event.key === 'ArrowRight'
        ? (current + 1) % tabButtons.length
        : event.key === 'ArrowLeft'
          ? (current - 1 + tabButtons.length) % tabButtons.length
          : event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? tabButtons.length - 1
              : -1;
    if (next >= 0) {
      event.preventDefault();
      tabButtons[next].focus();
      selectTab(tabButtons[next]);
    }
  }

  function renderInlineDiff() {
    if (diffView) {
      diffView.editorA?.resize();
      return;
    }
    const diff = ace.require('ace/ext/diff');
    const diffProvider = new diff.DiffProvider();
    const original = `const note = {
  title: 'An editor experiment',
  saved: false,
};

console.log(note.title);`;
    const modified = `const note = {
  title: 'A careful editor experiment',
  saved: true,
  tags: ['diff', 'ace'],
};

console.log(note.title);`;
    diffView = new diff.InlineDiffView(
      {
        inline: 'a',
        diffProvider,
        sessionA: ace.createEditSession(original, 'ace/mode/javascript'),
        sessionB: ace.createEditSession(modified, 'ace/mode/javascript'),
      },
      byId('diff-editor'),
    );
    diffView.editorA.setTheme(`ace/theme/${state.options.theme}`);
    diffView.editorA.resize();
    diffView.onInput();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') saveWorkspace();
  });
  window.addEventListener('pagehide', saveWorkspace);
}
