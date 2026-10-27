import { checkRequirements } from '../library/js/requirements.js';
import { createSignedStore } from '../library/js/signed-storage.js';
import { calculate } from './js/calc.js';
import { matrixCases, SAMPLING_MODES, SESSION_PRESETS } from './js/availability-matrix.js';
import { ERROR_CASES } from './js/error-cases.js';
import { HISTORY_VERSION, makeHistory, restoreInitialPrompts } from './js/history.js';
import { buildInitialPrompts, buildPromptMessages } from './js/messages.js';
import { validateSchema } from './js/schema-validate.js';
import { canTransition, transition } from './js/statechart.js';
import { runToolLoop } from './js/tool-loop.js';

const byId = (id) => document.getElementById(id);
const TEXT_SCHEMA = {
  type: 'object',
  required: ['sentiment', 'hashtags', 'rating'],
  additionalProperties: false,
  properties: {
    sentiment: { type: 'string', enum: ['positive', 'neutral', 'negative'] },
    hashtags: {
      type: 'array',
      maxItems: 3,
      items: { type: 'string', pattern: '^#[A-Za-z0-9_]+$' },
    },
    rating: { type: 'number', minimum: 0, maximum: 5 },
  },
};
const TOOL_DEFINITIONS = [
  {
    name: 'calculator',
    description:
      'Evaluate a basic arithmetic expression. Supports numbers, parentheses, +, -, *, and /.',
    inputSchema: {
      type: 'object',
      properties: { expression: { type: 'string' } },
      required: ['expression'],
      additionalProperties: false,
    },
  },
  {
    name: 'current_time',
    description: 'Get the current local time, optionally in an IANA time zone.',
    inputSchema: {
      type: 'object',
      properties: { timeZone: { type: 'string' } },
      additionalProperties: false,
    },
  },
  {
    name: 'convert_units',
    description: 'Convert between meters, kilometers, centimeters, miles, kilograms, and pounds.',
    inputSchema: {
      type: 'object',
      properties: { value: { type: 'number' }, from: { type: 'string' }, to: { type: 'string' } },
      required: ['value', 'from', 'to'],
      additionalProperties: false,
    },
  },
];

let phase = 'checking';
let languageModel = null;
let availabilityResults = new Map();
let session = null;
let cloneSession = null;
let savedHistory = null;
let signedStore = null;
let chatMessages = [];
let promptController = null;
let mediaRecorder = null;
let recordedChunks = [];
let selectedImage = null;
let selectedAudio = null;
let audioContext = null;
let currentAvailabilityStatus = 'unavailable';

function phaseTo(target) {
  if (phase === target) return;
  if (canTransition(phase, 'FAIL') && target === 'error') {
    phase = transition(phase, 'FAIL');
  } else if (target === 'ready' && phase === 'error' && canTransition(phase, 'RESUME')) {
    phase = transition(phase, 'RESUME', target);
  } else if (target === 'ready' && phase === 'prompting' && canTransition(phase, 'PROMPTED')) {
    phase = transition(phase, 'PROMPTED', target);
  } else if (
    ['unsupported', 'unavailable', 'downloadable', 'downloading', 'available'].includes(target)
  ) {
    if (canTransition(phase, 'CHECK')) phase = transition(phase, 'CHECK', target);
    else if (canTransition(phase, 'RECHECK')) phase = transition(phase, 'RECHECK', target);
  } else {
    const event = {
      creating: 'CREATE',
      ready: 'CREATED',
      prompting: 'PROMPT',
      destroyed: 'DESTROY',
      checking: 'RECOVER',
    }[target];
    if (event && canTransition(phase, event)) phase = transition(phase, event, target);
  }
  document.body.dataset.phase = phase;
}

function pretty(value) {
  return JSON.stringify(
    value,
    (_key, item) => {
      if (item instanceof RegExp) return item.toString();
      if (typeof item === 'function') return `[Function ${item.name || 'anonymous'}]`;
      if (item instanceof Blob) return `[Blob ${item.type || 'application/octet-stream'}]`;
      if (typeof AbortSignal !== 'undefined' && item instanceof AbortSignal) return '[AbortSignal]';
      if (typeof AudioBuffer !== 'undefined' && item instanceof AudioBuffer) {
        return `[AudioBuffer ${item.numberOfChannels}ch ${item.duration.toFixed(2)}s]`;
      }
      return item;
    },
    2,
  );
}

function showCode(id, expression, object) {
  const pre = byId(id);
  if (!pre) return;
  pre.textContent = object === undefined ? expression : `${expression}\n${pretty(object)}`;
}

function statusClass(value) {
  return (
    {
      available: 'status-supported',
      downloadable: 'status-downloadable',
      downloading: 'status-downloading',
      unavailable: 'status-unavailable',
      present: 'status-supported',
      absent: 'status-unsupported',
    }[value] ?? 'status-unavailable'
  );
}

function appendStatus(container, status, label = status) {
  const chip = document.createElement('span');
  chip.className = `status-chip ${statusClass(status)}`;
  chip.textContent = label;
  return chip;
}

function setAppStatus(text) {
  byId('app-status').textContent = text;
}

