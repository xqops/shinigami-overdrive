// 18 Escuridão, 19 Lâminas do Caos, 20 Domínio Elemental — sprites after the author's cards.
'use strict';
const k = require('./kit');
const { GOLD } = k;
const DARK = { hi: 0x4a3e5a, mid: 0x2a2236, lo: 0x16101e, deep: 0x0a060e };

// 18 "Foice do Eclipse": a black shaft, a dark gothic head with spikes, a long violet-edged black
// crescent blade sweeping down on the right.
function eclipse() {
  const W = 72, H = 228, cx = 14;
  const P = k.make(W, H);
  const V = { edge: 0xf0c0ff, hi: 0xc070ff, mid: 0x5a1a9a, body: 0x1e0a30, deep: 0x0c0414 };
  const C1 = [4, 92], R1 = 84, C2 = [-8, 104], R2 = 86;
  for (let y = 6; y < 104; y++) for (let x = cx + 4; x < W; x++) {
    const d1 = Math.hypot(x - C1[0], y - C1[1]), d2 = Math.hypot(x - C2[0], y - C2[1]);
    if (d1 > R1 || d2 < R2) continue;
    const edge = d2 - R2, back = R1 - d1;
    P.set(x, y, edge < 1.3 ? V.edge : edge < 3 ? V.hi : edge < 5 ? V.mid : back < 1.5 ? V.mid : V.body, edge < 5);
  }
  // gothic head
  k.poly(P, [[cx - 6, 14], [cx + 2, 2], [cx + 10, 12], [cx + 6, 32], [cx - 6, 32]], (x, y, u) => [u < 0.3 ? DARK.hi : u > 0.7 ? DARK.deep : DARK.mid]);
  for (const [x0, y0, x1, y1] of [[cx - 6, 18, cx - 14, 8], [cx - 6, 26, cx - 13, 22], [cx + 2, 2, cx + 3, -6]]) k.poly(P, [[x0, y0], [x1, y1], [x0 + 2, y0 + 3]], () => [DARK.hi]);
  k.gem(P, cx + 1, 20, 2, V.mid, V.edge);
  k.shaft(P, cx, 33, H - 14, 5, DARK, 'plain');
  for (const y of [40, 90, 140, 190]) k.band(P, cx, y, 7, 2, { hi: 0x8a7aa0, mid: 0x5a4a70, lo: 0x2a2236 });
  k.poly(P, [[cx - 3, H - 14], [cx, H - 1], [cx + 3, H - 14]], () => [V.mid, true]);
  k.save(P, 'eclipse_foice');
}

// 19 "Foice do Caos": a short sickle — a hooked crimson blade with a white-hot edge, a thorny gold
// collar and a dark grip ending in a ring for the chain.
function chaos() {
  const W = 44, H = 112, cx = 10;
  const P = k.make(W, H);
  const RD = { edge: 0xffd0d0, hi: 0xff5a5a, mid: 0xd01020, lo: 0x6a0010 };
  const C1 = [6, 46], R1 = 40, C2 = [-2, 54], R2 = 40;
  for (let y = 4; y < 60; y++) for (let x = cx + 1; x < W; x++) {
    const d1 = Math.hypot(x - C1[0], y - C1[1]), d2 = Math.hypot(x - C2[0], y - C2[1]);
    if (d1 > R1 || d2 < R2) continue;
    const edge = d2 - R2;
    P.set(x, y, edge < 1.2 ? RD.edge : edge < 3 ? RD.hi : edge < 6 ? RD.mid : RD.lo, edge < 4);
  }
  k.poly(P, [[cx - 4, 8], [cx + 4, 2], [cx + 5, 16], [cx - 4, 16]], (x, y, u) => [k.tone(GOLD, u)]);
  k.poly(P, [[cx - 4, 10], [cx - 9, 4], [cx - 3, 6]], () => [GOLD.hi]);
  k.shaft(P, cx, 17, H - 12, 5, DARK, 'diamond', GOLD);
  for (const y of [17, 40, 70]) k.band(P, cx, y, 7, 2);
  k.ring(P, cx, H - 7, 2.5, 5, (x, y, a) => [a < 0 ? GOLD.hi : GOLD.lo]);
  k.save(P, 'caos_foice');
}

// 20 "Cetro Elemental": a gold scepter crowned with a star inside a halo, a red gem at its heart,
// arms that hold the orbs (the orbs themselves are 3D in the game), a long gold-and-dark shaft.
function elemental() {
  const W = 52, H = 232, cx = 26;
  const P = k.make(W, H);
  const STAR = { hot: 0xffffff, hi: 0xfff0b0, mid: 0xffc840 };
  // halo
  k.ring(P, cx, 18, 13, 15.5, (x, y, a) => [a < 0 ? GOLD.hi : GOLD.mid, true]);
  // star
  for (let i = -16; i <= 16; i++) { const w = Math.max(0, 1.8 - Math.abs(i) / 9); for (let j = -Math.ceil(w); j <= Math.ceil(w); j++) if (Math.abs(j) <= w) { P.set(cx + j, 18 + i, Math.abs(i) < 5 ? STAR.hot : STAR.hi, true); P.set(cx + i, 18 + j, Math.abs(i) < 5 ? STAR.hot : STAR.mid, true); } }
  // arms holding the orbs
  for (const s of [-1, 1]) { k.line(P, cx, 40, cx + s * 16, 34, GOLD.mid, false, 2); k.line(P, cx + s * 16, 34, cx + s * 20, 26, GOLD.hi, false, 2); k.line(P, cx, 46, cx + s * 14, 52, GOLD.lo, false, 2); k.line(P, cx + s * 14, 52, cx + s * 18, 60, GOLD.mid, false, 2); }
  // heart gem
  k.fillBetween(P, 34, 50, () => cx - 5, () => cx + 5, (x, y, u) => [k.tone(GOLD, u)]);
  k.gem(P, cx, 42, 4, 0xd01020, 0xffd0d0);
  // shaft with hanging ribbons drawn short (the long ones are 3D)
  k.band(P, cx, 51, 9, 3);
  k.shaft(P, cx, 54, H - 14, 5, { hi: 0x5a4030, mid: 0x3a2818, lo: 0x20140c, deep: 0x100a06 }, 'bands', GOLD);
  for (const y of [70, 110, 150, 190]) { k.band(P, cx, y, 8, 3); k.band(P, cx, y + 4, 6, 1); }
  k.band(P, cx, H - 14, 9, 3);
  k.poly(P, [[cx - 3, H - 11], [cx, H - 1], [cx + 3, H - 11]], () => [STAR.mid, true]);
  k.save(P, 'elemental_cetro');
}

eclipse(); chaos(); elemental();
console.log('18-20 ok');
