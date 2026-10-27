export const PHASES = Object.freeze([
  'unsupported',
  'checking',
  'unavailable',
  'downloadable',
  'downloading',
  'available',
  'creating',
  'ready',
  'prompting',
  'destroyed',
  'error',
]);

const transitions = Object.freeze({
  CHECK: {
    from: ['checking'],
    to: ['unavailable', 'downloadable', 'downloading', 'available', 'unsupported'],
  },
  RECHECK: {
    from: ['unavailable', 'downloadable', 'downloading', 'available', 'destroyed', 'error'],
    to: ['unavailable', 'downloadable', 'downloading', 'available'],
  },
  CREATE: {
    from: ['downloadable', 'downloading', 'available', 'ready', 'destroyed', 'error'],
    to: ['creating'],
  },
  CREATED: { from: ['creating'], to: ['ready'] },
  PROMPT: { from: ['ready'], to: ['prompting'] },
  PROMPTED: { from: ['prompting'], to: ['ready'] },
  DESTROY: { from: ['ready', 'prompting', 'creating'], to: ['destroyed'] },
  FAIL: { from: PHASES.filter((phase) => phase !== 'unsupported'), to: ['error'] },
  RECOVER: { from: ['error', 'destroyed', 'unavailable', 'unsupported'], to: ['checking'] },
  RESUME: { from: ['error'], to: ['ready'] },
});

export function transition(phase, event, target) {
  const rule = transitions[event];
  if (!rule || !rule.from.includes(phase))
    throw new Error(`Illegal transition: ${phase} --${event}-->`);
  const next = target ?? rule.to[0];
  if (!rule.to.includes(next)) throw new Error(`Illegal target for ${phase} --${event}--> ${next}`);
  return next;
}

export function canTransition(phase, event) {
  return Boolean(transitions[event]?.from.includes(phase));
}
