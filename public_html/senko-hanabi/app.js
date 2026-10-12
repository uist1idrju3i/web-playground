// Senko-hanabi app: capability gate -> signed save -> WASM sim at display
// rate -> WebGPU/WebGL2 renderer -> WebAudio cues. The random mode ('feel'
// vs 'trng') decides whether the WASM draws come from a seeded xoshiro
// (game-shaped) or a crypto-fed entropy ring (memoryless).

import { checkRequirements } from '/library/js/requirements.js';
import { createSimulation, EVENT, PHASE, RNG_MODE } from './js/sim.js';
import { createScene, updateScene } from './js/render/scene.js';
import { createWebGL2 } from './js/render/webgl2.js';
import { createWebGPU } from './js/render/webgpu.js';
import { createAudioEngine } from './js/audio/engine.js';
import { openSave } from './js/save.js';
import { recordBurn, renderHistogram } from './js/stats.js';
import { applyI18n, language, setLanguage, stageName, t } from './js/i18n.js';
import { transition } from './js/statechart.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const SPEED = Math.max(0.25, Math.min(64, Number(params.get('speed')) || 1));
const DEBUG = params.get('debug') === '1';
const FIXED_SEED = params.has('seed') ? Number(params.get('seed')) >>> 0 : null;
const PARAM_MODE = params.get('mode');

const gate = await checkRequirements({
  required: ['es-modules', 'webassembly', 'webgl', 'pointer-events', 'fetch'],
  optional: [
    'webgpu',
    'web-audio',
    'audio-worklet',
    'web-crypto',
    'web-crypto-random',
    'local-storage',
    'indexeddb',
  ],
  container: $('screen-boot'),
});

const appEl = $('app');

if (!gate.ok) {
  $('boot-status').textContent = 'This browser cannot run this app.';
  appEl.dataset.phase = 'unsupported';
} else {
  boot().catch((error) => {
    $('boot-status').textContent = `App failed to start: ${error.message ?? error}`;
    appEl.dataset.phase = 'error';
    console.error(error);
  });
}

function nextSeed() {
  if (FIXED_SEED !== null) return FIXED_SEED;
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] || 1;
}

