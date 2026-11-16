// 13 LANÇA DE ENERGIA — "Lança Sagrada": a spear of gold light with a sunburst at its base.
// Motes of light drift off it. Inspect (author's sheet): held; sparks and a thin ring of light
// rise; rings and ribbons of light wind around it; a great circle of runes opens behind it.
// The heavy throws it: it leaves the hand, flies as a lance of light and lands as a pillar.
(function (SO) {
  'use strict';
  const T = THREE, CW = SO.CharWeapons, AFX = SO.AFX, PI = Math.PI;
  const K = (t, p, a, f, roll, ease) => ({ t, p, a, f, roll, ease: ease || 'inout' });
  const R = (t) => ({ t, rest: true, ease: 'inout' });
  const GOLDL = 0xffd060, WHITE = 0xfff8e0, AMBER = 0xc08020;
  const VX = 0.0046, H = 236, GRIP = Math.floor(236 * 0.3);

  const circleTex = () => CW.pixelTex('holy-circle', 96, (x, y, s) => {
    const dx = (x + 0.5) / s - 0.5, dy = (y + 0.5) / s - 0.5, r = Math.sqrt(dx * dx + dy * dy) * 2, a = Math.atan2(dy, dx);
    if (r > 1) return 0;
    if (r > 0.95 || (r > 0.7 && r < 0.73) || (r > 0.42 && r < 0.45)) return 1;
    if (r > 0.75 && r < 0.92) { const c = ((a + PI) / (PI * 2) * 24) % 1, v = (r - 0.75) / 0.17; return (Math.abs(c - 0.5) < 0.08 || (Math.abs(v - 0.5) < 0.1 && c > 0.25 && c < 0.75)) ? 1 : 0; }
    if (r < 0.7 && Math.abs(Math.sin(a * 6)) < 0.04) return 1;
    for (let i = 0; i < 4; i++) { const b = i * PI / 4; if (Math.abs(Math.sin(a - b)) * r < 0.012 && r < 0.95) return 1; }
    return 0;
  });

  CW.reg.spear = {
    slot: 0,
    restR: { p: [0.25, -0.3, -0.6], a: 0.42, f: 0.6, roll: 0 },
    gripR: 0, gripL2: 0.25,

    build(vm) {
      const right = SO.Voxel.build('weapons/lanca_sagrada', { voxel: VX, grip: 0.3, glow: 0.4, haloPx: 2.2, depth: (r) => (r > 82 ? 2.4 : 1.4) });
      if (!right) return null;
      right.userData.halo.material.color.setHex(GOLDL);
      right.userData.tip.position.set(0, (H - GRIP) * VX, 0);
      right.userData.base.position.set(0, (H - GRIP - 82) * VX, 0);
      const s = { right, motes: new CW.Motes(vm.scene, 300), acc: 0, thrown: 0 };
      s.sun = new T.Object3D(); s.sun.position.set(0, (H - GRIP - 94) * VX, 0); right.add(s.sun);
      s.rings = [0, 1, 2].map((i) => { const m = new T.Mesh(new T.TorusGeometry(0.06 + i * 0.03, 0.0025, 4, 64), new T.MeshBasicMaterial({ color: i ? GOLDL : WHITE, transparent: true, blending: T.AdditiveBlending, depthWrite: false })); m.renderOrder = 5; m.visible = false; vm.scene.add(m); return m; });
      s.ribbons = [0, 1].map(() => { const r = new CW.Ribbon(vm.scene, { color: GOLDL, width: 0.012, length: 0.4, n: 14, glow: true }); r.mesh.visible = false; return r; });
      s.circle = new T.Sprite(new T.SpriteMaterial({ map: circleTex(), color: GOLDL, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
      s.circle.renderOrder = 1; s.circle.visible = false; vm.scene.add(s.circle);
      s.trail = new CW.Trail(vm.scene, { color: AMBER, core: WHITE, life: 0.11, width: 0.9 });
      return s;
    },

    update(vm, s, dt, ctx) {
      const insp = ctx.inspect, ud = s.right.userData;
      const beat = insp < 0 ? 0 : insp < 0.24 ? 1 : insp < 0.48 ? 2 : insp < 0.72 ? 3 : insp < 0.95 ? 4 : 0;
      // thrown: the spear is gone from the hand for a moment, then reforms in a flash
      const sw = ctx.swing;
      if (sw && sw.name === 'spear_h' && sw.t > 0.55 && !s.thrownSet) { s.thrownSet = 1; s.thrown = 0.55; }
      if (!sw) s.thrownSet = 0;
      s.thrown = Math.max(0, s.thrown - dt);
      s.right.visible = s.thrown <= 0;
      if (s.thrown > 0 && s.thrown < 0.05) for (let i = 0; i < 20; i++) s.motes.emit({ pos: ud.base.getWorldPosition(new T.Vector3()).lerp(ud.tip.getWorldPosition(new T.Vector3()), Math.random()), vel: new T.Vector3((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.2, 0), life: 0.4, size: 0.008, size1: 0.002, color: WHITE, opacity: 1, tex: CW.dotTex(), drag: 3, fadeIn: 0.02 });
      ud.halo.material.opacity = 0.32 + Math.sin(ctx.time * 2.5) * 0.06 + (beat >= 2 ? 0.2 : 0);
      const tip = ud.tip.getWorldPosition(new T.Vector3()), base = ud.base.getWorldPosition(new T.Vector3()), sun = s.sun.getWorldPosition(new T.Vector3());
      const pom = ud.pommel.getWorldPosition(new T.Vector3());
      // drifting motes of light (sparkle cross shape via tiny sprites)
      s.acc += dt * (beat >= 2 ? 40 : 8);
      while (s.acc >= 1) { s.acc -= 1; s.motes.emit({ pos: base.clone().lerp(tip, Math.random()).add(new T.Vector3((Math.random() - 0.5) * 0.1, 0, (Math.random() - 0.5) * 0.05)), vel: new T.Vector3((Math.random() - 0.5) * 0.04, 0.05 + Math.random() * 0.05, 0), life: 0.8 + Math.random() * 0.6, size: 0.003, size1: 0.012, color: Math.random() < 0.5 ? WHITE : GOLDL, opacity: 1, tex: CW.dotTex(), drag: 0.8, fadeIn: 0.4 }); }
      // rings of light around the shaft
      s.rings.forEach((m, i) => {
        m.visible = (beat === 2 && i === 0) || beat >= 3;
        if (!m.visible) return;
        const h = (ctx.time * 0.25 + i / 3) % 1;
        m.position.copy(pom.clone().lerp(tip, beat >= 3 ? 0.2 + h * 0.7 : 0.55));
        m.rotation.set(PI / 2 + Math.sin(ctx.time + i) * 0.4, 0, ctx.time * (1 + i));
        m.scale.setScalar(beat === 4 ? 1.8 : 1.2);
        m.material.opacity = 0.7 + Math.sin(ctx.time * 6 + i) * 0.25;
      });
      // ribbons of light winding up
      s.ribbons.forEach((r, i) => {
        r.mesh.visible = beat >= 3;
        if (!r.mesh.visible) return;
        const a = ctx.time * 3 + i * PI, h = (ctx.time * 0.4 + i * 0.5) % 1;
        r.update(dt, pom.clone().lerp(tip, h).add(new T.Vector3(Math.cos(a) * 0.08, 0, Math.sin(a) * 0.05)), 0.004);
      });
      // the circle of runes behind it
      const ck = beat === 4 ? Math.min(1, (insp - 0.72) * 6) * Math.min(1, (0.95 - insp) * 12) : 0;
      s.circle.visible = ck > 0.01;
      if (s.circle.visible) { s.circle.position.copy(sun).add(new T.Vector3(0, 0.06, -0.3)); s.circle.scale.set(0.9 * ck, 0.9 * ck, 1); s.circle.material.rotation = ctx.time * 0.35; s.circle.material.opacity = ck; }
      s.motes.update(dt, ctx.time);
      s.trail.update(dt, s.right, ctx.trailOn(ctx.swing ? ctx.swing.trail : null) && s.right.visible);
    },

    clips: {
      spear_a1: { trail: [0.22, 0.55], R: [K(0.2, [0.3, -0.2, -0.38], 0.3, 1.2, 0), K(0.42, [0.06, -0.14, -1.0], 0.08, 1.42, 0, 'out'), K(0.68, [0.08, -0.15, -0.96], 0.08, 1.42, 0), R(1)] },
      spear_a2: { trail: [0.2, 0.66], R: [K(0.2, [0.42, -0.06, -0.55], -1.2, 0.35, 0), K(0.4, [0.05, -0.18, -0.7], 0.3, 0.35, 0), K(0.58, [-0.3, -0.28, -0.6], 1.9, 0.35, 0, 'out'), K(0.76, [-0.32, -0.3, -0.58], 2.05, 0.35, 0), R(1)] },
      spear_a3: { trail: [0.22, 0.55], R: [K(0.22, [0.26, -0.08, -0.34], 0.2, 1.05, PI / 2), K(0.44, [0.03, -0.1, -1.05], 0.04, 1.44, PI / 2, 'out'), K(0.7, [0.05, -0.11, -1.0], 0.04, 1.44, PI / 2), R(1)] },
      spear_h: { trail: [0.45, 0.6], R: [K(0.4, [0.36, 0.1, -0.15], 0.3, 1.0, 0, 'stop'), K(0.55, [0.12, 0.0, -0.9], 0.05, 1.5, 0, 'out'), K(0.8, [0.2, -0.2, -0.6], 0.3, 0.9, 0), R(1)] },
    },

    swing(F, e, view) {
      if (e.step === 1) setTimeout(() => CW.slashArc(F, { pos: view.eye, yaw: view.yaw, pitch: view.pitch * 0.85, roll: 0, color: 0x8a5a10, core: WHITE, radius: 2.0, width: 0.3, arc: 2.4, dur: 0.22, wisp: 0.3, cells: [120, 5], alpha: 0.6 }), 60);
    },
    hit(F, e) {
      const dir = new T.Vector3(e.dx, e.dy + 0.3, e.dz);
      F.fx.burst(e.x, e.y, e.z, 14, 9, GOLDL, 0.25, 0.25, 0, { dir });
      F.fx.glint(e.x, e.y, e.z, WHITE);
      F.fx.blood(e.x, e.y, e.z, dir, 0.9);
      F.flash(e.x, e.y, e.z, GOLDL, 4, 0.12);
    },

    inspect: {
      dur: 4.6,
      R: [
        K(0.12, [0.18, -0.28, -0.6], 0.35, 0.4, 0),
        K(0.24, [0.18, -0.28, -0.6], 0.38, 0.42, 0.4),
        K(0.36, [0.16, -0.33, -0.62], 0.3, 0.32, 0),
        K(0.48, [0.16, -0.33, -0.62], 0.28, 0.32, 0.4),
        K(0.72, [0.15, -0.36, -0.64], 0.3, 0.38, 1.0),
        K(0.93, [0.15, -0.36, -0.64], 0.3, 0.38, 1.6),
        R(1),
      ],
    },

    dispose(vm, s) { s.motes.clear(); s.trail.dispose(vm.scene); for (const r of s.rings) vm.scene.remove(r); for (const r of s.ribbons) r.dispose(); vm.scene.remove(s.circle); },
  };

  // the thrown lance of light and the pillar where it lands
  AFX.spell.cw_light_spear = {
    build(F) {
      const root = new T.Group();
      const core = new T.Mesh(new T.OctahedronGeometry(1, 0).scale(0.06, 0.06, 1.3), new T.MeshBasicMaterial({ color: WHITE }));
      const glow = new T.Mesh(new T.OctahedronGeometry(1, 0).scale(0.2, 0.2, 1.6), new T.MeshBasicMaterial({ color: GOLDL, transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false }));
      root.add(core); root.add(glow);
      return { root, own: [core, glow], trail: new SO.AFXLib.Trail(F.scene, 16, 0.18, GOLDL, { core: WHITE, life: 0.2 }) };
    },
    update(F, v, dt, vel) {
      const p = v.root.position;
      if (Math.hypot(vel.x, vel.y, vel.z) > 0.5) v.root.lookAt(p.x + vel.x, p.y + vel.y, p.z + vel.z);
      v.trail.push(p, new T.Vector3(0, 1, 0), dt);
      F.fx.glowP.emit(p.x, p.y, p.z, 0, 0.5, 0, 1, 0.85, 0.4, 0.1, 0.3, 0, 1);
    },
    dispose(F, v) { for (const m of v.own) { m.geometry.dispose(); m.material.dispose(); } },
    hit(F, e) { F.fx.burst(e.x, e.y, e.z, 12, 8, GOLDL, 0.25, 0.25, 0); },
    boom(F, e, mine) {
      const g = new T.Group(); g.position.set(e.x, e.y - 0.5, e.z); F.add(g);
      const pillar = new T.Mesh(new T.CylinderGeometry(1.4, 1.8, 26, 16, 1, true).translate(0, 13, 0), new T.MeshBasicMaterial({ color: GOLDL, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      const core = new T.Mesh(new T.CylinderGeometry(0.5, 0.7, 26, 10, 1, true).translate(0, 13, 0), new T.MeshBasicMaterial({ color: WHITE, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      const ring = new T.Mesh(new T.PlaneGeometry(9, 9).rotateX(-PI / 2), new T.MeshBasicMaterial({ map: circleTex(), color: GOLDL, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      ring.position.y = 0.55;
      g.add(pillar); g.add(core); g.add(ring);
      F.spawn((dt, age) => {
        const k = 1 - age / 0.9;
        pillar.scale.set(0.4 + k * 0.6, 1, 0.4 + k * 0.6); core.scale.set(k, 1, k);
        pillar.material.opacity = 0.55 * k; core.material.opacity = k; ring.material.opacity = k; ring.rotation.y += dt;
        if (age < 0.9) return true;
        for (const m of [pillar, core, ring]) { m.geometry.dispose(); m.material.dispose(); } return false;
      }, [g]);
      F.fx.burst(e.x, e.y, e.z, 40, 12, GOLDL, 0.4, 0.5, -2);
      F.flash(e.x, e.y + 2, e.z, GOLDL, 12, 0.4);
      F.kick(5);
    },
  };
})(window.SO = window.SO || {});
