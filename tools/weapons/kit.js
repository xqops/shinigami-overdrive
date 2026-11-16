// Painting helpers for the weapon sprites (see pixels.js): shapes with 3-tone shading, gold
// fittings, wrapped shafts, gems, chains and tags. Sprites are drawn head up, row 0 = top.
'use strict';
const path = require('path');
const { Pixels } = require('./pixels');

const OUT = path.join(__dirname, '..', '..', 'assets', 'sprites', 'weapons');
const INK = 0x0a0812;
const GOLD = { hi: 0xe8c070, mid: 0xb07a28, lo: 0x6a4010, deep: 0x3a2008 };
const IRON = { hi: 0x8a8aa0, mid: 0x4a4a5c, lo: 0x24242e, deep: 0x121218 };
const WOOD = { hi: 0x6a4030, mid: 0x3e2418, lo: 0x24140c, deep: 0x140a06 };

// fill rows y0..y1 between xl(y) and xr(y); color(x, y, u) with u = 0 (left) .. 1 (right)
function fillBetween(P, y0, y1, xl, xr, color) {
  for (let y = Math.round(y0); y <= Math.round(y1); y++) {
    const a = Math.round(xl(y)), b = Math.round(xr(y));
    for (let x = a; x <= b; x++) { const c = color(x, y, b > a ? (x - a) / (b - a) : 0.5); if (c) P.set(x, y, c[0], c[1]); }
  }
}
// polygon fill (even-odd), pts [[x,y],...]
function poly(P, pts, color) {
  let y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length];
      if ((a[1] <= y + 0.5 && b[1] > y + 0.5) || (b[1] <= y + 0.5 && a[1] > y + 0.5)) xs.push(a[0] + (y + 0.5 - a[1]) / (b[1] - a[1]) * (b[0] - a[0]));
    }
    xs.sort((m, n) => m - n);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const a = Math.round(xs[i]), b = Math.round(xs[i + 1]) - 1;
      for (let x = a; x <= b; x++) { const c = color(x, y, b > a ? (x - a) / (b - a) : 0.5); if (c) P.set(x, y, c[0], c[1]); }
    }
  }
}
// thick line
function line(P, x0, y0, x1, y1, color, glow, w) {
  const n = Math.ceil(Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0))) * 2 + 1;
  const r = (w || 1) / 2;
  for (let i = 0; i <= n; i++) {
    const t = i / n, x = x0 + (x1 - x0) * t, y = y0 + (y1 - y0) * t;
    if (r <= 0.5) P.set(x, y, typeof color === 'function' ? color(t) : color, glow);
    else for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (dx * dx + dy * dy <= r * r + 0.25) P.set(x + dx, y + dy, typeof color === 'function' ? color(t) : color, glow);
  }
}
function disc(P, cx, cy, r, color) {
  for (let y = Math.floor(cy - r); y <= Math.ceil(cy + r); y++) for (let x = Math.floor(cx - r); x <= Math.ceil(cx + r); x++) {
    const d = Math.hypot(x - cx, y - cy);
    if (d <= r) { const c = color(x, y, d / r); if (c) P.set(x, y, c[0], c[1]); }
  }
}
function ring(P, cx, cy, r0, r1, color) {
  disc(P, cx, cy, r1, (x, y, d) => (d * r1 >= r0 ? color(x, y, Math.atan2(y - cy, x - cx)) : null));
}
// 3-tone by horizontal position: light from the upper left
const tone = (pal, u) => (u < 0.28 ? pal.hi : u > 0.72 ? pal.lo : pal.mid);
// vertical shaft from y0 to y1 centered on cx, width w; wrap: 'plain' | 'bands' | 'diamond'
function shaft(P, cx, y0, y1, w, pal, wrap, alt) {
  const a = Math.round(cx - w / 2), b = a + w - 1;
  for (let y = y0; y <= y1; y++) for (let x = a; x <= b; x++) {
    const u = (x - a) / Math.max(1, b - a);
    let c = tone(pal, u);
    if (wrap === 'bands' && (y % 6) === 0) c = alt ? alt.lo : pal.deep || pal.lo;
    if (wrap === 'diamond') { const k = (x - a + y) % 5 === 0 || (y - (x - a) + 50) % 5 === 0; if (k) c = alt ? tone(alt, u) : pal.deep; }
    P.set(x, y, c);
  }
}
// gold collar band across a shaft
function band(P, cx, y, w, h, pal) {
  pal = pal || GOLD;
  const a = Math.round(cx - w / 2);
  for (let r = 0; r < h; r++) for (let x = a; x < a + w; x++) P.set(x, y + r, r === 0 ? pal.hi : r === h - 1 ? pal.lo : tone(pal, (x - a) / Math.max(1, w - 1)));
}
function gem(P, cx, cy, r, col, hi) {
  for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.abs(dx) + Math.abs(dy) <= r) P.set(cx + dx, cy + dy, dx === -1 && dy === -1 || (dx === 0 && dy === 0) ? hi : col, true);
}
function roundGem(P, cx, cy, r, col, mid, hi) {
  disc(P, cx, cy, r, (x, y, d) => [d < 0.35 ? hi : d < 0.7 ? mid : col, true]);
}
// a hanging paper charm with ink marks
function ofuda(P, x, y, w, h, ink) {
  for (let r = 0; r < h; r++) for (let c = 0; c < w; c++) P.set(x + c, y + r, c === w - 1 ? 0xc8ac80 : 0xe8d2a8);
  for (let r = 3; r < h - 3; r += 4) { P.set(x + 1 + (r % 3), y + r, ink || 0x5a0a10); P.set(x + 2, y + r + 1, ink || 0x5a0a10); P.set(x + w - 3, y + r + 1, ink || 0x5a0a10); }
  for (let c = 1; c < w - 1; c++) P.set(x + c, y, GOLD.mid);
}
function chain(P, x0, y0, x1, y1, pal) {
  pal = pal || GOLD;
  const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 3);
  for (let i = 0; i <= n; i++) { const t = i / n, x = Math.round(x0 + (x1 - x0) * t), y = Math.round(y0 + (y1 - y0) * t); P.set(x, y, i % 2 ? pal.lo : pal.hi); if (i % 2 === 0) P.set(x + 1, y, pal.mid); }
}
function make(w, h) { return new Pixels(w, h); }
function save(P, name, outline) { if (outline !== false) P.outline(INK); P.save(path.join(OUT, name + '.png')); }

module.exports = { OUT, INK, GOLD, IRON, WOOD, fillBetween, poly, line, disc, ring, tone, shaft, band, gem, roundGem, ofuda, chain, make, save };
