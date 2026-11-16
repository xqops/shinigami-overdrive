// 11 Gravidade, 12 Rajada de Balas, 13 Lança de Energia — sprites after the author's cards.
'use strict';
const k = require('./kit');
const { GOLD } = k;
const DARK = { hi: 0x4a3e5a, mid: 0x2a2236, lo: 0x16101e, deep: 0x0a060e };
const SHAFT = { hi: 0x3a2e40, mid: 0x221a28, lo: 0x120c16, deep: 0x08060a };

// 11 "Martelo do Vazio": a wedge-shaped dark hammer head wrapped in gold filigree, a black hole
// core ringed in violet on its face, spikes on top, a long shaft with gold bands.
function gravity() {
  const W = 64, H = 222, cx = 32;
  const P = k.make(W, H);
  const VI = { hot: 0xf0c0ff, hi: 0xc070ff, mid: 0x8a2ae0, deep: 0x3a0a6a };
  // head
  k.poly(P, [[cx - 28, 14], [cx + 28, 8], [cx + 30, 52], [cx - 26, 56]], (x, y, u) => [y < 18 ? DARK.hi : u < 0.15 ? DARK.hi : u > 0.85 ? DARK.lo : DARK.mid]);
  // filigree lines
  for (const [x0, y0, x1, y1] of [[cx - 26, 20, cx - 8, 30], [cx - 26, 48, cx - 8, 38], [cx + 26, 16, cx + 8, 28], [cx + 28, 46, cx + 8, 38], [cx - 26, 34, cx - 12, 34], [cx + 28, 30, cx + 12, 32]]) k.line(P, x0, y0, x1, y1, GOLD.mid, false, 1);
  k.line(P, cx - 28, 14, cx + 28, 8, GOLD.hi, false, 1); k.line(P, cx - 26, 56, cx + 30, 52, GOLD.lo, false, 1);
  // spikes on top and at the ends
  for (const x of [cx - 20, cx - 6, cx + 8, cx + 22]) k.poly(P, [[x - 3, 13], [x + 1, 1], [x + 4, 12]], (xx, y, u) => [u < 0.5 ? GOLD.hi : GOLD.lo]);
  k.poly(P, [[cx - 28, 26], [cx - 34, 32], [cx - 27, 40]], () => [GOLD.mid]); k.poly(P, [[cx + 29, 24], [cx + 34, 30], [cx + 30, 38]], () => [GOLD.lo]);
  // the black hole core
  k.ring(P, cx, 32, 8, 11, (x, y, a) => [a < 0 ? VI.hi : VI.mid, true]);
  k.disc(P, cx, 32, 8, (x, y, d) => [d > 0.8 ? VI.deep : 0x020004, d > 0.8]);
  k.ring(P, cx, 32, 11, 12.5, (x, y, a) => [GOLD.mid]);
  // shaft
  k.band(P, cx, 57, 11, 4); k.fillBetween(P, 61, 70, () => cx - 4, () => cx + 4, (x, y, u) => [k.tone(GOLD, u)]);
  k.shaft(P, cx, 71, H - 14, 6, SHAFT, 'diamond', GOLD);
  for (const y of [100, 140, 180]) k.band(P, cx, y, 8, 3);
  k.band(P, cx, H - 14, 9, 3);
  k.poly(P, [[cx - 4, H - 11], [cx, H - 1], [cx + 4, H - 11]], (x, y, u) => [k.tone(GOLD, u)]);
  k.save(P, 'gravidade_martelo');
}

