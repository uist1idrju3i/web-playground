// Star Hopper boot + game loop: capability gate, WASM sim stepping at display
// rate (fixed 240 Hz substeps inside), WebGL2 render, optional WebGPU sky,
// WebAudio score, signed saves, and screen state management.

import { checkRequirements } from '/library/js/requirements.js';
import { createSimulation, EVENT, REASON, KIND } from './js/sim.js';
import { createRenderer } from './js/render/renderer.js';
import { createWebgpuSky } from './js/render/sky-webgpu.js';
import { AudioEngine } from './js/audio/engine.js';
import { Music } from './js/audio/music.js';
import { createInput } from './js/input.js';
import { Hud } from './js/hud.js';
import { createSave } from './js/save.js';
import { language, setLanguage, t } from './js/i18n.js';

const $ = (id) => document.getElementById(id);
const WORLD_SEED = 20261012;
const COMBO_WINDOW = 4.0;

const gate = await checkRequirements({
  required: ['es-modules', 'webassembly', 'webgl', 'pointer-events', 'fetch'],
  optional: ['webgpu', 'web-audio', 'web-crypto', 'local-storage', 'indexeddb'],
  container: $('requirements'),
});

const appEl = $('app');

if (!gate.ok) {
  appEl.hidden = true;
} else {
  boot().catch((error) => {
    const el = $('boot-error');
    el.hidden = false;
    el.textContent = `App failed to start: ${error.message ?? error}`;
    console.error(error);
  });
}

