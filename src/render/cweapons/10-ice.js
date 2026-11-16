// 10 CONGELAMENTO — "Alabarda Glacial": a halberd with a spear point and a great crescent axe of
// cracked blue ice, a crystal charm on a chain. Frost breathes off the ice, snow motes drift.
// Inspect (author's sheet): held across the view; frost mist rises from below; crystals hang in
// the air; ice spikes burst up from the ground all around it.
(function (SO) {
  'use strict';
  const T = THREE, CW = SO.CharWeapons, AFX = SO.AFX, PI = Math.PI;
  const K = (t, p, a, f, roll, ease) => ({ t, p, a, f, roll, ease: ease || 'inout' });
  const R = (t) => ({ t, rest: true, ease: 'inout' });
  const ICE = 0x8ad8ff, WHITE = 0xf0faff, DEEP = 0x3a7ad0, MIST = 0xa8c8f0;
  const VX = 0.0046, H = 232, GRIP = Math.floor(232 * 0.3);
  const L = (px, row) => new T.Vector3((px - 18.5) * VX, (H - row - GRIP) * VX, 0);

  function iceMat(op) { return new T.MeshBasicMaterial({ color: ICE, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false }); }
  function crystal(len, r) {
    const g = new T.Group();
    const body = new T.Mesh(new T.OctahedronGeometry(1, 0).scale(r, len / 2, r), new T.MeshLambertMaterial({ color: 0x6aa8e8, emissive: 0x1a4a8a, transparent: true, opacity: 0.8 }));
    const edge = new T.LineSegments(new T.EdgesGeometry(body.geometry), new T.LineBasicMaterial({ color: WHITE, transparent: true, opacity: 0.9 }));
    g.add(body); g.add(edge);
    g.userData.dispose = () => { body.geometry.dispose(); body.material.dispose(); edge.geometry.dispose(); edge.material.dispose(); };
    return g;
  }

  CW.reg.ice = {
    slot: 0,
    restR: { p: [0.25, -0.31, -0.6], a: 0.4, f: 0.6, roll: 0 },
    gripR: 0, gripL2: 0.24,

    build(vm) {
      const right = SO.Voxel.build('weapons/gelo_alabarda', { voxel: VX, grip: 0.3, glow: 0.3, haloPx: 1.6, depth: (r, x) => (x > 22 ? 1.6 : r < 68 ? 3 : 2.4) });
      if (!right) return null;
      right.userData.halo.material.color.setHex(ICE);
      // trail along the axe's edge
      right.userData.tip.position.copy(L(60, 60));
      right.userData.base.position.copy(L(30, 26));
      const s = { right, motes: new CW.Motes(vm.scene, 300), acc: 0, mist: 0, fired: {} };
      s.axe = [L(50, 40), L(60, 66), L(50, 96)].map((v) => { const o = new T.Object3D(); o.position.copy(v); right.add(o); return o; });
      s.hook = new T.Object3D(); s.hook.position.copy(L(18, 64)); right.add(s.hook);
      s.chainG = new T.Group(); vm.scene.add(s.chainG);
      s.links = CW.chainMeshes('weapons/almas_elo', 6, 0.0032, s.chainG);
      s.rope = new CW.Rope(7, 0.15);
      s.charm = SO.Voxel.build('weapons/gelo_cristal', { voxel: 0.0034, grip: 0.95, depth: 2, glow: 0.35 });
      if (s.charm) { s.chainG.add(s.charm); s.charm.userData.halo.material.color.setHex(ICE); }
      // the show's crystals: floating ones and spikes from the ground (viewmodel space)
      s.floaters = [0, 1, 2, 3, 4].map((i) => { const c = crystal(0.11 + (i % 2) * 0.04, 0.022); c.visible = false; vm.scene.add(c); return c; });
      s.spikes = [];
      for (let i = 0; i < 13; i++) { const c = crystal(0.32 + (i % 3) * 0.14, 0.05 + (i % 2) * 0.02); c.visible = false; vm.scene.add(c); s.spikes.push(c); }
      s.trail = new CW.Trail(vm.scene, { color: 0x3a7ad0, core: WHITE, life: 0.12, width: 0.9 });
      return s;
    },

    update(vm, s, dt, ctx) {
      const insp = ctx.inspect, ud = s.right.userData;
      const beat = insp < 0 ? 0 : insp < 0.24 ? 1 : insp < 0.48 ? 2 : insp < 0.72 ? 3 : insp < 0.95 ? 4 : 0;
      ud.halo.material.opacity = 0.26 + Math.sin(ctx.time * 2) * 0.05 + (beat >= 2 ? 0.12 : 0);
      // frost breathing off the axe; snow motes
      s.acc += dt * (ctx.swing ? 20 : 8);
      while (s.acc >= 1) {
        s.acc -= 1;
        const p = s.axe[(Math.random() * 3) | 0].getWorldPosition(new T.Vector3());
        if (Math.random() < 0.4) s.motes.emit({ pos: p, vel: new T.Vector3((Math.random() - 0.5) * 0.04, -0.05, 0), life: 0.9, size: 0.02, size1: 0.06, color: MIST, opacity: 0.2, drag: 1.2, curl: 0.5, additive: true });
        else s.motes.emit({ pos: p.add(new T.Vector3((Math.random() - 0.5) * 0.08, (Math.random() - 0.5) * 0.08, 0)), vel: new T.Vector3((Math.random() - 0.5) * 0.04, -0.03, 0), life: 1, size: 0.006, size1: 0.004, color: WHITE, opacity: 1, tex: CW.dotTex(), drag: 0.6, curl: 0.4, fadeIn: 0.1 });
      }
      // beats 2+: frost mist rising from the bottom of the view
      if (beat >= 2) {
        s.mist += dt * (beat >= 3 ? 40 : 22);
        while (s.mist >= 1) { s.mist -= 1; s.motes.emit({ pos: new T.Vector3((Math.random() - 0.5) * 1.2, -0.5, -0.8 - Math.random() * 0.5), vel: new T.Vector3((Math.random() - 0.5) * 0.04, 0.08 + Math.random() * 0.06, 0), life: 1.6, size: 0.08, size1: 0.22, color: MIST, opacity: 0.3, drag: 0.5, curl: 0.3, fadeIn: 0.3 }); }
      }
      // beat 3+: crystals hang in the air around the blade
      const head = s.axe[1].getWorldPosition(new T.Vector3());
      s.floaters.forEach((c, i) => {
        c.visible = beat >= 3;
        if (!c.visible) return;
        const a = i * 1.26 + ctx.time * 0.4;
        c.position.copy(head).add(new T.Vector3(Math.cos(a) * 0.2, Math.sin(a * 1.3) * 0.12 + 0.03, Math.sin(a) * 0.08 - 0.05));
        c.rotation.set(0.3, a, Math.sin(a) * 0.4);
        const k = Math.min(1, (insp - 0.48) * 8); c.scale.setScalar(k);
      });
      // beat 4: ice spikes erupt from the ground ahead
      s.spikes.forEach((c, i) => {
        c.visible = beat === 4;
        if (!c.visible) return;
        const k = Math.min(1, Math.max(0, (insp - 0.72 - i * 0.012) * 9)) * Math.min(1, (0.95 - insp) * 14);
        const x = (i - 6) * 0.16, z = -0.95 - (i % 3) * 0.2;
        c.position.set(x, -0.6 + k * 0.17, z);
        c.rotation.set(0.15 * ((i % 3) - 1), i, 0.25 * (i % 2 ? 1 : -1) * (Math.abs(x) * 2));
        c.scale.set(1, Math.max(0.01, k), 1);
      });
      s.motes.update(dt, ctx.time);
      s.trail.update(dt, s.right, ctx.trailOn(ctx.swing ? ctx.swing.trail : null));
      s.rope.step(Math.min(dt, 1 / 30), s.hook.getWorldPosition(new T.Vector3()), null, 9);
      CW.layChain(s.links, s.rope);
      if (s.charm) { const e = s.rope.p[s.rope.n - 1], q = s.rope.p[s.rope.n - 2]; s.charm.position.copy(e); s.charm.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), q.clone().sub(e).normalize()); }
    },

    clips: {
      ice_a1: { trail: [0.24, 0.68], R: [K(0.2, [0.45, -0.05, -0.55], -1.0, 0.35, 0), K(0.42, [0.1, -0.15, -0.72], 0.6, 0.35, 0), K(0.6, [-0.26, -0.3, -0.62], 2.0, 0.35, 0, 'out'), K(0.8, [-0.28, -0.32, -0.6], 2.1, 0.35, 0), R(1)] },
      ice_a2: { trail: [0.24, 0.68], R: [K(0.2, [-0.25, -0.3, -0.58], 2.4, 0.35, PI), K(0.42, [0.05, -0.15, -0.72], 0.6, 0.35, PI), K(0.6, [0.42, -0.02, -0.58], -1.0, 0.35, PI, 'out'), K(0.8, [0.44, 0.0, -0.56], -1.1, 0.35, PI), R(1)] },
      ice_a3: { trail: [2, 2], R: [K(0.2, [0.3, -0.2, -0.38], 0.3, 1.2, 0), K(0.42, [0.06, -0.14, -0.98], 0.08, 1.42, 0, 'out'), K(0.68, [0.08, -0.15, -0.94], 0.08, 1.42, 0), R(1)] },
      ice_h: { trail: [0.36, 0.64], R: [K(0.32, [0.14, 0.16, -0.42], 0.15, -0.85, 0, 'stop'), K(0.52, [0.08, -0.3, -0.76], 0.0, 1.25, 0, 'out'), K(0.8, [0.08, -0.32, -0.74], 0.0, 1.28, 0), R(1)] },
    },

    swing(F, e, view) {
      const o = { pos: view.eye, yaw: view.yaw, pitch: view.pitch * 0.85, color: 0x1a4a9a, core: WHITE, wisp: 0.35, cells: [120, 6], alpha: 0.6 };
      if (e.step === 0) setTimeout(() => CW.slashArc(F, Object.assign(o, { roll: 30, radius: 2.0, width: 0.4, arc: 2.5, dur: 0.24 })), 90);
      else if (e.step === 1) setTimeout(() => CW.slashArc(F, Object.assign(o, { roll: 210, radius: 2.0, width: 0.4, arc: 2.5, dur: 0.24 })), 90);
    },
    hit(F, e) {
      const dir = new T.Vector3(e.dx, e.dy + 0.3, e.dz);
      F.fx.burst(e.x, e.y, e.z, 14, 8, ICE, 0.3, 0.3, -8, { dir });
      F.fx.burst(e.x, e.y, e.z, 6, 4, WHITE, 0.25, 0.25, -4, { dir });
      F.fx.blood(e.x, e.y, e.z, dir, 0.8);
      F.flash(e.x, e.y, e.z, ICE, 3, 0.12);
    },

    inspect: {
      dur: 4.6,
      R: [
        K(0.12, [0.2, -0.28, -0.6], 0.55, 0.4, 0),
        K(0.24, [0.2, -0.28, -0.6], 0.58, 0.42, 0.3),
        K(0.36, [0.15, -0.3, -0.62], 0.45, 0.3, 0),
        K(0.48, [0.15, -0.3, -0.62], 0.42, 0.3, 0.35),
        K(0.72, [0.16, -0.27, -0.64], 0.38, 0.28, -0.3),
        K(0.93, [0.16, -0.27, -0.64], 0.38, 0.28, 0),
        R(1),
      ],
    },

    dispose(vm, s) {
      s.motes.clear(); s.trail.dispose(vm.scene); vm.scene.remove(s.chainG);
      for (const c of s.floaters.concat(s.spikes)) { vm.scene.remove(c); c.userData.dispose(); }
    },
  };

  AFX.status['cw_ice:freeze'] = AFX.status['ice_2:freeze'];
  AFX.status['cw_ice:slow'] = AFX.status['ice_1:slow'];
  // an ice spike tearing up out of the ground and shattering
  AFX.vfx['cw_ice:spike'] = (F, e) => {
    const len = 2.2 + Math.random() * 1.2, r = 0.32 + Math.random() * 0.15;
    const c = crystal(len, r);
    c.position.set(e.x, e.y - len * 0.5, e.z);
    c.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * PI, (Math.random() - 0.5) * 0.4);
    F.add(c);
    F.fx.burst(e.x, e.y + 0.2, e.z, 8, 6, WHITE, 0.3, 0.35, -8);
    F.spawn((dt, age) => {
      const rise = Math.min(1, age / 0.08);
      c.position.y = e.y - len * 0.5 + rise * len * 0.48;
      if (age > 0.9) c.scale.setScalar(Math.max(0.01, 1 - (age - 0.9) / 0.2));
      if (age < 1.1) return true;
      c.userData.dispose(); return false;
    }, [c]);
    if (e.i === 0) F.kick(3);
  };
  AFX.effect.cw_icespikes = { build() { return {}; }, update() {} };
})(window.SO = window.SO || {});
