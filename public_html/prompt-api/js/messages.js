export function validateMessages(messages) {
  if (!Array.isArray(messages)) throw new TypeError('Messages must be an array.');
  let seenSystem = false;
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (!message || typeof message !== 'object')
      throw new TypeError('Each message must be an object.');
    if (message.role === 'system') {
      if (index !== 0 || seenSystem) throw new TypeError('A system message must be first.');
      seenSystem = true;
    }
    if (
      message.prefix === true &&
      (message.role !== 'assistant' || index !== messages.length - 1)
    ) {
      throw new SyntaxError('Only the final assistant message can be a prefix.');
    }
  }
  return messages;
}

export function buildInitialPrompts({ system, example, history = [] } = {}) {
  const messages = [];
  if (String(system ?? '').trim())
    messages.push({ role: 'system', content: String(system).trim() });
  if (example?.user && example?.assistant) {
    messages.push({ role: 'user', content: String(example.user) });
    messages.push({ role: 'assistant', content: String(example.assistant) });
  }
  for (const item of history) {
    if (item?.role === 'user' || item?.role === 'assistant') {
      messages.push({ role: item.role, content: String(item.content ?? '') });
    }
  }
  return validateMessages(messages);
}

export function buildPromptMessages(text, { prefix = false } = {}) {
  const messages = [{ role: 'user', content: String(text) }];
  if (prefix) messages.push({ role: 'assistant', content: '', prefix: true });
  return validateMessages(messages);
}
