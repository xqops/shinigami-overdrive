// 04 Invocação de Demônios: "Cetro Abissal" — a spiked gold ring laced with thorny wire around a
// great red eye, on a long black shaft with gold rings; the bells, ofudas, ribbons and blood
// beads hang from it in the game (separate pieces). After the author's card 4.
'use strict';
const k = require('./kit');
const { GOLD } = k;
const SHAFT = { hi: 0x4a3044, mid: 0x2a1828, lo: 0x160a14, deep: 0x0a040a };
const EYE = { white: 0xffd0c8, iris: 0xff2a3a, deep: 0xa00010, pupil: 0x140004, hot: 0xffffff };

function scepter() {
  const W = 58, H = 222, cx = 29, hy = 29;
  const P = k.make(W, H);
  // spikes around the ring
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2 - Math.PI / 2, a2 = a + 0.17, a3 = a - 0.17;
    const L = i % 3 === 0 ? 28 : 22;
    k.poly(P, [[cx + Math.cos(a2) * 13, hy + Math.sin(a2) * 13], [cx + Math.cos(a) * L, hy + Math.sin(a) * L], [cx + Math.cos(a3) * 13, hy + Math.sin(a3) * 13]], (x, y, u) => [u < 0.5 ? GOLD.hi : GOLD.lo]);
  }
  k.ring(P, cx, hy, 11, 14.5, (x, y, a) => [a < -0.8 && a > -2.6 ? GOLD.hi : a > 0.8 && a < 2.4 ? GOLD.lo : GOLD.mid]);
  // thorny wire inside
  for (let i = 0; i < 6; i++) {
    const a = i * 1.05;
    k.line(P, cx + Math.cos(a) * 11, hy + Math.sin(a) * 11, cx + Math.cos(a + 2.3) * 11, hy + Math.sin(a + 2.3) * 11, GOLD.lo, false, 1);
  }
  // the eye: almond, red iris, slit pupil, a hot glint (all glowing)
  k.disc(P, cx, hy, 9, (x, y) => {
    const ex = (x - cx) / 9, ey = (y - hy) / 6;
    const e2 = ex * ex + ey * ey;
    if (e2 > 1) return null;
    const d = Math.hypot(x - cx, y - hy);
    if (e2 > 0.8) return [0x4a0008, false];
    if (Math.abs(x - cx) < 1 && Math.abs(y - hy) < 4) return [EYE.pupil, false];
    if (x === cx - 2 && y === hy - 2) return [EYE.hot, true];
    if (d < 4.6) return [d < 2.2 ? 0xff7a4a : d < 3.6 ? EYE.iris : EYE.deep, true];
    return [(x + y) % 5 === 0 ? 0xd06070 : EYE.white, false];
  });
  // neck: gold collar and a little cage
  k.band(P, cx, 44, 9, 3); k.band(P, cx, 49, 7, 2); k.band(P, cx, 53, 11, 4);
  k.fillBetween(P, 57, 64, () => cx - 4, () => cx + 4, (x, y, u) => [k.tone(GOLD, u)]);
  // shaft
  k.shaft(P, cx, 65, H - 14, 5, SHAFT, 'plain');
  for (let y = 76; y < H - 20; y += 26) { k.band(P, cx, y, 7, 2); k.band(P, cx, y + 3, 6, 1); }
  // butt spike
  k.band(P, cx, H - 14, 7, 3);
  k.poly(P, [[cx - 3, H - 11], [cx, H - 1], [cx + 3, H - 11]], (x, y, u) => [u < 0.5 ? GOLD.hi : GOLD.lo]);
  k.save(P, 'abissal_cetro');
}

cetro_extras();
function cetro_extras() {
  // a blood bead (glowing) for the bead chains
  const P = k.make(5, 6);
  k.disc(P, 2, 2.5, 2.2, (x, y, d) => [d < 0.4 ? 0xff8a8a : d < 0.8 ? 0xd0101e : 0x6a0008, true]);
  k.save(P, 'abissal_conta');
}
scepter();
console.log('abissal ok');
