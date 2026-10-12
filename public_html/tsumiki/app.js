// Boot: capability gate, module wiring, RAF loop.
import { checkRequirements } from '/library/js/requirements.js';
import { loadPrefectures } from './js/geometry.js';
import { initPhysics, Physics } from './js/physics.js';
import { Renderer } from './js/renderer.js';
import { initWebgpuSky } from './js/renderer-webgpu.js';
import { AudioEngine } from './js/audio.js';
import { SaveStore } from './js/save.js';
import { Game } from './js/game.js';
import { Input, requestWakeLock } from './js/input.js';
import { Ui } from './js/ui.js';

const gate = await checkRequirements({
  required: ['es-modules', 'webassembly', 'webgl', 'pointer-events', 'fetch'],
  optional: ['webgpu', 'web-audio', 'web-crypto', 'local-storage', 'indexeddb', 'wake-lock'],
  container: document.getElementById('requirements'),
});

const app = document.getElementById('app');

if (!gate.ok) {
  app.hidden = true;
} else {
  boot().catch((error) => {
    const el = document.getElementById('boot-error');
    el.hidden = false;
    el.textContent = `アプリが うごきませんでした: ${error.message ?? error}`;
    console.error(error);
  });
}

async function boot() {
  const canvas = document.getElementById('game-canvas');
  const gpuCanvas = document.getElementById('gpu-canvas');

  const save = new SaveStore();
  await save.init();
  const loaded = await save.load();
  save.data = loaded.data;

  const data = await loadPrefectures();
  const pieces = data.pieces;

  await initPhysics();
  const physics = new Physics();
  const renderer = new Renderer(canvas);
  const audio = new AudioEngine();
  const ui = new Ui();
  const game = new Game({
    physics,
    renderer,
    audio,
    ui,
    save,
    pieces,
    onPersist: () => void save.save(save.data),
  });

  if (loaded.status === 'tampered') {
    ui.warnSave(true, 'きろくの データが かえられていたので、あたらしく しました。');
    setTimeout(() => ui.warnSave(false), 5000);
  } else if (!save.available) {
    ui.warnSave(true, 'この ブラウザでは セーブが つかえません(きろくは のこりません)。');
  }

  // Optional WebGPU backdrop.
  const gpuSky = await initWebgpuSky(gpuCanvas);
  if (gpuSky) {
    gpuCanvas.hidden = false;
    renderer.webgpuSky = true;
  }

  // Input
  const input = new Input(canvas);
  input.onFirstGesture = () => {
    if (audio.ensure()) audio.resume();
  };
  input.onAim = (delta, phase) => {
    if (phase === 'nudge') game.setAimDelta(delta, phase);
    else game.setAimDelta(delta, phase);
  };
  input.onDrop = (delta) => {
    if (audio.ctx && audio.ctx.state === 'suspended') audio.resume();
    game.drop(delta);
  };
  input.onPauseKey = () => {
    if (game.state === 'playing') game.pause();
    else if (game.state === 'paused') game.resume();
  };

  // Buttons
  const on = (id, fn) => document.getElementById(id).addEventListener('click', fn);
  on('btn-start', () => {
    if (audio.ensure()) audio.resume();
    if (!save.data.oobeDone) {
      ui.show('oobe');
      ui.setOobeCard(0);
    } else {
      game.startRun();
      document.body.classList.add('in-game');
      globalThis.scrollTo(0, 0);
      armWake();
    }
  });
  on('oobe-next', () => {
    const next = ui._oobeIndex + 1;
    if (next >= ui.oobeCards.length) {
      save.data.oobeDone = true;
      void save.save(save.data);
      game.startRun();
      document.body.classList.add('in-game');
      globalThis.scrollTo(0, 0);
      armWake();
    } else {
      audio.playCue('confirm');
      ui.setOobeCard(next);
    }
  });
  on('btn-how', () => {
    ui.show('oobe');
    ui.setOobeCard(0);
  });
  on('btn-pause', () => game.pause());
  on('btn-resume', () => game.resume());
  on('btn-quit', () => {
    game.gameOver();
  });
  on('btn-retry', () => {
    game.startRun();
    document.body.classList.add('in-game');
    globalThis.scrollTo(0, 0);
    armWake();
  });
  on('btn-title', () => {
    ui.show('title');
    game.state = 'title';
    audio.stopBgm();
    document.body.classList.remove('in-game');
  });
  on('btn-collection', () => {
    ui.buildCollection(pieces, game.collected, null, game.achievements);
    ui.show('collection');
    audio.playCue('notification');
  });
  on('btn-collection-2', () => {
    ui.buildCollection(pieces, game.collected, null, game.achievements);
    ui.show('collection');
  });
  on('collection-close', () => {
    ui.show(game.state === 'over' ? 'result' : game.state === 'paused' ? 'pause' : 'title');
  });
  on('mute-btn', () => {
    audio.ensure();
    audio.setMuted(!audio.muted);
    ui.setMuted(audio.muted);
    save.data.settings.muted = audio.muted;
    void save.save(save.data);
  });
  const vol = document.getElementById('vol');
  vol.addEventListener('input', () => {
    audio.ensure();
    audio.setVolume(Number(vol.value));
    save.data.settings.volume = audio.volume;
    void save.save(save.data);
  });

  // Settings from save
  audio.muted = !!save.data.settings.muted;
  audio.volume = save.data.settings.volume ?? 0.8;
  ui.setMuted(audio.muted);
  vol.value = String(audio.volume);

  // Wake lock while playing only.
  let wake = null;
  async function armWake() {
    wake = await requestWakeLock();
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      if (game.state === 'playing') game.pause();
      audio.suspend();
    } else {
      if (game.state === 'playing') armWake();
      if (wake) wake = null;
    }
  });

  ui.show('title');
  ui.setHud({ score: 0, best: save.data.bestScore, heightM: 0, combo: 1, lives: 0 });

  // Debug/test handle: lets e2e and console sessions inspect live state.
  globalThis.__tsumiki = { game, physics, renderer, save };

  let last = performance.now();
  const frame = (now) => {
    const dt = Math.min(0.1, (now - last) / 1000);
    last = now;
    game.update(dt);
    if (gpuSky) gpuSky.render(renderer.time, renderer.cam.y, renderer.cam.h);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
