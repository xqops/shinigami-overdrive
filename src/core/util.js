// Shared math + helpers. NO DOM / NO THREE here: this file must also run in Node
// (future authoritative multiplayer server). See docs/MULTIPLAYER.md.
(function (SO) {
  'use strict';

  const V = {
    v(x = 0, y = 0, z = 0) { return { x, y, z }; },
    clone(a) { return { x: a.x, y: a.y, z: a.z }; },
    set(o, x, y, z) { o.x = x; o.y = y; o.z = z; return o; },
    copy(o, a) { o.x = a.x; o.y = a.y; o.z = a.z; return o; },
    add(o, a, b) { o.x = a.x + b.x; o.y = a.y + b.y; o.z = a.z + b.z; return o; },
    sub(o, a, b) { o.x = a.x - b.x; o.y = a.y - b.y; o.z = a.z - b.z; return o; },
    scale(o, a, s) { o.x = a.x * s; o.y = a.y * s; o.z = a.z * s; return o; },
    addScaled(o, a, b, s) { o.x = a.x + b.x * s; o.y = a.y + b.y * s; o.z = a.z + b.z * s; return o; },
    dot(a, b) { return a.x * b.x + a.y * b.y + a.z * b.z; },
    len(a) { return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z); },
    lenXZ(a) { return Math.sqrt(a.x * a.x + a.z * a.z); },
    dist(a, b) { const x = a.x - b.x, y = a.y - b.y, z = a.z - b.z; return Math.sqrt(x * x + y * y + z * z); },
    distXZ(a, b) { const x = a.x - b.x, z = a.z - b.z; return Math.sqrt(x * x + z * z); },
    norm(o, a) { const l = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z) || 1; o.x = a.x / l; o.y = a.y / l; o.z = a.z / l; return o; },
    lerp(o, a, b, t) { o.x = a.x + (b.x - a.x) * t; o.y = a.y + (b.y - a.y) * t; o.z = a.z + (b.z - a.z) * t; return o; },
  };

  // Camera convention shared with three.js: yaw 0 looks down -Z, positive yaw turns left.
  function forward(yaw, pitch, out) {
    const cp = Math.cos(pitch);
    out.x = -Math.sin(yaw) * cp; out.y = Math.sin(pitch); out.z = -Math.cos(yaw) * cp;
    return out;
  }
  function forwardFlat(yaw, out) { out.x = -Math.sin(yaw); out.y = 0; out.z = -Math.cos(yaw); return out; }
  function right(yaw, out) { out.x = Math.cos(yaw); out.y = 0; out.z = -Math.sin(yaw); return out; }

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const damp = (a, b, k, dt) => b + (a - b) * Math.exp(-k * dt);
  const approach = (v, target, step) => (v < target ? Math.min(v + step, target) : Math.max(v - step, target));
  function angleDiff(a, b) { let d = (b - a) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; }

  // Seeded RNG so a server and clients can share deterministic spawns.
  function rng(seed) {
    let s = seed >>> 0;
    const f = function () {
      s = (s + 0x6D2B79F5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    f.range = (a, b) => a + (b - a) * f();
    f.int = (a, b) => Math.floor(a + (b - a + 1) * f());
    f.pick = (arr) => arr[Math.floor(f() * arr.length)];
    return f;
  }

  // Tiny pub/sub used on the client side to fan out sim events to render/audio/hud.
  function Bus() {
    const map = {};
    return {
      on(name, fn) { (map[name] = map[name] || []).push(fn); },
      emit(name, data) { const l = map[name]; if (l) for (let i = 0; i < l.length; i++) l[i](data); const a = map['*']; if (a) for (let i = 0; i < a.length; i++) a[i](name, data); },
    };
  }

  // Input buttons bitmask. Commands are plain JSON so they can go over the network.
  // WAVE / P2 / P3 are the three power slots (keys Q, R, G); BLINK is the fixed teleport (E).
  const BTN = { JUMP: 1, DASH: 2, SLIDE: 4, ATTACK: 8, ALT: 16, WAVE: 32, BLINK: 64, DOMAIN: 128, P2: 256, P3: 512 };

  const CFG = {
    TICK: 1 / 60,
    GRAVITY: 34,
    MOVE_SPEED: 14,
    GROUND_ACCEL: 11,      // accel * wishSpeed per second (Quake-style)
    AIR_ACCEL: 2.5,
    FRICTION: 7,
    STOP_SPEED: 4,
    AIR_WISH_CAP: 2,     // small cap on the wish-direction projection: enables air strafing
    AIR_STRAFE_ACCEL: 14,
    MAX_SPEED: 55,
    JUMP_VEL: 12.5,
    AIR_JUMP_VEL: 11.5,
    DASH_SPEED: 34,
    DASH_TIME: 0.16,
    DASH_CHARGES: 3,
    DASH_REGEN: 1.0,
    SLIDE_SPEED: 21,
    SLAM_SPEED: 60,
    WALL_JUMPS: 3,
    PLAYER_RADIUS: 0.42,
    PLAYER_HEIGHT: 1.8,
    EYE: 1.62,
    EYE_SLIDE: 0.85,
    ARENA_RADIUS: 46,
    HEAL_RANGE: 9,
    MAX_ALIVE: 20,
  };

  SO.V = V;
  SO.forward = forward;
  SO.forwardFlat = forwardFlat;
  SO.right = right;
  SO.clamp = clamp;
  SO.lerp = lerp;
  SO.damp = damp;
  SO.approach = approach;
  SO.angleDiff = angleDiff;
  SO.rng = rng;
  SO.Bus = Bus;
  SO.BTN = BTN;
  SO.CFG = CFG;
})(typeof window !== 'undefined' ? (window.SO = window.SO || {}) : (globalThis.SO = globalThis.SO || {}));
