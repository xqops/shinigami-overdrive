// Enemy statuses applied by the school abilities. Stored on e.st[name] = { t, ... } and stepped
// once per tick before the enemy AI. They are also sent to clients (snapshot / views) so the
// renderer can show ice, flames, runes and so on.
//   burn    damage over time (dps)            freeze  frozen solid: no AI, no movement
//   slow    time scale k for AI and motion    blind   loses the player, wanders, misses
//   mark    rune for combos (by: who / why)   float   drifts up, weightless, takes +20%
//   weak    takes +25% damage                 prison  held in place, damage over time
//   shock   short stun + crackle
// Reactions: fire on a frozen enemy = steam burst; freeze on a burning one puts the fire out.
(function (SO) {
  'use strict';

  const BIG = (e) => !!e.def.big;

  function apply(world, e, name, t, data) {
    if (!e || e.dead) return null;
    const st = e.st || (e.st = {});
    data = data || {};
    if (name === 'freeze' || name === 'prison') {
      // bosses never freeze solid: they only slow down; big brutes freeze briefly
      if (e.def.boss) return apply(world, e, 'slow', t, { k: 0.35 });
      if (BIG(e)) t *= 0.45;
    }
    if (name === 'burn' && st.freeze) {
      delete st.freeze;
      world.emit('reaction', { id: e.id, k: 'steam', x: e.pos.x, y: e.pos.y + e.def.height * 0.5, z: e.pos.z });
      SO.Kit.hit(world, world.players[data.pid], e, 30, { kind: 'steam', push: 6, stun: 0.6, style: 'VAPOR', pts: 8 });
      return null;
    }
    if (name === 'freeze' && st.burn) delete st.burn;
    const cur = st[name];
    // refreshing a running status just extends it (no new event); a new mark replaces the old one
    if (cur && name !== 'mark') { Object.assign(cur, data); cur.t = Math.max(cur.t, t); cur.max = Math.max(cur.max, cur.t); return cur; }
    st[name] = Object.assign({ t, max: t }, data);
    world.emit('status', { id: e.id, s: name, t, by: data.by || null });
    return st[name];
  }

  function has(e, name) { return !!(e.st && e.st[name] && e.st[name].t > 0); }

  function clear(e, name) { if (e.st) delete e.st[name]; }

  // Multiplier on damage taken.
  function vuln(e) {
    const st = e.st;
    if (!st) return 1;
    let m = 1;
    if (st.weak) m *= 1 + (st.weak.k || 0.25);
    if (st.float) m *= 1.2;
    if (st.blind && st.blind.bonus) m *= 1 + st.blind.bonus;
    return m;
  }

  // Time scale for AI and motion (frozen / imprisoned enemies stop completely).
  function timeScale(e) {
    const st = e.st;
    if (!st) return 1;
    if (st.freeze || st.prison) return 0.0001;
    let k = 1;
    if (st.slow) k *= st.slow.k || 0.5;
    return k;
  }

  function step(world, e, dt) {
    const st = e.st;
    if (!st) return;
    for (const name in st) {
      const s = st[name];
      s.t -= dt;
      const p = s.pid != null ? world.players[s.pid] : null;
      if (name === 'burn' || name === 'prison' || name === 'drain') {
        s.acc = (s.acc || 0) + (s.dps || 0) * dt;
        if (s.acc >= 4 || (s.t <= 0 && s.acc > 0)) {
          const amount = s.acc; s.acc = 0;
          world.damageEnemy(e, amount, { pid: s.pid, kind: name, power: true, dot: true, stun: 0, push: 0 });
          if (name === 'drain' && p) SO.Kit.heal(world, p, amount * (s.leech || 0.5));
          if (e.dead) return;
        }
      }
      if (name === 'freeze' || name === 'prison') { e.vel.x = 0; e.vel.z = 0; if (e.def.ground) e.vel.y = Math.min(e.vel.y, 0); else e.vel.y = 0; e.attack = null; }
      if (name === 'shock') e.stun = Math.max(e.stun, 0.05);
      if (name === 'float') {
        // weightless: drift up to ~3 m above the floor and hang there
        const gy = SO.Kit.groundAt(world, e.pos.x, e.pos.z, e.pos.y + 0.5);
        const want = gy + (s.h || 3);
        e.vel.y += ((want - e.pos.y) * 3 - e.vel.y) * Math.min(1, dt * 4);
        e.grounded = false; e.juggle = 0.3;
        e.vel.x *= Math.exp(-2 * dt); e.vel.z *= Math.exp(-2 * dt);
        e.stun = Math.max(e.stun, 0.1);
      }
      if (s.t <= 0) {
        delete st[name];
        world.emit('statusEnd', { id: e.id, s: name, x: e.pos.x, y: e.pos.y + e.def.height * 0.5, z: e.pos.z, by: s.by || null });
        if (s.onEnd && SO.Abilities.STATUS_END[s.onEnd]) SO.Abilities.STATUS_END[s.onEnd](world, e, s);
      }
    }
  }

  // Compact form for snapshots / views: { name: remaining seconds }.
  function view(e) {
    if (!e.st) return null;
    let out = null;
    for (const name in e.st) { (out || (out = {}))[name] = Math.round(e.st[name].t * 10) / 10; if (e.st[name].by) out[name + 'By'] = e.st[name].by; }
    return out;
  }

  SO.Status = { apply, has, clear, vuln, timeScale, step, view };
})(typeof window !== 'undefined' ? (window.SO = window.SO || {}) : (globalThis.SO = globalThis.SO || {}));