async function boot() {
  const canvas = $('game-canvas');
  const gpuCanvas = $('gpu-canvas');
  const hud = new Hud();
  const audio = new AudioEngine();
  const save = await createSave();

  setLanguage(save.data.lang === 'en' ? 'en' : 'ja');
  hud.applyI18n();

  const sim = await createSimulation({ seed: WORLD_SEED });
  const renderer = createRenderer(canvas);

  // Optional WebGPU sky behind the transparent WebGL canvas.
  let sky = null;
  try {
    sky = await createWebgpuSky(gpuCanvas);
  } catch {
    sky = null;
  }
  if (sky) {
    gpuCanvas.hidden = false;
    gpuCanvas.classList.add('webgpu-on');
  }
  $('engine-note').textContent = t('engine', {
    gpu: sky ? 'WebGPU' : 'WebGL2',
    simd: sim.simd ? t('simd') : '',
  });

  const music = new Music(audio);
  audio.attachMusic(music);
  audio.setVolume(save.data.volume);
  audio.setMuted(save.data.muted);
  audio.setBgmEnabled(save.data.bgm);

  // Clouds drift under and between the islands (positions derived from the
  // generated world).
  const cloudData = buildClouds(sim);
  renderer.setClouds(cloudData);

  const input = createInput({
    canvas,
    jumpButton: $('jump-btn'),
    stickEl: $('stick'),
    onPause: () => togglePause(),
    onFirstGesture: () => {
      if (audio.ok) {
        void Promise.resolve()
          .then(() => audio.unlock())
          .catch((error) => console.info('Audio unavailable:', error.message));
      }
    },
  });

  if (input.coarse || 'ontouchstart' in globalThis) {
    $('touch-ui').classList.add('on');
    $('title-hint').textContent = t('touchHint');
  } else {
    $('title-hint').textContent = t('pointerHint');
  }

  const game = {
    phase: 'title', // title | oobe | countdown | playing | paused | result
    yaw: Math.PI, // face the first island
    pitch: -0.05,
    bobPhase: 0,
    landDip: 0,
    fovKick: 0,
    oobeIndex: 0,
    warningSecond: -1,
    lastTs: 0,
    paused: false,
  };

  hud.setBest(save.data.bestScore);
  hud.setShards(0, sim.shardCount);
  hud.setTime(sim.timeLimit);
  $('mute-btn').classList.toggle('off', save.data.muted);
  $('mute-btn').textContent = save.data.muted ? '🔇' : '🔊';
  $('bgm-btn').classList.toggle('off', !save.data.bgm);
  $('vol').value = String(save.data.volume);

  if (save.status === 'tampered' || save.status === 'rollback') {
    hud.saveWarning(t(`save.${save.status}`));
  }

  // ---- screens ----
  function showScreen(name) {
    hud.setScreen(name);
  }

  const OOBE = [
    { title: 'oobe.1.title', body: 'oobe.1.body' },
    { title: 'oobe.2.title', body: 'oobe.2.body' },
    { title: 'oobe.3.title', body: 'oobe.3.body' },
  ];

  function showOobe(index) {
    game.phase = 'oobe';
    game.oobeIndex = index;
    $('oobe-title').textContent = t(OOBE[index].title);
    $('oobe-body').textContent = t(OOBE[index].body);
    $('oobe-next').textContent = index === OOBE.length - 1 ? t('start') : t('next');
    const dots = $('oobe-dots');
    dots.innerHTML = '';
    for (let i = 0; i < OOBE.length; i += 1) {
      const d = document.createElement('span');
      if (i === index) d.className = 'on';
      dots.appendChild(d);
    }
    showScreen('screen-oobe');
  }

  function startRun() {
    sim.restart(WORLD_SEED);
    game.paused = false;
    // Face the first hop target so the route is readable from the spawn.
    const target = sim.island(1);
    game.yaw = Math.atan2(-target.x, -target.z);
    game.pitch = -0.03;
    game.bobPhase = 0;
    game.landDip = 0;
    game.fovKick = 0;
    game.warningSecond = -1;
    hud.setShards(0, sim.shardCount);
    hud.setTime(sim.timeLimit);
    hud.setScore(0);
    hud.hideCenter();
    showScreen(null);
    hud.show();
    beginCountdown();
  }

  function beginCountdown() {
    game.phase = 'countdown';
    let count = 3;
    hud.centerMsg(t('ready'), 800, 'small');
    const timer = setInterval(() => {
      if (game.phase !== 'countdown') {
        clearInterval(timer);
        return;
      }
      if (count > 0) {
        hud.centerMsg(t(`countdown${count}`), 0);
        audio.cue('tick');
        count -= 1;
      } else {
        clearInterval(timer);
        hud.centerMsg(t('go'), 700);
        audio.cue('ui');
        game.phase = 'playing';
        if (save.data.bgm) music.start();
      }
    }, 700);
  }

  function endRun(reason, score) {
    game.phase = 'result';
    music.stop();
    audio.cue(reason === REASON.WIN ? 'win' : 'timeout');
    const s = sim.stateInto();
    save.data.runs += 1;
    save.data.totalShards += s.taken;
    if (reason === REASON.WIN) save.data.wins += 1;
    const newBest = score > save.data.bestScore;
    if (newBest) {
      save.data.bestScore = Math.round(score);
      save.data.bestTimeLeft = Math.round(s.timeLeft);
    }
    if (s.bestCombo > save.data.bestCombo) save.data.bestCombo = s.bestCombo;
    void save.persist();
    hud.hide();
    $('result-title').textContent = t(reason === REASON.WIN ? 'win' : 'timeout');
    $('result-new').hidden = !newBest;
    $('result-score').textContent = String(Math.round(score));
    $('result-best').textContent = String(Math.round(save.data.bestScore));
    $('result-shards').textContent = `${s.taken} / ${sim.shardCount}`;
    $('result-combo').textContent = String(s.bestCombo);
    $('result-falls').textContent = String(s.falls);
    showScreen('screen-result');
    input.unlock();
  }

  function togglePause() {
    if (game.phase === 'playing') {
      game.phase = 'paused';
      showScreen('screen-pause');
      music.stop();
      input.unlock();
    } else if (game.phase === 'paused') {
      game.phase = 'playing';
      showScreen(null);
      if (save.data.bgm) music.start();
    }
  }

  function quitToTitle() {
    game.phase = 'title';
    music.stop();
    hud.hide();
    showScreen('screen-title');
    input.unlock();
  }

  // ---- event wiring ----
  $('btn-start').addEventListener('click', () => {
    audio.cue('ui');
    if (!save.data.oobeSeen) {
      showOobe(0);
    } else {
      startRun();
    }
  });
  $('oobe-next').addEventListener('click', () => {
    audio.cue('ui');
    if (game.oobeIndex + 1 < OOBE.length) {
      showOobe(game.oobeIndex + 1);
    } else {
      save.data.oobeSeen = true;
      void save.persist();
      startRun();
    }
  });
  $('oobe-close').addEventListener('click', () => {
    save.data.oobeSeen = true;
    void save.persist();
    startRun();
  });
  $('btn-how').addEventListener('click', () => {
    audio.cue('ui');
    showScreen('screen-how');
  });
  $('how-close').addEventListener('click', () => {
    audio.cue('ui');
    showScreen('screen-title');
  });
  $('btn-lang').addEventListener('click', () => {
    audio.cue('ui');
    setLanguage(language() === 'ja' ? 'en' : 'ja');
    save.data.lang = language();
    void save.persist();
    hud.applyI18n();
    $('engine-note').textContent = t('engine', {
      gpu: sky ? 'WebGPU' : 'WebGL2',
      simd: sim.simd ? t('simd') : '',
    });
    $('title-hint').textContent = input.coarse ? t('touchHint') : t('pointerHint');
  });
  $('btn-pause').addEventListener('click', () => togglePause());
  $('btn-resume').addEventListener('click', () => togglePause());
  $('btn-quit').addEventListener('click', () => quitToTitle());
  $('btn-retry').addEventListener('click', () => {
    audio.cue('ui');
    startRun();
  });
  $('btn-title').addEventListener('click', () => quitToTitle());
  $('mute-btn').addEventListener('click', () => {
    save.data.muted = !save.data.muted;
    audio.setMuted(save.data.muted);
    $('mute-btn').classList.toggle('off', save.data.muted);
    $('mute-btn').textContent = save.data.muted ? '🔇' : '🔊';
    void save.persist();
  });
  $('bgm-btn').addEventListener('click', () => {
    save.data.bgm = !save.data.bgm;
    audio.setBgmEnabled(save.data.bgm);
    $('bgm-btn').classList.toggle('off', !save.data.bgm);
    if (save.data.bgm && game.phase === 'playing') music.start();
    void save.persist();
  });
  $('vol').addEventListener('input', (event) => {
    save.data.volume = Number(event.target.value);
    audio.setVolume(save.data.volume);
    void save.persist();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && game.phase === 'playing') togglePause();
  });
  globalThis.addEventListener('resize', () => renderer.resize());

  showScreen('screen-title');

  // ---- per-frame loop ----
  const FALL_STREAK_VY = -12;
  const shadow = { x: 0, y: 0, z: 0, scale: 1, alpha: 0 };
  let wasLocked = false;

  function frame(ts) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.1, Math.max(0, (ts - game.lastTs) / 1000));
    game.lastTs = ts;
    const time = ts / 1000;

    // Look applies in every phase that shows the world.
    const look = input.consumeLook();
    game.yaw -= look.dx * 0.003;
    game.pitch = Math.max(-1.45, Math.min(1.45, game.pitch - look.dy * 0.003));

    const playing = game.phase === 'playing';
    if (playing) {
      const move = input.move();
      const fx = -Math.sin(game.yaw);
      const fz = -Math.cos(game.yaw);
      const rx = Math.cos(game.yaw);
      const rz = -Math.sin(game.yaw);
      sim.setMove(move.z * fx + move.x * rx, move.z * fz + move.x * rz);
      sim.setLook(game.yaw, game.pitch);
      sim.setJump(input.jumpHeld);
      sim.step(dt);

      sim.drainEvents((type, a, b) => {
        switch (type) {
          case EVENT.PICKUP: {
            const shard = sim.shard(a);
            audio.cue('pickup', b);
            const gain = 100 * b + (shard.kind === KIND.BONUS ? 50 : 0);
            hud.pop(`+${gain}`, shard.kind === KIND.BONUS ? 'bonus' : '');
            renderer.particles.burst(
              shard.x,
              shard.y,
              shard.z,
              shard.kind === KIND.BONUS ? [0.85, 0.5, 1.0] : [1.0, 0.85, 0.35],
              16,
            );
            if (navigator.vibrate) navigator.vibrate(12);
            if (sim.stateInto().taken >= sim.shardCount) {
              hud.toast(t('msg.allShards'), '', 2000);
            }
            break;
          }
          case EVENT.COMBO:
            audio.cue('combo');
            hud.pop(t('msg.combo', { combo: a }), 'bonus');
            break;
          case EVENT.JUMP:
            audio.cue('jump');
            renderer.particles.dust(sim.player[0], sim.player[1], sim.player[2], 6);
            break;
          case EVENT.DOUBLE_JUMP:
            audio.cue('doubleJump');
            game.fovKick = Math.min(0.14, game.fovKick + 0.08);
            renderer.particles.burst(
              sim.player[0],
              sim.player[1],
              sim.player[2],
              [0.9, 0.8, 1.0],
              10,
              3,
            );
            break;
          case EVENT.LAND:
            audio.cue('land');
            game.landDip = Math.min(0.4, a * 0.03);
            renderer.particles.dust(sim.player[0], sim.player[1], sim.player[2], 10);
            if (navigator.vibrate) navigator.vibrate(18);
            break;
          case EVENT.FALL:
            audio.cue('fall');
            hud.toast(t('msg.fall', { penalty: 4 }), '', 2200);
            if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
            break;
          case EVENT.FINISH:
            endRun(a, b);
            break;
          default:
            break;
        }
      });

      const s = sim.stateInto();
      hud.setScore(s.score);
      hud.setCombo(s.combo, s.comboTimer, COMBO_WINDOW);
      hud.setTime(s.timeLeft);
      hud.setShards(s.taken, sim.shardCount);
      hud.setBest(Math.max(save.data.bestScore, s.score));

      // Last-10-second warning ticks.
      if (s.timeLeft <= 10 && s.timeLeft > 0) {
        const sec = Math.ceil(s.timeLeft);
        if (sec !== game.warningSecond) {
          game.warningSecond = sec;
          audio.cue('warning');
          if (sec === 10) hud.toast(t('msg.timeLow'), '', 1500);
        }
      }

      const p = sim.playerInto();
      if (p.vy < FALL_STREAK_VY) {
        renderer.particles.streak(p.x, p.y + 1.4, p.z, 2);
      }
    } else {
      sim.setMove(0, 0);
      sim.setJump(false);
    }

    renderer.particles.update(dt);

    // Camera: eye height + head bob + landing dip.
    // Pause when pointer lock is released mid-run (Escape behaviour).
    const locked = input.locked;
    if (wasLocked && !locked && game.phase === 'playing') togglePause();
    wasLocked = locked;

    const p = sim.playerInto();
    const speed = Math.hypot(p.vx, p.vz);
    if (p.grounded > 0.5 && speed > 1.2) {
      game.bobPhase += dt * speed * 1.55;
    }
    game.landDip = Math.max(0, game.landDip - dt * 1.8);
    game.fovKick = Math.max(0, game.fovKick - dt * 0.35);
    const bob = Math.sin(game.bobPhase) * Math.min(0.055, speed * 0.008);
    const cam = {
      x: p.x,
      y: p.y + sim.eyeHeight + bob - game.landDip * Math.sin(game.landDip * 6),
      z: p.z,
      yaw: game.yaw,
      pitch: game.pitch,
      fov: 1.31 + game.fovKick + Math.min(0.12, Math.max(0, speed - 7) * 0.008),
    };

    // Vignette while falling fast.
    hud.vignette(p.vy < -8 ? Math.min(0.6, (-p.vy - 8) * 0.05) : 0);

    // Blob shadow on the highest island top under the player.
    shadow.alpha = 0;
    let bestTop = -Infinity;
    for (let i = 0; i < sim.islandCount; i += 1) {
      const base = i * 8;
      const ix = sim.islands[base];
      const iy = sim.islands[base + 1];
      const iz = sim.islands[base + 2];
      const ir = sim.islands[base + 3];
      const dx = p.x - ix;
      const dz = p.z - iz;
      const drop = p.y - iy;
      if (dx * dx + dz * dz < ir * ir && drop > -0.5 && iy > bestTop) {
        bestTop = iy;
        shadow.x = p.x;
        shadow.y = iy + 0.03;
        shadow.z = p.z;
        shadow.scale = Math.max(0.4, 1.3 - drop * 0.06);
        shadow.alpha = Math.max(0, 0.42 - drop * 0.045);
      }
    }

    if (sky) sky.draw({ time, camera: cam });
    renderer.draw({
      time,
      camera: cam,
      islands: sim.islands,
      shards: sim.shards,
      shadow,
      drawSky: !sky,
    });
  }

  requestAnimationFrame(frame);
}

