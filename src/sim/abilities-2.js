// School abilities 6-10: Escudo de Energia, Meteoro, Corpo de Fogo, Raio de Plasma, Congelamento.
(function (SO) {
  'use strict';
  const V = SO.V, CFG = SO.CFG, K = SO.Kit, A = SO.Abilities;
  const C = (id) => SO.Schools.BY_ID[id].color;

  // where a hit came from, relative to the way the player faces (1 = straight ahead)
  function frontness(p, src) {
    if (!src || src.x == null) return 1;
    const dx = src.x - p.pos.x, dz = src.z - p.pos.z, l = Math.sqrt(dx * dx + dz * dz) || 1;
    const f = K.flat(p);
    return (dx * f.x + dz * f.z) / l;
  }

  // ======================= 6. ESCUDO DE ENERGIA =======================
  // Barreira Energética: hex plates assemble in front of you; they crack as they soak 300 damage.
  A.SKILL.aegis_1 = (world, p) => { K.buff(p, 'aegis_1', 3, { pool: 300 }); return true; };
  A.BUFF.aegis_1 = {
    step(world, p) {
      const f = K.flat(p);
      for (const k in world.projectiles) {
        const q = world.projectiles[k];
        if (q.owner !== 'enemy') continue;
        const dx = q.pos.x - p.pos.x, dz = q.pos.z - p.pos.z, d = Math.sqrt(dx * dx + dz * dz);
        if (d > 2.4 || (dx * f.x + dz * f.z) / (d || 1) < 0.25) continue;
        const b = p.buffs.aegis_1;
        b.pool -= q.dmg;
        SO.Projectiles.remove(world, q, 'intercept');
        K.vfx(world, 'aegis_1:crack', { pid: p.id, x: q.pos.x, y: q.pos.y, z: q.pos.z, left: Math.max(0, b.pool) / 300 });
        if (b.pool <= 0) { b.t = 0; K.vfx(world, 'aegis_1:break', { pid: p.id }); break; }
      }
    },
  };

  // Reflexo: a tight hexagon that sends shots back; in the first instant they come back harder.
  A.SKILL.aegis_2 = (world, p) => { K.buff(p, 'aegis_2', 4, {}); return true; };
  A.BUFF.aegis_2 = {
    step(world, p, b) {
      const perfect = b.max - b.t < 0.45;
      const at = { x: p.pos.x, y: p.pos.y + 1.2, z: p.pos.z };
      for (const k in world.projectiles) {
        const q = world.projectiles[k];
        if (q.owner !== 'enemy' || V.dist(q.pos, at) > 2.8) continue;
        const e = K.aimEnemy(world, p, 60, 25) || K.nearest(world, p.pos, 40);
        const dir = e ? V.norm(V.v(), V.sub(V.v(), K.center(e), q.pos)) : K.fwd(p);
        V.scale(q.vel, dir, Math.max(24, V.len(q.vel)) * (perfect ? 3.2 : 2));
        q.owner = 'player'; q.pid = p.id; q.dmg = q.dmg * (perfect ? 4.5 : 2.5) + 15; q.parried = true; q.hitSet = {}; q.homing = 0; q.life = 3;
        K.vfx(world, 'aegis_2:reflect', { pid: p.id, x: q.pos.x, y: q.pos.y, z: q.pos.z, perfect: perfect ? 1 : 0 });
        K.style(world, p, perfect ? 'REFLEXO PERFEITO' : 'REFLEXO', perfect ? 16 : 8);
      }
    },
  };

  // Campo Protetor: a ring runs along the floor and grows into a dome of hexagonal cells.
  A.SKILL.aegis_3 = (world, p) => {
    K.effect(world, 'aegis_3', { pid: p.id, x: p.pos.x, y: K.groundAt(world, p.pos.x, p.pos.z, p.pos.y + 0.5), z: p.pos.z, r: 5.5, dur: 5, pool: 300 });
    return true;
  };
  A.FX.aegis_3 = (world, fx) => {
    for (const k in world.projectiles) {
      const q = world.projectiles[k];
      if (q.owner !== 'enemy') continue;
      if (V.dist(q.pos, fx) > fx.r) continue;
      fx.pool -= q.dmg;
      SO.Projectiles.remove(world, q, 'intercept');
      K.vfx(world, 'aegis_3:hit', { fx: fx.id, x: q.pos.x, y: q.pos.y, z: q.pos.z, left: Math.max(0, fx.pool) / 300 });
    }
    if (fx.pool <= 0) { K.vfx(world, 'aegis_3:break', { x: fx.x, y: fx.y, z: fx.z, r: fx.r }); return true; }
    return fx.t >= fx.dur;
  };

  // Fortaleza Absoluta: layered armor soaks 1000; every hit fires a burst; the end releases it all.
  A.ULT.aegis_ult = {
    start(world, p, u) { K.buff(p, 'aegis_ult', u.dur, { pool: 1000, stored: 0, cool: 0 }); },
    step(world, p) { const b = p.buffs.aegis_ult; if (b) b.cool -= 1 / 60; },
    end(world, p) {
      const b = p.buffs.aegis_ult || { stored: 0 };
      delete p.buffs.aegis_ult;
      const dmg = 100 + Math.min(300, b.stored * 0.5);
      K.blast(world, p, { x: p.pos.x, y: p.pos.y + 1, z: p.pos.z }, 14, dmg, { kind: 'aegis', push: 28, launch: 10, stun: 1.4, falloff: 0.4, crater: [5, 1.2], style: 'FORTALEZA ABSOLUTA', pts: 24 });
      K.vfx(world, 'aegis_ult:release', { pid: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z, power: Math.round(dmg) });
    },
  };

  A.ON_HURT.push((world, p, dmg, src) => {
    const bar = p.buffs.aegis_1;
    if (bar && frontness(p, src) > 0.1) {
      bar.pool -= dmg;
      K.vfx(world, 'aegis_1:crack', { pid: p.id, x: src.x, y: p.pos.y + 1.4, z: src.z, left: Math.max(0, bar.pool) / 300 });
      if (bar.pool <= 0) { bar.t = 0; K.vfx(world, 'aegis_1:break', { pid: p.id }); return -bar.pool; }
      return 0;
    }
    for (const fx of world.effects) {
      if (fx.kind !== 'aegis_3' || fx.pool <= 0 || V.distXZ(p.pos, fx) > fx.r) continue;
      fx.pool -= dmg;
      K.vfx(world, 'aegis_3:hit', { fx: fx.id, x: p.pos.x, y: p.pos.y + 1.2, z: p.pos.z, left: Math.max(0, fx.pool) / 300 });
      return fx.pool >= 0 ? 0 : -fx.pool;
    }
    const fort = p.buffs.aegis_ult;
    if (fort && fort.pool > 0) {
      fort.pool -= dmg; fort.stored += dmg;
      if (fort.cool <= 0) {
        fort.cool = 0.3;
        K.blast(world, p, { x: p.pos.x, y: p.pos.y + 1, z: p.pos.z }, 4.5, 25 + dmg * 0.5, { kind: 'aegis', push: 14, stun: 0.6, falloff: 0.3, scenery: false });
        K.vfx(world, 'aegis_ult:burst', { pid: p.id, x: p.pos.x, y: p.pos.y + 1, z: p.pos.z });
      }
      return fort.pool >= 0 ? 0 : -fort.pool;
    }
    return dmg;
  });

  // ======================= 7. METEORO =======================
  // Chuva de Meteoros: three orange points grow in the sky and slam into the marked area.
  A.SKILL.meteor_1 = (world, p) => {
    const pt = K.aimPoint(world, p, 48, 4);
    for (let i = 0; i < 3; i++) {
      const a = i * 2.094 + world.rng(), r = i ? 2.6 : 0;
      const t = { x: pt.x + Math.cos(a) * r, y: K.groundAt(world, pt.x + Math.cos(a) * r, pt.z + Math.sin(a) * r, pt.y + 1), z: pt.z + Math.sin(a) * r };
      const from = { x: t.x - 9 + i * 3, y: t.y + 30, z: t.z + 6 };
      K.spell(world, p, {
        look: 'meteor_1', color: C('meteor'), pos: from, vel: V.v(), delay: i * 0.2, dir: V.norm(V.v(), V.sub(V.v(), t, from)), speed: 52, target: pt.enemy ? pt.enemy.id : 0, homing: pt.enemy ? 2.5 : 0, radius: 0.8, dmg: 0, life: 3,
        explode: { r: 3, dmg: 40, falloff: 0.3, crater: [1.7, 0.45], opts: { kind: 'meteor', push: 9, launch: 5, stun: 0.5 } }, explodeOnHit: true, onEnd: 'meteor_1',
      });
    }
    K.vfx(world, 'meteor_1:mark', { x: pt.x, y: pt.y, z: pt.z });
    return true;
  };
  A.SPELL_END.meteor_1 = (world, q) => {
    const y = K.groundAt(world, q.pos.x, q.pos.z, q.pos.y + 1);
    K.effect(world, 'meteor_1:flames', { pid: q.pid, x: q.pos.x, y, z: q.pos.z, r: 2.4, dur: 3, _acc: 0 });
  };
  A.FX['meteor_1:flames'] = (world, fx, dt) => {
    fx._acc += dt;
    if (fx._acc > 0.4) {
      fx._acc = 0;
      for (const e of K.enemiesIn(world, fx, fx.r)) if (Math.abs(e.pos.y - fx.y) < 1.5) K.status(world, e, 'burn', 2, { dps: 8, pid: fx.pid, by: 'meteor_1' });
    }
    return fx.t >= fx.dur;
  };

  // Meteoro Guiado: a spinning meteor that bends its fall toward your crosshair.
  A.SKILL.meteor_2 = (world, p) => {
    const f = K.flat(p);
    K.spell(world, p, {
      look: 'meteor_2', color: C('meteor'), pos: { x: p.pos.x + f.x * 5, y: p.pos.y + 20, z: p.pos.z + f.z * 5 }, vel: V.v(f.x * 6, -10, f.z * 6),
      dir: V.norm(V.v(), { x: f.x, y: -1.2, z: f.z }), speed: 24, steer: 2.4, radius: 1.4, dmg: 0, life: 6,
      explode: { r: 5, dmg: 70, falloff: 0.35, crater: [3, 0.9], opts: { kind: 'meteor', push: 12, launch: 8, stun: 0.8, style: 'METEORO GUIADO', pts: 10 } }, explodeOnHit: true, onEnd: 'meteor_2',
    });
    return true;
  };
  A.SPELL_END.meteor_2 = (world, q) => {
    const p = world.players[q.pid];
    for (let i = 0; i < 8; i++) {
      const a = i * 0.785 + world.rng() * 0.4;
      K.spell(world, p, {
        look: 'meteor_2:frag', color: C('meteor'), pos: { x: q.pos.x, y: q.pos.y + 0.8, z: q.pos.z }, vel: V.v(Math.cos(a) * 13, 9 + world.rng() * 5, Math.sin(a) * 13),
        grav: 26, radius: 0.5, dmg: 12, life: 2, status: { name: 'burn', t: 3, data: { dps: 6, by: 'meteor_2' } }, hit: { kind: 'meteor', push: 4, stun: 0.3 },
      });
    }
  };

  // Impacto Celeste: a growing shadow, an orange sky, a burning boulder and a shockwave.
  A.SKILL.meteor_3 = (world, p) => {
    const pt = K.aimPoint(world, p, 55, 5);
    K.effect(world, 'meteor_3', { pid: p.id, x: pt.x, y: K.groundAt(world, pt.x, pt.z, pt.y + 0.5), z: pt.z, dur: 1.5, r: 8, scale: 1, done: 0 });
    return true;
  };
  A.FX.meteor_3 = (world, fx) => {
    if (fx.t >= fx.dur && !fx.done) {
      fx.done = 1;
      const big = fx.scale > 1;
      K.blast(world, world.players[fx.pid], { x: fx.x, y: fx.y + 1, z: fx.z }, fx.r, big ? 500 : 150,
        { kind: 'meteor', push: big ? 26 : 16, launch: big ? 20 : 16, stun: 1.4, falloff: 0.5, crater: big ? [11, 3.2] : [6, 1.8], style: big ? 'TEMPESTADE ASTRAL' : 'IMPACTO CELESTE', pts: big ? 30 : 16 });
      K.vfx(world, 'meteor_3:impact', { x: fx.x, y: fx.y, z: fx.z, big: big ? 1 : 0 });
      return true;
    }
    return false;
  };

  // Tempestade Astral: dozens of meteors (thicker where you aim), then a colossal one.
  A.ULT.meteor_ult = {
    start(world, p, u) { u.acc = 0; K.effect(world, 'meteor_ult', { pid: p.id, x: p.pos.x, y: 0, z: p.pos.z, dur: u.dur + 2 }); },
    step(world, p, u, dt) {
      u.acc += dt;
      while (u.acc > 0.2) {
        u.acc -= 0.2;
        let t;
        if (world.rng() < 0.6) { const pt = K.aimPoint(world, p, 60, 6); const a = world.rng() * 6.28, r = world.rng() * 7; t = { x: pt.x + Math.cos(a) * r, z: pt.z + Math.sin(a) * r }; }
        else { const list = K.enemiesIn(world, p.pos, 38); const e = list[(world.rng() * list.length) | 0]; if (e) t = { x: e.pos.x, z: e.pos.z }; else { const a = world.rng() * 6.28; t = { x: Math.cos(a) * 25, z: Math.sin(a) * 25 }; } }
        t.y = K.groundAt(world, t.x, t.z, 30);
        const from = { x: t.x - 12, y: t.y + 40, z: t.z + 8 };
        K.spell(world, p, {
          look: 'meteor_ult', color: C('meteor'), pos: from, vel: V.v(), dir: V.norm(V.v(), V.sub(V.v(), t, from)), speed: 58, radius: 1, dmg: 0, life: 3,
          explode: { r: 3.6, dmg: 50, falloff: 0.35, crater: [2.4, 0.7], opts: { kind: 'meteor', push: 10, launch: 7, stun: 0.6 } }, explodeOnHit: true,
        });
      }
    },
    end(world, p) {
      const pt = K.aimPoint(world, p, 60, 6);
      K.effect(world, 'meteor_3', { pid: p.id, x: pt.x, y: K.groundAt(world, pt.x, pt.z, pt.y + 0.5), z: pt.z, dur: 1.9, r: 13, scale: 3, done: 0, finale: 1 });
    },
  };

  // ======================= 8. CORPO DE FOGO =======================
  // Aura Flamejante: flames climb from your feet and burn whatever stays near for 5 s.
  A.SKILL.fire_1 = (world, p) => { K.buff(p, 'fire_1', 5, { acc: 0 }); return true; };
  A.BUFF.fire_1 = {
    step(world, p, b, dt) {
      b.acc += dt;
      if (b.acc < 0.25) return;
      b.acc = 0;
      for (const e of K.enemiesIn(world, { x: p.pos.x, y: p.pos.y + 1, z: p.pos.z }, 3.8)) {
        K.hit(world, p, e, 5, { kind: 'fire', push: 1.5, stun: 0.05, dot: true });
        K.status(world, e, 'burn', 1.5, { dps: 6, pid: p.id, by: 'fire_1' });
      }
    },
  };

  // Impulso Ígneo: you become a fire bolt for a moment, through enemies, even in the air.
  A.SKILL.fire_2 = (world, p) => {
    const f = SO.forward(p.yaw, SO.clamp(p.pitch, -0.4, 0.4), V.v());
    const a = { x: p.pos.x, y: p.pos.y + 1, z: p.pos.z };
    K.slide(world, p, f, 15);
    const b = { x: p.pos.x, y: p.pos.y + 1, z: p.pos.z };
    const len = V.dist(a, b), ld = V.norm(V.v(), V.sub(V.v(), b, a));
    for (const e of K.lineHits(world, a, ld, len, 2.4)) {
      K.hit(world, p, e, 60, { kind: 'fire', dir: { x: ld.x, y: 0.3, z: ld.z }, push: 10, launch: 6, stun: 0.7, stop: 0.05, style: 'IMPULSO ÍGNEO', pts: 7 });
      K.status(world, e, 'burn', 3, { dps: 8, pid: p.id, by: 'fire_2' });
    }
    p.vel.x = ld.x * 24; p.vel.z = ld.z * 24; p.vel.y = Math.max(p.vel.y, ld.y * 20 + 2);
    p.invuln = Math.max(p.invuln, 0.35);
    K.effect(world, 'fire_2', { pid: p.id, x: a.x, y: a.y, z: a.z, bx: b.x, by: b.y, bz: b.z, dur: 2.5, _acc: 0 });
    return true;
  };
  A.FX.fire_2 = (world, fx, dt) => {
    fx._acc += dt;
    if (fx._acc > 0.3) {
      fx._acc = 0;
      const a = { x: fx.x, y: fx.y, z: fx.z }, b = { x: fx.bx, y: fx.by, z: fx.bz };
      const len = V.dist(a, b), d = V.norm(V.v(), V.sub(V.v(), b, a));
      if (len > 0.5) for (const e of K.lineHits(world, a, d, len, 1.4)) K.status(world, e, 'burn', 2, { dps: 6, pid: fx.pid, by: 'fire_2' });
    }
    return fx.t >= fx.dur;
  };

  // Explosão Corporal: your silhouette goes white-hot, orange cracks open, then you burst.
  A.SKILL.fire_3 = (world, p) => { K.buff(p, 'fire_3', 0.55, { speed: 0.6 }); return true; };
  A.BUFF.fire_3 = {
    end(world, p) {
      K.blast(world, p, { x: p.pos.x, y: p.pos.y + 1, z: p.pos.z }, 7, 120, { kind: 'fire', push: 18, launch: 8, stun: 0.9, falloff: 0.35, crater: [3.2, 0.8], status: 'burn', statusT: 4, statusData: { dps: 10, by: 'fire_3' }, style: 'EXPLOSÃO CORPORAL', pts: 12 });
      K.vfx(world, 'fire_3:burst', { pid: p.id, x: p.pos.x, y: p.pos.y + 1, z: p.pos.z });
    },
  };

  // Fênix Viva: wings of fire; faster, burning blows, and one explosive dive (F again or a slam).
  A.ULT.fire_ult = {
    start(world, p, u) { K.buff(p, 'fire_ult', u.dur, { speed: 1.35, dmg: 1.15, acc: 0 }); u.dove = false; },
    press(world, p, u) {
      if (u.dove || u.diving) return;
      u.diving = true;
      if (p.grounded) { p.vel.y = 20; p.grounded = false; }
      u.diveAt = u.t + (p.grounded ? 0.35 : 0.05);
      K.vfx(world, 'fire_ult:rise', { pid: p.id });
    },
    step(world, p, u) {
      if (u.diving && !p.slamming && u.t >= u.diveAt) {
        p.slamming = true; p.meteor = true; p.slamStartY = p.pos.y + 12; p.vel.x *= 0.3; p.vel.z *= 0.3; p.vel.y = -60;
      }
    },
    end(world, p) {
      delete p.buffs.fire_ult;
      K.blast(world, p, { x: p.pos.x, y: p.pos.y + 1, z: p.pos.z }, 8, 80, { kind: 'fire', push: 16, launch: 6, stun: 0.8, falloff: 0.4, status: 'burn', statusT: 3, statusData: { dps: 10, by: 'fire_ult' }, crater: [3, 0.6] });
      K.vfx(world, 'fire_ult:close', { pid: p.id, x: p.pos.x, y: p.pos.y + 1, z: p.pos.z });
    },
  };
  A.BUFF.fire_ult = {
    step(world, p, b, dt) {
      b.acc += dt;
      if (b.acc < 0.5) return;
      b.acc = 0;
      for (const e of K.enemiesIn(world, { x: p.pos.x, y: p.pos.y + 1, z: p.pos.z }, 3)) K.status(world, e, 'burn', 1.5, { dps: 10, pid: p.id, by: 'fire_ult' });
    },
  };
  A.ON_MELEE.push((world, p, e) => { if (p.buffs.fire_ult && !e.dead) K.status(world, e, 'burn', 3, { dps: 12, pid: p.id, by: 'fire_ult' }); });
  A.ON_SLAM.push((world, p) => {
    const u = p.ult;
    if (!u || u.id !== 'fire_ult' || u.dove) return;
    u.dove = true; u.diving = false;
    K.blast(world, p, { x: p.pos.x, y: p.pos.y + 0.8, z: p.pos.z }, 9.5, 300, { kind: 'fire', push: 22, launch: 16, stun: 1.4, falloff: 0.45, crater: [6.5, 1.8], status: 'burn', statusT: 4, statusData: { dps: 12, by: 'fire_ult' }, style: 'MERGULHO DA FÊNIX', pts: 26 });
    K.vfx(world, 'fire_ult:dive', { pid: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z });
  });

  // ======================= 9. RAIO DE PLASMA =======================
  function handPos(p, side) {
    const f = K.fwd(p), r = { x: Math.cos(p.yaw), z: -Math.sin(p.yaw) };
    return { x: p.pos.x + f.x * 0.8 + r.x * 0.25 * side, y: p.pos.y + CFG.EYE - 0.3 + f.y * 0.8, z: p.pos.z + f.z * 0.8 + r.z * 0.25 * side };
  }

  // Disparo de Plasma: a violet bolt with crackling sparks; goes through one enemy.
  A.SKILL.plasma_1 = (world, p) => {
    const f = K.fwd(p);
    K.spell(world, p, {
      look: 'plasma_1', color: C('plasma'), pos: handPos(p, -1), vel: V.v(f.x * 95, f.y * 95, f.z * 95), speed: 95, radius: 0.5, dmg: 30, pierce: 1, life: 1.3, aimAtLaunch: true,
      hit: { kind: 'plasma', push: 6, stun: 0.4, stop: 0.03, style: 'PLASMA', pts: 4 },
    });
    return true;
  };

  // Corrente Elétrica: the bolt forks into jagged arcs across up to four enemies.
  A.SKILL.plasma_2 = (world, p) => {
    const first = K.aimEnemy(world, p, 32, 16) || K.nearest(world, p.pos, 14);
    if (!first) return false;
    const pts = K.chain(world, p, first, 4, 11, 45, { kind: 'plasma', decay: 1, stun: 0.8, stop: 0.03, style: 'CORRENTE', pts: 5, status: 'shock', statusT: 0.6 });
    pts[0] = [handPos(p, -1).x, handPos(p, -1).y, handPos(p, -1).z];
    K.vfx(world, 'plasma_2:arc', { pid: p.id, pts });
    return true;
  };

  // Feixe Contínuo: three rings spin up in front of the hand and fuse into a steady beam.
  A.SKILL.plasma_3 = (world, p) => { K.buff(p, 'plasma_3', 2.7, { speed: 0.7, acc: 0, sc: 0, warm: 0.2 }); return true; };
  A.BUFF.plasma_3 = {
    step(world, p, b, dt) {
      b.warm -= dt;
      if (b.warm > 0) return;
      const o = handPos(p, -1), f = K.fwd(p);
      const len = world.raycast(o, f, 50);
      b.ex = o.x + f.x * len; b.ey = o.y + f.y * len; b.ez = o.z + f.z * len;
      b.acc += dt;
      if (b.acc >= 0.1) {
        b.acc = 0;
        for (const e of K.lineHits(world, o, f, len, 1.1)) K.hit(world, p, e, 10, { kind: 'plasma', dir: { x: f.x, y: 0, z: f.z }, push: 1.5, stun: 0.12, dot: true, style: 'FEIXE', pts: 1 });
      }
      b.sc -= dt;
      if (b.sc <= 0 && len < 49) { b.sc = 0.2; world.emit('blast', { x: b.ex, y: b.ey, z: b.ez, r: 1.6, dmg: 60, owner: 'player' }); }
    },
  };

  // Aniquilação: an orbital cannon column that follows your crosshair across the arena.
  A.ULT.plasma_ult = {
    start(world, p, u) {
      const pt = K.aimPoint(world, p, 70, 6);
      u.fx = K.effect(world, 'plasma_ult', { pid: p.id, x: pt.x, y: K.groundAt(world, pt.x, pt.z, pt.y + 0.5), z: pt.z, r: 3.6, dur: u.dur + 0.1, _acc: 0, _sc: 0 });
    },
    step(world, p, u, dt) {
      const fx = u.fx;
      const pt = K.aimPoint(world, p, 80, 6);
      const dx = pt.x - fx.x, dz = pt.z - fx.z, l = Math.sqrt(dx * dx + dz * dz);
      const mv = Math.min(l, 9 * dt);
      if (l > 0.01) { fx.x += dx / l * mv; fx.z += dz / l * mv; }
      fx.y = K.groundAt(world, fx.x, fx.z, 40);
      fx._acc += dt;
      if (fx._acc >= 0.1) {
        fx._acc = 0;
        for (const e of K.enemiesIn(world, { x: fx.x, y: fx.y + 3, z: fx.z }, fx.r + 1.5)) {
          if (V.distXZ(e.pos, fx) > fx.r + e.def.radius) continue;
          K.hit(world, p, e, 13, { kind: 'plasma', from: fx, push: 3, stun: 0.2, dot: true, style: 'ANIQUILAÇÃO', pts: 1 });
        }
      }
      fx._sc -= dt;
      if (fx._sc <= 0) { fx._sc = 0.45; world.emit('blast', { x: fx.x, y: fx.y, z: fx.z, r: 3.6, dmg: 90, crater: [2.2, 0.5], owner: 'player' }); }
    },
    end(world, p, u) {
      const fx = u.fx;
      K.blast(world, p, { x: fx.x, y: fx.y + 1, z: fx.z }, 8, 150, { kind: 'plasma', push: 20, launch: 12, stun: 1.2, falloff: 0.45, crater: [6, 1.8], style: 'ANIQUILAÇÃO', pts: 20 });
      K.vfx(world, 'plasma_ult:blast', { x: fx.x, y: fx.y, z: fx.z });
    },
  };

  // ======================= 10. CONGELAMENTO =======================
  // Estaca de Gelo: crystals gather into a stake; it slows, and shatters frozen targets.
  A.SKILL.ice_1 = (world, p) => {
    const f = K.fwd(p);
    K.spell(world, p, {
      look: 'ice_1', color: C('ice'), pos: handPos(p, -1), vel: V.v(f.x * 70, f.y * 70, f.z * 70), speed: 70, radius: 0.55, dmg: 35, pierce: 0, life: 1.6, aimAtLaunch: true, on: 'ice_1',
      hit: { kind: 'ice', push: 5, stun: 0.3, stop: 0.04, style: 'ESTACA DE GELO', pts: 4 },
    });
    return true;
  };
  A.SPELL_HIT.ice_1 = (world, q, e) => {
    if (e.dead) return;
    if (SO.Status.has(e, 'freeze')) {
      SO.Status.clear(e, 'freeze');
      K.hit(world, world.players[q.pid], e, 35, { kind: 'shatter', push: 8, stun: 0.6, style: 'ESTILHAÇO', pts: 10 });
      const c = K.center(e);
      K.vfx(world, 'ice_1:shatter', { x: c.x, y: c.y, z: c.z, h: e.def.height });
    } else K.status(world, e, 'slow', 3, { k: 0.5, pid: q.pid, by: 'ice_1' });
  };

  // Onda Fria: a sheet of ice races over the floor in front of you, raising crystal spikes.
  A.SKILL.ice_2 = (world, p) => {
    K.effect(world, 'ice_2', { pid: p.id, x: p.pos.x, y: K.groundAt(world, p.pos.x, p.pos.z, p.pos.y + 0.5), z: p.pos.z, yaw: p.yaw, r: 0, maxR: 15, arc: 1.25, dur: 0.75, _hit: {} });
    return true;
  };
  A.FX.ice_2 = (world, fx) => {
    fx.r = fx.maxR * Math.min(1, fx.t / 0.6);
    const p = world.players[fx.pid];
    const fxz = { x: -Math.sin(fx.yaw), z: -Math.cos(fx.yaw) };
    for (const k in world.enemies) {
      const e = world.enemies[k];
      if (fx._hit[e.id]) continue;
      const dx = e.pos.x - fx.x, dz = e.pos.z - fx.z, d = Math.sqrt(dx * dx + dz * dz);
      if (d > fx.r + e.def.radius || e.pos.y - fx.y > 3.5) continue;
      if ((dx * fxz.x + dz * fxz.z) / (d || 1) < Math.cos(fx.arc / 2 + 0.25) && d > 1.5) continue;
      fx._hit[e.id] = 1;
      K.hit(world, p, e, 60, { kind: 'ice', push: 4, stun: 0.5, stop: 0.03, style: 'ONDA FRIA', pts: 5 });
      if (!e.dead) K.status(world, e, e.def.big ? 'slow' : 'freeze', e.def.big ? 3 : 2, { k: 0.45, pid: fx.pid, by: 'ice_2' });
    }
    return fx.t >= fx.dur;
  };

  // Prisão Glacial: six ice pillars rise and lock together around the target; it bursts on release.
  A.SKILL.ice_3 = (world, p) => {
    const e = K.aimEnemy(world, p, 42, 14) || K.nearest(world, p.pos, 12);
    if (!e) return false;
    K.status(world, e, 'freeze', 5, { by: 'ice_3', pid: p.id, onEnd: 'ice_3', taken: 0 });
    if (e.def.boss) K.status(world, e, 'slow', 5, { k: 0.3, by: 'ice_3', pid: p.id });
    return true;
  };
  A.STATUS_END.ice_3 = (world, e, s) => {
    const c = K.center(e);
    K.blast(world, world.players[s.pid], c, 5, 50, { kind: 'ice', push: 10, stun: 0.6, falloff: 0.3, status: 'slow', statusT: 2.5, statusData: { k: 0.5, by: 'ice_3' } });
    K.vfx(world, 'ice_3:burst', { x: c.x, y: c.y, z: c.z, h: e.def.height });
  };
  A.ON_DAMAGE.push((world, p, e, amount, src) => {
    const f = e.st && e.st.freeze;
    if (f && f.by === 'ice_3' && !src.dot) { f.taken = (f.taken || 0) + amount; if (f.taken > 90) f.t = 0; }
  });

  // Era do Gelo: snow, blue light and spikes; the arena's enemies turn to crystal. Breaking one
  // sets off its neighbours.
  A.ULT.ice_ult = {
    start(world, p, u) { u.acc = 1; K.effect(world, 'ice_ult', { pid: p.id, x: p.pos.x, y: 0, z: p.pos.z, dur: u.dur + 0.3 }); },
    step(world, p, u, dt) {
      u.acc += dt;
      if (u.acc < 0.5) return;
      u.acc = 0;
      for (const e of K.enemiesIn(world, p.pos, 45)) {
        if (e.def.boss) K.status(world, e, 'slow', 1, { k: 0.3, by: 'ice_ult', pid: p.id });
        else if (!SO.Status.has(e, 'freeze')) K.status(world, e, 'freeze', u.dur - u.t + 0.1, { by: 'ice_ult', pid: p.id });
      }
    },
    end(world, p) {
      for (const k in world.enemies) {
        const e = world.enemies[k];
        if (!e.st || !e.st.freeze || e.st.freeze.by !== 'ice_ult') continue;
        shatterCrystal(world, p, e, 100);
      }
      K.vfx(world, 'ice_ult:thaw', { pid: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z });
    },
  };
  function shatterCrystal(world, p, e, dmg) {
    SO.Status.clear(e, 'freeze');
    const c = K.center(e);
    K.vfx(world, 'ice_ult:shatter', { x: c.x, y: c.y, z: c.z, h: e.def.height });
    K.hit(world, p, e, dmg, { kind: 'shatter', push: 10, launch: 6, stun: 0.8, style: 'CRISTAL', pts: 8 });
    // neighbours in crystal go next, a beat later
    for (const n of K.enemiesIn(world, c, 5.5)) {
      if (n === e || !n.st || !n.st.freeze || n.st.freeze.by !== 'ice_ult' || n.st.freeze.chain) continue;
      n.st.freeze.chain = 1;
      n.st.freeze.t = Math.min(n.st.freeze.t, 0.18);
      n.st.freeze.onEnd = 'ice_ult';
    }
  }
  A.STATUS_END.ice_ult = (world, e, s) => { if (!e.dead) shatterCrystal(world, world.players[s.pid], e, 60); };
  A.ON_DAMAGE.push((world, p, e, amount, src) => {
    const f = e.st && e.st.freeze;
    if (f && f.by === 'ice_ult' && src.kind !== 'shatter' && !src.dot && !e.dead) shatterCrystal(world, p, e, 60);
  });
})(typeof window !== 'undefined' ? (window.SO = window.SO || {}) : (globalThis.SO = globalThis.SO || {}));
