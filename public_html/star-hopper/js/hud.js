// DOM HUD + screens for Star Hopper. All HUD elements are plain DOM so they
// remain crisp at every DPR and localizable via the i18n table.

import { t } from './i18n.js';

const $ = (id) => document.getElementById(id);

export class Hud {
  constructor() {
    this.scoreEl = $('hud-score');
    this.bestEl = $('hud-best');
    this.comboEl = $('hud-combo');
    this.timeEl = $('hud-time');
    this.shardsEl = $('hud-shards');
    this.hudEl = $('hud');
    this.toastEl = $('toast');
    this.toastMain = this.toastEl?.querySelector('.toast-main');
    this.toastSub = this.toastEl?.querySelector('.toast-sub');
    this.centerEl = $('center-msg');
    this.popLayer = $('pop-layer');
    this.vignetteEl = $('speed-vignette');
    this.comboWrap = $('combo-wrap');
    this.comboBar = $('combo-fill');
    this.saveWarnEl = $('save-warning');
    this.toastTimer = null;
    this.centerTimer = null;
    this.lastTimeShown = -1;
  }

  show() {
    this.hudEl.classList.add('visible');
  }

  hide() {
    this.hudEl.classList.remove('visible');
  }

  setScore(score) {
    this.scoreEl.textContent = String(Math.round(score));
  }

  setBest(best) {
    this.bestEl.textContent = String(Math.round(best));
  }

  setCombo(combo, comboTimer, comboWindow = 4) {
    if (combo >= 2) {
      this.comboWrap.hidden = false;
      this.comboEl.textContent = `x${combo}`;
      this.comboBar.style.transform = `scaleX(${Math.min(1, comboTimer / comboWindow)})`;
      this.comboWrap.classList.toggle('hot', combo >= 4);
    } else {
      this.comboWrap.hidden = true;
    }
  }

  setTime(timeLeft) {
    const shown = Math.max(0, Math.ceil(timeLeft));
    if (shown === this.lastTimeShown) return;
    this.lastTimeShown = shown;
    this.timeEl.textContent = String(shown);
    this.timeEl.parentElement.classList.toggle('low', shown <= 30 && shown > 0);
  }

  setShards(taken, total) {
    this.shardsEl.textContent = `${taken} / ${total}`;
  }

  // Floating text near the crosshair, e.g. "+300".
  pop(text, kind = '') {
    const el = document.createElement('div');
    el.className = `pop ${kind}`;
    el.textContent = text;
    this.popLayer.appendChild(el);
    setTimeout(() => el.remove(), 1200);
  }

  centerMsg(text, ms = 1200, cls = '') {
    this.centerEl.className = cls;
    this.centerEl.textContent = text;
    this.centerEl.hidden = false;
    clearTimeout(this.centerTimer);
    if (ms > 0) {
      this.centerTimer = setTimeout(() => {
        this.centerEl.hidden = true;
      }, ms);
    }
  }

  hideCenter() {
    this.centerEl.hidden = true;
  }

  toast(main, sub = '', ms = 2600) {
    this.toastMain.textContent = main;
    this.toastSub.textContent = sub;
    this.toastEl.classList.add('visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => this.toastEl.classList.remove('visible'), ms);
  }

  vignette(strength) {
    this.vignetteEl.style.opacity = String(Math.min(0.7, Math.max(0, strength)));
  }

  saveWarning(text) {
    if (!text) {
      this.saveWarnEl.hidden = true;
      return;
    }
    this.saveWarnEl.hidden = false;
    this.saveWarnEl.textContent = text;
  }

  setScreen(name) {
    for (const el of document.querySelectorAll('.screen')) {
      el.classList.toggle('visible', el.id === name);
    }
  }

  applyI18n() {
    for (const el of document.querySelectorAll('[data-i18n]')) {
      el.textContent = t(el.dataset.i18n);
    }
    for (const el of document.querySelectorAll('[data-i18n-aria]')) {
      el.setAttribute('aria-label', t(el.dataset.i18nAria));
    }
  }
}