function renderSurface() {
  const rows = [
    [
      'LanguageModel.availability()',
      Boolean(languageModel?.availability),
      'Read-only support query',
    ],
    [
      'LanguageModel.create()',
      Boolean(languageModel?.create),
      'Only called after an explicit button click',
    ],
    [
      'session.prompt()',
      Boolean(languageModel?.prototype && 'prompt' in languageModel.prototype),
      'One-shot response method',
    ],
    [
      'session.promptStreaming()',
      Boolean(languageModel?.prototype && 'promptStreaming' in languageModel.prototype),
      'Streaming response method',
    ],
    [
      'session.append()',
      Boolean(languageModel?.prototype && 'append' in languageModel.prototype),
      'Append context without a response',
    ],
    [
      'session.clone()',
      Boolean(languageModel?.prototype && 'clone' in languageModel.prototype),
      'Branch an existing conversation',
    ],
    [
      'session.destroy()',
      Boolean(languageModel?.prototype && 'destroy' in languageModel.prototype),
      'Release a session',
    ],
    [
      'contextUsage / contextWindow',
      Boolean(
        languageModel?.prototype &&
        'contextUsage' in languageModel.prototype &&
        'contextWindow' in languageModel.prototype,
      ),
      'Current context counters',
    ],
    [
      'measureContextUsage()',
      Boolean(languageModel?.prototype && 'measureContextUsage' in languageModel.prototype),
      'Estimate prompt context before sending',
    ],
    [
      'contextoverflow event',
      Boolean(languageModel?.prototype && 'oncontextoverflow' in languageModel.prototype),
      'Notice when earlier prompt/response pairs are removed',
    ],
    [
      'samplingMode',
      hasFeature('samplingMode'),
      'Experimental option; support is detected without creating a session',
    ],
    ['tools', hasFeature('tools'), 'Experimental option; requires tool classes below'],
    [
      'LanguageModelToolCall',
      typeof globalThis.LanguageModelToolCall === 'function',
      'Experimental tool-call result class',
    ],
    [
      'LanguageModelToolSuccess',
      typeof globalThis.LanguageModelToolSuccess === 'function',
      'Experimental tool success result class',
    ],
    [
      'LanguageModelToolError',
      typeof globalThis.LanguageModelToolError === 'function',
      'Experimental tool error result class',
    ],
    ['thinkingEffort', hasFeature('thinkingEffort'), 'Experimental reasoning option'],
    ['legacy inputUsage', hasLegacy('inputUsage'), 'Presence only; never read by this app'],
    ['legacy inputQuota', hasLegacy('inputQuota'), 'Presence only; never read by this app'],
    [
      'legacy measureInputUsage()',
      hasLegacy('measureInputUsage'),
      'Presence only; never called by this app',
    ],
    ['legacy params()', Boolean(languageModel?.params), 'Presence only; never called by this app'],
  ];
  const tbody = byId('api-surface');
  tbody.replaceChildren();
  for (const [name, present, note] of rows) {
    const row = document.createElement('tr');
    const member = document.createElement('td');
    member.dataset.label = 'Member';
    member.textContent = name;
    const state = document.createElement('td');
    state.dataset.label = 'Status';
    state.append(
      appendStatus(state, present ? 'present' : 'absent', present ? 'Present' : 'Absent'),
    );
    const detail = document.createElement('td');
    detail.dataset.label = 'Notes';
    detail.textContent = note;
    row.append(member, state, detail);
    tbody.append(row);
  }
  byId('api-surface-count').textContent =
    `${rows.filter((row) => row[1]).length} of ${rows.length} present`;
}

function hasFeature(name) {
  const prototype = languageModel?.prototype;
  return Boolean(
    (prototype && name in prototype) ||
    (languageModel && name in languageModel) ||
    typeof globalThis[name] !== 'undefined',
  );
}

function hasLegacy(name) {
  return Boolean(
    (languageModel?.prototype && name in languageModel.prototype) ||
    (languageModel && name in languageModel),
  );
}

async function availability(options, timeoutMs = 2200) {
  if (!languageModel?.availability)
    return { status: 'unavailable', detail: 'LanguageModel is absent.' };
  let timer;
  try {
    const result = await Promise.race([
      languageModel.availability(options),
      new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Availability check timed out.')), timeoutMs);
      }),
    ]);
    return ['unavailable', 'downloadable', 'downloading', 'available'].includes(result)
      ? { status: result, detail: '' }
      : { status: 'unavailable', detail: 'The API returned an unknown availability state.' };
  } catch (error) {
    return { status: 'unavailable', detail: error?.message ?? 'Availability check failed.' };
  } finally {
    clearTimeout(timer);
  }
}

function renderMatrixRow(item, result) {
  const row = document.createElement('tr');
  const label = document.createElement('td');
  label.dataset.label = 'Request';
  label.textContent = item.label;
  const state = document.createElement('td');
  state.dataset.label = 'Availability';
  const statusLabel = result?.status ?? 'unavailable';
  state.append(appendStatus(state, statusLabel, statusLabel));
  if (result?.detail) {
    state.title = result.detail;
    state.setAttribute('aria-label', `${statusLabel}: ${result.detail}`);
  }
  const exact = document.createElement('td');
  exact.dataset.label = 'Exact options';
  const code = document.createElement('code');
  code.textContent = pretty(item.options);
  exact.append(code);
  row.dataset.caseId = item.id;
  row.append(label, state, exact);
  return row;
}

async function renderAvailabilityMatrix() {
  const tableBody = byId('availability-matrix');
  const cases = matrixCases();
  tableBody.replaceChildren();
  if (!languageModel?.availability) {
    availabilityResults = new Map(
      cases.map((item) => [
        item.id,
        { status: 'unavailable', detail: 'LanguageModel is not exposed.' },
      ]),
    );
    for (const item of cases)
      tableBody.append(renderMatrixRow(item, availabilityResults.get(item.id)));
    byId('matrix-summary').textContent = 'No Prompt API is exposed';
    return;
  }
  byId('matrix-summary').textContent = `Checking ${cases.length} option sets with a timeout…`;
  const results = await Promise.all(
    cases.map(async (item) => {
      if (item.id.startsWith('sampling-') && !hasFeature('samplingMode')) {
        return [item.id, { status: 'unavailable', detail: 'samplingMode is not exposed.' }];
      }
      if (item.id === 'tools-en' && !toolsAvailable()) {
        return [item.id, { status: 'unavailable', detail: 'Tool-call support is not exposed.' }];
      }
      return [item.id, await availability(item.options)];
    }),
  );
  availabilityResults = new Map(results);
  for (const item of cases)
    tableBody.append(renderMatrixRow(item, availabilityResults.get(item.id)));
  const counts = [...availabilityResults.values()].reduce((all, item) => {
    all[item.status] = (all[item.status] ?? 0) + 1;
    return all;
  }, {});
  byId('matrix-summary').textContent = Object.entries(counts)
    .map(([key, count]) => `${count} ${key}`)
    .join(' · ');
}

