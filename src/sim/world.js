// The World owns all simulation state. It is driven only by per-player input commands
// and a fixed timestep, and reports what happened as a list of plain-JSON events.
// That is the contract that lets a future server run this same file (see docs/MULTIPLAYER.md).
(function (SO) {
  'use strict';
  const V = SO.V, CFG = SO.CFG;

  const RANKS = [
    { l: 'D', name: 'DULL' },
    { l: 'C', name: 'CRISP' },
    { l: 'B', name: 'BLOODIED' },
    { l: 'A', name: 'ASCENDED' },
    { l: 'S', name: 'SHINIGAMI' },
    { l: 'SS', name: 'SUPERNOVA' },
    { l: 'SSS', name: 'SATORI' },
  ];

  const EMPTY_CMD = { seq: 0, moveX: 0, moveZ: 0, yaw: 0, pitch: 0, buttons: 0, weaponSel: -1 };

  class World {
    constructor(opts) {
      opts = opts || {};
      this.seed = opts.seed || 1337;
      this.rng = SO.rng(this.seed);
      this.t = 0;
      this.tick = 0;
      this.nextId = 1;
      this.arena = SO.Arena.build();
      this.players = {};
      this.enemies = {};
      this.projectiles = {};
      this.allies = {}; // summons, clones and decoys (sim/allies.js)
      this.hazards = [];
      this.delayed = [];
      this.effects = []; // lasting power effects (gravity wells, meteors)
      this.events = [];
      this.inputs = {};
      this.director = SO.Waves.create(this);
      this.over = false;
    }

    id() { return this.nextId++; }

    emit(type, data) { data = data || {}; data.type = type; data.t = this.t; this.events.push(data); }
    drainEvents() { const e = this.events; this.events = []; return e; }

    addPlayer(pid, name, opts) {
      const sp = this.arena.playerSpawns[Object.keys(this.players).length % this.arena.playerSpawns.length];
      const p = SO.Player.create(pid, sp, name, opts);
      this.players[pid] = p;
      this.emit('playerJoin', { pid });
      return p;
    }
    removePlayer(pid) { delete this.players[pid]; delete this.inputs[pid]; this.emit('playerLeave', { pid }); }
    setCommand(pid, cmd) { this.inputs[pid] = cmd; }

    playerCount() { let n = 0; for (const k in this.players) if (!this.players[k].dead) n++; return n; }
    enemyCount() { let n = 0; for (const k in this.enemies) n++; return n; }

    nearestPlayer(pos) {
      let best = null, bd = 1e9;
      for (const k in this.players) {
        const p = this.players[k];
        if (p.dead) continue;
        const d = V.dist(p.pos, pos);
        if (d < bd) { bd = d; best = p; }
      }
      return best;
    }

    // What an enemy goes for: the nearest living player or taunting ally. A blinded enemy chases a
    // phantom point near where it lost you, and its blows land on nothing.
    targetFor(e) {
      if (e.st && e.st.blind) {
        const b = e.st.blind;
        if (!b.ghost || this.t > b.ghostT) {
          const a = this.rng() * Math.PI * 2, r = 6 + this.rng() * 8;
          b.ghost = { pos: { x: e.pos.x + Math.cos(a) * r, y: e.pos.y, z: e.pos.z + Math.sin(a) * r }, vel: { x: 0, y: 0, z: 0 }, height: 1.8, radius: 0.4, isGhost: true, dead: false };
          b.ghostT = this.t + 1.5;
        }
        return b.ghost;
      }
      let best = this.nearestPlayer(e.pos), bd = best ? V.dist(best.pos, e.pos) : 1e9;
      for (const k in this.allies) {
        const a = this.allies[k];
        if (!a.def.taunt) continue;
        const d = V.dist(a.pos, e.pos) - (a.def.taunt === true ? 4 : 0); // decoys look a bit closer than they are
        if (d < bd) { bd = d; best = a; }
      }
      return best;
    }

    nearestEnemyTo(pos) {
      let best = null, bd = 1e9;
      for (const k in this.enemies) { const d = V.dist(this.enemies[k].pos, pos); if (d < bd) { bd = d; best = this.enemies[k]; } }
      return best;
    }

    enemyTimeScale() { return 1; }

    step(dt) {
      this.tick++;
      const ev0 = this.events.length;
      for (const k in this.players) SO.Player.step(this, this.players[k], this.inputs[k] || EMPTY_CMD, dt);
      const edt = dt * this.enemyTimeScale();
      for (const k in this.enemies) {
        const e = this.enemies[k];
        // statuses first (burn ticks, freeze, float); frozen or slowed enemies run on a scaled clock
        if (SO.Status) { SO.Status.step(this, e, dt); if (e.dead) continue; }
        SO.Enemies.step(this, e, edt * (SO.Status ? SO.Status.timeScale(e) : 1), dt);
      }
      if (SO.Allies) SO.Allies.step(this, dt);
      SO.Projectiles.step(this, dt, edt);
      SO.Powers.step(this, dt, edt);
      this.stepHazards(edt);
      this.stepDelayed(dt);
      SO.Waves.step(this, this.director, dt);
      if (SO.Destruct) SO.Destruct.step(this, dt, this.events.slice(ev0));
      for (const k in this.players) SO.World.styleDecay(this.players[k], dt);
      if (!this.over && Object.keys(this.players).length && this.playerCount() === 0) {
        this.over = true;
        this.emit('gameOver', { wave: this.director.wave });
      }
      this.t += dt;
    }

    // ---------- collision ----------
    // body: { pos (feet), vel, radius, height, grounded }. Returns contact info.
    moveBody(b, dt, opts) {
      const res = { ground: false, wall: false, nx: 0, nz: 0, ceil: false, box: null };
      const speed = V.len(b.vel) * dt;
      const n = Math.max(1, Math.ceil(speed / 0.3));
      const sdt = dt / n;
      const boxes = this.arena.boxes;
      const r = b.radius, h = b.height;
      const canStep = !opts || opts.step !== false;
      for (let s = 0; s < n; s++) {
        // X
        b.pos.x += b.vel.x * sdt;
        for (let i = 0; i < boxes.length; i++) {
          const bx = boxes[i];
          if (!overlap(b.pos, r, h, bx)) continue;
          const up = bx.max.y - b.pos.y;
          if (canStep && b.grounded && up > 0 && up <= 0.6) { b.pos.y = bx.max.y + 0.001; continue; }
          if (b.pos.x < (bx.min.x + bx.max.x) / 2) { b.pos.x = bx.min.x - r - 0.001; res.nx = -1; }
          else { b.pos.x = bx.max.x + r + 0.001; res.nx = 1; }
          res.nz = 0; res.wall = true; res.box = bx; b.vel.x = 0;
        }
        // Z
        b.pos.z += b.vel.z * sdt;
        for (let i = 0; i < boxes.length; i++) {
          const bx = boxes[i];
          if (!overlap(b.pos, r, h, bx)) continue;
          const up = bx.max.y - b.pos.y;
          if (canStep && b.grounded && up > 0 && up <= 0.6) { b.pos.y = bx.max.y + 0.001; continue; }
          if (b.pos.z < (bx.min.z + bx.max.z) / 2) { b.pos.z = bx.min.z - r - 0.001; res.nz = -1; }
          else { b.pos.z = bx.max.z + r + 0.001; res.nz = 1; }
          res.nx = res.nx || 0; res.wall = true; res.box = bx; b.vel.z = 0;
        }
        // Y
        b.pos.y += b.vel.y * sdt;
        for (let i = 0; i < boxes.length; i++) {
          const bx = boxes[i];
          if (!overlap(b.pos, r, h, bx)) continue;
          if (b.vel.y <= 0 && b.pos.y > (bx.min.y + bx.max.y) / 2) { b.pos.y = bx.max.y; res.ground = true; res.box = bx; }
          else { b.pos.y = bx.min.y - h - 0.001; res.ceil = true; }
          b.vel.y = 0;
        }
        // the floor (lower inside craters, see sim/destruct.js)
        const gy = SO.Destruct ? SO.Destruct.groundY(this.arena, b.pos.x, b.pos.z) : 0;
        if (b.pos.y <= gy) { b.pos.y = gy; if (b.vel.y < 0) b.vel.y = 0; res.ground = true; }
        // Circular arena wall.
        const R = this.arena.radius - r;
        const dxz = Math.sqrt(b.pos.x * b.pos.x + b.pos.z * b.pos.z);
        if (dxz > R) {
          const nx = -b.pos.x / dxz, nz = -b.pos.z / dxz;
          b.pos.x = -nx * R; b.pos.z = -nz * R;
          const vn = b.vel.x * nx + b.vel.z * nz;
          if (vn < 0) { b.vel.x -= vn * nx; b.vel.z -= vn * nz; }
          res.wall = true; res.nx = nx; res.nz = nz;
        }
      }
      return res;
    }

    // Returns the outward normal of a wall within `reach` of the body, for wall jumps.
    wallProbe(pos, r, h) {
      const boxes = this.arena.boxes;
      for (let i = 0; i < boxes.length; i++) {
        const bx = boxes[i];
        if (pos.y + h < bx.min.y || pos.y > bx.max.y - 0.2) continue;
        const cx = SO.clamp(pos.x, bx.min.x, bx.max.x), cz = SO.clamp(pos.z, bx.min.z, bx.max.z);
        const dx = pos.x - cx, dz = pos.z - cz;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (d < r && d > 1e-4) return { x: dx / d, z: dz / d };
      }
      const dxz = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
      if (dxz > this.arena.radius - r) return { x: -pos.x / dxz, z: -pos.z / dxz };
      return null;
    }

    // Ray vs boxes + floor. Returns distance to first hit (or maxDist).
    raycast(o, d, maxDist) {
      let best = maxDist;
      if (d.y < -1e-6) { const t = -o.y / d.y; if (t >= 0 && t < best) best = t; }
      const boxes = this.arena.boxes;
      for (let i = 0; i < boxes.length; i++) {
        const t = rayBox(o, d, boxes[i]);
        if (t >= 0 && t < best) best = t;
      }
      return best;
    }

    pointInBox(p, pad) {
      pad = pad || 0;
      const boxes = this.arena.boxes;
      for (let i = 0; i < boxes.length; i++) {
        const b = boxes[i];
        if (p.x > b.min.x - pad && p.x < b.max.x + pad && p.y > b.min.y - pad && p.y < b.max.y + pad && p.z > b.min.z - pad && p.z < b.max.z + pad) return true;
      }
      return p.y < (SO.Destruct ? SO.Destruct.groundY(this.arena, p.x, p.z) : 0);
    }

    // ---------- combat ----------
    damageEnemy(e, dmg, src) {
      if (!e || e.dead) return;
      const p = src.pid != null ? this.players[src.pid] : null;
      let mult = 1;
      let crit = false;
      if (p) {
        if (p.crit > 0) { mult *= 2; crit = true; }
      }
      const wasAir = !e.grounded && e.def.ground;
      if (SO.Status) mult *= SO.Status.vuln(e);
      if (p) mult *= SO.Powers.dmgMult(this, p, e, src);
      let amount = dmg * mult;
      if (e.etype === 'brute' && e.stun <= 0 && !crit && !src.power && !src.dot && src.weapon !== 'zanbato' && !['parry', 'iaido', 'slam'].includes(src.kind)) {
        const ax = p ? p.pos.x - e.pos.x : -(src.dir ? src.dir.x : 0), az = p ? p.pos.z - e.pos.z : -(src.dir ? src.dir.z : 0);
        const al = Math.sqrt(ax * ax + az * az) || 1;
        if ((ax * Math.sin(e.yaw) + az * Math.cos(e.yaw)) / al > 0.35) {
          e.guard = (e.guardT > this.t - 3 ? e.guard || 0 : 0) + 1; e.guardT = this.t;
          this.emit('block', { id: e.id, x: e.pos.x + Math.sin(e.yaw) * 1.4, y: e.pos.y + 2.2, z: e.pos.z + Math.cos(e.yaw) * 1.4, pid: src.pid });
          if (e.guard >= 5) { e.guard = 0; e.stun = 1.4; this.emit('stagger', { id: e.id, x: e.pos.x, y: e.pos.y + 2, z: e.pos.z }); if (p) SO.World.style(this, p, 'GUARD BREAK', 18); }
          amount *= 0.12;
        }
      }
      e.hp -= amount;
      if (!src.dot) e.flash = 0.12;
      e.stagger += amount;
      if (src.dir) {
        const push = (src.push || 0) * e.def.knock;
        e.vel.x += src.dir.x * push; e.vel.z += src.dir.z * push;
        if (src.dir.y) e.vel.y += src.dir.y * push * 0.5;
      }
      if (src.launch && e.def.ground) { e.vel.y = Math.max(e.vel.y, src.launch * e.def.knock); e.grounded = false; e.juggle = 0.7; }
      else if (!e.grounded && e.def.ground) { e.vel.y = Math.max(e.vel.y, 3.5); e.juggle = 0.5; }
      if (src.stun) e.stun = Math.max(e.stun, src.stun * e.def.stunMult);

      if (p) {
        const d = V.dist(p.pos, e.pos);
        const healMult = 1;
        if (d < CFG.HEAL_RANGE) {
          const heal = amount * 0.28 * healMult;
          p.hp = Math.min(p.maxHp, p.hp + heal);
          if (heal > 0.5) this.emit('heal', { pid: p.id, amount: heal });
        }
        p.energy = Math.min(100, p.energy + amount * 0.32);
        if (!p.grounded && src.melee) p.vel.y = Math.max(p.vel.y, 2.2); // anime air-stall
      }
      this.emit('hit', {
        id: e.id, etype: e.etype, pid: src.pid, x: e.pos.x, y: e.pos.y + e.def.height * 0.55, z: e.pos.z,
        dmg: amount, kind: src.kind, weapon: src.weapon, crit, stop: src.stop || 0,
        dx: src.dir ? src.dir.x : 0, dy: src.dir ? src.dir.y : 0, dz: src.dir ? src.dir.z : 0,
      });
      if (p) {
        if (src.styleName) SO.World.style(this, p, src.styleName, src.stylePts || 10);
        if (wasAir && !src.dot) SO.World.style(this, p, 'AIRSHOT', 12);
        SO.Powers.onDamage(this, p, e, amount, src);
      }
      if (e.hp <= 0 && !e.dead) this.killEnemy(e, src, p, amount);
    }

    killEnemy(e, src, p, lastHit) {
      e.dead = true;
      const overkill = -e.hp > e.maxHp * 0.6;
      this.emit('kill', {
        id: e.id, etype: e.etype, pid: src.pid, x: e.pos.x, y: e.pos.y + e.def.height * 0.5, z: e.pos.z,
        kind: src.kind, weapon: src.weapon, overkill, airborne: !e.grounded,
        dx: src.dir ? src.dir.x : 0, dy: src.dir ? src.dir.y : 0, dz: src.dir ? src.dir.z : 0, big: e.def.big || false,
      });
      if (p) {
        SO.Powers.onKill(this, p, e, src);
        p.kills++;
        SO.World.style(this, p, e.def.big ? 'BIG KILL' : 'KILL', e.def.score * 0.25);
        if (overkill) SO.World.style(this, p, 'OVERKILL', 15);
        if (!e.grounded && e.def.ground) SO.World.style(this, p, 'JUGGLE KILL', 18);
        if (src.kind === 'parry') SO.World.style(this, p, 'RETURN TO SENDER', 25);
        p.score += Math.round(e.def.score * (1 + p.style.rank * 0.5));
      }
      delete this.enemies[e.id];
    }

    damagePlayer(p, dmg, src) {
      if (p.isGhost) return false;
      if (p.isAlly) return SO.Allies.damage(this, p, dmg);
      if (p.dead) return false;
      if (p.shield > 0) { this.emit('shieldBlock', { pid: p.id, x: src && src.x, z: src && src.z }); return false; }
      if (p.invuln > 0) {
        if (!p.dodgeFlag) { p.dodgeFlag = true; SO.World.style(this, p, 'DODGE', 6); }
        return false;
      }
      dmg = SO.Powers.onHurt(this, p, dmg, src);
      if (dmg <= 0) { this.emit('absorb', { pid: p.id, x: src && src.x, z: src && src.z }); return false; }
      p.hp -= dmg;
      p.invuln = 0.35;
      p.hurtTimer = 0.4;
      const st = p.style;
      st.gauge -= 35;
      if (st.gauge < 0 && st.rank > 0) { st.rank--; st.gauge = 60; }
      if (st.gauge < 0) st.gauge = 0;
      this.emit('playerHurt', { pid: p.id, dmg, hp: p.hp, sx: src && src.x, sz: src && src.z, kind: src && src.kind });
      if (p.hp <= 0) {
        p.hp = 0; p.dead = true;
        this.emit('playerDeath', { pid: p.id, score: p.score, kills: p.kills, wave: this.director.wave });
      }
      return true;
    }

    stepHazards(edt) {
      for (let i = this.hazards.length - 1; i >= 0; i--) {
        const h = this.hazards[i];
        h.age += edt;
        if (h.kind === 'ring') {
          h.r += h.speed * edt;
          for (const k in this.players) {
            const p = this.players[k];
            if (h.friendly || p.dead || h.hit[p.id]) continue;
            const d = V.distXZ(p.pos, h);
            if (Math.abs(d - h.r) < 0.9 && p.pos.y - h.y < 0.9) { h.hit[p.id] = true; this.damagePlayer(p, h.dmg, { x: h.x, z: h.z, kind: 'ring' }); }
          }
          if (h.r >= h.maxR) this.hazards.splice(i, 1);
        } else if (h.kind === 'beam') {
          const owner = this.enemies[h.owner];
          if (owner) { h.x = owner.pos.x; h.z = owner.pos.z; }
          if (h.age > h.warn) {
            h.angle += h.spin * edt;
            const dx = Math.cos(h.angle), dz = Math.sin(h.angle);
            for (const k in this.players) {
              const p = this.players[k];
              if (p.dead) continue;
              const rx = p.pos.x - h.x, rz = p.pos.z - h.z;
              const along = rx * dx + rz * dz;
              if (along < 0 || along > h.len) continue;
              const perp = Math.abs(rx * -dz + rz * dx);
              if (perp < 1.0 && p.pos.y < h.y + 0.6 && (h.cool[p.id] || 0) <= h.age) {
                h.cool[p.id] = h.age + 0.5;
                this.damagePlayer(p, h.dmg, { x: h.x, z: h.z, kind: 'beam' });
              }
            }
          }
          if (h.age > h.warn + h.dur || !owner) this.hazards.splice(i, 1);
        }
      }
    }

    addHazard(h) { h.age = 0; h.hit = {}; h.cool = {}; h.hid = this.id(); this.hazards.push(h); this.emit('hazard', { hid: h.hid, kind: h.kind }); return h; }

    schedule(delay, data) { data.at = this.t + delay; this.delayed.push(data); }

    stepDelayed() {
      for (let i = this.delayed.length - 1; i >= 0; i--) {
        const d = this.delayed[i];
        if (this.t < d.at) continue;
        this.delayed.splice(i, 1);
        if (d.kind === 'cut') {
          const e = this.enemies[d.target];
          if (e) {
            this.emit('iaidoCut', { id: e.id, x: e.pos.x, y: e.pos.y + e.def.height * 0.5, z: e.pos.z, a: d.a });
            this.damageEnemy(e, d.dmg, { pid: d.pid, kind: 'iaido', weapon: 'katana', dir: d.dir, push: 6, stun: 1.2, stop: 0.09, launch: 6, styleName: 'IAIDŌ', stylePts: 22 });
          }
        }
      }
    }

    // Plain JSON snapshot of everything a remote client needs to render the match.
    snapshot() {
      const ps = [], es = [], pr = [];
      for (const k in this.players) {
        const p = this.players[k];
        ps.push({ id: p.id, name: p.name, x: p.pos.x, y: p.pos.y, z: p.pos.z, vx: p.vel.x, vy: p.vel.y, vz: p.vel.z, yaw: p.yaw, pitch: p.pitch, hp: p.hp, w: p.weapon, sl: p.sliding, dead: p.dead, ack: p.lastSeq, pw: SO.Powers.view(p) });
      }
      for (const k in this.enemies) {
        const e = this.enemies[k];
        es.push({ id: e.id, t: e.etype, x: e.pos.x, y: e.pos.y, z: e.pos.z, yaw: e.yaw, hp: e.hp, s: e.state, st: e.stateT, fx: SO.Status ? SO.Status.view(e) : null });
      }
      for (const k in this.projectiles) {
        const q = this.projectiles[k];
        pr.push({ id: q.id, k: q.kind, o: q.owner, x: q.pos.x, y: q.pos.y, z: q.pos.z, vx: q.vel.x, vy: q.vel.y, vz: q.vel.z });
      }
      const fxs = this.effects.map((f) => SO.Powers.effectView(f));
      const al = [];
      for (const k in this.allies) al.push(SO.Allies.view(this.allies[k]));
      return { tick: this.tick, t: this.t, wave: this.director.wave, players: ps, enemies: es, projectiles: pr, effects: fxs, allies: al, arena: SO.Destruct ? SO.Destruct.state(this.arena) : null };
    }
  }

  function overlap(pos, r, h, b) {
    return pos.x + r > b.min.x && pos.x - r < b.max.x && pos.z + r > b.min.z && pos.z - r < b.max.z && pos.y + h > b.min.y && pos.y < b.max.y;
  }

  function rayBox(o, d, b) {
    let tmin = -Infinity, tmax = Infinity;
    const axes = ['x', 'y', 'z'];
    for (let i = 0; i < 3; i++) {
      const a = axes[i];
      if (Math.abs(d[a]) < 1e-8) { if (o[a] < b.min[a] || o[a] > b.max[a]) return -1; continue; }
      let t1 = (b.min[a] - o[a]) / d[a], t2 = (b.max[a] - o[a]) / d[a];
      if (t1 > t2) { const tt = t1; t1 = t2; t2 = tt; }
      if (t1 > tmin) tmin = t1;
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return -1;
    }
    if (tmax < 0) return -1;
    return tmin >= 0 ? tmin : 0;
  }

  // ---------- style meter ----------
  function style(world, p, name, pts) {
    const st = p.style;
    const last = st.used[name] || 0;
    const fresh = world.t - last > 4;
    st.count[name] = fresh ? 0 : (st.count[name] || 0) + 1;
    st.used[name] = world.t;
    const mult = Math.pow(0.6, Math.min(st.count[name], 4));
    const gain = pts * mult;
    st.gauge += gain * (1.2 - st.rank * 0.08);
    while (st.gauge >= 100 && st.rank < RANKS.length - 1) { st.gauge -= 70; st.rank++; world.emit('rankUp', { pid: p.id, rank: st.rank }); }
    if (st.rank === RANKS.length - 1) st.gauge = Math.min(st.gauge, 100);
    p.score += Math.round(gain * (1 + st.rank * 0.5));
    if (!p.ult) p.overdrive = Math.min(100, p.overdrive + gain * 0.32); // the ultimate charges between uses
    world.emit('style', { pid: p.id, name, pts: Math.round(gain), fresh: mult >= 1 });
  }

  function styleDecay(p, dt) {
    const st = p.style;
    st.gauge -= (3 + st.rank * 3.2) * dt;
    if (st.gauge < 0) {
      if (st.rank > 0) { st.rank--; st.gauge = 65; }
      else st.gauge = 0;
    }
  }

  SO.World = { World, RANKS, EMPTY_CMD, style, styleDecay };
})(typeof window !== 'undefined' ? (window.SO = window.SO || {}) : (globalThis.SO = globalThis.SO || {}));
