// 01 Espadas Almas: two soul katanas (blue and purple) joined by a chain with an ofuda charm.
// Painted pixel by pixel after the author's catalog (arma 1, card 1). Blade up, row 0 = tip.
// Usage: node tools/weapons/01-espadas-almas.js  -> assets/sprites/weapons/almas_*.png
'use strict';
const path = require('path');
const { Pixels } = require('./pixels');
const OUT = path.join(__dirname, '..', '..', 'assets', 'sprites', 'weapons');

const INK = 0x0a0812;
const GOLD = { hi: 0xffe39a, mid: 0xd9a03c, lo: 0x8a5418, deep: 0x4a2a0c };

const BLUE = {
  edge: 0xf2fbff, hamon: 0x7fd2ff, steel: 0xb8d8ff, steel2: 0x8fb4f0, spine: 0x3d5fa8, groove: 0x23397a,
  gem: 0x3fb0ff, gemHi: 0xe0f6ff, wrap: 0xdce8ff, wrapLo: 0x9ab4e6, ito: 0x1c2e6e, guard: 'horns',
};
const PURPLE = {
  edge: 0xffe8ff, hamon: 0xf07cff, steel: 0xd6a8ff, steel2: 0xb07ee6, spine: 0x5a2c96, groove: 0x34145e,
  gem: 0xff3fd8, gemHi: 0xffe0fa, wrap: 0x4a2470, wrapLo: 0x2c1248, ito: 0xd9a03c, guard: 'star',
};

function katana(pal) {
  const W = 30, H = 200, cx = 15;
  const P = new Pixels(W, H);
  const BLADE = 122; // rows 0..BLADE-1 are the blade
  // ---- blade: curved (sori), edge on the left, spine on the right, kissaki at the top ----
  for (let r = 0; r < BLADE; r++) {
    const t = (BLADE - 1 - r) / (BLADE - 1); // 0 at the collar, 1 at the tip
    // the blade bows back toward the edge side; edge and spine shift together so steps stay clean
    const shift = Math.floor(7 * t * t);
    const w = t < 0.35 ? 8 : t < 0.7 ? 7 : 6;
    const spine = cx + 4 - shift;
    let edge = spine - w + 1;
    const tipK = t > 0.9 ? (1 - t) / 0.1 : 1; // kissaki: the edge sweeps up to meet the spine
    edge = Math.round(spine - (spine - edge) * Math.pow(tipK, 0.6));
    const bump = (r % 11) < 4 ? 1 : 0; // the hamon wanders in soft waves
    for (let x = edge; x <= spine; x++) {
      const d = x - edge;
      if (x === spine && spine > edge) P.set(x, r, pal.spine);
      else if (d === 0) P.set(x, r, pal.edge, true);
      else if (d === 1 || (d === 2 && bump && w > 6)) P.set(x, r, pal.hamon, true);
      else if (x === spine - 2 && t > 0.06 && t < 0.8) P.set(x, r, pal.groove); // bo-hi groove
      else P.set(x, r, d <= 3 ? pal.steel : pal.steel2);
    }
  }
  // ---- habaki (gold collar) ----
  for (let r = BLADE; r < BLADE + 4; r++) for (let x = cx - 3; x <= cx + 3; x++) P.set(x, r, x === cx - 3 ? GOLD.hi : x >= cx + 2 ? GOLD.lo : GOLD.mid);
  // ---- tsuba ----
  const g0 = BLADE + 4;
  if (pal.guard === 'horns') {
    // a bar with ends curling up into horns, a diamond gem at the center
    for (let r = g0; r < g0 + 5; r++) for (let x = cx - 10; x <= cx + 10; x++) {
      const edgeRow = r === g0 || r === g0 + 4;
      if (edgeRow && Math.abs(x - cx) > 8) continue;
      P.set(x, r, r === g0 ? GOLD.hi : r === g0 + 4 ? GOLD.lo : GOLD.mid);
    }
    for (let k = 0; k < 7; k++) { // horns
      const y = g0 - 1 - k, dx = 10 + Math.round(k * 0.45);
      P.set(cx - dx, y, k > 4 ? GOLD.hi : GOLD.mid); P.set(cx - dx + 1, y, GOLD.lo);
      P.set(cx + dx, y, k > 4 ? GOLD.hi : GOLD.mid); P.set(cx + dx - 1, y, GOLD.lo);
    }
    for (const s of [-1, 1]) for (let k = 0; k < 3; k++) P.set(cx + s * (6 + k), g0 + 5 + (k === 1 ? 1 : 0), GOLD.lo); // hanging scroll
  } else {
    // four-pointed star
    for (let r = g0 - 7; r < g0 + 12; r++) for (let x = cx - 12; x <= cx + 12; x++) {
      const dx = Math.abs(x - cx), dy = Math.abs(r - (g0 + 2));
      const inside = dx / 12 + dy / 3.2 <= 1 || dx / 3.2 + dy / (r < g0 + 2 ? 9 : 9.5) <= 1;
      if (!inside) continue;
      P.set(x, r, dx + dy < 4 ? GOLD.hi : (x > cx || r > g0 + 2) ? GOLD.lo : GOLD.mid);
    }
  }
  // gem
  const gy = g0 + 2;
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (Math.abs(dx) + Math.abs(dy) <= 2) P.set(cx + dx, gy + dy, Math.abs(dx) + Math.abs(dy) === 0 ? pal.gemHi : pal.gem, true);
  // ---- tsuka (handle) with a diamond wrap ----
  const h0 = g0 + (pal.guard === 'star' ? 12 : 6), h1 = H - 16;
  for (let r = h0; r <= h1; r++) for (let x = cx - 3; x <= cx + 3; x++) {
    const u = x - (cx - 3), v = r - h0;
    const ito = (u + v) % 6 === 0 || (v - u + 60) % 6 === 0;
    P.set(x, r, ito ? pal.ito : x >= cx + 2 ? pal.wrapLo : pal.wrap);
  }
  for (const r of [h0 + 14, h0 + 28]) { P.set(cx, r, GOLD.hi); P.set(cx - 1, r, GOLD.mid); P.set(cx + 1, r, GOLD.lo); } // menuki
  // ---- kashira (pommel) with a ring for the chain and a spike ----
  const k0 = h1 + 1;
  for (let r = k0; r < k0 + 5; r++) { const hw = 4 - Math.floor((r - k0) / 2); for (let x = cx - hw; x <= cx + hw; x++) P.set(x, r, x < cx ? GOLD.hi : x > cx ? GOLD.lo : GOLD.mid); }
  P.set(cx, k0 + 1, pal.gem, true);
  for (let k = 0; k < 8; k++) P.set(cx, k0 + 5 + k, k > 5 ? GOLD.hi : GOLD.mid);
  P.set(cx + 2, k0 + 6, GOLD.mid); P.set(cx + 3, k0 + 7, GOLD.mid); P.set(cx + 2, k0 + 8, GOLD.mid); // ring
  P.outline(INK);
  return P;
}

