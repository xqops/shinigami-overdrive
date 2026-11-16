// 08 Corpo de Fogo: "Lança Ígnea" — a spear whose blade is a tongue of living flame (glowing,
// layered red / orange / gold, wavy edges), an ornate gold guard with curled horns around a red
// gem, a dark shaft wrapped in red and gold. Blade up. After the author's card 8.
'use strict';
const k = require('./kit');
const { GOLD } = k;
const F = { core: 0xfff4c0, gold: 0xffd040, orange: 0xff8a1a, red: 0xe8300a, deep: 0x9a1404 };
const SHAFT = { hi: 0x5a2a24, mid: 0x341614, lo: 0x1c0a08, deep: 0x0c0404 };

function spear() {
  const W = 36, H = 222, cx = 18;
  const P = k.make(W, H);
  const B = 96; // blade rows
  for (let r = 0; r < B; r++) {
    const t = r / B; // 0 tip .. 1 base
    const half = 1 + Math.pow(t, 0.75) * 7 + Math.sin(r * 0.55) * 1.3 * t;
    const off = Math.sin(r * 0.21) * 1.5 * (1 - t * 0.5);
    for (let x = Math.round(cx + off - half); x <= Math.round(cx + off + half); x++) {
      const u = Math.abs(x - (cx + off)) / half;
      const c = u < 0.25 ? F.core : u < 0.5 ? F.gold : u < 0.75 ? F.orange : u < 0.92 ? F.red : F.deep;
      P.set(x, r, c, true);
    }
    // licks of flame peeling off the sides
    if (r % 9 === 3 && t > 0.15) for (let i = 0; i < 4; i++) { P.set(cx + off + half + 1 + i * 0.6, r - i, i < 2 ? F.orange : F.red, true); P.set(cx + off - half - 1 - i * 0.6, r + 4 - i, i < 2 ? F.orange : F.red, true); }
  }
  // guard: a gold crown with two horns curling up and out, a red gem in the middle
  const g = B;
  k.fillBetween(P, g, g + 9, () => cx - 6, () => cx + 6, (x, y, u) => [k.tone(GOLD, u)]);
  for (const s of [-1, 1]) {
    k.line(P, cx + s * 6, g + 5, cx + s * 13, g + 2, GOLD.mid, false, 2);
    k.line(P, cx + s * 13, g + 2, cx + s * 16, g - 5, s < 0 ? GOLD.hi : GOLD.lo, false, 2);
    k.line(P, cx + s * 16, g - 5, cx + s * 13, g - 9, GOLD.hi, false, 1);
    k.line(P, cx + s * 6, g + 8, cx + s * 11, g + 13, GOLD.lo, false, 2);
    k.line(P, cx + s * 11, g + 13, cx + s * 9, g + 17, GOLD.mid, false, 1);
  }
  k.roundGem(P, cx, g + 5, 3.5, F.deep, F.red, 0xffb0a0);
  // shaft
  k.band(P, cx, g + 10, 9, 3); k.band(P, cx, g + 14, 7, 2);
  k.shaft(P, cx, g + 17, H - 12, 5, SHAFT, 'bands', { lo: 0x8a1408 });
  for (const y of [g + 30, g + 64, g + 100]) k.band(P, cx, y, 7, 3);
  k.band(P, cx, H - 12, 8, 3);
  k.poly(P, [[cx - 3, H - 9], [cx, H - 1], [cx + 3, H - 9]], (x, y, u) => [k.tone(GOLD, u)]);
  k.save(P, 'fogo_lanca');
}

spear();
console.log('fogo ok');
