function getContext() {
  if (globalThis.document?.modelContext?.registerTool) {
    return { context: document.modelContext, legacy: false };
  }
  if (globalThis.navigator?.modelContext?.registerTool) {
    return { context: navigator.modelContext, legacy: true };
  }
  return { context: null, legacy: false };
}

export function registerTools(tools, { signal } = {}) {
  const { context, legacy } = getContext();
  if (!context) return [];
  const registrations = [];
  for (const tool of tools) {
    const definition = {
      ...tool,
      annotations: { ...tool.annotations, readOnlyHint: true },
      ...(signal ? { signal } : {}),
    };
    try {
      const registration = context.registerTool(definition);
      const cleanup = () => {
        if (typeof registration === 'function') registration();
        else if (typeof registration?.unregister === 'function') registration.unregister();
        else if (typeof registration?.abort === 'function') registration.abort();
        else context.unregisterTool?.(tool.name);
      };
      registrations.push({ name: tool.name, legacy, registration, cleanup });
      if (signal) {
        if (signal.aborted) cleanup();
        else signal.addEventListener('abort', cleanup, { once: true });
      }
    } catch {
      continue;
    }
  }
  return registrations;
}
