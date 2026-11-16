// 14 CLONES SOMBRIOS — "Adagas das Sombras": twin violet daggers, one in each hand, wrapped in
// shadow smoke. Inspect (author's sheet): held; the smoke thickens; ghost copies of the dagger
// split off it; shadow figures rise behind, each holding its own dagger.
(function (SO) {
  'use strict';
  const T = THREE, CW = SO.CharWeapons, AFX = SO.AFX, PI = Math.PI;
  const K = (t, p, a, f, roll, ease) => ({ t, p, a, f, roll, ease: ease || 'inout' });
  const R = (t) => ({ t, rest: true, ease: 'inout' });
  const VIOLET = 0xa050ff, PALE = 0xe8c0ff, SMOKE = 0x2a0a4a;

  const FIGURE = [
    '.....###.....', '....#####....', '....#+#+#....', '....#####....', '.....###.....', '...#######...', '..#########..', '.##.#####.##.', '##..#####..##', '#...#####...#',
    '....#####....', '....##.##....', '...##...##...', '...##...##...', '..##.....##..', '..##.....##..',
  ];
  function dagger() { const o = { voxel: 0.0042, grip: 'guard', pommel: true, glow: 0.3, haloPx: 1.6 }; o.depth = (r) => (r > o.guardRow + 4 ? 1.4 : 3); return SO.Voxel.build('weapons/sombra_adaga', o); }
  // a ghost copy: same shape, flat violet light
  function ghost() {
    const g = dagger();
    if (!g) return null;
    const mat = new T.MeshBasicMaterial({ color: VIOLET, transparent: true, opacity: 0.5, blending: T.AdditiveBlending, depthWrite: false });
    g.traverse((o) => { if (o.isMesh) o.material = mat; });
    g.userData.mat = mat;
    return g;
  }
  function figure(scene) {
    const rim = new T.Sprite(new T.SpriteMaterial({ map: CW.artTex('shadow-fig', FIGURE), color: VIOLET, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    const body = new T.Sprite(new T.SpriteMaterial({ map: CW.artTex('shadow-fig', FIGURE), color: 0x0a0414, transparent: true, depthWrite: false }));
    rim.renderOrder = 1; body.renderOrder = 2;
    const g = new T.Group(); g.add(rim); g.add(body); scene.add(g);
    g.userData = { rim, body };
    return g;
  }
  function setFigure(g, x, y, z, size, op) {
    g.position.set(x, y, z);
    g.userData.body.scale.set(size * 0.8, size, 1); g.userData.rim.scale.set(size * 0.8 * 1.1, size * 1.08, 1);
    g.userData.body.material.opacity = op; g.userData.rim.material.opacity = op * 0.8;
    g.visible = op > 0.01;
  }

  CW.reg.shadow = {
    slot: 0,
    restR: { p: [0.26, -0.22, -0.58], a: 0.5, f: 0.5, roll: 0 },
    restL: { p: [-0.27, -0.24, -0.58], a: -0.5, f: 0.5, roll: PI },
    gripR: -0.01, gripL: -0.01,

    build(vm) {
      const right = dagger(), left = dagger();
      if (!right || !left) return null;
      right.userData.halo.material.color.setHex(VIOLET); left.userData.halo.material.color.setHex(VIOLET);
      const s = { right, left, motes: new CW.Motes(vm.scene, 300), acc: 0 };
      s.smokeR = CW.flameOn(right, { color: SMOKE, soft: VIOLET, width: 0.12, cells: [12, 90], speed: 0.7, wild: 1.6, reach: 0.4 });
      s.smokeL = CW.flameOn(left, { color: SMOKE, soft: VIOLET, width: 0.12, cells: [12, 90], speed: 0.8, wild: 1.6, reach: 0.4 });
      s.ghosts = [0, 1, 2, 3].map(() => { const g = ghost(); if (g) { g.visible = false; vm.scene.add(g); } return g; }).filter(Boolean);
      s.figures = [0, 1, 2].map(() => { const f = figure(vm.scene); f.visible = false; return f; });
      s.trailR = new CW.Trail(vm.scene, { color: 0x5a14a0, core: PALE, life: 0.1, width: 0.7 });
      s.trailL = new CW.Trail(vm.scene, { color: 0x5a14a0, core: PALE, life: 0.1, width: 0.7 });
      return s;
    },

    update(vm, s, dt, ctx) {
      const insp = ctx.inspect;
      const beat = insp < 0 ? 0 : insp < 0.24 ? 1 : insp < 0.48 ? 2 : insp < 0.72 ? 3 : insp < 0.95 ? 4 : 0;
      for (const [m, k] of [[s.smokeR, beat >= 2 ? 1.5 : ctx.swing ? 1.3 : 0.9], [s.smokeL, beat >= 2 ? 1.5 : ctx.swing ? 1.3 : 0.9]]) {
        m.uniforms.uTime.value = ctx.time; m.uniforms.uK.value += (k - m.uniforms.uK.value) * (1 - Math.exp(-8 * dt));
      }
      // shadow wisps dropping off the blades
      const r0 = s.right.userData.base.getWorldPosition(new T.Vector3()), r1 = s.right.userData.tip.getWorldPosition(new T.Vector3());
      const l0 = s.left.userData.base.getWorldPosition(new T.Vector3()), l1 = s.left.userData.tip.getWorldPosition(new T.Vector3());
      s.acc += dt * (beat >= 2 ? 40 : 10);
      while (s.acc >= 1) {
        s.acc -= 1;
        const p = (Math.random() < 0.5 ? r0.clone().lerp(r1, Math.random()) : l0.clone().lerp(l1, Math.random()));
        s.motes.emit({ pos: p, vel: new T.Vector3((Math.random() - 0.5) * 0.05, -0.03 + Math.random() * 0.06, 0), life: 0.8, size: 0.02, size1: 0.06, color: Math.random() < 0.7 ? 0x0e0418 : VIOLET, opacity: 0.45, drag: 1, curl: 1.2, additive: Math.random() < 0.3 });
      }
      // ghost copies peel off the right dagger (beat 3) and fan around (beat 4)
      const rq = s.right.getWorldQuaternion(new T.Quaternion()), rp = s.right.getWorldPosition(new T.Vector3());
      s.ghosts.forEach((g, i) => {
        g.visible = beat >= 3;
        if (!g.visible) return;
        const k = beat === 3 ? Math.min(1, (insp - 0.48) * 5) : 1;
        const side = (i % 2 ? 1 : -1) * (1 + Math.floor(i / 2));
        const off = beat === 4 ? new T.Vector3(side * 0.12, 0.05 + Math.floor(i / 2) * 0.06, -0.1 - Math.floor(i / 2) * 0.08) : new T.Vector3(side * 0.06 * k, 0.02 * k, -0.04 * k);
        g.position.copy(rp).add(off);
        g.quaternion.copy(rq).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0, 0, 1), side * 0.25 * k));
        g.userData.mat.opacity = (0.45 - Math.floor(i / 2) * 0.12) * Math.min(1, (0.95 - insp) * 12);
      });
      // shadow figures rising behind (beat 4)
      const fk = beat === 4 ? Math.min(1, (insp - 0.72) * 6) * Math.min(1, (0.95 - insp) * 12) : 0;
      s.figures.forEach((f, i) => setFigure(f, (i - 1) * 0.55, -0.45 + fk * 0.2 + (i === 1 ? 0.06 : 0), -1.4 - (i % 2) * 0.1, 0.55 + (i === 1 ? 0.1 : 0), fk));
      s.motes.update(dt, ctx.time);
      const sw = ctx.swing;
      s.trailR.update(dt, s.right, ctx.trailOn(sw ? sw.trail : null));
      s.trailL.update(dt, s.left, ctx.trailOn(sw ? sw.trailL : null));
    },

    clips: {
      shadow_a1: { trail: [0.12, 0.62], R: [K(0.14, [0.42, -0.02, -0.52], -1.2, 0.35, 0), K(0.32, [0.1, -0.12, -0.66], 0.6, 0.3, 0), K(0.5, [-0.22, -0.3, -0.58], 2.2, 0.3, 0, 'out'), K(0.7, [-0.25, -0.32, -0.56], 2.35, 0.32, 0), R(1)], L: [K(0.3, [-0.3, -0.3, -0.56], -0.9, 0.5, PI), R(1)] },
      shadow_a2: { trailL: [0.12, 0.62], L: [K(0.14, [-0.42, -0.02, -0.52], 1.2, 0.35, PI), K(0.32, [-0.1, -0.12, -0.66], -0.6, 0.3, PI), K(0.5, [0.22, -0.3, -0.58], -2.2, 0.3, PI, 'out'), K(0.7, [0.25, -0.32, -0.56], -2.35, 0.32, PI), R(1)], R: [K(0.3, [0.3, -0.3, -0.56], 0.9, 0.5, 0), R(1)] },
      shadow_a3: { trail: [0.22, 0.66], trailL: [0.22, 0.66], R: [K(0.22, [0.28, 0.04, -0.5], -0.5, -0.2, 0), K(0.42, [0.06, -0.12, -0.66], 1.2, 0.3, 0), K(0.56, [-0.14, -0.3, -0.62], 2.4, 0.45, 0, 'out'), K(0.74, [-0.16, -0.32, -0.6], 2.5, 0.45, 0), R(1)], L: [K(0.22, [-0.28, 0.04, -0.5], 0.5, -0.2, PI), K(0.42, [-0.06, -0.12, -0.66], -1.2, 0.3, PI), K(0.56, [0.14, -0.3, -0.62], -2.4, 0.45, PI, 'out'), K(0.74, [0.16, -0.32, -0.6], -2.5, 0.45, PI), R(1)] },
      shadow_h: { trail: [2, 2], R: [K(0.3, [0.14, -0.3, -0.42], 0.3, 1.2, 0, 'stop'), K(0.5, [0.2, -0.12, -0.7], 0.5, 0.9, 0, 'out'), R(1)], L: [K(0.3, [-0.14, -0.3, -0.42], -0.3, 1.2, PI, 'stop'), K(0.5, [-0.2, -0.12, -0.7], -0.5, 0.9, PI, 'out'), R(1)] },
    },

    swing(F, e, view) {
      const o = { pos: view.eye, yaw: view.yaw, pitch: view.pitch * 0.85, color: 0x3a0a6a, core: PALE, wisp: 0.95, cells: [120, 6], alpha: 0.45 };
      if (e.step === 0) CW.slashArc(F, Object.assign(o, { roll: 20, radius: 1.5, width: 0.28, arc: 2.5, dur: 0.18 }));
      else if (e.step === 1) CW.slashArc(F, Object.assign(o, { roll: 200, radius: 1.5, width: 0.28, arc: 2.5, dur: 0.18 }));
    },
    hit(F, e) {
      const dir = new T.Vector3(e.dx, e.dy + 0.3, e.dz);
      F.fx.burst(e.x, e.y, e.z, 10, 7, VIOLET, 0.25, 0.22, 0, { dir });
      F.fx.blood(e.x, e.y, e.z, dir, 1);
      F.flash(e.x, e.y, e.z, VIOLET, 3, 0.1);
    },

    inspect: {
      dur: 4.6,
      R: [K(0.12, [0.16, -0.2, -0.56], 0.25, 0.25, 0), K(0.24, [0.16, -0.2, -0.56], 0.28, 0.27, 0.5), K(0.36, [0.14, -0.18, -0.58], 0.2, 0.2, 0), K(0.48, [0.14, -0.18, -0.58], 0.18, 0.2, 0.2), K(0.72, [0.12, -0.2, -0.6], 0.15, 0.18, 0), K(0.93, [0.12, -0.2, -0.6], 0.15, 0.18, 0), R(1)],
      L: [K(0.12, [-0.3, -0.36, -0.6], -0.6, 0.6, PI), K(0.36, [-0.3, -0.36, -0.6], -0.6, 0.6, PI), K(0.72, [-0.24, -0.3, -0.6], -0.4, 0.4, PI), K(0.93, [-0.24, -0.3, -0.6], -0.4, 0.4, PI), R(1)],
    },

    dispose(vm, s) { s.motes.clear(); s.trailR.dispose(vm.scene); s.trailL.dispose(vm.scene); for (const g of s.ghosts) vm.scene.remove(g); for (const f of s.figures) vm.scene.remove(f); },
  };

  AFX.status['cw_shadow:blind'] = AFX.status['dark_2:blind'] || AFX.status['dark:blind'] || AFX.status.blind;
  // a shadow clone in the world: a dark figure with a violet rim, fading out of smoke
  function worldClone(F, x, y, z, dur, move) {
    const g = figure(F.scene);
    F.spawn((dt, age) => {
      const k = Math.min(1, age / 0.06) * Math.max(0, 1 - Math.max(0, age - dur * 0.6) / (dur * 0.4));
      const px = move ? x + move[0] * age / dur : x, pz = move ? z + move[1] * age / dur : z;
      setFigure(g, px, y + 1, pz, 2.2, k);
      F.fx.glowP.emit(px + (Math.random() - 0.5), y + Math.random() * 2, pz + (Math.random() - 0.5), 0, 0.5, 0, 0.5, 0.2, 0.9, 0.15, 0.4, 0, 1);
      if (age < dur) return true;
      g.userData.rim.material.dispose(); g.userData.body.material.dispose(); return false;
    }, [g]);
  }
  AFX.effect.cw_echo = {
    build(F, fx) { worldClone(F, fx.x, fx.y - 1, fx.z, 0.4); setTimeout(() => CW.slashArc(F, { pos: new T.Vector3(fx.x - fx.dx * 2, fx.y + 0.4, fx.z - fx.dz * 2), yaw: Math.atan2(-fx.dx, -fx.dz), pitch: 0, roll: 90, color: 0x3a0a6a, core: PALE, radius: 1.8, width: 0.4, arc: 2.4, dur: 0.2, wisp: 0.9, cells: [100, 6], alpha: 0.6 }), 170); return {}; },
    update() {},
  };
  AFX.vfx['cw_shadow:dash'] = (F, e, mine) => {
    for (const [x, y, z, x2, z2] of e.lanes) {
      worldClone(F, x, y, z, 0.45, [x2 - x, z2 - z]);
      for (let i = 0; i < 20; i++) { const u = i / 20; F.fx.glowP.emit(x + (x2 - x) * u, y + 0.5 + Math.random() * 1.5, z + (z2 - z) * u, 0, 0.5, 0, 0.6, 0.2, 1, 0.25, 0.5, 0, 1); }
    }
    if (mine) F.kick(3);
  };
})(window.SO = window.SO || {});
