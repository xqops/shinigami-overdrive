// 17 TROVÃO — "Martelo da Tempestade": a great iron hammer with glowing blue runes, a chain and
// ofudas under its head. Lightning crawls over it. Inspect (author's sheet): held; arcs crackle
// along the shaft; the runes blaze and stones lift off the ground; lightning everywhere.
(function (SO) {
  'use strict';
  const T = THREE, CW = SO.CharWeapons, AFX = SO.AFX, PI = Math.PI;
  const K = (t, p, a, f, roll, ease) => ({ t, p, a, f, roll, ease: ease || 'inout' });
  const R = (t) => ({ t, rest: true, ease: 'inout' });
  const BLUE = 0x5aa0ff, WHITE = 0xe8f4ff, DEEP = 0x1a50d0;
  const VX = 0.0046, H = 224, GRIP = Math.floor(224 * 0.24);

  // a jagged arc of lightning (a line redrawn every few frames)
  class Arc {
    constructor(scene) {
      this.n = 8;
      this.geo = new T.BufferGeometry();
      this.attr = new T.BufferAttribute(new Float32Array(this.n * 3), 3).setUsage(T.DynamicDrawUsage);
      this.geo.setAttribute('position', this.attr);
      this.line = new T.Line(this.geo, new T.LineBasicMaterial({ color: WHITE, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      this.line.frustumCulled = false; this.line.renderOrder = 6; scene.add(this.line); this.scene = scene;
    }
    set(a, b, jag) {
      const arr = this.attr.array;
      for (let i = 0; i < this.n; i++) { const u = i / (this.n - 1), j = i === 0 || i === this.n - 1 ? 0 : jag; arr[i * 3] = a.x + (b.x - a.x) * u + (Math.random() - 0.5) * j; arr[i * 3 + 1] = a.y + (b.y - a.y) * u + (Math.random() - 0.5) * j; arr[i * 3 + 2] = a.z + (b.z - a.z) * u + (Math.random() - 0.5) * j; }
      this.attr.needsUpdate = true;
    }
    dispose() { this.scene.remove(this.line); this.geo.dispose(); this.line.material.dispose(); }
  }
  function stone(r) {
    const g = new T.IcosahedronGeometry(r, 0);
    const m = new T.Mesh(g, new T.MeshLambertMaterial({ color: 0x2a2630, emissive: 0x06081a }));
    m.userData.dispose = () => { g.dispose(); m.material.dispose(); };
    return m;
  }

  CW.reg.thunder = {
    slot: 0,
    restR: { p: [0.26, -0.33, -0.58], a: 0.55, f: 0.5, roll: 0 },
    gripR: 0, gripL2: 0.26,

    build(vm) {
      const right = SO.Voxel.build('weapons/trovao_martelo', { voxel: VX, grip: 0.24, glow: 0.4, haloPx: 1.6, depth: (r) => (r < 54 ? 9 : 2.6) });
      if (!right) return null;
      right.userData.halo.material.color.setHex(BLUE);
      const headY = (H - 29 - GRIP) * VX;
      right.userData.tip.position.set(0, headY + 0.1, 0);
      right.userData.base.position.set(0, headY - 0.1, 0);
      const s = { right, motes: new CW.Motes(vm.scene, 260), arcT: 0, flick: 0 };
      s.head = new T.Object3D(); s.head.position.set(0, headY, 0); right.add(s.head);
      s.neck = new T.Object3D(); s.neck.position.set(0, (H - 70 - GRIP) * VX, 0); right.add(s.neck);
      s.arcs = [0, 1, 2, 3, 4, 5].map(() => new Arc(vm.scene));
      s.stones = [];
      for (let i = 0; i < 8; i++) { const m = stone(0.035 + (i % 3) * 0.018); m.visible = false; vm.scene.add(m); s.stones.push({ m, x: (i - 3.5) * 0.17, z: -0.75 - (i % 3) * 0.15, ph: i * 1.7 }); }
      s.hangs = [];
      for (const [x, n] of [[-0.03, 4], [0.03, 3]]) {
        const a = new T.Object3D(); a.position.set(x, (H - 56 - GRIP) * VX, 0); right.add(a);
        const g = new T.Group(); vm.scene.add(g);
        const links = CW.chainMeshes('weapons/almas_elo', n, 0.0032, g);
        const tag = SO.Voxel.build('weapons/almas_ofuda', { voxel: 0.0032, grip: 0.97, depth: 0.8 });
        if (tag) g.add(tag);
        s.hangs.push({ a, g, links, tag, rope: new CW.Rope(n + 1, n * 0.03) });
      }
      s.trail = new CW.Trail(vm.scene, { color: DEEP, core: WHITE, life: 0.12, width: 1 });
      return s;
    },

    update(vm, s, dt, ctx) {
      const insp = ctx.inspect, ud = s.right.userData;
      const beat = insp < 0 ? 0 : insp < 0.24 ? 1 : insp < 0.48 ? 2 : insp < 0.72 ? 3 : insp < 0.95 ? 4 : 0;
      s.flick -= dt;
      if (s.flick <= 0) s.flick = 0.05 + Math.random() * 0.12;
      ud.halo.material.opacity = (0.3 + (beat >= 3 ? 0.35 : beat === 2 ? 0.15 : 0)) * (s.flick > 0.1 ? 1 : 0.7);
      const head = s.head.getWorldPosition(new T.Vector3()), neck = s.neck.getWorldPosition(new T.Vector3()), pom = ud.pommel.getWorldPosition(new T.Vector3());
      // arcs: a couple over the head at rest; along the shaft in beat 2; everywhere after
      s.arcT -= dt;
      if (s.arcT <= 0) {
        s.arcT = 0.05;
        const active = beat === 4 ? 6 : beat === 3 ? 5 : beat === 2 ? 3 : ctx.swing ? 2 : (Math.random() < 0.4 ? 1 : 0);
        s.arcs.forEach((a, i) => {
          a.line.visible = i < active;
          if (!a.line.visible) return;
          let from, to;
          if (i < 2) { from = head.clone().add(new T.Vector3((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.1, 0.02)); to = from.clone().add(new T.Vector3((Math.random() - 0.5) * 0.12, (Math.random() - 0.5) * 0.12, 0)); }
          else if (i < 4) { from = neck.clone().lerp(pom, Math.random()); to = from.clone().add(new T.Vector3((Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.15, 0)); }
          else { from = head.clone(); to = new T.Vector3((Math.random() - 0.5) * 1.2, -0.5 + Math.random() * 0.3, -0.9); }
          a.set(from, to, i < 4 ? 0.03 : 0.12);
        });
      }
      // stones lifting off the ground (beat 3+)
      s.stones.forEach((h, i) => {
        h.m.visible = beat >= 3;
        if (!h.m.visible) return;
        const k = Math.min(1, (insp - 0.48 - i * 0.01) * 4);
        h.m.position.set(h.x * 1.2, -0.58 + k * (0.2 + (i % 3) * 0.1) + Math.sin(ctx.time * 2 + h.ph) * 0.01, h.z - 0.25);
        h.m.rotation.x += dt; h.m.rotation.y += dt * 0.7;
      });
      // sparks
      if (Math.random() < dt * (beat >= 2 ? 30 : 6)) s.motes.emit({ pos: head.clone().add(new T.Vector3((Math.random() - 0.5) * 0.2, (Math.random() - 0.5) * 0.12, 0)), vel: new T.Vector3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.4, 0), life: 0.2, size: 0.006, size1: 0.002, color: WHITE, opacity: 1, tex: CW.dotTex(), drag: 3, fadeIn: 0.02 });
      s.motes.update(dt, ctx.time);
      s.trail.update(dt, s.right, ctx.trailOn(ctx.swing ? ctx.swing.trail : null));
      for (const h of s.hangs) {
        h.rope.step(Math.min(dt, 1 / 30), h.a.getWorldPosition(new T.Vector3()), null, 9);
        CW.layChain(h.links, h.rope);
        if (h.tag) { const e = h.rope.p[h.rope.n - 1], q = h.rope.p[h.rope.n - 2]; h.tag.position.copy(e); h.tag.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), q.clone().sub(e).normalize()); }
      }
    },

    clips: {
      thunder_a1: { trail: [0.36, 0.66], R: [K(0.3, [0.4, 0.05, -0.45], -0.7, -0.3, 0, 'stop'), K(0.5, [0.0, -0.2, -0.72], 1.3, 0.6, 0), K(0.6, [-0.22, -0.32, -0.7], 2.25, 0.7, 0, 'out'), K(0.8, [-0.23, -0.33, -0.7], 2.3, 0.7, 0), R(1)] },
      thunder_a2: { trail: [0.36, 0.66], R: [K(0.3, [-0.3, -0.12, -0.5], 1.5, 0.4, PI, 'stop'), K(0.48, [0.05, -0.2, -0.72], -0.2, 0.45, PI), K(0.6, [0.4, -0.28, -0.62], -1.8, 0.45, PI, 'out'), K(0.8, [0.42, -0.3, -0.6], -1.9, 0.45, PI), R(1)] },
      thunder_a3: { trail: [0.42, 0.6], R: [K(0.38, [0.18, 0.02, -0.48], 0.2, -0.45, 0, 'stop'), K(0.55, [0.06, -0.3, -0.78], 0, 1.3, 0, 'out'), K(0.82, [0.06, -0.32, -0.76], 0, 1.32, 0), R(1)] },
      thunder_h: { trail: [2, 2], R: [K(0.3, [0.12, 0.05, -0.45], 0.05, -0.4, 0), K(0.5, [0.1, 0.12, -0.42], 0.02, -0.6, 0, 'stop'), K(0.7, [0.1, 0.12, -0.42], 0.02, -0.6, 0, 'stop'), R(1)] },
    },

    swing(F, e, view) {
      const o = { pos: view.eye, yaw: view.yaw, pitch: view.pitch * 0.85, color: 0x1a3a8a, core: WHITE, wisp: 0.8, cells: [100, 6], alpha: 0.5 };
      if (e.step === 0) setTimeout(() => CW.slashArc(F, Object.assign(o, { roll: 30, radius: 1.8, width: 0.5, arc: 2.2, dur: 0.24 })), 160);
      else if (e.step === 1) setTimeout(() => CW.slashArc(F, Object.assign(o, { roll: 210, radius: 1.8, width: 0.5, arc: 2.2, dur: 0.24 })), 160);
      else if (e.step === 'h') setTimeout(() => { const c = view.eye.clone().add(new T.Vector3(0, 1, 0)); F.bolt(c.clone().add(new T.Vector3(0, 12, 0)), c, 0.12, 0.25, WHITE, 2, 1); }, 300);
    },
    hit(F, e) {
      const dir = new T.Vector3(e.dx, e.dy + 0.4, e.dz);
      F.fx.burst(e.x, e.y, e.z, 14, 10, BLUE, 0.25, 0.25, 0, { dir });
      F.fx.blood(e.x, e.y, e.z, dir, 1.2);
      F.flash(e.x, e.y, e.z, BLUE, 4, 0.12);
    },

    inspect: {
      dur: 4.8,
      R: [K(0.12, [0.18, -0.3, -0.56], 0.5, 0.35, 0), K(0.24, [0.18, -0.3, -0.56], 0.55, 0.38, 0.3), K(0.36, [0.14, -0.36, -0.64], 0.45, 0.5, 0), K(0.48, [0.14, -0.36, -0.64], 0.42, 0.5, 0.4), K(0.72, [0.16, -0.38, -0.66], 0.42, 0.52, 0.8), K(0.93, [0.16, -0.38, -0.66], 0.45, 0.55, 0.4), R(1)],
    },

    dispose(vm, s) { s.motes.clear(); s.trail.dispose(vm.scene); for (const a of s.arcs) a.dispose(); for (const h of s.stones) { vm.scene.remove(h.m); h.m.userData.dispose(); } for (const h of s.hangs) vm.scene.remove(h.g); },
  };

  AFX.status['cw_thunder:shock'] = AFX.status['thunder:shock'];
  AFX.vfx['cw_thunder:arc'] = (F, e) => {
    const pts = e.pts || [];
    let prev = new T.Vector3(e.x, e.y, e.z);
    for (let i = 1; i < pts.length; i++) { const b = new T.Vector3(pts[i][0], pts[i][1], pts[i][2]); F.bolt(prev, b, 0.05, 0.18, WHITE, 1, 0.5); F.fx.burst(b.x, b.y, b.z, 6, 6, BLUE, 0.2, 0.2, 0); prev = b; }
  };
  // a bolt from the sky: a white-hot crack, a flash, a ring of sparks and scorched stone
  AFX.vfx['cw_thunder:strike'] = (F, e, mine) => {
    const top = new T.Vector3(e.x + (Math.random() - 0.5) * 3, e.y + 26, e.z + (Math.random() - 0.5) * 3), bot = new T.Vector3(e.x, e.y, e.z);
    F.bolt(top, bot, e.big ? 0.22 : 0.14, 0.3, WHITE, 3, 2.2);
    F.bolt(top, bot, e.big ? 0.5 : 0.3, 0.2, BLUE, 1, 2.6);
    const ring = new T.Mesh(new T.RingGeometry(0.85, 1, 40).rotateX(-PI / 2), new T.MeshBasicMaterial({ color: WHITE, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
    ring.position.set(e.x, e.y + 0.08, e.z); F.add(ring);
    F.spawn((dt, age) => { const k = age / 0.35; ring.scale.setScalar(0.5 + k * (e.big ? 4.5 : 3)); ring.material.opacity = 1 - k; if (k < 1) return true; ring.geometry.dispose(); ring.material.dispose(); return false; }, [ring]);
    F.fx.burst(e.x, e.y + 0.3, e.z, e.big ? 30 : 18, 12, BLUE, 0.3, 0.3, -6);
    F.flash(e.x, e.y + 2, e.z, WHITE, e.big ? 14 : 8, 0.25);
    if (mine) F.kick(e.big ? 5 : 3);
  };
  AFX.effect.cw_bolts = { build() { return {}; }, update() {} };
})(window.SO = window.SO || {});
