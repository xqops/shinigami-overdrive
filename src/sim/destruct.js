// Destructible temple. Powers, explosions and heavy enemies chip at lanterns, walls, pillars,
// torii gates and bridges until they break. Pure sim (no DOM/THREE) so every client agrees:
// state per box is just its current top (max.y) or "gone", sent as (id, height) pairs.
// Breaking a gate column drops its beams; losing two posts drops a bridge deck.
// Heavy impacts near the ground dig craters: the floor height really changes (bodies walk down
// into them). The temple and its floor heal at the start of every wave.
(function (SO) {
  'use strict';

  // hp per kind; stump = height left standing after the first break (then it can break again)
  const KINDS = {
    lantern: { hp: 45 },
    wall: { hp: 90, stump: 0.6 },
    post: { hp: 60 },
    pillar: { hp: 170, stump: 2.4 },
    torii: { hp: 150 },
    toriiTop: { hp: 150 },
    bridge: { hp: 240 },
  };

  // what each event does to the scenery: [point, radius, damage at the center, crater r, crater depth]
  function impacts(world, ev, out) {
    switch (ev.type) {
      case 'explosion': out.push([ev, (ev.r || 3.6) + 0.5, 90, 2.2, 0.45]); break;
      case 'slam': if (ev.meteor) out.push([ev, Math.max(3, ev.r || 4), 70 + (ev.power || 0) * 2, 2.4 + Math.min(2, (ev.power || 0) * 0.04), 0.6 + Math.min(0.6, (ev.power || 0) * 0.015)]); break;
      // school abilities (sim/kit.js K.blast): crater = [radius, depth] when the power digs one
      case 'blast': out.push([ev, ev.r, (ev.dmg || 40) * 1.4, ev.crater ? ev.crater[0] : 0, ev.crater ? ev.crater[1] : 0]); break;
      case 'bruteSlam': out.push([ev, 4, 60, 2.6, 0.5]); break;
      case 'tenguCrash': out.push([ev, 2.6, 45, 1.6, 0.35]); break;
      case 'projEnd':
        if (ev.reason === 'wall' && ev.owner === 'player') {
          if (ev.kind === 'wave') out.push([ev, 2.6, 70, 1.5, 0.3]);
          else if (ev.kind === 'spell') out.push([ev, 1.4, 35]); // ability shots chip what they hit
        }
        break;
    }
  }

  function distToBox(p, b) {
    const dx = Math.max(b.min.x - p.x, 0, p.x - b.max.x);
    const dy = Math.max(b.min.y - p.y, 0, p.y - b.max.y);
    const dz = Math.max(b.min.z - p.z, 0, p.z - b.max.z);
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  function hpOf(b) {
    if (b.hp == null) b.hp = KINDS[b.kind] ? KINDS[b.kind].hp : Infinity;
    return b.hp;
  }

  // Area damage to the scenery. src: { x, y, z } (the hit point, for debris direction).
  function damage(world, at, radius, dmg) {
    const boxes = world.arena.boxes;
    const hitList = [];
    for (let i = 0; i < boxes.length; i++) {
      const b = boxes[i];
      if (!KINDS[b.kind]) continue;
      const d = distToBox(at, b);
      if (d > radius) continue;
      hitList.push([b, dmg * (1 - 0.6 * d / radius)]);
    }
    for (const [b, d] of hitList) hit(world, b, d, at);
  }

  function hit(world, b, dmg, at) {
    if (b.gone) return;
    b.hp = hpOf(b) - dmg;
    if (b.hp > 0) { world.emit('boxHit', { id: b.id, x: at.x, y: at.y, z: at.z }); return; }
    const K = KINDS[b.kind];
    if (K.stump && !b.stumped && b.max.y - b.min.y > K.stump + 0.3) {
      // snaps off: the top flies away, the stump stays as cover (and can break again)
      const top = b.max.y;
      b.max.y = b.min.y + K.stump;
      b.stumped = true;
      b.hp = K.hp * 0.6;
      world.emit('boxBreak', { id: b.id, h: b.max.y, from: top, x: at.x, y: at.y, z: at.z });
    } else {
      remove(world, b, at, 'break');
    }
    checkGroup(world, b.group, at);
  }

  function remove(world, b, at, how) {
    if (b.gone) return;
    b.gone = true;
    const i = world.arena.boxes.indexOf(b);
    if (i >= 0) world.arena.boxes.splice(i, 1);
    world.emit('boxBreak', { id: b.id, h: -1, from: b.max.y, x: at.x, y: at.y, z: at.z, how });
    // anything resting on top now falls: nothing to do, collision simply no longer finds it
  }

  function checkGroup(world, g, at) {
    if (!g) return;
    const G = world.arena.groups[g];
    let lost = 0;
    for (const b of world.arena.all) if (b.group === g && b.support && b.gone) lost++;
    if (lost < G.need) return;
    for (const b of world.arena.all) if (b.group === g && !b.support && !b.gone) remove(world, b, at, 'collapse');
  }

  function bodyIn(world, b) {
    const hit = (pos, r, h) => pos.x + r > b.min.x && pos.x - r < b.max.x && pos.z + r > b.min.z && pos.z - r < b.max.z && pos.y + h > b.min.y && pos.y < b.max0;
    for (const k in world.players) { const p = world.players[k]; if (!p.dead && hit(p.pos, p.radius || 0.45, 2)) return true; }
    for (const k in world.enemies) { const e = world.enemies[k]; if (hit(e.pos, e.def.radius, e.def.height || 2)) return true; }
    return false;
  }

  // ---------- craters ----------
  const MAX_CRATERS = 48;
  function addCrater(arena, c) {
    const list = arena.craters || (arena.craters = []);
    list.push({ x: c.x, z: c.z, r: c.r, d: c.d });
    if (list.length > MAX_CRATERS) list.shift();
  }

  // Bowl with a raised, broken lip: depth d at the center, a lip of ~12% just past the radius.
  function craterH(c, x, z) {
    const dx = x - c.x, dz = z - c.z, s2 = (dx * dx + dz * dz) / (c.r * c.r);
    if (s2 > 1.69) return 0;
    let h = 0;
    if (s2 < 1) { const k = 1 - s2; h -= c.d * k * k; }
    const l = (Math.sqrt(s2) - 1.05) / 0.22;
    if (l > -1 && l < 1) h += c.d * 0.12 * (1 - l * l);
    return h;
  }

  function groundY(arena, x, z) {
    const list = arena.craters;
    if (!list || !list.length) return 0;
    let h = 0;
    for (let i = 0; i < list.length; i++) h += craterH(list[i], x, z);
    return Math.max(-3.5, h);
  }

  function onBox(arena, at) {
    for (const b of arena.boxes) if (at.x > b.min.x && at.x < b.max.x && at.z > b.min.z && at.z < b.max.z && at.y > b.max.y - 0.6) return true;
    return false;
  }

  // Regrow everything that is damaged; pieces with someone inside wait and retry.
  function restore(world) {
    const ids = [];
    const floor = !!(world.arena.craters && world.arena.craters.length);
    if (floor) world.arena.craters.length = 0;
    for (const b of world.arena.all) {
      if (!b.gone && b.max.y === b.max0 && (b.hp == null || b.hp === KINDS[b.kind].hp)) continue;
      if (bodyIn(world, b)) { world.arena.pending = true; continue; }
      if (b.gone) { b.gone = false; world.arena.boxes.push(b); }
      b.max.y = b.max0; b.stumped = false; b.hp = null;
      ids.push(b.id);
    }
    if (ids.length || floor) world.emit('arenaRestore', { ids, floor });
  }

  // Called once per tick with the events emitted during that tick.
  function step(world, dt, events) {
    const list = [];
    let wave = false;
    for (const ev of events) {
      if (ev.type === 'waveStart') wave = true;
      else impacts(world, ev, list);
    }
    for (const [at, r, d, cr, cd] of list) {
      damage(world, at, r, d);
      // only impacts that reach the floor (not ones on a roof or a torii top) dig a crater
      if (cr && at.y - groundY(world.arena, at.x, at.z) < cr * 0.6 && !onBox(world.arena, at)) {
        const c = { x: Math.round(at.x * 100) / 100, z: Math.round(at.z * 100) / 100, r: cr, d: cd };
        addCrater(world.arena, c);
        world.emit('crater', c);
      }
    }
    if (wave) { world.arena.pending = false; restore(world); }
    else if (world.arena.pending && world.tick % 30 === 0) { world.arena.pending = false; restore(world); }
  }

  // Compact state for snapshots: only boxes that differ from the authored map.
  function state(arena) {
    const out = [];
    for (const b of arena.all) if (b.gone || b.max.y !== b.max0) out.push([b.id, b.gone ? -1 : Math.round(b.max.y * 100) / 100]);
    return { boxes: out, craters: (arena.craters || []).map((c) => [c.x, c.z, c.r, c.d]) };
  }

  // Applies a (id, height) change to an arena copy (renderers and remote clients).
  function apply(arena, id, h) {
    const b = arena.all[id];
    if (!b) return null;
    if (h < 0) {
      if (!b.gone) { b.gone = true; const i = arena.boxes.indexOf(b); if (i >= 0) arena.boxes.splice(i, 1); }
    } else {
      if (b.gone) { b.gone = false; arena.boxes.push(b); }
      b.max.y = h;
    }
    return b;
  }

  SO.Destruct = { KINDS, step, damage, restore, state, apply, addCrater, groundY, craterH };
})(typeof window !== 'undefined' ? (window.SO = window.SO || {}) : (globalThis.SO = globalThis.SO || {}));
