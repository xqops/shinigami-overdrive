// 15 VENTO CORTANTE — "Foice do Vendaval": a scythe with a blade of pale wind-steel. Streams of
// wind always curl around it, leaves tumble past. Inspect (author's sheet): held; the wind winds
// around the blade; the streams thicken into swirls; a whole gale spins around the hands.
(function (SO) {
  'use strict';
  const T = THREE, CW = SO.CharWeapons, AFX = SO.AFX, PI = Math.PI;
  const K = (t, p, a, f, roll, ease) => ({ t, p, a, f, roll, ease: ease || 'inout' });
  const R = (t) => ({ t, rest: true, ease: 'inout' });
  const CYAN = 0x7ae0ff, WHITE = 0xf0ffff, DEEP = 0x2a90c0, LEAF = 0xc8a050;
  const VX = 0.0048, H = 226, GRIP = Math.floor(226 * 0.32);
  const L = (px, row) => new T.Vector3((px - 13.5) * VX, (H - row - GRIP) * VX, 0);
  const LEAFART = ['..##.', '.####', '#####', '####.', '.##..'];

  CW.reg.wind = {
    slot: 0,
    restR: { p: [0.28, -0.32, -0.62], a: 0.3, f: 0.45, roll: 0 },
    gripR: 0, gripL2: 0.24,
    freeClips: { wind_a3: 1 },

    build(vm) {
      const right = SO.Voxel.build('weapons/vento_foice', { voxel: VX, grip: 0.32, glow: 0.35, haloPx: 1.6, depth: (r, x) => (x > 18 ? 1.4 : 2.6) });
      if (!right) return null;
      right.userData.halo.material.color.setHex(CYAN);
      right.userData.base.position.copy(L(16, 18));
      right.userData.tip.position.copy(L(62, 88));
      const s = { right, motes: new CW.Motes(vm.scene, 300), acc: 0, leafAcc: 0 };
      s.blade = [L(30, 22), L(50, 40), L(60, 70)].map((v) => { const o = new T.Object3D(); o.position.copy(v); right.add(o); return o; });
      s.streams = [0, 1, 2, 3, 4, 5, 6, 7, 8].map((i) => { const r = new CW.Ribbon(vm.scene, { color: i % 2 ? WHITE : CYAN, width: 0.016 + (i % 3) * 0.008, length: 0.34 + (i % 3) * 0.12, n: 14, glow: true }); return r; });
      s.trail = new CW.Trail(vm.scene, { color: DEEP, core: WHITE, life: 0.14, width: 0.9 });
      return s;
    },

    update(vm, s, dt, ctx) {
      const insp = ctx.inspect, ud = s.right.userData;
      const beat = insp < 0 ? 0 : insp < 0.24 ? 1 : insp < 0.48 ? 2 : insp < 0.72 ? 3 : insp < 0.95 ? 4 : 0;
      ud.halo.material.opacity = 0.28 + Math.sin(ctx.time * 3) * 0.05 + (beat >= 2 ? 0.12 : 0);
      const head = s.blade[1].getWorldPosition(new T.Vector3());
      const pom = ud.pommel.getWorldPosition(new T.Vector3());
      // wind streams: their heads orbit; the ribbons trail behind like streaks of air
      const shown = beat === 4 ? 9 : beat === 3 ? 6 : beat === 2 ? 4 : 2;
      const radius = beat === 4 ? 0.3 : beat === 3 ? 0.2 : beat === 2 ? 0.13 : 0.09;
      s.streams.forEach((r, i) => {
        r.mesh.visible = i < shown;
        if (!r.mesh.visible) return;
        const a = ctx.time * (4 + i * 0.6) + i * 1.3;
        const h = beat === 4 ? ((ctx.time * 0.3 + i / 6) % 1) : 0.15 + (i % 3) * 0.15;
        const c = beat === 4 ? pom.clone().lerp(head, h) : head.clone().lerp(pom, h * 0.6);
        r.update(dt, c.add(new T.Vector3(Math.cos(a) * radius, Math.sin(a * 0.7) * radius * 0.4, Math.sin(a) * radius * 0.6)), 0.001);
      });
      // dust of air
      s.acc += dt * (beat >= 2 ? 30 : ctx.swing ? 20 : 6);
      while (s.acc >= 1) { s.acc -= 1; const a = Math.random() * PI * 2; s.motes.emit({ pos: head.clone().add(new T.Vector3(Math.cos(a) * radius, (Math.random() - 0.5) * 0.1, Math.sin(a) * radius * 0.6)), vel: new T.Vector3(-Math.sin(a) * 0.4, 0.05, Math.cos(a) * 0.25), life: 0.4, size: 0.005, size1: 0.002, color: WHITE, opacity: 1, tex: CW.dotTex(), drag: 1, fadeIn: 0.05 }); }
      // tumbling leaves in the gale
      if (beat >= 3) {
        s.leafAcc += dt * (beat === 4 ? 10 : 4);
        while (s.leafAcc >= 1) { s.leafAcc -= 1; const a = Math.random() * PI * 2; const m = s.motes.emit({ pos: head.clone().add(new T.Vector3(Math.cos(a) * 0.3, (Math.random() - 0.5) * 0.3, Math.sin(a) * 0.15)), vel: new T.Vector3(-Math.sin(a) * 0.6, 0.1, Math.cos(a) * 0.3), life: 0.9, size: 0.018, size1: 0.014, color: LEAF, opacity: 1, tex: CW.artTex('wind-leaf', LEAFART), drag: 0.5, spin: 8, additive: false, fadeIn: 0.1 }); }
      }
      s.motes.update(dt, ctx.time);
      s.trail.update(dt, s.right, ctx.trailOn(ctx.swing ? ctx.swing.trail : null));
    },

    clips: {
      wind_a1: { trail: [0.18, 0.62], R: [K(0.16, [0.45, -0.1, -0.65], -1.2, 0.3, 0), K(0.34, [0.15, -0.18, -0.75], 0.4, 0.3, 0), K(0.52, [-0.25, -0.25, -0.75], 2.1, 0.3, 0, 'out'), K(0.72, [-0.3, -0.3, -0.72], 2.4, 0.3, 0), R(1)] },
      wind_a2: { trail: [0.18, 0.62], R: [K(0.16, [-0.2, -0.05, -0.65], 1.2, 0.3, PI), K(0.34, [0.0, -0.15, -0.75], -0.4, 0.3, PI), K(0.52, [0.4, -0.28, -0.75], -2.1, 0.3, PI, 'out'), K(0.72, [0.44, -0.32, -0.72], -2.4, 0.3, PI), R(1)] },
      wind_a3: { trail: [0.1, 0.86], R: [K(0.1, [0.05, -0.14, -0.85], 0, 0.15, 0), K(0.3, [0.05, -0.14, -0.85], PI, 0.15, 0), K(0.5, [0.05, -0.14, -0.85], 2 * PI, 0.15, 0), K(0.7, [0.05, -0.14, -0.85], 3 * PI, 0.15, 0), K(0.86, [0.05, -0.14, -0.85], 4 * PI, 0.15, 0), R(1)] },
      wind_h: { trail: [0.36, 0.66], R: [K(0.3, [0.4, 0.05, -0.5], -0.6, -0.2, 0, 'stop'), K(0.5, [-0.1, -0.2, -0.75], 1.6, 0.4, 0, 'out'), K(0.75, [-0.15, -0.25, -0.72], 1.9, 0.4, 0), R(1)] },
    },

    swing(F, e, view) {
      if (e.step === 2) for (let i = 0; i < 2; i++) setTimeout(() => CW.slashArc(F, { pos: view.eye, yaw: view.yaw, pitch: view.pitch * 0.85, roll: 0, color: DEEP, core: WHITE, radius: 2.3, width: 0.32, arc: 3.0, dur: 0.24, ahead: 0.4, tilt: -0.15, wisp: 0.6, cells: [130, 5], alpha: 0.6 }), 60 + i * 230);
    },
    hit(F, e) {
      const dir = new T.Vector3(e.dx, e.dy + 0.4, e.dz);
      F.fx.burst(e.x, e.y, e.z, 12, 10, WHITE, 0.2, 0.2, 0, { dir });
      F.fx.blood(e.x, e.y, e.z, dir, 1);
      F.fx.crescent(new T.Vector3(e.x, e.y, e.z), Math.random() * 6.28, 0.2, Math.random() * 360, 1.2, CYAN, 0.12, false, WHITE);
    },

    inspect: {
      dur: 4.6,
      R: [K(0.12, [0.22, -0.28, -0.62], 0.3, 0.4, 0), K(0.24, [0.22, -0.28, -0.62], 0.33, 0.42, 0.3), K(0.36, [0.18, -0.3, -0.64], 0.25, 0.35, 0), K(0.48, [0.18, -0.3, -0.64], 0.22, 0.35, 0.3), K(0.72, [0.18, -0.3, -0.66], 0.25, 0.38, 0.8), K(0.93, [0.18, -0.3, -0.66], 0.25, 0.38, 1.4), R(1)],
    },

    dispose(vm, s) { s.motes.clear(); s.trail.dispose(vm.scene); for (const r of s.streams) r.dispose(); },
  };

  // a crescent of wind flying out from the sweep
  AFX.spell.cw_wind_blade = {
    build(F, q) {
      const root = new T.Group();
      const mat = CW.slashMat({ color: DEEP, core: WHITE, wisp: 0.7, cells: [80, 6], alpha: 0.85 });
      const m = new T.Mesh(CW.arcGeo(1.0, 1.5, PI / 2 - 1.1, PI / 2 + 1.1, 36), mat);
      m.position.z = 1.1;
      const tilt = new T.Group(); tilt.rotation.x = -PI / 2; tilt.add(m);
      const rollG = new T.Group(); rollG.rotation.z = q.roll === 180 ? PI : 0; rollG.add(tilt);
      root.add(rollG);
      return { root, mat, m };
    },
    update(F, v, dt, vel) { const p = v.root.position; v.root.lookAt(p.x - vel.x, p.y - vel.y, p.z - vel.z); v.mat.uniforms.uT.value = 0.62; },
    dispose(F, v) { v.mat.dispose(); v.m.geometry.dispose(); },
    hit(F, e) { F.fx.burst(e.x, e.y, e.z, 8, 8, WHITE, 0.2, 0.2, 0); },
  };
  // the tornado: rings of wind stacked into a funnel, dust and leaves sucked round and up
  AFX.effect.cw_tornado = {
    build(F, fx) {
      const root = new T.Group(); root.position.set(fx.x, fx.y, fx.z);
      const rings = [];
      for (let i = 0; i < 10; i++) {
        const r = 0.8 + i * 0.42;
        const m = new T.Mesh(new T.TorusGeometry(r, 0.06 + i * 0.008, 4, 40, PI * (1.2 + (i % 3) * 0.25)), new T.MeshBasicMaterial({ color: i % 2 ? WHITE : CYAN, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false }));
        m.rotation.x = PI / 2; m.position.y = 0.3 + i * 0.75;
        root.add(m); rings.push(m);
      }
      F.add(root);
      return { root, rings };
    },
    update(F, v, fx, dt) {
      const k = Math.min(1, fx.t / 0.3) * Math.min(1, (fx.dur - fx.t) / 0.4);
      v.rings.forEach((m, i) => { m.rotation.z += dt * (9 - i * 0.4); m.material.opacity = 0.55 * k; m.position.x = Math.sin(F.t * 3 + i * 0.6) * 0.25 * i * 0.15; });
      v.root.scale.set(k, 1, k);
      for (let i = 0; i < 4; i++) { const a = Math.random() * PI * 2, h = Math.random() * 7, r = 0.8 + h * 0.42; F.fx.glowP.emit(fx.x + Math.cos(a) * r, fx.y + h, fx.z + Math.sin(a) * r, -Math.sin(a) * 10, 3, Math.cos(a) * 10, 0.85, 0.95, 1, 0.1, 0.4, 0, 1); }
      if (Math.random() < 0.3) F.fx.burst(fx.x, fx.y + 0.2, fx.z, 2, 4, 0x6a5a48, 0.3, 0.6, -2);
    },
    end(F, v) { v.root.traverse((o) => { if (o.material) { o.material.dispose(); o.geometry.dispose(); } }); return 0; },
  };
})(window.SO = window.SO || {});
