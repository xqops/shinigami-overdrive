// Headless simulation test: runs the game sim in Node with a bot player.
// Proves the sim has no browser dependency (the base for a multiplayer server).
// Usage: node tools/simtest.js [seconds] [players]
'use strict';
const path = require('path');
const files = ['core/util.js', 'sim/arena.js', 'sim/weapons.js', 'sim/charweapons.js', 'sim/world.js', 'sim/player.js', 'sim/enemies.js', 'sim/projectiles.js', 'sim/waves.js', 'sim/schools.js', 'sim/kit.js', 'sim/status.js', 'sim/allies.js', 'sim/powers.js', 'sim/abilities-1.js', 'sim/abilities-2.js', 'sim/abilities-3.js', 'sim/abilities-4.js', 'sim/destruct.js'];
for (const f of files) require(path.join(__dirname, '..', 'src', f));
const SO = globalThis.SO;

const seconds = Number(process.argv[2] || 120);
const nPlayers = Number(process.argv[3] || 1);
const world = new SO.World.World({ seed: 42 });
// players walk through every school (a new one every 6 s) so the test covers all 80 abilities
const SCH = SO.Schools.LIST.map((s) => s.id);
for (let i = 1; i <= nPlayers; i++) world.addPlayer(i, null, { school: SCH[(i - 1) % SCH.length] });

const counts = {};
let seq = 0;
const ticks = Math.round(seconds / SO.CFG.TICK);
for (let t = 0; t < ticks; t++) {
  for (const k in world.players) {
    const p = world.players[k];
    // God-mode bot: keep it alive so the test covers many waves.
    p.hp = p.maxHp;
    let target = null, bd = 1e9;
    for (const ek in world.enemies) { const e = world.enemies[ek]; const d = SO.V.dist(e.pos, p.pos); if (d < bd) { bd = d; target = e; } }
    let yaw = p.yaw, pitch = 0;
    if (target) {
      const dx = target.pos.x - p.pos.x, dz = target.pos.z - p.pos.z, dy = target.pos.y + target.def.height / 2 - (p.pos.y + SO.CFG.EYE);
      yaw = Math.atan2(-dx, -dz);
      pitch = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
    }
    let b = SO.BTN.ATTACK;
    if (t % 90 === 0) b |= SO.BTN.DASH;
    if (t % 50 === 0) b |= SO.BTN.JUMP;
    if (t % 200 === 0) b |= SO.BTN.WAVE;
    if (t % 230 === 15) b |= SO.BTN.P2;
    if (t % 260 === 30) b |= SO.BTN.P3;
    p.energy = 100;
    if (t % 360 === 0 && !p.ult) p.school = SCH[(Math.floor(t / 360) + Number(k) - 1) % SCH.length];
    if (t % 777 === 0) p.overdrive = 100;
    if (t % 300 === 0) b |= SO.BTN.BLINK;
    if (t % 400 < 30) b |= SO.BTN.ALT; // katana iaido charge + release
    if (t % 777 === 0) b |= SO.BTN.DOMAIN;
    if (t % 333 === 5) b |= SO.BTN.SLIDE;
    const weaponSel = Math.floor(t / 1200) % 3;
    world.setCommand(p.id, { seq: ++seq, moveX: Math.sin(t * 0.01), moveZ: bd > 3 ? 1 : 0, yaw, pitch, buttons: b, weaponSel });
  }
  world.step(SO.CFG.TICK);
  for (const e of world.drainEvents()) counts[e.type] = (counts[e.type] || 0) + 1;
  // Sanity: nothing should ever be NaN or fall through the floor.
  // a crater lip can rise under a body for one tick before collision lifts it (hence 0.4)
  for (const k in world.players) { const p = world.players[k]; if (!isFinite(p.pos.x + p.pos.y + p.pos.z) || p.pos.y < SO.Destruct.groundY(world.arena, p.pos.x, p.pos.z) - 0.4) throw new Error('bad player pos ' + JSON.stringify(p.pos)); }
  for (const k in world.enemies) { const e = world.enemies[k]; if (!isFinite(e.pos.x + e.pos.y + e.pos.z)) throw new Error('bad enemy pos ' + e.etype); }
}
const snap = JSON.stringify(world.snapshot());
const p1 = world.players[1];
console.log('simulated', seconds, 's, players', nPlayers);
console.log('wave reached:', world.director.wave, 'state:', world.director.state, 'alive enemies:', world.enemyCount());
console.log('p1 kills', p1.kills, 'score', p1.score, 'rank', SO.World.RANKS[p1.style.rank].l);
console.log('snapshot bytes:', snap.length);
console.log('events:', JSON.stringify(counts));
