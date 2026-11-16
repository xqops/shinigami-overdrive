// School abilities 1-5: Espadas Almas, Teleporte, Explosão Demoníaca, Invocação de Demônios,
// Manipulação de Sangue. Every ability has its own mechanic and its own visual id: projectiles
// carry look = '<ability id>' and visual events are emitted as K.vfx(world, '<ability id>:<moment>').
(function (SO) {
  'use strict';
  const V = SO.V, CFG = SO.CFG, K = SO.Kit, A = SO.Abilities;
  const C = (id) => SO.Schools.BY_ID[id].color;

  // ======================= 1. ESPADAS ALMAS =======================
  // Corte Fantasma: left, right, then above; each cuts straight down the crosshair.
  A.SKILL.souls_1 = (world, p) => {
    const f = K.fwd(p), r = { x: Math.cos(p.yaw), z: -Math.sin(p.yaw) };
    const slots = [{ x: -r.x * 1.3, y: 1.5, z: -r.z * 1.3 }, { x: r.x * 1.3, y: 1.5, z: r.z * 1.3 }, { x: 0, y: 2.6, z: 0 }];
    slots.forEach((o, i) => {
      K.spell(world, p, {
        look: 'souls_1', color: C('souls'), pos: { x: p.pos.x + o.x + f.x * 0.6, y: p.pos.y + o.y, z: p.pos.z + o.z + f.z * 0.6 },
        vel: V.v(), delay: 0.12 + i * 0.13, follow: { x: o.x + f.x * 0.6, y: o.y, z: o.z + f.z * 0.6 }, aimAtLaunch: true, speed: 62,
        radius: 0.75, dmg: 22, pierce: true, life: 1.6, slot: i,
        hit: { kind: 'soul', push: 4, stun: 0.4, stop: 0.03, launch: i === 2 ? 13 : 0, style: i === 2 ? 'CORTE FANTASMA' : null, pts: 5 },
      });
    });
    K.vfx(world, 'souls_1:summon', { pid: p.id });
    return true;
  };

  // Dança das Lâminas: seven blades orbit for 15 s, darting at whatever comes close.
  A.SKILL.souls_2 = (world, p) => {
    for (const fx of world.effects) if (fx.kind === 'souls_2' && fx.pid === p.id) fx.dur = fx.t; // recast replaces
    K.effect(world, 'souls_2', { pid: p.id, dur: 15, n: 7, x: p.pos.x, y: p.pos.y, z: p.pos.z, _cd: 0, _ic: 0, busy: 0 });
    return true;
  };
  function danceStrike(world, fx, p, e, slot) {
    K.hit(world, p, e, 15, { kind: 'soul', push: 3, stun: 0.25, stop: 0.01, style: 'DANÇA', pts: 2 });
    const c = K.center(e);
    K.vfx(world, 'souls_2:strike', { pid: p.id, fx: fx.id, slot, x: c.x, y: c.y, z: c.z });
  }
  A.FX.souls_2 = (world, fx, dt) => {
    const p = world.players[fx.pid];
    if (!p || p.dead) return true;
    fx.x = p.pos.x; fx.y = p.pos.y; fx.z = p.pos.z;
    fx._cd -= dt; fx._ic -= dt;
    if (fx._cd <= 0) {
      const e = K.nearest(world, { x: p.pos.x, y: p.pos.y + 1, z: p.pos.z }, 9);
      if (e) { fx._cd = 0.42; danceStrike(world, fx, p, e, (fx.busy++) % fx.n); }
    }
    if (fx._ic <= 0) {
      for (const k in world.projectiles) {
        const q = world.projectiles[k];
        if (q.owner !== 'enemy' || V.dist(q.pos, { x: p.pos.x, y: p.pos.y + 1.2, z: p.pos.z }) > 3) continue;
        SO.Projectiles.remove(world, q, 'intercept');
        K.vfx(world, 'souls_2:parry', { pid: p.id, x: q.pos.x, y: q.pos.y, z: q.pos.z });
        fx._ic = 0.5;
        break;
      }
    }
    return fx.t >= fx.dur;
  };
  A.ON_MELEE.push((world, p, e) => {
    for (const fx of world.effects) {
      if (fx.kind !== 'souls_2' || fx.pid !== p.id || e.dead) continue;
      danceStrike(world, fx, p, e, (fx.busy++) % fx.n);
      if (!e.dead) danceStrike(world, fx, p, e, (fx.busy++) % fx.n);
    }
  });

  // Execução Celestial: a magic circle locks on, then a colossal blade falls through the target.
  A.SKILL.souls_3 = (world, p) => {
    const e = K.aimEnemy(world, p, 45, 10);
    const pt = e ? { x: e.pos.x, y: e.pos.y, z: e.pos.z } : K.aimPoint(world, p, 40, 3);
    K.effect(world, 'souls_3', { pid: p.id, x: pt.x, y: K.groundAt(world, pt.x, pt.z, pt.y + 0.5), z: pt.z, target: e ? e.id : 0, dur: 1.2, hitT: 0.6, scale: 1, done: 0 });
    return true;
  };
  function celestialImpact(world, fx, p, dmg, r, crater) {
    const e = fx.target && world.enemies[fx.target];
    if (e) K.hit(world, p, e, dmg, { kind: 'soul', push: 4, launch: 6, stun: 1.2, stop: 0.12, style: 'EXECUÇÃO', pts: 16, from: { x: fx.x, y: 0, z: fx.z } });
    K.blast(world, p, { x: fx.x, y: fx.y + 0.5, z: fx.z }, r, dmg * 0.32, { kind: 'soul', push: 12, stun: 1.2, up: 0.5, falloff: 0.5, crater });
  }
  A.FX.souls_3 = (world, fx) => {
    const e = fx.target && world.enemies[fx.target];
    if (e && fx.t < fx.hitT) { fx.x = e.pos.x; fx.z = e.pos.z; fx.y = K.groundAt(world, e.pos.x, e.pos.z, e.pos.y + 0.5); }
    if (!fx.done && fx.t >= fx.hitT) {
      fx.done = 1;
      const p = world.players[fx.pid];
      if (fx.scale > 1) celestialImpact(world, fx, p, 300, 9, [7, 2.2]);
      else celestialImpact(world, fx, p, 95, 6, [2.6, 0.8]);
      K.vfx(world, 'souls_3:impact', { x: fx.x, y: fx.y, z: fx.z, big: fx.scale > 1 ? 1 : 0 });
    }
    return fx.t >= fx.dur;
  };

  // Trono das Mil Espadas: everything you hit is marked; blades from the sky hunt the marked.
  A.ULT.souls_ult = {
    start(world, p, u) {
      u.arsenal = 18; u.acc = 0; u.regen = 0;
      K.effect(world, 'souls_ult', { pid: p.id, dur: u.dur, x: p.pos.x, y: 0, z: p.pos.z, arsenal: u.arsenal });
    },
    step(world, p, u, dt) {
      u.regen += dt;
      if (u.regen > 0.45) { u.regen = 0; u.arsenal++; }
      u.acc += dt;
      while (u.acc > 0.13 && u.arsenal > 0) {
        u.acc -= 0.13;
        const marked = [];
        for (const k in world.enemies) { const e = world.enemies[k]; if (e.st && e.st.mark && e.st.mark.by === 'souls_ult') marked.push(e); }
        const tgt = marked.length ? marked[(world.rng() * marked.length) | 0] : K.nearest(world, p.pos, 30);
        if (!tgt) break;
        u.arsenal--;
        const c = K.center(tgt);
        const a = world.rng() * Math.PI * 2;
        K.spell(world, p, {
          look: 'souls_ult', color: C('souls'), pos: { x: c.x + Math.cos(a) * 6, y: c.y + 16 + world.rng() * 6, z: c.z + Math.sin(a) * 6 },
          vel: V.v(), delay: 0.05, target: tgt.id, homing: 9, retarget: 20, speed: 55, aimAtLaunch: true, radius: 0.7, dmg: 20, pierce: 0, life: 3,
          hitKind: 'throne', hit: { kind: 'throne', push: 3, stun: 0.3, stop: 0.01, style: 'MIL ESPADAS', pts: 2 },
        });
      }
      for (const fx of world.effects) if (fx.kind === 'souls_ult' && fx.pid === p.id) fx.arsenal = u.arsenal;
    },
    end(world, p) {
      // the arsenal fuses into one giant blade on the crosshair
      const pt = K.aimPoint(world, p, 60, 4);
      K.effect(world, 'souls_3', { pid: p.id, x: pt.x, y: K.groundAt(world, pt.x, pt.z, pt.y + 0.5), z: pt.z, target: pt.enemy ? pt.enemy.id : 0, dur: 1.6, hitT: 0.85, scale: 3.2, done: 0, finale: 1 });
    },
  };
  A.ON_DAMAGE.push((world, p, e, amount, src) => {
    if (p.ult && p.ult.id === 'souls_ult' && src.kind !== 'throne' && !e.dead) K.status(world, e, 'mark', 10, { by: 'souls_ult', pid: p.id });
  });
  A.ON_KILL.push((world, p) => { if (p.ult && p.ult.id === 'souls_ult') p.ult.arsenal += 4; });

  // ======================= 2. TELEPORTE =======================
  // Passo do Vazio: 12 m in the direction you move; an afterimage stays behind as bait.
  A.SKILL.void_1 = (world, p) => {
    const dir = K.moveDir(p);
    const from = K.slide(world, p, dir, 12);
    SO.Allies.spawn(world, p, 'afterimage', from, { yaw: p.yaw });
    p.invuln = Math.max(p.invuln, 0.25);
    p.vel.x = dir.x * 16; p.vel.z = dir.z * 16;
    K.vfx(world, 'void_1:step', { pid: p.id, fx: from.x, fy: from.y, fz: from.z, tx: p.pos.x, ty: p.pos.y, tz: p.pos.z });
    return true;
  };

  // Troca Dimensional: you and the marked enemy trade places through a shared tunnel.
  A.SKILL.void_2 = (world, p) => {
    const e = K.aimEnemy(world, p, 40, 12);
    if (!e) return false;
    const a = V.clone(p.pos), b = V.clone(e.pos);
    const ey = b.y;
    V.copy(e.pos, a);
    if (!e.def.ground) e.pos.y = Math.max(a.y, 2);
    p.pos.x = b.x; p.pos.z = b.z; p.pos.y = Math.max(K.groundAt(world, b.x, b.z, ey + 1), ey);
    if (K.blocked(world, p.pos, p.radius, p.height)) { V.copy(p.pos, a); V.copy(e.pos, b); return false; }
    p.vel.x = p.vel.y = p.vel.z = 0; p.invuln = Math.max(p.invuln, 0.4);
    K.hit(world, p, e, 30, { kind: 'void', push: 2, stun: 1.6, stop: 0.08, style: 'TROCA', pts: 10, from: p.pos });
    K.status(world, e, 'blind', 1.6, { by: 'void_2', pid: p.id });
    K.buff(p, 'void_2', 3, { dmg: 1.6, meleeOnly: true });
    K.vfx(world, 'void_2:swap', { pid: p.id, ax: a.x, ay: a.y, az: a.z, bx: p.pos.x, by: p.pos.y, bz: p.pos.z, id: e.id });
    return true;
  };
  A.ON_MELEE.push((world, p) => { if (p.buffs.void_2) { delete p.buffs.void_2; K.vfx(world, 'void_2:bonus', { pid: p.id }); } });

  // Ruptura Espacial: two glass-crack portals; you cross the gap at speed, cutting everything.
  A.SKILL.void_3 = (world, p) => {
    const a = { x: p.pos.x, y: p.pos.y + 1.2, z: p.pos.z };
    const f = K.fwd(p);
    const o = K.eye(p);
    const dist = Math.min(30, Math.max(6, world.raycast(o, f, 30) - 1));
    const dir = V.norm(V.v(), { x: f.x, y: f.y * 0.6, z: f.z });
    K.slide(world, p, dir, dist);
    const b = { x: p.pos.x, y: p.pos.y + 1.2, z: p.pos.z };
    const len = V.dist(a, b);
    const ld = V.norm(V.v(), V.sub(V.v(), b, a));
    for (const e of K.lineHits(world, a, ld, len, 2.6)) K.hit(world, p, e, 75, { kind: 'void', dir: { x: ld.x, y: 0.2, z: ld.z }, push: 9, stun: 0.8, stop: 0.05, style: 'RUPTURA', pts: 8 });
    p.vel.x = ld.x * 22; p.vel.z = ld.z * 22; p.vel.y = Math.max(p.vel.y, 3);
    p.invuln = Math.max(p.invuln, 0.45);
    K.effect(world, 'void_3', { pid: p.id, x: a.x, y: a.y, z: a.z, bx: b.x, by: b.y, bz: b.z, dur: 3, yaw: p.yaw });
    return true;
  };
  // your projectiles that fly into portal A come out of portal B for 3 s
  A.FX.void_3 = (world, fx) => {
    for (const k in world.projectiles) {
      const q = world.projectiles[k];
      if (q.owner !== 'player' || q._ported === fx.id) continue;
      if (V.dist(q.pos, fx) < 1.8) { q.pos.x = fx.bx; q.pos.y = fx.by; q.pos.z = fx.bz; q._ported = fx.id; K.vfx(world, 'void_3:pass', { x: fx.bx, y: fx.by, z: fx.bz }); }
    }
    return fx.t >= fx.dur;
  };

  // Colapso das Dimensões: free teleports that leave rifts; rifts burst near enemies, then implode.
  A.ULT.void_ult = {
    start(world, p, u) { K.buff(p, 'voidwalk', u.dur, {}); u.rifts = []; K.effect(world, 'void_ult', { pid: p.id, dur: u.dur, x: p.pos.x, y: p.pos.y, z: p.pos.z }); },
    end(world, p, u) {
      let cx = p.pos.x, cz = p.pos.z, cy = p.pos.y + 1.5;
      if (u.rifts.length) { cx = 0; cz = 0; cy = 0; for (const r of u.rifts) { cx += r.x; cy += r.y; cz += r.z; } cx /= u.rifts.length; cy /= u.rifts.length; cz /= u.rifts.length; }
      for (const fx of world.effects) if (fx.kind === 'void_ult:rift' && fx.pid === p.id) { fx.dur = fx.t + 0.5; fx.collapse = 1; fx.cx = cx; fx.cy = cy; fx.cz = cz; }
      K.effect(world, 'void_ult:implode', { pid: p.id, x: cx, y: Math.max(1.5, cy), z: cz, dur: 1.6, r: 13, rifts: u.rifts.map((r) => [r.x, r.y, r.z]) });
    },
  };
  A.ON_BLINK.push((world, p, from) => {
    if (!p.ult || p.ult.id !== 'void_ult') return;
    const r = { x: from.x, y: from.y + 1.2, z: from.z };
    p.ult.rifts.push(r);
    K.effect(world, 'void_ult:rift', { pid: p.id, x: r.x, y: r.y, z: r.z, dur: 9, armed: 0 });
    SO.Allies.spawn(world, p, 'afterimage', from, { yaw: p.yaw, life: 1.2 });
  });
  A.FX['void_ult:rift'] = (world, fx) => {
    if (fx.collapse) return fx.t >= fx.dur;
    if (fx.t > 0.35 && K.nearest(world, fx, 3.2)) {
      K.blast(world, world.players[fx.pid], fx, 4.2, 60, { kind: 'void', push: 10, stun: 0.7, falloff: 0.3, crater: [1.8, 0.4] });
      K.vfx(world, 'void_ult:burst', { x: fx.x, y: fx.y, z: fx.z });
      return true;
    }
    return fx.t >= fx.dur;
  };
  A.FX['void_ult:implode'] = (world, fx, dt) => {
    for (const e of K.enemiesIn(world, fx, fx.r)) {
      const c = K.center(e), dx = fx.x - c.x, dz = fx.z - c.z, dy = fx.y - c.y, d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const pull = 30 * e.def.knock + 4;
      e.vel.x += dx / d * pull * dt * 4; e.vel.z += dz / d * pull * dt * 4; e.vel.y += dy / d * pull * dt * 2;
      e.stun = Math.max(e.stun, 0.2);
    }
    if (fx.t >= fx.dur) {
      K.blast(world, world.players[fx.pid], fx, 8, 150, { kind: 'void', push: 18, launch: 10, stun: 1.2, falloff: 0.5, crater: [5, 1.4], style: 'COLAPSO DIMENSIONAL', pts: 20 });
      K.vfx(world, 'void_ult:collapse', { x: fx.x, y: fx.y, z: fx.z });
      return true;
    }
    return false;
  };

  // ======================= 3. EXPLOSÃO DEMONÍACA =======================
  // Bastião Infernal: fist to the floor, red cracks, a ring of demonic energy.
  A.SKILL.demon_1 = (world, p) => {
    const at = { x: p.pos.x, y: p.pos.y + 0.6, z: p.pos.z };
    K.blast(world, p, at, 6.5, 40, { kind: 'demon', push: 15, launch: 7, stun: 0.7, stop: 0.06, falloff: 0.3, crater: [3, 0.55], style: 'BASTIÃO', pts: 6 });
    K.vfx(world, 'demon_1:slam', { x: p.pos.x, y: p.pos.y, z: p.pos.z, yaw: p.yaw });
    return true;
  };

  // Onda de Choque: a wall of scarlet fire tears along the ground, interrupting what it passes.
  A.SKILL.demon_2 = (world, p) => {
    const f = K.flat(p);
    const y = K.groundAt(world, p.pos.x, p.pos.z, p.pos.y + 0.5);
    K.spell(world, p, {
      look: 'demon_2', color: C('demon'), pos: { x: p.pos.x + f.x * 1.5, y: y + 1.2, z: p.pos.z + f.z * 1.5 }, vel: V.v(f.x * 34, 0, f.z * 34),
      dir: { x: f.x, y: 0, z: f.z }, speed: 34, radius: 2.4, dmg: 70, pierce: true, ghost: true, life: 1.0, yaw: p.yaw, onStep: 'demon_2',
      hit: { kind: 'demon', push: 9, stun: 1.0, stop: 0.04, style: 'ONDA DE CHOQUE', pts: 6 },
    });
    return true;
  };
  A.SPELL_STEP.demon_2 = (world, q, dt) => {
    q.pos.y = K.groundAt(world, q.pos.x, q.pos.z, q.pos.y) + 1.2;
    for (const e of K.enemiesIn(world, q.pos, 3)) e.attack = null; // interrupts windups
    q._sc = (q._sc || 0) - dt;
    if (q._sc <= 0) { q._sc = 0.12; world.emit('blast', { x: q.pos.x, y: q.pos.y, z: q.pos.z, r: 2.4, dmg: 50, owner: 'player' }); }
  };

  // Detonação Total: runes on up to five enemies, then they go off one after another.
  A.SKILL.demon_3 = (world, p) => {
    const list = K.coneHits(world, p, 38, 34).sort((a, b) => V.dist(a.pos, p.pos) - V.dist(b.pos, p.pos)).slice(0, 5);
    if (!list.length) return false;
    list.forEach((e, i) => K.status(world, e, 'mark', 0.9 + i * 0.22, { by: 'demon_3', pid: p.id, onEnd: 'demon_3', order: i }));
    K.vfx(world, 'demon_3:mark', { pid: p.id, ids: list.map((e) => e.id) });
    return true;
  };
  A.STATUS_END.demon_3 = (world, e, s) => {
    const p = world.players[s.pid];
    if (!e.dead) K.hit(world, p, e, 120, { kind: 'demon', push: 10, launch: 8, stun: 1, stop: 0.08, style: 'DETONAÇÃO', pts: 9, up: 0.5 });
    const c = K.center(e);
    K.blast(world, p, c, 3.4, 40, { kind: 'demon', push: 8, stun: 0.5, falloff: 0.5, crater: [1.6, 0.35] });
    K.vfx(world, 'demon_3:boom', { x: c.x, y: c.y, z: c.z, order: s.order });
  };

  // Apocalipse: a demonic circle over the arena, red meteors, then the central sphere bursts.
  A.ULT.demon_ult = {
    start(world, p, u) {
      u.c = { x: p.pos.x, y: K.groundAt(world, p.pos.x, p.pos.z, p.pos.y + 0.5), z: p.pos.z };
      u.acc = 0;
      K.effect(world, 'demon_ult', { pid: p.id, x: u.c.x, y: u.c.y, z: u.c.z, dur: u.dur + 0.6, r: 30, total: u.dur });
    },
    step(world, p, u, dt) {
      u.acc += dt;
      if (u.acc < 0.3) return;
      u.acc = 0;
      const list = K.enemiesIn(world, u.c, 32);
      const e = list.length ? list[(world.rng() * list.length) | 0] : null;
      const a = world.rng() * Math.PI * 2, rr = world.rng() * 26;
      const t = e ? { x: e.pos.x, y: e.pos.y, z: e.pos.z } : { x: u.c.x + Math.cos(a) * rr, y: u.c.y, z: u.c.z + Math.sin(a) * rr };
      K.spell(world, p, {
        look: 'demon_ult', color: C('demon'), pos: { x: t.x + K.rand(world, -6, 6), y: t.y + 28, z: t.z + K.rand(world, -6, 6) }, vel: V.v(),
        aimAtLaunch: false, dir: V.norm(V.v(), { x: 0.15, y: -1, z: 0.1 }), target: e ? e.id : 0, homing: e ? 6 : 0, speed: 46, radius: 0.9, dmg: 0, life: 3,
        explode: { r: 3.2, dmg: 60, falloff: 0.4, crater: [2.2, 0.6], opts: { kind: 'demon', push: 10, stun: 0.6 } }, explodeOnHit: true,
      });
    },
    end(world, p, u) {
      K.blast(world, p, { x: u.c.x, y: u.c.y + 2, z: u.c.z }, 13, 400, { kind: 'demon', push: 24, launch: 16, stun: 1.6, falloff: 0.55, crater: [9, 2.6], style: 'APOCALIPSE', pts: 30 });
      K.vfx(world, 'demon_ult:nova', { x: u.c.x, y: u.c.y, z: u.c.z });
    },
  };

  // ======================= 4. INVOCAÇÃO DE DEMÔNIOS =======================
  // Lacaios do Inferno: hands claw out of two red circles, then two imps hunt for 12 s.
  A.SKILL.summon_1 = (world, p) => {
    const f = K.flat(p), r = { x: Math.cos(p.yaw), z: -Math.sin(p.yaw) };
    for (const s of [-1, 1]) {
      const pos = { x: p.pos.x + f.x * 2.5 + r.x * s * 1.8, y: p.pos.y, z: p.pos.z + f.z * 2.5 + r.z * s * 1.8 };
      if (K.blocked(world, pos, 0.45, 1.5)) { pos.x = p.pos.x; pos.z = p.pos.z; }
      SO.Allies.spawn(world, p, 'imp', pos, { yaw: p.yaw + Math.PI });
    }
    return true;
  };

  // Demônio Guardião: a vertical portal is pried open and the armored guardian steps through.
  A.SKILL.summon_2 = (world, p) => {
    for (const k in world.allies) if (world.allies[k].kind === 'guardian' && world.allies[k].owner === p.id) SO.Allies.remove(world, world.allies[k], 'replaced');
    // it steps out at your front-left, where you can see its portal open
    const f = K.flat(p), r = { x: Math.cos(p.yaw), z: -Math.sin(p.yaw) };
    const pos = { x: p.pos.x + f.x * 4 - r.x * 2.2, y: p.pos.y, z: p.pos.z + f.z * 4 - r.z * 2.2 };
    if (K.blocked(world, pos, 0.9, 3)) { pos.x = p.pos.x + f.x * 2; pos.z = p.pos.z + f.z * 2; }
    SO.Allies.spawn(world, p, 'guardian', pos, { yaw: p.yaw + Math.PI });
    return true;
  };

  // Círculo Demoníaco: ritual ground that weakens and burns, with chains and small shades.
  A.SKILL.summon_3 = (world, p) => {
    const pt = K.aimPoint(world, p, 32, 4);
    const fx = K.effect(world, 'summon_3', { pid: p.id, x: pt.x, y: K.groundAt(world, pt.x, pt.z, pt.y + 0.5), z: pt.z, r: 7, dur: 6, _acc: 0 });
    for (let i = 0; i < 2; i++) {
      const a = world.rng() * Math.PI * 2;
      SO.Allies.spawn(world, p, 'imp', { x: fx.x + Math.cos(a) * 3, y: fx.y, z: fx.z + Math.sin(a) * 3 }, { life: 6, dmgOverride: 18 });
    }
    return true;
  };
  A.FX.summon_3 = (world, fx, dt) => {
    fx._acc += dt;
    const tick = fx._acc >= 0.5;
    if (tick) fx._acc = 0;
    const p = world.players[fx.pid];
    for (const e of K.enemiesIn(world, fx, fx.r)) {
      if (Math.abs(e.pos.y - fx.y) > 4) continue;
      K.status(world, e, 'weak', 0.6, { by: 'summon_3', k: 0.25, pid: fx.pid });
      if (tick) K.hit(world, p, e, 80 / 12, { kind: 'demon', push: 0, stun: 0.05, dot: true });
      if (tick) K.vfx(world, 'summon_3:chain', { id: e.id, x: fx.x, y: fx.y, z: fx.z });
    }
    return fx.t >= fx.dur;
  };

  // Portal Abissal: chains drag a giant portal open; the troop pours out and hunts your marks.
  A.ULT.summon_ult = {
    start(world, p, u) {
      const f = K.flat(p);
      // the portal opens ahead of you, facing you, so the troop pours out toward the enemies
      u.portal = { x: p.pos.x + f.x * 9, y: K.groundAt(world, p.pos.x, p.pos.z, p.pos.y + 0.5), z: p.pos.z + f.z * 9 };
      if (K.blocked(world, { x: u.portal.x, y: u.portal.y, z: u.portal.z }, 1, 2)) { u.portal.x = p.pos.x + f.x * 5; u.portal.z = p.pos.z + f.z * 5; }
      u.queue = ['warrior', 'warrior', 'flyer', 'warrior', 'flyer', 'warrior', 'flyer', 'commander'];
      u.next = 0.7; u.troop = [];
      K.effect(world, 'summon_ult', { pid: p.id, x: u.portal.x, y: u.portal.y, z: u.portal.z, yaw: p.yaw, dur: u.dur + 1.2 });
    },
    step(world, p, u) {
      if (u.queue.length && u.t >= u.next) {
        const kind = u.queue.shift();
        u.next = u.t + (kind === 'commander' ? 0.9 : 0.32);
        const a = SO.Allies.spawn(world, p, kind, { x: u.portal.x + K.rand(world, -1.5, 1.5), y: u.portal.y + (kind === 'flyer' ? 3 : 0), z: u.portal.z + K.rand(world, -1.5, 1.5) }, { life: 30 });
        u.troop.push(a.id);
        K.vfx(world, 'summon_ult:emerge', { x: u.portal.x, y: u.portal.y, z: u.portal.z, kind });
      }
    },
    end(world, p, u) {
      let cmd = null;
      for (const id of u.troop) { const a = world.allies[id]; if (!a) continue; if (a.kind === 'commander') cmd = a; else SO.Allies.remove(world, a, 'banish'); }
      const at = cmd ? { x: cmd.pos.x, y: cmd.pos.y + 0.5, z: cmd.pos.z } : { x: u.portal.x, y: u.portal.y + 0.5, z: u.portal.z };
      K.blast(world, p, at, 10, 150, { kind: 'demon', push: 20, launch: 12, stun: 1.4, falloff: 0.5, crater: [5, 1.4], style: 'PORTAL ABISSAL', pts: 24 });
      K.vfx(world, 'summon_ult:finale', { x: at.x, y: at.y, z: at.z, cmd: cmd ? cmd.id : 0 });
      if (cmd) SO.Allies.remove(world, cmd, 'finale');
    },
  };
  A.ON_DAMAGE.push((world, p, e, amount, src) => {
    if (p.ult && p.ult.id === 'summon_ult' && src.kind !== 'ally' && !e.dead) K.status(world, e, 'mark', 6, { by: 'summon_ult', pid: p.id });
  });

  // ======================= 5. MANIPULAÇÃO DE SANGUE =======================
  // Chicote Sanguíneo: drops gather into a barbed whip that lashes forward and reels the light in.
  A.SKILL.blood_1 = (world, p) => {
    const list = K.coneHits(world, p, 11, 28);
    const ids = [];
    for (const e of list) {
      K.hit(world, p, e, 35, { kind: 'blood', push: 0, stun: 0.6, stop: 0.05, style: 'CHICOTE', pts: 6 });
      if (!e.dead && !e.def.big) {
        const dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z, l = Math.sqrt(dx * dx + dz * dz) || 1;
        const pull = Math.min(22, l * 2.2);
        e.vel.x = dx / l * pull; e.vel.z = dz / l * pull; e.vel.y = Math.max(e.vel.y, 5); e.grounded = false; e.juggle = 0.5;
      }
      ids.push(e.id);
    }
    K.heal(world, p, list.length * 4);
    K.vfx(world, 'blood_1:lash', { pid: p.id, ids, yaw: p.yaw, pitch: p.pitch });
    return true;
  };

  // Lâminas Hemáticas: liquid rings harden into five curved blades that orbit, then fly.
  A.SKILL.blood_2 = (world, p) => {
    K.effect(world, 'blood_2', { pid: p.id, n: 5, dur: 8, x: p.pos.x, y: p.pos.y, z: p.pos.z, _cd: 0.7 });
    return true;
  };
  A.FX.blood_2 = (world, fx, dt) => {
    const p = world.players[fx.pid];
    if (!p || p.dead || fx.n <= 0) return true;
    fx.x = p.pos.x; fx.y = p.pos.y; fx.z = p.pos.z;
    fx._cd -= dt;
    if (fx._cd <= 0) {
      const e = K.aimEnemy(world, p, 30, 22) || K.nearest(world, p.pos, 14);
      if (e) {
        fx._cd = 0.38; fx.n--;
        const a = world.t * 3 + fx.n * 1.2566;
        K.spell(world, p, {
          look: 'blood_2', color: C('blood'), pos: { x: p.pos.x + Math.cos(a) * 1.6, y: p.pos.y + 1.4, z: p.pos.z + Math.sin(a) * 1.6 }, vel: V.v(),
          target: e.id, homing: 10, speed: 44, aimAtLaunch: true, radius: 0.6, dmg: 45, pierce: 0, life: 2.5, on: 'blood_2',
          hit: { kind: 'blood', push: 6, stun: 0.5, stop: 0.04, style: 'LÂMINA HEMÁTICA', pts: 5 },
        });
      }
    }
    return fx.t >= fx.dur;
  };
  A.SPELL_HIT.blood_2 = (world, q) => K.heal(world, world.players[q.pid], 6);

  // Prisão Carmesim: tentacles rise around the target and crystallize into a red cage.
  A.SKILL.blood_3 = (world, p) => {
    const e = K.aimEnemy(world, p, 40, 14);
    const pt = e ? e.pos : K.aimPoint(world, p, 35, 3);
    const list = K.enemiesIn(world, pt, 4.5, 3);
    if (!list.length) return false;
    for (const t of list) K.status(world, t, 'prison', 3, { by: 'blood_3', dps: 80 / 3, pid: p.id, onEnd: 'blood_3' });
    K.style(world, p, 'PRISÃO CARMESIM', 8);
    return true;
  };
  A.STATUS_END.blood_3 = (world, e) => { const c = K.center(e); K.vfx(world, 'blood_3:shatter', { x: c.x, y: c.y, z: c.z, h: e.def.height }); };

  // Maré Carmesim: a storm of blood around you that feeds you, then a colossal wave.
  A.ULT.blood_ult = {
    start(world, p, u) { u.acc = 0; K.effect(world, 'blood_ult', { pid: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z, r: 14, dur: u.dur + 0.2 }); },
    step(world, p, u, dt) {
      for (const fx of world.effects) if (fx.kind === 'blood_ult' && fx.pid === p.id) { fx.x = p.pos.x; fx.y = p.pos.y; fx.z = p.pos.z; }
      u.acc += dt;
      if (u.acc < 0.5) return;
      u.acc = 0;
      let total = 0;
      for (const e of K.enemiesIn(world, p.pos, 14)) {
        K.hit(world, p, e, 12.5, { kind: 'blood', push: 1, stun: 0.15, dot: true });
        total += 12.5;
        K.vfx(world, 'blood_ult:siphon', { id: e.id, pid: p.id });
      }
      K.heal(world, p, total * 0.3);
    },
    end(world, p) {
      const f = K.flat(p);
      K.spell(world, p, {
        look: 'blood_ult', color: C('blood'), pos: { x: p.pos.x + f.x * 2, y: K.groundAt(world, p.pos.x, p.pos.z, p.pos.y + 0.5) + 2, z: p.pos.z + f.z * 2 },
        vel: V.v(f.x * 30, 0, f.z * 30), dir: { x: f.x, y: 0, z: f.z }, speed: 30, radius: 5.5, dmg: 150, pierce: true, ghost: true, life: 2.2, yaw: p.yaw, onStep: 'blood_ult',
        hit: { kind: 'blood', push: 26, launch: 9, stun: 1.2, stop: 0.06, style: 'MARÉ CARMESIM', pts: 10 },
      });
    },
  };
  A.SPELL_STEP.blood_ult = (world, q, dt) => {
    q.pos.y = K.groundAt(world, q.pos.x, q.pos.z, q.pos.y) + 2;
    q._sc = (q._sc || 0) - dt;
    if (q._sc <= 0) { q._sc = 0.15; world.emit('blast', { x: q.pos.x, y: q.pos.y, z: q.pos.z, r: 5, dmg: 70, owner: 'player' }); }
  };
})(typeof window !== 'undefined' ? (window.SO = window.SO || {}) : (globalThis.SO = globalThis.SO || {}));
