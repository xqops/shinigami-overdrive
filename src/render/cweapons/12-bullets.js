// 12 RAJADA DE BALAS — "Metralhadora da Caveira": a skull gatling held in both hands, pointing
// forward. A real ring of six red-hot barrels spins at the muzzle, brass shells fly, chains with a
// bell and ofudas swing. Inspect (author's sheet): held; the barrels heat up; they spin and spit
// shells; overheated, flames pour off the muzzle.
(function (SO) {
  'use strict';
  const T = THREE, CW = SO.CharWeapons, AFX = SO.AFX, PI = Math.PI;
  const K = (t, p, a, f, roll, ease) => ({ t, p, a, f, roll, ease: ease || 'inout' });
  const R = (t) => ({ t, rest: true, ease: 'inout' });
  const RED = 0xff3a1a, HOT = 0xffd080, BRASS = 0xd8a040;
  const VX = 0.0052, H = 170, GRIP = Math.floor(170 * 0.12);

  const flashTex = () => CW.pixelTex('gun-flash', 32, (x, y, s) => {
    const dx = (x + 0.5) / s - 0.5, dy = (y + 0.5) / s - 0.5, r = Math.sqrt(dx * dx + dy * dy) * 2, a = Math.atan2(dy, dx);
    const star = Math.pow(Math.abs(Math.cos(a * 2)), 6) * 0.8 + 0.25;
    return r < star ? 1 - r / star * 0.5 : 0;
  });

  CW.reg.bullets = {
    slot: 0,
    restR: { p: [0.2, -0.27, -0.52], a: 0.06, f: 1.38, roll: 0 },
    gripR: 0, gripL2: 0.3,

    build(vm) {
      const right = SO.Voxel.build('weapons/balas_metralhadora', { voxel: VX, grip: 0.12, glow: 0.35, haloPx: 1.4, depth: (r) => (r > 40 ? 9 : 4) });
      if (!right) return null;
      right.userData.halo.material.color.setHex(RED);
      const muzzleY = (H - 6 - GRIP) * VX;
      const s = { right, motes: new CW.Motes(vm.scene, 260), spin: 0, spinV: 0, heat: 0, shellAcc: 0, flashT: 0 };
      // the spinning barrel ring at the muzzle
      s.drum = new T.Group(); s.drum.position.set(0, muzzleY - 0.05, 0); right.add(s.drum);
      const barMat = new T.MeshLambertMaterial({ color: 0x8a1408, emissive: 0x6a0a04 });
      const boreMat = new T.MeshBasicMaterial({ color: HOT });
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * PI * 2;
        const b = new T.Mesh(new T.CylinderGeometry(0.011, 0.011, 0.12, 6), barMat);
        b.position.set(Math.cos(a) * 0.026, 0, Math.sin(a) * 0.026);
        const bore = new T.Mesh(new T.CircleGeometry(0.006, 6).rotateX(-PI / 2), boreMat);
        bore.position.set(0, 0.061, 0); b.add(bore);
        s.drum.add(b);
      }
      const ring = new T.Mesh(new T.CylinderGeometry(0.045, 0.045, 0.02, 12), new T.MeshLambertMaterial({ color: 0x2a2232 }));
      ring.position.y = -0.03; s.drum.add(ring);
      s.barMat = barMat;
      s.muzzle = new T.Object3D(); s.muzzle.position.set(0, muzzleY + 0.04, 0); right.add(s.muzzle);
      s.port = new T.Object3D(); s.port.position.set(0.05, (H - 110 - GRIP) * VX, 0); right.add(s.port);
      s.flash = new T.Sprite(new T.SpriteMaterial({ map: flashTex(), color: HOT, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
      s.flash.renderOrder = 7; s.flash.visible = false; vm.scene.add(s.flash);
      // chains: a bell and two ofudas under the receiver
      s.hangs = [];
      for (const [x, y, n, end] of [[-0.06, 100, 5, 'weapons/demonio_sino'], [0.0, 120, 3, 'weapons/almas_ofuda'], [0.06, 104, 4, 'weapons/almas_ofuda']]) {
        const a = new T.Object3D(); a.position.set(x, (H - y - GRIP) * VX, 0); right.add(a);
        const g = new T.Group(); vm.scene.add(g);
        const links = CW.chainMeshes('weapons/almas_elo', n, 0.0032, g);
        const hang = SO.Voxel.build(end, { voxel: end.includes('sino') ? 0.004 : 0.003, grip: 0.95, depth: end.includes('sino') ? 4 : 0.8 });
        if (hang) g.add(hang);
        s.hangs.push({ a, g, links, hang, rope: new CW.Rope(n + 1, n * 0.025) });
      }
      s.shells = [];
      return s;
    },

    // a muzzle flash and a kick; the drum gets a push
    fire(s) { s.flashT = 0.05; s.spinV = Math.min(40, s.spinV + 12); s.heat = Math.min(1, s.heat + 0.05); s.shellAcc += 1; },

    update(vm, s, dt, ctx) {
      const insp = ctx.inspect, ud = s.right.userData;
      const beat = insp < 0 ? 0 : insp < 0.24 ? 1 : insp < 0.48 ? 2 : insp < 0.72 ? 3 : insp < 0.95 ? 4 : 0;
      const sw = ctx.swing;
      // firing: rounds come out on a fixed cadence during a burst, nonstop in the storm
      if (sw && sw.name !== 'bullets_h') { s.cad = (s.cad || 0) - dt; if (s.cad <= 0 && sw.t < 0.7) { s.cad = 0.045; this.fire(s); } }
      if (sw && sw.name === 'bullets_h' && sw.t > 0.22 && sw.t < 0.95) { s.cad = (s.cad || 0) - dt; if (s.cad <= 0) { s.cad = 0.04; this.fire(s); } }
      if (beat === 3) { s.spinV = Math.max(s.spinV, 30); s.shellAcc += dt * 14; }
      if (beat === 4) { s.spinV = Math.max(s.spinV, 36); s.shellAcc += dt * 18; s.heat = 1; }
      if (beat === 2) s.heat = Math.min(1, s.heat + dt * 0.6);
      s.spinV *= Math.exp(-2.2 * dt);
      s.drum.rotation.y += s.spinV * dt;
      s.heat = Math.max(0, s.heat - dt * (beat ? 0 : 0.25));
      s.barMat.emissive.setRGB(0.4 + s.heat * 0.6, 0.04 + s.heat * 0.3, 0.02 + s.heat * 0.05);
      ud.halo.material.opacity = 0.25 + s.heat * 0.45;
      // muzzle flash
      const muzzle = s.muzzle.getWorldPosition(new T.Vector3());
      s.flashT -= dt;
      s.flash.visible = s.flashT > 0;
      if (s.flash.visible) { s.flash.position.copy(muzzle); const z = 0.07 + Math.random() * 0.05; s.flash.scale.set(z, z, 1); s.flash.material.rotation = Math.random() * PI; }
      // shells
      const port = s.port.getWorldPosition(new T.Vector3());
      while (s.shellAcc >= 1) {
        s.shellAcc -= 1;
        const m = new T.Mesh(new T.CylinderGeometry(0.0045, 0.0045, 0.018, 6), new T.MeshLambertMaterial({ color: BRASS, emissive: 0x3a2008 }));
        m.position.copy(port); vm.scene.add(m);
        s.shells.push({ m, v: new T.Vector3(0.5 + Math.random() * 0.4, 0.4 + Math.random() * 0.4, 0.1 + (Math.random() - 0.5) * 0.3), sp: new T.Vector3(Math.random() * 20, Math.random() * 20, 0), t: 0 });
      }
      for (let i = s.shells.length - 1; i >= 0; i--) {
        const h = s.shells[i];
        h.t += dt; h.v.y -= 3.2 * dt;
        h.m.position.addScaledVector(h.v, dt); h.m.rotation.x += h.sp.x * dt; h.m.rotation.z += h.sp.y * dt;
        if (h.t > 0.7) { vm.scene.remove(h.m); h.m.geometry.dispose(); h.m.material.dispose(); s.shells.splice(i, 1); }
      }
      // heat haze and, overheated, flames off the muzzle
      if (s.heat > 0.6 && Math.random() < dt * 20) s.motes.emit({ pos: muzzle.clone(), vel: new T.Vector3((Math.random() - 0.5) * 0.05, 0.1, 0), life: 0.6, size: 0.015, size1: 0.05, color: 0x5a3030, opacity: 0.25, drag: 1, curl: 1, additive: false });
      if (beat === 4) for (let i = 0; i < 3; i++) s.motes.emit({ pos: muzzle.clone().add(new T.Vector3((Math.random() - 0.5) * 0.04, 0, (Math.random() - 0.5) * 0.04)), vel: new T.Vector3((Math.random() - 0.5) * 0.15, 0.25 + Math.random() * 0.2, -0.1), life: 0.35, size: 0.03, size1: 0.08, color: Math.random() < 0.5 ? RED : HOT, opacity: 0.9, drag: 2, curl: 2, up: 0.5, fadeIn: 0.03 });
      s.motes.update(dt, ctx.time);
      for (const h of s.hangs) {
        h.rope.step(Math.min(dt, 1 / 30), h.a.getWorldPosition(new T.Vector3()), null, 9);
        CW.layChain(h.links, h.rope);
        if (h.hang) { const e = h.rope.p[h.rope.n - 1], q = h.rope.p[h.rope.n - 2]; h.hang.position.copy(e); h.hang.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), q.clone().sub(e).normalize()); }
      }
    },

    // recoil: quick kicks and returns (spline keeps them smooth)
    clips: (function () {
      const kicks = (n, dur) => {
        const keys = [];
        for (let i = 0; i < n; i++) { const tk = (i + 0.3) / n * 0.85, tr = (i + 0.8) / n * 0.85; keys.push(K(tk, [0.2, -0.25, -0.47], 0.04, 1.3, 0.05 * (i % 2 ? 1 : -1), 'out')); keys.push(K(tr, [0.2, -0.27, -0.52], 0.06, 1.38, 0)); }
        keys.push(R(1));
        return { trail: [2, 2], R: keys };
      };
      return {
        bullets_a1: kicks(3, 0.2), bullets_a2: kicks(4, 0.22), bullets_a3: kicks(6, 0.3),
        bullets_h: { trail: [2, 2], R: [K(0.2, [0.18, -0.3, -0.5], 0.08, 1.3, 0.2, 'stop'), K(0.3, [0.2, -0.25, -0.46], 0.04, 1.32, 0.1), K(0.5, [0.21, -0.26, -0.47], 0.05, 1.34, -0.08), K(0.7, [0.2, -0.25, -0.46], 0.04, 1.32, 0.08), K(0.9, [0.2, -0.26, -0.48], 0.05, 1.35, -0.05), R(1)] },
      };
    })(),

    swing() {},
    hit(F, e) {
      F.fx.burst(e.x, e.y, e.z, 6, 8, HOT, 0.18, 0.15, -6, { dir: new T.Vector3(e.dx, e.dy + 0.3, e.dz) });
      F.fx.blood(e.x, e.y, e.z, new T.Vector3(e.dx, e.dy + 0.3, e.dz), 0.7);
    },

    inspect: {
      dur: 4.6,
      R: [
        K(0.12, [0.16, -0.24, -0.5], 0.3, 1.0, 0),
        K(0.24, [0.16, -0.24, -0.5], 0.32, 0.95, 0.4),
        K(0.36, [0.1, -0.26, -0.48], 0.55, 0.6, -0.5),
        K(0.48, [0.1, -0.26, -0.48], 0.52, 0.62, -0.3),
        K(0.72, [0.14, -0.26, -0.5], 0.35, 0.9, 0.2),
        K(0.93, [0.14, -0.26, -0.5], 0.35, 0.95, 0),
        R(1),
      ],
    },

    dispose(vm, s) { s.motes.clear(); vm.scene.remove(s.flash); for (const h of s.hangs) vm.scene.remove(h.g); for (const h of s.shells) vm.scene.remove(h.m); },
  };

  // tracers: thin hot lines from below the view to each impact, sparks where they land
  AFX.vfx['cw_bullets:burst'] = (F, e, mine) => {
    const from = new T.Vector3(e.x, e.y - 0.3, e.z);
    if (mine) {
      const yaw = F.R && SO.game ? SO.game.input.yaw : 0;
      from.add(new T.Vector3(Math.cos(yaw) * 0.25, 0, -Math.sin(yaw) * 0.25));
      const vm = SO.game && SO.game.renderer.vm;
      if (vm && vm.cw && vm.cw.fire) for (let i = 0; i < e.shots.length; i++) setTimeout(() => vm.cwS && vm.cw.fire(vm.cwS), i * 45);
    }
    e.shots.forEach((sh, i) => {
      setTimeout(() => {
        const to = new T.Vector3(e.x + sh[0], e.y + sh[1], e.z + sh[2]);
        const g = new T.BufferGeometry().setFromPoints([from.clone().lerp(to, 0.05), to]);
        const line = new T.Line(g, new T.LineBasicMaterial({ color: HOT, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
        F.add(line);
        F.spawn((dt, age) => { line.material.opacity = 1 - age / 0.07; if (age < 0.07) return true; g.dispose(); line.material.dispose(); return false; }, [line]);
        F.fx.burst(to.x, to.y, to.z, sh[3] ? 3 : 4, 6, HOT, 0.12, 0.12, -6);
        if (!sh[3]) F.fx.burst(to.x, to.y, to.z, 2, 2, 0x5a5050, 0.25, 0.4, -2);
      }, i * 45);
    });
  };
  AFX.effect.cw_storm = { build() { return {}; }, update() {} };
})(window.SO = window.SO || {});