function toolsAvailable() {
  return (
    hasFeature('tools') &&
    typeof globalThis.LanguageModelToolCall === 'function' &&
    typeof globalThis.LanguageModelToolSuccess === 'function' &&
    typeof globalThis.LanguageModelToolError === 'function'
  );
}

function initialPromptsFromForm() {
  const example = byId('example-prompt').value;
  const match = example.match(/User:\s*([\s\S]*?)\s*Assistant:\s*([\s\S]*)/u);
  return buildInitialPrompts({
    system: byId('system-prompt').value,
    example: match ? { user: match[1].trim(), assistant: match[2].trim() } : null,
  });
}

function createOptions(preset = byId('session-preset').value, { includeInitial = true } = {}) {
  const base = structuredClone(SESSION_PRESETS[preset] ?? SESSION_PRESETS['text-en']);
  if (includeInitial) base.initialPrompts = initialPromptsFromForm();
  return base;
}

function setProgress(loaded) {
  const progress = byId('download-progress');
  progress.hidden = false;
  if (loaded >= 1) {
    progress.removeAttribute('value');
    byId('download-note').textContent = 'Download finished · loading model into memory…';
  } else {
    progress.max = 1;
    progress.value = Math.max(0, Math.min(1, loaded));
    byId('download-note').textContent = `Downloading model · ${Math.round(loaded * 100)}%`;
  }
}

function updateContext() {
  if (!session) return;
  const usage = Number(session.contextUsage);
  const windowSize = Number(session.contextWindow);
  if (Number.isFinite(usage) && Number.isFinite(windowSize) && windowSize > 0) {
    byId('context-label').textContent =
      `${usage.toLocaleString()} / ${windowSize.toLocaleString()}`;
    byId('context-progress').max = windowSize;
    byId('context-progress').value = Math.min(windowSize, usage);
  } else {
    byId('context-label').textContent = 'Context counters unavailable';
  }
}

function updateSessionControls() {
  const ready = Boolean(session);
  const supported = Boolean(languageModel?.create);
  byId('session-state').textContent = ready
    ? 'Session ready'
    : phase === 'destroyed'
      ? 'Destroyed'
      : 'No session';
  byId('session-state').className = `status-chip ${ready ? 'status-supported' : 'status-info'}`;
  byId('chat-input').disabled = !ready;
  byId('send-prompt').disabled = !ready || Boolean(promptController);
  byId('stop-prompt').disabled = !promptController;
  byId('save-chat').disabled = !ready || !signedStore;
  byId('clone-session').disabled = !ready || typeof session.clone !== 'function';
  byId('destroy-session').disabled = !ready;
  byId('restore-session').disabled = !supported || !savedHistory;
  byId('run-structured').disabled = !supported;
  byId('send-image').disabled = !supported || !selectedImage;
  byId('send-audio').disabled = !supported || !selectedAudio;
  byId('run-tools').disabled = !supported || !toolsAvailable();
  byId('run-sampling').disabled = !supported || !hasFeature('samplingMode');
  byId('clone-input').disabled = !cloneSession;
  byId('clone-send').disabled = !cloneSession;
  byId('clone-destroy').disabled = !cloneSession;
}

function renderChat() {
  const log = byId('chat-log');
  log.replaceChildren();
  for (const item of chatMessages) {
    const message = document.createElement('div');
    message.className = 'chat-message';
    message.dataset.role = item.role;
    message.textContent = item.content;
    log.append(message);
  }
  log.scrollTop = log.scrollHeight;
}

function trackContextEvents(activeSession) {
  if (typeof activeSession.addEventListener === 'function') {
    activeSession.addEventListener('contextoverflow', () => {
      byId('context-notice').textContent =
        'Context overflow: earlier prompt/response pairs may have been removed.';
    });
  }
  updateContext();
}

async function createSessionWithOptions(options, { showProgress = true, target = 'chat' } = {}) {
  if (!languageModel?.create) throw new Error('LanguageModel.create() is unavailable.');
  const availabilityResult = await availability(options);
  if (availabilityResult.status === 'unavailable') {
    if (showProgress)
      setAppStatus(
        `This option set is unavailable: ${availabilityResult.detail || 'check browser and hardware requirements.'}`,
      );
    return null;
  }
  showCode(
    target === 'structured'
      ? 'structured-code'
      : target === 'tools'
        ? 'tools-code'
        : target === 'sampling'
          ? 'sampling-code'
          : target === 'multimodal'
            ? 'multimodal-code'
            : 'chat-code',
    'const availability = await LanguageModel.availability(options);',
    options,
  );
  if (showProgress) {
    phaseTo('creating');
    byId('download-progress').hidden = false;
    byId('download-progress').value = 0;
    byId('download-note').textContent = 'Preparing model…';
  }
  const monitor = (downloadMonitor) => {
    downloadMonitor.addEventListener('downloadprogress', (event) => {
      if (showProgress) setProgress(event.loaded);
    });
  };
  const createArgs = { ...options, monitor };
  showCode(
    target === 'structured'
      ? 'structured-code'
      : target === 'tools'
        ? 'tools-code'
        : target === 'sampling'
          ? 'sampling-code'
          : target === 'multimodal'
            ? 'multimodal-code'
            : 'chat-code',
    'const session = await LanguageModel.create(createArgs);',
    createArgs,
  );
  try {
    const created = await languageModel.create(createArgs);
    if (showProgress) {
      phaseTo('ready');
      byId('download-progress').hidden = true;
      byId('download-note').textContent = 'Session ready.';
      setAppStatus('Session created from an explicit user action.');
    }
    return created;
  } catch (error) {
    if (showProgress) {
      phaseTo('error');
      byId('download-note').textContent = `${error.name}: ${error.message}`;
      setAppStatus('Session creation failed. Review the error and recover by retrying.');
    }
    throw error;
  }
}

async function startChat(options = createOptions()) {
  try {
    const created = await createSessionWithOptions(options);
    if (!created) return null;
    await cloneSession?.destroy?.();
    cloneSession = null;
    await session?.destroy?.();
    session = created;
    trackContextEvents(session);
    updateSessionControls();
    return session;
  } catch (error) {
    setAppStatus(`${error.name}: ${error.message}`);
    updateSessionControls();
    return null;
  }
}

