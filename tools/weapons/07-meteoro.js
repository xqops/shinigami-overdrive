// 07 Meteoro: "Martelo Astral" — the haft only: an iron spike on top, a dark iron socket bound in
// gold where the head of star-rock sits (the rocks are separate 3D pieces in the game, so they can
// break loose in the inspect), a dark lacquered shaft with gold rings and a gold pommel.
'use strict';
const k = require('./kit');
const { GOLD } = k;
const IRON = { hi: 0x5a525e, mid: 0x302a34, lo: 0x18141c, deep: 0x0c0a0e };
const SHAFT = { hi: 0x4a2e26, mid: 0x2a1812, lo: 0x160c08, deep: 0x0a0604 };

function haft() {
  const W = 22, H = 206, cx = 11;
  const P = k.make(W, H);
  k.poly(P, [[cx - 3, 18], [cx, 0], [cx + 3, 18]], (x, y, u) => [u < 0.4 ? IRON.hi : u > 0.7 ? IRON.lo : IRON.mid]);
  k.band(P, cx, 18, 9, 3);
  k.fillBetween(P, 21, 50, () => cx - 5, () => cx + 5, (x, y, u) => [y % 7 === 0 ? GOLD.mid : k.tone(IRON, u)]);
  k.band(P, cx, 50, 11, 4);
  k.shaft(P, cx, 54, H - 14, 6, SHAFT, 'plain');
  for (const y of [62, 66, 120, 150, 176]) k.band(P, cx, y, 8, y === 66 ? 2 : 3);
  k.band(P, cx, H - 14, 9, 4);
  k.poly(P, [[cx - 4, H - 10], [cx, H - 1], [cx + 4, H - 10]], (x, y, u) => [k.tone(GOLD, u)]);
  k.save(P, 'meteoro_cabo');
}

haft();
console.log('meteoro ok');
