// 10 Congelamento: "Alabarda Glacial" — a spear point and a great crescent axe blade of blue ice
// (with a small back spike), a dark iron and gold collar holding a blue gem, a long dark shaft
// with gold rings. Blade up, axe on the right. After the author's card 10.
'use strict';
const k = require('./kit');
const { GOLD } = k;
const ICE = { white: 0xf4fcff, hi: 0xc8ecff, mid: 0x8ac8f0, lo: 0x4a8ad0, deep: 0x22509a };
const IRON = { hi: 0x5a5a70, mid: 0x30304a, lo: 0x18182a, deep: 0x0c0c16 };

function halberd() {
  const W = 66, H = 232, cx = 18;
  const P = k.make(W, H);
  const iceTone = (u) => (u < 0.2 ? ICE.white : u < 0.45 ? ICE.hi : u < 0.75 ? ICE.mid : ICE.lo);
  // spear point
  k.poly(P, [[cx - 5, 40], [cx, 0], [cx + 5, 40]], (x, y, u) => [iceTone(Math.abs(u - 0.5) * 2), true]);
  k.line(P, cx, 4, cx, 38, ICE.white, true, 1);
  // axe: crescent from the collar out to the right, sweeping down
  const C1 = [cx - 12, 64], R1 = 50, C2 = [cx - 26, 66], R2 = 50;
  for (let y = 22; y < 112; y++) for (let x = cx + 3; x < W; x++) {
    const d1 = Math.hypot(x - C1[0], y - C1[1]), d2 = Math.hypot(x - C2[0], y - C2[1]);
    if (d1 > R1 || d2 < R2) continue;
    const edge = R1 - d1;
    // frost cracks running across the blade
    const crack = (Math.floor(x * 0.7 + y * 0.45) % 9 === 0) && edge > 3;
    P.set(x, y, crack ? ICE.deep : edge < 1.5 ? ICE.white : edge < 4 ? ICE.hi : (x + y) % 11 === 0 ? ICE.hi : ICE.mid, edge < 4 || crack);
  }
  // back spike on the left
  k.poly(P, [[cx - 3, 50], [cx - 14, 40], [cx - 3, 58]], (x, y, u) => [iceTone(u), true]);
  // collar: iron with gold rims and a blue gem
  k.fillBetween(P, 40, 62, () => cx - 4, () => cx + 4, (x, y, u) => [y === 40 || y === 61 ? GOLD.mid : k.tone(IRON, u)]);
  k.gem(P, cx, 51, 3, ICE.lo, ICE.white);
  k.band(P, cx, 62, 9, 3); k.band(P, cx, 66, 7, 2);
  // shaft
  k.shaft(P, cx, 68, H - 14, 5, IRON, 'plain');
  for (const y of [80, 84, 130, 176, 200]) k.band(P, cx, y, 7, y === 84 ? 2 : 3);
  k.band(P, cx, H - 14, 8, 3);
  k.poly(P, [[cx - 3, H - 11], [cx, H - 1], [cx + 3, H - 11]], (x, y, u) => [u < 0.5 ? ICE.hi : ICE.lo, true]);
  k.save(P, 'gelo_alabarda');
}

function charm() {
  const P = k.make(9, 16);
  k.band(P, 4, 0, 7, 2);
  k.poly(P, [[4, 2], [8, 7], [4, 15], [0, 7]], (x, y, u) => [u < 0.4 ? ICE.white : u < 0.7 ? ICE.hi : ICE.mid, true]);
  k.save(P, 'gelo_cristal');
}

halberd(); charm();
console.log('gelo ok');
