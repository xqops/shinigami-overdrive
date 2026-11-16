// School abilities 16-20: Regeneração, Trovão, Escuridão, Lâminas do Caos, Domínio Elemental.
(function (SO) {
  'use strict';
  const V = SO.V, CFG = SO.CFG, K = SO.Kit, A = SO.Abilities;
  const C = (id) => SO.Schools.BY_ID[id].color;

  function handPos(p, side) {
    const f = K.fwd(p), r = { x: Math.cos(p.yaw), z: -Math.sin(p.yaw) };
    return { x: p.pos.x + f.x * 0.8 + r.x * 0.25 * side, y: p.pos.y + CFG.EYE - 0.3 + f.y * 0.8, z: p.pos.z + f.z * 0.8 + r.z * 0.25 * side };
  }

  // ======================= 16. REGENERAÇÃO =======================
  // Cura Rápida: a green wave runs over your body; 80 HP back without slowing down.
  A.SKILL.regen_1 = (world, p) => { K.heal(world, p, 80); K.vfx(world, 'regen_1:wave', { pid: p.id }); return true; };

  // Transferência: green threads tie you to an enemy and carry its life over in glowing beads.
  A.SKILL.regen_2 = (world, p) => {
    const e = K.aimEnemy(world, p, 20, 24) || K.nearest(world, p.pos, 16);
    if (!e) return false;
    K.status(world, e, 'drain', 1.1, { dps: 40 / 1.1, leech: 1, pid: p.id, by: 'regen_2' });
    return true;
  };

  // Renovação: green symbols on your armor pulse 20 HP/s for 5 s (halved briefly when hit).
  A.SKILL.regen_3 = (world, p) => { K.buff(p, 'regen_3', 5, { rate: 20, hurt: 0 }); return true; };
  A.BUFF.regen_3 = { step(world, p, b, dt) { b.hurt -= dt; const h = b.rate * (b.hurt > 0 ? 0.5 : 1) * dt; p.hp = Math.min(p.maxHp, p.hp + h); } };

  // Imortalidade: a giant green aura, roots of light; you cannot die, and low-health hits push back.
  A.ULT.regen_ult = {
    start(world, p, u) { K.buff(p, 'regen_ult', u.dur, { rate: 40, cool: 0 }); },
    end(world, p) {
      delete p.buffs.regen_ult;
      p.hp = Math.max(p.hp, 25);
      K.vfx(world, 'regen_ult:seal', { pid: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z });
    },
  };
  A.BUFF.regen_ult = { step(world, p, b, dt) { b.cool -= dt; p.hp = Math.min(p.maxHp, p.hp + b.rate * dt); } };
  A.ON_HURT.push((world, p, dmg) => {
    if (p.buffs.regen_3) p.buffs.regen_3.hurt = 1;
    const b = p.buffs.regen_ult;
    if (!b) return dmg;
    if (p.hp < 35 && b.cool <= 0) {
      b.cool = 1;
      K.blast(world, p, { x: p.pos.x, y: p.pos.y + 1, z: p.pos.z }, 6.5, 20, { kind: 'regen', push: 20, launch: 6, stun: 0.8, falloff: 0.2, scenery: false, style: 'VIDA ETERNA', pts: 8 });
      K.vfx(world, 'regen_ult:pulse', { pid: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z });
    }
    return Math.min(dmg, Math.max(0, p.hp - 1));
  });

  // ======================= 17. TROVÃO =======================
  // Raios em Cadeia: yellow discharges jump from enemy to enemy along jagged paths.
  A.SKILL.thunder_1 = (world, p) => {
    const first = K.aimEnemy(world, p, 32, 16) || K.nearest(world, p.pos, 16);
    if (!first) return false;
    const pts = K.chain(world, p, first, 6, 11, 40, { kind: 'thunder', decay: 0.94, stun: 0.9, stop: 0.03, style: 'RAIOS EM CADEIA', pts: 4, status: 'shock', statusT: 0.5 });
    const h = handPos(p, -1); pts[0] = [h.x, h.y, h.z];
    K.vfx(world, 'thunder_1:chain', { pid: p.id, pts });
    return true;
  };

  // Salto Elétrico: lightning wraps your legs, the floor bursts as you leave and where you land.
  A.SKILL.thunder_2 = (world, p) => {
    const f = K.flat(p);
    K.blast(world, p, { x: p.pos.x, y: p.pos.y + 0.5, z: p.pos.z }, 5, 60, { kind: 'thunder', push: 10, launch: 6, stun: 0.9, falloff: 0.3, crater: [2, 0.4], status: 'shock', statusT: 0.5, style: 'SALTO ELÉTRICO', pts: 6 });
    K.vfx(world, 'thunder_2:takeoff', { pid: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z });
    p.vel.y = 21; p.vel.x += f.x * 10; p.vel.z += f.z * 10; p.grounded = false; p.airJumps = 1;
    K.buff(p, 'thunder_2', 3, {});
    return true;
  };
  A.BUFF.thunder_2 = {
    step(world, p, b) {
      if (b.max - b.t < 0.25 || !p.grounded) return;
      K.blast(world, p, { x: p.pos.x, y: p.pos.y + 0.5, z: p.pos.z }, 5.5, 60, { kind: 'thunder', push: 12, launch: 7, stun: 1, falloff: 0.3, crater: [2.4, 0.6], status: 'shock', statusT: 0.6 });
      K.vfx(world, 'thunder_2:land', { pid: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z });
      b.t = 0;
    },
  };

  // Pilar de Raios: dark clouds gather over the mark and a thick bolt drops through it.
  A.SKILL.thunder_3 = (world, p) => {
    const pt = K.aimPoint(world, p, 48, 4);
    K.effect(world, 'thunder_3', { pid: p.id, x: pt.x, y: K.groundAt(world, pt.x, pt.z, pt.y + 0.5), z: pt.z, dur: 0.75, r: 4.5, scale: 1, done: 0 });
    return true;
  };
  A.FX.thunder_3 = (world, fx) => {
    if (fx.done || fx.t < fx.dur) return false;
    fx.done = 1;
    const big = fx.scale > 1;
    K.blast(world, world.players[fx.pid], { x: fx.x, y: fx.y + 1, z: fx.z }, fx.r, big ? 400 : 150,
      { kind: 'thunder', push: big ? 20 : 8, launch: big ? 12 : 4, stun: 1.6, falloff: 0.4, crater: big ? [8, 2.4] : [2.6, 0.8], status: 'shock', statusT: big ? 1.5 : 1, style: big ? 'TEMPESTADE DIVINA' : 'PILAR DE RAIOS', pts: big ? 28 : 14 });
    K.vfx(world, 'thunder_3:strike', { x: fx.x, y: fx.y, z: fx.z, big: big ? 1 : 0 });
    return true;
  };

  // Tempestade Divina: yellow-black storm, bolts fall on enemies by themselves, you run faster.
  A.ULT.thunder_ult = {
    start(world, p, u) { K.buff(p, 'thunder_ult', u.dur, { speed: 1.3 }); u.acc = 0; K.effect(world, 'thunder_ult', { pid: p.id, x: p.pos.x, y: 0, z: p.pos.z, dur: u.dur + 1.2 }); },
    step(world, p, u, dt) {
      u.acc += dt;
      if (u.acc < 0.32) return;
      u.acc = 0;
      const list = K.enemiesIn(world, p.pos, 42);
      if (!list.length) return;
      const e = list[(world.rng() * list.length) | 0];
      K.hit(world, p, e, 45, { kind: 'thunder', dir: { x: 0, y: 1, z: 0 }, push: 2, stun: 0.9, stop: 0.02, style: 'TEMPESTADE', pts: 3 });
      if (!e.dead) K.status(world, e, 'shock', 0.5, { pid: p.id, by: 'thunder_ult' });
      const y = K.groundAt(world, e.pos.x, e.pos.z, e.pos.y + 0.5);
      world.emit('blast', { x: e.pos.x, y, z: e.pos.z, r: 1.8, dmg: 60, crater: [1.2, 0.3], owner: 'player' });
      K.vfx(world, 'thunder_ult:bolt', { x: e.pos.x, y, z: e.pos.z, top: e.pos.y + e.def.height });
    },
    end(world, p) {
      delete p.buffs.thunder_ult;
      const pt = K.aimPoint(world, p, 60, 5);
      K.effect(world, 'thunder_3', { pid: p.id, x: pt.x, y: K.groundAt(world, pt.x, pt.z, pt.y + 0.5), z: pt.z, dur: 1.1, r: 10, scale: 3, done: 0, finale: 1 });
    },
  };

  // ======================= 18. ESCURIDÃO =======================
  // Nuvem Sombria: violet smoke boils up and its tendrils wrap whoever is inside.
  A.SKILL.dark_1 = (world, p) => {
    const pt = K.aimPoint(world, p, 34, 4);
    K.effect(world, 'dark_1', { pid: p.id, x: pt.x, y: K.groundAt(world, pt.x, pt.z, pt.y + 0.5), z: pt.z, r: 5.5, dur: 4, _acc: 0 });
    return true;
  };
  A.FX.dark_1 = (world, fx, dt) => {
    fx._acc += dt;
    const tick = fx._acc >= 0.5;
    if (tick) fx._acc = 0;
    const p = world.players[fx.pid];
    for (const e of K.enemiesIn(world, { x: fx.x, y: fx.y + 1.5, z: fx.z }, fx.r)) {
      K.status(world, e, 'blind', 0.8, { pid: fx.pid, by: 'dark_1' });
      if (tick) K.hit(world, p, e, 30 / 8, { kind: 'dark', push: 0, stun: 0.1, dot: true });
    }
    return fx.t >= fx.dur;
  };

  // Cegueira: a black pulse with violet edges; nearby lights die and enemies lose you for 5 s.
  A.SKILL.dark_2 = (world, p) => {
    const list = K.enemiesIn(world, p.pos, 19);
    for (const e of list) K.status(world, e, 'blind', 5, { pid: p.id, by: 'dark_2' });
    K.vfx(world, 'dark_2:pulse', { pid: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z, n: list.length });
    if (list.length >= 3) K.style(world, p, 'CEGUEIRA', 10);
    return true;
  };

  // Devorar Almas: the target's shadow is torn out, becomes a violet orb and you absorb it.
  A.SKILL.dark_3 = (world, p) => {
    const e = K.aimEnemy(world, p, 32, 15) || K.nearest(world, p.pos, 12);
    if (!e) return false;
    K.status(world, e, 'drain', 0.8, { dps: 100, leech: 0.5, pid: p.id, by: 'dark_3' });
    K.status(world, e, 'shock', 0.8, { pid: p.id, by: 'dark_3' });
    return true;
  };

  // Noite Eterna: the dark swallows every light; enemies glow to you, can't see you, and bleed.
  A.ULT.dark_ult = {
    start(world, p, u) { u.acc = 0.5; K.buff(p, 'dark_ult', u.dur, {}); K.effect(world, 'dark_ult', { pid: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z, dur: u.dur + 0.5 }); },
    step(world, p, u, dt) {
      u.acc += dt;
      if (u.acc < 0.5) return;
      u.acc = 0;
      for (const e of K.enemiesIn(world, p.pos, 46)) {
        K.status(world, e, 'blind', 0.9, { pid: p.id, by: 'dark_ult', bonus: 0.5 });
        K.hit(world, p, e, 12.5, { kind: 'dark', push: 0, stun: 0.05, dot: true });
      }
    },
    end(world, p) { delete p.buffs.dark_ult; K.vfx(world, 'dark_ult:dawn', { pid: p.id }); },
  };

  // ======================= 19. LÂMINAS DO CAOS =======================
  // Órbita Caótica: three magenta blades come out of magic circles and spin at their own speeds.
  A.SKILL.chaos_1 = (world, p) => {
    for (const fx of world.effects) if (fx.kind === 'chaos_1' && fx.pid === p.id) fx.dur = fx.t;
    K.effect(world, 'chaos_1', { pid: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z, dur: 6, _hits: {} });
    return true;
  };
  const ORBIT = [{ r: 2.2, w: 6.5, y: 1.1 }, { r: 2.8, w: -5.2, y: 0.6 }, { r: 1.8, w: 8.1, y: 1.6 }];
  A.FX.chaos_1 = (world, fx) => {
    const p = world.players[fx.pid];
    if (!p || p.dead) return true;
    fx.x = p.pos.x; fx.y = p.pos.y; fx.z = p.pos.z;
    ORBIT.forEach((o, i) => {
      const a = fx.t * o.w + i * 2.094;
      const b = { x: p.pos.x + Math.cos(a) * o.r, y: p.pos.y + o.y, z: p.pos.z + Math.sin(a) * o.r };
      for (const e of K.enemiesIn(world, b, 1.1)) {
        const key = e.id + ':' + i;
        if (world.t - (fx._hits[key] || -9) < 0.4) continue;
        fx._hits[key] = world.t;
        K.hit(world, p, e, 30, { kind: 'chaos', from: p.pos, push: 6, stun: 0.3, stop: 0.01, style: 'ÓRBITA CAÓTICA', pts: 3 });
      }
    });
    return fx.t >= fx.dur;
  };

  // Corte Telecinético: one blade swings out in a wide curve ahead of you and comes back.
  A.SKILL.chaos_2 = (world, p) => {
    K.effect(world, 'chaos_2', { pid: p.id, x: p.pos.x, y: p.pos.y + 1.2, z: p.pos.z, yaw: p.yaw, dur: 0.95, _hit: {} });
    return true;
  };
  function telekinetic(fx, t) {
    // out along a right-to-left arc, then back to the hand
    const out = Math.min(1, t / 0.55), back = Math.max(0, (t - 0.55) / 0.4);
    const sweep = -1.3 + out * 2.6;
    const reach = 9 * Math.sin(Math.min(1, out * 1.2) * Math.PI * 0.5) * (1 - back);
    const ang = fx.yaw + sweep * (1 - back);
    return { x: fx.x - Math.sin(ang) * reach, y: fx.y, z: fx.z - Math.cos(ang) * reach };
  }
  A.FX.chaos_2 = (world, fx) => {
    const p = world.players[fx.pid];
    if (p) { fx.x = p.pos.x; fx.y = p.pos.y + 1.2; fx.z = p.pos.z; }
    const b = telekinetic(fx, fx.t);
    fx.bx = b.x; fx.by = b.y; fx.bz = b.z;
    for (const e of K.enemiesIn(world, b, 2)) {
      if (fx._hit[e.id]) continue;
      fx._hit[e.id] = 1;
      K.hit(world, p, e, 70, { kind: 'chaos', from: p ? p.pos : b, push: 10, stun: 0.6, stop: 0.04, style: 'CORTE TELECINÉTICO', pts: 6 });
    }
    return fx.t >= fx.dur;
  };

  // Espiral de Lâminas: blades appear one after another around the target and spiral into it.
  A.SKILL.chaos_3 = (world, p) => {
    const e = K.aimEnemy(world, p, 40, 15);
    const pt = e ? K.center(e) : (() => { const a = K.aimPoint(world, p, 34, 4); a.y += 1.2; return a; })();
    K.effect(world, 'chaos_3', { pid: p.id, x: pt.x, y: pt.y, z: pt.z, target: e ? e.id : 0, dur: 1.05, _acc: 0, done: 0 });
    return true;
  };
  A.FX.chaos_3 = (world, fx, dt) => {
    const e = fx.target && world.enemies[fx.target];
    if (e) { const c = K.center(e); fx.x = c.x; fx.y = c.y; fx.z = c.z; }
    const p = world.players[fx.pid];
    fx._acc += dt;
    if (fx._acc >= 0.15 && fx.t < 0.9) {
      fx._acc = 0;
      const r = 4.2 * (1 - fx.t / 0.9) + 0.6;
      for (const t of K.enemiesIn(world, fx, r)) K.hit(world, p, t, 6, { kind: 'chaos', from: fx, push: -3, stun: 0.25, dot: true });
    }
    if (!fx.done && fx.t >= 0.9) {
      fx.done = 1;
      K.blast(world, p, fx, 3.6, 85, { kind: 'chaos', push: 12, launch: 7, stun: 0.8, falloff: 0.3, crater: [1.8, 0.4], style: 'ESPIRAL DE LÂMINAS', pts: 12 });
      K.vfx(world, 'chaos_3:converge', { x: fx.x, y: fx.y, z: fx.z });
    }
    return fx.t >= fx.dur;
  };

  // Dança do Caos: a metal flower of blades around you; every blow of yours changes its pattern.
  A.ULT.chaos_ult = {
    start(world, p, u) { u.fx = K.effect(world, 'chaos_ult', { pid: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z, n: 24, form: 0, dur: u.dur + 0.2, _acc: 0 }); u.formCd = 0; },
    step(world, p, u, dt) {
      const fx = u.fx;
      fx.x = p.pos.x; fx.y = p.pos.y; fx.z = p.pos.z;
      u.formCd -= dt;
      fx._acc += dt;
      if (fx._acc < 0.12) return;
      fx._acc = 0;
      const e = K.nearest(world, { x: p.pos.x, y: p.pos.y + 1, z: p.pos.z }, 11);
      if (!e) return;
      K.hit(world, p, e, 18, { kind: 'chaos', push: 3, stun: 0.25, stop: 0.01, style: 'DANÇA DO CAOS', pts: 1 });
      if (!e.dead) K.status(world, e, 'mark', 6, { by: 'chaos_ult', pid: p.id });
      const c = K.center(e);
      K.vfx(world, 'chaos_ult:dart', { pid: p.id, x: c.x, y: c.y, z: c.z, slot: (world.tick % 24) });
    },
    end(world, p, u) {
      const marked = Object.values(world.enemies).filter((e) => e.st && e.st.mark && e.st.mark.by === 'chaos_ult');
      const list = marked.length ? marked : K.enemiesIn(world, p.pos, 30);
      const each = list.length ? Math.min(150, 400 / list.length) : 0;
      for (let i = 0; i < 24; i++) {
        const e = list.length ? list[i % list.length] : null;
        const a = (i / 24) * Math.PI * 2;
        K.spell(world, p, {
          look: 'chaos_ult', color: C('chaos'), pos: { x: p.pos.x + Math.cos(a) * 3, y: p.pos.y + 1.4 + Math.sin(i) * 0.5, z: p.pos.z + Math.sin(a) * 3 }, vel: V.v(),
          delay: 0.02 * i, target: e ? e.id : 0, homing: 9, retarget: 30, speed: 60, aimAtLaunch: true, radius: 0.7, life: 2.5,
          dmg: e ? each * list.length / 24 : 16, pierce: 0, hit: { kind: 'chaos', push: 6, stun: 0.5, stop: 0.02, style: 'EXECUÇÃO CAÓTICA', pts: 3 },
        });
      }
    },
  };
  A.ON_MELEE.push((world, p) => {
    const u = p.ult;
    if (!u || u.id !== 'chaos_ult' || u.formCd > 0) return;
    u.formCd = 0.4;
    u.fx.form = (u.fx.form + 1) % 4;
    K.vfx(world, 'chaos_ult:form', { pid: p.id, form: u.fx.form });
  });

  // ======================= 20. DOMÍNIO ELEMENTAL =======================
  const FUSIONS = ['steam', 'plasma', 'frost'];
  // Fusão Elemental: two elemental spheres orbit each other in your hands and fuse; alternates.
  A.SKILL.elemental_1 = (world, p) => {
    p.fusion = ((p.fusion == null ? -1 : p.fusion) + 1) % 3;
    const kind = FUSIONS[p.fusion];
    const f = K.fwd(p);
    K.spell(world, p, {
      look: 'elemental_1', variant: kind, color: kind === 'steam' ? 0xffe0d0 : kind === 'plasma' ? 0xff60ff : 0xb0f0ff,
      pos: handPos(p, -1), vel: V.v(f.x * 55, f.y * 55, f.z * 55), speed: 55, radius: 0.6, dmg: kind === 'steam' ? 0 : 40, pierce: kind === 'plasma' ? 2 : 0, life: 1.6, aimAtLaunch: true,
      on: 'elemental_1', explode: kind === 'steam' ? { r: 5, dmg: 40, falloff: 0.2, opts: { kind: 'steam', push: 10, stun: 0.6, status: 'blind', statusT: 2 } } : null, explodeOnHit: kind === 'steam',
      status: kind === 'plasma' ? { name: 'burn', t: 3, data: { dps: 8, by: 'elemental_1' } } : null,
      hit: { kind: 'elemental', push: 5, stun: 0.4, stop: 0.03, style: 'FUSÃO ELEMENTAL', pts: 5 },
    });
    K.vfx(world, 'elemental_1:fuse', { pid: p.id, variant: kind });
    return true;
  };
  A.SPELL_HIT.elemental_1 = (world, q, e) => {
    if (q.variant !== 'frost' || e.dead) return;
    const p = world.players[q.pid];
    K.status(world, e, 'freeze', 1.5, { pid: q.pid, by: 'elemental_1' });
    const n = K.nearest(world, K.center(e), 9, { [e.id]: 1 });
    if (n) { const pts = K.chain(world, p, n, 2, 8, 20, { kind: 'elemental', status: 'shock', statusT: 0.5 }); pts[0] = [q.pos.x, q.pos.y, q.pos.z]; K.vfx(world, 'elemental_1:frostArc', { pts }); }
  };

  // Orbes Elementais: four symbols turn into orbs (fire, ice, lightning, arcane) that fight on their own.
  A.SKILL.elemental_2 = (world, p) => {
    for (const fx of world.effects) if (fx.kind === 'elemental_2' && fx.pid === p.id) fx.dur = fx.t;
    K.effect(world, 'elemental_2', { pid: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z, dur: 10, _cd: [0.3, 0.6, 0.9, 1.2] });
    return true;
  };
  const ORB = ['fire', 'ice', 'thunder', 'arcane'];
  A.FX.elemental_2 = (world, fx, dt) => {
    const p = world.players[fx.pid];
    if (!p || p.dead) return true;
    fx.x = p.pos.x; fx.y = p.pos.y; fx.z = p.pos.z;
    for (let i = 0; i < 4; i++) {
      fx._cd[i] -= dt;
      if (fx._cd[i] > 0) continue;
      const e = K.nearest(world, { x: p.pos.x, y: p.pos.y + 1, z: p.pos.z }, 13);
      if (!e) { fx._cd[i] = 0.3; continue; }
      fx._cd[i] = 1.2;
      const el = ORB[i];
      K.hit(world, p, e, 17.5, { kind: 'elemental', push: 3, stun: 0.3, style: 'ORBE', pts: 2 });
      if (!e.dead) {
        if (el === 'fire') K.status(world, e, 'burn', 3, { dps: 6, pid: p.id, by: 'elemental_2' });
        if (el === 'ice') K.status(world, e, 'slow', 2.5, { k: 0.5, pid: p.id, by: 'elemental_2' });
        if (el === 'thunder') K.status(world, e, 'shock', 0.5, { pid: p.id, by: 'elemental_2' });
        if (el === 'arcane') K.status(world, e, 'weak', 3, { k: 0.25, pid: p.id, by: 'elemental_2' });
      }
      const c = K.center(e);
      K.vfx(world, 'elemental_2:shot', { pid: p.id, orb: i, el, x: c.x, y: c.y, z: c.z });
    }
    return fx.t >= fx.dur;
  };

  // Combo Elemental: three symbols in a row on the target: mark, react, explode.
  A.SKILL.elemental_3 = (world, p) => {
    const e = K.aimEnemy(world, p, 42, 16) || K.nearest(world, p.pos, 14);
    if (!e) return false;
    K.effect(world, 'elemental_3', { pid: p.id, target: e.id, x: e.pos.x, y: e.pos.y + e.def.height * 0.5, z: e.pos.z, dur: 0.75, stage: 0 });
    return true;
  };
  A.FX.elemental_3 = (world, fx) => {
    const e = world.enemies[fx.target];
    if (e) { const c = K.center(e); fx.x = c.x; fx.y = c.y; fx.z = c.z; }
    const p = world.players[fx.pid];
    const at = [0, 0.3, 0.6];
    while (fx.stage < 3 && fx.t >= at[fx.stage]) {
      const s = fx.stage++;
      if (s === 0 && e) { K.hit(world, p, e, 30, { kind: 'elemental', push: 2, stun: 0.4 }); K.status(world, e, 'burn', 3, { dps: 6, pid: p.id, by: 'elemental_3' }); }
      if (s === 1 && e) { K.hit(world, p, e, 30, { kind: 'elemental', push: 2, stun: 0.4 }); K.status(world, e, 'freeze', 1, { pid: p.id, by: 'elemental_3' }); }
      if (s === 2) K.blast(world, p, fx, 5, 60, { kind: 'elemental', push: 12, launch: 8, stun: 0.9, falloff: 0.3, crater: [2.2, 0.5], status: 'shock', statusT: 0.6, style: 'COMBO ELEMENTAL', pts: 12 });
      K.vfx(world, 'elemental_3:stage', { stage: s, x: fx.x, y: fx.y, z: fx.z });
    }
    return fx.t >= fx.dur;
  };

  // Cataclismo Elemental: fire, ice, lightning and arcane take the arena in turns, then fuse.
  A.ULT.elemental_ult = {
    start(world, p, u) { u.acc = 0; u.turn = 0; K.effect(world, 'elemental_ult', { pid: p.id, x: p.pos.x, y: 0, z: p.pos.z, dur: u.dur + 1.5, turn: 0 }); },
    step(world, p, u, dt) {
      u.acc += dt;
      if (u.acc < 0.45) return;
      u.acc = 0;
      const el = ORB[u.turn++ % 4];
      for (const fx of world.effects) if (fx.kind === 'elemental_ult' && fx.pid === p.id) fx.turn = u.turn % 4;
      const list = K.enemiesIn(world, p.pos, 40);
      const e = list.length ? list[(world.rng() * list.length) | 0] : null;
      const t = e ? { x: e.pos.x, y: K.groundAt(world, e.pos.x, e.pos.z, e.pos.y + 0.5), z: e.pos.z } : (() => { const a = world.rng() * 6.28; return { x: p.pos.x + Math.cos(a) * 12, y: 0, z: p.pos.z + Math.sin(a) * 12 }; })();
      if (el === 'fire') {
        const from = { x: t.x - 8, y: t.y + 30, z: t.z + 5 };
        K.spell(world, p, { look: 'elemental_ult:fire', color: SO.Schools.ELEMENT_COLORS.fire, pos: from, vel: V.v(), dir: V.norm(V.v(), V.sub(V.v(), t, from)), speed: 55, radius: 0.9, dmg: 0, life: 3,
          explode: { r: 3.4, dmg: 45, falloff: 0.3, crater: [2, 0.6], opts: { kind: 'elemental', push: 8, stun: 0.5, status: 'burn', statusT: 3, statusData: { dps: 8 } } }, explodeOnHit: true });
      } else if (el === 'ice') {
        K.blast(world, p, { x: t.x, y: t.y + 1, z: t.z }, 3.2, 35, { kind: 'elemental', push: 4, launch: 9, stun: 0.6, falloff: 0.2, status: 'freeze', statusT: 2 });
        K.vfx(world, 'elemental_ult:icePillar', { x: t.x, y: t.y, z: t.z });
      } else if (el === 'thunder' && e) {
        const pts = K.chain(world, p, e, 3, 10, 35, { kind: 'elemental', status: 'shock', statusT: 0.5 });
        pts[0] = [t.x, t.y + 30, t.z];
        K.vfx(world, 'elemental_ult:bolt', { pts });
      } else {
        K.blast(world, p, { x: t.x, y: t.y + 1, z: t.z }, 8, 30, { kind: 'elemental', push: 9, stun: 0.4, falloff: 0.2, status: 'weak', statusT: 3, statusData: { k: 0.25 } });
        K.vfx(world, 'elemental_ult:arcane', { x: t.x, y: t.y, z: t.z });
      }
    },
    end(world, p) {
      const pt = K.aimPoint(world, p, 55, 6);
      K.effect(world, 'elemental_ult:sphere', { pid: p.id, x: pt.x, y: K.groundAt(world, pt.x, pt.z, pt.y + 0.5) + 4, z: pt.z, dur: 1.3, done: 0 });
    },
  };
  A.FX['elemental_ult:sphere'] = (world, fx) => {
    if (fx.done || fx.t < fx.dur) return false;
    fx.done = 1;
    K.blast(world, world.players[fx.pid], fx, 12, 500, { kind: 'elemental', push: 28, launch: 18, stun: 1.6, falloff: 0.5, crater: [9, 2.6], style: 'CATACLISMO ELEMENTAL', pts: 30 });
    K.vfx(world, 'elemental_ult:nova', { x: fx.x, y: fx.y, z: fx.z });
    return true;
  };
})(typeof window !== 'undefined' ? (window.SO = window.SO || {}) : (globalThis.SO = globalThis.SO || {}));
