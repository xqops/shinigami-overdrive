// 02 Teleporte: "Lâmina do Vazio" — a long, slightly curved void blade glowing violet with a dark
// spine, a dark-gold guard whose quillons hook up and down, a portal ring with a black core at
// the guard, a dark handle with gold bands and a curled pommel. After the author's card 2.
'use strict';
const k = require('./kit');
const { GOLD } = k;
const DGOLD = { hi: 0xd8b070, mid: 0x9a6a28, lo: 0x5a3810, deep: 0x2a1806 };
const V = { edge: 0xffe0ff, glow: 0xd890ff, core: 0xb050ff, body: 0x8a3ad8, spine: 0x2a0e4a, dark: 0x16062a };

function blade() {
  const W = 32, H = 204, cx = 16;
  const P = k.make(W, H);
  const B = 122;
  for (let r = 0; r < B; r++) {
    const t = (B - 1 - r) / (B - 1);
    const shift = Math.floor(5 * t * t);
    const w = t < 0.4 ? 7 : t < 0.75 ? 6 : 5;
    const spine = cx + 3 - shift;
    let edge = spine - w + 1;
    if (t > 0.88) edge = Math.round(spine - (spine - edge) * Math.pow((1 - t) / 0.12, 0.7));
    for (let x = edge; x <= spine; x++) {
      const d = x - edge;
      if (x === spine && spine > edge) P.set(x, r, V.spine);
      else if (d === 0) P.set(x, r, V.edge, true);
      else if (d === 1) P.set(x, r, V.glow, true);
      else if (x === spine - 1) P.set(x, r, V.dark);
      // void cracks running through the steel
      else if ((r * 7 + x * 3) % 23 === 0 || (r % 17 === 5 && d === 3)) P.set(x, r, V.dark);
      else P.set(x, r, d === 2 ? V.core : V.body, d === 2);
    }
  }
  // guard: a wide dark-gold bar with a hook curling up on the left and down on the right
  const g = B + 2;
  k.poly(P, [[cx - 4, g], [cx + 4, g], [cx + 5, g + 6], [cx - 5, g + 6]], (x, y, u) => [k.tone(DGOLD, u)]);
  k.line(P, cx - 5, g + 2, cx - 12, g - 1, DGOLD.mid, false, 2);
  k.line(P, cx - 12, g - 1, cx - 13, g - 7, DGOLD.hi, false, 2);
  k.line(P, cx - 13, g - 7, cx - 10, g - 11, DGOLD.hi, false, 1);
  k.line(P, cx + 5, g + 3, cx + 12, g + 6, DGOLD.mid, false, 2);
  k.line(P, cx + 12, g + 6, cx + 13, g + 12, DGOLD.lo, false, 2);
  k.line(P, cx + 13, g + 12, cx + 10, g + 15, DGOLD.lo, false, 1);
  // the portal ring with its black core
  k.ring(P, cx, g + 3, 3.2, 5.2, (x, y, a) => [a < -1 ? DGOLD.hi : a > 1.4 ? DGOLD.lo : DGOLD.mid]);
  k.disc(P, cx, g + 3, 3.1, (x, y, d) => [d > 0.7 ? V.core : d > 0.4 ? 0x3a0a6a : 0x050208, d > 0.7]);
  // handle
  const h0 = g + 9, h1 = H - 22;
  k.shaft(P, cx, h0, h1, 6, { hi: 0x4a3060, mid: 0x2a1a3a, lo: 0x160c20, deep: 0x0a0610 }, 'diamond', DGOLD);
  for (const y of [h0, h1 - 1]) k.band(P, cx, y, 8, 2, DGOLD);
  // pommel: a gold curl
  const p0 = h1 + 1;
  k.band(P, cx, p0, 6, 3, DGOLD);
  k.line(P, cx, p0 + 3, cx + 3, p0 + 9, DGOLD.mid, false, 2);
  k.line(P, cx + 3, p0 + 9, cx, p0 + 14, DGOLD.hi, false, 2);
  k.line(P, cx, p0 + 14, cx - 3, p0 + 12, DGOLD.mid, false, 1);
  P.set(cx + 1, p0 + 11, V.core, true);
  k.save(P, 'vazio_lamina');
}

// a small dark-gold link and a void shard charm (hangs from the guard)
function charm() {
  const P = k.make(9, 14);
  k.poly(P, [[4, 0], [8, 6], [4, 13], [0, 6]], (x, y, u) => [y < 4 ? V.edge : u < 0.5 ? V.glow : V.body, true]);
  k.disc(P, 4, 6, 1.5, () => [0x050208]);
  k.save(P, 'vazio_cristal');
}

blade(); charm();
console.log('vazio ok');
