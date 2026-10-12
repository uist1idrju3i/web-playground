// Game orchestration: states, spawning, scoring, wind, milestones, save sync.
import { WORLD } from './physics.js';

const ESCAPE_LIMIT = 3;

export class Game {
  constructor({ physics, renderer, audio, ui, save, pieces, onPersist }) {
    this.physics = physics;
    this.renderer = renderer;
    this.audio = audio;
    this.ui = ui;
    this.save = save;
    this.pieces = pieces;
    this.onPersist = onPersist;

    this.state = 'title'; // title|oobe|playing|paused|over
    this.queue = [];
    this.current = null; // {piece, rec} falling body
    this.aimX = 0;
    this.score = 0;
    this.combo = 1;
    this.lives = 0; // escapes used
    this.drops = 0;
    this.heightM = 0;
    this.wind = { x: 0, t: 0, next: 0 };
    this.collected = new Set(save.data.collected);
    this.pending = false; // waiting for current piece to settle/escape
    this.acc = 0;
    this.reduceMotion =
      save.data.settings.reduceMotion ||
      globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      false;
  }

  // ------- flow -------
  startRun() {
    this.physics.clear();
    this.queue = this._shuffledDeck();
    this.state = 'playing';
    this.score = 0;
    this.combo = 1;
    this.lives = 0;
    this.drops = 0;
    this.heightM = 0;
    this.aimX = 0;
    this.wind = { x: 0, t: 0, next: 0 };
    this.pending = false;
    this.audio.setIntensity(0);
    this.audio.startBgm();
    this.audio.playCue('startup');
    this.ui.show(null);
    this._nextPiece();
    this._hud();
  }

  pause() {
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.audio.playCue('cancel');
    this.audio.suspend();
    this.ui.show('pause');
  }

  resume() {
    if (this.state !== 'paused') return;
    this.state = 'playing';
    this.audio.resume();
    this.audio.playCue('confirm');
    this.ui.show(null);
  }

  gameOver() {
    this.state = 'over';
    this.audio.playCue('shutdown');
    this.audio.setIntensity(0);
    const s = this.save.data;
    const isBest = this.score > s.bestScore;
    if (isBest) s.bestScore = this.score;
    if (this.heightM > s.bestHeight) s.bestHeight = this.heightM;
    s.collected = [...this.collected];
    s.totalDrops += this.drops;
    s.runs += 1;
    this.onPersist?.();
    this.ui.el.resultScore.textContent = String(this.score);
    this.ui.el.resultBest.textContent = String(s.bestScore);
    this.ui.el.resultNew.hidden = !isBest;
    this.ui.el.resultHeight.textContent = `${this.heightM.toFixed(1)} m`;
    this.ui.el.resultPieces.textContent = `${this.collected.size} / 47`;
    this.ui.el.resultCount.textContent = String(this.drops);
    this.ui.show('result');
    if (isBest) this.audio.playCue('completion');
    if (this.collected.size === 47) {
      this.ui.toast('ぜんぶ あつめた！', '47の けんを ぜんぶ あつめました');
      this.audio.playCue('completion');
    }
  }

