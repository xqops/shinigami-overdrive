// Projectiles: enemy orbs/spears (parryable), Getsuga waves, the boomerang scythe, parried shots
// that explode on impact, and 'spell' — the generic projectile of the school abilities:
//   look/color      how the renderer draws it            delay       hover in place before launching
//   homing/target   steer into an enemy (target id)      steer       follow the owner's crosshair
//   grav            gravity (m/s²)                       pierce      enemies it passes through
//   hit             damage options for K.hit             status      { name, t, data } on hit
//   explode         { r, dmg, falloff, crater } on wall / floor / end / hit (explodeOnHit)
//   on / onEnd / onStep   custom handlers in SO.Abilities.SPELL_HIT / SPELL_END / SPELL_STEP
(function (SO) {
  'use strict';
  const V = SO.V, CFG = SO.CFG;

  function spawn(world, o) {
    const q = Object.assign({
      id: world.id(), owner: 'enemy', pid: null, radius: 0.4, dmg: 10, life: 5, pierce: false,
      rehit: 0, parryable: false, homing: 0, age: 0, hitSet: {}, parried: false,
    }, o);
    world.projectiles[q.id] = q;
    world.emit('projSpawn', { id: q.id, kind: q.kind, owner: q.owner, w: q.w });
    return q;
  }

  function remove(world, q, reason) {
    if (!world.projectiles[q.id]) return;
    delete world.projectiles[q.id];
    if (q.kind === 'spell') spellEnd(world, q, reason);
    if (q.kind === 'scythe') {
      const p = world.players[q.pid];
      if (p && p.scytheOut === q.id) p.scytheOut = 0;
      world.emit('scytheCatch', { pid: q.pid });
    }
    world.emit('projEnd', { id: q.id, kind: q.kind, owner: q.owner, parried: q.parried, x: q.pos.x, y: q.pos.y, z: q.pos.z, reason, look: q.look || null, variant: q.variant || null });
  }

  function spellEnd(world, q, reason) {
    const p = world.players[q.pid];
    if (q.explode && (reason !== 'hitEnemy' || q.explodeOnHit) && reason !== 'intercept') {
      const x = q.explode;
      SO.Kit.blast(world, p, q.pos, x.r, x.dmg, Object.assign({ falloff: x.falloff != null ? x.falloff : 0.5, crater: x.crater, kind: q.hitKind || 'power' }, q.hit || {}, x.opts || {}));
      SO.Kit.vfx(world, 'boom', { x: q.pos.x, y: q.pos.y, z: q.pos.z, r: x.r, color: q.color, look: q.look, variant: q.variant || null, snd: q.boomSnd || null });
    }
    if (q.onEnd && SO.Abilities.SPELL_END[q.onEnd]) SO.Abilities.SPELL_END[q.onEnd](world, q, reason);
  }

  function spellStep(world, q, dt) {
    const p = world.players[q.pid];
    if (q.age < (q.delay || 0)) {
      // hovering in formation (optionally carried along with its caster)
      if (q.follow && p) { q.pos.x = p.pos.x + q.follow.x; q.pos.y = p.pos.y + q.follow.y; q.pos.z = p.pos.z + q.follow.z; }
      q.vel.x = 0; q.vel.y = 0; q.vel.z = 0;
      return;
    }
    if (!q.launched) {
      q.launched = true;
      const sp = q.speed || 30;
      let dir = q.dir;
      if (!dir && p) dir = SO.forward(p.yaw, p.pitch, V.v());
      if (q.aimAtLaunch && p) {
        const pt = SO.Kit.aimPoint(world, p, 80);
        const t = q.target && world.enemies[q.target] ? SO.Enemies.center(world.enemies[q.target]) : { x: pt.x, y: pt.y + (pt.enemy ? pt.enemy.def.height * 0.5 : 0.8), z: pt.z };
        dir = V.norm(V.v(), V.sub(V.v(), t, q.pos));
      }
      if (dir) V.scale(q.vel, dir, sp);
      world.emit('spellLaunch', { id: q.id, look: q.look, x: q.pos.x, y: q.pos.y, z: q.pos.z });
    }
    if (q.homing > 0) {
      let tgt = q.target && world.enemies[q.target];
      if (!tgt && q.retarget) { tgt = SO.Kit.nearest(world, q.pos, q.retarget, q.hitSet); q.target = tgt ? tgt.id : 0; }
      if (tgt) {
        const d = V.norm(V.v(), V.sub(V.v(), SO.Enemies.center(tgt), q.pos));
        const cur = V.len(q.vel) > 0.1 ? V.norm(V.v(), q.vel) : d;
        V.lerp(cur, cur, d, Math.min(1, q.homing * dt));
        V.norm(cur, cur);
        V.scale(q.vel, cur, SO.approach(V.len(q.vel), q.speed || 30, 120 * dt));
      }
    }
    if (q.steer && p) {
      const pt = SO.Kit.aimPoint(world, p, 80);
      const d = V.norm(V.v(), V.sub(V.v(), { x: pt.x, y: pt.y, z: pt.z }, q.pos));
      const cur = V.norm(V.v(), q.vel);
      V.lerp(cur, cur, d, Math.min(1, q.steer * dt));
      V.norm(cur, cur);
      V.scale(q.vel, cur, Math.max(V.len(q.vel), q.speed || 30));
    }
    if (q.grav) q.vel.y -= q.grav * dt;
    if (q.onStep && SO.Abilities.SPELL_STEP[q.onStep]) SO.Abilities.SPELL_STEP[q.onStep](world, q, dt);
  }

  function spellHit(world, q, e) {
    const p = world.players[q.pid];
    const dir = V.norm(V.v(), q.vel);
    if (q.dmg > 0) SO.Kit.hit(world, p, e, q.dmg, Object.assign({ dir: { x: dir.x, y: Math.max(0, dir.y), z: dir.z }, kind: q.hitKind || 'power' }, q.hit || {}));
    if (q.status) SO.Kit.status(world, e, q.status.name, q.status.t, Object.assign({ pid: q.pid, by: q.look }, q.status.data));
    if (q.on && SO.Abilities.SPELL_HIT[q.on]) SO.Abilities.SPELL_HIT[q.on](world, q, e);
    SO.Kit.vfx(world, 'spellHit', { x: q.pos.x, y: q.pos.y, z: q.pos.z, color: q.color, look: q.look });
  }

  function distToPlayer(p, pos) {
    const y = SO.clamp(pos.y, p.pos.y + 0.3, p.pos.y + p.height - 0.3);
    const dx = pos.x - p.pos.x, dy = pos.y - y, dz = pos.z - p.pos.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function explode(world, q) {
    const R = 3.6;
    for (const k in world.enemies) {
      const e = world.enemies[k];
      const c = SO.Enemies.center(e);
      const d = V.dist(c, q.pos);
      if (d > R + e.def.radius || q.hitSet[e.id] != null) continue;
      const dir = V.norm(V.v(), V.sub(V.v(), c, q.pos));
      world.damageEnemy(e, q.dmg * 0.5, { pid: q.pid, kind: 'parry', weapon: q.weapon, dir, push: 8, stun: 0.6, stop: 0.03 });
    }
    world.emit('explosion', { x: q.pos.x, y: q.pos.y, z: q.pos.z, r: R });
  }

  function step(world, dt, edt) {
    for (const k in world.projectiles) {
      const q = world.projectiles[k];
      const sdt = q.owner === 'enemy' ? edt : dt;
      q.age += sdt;
      q.life -= sdt;

      if (q.kind === 'spell') {
        spellStep(world, q, sdt);
        if (!world.projectiles[q.id]) continue;
      } else if (q.kind === 'scythe') {
        const p = world.players[q.pid];
        if (!p || p.dead) { remove(world, q, 'lost'); continue; }
        if (q.phase === 'out' && q.age > q.outT) q.phase = 'back';
        if (q.phase === 'back') {
          const eye = { x: p.pos.x, y: p.pos.y + CFG.EYE - 0.3, z: p.pos.z };
          const d = V.sub(V.v(), eye, q.pos);
          const l = V.len(d);
          if (l < 1.8) { remove(world, q, 'caught'); continue; }
          const sp = 42 + q.age * 14;
          V.scale(q.vel, d, sp / l);
        }
      } else if (q.homing > 0 && q.owner === 'enemy') {
        const p = world.nearestPlayer(q.pos);
        if (p) {
          const d = V.norm(V.v(), V.sub(V.v(), { x: p.pos.x, y: p.pos.y + 1.2, z: p.pos.z }, q.pos));
          const sp = q.speed || V.len(q.vel);
          const cur = V.norm(V.v(), q.vel);
          const k2 = Math.min(1, q.homing * sdt);
          V.lerp(cur, cur, d, k2);
          V.norm(cur, cur);
          const ns = SO.approach(V.len(q.vel), sp, 30 * sdt);
          V.scale(q.vel, cur, ns);
        }
      }

      const speed = V.len(q.vel) * sdt;
      const n = Math.max(1, Math.ceil(speed / 0.5));
      const sub = sdt / n;
      let gone = false;
      for (let s = 0; s < n && !gone; s++) {
        V.addScaled(q.pos, q.pos, q.vel, sub);
        if (q.kind === 'spell' && q.ghost) { /* passes through walls */ } else if (q.kind !== 'scythe' && q.kind !== 'wave' && world.pointInBox(q.pos, 0)) {
          if (q.parried) explode(world, q);
          remove(world, q, 'wall'); gone = true; break;
        }
        if (q.kind === 'wave' && world.pointInBox(q.pos, -0.6)) { remove(world, q, 'wall'); gone = true; break; }
        if (q.kind === 'scythe' && q.phase === 'out' && world.pointInBox(q.pos, 0)) q.phase = 'back';

        if (q.owner === 'enemy') {
          for (const pk in world.players) {
            const p = world.players[pk];
            if (p.dead) continue;
            if (distToPlayer(p, q.pos) < q.radius + p.radius) {
              if (world.damagePlayer(p, q.dmg, { x: q.pos.x, z: q.pos.z, kind: q.kind })) { remove(world, q, 'hitPlayer'); gone = true; break; }
            }
          }
        } else {
          for (const ek in world.enemies) {
            const e = world.enemies[ek];
            const c = SO.Enemies.center(e);
            const reach = q.radius + e.def.radius + (e.def.height > 2 ? e.def.height * 0.25 : 0);
            if (V.dist(c, q.pos) > reach) continue;
            const last = q.hitSet[e.id];
            if (last != null && (!q.rehit || q.age - last < q.rehit)) continue;
            q.hitSet[e.id] = q.age;
            const dir = V.norm(V.v(), q.vel);
            if (q.kind === 'spell') {
              spellHit(world, q, e);
              if (q.pierce !== true && !(q.pierce > 0 && (q.pierce -= (e.def.big && !q.pierceBig ? 99 : 1)) >= 0)) { remove(world, q, 'hitEnemy'); gone = true; break; }
              continue;
            } else if (q.kind === 'wave') {
              world.damageEnemy(e, q.dmg, { pid: q.pid, kind: 'getsuga', weapon: q.weapon, dir, push: 10, stun: 0.6, stop: 0.04, launch: 4, styleName: 'GETSUGA HIT', stylePts: 9 });
            } else if (q.kind === 'scythe') {
              world.damageEnemy(e, q.dmg, { pid: q.pid, kind: 'scythe', weapon: 'scythe', dir, push: 3, stun: 0.35, stop: 0.015, styleName: 'BOOMERANG', stylePts: 6 });
            } else {
              world.damageEnemy(e, q.dmg, { pid: q.pid, kind: 'parry', weapon: q.weapon, dir, push: 14, stun: 1.0, stop: 0.1, styleName: 'DEFLECT', stylePts: 12 });
              if (q.parried) explode(world, q);
            }
            if (!q.pierce) { remove(world, q, 'hitEnemy'); gone = true; break; }
          }
        }
      }
      if (gone) continue;
      if (q.life <= 0 || q.pos.y < -5 || Math.abs(q.pos.x) > 120 || Math.abs(q.pos.z) > 120) remove(world, q, 'expire');
    }
  }

  SO.Projectiles = { spawn, step, remove };
})(typeof window !== 'undefined' ? (window.SO = window.SO || {}) : (globalThis.SO = globalThis.SO || {}));
