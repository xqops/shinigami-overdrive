// 05 MANIPULAÇÃO DE SANGUE — "Foice Sanguínea": a crimson scythe held in both hands. Blood drips
// from its edge, sloshes in the glass vial in its shaft, beads of blood swing on chains from its
// head and a red ribbon trails. Inspect (author's sheet): raised, dripping; the vial brought close,
// glowing and bubbling; living ribbons of blood spiral up the shaft; blood floats all around.
(function (SO) {
  'use strict';
  const T = THREE, CW = SO.CharWeapons, AFX = SO.AFX, PI = Math.PI;
  const K = (t, p, a, f, roll, ease) => ({ t, p, a, f, roll, ease: ease || 'inout' });
  const R = (t) => ({ t, rest: true, ease: 'inout' });
  const RED = 0xe0102e, HOT = 0xff4a5a, PALE = 0xffb0b8, DARK = 0x5a0010;
  const VX = 0.0048, H = 226, GRIP = Math.floor(226 * 0.32);
  const L = (px, row) => new T.Vector3((px - 13.5) * VX, (H - row - GRIP) * VX, 0); // sprite pixel -> local

  CW.reg.blood = {
    slot: 0,
    restR: { p: [0.28, -0.32, -0.62], a: 0.3, f: 0.45, roll: 0 },
    gripR: 0, gripL2: 0.24,
    freeClips: { blood_a3: 1 },

    build(vm) {
      const right = SO.Voxel.build('weapons/sangue_foice', { voxel: VX, grip: 0.32, glow: 0.3, haloPx: 1.4, depth: (r, x) => (x > 18 ? 1.5 : 2.6) });
      if (!right) return null;
      right.userData.halo.material.color.setHex(RED);
      // the trail runs along the blade, from the head to its point
      right.userData.base.position.copy(L(16, 20));
      right.userData.tip.position.copy(L(62, 90));
      const s = { right, motes: new CW.Motes(vm.scene, 300), acc: 0, drip: 0, fired: {} };
      const at = (px, row) => { const o = new T.Object3D(); o.position.copy(L(px, row)); right.add(o); return o; };
      s.drips = [at(60, 86), at(50, 70), at(36, 52), at(26, 38)];
      s.vial = at(13, 70);
      s.head = at(13, 18);
      // bead strings from the head
      s.beadSets = [[at(18, 26), 5, 0.14], [at(8, 28), 4, 0.1]].map(([a, n, len]) => {
        const sps = [];
        for (let i = 0; i < n; i++) { const sp = new T.Sprite(new T.SpriteMaterial({ map: CW.dotTex(), color: i === n - 1 ? HOT : 0x9a0814, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); sp.renderOrder = 6; vm.scene.add(sp); sps.push(sp); }
        return { a, rope: new CW.Rope(n + 1, len), sps };
      });
      s.ribbon = new CW.Ribbon(vm.scene, { color: 0x7a0812, width: 0.018, length: 0.36, n: 12 });
      s.ribbonA = at(13, 34);
      // living blood ribbons for the show: glowing, wound around the shaft
      s.liquid = [0, 1, 2].map(() => new CW.Ribbon(vm.scene, { color: RED, width: 0.02, length: 0.3, n: 12, glow: true }));
      s.liquid.forEach((r) => { r.mesh.visible = false; });
      s.trail = new CW.Trail(vm.scene, { color: 0x8a0414, core: PALE, life: 0.12, width: 0.9 });
      return s;
    },

    update(vm, s, dt, ctx) {
      const insp = ctx.inspect, ud = s.right.userData;
      const beat = insp < 0 ? 0 : insp < 0.24 ? 1 : insp < 0.48 ? 2 : insp < 0.72 ? 3 : insp < 0.95 ? 4 : 0;
      ud.halo.material.opacity = 0.22 + (beat ? 0.2 : 0) + Math.sin(ctx.time * 3) * 0.05;
      // drips falling off the edge
      s.drip += dt * (beat === 1 ? 14 : ctx.swing ? 10 : 3.5);
      while (s.drip >= 1) {
        s.drip -= 1;
        const p = s.drips[(Math.random() * s.drips.length) | 0].getWorldPosition(new T.Vector3());
        s.motes.emit({ pos: p, vel: new T.Vector3(0, -0.05, 0), life: 0.8, size: 0.01, size1: 0.007, color: Math.random() < 0.5 ? RED : HOT, opacity: 1, tex: CW.dotTex(), drag: 0, up: -1.6, fadeIn: 0.02 });
      }
      // the vial: bubbles rising in it while shown
      const vial = s.vial.getWorldPosition(new T.Vector3());
      if (beat === 2 && Math.random() < dt * 30) s.motes.emit({ pos: vial.clone().add(new T.Vector3((Math.random() - 0.5) * 0.01, -0.06, 0.015)), vel: new T.Vector3(0, 0.12, 0), life: 0.4, size: 0.007, size1: 0.004, color: PALE, opacity: 1, tex: CW.dotTex(), drag: 0, fadeIn: 0.05 });
      if (beat === 2) ud.halo.material.opacity += 0.15;
      // living ribbons spiral up the shaft (beat 3) and fling out (beat 4)
      const head = s.head.getWorldPosition(new T.Vector3());
      const show = beat === 3 || beat === 4;
      s.liquid.forEach((r, i) => {
        r.mesh.visible = show;
        if (!show) return;
        const a = ctx.time * 3 + i * 2.1, h = ((ctx.time * 0.5 + i / 3) % 1);
        const rad = beat === 4 ? 0.12 + Math.sin(ctx.time * 2 + i) * 0.04 : 0.05;
        const anchor = vial.clone().lerp(head, h).add(new T.Vector3(Math.cos(a) * rad, 0.02, Math.sin(a) * rad));
        r.update(dt, anchor, 0.008);
      });
      if (beat === 4) {
        s.acc += dt * 40;
        while (s.acc >= 1) { s.acc -= 1; s.motes.emit({ pos: head.clone().add(new T.Vector3((Math.random() - 0.5) * 0.6, (Math.random() - 0.6) * 0.5, -Math.random() * 0.3)), vel: new T.Vector3(0, 0.03, 0), life: 0.9, size: 0.004, size1: 0.016, color: Math.random() < 0.6 ? RED : HOT, opacity: 1, tex: CW.dotTex(), drag: 1, curl: 0.3, fadeIn: 0.3 }); }
      }
      s.motes.update(dt, ctx.time);
      s.trail.update(dt, s.right, ctx.trailOn(ctx.swing ? ctx.swing.trail : null));
      for (const b of s.beadSets) {
        b.rope.step(Math.min(dt, 1 / 30), b.a.getWorldPosition(new T.Vector3()), null, 9);
        b.sps.forEach((sp, i) => { sp.position.copy(b.rope.p[i + 1]); const z = i === b.sps.length - 1 ? 0.017 : 0.01; sp.scale.set(z, i === b.sps.length - 1 ? z * 1.3 : z, 1); });
      }
      s.ribbon.update(dt, s.ribbonA.getWorldPosition(new T.Vector3()), ctx.swing ? 0.006 : 0.002);
    },

    clips: {
      blood_a1: { trail: [0.18, 0.62], R: [K(0.16, [0.45, -0.1, -0.65], -1.2, 0.3, 0), K(0.34, [0.15, -0.18, -0.75], 0.4, 0.3, 0), K(0.52, [-0.25, -0.25, -0.75], 2.1, 0.3, 0, 'out'), K(0.72, [-0.3, -0.3, -0.72], 2.4, 0.3, 0), R(1)] },
      blood_a2: { trail: [0.18, 0.62], R: [K(0.16, [-0.2, -0.05, -0.65], 1.2, 0.3, PI), K(0.34, [0.0, -0.15, -0.75], -0.4, 0.3, PI), K(0.52, [0.4, -0.28, -0.75], -2.1, 0.3, PI, 'out'), K(0.72, [0.44, -0.32, -0.72], -2.4, 0.3, PI), R(1)] },
      blood_a3: { trail: [0.1, 0.86], R: [K(0.1, [0.05, -0.14, -0.85], 0, 0.15, 0), K(0.3, [0.05, -0.14, -0.85], PI, 0.15, 0), K(0.5, [0.05, -0.14, -0.85], 2 * PI, 0.15, 0), K(0.7, [0.05, -0.14, -0.85], 3 * PI, 0.15, 0), K(0.86, [0.05, -0.14, -0.85], 4 * PI, 0.15, 0), R(1)] },
      blood_h: { trail: [0.3, 0.7], R: [K(0.3, [-0.2, -0.35, -0.55], 2.5, 0.3, PI, 'stop'), K(0.52, [0.35, 0.05, -0.6], -0.9, 0.35, PI, 'out'), K(0.75, [0.38, 0.08, -0.58], -1.0, 0.35, PI), R(1)] },
    },

    swing(F, e, view) {
      const o = { pos: view.eye, yaw: view.yaw, pitch: view.pitch * 0.85, color: 0x6a0010, core: HOT, wisp: 0.6, cells: [120, 7], alpha: 0.55 };
      if (e.step === 0) setTimeout(() => CW.slashArc(F, Object.assign(o, { roll: 0, radius: 2.1, width: 0.42, arc: 2.6, dur: 0.24 })), 60);
      else if (e.step === 1) setTimeout(() => CW.slashArc(F, Object.assign(o, { roll: 180, radius: 2.1, width: 0.42, arc: 2.6, dur: 0.24 })), 60);
      else if (e.step === 2) { for (let i = 0; i < 2; i++) setTimeout(() => CW.slashArc(F, Object.assign({}, o, { roll: 0, radius: 2.3, width: 0.38, arc: 3.0, dur: 0.24, ahead: 0.4, tilt: -0.15 })), 60 + i * 230); }
    },
    hit(F, e) {
      const dir = new T.Vector3(e.dx, e.dy + 0.3, e.dz);
      F.fx.blood(e.x, e.y, e.z, dir, 2.2);
      F.fx.burst(e.x, e.y, e.z, 10, 7, RED, 0.3, 0.25, -5, { dir });
      leech(F, e.x, e.y, e.z, 5);
    },

    inspect: {
      dur: 4.6,
      R: [
        K(0.12, [0.2, -0.24, -0.6], 0.25, 0.25, 0),
        K(0.22, [0.2, -0.24, -0.6], 0.3, 0.28, 0.3),
        K(0.32, [0.05, -0.32, -0.4], 0.12, 0.08, 0),
        K(0.46, [0.05, -0.32, -0.4], 0.1, 0.1, -0.2),
        K(0.56, [0.12, -0.3, -0.52], 0.2, 0.2, 0),
        K(0.7, [0.12, -0.3, -0.52], 0.25, 0.22, 0.6),
        K(0.8, [0.16, -0.3, -0.56], 0.35, 0.3, 0.3),
        K(0.93, [0.16, -0.3, -0.56], 0.3, 0.3, 0.4),
        R(1),
      ],
    },

    dispose(vm, s) {
      s.motes.clear(); s.trail.dispose(vm.scene); s.ribbon.dispose();
      for (const r of s.liquid) r.dispose();
      for (const b of s.beadSets) for (const sp of b.sps) vm.scene.remove(sp);
    },
  };

  // blood pulled from a wound to the player: red motes flying home
  function leech(F, x, y, z, n) {
    const pl = F.player && F.player.pos;
    if (!pl) return;
    for (let i = 0; i < n; i++) {
      const dx = pl.x - x, dy = pl.y + 1.2 - y, dz = pl.z - z;
      F.fx.glowP.emit(x + (Math.random() - 0.5) * 0.4, y + (Math.random() - 0.5) * 0.4, z + (Math.random() - 0.5) * 0.4, dx * 2.2, dy * 2.2 + 2, dz * 2.2, 1, 0.08, 0.15, 0.14, 0.45, 0, 0.5);
    }
  }

  // the heavy: a crescent wave of blood, dripping as it flies
  AFX.spell.cw_blood_wave = {
    build(F, q) {
      const root = new T.Group();
      const mat = CW.slashMat({ color: 0x8a0010, core: 0xff7a86, wisp: 0.5, cells: [80, 8], alpha: 1 });
      const m = new T.Mesh(CW.arcGeo(1.3, 2.1, PI / 2 - 1.2, PI / 2 + 1.2, 40), mat);
      m.position.z = 1.6;
      const tilt = new T.Group(); tilt.rotation.x = -PI / 2; tilt.add(m);
      const rollG = new T.Group(); rollG.rotation.z = 0.4; rollG.add(tilt);
      root.add(rollG);
      return { root, mat, age: 0, m };
    },
    update(F, v, dt, vel) {
      v.age += dt;
      const p = v.root.position;
      v.root.lookAt(p.x - vel.x, p.y - vel.y, p.z - vel.z);
      v.mat.uniforms.uT.value = 0.62;
      for (let i = 0; i < 4; i++) { const a = Math.random() * 2.4 - 1.2; F.fx.glowP.emit(p.x + Math.cos(a) * 1.7 * (Math.random() < 0.5 ? 1 : -1), p.y + Math.sin(a) * 0.8, p.z, 0, -3, 0, 0.9, 0.05, 0.1, 0.1, 0.5, 9, 0.5); }
    },
    dispose(F, v) { v.mat.dispose(); v.m.geometry.dispose(); },
    hit(F, e) { F.fx.blood(e.x, e.y, e.z, new T.Vector3(0, 1, 0), 2.5); leech(F, e.x, e.y, e.z, 8); },
    end(F, e) { F.fx.burst(e.x, e.y, e.z, 20, 6, RED, 0.35, 0.4, -8); },
  };
})(window.SO = window.SO || {});
