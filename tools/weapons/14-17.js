// 14 Clones Sombrios, 15 Vento Cortante, 16 Regeneração, 17 Trovão — sprites after the author's
// cards.
'use strict';
const k = require('./kit');
const { GOLD } = k;
const DARK = { hi: 0x4a3e5a, mid: 0x2a2236, lo: 0x16101e, deep: 0x0a060e };

// 14 "Adaga das Sombras": a curved violet blade (glowing edge) with a thorny gold guard and a
// short dark grip; the twin uses the same sprite.
function dagger() {
  const W = 30, H = 120, cx = 13;
  const P = k.make(W, H);
  const V = { edge: 0xf4d0ff, hi: 0xd080ff, mid: 0x9a3ae8, lo: 0x4a128a, deep: 0x22063a };
  const B = 70;
  for (let r = 0; r < B; r++) {
    const t = r / B, curve = Math.round(6 * Math.pow(1 - t, 2));
    const half = 0.6 + Math.sin(Math.min(1, t * 1.1) * Math.PI * 0.55) * 4.5;
    const c = cx + curve;
    for (let x = Math.round(c - half); x <= Math.round(c + half); x++) {
      const u = (x - (c - half)) / (2 * half);
      P.set(x, r, u > 0.85 ? V.edge : u > 0.6 ? V.hi : u > 0.3 ? V.mid : V.lo, u > 0.55);
    }
  }
  // thorny guard
  k.fillBetween(P, B, B + 5, () => cx - 9, () => cx + 9, (x, y, u) => [k.tone(GOLD, u)]);
  for (const s of [-1, 1]) { k.line(P, cx + s * 9, B + 2, cx + s * 13, B - 5, s < 0 ? GOLD.hi : GOLD.lo, false, 2); k.line(P, cx + s * 6, B + 5, cx + s * 10, B + 10, GOLD.mid, false, 1); }
  k.gem(P, cx, B + 2, 2, V.mid, V.edge);
  k.shaft(P, cx, B + 6, H - 12, 5, DARK, 'diamond', GOLD);
  k.band(P, cx, H - 12, 7, 3);
  k.poly(P, [[cx - 3, H - 9], [cx, H - 1], [cx + 3, H - 9]], () => [GOLD.mid]);
  k.save(P, 'sombra_adaga');
}

// 15 "Foice do Vendaval": a dark ornate shaft, a curved blade of pale wind-steel sweeping out to
// the right with a cyan edge, gold fittings.
function windScythe() {
  const W = 70, H = 226, cx = 13;
  const P = k.make(W, H);
  const WI = { edge: 0xf0ffff, hi: 0xb8f0ff, mid: 0x6ad0f0, lo: 0x2a90c0, deep: 0x125a80 };
  const C1 = [6, 84], R1 = 78, C2 = [-6, 96], R2 = 80;
  for (let y = 4; y < 96; y++) for (let x = cx + 4; x < W; x++) {
    const d1 = Math.hypot(x - C1[0], y - C1[1]), d2 = Math.hypot(x - C2[0], y - C2[1]);
    if (d1 > R1 || d2 < R2) continue;
    const edge = d2 - R2;
    const streak = (Math.floor(x * 0.5 + y * 0.9) % 7 === 0);
    P.set(x, y, edge < 1.5 ? WI.edge : edge < 3.5 ? WI.hi : streak ? WI.hi : WI.mid, edge < 3.5 || streak);
  }
  k.poly(P, [[cx - 6, 10], [cx + 6, 2], [cx + 10, 16], [cx + 4, 28], [cx - 6, 28]], (x, y, u) => [k.tone(GOLD, u)]);
  k.poly(P, [[cx - 6, 14], [cx - 12, 4], [cx - 3, 10]], () => [GOLD.hi]);
  k.gem(P, cx + 1, 17, 2, WI.lo, WI.edge);
  k.shaft(P, cx, 29, H - 14, 5, DARK, 'bands', GOLD);
  for (const y of [32, 70, 110, 150, 190]) k.band(P, cx, y, 7, 3);
  k.band(P, cx, H - 14, 8, 3);
  k.poly(P, [[cx - 3, H - 11], [cx, H - 1], [cx + 3, H - 11]], () => [GOLD.mid]);
  k.save(P, 'vento_foice');
}

