// Game orchestration: states, spawning, scoring, wind, milestones, save sync.
import { WORLD } from './physics.js';
import { achievementGroups } from './groups.js';

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
    this.achievements = new Set(save.data.achievements ?? []);
    this.groupDefs = achievementGroups(pieces);
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
    s.achievements = [...this.achievements];
    s.totalDrops += this.drops;
    s.runs += 1;
    this.onPersist?.();
    this.ui.el.resultScore.textContent = String(this.score);
    this.ui.el.resultBest.textContent = String(s.bestScore);
    this.ui.el.resultNew.hidden = !isBest;
    this.ui.el.resultHeight.textContent = `${Math.round(this.heightM)} km`;
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
    const lim = WORLD.platformHalfW + 60;
    return Math.max(-lim, Math.min(lim, x));
  }

  // Height milestones (km): unlocked against the taller of the current
  // stack and the saved best, so a previous run's record counts too.
  _checkHeight() {
    const h = Math.max(this.heightM, this.save.data.bestHeight);
    for (const t of this.groupDefs.height) {
      if (this.achievements.has(t.id) || h < t.km) continue;
      this.achievements.add(t.id);
      this.ui.toast(`${t.name}に とうたつ！`, 'じっせきを とった！');
      this.audio.playCue('completion');
    }
  }

  // Collection + achievement progress persists the moment it changes, not
  // only at game over — closing mid-run keeps every prefecture earned.
  _persistProgress() {
    const s = this.save.data;
    s.collected = [...this.collected];
    s.achievements = [...this.achievements];
    this.onPersist?.();
  }

  _checkAchievements() {
    for (const groups of Object.values(this.groupDefs)) {
      for (const g of groups) {
        if (this.achievements.has(g.id)) continue;
        if (!g.codes || !g.codes.every((c) => this.collected.has(c))) continue;
        this.achievements.add(g.id);
        this.ui.toast(`${g.name}を コンプリート！`, 'じっせきを とった！');
        this.audio.playCue('completion');
      }
    }
  }

  // Pieces appear just under the top edge of the current view so the player
  // always sees the piece while aiming.
  _spawnY() {
    return this.renderer.cam.y + this.renderer.cam.h * 0.55;
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
    this.heightM = altitude; // 1 world unit = 1 km
    this._checkHeight();
    if (this.heightM > 60) {
      this.wind.t += dt;
      if (this.wind.t > this.wind.next) {
        this.wind.t = 0;
        this.wind.next = 2.5 + Math.random() * 4;
        const strength = Math.min(34, (this.heightM - 60) * 0.08);
        this.wind.x = (Math.random() - 0.5) * 2 * strength;
      }
      this.physics.setWind(this.wind.x, 0);
    } else {
      this.physics.setWind(0, 0);
      this.wind.x *= Math.pow(0.1, dt);
    }
    this.ui.setWind(this.wind.x);
    this.audio.setIntensity(Math.min(3, Math.floor(this.heightM / 500)));

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
      this._checkAchievements();
      this._persistProgress();
      const gain = Math.round(90 * this.combo + this.heightM * 0.4);
      this.score += gain;
      this.combo = Math.min(9, this.combo + 0.5);
      this.dropsCounted = this.drops;
      this.audio.landCue(0.5);
      this.audio.playCue(firstTime ? 'notification' : 'success', 0.9);
      this.renderer.emit(2, ev.rec.body.translation().x, ev.rec.body.translation().y, 14, {
        r: 1,
        g: 0.85,
        b: 0.5,
        speed: 140,
        scale: 12,
        spread: 40,
        ttl: 1.2,
      });
      this.renderer.emit(1, ev.rec.body.translation().x, WORLD.platformY + 20, 10, {
        r: 0.9,
        g: 0.85,
        b: 0.8,
        speed: 70,
        scale: 10,
        spread: 30,
        up: 60,
        ttl: 0.9,
      });
      this.renderer.shake(7);
      this.ui.toast(firstTime ? `${p.nameJa}を あつめた！` : `${p.nameJa}`, `+${gain} pt`);
      if (this.drops % 10 === 0) {
        this.audio.playCue('completion');
        this.ui.toast(`${this.drops}こ おとした！`, 'もっと たかく！');
        this.renderer.emit(0, ev.rec.body.translation().x, ev.rec.body.translation().y, 30, {
          r: 1,
          g: 0.7,
          b: 0.8,
          speed: 170,
          ttl: 3,
          scale: 13,
          spread: 60,
        });
      }
      this.current = null;
      this.pending = false;
      this._nextPiece();
    } else if (ev.kind === 'escaped' && ev.rec === this.current?.rec) {
      this.lives += 1;
      this.combo = 1;
      this.audio.playCue('error');
      this.renderer.shake(14);
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

  // Camera view height: enough to see the current piece at spawn and a
  // slice of sky above the tower, growing as the stack climbs.
  _camH() {
    const piece = this.current?.piece;
    const diag = piece ? Math.hypot(...piece.kmSize) : 0;
    return Math.max(520, diag * 1.9, this.physics.topSettledY() + 320);
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
      camH: this._camH(),
      reduceMotion: this.reduceMotion,
    });
  }
}
