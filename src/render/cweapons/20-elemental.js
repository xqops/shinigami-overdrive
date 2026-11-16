// 20 DOMÍNIO ELEMENTAL — "Cetro Elemental": a gold scepter crowned with a star in a halo. Four
// orbs (fire, frost, lightning, void) orbit its head, ribbons hang from it. Inspect (author's
// sheet): two orbs lit; all four wake, each with its own element; streams of every colour wind
// around it; the elements join in a blaze of light.
(function (SO) {
  'use strict';
  const T = THREE, CW = SO.CharWeapons, AFX = SO.AFX, PI = Math.PI;
  const K = (t, p, a, f, roll, ease) => ({ t, p, a, f, roll, ease: ease || 'inout' });
  const R = (t) => ({ t, rest: true, ease: 'inout' });
  const STAR = 0xffe080, WHITE = 0xffffff;
  const EL = { fire: [0xff5a1a, 0xffd080], ice: [0x5ab8ff, 0xe0f4ff], thunder: [0xffe040, 0xffffff], void: [0xa040ff, 0xe8c0ff], nature: [0x50e070, 0xd0ffd0] };
  const ORDER = ['fire', 'ice', 'thunder', 'void'];
  const VX = 0.0046, H = 232, GRIP = Math.floor(232 * 0.5);

  function orb(el) {
    const [c, hi] = EL[el];
    const g = new T.Group();
    const core = new T.Mesh(new T.IcosahedronGeometry(1, 1), new T.MeshBasicMaterial({ color: hi }));
    const shell = new T.Mesh(new T.IcosahedronGeometry(1.6, 1), new T.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.45, blending: T.AdditiveBlending, depthWrite: false }));
    g.add(core); g.add(shell);
    g.userData = { core, shell, dispose: () => { for (const m of [core, shell]) { m.geometry.dispose(); m.material.dispose(); } } };
    return g;
  }

  CW.reg.elemental = {
    slot: 0,
    oneHand: true,
    restR: { p: [0.28, -0.36, -0.62], a: 0.2, f: 0.3, roll: 0 },
    gripR: 0,

    build(vm) {
      const right = SO.Voxel.build('weapons/elemental_cetro', { voxel: VX, grip: 0.5, glow: 0.4, haloPx: 2, depth: () => 3 });
      if (!right) return null;
      right.userData.halo.material.color.setHex(STAR);
      const headY = (H - 18 - GRIP) * VX;
      right.userData.tip.position.set(0, headY + 0.08, 0);
      right.userData.base.position.set(0, headY - 0.12, 0);
      const s = { right, motes: new CW.Motes(vm.scene, 320), acc: 0, headY };
      s.head = new T.Object3D(); s.head.position.set(0, headY - 0.02, 0); right.add(s.head);
      s.orbs = ORDER.map((el, i) => { const o = orb(el); o.scale.setScalar(0.011); vm.scene.add(o); return { o, el, a: i / 4 * PI * 2 }; });
      s.ribbons = [[0xb01020, -0.02], [0x2a8a3a, 0.0], [0x6a1aa0, 0.02]].map(([c, x]) => { const a = new T.Object3D(); a.position.set(x, (H - 54 - GRIP) * VX, 0); right.add(a); return { a, r: new CW.Ribbon(vm.scene, { color: c, width: 0.014, length: 0.32, n: 12 }) }; });
      s.streams = ORDER.map((el) => { const r = new CW.Ribbon(vm.scene, { color: EL[el][0], width: 0.012, length: 0.34, n: 14, glow: true }); r.mesh.visible = false; return r; });
      s.trail = new CW.Trail(vm.scene, { color: 0x8a6020, core: WHITE, life: 0.12, width: 0.6 });
      return s;
    },

    update(vm, s, dt, ctx) {
      const insp = ctx.inspect, ud = s.right.userData;
      const beat = insp < 0 ? 0 : insp < 0.24 ? 1 : insp < 0.48 ? 2 : insp < 0.72 ? 3 : insp < 0.95 ? 4 : 0;
      const head = s.head.getWorldPosition(new T.Vector3()), pom = ud.pommel.getWorldPosition(new T.Vector3());
      ud.halo.material.opacity = 0.32 + Math.sin(ctx.time * 3) * 0.06 + (beat === 4 ? 0.35 : beat >= 2 ? 0.12 : 0);
      const thrown = ctx.swing && ctx.swing.name === 'elemental_h' && ctx.swing.t > 0.45;
      // the orbs: lit one pair at rest, all four from beat 2, wider and brighter in the finale
      s.orbs.forEach((h, i) => {
        h.a += dt * (beat >= 3 ? 2.6 : 1.3);
        const lit = beat === 1 ? i < 2 : true;
        const r = beat === 4 ? 0.13 : beat >= 2 ? 0.1 : 0.075;
        h.o.position.copy(head).add(new T.Vector3(Math.cos(h.a) * r, Math.sin(h.a * 2) * 0.02, Math.sin(h.a) * r * 0.6));
        const z = (lit ? 0.016 : 0.009) * (beat === 4 ? 1.4 : 1) * (1 + Math.sin(ctx.time * 6 + i) * 0.1);
        h.o.scale.setScalar(z);
        h.o.userData.shell.material.opacity = lit ? 0.5 : 0.15;
        h.o.visible = !thrown;
        // each element's own trace
        if (lit && Math.random() < dt * (beat >= 2 ? 26 : 8)) {
          const [c, hi] = EL[h.el];
          const p = h.o.position.clone();
          if (h.el === 'fire') s.motes.emit({ pos: p, vel: new T.Vector3(0, 0.1, 0), life: 0.35, size: 0.012, size1: 0.025, color: Math.random() < 0.5 ? c : hi, opacity: 0.9, drag: 1, curl: 2, up: 0.3 });
          else if (h.el === 'ice') s.motes.emit({ pos: p, vel: new T.Vector3((Math.random() - 0.5) * 0.04, -0.04, 0), life: 0.6, size: 0.005, size1: 0.003, color: hi, opacity: 1, tex: CW.dotTex(), drag: 0.5 });
          else if (h.el === 'thunder') s.motes.emit({ pos: p, vel: new T.Vector3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, 0), life: 0.12, size: 0.005, size1: 0.002, color: hi, opacity: 1, tex: CW.dotTex(), drag: 4 });
          else s.motes.emit({ pos: p, vel: new T.Vector3(0, 0, 0), life: 0.5, size: 0.02, size1: 0.005, color: c, opacity: 0.6, drag: 1, curl: 1 });
        }
      });
      // streams of every element winding around the scepter (beat 3+)
      s.streams.forEach((r, i) => {
        r.mesh.visible = beat >= 3;
        if (!r.mesh.visible) return;
        const a = ctx.time * 3 + i * PI / 2, hh = (ctx.time * 0.35 + i / 4) % 1;
        const rad = beat === 4 ? 0.14 : 0.08;
        r.update(dt, pom.clone().lerp(head, hh).add(new T.Vector3(Math.cos(a) * rad, 0, Math.sin(a) * rad * 0.6)), 0.003);
      });
      // the finale's blaze of light
      if (beat === 4 && Math.random() < dt * 30) s.motes.emit({ pos: head.clone().add(new T.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.3, -0.1)), vel: new T.Vector3(0, 0.05, 0), life: 0.7, size: 0.004, size1: 0.014, color: [STAR, 0xff5a1a, 0x5ab8ff, 0xa040ff, 0x50e070][(Math.random() * 5) | 0], opacity: 1, tex: CW.dotTex(), drag: 1, fadeIn: 0.3 });
      s.motes.update(dt, ctx.time);
      for (const rb of s.ribbons) rb.r.update(dt, rb.a.getWorldPosition(new T.Vector3()), ctx.swing ? 0.006 : 0.002);
      s.trail.update(dt, s.right, ctx.trailOn(ctx.swing ? ctx.swing.trail : null));
    },

    clips: {
      elemental_a1: { trail: [0.24, 0.68], R: [K(0.2, [0.45, -0.08, -0.5], -1.2, 0.45, 0), K(0.42, [0.1, -0.16, -0.7], 0.5, 0.4, 0), K(0.6, [-0.25, -0.3, -0.6], 1.7, 0.4, 0, 'out'), K(0.78, [-0.27, -0.32, -0.58], 1.8, 0.4, 0), R(1)] },
      elemental_a2: { trail: [0.24, 0.68], R: [K(0.2, [-0.25, -0.12, -0.5], 1.4, 0.45, PI), K(0.42, [0.08, -0.18, -0.7], -0.3, 0.4, PI), K(0.6, [0.42, -0.3, -0.6], -1.6, 0.4, PI, 'out'), K(0.78, [0.44, -0.32, -0.58], -1.7, 0.4, PI), R(1)] },
      elemental_a3: { trail: [0.42, 0.6], R: [K(0.38, [0.16, 0.0, -0.46], 0.15, -0.5, 0, 'stop'), K(0.55, [0.08, -0.3, -0.75], 0, 1.2, 0, 'out'), K(0.82, [0.08, -0.32, -0.73], 0, 1.22, 0), R(1)] },
      elemental_h: { trail: [2, 2], R: [K(0.3, [0.12, -0.05, -0.5], 0.05, 0.3, 0, 'stop'), K(0.5, [0.1, 0.0, -0.75], 0.02, 1.1, 0, 'out'), K(0.8, [0.12, -0.1, -0.7], 0.05, 0.9, 0), R(1)] },
    },

    swing(F, e, view) {
      const cols = [[0x8a2008, 0xffd080], [0x1a5ab0, 0xe0f4ff], [0x8a7a10, 0xffffff]];
      if (e.step === 0 || e.step === 1) {
        const [c, hi] = cols[e.step];
        setTimeout(() => CW.slashArc(F, { pos: view.eye, yaw: view.yaw, pitch: view.pitch * 0.85, roll: e.step ? 210 : 30, color: c, core: hi, radius: 1.8, width: 0.35, arc: 2.4, dur: 0.24, wisp: 0.7, cells: [110, 6], alpha: 0.6 }), 60);
      }
    },
    hit(F, e) {
      const dir = new T.Vector3(e.dx, e.dy + 0.3, e.dz);
      const c = [EL.fire[0], EL.ice[0], EL.thunder[0]][(Math.random() * 3) | 0];
      F.fx.burst(e.x, e.y, e.z, 12, 8, c, 0.25, 0.25, -2, { dir });
      F.fx.blood(e.x, e.y, e.z, dir, 0.9);
      F.flash(e.x, e.y, e.z, c, 3, 0.12);
    },

    inspect: {
      dur: 4.8,
      R: [K(0.12, [0.16, -0.28, -0.58], 0.15, 0.25, 0), K(0.24, [0.16, -0.28, -0.58], 0.18, 0.27, 0.3), K(0.36, [0.12, -0.32, -0.54], 0.1, 0.15, 0), K(0.48, [0.12, -0.32, -0.54], 0.08, 0.15, -0.3), K(0.72, [0.12, -0.36, -0.56], 0.08, 0.15, 0.3), K(0.93, [0.12, -0.36, -0.56], 0.08, 0.15, 0), R(1)],
    },

    dispose(vm, s) { s.motes.clear(); s.trail.dispose(vm.scene); for (const h of s.orbs) { vm.scene.remove(h.o); h.o.userData.dispose(); } for (const r of s.streams) r.dispose(); for (const r of s.ribbons) r.r.dispose(); },
  };

  AFX.status['cw_elemental:burn'] = AFX.status['elemental:burn'];
  AFX.status['cw_elemental:slow'] = AFX.status['ice_1:slow'];
  AFX.status['cw_elemental:shock'] = AFX.status['thunder:shock'];
  AFX.status['cw_elemental:freeze'] = AFX.status['ice_2:freeze'];
  AFX.status['cw_elemental:weak'] = AFX.status['summon_3:weak'];
  // the prism pulse of the third blow: a ring that runs through every colour
  AFX.vfx['cw_elem:pulse'] = (F, e) => {
    ORDER.forEach((el, i) => {
      const m = new T.Mesh(new T.RingGeometry(0.85, 1, 40).rotateX(-PI / 2), new T.MeshBasicMaterial({ color: EL[el][0], transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      m.position.set(e.x, e.y + 0.08 + i * 0.02, e.z); F.add(m);
      F.spawn((dt, age) => { const k = Math.max(0, age - i * 0.05) / 0.4; m.scale.setScalar(0.3 + Math.min(1, k) * 3.4); m.material.opacity = 1 - Math.min(1, k); if (k < 1) return true; m.geometry.dispose(); m.material.dispose(); return false; }, [m]);
    });
    F.flash(e.x, e.y + 1, e.z, STAR, 6, 0.2);
  };
  // the orbs flying to the aim, each bursting in its own element
  AFX.spell.cw_elem_orb = {
    build(F, q) {
      const el = q.variant || 'fire';
      const root = new T.Group(); const o = orb(el); o.scale.setScalar(0.22); root.add(o);
      return { root, o, el, trail: new SO.AFXLib.Trail(F.scene, 14, 0.25, EL[el][0], { core: EL[el][1], life: 0.2 }) };
    },
    update(F, v, dt) { v.trail.push(v.root.position, new T.Vector3(0, 1, 0), dt); v.o.rotation.y += dt * 6; },
    dispose(F, v) { v.o.userData.dispose(); },
    boom(F, e) {
      const el = e.variant || (e.look && 'fire');
      const [c, hi] = EL[el] || EL.fire;
      F.fx.burst(e.x, e.y, e.z, 30, 11, c, 0.4, 0.4, el === 'fire' ? -2 : -6);
      F.fx.burst(e.x, e.y, e.z, 12, 6, hi, 0.25, 0.3, 0);
      if (el === 'thunder') F.bolt(new T.Vector3(e.x, e.y + 16, e.z), new T.Vector3(e.x, e.y, e.z), 0.14, 0.25, WHITE, 2, 1.6);
      F.flash(e.x, e.y + 1, e.z, c, 8, 0.25);
    },
  };
})(window.SO = window.SO || {});
