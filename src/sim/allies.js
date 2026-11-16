// Allies summoned by the player's powers: demons, guardians, shadow clones and decoys. Pure sim.
// Enemies may target them (taunt), they hunt enemies (marked ones first) and expire on a timer.
// Rendered by render/views.js from the snapshot (kind + position + yaw + state).
(function (SO) {
  'use strict';
  const V = SO.V;

  // model = enemy model reused for the look; tint = glow color; fly = airborne
  const KINDS = {
    imp:        { hp: 80,  r: 0.45, h: 1.5, speed: 12, dmg: 35, cd: 1.0, range: 2.2, life: 12, taunt: true,  model: 'demonio_impuro', scale: 0.72, tint: 0xff2a1a },
    guardian:   { hp: 600, r: 0.9,  h: 3.0, speed: 10, dmg: 30, cd: 0.9, range: 3.8, life: 14, taunt: true,  model: 'esqueleto_guerreiro', scale: 0.75, tint: 0xff4a10, guard: true, budget: 150 },
    warrior:    { hp: 160, r: 0.55, h: 2.1, speed: 11, dmg: 22, cd: 0.8, range: 2.6, life: 10, taunt: true,  model: 'demonio_impuro', scale: 1, tint: 0xd4143a },
    flyer:      { hp: 90,  r: 0.5,  h: 1.8, speed: 15, dmg: 18, cd: 0.9, range: 2.4, life: 10, taunt: false, model: 'gargula', scale: 0.9, tint: 0xd4143a, fly: true },
    commander:  { hp: 900, r: 1.2,  h: 4.2, speed: 8,  dmg: 45, cd: 1.1, range: 4.6, life: 10, taunt: true,  model: 'esqueleto_guerreiro', scale: 1.05, tint: 0xff1a1a },
    clone:      { hp: 70,  r: 0.45, h: 1.9, speed: 14, dmg: 30, cd: 1.0, range: 2.4, life: 8,  taunt: true,  model: 'soldado_sombrio', scale: 0.95, tint: 0x7a3cff, shadow: true },
    shade:      { hp: 999, r: 0.45, h: 1.9, speed: 16, dmg: 25, cd: 9,   range: 8,   life: 8,  taunt: false, model: 'soldado_sombrio', scale: 0.95, tint: 0x5a2acc, shadow: true, formation: true },
    afterimage: { hp: 40,  r: 0.45, h: 1.9, speed: 0,  dmg: 0,  cd: 9,   range: 0,   life: 2,  taunt: true,  model: 'soldado_sombrio', scale: 0.95, tint: 0xa35bff, shadow: true, still: true },
  };

  function spawn(world, p, kind, pos, o) {
    const d = KINDS[kind];
    const a = Object.assign({
      id: world.id(), kind, def: d, owner: p ? p.id : null, isAlly: true,
      pos: { x: pos.x, y: pos.y, z: pos.z }, vel: V.v(), yaw: p ? p.yaw + Math.PI : 0,
      radius: d.r, height: d.h, hp: d.hp, life: d.life, cd: 0.3, state: 'spawn', stateT: 0,
      dealt: 0, target: 0, dead: false, grounded: false, slot: 0,
    }, o);
    world.allies[a.id] = a;
    world.emit('allySpawn', { id: a.id, kind, x: a.pos.x, y: a.pos.y, z: a.pos.z, owner: a.owner });
    return a;
  }

  function remove(world, a, how) {
    if (!world.allies[a.id]) return;
    delete world.allies[a.id];
    a.dead = true;
    world.emit('allyEnd', { id: a.id, kind: a.kind, x: a.pos.x, y: a.pos.y + a.height * 0.5, z: a.pos.z, how: how || 'expire' });
  }

  // enemy the ally should go for: something its owner marked, else the nearest one
  function pickTarget(world, a) {
    let best = null, bd = 1e9;
    for (const k in world.enemies) {
      const e = world.enemies[k];
      const d = V.dist(e.pos, a.pos);
      const marked = e.st && e.st.mark && e.st.mark.pid === a.owner;
      const score = d - (marked ? 30 : 0);
      if (d < 40 && score < bd) { bd = score; best = e; }
    }
    return best;
  }

  function attack(world, a, e) {
    const p = world.players[a.owner];
    const dmg = a.dmgOverride != null ? a.dmgOverride : a.def.dmg;
    SO.Kit.hit(world, p, e, dmg, { kind: 'ally', from: a.pos, push: a.kind === 'commander' ? 10 : 4, stun: 0.35, style: a.def.shadow ? 'SOMBRA' : 'DEMÔNIO', pts: 2 });
    a.dealt += dmg;
    world.emit('allyAttack', { id: a.id, kind: a.kind, x: e.pos.x, y: e.pos.y + e.def.height * 0.5, z: e.pos.z });
  }

  function step(world, dt) {
    for (const k in world.allies) {
      const a = world.allies[k];
      const d = a.def;
      a.life -= dt; a.cd -= dt; a.stateT += dt;
      const p = world.players[a.owner];
      if (a.life <= 0 || a.hp <= 0 || !p || p.dead || (d.budget && a.dealt >= d.budget)) {
        if (a.onEnd && SO.Abilities.ALLY_END[a.onEnd]) SO.Abilities.ALLY_END[a.onEnd](world, a);
        remove(world, a, a.hp <= 0 ? 'killed' : 'expire');
        continue;
      }
      if (a.state === 'spawn') { if (a.stateT > 0.5) a.state = 'hunt'; a.vel.x = a.vel.z = 0; }
      let want = null;
      if (a.state === 'dash' && a.dashTo) {
        // scripted charge (shadow explosions, army charge): straight at the point, then the handler fires
        const dx = a.dashTo.x - a.pos.x, dz = a.dashTo.z - a.pos.z, l = Math.sqrt(dx * dx + dz * dz);
        if (l < 1.2 || a.stateT > 1.2) {
          a.state = 'hunt';
          if (a.onArrive && SO.Abilities.ALLY_ARRIVE[a.onArrive]) SO.Abilities.ALLY_ARRIVE[a.onArrive](world, a);
          continue;
        }
        want = { x: dx / l * 34, z: dz / l * 34 };
      } else if (!d.still && a.state === 'hunt') {
        if (d.formation && p) {
          // shadow army: hold a ring around the owner
          const ang = p.yaw + (a.slot / (a.of || 8)) * Math.PI * 2;
          const tx = p.pos.x + Math.sin(ang) * 3.2, tz = p.pos.z + Math.cos(ang) * 3.2;
          want = { x: (tx - a.pos.x) * 8, z: (tz - a.pos.z) * 8 };
          a.yaw = p.yaw + Math.PI;
        } else {
          let e = world.enemies[a.target];
          if (!e || a.stateT > 2) { e = pickTarget(world, a); a.target = e ? e.id : 0; a.stateT = 0.01; }
          if (d.guard && p) {
            // the guardian keeps close to its summoner and only engages what comes near
            const near = SO.Kit.nearest(world, p.pos, 9);
            e = near; a.target = e ? e.id : 0;
          }
          if (e) {
            const dx = e.pos.x - a.pos.x, dz = e.pos.z - a.pos.z, l = Math.sqrt(dx * dx + dz * dz) || 1;
            a.yaw = Math.atan2(dx, dz);
            if (l < d.range + e.def.radius) { want = { x: 0, z: 0 }; if (a.cd <= 0) { a.cd = d.cd; attack(world, a, e); } }
            else want = { x: dx / l * d.speed, z: dz / l * d.speed };
            if (d.fly) a.flyY = e.pos.y + e.def.height * 0.6;
          } else if (p) {
            const dx = p.pos.x - a.pos.x, dz = p.pos.z - a.pos.z, l = Math.sqrt(dx * dx + dz * dz) || 1;
            want = l > 4 ? { x: dx / l * d.speed, z: dz / l * d.speed } : { x: 0, z: 0 };
            a.flyY = p.pos.y + 3;
          }
        }
      }
      // motion
      if (want) {
        a.vel.x += (want.x - a.vel.x) * Math.min(1, dt * 10);
        a.vel.z += (want.z - a.vel.z) * Math.min(1, dt * 10);
      } else { a.vel.x *= Math.exp(-8 * dt); a.vel.z *= Math.exp(-8 * dt); }
      if (d.fly) {
        const ty = a.flyY != null ? a.flyY : a.pos.y;
        a.vel.y += ((ty - a.pos.y) * 3 - a.vel.y) * Math.min(1, dt * 4);
        world.moveBody(a, dt, { step: false });
      } else {
        a.vel.y -= SO.CFG.GRAVITY * dt;
        const res = world.moveBody(a, dt);
        a.grounded = res.ground;
        if (res.wall && a.grounded && want && (want.x || want.z)) a.vel.y = 11;
      }
      // the guardian swats enemy projectiles out of the air
      if (d.guard) {
        for (const qk in world.projectiles) {
          const q = world.projectiles[qk];
          if (q.owner !== 'enemy' || V.dist(q.pos, { x: a.pos.x, y: a.pos.y + 1.5, z: a.pos.z }) > 2.6) continue;
          SO.Projectiles.remove(world, q, 'intercept');
          world.emit('allyBlock', { id: a.id, x: q.pos.x, y: q.pos.y, z: q.pos.z });
        }
      }
    }
  }

  // Damage dealt to an ally by an enemy (enemies call world.damagePlayer on their target).
  function damage(world, a, dmg) {
    if (!a.def.taunt) return false;
    a.hp -= dmg;
    world.emit('allyHurt', { id: a.id, x: a.pos.x, y: a.pos.y + a.height * 0.6, z: a.pos.z });
    return true;
  }

  function view(a) { return { id: a.id, k: a.kind, x: a.pos.x, y: a.pos.y, z: a.pos.z, yaw: a.yaw, s: a.state, life: a.life }; }

  SO.Allies = { KINDS, spawn, remove, step, damage, view };
})(typeof window !== 'undefined' ? (window.SO = window.SO || {}) : (globalThis.SO = globalThis.SO || {}));
