// 02 TELEPORTE — "Lâmina do Vazio": a long violet blade held in one hand (the other stays free to
// cast). Void smoke clings to the steel, black shards drift around it, a crystal charm swings
// from the guard. Inspect (author's sheet, 4 beats): the blade is raised; the guard's ring opens
// into a tiny portal; the blade fractures into floating void shards among runes; a portal opens
// at the hand and swallows the shards back into the steel.
(function (SO) {
  'use strict';
  const T = THREE, CW = SO.CharWeapons, AFX = SO.AFX, PI = Math.PI;
  const K = (t, p, a, f, roll, ease) => ({ t, p, a, f, roll, ease: ease || 'inout' });
  const R = (t) => ({ t, rest: true, ease: 'inout' });
  const VIOLET = 0x9a3cff, PALE = 0xf0c8ff, DEEP = 0x3a0a6a, BLACK = 0x050208;

  const SHARD = ['...#...', '..###..', '.##+##.', '##+.+##', '.##+##.', '..###..', '...#...'];
  const RUNES = [
    ['#####', '#...#', '#.#.#', '#...#', '##.##'],
    ['..#..', '#####', '..#..', '.#.#.', '#...#'],
    ['#.#.#', '#.#.#', '#####', '..#..', '.###.'],
  ];
  const ringTex = () => CW.pixelTex('void-ring', 32, (x, y, s) => {
    const dx = (x + 0.5) / s - 0.5, dy = (y + 0.5) / s - 0.5, r = Math.sqrt(dx * dx + dy * dy) * 2, a = Math.atan2(dy, dx);
    const arms = 0.5 + 0.5 * Math.sin(a * 3 + r * 9);
    return r > 1 ? 0 : r > 0.82 ? 1 : r > 0.45 ? arms * (r - 0.45) * 2.4 : 0;
  });
  const coreTex = () => CW.pixelTex('void-core', 16, (x, y, s) => { const dx = (x + 0.5) / s - 0.5, dy = (y + 0.5) / s - 0.5; return Math.sqrt(dx * dx + dy * dy) < 0.42 ? 1 : 0; });

  // a portal: dark core (normal blend) + swirling violet ring (additive), as viewmodel or world sprites
  function portal(parent, size) {
    const core = new T.Sprite(new T.SpriteMaterial({ map: coreTex(), color: BLACK, transparent: true, depthWrite: false }));
    const ring = new T.Sprite(new T.SpriteMaterial({ map: ringTex(), color: VIOLET, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    core.renderOrder = 6; ring.renderOrder = 7;
    const g = new T.Group(); g.add(core); g.add(ring); parent.add(g);
    g.userData = { core, ring, size };
    return g;
  }
  function setPortal(g, k, time) {
    const s = Math.max(0.001, g.userData.size * k);
    g.userData.core.scale.set(s * 0.8, s * 0.8, 1);
    g.userData.ring.scale.set(s, s, 1);
    g.userData.ring.material.rotation = -time * 4;
    g.userData.ring.material.opacity = Math.min(1, k * 1.5);
    g.visible = k > 0.01;
  }

  function blade() {
    const o = { voxel: 0.0042, grip: 'guard', pommel: true, glow: 0.25, haloPx: 1.6 };
    o.depth = (r) => (r > o.guardRow + 7 ? 1.3 : r >= o.guardRow - 6 ? 3.2 : 2.4);
    return SO.Voxel.build('weapons/vazio_lamina', o);
  }

  CW.reg.void = {
    slot: 0,
    oneHand: true,
    restR: { p: [0.26, -0.2, -0.62], a: 0.48, f: 0.55, roll: 0 },
    gripR: -0.02,

    build(vm) {
      const right = blade();
      if (!right) return null;
      right.userData.halo.material.color.setHex(VIOLET);
      const s = { right, motes: new CW.Motes(vm.scene, 220), acc: 0, fired: {}, shards: [] };
      s.flame = CW.flameOn(right, { color: DEEP, soft: VIOLET, width: 0.12, cells: [12, 120], speed: 0.8, wild: 1.4, reach: 0.15 });
      // drifting void shards around the blade
      const tex = CW.artTex('void-shard', SHARD);
      for (let i = 0; i < 11; i++) {
        const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, color: i % 2 ? 0x8a40e0 : 0x5a1ab0, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
        sp.renderOrder = 6; vm.scene.add(sp);
        s.shards.push({ sp, k: 0.12 + (i * 0.083) % 0.85, a: i * 1.7, r: 0.035 + (i % 3) * 0.012, sp0: 0.6 + (i % 5) * 0.15 });
      }
      // charm on a short chain from the guard
      s.chainG = new T.Group(); vm.scene.add(s.chainG);
      s.links = CW.chainMeshes('weapons/almas_elo', 4, 0.0034, s.chainG);
      s.rope = new CW.Rope(5, 0.11);
      s.charm = SO.Voxel.build('weapons/vazio_cristal', { voxel: 0.0034, grip: 0.95, depth: 1.6, glow: 0.4 });
      if (s.charm) { s.chainG.add(s.charm); if (s.charm.userData.halo) s.charm.userData.halo.material.color.setHex(VIOLET); }
      s.trail = new CW.Trail(vm.scene, { color: 0x5a14b0, core: PALE, life: 0.075, width: 0.45 });
      s.guardPortal = portal(vm.scene, 0.1);
      s.handPortal = portal(vm.scene, 0.42);
      s.runes = RUNES.map((rows, i) => { const sp = new T.Sprite(new T.SpriteMaterial({ map: CW.artTex('void-rune' + i, rows), color: VIOLET, transparent: true, depthWrite: false, blending: T.AdditiveBlending })); sp.renderOrder = 7; vm.scene.add(sp); sp.visible = false; return sp; });
      return s;
    },

    update(vm, s, dt, ctx) {
      const insp = ctx.inspect, ud = s.right.userData;
      const base = ud.base.getWorldPosition(new T.Vector3()), tip = ud.tip.getWorldPosition(new T.Vector3());
      const pom = ud.pommel.getWorldPosition(new T.Vector3());
      const beat = insp < 0 ? 0 : insp < 0.25 ? 1 : insp < 0.5 ? 2 : insp < 0.76 ? 3 : insp < 0.95 ? 4 : 0;
      // smoke
      s.flame.uniforms.uTime.value = ctx.time;
      const fk = ctx.swing ? 1.2 : beat === 1 ? 1.3 : beat === 3 ? 0.4 : beat === 4 ? 1.5 : 0.85;
      s.flame.uniforms.uK.value += (fk - s.flame.uniforms.uK.value) * (1 - Math.exp(-8 * dt));
      // shards: orbit the blade calmly; beat 3 they burst off the steel; beat 4 they get sucked back
      const axis = tip.clone().sub(base).normalize();
      const side = new T.Vector3(0, 0, 1).cross(axis).normalize(), up2 = axis.clone().cross(side);
      s.shards.forEach((h, i) => {
        h.a += dt * h.sp0 * (beat === 3 ? 0.4 : 1.6);
        let r = h.r, along = h.k;
        if (beat === 3) r = h.r + Math.min(0.1, (insp - 0.5) * 0.8) * (1 + (i % 4) * 0.25);
        if (beat === 4) r = h.r * Math.max(0, 1 - (insp - 0.76) * 6) + 0.005;
        const pos = base.clone().lerp(tip, along).addScaledVector(side, Math.cos(h.a) * r).addScaledVector(up2, Math.sin(h.a) * r);
        h.sp.position.copy(pos);
        const sz = (beat === 3 ? 0.045 : 0.02) * (0.8 + (i % 3) * 0.2);
        h.sp.scale.set(sz, sz, 1);
        h.sp.material.rotation = h.a * 0.5;
      });
      // the blade itself breaks apart on beat 3 (its glow fades, the shards carry the light)
      ud.glowMesh.visible = beat !== 3 || Math.sin(ctx.time * 40) > 0.3;
      ud.halo.material.opacity = (beat === 3 ? 0.1 : beat === 4 ? 0.5 : 0.25) + Math.sin(ctx.time * 2.5) * 0.04;
      // guard portal opens on beat 2; a big one at the hand on beat 4
      const gp = base.clone().lerp(pom, 0.12);
      s.guardPortal.position.copy(gp).add(new T.Vector3(0, 0, 0.02));
      setPortal(s.guardPortal, beat === 2 ? Math.min(1, (insp - 0.25) * 10) : 0.15 + Math.sin(ctx.time * 3) * 0.05, ctx.time);
      s.handPortal.position.copy(base).add(new T.Vector3(-0.1, 0.1, -0.2));
      const hk = beat === 4 ? Math.sin(Math.min(1, (insp - 0.76) / 0.19) * PI) : 0;
      setPortal(s.handPortal, hk, ctx.time);
      // runes hover around the fractured blade
      s.runes.forEach((sp, i) => {
        sp.visible = beat === 3;
        if (!sp.visible) return;
        const a = i * 2.1 + ctx.time * 0.6;
        sp.position.copy(base.clone().lerp(tip, 0.4 + i * 0.12)).add(new T.Vector3(Math.cos(a) * 0.09 - 0.05, Math.sin(a * 1.3) * 0.04, 0.04));
        sp.scale.set(0.05, 0.05, 1);
        sp.material.opacity = 0.6 + Math.sin(ctx.time * 8 + i) * 0.3;
      });
      // motes of violet dust sliding off the edge
      s.acc += dt * (ctx.swing ? 30 : beat ? 22 : 6);
      while (s.acc >= 1) {
        s.acc -= 1;
        s.motes.emit({ pos: base.clone().lerp(tip, Math.random()), vel: new T.Vector3((Math.random() - 0.5) * 0.06, -0.02 + Math.random() * 0.06, (Math.random() - 0.5) * 0.04), life: 0.5 + Math.random() * 0.5, size: 0.01, size1: 0.003, color: Math.random() < 0.6 ? VIOLET : PALE, opacity: 1, tex: CW.dotTex(), drag: 1, curl: 0.5, fadeIn: 0.05 });
      }
      s.motes.update(dt, ctx.time);
      s.trail.update(dt, s.right, ctx.trailOn(ctx.swing ? ctx.swing.trail : null));
      // charm chain
      s.rope.step(Math.min(dt, 1 / 30), gp, null, 9);
      CW.layChain(s.links, s.rope);
      if (s.charm) { const a = s.rope.p[s.rope.n - 2], b = s.rope.p[s.rope.n - 1]; s.charm.position.copy(b); s.charm.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), a.clone().sub(b).normalize()); }
    },

    clips: {
      void_a1: { trail: [0.14, 0.62], R: [K(0.15, [0.42, 0.0, -0.52], -0.9, 0.3, 0), K(0.32, [0.15, -0.12, -0.66], 0.9, 0.3, 0), K(0.5, [-0.18, -0.32, -0.6], 2.3, 0.35, 0, 'out'), K(0.7, [-0.22, -0.35, -0.58], 2.45, 0.35, 0), R(1)] },
      void_a2: { trail: [0.14, 0.62], R: [K(0.15, [-0.25, -0.36, -0.55], 2.6, 0.3, PI), K(0.32, [0.02, -0.15, -0.68], 0.9, 0.3, PI), K(0.5, [0.36, 0.0, -0.56], -0.9, 0.35, PI, 'out'), K(0.7, [0.4, 0.02, -0.55], -1.05, 0.35, PI), R(1)] },
      void_a3: { trail: [0.3, 0.55], R: [K(0.18, [0.3, -0.16, -0.42], 0.25, 1.15, 0), K(0.42, [0.06, -0.14, -0.98], 0.08, 1.4, 0, 'out'), K(0.7, [0.08, -0.15, -0.92], 0.08, 1.4, 0), R(1)] },
      void_h: { trail: [0.36, 0.66], R: [K(0.3, [0.18, 0.12, -0.45], 0.2, -0.75, PI / 2, 'stop'), K(0.55, [0.08, -0.3, -0.72], -0.05, 1.15, PI / 2, 'out'), K(0.8, [0.08, -0.31, -0.7], -0.05, 1.18, PI / 2), R(1)] },
    },

    swing(F, e, view) {
      const o = { pos: view.eye, yaw: view.yaw, pitch: view.pitch * 0.85, color: 0x4a10a0, core: PALE, wisp: 0.7, cells: [120, 6], alpha: 0.5 };
      if (e.step === 0) CW.slashArc(F, Object.assign(o, { roll: 30, radius: 1.6, width: 0.3, arc: 2.5, dur: 0.22 }));
      else if (e.step === 1) CW.slashArc(F, Object.assign(o, { roll: 210, radius: 1.6, width: 0.3, arc: 2.5, dur: 0.22 }));
      else if (e.step === 'h') setTimeout(() => CW.slashArc(F, Object.assign(o, { roll: 90, radius: 2.0, width: 0.45, arc: 2.6, dur: 0.32, alpha: 0.7 })), 250);
    },
    hit(F, e) {
      F.fx.burst(e.x, e.y, e.z, 12, 8, VIOLET, 0.28, 0.22, 0, { dir: new T.Vector3(e.dx, e.dy + 0.3, e.dz) });
      F.fx.blood(e.x, e.y, e.z, new T.Vector3(e.dx, e.dy + 0.3, e.dz), 0.9);
      worldShards(F, e.x, e.y, e.z, 5, 0.6);
      F.flash(e.x, e.y, e.z, VIOLET, 3, 0.12);
    },

    inspect: {
      dur: 4.4,
      R: [
        K(0.12, [0.12, -0.12, -0.56], 0.5, 0.2, 0, 'out'),
        K(0.24, [0.11, -0.11, -0.56], 0.45, 0.22, 0.6),
        K(0.36, [0.0, -0.13, -0.48], 0.95, 0.25, 0),
        K(0.48, [0.0, -0.13, -0.48], 0.9, 0.28, 0.35),
        K(0.58, [0.1, -0.1, -0.58], 0.12, 0.15, 0),
        K(0.74, [0.1, -0.1, -0.58], 0.1, 0.16, -0.4),
        K(0.84, [0.2, -0.22, -0.55], 0.6, 0.35, 0, 'out'),
        K(0.94, [0.2, -0.22, -0.55], 0.62, 0.38, 0),
        R(1),
      ],
    },

    dispose(vm, s) {
      s.motes.clear(); s.trail.dispose(vm.scene);
      for (const h of s.shards) vm.scene.remove(h.sp);
      for (const r of s.runes) vm.scene.remove(r);
      vm.scene.remove(s.chainG); vm.scene.remove(s.guardPortal); vm.scene.remove(s.handPortal);
    },
  };

  // black glass shards thrown into the world (normal blending: they are darkness, not light)
  function worldShards(F, x, y, z, n, speed) {
    const tex = CW.artTex('void-shard', SHARD);
    for (let i = 0; i < n; i++) {
      const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, color: 0x12041f, transparent: true, depthWrite: false }));
      const v = new T.Vector3((Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4).multiplyScalar(speed);
      sp.position.set(x, y, z); F.add(sp);
      const s0 = 0.15 + Math.random() * 0.2;
      F.spawn((dt, age) => { sp.position.addScaledVector(v, dt); v.y -= 4 * dt; sp.material.rotation += dt * 5; const k = 1 - age / 0.7; sp.scale.set(s0 * k, s0 * k, 1); if (age < 0.7) return true; sp.material.dispose(); return false; }, [sp]);
    }
  }
  function worldPortal(F, x, y, z, size, dur) {
    const g = portal(F.scene, size);
    g.position.set(x, y, z);
    F.spawn((dt, age) => { setPortal(g, Math.sin(Math.min(1, age / dur) * PI), F.t); if (age < dur) return true; g.children.forEach((c) => c.material.dispose()); return false; }, [g]);
  }

  // portal stab: a portal where you were, one where you come out
  AFX.vfx['cw_void:step'] = (F, e) => {
    worldPortal(F, e.x, e.y + 1.2, e.z, 2.2, 0.45);
    worldPortal(F, e.x2, e.y2 + 1.2, e.z2, 1.6, 0.35);
    worldShards(F, e.x, e.y + 1.2, e.z, 6, 0.8);
  };

  // the rift: a jagged tear along the ground, violet at the lips and black inside, shards
  // lifting off it while it drags enemies in; then it snaps shut
  AFX.effect.cw_rift = {
    build(F, fx) {
      const len = fx.len, pts = [];
      for (let i = 0; i <= 22; i++) pts.push([i / 22 * len, (Math.random() - 0.5) * 0.5 * Math.sin(i / 22 * PI)]);
      const mk = (wid, col, blend) => {
        const pos = [], idx = [];
        pts.forEach(([u, off], i) => { const w = wid * Math.sin(Math.max(0.08, i / 22) * PI) * (0.7 + Math.random() * 0.6); pos.push(off - w, 0, -u, off + w, 0, -u); if (i < 22) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); } });
        const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setIndex(idx);
        return new T.Mesh(g, new T.MeshBasicMaterial({ color: col, transparent: true, depthWrite: false, blending: blend, side: T.DoubleSide }));
      };
      const lips = mk(0.55, VIOLET, T.AdditiveBlending), core = mk(0.32, BLACK, T.NormalBlending);
      core.position.y = 0.03; lips.position.y = 0.02;
      const root = new T.Group(); root.add(lips); root.add(core);
      root.position.set(fx.x, fx.y + 0.02, fx.z);
      root.rotation.y = Math.atan2(-fx.dx, -fx.dz);
      F.add(root);
      return { root, lips, core };
    },
    update(F, v, fx) {
      const open = Math.min(1, fx.t / 0.18), shut = fx.t > 0.55 ? Math.max(0, 1 - (fx.t - 0.55) / 0.2) : 1;
      v.root.scale.set(open * shut + 0.02, 1, Math.min(1, fx.t / 0.12));
      v.lips.material.opacity = 0.8 + Math.sin(F.t * 30) * 0.2;
      if (fx.t < 0.55 && Math.random() < 0.6) {
        const u = Math.random() * fx.len;
        worldShards(F, fx.x + fx.dx * u, fx.y + 0.2, fx.z + fx.dz * u, 1, 0.5);
        F.fx.glowP.emit(fx.x + fx.dx * u, fx.y + 0.1, fx.z + fx.dz * u, 0, 2 + Math.random() * 2, 0, 0.6, 0.25, 1, 0.12, 0.4, 0, 1);
      }
    },
    end(F, v) { F.remove(v.root); v.root.traverse((o) => { if (o.material) { o.material.dispose(); o.geometry.dispose(); } }); return 0; },
  };
  AFX.vfx['cw_rift:implode'] = (F, e) => {
    for (let i = 0; i <= 6; i++) {
      const u = i / 6 * e.len, x = e.x + e.dx * u, z = e.z + e.dz * u;
      F.fx.burst(x, e.y + 0.6, z, 6, 7, VIOLET, 0.4, 0.3, 0);
      worldShards(F, x, e.y + 0.6, z, 2, 1.2);
    }
    F.flash(e.x + e.dx * e.len * 0.5, e.y + 1, e.z + e.dz * e.len * 0.5, VIOLET, 8, 0.25);
    F.kick(4);
  };
})(window.SO = window.SO || {});
