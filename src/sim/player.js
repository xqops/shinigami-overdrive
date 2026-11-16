// Player simulation: movement tech (dash, slide, slam, wall jump, air jump), melee combos,
// weapon alts, parry, and anime powers. Driven only by input commands -> server-safe.
(function (SO) {
  'use strict';
  const V = SO.V, CFG = SO.CFG, BTN = SO.BTN;
  const tmpF = V.v(), tmpR = V.v(), tmpF3 = V.v(), tmpD = V.v();

  function create(id, sp, name, opts) {
    const school = opts && opts.school && SO.Schools.BY_ID[opts.school] ? opts.school : SO.Schools.DEFAULT;
    return {
      school, skillCd: [0, 0, 0], buffs: {}, ult: null, shield: 0,
      id, name: name || 'RONIN-' + id, kind: 'player',
      pos: { x: sp.x, y: sp.y, z: sp.z }, vel: V.v(),
      radius: CFG.PLAYER_RADIUS, height: CFG.PLAYER_HEIGHT,
      yaw: 0, pitch: 0,
      hp: 100, maxHp: 100, energy: 50, overdrive: 0,
      grounded: false, coyote: 0, jumpBuffer: 0, airJumps: 1, wallJumps: 0, wallCool: 0, airTime: 0,
      dashCharges: CFG.DASH_CHARGES, dashRegen: 0, dashTimer: 0, dashDir: V.v(),
      sliding: false, slideDir: V.v(), slideSpeed: 0,
      slamming: false, meteor: false, slamStartY: 0, slamBounce: 0, padCool: 0,
      weapon: 0, swing: null, comboIdx: -1, comboTimer: 0, attackBuffer: 0,
      alt: null, altCd: 0, scytheOut: 0,
      crit: 0, waveCd: 0, blinkCd: 0, invuln: 0, dodgeFlag: false, hurtTimer: 0, lastRoll: 0,
      dead: false, prevButtons: 0, lastSeq: 0, score: 0, kills: 0,
      style: { rank: 0, gauge: 0, used: {}, count: {} },
    };
  }

  function bodyBlocked(world, pos, r, h) {
    const boxes = world.arena.boxes;
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (pos.x + r > b.min.x && pos.x - r < b.max.x && pos.z + r > b.min.z && pos.z - r < b.max.z && pos.y + h > b.min.y && pos.y < b.max.y) return true;
    }
    const dxz = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
    return dxz > world.arena.radius - r;
  }

  function step(world, p, cmd, dt) {
    if (p.dead) return;
    p.lastSeq = cmd.seq;
    p.yaw = cmd.yaw;
    p.pitch = SO.clamp(cmd.pitch, -1.55, 1.55);
    const btn = cmd.buttons;
    const pressed = btn & ~p.prevButtons;
    p.prevButtons = btn;

    p.invuln -= dt; p.crit -= dt; p.waveCd -= dt; p.blinkCd -= dt; p.altCd -= dt; p.hurtTimer -= dt;
    p.comboTimer -= dt; p.coyote -= dt; p.jumpBuffer -= dt; p.slamBounce -= dt; p.wallCool -= dt; p.padCool -= dt; p.attackBuffer -= dt;
    if (p.invuln <= 0) p.dodgeFlag = false;
    if (p.dashCharges < CFG.DASH_CHARGES) {
      p.dashRegen += dt;
      if (p.dashRegen >= CFG.DASH_REGEN) { p.dashCharges++; p.dashRegen = 0; }
    }

    // Weapon switch (instant, like ULTRAKILL quick-swaps; cancels current swing).
    if (cmd.weaponSel >= 0 && cmd.weaponSel < SO.WEAPONS.length && cmd.weaponSel !== p.weapon && !p.alt) {
      p.weapon = cmd.weaponSel; p.swing = null; p.comboIdx = -1; p.comboTimer = 0;
      world.emit('weaponSwitch', { pid: p.id, w: p.weapon });
      SO.World.style(world, p, 'SWAP', 2);
    }

    movement(world, p, cmd, btn, pressed, dt);
    combat(world, p, btn, pressed, dt);
  }

  function movement(world, p, cmd, btn, pressed, dt) {
    const fwd = SO.forwardFlat(p.yaw, tmpF), rt = SO.right(p.yaw, tmpR);
    let wx = fwd.x * cmd.moveZ + rt.x * cmd.moveX, wz = fwd.z * cmd.moveZ + rt.z * cmd.moveX;
    const wl = Math.sqrt(wx * wx + wz * wz);
    if (wl > 1) { wx /= wl; wz /= wl; }
    const hasWish = wl > 0.01;

    if (pressed & BTN.JUMP) p.jumpBuffer = 0.13;

    // Dash
    if ((pressed & BTN.DASH) && p.dashCharges >= 1 && !p.slamming) {
      p.dashCharges--;
      p.dashTimer = CFG.DASH_TIME;
      if (hasWish) V.set(p.dashDir, wx, 0, wz); else V.set(p.dashDir, fwd.x, 0, fwd.z);
      V.norm(p.dashDir, p.dashDir);
      p.sliding = false;
      p.invuln = Math.max(p.invuln, CFG.DASH_TIME + 0.06);
      world.emit('dash', { pid: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z, dx: p.dashDir.x, dz: p.dashDir.z });
    }

    // Slam (slide key in the air) / slide (slide key on the ground)
    const slideHeld = (btn & BTN.SLIDE) !== 0;
    if ((pressed & BTN.SLIDE) && !p.grounded && !p.slamming && p.dashTimer <= 0) {
      p.slamming = true; p.meteor = false; p.slamStartY = p.pos.y;
      world.emit('slamStart', { pid: p.id });
    }
    if (slideHeld && p.grounded && !p.sliding && !p.slamming && p.dashTimer <= 0) {
      p.sliding = true;
      if (hasWish) V.set(p.slideDir, wx, 0, wz); else V.set(p.slideDir, fwd.x, 0, fwd.z);
      V.norm(p.slideDir, p.slideDir);
      p.slideSpeed = Math.max(CFG.SLIDE_SPEED, V.lenXZ(p.vel));
      world.emit('slide', { pid: p.id });
    }
    if (p.sliding && !slideHeld) p.sliding = false;

    const charging = p.alt && p.alt.kind === 'iaido';
    const maxSpeed = CFG.MOVE_SPEED * (charging ? 0.45 : 1) * speedMult(p);

    if (p.dashTimer > 0) {
      p.dashTimer -= dt;
      p.vel.x = p.dashDir.x * CFG.DASH_SPEED; p.vel.z = p.dashDir.z * CFG.DASH_SPEED; p.vel.y = 0;
      if (p.dashTimer <= 0) { p.vel.x = p.dashDir.x * 19; p.vel.z = p.dashDir.z * 19; }
    } else if (p.slamming) {
      if (p.meteor) { p.vel.x = fwd.x * 9; p.vel.z = fwd.z * 9; } else { p.vel.x *= 0.85; p.vel.z *= 0.85; }
      p.vel.y = -CFG.SLAM_SPEED;
    } else if (p.sliding && p.grounded) {
      if (hasWish) {
        p.slideDir.x += (wx - p.slideDir.x) * Math.min(1, 2.5 * dt);
        p.slideDir.z += (wz - p.slideDir.z) * Math.min(1, 2.5 * dt);
        V.norm(p.slideDir, p.slideDir);
      }
      p.slideSpeed = SO.approach(p.slideSpeed, 17, 5 * dt);
      p.vel.x = p.slideDir.x * p.slideSpeed; p.vel.z = p.slideDir.z * p.slideSpeed;
    } else if (p.grounded) {
      // Quake-style ground model: friction, then accelerate only along the wish direction.
      // Friction is skipped on the tick we jump, so chained hops keep their speed (bunny hop).
      if ((btn & BTN.JUMP) && p.jumpBuffer <= 0) p.jumpBuffer = dt * 1.5; // holding jump auto-hops
      if (p.jumpBuffer <= 0) applyFriction(p, dt);
      accelerate(p, wx, wz, hasWish ? maxSpeed : 0, CFG.GROUND_ACCEL, dt);
    } else {
      // Air: tiny capped wish speed with a strong accel = air strafing. Turning the mouse while
      // holding a strafe key adds speed sideways without the forward part being capped.
      if (hasWish) {
        airAccelerate(p, wx, wz, maxSpeed, dt);
        // Gentle extra steering so players who don't strafe still control their jumps.
        if (V.lenXZ(p.vel) < maxSpeed) accelerate(p, wx, wz, maxSpeed, CFG.AIR_ACCEL, dt);
      }
    }
    const hs = V.lenXZ(p.vel);
    if (hs > CFG.MAX_SPEED) { p.vel.x *= CFG.MAX_SPEED / hs; p.vel.z *= CFG.MAX_SPEED / hs; }

    // Jumps: ground/coyote, slam-bounce, wall jump, air jump.
    if (p.jumpBuffer > 0) {
      if (p.grounded || p.coyote > 0) {
        let vy = CFG.JUMP_VEL;
        if (p.slamBounce > 0) { vy = 25; world.emit('slamJump', { pid: p.id }); SO.World.style(world, p, 'SLAM JUMP', 8); }
        if (p.dashTimer > 0) { p.dashTimer = 0; p.vel.x = p.dashDir.x * 25; p.vel.z = p.dashDir.z * 25; SO.World.style(world, p, 'DASH JUMP', 4); }
        if (p.sliding) { p.sliding = false; SO.World.style(world, p, 'SLIDE JUMP', 3); }
        p.vel.y = vy; p.grounded = false; p.coyote = 0; p.jumpBuffer = 0;
        world.emit('jump', { pid: p.id });
      } else {
        const wn = p.wallCool <= 0 && p.wallJumps < CFG.WALL_JUMPS ? world.wallProbe(p.pos, p.radius + 0.5, p.height) : null;
        if (wn) {
          p.vel.x = wn.x * 13 + wx * 5; p.vel.z = wn.z * 13 + wz * 5; p.vel.y = 13.5;
          p.wallJumps++; p.wallCool = 0.14; p.jumpBuffer = 0; p.slamming = false; p.dashTimer = 0;
          world.emit('wallJump', { pid: p.id, n: p.wallJumps, x: p.pos.x, y: p.pos.y, z: p.pos.z });
          SO.World.style(world, p, 'WALLJUMP', 3);
        } else if (p.airJumps > 0 && !p.slamming) {
          p.vel.y = CFG.AIR_JUMP_VEL; p.airJumps--; p.jumpBuffer = 0; p.dashTimer = 0;
          world.emit('airJump', { pid: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z });
        }
      }
    }

    if (p.dashTimer <= 0 && !p.slamming) {
      const g = charging && !p.grounded ? CFG.GRAVITY * 0.25 : CFG.GRAVITY;
      p.vel.y -= g * dt;
      // Wall slide: hugging a wall while falling slows the fall.
      if (!p.grounded && p.vel.y < -6 && hasWish && world.wallProbe(p.pos, p.radius + 0.15, p.height)) p.vel.y = -6;
    }

    const wasGround = p.grounded;
    const prevVy = p.vel.y;
    const res = world.moveBody(p, dt);
    p.grounded = res.ground;
    if (p.grounded) { p.coyote = 0.1; p.airTime = 0; } else p.airTime += dt;

    if (!wasGround && p.grounded) {
      p.airJumps = 1; p.wallJumps = 0;
      if (p.slamming) landSlam(world, p);
      else world.emit('land', { pid: p.id, vy: prevVy });
    }

    if (p.grounded && p.padCool <= 0) {
      const pads = world.arena.pads;
      for (let i = 0; i < pads.length; i++) {
        const pd = pads[i];
        const dx = p.pos.x - pd.x, dz = p.pos.z - pd.z;
        if (dx * dx + dz * dz < pd.r * pd.r && p.pos.y < 0.3) {
          const l = Math.sqrt(pd.x * pd.x + pd.z * pd.z) || 1;
          p.vel.y = pd.power; p.vel.x += pd.x / l * 6; p.vel.z += pd.z / l * 6;
          p.grounded = false; p.padCool = 0.6; p.sliding = false;
          world.emit('pad', { pid: p.id, x: pd.x, z: pd.z });
        }
      }
    }
  }

  // Speed removed scales with current speed, with a floor (STOP_SPEED) so slow drift stops crisply.
  function applyFriction(p, dt) {
    const speed = V.lenXZ(p.vel);
    if (speed < 0.01) { p.vel.x = 0; p.vel.z = 0; return; }
    const drop = Math.max(speed, CFG.STOP_SPEED) * CFG.FRICTION * dt;
    const k = Math.max(0, speed - drop) / speed;
    p.vel.x *= k; p.vel.z *= k;
  }

  // Adds speed toward (wx,wz) only until the velocity's projection on it reaches wishSpeed.
  function accelerate(p, wx, wz, wishSpeed, accel, dt) {
    const cur = p.vel.x * wx + p.vel.z * wz;
    const add = wishSpeed - cur;
    if (add <= 0) return;
    const a = Math.min(accel * dt * Math.max(wishSpeed, 1), add);
    p.vel.x += wx * a; p.vel.z += wz * a;
  }

  function airAccelerate(p, wx, wz, wishSpeed, dt) {
    const cur = p.vel.x * wx + p.vel.z * wz;
    const add = CFG.AIR_WISH_CAP - cur;
    if (add <= 0) return;
    const a = Math.min(CFG.AIR_STRAFE_ACCEL * dt * wishSpeed, add);
    p.vel.x += wx * a; p.vel.z += wz * a;
  }

  function landSlam(world, p) {
    p.slamming = false;
    p.slamBounce = 0.3;
    const meteor = p.meteor;
    p.meteor = false;
    const fall = Math.max(0, p.slamStartY - p.pos.y);
    const R = meteor ? 9.5 : 4.5 + Math.min(3, fall * 0.2);
    const dmg = meteor ? 95 + fall * 3 : 18 + fall * 1.5;
    for (const k in world.enemies) {
      const e = world.enemies[k];
      const d = V.distXZ(e.pos, p.pos);
      if (d > R + e.def.radius || Math.abs(e.pos.y - p.pos.y) > 3.5) continue;
      const dx = (e.pos.x - p.pos.x) / (d || 1), dz = (e.pos.z - p.pos.z) / (d || 1);
      world.damageEnemy(e, dmg * (1 - (d / R) * 0.5), {
        pid: p.id, kind: 'slam', weapon: meteor ? 'zanbato' : null, dir: { x: dx, y: 0, z: dz }, push: meteor ? 12 : 7,
        launch: meteor ? 15 : 9, stun: 0.9, stop: meteor ? 0.12 : 0.05, styleName: meteor ? 'METEOR' : 'GROUND SLAM', stylePts: meteor ? 20 : 8,
      });
    }
    world.emit('slam', { pid: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z, meteor, power: fall, r: R });
    for (const h of SO.Abilities.ON_SLAM) h(world, p, meteor, fall);
  }

  // movement speed from buffs (Fênix Viva, Tempestade Divina, the slow of Feixe Contínuo, ...)
  function speedMult(p) {
    let m = 1;
    for (const n in p.buffs) if (p.buffs[n].speed) m *= p.buffs[n].speed;
    return m;
  }

  // ---------------- combat ----------------
  function combat(world, p, btn, pressed, dt) {
    const W = SO.weaponFor ? SO.weaponFor(p, p.weapon) : SO.WEAPONS[p.weapon];

    if (p.swing) {
      const s = p.swing, d = s.def;
      s.t += dt;
      if (d.special && !s.special && s.t >= d.hit[0]) { s.special = true; const fn = SO.CharSpecials && SO.CharSpecials[d.special]; if (fn) fn(world, p, d); }
      if (d.dmg > 0 && s.t >= d.hit[0] && s.t <= d.hit[1] + dt * 0.5) meleeTick(world, p, s);
      if (s.t >= d.dur) { p.swing = null; p.comboTimer = s.W.comboWindow; }
    }

    if (pressed & BTN.ATTACK) p.attackBuffer = 0.22;
    const scytheAway = W.id === 'scythe' && p.scytheOut;
    if (!p.alt && !scytheAway) {
      const canChain = !p.swing || p.swing.t >= p.swing.def.cancel;
      if (canChain && (p.attackBuffer > 0 || ((btn & BTN.ATTACK) && !p.swing))) {
        p.attackBuffer = 0;
        const chain = p.swing || p.comboTimer > 0;
        p.comboIdx = chain ? (p.comboIdx + 1) % W.combo.length : 0;
        startSwing(world, p, W.combo[p.comboIdx], W, p.comboIdx);
      }
    }

    // ----- weapon alts (may cancel the tail of a combo swing) -----
    const free = !p.swing || p.swing.t >= p.swing.def.cancel;
    if (W.id === 'katana') {
      if ((btn & BTN.ALT) && !p.alt && free && p.altCd <= 0) {
        p.swing = null;
        p.alt = { kind: 'iaido', charge: 0 };
        world.emit('iaidoCharge', { pid: p.id });
      }
      if (p.alt && p.alt.kind === 'iaido') {
        p.alt.charge = Math.min(1, p.alt.charge + dt / 0.6);
        if (!(btn & BTN.ALT)) { doIaido(world, p, p.alt.charge); p.alt = null; p.altCd = 0.4; }
      }
    } else if (p.alt) {
      p.alt = null;
    }
    if (W.id === 'scythe' && (pressed & BTN.ALT) && !p.scytheOut && free && p.altCd <= 0) {
      p.swing = null;
      const f3 = SO.forward(p.yaw, p.pitch, tmpF3);
      const q = SO.Projectiles.spawn(world, {
        kind: 'scythe', owner: 'player', pid: p.id,
        pos: { x: p.pos.x + f3.x, y: p.pos.y + CFG.EYE - 0.2 + f3.y, z: p.pos.z + f3.z },
        vel: { x: f3.x * 38, y: f3.y * 38, z: f3.z * 38 },
        radius: 1.7, dmg: 21, life: 4, pierce: true, rehit: 0.18, phase: 'out', outT: 0.5, weapon: 'scythe',
      });
      p.scytheOut = q.id; p.altCd = 0.3;
      world.emit('scytheThrow', { pid: p.id });
    }
    if (W.id === 'zanbato' && (pressed & BTN.ALT) && free && p.altCd <= 0) {
      p.swing = null;
      if (p.grounded) {
        startSwing(world, p, W.upper, W);
        p.vel.y = W.upper.playerLaunch; p.grounded = false; p.altCd = 0.5;
      } else if (!p.slamming) {
        p.slamming = true; p.meteor = true; p.slamStartY = p.pos.y; p.altCd = 0.6; p.dashTimer = 0;
        world.emit('meteorStart', { pid: p.id });
      }
    }

    // character weapons: the heavy attack on the right button
    if (W.heavy && (pressed & BTN.ALT) && free && p.altCd <= 0) {
      p.swing = null; p.comboIdx = -1; p.comboTimer = 0;
      startSwing(world, p, W.heavy, W, 'h');
      p.altCd = W.heavyCd || 0.5;
    }

    // ----- powers -----
    const P = SO.POWERS;
    // the school's three skills on Q / R / G and its ultimate on F (see src/sim/powers.js)
    if (pressed & BTN.WAVE) SO.Powers.cast(world, p, 0);
    if (pressed & BTN.P2) SO.Powers.cast(world, p, 1);
    if (pressed & BTN.P3) SO.Powers.cast(world, p, 2);
    const freeBlink = p.buffs.voidwalk; // Colapso das Dimensões: teleport without cost or cooldown
    if ((pressed & BTN.BLINK) && (freeBlink || (p.energy >= P.blink.cost && p.blinkCd <= 0))) doBlink(world, p, freeBlink);
    if (pressed & BTN.DOMAIN) SO.Powers.ult(world, p);
  }

  function styleNameFor(def, W) {
    if (def.thrust) return 'PIERCE';
    if (def.reap) return 'REAPED';
    if (def.launch) return 'LAUNCHER';
    if (def.spin) return W.id === 'scythe' ? 'HARVEST' : 'TORNADO';
    if (def.heavy) return 'CLEAVE';
    return W.id === 'scythe' ? 'SWEEP' : 'SLICE';
  }

  function startSwing(world, p, def, W, step) {
    p.swing = { def, W, w: p.weapon, t: 0, hits: {}, styleName: styleNameFor(def, W) };
    p.lastRoll = def.roll;
    const fwd = SO.forwardFlat(p.yaw, tmpF);
    const lunge = p.grounded ? def.lunge : def.lunge * 0.5;
    p.vel.x += fwd.x * lunge; p.vel.z += fwd.z * lunge;
    for (const k in world.enemies) {
      const e = world.enemies[k];
      if (e.etype !== 'tengu' || e.state !== 'circle' && e.state !== 'recover' || (e.dodgeCd || 0) > world.t) continue;
      if (V.dist(e.pos, p.pos) > def.range + 2 || world.rng() > 0.55) continue;
      const side = world.rng() < 0.5 ? -1 : 1;
      const dx = e.pos.x - p.pos.x, dz = e.pos.z - p.pos.z, dl = Math.sqrt(dx * dx + dz * dz) || 1;
      e.vel.x += (-dz / dl * side + dx / dl * 0.6) * 22; e.vel.z += (dx / dl * side + dz / dl * 0.6) * 22; e.vel.y += 4;
      e.dodgeCd = world.t + 2.2; e.dodgeT = world.t + 0.35;
      world.emit('enemyDodge', { id: e.id, x: e.pos.x, y: e.pos.y + 1, z: e.pos.z });
    }
    world.emit('swing', { pid: p.id, w: p.weapon, cw: W.school || null, step: step == null ? 0 : step, anim: def.anim, dur: def.dur, roll: def.roll, range: def.range, heavy: !!def.heavy, arc: def.arc });
  }

  function meleeTick(world, p, s) {
    const def = s.def;
    const W = s.W || SO.WEAPONS[s.w];
    const eye = { x: p.pos.x, y: p.pos.y + CFG.EYE, z: p.pos.z };
    const f3 = SO.forward(p.yaw, p.pitch, tmpF3);
    const arc = def.arc * Math.PI / 180;
    let landed = 0;
    for (const k in world.enemies) {
      const e = world.enemies[k];
      const last = s.hits[e.id];
      if (last != null && (!def.rehit || s.t - last < def.rehit)) continue;
      if (e.dodgeT && e.dodgeT > world.t) continue;
      const c = { x: e.pos.x, y: e.pos.y + e.def.height * 0.5, z: e.pos.z };
      V.sub(tmpD, c, eye);
      const l = V.len(tmpD);
      if (l - e.def.radius > def.range) continue;
      const dot = V.dot(tmpD, f3) / (l || 1);
      const ang = Math.acos(SO.clamp(dot, -1, 1)) - Math.atan2(e.def.radius + 0.4, l);
      if (ang > arc && l > e.def.radius + 1.1) continue;
      s.hits[e.id] = s.t;
      const hl = Math.sqrt(tmpD.x * tmpD.x + tmpD.z * tmpD.z) || 1;
      world.damageEnemy(e, def.dmg, {
        pid: p.id, melee: true, kind: 'melee', weapon: W.id, dir: { x: tmpD.x / hl, y: 0, z: tmpD.z / hl },
        push: def.push, launch: def.launch, stun: def.stun, stop: def.stop, styleName: s.styleName, stylePts: def.dmg * 0.28,
      });
      landed++;
      if (def.lifesteal) p.hp = Math.min(p.maxHp, p.hp + def.lifesteal);
      if (def.status && SO.Status && !e.dead) SO.Status.apply(world, e, def.status, def.statusT || 2, { pid: p.id, by: W.id, dps: def.statusDps || 8 });
    }
    if (landed >= 3 && !s.multi) { s.multi = true; SO.World.style(world, p, 'CROWD CONTROL', 10); }

    // Parry: any enemy projectile inside the swing arc is sent back where you aim.
    for (const k in world.projectiles) {
      const q = world.projectiles[k];
      if (q.owner !== 'enemy' || !q.parryable) continue;
      V.sub(tmpD, q.pos, eye);
      const l = V.len(tmpD);
      if (l > def.range + 1.2) continue;
      const dot = V.dot(tmpD, f3) / (l || 1);
      if (Math.acos(SO.clamp(dot, -1, 1)) > arc + 0.35 && l > 1.6) continue;
      parry(world, p, q, W);
    }
  }

  function parry(world, p, q, W) {
    const f3 = SO.forward(p.yaw, p.pitch, V.v());
    // Light aim assist: snap to the enemy closest to the crosshair.
    let best = null, bestDot = Math.cos(10 * Math.PI / 180);
    for (const k in world.enemies) {
      const e = world.enemies[k];
      const d = V.sub(V.v(), { x: e.pos.x, y: e.pos.y + e.def.height * 0.5, z: e.pos.z }, q.pos);
      const l = V.len(d);
      const dt = V.dot(d, f3) / (l || 1);
      if (dt > bestDot) { bestDot = dt; best = V.scale(d, d, 1 / l); }
    }
    const dir = best || f3;
    const sp = Math.max(V.len(q.vel), 20) * 2.8;
    V.scale(q.vel, dir, sp);
    q.owner = 'player'; q.pid = p.id; q.dmg = q.dmg * 4 + 25; q.life = 3; q.parried = true; q.hitSet = {}; q.homing = 0; q.radius *= 1.4;
    p.hp = Math.min(p.maxHp, p.hp + 20);
    p.energy = Math.min(100, p.energy + 15);
    p.invuln = Math.max(p.invuln, 0.25);
    world.emit('parry', { pid: p.id, x: q.pos.x, y: q.pos.y, z: q.pos.z, w: p.weapon, id: q.id });
    SO.World.style(world, p, 'PARRY', 22);
  }

  function doIaido(world, p, charge) {
    const dist = 7 + 10 * charge;
    const dir = SO.forward(p.yaw, SO.clamp(p.pitch, -0.45, 0.45), V.v());
    const from = V.clone(p.pos);
    const stepLen = 0.4;
    const steps = Math.ceil(dist / stepLen);
    const next = V.v();
    for (let i = 0; i < steps; i++) {
      V.addScaled(next, p.pos, dir, stepLen);
      if (next.y < 0) next.y = 0;
      if (bodyBlocked(world, next, p.radius, p.height)) {
        // Slide along whatever we hit instead of stopping dead.
        const alt = { x: next.x, y: p.pos.y, z: next.z };
        if (bodyBlocked(world, alt, p.radius, p.height)) break;
        V.copy(next, alt);
      }
      V.copy(p.pos, next);
    }
    const to = V.clone(p.pos);
    const a = { x: from.x, y: from.y + 1, z: from.z }, b = { x: to.x, y: to.y + 1, z: to.z };
    const targets = [];
    for (const k in world.enemies) {
      const e = world.enemies[k];
      const c = { x: e.pos.x, y: e.pos.y + e.def.height * 0.5, z: e.pos.z };
      if (segDist(a, b, c) < e.def.radius + 2.0) targets.push(e);
    }
    targets.sort((x, y) => V.dist(x.pos, from) - V.dist(y.pos, from));
    targets.forEach((e, i) => {
      world.schedule(0.3 + i * 0.05, { kind: 'cut', target: e.id, pid: p.id, dmg: 55 + 125 * charge, dir: { x: dir.x, y: 0, z: dir.z }, a: world.rng() * Math.PI });
    });
    p.vel.x = dir.x * 12; p.vel.z = dir.z * 12; p.vel.y = Math.max(p.vel.y, 2);
    p.invuln = Math.max(p.invuln, 0.5);
    world.emit('iaido', { pid: p.id, fx: from.x, fy: from.y, fz: from.z, tx: to.x, ty: to.y, tz: to.z, charge, n: targets.length });
    if (targets.length >= 3) SO.World.style(world, p, 'MULTI-CUT', 14);
  }

  function segDist(a, b, c) {
    const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
    const l2 = abx * abx + aby * aby + abz * abz || 1;
    let t = ((c.x - a.x) * abx + (c.y - a.y) * aby + (c.z - a.z) * abz) / l2;
    t = SO.clamp(t, 0, 1);
    const x = a.x + abx * t - c.x, y = a.y + aby * t - c.y, z = a.z + abz * t - c.z;
    return Math.sqrt(x * x + y * y + z * z);
  }

  function doBlink(world, p, free) {
    const P = SO.POWERS.blink;
    const eye = { x: p.pos.x, y: p.pos.y + CFG.EYE, z: p.pos.z };
    const f3 = SO.forward(p.yaw, p.pitch, V.v());
    let target = null, bestScore = 1e9;
    for (const k in world.enemies) {
      const e = world.enemies[k];
      const c = { x: e.pos.x, y: e.pos.y + e.def.height * 0.5, z: e.pos.z };
      const d = V.sub(V.v(), c, eye);
      const l = V.len(d);
      if (l > P.lockRange) continue;
      const ang = Math.acos(SO.clamp(V.dot(d, f3) / l, -1, 1)) * 180 / Math.PI;
      if (ang > P.lockAngle) continue;
      V.scale(d, d, 1 / l);
      if (world.raycast(eye, d, l) < l - e.def.radius - 0.5) continue;
      const score = ang * 2 + l;
      if (score < bestScore) { bestScore = score; target = e; }
    }
    const from = V.clone(p.pos);
    let yaw = null;
    if (target) {
      let nx = target.pos.x - p.pos.x, nz = target.pos.z - p.pos.z;
      const nl = Math.sqrt(nx * nx + nz * nz) || 1; nx /= nl; nz /= nl;
      const off = target.def.radius + 1.4;
      let dest = { x: target.pos.x + nx * off, y: Math.max(0, target.pos.y), z: target.pos.z + nz * off };
      if (bodyBlocked(world, dest, p.radius, p.height)) dest = { x: target.pos.x - nx * off, y: Math.max(0, target.pos.y), z: target.pos.z - nz * off };
      if (!bodyBlocked(world, dest, p.radius, p.height)) {
        V.copy(p.pos, dest);
        yaw = Math.atan2(nx, nz); // face back toward the target
        p.crit = P.crit;
        SO.World.style(world, p, 'SHUNPO', 8);
      } else target = null;
    }
    if (!target) {
      const dist = Math.max(0, world.raycast(eye, f3, P.range) - 0.9);
      const dest = { x: p.pos.x + f3.x * dist, y: Math.max(0, p.pos.y + f3.y * dist), z: p.pos.z + f3.z * dist };
      if (!bodyBlocked(world, dest, p.radius, p.height)) V.copy(p.pos, dest);
    }
    p.vel.x *= 0.3; p.vel.z *= 0.3; p.vel.y = Math.max(p.vel.y, 3);
    p.airJumps = 1; p.slamming = false; p.dashTimer = 0;
    p.invuln = Math.max(p.invuln, 0.3);
    if (!free) { p.energy -= P.cost; p.blinkCd = P.cd; }
    world.emit('blink', { pid: p.id, fx: from.x, fy: from.y, fz: from.z, tx: p.pos.x, ty: p.pos.y, tz: p.pos.z, yaw, target: target ? target.id : 0 });
    for (const h of SO.Abilities.ON_BLINK) h(world, p, from);
  }

  SO.Player = { create, step };
})(typeof window !== 'undefined' ? (window.SO = window.SO || {}) : (globalThis.SO = globalThis.SO || {}));