function appendMessage(role, content) {
  chatMessages.push({ role, content });
  renderChat();
}

function textFromChunk(chunk) {
  if (typeof chunk === 'string') return chunk;
  if (chunk && typeof chunk.value === 'string') return chunk.value;
  return '';
}

async function sendChat() {
  if (!session || promptController) return;
  const text = byId('chat-input').value.trim();
  if (!text) return;
  let messages;
  try {
    messages = buildPromptMessages(text, { prefix: byId('assistant-prefix').checked });
  } catch (error) {
    setAppStatus(error.message);
    return;
  }
  let estimated = null;
  if (typeof session.measureContextUsage === 'function') {
    showCode('chat-code', 'await session.measureContextUsage(messages);', { messages });
    try {
      estimated = await session.measureContextUsage(messages);
    } catch {
      byId('context-notice').textContent = 'Context usage could not be estimated for this prompt.';
    }
  }
  if (Number.isFinite(estimated)) {
    byId('context-notice').textContent =
      `Estimated context for this prompt: ${estimated.toLocaleString()}.`;
  }
  appendMessage('user', text);
  byId('chat-input').value = '';
  promptController = new AbortController();
  updateSessionControls();
  phaseTo('prompting');
  const assistant = document.createElement('div');
  assistant.className = 'chat-message';
  assistant.dataset.role = 'assistant';
  assistant.textContent = '';
  byId('chat-log').append(assistant);
  const callOptions = { signal: promptController.signal };
  showCode(
    'chat-code',
    'for await (const chunk of session.promptStreaming(messages, callOptions)) { … }',
    {
      messages,
      callOptions,
    },
  );
  try {
    if (typeof session.promptStreaming !== 'function') {
      throw new Error('This session does not expose promptStreaming().');
    }
    for await (const chunk of session.promptStreaming(messages, callOptions)) {
      assistant.textContent += textFromChunk(chunk);
    }
    chatMessages.push({ role: 'assistant', content: assistant.textContent });
    if (signedStore) await saveChat(false);
  } catch (error) {
    assistant.textContent = `${error.name}: ${error.message}`;
    if (error.name === 'AbortError')
      byId('context-notice').textContent = 'This prompt was stopped.';
  } finally {
    promptController = null;
    phaseTo('ready');
    renderChat();
    updateContext();
    updateSessionControls();
  }
}

async function appendWithoutReply() {
  if (!session) return;
  const text = byId('chat-input').value.trim();
  if (!text) return;
  const messages = buildPromptMessages(text, { prefix: byId('assistant-prefix').checked });
  showCode('chat-code', 'await session.append(messages);', { messages });
  try {
    await session.append(messages);
    appendMessage('user', text);
    byId('chat-input').value = '';
    updateContext();
    if (signedStore) await saveChat(false);
    setAppStatus('Context appended without generating a response.');
  } catch (error) {
    setAppStatus(`${error.name}: ${error.message}`);
  }
}

async function saveChat(manual = true) {
  if (!signedStore) return;
  const data = makeHistory({
    system: byId('system-prompt').value,
    messages: chatMessages,
    settings: {
      inputLanguage: byId('input-language').value,
      outputLanguage: byId('output-language').value,
    },
  });
  try {
    await signedStore.save(data);
    savedHistory = data;
    byId('save-status').textContent = manual
      ? 'Chat and settings saved with an HMAC signature.'
      : 'Conversation saved.';
    updateSessionControls();
  } catch (error) {
    byId('save-status').textContent = `Save unavailable: ${error.message}`;
  }
}

async function initializeStorage() {
  try {
    signedStore = await createSignedStore({ name: 'prompt-api-lab', version: HISTORY_VERSION });
    const result = await signedStore.load();
    const messages = {
      empty: 'No signed chat is saved yet.',
      ok: 'Signed chat found. Restore is available after the API is ready.',
      corrupt: 'Saved data is corrupt; it was not loaded. Save a fresh conversation to replace it.',
      tampered: 'Saved signature did not verify; saved data was not loaded.',
      rollback: 'An older signed save was detected; saved data was not loaded.',
      'key-missing': 'The signing key is missing; saved data was not loaded.',
      'version-mismatch':
        'The save schema version differs; saved data was not loaded and must be replaced.',
      unavailable: `Signed saving is unavailable: ${result.detail}`,
    };
    byId('save-status').textContent = messages[result.status] ?? 'Saved data was not loaded.';
    if (result.status === 'ok') {
      savedHistory = result.data;
      if (savedHistory?.schemaVersion !== HISTORY_VERSION) {
        savedHistory = null;
        byId('save-status').textContent = 'Saved chat uses an unknown schema; it was not loaded.';
      }
    }
  } catch (error) {
    signedStore = null;
    byId('save-status').textContent = `Signed saving is unavailable: ${error.message}`;
  }
}

async function restoreChat() {
  if (!savedHistory) return;
  try {
    const prompts = restoreInitialPrompts(savedHistory);
    const inputLanguage = savedHistory.settings?.inputLanguage ?? 'en';
    const outputLanguage = savedHistory.settings?.outputLanguage ?? 'en';
    const options = {
      ...createOptions('text-en', { includeInitial: false }),
      expectedInputs: [{ type: 'text', languages: [inputLanguage] }],
      expectedOutputs: [{ type: 'text', languages: [outputLanguage] }],
      initialPrompts: prompts,
    };
    const created = await createSessionWithOptions(options);
    if (!created) return;
    await cloneSession?.destroy?.();
    cloneSession = null;
    await session?.destroy?.();
    session = created;
    chatMessages = savedHistory.messages.slice();
    byId('system-prompt').value = savedHistory.system;
    byId('input-language').value = inputLanguage;
    byId('output-language').value = outputLanguage;
    renderChat();
    trackContextEvents(session);
    updateSessionControls();
    setAppStatus('Saved history was restored as initialPrompts in a new session.');
  } catch (error) {
    setAppStatus(`Could not restore saved chat: ${error.name}: ${error.message}`);
  }
}