async function boot() {
  const canvas = $('scene');
  const save = await openSave();
  if (['tampered', 'corrupt', 'rollback', 'key-missing'].includes(save.status)) {
    console.warn(t('saveWarn'));
    $('save-warning').hidden = false;
    setTimeout(() => {
      $('save-warning').hidden = true;
    }, 6000);
  }
  setLanguage(save.data.settings.lang);
  applyI18n(document);

  const audio = createAudioEngine();
  audio.volume = save.data.settings.volume;
  audio.muted = save.data.settings.muted;

  let mode =
    PARAM_MODE === 'trng' || PARAM_MODE === 'feel' ? PARAM_MODE : save.data.settings.mode || 'feel';
  const trngSupported =
    gate.results.some((r) => r.id === 'web-crypto-random' && r.status === 'supported') &&
    typeof crypto !== 'undefined' &&
    typeof crypto.getRandomValues === 'function';
  if (mode === 'trng' && !trngSupported) mode = 'feel';

  // Renderer: WebGPU first, WebGL2 fallback (same scene model).
  let renderer;
  try {
    renderer = await createWebGPU(canvas);
  } catch {
    renderer = createWebGL2(canvas);
  }

  const sim = await createSimulation({
    seed: nextSeed(),
    mode: mode === 'trng' ? RNG_MODE.TRNG : RNG_MODE.FEEL,
  });
  const scene = createScene(sim.particleCap);

  $('engine-tag').textContent = t('engine', {
    gpu: renderer.kind === 'webgpu' ? 'WebGPU' : 'WebGL2',
    simd: sim.simd ? t('simd') : '',
  });

  let phase = 'boot';
  const screens = {
    boot: $('screen-boot'),
    title: $('screen-title'),
    lit: $('hud'),
    spent: $('screen-spent'),
  };
  function show(name) {
    for (const [key, el] of Object.entries(screens)) {
      el.hidden = key !== name;
    }
    if (name === 'lit') screens.title.hidden = true;
  }
  function go(event) {
    phase = transition(phase, event);
    appEl.dataset.phase = phase;
    document.body.dataset.phase = phase;
    show(phase);
  }

  // --- random-mode picker wiring -------------------------------------------
  const modeCards = [
    [$('mode-feel'), $('mode-feel2'), 'feel'],
    [$('mode-trng'), $('mode-trng2'), 'trng'],
  ];
  function applyModeUI() {
    for (const [a, b, m] of modeCards) {
      a.setAttribute('aria-pressed', String(mode === m));
      b.setAttribute('aria-pressed', String(mode === m));
      if (m === 'trng' && !trngSupported) {
        a.disabled = true;
        b.disabled = true;
        $('trng-unsupported').hidden = false;
      }
    }
    $('hud-mode').textContent = mode === 'trng' ? t('trngShort') : t('feelShort');
  }
  for (const [a, b, m] of modeCards) {
    a.addEventListener('click', () => {
      mode = m;
      applyModeUI();
    });
    b.addEventListener('click', () => {
      mode = m;
      applyModeUI();
    });
  }
  applyModeUI();

  // --- input: drag to tilt ---------------------------------------------------
  let dragging = false;
  let dragX = 0;
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    dragX = e.clientX;
    canvas.setPointerCapture(e.pointerId);
    audio.unlock();
  });
  canvas.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    const dx = (e.clientX - dragX) / Math.max(120, canvas.clientWidth * 0.4);
    sim.setTilt(Math.max(-1, Math.min(1, dx)));
  });
  const endDrag = () => {
    dragging = false;
    sim.setTilt(0);
  };
  canvas.addEventListener('pointerup', endDrag);
  canvas.addEventListener('pointercancel', endDrag);
  globalThis.addEventListener('pointerdown', () => audio.unlock(), { once: true });

  // --- burn lifecycle ---------------------------------------------------------
  let intervals = [];
  let bursts = 0;

  function light() {
    sim.restart(nextSeed(), mode === 'trng' ? RNG_MODE.TRNG : RNG_MODE.FEEL);
    sim.feedEntropy();
    sim.light();
    intervals = [];
    bursts = 0;
    go('light');
    audio.ignite();
  }

  function finish(elapsed) {
    const rec = save.data.stats[mode];
    const duration = elapsed;
    recordBurn(rec, { duration, intervals });
    save.data.settings.mode = mode;
    save.save();
    $('res-duration').textContent = `${duration.toFixed(1)}${t('sec')}`;
    $('res-record').textContent = `${rec.longest.toFixed(1)}${t('sec')}`;
    $('res-bursts').textContent = `${bursts}`;
    $('res-seed').textContent = `#${sim.seed >>> 0}`;
    audio.spent();
    go('spent');
  }

  function onEvent(kind, a, b) {
    if (kind === EVENT.PHASE) {
      $('hud-phase-name').textContent = stageName(a);
    } else if (kind === EVENT.EJECT) {
      if (b > 0) intervals.push(b); // interval carried on the event
      audio.crack(a);
    } else if (kind === EVENT.BURST) {
      bursts = b; // cumulative split count carried on the event
      audio.pop();
    } else if (kind === EVENT.LAND) {
      audio.land();
    } else if (kind === EVENT.SPENT) {
      finish(a);
    }
  }

  $('btn-start').addEventListener('click', light);
  $('btn-again').addEventListener('click', light);
  $('btn-home').addEventListener('click', () => go('home'));
  $('btn-how').addEventListener('click', () => {
    $('drawer-how').hidden = false;
  });
  $('btn-how-close').addEventListener('click', () => {
    $('drawer-how').hidden = true;
  });
  $('btn-oobe').addEventListener('click', () => {
    $('drawer-oobe').hidden = true;
    save.data.settings.oobeSeen = true;
    save.save();
  });

  function renderStats() {
    const s = save.data.stats;
    const empty = s.feel.sticks + s.trng.sticks === 0;
    $('stats-empty').hidden = !empty;
    for (const m of ['feel', 'trng']) {
      $(`stat-${m}-name`).textContent = m === 'trng' ? t('modeTrng') : t('modeFeel');
      $(`stat-${m}-sticks`).textContent = s[m].sticks;
      $(`stat-${m}-longest`).textContent = s[m].longest
        ? `${s[m].longest.toFixed(1)}${t('sec')}`
        : '–';
      renderHistogram($(`hist-${m}`), s[m].hist, { unit: 's', step: 5 });
      renderHistogram($(`hist-${m}-int`), s[m].ints, { unit: 'ms', step: 50 });
    }
  }
  $('btn-stats').addEventListener('click', () => {
    renderStats();
    $('drawer-stats').hidden = false;
  });
  $('btn-stats2').addEventListener('click', () => {
    renderStats();
    $('drawer-stats').hidden = false;
  });
  $('btn-stats-close').addEventListener('click', () => {
    $('drawer-stats').hidden = true;
  });

  // --- controls ---------------------------------------------------------------
  $('vol').value = String(save.data.settings.volume);
  $('vol').addEventListener('input', () => {
    audio.setVolume(Number($('vol').value));
    save.data.settings.volume = audio.volume;
    save.save();
  });
  $('btn-mute').addEventListener('click', () => {
    audio.setMuted(!audio.muted);
    save.data.settings.muted = audio.muted;
    save.save();
  });
  $('btn-bgm').addEventListener('click', async () => {
    save.data.settings.bgm = !save.data.settings.bgm;
    audio.setBgm(save.data.settings.bgm);
    if (save.data.settings.bgm) {
      await audio.unlock();
      audio.startBgm();
    }
    save.save();
  });
  $('btn-lang').addEventListener('click', () => {
    save.data.settings.lang = language() === 'ja' ? 'en' : 'ja';
    setLanguage(save.data.settings.lang);
    applyI18n(document);
    applyModeUI();
    save.save();
  });
  $('btn-shot').addEventListener('click', async () => {
    const url = await renderer.snapshot();
    const a = document.createElement('a');
    a.href = url;
    a.download = `senko-hanabi-${Date.now()}.png`;
    a.click();
  });
  globalThis.addEventListener('keydown', (e) => {
    if (e.key === 'm' || e.key === 'M') $('btn-mute').click();
    if (e.key === 'l' || e.key === 'L') $('btn-lang').click();
    if (e.key === 's' || e.key === 'S') $('btn-shot').click();
  });

  // --- main loop --------------------------------------------------------------
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000) * SPEED;
    last = now;
    if (phase === 'lit') {
      sim.step(dt);
      sim.drainEvents(onEvent);
      const s = sim.state;
      $('hud-time').textContent = `${s[1].toFixed(1)}s`;
      $('hud-sparks').textContent = `${s[5] | 0}`;
      audio.setHiss(Math.min(1, s[5] / 400) * (s[0] === PHASE.MATSUBA ? 1 : 0.4));
    }
    updateScene(scene, sim);
    renderer.draw(scene, dt);
    requestAnimationFrame(frame);
  }

  // --- start -------------------------------------------------------------------
  if (save.data.settings.bgm) {
    audio.unlock().then(() => audio.startBgm());
  }
  go('ready');
  if (!save.data.settings.oobeSeen) $('drawer-oobe').hidden = false;
  requestAnimationFrame(frame);

  if (DEBUG) {
    globalThis.__senko = { sim, scene, renderer, save, light, appEl };
  }
}
