'use strict';

// Pong Programming Battle — app orchestration.
// Two Ruby.wasm workers (player brain, enemy brain) drive the paddle logic;
// the main thread owns the deterministic sim, the scene render and the
// explicit phase statechart.

import { checkRequirements } from '/library/js/requirements.js';
import { createGame, stepGame, brainState, STEP_DT, GUST } from './sim.js';
import { transition } from './statechart.js';
import { buildScene, layout, eventEffects } from './scene.js';
import { createWebGL2Renderer } from './render-webgl2.js';
import { createWebGPURenderer } from './render-webgpu.js';
import { createAudio } from './audio.js';
import { BrainHost } from './brain-host.js';
import { SAMPLES, ENEMIES, fetchSource, sampleById } from './brains.js';
import { detectLang, t, applyI18n } from './i18n.js';
import { createSave } from './save.js';

const $ = (s) => document.querySelector(s);
const els = {
  requirements: $('#requirements'),
  canvas: $('#court'),
  hero: $('#hero'),
  heroCta: $('#hero-cta'),
  heroHow: $('#hero-how'),
  howPanel: $('#how-panel'),
  hud: $('#hud'),
  scoreL: $('#score-l'),
  scoreR: $('#score-r'),
  hudRally: $('#hud-rally'),
  hudSpeed: $('#hud-speed'),
  hudWind: $('#hud-wind'),
  stamL: $('#stam-l'),
  stamR: $('#stam-r'),
  caption: $('#caption'),
  overlay: $('#phase-overlay'),
  overlayTitle: $('#overlay-title'),
  overlaySub: $('#overlay-sub'),
  deployBtn: $('#deploy'),
  rematchBtn: $('#rematch'),
  sampleList: $('#sample-list'),
  enemyList: $('#enemy-list'),
  editor: $('#editor'),
  enemyCode: $('#enemy-code'),
  enemyCodePanel: $('#enemy-code-panel'),
  thoughtToggle: $('#thought-toggle'),
  soundBtn: $('#sound-btn'),
  langBtn: $('#lang-btn'),
  pauseBtn: $('#pause-btn'),
  log: $('#log'),
  bootBar: $('#boot-bar'),
  brainNote: $('#brain-note'),
  banner: $('#banner'),
};

const DEBUG = new URLSearchParams(location.search).has('debug');
const TICK_EVERY = 4; // physics ticks per brain query (120Hz sim, 30Hz brains)

const save = await createSave();
let lang = detectLang(save.data.lang);
const audio = createAudio();
audio.setMuted(save.data.muted);

const requirementState = await checkRequirements({
  required: ['fetch', 'es-modules', 'webassembly', 'web-workers', 'webgl'],
  optional: ['webgpu', 'web-audio', 'audio-worklet', 'webmcp'],
  container: els.requirements,
});

/* ---------- phase machine ---------- */
let phase = 'boot';
function setPhase(next) {
  phase = next;
  document.body.dataset.phase = next;
  renderChrome();
}

function fire(event) {
  try {
    setPhase(transition(phase, event));
  } catch (err) {
    if (DEBUG) console.warn(err.message);
  }
}

/* ---------- renderer ---------- */
const canvas = els.canvas;
let renderer = null;
if (requirementState.ok) {
  renderer = (await createWebGPURenderer(canvas)) ?? createWebGL2Renderer(canvas);
}
if (renderer) canvas.dataset.renderer = renderer.kind;

/* ---------- brains ---------- */
const hostL = new BrainHost('you');
const hostR = new BrainHost('enemy');
for (const [host, side] of [
  [hostL, 'you'],
  [hostR, 'enemy'],
]) {
  host.onMessage = (m) => {
    if (m.type === 'boot-progress') logLine(`[${side}] ${m.stage}`);
    if (m.type === 'stdout') logLine(`[${side}] ${m.text.trimEnd()}`);
    if (m.type === 'stderr') logLine(`[${side} ERR] ${m.text.trimEnd()}`);
    if (m.type === 'tick') {
      if (m.ok === false) onBrainError(side, m.error);
      else debug[side === 'you' ? 'L' : 'R'] = m.debug ?? null;
    }
  };
}
const debug = { L: null, R: null };
let brainDown = { you: false, enemy: false };

function onBrainError(side, error) {
  if (brainDown[side]) return;
  brainDown[side] = true;
  logLine(`[${side}] brain fault: ${error?.class ?? 'Error'} ${error?.message ?? ''}`);
  if (side === 'you') {
    audio.cue('brainError');
    showBanner(t(lang, 'brainDown'), 'warn');
    if (phase === 'playing') fire('hold');
  } else {
    // Enemy brains are our own code; reboot quietly.
    rebootBrain(hostR, 'enemy');
  }
}

