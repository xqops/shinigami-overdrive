// 18 ESCURIDÃO — "Foice do Eclipse": a black scythe with a violet-edged blade that swallows light.
// Black mist creeps off it. Inspect (author's sheet): held; the mist rises; darkness billows all
// around; an eclipse opens in the sky behind it.
(function (SO) {
  'use strict';
  const T = THREE, CW = SO.CharWeapons, AFX = SO.AFX, PI = Math.PI;
  const K = (t, p, a, f, roll, ease) => ({ t, p, a, f, roll, ease: ease || 'inout' });
  const R = (t) => ({ t, rest: true, ease: 'inout' });
  const VIOLET = 0x9a40ff, PALE = 0xe8c0ff, INK = 0x07030c;
  const VX = 0.0048, H = 228, GRIP = Math.floor(228 * 0.32);
  const L = (px, row) => new T.Vector3((px - 14.5) * VX, (H - row - GRIP) * VX, 0);

  const coronaTex = () => CW.pixelTex('eclipse-corona', 64, (x, y, s) => {
    const dx = (x + 0.5) / s - 0.5, dy = (y + 0.5) / s - 0.5, r = Math.sqrt(dx * dx + dy * dy) * 2, a = Math.atan2(dy, dx);
    if (r < 0.58 || r > 1) return 0;
    const rays = 0.6 + 0.4 * Math.sin(a * 9) * Math.sin(a * 4 + 1);
    return Math.max(0, 1 - (r - 0.58) / (0.42 * rays));
  });
  const discTex = () => CW.pixelTex('eclipse-disc', 64, (x, y, s) => { const dx = (x + 0.5) / s - 0.5, dy = (y + 0.5) / s - 0.5; return Math.sqrt(dx * dx + dy * dy) * 2 < 0.6 ? 1 : 0; });

  CW.reg.dark = {
    slot: 0,
    restR: { p: [0.28, -0.32, -0.62], a: 0.3, f: 0.45, roll: 0 },
    gripR: 0, gripL2: 0.24,

    build(vm) {
      const right = SO.Voxel.build('weapons/eclipse_foice', { voxel: VX, grip: 0.32, glow: 0.3, haloPx: 1.6, depth: (r, x) => (x > 20 ? 1.4 : 2.6) });
      if (!right) return null;
      right.userData.halo.material.color.setHex(VIOLET);
      right.userData.base.position.copy(L(18, 20));
      right.userData.tip.position.copy(L(68, 96));
      const s = { right, motes: new CW.Motes(vm.scene, 340), acc: 0 };
      s.blade = [L(30, 22), L(50, 44), L(66, 86)].map((v) => { const o = new T.Object3D(); o.position.copy(v); right.add(o); return o; });
      s.corona = new T.Sprite(new T.SpriteMaterial({ map: coronaTex(), color: VIOLET, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
      s.disc = new T.Sprite(new T.SpriteMaterial({ map: discTex(), color: 0x000000, transparent: true, depthWrite: false }));
      s.corona.renderOrder = 0; s.disc.renderOrder = 1; s.corona.visible = s.disc.visible = false;
      vm.scene.add(s.corona); vm.scene.add(s.disc);
      s.trail = new CW.Trail(vm.scene, { color: 0x3a0a6a, core: PALE, life: 0.14, width: 0.9 });
      return s;
    },

    update(vm, s, dt, ctx) {
      const insp = ctx.inspect, ud = s.right.userData;
      const beat = insp < 0 ? 0 : insp < 0.24 ? 1 : insp < 0.48 ? 2 : insp < 0.72 ? 3 : insp < 0.95 ? 4 : 0;
      ud.halo.material.opacity = 0.25 + Math.sin(ctx.time * 2) * 0.05 + (beat >= 3 ? 0.2 : 0);
      // black mist off the blade (normal blend: it darkens what is behind it)
      s.acc += dt * (beat >= 3 ? 50 : beat === 2 ? 30 : ctx.swing ? 22 : 10);
      while (s.acc >= 1) {
        s.acc -= 1;
        const big = beat >= 3 && Math.random() < 0.5;
        const p = big ? new T.Vector3((Math.random() - 0.5) * 1.3, -0.5 + Math.random() * 0.3, -0.7 - Math.random() * 0.5) : s.blade[(Math.random() * 3) | 0].getWorldPosition(new T.Vector3());
        s.motes.emit({ pos: p, vel: new T.Vector3((Math.random() - 0.5) * 0.05, big ? 0.06 : -0.02, 0), life: big ? 1.6 : 0.9, size: big ? 0.1 : 0.025, size1: big ? 0.3 : 0.07, color: Math.random() < 0.15 ? 0x2a0a4a : INK, opacity: big ? 0.6 : 0.5, drag: 1, curl: 0.8, additive: false, fadeIn: 0.25 });
        if (Math.random() < 0.3) s.motes.emit({ pos: p.clone(), vel: new T.Vector3((Math.random() - 0.5) * 0.04, 0.03, 0), life: 0.6, size: 0.006, size1: 0.002, color: PALE, opacity: 1, tex: CW.dotTex(), drag: 1, fadeIn: 0.1 });
      }
      // the eclipse in the sky
      const ek = beat === 4 ? Math.min(1, (insp - 0.72) * 5) * Math.min(1, (0.95 - insp) * 12) : 0;
      s.corona.visible = s.disc.visible = ek > 0.01;
      if (s.corona.visible) {
        const c = new T.Vector3(-0.15, 0.32, -1.6);
        s.corona.position.copy(c); s.disc.position.copy(c).add(new T.Vector3(0, 0, 0.01));
        const z = 0.9 * ek; s.corona.scale.set(z * 1.25, z * 1.25, 1); s.disc.scale.set(z, z, 1);
        s.corona.material.rotation = ctx.time * 0.2; s.corona.material.opacity = ek;
      }
      s.motes.update(dt, ctx.time);
      s.trail.update(dt, s.right, ctx.trailOn(ctx.swing ? ctx.swing.trail : null));
    },

    clips: {
      dark_a1: { trail: [0.18, 0.62], R: [K(0.16, [0.45, -0.1, -0.65], -1.2, 0.3, 0), K(0.34, [0.15, -0.18, -0.75], 0.4, 0.3, 0), K(0.52, [-0.25, -0.25, -0.75], 2.1, 0.3, 0, 'out'), K(0.72, [-0.3, -0.3, -0.72], 2.4, 0.3, 0), R(1)] },
      dark_a2: { trail: [0.18, 0.62], R: [K(0.16, [-0.2, -0.05, -0.65], 1.2, 0.3, PI), K(0.34, [0.0, -0.15, -0.75], -0.4, 0.3, PI), K(0.52, [0.4, -0.28, -0.75], -2.1, 0.3, PI, 'out'), K(0.72, [0.44, -0.32, -0.72], -2.4, 0.3, PI), R(1)] },
      dark_a3: { trail: [0.3, 0.66], R: [K(0.26, [0.2, 0.05, -0.5], 0.3, -0.5, 0, 'stop'), K(0.52, [0.12, -0.22, -0.7], -2.5, 0.45, 0, 'out'), K(0.76, [0.14, -0.25, -0.68], -2.65, 0.45, 0), R(1)] },
      dark_h: { trail: [0.3, 0.7], R: [K(0.3, [-0.2, -0.35, -0.55], 2.5, 0.3, PI, 'stop'), K(0.52, [0.35, 0.05, -0.6], -0.9, 0.35, PI, 'out'), K(0.75, [0.38, 0.08, -0.58], -1.0, 0.35, PI), R(1)] },
    },

    swing(F, e, view) {
      const o = { pos: view.eye, yaw: view.yaw, pitch: view.pitch * 0.85, color: 0x2a0a4a, core: PALE, wisp: 0.95, cells: [120, 6], alpha: 0.5 };
      if (e.step === 0) setTimeout(() => CW.slashArc(F, Object.assign(o, { roll: 0, radius: 2.1, width: 0.42, arc: 2.6, dur: 0.24 })), 60);
      else if (e.step === 1) setTimeout(() => CW.slashArc(F, Object.assign(o, { roll: 180, radius: 2.1, width: 0.42, arc: 2.6, dur: 0.24 })), 60);
    },
    hit(F, e) {
      const dir = new T.Vector3(e.dx, e.dy + 0.3, e.dz);
      F.fx.burst(e.x, e.y, e.z, 10, 6, VIOLET, 0.25, 0.25, 0, { dir });
      F.fx.blood(e.x, e.y, e.z, dir, 1.1);
      darkPuff(F, e.x, e.y, e.z, 5);
    },

    inspect: {
      dur: 4.8,
      R: [K(0.12, [0.22, -0.28, -0.62], 0.3, 0.4, 0), K(0.24, [0.22, -0.28, -0.62], 0.33, 0.42, 0.3), K(0.36, [0.18, -0.3, -0.64], 0.25, 0.35, 0), K(0.48, [0.18, -0.3, -0.64], 0.22, 0.35, 0.3), K(0.72, [0.2, -0.32, -0.66], 0.28, 0.4, 0.2), K(0.93, [0.2, -0.32, -0.66], 0.28, 0.4, 0.2), R(1)],
    },

    dispose(vm, s) { s.motes.clear(); s.trail.dispose(vm.scene); vm.scene.remove(s.corona); vm.scene.remove(s.disc); },
  };

  // puffs of darkness in the world (dark, normal blending)
  function darkPuff(F, x, y, z, n) {
    for (let i = 0; i < n; i++) {
      const sp = new T.Sprite(new T.SpriteMaterial({ map: CW.puffTex(), color: INK, transparent: true, opacity: 0.7, depthWrite: false }));
      sp.position.set(x + (Math.random() - 0.5) * 0.6, y + (Math.random() - 0.5) * 0.6, z + (Math.random() - 0.5) * 0.6); F.add(sp);
      const s0 = 0.5 + Math.random() * 0.5, v = new T.Vector3((Math.random() - 0.5), 0.6, (Math.random() - 0.5));
      F.spawn((dt, age) => { sp.position.addScaledVector(v, dt); const k = age / 0.9; sp.scale.set(s0 * (1 + k), s0 * (1 + k), 1); sp.material.opacity = 0.7 * (1 - k); if (k < 1) return true; sp.material.dispose(); return false; }, [sp]);
    }
  }
  AFX.status['cw_dark:blind'] = AFX.status['dark_2:blind'];
  AFX.status['cw_night_wave:blind'] = AFX.status['dark_2:blind'];
  // the crescent of night: a black blade of shadow with a violet rim, smoking as it flies
  AFX.spell.cw_night_wave = {
    build(F) {
      const root = new T.Group();
      const geo = CW.arcGeo(1.4, 2.3, PI / 2 - 1.2, PI / 2 + 1.2, 40);
      const black = new T.Mesh(geo, new T.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.85, side: T.DoubleSide, depthWrite: false }));
      const rimMat = CW.slashMat({ color: 0x5a1a9a, core: PALE, wisp: 0.4, cells: [80, 8], alpha: 1 });
      const rim = new T.Mesh(CW.arcGeo(2.15, 2.45, PI / 2 - 1.2, PI / 2 + 1.2, 40), rimMat);
      const g = new T.Group(); g.add(black); g.add(rim); g.position.z = 1.8;
      const tilt = new T.Group(); tilt.rotation.x = -PI / 2; tilt.add(g);
      const rollG = new T.Group(); rollG.rotation.z = 0.4; rollG.add(tilt);
      root.add(rollG);
      return { root, black, rim, rimMat, geo };
    },
    update(F, v, dt, vel) {
      const p = v.root.position;
      v.root.lookAt(p.x - vel.x, p.y - vel.y, p.z - vel.z);
      v.rimMat.uniforms.uT.value = 0.62;
      if (Math.random() < 0.6) darkPuff(F, p.x + (Math.random() - 0.5) * 3, p.y + (Math.random() - 0.5), p.z + (Math.random() - 0.5) * 3, 1);
    },
    dispose(F, v) { v.geo.dispose(); v.black.material.dispose(); v.rim.geometry.dispose(); v.rimMat.dispose(); },
    hit(F, e) { darkPuff(F, e.x, e.y, e.z, 4); F.fx.burst(e.x, e.y, e.z, 8, 5, VIOLET, 0.25, 0.25, 0); },
    end(F, e) { darkPuff(F, e.x, e.y, e.z, 6); },
  };
})(window.SO = window.SO || {});
