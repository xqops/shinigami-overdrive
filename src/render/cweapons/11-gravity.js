// 11 GRAVIDADE — "Martelo do Vazio": a dark hammer with a black hole for a core. Its pull is
// always on: violet dust spirals into the core, a few black rocks orbit the head. Inspect
// (author's sheet): held; rocks lift and circle; the swirl thickens; the black hole swells behind
// the head and drags the rubble into it.
(function (SO) {
  'use strict';
  const T = THREE, CW = SO.CharWeapons, AFX = SO.AFX, PI = Math.PI;
  const K = (t, p, a, f, roll, ease) => ({ t, p, a, f, roll, ease: ease || 'inout' });
  const R = (t) => ({ t, rest: true, ease: 'inout' });
  const VIOLET = 0xa040ff, PALE = 0xe0b0ff, DEEP = 0x3a0a6a;
  const VX = 0.0046, H = 222, GRIP = Math.floor(222 * 0.24);

  function voidRock(r, seed) {
    const g = new T.IcosahedronGeometry(r, 0);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { const k = 0.75 + ((Math.sin(i * 12.9898 + seed * 78.233) * 43758.5453) % 1 + 1) % 1 * 0.5; pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k, pos.getZ(i) * k); }
    g.computeVertexNormals();
    const m = new T.Mesh(g, new T.MeshLambertMaterial({ color: 0x18121e, emissive: 0x0a0414 }));
    const e = new T.LineSegments(new T.EdgesGeometry(g), new T.LineBasicMaterial({ color: VIOLET, transparent: true, opacity: 0.5, blending: T.AdditiveBlending }));
    m.add(e);
    m.userData.dispose = () => { g.dispose(); m.material.dispose(); e.geometry.dispose(); e.material.dispose(); };
    return m;
  }
  const holeTex = () => CW.pixelTex('grav-hole', 48, (x, y, s) => { const dx = (x + 0.5) / s - 0.5, dy = (y + 0.5) / s - 0.5; return Math.sqrt(dx * dx + dy * dy) < 0.3 ? 1 : 0; });
  const diskTex = () => CW.pixelTex('grav-disk', 64, (x, y, s) => {
    const dx = (x + 0.5) / s - 0.5, dy = (y + 0.5) / s - 0.5, r = Math.sqrt(dx * dx + dy * dy) * 2, a = Math.atan2(dy, dx);
    if (r > 1 || r < 0.55) return r < 0.62 && r > 0.55 ? 1 : 0;
    return Math.max(0, Math.sin(a * 3 + r * 10) * 0.5 + 0.5) * (1 - (r - 0.55) / 0.45) * 1.3;
  });
  // a black hole: dark disk + swirling violet accretion ring (sprites; spin through rotation)
  function blackHole(parent, size) {
    const disk = new T.Sprite(new T.SpriteMaterial({ map: diskTex(), color: VIOLET, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    const core = new T.Sprite(new T.SpriteMaterial({ map: holeTex(), color: 0x000000, transparent: true, depthWrite: false }));
    disk.renderOrder = 5; core.renderOrder = 6;
    const g = new T.Group(); g.add(disk); g.add(core); parent.add(g);
    g.userData = { disk, core, size };
    return g;
  }
  function setHole(g, k, time) {
    const s = Math.max(0.0001, g.userData.size * k);
    g.userData.disk.scale.set(s * 1.6, s * 1.6, 1); g.userData.core.scale.set(s, s, 1);
    g.userData.disk.material.rotation = time * 2.5;
    g.visible = k > 0.01;
  }

  CW.reg.gravity = {
    slot: 0,
    restR: { p: [0.26, -0.33, -0.58], a: 0.55, f: 0.5, roll: 0 },
    gripR: 0, gripL2: 0.26,

    build(vm) {
      const right = SO.Voxel.build('weapons/gravidade_martelo', { voxel: VX, grip: 0.24, glow: 0.4, haloPx: 1.6, depth: (r) => (r < 60 ? 8 : 2.6) });
      if (!right) return null;
      right.userData.halo.material.color.setHex(VIOLET);
      const headY = (H - 32 - GRIP) * VX;
      right.userData.tip.position.set(0, headY + 0.08, 0);
      right.userData.base.position.set(0, headY - 0.1, 0);
      const s = { right, motes: new CW.Motes(vm.scene, 260), acc: 0, headY };
      s.core = new T.Object3D(); s.core.position.set(0, headY, 0.02); right.add(s.core);
      s.rocks = [];
      for (let i = 0; i < 9; i++) { const m = voidRock(0.018 + (i % 3) * 0.008, i); vm.scene.add(m); s.rocks.push({ m, a: i * 0.7, r: 0.11 + (i % 4) * 0.025, y: ((i % 3) - 1) * 0.04, sp: 0.7 + (i % 3) * 0.3 }); }
      s.hole = blackHole(vm.scene, 0.5);
      s.hole.visible = false;
      s.trail = new CW.Trail(vm.scene, { color: 0x5a14a0, core: PALE, life: 0.13, width: 1 });
      return s;
    },

    update(vm, s, dt, ctx) {
      const insp = ctx.inspect, ud = s.right.userData;
      const beat = insp < 0 ? 0 : insp < 0.24 ? 1 : insp < 0.48 ? 2 : insp < 0.72 ? 3 : insp < 0.95 ? 4 : 0;
      const core = s.core.getWorldPosition(new T.Vector3());
      ud.halo.material.opacity = 0.3 + Math.sin(ctx.time * 3) * 0.06 + (beat >= 3 ? 0.2 : 0);
      // orbiting rocks: 3 at rest, all in the show; on beat 4 they spiral into the hole
      const hk = beat === 4 ? Math.sin(Math.min(1, (insp - 0.72) / 0.23) * PI) : 0;
      const holeAt = core.clone().add(new T.Vector3(-0.12, 0.08, -0.35));
      s.rocks.forEach((h, i) => {
        const on = i < 3 || beat >= 2;
        h.m.visible = on;
        if (!on) return;
        h.a += dt * h.sp * (beat >= 3 ? 2.2 : 1);
        const wide = beat >= 2 ? 1.6 : 1;
        let p = core.clone().add(new T.Vector3(Math.cos(h.a) * h.r * wide, h.y * wide + Math.sin(h.a * 1.7) * 0.02, Math.sin(h.a) * h.r * 0.5 * wide));
        if (hk > 0) p = p.lerp(holeAt, Math.min(0.9, hk * (0.4 + (i % 4) * 0.15)));
        h.m.position.copy(p);
        h.m.rotation.x += dt * 2; h.m.rotation.y += dt * 1.3;
      });
      // dust spiralling inward (the pull), stronger as the show builds
      s.acc += dt * (beat >= 3 ? 50 : beat === 2 ? 26 : ctx.swing ? 20 : 10);
      while (s.acc >= 1) {
        s.acc -= 1;
        const a = Math.random() * PI * 2, r = 0.12 + Math.random() * (beat >= 3 ? 0.2 : 0.1);
        const target = hk > 0 ? holeAt : core;
        const p = target.clone().add(new T.Vector3(Math.cos(a) * r, Math.sin(a) * r * 0.6, Math.sin(a) * r * 0.3));
        const v = target.clone().sub(p).multiplyScalar(2.2).add(new T.Vector3(-Math.sin(a), Math.cos(a), 0).multiplyScalar(r * 3));
        s.motes.emit({ pos: p, vel: v, life: 0.45, size: 0.007, size1: 0.002, color: Math.random() < 0.6 ? VIOLET : PALE, opacity: 1, tex: CW.dotTex(), drag: 0, fadeIn: 0.1 });
      }
      // the black hole in the show
      s.hole.position.copy(holeAt);
      setHole(s.hole, hk, ctx.time);
      s.motes.update(dt, ctx.time);
      s.trail.update(dt, s.right, ctx.trailOn(ctx.swing ? ctx.swing.trail : null));
    },

    clips: {
      gravity_a1: { trail: [0.36, 0.66], R: [K(0.3, [0.4, 0.05, -0.45], -0.7, -0.3, 0, 'stop'), K(0.5, [0.0, -0.2, -0.72], 1.3, 0.6, 0), K(0.6, [-0.22, -0.32, -0.7], 2.25, 0.7, 0, 'out'), K(0.8, [-0.23, -0.33, -0.7], 2.3, 0.7, 0), R(1)] },
      gravity_a2: { trail: [0.36, 0.66], R: [K(0.3, [-0.3, -0.12, -0.5], 1.5, 0.4, PI, 'stop'), K(0.48, [0.05, -0.2, -0.72], -0.2, 0.45, PI), K(0.6, [0.4, -0.28, -0.62], -1.8, 0.45, PI, 'out'), K(0.8, [0.42, -0.3, -0.6], -1.9, 0.45, PI), R(1)] },
      gravity_a3: { trail: [0.42, 0.6], R: [K(0.38, [0.18, 0.02, -0.48], 0.2, -0.45, 0, 'stop'), K(0.55, [0.06, -0.3, -0.78], 0, 1.3, 0, 'out'), K(0.82, [0.06, -0.32, -0.76], 0, 1.32, 0), R(1)] },
      gravity_h: { trail: [0.4, 0.6], R: [K(0.35, [0.3, 0.05, -0.35], -0.3, -0.5, 0, 'stop'), K(0.55, [0.08, -0.15, -0.8], 0.1, 1.0, 0, 'out'), K(0.8, [0.1, -0.17, -0.78], 0.1, 1.0, 0), R(1)] },
    },

    swing(F, e, view) {
      const o = { pos: view.eye, yaw: view.yaw, pitch: view.pitch * 0.85, color: 0x3a0a6a, core: PALE, wisp: 0.9, cells: [100, 6], alpha: 0.5 };
      if (e.step === 0) setTimeout(() => CW.slashArc(F, Object.assign(o, { roll: 30, radius: 1.8, width: 0.5, arc: 2.2, dur: 0.24 })), 160);
      else if (e.step === 1) setTimeout(() => CW.slashArc(F, Object.assign(o, { roll: 210, radius: 1.8, width: 0.5, arc: 2.2, dur: 0.24 })), 160);
    },
    hit(F, e) {
      const dir = new T.Vector3(-e.dx, e.dy + 0.3, -e.dz); // debris falls back toward you: the pull
      F.fx.burst(e.x, e.y, e.z, 14, 7, VIOLET, 0.3, 0.3, 0, { dir });
      F.fx.blood(e.x, e.y, e.z, dir, 1.1);
      F.lensAt(new T.Vector3(e.x, e.y, e.z), 1.2, 0.08);
      F.flash(e.x, e.y, e.z, VIOLET, 4, 0.14);
    },

    inspect: {
      dur: 4.8,
      R: [
        K(0.12, [0.18, -0.3, -0.56], 0.5, 0.35, 0),
        K(0.24, [0.18, -0.3, -0.56], 0.55, 0.38, 0.3),
        K(0.36, [0.14, -0.36, -0.64], 0.45, 0.5, 0),
        K(0.48, [0.14, -0.36, -0.64], 0.42, 0.5, 0.4),
        K(0.72, [0.16, -0.38, -0.66], 0.42, 0.52, 0.9),
        K(0.93, [0.16, -0.38, -0.66], 0.45, 0.55, 0.5),
        R(1),
      ],
    },

    dispose(vm, s) { s.motes.clear(); s.trail.dispose(vm.scene); vm.scene.remove(s.hole); for (const h of s.rocks) { vm.scene.remove(h.m); h.m.userData.dispose(); } },
  };

  // the thrown black hole (world): dark core, spinning disk, space bending around it
  AFX.spell.cw_grav_hole = {
    build(F) { const root = new T.Group(); const h = blackHole(root, 1.6); setHole(h, 1, 0); return { root, h }; },
    update(F, v) { setHole(v.h, 1, F.t); F.lensAt(v.root.getWorldPosition(new T.Vector3()), 3, 0.25); },
    dispose(F, v) { v.h.children.forEach((c) => c.material.dispose()); },
  };
  // the well: a swirl on the ground with dust dragged into its center
  AFX.effect.cw_well = {
    build(F, fx) {
      const m = new T.Mesh(new T.PlaneGeometry(fx.r * 2, fx.r * 2).rotateX(-PI / 2), new T.MeshBasicMaterial({ map: diskTex(), color: VIOLET, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
      m.position.set(fx.x, fx.y - (fx.boom ? 0 : 0.92), fx.z);
      F.add(m);
      const h = fx.boom ? blackHole(F.scene, 2.2) : null;
      if (h) h.position.set(fx.x, fx.y, fx.z);
      return { root: m, h, own: h ? [h] : [] };
    },
    update(F, v, fx, dt) {
      const k = Math.min(1, fx.t / 0.2) * Math.min(1, (fx.dur - fx.t) / 0.25);
      v.root.rotation.y += dt * 4; v.root.material.opacity = k * 0.45;
      if (v.h) { setHole(v.h, k, F.t); F.lensAt(new T.Vector3(fx.x, fx.y, fx.z), fx.r * 0.6, 0.35 * k); }
      for (let i = 0; i < 4; i++) {
        const a = Math.random() * PI * 2, r = fx.r * (0.6 + Math.random() * 0.4);
        F.fx.glowP.emit(fx.x + Math.cos(a) * r, fx.y - (fx.boom ? 0 : 0.7) + Math.random() * 1.5, fx.z + Math.sin(a) * r, -Math.cos(a) * r * 2 - Math.sin(a) * 4, 0, -Math.sin(a) * r * 2 + Math.cos(a) * 4, 0.6, 0.25, 1, 0.12, 0.45, 0, 0);
      }
    },
    end(F, v) { v.root.geometry.dispose(); v.root.material.dispose(); if (v.h) v.h.children.forEach((c) => c.material.dispose()); return 0; },
  };
  AFX.vfx['cw_grav:implode'] = (F, e, mine) => {
    F.fx.burst(e.x, e.y, e.z, 40, 14, VIOLET, 0.5, 0.45, 0);
    F.fx.burst(e.x, e.y, e.z, 20, 8, 0x14061e, 0.8, 0.8, -2);
    F.flash(e.x, e.y, e.z, VIOLET, 10, 0.3);
    if (mine) F.kick(6);
  };
})(window.SO = window.SO || {});
