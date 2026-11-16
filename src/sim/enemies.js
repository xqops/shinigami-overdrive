// Enemy roster + AI. Every enemy telegraphs (windup state) so the player can read, dodge or parry.
(function (SO) {
  'use strict';
  const V = SO.V, CFG = SO.CFG;

  const DEFS = {
    husk:   { name: 'GAKI',        hp: 60,   radius: 0.5, height: 1.9, speed: 10.5, ground: true,  knock: 1.0,  stunMult: 1.0, score: 100 },
    caster: { name: 'NUKEKUBI',    hp: 70,   radius: 0.6, height: 2.0, speed: 7,    ground: false, knock: 0.7,  stunMult: 0.8, score: 150 },
    tengu:  { name: 'KARASU',      hp: 50,   radius: 0.55, height: 1.8, speed: 12,   ground: false, knock: 0.8,  stunMult: 1.0, score: 160 },
    brute:  { name: 'HANNYA-ONI',  hp: 420,  radius: 1.3, height: 4.2, speed: 6,    ground: true,  knock: 0.25, stunMult: 0.35, score: 500, big: true },
    ashura: { name: 'ASHURA',      hp: 3200, radius: 2.4, height: 6.0, speed: 5,    ground: false, knock: 0.04, stunMult: 0.08, score: 5000, big: true, boss: true },
  };

  function spawn(world, type, pos, hpScale) {
    const def = DEFS[type];
    const hp = Math.round(def.hp * (hpScale || 1));
    const e = {
      id: world.id(), etype: type, def,
      pos: { x: pos.x, y: pos.y, z: pos.z }, vel: V.v(), yaw: 0,
      radius: def.radius, height: def.height,
      hp, maxHp: hp, state: 'spawn', stateT: 0,
      flash: 0, stun: 0, stagger: 0, grounded: false, juggle: 0,
      cd: 1 + world.rng() * 1.5, shots: 0, strafe: world.rng() < 0.5 ? -1 : 1, dead: false, phase: 1, attack: null,
    };
    if (!def.ground) e.pos.y = Math.max(e.pos.y, type === 'ashura' ? 3 : 4);
    world.enemies[e.id] = e;
    world.emit('spawn', { id: e.id, etype: type, x: e.pos.x, y: e.pos.y, z: e.pos.z, boss: !!def.boss, hp });
    return e;
  }

  function setState(world, e, s) { e.state = s; e.stateT = 0; }

  function center(e) { return { x: e.pos.x, y: e.pos.y + e.def.height * 0.5, z: e.pos.z }; }
  function eyeOf(p) { return { x: p.pos.x, y: p.pos.y + CFG.EYE - 0.25, z: p.pos.z }; }

  function faceToward(e, tx, tz, k, dt) {
    const want = Math.atan2(tx - e.pos.x, tz - e.pos.z);
    e.yaw += SO.angleDiff(e.yaw, want) * Math.min(1, k * dt);
  }

  function los(world, from, to) {
    const d = V.sub(V.v(), to, from);
    const l = V.len(d);
    V.scale(d, d, 1 / (l || 1));
    return world.raycast(from, d, l) >= l - 0.8;
  }

  function step(world, e, edt, dt) {
    e.flash -= dt;
    e.stateT += edt;
    e.juggle -= edt;
    e.stagger = Math.max(0, e.stagger - e.maxHp * 0.22 * edt);
    const target = world.targetFor(e);

    let desired = null; // desired horizontal velocity for ground units / full velocity for flyers
    if (e.state === 'spawn') {
      if (e.stateT > 0.8) setState(world, e, e.etype === 'tengu' ? 'circle' : e.etype === 'caster' ? 'move' : e.etype === 'ashura' ? 'idle' : 'chase');
    } else if (e.stun > 0) {
      e.stun -= edt;
      if (e.attack) e.attack = null;
    } else if (target) {
      desired = AI[e.etype](world, e, target, edt);
    }

    if (e.def.ground || e.state === 'crashed') groundPhysics(world, e, desired, edt);
    else flyPhysics(world, e, desired, edt);

    // Bodies never overlap players (keeps the camera out of enemy models).
    for (const k in world.players) {
      const p = world.players[k];
      if (p.dead) continue;
      if (p.pos.y > e.pos.y + e.def.height || e.pos.y > p.pos.y + p.height) continue;
      const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z;
      const rr = e.radius + p.radius + 0.15;
      const d2 = dx * dx + dz * dz;
      if (d2 < rr * rr) {
        const d = Math.sqrt(d2) || 0.01;
        const push = rr - d;
        e.pos.x += dx / d * push; e.pos.z += dz / d * push;
      }
    }

    if (e.etype === 'brute' && e.stagger > 170 && e.stun <= 0) {
      e.stagger = 0; e.stun = 1.6; e.state = 'chase';
      world.emit('stagger', { id: e.id, x: e.pos.x, y: e.pos.y + 2, z: e.pos.z });
    }
  }

  function groundPhysics(world, e, desired, edt) {
    // Separation so crowds spread around the player instead of stacking.
    let sx = 0, sz = 0;
    for (const k in world.enemies) {
      const o = world.enemies[k];
      if (o === e || !o.def.ground) continue;
      const dx = e.pos.x - o.pos.x, dz = e.pos.z - o.pos.z;
      const rr = e.radius + o.radius + 0.3;
      const d2 = dx * dx + dz * dz;
      if (d2 < rr * rr && d2 > 1e-4) { const d = Math.sqrt(d2); sx += dx / d * (rr - d); sz += dz / d * (rr - d); }
    }
    if (e.grounded && desired && e.stun <= 0) {
      const tx = desired.x + sx * 4, tz = desired.z + sz * 4;
      e.vel.x += (tx - e.vel.x) * Math.min(1, 10 * edt);
      e.vel.z += (tz - e.vel.z) * Math.min(1, 10 * edt);
    } else if (e.grounded) {
      e.vel.x *= Math.exp(-6 * edt); e.vel.z *= Math.exp(-6 * edt);
      e.vel.x += sx * 2 * edt; e.vel.z += sz * 2 * edt;
    } else {
      e.vel.x *= Math.exp(-0.6 * edt); e.vel.z *= Math.exp(-0.6 * edt);
    }
    const g = e.juggle > 0 ? CFG.GRAVITY * 0.38 : CFG.GRAVITY;
    e.vel.y -= g * edt;
    const res = world.moveBody(e, edt);
    e.grounded = res.ground;
    e.lastWall = res.wall;
  }

  function flyPhysics(world, e, desired, edt) {
    if (desired && e.stun <= 0) {
      e.vel.x += (desired.x - e.vel.x) * Math.min(1, 4 * edt);
      e.vel.y += (desired.y - e.vel.y) * Math.min(1, 4 * edt);
      e.vel.z += (desired.z - e.vel.z) * Math.min(1, 4 * edt);
    } else {
      e.vel.x *= Math.exp(-3 * edt); e.vel.y *= Math.exp(-3 * edt); e.vel.z *= Math.exp(-3 * edt);
    }
    const res = world.moveBody(e, edt, { step: false });
    e.grounded = false;
    e.lastWall = res.wall;
    e.lastGround = res.ground;
  }

  const AI = {
    husk(world, e, p, dt) {
      const dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z, dy = p.pos.y - e.pos.y;
      const d = Math.sqrt(dx * dx + dz * dz) || 1;
      faceToward(e, p.pos.x, p.pos.z, 10, dt);
      if (e.state === 'chase') {
        if (d < 2.4 && Math.abs(dy) < 2.2) { setState(world, e, 'windup'); world.emit('enemyWindup', { id: e.id }); return { x: 0, z: 0 }; }
        if (e.grounded && ((e.lastWall && world.rng() < 0.08) || (dy > 1.5 && d < 7 && world.rng() < 0.05))) e.vel.y = 13;
        const sp = e.def.speed * (d > 25 ? 1.25 : 1);
        return { x: dx / d * sp, z: dz / d * sp };
      }
      if (e.state === 'windup') {
        if (e.stateT > 0.42) {
          setState(world, e, 'attack');
          e.vel.x += dx / d * 9; e.vel.z += dz / d * 9;
          const fx = Math.sin(e.yaw), fz = Math.cos(e.yaw);
          if (d < 3.0 && Math.abs(dy) < 2.2 && (dx * fx + dz * fz) / d > 0.2) world.damagePlayer(p, 14, { x: e.pos.x, z: e.pos.z, kind: 'claw' });
          world.emit('enemyAttack', { id: e.id, etype: 'husk' });
        }
        return { x: 0, z: 0 };
      }
      if (e.state === 'attack') { if (e.stateT > 0.45) setState(world, e, 'chase'); return { x: 0, z: 0 }; }
      setState(world, e, 'chase');
      return null;
    },

    caster(world, e, p, dt) {
      const c = center(e);
      const dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z;
      const d = Math.sqrt(dx * dx + dz * dz) || 1;
      faceToward(e, p.pos.x, p.pos.z, 6, dt);
      const hoverY = 4.5 + Math.sin(world.t * 1.3 + e.id) * 1.2 + Math.max(0, p.pos.y - 1) * 0.6;
      const radial = d < 13 ? -1 : d > 22 ? 1 : 0;
      if (world.rng() < 0.005) e.strafe *= -1;
      const tx = -dz / d * e.strafe, tz = dx / d * e.strafe;
      const want = { x: (dx / d * radial + tx * 0.8) * e.def.speed, y: (hoverY - e.pos.y) * 2, z: (dz / d * radial + tz * 0.8) * e.def.speed };
      if (e.state === 'move') {
        e.cd -= dt;
        if (e.cd <= 0 && d < 42 && los(world, c, eyeOf(p))) { setState(world, e, 'windup'); world.emit('enemyWindup', { id: e.id }); }
        return want;
      }
      if (e.state === 'windup') {
        if (e.stateT > 0.55) {
          e.shots++;
          if (e.shots % 4 === 0 && world.enemyCount() < SO.CFG.MAX_ALIVE) {
            for (let i = 0; i < 2; i++) {
              const a = world.rng() * Math.PI * 2;
              const sp = { x: SO.clamp(e.pos.x + Math.cos(a) * 3, -40, 40), y: 0, z: SO.clamp(e.pos.z + Math.sin(a) * 3, -40, 40) };
              if (!world.pointInBox({ x: sp.x, y: 0.5, z: sp.z })) SO.Enemies.spawn(world, 'husk', sp, world.director.hpScale);
            }
            world.emit('summon', { id: e.id, x: c.x, y: c.y, z: c.z });
            e.cd = 2.5 + world.rng();
            setState(world, e, 'move');
            return { x: 0, y: 0, z: 0 };
          }
          const tgt = eyeOf(p);
          const dir = V.norm(V.v(), V.sub(V.v(), tgt, c));
          const spread = e.shots % 3 === 0 ? [-0.22, 0, 0.22] : [0];
          spread.forEach((a) => {
            const ca = Math.cos(a), sa = Math.sin(a);
            const vx = dir.x * ca - dir.z * sa, vz = dir.x * sa + dir.z * ca;
            SO.Projectiles.spawn(world, { kind: 'orb', owner: 'enemy', pos: V.clone(c), vel: { x: vx * 15, y: dir.y * 15, z: vz * 15 }, radius: 0.45, dmg: 16, life: 6, parryable: true });
          });
          world.emit('enemyShoot', { id: e.id, x: c.x, y: c.y, z: c.z });
          e.cd = 2 + world.rng() * 1.4;
          setState(world, e, 'move');
        }
        return { x: 0, y: (hoverY - e.pos.y) * 2, z: 0 };
      }
      setState(world, e, 'move');
      return want;
    },

    tengu(world, e, p, dt) {
      const c = center(e);
      const pe = eyeOf(p);
      if (e.state === 'circle') {
        const ang = Math.atan2(e.pos.z - p.pos.z, e.pos.x - p.pos.x) + 0.9 * e.strafe * dt * 1.5;
        const r = 11;
        const tx = p.pos.x + Math.cos(ang) * r, tz = p.pos.z + Math.sin(ang) * r, ty = p.pos.y + 7;
        faceToward(e, p.pos.x, p.pos.z, 6, dt);
        e.cd -= dt;
        if (e.cd <= 0 && los(world, c, pe)) { setState(world, e, 'windup'); world.emit('enemyWindup', { id: e.id, etype: 'tengu' }); }
        return { x: (tx - e.pos.x) * 2.5, y: (ty - e.pos.y) * 2.5, z: (tz - e.pos.z) * 2.5 };
      }
      if (e.state === 'windup') {
        faceToward(e, p.pos.x, p.pos.z, 12, dt);
        if (e.stateT > 0.45) {
          const dir = V.norm(V.v(), V.sub(V.v(), pe, c));
          e.diveDir = dir;
          setState(world, e, 'dive');
        }
        return { x: 0, y: 2, z: 0 };
      }
      if (e.state === 'dive') {
        const sp = 30;
        V.scale(e.vel, e.diveDir, sp);
        if (V.dist(c, { x: p.pos.x, y: p.pos.y + 1, z: p.pos.z }) < 1.7) {
          world.damagePlayer(p, 18, { x: e.pos.x, z: e.pos.z, kind: 'dive' });
          setState(world, e, 'recover');
        } else if (e.lastGround || e.lastWall || e.pos.y < 0.2) {
          setState(world, e, 'crashed'); e.stun = 0; e.crash = 1.4;
          world.emit('tenguCrash', { id: e.id, x: e.pos.x, y: e.pos.y, z: e.pos.z });
        } else if (e.stateT > 1.1) setState(world, e, 'recover');
        return { x: e.vel.x, y: e.vel.y, z: e.vel.z };
      }
      if (e.state === 'crashed') {
        e.crash -= dt;
        if (e.crash <= 0) { setState(world, e, 'recover'); e.vel.y = 8; }
        return null;
      }
      if (e.state === 'recover') {
        if (e.stateT > 0.9) { setState(world, e, 'circle'); e.cd = 1.8 + world.rng() * 1.8; }
        return { x: e.vel.x * 0.5, y: 9, z: e.vel.z * 0.5 };
      }
      setState(world, e, 'circle');
      return null;
    },

    brute(world, e, p, dt) {
      const dx = p.pos.x - e.pos.x, dz = p.pos.z - e.pos.z;
      const d = Math.sqrt(dx * dx + dz * dz) || 1;
      if (e.state === 'chase') {
        faceToward(e, p.pos.x, p.pos.z, 4, dt);
        e.cd -= dt;
        if (d < 4.3) { setState(world, e, 'windup'); world.emit('enemyWindup', { id: e.id, etype: 'brute' }); return { x: 0, z: 0 }; }
        if (e.cd <= 0 && d > 9 && d < 28 && e.grounded) { setState(world, e, 'leapWind'); world.emit('enemyWindup', { id: e.id, etype: 'brute' }); return { x: 0, z: 0 }; }
        return { x: dx / d * e.def.speed, z: dz / d * e.def.speed };
      }
      if (e.state === 'windup') {
        faceToward(e, p.pos.x, p.pos.z, 3, dt);
        if (e.stateT > 0.75) {
          const fx = Math.sin(e.yaw), fz = Math.cos(e.yaw);
          if (d < 5.2 && (dx * fx + dz * fz) / d > 0.3 && p.pos.y - e.pos.y < 2.5) world.damagePlayer(p, 30, { x: e.pos.x, z: e.pos.z, kind: 'smash' });
          world.addHazard({ kind: 'ring', x: e.pos.x + fx * 2.5, y: e.pos.y, z: e.pos.z + fz * 2.5, r: 0.5, speed: 15, maxR: 8, dmg: 14 });
          world.emit('bruteSmash', { id: e.id, x: e.pos.x + fx * 2.5, y: e.pos.y, z: e.pos.z + fz * 2.5 });
          setState(world, e, 'recover');
        }
        return { x: 0, z: 0 };
      }
      if (e.state === 'leapWind') {
        faceToward(e, p.pos.x, p.pos.z, 6, dt);
        if (e.stateT > 0.5) {
          const T = 2 * 16 / CFG.GRAVITY;
          e.vel.y = 16; e.vel.x = dx / T; e.vel.z = dz / T; e.grounded = false;
          setState(world, e, 'leap');
        }
        return { x: 0, z: 0 };
      }
      if (e.state === 'leap') {
        if (e.grounded && e.stateT > 0.2) {
          world.addHazard({ kind: 'ring', x: e.pos.x, y: e.pos.y, z: e.pos.z, r: 0.5, speed: 20, maxR: 19, dmg: 22 });
          world.emit('bruteSlam', { id: e.id, x: e.pos.x, y: e.pos.y, z: e.pos.z });
          setState(world, e, 'recover');
          e.cd = 4 + world.rng() * 3;
        }
        return null;
      }
      if (e.state === 'recover') { if (e.stateT > 0.9) setState(world, e, 'chase'); return { x: 0, z: 0 }; }
      setState(world, e, 'chase');
      return null;
    },

    ashura(world, e, p, dt) {
      e.phase = e.hp < e.maxHp * 0.5 ? 2 : 1;
      const fast = e.phase === 2 ? 1.45 : 1;
      faceToward(e, p.pos.x, p.pos.z, 2, dt);
      // Hover around the shrine, leaning toward the player.
      const cx = SO.clamp(p.pos.x * 0.4, -14, 14), cz = SO.clamp(p.pos.z * 0.4, -14, 14);
      const hy = 4 + Math.sin(world.t * 0.8) * 0.8;
      const want = { x: (cx - e.pos.x) * 0.8, y: (hy - e.pos.y) * 1.5, z: (cz - e.pos.z) * 0.8 };
      const c = center(e);
      if (e.state === 'idle') {
        e.cd -= dt * fast;
        if (e.cd <= 0) {
          const opts = ['ring', 'spears', 'beam', 'ring', 'spears'];
          if (world.enemyCount() < 6) opts.push('summon');
          e.attack = world.rng.pick(opts);
          setState(world, e, 'windup');
          world.emit('bossWindup', { id: e.id, attack: e.attack });
        }
        return want;
      }
      if (e.state === 'windup') {
        const wind = e.attack === 'beam' ? 0.3 : 0.75 / fast;
        if (e.stateT > wind) {
          if (e.attack === 'ring') {
            const rings = e.phase === 2 ? 2 : 1;
            for (let r = 0; r < rings; r++) {
              const n = 20, off = r * (Math.PI / n);
              for (let i = 0; i < n; i++) {
                const a = (i / n) * Math.PI * 2 + off;
                SO.Projectiles.spawn(world, { kind: 'orb', owner: 'enemy', pos: { x: c.x, y: 1.3 + r * 1.6, z: c.z }, vel: { x: Math.cos(a) * (11 - r * 2), y: 0, z: Math.sin(a) * (11 - r * 2) }, radius: 0.55, dmg: 15, life: 7, parryable: true });
              }
            }
          } else if (e.attack === 'spears') {
            const n = e.phase === 2 ? 8 : 5;
            for (let i = 0; i < n; i++) {
              const a = (i / n) * Math.PI * 2;
              const sp = { x: c.x + Math.cos(a) * 3, y: c.y + 1.5, z: c.z + Math.sin(a) * 3 };
              const dir = V.norm(V.v(), V.sub(V.v(), eyeOf(p), sp));
              SO.Projectiles.spawn(world, { kind: 'spear', owner: 'enemy', pos: sp, vel: { x: dir.x * 4 + Math.cos(a) * 8, y: 6, z: dir.z * 4 + Math.sin(a) * 8 }, radius: 0.5, dmg: 16, life: 6, parryable: true, homing: 2.4, speed: 19 });
            }
          } else if (e.attack === 'beam') {
            const a0 = Math.atan2(p.pos.z - e.pos.z, p.pos.x - e.pos.x) - 0.9;
            world.addHazard({ kind: 'beam', owner: e.id, x: e.pos.x, y: 0.9, z: e.pos.z, angle: a0, spin: (world.rng() < 0.5 ? -1 : 1) * 1.3 * fast, len: 48, warn: 0.9, dur: 3.4, dmg: 22 });
          } else if (e.attack === 'summon') {
            for (let i = 0; i < 3; i++) {
              const a = world.rng() * Math.PI * 2;
              spawn(world, 'husk', { x: e.pos.x + Math.cos(a) * 8, y: 0, z: e.pos.z + Math.sin(a) * 8 }, 1 + world.director.wave * 0.05);
            }
          }
          world.emit('bossAttack', { id: e.id, attack: e.attack, x: c.x, y: c.y, z: c.z });
          setState(world, e, 'recover');
        }
        return { x: 0, y: want.y, z: 0 };
      }
      if (e.state === 'recover') {
        const hold = e.attack === 'beam' ? 4.4 : 1.1;
        if (e.stateT > hold) { setState(world, e, 'idle'); e.cd = (1.6 + world.rng() * 1.2); }
        return e.attack === 'beam' ? { x: 0, y: want.y, z: 0 } : want;
      }
      setState(world, e, 'idle');
      return want;
    },
  };

  SO.Enemies = { DEFS, spawn, step, center };
})(typeof window !== 'undefined' ? (window.SO = window.SO || {}) : (globalThis.SO = globalThis.SO || {}));