// Cloud layer: quads floating under and between the islands, derived from the
// world layout so every seed gets a matching sky.
function buildClouds(sim) {
  const data = [];
  let rand = 1234567;
  const next = () => {
    rand = (rand * 1103515245 + 12345) % 2147483648;
    return rand / 2147483648;
  };
  for (let i = 0; i < sim.islandCount; i += 1) {
    const island = sim.island(i);
    const per = i === 0 ? 3 : 5;
    for (let c = 0; c < per; c += 1) {
      const angle = next() * Math.PI * 2;
      const dist = island.radius * (1.2 + next() * 2.2);
      const below = 3 + next() * 10;
      data.push(
        island.x + Math.cos(angle) * dist,
        island.topY - below,
        island.z + Math.sin(angle) * dist,
        0, // reserved pad (keeps 8-float stride)
        6 + next() * 9, // width
        2.2 + next() * 3.5, // height
        next(), // phase
        0.5 + next() * 0.4, // alpha
      );
    }
  }
  // A few clouds far below for depth.
  for (let c = 0; c < 6; c += 1) {
    const angle = next() * Math.PI * 2;
    const dist = 20 + next() * 55;
    data.push(
      Math.cos(angle) * dist,
      -14 - next() * 10,
      Math.sin(angle) * dist,
      0,
      14 + next() * 16,
      4 + next() * 5,
      next(),
      0.6 + next() * 0.35,
    );
  }
  return new Float32Array(data);
}
