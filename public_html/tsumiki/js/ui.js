// DOM HUD and overlay panels for the tsumiki game.
import { pieceColor } from './geometry.js';
import { achievementGroups, ACHIEVEMENT_SECTIONS } from './groups.js';

const $ = (id) => document.getElementById(id);

export class Ui {
  constructor() {
    this.el = {
      hud: $('hud'),
      score: $('hud-score'),
      best: $('hud-best'),
      heightFill: $('height-fill'),
      heightNum: $('height-num'),
      combo: $('hud-combo'),
      hearts: $('hud-hearts'),
      nextLabel: $('next-label'),
      nextCanvas: $('next-canvas'),
      toast: $('toast'),
      screens: {
        title: $('screen-title'),
        oobe: $('screen-oobe'),
        oobeClose: $('oobe-close'),
        pause: $('screen-pause'),
        result: $('screen-result'),
        collection: $('screen-collection'),
      },
      resultScore: $('result-score'),
      resultBest: $('result-best'),
      resultNew: $('result-new'),
      resultHeight: $('result-height'),
      resultPieces: $('result-pieces'),
      resultCount: $('result-count'),
      collectionGrid: $('collection-grid'),
      oobeDots: $('oobe-dots'),
      warnSave: $('save-warning'),
      muteBtn: $('mute-btn'),
      wind: $('wind-ind'),
    };
    this._toastTimer = null;
    this._oobeIndex = 0;
    this._buildOobe();
  }

  show(name) {
    for (const [key, el] of Object.entries(this.el.screens)) {
      el.classList.toggle('visible', key === name);
    }
    this.el.hud.classList.toggle('visible', name === null || name === 'pause');
  }

  setHud({ score, best, heightM, combo, lives }) {
    this.el.score.textContent = String(score);
    this.el.best.textContent = String(best);
    this.el.heightNum.textContent = Math.round(heightM).toLocaleString('en-US');
    this.el.heightFill.style.height = `${Math.min(100, (heightM / 4000) * 100)}%`;
    this.el.combo.textContent = combo > 1 ? `x${combo}` : '';
    const hearts = '♥'.repeat(Math.max(0, 3 - lives)) + '♡'.repeat(Math.min(3, lives));
    if (this.el.hearts.textContent !== hearts) this.el.hearts.textContent = hearts;
  }

  setWind(x) {
    this.el.wind.textContent = Math.abs(x) < 0.05 ? '' : x > 0 ? '→ かぜ' : '← かぜ';
    this.el.wind.style.opacity = Math.min(1, Math.abs(x) / 3);
  }

  toast(text, sub = '') {
    const t = this.el.toast;
    t.querySelector('.toast-main').textContent = text;
    t.querySelector('.toast-sub').textContent = sub;
    t.classList.add('show');
    clearTimeout(this._toastTimer);
    this._toastTimer = setTimeout(() => t.classList.remove('show'), 1700);
  }

  // Piece preview thumbnails are tiny canvas renders of the real polygon.
  drawPreview(piece, canvas, filled = true) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    if (!piece) return;
    const [x0, y0, x1, y1] = piece.bbox;
    const s = (Math.min(w, h) * 0.82) / Math.max(x1 - x0, y1 - y0);
    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(s, -s);
    ctx.beginPath();
    piece.poly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.closePath();
    const cols = pieceColor(piece);
    ctx.fillStyle = filled ? cols.main : 'rgba(255,255,255,0.06)';
    ctx.strokeStyle = filled ? cols.edge : 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 2.5 / s;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  setNext(piece) {
    this.el.nextLabel.textContent = piece ? `${piece.nameJa}` : '—';
    this.drawPreview(piece, this.el.nextCanvas);
  }

