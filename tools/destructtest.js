// Headless destruction test: powers break the temple, supports bring beams down, waves heal it.
// Usage: node tools/destructtest.js
'use strict';
const path = require('path');
for (const f of ['core/util.js', 'sim/arena.js', 'sim/weapons.js', 'sim/charweapons.js', 'sim/world.js', 'sim/player.js', 'sim/enemies.js', 'sim/projectiles.js', 'sim/waves.js', 'sim/schools.js', 'sim/kit.js', 'sim/status.js', 'sim/allies.js', 'sim/powers.js', 'sim/abilities-1.js', 'sim/abilities-2.js', 'sim/abilities-3.js', 'sim/abilities-4.js', 'sim/destruct.js']) require(path.join(__dirname, '..', 'src', f));
const SO = globalThis.SO;
let fails = 0;
const check = (ok, msg) => { console.log((ok ? 'ok   ' : 'FAIL ') + msg); if (!ok) fails++; };

const world = new SO.World.World({ seed: 7 });
const p = world.addPlayer('p1', 'tester');
const A = world.arena;
const run = (s) => { for (let i = 0; i < s * 60; i++) world.step(1 / 60); };
run(0.2);

// 1. a meteor impact on a lantern destroys it and it leaves the collision list
const lan = A.all[A.lanterns[0].id];
world.emit('blast', { x: lan.min.x + 0.6, y: 0, z: lan.min.z + 0.6, r: 7, dmg: 320, crater: [6.5, 2.2] });
SO.Destruct.step(world, 1 / 60, [world.events[world.events.length - 1]]);
check(lan.gone && !A.boxes.includes(lan), 'meteor destroys a lantern');

// 2. pillars snap to a stump first
const pil = A.all.find((b) => b.kind === 'pillar');
SO.Destruct.damage(world, { x: pil.min.x - 0.5, y: 5, z: pil.min.z }, 3, 400);
check(!pil.gone && Math.abs(pil.max.y - pil.min.y - 2.4) < 1e-6, 'pillar breaks into a 2.4 m stump');
SO.Destruct.damage(world, { x: pil.min.x - 0.5, y: 1, z: pil.min.z }, 3, 400);
check(pil.gone, 'stump breaks on the next big hit');

// 3. a torii column takes its beams down with it
const col = A.all.find((b) => b.group === 'gate0' && b.support);
SO.Destruct.damage(world, { x: col.min.x - 0.3, y: 2, z: col.min.z }, 1.5, 500);
const beams = A.all.filter((b) => b.group === 'gate0' && !b.support);
check(col.gone && beams.every((b) => b.gone), 'gate beams collapse with a column');

// 4. bridge deck survives one lost post, falls with two
const posts = A.all.filter((b) => b.group === 'bridge1' && b.support);
const deck = A.all.find((b) => b.group === 'bridge1' && b.kind === 'bridge');
SO.Destruct.damage(world, { x: posts[0].min.x, y: 1, z: posts[0].min.z }, 0.8, 500);
check(!deck.gone, 'bridge holds with three posts');
SO.Destruct.damage(world, { x: posts[3].min.x, y: 1, z: posts[3].min.z }, 0.8, 500);
check(deck.gone, 'bridge falls with two posts gone');

// 5. the pagoda never breaks
const tier = A.all[0];
SO.Destruct.damage(world, { x: 0, y: 1, z: 6.5 }, 10, 5000);
check(!tier.gone && tier.max.y === tier.max0, 'pagoda is indestructible');

// 6. the snapshot carries the damage; a fresh arena copy reproduces it
const st = world.snapshot().arena;
const copy = SO.Arena.build();
for (const [id, h] of st.boxes) SO.Destruct.apply(copy, id, h);
check(copy.boxes.length === A.boxes.length && st.boxes.length > 0, 'snapshot state rebuilds the same arena (' + st.boxes.length + ' changed boxes)');

// 6b. a meteor on open ground digs a crater you can walk into
p.pos.x = 20; p.pos.z = 20; p.pos.y = 0;
SO.Destruct.step(world, 1 / 60, [{ type: 'blast', x: 20, y: 0, z: 20, r: 7, dmg: 320, crater: [6.5, 2.2] }]);
check(SO.Destruct.groundY(A, 20, 20) < -2, 'meteor crater is ' + (-SO.Destruct.groundY(A, 20, 20)).toFixed(2) + ' m deep');
run(1);
check(p.pos.y < -1.5, 'player stands at the crater bottom (y=' + p.pos.y.toFixed(2) + ')');
const nCraters = A.craters.length;
SO.Destruct.step(world, 1 / 60, [{ type: 'blast', x: 0, y: A.all[0].max.y, z: 0, r: 7, dmg: 320, crater: [6.5, 2.2] }]);
check(A.craters.length === nCraters, 'an impact on the pagoda roof digs no floor crater');

// 7. a new wave regrows everything not occupied
p.pos.x = 200; p.pos.z = 200; // out of the way
for (const k in world.enemies) delete world.enemies[k];
SO.Destruct.step(world, 1 / 60, [{ type: 'waveStart' }]);
check(A.boxes.length === A.all.length && SO.Destruct.state(A).boxes.length === 0 && A.craters.length === 0, 'wave start restores the temple and its floor');

console.log(fails ? fails + ' failed' : 'all passed');
process.exit(fails ? 1 : 0);
