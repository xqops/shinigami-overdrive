// 05 Manipulação de Sangue: "Foice Sanguínea" — a long dark shaft ringed in gold, an ornate gold
// head with a red gem, a silver-crimson crescent blade dripping blood, a glass vial of blood set
// in the shaft and a gold claw at the butt. After the author's card 5.
'use strict';
const k = require('./kit');
const { GOLD } = k;
const SHAFT = { hi: 0x4a2a32, mid: 0x2a141a, lo: 0x16080c, deep: 0x0a0306 };
const STEEL = { hi: 0xf0a0ac, mid: 0x98283a, lo: 0x5a0a18, deep: 0x3a040c };
const BLOOD = { hot: 0xff4a5a, mid: 0xd0101e, deep: 0x7a0010, dark: 0x3a0008 };

function scythe() {
  const W = 74, H = 226, cx = 13;
  const P = k.make(W, H);
  // the blade: a crescent from the head out to the right and down to a point
  const C1 = [6, 86], R1 = 80, C2 = [-4, 100], R2 = 82;
  for (let y = 2; y < 96; y++) for (let x = cx + 4; x < W; x++) {
    const d1 = Math.hypot(x - C1[0], y - C1[1]), d2 = Math.hypot(x - C2[0], y - C2[1]);
    if (d1 > R1 || d2 < R2 || y > 92) continue;
    const edge = d2 - R2; // distance from the inner (cutting) edge
    const back = R1 - d1;
    let c, glow = false;
    if (edge < 1.2) { c = BLOOD.hot; glow = true; } else if (edge < 2.4) { c = 0xff9aa8; glow = true; } else if (back < 1.5) c = STEEL.lo; else c = (x + y) % 9 === 0 ? STEEL.hi : edge < 5 ? STEEL.hi : STEEL.mid;
    // blood running down the steel
    if ((x * 13 + Math.floor(y / 3) * 7) % 19 === 0 && edge > 2) { c = BLOOD.mid; glow = true; }
    P.set(x, y, c, glow);
  }
  // head: ornate gold socket with a red gem and a back spike
  k.poly(P, [[cx - 6, 14], [cx + 8, 4], [cx + 12, 16], [cx + 6, 30], [cx - 6, 30]], (x, y, u) => [k.tone(GOLD, u)]);
  k.poly(P, [[cx - 6, 18], [cx - 13, 6], [cx - 4, 12]], (x, y, u) => [u < 0.5 ? GOLD.hi : GOLD.lo]);
  k.poly(P, [[cx + 2, 4], [cx + 6, -4], [cx + 9, 6]], (x, y, u) => [u < 0.5 ? GOLD.hi : GOLD.mid]);
  k.roundGem(P, cx + 1, 19, 3.5, BLOOD.mid, BLOOD.hot, 0xffd0d0);
  // shaft
  k.shaft(P, cx, 31, H - 16, 5, SHAFT, 'plain');
  for (const y of [34, 40, 112, 150, 188]) k.band(P, cx, y, 7, 3);
  // the vial: glass with gold caps, blood inside (glowing)
  k.band(P, cx, 50, 11, 3); k.band(P, cx, 86, 11, 3);
  k.fillBetween(P, 53, 85, () => cx - 4, () => cx + 4, (x, y, u) => {
    if (y < 57) return [u < 0.3 ? 0xd8c8d0 : 0x6a5a62];
    return [u < 0.25 ? BLOOD.hot : u > 0.75 ? BLOOD.deep : BLOOD.mid, true];
  });
  k.line(P, cx - 3, 58, cx - 3, 82, 0xffd0d8, true, 1); // glass glint
  // butt: a gold claw
  k.band(P, cx, H - 16, 8, 3);
  k.poly(P, [[cx - 4, H - 13], [cx - 7, H - 3], [cx - 1, H - 9]], (x, y, u) => [GOLD.mid]);
  k.poly(P, [[cx + 4, H - 13], [cx + 7, H - 3], [cx + 1, H - 9]], (x, y, u) => [GOLD.lo]);
  k.poly(P, [[cx - 2, H - 13], [cx, H - 1], [cx + 2, H - 13]], (x, y, u) => [GOLD.hi]);
  k.save(P, 'sangue_foice');
}

scythe();
console.log('sangue ok');
