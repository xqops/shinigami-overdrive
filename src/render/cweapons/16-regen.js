// 16 REGENERAÇÃO — "Báculo da Natureza": a staff of braided vines with white flowers and a green
// life orb, held in one hand. Petals drift off it. Its blows plant real flowers where they land
// (they grow, open and sway, and heal you while you stand among them); the heavy turns the whole
// field around you into a garden. Inspect (author's sheet): held; the flowers on the staff bloom;
// leaves and ribbons of green light wind around it; crosses of light rise in a green glow.
(function (SO) {
  'use strict';
  const T = THREE, CW = SO.CharWeapons, AFX = SO.AFX, PI = Math.PI;
  const K = (t, p, a, f, roll, ease) => ({ t, p, a, f, roll, ease: ease || 'inout' });
  const R = (t) => ({ t, rest: true, ease: 'inout' });
  const GREEN = 0x60ff90, LIME = 0xb0ff70, PETAL = 0xfff6f2, PINK = 0xffc8dc, GOLDC = 0xffd040;
  const VX = 0.0046, H = 226, GRIP = Math.floor(226 * 0.55);
  const L = (px, row) => new T.Vector3((px - 20.5) * VX, (H - row - GRIP) * VX, 0);
  const CROSS = ['..#..', '..#..', '#####', '..#..', '..#..'];
  const PETALART = ['.##.', '####', '####', '.##.'];

  // one flower: a stem, two leaves, six petals around a golden heart. scale ~1 = 0.5 m tall.
  // f.userData.set(open 0..1, grow 0..1, sway)
  const petalGeo = new T.CircleGeometry(1, 8).scale(0.07, 0.15, 1).translate(0, 0.15, 0);
  const leafGeo = new T.CircleGeometry(1, 6).scale(0.05, 0.12, 1).translate(0, 0.12, 0);
  function flower(pink) {
    const g = new T.Group();
    const stemMat = new T.MeshLambertMaterial({ color: 0x2a8a3a, emissive: 0x0a2a10 });
    const stem = new T.Mesh(new T.CylinderGeometry(0.012, 0.016, 0.42, 5).translate(0, 0.21, 0), stemMat);
    g.add(stem);
    for (const s of [-1, 1]) { const lf = new T.Mesh(leafGeo, new T.MeshLambertMaterial({ color: 0x3ab04a, emissive: 0x0a3a14, side: T.DoubleSide })); lf.position.y = 0.1 + (s > 0 ? 0.08 : 0); lf.rotation.set(0, s > 0 ? 0 : PI, s * 0.9); g.add(lf); }
    const head = new T.Group(); head.position.y = 0.42; g.add(head);
    const pmat = new T.MeshLambertMaterial({ color: pink ? PINK : PETAL, emissive: pink ? 0x3a1a24 : 0x3a3430, side: T.DoubleSide });
    const petals = [];
    for (let i = 0; i < 6; i++) { const holder = new T.Group(); holder.rotation.y = i / 6 * PI * 2; const pm = new T.Mesh(petalGeo, pmat); holder.add(pm); head.add(holder); petals.push(pm); }
    const heart = new T.Mesh(new T.IcosahedronGeometry(0.035, 0), new T.MeshBasicMaterial({ color: GOLDC }));
    head.add(heart);
    const glow = new T.Sprite(new T.SpriteMaterial({ map: CW.dotTex(), color: pink ? 0xff90c0 : 0xd8ffd0, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false }));
    glow.scale.set(0.22, 0.22, 1); head.add(glow);
    g.userData.set = (open, grow, sway) => {
      g.scale.setScalar(Math.max(0.001, grow));
      for (const pm of petals) pm.rotation.x = -0.15 - open * 1.15; // petals fold out from upright
      head.rotation.z = sway; stem.rotation.z = sway * 0.5;
      glow.material.opacity = 0.6 * open;
    };
    g.userData.dispose = () => { stem.geometry.dispose(); stemMat.dispose(); pmat.dispose(); heart.geometry.dispose(); heart.material.dispose(); glow.material.dispose(); };
    g.userData.set(0, 0, 0);
    return g;
  }

  CW.reg.regen = {
    slot: 0,
    oneHand: true,
    restR: { p: [0.28, -0.36, -0.62], a: 0.2, f: 0.3, roll: 0 },
    gripR: 0,

    build(vm) {
      const right = SO.Voxel.build('weapons/natureza_baculo', { voxel: VX, grip: 0.55, glow: 0.35, haloPx: 1.8, depth: () => 3 });
      if (!right) return null;
      right.userData.halo.material.color.setHex(GREEN);
      right.userData.tip.position.copy(L(20, 17));
      right.userData.base.position.copy(L(20, 60));
      const s = { right, motes: new CW.Motes(vm.scene, 300), acc: 0, petal: 0 };
      s.orb = new T.Object3D(); s.orb.position.copy(L(20, 17)); right.add(s.orb);
      // little 3D flowers on the staff that bloom in the show (where the sprite's flowers are)
      s.buds = [[29, 30], [12, 52], [28, 76], [11, 98]].map(([x, y], i) => { const f = flower(i % 2 === 1); f.position.copy(L(x, y)).add(new T.Vector3(0, 0, 0.012)); f.rotation.z = (x > 20 ? -1 : 1) * 0.9; f.scale.setScalar(0.001); right.add(f); return f; });
      s.ribbons = [0, 1].map(() => { const r = new CW.Ribbon(vm.scene, { color: GREEN, width: 0.01, length: 0.3, n: 14, glow: true }); r.mesh.visible = false; return r; });
      s.trail = new CW.Trail(vm.scene, { color: 0x1a8a3a, core: 0xe0ffe0, life: 0.12, width: 0.6 });
      return s;
    },

    update(vm, s, dt, ctx) {
      const insp = ctx.inspect, ud = s.right.userData;
      const beat = insp < 0 ? 0 : insp < 0.24 ? 1 : insp < 0.48 ? 2 : insp < 0.72 ? 3 : insp < 0.95 ? 4 : 0;
      ud.halo.material.opacity = 0.3 + Math.sin(ctx.time * 2) * 0.08 + (beat >= 3 ? 0.2 : 0);
      const orb = s.orb.getWorldPosition(new T.Vector3()), pom = ud.pommel.getWorldPosition(new T.Vector3());
      // the staff's own flowers open on beat 2 and stay open through the show
      const bloom = beat >= 2 ? Math.min(1, (insp - 0.24) * 6) * Math.min(1, (0.97 - insp) * 10) : 0;
      s.buds.forEach((f, i) => f.userData.set(bloom, bloom * 0.2, Math.sin(ctx.time * 2 + i) * 0.1));
      // petals drifting down, green motes rising off the orb
      s.petal += dt * (beat >= 2 ? 10 : 2.5);
      while (s.petal >= 1) { s.petal -= 1; s.motes.emit({ pos: orb.clone().lerp(pom, Math.random() * 0.5).add(new T.Vector3((Math.random() - 0.5) * 0.06, 0, 0)), vel: new T.Vector3(0.03 + Math.random() * 0.04, -0.06, (Math.random() - 0.5) * 0.03), life: 1.5, size: 0.011, size1: 0.009, color: Math.random() < 0.3 ? PINK : PETAL, opacity: 1, tex: CW.artTex('regen-petal', PETALART), drag: 0.6, curl: 0.8, spin: 3, additive: false, fadeIn: 0.1 }); }
      s.acc += dt * (beat >= 3 ? 30 : 6);
      while (s.acc >= 1) { s.acc -= 1; s.motes.emit({ pos: orb.clone().add(new T.Vector3((Math.random() - 0.5) * 0.05, 0, (Math.random() - 0.5) * 0.05)), vel: new T.Vector3((Math.random() - 0.5) * 0.04, 0.06 + Math.random() * 0.06, 0), life: 0.9, size: 0.006, size1: 0.002, color: Math.random() < 0.6 ? GREEN : LIME, opacity: 1, tex: CW.dotTex(), drag: 0.6, curl: 0.8, fadeIn: 0.2 }); }
      // green ribbons winding around the staff (beat 3+)
      s.ribbons.forEach((r, i) => {
        r.mesh.visible = beat >= 3;
        if (!r.mesh.visible) return;
        const a = ctx.time * 3 + i * PI, h = (ctx.time * 0.35 + i * 0.5) % 1;
        r.update(dt, pom.clone().lerp(orb, h).add(new T.Vector3(Math.cos(a) * 0.07, 0, Math.sin(a) * 0.05)), 0.003);
      });
      // crosses of light rising (beat 4)
      if (beat === 4 && Math.random() < dt * 14) s.motes.emit({ pos: orb.clone().add(new T.Vector3((Math.random() - 0.5) * 0.5, -0.1 - Math.random() * 0.2, -0.1 - Math.random() * 0.2)), vel: new T.Vector3(0, 0.09, 0), life: 1.1, size: 0.03, size1: 0.03, color: GREEN, opacity: 1, tex: CW.artTex('regen-cross', CROSS), drag: 0.2, fadeIn: 0.25, rot: 0 });
      s.motes.update(dt, ctx.time);
      s.trail.update(dt, s.right, ctx.trailOn(ctx.swing ? ctx.swing.trail : null));
    },

    clips: {
      regen_a1: { trail: [0.24, 0.68], R: [K(0.2, [0.45, -0.08, -0.5], -1.2, 0.45, 0), K(0.42, [0.1, -0.16, -0.7], 0.5, 0.4, 0), K(0.6, [-0.25, -0.3, -0.6], 1.7, 0.4, 0, 'out'), K(0.78, [-0.27, -0.32, -0.58], 1.8, 0.4, 0), R(1)] },
      regen_a2: { trail: [0.24, 0.68], R: [K(0.2, [-0.25, -0.12, -0.5], 1.4, 0.45, PI), K(0.42, [0.08, -0.18, -0.7], -0.3, 0.4, PI), K(0.6, [0.42, -0.3, -0.6], -1.6, 0.4, PI, 'out'), K(0.78, [0.44, -0.32, -0.58], -1.7, 0.4, PI), R(1)] },
      regen_a3: { trail: [0.42, 0.6], R: [K(0.38, [0.16, 0.0, -0.46], 0.15, -0.5, 0, 'stop'), K(0.55, [0.08, -0.3, -0.75], 0, 1.2, 0, 'out'), K(0.82, [0.08, -0.32, -0.73], 0, 1.22, 0), R(1)] },
      regen_h: { trail: [2, 2], R: [K(0.35, [0.15, 0.06, -0.45], 0.1, -0.35, 0, 'stop'), K(0.55, [0.1, -0.36, -0.55], 0.05, -0.12, 0, 'out'), K(0.82, [0.1, -0.37, -0.55], 0.05, -0.12, 0), R(1)] },
    },

    swing(F, e, view) {
      const o = { pos: view.eye, yaw: view.yaw, pitch: view.pitch * 0.85, color: 0x1a6a2a, core: 0xe0ffe0, wisp: 0.6, cells: [110, 6], alpha: 0.5 };
      if (e.step === 0) setTimeout(() => CW.slashArc(F, Object.assign(o, { roll: 30, radius: 1.8, width: 0.32, arc: 2.4, dur: 0.24 })), 70);
      else if (e.step === 1) setTimeout(() => CW.slashArc(F, Object.assign(o, { roll: 210, radius: 1.8, width: 0.32, arc: 2.4, dur: 0.24 })), 70);
    },
    hit(F, e) {
      const dir = new T.Vector3(e.dx, e.dy + 0.3, e.dz);
      F.fx.burst(e.x, e.y, e.z, 12, 8, GREEN, 0.25, 0.3, -4, { dir });
      F.fx.blood(e.x, e.y, e.z, dir, 0.8);
      petals(F, e.x, e.y, e.z, 6);
    },

    inspect: {
      dur: 4.8,
      R: [K(0.12, [0.16, -0.28, -0.58], 0.15, 0.25, 0), K(0.24, [0.16, -0.28, -0.58], 0.18, 0.27, 0.3), K(0.36, [0.1, -0.33, -0.52], 0.1, 0.15, 0), K(0.48, [0.1, -0.33, -0.52], 0.08, 0.15, -0.3), K(0.72, [0.12, -0.36, -0.56], 0.1, 0.18, 0.3), K(0.93, [0.12, -0.36, -0.56], 0.1, 0.18, 0), R(1)],
    },

    dispose(vm, s) { s.motes.clear(); s.trail.dispose(vm.scene); for (const r of s.ribbons) r.dispose(); for (const f of s.buds) f.userData.dispose(); },
  };

  // petals thrown into the world
  function petals(F, x, y, z, n) {
    for (let i = 0; i < n; i++) {
      const sp = new T.Sprite(new T.SpriteMaterial({ map: CW.artTex('regen-petal', PETALART), color: Math.random() < 0.3 ? PINK : PETAL, transparent: true, depthWrite: false }));
      sp.position.set(x, y, z); F.add(sp);
      const v = new T.Vector3((Math.random() - 0.5) * 4, 1 + Math.random() * 2, (Math.random() - 0.5) * 4);
      const s0 = 0.12 + Math.random() * 0.08;
      F.spawn((dt, age) => { v.y -= 2.5 * dt; v.multiplyScalar(Math.exp(-1.5 * dt)); sp.position.addScaledVector(v, dt); sp.material.rotation += dt * 4; const k = Math.min(1, (1.6 - age) / 0.4); sp.scale.set(s0 * k, s0 * k, 1); if (age < 1.6) return true; sp.material.dispose(); return false; }, [sp]);
    }
  }
  AFX.status['cw_regen:slow'] = {
    // vines curling around the legs
    build(F, ctx) { const m = new T.Mesh(new T.TorusGeometry(ctx.e.def.radius + 0.2, 0.05, 4, 16).rotateX(PI / 2), new T.MeshLambertMaterial({ color: 0x2a8a3a, emissive: 0x0a3a14 })); m.position.y = 0.3; ctx.view.root.add(m); return { root: m }; },
    update(F, v) { v.root.rotation.y += 0.02; },
    end(F, v) { if (v.root.parent) v.root.parent.remove(v.root); v.root.geometry.dispose(); v.root.material.dispose(); },
  };
  // the flowers: they grow out of the ground one by one, open, sway in the air and heal you while
  // you stand among them; healing motes (green crosses) rise from the ones near you
  AFX.effect.cw_flowers = {
    build(F, fx) {
      const root = new T.Group(); root.position.set(fx.x, fx.y, fx.z);
      const items = [];
      for (let i = 0; i < fx.n; i++) {
        // sunflower spiral spread: even, natural
        const a = i * 2.39996, r = fx.r * Math.sqrt((i + 0.5) / fx.n) * 0.95;
        const f = flower(Math.random() < 0.3);
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        const gy = SO.Kit && F.world ? SO.Kit.groundAt(F.world, fx.x + x, fx.z + z, fx.y + 1) - fx.y : 0;
        f.position.set(x, gy, z);
        f.rotation.y = Math.random() * PI * 2;
        const size = (fx.field ? 1.6 : 1.2) * (0.75 + Math.random() * 0.5);
        root.add(f);
        items.push({ f, delay: (r / fx.r) * (fx.field ? 0.8 : 0.35) + Math.random() * 0.1, size, ph: Math.random() * 6 });
      }
      // a glow on the ground under the garden
      const glow = new T.Mesh(new T.CircleGeometry(fx.r, 32).rotateX(-PI / 2), new T.MeshBasicMaterial({ color: GREEN, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false }));
      glow.position.y = 0.04; root.add(glow);
      F.add(root);
      if (fx.field) {
        const ring = new T.Mesh(new T.RingGeometry(0.9, 1, 48).rotateX(-PI / 2), new T.MeshBasicMaterial({ color: LIME, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
        ring.position.set(fx.x, fx.y + 0.08, fx.z); F.add(ring);
        F.spawn((dt, age) => { const k = age / 0.8; ring.scale.setScalar(0.5 + k * fx.r); ring.material.opacity = 1 - k; if (k < 1) return true; ring.geometry.dispose(); ring.material.dispose(); return false; }, [ring]);
        F.flash(fx.x, fx.y + 1, fx.z, GREEN, 8, 0.4);
      }
      return { root, items, glow };
    },
    update(F, v, fx, dt) {
      const end = Math.min(1, (fx.dur - fx.t) / 0.8);
      for (const it of v.items) {
        const t = Math.max(0, fx.t - it.delay);
        const grow = Math.min(1, t / 0.35), open = Math.min(1, Math.max(0, (t - 0.2) / 0.5));
        const k = grow * end;
        it.f.userData.set(open * end, k * it.size, Math.sin(F.t * 1.6 + it.ph) * 0.12);
      }
      v.glow.material.opacity = 0.12 * Math.min(1, fx.t / 0.5) * end;
      // healing: when the player stands in it, crosses of light rise around them
      const pl = F.player && F.player.pos;
      if (pl && Math.hypot(pl.x - fx.x, pl.z - fx.z) < fx.r && Math.random() < dt * 6) {
        const a = Math.random() * PI * 2;
        const sp = new T.Sprite(new T.SpriteMaterial({ map: CW.artTex('regen-cross', CROSS), color: GREEN, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
        sp.position.set(pl.x + Math.cos(a) * 0.8, pl.y + 0.4, pl.z + Math.sin(a) * 0.8); F.add(sp);
        F.spawn((d, age) => { sp.position.y += d * 0.9; const k = 1 - age / 1; sp.scale.set(0.22 * k, 0.22 * k, 1); sp.material.opacity = k; if (age < 1) return true; sp.material.dispose(); return false; }, [sp]);
      }
      if (Math.random() < dt * (fx.field ? 12 : 3)) { const it = v.items[(Math.random() * v.items.length) | 0]; const p = it.f.getWorldPosition(new T.Vector3()); F.fx.glowP.emit(p.x, p.y + 0.5, p.z, 0, 0.6, 0, 0.5, 1, 0.6, 0.08, 0.8, 0, 0.5); }
    },
    end(F, v) { for (const it of v.items) it.f.userData.dispose(); v.glow.geometry.dispose(); v.glow.material.dispose(); return 0; },
  };
})(window.SO = window.SO || {});