  buildCollection(pieces, collected, onPick, achievements) {
    const grid = this.el.collectionGrid;
    grid.textContent = '';
    // Japan mosaic canvas on top
    const map = document.createElement('canvas');
    map.width = 480;
    map.height = 460;
    map.className = 'collection-map';
    const ctx = map.getContext('2d');
    // Okinawa is drawn in a labelled inset box (bottom-left) instead of at
    // its raw geographic offset, which floats far below the main islands.
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.fillStyle = 'rgba(255,255,255,0.03)';
    ctx.beginPath();
    ctx.roundRect(8, 344, 116, 106, 10);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#b9c6ee';
    ctx.font = '600 13px system-ui, sans-serif';
    ctx.fillText('おきなわ', 20, 366);
    ctx.restore();
    // The main map fills the top ~330px; Okinawa stays inside its inset box.
    const mainPieces = pieces.filter((p) => p.code !== 'JP-47');
    const mxs = mainPieces.flatMap((p) => p.mapPoly.map((q) => q[0]));
    const mys = mainPieces.flatMap((p) => p.mapPoly.map((q) => q[1]));
    const mMinX = Math.min(...mxs);
    const mMinY = Math.min(...mys);
    const mw = Math.max(...mxs) - mMinX;
    const mh = Math.max(...mys) - mMinY;
    const s = Math.min(400 / mw, 330 / mh);
    const ox = (480 - mw * s) / 2 - mMinX * s;
    const oy = 10 - mMinY * s;
    for (const p of pieces) {
      const has = collected.has(p.code);
      const cols = pieceColor(p);
      ctx.save();
      let k;
      if (p.code === 'JP-47') {
        // Fit inside the labelled inset box (8,344,116,106).
        const bxs = p.mapPoly.map((q) => q[0]);
        const bys = p.mapPoly.map((q) => q[1]);
        const bMinX = Math.min(...bxs);
        const bMinY = Math.min(...bys);
        const bw = Math.max(...bxs) - bMinX;
        const bh = Math.max(...bys) - bMinY;
        k = Math.min(92 / bw, 72 / bh);
        ctx.translate(66 - (bMinX + bw / 2) * k, 397 - (bMinY + bh / 2) * k);
      } else {
        k = s;
        ctx.translate(ox, oy);
      }
      ctx.scale(k, k);
      ctx.beginPath();
      p.mapPoly.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
      ctx.closePath();
      ctx.fillStyle = has ? cols.main : 'rgba(255,255,255,0.05)';
      ctx.strokeStyle = has ? cols.edge : 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 1.4 / k;
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
    grid.appendChild(map);
    const list = document.createElement('div');
    list.className = 'collection-list';
    for (const p of pieces) {
      const has = collected.has(p.code);
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = `cell${has ? ' has' : ''}`;
      const cv = document.createElement('canvas');
      cv.width = 72;
      cv.height = 72;
      this.drawPreview(p, cv, has);
      const name = document.createElement('span');
      name.textContent = has ? p.nameJa : '？？';
      cell.append(cv, name);
      if (has && onPick) cell.addEventListener('click', () => onPick(p));
      list.appendChild(cell);
    }
    grid.appendChild(list);
    if (achievements) this._renderAchievements(grid, pieces, collected, achievements);
  }

  // Achievement rows: one chip per group showing progress or ★ complete.
  _renderAchievements(grid, pieces, collected, achievements) {
    const done = achievements instanceof Set ? achievements : new Set(achievements);
    const groupDefs = achievementGroups(pieces);
    const wrap = document.createElement('div');
    wrap.className = 'achievements';
    for (const sec of ACHIEVEMENT_SECTIONS) {
      const groups = sec.groups === 'modern' ? groupDefs.modern : sec.groups;
      const h = document.createElement('h3');
      h.className = 'ach-h';
      h.textContent = sec.title;
      wrap.appendChild(h);
      const row = document.createElement('div');
      row.className = 'ach-row';
      for (const g of groups) {
        // Height milestones carry no prefecture codes — unlocked by record.
        const have = g.codes ? g.codes.filter((c) => collected.has(c)).length : 0;
        const complete = done.has(g.id) || (g.codes && have === g.codes.length);
        const chip = document.createElement('div');
        chip.className = `ach-chip${complete ? ' done' : ''}`;
        chip.textContent = complete
          ? `★ ${g.name}`
          : g.codes
            ? `${g.name} ${have}/${g.codes.length}`
            : g.name;
        row.appendChild(chip);
      }
      wrap.appendChild(row);
    }
    grid.appendChild(wrap);
  }

  _buildOobe() {
    this.oobeCards = [
      {
        t: 'ゆびで ねらいを つけます',
        b: 'ゆびを ひっぱって、おとす ばしょを きめます。ゆびを はなすと けんが おちます。',
      },
      {
        t: 'つみあげて あつめよう',
        b: 'けんを つみあげると、あつめたけんが ふえます。3かい おとしたら おしまいです。',
      },
      {
        t: 'たかく つむほど すごくなる',
        b: 'たかく つむと かぜが ふきます。おんがくも ふえます。たかい てんすうを めざしましょう。',
      },
    ];
    this.el.oobeDots.textContent = '';
    this.oobeCards.forEach((_, i) => {
      const d = document.createElement('span');
      d.className = 'dot';
      d.dataset.i = String(i);
      this.el.oobeDots.appendChild(d);
    });
  }

  setOobeCard(i) {
    this._oobeIndex = i;
    $('oobe-title').textContent = this.oobeCards[i].t;
    $('oobe-body').textContent = this.oobeCards[i].b;
    [...this.el.oobeDots.children].forEach((d, j) => d.classList.toggle('on', j === i));
    $('oobe-next').textContent = i === this.oobeCards.length - 1 ? 'はじめる' : 'つぎへ';
  }

  setMuted(m) {
    this.el.muteBtn.textContent = m ? '🔇' : '🔊';
    this.el.muteBtn.setAttribute('aria-label', m ? 'Unmute' : 'Mute');
  }

  warnSave(show, text) {
    this.el.warnSave.hidden = !show;
    if (text) this.el.warnSave.textContent = text;
  }
}
