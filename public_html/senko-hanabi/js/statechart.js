// Explicit app statechart: every screen change goes through transition() so
// an illegal move fails loudly instead of leaving mixed UI state.
export const PHASES = Object.freeze(['boot', 'unsupported', 'title', 'lit', 'spent', 'error']);

// event -> { from: [...phases], to: phase }
const TRANSITIONS = Object.freeze({
  unsupported: { from: ['boot'], to: 'unsupported' },
  ready: { from: ['boot'], to: 'title' },
  light: { from: ['title', 'spent'], to: 'lit' },
  spent: { from: ['lit'], to: 'spent' },
  home: { from: ['lit', 'spent'], to: 'title' },
  error: { from: PHASES, to: 'error' },
});

export function canTransition(from, event) {
  const t = TRANSITIONS[event];
  return Boolean(t && t.from.includes(from) && PHASES.includes(t.to));
}

// Returns the new phase name; throws on an illegal transition.
export function transition(current, event) {
  const t = TRANSITIONS[event];
  if (!t || !t.from.includes(current)) {
    throw new RangeError(`Illegal transition '${event}' from '${current}'`);
  }
  return t.to;
}
