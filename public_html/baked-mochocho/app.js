import { checkRequirements } from '/library/js/requirements.js';
import { transition } from './js/statechart.js';
import { makeCakeView } from './js/render/cakeview.js';
import { createSignedStore } from '/library/js/signed-storage.js';
import { createSimulation } from './js/sim.js';
import { AudioEngine } from './js/audio/engine.js';
import { t, setLanguage, language } from './js/i18n.js';
import { scoreCake, priceFor, makeOrder, mulberry32, FILLINGS } from './js/score.js';
import { makeCamera, pick, toScreen, moldTexture } from './js/render/scene.js';
import { createWebGL2Renderer } from './js/render/webgl2.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const TIME_SCALE = Math.min(40, Math.max(1, Number(params.get('speed')) || 5));
const POUR_RATE = 6;
const BORDER = 10;
const SAVE_VERSION = 1;
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const isAppleTouch =
  navigator.maxTouchPoints > 1 && /iPhone|iPad|Macintosh/.test(navigator.userAgent);

const state = {
  sim: null,
  renderer: null,
  camera: null,
  audio: new AudioEngine(),
  store: null,
  save: {
    coins: 0,
    best: 0,
    round: 0,
    served: 0,
    lang: 'ja',
    sound: true,
    bgm: true,
    hintShown: false,
  },
  tool: 'batter',
  filling: 1,
  heat: 0.6,
  pointer: null,
  phase: 'boot',
  // Preallocated per-frame read targets (no per-frame object allocation).
  cavityObjs: [0, 1, 2, 3, 4, 5].map(() => ({})),
  audioObj: {},
  flipAngles: [0, 0, 0],
  combo: 0,
  bestCombo: 0,
  fillingKinds: [0, 0, 0, 0, 0, 0],
  frameSkip: false,
  cursor: { x: 0, y: 0, radius: 0, active: false },
  running: false,
  paused: false,
  order: { filling: 1 },
  rng: mulberry32(Date.now() >>> 0),
  scale: 1,
  frameMs: 16,
  lastTime: 0,
  captionUntil: 0,
  guideKey: '',
};

function toast(text, ms = 2200) {
  const node = $('toast');
  node.textContent = text;
  node.hidden = false;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => {
    node.hidden = true;
  }, ms);
}

function caption(key) {
  $('caption').textContent = t(key);
  state.captionUntil = performance.now() + 900;
}

function haptic(ms) {
  if (navigator.vibrate && !reducedMotion.matches) navigator.vibrate(ms);
}

async function createRenderer(canvas, sim) {
  const options = {
    grid: sim.grid,
    mold: moldTexture(sim),
    border: BORDER,
    present: !(params.has('debug') && params.get('present') === '0'),
  };
  if (navigator.gpu && params.get('renderer') !== 'webgl2') {
    try {
      const { createWebGPURenderer } = await import('./js/render/webgpu.js');
      return await createWebGPURenderer(canvas, options);
    } catch (error) {
      console.info('WebGPU unavailable, using WebGL2:', error.message);
      const fresh = canvas.cloneNode(false);
      canvas.replaceWith(fresh);
      return createWebGL2Renderer(fresh, options);
    }
  }
  return createWebGL2Renderer(canvas, options);
}

function stage() {
  return $('stage');
}

// Fit the plate between the top HUD and the bottom controls as fractions of the stage height.
function hudInsets(height) {
  const top = document.querySelector('.hud-top')?.getBoundingClientRect().bottom ?? 0;
  const bottom = document.querySelector('.hud-bottom')?.getBoundingClientRect().top ?? height;
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  return {
    safeTop: clamp((top + 8) / height, 0.04, 0.3),
    safeBottom: clamp((height - bottom + 8) / height, 0.08, 0.42),
  };
}

