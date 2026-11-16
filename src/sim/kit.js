// Building blocks shared by the 80 school abilities (sim/abilities*.js): aiming, area / line /
// cone damage, chains, generic spell projectiles, lasting effects, statuses, allies and buffs.
// Visuals are sent as data: K.vfx() emits a 'vfx' event the renderer turns into particles,
// rings, bolts and so on, and lasting effects carry a `look` the renderer draws every frame.
(function (SO) {
  'use strict';
  const V = SO.V, CFG = SO.CFG;

  const K = {};

  K.eye = (p) => ({ x: p.pos.x, y: p.pos.y + CFG.EYE, z: p.pos.z });
  K.fwd = (p) => SO.forward(p.yaw, p.pitch, V.v());
  K.flat = (p) => SO.forwardFlat(p.yaw, V.v());
  K.center = (e) => SO.Enemies.center(e);

  // Where the crosshair lands (box, floor or enemy), clamped to maxDist. y is the surface height.
  K.aimPoint = (world, p, maxDist, minDist) => {
    const o = K.eye(p), f = K.fwd(p);
    let d = world.raycast(o, f, maxDist);
    const e = SO.Powers.aimTarget(world, p, maxDist, 6);
    if (e) { const c = K.center(e); const de = V.dist(c, o); if (de < d) return { x: e.pos.x, y: e.pos.y, z: e.pos.z, enemy: e }; }
    d = Math.max(minDist || 0, d - 0.3);
    const pt = { x: o.x + f.x * d, y: o.y + f.y * d, z: o.z + f.z * d };
    pt.y = K.groundAt(world, pt.x, pt.z, pt.y + 0.3);
    return pt;
  };

  // surface under a point (floor, crater or box top below y)
  K.groundAt = (world, x, z, y) => {
    let g = SO.Destruct ? SO.Destruct.groundY(world.arena, x, z) : 0;
    for (const b of world.arena.boxes) if (x > b.min.x && x < b.max.x && z > b.min.z && z < b.max.z && b.max.y <= y + 0.01 && b.max.y > g) g = b.max.y;
    return g;
  };

  K.aimEnemy = (world, p, range, angle, exclude) => SO.Powers.aimTarget(world, p, range, angle || 12, exclude);

  K.enemiesIn = (world, pos, r, max, exclude) => {
    const out = [];
    for (const k in world.enemies) {
      const e = world.enemies[k];
      if (exclude && exclude[e.id]) continue;
      const d = V.dist(K.center(e), pos) - e.def.radius;
      if (d <= r) out.push({ e, d });
    }
    out.sort((a, b) => a.d - b.d);
    return (max ? out.slice(0, max) : out).map((x) => x.e);
  };

  K.nearest = (world, pos, r, exclude) => K.enemiesIn(world, pos, r, 1, exclude)[0] || null;

  // Damage from a power. o: { kind, dir, push, launch, stun, stop, style, pts, from }
  K.hit = (world, p, e, dmg, o) => {
    if (!e || e.dead || dmg <= 0) return;
    o = o || {};
    let dir = o.dir;
    if (!dir) {
      const from = o.from || (p ? p.pos : e.pos);
      const dx = e.pos.x - from.x, dz = e.pos.z - from.z, l = Math.sqrt(dx * dx + dz * dz) || 1;
      dir = { x: dx / l, y: o.up || 0, z: dz / l };
    }
    world.damageEnemy(e, dmg, {
      pid: p ? p.id : null, kind: o.kind || 'power', power: true, school: o.school, dir,
      push: o.push != null ? o.push : 4, launch: o.launch, stun: o.stun != null ? o.stun : 0.3, stop: o.stop || 0,
      styleName: o.style, stylePts: o.pts || 4, noHeal: o.noHeal, dot: o.dot,
    });
  };

  // Sphere damage around pos. o.falloff: 0 = flat, 1 = zero at the edge. Returns the victims.
  K.blast = (world, p, pos, r, dmg, o) => {
    o = o || {};
    const list = K.enemiesIn(world, pos, r, o.max);
    for (const e of list) {
      const c = K.center(e);
      const d = Math.max(0, V.dist(c, pos) - e.def.radius);
      const k = 1 - (o.falloff || 0) * Math.min(1, d / r);
      const dx = c.x - pos.x, dz = c.z - pos.z, l = Math.sqrt(dx * dx + dz * dz) || 1;
      K.hit(world, p, e, dmg * k, Object.assign({ dir: { x: dx / l, y: o.up || 0.3, z: dz / l } }, o));
      // statuses remember who applied them (by) so each source can look different
      if (o.status) K.status(world, e, o.status, o.statusT || 2, Object.assign({ pid: p && p.id, by: o.by || o.kind }, o.statusData));
    }
    if (o.scenery !== false) world.emit('blast', { x: pos.x, y: pos.y, z: pos.z, r, dmg, crater: o.crater, owner: 'player' });
    return list;
  };

  // Enemies near a segment from a along dir for len, within width.
  K.lineHits = (world, a, dir, len, width) => {
    const out = [];
    for (const k in world.enemies) {
      const e = world.enemies[k];
      const c = K.center(e);
      const vx = c.x - a.x, vy = c.y - a.y, vz = c.z - a.z;
      const t = SO.clamp(vx * dir.x + vy * dir.y + vz * dir.z, 0, len);
      const px = a.x + dir.x * t - c.x, py = a.y + dir.y * t - c.y, pz = a.z + dir.z * t - c.z;
      if (Math.sqrt(px * px + py * py * 0.5 + pz * pz) <= width + e.def.radius) out.push({ e, t });
    }
    out.sort((x, y) => x.t - y.t);
    return out.map((x) => x.e);
  };

  K.coneHits = (world, p, range, angleDeg) => {
    const o = K.eye(p), f = K.fwd(p), cosA = Math.cos(angleDeg * Math.PI / 180);
    const out = [];
    for (const k in world.enemies) {
      const e = world.enemies[k];
      const c = K.center(e);
      const d = V.sub(V.v(), c, o), l = V.len(d);
      if (l - e.def.radius > range) continue;
      if (V.dot(d, f) / (l || 1) < cosA && l > e.def.radius + 1.2) continue;
      out.push(e);
    }
    return out;
  };

  // Chain from the player through up to n enemies; returns the polyline [[x,y,z], ...].
  K.chain = (world, p, first, n, range, dmg, o) => {
    const hit = {};
    const pts = [[p.pos.x, p.pos.y + CFG.EYE - 0.3, p.pos.z]];
    let cur = first, d = dmg;
    for (let i = 0; i < n && cur; i++) {
      hit[cur.id] = true;
      const c = K.center(cur);
      pts.push([c.x, c.y, c.z]);
      K.hit(world, p, cur, d, Object.assign({ dir: { x: 0, y: 1, z: 0 }, push: 2 }, o));
      if (o && o.status) K.status(world, cur, o.status, o.statusT || 2, { pid: p.id, by: o.by || o.kind });
      d *= (o && o.decay) || 0.92;
      cur = K.nearest(world, c, range, hit);
    }
    return pts;
  };

  // Generic spell projectile. See Projectiles 'spell' for the fields it understands.
  K.spell = (world, p, o) => SO.Projectiles.spawn(world, Object.assign({
    kind: 'spell', owner: 'player', pid: p ? p.id : null, radius: 0.5, dmg: 20, life: 3, pierce: 0, look: 'orb',
  }, o));

  // Lasting effect stepped by SO.Abilities.FX[kind]; its fields are sent to clients as-is.
  K.effect = (world, kind, o) => {
    const fx = Object.assign({ id: world.id(), kind, t: 0, dur: 5 }, o);
    world.effects.push(fx);
    return fx;
  };

  K.status = (world, e, name, t, data) => SO.Status.apply(world, e, name, t, data);

  K.buff = (p, name, t, data) => { p.buffs[name] = Object.assign({ t, max: t }, data); return p.buffs[name]; };

  K.heal = (world, p, amount) => {
    if (!p || p.dead || amount <= 0) return;
    const before = p.hp;
    p.hp = Math.min(p.maxHp, p.hp + amount);
    if (p.hp - before > 0.5) world.emit('heal', { pid: p.id, amount: p.hp - before });
  };

  // Visual event, purely cosmetic: { k: 'burst' | 'ring' | 'bolt' | 'beam' | 'circle' | ... }
  K.vfx = (world, k, data) => { world.emit('vfx', Object.assign({ k }, data)); };

  K.style = (world, p, name, pts) => SO.World.style(world, p, name, pts);

  // would a body of radius r / height h overlap the level at pos?
  K.blocked = (world, pos, r, h) => {
    for (const b of world.arena.boxes) {
      if (pos.x + r > b.min.x && pos.x - r < b.max.x && pos.z + r > b.min.z && pos.z - r < b.max.z && pos.y + h > b.min.y && pos.y < b.max.y) return true;
    }
    return Math.sqrt(pos.x * pos.x + pos.z * pos.z) > world.arena.radius - r;
  };

  // Moves the player up to dist along dir in small steps, stopping before walls. Returns the start.
  K.slide = (world, p, dir, dist) => {
    const from = V.clone(p.pos);
    const n = Math.ceil(dist / 0.35), next = V.v();
    for (let i = 0; i < n; i++) {
      V.addScaled(next, p.pos, dir, dist / n);
      next.y = Math.max(next.y, K.groundAt(world, next.x, next.z, next.y + 0.6));
      if (K.blocked(world, next, p.radius, p.height)) break;
      V.copy(p.pos, next);
    }
    return from;
  };

  // aim direction on the ground plane, or the way the player is moving if they are
  K.moveDir = (p) => {
    const sp = Math.sqrt(p.vel.x * p.vel.x + p.vel.z * p.vel.z);
    if (sp > 3) return { x: p.vel.x / sp, y: 0, z: p.vel.z / sp };
    return K.flat(p);
  };

  K.rand = (world, a, b) => a + world.rng() * (b - a);

  SO.Kit = K;
})(typeof window !== 'undefined' ? (window.SO = window.SO || {}) : (globalThis.SO = globalThis.SO || {}));
