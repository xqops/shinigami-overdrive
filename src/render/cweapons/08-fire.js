// 08 CORPO DE FOGO — "Lança Ígnea": a spear whose blade is a living flame, held in both hands.
// The flame licks and roars, sparks stream off it. Inspect (author's sheet): the flame blade
// lit; it surges taller; rings of fire begin to coil around the spear; the coils swell into a
// whirling inferno around the hands.
(function (SO) {
  'use strict';
  const T = THREE, CW = SO.CharWeapons, AFX = SO.AFX, PI = Math.PI;
  const K = (t, p, a, f, roll, ease) => ({ t, p, a, f, roll, ease: ease || 'inout' });
  const R = (t) => ({ t, rest: true, ease: 'inout' });
  const HOT = 0xfff0b0, GOLDF = 0xffc030, ORANGE = 0xff6a10, RED = 0xd82808;

  CW.reg.fire = {
    slot: 0,
    restR: { p: [0.25, -0.3, -0.6], a: 0.42, f: 0.6, roll: 0 },
    gripR: 0, gripL2: 0.25,
    freeClips: { fire_a3: 1 },

    build(vm) {
      const right = SO.Voxel.build('weapons/fogo_lanca', { voxel: 0.0048, grip: 0.3, glow: 0.4, haloPx: 2.2, depth: (r) => (r > 120 ? 2.4 : 1.6) });
      if (!right) return null;
      right.userData.halo.material.color.setHex(ORANGE);
      // the trail and flame run along the fire blade (tip of the sprite to the guard)
      const VX = 0.0048, gripRow = Math.floor(222 * 0.3);
      right.userData.tip.position.set(0, (222 - gripRow) * VX, 0);
      right.userData.base.position.set(0, (222 - gripRow - 96) * VX, 0);
      const s = { right, motes: new CW.Motes(vm.scene, 340), acc: 0, coil: 0 };
      s.flame = CW.flameOn(right, { color: RED, soft: GOLDF, width: 0.13, cells: [14, 110], speed: 1.8, wild: 1.4, reach: 0.45 });
      s.trail = new CW.Trail(vm.scene, { color: 0xc02a04, core: HOT, life: 0.14, width: 0.9 });
      return s;
    },

    update(vm, s, dt, ctx) {
      const insp = ctx.inspect, ud = s.right.userData;
      const beat = insp < 0 ? 0 : insp < 0.24 ? 1 : insp < 0.48 ? 2 : insp < 0.72 ? 3 : insp < 0.95 ? 4 : 0;
      const tip = ud.tip.getWorldPosition(new T.Vector3()), base = ud.base.getWorldPosition(new T.Vector3());
      const pom = ud.pommel.getWorldPosition(new T.Vector3());
      // the flame: tall and wild when swinging or in the show
      const fk = beat === 2 ? 1.5 : beat >= 3 ? 1.7 : ctx.swing ? 1.35 : 1.0;
      s.flame.uniforms.uTime.value = ctx.time;
      s.flame.uniforms.uK.value += (fk - s.flame.uniforms.uK.value) * (1 - Math.exp(-8 * dt));
      s.flame.uniforms.uWild.value = 1 + s.flame.uniforms.uK.value * 0.4;
      ud.halo.material.opacity = 0.32 + Math.sin(ctx.time * 9) * 0.05 + (beat >= 2 ? 0.15 : 0);
      // sparks streaming up off the blade
      s.acc += dt * (beat >= 2 ? 40 : ctx.swing ? 30 : 14);
      while (s.acc >= 1) { s.acc -= 1; s.motes.emit({ pos: base.clone().lerp(tip, Math.random()), vel: new T.Vector3((Math.random() - 0.5) * 0.1, 0.15 + Math.random() * 0.2, (Math.random() - 0.5) * 0.06), life: 0.5 + Math.random() * 0.5, size: 0.008, size1: 0.002, color: Math.random() < 0.5 ? GOLDF : HOT, opacity: 1, tex: CW.dotTex(), drag: 0.5, curl: 2, fadeIn: 0.05 }); }
      // coils of fire spiralling around the spear (beats 3 and 4)
      if (beat >= 3) {
        const wide = beat === 4 ? 0.26 : 0.11, n = beat === 4 ? 12 : 6;
        s.coil += dt;
        for (let i = 0; i < n; i++) {
          const h = (s.coil * 0.9 + i / n) % 1;
          const a = s.coil * 6 + i * 2.1 + h * 8;
          const c = pom.clone().lerp(tip, h);
          const pos = c.add(new T.Vector3(Math.cos(a) * wide * (0.6 + h * 0.6), 0, Math.sin(a) * wide * 0.6 * (0.6 + h * 0.6)));
          s.motes.emit({ pos, vel: new T.Vector3(0, 0.08, 0), life: 0.4, size: beat === 4 ? 0.075 : 0.05, size1: 0.02, color: Math.random() < 0.15 ? GOLDF : Math.random() < 0.55 ? ORANGE : RED, opacity: 0.85, drag: 2, fadeIn: 0.02 });
        }
      }
      s.motes.update(dt, ctx.time);
      s.trail.update(dt, s.right, ctx.trailOn(ctx.swing ? ctx.swing.trail : null));
    },

    clips: {
      fire_a1: { trail: [0.22, 0.55], R: [K(0.2, [0.3, -0.2, -0.38], 0.3, 1.2, 0), K(0.42, [0.06, -0.14, -0.98], 0.08, 1.42, 0, 'out'), K(0.68, [0.08, -0.15, -0.94], 0.08, 1.42, 0), R(1)] },
      fire_a2: { trail: [0.2, 0.66], R: [K(0.2, [-0.2, -0.1, -0.55], 1.3, 0.35, PI), K(0.4, [0.05, -0.18, -0.7], -0.2, 0.35, PI), K(0.58, [0.42, -0.28, -0.6], -1.9, 0.35, PI, 'out'), K(0.76, [0.44, -0.3, -0.58], -2.05, 0.35, PI), R(1)] },
      fire_a3: { trail: [0.12, 0.8], R: [K(0.12, [0.05, -0.14, -0.85], 0, 0.15, 0), K(0.36, [0.05, -0.14, -0.85], 1.5 * PI, 0.15, 0), K(0.6, [0.05, -0.14, -0.85], 3 * PI, 0.15, 0), K(0.8, [0.05, -0.14, -0.85], 4 * PI, 0.15, 0), R(1)] },
      fire_h: { trail: [0.1, 0.6], R: [K(0.12, [0.18, -0.22, -0.4], 0.15, 1.3, 0, 'stop'), K(0.3, [0.06, -0.15, -1.0], 0.05, 1.45, 0, 'out'), K(0.65, [0.07, -0.15, -0.98], 0.05, 1.45, 0), R(1)] },
    },

    swing(F, e, view) {
      const o = { pos: view.eye, yaw: view.yaw, pitch: view.pitch * 0.85, color: 0xa02404, core: HOT, wisp: 0.9, cells: [110, 7], alpha: 0.6 };
      if (e.step === 1) setTimeout(() => CW.slashArc(F, Object.assign(o, { roll: 180, radius: 2.0, width: 0.5, arc: 2.5, dur: 0.24 })), 60);
      else if (e.step === 0) setTimeout(() => thrustFlame(F, view, 5), 50);
    },
    hit(F, e) {
      const dir = new T.Vector3(e.dx, e.dy + 0.4, e.dz);
      F.fx.burst(e.x, e.y, e.z, 16, 8, ORANGE, 0.35, 0.3, -2, { dir });
      F.fx.burst(e.x, e.y, e.z, 6, 5, HOT, 0.25, 0.2, 0, { dir });
      F.fx.blood(e.x, e.y, e.z, dir, 0.9);
      F.flash(e.x, e.y, e.z, ORANGE, 4, 0.12);
    },

    inspect: {
      dur: 4.6,
      R: [
        K(0.12, [0.16, -0.22, -0.56], 0.3, 0.3, 0),
        K(0.24, [0.16, -0.22, -0.56], 0.32, 0.32, 0.3),
        K(0.36, [0.2, -0.32, -0.64], 0.45, 0.45, 0),
        K(0.48, [0.2, -0.32, -0.64], 0.42, 0.45, 0.4),
        K(0.72, [0.2, -0.33, -0.66], 0.4, 0.42, 1.2),
        K(0.93, [0.2, -0.33, -0.66], 0.4, 0.42, 2.0),
        R(1),
      ],
    },

    dispose(vm, s) { s.motes.clear(); s.trail.dispose(vm.scene); },
  };

  // the thrust leaves a jet of flame along the stab
  function thrustFlame(F, view, len) {
    const f = new T.Vector3(-Math.sin(view.yaw) * Math.cos(view.pitch), Math.sin(view.pitch), -Math.cos(view.yaw) * Math.cos(view.pitch));
    const o = view.eye.clone().add(new T.Vector3(0, -0.25, 0));
    for (let i = 0; i < 26; i++) {
      const u = 0.8 + Math.random() * len;
      const p = o.clone().addScaledVector(f, u);
      F.fx.glowP.emit(p.x + (Math.random() - 0.5) * 0.3, p.y + (Math.random() - 0.5) * 0.3, p.z + (Math.random() - 0.5) * 0.3, f.x * 6, f.y * 6 + 1, f.z * 6, 1, 0.35 + Math.random() * 0.4, 0.05, 0.25 + (1 - u / len) * 0.2, 0.25, -2, 4);
    }
  }
  AFX.status['cw_fire:burn'] = AFX.status['fire_1:burn'];
  // the ring of fire thrown by the spin
  AFX.vfx['cw_fire:ring'] = (F, e) => {
    for (let i = 0; i < 48; i++) {
      const a = i / 48 * PI * 2;
      F.fx.glowP.emit(e.x + Math.cos(a) * 2.2, e.y + 0.25, e.z + Math.sin(a) * 2.2, Math.cos(a) * 9, 1 + Math.random() * 1.5, Math.sin(a) * 9, 1, 0.35 + Math.random() * 0.4, 0.05, 0.16, 0.4, -1, 3);
    }
    F.flash(e.x, e.y + 1, e.z, ORANGE, 6, 0.2);
  };
  // the charge: a comet of flame between where you were and where you stopped
  AFX.vfx['cw_fire:charge'] = (F, e, mine) => {
    const n = 30;
    for (let i = 0; i < n; i++) {
      const u = i / n, x = e.x + (e.x2 - e.x) * u, z = e.z + (e.z2 - e.z) * u, y = e.y + (e.y2 - e.y) * u;
      F.fx.glowP.emit(x + (Math.random() - 0.5) * 0.8, y + 0.4 + Math.random() * 1.6, z + (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 2, 2 + Math.random() * 2, (Math.random() - 0.5) * 2, 1, 0.3 + Math.random() * 0.5, 0.05, 0.5, 0.5, -2, 2);
    }
    F.flash(e.x2, e.y2 + 1, e.z2, ORANGE, 8, 0.25);
    if (mine) { F.kick(5); F.spawn((dt, age) => { F.atmo({ grade: ORANGE, gradeAmt: 0.25 * (1 - age / 0.4) }); return age < 0.4; }); }
  };
  // the trail of fire on the floor
  AFX.effect.cw_firetrail = {
    build(F, fx) {
      const g = new T.Group();
      g.position.set(fx.x, fx.y + 0.05, fx.z);
      g.rotation.y = Math.atan2(-fx.dx, -fx.dz);
      const scorch = new T.Mesh(new T.PlaneGeometry(1.6, fx.len).rotateX(-PI / 2).translate(0, 0, -fx.len / 2), new T.MeshBasicMaterial({ color: 0x1a0602, transparent: true, opacity: 0.7, depthWrite: false }));
      g.add(scorch);
      F.add(g);
      return { root: g, scorch, acc: 0 };
    },
    update(F, v, fx, dt) {
      const k = Math.min(1, (fx.dur - fx.t) / 0.6);
      v.scorch.material.opacity = 0.7 * k;
      v.acc += dt * 40 * k;
      while (v.acc >= 1) {
        v.acc -= 1;
        const u = Math.random() * fx.len, side = (Math.random() - 0.5) * 1.4;
        const x = fx.x + fx.dx * u - fx.dz * side, z = fx.z + fx.dz * u + fx.dx * side;
        F.fx.glowP.emit(x, fx.y + 0.1, z, 0, 2 + Math.random() * 2.5, 0, 1, 0.3 + Math.random() * 0.5, 0.05, 0.3 + Math.random() * 0.3, 0.45, -1, 2);
      }
    },
    end(F, v) { v.root.traverse((o) => { if (o.material) { o.material.dispose(); o.geometry.dispose(); } }); return 0; },
  };
})(window.SO = window.SO || {});
