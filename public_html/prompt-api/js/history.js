export const HISTORY_VERSION = 1;
export const HISTORY_LIMIT = 24;

export function makeHistory({ system, messages = [], settings = {} }) {
  const safeMessages = messages
    .filter((message) => ['user', 'assistant'].includes(message.role))
    .slice(-HISTORY_LIMIT)
    .map(({ role, content }) => ({ role, content: String(content).slice(0, 8000) }));
  return {
    schemaVersion: HISTORY_VERSION,
    system: String(system ?? '').slice(0, 4000),
    messages: safeMessages,
    settings: {
      inputLanguage: settings.inputLanguage ?? 'en',
      outputLanguage: settings.outputLanguage ?? 'en',
    },
  };
}

export function restoreInitialPrompts(saved) {
  if (!saved || saved.schemaVersion !== HISTORY_VERSION || !Array.isArray(saved.messages)) {
    throw new TypeError('Saved chat has an unsupported shape.');
  }
  return [
    ...(saved.system ? [{ role: 'system', content: saved.system }] : []),
    ...saved.messages.map(({ role, content }) => {
      if (!['user', 'assistant'].includes(role))
        throw new TypeError('Saved message role is invalid.');
      return { role, content: String(content) };
    }),
  ];
}