async function runStructured() {
  const regexpMode = byId('constraint-preset').value === 'regexp';
  const responseConstraint = regexpMode ? /^\d{4}-\d{2}-\d{2}$/ : TEXT_SCHEMA;
  const options = {
    ...createOptions('text-en'),
    responseConstraint,
    omitResponseConstraintInput: byId('omit-constraint').checked,
  };
  const prompt = byId('structured-prompt').value;
  showCode(
    'structured-code',
    'const session = await LanguageModel.create(options);\\nconst result = await session.prompt(prompt);',
    {
      options,
      prompt,
    },
  );
  byId('structured-status').textContent =
    'Checking availability and creating a constrained session…';
  try {
    const created = await createSessionWithOptions(options, {
      showProgress: false,
      target: 'structured',
    });
    if (!created) {
      byId('structured-status').textContent = 'This constraint option set is unavailable.';
      return;
    }
    const result = await created.prompt(prompt);
    const text = typeof result === 'string' ? result : textFromChunk(result);
    byId('structured-result').textContent = text;
    if (regexpMode) {
      const valid = responseConstraint.test(text.trim());
      byId('structured-status').textContent = valid
        ? 'PASS · matches the ISO date RegExp.'
        : 'FAIL · result does not match the ISO date RegExp.';
    } else {
      try {
        const parsed = JSON.parse(text);
        const validation = validateSchema(parsed, TEXT_SCHEMA);
        byId('structured-status').textContent =
          `${validation.valid ? 'PASS' : 'FAIL'} · ${validation.message} ${validation.path}`;
      } catch {
        byId('structured-status').textContent = 'FAIL · output is not valid JSON.';
      }
    }
    created.destroy?.();
  } catch (error) {
    byId('structured-status').textContent = `${error.name}: ${error.message}`;
    byId('structured-result').textContent = '';
  }
}

function createToolsOptions() {
  return {
    ...createOptions('tools-en'),
    expectedInputs: [
      { type: 'text', languages: [byId('input-language').value] },
      { type: 'tool-response' },
    ],
    expectedOutputs: [
      { type: 'text', languages: [byId('output-language').value] },
      { type: 'tool-call' },
    ],
    tools: TOOL_DEFINITIONS,
  };
}

function executeTool(name, input) {
  if (name === 'calculator')
    return { expression: input.expression, value: calculate(input.expression) };
  if (name === 'current_time') {
    const timeZone = input.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone;
    return { time: new Date().toLocaleString('en', { timeZone }), timeZone };
  }
  if (name === 'convert_units') {
    const factors = { m: 1, km: 1000, cm: 0.01, mi: 1609.344, kg: 1, lb: 0.45359237 };
    if (!(input.from in factors) || !(input.to in factors))
      throw new TypeError('Use m, km, cm, mi, kg, or lb units.');
    const length =
      ['m', 'km', 'cm', 'mi'].includes(input.from) && ['m', 'km', 'cm', 'mi'].includes(input.to);
    const mass = ['kg', 'lb'].includes(input.from) && ['kg', 'lb'].includes(input.to);
    if (!length && !mass) throw new TypeError('Cannot convert between length and mass units.');
    return {
      value: (input.value * factors[input.from]) / factors[input.to],
      from: input.from,
      to: input.to,
    };
  }
  throw new TypeError(`Unknown local tool: ${name}`);
}

function requestApproval(call) {
  const container = byId('tool-approvals');
  return new Promise((resolve) => {
    const card = document.createElement('section');
    card.className = 'tool-card';
    const title = document.createElement('h3');
    title.textContent = `Approve ${call.name}?`;
    const args = document.createElement('pre');
    args.textContent = pretty(call.arguments ?? call.input ?? {});
    const actions = document.createElement('div');
    actions.className = 'button-row';
    const approve = document.createElement('button');
    approve.type = 'button';
    approve.className = 'primary-button';
    approve.textContent = 'Approve';
    const reject = document.createElement('button');
    reject.type = 'button';
    reject.className = 'danger-button';
    reject.textContent = 'Reject';
    approve.addEventListener('click', () => {
      title.textContent = `${call.name} approved`;
      actions.remove();
      resolve(true);
    });
    reject.addEventListener('click', () => {
      title.textContent = `${call.name} rejected`;
      actions.remove();
      resolve(false);
    });
    actions.append(approve, reject);
    card.append(title, args, actions);
    container.append(card);
  });
}

async function runTools() {
  if (!toolsAvailable()) {
    byId('tools-result').textContent = 'Tool classes are not available in this browser.';
    return;
  }
  byId('tool-approvals').replaceChildren();
  byId('tools-result').textContent = 'Waiting for model tool calls…';
  const options = createToolsOptions();
  try {
    const active = await createSessionWithOptions(options, {
      showProgress: false,
      target: 'tools',
    });
    if (!active) return;
    const prompt = byId('tools-prompt').value;
    showCode(
      'tools-code',
      'const answer = await runToolLoop({ session, prompt, tools: TOOL_DEFINITIONS, approver: requestApproval, ToolCall: LanguageModelToolCall, ToolSuccess: LanguageModelToolSuccess, ToolError: LanguageModelToolError, executeTool });',
      { prompt, tools: TOOL_DEFINITIONS },
    );
    const answer = await runToolLoop({
      session: active,
      prompt,
      tools: TOOL_DEFINITIONS,
      approver: requestApproval,
      ToolCall: globalThis.LanguageModelToolCall,
      ToolSuccess: globalThis.LanguageModelToolSuccess,
      ToolError: globalThis.LanguageModelToolError,
      executeTool,
    });
    byId('tools-result').textContent = answer;
    active.destroy?.();
  } catch (error) {
    byId('tools-result').textContent = `${error.name}: ${error.message}`;
  }
}

function renderSamplingModes() {
  const fieldset = byId('sampling-modes');
  fieldset.replaceChildren();
  const legend = document.createElement('legend');
  legend.textContent = 'Modes to compare';
  fieldset.append(legend);
  for (const mode of SAMPLING_MODES) {
    const label = document.createElement('label');
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.value = mode;
    input.checked = mode === 'predictable' || mode === 'creative';
    input.disabled = !hasFeature('samplingMode');
    const text = document.createElement('span');
    text.textContent = mode;
    label.append(input, text);
    fieldset.append(label);
  }
  fieldset.disabled = !hasFeature('samplingMode');
}