// 16 "Báculo da Natureza": a staff of twisted vines, white flowers along it, a green life orb in
// a cradle of branches at the top.
function natureStaff() {
  const W = 40, H = 226, cx = 20;
  const P = k.make(W, H);
  const WOOD = { hi: 0x8a6a40, mid: 0x5a4024, lo: 0x382614, deep: 0x1c1208 };
  const LEAF = { hi: 0x9aff7a, mid: 0x4ad04a, lo: 0x1e8a2a };
  // two vines braided down the staff
  for (let y = 30; y < H - 6; y++) {
    for (const ph of [0, Math.PI]) {
      const x = cx + Math.sin(y * 0.18 + ph) * 2.5;
      for (let d = -1.5; d <= 1.5; d++) P.set(x + d, y, d < -0.5 ? WOOD.hi : d > 0.5 ? WOOD.lo : WOOD.mid);
    }
  }
  // cradle of branches around the orb
  for (const s of [-1, 1]) { k.line(P, cx + s * 2, 32, cx + s * 10, 18, WOOD.mid, false, 2); k.line(P, cx + s * 10, 18, cx + s * 8, 6, WOOD.hi, false, 2); k.line(P, cx + s * 8, 6, cx + s * 3, 1, WOOD.mid, false, 1); }
  // the life orb
  k.disc(P, cx, 17, 8, (x, y, d) => [d < 0.3 ? 0xf0fff0 : d < 0.6 ? LEAF.hi : d < 0.85 ? LEAF.mid : LEAF.lo, true]);
  // leaves along the staff
  for (const [y, s] of [[44, 1], [62, -1], [86, 1], [110, -1], [140, 1], [170, -1]]) k.poly(P, [[cx + s * 2, y], [cx + s * 9, y - 4], [cx + s * 6, y + 2]], (x, yy, u) => [u < 0.5 ? LEAF.hi : LEAF.mid, true]);
  // white flowers (5 petals, gold heart)
  const flower = (x, y) => { for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; k.disc(P, x + Math.cos(a) * 2.2, y + Math.sin(a) * 2.2, 1.6, () => [0xfff8f4]); } P.set(x, y, 0xffd040, true); };
  flower(cx + 9, 30); flower(cx - 8, 52); flower(cx + 8, 76); flower(cx - 9, 98); flower(cx + 7, 128);
  k.save(P, 'natureza_baculo');
}

// 17 "Martelo da Tempestade": a great rectangular hammer head of dark iron with gold corners and
// blue rune channels that glow, a long shaft bound in gold.
function thunderHammer() {
  const W = 60, H = 224, cx = 30;
  const P = k.make(W, H);
  const BL = { hot: 0xe8f8ff, hi: 0x8ac8ff, mid: 0x3a8aff };
  k.fillBetween(P, 6, 52, () => cx - 26, () => cx + 26, (x, y, u) => [u < 0.12 ? DARK.hi : u > 0.88 ? DARK.lo : DARK.mid]);
  // gold corners and rims
  for (const [x0, y0] of [[cx - 26, 6], [cx + 18, 6], [cx - 26, 44], [cx + 18, 44]]) k.fillBetween(P, y0, y0 + 7, () => x0, () => x0 + 8, (x, y, u) => [k.tone(GOLD, u)]);
  k.fillBetween(P, 27, 31, () => cx - 26, () => cx + 26, (x, y, u) => [k.tone(GOLD, u)]);
  // rune channels
  const runes = [[cx - 18, 12, cx - 18, 24], [cx - 18, 18, cx - 10, 18], [cx - 6, 12, cx - 2, 24], [cx + 4, 12, cx + 12, 12], [cx + 8, 12, cx + 8, 24], [cx - 16, 36, cx - 8, 46], [cx - 8, 36, cx - 16, 46], [cx + 2, 36, cx + 14, 36], [cx + 8, 36, cx + 8, 46]];
  for (const [a, b, c, d] of runes) k.line(P, a, b, c, d, BL.hi, true, 1);
  k.line(P, cx - 26, 52, cx + 26, 52, DARK.deep, false, 1);
  // neck and shaft
  k.band(P, cx, 53, 13, 4); k.fillBetween(P, 57, 66, () => cx - 4, () => cx + 4, (x, y, u) => [k.tone(GOLD, u)]);
  k.shaft(P, cx, 67, H - 14, 6, { hi: 0x4a3a30, mid: 0x2a2018, lo: 0x16100c, deep: 0x0a0806 }, 'diamond', GOLD);
  for (const y of [90, 130, 170]) k.band(P, cx, y, 8, 3);
  k.band(P, cx, H - 14, 9, 3);
  k.poly(P, [[cx - 4, H - 11], [cx, H - 1], [cx + 4, H - 11]], (x, y, u) => [k.tone(GOLD, u)]);
  k.save(P, 'trovao_martelo');
}

dagger(); windScythe(); natureStaff(); thunderHammer();
console.log('14-17 ok');