async function rebootBrain(host, side) {
  brainDown[side] = true;
  try {
    await host.reboot();
    brainDown[side] = false;
    if (phase === 'hold') fire('unhold');
  } catch {
    logLine(`[${side}] reboot failed`);
  }
}

/* ---------- match loop ---------- */
let game = null;
let accumulator = 0;
let lastT = 0;
let tickCount = 0;
let shake = { x: 0, y: 0, t: 0 };
let trail = [];
let currentEnemy = ENEMIES[0];
let countdownT = 0;
let lastWindSign = 0;
let lowStamWarned = { left: false, right: false };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function startMatch() {
  game = createGame({ seed: (Math.random() * 2 ** 31) | 0, pointsToWin: 3 });
  accumulator = 0;
  tickCount = 0;
  trail = [];
  brainDown = { you: false, enemy: false };
  lowStamWarned = { left: false, right: false };
  lastWindSign = 0;
  countdownT = 2.6; // "3・2・1" + serve delay
  fire('deploy');
  audio.cue('deploy');
}

function physicsStep() {
  if (tickCount % TICK_EVERY === 0) {
    if (!brainDown.you) hostL.requestTick(JSON.stringify(brainState(game, 'left')));
    if (!brainDown.enemy) hostR.requestTick(JSON.stringify(brainState(game, 'right')));
  }
  const moves = {
    left: brainDown.you ? 0 : (hostL.lastMove ?? 0),
    right: brainDown.enemy ? 0 : (hostR.lastMove ?? 0),
  };
  const events = stepGame(game, moves, STEP_DT);
  tickCount += 1;
  const fx = eventEffects(events);
  if (fx.hit) {
    audio.cue('hit', { speed: game.ball.speed });
    if (!reduceMotion) shake.t = Math.min(0.09, shake.t + 0.045);
  }
  if (fx.wall) audio.cue('wall');
  if (fx.serve) {
    audio.cue('go');
    showBanner(t(lang, 'serve'), 'info', 800);
  }
  if (fx.score) {
    const forYou = fx.score.side === 'left';
    audio.cue(forYou ? 'scoreFor' : 'scoreAgainst');
    showBanner(
      forYou ? `+1 ${els.scoreL.textContent}` : `+1 ${els.scoreR.textContent}`,
      forYou ? 'good' : 'bad',
      1100,
    );
    if (!reduceMotion) shake.t = 0.22;
    updateHud();
  }
  // Escalation alarms.
  const gustNow = Math.abs(game.wind?.gust ?? 0) > 1;
  if (gustNow && lastWindSign <= 0) {
    audio.cue('gust');
    showBanner(t(lang, 'gustWarn'), 'warn', 1200);
  }
  lastWindSign = gustNow ? 1 : 0;
  for (const side of ['left', 'right']) {
    if ((game.stamina?.[side] ?? 1) < 0.35 && !lowStamWarned[side]) {
      lowStamWarned[side] = true;
      if (side === 'left') showBanner(t(lang, 'staminaWarn'), 'warn', 1400);
    }
  }
  if (game.status === 'over') endMatch();
}

function endMatch() {
  const won = game.winner === 'left';
  fire('finish');
  audio.cue(won ? 'win' : 'lose');
  audio.setIntensity(0);
  save.data.matches += 1;
  if (won) save.data.wins += 1;
  const rec = save.data.best[currentEnemy.id];
  const bestScore = { for: game.score.left, against: game.score.right };
  if (won || !rec || bestScore.for > rec.for) save.data.best[currentEnemy.id] = bestScore;
  if (won) save.data.unlocked = Math.min(3, Math.max(save.data.unlocked, currentEnemy.level + 1));
  save.persist();
  els.overlayTitle.textContent = won ? t(lang, 'win') : t(lang, 'lose');
  els.overlaySub.textContent =
    won && currentEnemy.level < 3 ? t(lang, 'levelClear') : won ? t(lang, 'allClear') : '';
  els.overlay.hidden = false;
  buildPickers();
}