async function runSampling() {
  const selected = [...byId('sampling-modes').querySelectorAll('input:checked')].map(
    (input) => input.value,
  );
  const results = byId('sampling-results');
  results.replaceChildren();
  if (!hasFeature('samplingMode')) {
    const note = document.createElement('p');
    note.textContent =
      'samplingMode is not exposed. It is experimental and may require an Origin Trial.';
    results.append(note);
    return;
  }
  for (const samplingMode of selected) {
    const card = document.createElement('section');
    card.className = 'sampling-card';
    const heading = document.createElement('h3');
    heading.textContent = samplingMode;
    const response = document.createElement('p');
    response.textContent = 'Checking availability…';
    card.append(heading, response);
    results.append(card);
    const options = { ...createOptions('text-en'), samplingMode };
    showCode(
      'sampling-code',
      'const availability = await LanguageModel.availability(options);\\nconst session = await LanguageModel.create(options);',
      options,
    );
    try {
      const active = await createSessionWithOptions(options, {
        showProgress: false,
        target: 'sampling',
      });
      if (!active) {
        response.textContent = 'Unavailable for this browser or device.';
        continue;
      }
      heading.textContent = `${samplingMode} · resolved ${active.samplingMode ?? 'unknown'}`;
      response.textContent = await active.prompt(byId('sampling-prompt').value);
      active.destroy?.();
    } catch (error) {
      response.textContent = `${error.name}: ${error.message}`;
    }
  }
}

function renderErrorCases() {
  const container = byId('error-cases');
  container.replaceChildren();
  for (const item of ERROR_CASES) {
    const card = document.createElement('section');
    card.className = 'error-case';
    card.dataset.caseId = item.id;
    const copy = document.createElement('div');
    const title = document.createElement('h3');
    title.textContent = item.title;
    const expected = document.createElement('p');
    expected.textContent = `Expected: ${item.expected} · ${item.citation}`;
    copy.append(title, expected);
    const button = document.createElement('button');
    button.className = 'ghost-button';
    button.type = 'button';
    button.textContent = 'Run case';
    button.disabled = !languageModel?.create;
    const output = document.createElement('output');
    output.textContent = 'Not run';
    button.addEventListener('click', () => runErrorCase(item, output));
    card.append(copy, button, output);
    container.append(card);
  }
}

async function runErrorCase(item, output) {
  if (!languageModel?.create) return;
  output.textContent = 'Running…';
  let active;
  let call;
  let promptOptions;
  try {
    if (item.id === 'omit-constraint') {
      const options = { ...SESSION_PRESETS['text-en'], omitResponseConstraintInput: true };
      call = 'LanguageModel.create(options)';
      promptOptions = options;
      showCode('errors-code', call, options);
      active = await languageModel.create(options);
    } else if (item.id === 'destroyed-prompt') {
      const options = SESSION_PRESETS['text-en'];
      active = await createSessionWithOptions(options, { showProgress: false, target: 'errors' });
      if (!active) throw new Error('No session could be created.');
      await active.destroy();
      call = 'await session.prompt("hello") after await session.destroy()';
      showCode('errors-code', call, { options });
      await active.prompt('hello');
    } else if (item.id === 'abort-prompt') {
      active = await createSessionWithOptions(SESSION_PRESETS['text-en'], {
        showProgress: false,
        target: 'errors',
      });
      if (!active) throw new Error('No session could be created.');
      const controller = new AbortController();
      call = 'session.promptStreaming("Wait for a moment", { signal })';
      showCode('errors-code', call, { signal: controller.signal });
      const pending = active.promptStreaming('Wait for a moment', { signal: controller.signal });
      controller.abort();
      for await (const chunk of pending) output.textContent += String(chunk);
      output.textContent = 'Resolved without an error.';
      return;
    } else {
      const options = SESSION_PRESETS['text-en'];
      active = await createSessionWithOptions(options, { showProgress: false, target: 'errors' });
      if (!active) throw new Error('No session could be created.');
      if (item.id === 'system-order') {
        call =
          'session.prompt([{ role: "user", content: "x" }, { role: "system", content: "late" }])';
        promptOptions = [
          { role: 'user', content: 'x' },
          { role: 'system', content: 'late' },
        ];
      } else if (item.id === 'prefix-order') {
        call =
          'session.prompt([{ role: "assistant", content: "x", prefix: true }, { role: "user", content: "later" }])';
        promptOptions = [
          { role: 'assistant', content: 'x', prefix: true },
          { role: 'user', content: 'later' },
        ];
      } else if (item.id === 'invalid-content') {
        call = 'session.prompt([{ role: "user", content: [{ type: "image", value: "text" }] }])';
        promptOptions = [{ role: 'user', content: [{ type: 'image', value: 'text' }] }];
      } else {
        call = 'session.prompt([{ role: "user", content: [{ type: "image", value: imageBlob }] }])';
        promptOptions = [
          {
            role: 'user',
            content: [{ type: 'image', value: await canvasBlob(byId('sketch-pad')) }],
          },
        ];
      }
      showCode('errors-code', call, promptOptions);
      await active.prompt(promptOptions);
      output.textContent = 'Resolved without an error.';
      return;
    }
    output.textContent = 'Resolved without an error.';
  } catch (error) {
    output.textContent = `Actual: ${error.name} · Expected: ${item.expected}${error.message ? ` · ${error.message}` : ''}`;
  } finally {
    active?.destroy?.();
  }
}

