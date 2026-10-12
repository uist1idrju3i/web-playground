'use strict';

// Brain catalog: player sample programs and the three enemy levels.
// Sources are .rb files served from the app directory; the UI also shows
// the enemy sources read-only ("read your opponent's code").

export const SAMPLES = Object.freeze([
  {
    id: 'chaser',
    title: 'Chaser — first brain',
    note: 'Track the ball directly. Simple, readable, beatable — the starting point.',
    url: '/pong-battle/ruby/samples/chaser.rb',
  },
  {
    id: 'predictor',
    title: 'Predictor — use y_at',
    note: 'Intercept prediction via ball.y_at, the same trick Club uses.',
    url: '/pong-battle/ruby/samples/predictor.rb',
  },
  {
    id: 'sniper',
    title: 'Sniper — aim the return',
    note: 'Choose the contact offset so the return flies at a mean angle.',
    url: '/pong-battle/ruby/samples/sniper.rb',
  },
  {
    id: 'greedy',
    title: 'Greedy — class style',
    note: 'A Brain.register object with state, tactics, and debug_info.',
    url: '/pong-battle/ruby/samples/greedy.rb',
  },
  {
    id: 'mirror',
    title: 'Mirror — chaos pick',
    note: 'Never looks at the ball; copies the enemy paddle instead.',
    url: '/pong-battle/ruby/samples/mirror.rb',
  },
]);

export const ENEMIES = Object.freeze([
  {
    id: 'rookie',
    level: 1,
    name: 'Rookie',
    tag: 'beginner',
    style: 'Chases the ball. Slow thinker, big deadband.',
    hint: 'Sharp angles and rally speed beat it.',
    url: '/pong-battle/ruby/enemy/rookie.rb',
  },
  {
    id: 'club',
    level: 2,
    name: 'Club',
    tag: 'intermediate',
    style: 'Predicts the intercept including wall bounces.',
    hint: 'It never aims — out-shoot it with contact control.',
    url: '/pong-battle/ruby/enemy/club.rb',
  },
  {
    id: 'ace',
    level: 3,
    name: 'Ace',
    tag: 'advanced',
    style: 'Predicts, then aims every return at your open corner.',
    hint: 'Attack the model: fool the predictor, not the reflexes.',
    url: '/pong-battle/ruby/enemy/ace.rb',
  },
]);

const sourceCache = new Map();

export async function fetchSource(url) {
  if (sourceCache.has(url)) return sourceCache.get(url);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not load ${url} (HTTP ${response.status}).`);
  const text = await response.text();
  sourceCache.set(url, text);
  return text;
}

export function sampleById(id) {
  return SAMPLES.find((s) => s.id === id) ?? SAMPLES[0];
}

export function enemyById(id) {
  return ENEMIES.find((e) => e.id === id) ?? ENEMIES[0];
}
