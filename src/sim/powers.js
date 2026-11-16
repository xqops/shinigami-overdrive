// Player powers: the school system (sim/schools.js). Pure simulation (no DOM / THREE).
//  - Q / R / G cast the chosen school's skills 1-3 (cooldown only);
//  - F fires the school's ultimate once the overdrive meter (filled by style) is full;
//  - E (teleport / shunpo) stays in player.js as basic movement.
// Each ability registers in SO.Abilities (sim/abilities-*.js). This file runs the shared parts:
// cooldowns, buffs, lasting effects, ultimates and the hooks the world calls on damage.
(function (SO) {
  'use strict';
  const V = SO.V, CFG = SO.CFG;

  // registry filled by sim/abilities-*.js
  const A = SO.Abilities = SO.Abilities || {};
  for (const k of ['SKILL', 'ULT', 'FX', 'BUFF', 'SPELL_HIT', 'SPELL_END', 'SPELL_STEP', 'STATUS_END', 'ALLY_END', 'ALLY_ARRIVE']) A[k] = A[k] || {};
  for (const k of ['ON_DAMAGE', 'ON_MELEE', 'ON_HURT', 'ON_KILL', 'ON_SLAM', 'ON_BLINK']) A[k] = A[k] || [];

  function eye(p) { return { x: p.pos.x, y: p.pos.y + CFG.EYE, z: p.pos.z }; }
  function center(e) { return SO.Enemies.center(e); }

  // Enemy closest to the crosshair within range and angle, with line of sight.
  function aimTarget(world, p, range, maxAngleDeg, exclude) {
    const o = eye(p), f = SO.forward(p.yaw, p.pitch, V.v());
    let best = null, bestScore = 1e9;
    for (const k in world.enemies) {
      const e = world.enemies[k];
      if (exclude && exclude[e.id]) continue;
      const c = center(e);
      const d = V.sub(V.v(), c, o);
      const l = V.len(d);
      if (l > range) continue;
      const ang = Math.acos(SO.clamp(V.dot(d, f) / (l || 1), -1, 1)) * 180 / Math.PI;
      if (ang > maxAngleDeg) continue;
      V.scale(d, d, 1 / (l || 1));
      if (world.raycast(o, d, l) < l - e.def.radius - 0.6) continue;
      const score = ang * 1.5 + l * 0.5;
      if (score < bestScore) { bestScore = score; best = e; }
    }
    return best;
  }

  // Q / R / G -> skill slot 0..2 of the player's school.
  function cast(world, p, slot) {
    const school = SO.Schools.get(p.school);
    const sk = school.skills[slot];
    if (!sk) return;
    const fn = A.SKILL[sk.id];
    if (!fn) return;
    if ((p.skillCd[slot] || 0) > 0) { world.emit('powerFail', { pid: p.id, id: sk.id, slot }); return; }
    const ok = fn(world, p, sk);
    if (ok === false) { world.emit('powerFail', { pid: p.id, id: sk.id, slot, why: 'target' }); return; }
    p.skillCd[slot] = sk.cd;
    world.emit('ability', { pid: p.id, id: sk.id, school: school.id, slot, x: p.pos.x, y: p.pos.y + 1, z: p.pos.z });
  }

  // F -> ultimate (needs a full overdrive meter).
  function ult(world, p) {
    if (p.ult) { const u = A.ULT[p.ult.id]; if (u && u.press) u.press(world, p, p.ult); return; }
    if (p.overdrive < 100) { world.emit('powerFail', { pid: p.id, id: 'ult', slot: 3 }); return; }
    const school = SO.Schools.get(p.school);
    const U = A.ULT[school.ult.id];
    if (!U) return;
    p.overdrive = 0;
    p.ult = { id: school.ult.id, school: school.id, t: 0, dur: school.ult.dur };
    world.emit('ultStart', { pid: p.id, id: school.ult.id, school: school.id, name: school.ult.name, dur: school.ult.dur, x: p.pos.x, y: p.pos.y, z: p.pos.z });
    SO.World.style(world, p, school.ult.name.toUpperCase(), 30);
    if (U.start) U.start(world, p, p.ult);
  }

  function endUlt(world, p) {
    const u = p.ult;
    if (!u) return;
    p.ult = null;
    const U = A.ULT[u.id];
    if (U && U.end) U.end(world, p, u);
    world.emit('ultEnd', { pid: p.id, id: u.id, school: u.school, x: p.pos.x, y: p.pos.y, z: p.pos.z });
  }

  // ---------------- per tick ----------------
  function step(world, dt, edt) {
    for (const k in world.players) {
      const p = world.players[k];
      for (let i = 0; i < 3; i++) if (p.skillCd[i] > 0) p.skillCd[i] = Math.max(0, p.skillCd[i] - dt);
      for (const name in p.buffs) {
        const b = p.buffs[name];
        b.t -= dt;
        const B = A.BUFF[name];
        if (B && B.step && !p.dead) B.step(world, p, b, dt);
        if (b.t <= 0) {
          delete p.buffs[name];
          if (B && B.end) B.end(world, p, b);
          world.emit('buffEnd', { pid: p.id, name });
        }
      }
      if (p.ult) {
        p.ult.t += dt;
        const U = A.ULT[p.ult.id];
        if (U && U.step && !p.dead) U.step(world, p, p.ult, dt);
        if (p.ult && (p.ult.t >= p.ult.dur || p.dead)) endUlt(world, p);
      }
    }
    for (let i = world.effects.length - 1; i >= 0; i--) {
      const fx = world.effects[i];
      fx.t += fx.enemyTime ? edt : dt;
      const F = A.FX[fx.kind];
      const done = F ? F(world, fx, fx.enemyTime ? edt : dt) : fx.t >= fx.dur;
      if (done || fx.t >= (fx.dur || 0) + 30) {
        world.effects.splice(i, 1);
        world.emit('effectEnd', { id: fx.id, kind: fx.kind, look: fx.look, x: fx.x, y: fx.y, z: fx.z });
      }
    }
  }

  // ---------------- hooks called by the world ----------------
  // multiplier on damage the player deals with this hit
  function dmgMult(world, p, e, src) {
    let m = 1;
    for (const name in p.buffs) { const b = p.buffs[name]; if (b.dmg && (!b.meleeOnly || src.melee)) m *= b.dmg; }
    return m;
  }

  function onDamage(world, p, e, amount, src) {
    for (const h of A.ON_DAMAGE) h(world, p, e, amount, src);
    if (src.melee) for (const h of A.ON_MELEE) h(world, p, e, src);
  }

  function onKill(world, p, e, src) { for (const h of A.ON_KILL) h(world, p, e, src); }

  // returns the damage the player actually takes (absorbs, fortress, immortality, ...)
  function onHurt(world, p, dmg, src) {
    for (const h of A.ON_HURT) { dmg = h(world, p, dmg, src || {}); if (dmg <= 0) return 0; }
    return dmg;
  }

  // Compact player power state for snapshots and the HUD.
  function view(p) {
    const buffs = {};
    for (const n in p.buffs) buffs[n] = Math.round(p.buffs[n].t * 10) / 10;
    return { school: p.school, cd: p.skillCd.slice(), ult: p.ult ? { id: p.ult.id, t: p.ult.t, dur: p.ult.dur } : null, buffs };
  }

  // Effects are sent to clients without their bookkeeping (hit lists, handler state).
  function effectView(fx) {
    const o = {};
    for (const k in fx) { const v = fx[k]; if (k[0] !== '_' && (typeof v !== 'object' || v === null || Array.isArray(v))) o[k] = v; }
    return o;
  }

  SO.Powers = { cast, ult, endUlt, step, aimTarget, dmgMult, onDamage, onKill, onHurt, view, effectView };
})(typeof window !== 'undefined' ? (window.SO = window.SO || {}) : (globalThis.SO = globalThis.SO || {}));
