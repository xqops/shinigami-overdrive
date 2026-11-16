// Weapon + power definitions (pure data). Timings in seconds, angles in degrees.
// `anim` names map to viewmodel keyframe clips in src/render/viewmodel.js.
// `roll` orients the world-space crescent slash (0 = horizontal right-to-left, 180 = left-to-right,
// 90 = top-down, 270 = bottom-up).
(function (SO) {
  'use strict';

  const WEAPONS = [
    {
      id: 'katana', name: 'ESPADA LONGA', jp: '長剣', color: 0x37fff2, color2: 0x2b6bff,
      comboWindow: 0.42,
      altName: 'IAIDŌ', altHint: 'Segure e solte: corte relâmpago',
      combo: [
        { anim: 'k_r2l', dur: 0.24, hit: [0.05, 0.13], range: 3.7, arc: 78, dmg: 21, push: 3, lunge: 4, stop: 0.035, roll: 0, stun: 0.3, cancel: 0.15 },
        { anim: 'k_l2r', dur: 0.24, hit: [0.05, 0.13], range: 3.7, arc: 78, dmg: 21, push: 3, lunge: 4, stop: 0.035, roll: 180, stun: 0.3, cancel: 0.15 },
        { anim: 'k_up', dur: 0.27, hit: [0.06, 0.15], range: 3.6, arc: 60, dmg: 24, push: 1, launch: 10, lunge: 2, stop: 0.05, roll: 270, stun: 0.5, cancel: 0.18 },
        { anim: 'k_thrust', dur: 0.36, hit: [0.07, 0.19], range: 4.8, arc: 24, dmg: 44, push: 15, lunge: 17, stop: 0.08, roll: 0, stun: 0.6, cancel: 0.26, thrust: true },
      ],
    },
    {
      id: 'scythe', name: 'FOICE', jp: '鎌', color: 0xff2bd6, color2: 0x8a2bff,
      comboWindow: 0.5,
      altName: 'FOICE BUMERANGUE', altHint: 'Arremessa a foice, ela volta cortando',
      combo: [
        { anim: 'sc_sweep', dur: 0.36, hit: [0.1, 0.22], range: 5.0, arc: 115, dmg: 27, push: 6, lunge: 4, stop: 0.05, roll: 0, stun: 0.35, cancel: 0.25 },
        { anim: 'sc_back', dur: 0.36, hit: [0.1, 0.22], range: 5.0, arc: 115, dmg: 27, push: 6, lunge: 4, stop: 0.05, roll: 180, stun: 0.35, cancel: 0.25 },
        { anim: 'sc_spin', dur: 0.56, hit: [0.08, 0.44], range: 5.2, arc: 180, dmg: 16, push: 3, lunge: 7, stop: 0.03, roll: 0, stun: 0.3, cancel: 0.46, rehit: 0.14, spin: true },
        { anim: 'sc_reap', dur: 0.5, hit: [0.2, 0.3], range: 5.6, arc: 70, dmg: 58, push: -11, lunge: 3, stop: 0.1, roll: 90, stun: 0.7, cancel: 0.38, reap: true },
      ],
    },
    {
      id: 'zanbato', name: 'ESPADA LARGA', jp: '大剣', color: 0xffb224, color2: 0xff3b1f,
      comboWindow: 0.55,
      altName: 'METEORO / LEVANTAR', altHint: 'No chão: uppercut. No ar: queda meteoro',
      combo: [
        { anim: 'g_overhead', dur: 0.6, hit: [0.25, 0.35], range: 5.4, arc: 50, dmg: 78, push: 9, lunge: 7, stop: 0.13, roll: 90, stun: 0.9, cancel: 0.45, heavy: true, crack: true },
        { anim: 'g_sweep', dur: 0.56, hit: [0.21, 0.33], range: 5.7, arc: 125, dmg: 60, push: 13, lunge: 5, stop: 0.1, roll: 0, stun: 0.8, cancel: 0.42, heavy: true },
        { anim: 'g_spin', dur: 0.72, hit: [0.18, 0.52], range: 5.8, arc: 180, dmg: 42, push: 10, lunge: 9, stop: 0.07, roll: 180, stun: 0.6, cancel: 0.6, rehit: 0.2, heavy: true, spin: true },
      ],
      upper: { anim: 'g_upper', dur: 0.48, hit: [0.08, 0.22], range: 4.8, arc: 80, dmg: 52, push: 2, launch: 18, lunge: 2, stop: 0.09, roll: 270, stun: 1.0, cancel: 0.4, playerLaunch: 14 },
    },
  ];

  const POWERS = {
    wave: { name: 'GETSUGA', jp: '月牙', cost: 25, cd: 0.35, speed: 52, dmg: 58, radius: 2.4, life: 1.1 },
    blink: { name: 'SHUNPO', jp: '瞬歩', cost: 15, cd: 0.45, range: 13, lockRange: 26, lockAngle: 14, crit: 1.4 },
    domain: { name: 'RYŌIKI TENKAI', jp: '領域展開', time: 8, enemyScale: 0.3, dmgMult: 1.75 },
  };

  SO.WEAPONS = WEAPONS;
  SO.POWERS = POWERS;
})(typeof window !== 'undefined' ? (window.SO = window.SO || {}) : (globalThis.SO = globalThis.SO || {}));
