// 06 Escudo de Energia: "Égide Arcana" — a lozenge of bronze-gold filigree around dark glass,
// a four-pointed star burning at its heart, crystal blades fanning out behind it; and the loose
// crystals that orbit it. After the author's card 6.
'use strict';
const k = require('./kit');
const BRONZE = { hi: 0xf0c880, mid: 0xb07a38, lo: 0x6a4018, deep: 0x3a200a };
const ICE = { hi: 0xf4fbff, mid: 0xb8d4f0, lo: 0x7a98c8, deep: 0x4a5a8a };
const STAR = { hot: 0xffffff, mid: 0xfff0b0, glow: 0xffd070 };

function aegis() {
  const W = 64, H = 104, cx = 32, cy = 52;
  const P = k.make(W, H);
  // crystal blades behind (left/right fans and top/bottom points)
  const blade = (x0, y0, x1, y1, w) => {
    const dx = x1 - x0, dy = y1 - y0, l = Math.hypot(dx, dy), nx = -dy / l * w, ny = dx / l * w;
    k.poly(P, [[x0 + nx, y0 + ny], [x1, y1], [x0 - nx, y0 - ny], [x0 - dx * 0.15, y0 - dy * 0.15]], (x, y, u) => [u < 0.35 ? ICE.hi : u < 0.7 ? ICE.mid : ICE.lo, u < 0.2]);
  };
  blade(cx - 8, cy - 10, cx - 30, cy - 28, 5); blade(cx - 10, cy + 6, cx - 31, cy + 22, 5); blade(cx - 12, cy - 2, cx - 32, cy - 2, 4);
  blade(cx + 8, cy - 10, cx + 30, cy - 30, 5); blade(cx + 10, cy + 6, cx + 31, cy + 20, 5); blade(cx + 12, cy, cx + 32, cy + 2, 4);
  blade(cx, cy + 30, cx - 4, H - 2, 4); blade(cx, cy - 30, cx + 3, 2, 3);
  // the lozenge: outer bronze filigree, inner dark glass
  const diamond = (r, ry) => [[cx, cy - ry], [cx + r, cy], [cx, cy + ry], [cx - r, cy]];
  k.poly(P, diamond(21, 44), (x, y, u) => [u < 0.3 ? BRONZE.hi : u > 0.7 ? BRONZE.lo : BRONZE.mid]);
  k.poly(P, diamond(16, 36), (x, y, u) => {
    const d = Math.hypot((x - cx) / 16, (y - cy) / 36);
    return [d < 0.5 ? 0x2a3050 : 0x141a30];
  });
  // filigree: inner diamond line and curls
  k.poly(P, diamond(12, 29), (x, y, u) => (Math.abs(u - 0.5) > 0.44 ? [BRONZE.mid] : null));
  for (const s of [-1, 1]) {
    k.line(P, cx + s * 21, cy, cx + s * 26, cy - 6, BRONZE.hi, false, 2);
    k.line(P, cx + s * 26, cy - 6, cx + s * 24, cy - 11, BRONZE.mid, false, 1);
    k.line(P, cx + s * 21, cy, cx + s * 26, cy + 7, BRONZE.lo, false, 2);
  }
  // the star: long vertical rays, short horizontal, hot center
  for (let i = -26; i <= 26; i++) { const w = Math.max(0, 1.6 - Math.abs(i) / 16); for (let j = -Math.ceil(w); j <= Math.ceil(w); j++) if (Math.abs(j) <= w) P.set(cx + j, cy + i, Math.abs(i) < 8 ? STAR.hot : STAR.mid, true); }
  for (let i = -12; i <= 12; i++) { const w = Math.max(0, 1.2 - Math.abs(i) / 10); for (let j = -Math.ceil(w); j <= Math.ceil(w); j++) if (Math.abs(j) <= w) P.set(cx + i, cy + j, Math.abs(i) < 5 ? STAR.hot : STAR.mid, true); }
  k.disc(P, cx, cy, 3.5, (x, y, d) => [d < 0.5 ? STAR.hot : STAR.glow, true]);
  k.save(P, 'egide_escudo');
}

function crystal() {
  const P = k.make(9, 24);
  k.poly(P, [[4, 0], [8, 7], [6, 22], [4, 23], [2, 22], [0, 7]], (x, y, u) => [u < 0.3 ? ICE.hi : u < 0.65 ? ICE.mid : ICE.lo, u < 0.25]);
  k.line(P, 4, 2, 4, 20, ICE.hi, true, 1);
  k.save(P, 'egide_cristal');
}

aegis(); crystal();
console.log('egide ok');
