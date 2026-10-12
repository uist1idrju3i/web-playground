// Pointer aiming + release-to-drop input. Pointer Events only; the canvas
// uses touch-action:none so drags are not interpreted as scrolling.
export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.aiming = false;
    this.aimClientX = 0;
    this.aimDelta = 0; // px delta vs grab point
    this.onDrop = null;
    this.onAim = null;
    this.onFirstGesture = null;
    this.onPauseKey = null;
    this._gestureSeen = false;
    this._bind();
  }

  _gesture() {
    if (!this._gestureSeen) {
      this._gestureSeen = true;
      this.onFirstGesture?.();
    }
  }

  _bind() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      this._gesture();
      if (e.button !== undefined && e.button !== 0) return;
      this.aiming = true;
      this.aimClientX = e.clientX;
      this.aimDelta = 0;
      c.setPointerCapture?.(e.pointerId);
      this.onAim?.(0, 'start');
    });
    c.addEventListener('pointermove', (e) => {
      if (!this.aiming) return;
      this.aimDelta = e.clientX - this.aimClientX;
      this.onAim?.(this.aimDelta, 'move');
    });
    const release = (e) => {
      if (!this.aiming) return;
      this.aiming = false;
      this.aimDelta = e.clientX - this.aimClientX;
      this.onAim?.(this.aimDelta, 'end');
      this.onDrop?.(this.aimDelta);
    };
    c.addEventListener('pointerup', release);
    c.addEventListener('pointercancel', (e) => {
      if (!this.aiming) return;
      this.aiming = false;
      this.onAim?.(0, 'cancel');
      void e;
    });
    globalThis.addEventListener('keydown', (e) => {
      this._gesture();
      if (e.key === ' ' || e.key === 'ArrowDown' || e.key === 'Enter') {
        this.onDrop?.(this.aimDelta, true);
        e.preventDefault();
      } else if (e.key === 'ArrowLeft') {
        this.onAim?.(-24, 'nudge');
      } else if (e.key === 'ArrowRight') {
        this.onAim?.(24, 'nudge');
      } else if (e.key === 'Escape' || e.key.toLowerCase() === 'p') {
        this.onPauseKey?.();
      }
    });
  }
}

// Wake Lock helper — only held while playing.
export async function requestWakeLock() {
  try {
    if (!('wakeLock' in navigator)) return null;
    return await navigator.wakeLock.request('screen');
  } catch {
    return null;
  }
}
