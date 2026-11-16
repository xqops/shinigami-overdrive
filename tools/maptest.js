// Walk-path test: a bot walks up each stair route and checks it reaches the target height.
'use strict';
const path = require('path');
for (const f of ['core/util.js', 'sim/arena.js', 'sim/weapons.js', 'sim/charweapons.js', 'sim/world.js', 'sim/player.js', 'sim/enemies.js', 'sim/projectiles.js', 'sim/waves.js', 'sim/schools.js', 'sim/kit.js', 'sim/status.js', 'sim/allies.js', 'sim/powers.js', 'sim/abilities-1.js', 'sim/abilities-2.js', 'sim/abilities-3.js', 'sim/abilities-4.js', 'sim/destruct.js']) require(path.join(__dirname, '..', 'src', f));
const SO = globalThis.SO;
function walk(label, start, yaw, ticks, wantY, jumpAt) {
  const w = new SO.World.World({ seed: 1 });
  w.director.state = 'off';
  const p = w.addPlayer(1);
  p.pos.x = start.x; p.pos.y = start.y; p.pos.z = start.z; p.grounded = true;
  let maxY = 0;
  for (let t = 0; t < ticks; t++) {
    const b = jumpAt && jumpAt.includes(t) ? SO.BTN.JUMP : 0;
    w.setCommand(1, { seq: t, moveX: 0, moveZ: 1, yaw, pitch: 0, buttons: b, weaponSel: -1 });
    w.step(SO.CFG.TICK);
    maxY = Math.max(maxY, p.pos.y);
  }
  console.log((maxY >= wantY - 0.05 ? 'OK  ' : 'FAIL') + ' ' + label.padEnd(30) + ' maxY ' + maxY.toFixed(2) + ' (want ' + wantY + ')');
}
// yaw: 0 = -Z, PI = +Z, PI/2 = -X, -PI/2 = +X
walk('south stairs -> pagoda tier 1', { x: 0, y: 0, z: 14 }, 0, 90, 3);
walk('east stairs -> pagoda tier 1', { x: 14, y: 0, z: 0 }, Math.PI / 2, 90, 3);
walk('tier1 -> tier2 stairs', { x: 5.8, y: 3, z: 0 }, Math.PI / 2, 60, 6);
walk('bridge east stairs (z=35)', { x: 18, y: 0, z: 35 }, Math.PI / 2, 120, 4.6);
walk('bridge west stairs (z=-35)', { x: -18, y: 0, z: -35 }, -Math.PI / 2, 120, 4.6);
walk('tier2 -> top by double jump', { x: 3.4, y: 6, z: 0 }, Math.PI / 2, 60, 8.4, [2, 20]);
