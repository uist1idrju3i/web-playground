export function summarizeTransaction(transaction) {
  const changes = [];
  transaction.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
    changes.push(`${fromA}-${toA} → ${fromB}-${toB} (${inserted.length} chars)`);
  });
  return {
    changes: changes.length ? changes.join(', ') : 'none',
    selection: transaction.selection
      ? transaction.selection.ranges.map((range) => `${range.from}-${range.to}`).join(', ')
      : 'unchanged',
    effects: transaction.effects.length ? `${transaction.effects.length} effect(s)` : 'none',
  };
}

export function formatTransactionLog(entries) {
  return entries.map(
    (entry, index) =>
      `${String(index + 1).padStart(2, '0')} · changes: ${entry.changes} · selection: ${entry.selection} · effects: ${entry.effects}`,
  );
}
