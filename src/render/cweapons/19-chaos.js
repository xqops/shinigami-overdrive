// 19 LÂMINAS DO CAOS — "Foices do Caos": two crimson sickles, one in each hand, joined by a long
// chain. Red vapor bleeds off their edges. Inspect (author's sheet): held; the chain is swung and
// the sickles turn on it; they whirl in wide loops leaving red arcs; both spin around the view.
// The heavy flings them out on their chains to whirl around you.
(function (SO) {
  'use strict';
  const T = THREE, CW = SO.CharWeapons, AFX = SO.AFX, PI = Math.PI;
  const K = (t, p, a, f, roll, ease) => ({ t, p, a, f, roll, ease: ease || 'inout' });
  const R = (t) => ({ t, rest: true, ease: 'inout' });
  const RED = 0xff2030, HOT = 0xffb0b0, DEEP = 0x6a0010;

  function sickle() {
    const o = { voxel: 0.0044, grip: 0.42, glow: 0.35, haloPx: 1.6, depth: (r, x) => (x > 14 ? 1.4 : 2.8) };
    const m = SO.Voxel.build('weapons/caos_foice', o);
    if (!m) return null;
    const VX = 0.0044, H = 112, GRIP = Math.floor(112 * 0.42);
    m.userData.base.position.set((14 - 10.5) * VX, (H - 8 - GRIP) * VX, 0);
    m.userData.tip.position.set((42 - 10.5) * VX, (H - 56 - GRIP) * VX, 0);
    return m;
  }

  CW.reg.chaos = {
    slot: 0,
    restR: { p: [0.27, -0.24, -0.56], a: 0.35, f: 0.4, roll: 0 },
    restL: { p: [-0.27, -0.26, -0.56], a: -0.35, f: 0.4, roll: PI },
    gripR: 0, gripL: 0,

    build(vm) {
      const right = sickle(), left = sickle();
      if (!right || !left) return null;
      right.userData.halo.material.color.setHex(RED); left.userData.halo.material.color.setHex(RED);
      const s = { right, left, motes: new CW.Motes(vm.scene, 280), acc: 0 };
      s.chain = new T.Group(); vm.scene.add(s.chain);
      s.links = CW.chainMeshes('weapons/almas_elo', 26, 0.004, s.chain);
      s.rope = new CW.Rope(18, 1.0);
      s.trailR = new CW.Trail(vm.scene, { color: 0x9a0814, core: HOT, life: 0.16, width: 0.8 });
      s.trailL = new CW.Trail(vm.scene, { color: 0x9a0814, core: HOT, life: 0.16, width: 0.8 });
      return s;
    },

    update(vm, s, dt, ctx) {
      const insp = ctx.inspect;
      const beat = insp < 0 ? 0 : insp < 0.24 ? 1 : insp < 0.48 ? 2 : insp < 0.72 ? 3 : insp < 0.95 ? 4 : 0;
      const sw = ctx.swing;
      // thrown for the whirl: the sickles leave the hands
      const away = sw && sw.name === 'chaos_h' && sw.t > 0.08 && sw.t < 0.9;
      s.right.visible = s.left.visible = s.chain.visible = !away;
      for (const m of [s.right, s.left]) m.userData.halo.material.opacity = 0.3 + Math.sin(ctx.time * 5) * 0.05 + (beat >= 3 ? 0.2 : 0);
      // red vapor
      s.acc += dt * (beat >= 3 ? 30 : 8);
      while (s.acc >= 1) {
        s.acc -= 1;
        const m = Math.random() < 0.5 ? s.right : s.left;
        const p = m.userData.base.getWorldPosition(new T.Vector3()).lerp(m.userData.tip.getWorldPosition(new T.Vector3()), Math.random());
        s.motes.emit({ pos: p, vel: new T.Vector3((Math.random() - 0.5) * 0.05, 0.04, 0), life: 0.6, size: 0.012, size1: 0.04, color: Math.random() < 0.5 ? RED : DEEP, opacity: 0.5, drag: 1, curl: 1.4 });
      }
      s.motes.update(dt, ctx.time);
      const showTrail = beat >= 2 && beat <= 4;
      s.trailR.update(dt, s.right, ctx.trailOn(sw ? sw.trail : null) || showTrail);
      s.trailL.update(dt, s.left, ctx.trailOn(sw ? sw.trailL : null) || showTrail);
      // the chain from pommel to pommel
      s.rope.step(Math.min(dt, 1 / 30), s.right.userData.pommel.getWorldPosition(new T.Vector3()), s.left.userData.pommel.getWorldPosition(new T.Vector3()), 9);
      CW.layChain(s.links, s.rope);
    },

    clips: {
      chaos_a1: { trail: [0.12, 0.62], R: [K(0.14, [0.42, -0.02, -0.52], -1.2, 0.35, 0), K(0.32, [0.1, -0.12, -0.66], 0.6, 0.3, 0), K(0.5, [-0.22, -0.3, -0.58], 2.2, 0.3, 0, 'out'), K(0.7, [-0.25, -0.32, -0.56], 2.35, 0.32, 0), R(1)], L: [K(0.3, [-0.3, -0.3, -0.56], -0.9, 0.5, PI), R(1)] },
      chaos_a2: { trailL: [0.12, 0.62], L: [K(0.14, [-0.42, -0.02, -0.52], 1.2, 0.35, PI), K(0.32, [-0.1, -0.12, -0.66], -0.6, 0.3, PI), K(0.5, [0.22, -0.3, -0.58], -2.2, 0.3, PI, 'out'), K(0.7, [0.25, -0.32, -0.56], -2.35, 0.32, PI), R(1)], R: [K(0.3, [0.3, -0.3, -0.56], 0.9, 0.5, 0), R(1)] },
      // the lash: the right sickle flies out on the chain and is yanked back
      chaos_a3: { trail: [0.15, 0.7], R: [K(0.15, [0.3, -0.1, -0.4], 0.4, 0.8, 0), K(0.38, [0.05, -0.12, -1.6], 0.1, 1.4, PI, 'out'), K(0.6, [0.1, -0.15, -1.2], 0.2, 1.3, 2 * PI), K(0.8, [0.25, -0.22, -0.6], 0.35, 0.5, 2 * PI), R(1)], L: [K(0.3, [-0.3, -0.3, -0.56], -0.9, 0.5, PI), R(1)] },
      chaos_h: { trail: [2, 2], R: [K(0.08, [0.16, -0.3, -0.5], 0.2, 1.2, 0, 'out'), K(0.9, [0.16, -0.3, -0.5], 0.2, 1.2, 0), R(1)], L: [K(0.08, [-0.16, -0.3, -0.5], -0.2, 1.2, PI, 'out'), K(0.9, [-0.16, -0.3, -0.5], -0.2, 1.2, PI), R(1)] },
    },

    swing(F, e, view) {
      const o = { pos: view.eye, yaw: view.yaw, pitch: view.pitch * 0.85, color: 0x6a0010, core: HOT, wisp: 0.7, cells: [120, 6], alpha: 0.5 };
      if (e.step === 0) CW.slashArc(F, Object.assign(o, { roll: 20, radius: 1.6, width: 0.3, arc: 2.5, dur: 0.2 }));
      else if (e.step === 1) CW.slashArc(F, Object.assign(o, { roll: 200, radius: 1.6, width: 0.3, arc: 2.5, dur: 0.2 }));
      else if (e.step === 'h') whirl(F, 0.8);
    },
    hit(F, e) {
      const dir = new T.Vector3(e.dx, e.dy + 0.3, e.dz);
      F.fx.burst(e.x, e.y, e.z, 12, 8, RED, 0.25, 0.22, 0, { dir });
      F.fx.blood(e.x, e.y, e.z, dir, 1.5);
      F.flash(e.x, e.y, e.z, RED, 3, 0.1);
    },

    inspect: {
      dur: 4.8,
      R: [
        K(0.12, [0.2, -0.22, -0.56], 0.2, 0.25, 0), K(0.24, [0.2, -0.22, -0.56], 0.25, 0.27, 0.4),
        K(0.36, [0.25, -0.12, -0.6], -0.8, 0.3, 2 * PI), K(0.48, [0.3, -0.25, -0.6], 0.8, 0.3, 4 * PI),
        K(0.6, [0.25, -0.05, -0.62], -1.6, 0.35, 6 * PI), K(0.72, [0.3, -0.3, -0.62], 1.6, 0.35, 8 * PI),
        K(0.84, [0.1, 0.05, -0.65], -2.4, 0.3, 10 * PI), K(0.93, [0.2, -0.2, -0.6], 0.4, 0.35, 12 * PI), R(1),
      ],
      L: [
        K(0.12, [-0.3, -0.34, -0.6], -0.6, 0.5, PI), K(0.36, [-0.3, -0.34, -0.6], -0.6, 0.5, PI),
        K(0.48, [-0.28, -0.12, -0.62], 0.8, 0.3, 3 * PI), K(0.6, [-0.3, -0.3, -0.62], -0.8, 0.35, 5 * PI),
        K(0.72, [-0.25, -0.05, -0.62], 1.6, 0.35, 7 * PI), K(0.84, [-0.1, 0.05, -0.65], 2.4, 0.3, 9 * PI), K(0.93, [-0.2, -0.2, -0.6], -0.4, 0.35, 11 * PI), R(1),
      ],
    },

    dispose(vm, s) { s.motes.clear(); s.trailR.dispose(vm.scene); s.trailL.dispose(vm.scene); vm.scene.remove(s.chain); },
  };

  // the whirl: both sickles orbit the player on their chains, leaving red rings of light
  function whirl(F, dur) {
    const g = new T.Group(); F.add(g);
    const blades = [0, 1].map(() => { const m = sickle(); if (m) { m.scale.setScalar(4); g.add(m); } return m; }).filter(Boolean);
    const trails = blades.map(() => new SO.AFXLib.Trail(F.scene, 24, 0.5, RED, { core: HOT, life: 0.25 }));
    const lines = blades.map(() => { const geo = new T.BufferGeometry().setFromPoints([new T.Vector3(), new T.Vector3()]); const l = new T.Line(geo, new T.LineBasicMaterial({ color: 0xc89040 })); g.add(l); return l; });
    F.spawn((dt, age) => {
      const pl = F.player && F.player.pos;
      if (!pl) return false;
      const k = Math.min(1, age / 0.12) * Math.min(1, (dur - age) / 0.12);
      blades.forEach((m, i) => {
        const a = age * 12 + i * PI, r = 0.6 + k * 3.4;
        const p = new T.Vector3(pl.x + Math.cos(a) * r, pl.y + 1.1 + Math.sin(age * 9 + i) * 0.3, pl.z + Math.sin(a) * r);
        m.position.copy(p); m.rotation.set(0, -a, PI / 2 + age * 20);
        trails[i].push(p, new T.Vector3(0, 1, 0), dt);
        const arr = lines[i].geometry.attributes.position.array; arr[0] = pl.x; arr[1] = pl.y + 1.1; arr[2] = pl.z; arr[3] = p.x; arr[4] = p.y; arr[5] = p.z; lines[i].geometry.attributes.position.needsUpdate = true;
      });
      if (age < dur) return true;
      for (const t of trails) t.dispose(); for (const l of lines) { l.geometry.dispose(); l.material.dispose(); }
      return false;
    }, [g]);
  }
})(window.SO = window.SO || {});
