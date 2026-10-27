export const ACE_APP_PHASES = Object.freeze(['initializing', 'ready', 'unsupported', 'error']);

const TRANSITIONS = Object.freeze({
  initializing: Object.freeze({
    READY: 'ready',
    UNSUPPORTED: 'unsupported',
    ERROR: 'error',
  }),
  error: Object.freeze({ RETRY: 'initializing' }),
  ready: Object.freeze({}),
  unsupported: Object.freeze({}),
});

export function createAceAppState() {
  return Object.freeze({ phase: 'initializing' });
}

export function transitionAceAppState(state, event) {
  const next = TRANSITIONS[state?.phase]?.[event];
  if (!next) {
    throw new Error(`Illegal Ace Lab transition: ${state?.phase ?? 'unknown'} -> ${event}`);
  }
  return Object.freeze({ phase: next });
}
