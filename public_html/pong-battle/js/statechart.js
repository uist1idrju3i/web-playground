'use strict';

// Explicit app statechart (see .agents/skills/browser-app-ux). Mirrored onto
// document.body.dataset.phase by app.js so CSS and E2E can follow it.
export const PHASES = Object.freeze([
  'boot',
  'unsupported',
  'loading',
  'ready',
  'countdown',
  'playing',
  'paused',
  'hold',
  'match-over',
]);

// event -> { from: [...phases], to: phase }
const TRANSITIONS = Object.freeze({
  unsupported: { from: ['boot'], to: 'unsupported' },
  vmsReady: { from: ['boot', 'loading'], to: 'ready' },
  deploy: { from: ['ready', 'match-over', 'hold'], to: 'countdown' },
  hotSwap: { from: ['playing', 'paused'], to: null }, // keeps the current phase
  serve: { from: ['countdown'], to: 'playing' },
  pause: { from: ['playing'], to: 'paused' },
  resume: { from: ['paused'], to: 'playing' },
  hold: { from: ['playing'], to: 'hold' }, // brain-fault auto pause
  unhold: { from: ['hold'], to: 'playing' }, // fixed brain redeployed
  finish: { from: ['playing'], to: 'match-over' },
  rematch: { from: ['match-over'], to: 'ready' },
  reset: { from: ['playing', 'paused', 'hold', 'countdown'], to: 'ready' },
});

export function canTransition(from, event) {
  const t = TRANSITIONS[event];
  return Boolean(t && t.from.includes(from));
}

// Returns the new phase name; throws on an illegal transition.
// 'hotSwap' keeps the phase by returning the current one.
export function transition(current, event) {
  const t = TRANSITIONS[event];
  if (!t || !t.from.includes(current)) {
    throw new RangeError(`Illegal transition '${event}' from '${current}'`);
  }
  return t.to ?? current;
}
