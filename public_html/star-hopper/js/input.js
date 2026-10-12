// Unified input: WASD/arrow keys + pointer lock or drag-look on desktop, and a
// virtual move stick (left half) + look drag (right half) + JUMP button on
// touch devices. iOS Safari has no Pointer Lock API, so touch look is always
// implemented in-page.

const STICK_RADIUS = 56; // px of thumb travel that maps to full deflection
const KEY_MAP = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
};
const JUMP_KEYS = new Set(['Space', 'KeyZ', 'KeyX', 'Enter']);

export function createInput({
  canvas,
  jumpButton = null,
  stickEl = null,
  onPause = () => {},
  onFirstGesture = () => {},
} = {}) {
  const keys = new Set();
  let stick = null; // { id, baseX, baseY, dx, dy }
  let lookTouch = null; // { id, x, y }
  let mouseDrag = null; // { x, y }
  let lookDX = 0;
  let lookDY = 0;
  // Camera look only runs while a run is live: menus must not rotate the
  // world and pointer lock must never engage over a screen.
  let lookEnabled = false;
  let jumpHeld = false;
  let usedTouch = false;
  let gestured = false;

  const coarse = globalThis.matchMedia?.('(pointer: coarse)').matches ?? false;
  const pointerLockOk = 'pointerLockElement' in document;

  function gesture() {
    if (gestured) return;
    gestured = true;
    onFirstGesture();
  }

  function onKeyDown(event) {
    if (event.repeat) {
      if (KEY_MAP[event.code] || JUMP_KEYS.has(event.code)) event.preventDefault();
      return;
    }
    gesture();
    if (KEY_MAP[event.code]) {
      keys.add(event.code);
      event.preventDefault();
    } else if (JUMP_KEYS.has(event.code)) {
      jumpHeld = true;
      event.preventDefault();
    } else if (event.code === 'KeyP' || event.code === 'Escape') {
      onPause();
    }
  }

  function onKeyUp(event) {
    if (KEY_MAP[event.code]) keys.delete(event.code);
    if (JUMP_KEYS.has(event.code)) jumpHeld = false;
  }

  function pointerKind(event) {
    return event.pointerType === 'touch' || event.pointerType === 'pen';
  }

  function onPointerDown(event) {
    gesture();
    if (!pointerKind(event)) {
      // Mouse: pointer lock on canvas click while a run is live.
      if (!lookEnabled) return;
      if (pointerLockOk && document.pointerLockElement !== canvas) {
        try {
          const lock = canvas.requestPointerLock();
          if (lock && typeof lock.catch === 'function') lock.catch(() => {});
        } catch {
          /* pointer lock unsupported or rejected */
        }
      }
      mouseDrag = { x: event.clientX, y: event.clientY };
      return;
    }
    usedTouch = true;
    const rect = canvas.getBoundingClientRect();
    const insideX = event.clientX - rect.left;
    if (insideX < rect.width * 0.5) {
      if (stick) return; // one stick at a time
      stick = { id: event.pointerId, baseX: event.clientX, baseY: event.clientY, dx: 0, dy: 0 };
    } else if (lookEnabled && !lookTouch) {
      lookTouch = { id: event.pointerId, x: event.clientX, y: event.clientY };
    }
    event.preventDefault();
  }

  function onPointerMove(event) {
    if (document.pointerLockElement === canvas) {
      if (lookEnabled) {
        lookDX += event.movementX;
        lookDY += event.movementY;
      }
      return;
    }
    if (stick && event.pointerId === stick.id) {
      const dx = event.clientX - stick.baseX;
      const dy = event.clientY - stick.baseY;
      const len = Math.hypot(dx, dy);
      const clamped = Math.min(len, STICK_RADIUS);
      const scale = len > 0 ? clamped / len : 0;
      stick.dx = dx * scale;
      stick.dy = dy * scale;
      event.preventDefault();
      return;
    }
    if (lookTouch && event.pointerId === lookTouch.id) {
      // Touch drags are short swipes, so they scale up against mouse deltas.
      lookDX += (event.clientX - lookTouch.x) * 1.4;
      lookDY += (event.clientY - lookTouch.y) * 1.4;
      lookTouch.x = event.clientX;
      lookTouch.y = event.clientY;
      event.preventDefault();
      return;
    }
    if (mouseDrag && lookEnabled && event.buttons & 1) {
      lookDX += event.clientX - mouseDrag.x;
      lookDY += event.clientY - mouseDrag.y;
      mouseDrag.x = event.clientX;
      mouseDrag.y = event.clientY;
    }
  }

  function onPointerEnd(event) {
    if (stick && event.pointerId === stick.id) {
      stick = null;
      updateStickEl(null);
    }
    if (lookTouch && event.pointerId === lookTouch.id) lookTouch = null;
    if (!pointerKind(event)) mouseDrag = null;
  }

  function updateStickEl(state) {
    if (!stickEl) return;
    if (!state) {
      stickEl.classList.remove('active');
      return;
    }
    stickEl.classList.add('active');
    const base = stickEl.querySelector('.stick-base');
    const knob = stickEl.querySelector('.stick-knob');
    if (base) {
      base.style.left = `${state.baseX}px`;
      base.style.top = `${state.baseY}px`;
    }
    if (knob) {
      knob.style.left = `${state.baseX + state.dx}px`;
      knob.style.top = `${state.baseY + state.dy}px`;
    }
  }

  function onBlur() {
    keys.clear();
    stick = null;
    lookTouch = null;
    mouseDrag = null;
    jumpHeld = false;
    updateStickEl(null);
  }

  function onJumpDown(event) {
    gesture();
    jumpHeld = true;
    event.preventDefault();
  }

  function onJumpUp(event) {
    jumpHeld = false;
    event.preventDefault();
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  canvas.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('pointermove', onPointerMove, { passive: false });
  window.addEventListener('pointerup', onPointerEnd);
  window.addEventListener('pointercancel', onPointerEnd);
  document.addEventListener('visibilitychange', onBlur);
  if (jumpButton) {
    jumpButton.addEventListener('pointerdown', onJumpDown, { passive: false });
    jumpButton.addEventListener('pointerup', onJumpUp);
    jumpButton.addEventListener('pointercancel', onJumpUp);
    jumpButton.addEventListener('pointerleave', onJumpUp);
  }
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  return {
    get coarse() {
      return coarse || usedTouch;
    },
    get jumpHeld() {
      return jumpHeld;
    },
    setJump(held) {
      jumpHeld = held;
    },
    // Analog move input in [-1, 1]: x is lateral (right positive), z forward.
    move() {
      let x = 0;
      let z = 0;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) z += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) z -= 1;
      if (stick) {
        updateStickEl(stick);
        x += stick.dx / STICK_RADIUS;
        z += -stick.dy / STICK_RADIUS;
      }
      const len = Math.hypot(x, z);
      if (len > 1) {
        x /= len;
        z /= len;
      }
      return { x, z };
    },
    // Accumulated look deltas (px-equivalent) since last call.
    consumeLook() {
      const out = { dx: lookDX, dy: lookDY };
      lookDX = 0;
      lookDY = 0;
      return out;
    },
    setLookEnabled(v) {
      lookEnabled = v;
      if (!v && document.pointerLockElement === canvas) document.exitPointerLock();
    },
    get locked() {
      return document.pointerLockElement === canvas;
    },
    unlock() {
      if (document.pointerLockElement === canvas) document.exitPointerLock();
    },
    clearAll: onBlur,
  };
}
