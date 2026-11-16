// Movement sanity test: ground top speed, stopping distance, and bunny-hop + air-strafe gain.
'use strict';
const path = require('path');
for (const f of ['core/util.js', 'sim/arena.js', 'sim/weapons.js', 'sim/charweapons.js', 'sim/world.js', 'sim/player.js', 'sim/enemies.js', 'sim/projectiles.js', 'sim/waves.js', 'sim/schools.js', 'sim/kit.js', 'sim/status.js', 'sim/allies.js', 'sim/powers.js', 'sim/abilities-1.js', 'sim/abilities-2.js', 'sim/abilities-3.js', 'sim/abilities-4.js', 'sim/destruct.js']) require(path.join(__dirname, '..', 'src', f));
const SO = globalThis.SO;
function run(label, ticks, cmdFn) {
  const w = new SO.World.World({ seed: 1 });
  w.director.state = 'off';
  w.arena.boxes = []; w.arena.pads = []; w.arena.radius = 5000; // open field: measure movement only
  const p = w.addPlayer(1);
  p.pos.x = -30; p.pos.z = -10; p.pos.y = 0;
  let maxV = 0;
  for (let t = 0; t < ticks; t++) {
    w.setCommand(1, Object.assign({ seq: t, moveX: 0, moveZ: 0, yaw: 0, pitch: 0, buttons: 0, weaponSel: -1 }, cmdFn(t, p)));
    w.step(SO.CFG.TICK);
    maxV = Math.max(maxV, SO.V.lenXZ(p.vel));
  }
  console.log(label.padEnd(28), 'final', SO.V.lenXZ(p.vel).toFixed(1), 'm/s  max', maxV.toFixed(1));
}
run('run forward 2s', 120, () => ({ moveZ: 1 }));
run('run 1s then release', 120, (t) => ({ moveZ: t < 60 ? 1 : 0 }));
// Strafe-hop: hold jump, alternate A/D while turning the view toward the strafe side.
let yaw = Math.PI / 2;
run('bhop + air strafe 3s', 180, (t, p) => {
  const side = Math.floor(t / 30) % 2 ? 1 : -1;
  yaw += -side * 0.035;
  return { moveZ: t < 20 ? 1 : 0, moveX: t < 20 ? 0 : side, yaw, buttons: SO.BTN.JUMP };
});
