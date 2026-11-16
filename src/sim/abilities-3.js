// School abilities 11-15: Gravidade, Rajada de Balas, Lança de Energia, Clones Sombrios, Vento Cortante.
(function (SO) {
  'use strict';
  const V = SO.V, CFG = SO.CFG, K = SO.Kit, A = SO.Abilities;
  const C = (id) => SO.Schools.BY_ID[id].color;

  function handPos(p, side) {
    const f = K.fwd(p), r = { x: Math.cos(p.yaw), z: -Math.sin(p.yaw) };
    return { x: p.pos.x + f.x * 0.8 + r.x * 0.25 * side, y: p.pos.y + CFG.EYE - 0.3 + f.y * 0.8, z: p.pos.z + f.z * 0.8 + r.z * 0.25 * side };
  }
  function pullTo(e, at, strength, dt, lift) {
    const c = K.center(e), dx = at.x - c.x, dy = at.y - c.y, dz = at.z - c.z, d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
    const k = strength * e.def.knock + 3;
    e.vel.x += dx / d * k * dt * 4; e.vel.z += dz / d * k * dt * 4;
    if (lift && e.def.ground) { e.vel.y = Math.max(e.vel.y, lift); e.grounded = false; e.juggle = 0.4; } else e.vel.y += dy / d * k * dt * 3;
    e.stun = Math.max(e.stun, 0.15);
    return d;
  }

  // ======================= 11. GRAVIDADE =======================
  // Puxão: space curves into violet lines and everything nearby is dragged to the point.
  A.SKILL.gravity_1 = (world, p) => {
    const pt = K.aimPoint(world, p, 32, 4);
    K.effect(world, 'gravity_1', { pid: p.id, x: pt.x, y: K.groundAt(world, pt.x, pt.z, pt.y + 0.5) + 1.2, z: pt.z, r: 11, dur: 0.75 });
    return true;
  };
  A.FX.gravity_1 = (world, fx, dt) => {
    for (const e of K.enemiesIn(world, fx, fx.r)) { const d = pullTo(e, fx, 60, dt, 0); if (d < 1.5) { e.vel.x *= 0.5; e.vel.z *= 0.5; } }
    return fx.t >= fx.dur;
  };

  // Campo Gravitacional: rings spin around a dark core; enemies and rubble float for 6 s.
  A.SKILL.gravity_2 = (world, p) => {
    const pt = K.aimPoint(world, p, 32, 4);
    K.effect(world, 'gravity_2', { pid: p.id, x: pt.x, y: K.groundAt(world, pt.x, pt.z, pt.y + 0.5), z: pt.z, r: 7.5, dur: 6 });
    return true;
  };
  A.FX.gravity_2 = (world, fx) => {
    for (const e of K.enemiesIn(world, { x: fx.x, y: fx.y + 2, z: fx.z }, fx.r)) K.status(world, e, 'float', 0.35, { h: 2.6 + (e.id % 3) * 0.6, pid: fx.pid, by: 'gravity_2' });
    return fx.t >= fx.dur;
  };

  // Esmagamento: a sigil appears above each target, then an invisible column crushes them down.
  A.SKILL.gravity_3 = (world, p) => {
    const pt = K.aimPoint(world, p, 38, 4);
    const list = K.enemiesIn(world, { x: pt.x, y: pt.y + 1, z: pt.z }, 7, 6);
    if (!list.length) return false;
    for (const e of list) K.status(world, e, 'mark', 0.5, { by: 'gravity_3', pid: p.id, onEnd: 'gravity_3' });
    return true;
  };
  A.STATUS_END.gravity_3 = (world, e, s) => {
    if (e.dead) return;
    const p = world.players[s.pid];
    e.vel.y = -42; e.grounded = false;
    K.hit(world, p, e, 100, { kind: 'gravity', dir: { x: 0, y: -1, z: 0 }, push: 0, stun: 1.3, stop: 0.07, style: 'ESMAGAMENTO', pts: 10 });
    const y = K.groundAt(world, e.pos.x, e.pos.z, e.pos.y + 0.5);
    world.emit('blast', { x: e.pos.x, y, z: e.pos.z, r: 2.2, dmg: 90, crater: [1.9, 0.6], owner: 'player' });
    K.vfx(world, 'gravity_3:crush', { x: e.pos.x, y, z: e.pos.z, top: e.pos.y + e.def.height });
  };

  // Colapso Gravitacional: a singularity that swallows enemies, shots and debris, growing until it bursts.
  A.ULT.gravity_ult = {
    start(world, p, u) {
      const pt = K.aimPoint(world, p, 38, 6);
      u.fx = K.effect(world, 'gravity_ult', { pid: p.id, x: pt.x, y: K.groundAt(world, pt.x, pt.z, pt.y + 0.5) + 3.5, z: pt.z, mass: 0, r: 16, dur: u.dur + 0.1, _acc: 0 });
    },
    step(world, p, u, dt) {
      const fx = u.fx;
      fx.r = 16 + fx.mass * 0.4;
      const core = 2.5 + fx.mass * 0.12;
      fx._acc += dt;
      const tick = fx._acc >= 0.25;
      if (tick) fx._acc = 0;
      for (const e of K.enemiesIn(world, fx, fx.r)) {
        const d = pullTo(e, fx, 36, dt, 0);
        if (tick && d < core + 1.5) { K.hit(world, p, e, 4, { kind: 'gravity', from: fx, push: 0, stun: 0.3, dot: true }); fx.mass += 0.2; }
      }
      for (const k in world.projectiles) {
        const q = world.projectiles[k];
        if (q.owner !== 'enemy' || V.dist(q.pos, fx) > fx.r) continue;
        const d = V.norm(V.v(), V.sub(V.v(), fx, q.pos));
        V.addScaled(q.vel, q.vel, d, 60 * dt);
        if (V.dist(q.pos, fx) < core) { SO.Projectiles.remove(world, q, 'intercept'); fx.mass += 1; K.vfx(world, 'gravity_ult:eat', { x: fx.x, y: fx.y, z: fx.z }); }
      }
    },
    end(world, p, u) {
      const fx = u.fx;
      const dmg = Math.min(400, 180 + fx.mass * 14);
      K.blast(world, p, fx, 9 + Math.min(6, fx.mass * 0.25), dmg, { kind: 'gravity', push: 30, launch: 16, stun: 1.6, falloff: 0.5, crater: [7, 2], style: 'COLAPSO GRAVITACIONAL', pts: 28 });
      K.vfx(world, 'gravity_ult:burst', { x: fx.x, y: fx.y, z: fx.z, mass: fx.mass });
    },
  };

  // ======================= 12. RAJADA DE BALAS =======================
  function bullet(world, p, look, dmg, speed, spread, extra) {
    const f = K.fwd(p);
    const s1 = (world.rng() - 0.5) * spread, s2 = (world.rng() - 0.5) * spread;
    const d = V.norm(V.v(), { x: f.x + s1, y: f.y + s2, z: f.z - s1 * 0.5 });
    return K.spell(world, p, Object.assign({
      look, color: C('bullets'), pos: handPos(p, -1), vel: V.v(d.x * speed, d.y * speed, d.z * speed), speed, radius: 0.35, dmg, pierce: 0, life: 0.9,
      hit: { kind: 'bullet', push: 2.5, stun: 0.15, stop: 0.01, style: 'RAJADA', pts: 1 },
    }, extra));
  }

  // Disparo Rápido: five red shots in a row, fine during dashes and jumps.
  A.SKILL.bullets_1 = (world, p) => { K.buff(p, 'bullets_1', 0.36, { n: 0, acc: 0.07 }); return true; };
  A.BUFF.bullets_1 = {
    step(world, p, b, dt) {
      b.acc += dt;
      while (b.acc >= 0.07 && b.n < 5) { b.acc -= 0.07; b.n++; bullet(world, p, 'bullets_1', 25, 160, 0.02); K.vfx(world, 'bullets_1:shot', { pid: p.id, n: b.n }); }
    },
  };

  // Balas Buscadoras: bullets hang in the air in front of you, then curve into their targets.
  A.SKILL.bullets_2 = (world, p) => {
    const used = {};
    const f = K.fwd(p), r = { x: Math.cos(p.yaw), z: -Math.sin(p.yaw) };
    for (let i = 0; i < 5; i++) {
      const e = K.aimEnemy(world, p, 50, 40, used) || K.nearest(world, p.pos, 40, used) || K.aimEnemy(world, p, 50, 40);
      if (e) used[e.id] = 1;
      const off = { x: f.x * 1.6 + r.x * (i - 2) * 0.55, y: CFG.EYE - 0.1 + Math.abs(i - 2) * -0.12, z: f.z * 1.6 + r.z * (i - 2) * 0.55 };
      K.spell(world, p, {
        look: 'bullets_2', color: C('bullets'), pos: { x: p.pos.x + off.x, y: p.pos.y + off.y, z: p.pos.z + off.z }, vel: V.v(), delay: 0.38 + i * 0.06, follow: off,
        target: e ? e.id : 0, homing: 7, retarget: 30, speed: 70, aimAtLaunch: true, radius: 0.45, dmg: 60, pierce: 0, life: 3,
        hit: { kind: 'bullet', push: 6, stun: 0.5, stop: 0.03, style: 'BALA BUSCADORA', pts: 5 },
      });
    }
    return true;
  };

  // Metralhadora: the barrel glows white-hot and spits an almost continuous red line for 3 s.
  A.SKILL.bullets_3 = (world, p) => { K.buff(p, 'bullets_3', 3, { speed: 0.8, acc: 0, heat: 0 }); return true; };
  A.BUFF.bullets_3 = {
    step(world, p, b, dt) {
      b.acc += dt; b.heat = Math.min(1, b.heat + dt / 1.5);
      while (b.acc >= 1 / 12) { b.acc -= 1 / 12; bullet(world, p, 'bullets_3', 10, 140, 0.05); }
    },
  };

  // Chuva de Projéteis: red circles open in the air and a storm of bullets falls on the enemies.
  A.ULT.bullets_ult = {
    start(world, p, u) { u.acc = 0; K.effect(world, 'bullets_ult', { pid: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z, dur: u.dur + 0.5 }); },
    step(world, p, u, dt) {
      u.acc += dt;
      while (u.acc >= 0.05) {
        u.acc -= 0.05;
        const list = K.enemiesIn(world, p.pos, 42);
        if (!list.length) break;
        const marked = list.filter((e) => e.st && e.st.mark && e.st.mark.by === 'bullets_ult');
        const pool = marked.length && world.rng() < 0.65 ? marked : list;
        const e = pool[(world.rng() * pool.length) | 0];
        const c = K.center(e);
        const from = { x: c.x + K.rand(world, -2.5, 2.5), y: c.y + 24, z: c.z + K.rand(world, -2.5, 2.5) };
        K.spell(world, p, {
          look: 'bullets_ult', color: C('bullets'), pos: from, vel: V.v(), dir: V.norm(V.v(), V.sub(V.v(), c, from)), speed: 110, target: e.id, homing: 4,
          radius: 0.45, dmg: 12, pierce: 0, life: 0.6, hit: { kind: 'bullet', push: 1.5, stun: 0.1, style: 'CHUVA', pts: 0.5 },
        });
      }
    },
  };
  A.ON_DAMAGE.push((world, p, e, amount, src) => { if (p.ult && p.ult.id === 'bullets_ult' && src.kind !== 'bullet' && !e.dead) K.status(world, e, 'mark', 5, { by: 'bullets_ult', pid: p.id }); });

  // ======================= 13. LANÇA DE ENERGIA =======================
  // Arremesso: cyan particles gather into a spinning spear; it runs through common enemies.
  A.SKILL.spear_1 = (world, p) => {
    const f = K.fwd(p);
    K.spell(world, p, {
      look: 'spear_1', color: C('spear'), pos: handPos(p, 1), vel: V.v(f.x * 78, f.y * 78, f.z * 78), speed: 78, radius: 0.65, dmg: 50, pierce: 20, pierceBig: false, life: 1.4, aimAtLaunch: true,
      hit: { kind: 'spear', push: 8, stun: 0.5, stop: 0.04, style: 'ARREMESSO', pts: 5 },
    });
    return true;
  };

  // Investida: a cone of light on the spear tip as you drive through the line.
  A.SKILL.spear_2 = (world, p) => {
    const f = SO.forward(p.yaw, SO.clamp(p.pitch, -0.3, 0.3), V.v());
    const a = { x: p.pos.x, y: p.pos.y + 1.1, z: p.pos.z };
    K.slide(world, p, f, 13);
    const b = { x: p.pos.x, y: p.pos.y + 1.1, z: p.pos.z };
    const len = V.dist(a, b), d = V.norm(V.v(), V.sub(V.v(), b, a));
    for (const e of K.lineHits(world, a, d, len + 1.5, 2.1)) K.hit(world, p, e, 80, { kind: 'spear', dir: { x: d.x, y: 0.3, z: d.z }, push: 22, launch: 6, stun: 0.9, stop: 0.07, style: 'INVESTIDA', pts: 8 });
    p.vel.x = d.x * 20; p.vel.z = d.z * 20;
    p.invuln = Math.max(p.invuln, 0.3);
    K.vfx(world, 'spear_2:charge', { pid: p.id, ax: a.x, ay: a.y, az: a.z, bx: b.x, by: b.y, bz: b.z });
    return true;
  };

  // Multiplicação: the spear breaks into glowing segments that become five hunting spears.
  A.SKILL.spear_3 = (world, p) => {
    const f = K.fwd(p);
    K.spell(world, p, { look: 'spear_3', color: C('spear'), pos: handPos(p, 1), vel: V.v(f.x * 40, f.y * 40, f.z * 40), speed: 40, radius: 0.6, dmg: 24, pierce: 0, life: 0.3, onEnd: 'spear_3' });
    return true;
  };
  A.SPELL_END.spear_3 = (world, q) => {
    const p = world.players[q.pid];
    if (!p) return;
    const list = K.enemiesIn(world, q.pos, 35, 5);
    K.vfx(world, 'spear_3:split', { x: q.pos.x, y: q.pos.y, z: q.pos.z });
    for (let i = 0; i < 5; i++) {
      const e = list.length ? list[i % list.length] : null;
      const a = (i - 2) * 0.35;
      const d = V.norm(V.v(), q.vel);
      K.spell(world, p, {
        look: 'spear_3:shard', color: C('spear'), pos: V.clone(q.pos), vel: V.v((d.x * Math.cos(a) - d.z * Math.sin(a)) * 30, d.y * 30 + 4, (d.x * Math.sin(a) + d.z * Math.cos(a)) * 30),
        target: e ? e.id : 0, homing: 6, retarget: 25, speed: 60, radius: 0.5, dmg: 24, pierce: 0, life: 2.5,
        hit: { kind: 'spear', push: 5, stun: 0.4, stop: 0.02, style: 'MULTIPLICAÇÃO', pts: 3 },
      });
    }
  };

  // Lança Dimensional: cyan circles align, a giant spear crosses the whole arena, a rift stays.
  A.ULT.spear_ult = {
    start(world, p, u) {
      const f = SO.forward(p.yaw, SO.clamp(p.pitch, -0.15, 0.15), V.v());
      const a = { x: p.pos.x + f.x * 2, y: p.pos.y + 1.3, z: p.pos.z + f.z * 2 };
      u.fx = K.effect(world, 'spear_ult', { pid: p.id, x: a.x, y: a.y, z: a.z, dx: f.x, dy: f.y, dz: f.z, len: 95, dur: u.dur + 0.2, struck: 0, _acc: 0 });
    },
    step(world, p, u, dt) {
      const fx = u.fx;
      const d = { x: fx.dx, y: fx.dy, z: fx.dz };
      if (!fx.struck && fx.t >= 0.65) {
        fx.struck = 1;
        for (const e of K.lineHits(world, fx, d, fx.len, 3.6)) K.hit(world, p, e, 260, { kind: 'spear', dir: { x: d.x, y: 0.4, z: d.z }, push: 24, launch: 10, stun: 1.4, stop: 0.12, style: 'LANÇA DIMENSIONAL', pts: 22 });
        for (let s = 4; s < fx.len; s += 4) world.emit('blast', { x: fx.x + d.x * s, y: fx.y + d.y * s, z: fx.z + d.z * s, r: 3, dmg: 120, owner: 'player' });
        K.vfx(world, 'spear_ult:strike', { x: fx.x, y: fx.y, z: fx.z, dx: d.x, dy: d.y, dz: d.z, len: fx.len });
      }
      if (fx.struck) {
        fx._acc += dt;
        if (fx._acc >= 0.25) { fx._acc = 0; for (const e of K.lineHits(world, fx, d, fx.len, 1.6)) K.hit(world, p, e, 7.5, { kind: 'spear', push: 1, stun: 0.2, dot: true }); }
      }
    },
  };

  // ======================= 14. CLONES SOMBRIOS =======================
  // Clone de Ataque: your shadow lifts off the floor and repeats your next blow a beat later.
  A.SKILL.shadow_1 = (world, p) => { K.buff(p, 'shadow_1', 6, { ids: [], fireAt: 0 }); return true; };
  A.ON_MELEE.push((world, p, e) => {
    const b = p.buffs.shadow_1;
    if (!b) return;
    if (!b.fireAt) b.fireAt = world.t + 0.22;
    if (!b.ids.includes(e.id)) b.ids.push(e.id);
  });
  A.BUFF.shadow_1 = {
    step(world, p, b) {
      if (!b.fireAt || world.t < b.fireAt) return;
      for (const id of b.ids) {
        const e = world.enemies[id];
        if (!e) continue;
        K.hit(world, p, e, 40, { kind: 'shadow', push: 6, stun: 0.5, stop: 0.04, style: 'ECO SOMBRIO', pts: 6 });
        const c = K.center(e);
        K.vfx(world, 'shadow_1:echo', { pid: p.id, x: c.x, y: c.y, z: c.z, w: p.weapon });
      }
      b.t = 0;
    },
  };

  // Clones Múltiplos: you split into three violet silhouettes that run off and fight.
  A.SKILL.shadow_2 = (world, p) => {
    const r = { x: Math.cos(p.yaw), z: -Math.sin(p.yaw) }, f = K.flat(p);
    for (const o of [[-1, 0.5], [1, 0.5], [0, -1]]) {
      const pos = { x: p.pos.x + r.x * o[0] * 1.5 + f.x * o[1] * 1.5, y: p.pos.y, z: p.pos.z + r.z * o[0] * 1.5 + f.z * o[1] * 1.5 };
      if (K.blocked(world, pos, 0.45, 1.9)) { pos.x = p.pos.x; pos.z = p.pos.z; }
      SO.Allies.spawn(world, p, 'clone', pos, { yaw: p.yaw });
    }
    return true;
  };

  // Explosão Sombria: every clone turns to liquid shadow, rushes an enemy and bursts.
  A.SKILL.shadow_3 = (world, p) => {
    let mine = Object.values(world.allies).filter((a) => a.owner === p.id && a.def.shadow);
    if (!mine.length) {
      const r = { x: Math.cos(p.yaw), z: -Math.sin(p.yaw) };
      for (const s of [-1, 1]) mine.push(SO.Allies.spawn(world, p, 'clone', { x: p.pos.x + r.x * s * 1.3, y: p.pos.y, z: p.pos.z + r.z * s * 1.3 }, { yaw: p.yaw }));
    }
    const taken = {};
    for (const a of mine) {
      const e = K.nearest(world, a.pos, 30, taken) || K.nearest(world, a.pos, 30);
      if (e) taken[e.id] = 1;
      const f = K.flat(p);
      a.dashTo = e ? { x: e.pos.x, y: e.pos.y, z: e.pos.z } : { x: a.pos.x + f.x * 8, y: a.pos.y, z: a.pos.z + f.z * 8 };
      a.state = 'dash'; a.stateT = 0; a.onArrive = 'shadow_3'; a.life = Math.max(a.life, 1.5); a.def = Object.assign({}, a.def, { still: false });
    }
    return true;
  };
  A.ALLY_ARRIVE.shadow_3 = (world, a) => {
    K.blast(world, world.players[a.owner], { x: a.pos.x, y: a.pos.y + 1, z: a.pos.z }, 4.2, 100, { kind: 'shadow', push: 14, launch: 7, stun: 0.9, falloff: 0.4, crater: [2, 0.5], style: 'EXPLOSÃO SOMBRIA', pts: 10 });
    K.vfx(world, 'shadow_3:burst', { x: a.pos.x, y: a.pos.y + 1, z: a.pos.z });
    SO.Allies.remove(world, a, 'burst');
  };

  // Exército de Sombras: shades rise around you, copy every blow, then charge together.
  A.ULT.shadow_ult = {
    start(world, p, u) {
      u.shades = [];
      for (let i = 0; i < 8; i++) {
        const ang = p.yaw + (i / 8) * Math.PI * 2;
        const a = SO.Allies.spawn(world, p, 'shade', { x: p.pos.x + Math.sin(ang) * 3.2, y: p.pos.y, z: p.pos.z + Math.cos(ang) * 3.2 }, { slot: i, of: 8, life: u.dur + 2 });
        u.shades.push(a.id);
      }
      u.acc = 0; u.copyCd = 0;
    },
    step(world, p, u, dt) {
      u.acc += dt; u.copyCd -= dt;
      if (u.acc >= 1) {
        u.acc = 0;
        for (const id of u.shades) {
          const a = world.allies[id];
          const e = a && K.nearest(world, a.pos, 6);
          if (e) { K.hit(world, p, e, 12, { kind: 'shadow', from: a.pos, push: 3, stun: 0.2, dot: true }); K.vfx(world, 'shadow_ult:slash', { id, x: e.pos.x, y: e.pos.y + 1, z: e.pos.z }); }
        }
      }
    },
    end(world, p, u) {
      const f = K.flat(p);
      for (const id of u.shades) {
        const a = world.allies[id];
        if (!a) continue;
        const from = { x: a.pos.x, y: a.pos.y + 1, z: a.pos.z };
        for (const e of K.lineHits(world, from, { x: f.x, y: 0, z: f.z }, 22, 1.8)) K.hit(world, p, e, 60, { kind: 'shadow', dir: { x: f.x, y: 0.3, z: f.z }, push: 14, launch: 5, stun: 0.8, style: 'EXÉRCITO DE SOMBRAS', pts: 5 });
        a.dashTo = { x: a.pos.x + f.x * 22, y: a.pos.y, z: a.pos.z + f.z * 22 };
        a.state = 'dash'; a.stateT = 0; a.onArrive = 'shadow_ult'; a.def = Object.assign({}, a.def, { formation: false });
      }
      K.vfx(world, 'shadow_ult:charge', { pid: p.id, yaw: p.yaw });
    },
  };
  A.ALLY_ARRIVE.shadow_ult = (world, a) => { K.vfx(world, 'shadow_ult:merge', { x: a.pos.x, y: a.pos.y + 1, z: a.pos.z }); SO.Allies.remove(world, a, 'merge'); };
  A.ON_MELEE.push((world, p, e) => {
    const u = p.ult;
    if (!u || u.id !== 'shadow_ult' || u.copyCd > 0) return;
    u.copyCd = 0.25;
    for (const id of u.shades) {
      const a = world.allies[id];
      const t = a && (K.nearest(world, a.pos, 8) || e);
      if (!t || t.dead) continue;
      K.hit(world, p, t, 25, { kind: 'shadow', from: a.pos, push: 5, stun: 0.3, style: 'SOMBRAS', pts: 1 });
      K.vfx(world, 'shadow_ult:slash', { id, x: t.pos.x, y: t.pos.y + 1, z: t.pos.z });
    }
  });

  // ======================= 15. VENTO CORTANTE =======================
  // Corte de Vento: a white arc of compressed air that distorts what is behind it.
  A.SKILL.wind_1 = (world, p) => {
    const f = K.fwd(p);
    K.spell(world, p, {
      look: 'wind_1', color: C('wind'), pos: { x: p.pos.x + f.x * 1.2, y: p.pos.y + CFG.EYE - 0.2 + f.y, z: p.pos.z + f.z * 1.2 }, vel: V.v(f.x * 58, f.y * 58, f.z * 58),
      speed: 58, radius: 1.8, dmg: 35, pierce: 20, pierceBig: false, life: 0.9, roll: p.lastRoll, yaw: p.yaw,
      hit: { kind: 'wind', push: 9, stun: 0.5, stop: 0.03, style: 'CORTE DE VENTO', pts: 4 },
    });
    return true;
  };

  // Redemoinho: a small twister that drifts forward, dragging and slicing.
  A.SKILL.wind_2 = (world, p) => {
    const pt = K.aimPoint(world, p, 26, 4), f = K.flat(p);
    K.effect(world, 'wind_2', { pid: p.id, x: pt.x, y: K.groundAt(world, pt.x, pt.z, pt.y + 0.5), z: pt.z, vx: f.x * 2.5, vz: f.z * 2.5, r: 5.5, dur: 4, _acc: 0 });
    return true;
  };
  A.FX.wind_2 = (world, fx, dt) => {
    const nx = fx.x + fx.vx * dt, nz = fx.z + fx.vz * dt;
    if (!K.blocked(world, { x: nx, y: fx.y, z: nz }, 0.5, 1)) { fx.x = nx; fx.z = nz; }
    fx.y = K.groundAt(world, fx.x, fx.z, fx.y + 1);
    fx._acc += dt;
    const tick = fx._acc >= 0.25;
    if (tick) fx._acc = 0;
    const p = world.players[fx.pid];
    for (const e of K.enemiesIn(world, { x: fx.x, y: fx.y + 1.5, z: fx.z }, fx.r)) {
      pullTo(e, { x: fx.x, y: fx.y + 2.5, z: fx.z }, 28, dt, e.def.big ? 0 : 4);
      if (tick) K.hit(world, p, e, 60 / 16, { kind: 'wind', from: fx, push: 0, stun: 0.25, dot: true });
    }
    return fx.t >= fx.dur;
  };

  // Lâminas Aéreas: three quick cuts thrown in a fan that cross on the target.
  A.SKILL.wind_3 = (world, p) => {
    const e = K.aimEnemy(world, p, 40, 16);
    const pt = e ? K.center(e) : (() => { const a = K.aimPoint(world, p, 30, 4); a.y += 1; return a; })();
    const r = { x: Math.cos(p.yaw), z: -Math.sin(p.yaw) };
    [[-2.2, 0.2], [2.2, 0.2], [0, 1.4]].forEach((o, i) => {
      const from = { x: p.pos.x + r.x * o[0], y: p.pos.y + CFG.EYE - 0.3 + o[1], z: p.pos.z + r.z * o[0] };
      K.spell(world, p, {
        look: 'wind_3', color: C('wind'), pos: from, vel: V.v(), delay: i * 0.07, dir: V.norm(V.v(), V.sub(V.v(), pt, from)), target: e ? e.id : 0, homing: e ? 5 : 0,
        speed: 62, radius: 1.1, dmg: 34, pierce: 3, life: 1.2, slot: i, roll: [60, -60, 0][i],
        hit: { kind: 'wind', push: 7, stun: 0.45, stop: 0.02, style: 'LÂMINAS AÉREAS', pts: 4 },
      });
    });
    return true;
  };

  // Fúria dos Ventos: a colossal tornado around you lifts, spins and slices, then flings them away.
  A.ULT.wind_ult = {
    start(world, p, u) { u.fx = K.effect(world, 'wind_ult', { pid: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z, r: 13, dur: u.dur + 0.2, _acc: 0 }); },
    step(world, p, u, dt) {
      const fx = u.fx;
      fx.x = p.pos.x; fx.y = p.pos.y; fx.z = p.pos.z;
      fx._acc += dt;
      const tick = fx._acc >= 0.25;
      if (tick) fx._acc = 0;
      for (const e of K.enemiesIn(world, { x: fx.x, y: fx.y + 3, z: fx.z }, fx.r)) {
        const dx = e.pos.x - fx.x, dz = e.pos.z - fx.z, d = Math.sqrt(dx * dx + dz * dz) || 1;
        const ring = 7;
        // orbit: tangential speed plus a spring toward the ring radius, lifted off the ground
        e.vel.x += (-dz / d * 16 + dx / d * (ring - d) * 2 - e.vel.x) * Math.min(1, dt * 5);
        e.vel.z += (dx / d * 16 + dz / d * (ring - d) * 2 - e.vel.z) * Math.min(1, dt * 5);
        if (!e.def.big) K.status(world, e, 'float', 0.3, { h: 3 + (e.id % 4), pid: p.id, by: 'wind_ult' });
        if (tick) K.hit(world, p, e, 7.5, { kind: 'wind', from: fx, push: 0, stun: 0.25, dot: true });
      }
    },
    end(world, p) {
      K.blast(world, p, { x: p.pos.x, y: p.pos.y + 3, z: p.pos.z }, 15, 60, { kind: 'wind', push: 34, launch: 12, stun: 1, falloff: 0.2, style: 'FÚRIA DOS VENTOS', pts: 20 });
      K.vfx(world, 'wind_ult:fling', { x: p.pos.x, y: p.pos.y, z: p.pos.z });
    },
  };
})(typeof window !== 'undefined' ? (window.SO = window.SO || {}) : (globalThis.SO = globalThis.SO || {}));
