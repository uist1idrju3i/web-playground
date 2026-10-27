const EVENT_LABELS = Object.freeze({
  change: 'change',
  changeSelection: 'changeSelection',
  changeMode: 'changeMode',
});

export function formatEditorEvent(eventName, detail, time = new Date()) {
  const label = EVENT_LABELS[eventName] ?? eventName;
  const timestamp = time.toLocaleTimeString('en', { hour12: false });
  const summary =
    eventName === 'change'
      ? `${detail?.action ?? 'edit'} · ${detail?.lines?.length ?? 0} line(s)`
      : eventName === 'changeSelection'
        ? `${detail?.selection?.getAllRanges?.().length ?? 1} selection(s)`
        : eventName === 'changeMode'
          ? `${detail?.mode?.$id ?? detail?.mode ?? 'mode changed'}`
          : 'updated';
  return { event: label, timestamp, summary };
}

export function appendEditorEvent(log, event, limit = 12) {
  return [...log, event].slice(-limit);
}