function setupTabs() {
  const tabs = [...document.querySelectorAll('[role="tab"]')];
  function activate(target) {
    for (const tab of tabs) {
      const selected = tab === target;
      tab.setAttribute('aria-selected', String(selected));
      tab.tabIndex = selected ? 0 : -1;
      byId(tab.getAttribute('aria-controls')).hidden = !selected;
    }
    target.focus();
  }
  for (const tab of tabs) {
    tab.addEventListener('click', () => activate(tab));
    tab.addEventListener('keydown', (event) => {
      const index = tabs.indexOf(tab);
      let next = null;
      if (event.key === 'ArrowRight') next = tabs[(index + 1) % tabs.length];
      if (event.key === 'ArrowLeft') next = tabs[(index - 1 + tabs.length) % tabs.length];
      if (event.key === 'Home') next = tabs[0];
      if (event.key === 'End') next = tabs.at(-1);
      if (next) {
        event.preventDefault();
        activate(next);
      }
    });
  }
}

function setupSketchPad() {
  const canvas = byId('sketch-pad');
  const context = canvas.getContext('2d');
  if (!context) return;
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.strokeStyle = '#17647d';
  context.lineWidth = 6;
  context.lineCap = 'round';
  let drawing = false;
  canvas.addEventListener('pointerdown', (event) => {
    drawing = true;
    canvas.setPointerCapture(event.pointerId);
    const rect = canvas.getBoundingClientRect();
    context.beginPath();
    context.moveTo(
      ((event.clientX - rect.left) * canvas.width) / rect.width,
      ((event.clientY - rect.top) * canvas.height) / rect.height,
    );
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    context.lineTo(
      ((event.clientX - rect.left) * canvas.width) / rect.width,
      ((event.clientY - rect.top) * canvas.height) / rect.height,
    );
    context.stroke();
  });
  const stop = () => {
    drawing = false;
  };
  canvas.addEventListener('pointerup', stop);
  canvas.addEventListener('pointercancel', stop);
}

function canvasBlob(canvas) {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
}

async function queryMediaSession(modality, content) {
  const options = {
    expectedInputs: [
      { type: 'text', languages: [byId('input-language').value] },
      { type: modality },
    ],
    expectedOutputs: [{ type: 'text', languages: [byId('output-language').value] }],
    initialPrompts: initialPromptsFromForm(),
  };
  const prompt = [
    {
      role: 'user',
      content: [
        {
          type: 'text',
          value: modality === 'image' ? 'Describe this image.' : 'Describe the audio.',
        },
        { type: modality, value: content },
      ],
    },
  ];
  showCode(
    'multimodal-code',
    'const session = await LanguageModel.create(options);\\nawait session.prompt(messages);',
    { options, messages: prompt },
  );
  try {
    const active = await createSessionWithOptions(options, {
      showProgress: false,
      target: 'multimodal',
    });
    if (!active) return;
    const result = await active.prompt(prompt);
    byId('multimodal-result').textContent =
      typeof result === 'string' ? result : textFromChunk(result);
    active.destroy?.();
  } catch (error) {
    byId('multimodal-result').textContent = `${error.name}: ${error.message}`;
  }
}

async function openCamera() {
  byId('camera-note').textContent = 'Camera permission is requested only after this button click.';
  showCode('multimodal-code', 'await navigator.mediaDevices.getUserMedia({ video: true });');
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: true });
    const video = document.createElement('video');
    video.muted = true;
    video.playsInline = true;
    video.srcObject = stream;
    await video.play();
    await new Promise((resolve) => requestAnimationFrame(resolve));
    const canvas = byId('sketch-pad');
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    selectedImage = await canvasBlob(canvas);
    byId('camera-note').textContent = 'Snapshot captured. Camera tracks have been stopped.';
    updateSessionControls();
  } catch (error) {
    byId('camera-note').textContent = `${error.name}: ${error.message}`;
  } finally {
    stream?.getTracks().forEach((track) => track.stop());
  }
}

async function decodeAudio(blob) {
  const AudioContextConstructor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (!AudioContextConstructor) throw new Error('Web Audio decodeAudioData() is unavailable.');
  audioContext ??= new AudioContextConstructor();
  return audioContext.decodeAudioData(await blob.arrayBuffer());
}

async function startRecording() {
  showCode(
    'multimodal-code',
    'await navigator.mediaDevices.getUserMedia({ audio: true });\\nnew MediaRecorder(stream);',
  );
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(stream);
    mediaRecorder.addEventListener('dataavailable', (event) => {
      if (event.data.size) recordedChunks.push(event.data);
    });
    mediaRecorder.addEventListener(
      'stop',
      async () => {
        stream.getTracks().forEach((track) => track.stop());
        try {
          selectedAudio = await decodeAudio(
            new Blob(recordedChunks, { type: mediaRecorder.mimeType || 'audio/webm' }),
          );
          byId('audio-note').textContent = 'Recording decoded to an AudioBuffer.';
          updateSessionControls();
        } catch (error) {
          byId('audio-note').textContent = `${error.name}: ${error.message}`;
        }
      },
      { once: true },
    );
    mediaRecorder.start();
    byId('record-audio').disabled = true;
    byId('stop-recording').disabled = false;
    byId('audio-note').textContent = 'Recording… press Stop recording when ready.';
  } catch (error) {
    byId('audio-note').textContent = `${error.name}: ${error.message}`;
  }
}