/* ---------- frame loop ---------- */
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - lastT) / 1000);
  lastT = now;
  if (!renderer || !game) return;

  if (phase === 'countdown') {
    const prev = Math.ceil(countdownT);
    countdownT -= dt;
    const cur = Math.ceil(countdownT);
    if (cur !== prev && cur > 0) audio.cue('countdown');
    els.overlayTitle.textContent = cur > 0 ? String(cur) : 'GO!';
    els.overlaySub.textContent = '';
    els.overlay.hidden = cur <= -1;
    if (countdownT <= 0) fire('serve');
  } else if (phase === 'playing' || phase === 'hold') {
    accumulator += dt;
    let guard = 0;
    while (accumulator >= STEP_DT && guard++ < 12) {
      physicsStep();
      accumulator -= STEP_DT;
    }
  }

  // Ball trail + shake decay.
  trail.push([game.ball.x, game.ball.y]);
  if (trail.length > 14) trail.shift();
  shake.t = Math.max(0, shake.t - dt * 3);
  const sh = reduceMotion
    ? { x: 0, y: 0 }
    : {
        x: (Math.random() - 0.5) * 14 * shake.t,
        y: (Math.random() - 0.5) * 14 * shake.t,
      };
  renderer.resize();
  const scene = buildScene({
    game,
    layout: layout(canvas.width, canvas.height),
    ballTrail: trail,
    debugL: save.data.showThought ? debug.L : null,
    debugR: save.data.showThought ? debug.R : null,
    shakeT: now / 1000,
  });
  renderer.render(scene, sh);
  audio.setIntensity(game.rally > GUST.START_HITS ? 0.8 : game.rally > 4 ? 0.4 : 0);
  updateHud();
}

function updateHud() {
  els.scoreL.textContent = game.score.left;
  els.scoreR.textContent = game.score.right;
  els.hudRally.textContent = `${t(lang, 'rally')} ${game.rally}`;
  els.hudSpeed.textContent = `${t(lang, 'speed')} ${Math.round(game.ball.speed)}`;
  const ay = game.wind?.ay ?? 0;
  els.hudWind.textContent = ay === 0 ? '' : `${t(lang, 'wind')} ${ay > 0 ? '▼' : '▲'}`;
  els.stamL.value = game.stamina?.left ?? 1;
  els.stamR.value = game.stamina?.right ?? 1;
}

/* ---------- pickers ---------- */
let selectedSample = save.data.sample ?? 'chaser';
let selectedEnemy = save.data.unlocked >= 3 ? 'ace' : save.data.unlocked >= 2 ? 'club' : 'rookie';

function buildPickers() {
  els.sampleList.innerHTML = '';
  for (const s of SAMPLES) {
    const btn = document.createElement('button');
    btn.className = 'pick' + (s.id === selectedSample ? ' on' : '');
    btn.innerHTML = `<b>${s.title}</b><span>${s.note}</span>`;
    btn.addEventListener('click', () => {
      selectedSample = s.id;
      audio.cue('click');
      loadSampleIntoEditor();
      buildPickers();
    });
    els.sampleList.append(btn);
  }
  els.enemyList.innerHTML = '';
  for (const e of ENEMIES) {
    const locked = e.level > save.data.unlocked;
    const btn = document.createElement('button');
    btn.className = 'pick' + (e.id === selectedEnemy ? ' on' : '') + (locked ? ' locked' : '');
    btn.disabled = locked;
    const best = save.data.best[e.id];
    btn.innerHTML = `<b>${t(lang, 'enemy' + e.level)}${locked ? ' 🔒' : ''}</b>
      <span>${e.style}</span><i>${e.hint}${best ? ` · ${t(lang, 'best')} ${best.for}-${best.against}` : ''}</i>`;
    btn.addEventListener('click', async () => {
      selectedEnemy = e.id;
      currentEnemy = e;
      audio.cue('click');
      els.enemyCode.textContent = await fetchSource(e.url);
      buildPickers();
    });
    els.enemyList.append(btn);
  }
}

/* ---------- editor ---------- */
let editor = null;
if (typeof window.CodeMirror === 'function') {
  editor = window.CodeMirror.fromTextArea(els.editor, {
    mode: 'ruby',
    lineNumbers: true,
    autoCloseBrackets: true,
    matchBrackets: true,
    indentUnit: 2,
    tabSize: 2,
    extraKeys: { 'Ctrl-Enter': deploy, 'Cmd-Enter': deploy },
  });
}
const getCode = () => (editor ? editor.getValue() : els.editor.value);
const setCode = (v) => (editor ? editor.setValue(v) : (els.editor.value = v));

async function loadSampleIntoEditor() {
  if (save.data.code && selectedSample === save.data.sample) {
    setCode(save.data.code);
  } else {
    setCode(await fetchSource(sampleById(selectedSample).url));
  }
}
if (editor) editor.on('change', () => (save.data.code = getCode()));

/* ---------- deploy ---------- */
async function deploy() {
  await audio.unlock();
  audio.startMusic();
  const code = getCode();
  save.data.sample = selectedSample;
  save.data.code = code;
  save.persist();
  els.deployBtn.disabled = true;
  const [resL, resR] = await Promise.all([
    hostL.load(code),
    hostR.load(await fetchSource(currentEnemy.url)),
  ]);
  els.deployBtn.disabled = false;
  if (!resL.ok) {
    showBanner(`${resL.error?.class}: ${resL.error?.message}`, 'bad', 4000);
    return;
  }
  if (!resR.ok) {
    logLine(`[enemy] load failed: ${resR.error?.message}`);
    return;
  }
  startMatch();
}