function resize() {
  const canvas = stage();
  const dpr = Math.min(window.devicePixelRatio || 1, 3) * state.scale;
  const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
  const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
  if (
    canvas.width !== w ||
    canvas.height !== h ||
    !state.camera ||
    state.cameraCssW !== canvas.clientWidth ||
    state.cameraCssH !== canvas.clientHeight
  ) {
    canvas.width = w;
    canvas.height = h;
    state.cameraCssW = canvas.clientWidth;
    state.cameraCssH = canvas.clientHeight;
    state.camera = makeCamera(state.cameraCssW, state.cameraCssH, {
      zeroToOne: state.renderer?.zeroToOne,
      // Layout reads happen only when the CSS size actually changed.
      ...hudInsets(state.cameraCssH),
    });
  }
}

function cavityAt(p) {
  let best = -1;
  let bestD = Infinity;
  state.sim.cavities.forEach((c, i) => {
    const d = Math.hypot(p.x - c.x, p.y - c.y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return bestD <= state.sim.radius * 1.25 ? best : -1;
}

function pointAt(event) {
  const canvas = stage();
  const rect = canvas.getBoundingClientRect();
  return pick(
    state.camera,
    event.clientX - rect.left,
    event.clientY - rect.top,
    rect.width,
    rect.height,
    state.renderer.zeroToOne,
  );
}

function errorFeedback(key) {
  state.audio.cue('error');
  state.combo = 0;
  updateCombo();
  caption('cap.error');
  toast(t(key));
  haptic([20, 40, 20]);
}

function onPointerDown(event) {
  if (!state.running || state.paused) return;
  const p = pointAt(event);
  if (!p) return;
  stage().setPointerCapture(event.pointerId);
  state.pointer = { id: event.pointerId, start: p, last: p, startY: event.clientY };
  const cavity = cavityAt(p);
  if (state.tool === 'batter') {
    state.sim.setNozzle(p.x, p.y, POUR_RATE);
    state.pointer.poured = new Set();
    if (cavity >= 0) state.pointer.poured.add(cavity);
    caption('cap.pour');
  } else if (state.tool === 'oil') {
    state.sim.grease(p.x, p.y, 20, 0.8);
  } else if (state.tool === 'filling') {
    if (cavity < 0) return;
    const code = state.sim.addFilling(cavity, state.filling, p.x, p.y);
    if (code === 0) {
      state.audio.cue('confirm');
      haptic(10);
    } else errorFeedback(`err.fill.${code}`);
  } else if (state.tool === 'flip') {
    if (cavity < 0) return;
    const ready = state.sim.cavity(cavity % 3).topSetMean;
    const code = state.sim.startFlip(cavity % 3);
    if (code !== 0) errorFeedback(`err.flip.${code}`);
    else judgeCavity(cavity % 3, ready >= 0.45 && ready <= 0.85 ? 'perfect' : 'good');
  } else if (state.tool === 'serve') {
    if (cavity < 0) return;
    serve(cavity % 3);
  }
  updateCursor(p, true);
}

function onPointerMove(event) {
  if (!state.camera || !state.renderer) return;
  const p = pointAt(event);
  if (!p) return;
  updateCursor(p, true);
  if (!state.pointer || state.pointer.id !== event.pointerId) return;
  if (state.tool === 'batter') {
    state.sim.setNozzle(p.x, p.y, POUR_RATE);
    const pouredCavity = cavityAt(p);
    if (pouredCavity >= 0 && state.pointer.poured) state.pointer.poured.add(pouredCavity);
  }
  if (state.tool === 'oil') {
    const steps = Math.ceil(Math.hypot(p.x - state.pointer.last.x, p.y - state.pointer.last.y) / 4);
    for (let i = 1; i <= steps; i += 1) {
      const k = i / steps;
      state.sim.grease(
        state.pointer.last.x + (p.x - state.pointer.last.x) * k,
        state.pointer.last.y + (p.y - state.pointer.last.y) * k,
        20,
        0.5,
      );
    }
  }
  state.pointer.last = p;
}

function onPointerUp(event) {
  if (!state.pointer || state.pointer.id !== event.pointerId) return;
  if (state.tool === 'batter') {
    state.sim.setNozzle(0, 0, 0);
    // Judge each cavity the gesture poured into: 40-55 ml is the goal band.
    for (const i of state.pointer.poured ?? []) {
      if (i >= 3) continue;
      const ml = state.sim.cavity(i).batterMl;
      judgeCavity(i, ml >= 40 && ml <= 55 ? 'perfect' : ml >= 25 && ml <= 68 ? 'good' : 'miss');
    }
  }
  const start = state.pointer.start;
  const swipe = event.clientY - state.pointer.startY;
  const cavity = cavityAt(start);
  if (
    state.tool !== 'flip' &&
    swipe > 60 &&
    cavity >= 0 &&
    cavity < 3 &&
    state.sim.cavity(cavity).state >= 1
  ) {
    const ready = state.sim.cavity(cavity).topSetMean;
    const code = state.sim.startFlip(cavity);
    if (code !== 0) errorFeedback(`err.flip.${code}`);
    else judgeCavity(cavity, ready >= 0.45 && ready <= 0.85 ? 'perfect' : 'good');
  }
  state.pointer = null;
  if (event.pointerType !== 'mouse') state.cursor.active = false;
}

function updateCursor(p, active) {
  const radius = { batter: 6, oil: 20, filling: 10, flip: 34, serve: 36 }[state.tool];
  state.cursor = { x: p.x, y: p.y, radius, active };
}

function selectTool(tool) {
  if (tool === 'filling' && state.tool === 'filling') {
    state.filling = (state.filling % 4) + 1;
    renderFillingTool();
  }
  if (state.tool !== tool) state.audio.cue('confirm');
  state.tool = tool;
  for (const button of document.querySelectorAll('.tool')) {
    button.setAttribute('aria-pressed', String(button.dataset.tool === tool));
  }
  haptic(8);
}

function renderFillingTool() {
  $('filling-name').dataset.i18n = `filling.${state.filling}`;
  $('filling-name').textContent = t(`filling.${state.filling}`);
  $('filling-icon').style.setProperty('--filling-color', FILLINGS[state.filling].color);
}

// Action judgement: pop a PERFECT/GOOD/MISS label over the cavity and keep
// the combo counter. Perfect extends the combo, miss resets it.
function judgeCavity(cavity, rating) {
  const c = state.sim.cavities[cavity];
  const pos = toScreen(state.camera, c.x, c.y, 26, stage().clientWidth, stage().clientHeight);
  const el = document.createElement('div');
  el.className = `judge judge-${rating}`;
  el.textContent = t(`judge.${rating}`);
  el.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%)`;
  $('judges').append(el);
  setTimeout(() => el.remove(), 950);
  if (rating === 'perfect') {
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.audio.cue('perfect');
  } else if (rating === 'miss') {
    state.combo = 0;
  }
  updateCombo();
}

function updateCombo() {
  $('combo-stat').hidden = state.combo < 2;
  $('combo-count').textContent = `x${state.combo}`;
}

// IEEE-754 half-float decode for the Uint16 field arrays.
function f16(h) {
  const sign = h & 0x8000 ? -1 : 1;
  const e = (h >> 10) & 0x1f;
  const f = h & 0x3ff;
  if (e === 0) return sign * f * 2 ** -24;
  if (e === 0x1f) return sign * Infinity;
  return sign * (1 + f / 1024) * 2 ** (e - 15);
}

// Capture the real bake field around the finished cake so the result view
// shows THIS cake's actual browning instead of averaged statistics.
// Returns { top, bottom, thickness } RGBA-free grayscale maps (64x64).
function snapshotCake(pair) {
  const N = 64;
  const cavity = state.sim.cavities[pair + 3];
  const radius = state.sim.radius;
  const { w, h } = state.sim.grid;
  const { fieldA } = state.sim;
  const out = {
    top: new Float32Array(N * N),
    bottom: new Float32Array(N * N),
    rim: new Float32Array(N * N),
    size: N,
  };
  for (let j = 0; j < N; j += 1) {
    for (let i = 0; i < N; i += 1) {
      const lx = (i / (N - 1) - 0.5) * 2 * radius;
      const ly = (j / (N - 1) - 0.5) * 2 * radius;
      const gx = Math.round((cavity.x + lx) / state.sim.grid.cell);
      const gy = Math.round((cavity.y + ly) / state.sim.grid.cell);
      if (gx < 0 || gy < 0 || gx >= w || gy >= h) continue;
      const base = (gy * w + gx) * 4;
      out.top[j * N + i] = f16(fieldA[base + 1]);
      out.bottom[j * N + i] = f16(fieldA[base + 2]);
      out.rim[j * N + i] = Math.min(1, f16(fieldA[base]) / 14);
    }
  }
  return out;
}

async function serve(pair) {
  const cakeTex = snapshotCake(pair);
  const stats = state.sim.takeOut(pair);
  if (stats.ok === false) {
    errorFeedback(`err.serve.${stats.code}`);
    return;
  }
  const score = scoreCake(stats, state.order);
  judgeCavity(pair + 3, score.stars >= 4 ? 'perfect' : score.stars >= 3 ? 'good' : 'miss');
  const price = priceFor(score) + Math.min(20, state.combo * 2);
  state.save.coins += price;
  state.save.best = Math.max(state.save.best, score.total);
  state.save.served += 1;
  state.save.round += 1;
  state.audio.cue(score.stars >= 4 ? 'completion' : score.stars >= 3 ? 'success' : 'notification');
  caption('cap.success');
  haptic([15, 30, 15]);
  showResult(stats, score, price, cakeTex);
  state.order = makeOrder(state.rng, state.save.round);
  updateHud();
  await persist();
}

function showResult(stats, score, price, cakeTex) {
  $('result-heading').textContent = t(`rank.${score.stars}`);
  $('result-stars').textContent = '★'.repeat(score.stars) + '☆'.repeat(5 - score.stars);
  $('result-score').textContent = `${score.total} / 100 · +${price}`;
  const grid = $('result-grid');
  grid.replaceChildren();
  for (const [key, value] of Object.entries(score.grades)) {
    const dt = document.createElement('dt');
    dt.textContent = t(`grade.${key}`);
    const dd = document.createElement('dd');
    dd.textContent = `${Math.round(value * 100)}%`;
    grid.append(dt, dd);
  }
  $('result-comment').textContent = t(score.comment);
  try {
    state.cakeView?.dispose();
    state.cakeView = makeCakeView($('result-preview'), stats, { tex: cakeTex });
  } catch {
    state.cakeView = null;
    drawPreview($('result-preview'), stats);
  }
  $('result-screen').hidden = false;
  state.paused = true;
  $('next-button').focus();
}

function brownRgb(b) {
  const stops = [
    [0, [245, 224, 178]],
    [0.3, [237, 186, 110]],
    [0.62, [199, 120, 48]],
    [0.95, [128, 64, 20]],
    [1.3, [36, 18, 9]],
  ];
  for (let i = 1; i < stops.length; i += 1) {
    if (b <= stops[i][0]) {
      const k = (b - stops[i - 1][0]) / (stops[i][0] - stops[i - 1][0]);
      return stops[i - 1][1].map((c, j) => Math.round(c + (stops[i][1][j] - c) * k));
    }
  }
  return stops.at(-1)[1];
}

function drawPreview(canvas, stats) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);
  const top = brownRgb(stats.topBrownMean);
  const side = brownRgb(Math.max(0, stats.bottomBrownMean - 0.15));
  const ring = 0.5 + stats.ringWhiteness * 0.5;
  ctx.fillStyle = `rgb(${side.join(',')})`;
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.58, w * 0.36, h * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(250, 236, 205, ${ring * 0.8})`;
  ctx.fillRect(w * 0.14, h * 0.5, w * 0.72, h * 0.06);
  const grad = ctx.createRadialGradient(w * 0.44, h * 0.4, 6, w / 2, h * 0.46, w * 0.38);
  grad.addColorStop(0, `rgb(${top.map((c) => Math.min(255, c + 30)).join(',')})`);
  grad.addColorStop(1, `rgb(${top.join(',')})`);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.ellipse(w / 2, h * 0.46, w * 0.36, h * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.16)';
  ctx.beginPath();
  ctx.ellipse(w * 0.4, h * 0.36, w * 0.12, h * 0.05, -0.3, 0, Math.PI * 2);
  ctx.fill();
}

function updateHud() {
  $('coins').textContent = String(state.save.coins);
  $('best').textContent = String(state.save.best);
  $('order-items').textContent = t(`filling.${state.order.filling}`);
}

function updateGuide(cavities) {
  let key = 'guide.serve';
  const anyBatter = cavities.some((c) => c.state >= 1);
  const tops = cavities.slice(0, 3);
  if (state.save.served === 0 && !anyBatter && state.tool === 'oil') key = 'guide.oil';
  else if (cavities.some((c) => c.state === 0) && !cavities.some((c) => c.state === 4))
    key = 'guide.batter';
  else if (tops.some((c) => c.state === 1)) key = 'guide.filling';
  else if (tops.some((c) => c.state === 2 && c.topSetMean < 0.45)) key = 'guide.wait';
  else if (tops.some((c) => c.state === 2)) key = 'guide.flip';
  if (key !== state.guideKey) {
    state.guideKey = key;
    $('guide').textContent = t(key);
    // Light up the tool the guide asks for next.
    const next = {
      'guide.oil': 'oil',
      'guide.batter': 'batter',
      'guide.filling': 'filling',
      'guide.flip': 'flip',
      'guide.serve': 'serve',
    }[key];
    document
      .querySelectorAll('.tool[data-tool]')
      .forEach((b) => b.classList.toggle('is-next', b.dataset.tool === next));
  }
}

function updateChips(cavities, width, height) {
  const chips = $('pair-chips').children;
  for (let pair = 0; pair < 3; pair += 1) {
    const top = cavities[pair];
    const bottom = cavities[pair + 3];
    let text = t('chip.empty');
    let tone = '';
    if (bottom.state === 4) {
      const pct = Math.round(Math.min(1.4, bottom.topBrownMean) * 100);
      text = bottom.burntFraction > 0.05 ? t('chip.burning') : t('chip.cake', { pct });
      tone = bottom.burntFraction > 0.05 ? 'warn' : bottom.topBrownMean > 0.45 ? 'good' : '';
    } else if (top.state >= 1 || bottom.state >= 1) {
      const pct = Math.round(Math.min(1, (top.topSetMean + bottom.topSetMean) / 2 / 0.6) * 100);
      text =
        top.state === 1
          ? t('chip.pouring', { ml: Math.round(top.batterMl) })
          : top.state >= 1 && top.topSetMean > 0.45
            ? t('chip.ready')
            : top.state >= 1
              ? t('chip.cooking', { pct })
              : t('chip.batter', { ml: Math.round(bottom.batterMl) });
      tone =
        top.bottomBrownMean > 1.05
          ? 'warn'
          : top.state === 1 && top.batterMl >= 40
            ? 'good'
            : top.topSetMean > 0.45
              ? 'good'
              : '';
    }
    const chip = chips[pair];
    if (chip.textContent !== text) chip.textContent = text;
    chip.dataset.tone = tone;
    const anchor = state.camera.portrait ? state.sim.cavities[pair] : state.sim.cavities[pair + 3];
    const pos = toScreen(
      state.camera,
      anchor.x + (state.camera.portrait ? 0 : 0),
      anchor.y + (state.camera.portrait ? 84 : 46),
      0,
      width,
      height,
    );
    chip.style.transform = `translate(${Math.round(pos.x)}px, ${Math.round(pos.y)}px) translate(-50%, -50%)`;
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  if (!state.renderer || document.hidden) return;
  const frameIntervalMs = Math.max(0, now - state.lastTime);
  const dt = Math.min(1 / 20, frameIntervalMs / 1000);
  state.lastTime = now;
  state.frameMs = state.frameMs * 0.95 + frameIntervalMs * 0.05;
  // Sustained heavy frames: halve the work by running sim+render every other rAF.
  if (state.frameMs > 34 && $('quality-toggle').checked) {
    state.frameSkip = !state.frameSkip;
    if (state.frameSkip) return;
  } else state.frameSkip = false;
  if ($('quality-toggle').checked) {
    const target =
      state.frameMs > 45 ? 0.45 : state.frameMs > 24 ? 0.6 : state.frameMs < 17.5 ? 1 : state.scale;
    if (target < state.scale) {
      state.scale = target;
    } else if (target - state.scale > 0.05) {
      state.scale += (target - state.scale) * 0.1;
    } else state.scale = target;
  } else state.scale = 0.6;
  resize();
  if (state.running && !state.paused) state.sim.step(dt * TIME_SCALE);
  const canvas = stage();
  const cavities = state.cavityObjs;
  for (let i = 0; i < 6; i += 1) state.sim.cavityInto(i, cavities[i]);
  const particles = state.sim.particles();
  const flips = state.flipAngles;
  for (let p = 0; p < 3; p += 1) flips[p] = cavities[p].flipAngle;
  const audio = state.sim.audioInto(state.audioObj);
  if (state.running && !state.paused) {
    state.audio.update(audio);
    if (audio.flipLandedEvents > 0) {
      caption('cap.flip');
      haptic(25);
    } else if (audio.burning > 0.4) caption('cap.warning');
    else if (audio.pourFlowMlS > 0.5) caption('cap.pour');
    else if (audio.bubblePops > 0 && now > state.captionUntil) caption('cap.bubble');
    else if (audio.sizzle > 0.3 && now > state.captionUntil) caption('cap.sizzle');
  }
  if (now > state.captionUntil) $('caption').textContent = '';
  const plateTemp = cavities.reduce((s, c) => s + c.plateTempC, 0) / cavities.length;
  document.documentElement.style.setProperty(
    '--temp',
    String(Math.min(1, Math.max(0, (plateTemp - 100) / 240))),
  );
  $('thermo-label').textContent = `${Math.round(plateTemp)}℃`;
  $('thermo').setAttribute('aria-valuenow', String(Math.round(plateTemp)));
  state.lastFrame = {
    fieldA: state.sim.fieldA,
    fieldB: state.sim.fieldB,
    particles,
    particleCount: particles.length / 8,
    flips,
    fillingKinds: state.fillingKinds.map((_, i) =>
      cavities[i].state === 2 || cavities[i].state === 3 ? cavities[i].fillingKind : 0,
    ),
    cursor: state.cursor,
    time: now / 1000,
    plateTemp,
    width: canvas.width,
    height: canvas.height,
    reducedMotion: reducedMotion.matches,
    heat: state.heat,
    burning: audio.burning ?? 0,
  };
  state.renderer.render(state.camera, state.lastFrame);
  if (state.running) {
    updateGuide(cavities);
    updateChips(cavities, canvas.clientWidth, canvas.clientHeight);
  }
  document.body.dataset.frames = String((Number(document.body.dataset.frames) || 0) + 1);
}

async function persist() {
  if (!state.store) return;
  try {
    await state.store.save(state.save);
    $('save-line').textContent = t('save.saved');
  } catch {
    $('save-line').textContent = t('save.unavailable');
  }
}

async function loadSave() {
  try {
    state.store = await createSignedStore({ name: 'baked-mochocho', version: SAVE_VERSION });
    const result = await state.store.load();
    document.body.dataset.save = result.status;
    if (result.status === 'ok' && result.data) Object.assign(state.save, result.data);
    $('save-line').textContent = t(`save.${result.status}`);
  } catch {
    document.body.dataset.save = 'unavailable';
    $('save-line').textContent = t('save.unavailable');
  }
}

function start() {
  const button = $('start-button');
  button.disabled = true;
  // Desired state first: engine reads these flags when the context finally exists.
  state.audio.setEnabled(state.save.sound);
  state.audio.setBgm(state.save.bgm);
  // Unlock fully in the background — a stalled AudioContext (e.g. headless
  // browsers without an audio device) must never hold the start click hostage.
  void Promise.resolve()
    .then(() => state.audio.unlock())
    .catch((error) => console.info('Audio unavailable:', error.message));
  $('title-screen').hidden = true;
  state.running = true;
  state.paused = false;
  state.order = makeOrder(state.rng, state.save.round);
  updateHud();
  setPhase('start');
  if (isAppleTouch && !state.save.hintShown) {
    toast(t('soundNote'), 4000);
    state.save.hintShown = true;
    persist();
  }
}

// All phase changes go through the statechart; illegal moves throw.
function setPhase(event) {
  state.phase = transition(state.phase, event);
  document.body.dataset.phase = state.phase;
}

function bindUi() {
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  for (const button of document.querySelectorAll('.tool')) {
    button.addEventListener('click', () => selectTool(button.dataset.tool));
  }
  const heat = $('heat');
  heat.addEventListener('input', () => {
    state.heat = Number(heat.value) / 100;
    state.sim?.setHeat(state.heat);
    document.documentElement.style.setProperty('--heat', String(state.heat));
  });
  $('start-button').addEventListener('click', start);
  $('next-button').addEventListener('click', () => {
    state.cakeView?.dispose();
    state.cakeView = null;
    $('result-screen').hidden = true;
    state.paused = false;
    state.audio.cue('confirm');
  });
  $('menu-button').addEventListener('click', () => {
    $('menu-screen').hidden = false;
    state.paused = true;
    state.sim?.setNozzle(0, 0, 0);
  });
  $('close-menu').addEventListener('click', () => {
    $('menu-screen').hidden = true;
    state.paused = !$('result-screen').hidden || !$('title-screen').hidden;
  });
  $('sound-toggle').addEventListener('change', (e) => {
    state.save.sound = e.target.checked;
    state.audio.setEnabled(state.save.sound);
    persist();
  });
  $('bgm-toggle').addEventListener('change', (e) => {
    state.save.bgm = e.target.checked;
    state.audio.setBgm(state.save.bgm);
    persist();
  });
  $('reset-save').addEventListener('click', async () => {
    if (!confirm(t('confirmReset'))) return;
    await state.store?.clear();
    Object.assign(state.save, { coins: 0, best: 0, round: 0, served: 0 });
    updateHud();
    toast(t('save.empty'));
  });
  $('lang-button').addEventListener('click', () => {
    state.save.lang = language() === 'ja' ? 'en' : 'ja';
    applyLanguage();
    persist();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      state.sim?.setNozzle(0, 0, 0);
      state.audio.suspend();
    } else if (state.running) state.audio.resume();
  });
  window.addEventListener('resize', () => {
    state.camera = null;
  });
}

function applyLanguage() {
  setLanguage(state.save.lang);
  $('lang-button').textContent = t('language');
  renderFillingTool();
  state.guideKey = '';
  updateHud();
}

async function main() {
  const chips = $('pair-chips');
  for (let i = 0; i < 3; i += 1) {
    const li = document.createElement('li');
    li.className = 'pair-chip';
    chips.append(li);
  }
  const { ok } = await checkRequirements({
    required: ['webgl', 'webassembly', 'web-crypto', 'indexeddb'],
    optional: ['webgpu', 'web-audio', 'audio-worklet'],
    container: $('requirements'),
  });
  if (!ok) {
    setPhase('unsupported');
    return;
  }
  bindUi();
  await loadSave();
  applyLanguage();
  $('sound-toggle').checked = state.save.sound;
  $('bgm-toggle').checked = state.save.bgm;
  state.sim = await createSimulation({ seed: Date.now() >>> 0 });
  state.sim.setHeat(state.heat);
  state.renderer = await createRenderer(stage(), state.sim);
  document.body.dataset.renderer = state.renderer.name;
  if (params.has('debug')) globalThis.mochochoDebug = state;
  const engine = t('engine', { gpu: state.renderer.name, simd: state.sim.simd ? t('simd') : '' });
  $('engine-line').textContent = engine;
  $('menu-engine').textContent = engine;
  bindCanvas();
  $('start-button').disabled = false;
  setPhase('ready');
  state.lastTime = performance.now();
  requestAnimationFrame(frame);
}

function bindCanvas() {
  const canvas = stage();
  if (canvas.dataset.bound) return;
  canvas.dataset.bound = '1';
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

main().catch((error) => {
  const node = $('load-error');
  node.hidden = false;
  node.textContent = `${error.name}: ${error.message}`;
  setPhase('error');
  console.error(error);
});