async function initialize() {
  setupTabs();
  setupSketchPad();
  renderErrorCases();
  await checkRequirements({
    required: ['es-modules'],
    optional: [
      'prompt-api',
      'media-devices',
      'media-recorder',
      'web-audio',
      'clipboard-api',
      'indexeddb',
      'web-crypto',
    ],
    container: byId('requirements'),
  });
  languageModel = globalThis.LanguageModel ?? null;
  if (!languageModel?.availability || !languageModel?.create) {
    phaseTo('unsupported');
    byId('availability-notice').hidden = false;
    setAppStatus(
      'LanguageModel is absent. This page remains available for learning and code reading.',
    );
  } else {
    byId('session-preset').disabled = false;
    setAppStatus(
      'LanguageModel is present. Checking requested capabilities without creating a session.',
    );
  }
  renderSurface();
  renderSamplingModes();
  byId('sampling-support').textContent = hasFeature('samplingMode')
    ? 'samplingMode detected'
    : 'Origin Trial or implementation required';
  byId('sampling-support').className =
    `status-chip ${hasFeature('samplingMode') ? 'status-supported' : 'status-unsupported'}`;
  byId('tools-support').textContent = toolsAvailable()
    ? 'Tool classes detected'
    : 'Tool-call support not detected';
  byId('tools-support').className =
    `status-chip ${toolsAvailable() ? 'status-supported' : 'status-unsupported'}`;
  await initializeStorage();
  await renderAvailabilityMatrix();
  if (languageModel) {
    const defaultStatus = await availability(createOptions('text-en'));
    currentAvailabilityStatus = defaultStatus.status;
    phaseTo(defaultStatus.status);
    if (defaultStatus.status === 'unavailable') {
      byId('availability-notice').hidden = false;
      setAppStatus(
        `The browser exposes LanguageModel, but the default option set is unavailable. ${defaultStatus.detail}`,
      );
    } else {
      setAppStatus(
        `Default text session: ${defaultStatus.status}. Downloading begins only when you click the create button.`,
      );
    }
  }
  renderErrorCases();
  updateSessionControls();
  byId('create-session').disabled = !languageModel || currentAvailabilityStatus === 'unavailable';
  byId('camera-button').disabled = !languageModel || !navigator.mediaDevices?.getUserMedia;
  byId('record-audio').disabled =
    !languageModel || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined';
  byId('session-preset').addEventListener('change', async () => {
    const options = createOptions();
    const result = await availability(options);
    currentAvailabilityStatus = result.status;
    phaseTo(result.status);
    byId('create-session').disabled = !languageModel || result.status === 'unavailable';
    byId('create-session').textContent =
      result.status === 'available' ? 'Create session' : 'Download & create session';
    showCode('availability-code', 'await LanguageModel.availability(options);', options);
  });
  byId('create-session').addEventListener('click', async () => {
    const options = createOptions();
    await startChat(options);
  });
  byId('send-prompt').addEventListener('click', () => {
    if (byId('append-only').checked) void appendWithoutReply();
    else void sendChat();
  });
  byId('chat-input').addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
      event.preventDefault();
      byId('send-prompt').click();
    }
  });
  byId('stop-prompt').addEventListener('click', () => promptController?.abort());
  byId('save-chat').addEventListener('click', () => void saveChat(true));
  byId('restore-session').addEventListener('click', () => void restoreChat());
  byId('clone-session').addEventListener('click', async () => {
    if (!session?.clone) return;
    showCode('chat-code', 'cloneSession = await session.clone();');
    try {
      cloneSession = await session.clone();
      setAppStatus('A cloned session is ready as a separate branch.');
      byId('clone-pane').hidden = false;
      byId('clone-result').textContent =
        `Clone ready · context ${cloneSession.contextUsage ?? '—'} / ${cloneSession.contextWindow ?? '—'}`;
      updateSessionControls();
    } catch (error) {
      setAppStatus(`${error.name}: ${error.message}`);
    }
  });
  byId('clone-send').addEventListener('click', async () => {
    if (!cloneSession) return;
    const text = byId('clone-input').value;
    showCode('chat-code', 'await clone.prompt(prompt);', { prompt: text });
    try {
      byId('clone-result').textContent = await cloneSession.prompt(text);
      byId('clone-input').value = '';
    } catch (error) {
      byId('clone-result').textContent = `${error.name}: ${error.message}`;
    }
  });
  byId('clone-destroy').addEventListener('click', async () => {
    if (!cloneSession) return;
    showCode('chat-code', 'await clone.destroy();');
    await cloneSession.destroy?.();
    cloneSession = null;
    byId('clone-pane').hidden = true;
    updateSessionControls();
  });
  byId('destroy-session').addEventListener('click', async () => {
    if (!session) return;
    showCode('chat-code', 'await session.destroy();');
    await session.destroy();
    session = null;
    cloneSession?.destroy?.();
    cloneSession = null;
    phaseTo('destroyed');
    updateSessionControls();
  });
  byId('run-structured').addEventListener('click', () => void runStructured());
  byId('run-tools').addEventListener('click', () => void runTools());
  byId('run-sampling').addEventListener('click', () => void runSampling());
  byId('image-file').addEventListener('change', (event) => {
    selectedImage = event.target.files?.[0] ?? null;
    if (selectedImage) {
      const image = new Image();
      image.onload = () => {
        const canvas = byId('sketch-pad');
        canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      };
      image.src = URL.createObjectURL(selectedImage);
    }
    updateSessionControls();
  });
  byId('clear-sketch').addEventListener('click', () => {
    const canvas = byId('sketch-pad');
    const context = canvas.getContext('2d');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    selectedImage = null;
    updateSessionControls();
  });
  byId('camera-button').addEventListener('click', () => void openCamera());
  byId('send-image').addEventListener('click', async () => {
    const image = selectedImage ?? (await canvasBlob(byId('sketch-pad')));
    if (image) await queryMediaSession('image', image);
  });
  byId('audio-file').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      selectedAudio = await decodeAudio(file);
      byId('audio-note').textContent = `Decoded ${file.name} to an AudioBuffer.`;
      updateSessionControls();
    } catch (error) {
      byId('audio-note').textContent = `${error.name}: ${error.message}`;
    }
  });
  byId('record-audio').addEventListener('click', () => void startRecording());
  byId('stop-recording').addEventListener('click', () => {
    mediaRecorder?.stop();
    byId('record-audio').disabled = false;
    byId('stop-recording').disabled = true;
  });
  byId('send-audio').addEventListener('click', () => {
    if (selectedAudio) void queryMediaSession('audio', selectedAudio);
  });
  byId('constraint-preset').addEventListener('change', () => {
    const regexp = byId('constraint-preset').value === 'regexp';
    byId('structured-prompt').value = regexp
      ? 'Return today’s date in ISO format.'
      : 'Review: The interface is clear, though it loads slowly.';
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && session && signedStore) void saveChat(false);
  });
  window.addEventListener('pagehide', () => {
    if (session && signedStore) void saveChat(false);
  });
  document.body.dataset.appReady = 'true';
}

void initialize().catch((error) => {
  phaseTo('error');
  setAppStatus(`Prompt API Lab failed to initialize: ${error.name}: ${error.message}`);
  document.body.dataset.appReady = 'true';
});
