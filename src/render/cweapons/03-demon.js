// 03 EXPLOSÃO DEMONÍACA — "Canhão Ritual": a spiked iron cannon swung like a club with both hands.
// Lava breathes in its cracks, embers rise off it, a chain with a bell and an ofuda swings under
// the barrel. Inspect (author's sheet): held low; turned so the seal on its side ignites; brought
// close across the view with the cracks burning hot; the muzzle erupts and a seal of fire turns
// in the air above it.
(function (SO) {
  'use strict';
  const T = THREE, CW = SO.CharWeapons, AFX = SO.AFX, PI = Math.PI;
  const K = (t, p, a, f, roll, ease) => ({ t, p, a, f, roll, ease: ease || 'inout' });
  const R = (t) => ({ t, rest: true, ease: 'inout' });
  const HOT = 0xfff0a0, ORANGE = 0xff8a1a, RED = 0xd8200a, EMBER = 0xff5a10;

  // a seal of fire: rune ring with spokes (pixel texture)
  const sealTex = () => CW.pixelTex('demon-seal', 48, (x, y, s) => {
    const dx = (x + 0.5) / s - 0.5, dy = (y + 0.5) / s - 0.5, r = Math.sqrt(dx * dx + dy * dy) * 2, a = Math.atan2(dy, dx);
    if (r > 1) return 0;
    if (r > 0.88) return 1;
    if (r > 0.74 && r < 0.8) return (Math.sin(a * 24) > 0.2) ? 1 : 0; // rune band
    if (r > 0.55 && r < 0.6) return 1;
    if (Math.abs(Math.sin(a * 4)) < 0.08 && r < 0.74) return 1; // spokes
    if (r < 0.14) return 1;
    return 0;
  });

  function cannon() {
    const o = { voxel: 0.0055, grip: 0.13, glow: 0.32, haloPx: 1.4 };
    o.depth = (r) => (r < 40 ? 2.6 : 7);
    return SO.Voxel.build('weapons/demonio_canhao', o);
  }

  function fireBurst(motes, pos, dir, n, spd, size) {
    for (let i = 0; i < n; i++) {
      const v = dir.clone().multiplyScalar(spd * (0.5 + Math.random())).add(new T.Vector3((Math.random() - 0.5), (Math.random() - 0.3), (Math.random() - 0.5)).multiplyScalar(spd * 0.6));
      motes.emit({ pos: pos.clone(), vel: v, life: 0.35 + Math.random() * 0.4, size: size * (0.6 + Math.random() * 0.6), size1: size * 2.2, color: Math.random() < 0.3 ? HOT : Math.random() < 0.6 ? ORANGE : RED, opacity: 0.9, drag: 3, up: 0.4, curl: 1.5, fadeIn: 0.03 });
    }
  }

  CW.reg.demon = {
    slot: 0,
    restR: { p: [0.24, -0.3, -0.52], a: 0.8, f: 0.95, roll: 0 },
    gripR: 0, gripL2: 0.2,
    freeClips: {},

    build(vm) {
      const right = cannon();
      if (!right) return null;
      right.userData.halo.material.color.setHex(ORANGE);
      const s = { right, motes: new CW.Motes(vm.scene, 280), acc: 0, fired: {} };
      // where the chain hangs from (a ring on the barrel)
      s.hook = new T.Object3D(); s.hook.position.set(0.05, 0.42, 0.01); right.add(s.hook);
      s.muzzle = right.userData.tip;
      s.chainG = new T.Group(); vm.scene.add(s.chainG);
      s.links = CW.chainMeshes('weapons/almas_elo', 7, 0.0038, s.chainG);
      s.rope = new CW.Rope(8, 0.2);
      s.bell = SO.Voxel.build('weapons/demonio_sino', { voxel: 0.0042, grip: 0.95, depth: 4 });
      s.tag = SO.Voxel.build('weapons/almas_ofuda', { voxel: 0.0032, grip: 0.97, depth: 0.8 });
      if (s.bell) s.chainG.add(s.bell);
      if (s.tag) s.chainG.add(s.tag);
      s.trail = new CW.Trail(vm.scene, { color: 0xa82008, core: ORANGE, life: 0.12, width: 0.5 });
      s.seal = new T.Sprite(new T.SpriteMaterial({ map: sealTex(), color: ORANGE, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
      s.seal.renderOrder = 7; s.seal.visible = false; vm.scene.add(s.seal);
      return s;
    },

    update(vm, s, dt, ctx) {
      const insp = ctx.inspect, ud = s.right.userData;
      const beat = insp < 0 ? 0 : insp < 0.24 ? 1 : insp < 0.5 ? 2 : insp < 0.74 ? 3 : insp < 0.95 ? 4 : 0;
      const tip = s.muzzle.getWorldPosition(new T.Vector3()), base = ud.base.getWorldPosition(new T.Vector3());
      const axis = tip.clone().sub(base).normalize();
      // lava breathing in the cracks
      const heat = beat === 2 ? 0.75 : beat === 3 ? 0.9 : beat === 4 ? 1.1 : ctx.swing ? 0.6 : 0.32;
      ud.halo.material.opacity = heat * (0.85 + Math.sin(ctx.time * 5) * 0.15);
      // embers rising off the barrel
      s.acc += dt * (8 + heat * 30);
      while (s.acc >= 1) {
        s.acc -= 1;
        s.motes.emit({ pos: base.clone().lerp(tip, Math.random() * 0.9).add(new T.Vector3((Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.04, 0)), vel: new T.Vector3((Math.random() - 0.5) * 0.05, 0.12 + Math.random() * 0.15, 0), life: 0.6 + Math.random() * 0.7, size: 0.008, size1: 0.003, color: Math.random() < 0.5 ? ORANGE : HOT, opacity: 1, tex: CW.dotTex(), drag: 0.6, curl: 1.4, fadeIn: 0.05 });
      }
      // swing heat trails off the muzzle end; the heavy shot blasts out of the muzzle
      if (ctx.swing && ctx.swing.name === 'demon_h' && ctx.swing.t >= 0.43 && !s.fired.shot) { s.fired.shot = 1; fireBurst(s.motes, tip, axis, 26, 0.9, 0.05); }
      if (!ctx.swing) s.fired.shot = 0;
      // inspect: the eruption and the seal turning above the muzzle
      if (beat === 4 && !s.fired.erupt) { s.fired.erupt = 1; fireBurst(s.motes, tip, axis, 40, 0.7, 0.06); }
      if (beat !== 4) s.fired.erupt = 0;
      if (beat === 4) fireBurst(s.motes, tip, axis, 2, 0.4, 0.04);
      s.seal.visible = beat === 4;
      if (s.seal.visible) {
        const k = Math.min(1, (insp - 0.74) * 8);
        s.seal.position.copy(tip).addScaledVector(axis, 0.12).add(new T.Vector3(0, 0.08, 0));
        s.seal.scale.set(0.28 * k, 0.28 * k, 1);
        s.seal.material.rotation = ctx.time * 1.5;
        s.seal.material.opacity = 0.9 * Math.min(1, (0.95 - insp) * 12);
      }
      s.motes.update(dt, ctx.time);
      s.trail.update(dt, s.right, ctx.trailOn(ctx.swing ? ctx.swing.trail : null));
      // chain, bell and ofuda under the barrel
      const hook = s.hook.getWorldPosition(new T.Vector3());
      s.rope.step(Math.min(dt, 1 / 30), hook, null, 9);
      CW.layChain(s.links, s.rope);
      const end = s.rope.p[s.rope.n - 1], prev = s.rope.p[s.rope.n - 2];
      const dirDown = prev.clone().sub(end).normalize();
      if (s.bell) { s.bell.position.copy(end); s.bell.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), dirDown); }
      if (s.tag) { const m = s.rope.p[4]; s.tag.position.copy(m).add(new T.Vector3(0.012, -0.02, 0)); s.tag.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), s.rope.p[3].clone().sub(m).normalize()); }
      // the bell rings when it swings hard
      const sp = end.distanceTo(s.lastBell || end) / Math.max(1e-3, dt);
      s.lastBell = end.clone();
      if (sp > 1.6 && SO.game && SO.game.audio && SO.game.audio.ok() && SO.game.audio.every('demonbell', 420)) SO.game.audio.sample('bell', { vol: 0.12, rate: 2.2 });
    },

    clips: {
      demon_a1: { trail: [0.3, 0.7], R: [K(0.25, [0.45, -0.12, -0.45], -1.4, 0.5, 0), K(0.48, [0.05, -0.2, -0.7], 0.4, 0.45, 0), K(0.62, [-0.32, -0.3, -0.55], 1.9, 0.45, 0, 'out'), K(0.8, [-0.34, -0.32, -0.55], 2.0, 0.45, 0), R(1)] },
      demon_a2: { trail: [0.3, 0.7], R: [K(0.25, [-0.3, -0.14, -0.45], 1.6, 0.5, PI), K(0.48, [0.05, -0.22, -0.7], -0.3, 0.45, PI), K(0.62, [0.4, -0.3, -0.55], -1.8, 0.45, PI, 'out'), K(0.8, [0.42, -0.32, -0.55], -1.9, 0.45, PI), R(1)] },
      demon_a3: { trail: [0.32, 0.55], R: [K(0.3, [0.15, 0.15, -0.4], 0.2, -0.9, 0, 'stop'), K(0.5, [0.08, -0.28, -0.75], 0.0, 1.25, 0, 'out'), K(0.75, [0.08, -0.3, -0.73], 0.0, 1.28, 0), R(1)] },
      demon_h: { trail: [2, 2], R: [K(0.3, [0.12, -0.22, -0.5], 0.15, 1.35, 0, 'stop'), K(0.43, [0.12, -0.22, -0.5], 0.15, 1.35, 0, 'stop'), K(0.5, [0.16, -0.1, -0.3], 0.25, 0.85, 0, 'out'), K(0.75, [0.13, -0.2, -0.45], 0.18, 1.25, 0), R(1)] },
    },

    swing(F, e, view) {
      const o = { pos: view.eye, yaw: view.yaw, pitch: view.pitch * 0.85, color: 0x8a1a04, core: HOT, wisp: 0.85, cells: [90, 6], alpha: 0.55 };
      if (e.step === 0) setTimeout(() => CW.slashArc(F, Object.assign(o, { roll: 0, radius: 1.9, width: 0.5, arc: 2.4, dur: 0.26 })), 120);
      else if (e.step === 1) setTimeout(() => CW.slashArc(F, Object.assign(o, { roll: 180, radius: 1.9, width: 0.5, arc: 2.4, dur: 0.26 })), 120);
      else if (e.step === 'h') setTimeout(() => { F.kick(6); F.flash(view.eye.x, view.eye.y, view.eye.z, ORANGE, 6, 0.15); }, 300);
    },
    hit(F, e) {
      const dir = new T.Vector3(e.dx, e.dy + 0.4, e.dz);
      F.fx.burst(e.x, e.y, e.z, 16, 10, ORANGE, 0.35, 0.3, -4, { dir });
      F.fx.burst(e.x, e.y, e.z, 6, 5, HOT, 0.25, 0.2, 0, { dir });
      F.fx.blood(e.x, e.y, e.z, dir, 1.4);
      F.flash(e.x, e.y, e.z, ORANGE, 4, 0.14);
    },

    inspect: {
      dur: 4.6,
      R: [
        K(0.1, [0.2, -0.36, -0.5], 0.95, 0.9, 0),
        K(0.22, [0.2, -0.36, -0.5], 1.0, 0.85, 0.4),
        K(0.34, [0.06, -0.2, -0.52], 0.95, 0.22, 0),
        K(0.48, [0.06, -0.2, -0.52], 0.9, 0.25, 0.3),
        K(0.58, [0.12, -0.1, -0.5], PI / 2, 0.15, 0),
        K(0.72, [0.1, -0.1, -0.5], PI / 2 + 0.08, 0.18, 0.25),
        K(0.79, [0.14, -0.2, -0.5], 0.6, 0.55, 0, 'out'),
        K(0.93, [0.14, -0.21, -0.5], 0.62, 0.58, 0),
        R(1),
      ],
    },

    dispose(vm, s) { s.motes.clear(); s.trail.dispose(vm.scene); vm.scene.remove(s.chainG); vm.scene.remove(s.seal); },
  };

  // ---- world effects ----
  function groundSeal(F, x, y, z, r, dur) {
    const m = new T.Mesh(new T.PlaneGeometry(r * 2, r * 2).rotateX(-PI / 2), new T.MeshBasicMaterial({ map: sealTex(), color: ORANGE, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
    m.position.set(x, y + 0.06, z);
    F.add(m);
    F.spawn((dt, age) => { const k = age / dur; m.rotation.y += dt * 1.2; m.scale.setScalar(0.6 + k * 0.5); m.material.opacity = (1 - k) * 0.95; if (k < 1) return true; m.geometry.dispose(); m.material.dispose(); return false; }, [m]);
  }
  function fireRing(F, x, y, z, r) {
    for (let i = 0; i < 28; i++) {
      const a = i / 28 * PI * 2;
      F.fx.glowP.emit(x + Math.cos(a) * 0.4, y + 0.3, z + Math.sin(a) * 0.4, Math.cos(a) * r * 3, 1.5 + Math.random() * 2, Math.sin(a) * r * 3, 1, 0.45 + Math.random() * 0.3, 0.1, 0.35, 0.45, -2, 3);
    }
  }
  AFX.vfx['cw_demon:slam'] = (F, e) => {
    groundSeal(F, e.x, e.y, e.z, 3.2, 0.8);
    fireRing(F, e.x, e.y, e.z, 3.4);
    F.fx.burst(e.x, e.y + 0.4, e.z, 22, 9, ORANGE, 0.45, 0.4, -6);
    F.flash(e.x, e.y + 1, e.z, ORANGE, 7, 0.2);
    F.kick(4);
  };
  // the magma shell: a molten rock trailing fire
  AFX.spell.cw_demon_shell = {
    build(F, q) {
      const root = new T.Group();
      const rock = new T.Mesh(new T.IcosahedronGeometry(0.32, 0), new T.MeshBasicMaterial({ color: 0x2a0a04 }));
      const glow = new T.Mesh(new T.IcosahedronGeometry(0.42, 1), new T.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false }));
      const core = new T.Mesh(new T.IcosahedronGeometry(0.36, 0), new T.MeshBasicMaterial({ color: HOT, wireframe: true }));
      root.add(rock); root.add(core); root.add(glow);
      return { root, rock, core, glow, own: [rock, glow, core] };
    },
    update(F, v, dt) {
      v.rock.rotation.x += dt * 9; v.core.rotation.y += dt * 7;
      const p = v.root.getWorldPosition(new T.Vector3());
      for (let i = 0; i < 3; i++) F.fx.glowP.emit(p.x + (Math.random() - 0.5) * 0.3, p.y + (Math.random() - 0.5) * 0.3, p.z + (Math.random() - 0.5) * 0.3, 0, 0.8, 0, 1, 0.4 + Math.random() * 0.4, 0.08, 0.3, 0.35, -1, 2);
    },
    dispose(F, v) { for (const m of v.own) { m.geometry.dispose(); m.material.dispose(); } },
    boom(F, e) {
      groundSeal(F, e.x, e.y - 0.5, e.z, 5.5, 1.1);
      fireRing(F, e.x, e.y - 0.3, e.z, 5.5);
      F.fx.burst(e.x, e.y, e.z, 40, 14, ORANGE, 0.6, 0.55, -6);
      F.fx.burst(e.x, e.y, e.z, 20, 8, HOT, 0.4, 0.35, -3);
      F.fx.burst(e.x, e.y, e.z, 18, 6, 0x2a1a14, 0.8, 0.9, -2);
      F.flash(e.x, e.y + 1, e.z, ORANGE, 12, 0.35);
      F.kick(7);
    },
  };
  AFX.status['cw_demon:burn'] = AFX.status['demon:burn']; // the hellfire of the Demonic Explosion school
})(window.SO = window.SO || {});
