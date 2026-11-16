// Arena layout as pure data: collision boxes, jump pads, spawn points, decor anchors.
// The renderer builds meshes from this same data, so the server and clients always agree.
//
// "Templo do Céu Partido": a three-tier pagoda in the middle (climbable: stairs to tier 1 and 2,
// double jump to the top), four torii gates whose top beams are walkable perches, two raised
// wooden bridges with stairs at both ends, stone lanterns as low cover, and four tall ruined
// pillars for wall-jump chains. Stair steps are 0.5 m so walking up them uses step-up.
(function (SO) {
  'use strict';

  function box(cx, y0, cz, sx, sy, sz, kind) {
    return {
      min: { x: cx - sx / 2, y: y0, z: cz - sz / 2 },
      max: { x: cx + sx / 2, y: y0 + sy, z: cz + sz / 2 },
      kind: kind || 'stone',
    };
  }

  // Stairs along +axis direction from a base point, rising `rise` per step.
  function stairs(out, x, z, dirX, dirZ, steps, width, depth, rise, kind, y0) {
    y0 = y0 || 0;
    for (let k = 1; k <= steps; k++) {
      const d = (steps - k) * depth + depth / 2;
      const cx = x + dirX * d, cz = z + dirZ * d;
      const sx = dirX !== 0 ? depth : width, sz = dirZ !== 0 ? depth : width;
      out.push(box(cx, y0, cz, sx, k * rise, sz, kind));
    }
  }

  function build() {
    const boxes = [];
    // ----- pagoda -----
    boxes.push(box(0, 0, 0, 12, 3, 12, 'stone'));
    boxes.push(box(0, 3, 0, 7, 3, 7, 'wood'));
    boxes.push(box(0, 6, 0, 3.6, 2.4, 3.6, 'lacquer'));
    // Stairs up to tier 1 on all four sides (5 steps of 0.5 m, then the 3 m tier top).
    stairs(boxes, 0, 6, 0, 1, 5, 3.2, 0.8, 0.5, 'step');
    stairs(boxes, 0, -6, 0, -1, 5, 3.2, 0.8, 0.5, 'step');
    stairs(boxes, 6, 0, 1, 0, 5, 3.2, 0.8, 0.5, 'step');
    stairs(boxes, -6, 0, -1, 0, 5, 3.2, 0.8, 0.5, 'step');
    // Stairs from tier 1 to tier 2 on the east side, sitting on the tier-1 roof.
    stairs(boxes, 3.5, 0, 1, 0, 5, 2.4, 0.48, 0.5, 'wood', 3);

    // ----- four torii gates (walkable top beams) -----
    const torii = [];
    const groups = {};
    const bridges = [];
    const tag = (b, group, support) => { b.group = group; if (support) b.support = true; return b; };
    const gate = (x, z, alongX) => {
      const ox = alongX ? 4 : 0, oz = alongX ? 0 : 4;
      // a gate is a destruction group: losing either column brings both beams down
      const grp = 'gate' + torii.length;
      groups[grp] = { need: 1 };
      boxes.push(tag(box(x + ox, 0, z + oz, 1.1, 8.2, 1.1, 'torii'), grp, true));
      boxes.push(tag(box(x - ox, 0, z - oz, 1.1, 8.2, 1.1, 'torii'), grp, true));
      boxes.push(tag(box(x, 8.2, z, alongX ? 11.5 : 1.6, 0.8, alongX ? 1.6 : 11.5, 'toriiTop'), grp));
      boxes.push(tag(box(x, 6.4, z, alongX ? 9 : 0.7, 0.5, alongX ? 0.7 : 9, 'torii'), grp));
      torii.push({ x, z, alongX });
    };
    gate(24, 0, false); gate(-24, 0, false); gate(0, 24, true); gate(0, -24, true);

    // ----- raised bridges north and south, with stairs at both ends -----
    for (const s of [-1, 1]) {
      const z = 35 * s;
      // the deck falls once two of its four posts are gone
      const grp = 'bridge' + s;
      groups[grp] = { need: 2 };
      bridges.push({ z, id: boxes.length });
      boxes.push(tag(box(0, 4, z, 20, 0.6, 4, 'bridge'), grp));
      for (const px of [-8, -3, 3, 8]) boxes.push(tag(box(px, 0, z, 0.6, 4, 0.6, 'post'), grp, true));
      stairs(boxes, 10, z, 1, 0, 9, 4, 0.7, 0.5, 'step');
      stairs(boxes, -10, z, -1, 0, 9, 4, 0.7, 0.5, 'step');
    }

    // ----- ruined pillars for wall-jump chains (east/west flanks) -----
    for (const [x, z, h] of [[33, 12, 13], [33, -12, 10], [-33, 12, 10], [-33, -12, 13]]) {
      boxes.push(box(x, 0, z, 3, h, 3, 'pillar'));
    }

    // ----- stone lanterns: low cover ring -----
    const lanterns = [];
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const x = Math.cos(a) * 15, z = Math.sin(a) * 15;
      boxes.push(box(x, 0, z, 1.3, 2.1, 1.3, 'lantern'));
      lanterns.push({ x, z, y: 2.1, id: boxes.length - 1 });
    }

    // ----- low broken walls near the rim -----
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + 0.25;
      const x = Math.cos(a) * 40, z = Math.sin(a) * 40;
      const alongX = Math.abs(Math.sin(a)) > Math.abs(Math.cos(a));
      boxes.push(box(x, 0, z, alongX ? 5 : 1.2, 1.7, alongX ? 1.2 : 5, 'wall'));
    }

    // Jump pads sit on the diagonals between the gates and launch toward pagoda/bridges.
    const pads = [];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      pads.push({ x: Math.cos(a) * 26, z: Math.sin(a) * 26, r: 1.6, power: 25 });
    }

    const spawns = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + 0.2;
      spawns.push({ x: Math.cos(a) * 41, y: 0, z: Math.sin(a) * 41 });
    }
    spawns.push({ x: -5, y: 4.6, z: 35 }, { x: 5, y: 4.6, z: -35 });

    // stable ids so destruction can be sent over the network as (id, height) pairs
    boxes.forEach((b, i) => { b.id = i; b.max0 = b.max.y; });
    return {
      radius: SO.CFG.ARENA_RADIUS,
      boxes, // live solid boxes (destroyed ones are removed, see sim/destruct.js)
      all: boxes.slice(),
      groups,
      pads,
      spawns,
      torii,
      lanterns,
      bridges,
      floats: [],
      playerSpawns: [{ x: 0, y: 8.4, z: 0 }, { x: 0, y: 3.1, z: 4 }, { x: 0, y: 3.1, z: -4 }, { x: 4, y: 3.1, z: 0 }],
    };
  }

  SO.Arena = { build };
})(typeof window !== 'undefined' ? (window.SO = window.SO || {}) : (globalThis.SO = globalThis.SO || {}));