  _shuffledDeck() {
    const deck = [...this.pieces];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  _nextPiece() {
    if (!this.queue.length) {
      this.gameOver();
      return;
    }
    const piece = this.queue.shift();
    this.current = { piece, rec: null };
    this.pending = false;
    this.ui.setNext(piece);
  }

  // Called by input when the player releases (or presses drop key).
  drop(deltaPx) {
    if (this.state !== 'playing' || !this.current || this.current.rec) return;
    // convert px delta to world units
    const worldPerPx = this.renderer.cam.h / this.renderer.canvas.clientHeight;
    const x = this._clampAim(this.aimX + deltaPx * worldPerPx);
    const spawnY = this._spawnY();
    const angle = (Math.random() - 0.5) * 0.4;
    const rec = this.physics.spawnPiece(this.current.piece, x, spawnY, angle);
    this.current.rec = rec;
    this.pending = true;
    this.drops += 1;
    this.audio.playCue('confirm', 0.6);
  }

  _clampAim(x) {
    const lim = WORLD.platformHalfW + 1.6;
    return Math.max(-lim, Math.min(lim, x));
  }

  // Pieces appear just under the top edge of the current view so the player
  // always sees the piece while aiming.
  _spawnY() {
    return this.renderer.cam.y + this.renderer.cam.h / 2 - 1.2;
  }

  setAimDelta(deltaPx, phase) {
    if (this.state !== 'playing' || !this.current || this.current.rec) return;
    const worldPerPx = this.renderer.cam.h / this.renderer.canvas.clientHeight;
    if (phase === 'nudge') {
      this.aimX = this._clampAim(this.aimX + deltaPx * worldPerPx);
    }
    this._lastDelta = deltaPx;
  }

  // ------- per-frame update -------
  update(dt) {
    if (this.state !== 'playing') {
      this._renderOnly(dt);
      return;
    }
    // wind gusts at altitude (settled tower only — the falling piece does
    // not count toward height)
    const topY = this.physics.topSettledY();
    const altitude = Math.max(0, topY - WORLD.platformY);
    this.heightM = altitude * 2.2;
    if (this.heightM > 9) {
      this.wind.t += dt;
      if (this.wind.t > this.wind.next) {
        this.wind.t = 0;
        this.wind.next = 2.5 + Math.random() * 4;
        const strength = Math.min(3.4, (this.heightM - 9) * 0.16);
        this.wind.x = (Math.random() - 0.5) * 2 * strength;
      }
      this.physics.setWind(this.wind.x, 0);
    } else {
      this.physics.setWind(0, 0);
      this.wind.x *= Math.pow(0.1, dt);
    }
    this.ui.setWind(this.wind.x);
    this.audio.setIntensity(Math.min(3, Math.floor(this.heightM / 12)));

    this.acc += dt;
    let events = [];
    while (this.acc >= WORLD.fixedDt) {
      events = this.physics.step();
      this.acc -= WORLD.fixedDt;
      for (const ev of events) this._onEvent(ev);
    }
    this._hud();
    this._renderOnly(dt);
  }

  _onEvent(ev) {
    if (ev.kind === 'settled' && ev.rec === this.current?.rec) {
      const p = ev.rec.piece;
      const firstTime = !this.collected.has(p.code);
      this.collected.add(p.code);
      const gain = Math.round(90 * this.combo + this.heightM * 6);
      this.score += gain;
      this.combo = Math.min(9, this.combo + 0.5);
      this.dropsCounted = this.drops;
      this.audio.landCue(0.5);
      this.audio.playCue(firstTime ? 'notification' : 'success', 0.9);
      this.renderer.emit(2, ev.rec.body.translation().x, ev.rec.body.translation().y, 14, {
        r: 1,
        g: 0.85,
        b: 0.5,
        speed: 2,
        scale: 0.1,
        ttl: 1.2,
      });
      this.renderer.emit(1, ev.rec.body.translation().x, WORLD.platformY + 0.2, 10, {
        r: 0.9,
        g: 0.85,
        b: 0.8,
        speed: 1,
        up: 0.8,
        ttl: 0.9,
      });
      this.renderer.shake(0.06);
      this.ui.toast(firstTime ? `${p.nameJa}を あつめた！` : `${p.nameJa}`, `+${gain} pt`);
      if (this.drops % 10 === 0) {
        this.audio.playCue('completion');
        this.ui.toast(`${this.drops}こ おとした！`, 'もっと たかく！');
        this.renderer.emit(0, ev.rec.body.translation().x, ev.rec.body.translation().y, 30, {
          r: 1,
          g: 0.7,
          b: 0.8,
          speed: 2.5,
          ttl: 3,
          scale: 0.12,
        });
      }
      this.current = null;
      this.pending = false;
      this._nextPiece();
    } else if (ev.kind === 'escaped' && ev.rec === this.current?.rec) {
      this.lives += 1;
      this.combo = 1;
      this.audio.playCue('error');
      this.renderer.shake(0.15);
      this.ui.toast('おちた！', `のこり ${Math.max(0, ESCAPE_LIMIT - this.lives)} かい`);
      this.current = null;
      this.pending = false;
      if (this.lives >= ESCAPE_LIMIT) {
        this.gameOver();
      } else {
        this._nextPiece();
      }
    }
  }

  _hud() {
    this.ui.setHud({
      score: this.score,
      best: Math.max(this.save.data.bestScore, this.score),
      heightM: this.heightM,
      combo: this.combo,
      lives: this.lives,
    });
  }

  _renderOnly(dt) {
    const bodies = this.physics.poses();
    const ghost =
      this.current && !this.current.rec
        ? {
            piece: this.current.piece,
            x: this.aimX,
            y: this._spawnY(),
            angle: Math.sin(this.renderer.time * 0.8) * 0.06,
          }
        : null;
    this.renderer.render({
      dt,
      bodies,
      ghost,
      camTarget: this.physics.topSettledY(),
      reduceMotion: this.reduceMotion,
    });
  }
}