/* ---------- UI chrome ---------- */
let bannerTimer = null;
function showBanner(text, kind = 'info', ms = 1600) {
  els.banner.textContent = text;
  els.banner.dataset.kind = kind;
  els.banner.hidden = false;
  clearTimeout(bannerTimer);
  bannerTimer = setTimeout(() => (els.banner.hidden = true), ms);
}

function logLine(text) {
  const line = document.createElement('div');
  line.textContent = text;
  els.log.append(line);
  while (els.log.children.length > 120) els.log.firstChild.remove();
  els.log.scrollTop = els.log.scrollHeight;
}

function renderChrome() {
  const inMatch = ['countdown', 'playing', 'paused', 'hold'].includes(phase);
  els.overlay.hidden =
    !['ready', 'match-over', 'paused', 'hold'].includes(phase) && phase !== 'countdown';
  els.pauseBtn.hidden = !inMatch;
  if (phase === 'ready') {
    els.overlayTitle.textContent = '';
    els.overlaySub.textContent = '';
    els.overlay.hidden = true;
  }
  if (phase === 'paused') els.overlayTitle.textContent = '⏸';
  if (phase === 'hold') {
    els.overlayTitle.textContent = t(lang, 'brainDown');
    els.overlaySub.textContent = t(lang, 'brainReboot');
  }
}

/* ---------- boot ---------- */
async function boot() {
  applyI18n(lang);
  document.title = t(lang, 'title');
  buildPickers();
  await loadSampleIntoEditor();
  els.enemyCode.textContent = await fetchSource(currentEnemy.url);

  if (!requirementState.ok) {
    fire('unsupported');
    showBanner('このブラウザは必須機能をサポートしていません', 'bad', 8000);
    return;
  }
  els.bootBar.hidden = false;
  try {
    await Promise.all([hostL.boot(), hostR.boot()]);
  } catch (err) {
    fire('unsupported');
    showBanner(`VM boot failed: ${err.message}`, 'bad', 8000);
    return;
  }
  els.bootBar.hidden = true;
  fire('vmsReady');
  game = createGame({ seed: 1 });
  requestAnimationFrame((n) => {
    lastT = n;
    requestAnimationFrame(frame);
  });
}

els.heroCta.addEventListener('click', async () => {
  await audio.unlock();
  audio.startMusic();
  els.hero.hidden = true;
  document.body.dataset.hero = 'done';
});
els.heroHow.addEventListener('click', () => (els.howPanel.hidden = !els.howPanel.hidden));
els.deployBtn.addEventListener('click', deploy);
els.rematchBtn.addEventListener('click', () => {
  els.overlay.hidden = true;
  deploy();
});
els.pauseBtn.addEventListener('click', () => fire(phase === 'paused' ? 'resume' : 'pause'));
els.thoughtToggle.addEventListener('change', () => {
  save.data.showThought = els.thoughtToggle.checked;
  save.persist();
});
els.thoughtToggle.checked = save.data.showThought;
els.soundBtn.addEventListener('click', async () => {
  const m = !audio.muted;
  await audio.unlock();
  audio.setMuted(m);
  save.data.muted = m;
  save.persist();
  renderSoundBtn();
});
function renderSoundBtn() {
  els.soundBtn.textContent = audio.muted ? `🔇 ${t(lang, 'soundOff')}` : `🔊 ${t(lang, 'soundOn')}`;
}
renderSoundBtn();
els.langBtn.addEventListener('click', () => {
  lang = lang === 'ja' ? 'en' : 'ja';
  save.data.lang = lang;
  save.persist();
  applyI18n(lang);
  buildPickers();
  renderSoundBtn();
  els.langBtn.textContent = t(lang, 'langBtn');
});
els.langBtn.textContent = t(lang, 'langBtn');

document.addEventListener('visibilitychange', () => {
  if (document.hidden && phase === 'playing') fire('pause');
});
addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && phase === 'playing') fire('pause');
  else if (e.key === 'Escape' && phase === 'paused') fire('resume');
});

// debug hook
if (DEBUG) {
  globalThis.__pong = {
    get game() {
      return game;
    },
    get phase() {
      return phase;
    },
    hostL,
    hostR,
    save,
    deploy,
    startMatch,
  };
}

setPhase('boot');
boot();

// host lastMove bookkeeping — bind here to keep BrainHost generic.
for (const host of [hostL, hostR]) {
  const prev = host.onMessage;
  host.onMessage = (m) => {
    if (m.type === 'tick' && m.ok !== false) host.lastMove = m.move ?? 0;
    prev?.(m);
  };
}