// chain link (one link; the game strings many along a swinging rope)
function link() {
  const P = new Pixels(6, 9);
  for (let y = 0; y < 9; y++) for (let x = 0; x < 6; x++) {
    const ring = (x === 0 || x === 5) ? y > 0 && y < 8 : (y === 0 || y === 8);
    if (ring) P.set(x, y, x === 0 || y === 0 ? GOLD.hi : GOLD.lo);
  }
  return P;
}

// ofuda paper charm with ink kanji strokes and a gold cap
function ofuda() {
  const P = new Pixels(12, 30);
  P.rect(2, 0, 9, 2, GOLD.mid); P.rect(5, 0, 6, 0, GOLD.hi);
  P.rect(1, 3, 10, 28, 0xe8d2a8);
  P.rect(9, 3, 10, 28, 0xc8ac80);
  const ink = 0x5a0a10;
  P.rect(5, 6, 6, 9, ink); P.rect(3, 7, 8, 7, ink); P.rect(3, 12, 8, 12, ink); P.rect(5, 12, 5, 17, ink); P.rect(7, 14, 8, 16, ink);
  P.rect(3, 20, 8, 20, ink); P.rect(4, 21, 4, 25, ink); P.rect(7, 21, 7, 25, ink); P.rect(4, 25, 7, 25, ink);
  for (let x = 1; x <= 10; x += 2) P.set(x, 29, 0xe8d2a8);
  P.outline(INK);
  return P;
}

katana(BLUE).save(path.join(OUT, 'almas_azul.png'));
katana(PURPLE).save(path.join(OUT, 'almas_roxa.png'));
link().save(path.join(OUT, 'almas_elo.png'));
ofuda().save(path.join(OUT, 'almas_ofuda.png'));
console.log('almas_azul, almas_roxa, almas_elo, almas_ofuda ->', OUT);
