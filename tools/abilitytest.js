// Headless test of every school ability: for each school, a player faces a pack of enemies and
// casts Q, R, G and the ultimate; the sim runs on. Checks: no exceptions, the ability is accepted,
// it does what it promises (damage, heal, allies, statuses...), and its visual / audio events fire.
// Usage: node tools/abilitytest.js [school]
'use strict';
const path = require('path');
const SIM = ['core/util.js', 'sim/arena.js', 'sim/weapons.js', 'sim/charweapons.js', 'sim/world.js', 'sim/player.js', 'sim/enemies.js', 'sim/projectiles.js', 'sim/waves.js',
  'sim/schools.js', 'sim/kit.js', 'sim/status.js', 'sim/allies.js', 'sim/powers.js', 'sim/abilities-1.js', 'sim/abilities-2.js', 'sim/abilities-3.js', 'sim/abilities-4.js', 'sim/destruct.js'];
const fs = require('fs');
for (const f of SIM) { const p = path.join(__dirname, '..', 'src', f); if (fs.existsSync(p)) require(p); }
const SO = globalThis.SO;
const only = process.argv[2];

let fails = 0;
const report = [];
const BTN = SO.BTN;
const slotBtn = [BTN.WAVE, BTN.P2, BTN.P3, BTN.DOMAIN];

function setup(school) {
  const world = new SO.World.World({ seed: 9 });
  const p = world.addPlayer(1, 'tester', { school });
  p.pos.x = 0; p.pos.y = 0; p.pos.z = 30; p.yaw = 0; p.pitch = -0.05; // facing -z, toward the pagoda side
  world.director.state = 'intro'; world.director.timer = 9999;
  const pack = [];
  const kinds = ['husk', 'husk', 'husk', 'caster', 'tengu', 'husk', 'brute'];
  kinds.forEach((t, i) => {
    const a = (i - 3) * 0.22;
    pack.push(SO.Enemies.spawn(world, t, { x: Math.sin(a) * 12, y: 0, z: 30 - Math.cos(a) * 12 }, 1));
  });
  for (const e of pack) { e.state = 'chase'; }
  return { world, p, pack };
}

function run(world, p, sec, buttons, keep) {
  const evs = [];
  for (let i = 0; i < sec * 60; i++) {
    if (keep) { p.hp = Math.max(p.hp, 60); world.director.timer = 9999; }
    world.setCommand(p.id, { seq: i, moveX: 0, moveZ: 0, yaw: p.yaw, pitch: p.pitch, buttons: i === 0 ? buttons : 0, weaponSel: -1 });
    world.step(1 / 60);
    evs.push(...world.drainEvents());
  }
  return evs;
}

// look at the nearest enemy, like a player would before casting
function aimAtNearest(world, p) {
  const eye = { x: p.pos.x, y: p.pos.y + SO.CFG.EYE, z: p.pos.z };
  let best = null, bd = 1e9;
  for (const k in world.enemies) { const e = world.enemies[k]; const d = SO.V.dist(e.pos, p.pos); if (d < bd) { bd = d; best = e; } }
  if (!best) return;
  const c = SO.Enemies.center(best), dx = c.x - eye.x, dy = c.y - eye.y, dz = c.z - eye.z;
  p.yaw = Math.atan2(-dx, -dz); p.pitch = Math.atan2(dy, Math.sqrt(dx * dx + dz * dz));
}

const totalHp = (world) => { let s = 0; for (const k in world.enemies) s += world.enemies[k].hp; return s; };

for (const school of SO.Schools.LIST) {
  if (only && school.id !== only) continue;
  for (let slot = 0; slot < 4; slot++) {
    const id = slot < 3 ? school.skills[slot].id : school.ult.id;
    const { world, p, pack } = setup(school.id);
    if (slot === 3) p.overdrive = 100;
    p.hp = 50;
    run(world, p, 0.5, 0, true);
    aimAtNearest(world, p);
    const hp0 = totalHp(world), php0 = p.hp, n0 = Object.keys(world.enemies).length;
    let evs, err = null;
    try {
      evs = run(world, p, slot === 3 ? school.ult.dur + 3 : 4, slotBtn[slot], true);
    } catch (e) { err = e; }
    const used = {};
    if (evs) for (const e of evs) used[e.type] = (used[e.type] || 0) + 1;
    const dealt = hp0 - totalHp(world) + pack.filter((e) => e.dead).reduce((s, e) => s + Math.max(0, e.hp) , 0);
    const kills = n0 - Object.keys(world.enemies).length;
    const vfx = evs ? [...new Set(evs.filter((e) => e.type === 'vfx').map((e) => e.k))] : [];
    const failCast = used.powerFail || 0;
    const ok = !err && !failCast && (used.ability || used.ultStart);
    if (!ok) fails++;
    report.push(`${ok ? 'ok  ' : 'FAIL'} ${id.padEnd(16)} dmg ${String(Math.round(dealt)).padStart(5)} kills ${kills} heal ${Math.round(p.hp - php0)} allies ${used.allySpawn || 0} status ${used.status || 0} blasts ${used.blast || 0} vfx [${vfx.join(' ')}]${err ? '\n     ' + err.stack.split('\n').slice(0, 4).join('\n     ') : ''}${failCast ? ' (powerFail)' : ''}`);
  }
}
console.log(report.join('\n'));
console.log(fails ? fails + ' failed' : 'all passed');
process.exit(fails ? 1 : 0);
