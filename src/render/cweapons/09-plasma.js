// 09 RAIO DE PLASMA — "Lança de Plasma": a lance with a blade of blue-white plasma and a plasma
// core caged in a spiked gold ring. Rings of plasma orbit the shaft, little arcs crackle along it.
// Inspect (author's sheet): the lance raised; the core flares and a ring forms around it; more
// rings and arcs coil down the shaft; it all overcharges in a storm of rings and lightning.
(function (SO) {
  'use strict';
  const T = THREE, CW = SO.CharWeapons, AFX = SO.AFX, PI = Math.PI;
  const K = (t, p, a, f, roll, ease) => ({ t, p, a, f, roll, ease: ease || 'inout' });
  const R = (t) => ({ t, rest: true, ease: 'inout' });
  const BLUE = 0x4aa8ff, PALE = 0xd8f0ff, DEEP = 0x1a50d0;
  const VX = 0.0046, H = 228, GRIP = Math.floor(228 * 0.3);
  const L = (row) => new T.Vector3(0, (H - row - GRIP) * VX, 0);

  // a crackling arc between two points (a jagged line redrawn every few frames)
  class Arc {
    constructor(scene, color) {
      this.n = 9;
      this.geo = new T.BufferGeometry();
      this.attr = new T.BufferAttribute(new Float32Array(this.n * 3), 3).setUsage(T.DynamicDrawUsage);
      this.geo.setAttribute('position', this.attr);
      this.line = new T.Line(this.geo, new T.LineBasicMaterial({ color, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      this.line.frustumCulled = false; this.line.renderOrder = 6;
      scene.add(this.line); this.scene = scene; this.t = 0;
    }
    set(a, b, jag) {
      const arr = this.attr.array;
      for (let i = 0; i < this.n; i++) {
        const u = i / (this.n - 1), j = (i === 0 || i === this.n - 1) ? 0 : jag;
        arr[i * 3] = a.x + (b.x - a.x) * u + (Math.random() - 0.5) * j;
        arr[i * 3 + 1] = a.y + (b.y - a.y) * u + (Math.random() - 0.5) * j;
        arr[i * 3 + 2] = a.z + (b.z - a.z) * u + (Math.random() - 0.5) * j;
      }
      this.attr.needsUpdate = true;
    }
    dispose() { this.scene.remove(this.line); this.geo.dispose(); this.line.material.dispose(); }
  }

  CW.reg.plasma = {
    slot: 0,
    restR: { p: [0.25, -0.3, -0.6], a: 0.42, f: 0.6, roll: 0 },
    gripR: 0, gripL2: 0.24,

    build(vm) {
      const right = SO.Voxel.build('weapons/plasma_lanca', { voxel: VX, grip: 0.3, glow: 0.35, haloPx: 2, depth: (r) => (r > 74 ? 2.4 : 1.4) });
      if (!right) return null;
      right.userData.halo.material.color.setHex(BLUE);
      right.userData.tip.position.copy(L(0));
      right.userData.base.position.copy(L(74));
      const s = { right, motes: new CW.Motes(vm.scene, 260), acc: 0, arcT: 0 };
      s.core = new T.Object3D(); s.core.position.copy(L(88)); right.add(s.core);
      s.low = new T.Object3D(); s.low.position.copy(L(170)); right.add(s.low);
      // rings orbiting the shaft (children of the weapon, tilted, spinning)
      s.rings = [0, 1, 2, 3, 4].map((i) => {
        const m = new T.Mesh(new T.TorusGeometry(0.05 + i * 0.012, 0.0025, 4, 48), new T.MeshBasicMaterial({ color: i % 2 ? PALE : BLUE, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false }));
        m.renderOrder = 5;
        m.position.copy(L(88 + i * 22));
        right.add(m);
        return m;
      });
      s.arcs = [0, 1, 2, 3].map(() => new Arc(vm.scene, PALE));
      s.trail = new CW.Trail(vm.scene, { color: 0x2060d0, core: PALE, life: 0.1, width: 0.9 });
      return s;
    },

    update(vm, s, dt, ctx) {
      const insp = ctx.inspect, ud = s.right.userData;
      const beat = insp < 0 ? 0 : insp < 0.24 ? 1 : insp < 0.48 ? 2 : insp < 0.72 ? 3 : insp < 0.95 ? 4 : 0;
      const charge = ctx.swing && ctx.swing.name === 'plasma_h' ? Math.min(1, ctx.swing.t / 0.55) : 0;
      // rings: one around the core at rest; more down the shaft as the show builds
      const shown = beat === 4 || charge > 0.5 ? 5 : beat === 3 ? 4 : beat === 2 ? 2 : 1;
      s.rings.forEach((m, i) => {
        const on = i < shown;
        m.visible = on;
        if (!on) return;
        const grow = beat === 4 ? 2.2 : beat === 3 ? 1.5 : 1 + charge;
        m.scale.setScalar(grow * (1 + Math.sin(ctx.time * 4 + i) * 0.06));
        m.rotation.set(PI / 2 + Math.sin(ctx.time * 1.3 + i * 1.7) * 0.35, 0, ctx.time * (2 + i));
        m.material.opacity = 0.65 + Math.sin(ctx.time * 12 + i * 3) * 0.25;
      });
      ud.halo.material.opacity = 0.3 + (beat >= 2 ? 0.2 : 0) + charge * 0.4 + Math.sin(ctx.time * 14) * 0.04;
      // arcs: crackle along the shaft; wild in the show and while charging
      s.arcT -= dt;
      const wild = beat >= 3 || charge > 0.3;
      const core = s.core.getWorldPosition(new T.Vector3()), tip = ud.tip.getWorldPosition(new T.Vector3()), low = s.low.getWorldPosition(new T.Vector3());
      if (s.arcT <= 0) {
        s.arcT = 0.05;
        s.arcs.forEach((a, i) => {
          const on = wild || (i === 0 && Math.random() < 0.35);
          a.line.visible = on;
          if (!on) return;
          const from = core.clone().lerp(i % 2 ? tip : low, Math.random());
          const to = from.clone().add(new T.Vector3((Math.random() - 0.5) * (wild ? 0.3 : 0.08), (Math.random() - 0.5) * (wild ? 0.3 : 0.08), (Math.random() - 0.5) * 0.1));
          a.set(from, to, wild ? 0.04 : 0.015);
        });
      }
      // sparks
      s.acc += dt * (wild ? 40 : 6);
      while (s.acc >= 1) { s.acc -= 1; s.motes.emit({ pos: core.clone().lerp(tip, Math.random() * 0.8), vel: new T.Vector3((Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.2), life: 0.25 + Math.random() * 0.3, size: 0.007, size1: 0.002, color: Math.random() < 0.5 ? PALE : BLUE, opacity: 1, tex: CW.dotTex(), drag: 3, fadeIn: 0.02 }); }
      s.motes.update(dt, ctx.time);
      s.trail.update(dt, s.right, ctx.trailOn(ctx.swing ? ctx.swing.trail : null));
    },

    clips: {
      plasma_a1: { trail: [0.22, 0.55], R: [K(0.2, [0.3, -0.2, -0.38], 0.3, 1.2, 0), K(0.42, [0.06, -0.14, -0.98], 0.08, 1.42, 0, 'out'), K(0.68, [0.08, -0.15, -0.94], 0.08, 1.42, 0), R(1)] },
      plasma_a2: { trail: [0.2, 0.66], R: [K(0.2, [0.42, -0.08, -0.55], -1.3, 0.35, 0), K(0.4, [0.05, -0.18, -0.7], 0.3, 0.35, 0), K(0.58, [-0.3, -0.28, -0.6], 1.9, 0.35, 0, 'out'), K(0.76, [-0.32, -0.3, -0.58], 2.05, 0.35, 0), R(1)] },
      plasma_a3: { trail: [0.22, 0.55], R: [K(0.2, [0.26, -0.1, -0.38], 0.2, 1.1, PI / 2), K(0.42, [0.04, -0.1, -1.0], 0.04, 1.42, PI / 2, 'out'), K(0.68, [0.05, -0.11, -0.96], 0.04, 1.42, PI / 2), R(1)] },
      plasma_h: { trail: [2, 2], R: [K(0.3, [0.2, -0.2, -0.36], 0.12, 1.32, 0, 'stop'), K(0.55, [0.18, -0.19, -0.34], 0.12, 1.33, 0.6, 'stop'), K(0.62, [0.14, -0.13, -0.62], 0.06, 1.42, 0.6, 'out'), K(0.8, [0.15, -0.15, -0.58], 0.08, 1.4, 0.6), R(1)] },
    },

    swing(F, e, view) {
      if (e.step === 1) setTimeout(() => CW.slashArc(F, { pos: view.eye, yaw: view.yaw, pitch: view.pitch * 0.85, roll: 0, color: 0x1a50d0, core: PALE, radius: 2.0, width: 0.3, arc: 2.4, dur: 0.22, wisp: 0.5, cells: [120, 5], alpha: 0.6 }), 60);
    },
    hit(F, e) {
      const dir = new T.Vector3(e.dx, e.dy + 0.3, e.dz);
      F.fx.burst(e.x, e.y, e.z, 14, 10, BLUE, 0.25, 0.2, 0, { dir });
      F.fx.blood(e.x, e.y, e.z, dir, 0.9);
      const c = new T.Vector3(e.x, e.y, e.z);
      for (let i = 0; i < 3; i++) F.bolt(c, c.clone().add(new T.Vector3((Math.random() - 0.5) * 2.5, (Math.random() - 0.3) * 2, (Math.random() - 0.5) * 2.5)), 0.04, 0.12, PALE, 0, 0.3);
      F.flash(e.x, e.y, e.z, BLUE, 4, 0.12);
    },

    inspect: {
      dur: 4.6,
      R: [
        K(0.12, [0.18, -0.28, -0.62], 0.35, 0.4, 0),
        K(0.24, [0.18, -0.28, -0.62], 0.38, 0.42, 0.4),
        K(0.36, [0.12, -0.36, -0.6], 0.25, 0.3, 0),
        K(0.48, [0.12, -0.36, -0.6], 0.22, 0.3, 0.5),
        K(0.72, [0.14, -0.36, -0.64], 0.3, 0.38, 1.2),
        K(0.93, [0.14, -0.36, -0.64], 0.3, 0.38, 2.4),
        R(1),
      ],
    },

    dispose(vm, s) { s.motes.clear(); s.trail.dispose(vm.scene); for (const a of s.arcs) a.dispose(); },
  };

  AFX.status['cw_plasma:shock'] = AFX.status['plasma:shock'] || AFX.status['thunder_1:shock'] || AFX.status['thunder:shock'];
  AFX.status['cw_plasma_bolt:shock'] = AFX.status['cw_plasma:shock'];
  // the bolt: a lance of plasma with arcs twitching around it
  AFX.spell.cw_plasma_bolt = {
    build(F) {
      const root = new T.Group();
      const core = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 1.4, 6).rotateX(PI / 2), new T.MeshBasicMaterial({ color: 0xffffff }));
      const glow = new T.Mesh(new T.CylinderGeometry(0.18, 0.05, 1.8, 8).rotateX(PI / 2), new T.MeshBasicMaterial({ color: BLUE, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false }));
      root.add(core); root.add(glow);
      return { root, own: [core, glow], t: 0 };
    },
    update(F, v, dt, vel) {
      const p = v.root.position;
      v.root.lookAt(p.x + vel.x, p.y + vel.y, p.z + vel.z);
      v.t -= dt;
      if (v.t <= 0) { v.t = 0.05; const c = p.clone(); F.bolt(c, c.clone().add(new T.Vector3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 1.5)), 0.03, 0.06, PALE, 0, 0.25); }
    },
    dispose(F, v) { for (const m of v.own) { m.geometry.dispose(); m.material.dispose(); } },
    hit(F, e) { F.fx.burst(e.x, e.y, e.z, 18, 10, BLUE, 0.3, 0.25, 0); F.flash(e.x, e.y, e.z, BLUE, 5, 0.15); },
    end(F, e) { F.fx.burst(e.x, e.y, e.z, 10, 6, PALE, 0.2, 0.2, 0); },
  };
  // the beam: a white-hot core in a blue sheath, lightning wrapping it, then it thins out
  AFX.vfx['cw_plasma:beam'] = (F, e, mine) => {
    const len = Math.max(1, (e.len || 20) - 1.5);
    const ox = e.x + e.dx * 1.5, oy = e.y - 0.25 + e.dy * 1.5, oz = e.z + e.dz * 1.5;
    const g = new T.Group();
    const mk = (r, color, op) => new T.Mesh(new T.CylinderGeometry(r, r, len, 10, 1, true).rotateX(PI / 2).translate(0, 0, -len / 2), new T.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    const core = mk(0.1, 0xffffff, 1), sheath = mk(0.32, BLUE, 0.5), outer = mk(0.55, DEEP, 0.22);
    g.add(core); g.add(sheath); g.add(outer);
    g.position.set(ox, oy, oz);
    g.lookAt(ox - e.dx, oy - e.dy, oz - e.dz);
    F.add(g);
    const a = new T.Vector3(ox, oy, oz), b = a.clone().add(new T.Vector3(e.dx, e.dy, e.dz).multiplyScalar(len));
    for (let i = 0; i < 4; i++) F.bolt(a, b, 0.05, 0.25, PALE, 2, 1.2);
    F.flash(b.x, b.y, b.z, BLUE, 12, 0.3);
    F.fx.burst(b.x, b.y, b.z, 30, 12, BLUE, 0.4, 0.35, 0);
    F.spawn((dt, age) => {
      const k = 1 - age / 0.45;
      core.scale.set(k, k, 1); sheath.scale.set(0.5 + k * 0.5, 0.5 + k * 0.5, 1); outer.material.opacity = 0.22 * k; sheath.material.opacity = 0.5 * k;
      if (age < 0.45) return true;
      for (const m of [core, sheath, outer]) { m.geometry.dispose(); m.material.dispose(); }
      return false;
    }, [g]);
    if (mine) { F.kick(6); F.spawn((dt, age) => { F.atmo({ grade: BLUE, gradeAmt: 0.1 * (1 - age / 0.4), aberr: 0.002 * (1 - age / 0.4) }); return age < 0.4; }); }
  };
})(window.SO = window.SO || {});
