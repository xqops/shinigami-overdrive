// 03 Explosão Demoníaca: "Canhão Ritual" — a thick dark-iron barrel split by lava cracks, spikes
// along its back, iron rings, a gold seal glowing on its side and a muzzle full of magma; a short
// wrapped grip at the rear. Muzzle up, grip down. After the author's card 3.
'use strict';
const k = require('./kit');
const { GOLD } = k;
const IRON = { hi: 0x463e4c, mid: 0x221e28, lo: 0x121016, deep: 0x08060a };
const LAVA = { hot: 0xfff0a0, mid: 0xff8a1a, deep: 0xd8200a };

function cannon() {
  const W = 46, H = 176, cx = 23;
  const P = k.make(W, H);
  // crack field: a few jagged walks down the barrel
  const crack = new Set();
  const walk = (x, y, n, s) => { for (let i = 0; i < n; i++) { crack.add(x + ',' + y); y += 1; x += ((i * 7 + s) % 5 === 0) ? 1 : ((i * 3 + s) % 7 === 0 ? -1 : 0); if ((i + s) % 11 === 0) { crack.add((x + 1) + ',' + y); x += 1; } } };
  walk(cx - 6, 16, 40, 1); walk(cx + 4, 22, 30, 4); walk(cx - 2, 60, 48, 2); walk(cx + 6, 84, 34, 5); walk(cx - 8, 92, 24, 3); walk(cx + 1, 112, 14, 6);
  // barrel body
  const top = 12, bot = 128;
  k.fillBetween(P, top, bot, () => cx - 11, () => cx + 11, (x, y, u) => {
    if (crack.has(x + ',' + y)) return [((x + y) % 3 ? LAVA.mid : LAVA.hot), true];
    if (crack.has((x - 1) + ',' + y) || crack.has((x + 1) + ',' + y)) return [LAVA.deep, true];
    return [u < 0.2 ? IRON.hi : u > 0.78 ? IRON.lo : (y % 18 < 2 ? IRON.lo : IRON.mid)];
  });
  // iron rings
  for (const y of [14, 44, 100, 126]) k.fillBetween(P, y, y + 4, () => cx - 13, () => cx + 13, (x, yy, u) => [yy === y ? IRON.hi : k.tone(IRON, u)]);
  // spikes on both flanks
  for (const y of [24, 56, 80, 110]) {
    k.poly(P, [[cx - 11, y], [cx - 22, y - 3], [cx - 11, y + 8]], (x, yy, u) => [u < 0.35 ? GOLD.hi : u < 0.7 ? GOLD.mid : IRON.hi]);
    k.poly(P, [[cx + 12, y + 4], [cx + 23, y + 1], [cx + 12, y + 12]], (x, yy, u) => [u > 0.65 ? GOLD.hi : u > 0.3 ? GOLD.lo : IRON.mid]);
  }
  k.poly(P, [[cx - 3, 4], [cx, -6], [cx + 3, 4]], (x, y, u) => [u < 0.5 ? GOLD.hi : GOLD.mid]); // crown spike
  // the seal: a gold rune circle burning on the side
  const sy = 72;
  k.ring(P, cx, sy, 7, 9, (x, y, a) => [a < 0 ? GOLD.hi : GOLD.mid, true]);
  k.disc(P, cx, sy, 6.9, (x, y, d) => [d < 0.35 ? LAVA.hot : (Math.abs(x - cx) < 1 || Math.abs(y - sy) < 1) ? LAVA.mid : d > 0.8 ? LAVA.deep : 0x3a0806, d < 0.35 || Math.abs(x - cx) < 1 || Math.abs(y - sy) < 1]);
  // muzzle: a thick ring with a magma bore
  k.fillBetween(P, 4, 12, () => cx - 12, () => cx + 12, (x, y, u) => [y < 6 ? GOLD.hi : k.tone(GOLD, u)]);
  k.fillBetween(P, 6, 11, () => cx - 7, () => cx + 7, (x, y, u) => [Math.abs(u - 0.5) < 0.22 ? LAVA.hot : LAVA.mid, true]);
  // rear housing and grip
  k.fillBetween(P, 129, 138, () => cx - 9, () => cx + 9, (x, y, u) => [k.tone(IRON, u)]);
  k.shaft(P, cx, 139, H - 12, 7, { hi: 0x5a3a2a, mid: 0x3a2418, lo: 0x22140c, deep: 0x120a06 }, 'diamond', GOLD);
  k.band(P, cx, 139, 9, 2); k.band(P, cx, H - 13, 9, 3);
  k.poly(P, [[cx - 3, H - 10], [cx, H - 2], [cx + 3, H - 10]], (x, y, u) => [u < 0.5 ? GOLD.hi : GOLD.lo]);
  k.save(P, 'demonio_canhao');
}

function bell() {
  const P = k.make(9, 10);
  k.poly(P, [[3, 0], [6, 0], [8, 7], [1, 7]], (x, y, u) => [k.tone(GOLD, u)]);
  k.fillBetween(P, 7, 8, () => 0, () => 8, (x, y, u) => [k.tone(GOLD, u)]);
  P.set(4, 9, GOLD.lo);
  k.save(P, 'demonio_sino');
}

cannon(); bell();
console.log('demonio ok');
