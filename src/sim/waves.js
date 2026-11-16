// Wave director. Escalating mixes of enemies; every 5th wave summons the Ashura boss.
// Scales enemy count and HP with the number of living players (multiplayer-ready).
(function (SO) {
  'use strict';

  function create() {
    return { wave: 0, state: 'intro', timer: 2.5, queue: [], spawnT: 0, total: 0, hpScale: 1 };
  }

  function composition(n, players) {
    const m = 1 + (players - 1) * 0.6;
    const boss = n % 5 === 0;
    const k = boss ? 0.45 : 1;
    const list = [];
    const add = (t, c) => { for (let i = 0; i < Math.round(c); i++) list.push(t); };
    add('husk', Math.min(16, 4 + n * 2) * m * k);
    add('caster', Math.min(6, Math.floor((n - 1) * 0.9)) * m * k);
    add('tengu', n >= 2 ? Math.min(5, Math.floor(n * 0.6)) * m * k : 0);
    add('brute', n >= 3 ? Math.min(3, Math.floor((n - 1) / 2.5)) * m * k : 0);
    return { list, boss };
  }

  function startWave(world, d) {
    d.wave++;
    const players = Math.max(1, world.playerCount());
    const comp = composition(d.wave, players);
    // Deterministic shuffle so every machine agrees on spawn order.
    const q = comp.list;
    for (let i = q.length - 1; i > 0; i--) { const j = Math.floor(world.rng() * (i + 1)); const t = q[i]; q[i] = q[j]; q[j] = t; }
    if (comp.boss) q.unshift('ashura');
    d.queue = q;
    d.total = q.length;
    d.hpScale = (1 + (d.wave - 1) * 0.07) * (1 + (players - 1) * 0.35);
    d.state = 'fight';
    d.spawnT = 0.4;
    world.emit('waveStart', { wave: d.wave, boss: comp.boss, total: d.total });
  }

  function pickSpawn(world, type) {
    const sp = world.arena.spawns;
    let best = sp[0];
    for (let tries = 0; tries < 6; tries++) {
      const s = sp[Math.floor(world.rng() * sp.length)];
      best = s;
      const p = world.nearestPlayer(s);
      if (!p || SO.V.dist(p.pos, s) > 12) break;
    }
    if (type === 'ashura') return { x: 0, y: 6, z: -14 };
    const jitter = { x: best.x + (world.rng() - 0.5) * 3, y: best.y, z: best.z + (world.rng() - 0.5) * 3 };
    if (type === 'caster' || type === 'tengu') jitter.y += 5;
    return jitter;
  }

  function step(world, d, dt) {
    if (world.playerCount() === 0) return;
    if (d.state === 'intro' || d.state === 'intermission') {
      d.timer -= dt;
      if (d.timer <= 0) startWave(world, d);
      return;
    }
    if (d.state === 'fight') {
      d.spawnT -= dt;
      const cap = SO.CFG.MAX_ALIVE * (1 + (world.playerCount() - 1) * 0.4);
      if (d.queue.length && d.spawnT <= 0 && world.enemyCount() < cap) {
        const type = d.queue.shift();
        SO.Enemies.spawn(world, type, pickSpawn(world, type), d.hpScale);
        d.spawnT = d.wave < 3 ? 0.6 : 0.42;
      }
      if (!d.queue.length && world.enemyCount() === 0) {
        d.state = 'intermission';
        d.timer = 4.5;
        for (const k in world.players) {
          const p = world.players[k];
          if (p.dead) continue;
          p.hp = Math.min(p.maxHp, p.hp + 35);
          p.energy = Math.min(100, p.energy + 25);
        }
        world.emit('waveClear', { wave: d.wave });
      }
    }
  }

  function remaining(world, d) { return d.queue.length + world.enemyCount(); }

  SO.Waves = { create, step, remaining };
})(typeof window !== 'undefined' ? (window.SO = window.SO || {}) : (globalThis.SO = globalThis.SO || {}));
