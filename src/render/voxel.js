// Turns pixel-art sprites (src/assets/sprites.js) into extruded voxel meshes, like held items in
// Minecraft: the in-game weapon looks exactly like the drawing, with depth. Only faces that touch
// an empty (or thinner) neighbor are emitted. Also finds the grip, blade tip, blade base and pommel.
// Pixels with alpha 254 glow: they are drawn unlit and wrapped in a soft additive halo shell.
(function (SO) {
  'use strict';
  const T = THREE;
  const GLOW_A = 254;

  function sprite(name) {
    const s = window.SO_SPRITES && window.SO_SPRITES[name];
    if (!s) return null;
    if (!s.data) {
      const bin = atob(s.px);
      s.data = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) s.data[i] = bin.charCodeAt(i);
    }
    return s;
  }

  // opts: { voxel: world size of one pixel, depth: thickness in pixels (or a function of the row
  //         counted from the bottom), flip: sprite drawn point-down, grip: 'guard' (swords: below
  //         the widest crossguard row) | number (fraction of height), glow: halo strength }
  function build(name, opts) {
    const s = sprite(name);
    if (!s) return null;
    const W = s.w, H = s.h, vx = opts.voxel;
    const depthAt = typeof opts.depth === 'function' ? opts.depth : () => opts.depth || 1.4;
    // pixel accessor in "blade up" coordinates: row 0 = bottom
    const at = (x, r) => {
      if (x < 0 || r < 0 || x >= W || r >= H) return null;
      const y = opts.flip ? r : H - 1 - r;
      const i = (y * W + x) * 4;
      return s.data[i + 3] > 128 ? i : null;
    };
    const glowAt = (x, r) => { const i = at(x, r); return i != null && s.data[i + 3] === GLOW_A; };
    const rowSpan = (r) => { let a = W, b = -1; for (let x = 0; x < W; x++) if (at(x, r) != null) { if (x < a) a = x; if (x > b) b = x; } return b < 0 ? null : [a, b]; };

    // grip: center of the handle
    let gripRow;
    if (opts.grip === 'guard') {
      let guard = 0, widest = 0;
      for (let r = 0; r < Math.floor(H * 0.4); r++) { const sp = rowSpan(r); if (sp && sp[1] - sp[0] > widest) { widest = sp[1] - sp[0]; guard = r; } }
      // the handle runs from the pommel's top to the guard; grip in its middle
      let low = 0;
      for (let r = 0; r < guard; r++) { const sp = rowSpan(r); if (sp && sp[1] - sp[0] >= 4) { low = r; break; } }
      gripRow = Math.max(1, Math.floor(opts.pommel ? (low + guard) * 0.5 : guard * 0.5));
      opts.guardRow = guard;
    } else {
      gripRow = Math.floor(H * (opts.grip || 0.15));
    }
    const gs = rowSpan(gripRow) || [0, W - 1];
    const gx = (gs[0] + gs[1] + 1) / 2, gy = gripRow + 0.5;

    const solid = { pos: [], col: [], idx: [] }, lit = { pos: [], col: [], idx: [] };
    const face = (buf, verts, c, shade) => {
      const b = buf.pos.length / 3;
      for (const v of verts) { buf.pos.push((v[0] - gx) * vx, (v[1] - gy) * vx, v[2] * vx); buf.col.push(c[0] * shade, c[1] * shade, c[2] * shade); }
      buf.idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    };
    const dOf = (x, r) => (at(x, r) == null ? 0 : depthAt(r, x));
    let tip = null, tipD = -1, top = null, bottom = null;
    for (let r = 0; r < H; r++) {
      for (let x = 0; x < W; x++) {
        const i = at(x, r);
        if (i == null) continue;
        const g = s.data[i + 3] === GLOW_A;
        const buf = g ? lit : solid;
        const c = [s.data[i] / 255, s.data[i + 1] / 255, s.data[i + 2] / 255];
        const d = dOf(x, r), z0 = -d / 2, z1 = d / 2;
        const x0 = x, x1 = x + 1, y0 = r, y1 = r + 1;
        const sh = g ? [1, 1, 0.9, 0.9, 1, 0.85] : [1, 0.8, 0.7, 0.7, 0.95, 0.55];
        face(buf, [[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]], c, sh[0]);
        face(buf, [[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]], c, sh[1]);
        // sides: wherever the neighbor is missing or thinner, close the step
        const side = (nd, mk) => {
          if (nd >= d) return;
          const a = -d / 2, b = -nd / 2, e = nd / 2, f = d / 2;
          if (nd <= 0) mk(a, f); else { mk(a, b); mk(e, f); }
        };
        side(dOf(x - 1, r), (za, zb) => face(buf, [[x0, y0, za], [x0, y0, zb], [x0, y1, zb], [x0, y1, za]], c, sh[2]));
        side(dOf(x + 1, r), (za, zb) => face(buf, [[x1, y0, zb], [x1, y0, za], [x1, y1, za], [x1, y1, zb]], c, sh[3]));
        side(dOf(x, r + 1), (za, zb) => face(buf, [[x0, y1, zb], [x1, y1, zb], [x1, y1, za], [x0, y1, za]], c, sh[4]));
        side(dOf(x, r - 1), (za, zb) => face(buf, [[x0, y0, za], [x1, y0, za], [x1, y0, zb], [x0, y0, zb]], c, sh[5]));
        const dd = Math.hypot(x + 0.5 - gx, r + 0.5 - gy);
        if (r > gy && dd > tipD) { tipD = dd; tip = [x + 0.5, r + 0.5]; }
        if (!top || r + 0.5 > top[1]) top = [x + 0.5, r + 0.5];
        if (!bottom || r + 0.5 < bottom[1]) bottom = [x + 0.5, r + 0.5];
      }
    }
    const geoOf = (buf) => {
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(buf.pos, 3));
      geo.setAttribute('color', new T.Float32BufferAttribute(buf.col, 3));
      geo.setIndex(buf.idx);
      geo.computeVertexNormals();
      return geo;
    };
    const mesh = new T.Mesh(geoOf(solid), new T.MeshLambertMaterial({ vertexColors: true }));
    const g = new T.Group();
    g.add(mesh);
    let glowMesh = null, halo = null;
    if (lit.idx.length) {
      glowMesh = new T.Mesh(geoOf(lit), new T.MeshBasicMaterial({ vertexColors: true }));
      g.add(glowMesh);
      halo = buildHalo(W, H, glowAt, gx, gy, vx, opts.haloPx || 1.5);
      halo.material.opacity = opts.glow != null ? opts.glow : 0.3;
      g.add(halo);
    }
    if (!tip) tip = top;
    const toLocal = (p) => new T.Vector3((p[0] - gx) * vx, (p[1] - gy) * vx, 0);
    // blade base for trails: the crossguard for swords, otherwise the top of the shaft
    const baseP = opts.grip === 'guard' ? [gx, opts.guardRow + 1.5] : opts.base === 'top' ? top : [gx, gy + (tip[1] - gy) * 0.45];
    const tipO = new T.Object3D(); tipO.position.copy(toLocal(tip)); g.add(tipO);
    const baseO = new T.Object3D(); baseO.position.copy(toLocal(baseP)); g.add(baseO);
    const pommelO = new T.Object3D(); pommelO.position.copy(toLocal(bottom)); g.add(pommelO);
    g.userData = { tip: tipO, base: baseO, pommel: pommelO, glows: [], mesh, glowMesh, halo, length: tipD * vx };
    if (opts.base === 'top') {
      // a staff may be drawn at a slant: trace its pixel runs up from the grip so a second hand
      // can hold it partway up (userData.shaft)
      const runs = (r) => { const out = []; let a = -1; for (let x = 0; x <= W; x++) { const on = x < W && at(x, r) != null; if (on && a < 0) a = x; if (!on && a >= 0) { out.push([a, x - 1]); a = -1; } } return out; };
      let cx = gx; const w0 = gs[1] - gs[0] + 1; const pts = [];
      for (let r = gripRow; r < H; r++) {
        let best = null;
        for (const run of runs(r)) { const c = (run[0] + run[1] + 1) / 2; if (!best || Math.abs(c - cx) < Math.abs(best.c - cx)) best = { c, w: run[1] - run[0] + 1 }; }
        if (!best || Math.abs(best.c - cx) > 2.5 || best.w > w0 * 3 + 2) break;
        cx = best.c; pts.push([cx, r + 0.5]);
      }
      const sp = pts[Math.floor(pts.length * 0.4)] || [gx, gy];
      const shaftO = new T.Object3D(); shaftO.position.copy(toLocal(sp)); g.add(shaftO);
      g.userData.shaft = shaftO;
    }
    return g;
  }

  // A blocky aura around the glowing pixels: their mask grown by `grow` pixels, extruded thicker,
  // drawn additive with only its outer faces (one even layer of light, no stacking).
  function buildHalo(W, H, glowAt, gx, gy, vx, grow) {
    const R = Math.ceil(grow);
    const mask = (x, r) => {
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (dx * dx + dy * dy <= grow * grow && glowAt(x + dx, r + dy)) return true;
      return false;
    };
    const m = new Uint8Array((W + 2 * R) * (H + 2 * R));
    const id = (x, r) => (r + R) * (W + 2 * R) + (x + R);
    for (let r = -R; r < H + R; r++) for (let x = -R; x < W + R; x++) m[id(x, r)] = mask(x, r) ? 1 : 0;
    const on = (x, r) => x >= -R && r >= -R && x < W + R && r < H + R && m[id(x, r)] === 1;
    const pos = [], idx = [];
    const d = 3.2;
    const quad = (v) => { const b = pos.length / 3; for (const p of v) pos.push((p[0] - gx) * vx, (p[1] - gy) * vx, p[2] * vx); idx.push(b, b + 1, b + 2, b, b + 2, b + 3); };
    for (let r = -R; r < H + R; r++) for (let x = -R; x < W + R; x++) {
      if (!on(x, r)) continue;
      const x0 = x, x1 = x + 1, y0 = r, y1 = r + 1, z0 = -d / 2, z1 = d / 2;
      quad([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]]);
      quad([[x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]]);
      if (!on(x - 1, r)) quad([[x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]]);
      if (!on(x + 1, r)) quad([[x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]]);
      if (!on(x, r + 1)) quad([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]]);
      if (!on(x, r - 1)) quad([[x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]]);
    }
    const geo = new T.BufferGeometry();
    geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx);
    // front faces only, so the shell reads as one layer of light from any angle
    const mat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3, blending: T.AdditiveBlending, depthWrite: false });
    const halo = new T.Mesh(geo, mat);
    halo.renderOrder = 2;
    return halo;
  }

  SO.Voxel = { build, sprite };
})(window.SO = window.SO || {});
