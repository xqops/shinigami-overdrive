// 09 Raio de Plasma: "Lança de Plasma" — a long blade of blue-white plasma with jagged barbs, an
// ornate gold collar holding a glowing plasma core in a spiked ring, a dark shaft with gold rings
// and gold barbs at the butt. Blade up. After the author's card 9.
'use strict';
const k = require('./kit');
const { GOLD } = k;
const PL = { core: 0xffffff, hi: 0xc8ecff, mid: 0x6ab8ff, lo: 0x2a6ae0, deep: 0x123a90 };
const SHAFT = { hi: 0x3a3450, mid: 0x221e34, lo: 0x12101e, deep: 0x08060e };

function lance() {
  const W = 40, H = 228, cx = 20;
  const P = k.make(W, H);
  // blade: a long leaf, center hot, with barbs
  const B = 74;
  for (let r = 0; r < B; r++) {
    const t = r / B;
    const half = 0.5 + Math.sin(Math.min(1, t * 1.15) * Math.PI * 0.62) * 5.5;
    for (let x = Math.round(cx - half); x <= Math.round(cx + half); x++) {
      const u = Math.abs(x - cx) / Math.max(1, half);
      P.set(x, r, u < 0.2 ? PL.core : u < 0.5 ? PL.hi : u < 0.8 ? PL.mid : PL.lo, true);
    }
  }
  for (const [y, s] of [[34, -1], [46, 1], [58, -1]]) k.poly(P, [[cx + s * 4, y], [cx + s * 12, y - 9], [cx + s * 6, y + 3]], (x, yy, u) => [s < 0 ? (u < 0.5 ? PL.hi : PL.mid) : (u > 0.5 ? PL.hi : PL.mid), true]);
  // collar and the core ring
  k.band(P, cx, B, 9, 3);
  const cy = B + 14;
  for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; k.poly(P, [[cx + Math.cos(a + 0.25) * 9, cy + Math.sin(a + 0.25) * 9], [cx + Math.cos(a) * 14, cy + Math.sin(a) * 14], [cx + Math.cos(a - 0.25) * 9, cy + Math.sin(a - 0.25) * 9]], (x, y, u) => [u < 0.5 ? GOLD.hi : GOLD.lo]); }
  k.ring(P, cx, cy, 7.5, 10.5, (x, y, a) => [a < -0.5 && a > -2.6 ? GOLD.hi : a > 0.6 && a < 2.5 ? GOLD.lo : GOLD.mid]);
  k.disc(P, cx, cy, 7.4, (x, y, d) => [d < 0.3 ? PL.core : d < 0.6 ? PL.hi : d < 0.85 ? PL.mid : PL.lo, true]);
  k.fillBetween(P, B + 3, cy - 10, () => cx - 3, () => cx + 3, (x, y, u) => [k.tone(GOLD, u)]);
  k.fillBetween(P, cy + 10, cy + 16, () => cx - 3, () => cx + 3, (x, y, u) => [k.tone(GOLD, u)]);
  // shaft
  k.shaft(P, cx, cy + 17, H - 16, 5, SHAFT, 'plain');
  for (const y of [cy + 17, cy + 30, cy + 70, cy + 100]) k.band(P, cx, y, 7, 3);
  // butt: gold barbs
  k.band(P, cx, H - 16, 8, 3);
  for (const s of [-1, 1]) k.poly(P, [[cx + s * 2, H - 13], [cx + s * 7, H - 3], [cx + s * 1, H - 8]], () => [s < 0 ? GOLD.hi : GOLD.lo]);
  k.poly(P, [[cx - 2, H - 13], [cx, H - 1], [cx + 2, H - 13]], () => [GOLD.mid]);
  k.save(P, 'plasma_lanca');
}

lance();
console.log('plasma ok');
