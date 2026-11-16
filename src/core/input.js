// Browser input -> serializable InputCommand { seq, moveX, moveZ, yaw, pitch, buttons, weaponSel }.
// Taps shorter than one tick are latched so they are never lost between sim steps.
(function (SO) {
  'use strict';
  const BTN = SO.BTN;

  const KEYMAP = {
    Space: BTN.JUMP,
    ShiftLeft: BTN.DASH, ShiftRight: BTN.DASH,
    KeyC: BTN.SLIDE, KeyV: BTN.SLIDE,
    KeyQ: BTN.WAVE,
    KeyE: BTN.BLINK,
    KeyF: BTN.DOMAIN,
    KeyR: BTN.P2,
    KeyG: BTN.P3,
  };

  class Input {
    constructor(target) {
      this.target = target;
      this.keys = {};
      this.held = 0;
      this.latch = 0;
      this.yaw = 0;
      this.pitch = 0;
      this.sens = 1;
      this.invertY = false;
      this.seq = 0;
      this.weaponSel = -1;
      this.weaponCount = 3;
      this.currentWeapon = 0;
      this.locked = false;
      this.freeLook = false; // fallback only when the browser has no pointer lock at all
      this.lockFailed = false;
      this.lockedAt = 0;
      this.onLockFail = null;
      this.enabled = false;
      this.lookDX = 0;
      this.lookDY = 0;
      this.onUnlock = null;
      this.bind();
    }

    bind() {
      window.addEventListener('keydown', (e) => {
        if (!this.enabled) return;
        if (['Space', 'Tab', 'KeyQ', 'KeyE', 'KeyF', 'KeyR', 'KeyG'].includes(e.code)) e.preventDefault();
        if (e.repeat) return;
        this.keys[e.code] = true;
        const b = KEYMAP[e.code];
        if (b) { this.held |= b; this.latch |= b; }
        if (e.code.startsWith('Digit')) {
          const n = Number(e.code.slice(5)) - 1;
          if (n >= 0 && n < this.weaponCount) this.weaponSel = n;
        }
      });
      window.addEventListener('keyup', (e) => {
        this.keys[e.code] = false;
        const b = KEYMAP[e.code];
        if (b) this.held &= ~b;
      });
      window.addEventListener('mousedown', (e) => {
        if (!this.enabled) return;
        if (e.button === 0) { this.held |= BTN.ATTACK; this.latch |= BTN.ATTACK; }
        if (e.button === 2) { this.held |= BTN.ALT; this.latch |= BTN.ALT; }
        if (e.button === 1) { this.held |= BTN.WAVE; this.latch |= BTN.WAVE; e.preventDefault(); }
      });
      window.addEventListener('mouseup', (e) => {
        if (e.button === 0) this.held &= ~BTN.ATTACK;
        if (e.button === 2) this.held &= ~BTN.ALT;
        if (e.button === 1) this.held &= ~BTN.WAVE;
      });
      window.addEventListener('contextmenu', (e) => e.preventDefault());
      window.addEventListener('wheel', (e) => {
        if (!this.enabled) return;
        const dir = e.deltaY > 0 ? 1 : -1;
        const base = this.weaponSel >= 0 ? this.weaponSel : this.currentWeapon;
        this.weaponSel = (base + dir + this.weaponCount) % this.weaponCount;
      }, { passive: true });
      window.addEventListener('mousemove', (e) => {
        if (!this.enabled || (!this.locked && !this.freeLook)) return;
        const k = 0.0022 * this.sens;
        const mx = e.movementX || 0, my = e.movementY || 0;
        // Browsers can report one bogus jump right when the lock engages; ignore only that
        // instant. Fast flicks are legitimate and must never be dropped.
        if (performance.now() - this.lockedAt < 80) return;
        this.yaw -= mx * k;
        this.pitch -= my * k * (this.invertY ? -1 : 1);
        this.pitch = Math.max(-1.55, Math.min(1.55, this.pitch));
        this.lookDX += mx; this.lookDY += my;
      });
      document.addEventListener('pointerlockchange', () => {
        const was = this.locked;
        this.locked = document.pointerLockElement === this.target;
        if (this.locked) { this.lockedAt = performance.now(); this.lockFailed = false; }
        if (was && !this.locked && this.onUnlock) this.onUnlock();
      });
      document.addEventListener('pointerlockerror', () => { this.lockFailed = true; if (this.onLockFail) this.onLockFail(); });
      window.addEventListener('blur', () => { this.held = 0; this.keys = {}; });
    }

    // Captures the mouse. Asks for raw input first (no OS acceleration, like most shooters);
    // browsers without that option get a normal lock. Without any pointer lock support at all,
    // the cursor itself steers the camera (it stops at the window edge, so that is a last resort).
    lock() {
      const el = this.target;
      if (!el.requestPointerLock) { this.freeLook = true; return; }
      this.freeLook = false;
      const fail = () => { this.lockFailed = true; if (this.onLockFail) this.onLockFail(); };
      try {
        const r = el.requestPointerLock({ unadjustedMovement: true });
        if (r && r.catch) {
          r.catch((err) => {
            if (err && err.name === 'NotSupportedError') {
              const r2 = el.requestPointerLock();
              if (r2 && r2.catch) r2.catch(fail);
            } else fail();
          });
        }
      } catch (err) {
        try { el.requestPointerLock(); } catch (e2) { fail(); }
      }
    }

    unlock() { if (document.pointerLockElement) document.exitPointerLock(); }

    buildCommand() {
      const k = this.keys;
      const moveZ = (k.KeyW || k.ArrowUp ? 1 : 0) - (k.KeyS || k.ArrowDown ? 1 : 0);
      const moveX = (k.KeyD || k.ArrowRight ? 1 : 0) - (k.KeyA || k.ArrowLeft ? 1 : 0);
      const cmd = { seq: ++this.seq, moveX, moveZ, yaw: this.yaw, pitch: this.pitch, buttons: this.held | this.latch, weaponSel: this.weaponSel };
      this.latch = 0;
      this.weaponSel = -1;
      return cmd;
    }

    consumeLook() { const r = { dx: this.lookDX, dy: this.lookDY }; this.lookDX = 0; this.lookDY = 0; return r; }
    reset() { this.held = 0; this.latch = 0; this.keys = {}; this.weaponSel = -1; }
  }

  SO.Input = Input;
})(window.SO = window.SO || {});