// 12 "Metralhadora da Caveira": a cluster of six red-hot barrels in black iron collars, a gold
// skull on the receiver, a rear grip. Muzzles up.
function bullets() {
  const W = 52, H = 170, cx = 26;
  const P = k.make(W, H);
  const RED = { hot: 0xffd0a0, hi: 0xff6a3a, mid: 0xd8200a, lo: 0x7a0a04 };
  // barrels: 3 visible tubes side by side (the 3D model adds depth)
  for (const [x0, glow] of [[cx - 13, 0], [cx - 4, 1], [cx + 5, 0]]) {
    for (let y = 2; y < 96; y++) for (let x = x0; x < x0 + 8; x++) {
      const u = (x - x0) / 7;
      const hot = y < 12;
      P.set(x, y, hot ? (u > 0.3 && u < 0.7 ? 0x1a0402 : RED.hot) : u < 0.25 ? RED.hi : u > 0.75 ? RED.lo : RED.mid, hot || (u > 0.25 && u < 0.6));
    }
  }
  // iron collars
  for (const y of [0, 14, 44, 78]) k.fillBetween(P, y, y + 4, () => cx - 15, () => cx + 15, (x, yy, u) => [yy === y ? DARK.hi : k.tone(DARK, u)]);
  // receiver
  k.fillBetween(P, 96, 132, () => cx - 17, () => cx + 17, (x, y, u) => [y % 9 === 0 ? GOLD.lo : k.tone(DARK, u)]);
  // skull
  k.disc(P, cx, 112, 9, (x, y, d) => [d > 0.85 ? GOLD.lo : (y > 114 && Math.abs(x - cx) < 6 && x % 2 === 0) ? GOLD.lo : GOLD.mid]);
  k.disc(P, cx - 4, 110, 2.6, () => [0xff3a10, true]); k.disc(P, cx + 4, 110, 2.6, () => [0xff3a10, true]);
  k.poly(P, [[cx - 1, 113], [cx, 116], [cx + 1, 113]], () => [0x1a0402]);
  // grip
  k.fillBetween(P, 132, 140, () => cx - 8, () => cx + 8, (x, y, u) => [k.tone(DARK, u)]);
  k.shaft(P, cx, 140, H - 8, 8, { hi: 0x5a2a1a, mid: 0x3a1a10, lo: 0x200c08, deep: 0x100604 }, 'diamond', GOLD);
  k.band(P, cx, H - 8, 10, 4);
  k.save(P, 'balas_metralhadora');
}

// 13 "Lança Sagrada": a long golden spear blade with a white-hot core, a radiant gold sunburst
// ornament with a white gem at its base, an ornate gold-and-dark shaft.
function spear() {
  const W = 44, H = 236, cx = 22;
  const P = k.make(W, H);
  const L = { core: 0xffffff, hi: 0xfff4c0, mid: 0xffd060, lo: 0xd09020 };
  const B = 82;
  for (let r = 0; r < B; r++) {
    const t = r / B;
    const half = 0.5 + Math.sin(Math.min(1, t * 1.08) * Math.PI * 0.6) * 5;
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const u = Math.abs(x - cx) / Math.max(1, half);
      P.set(x, r, u < 0.2 ? L.core : u < 0.5 ? L.hi : u < 0.8 ? L.mid : L.lo, true);
    }
  }
  // sunburst ornament
  const cy = B + 12;
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2, len = i % 3 === 0 ? 20 : 13;
    k.line(P, cx + Math.cos(a) * 6, cy + Math.sin(a) * 6, cx + Math.cos(a) * len, cy + Math.sin(a) * len, i % 2 ? GOLD.mid : L.mid, i % 3 === 0, i % 3 === 0 ? 2 : 1);
  }
  k.ring(P, cx, cy, 5, 7.5, (x, y, a) => [a < 0 ? GOLD.hi : GOLD.mid]);
  k.disc(P, cx, cy, 4.8, (x, y, d) => [d < 0.5 ? L.core : L.hi, true]);
  k.band(P, cx, B, 7, 3);
  // shaft
  k.band(P, cx, cy + 8, 9, 3);
  k.shaft(P, cx, cy + 11, H - 14, 5, SHAFT, 'bands', GOLD);
  for (const y of [cy + 30, cy + 70, cy + 110]) { k.band(P, cx, y, 8, 3); k.band(P, cx, y + 4, 6, 1); }
  k.band(P, cx, H - 14, 8, 3);
  k.poly(P, [[cx - 3, H - 11], [cx, H - 1], [cx + 3, H - 11]], () => [L.mid, true]);
  k.save(P, 'lanca_sagrada');
}

gravity(); bullets(); spear();
console.log('11-13 ok');
