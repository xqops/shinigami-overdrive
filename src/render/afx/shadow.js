// 14. CLONES SOMBRIOS — the caster's shadow made solid: black bodies with violet rims and smoke.
//   Clone de Ataque: a shadow lunges out of nowhere a beat after your blow and cuts the same targets.
//   Clones Múltiplos: you split into three violet silhouettes that run off leaving smoke.
//   Explosão Sombria: every clone melts into liquid shadow, rushes an enemy and bursts.
//   Exército de Sombras: shades rise from the floor around you, copy every blow, charge together and
//     flow back into you.
(function (SO) {
  'use strict';
  const T = THREE, L = SO.AFXLib, AFX = SO.AFX;
  const VIO = 0x7a3cff, RIM = 0xb88cff, INK = 0x05020a;

  function smoke(F, x, y, z, n, up) {
    // never right in the lens: big dark squares there read as a broken screen
    if (Math.hypot(x - F.cam.position.x, z - F.cam.position.z) < 2.5) return;
    for (let i = 0; i < n; i++) F.fx.inkP.emit(x + (Math.random() - 0.5) * 0.6, y + Math.random() * 1.6, z + (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 1.5, up || 1, (Math.random() - 0.5) * 1.5, 0.08, 0.03, 0.14, 0.35 + Math.random() * 0.3, 0.7, -0.5, 1.2);
  }
  // a living shadow: black body, violet rim light, eyes for the shades
  function shadowBody(F, a, eyes, opacity) {
    const root = new T.Group(), inner = new T.Group(); root.add(inner);
    const ctl = F.model('soldado_sombrio', 1.9, { color: 0x100820, emissive: 0x8a4aff, opacity: opacity == null ? 0.92 : opacity });
    if (ctl) inner.add(ctl.root);
    if (eyes) for (const s of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(0.045, 6, 4), L.solid(0xd0a0ff)); e.position.set(s * 0.08, 1.72, 0.17); inner.add(e); }
    // the puddle it rises out of
    const pool = new T.Mesh(new T.CircleGeometry(0.8, 24).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }));
    pool.position.set(a.pos.x, a.pos.y + 0.04, a.pos.z);
    F.add(pool);
    F.spawn((dt, age) => { pool.scale.setScalar(Math.min(1, age / 0.15) * Math.max(0, 1 - Math.max(0, age - 0.7) / 0.4)); return age < 1.1; }, [pool]);
    return { root, inner, ctl, atk: 0, riseT: 0 };
  }
  function shadowUpdate(F, v, a, dt, rise) {
    v.riseT += dt;
    const k = Math.min(1, v.riseT / (rise || 0.5));
    v.inner.position.y = -1.9 * (1 - k);
    v.root.rotation.y = a.yaw;
    v.atk -= dt;
    if (v.ctl) {
      const sp = Math.hypot(a.vel.x, a.vel.z);
      if (v.atk > 0) v.ctl.play('Attack', { once: true, duration: 0.3 });
      else if (sp > 1) v.ctl.play('Walk', { speed: SO.clamp(sp / 5, 1, 2.6) });
      else v.ctl.play('Idle');
      v.ctl.update(dt);
    }
    // stretched like liquid while dashing
    const dash = a.state === 'dash';
    v.inner.scale.set(dash ? 0.7 : 1, dash ? 0.8 : 1, dash ? 1.8 : 1);
    if (Math.random() < (dash ? 1 : 0.35)) smoke(F, a.pos.x, a.pos.y, a.pos.z, dash ? 3 : 1, 0.8);
  }

  // ---------------- Clone de Ataque ----------------
  AFX.cast.shadow_1 = (F, e, mine) => { if (mine) F.spawn((dt, age) => { F.atmo({ grade: VIO, gradeAmt: 0.15 * (1 - age / 0.5) }); return age < 0.5; }); };
  AFX.vfx['shadow_1:echo'] = (F, e) => {
    // a silhouette flickers in beside the target and repeats the cut
    const ctl = F.model('soldado_sombrio', 1.9, { color: 0x080410, emissive: 0x5a20e0, opacity: 0.8 });
    const a = Math.random() * 6.28;
    if (ctl) {
      ctl.root.position.set(e.x + Math.cos(a) * 1.3, e.y - 1, e.z + Math.sin(a) * 1.3);
      ctl.root.rotation.y = Math.atan2(e.x - ctl.root.position.x, e.z - ctl.root.position.z);
      ctl.play('Attack', { once: true, duration: 0.25 });
      F.add(ctl.root);
      F.spawn((dt, age) => { ctl.update(dt); for (const m of ctl.mats) m.opacity = 0.8 * (1 - age / 0.4); return age < 0.4; }, [ctl.root]);
    }
    F.fx.crescent(new T.Vector3(e.x, e.y, e.z), Math.random() * 6.28, 0, Math.random() * 360, 1.5, VIO, 0.15, false, RIM);
    smoke(F, e.x, e.y - 1, e.z, 10, 1.5);
  };

  // ---------------- Clones Múltiplos ----------------
  AFX.cast.shadow_2 = (F, e, mine) => { if (mine) F.kick(4); };
  AFX.ally.clone = {
    build(F, a) { return shadowBody(F, a, false); },
    update(F, v, a, dt) { shadowUpdate(F, v, a, dt, 0.45); },
    attack(F, e, v) { if (v) v.atk = 0.3; F.fx.crescent(new T.Vector3(e.x, e.y, e.z), Math.random() * 6.28, -0.2, Math.random() * 360, 1.1, VIO, 0.12, false, RIM); },
    hurt(F, e) { smoke(F, e.x, e.y - 1, e.z, 4); },
    end(F, e) { if (e.how !== 'burst') smoke(F, e.x, e.y - 1, e.z, 20, 2); },
  };

  // ---------------- Explosão Sombria ----------------
  AFX.cast.shadow_3 = () => {};
  AFX.vfx['shadow_3:burst'] = (F, e) => {
    // a burst of liquid shadow with a violet shock ring
    for (let i = 0; i < 60; i++) { const a = Math.random() * 6.28, b = (Math.random() - 0.2) * 1.5, sp = 4 + Math.random() * 9; F.fx.inkP.emit(e.x, e.y, e.z, Math.cos(a) * Math.cos(b) * sp, Math.sin(b) * sp, Math.sin(a) * Math.cos(b) * sp, 0.06, 0.02, 0.12, 0.35 + Math.random() * 0.3, 0.6, 10, 1.5); }
    F.fx.burst(e.x, e.y, e.z, 30, 9, VIO, 0.3, 0.4, 0);
    F.fx.ring(e.x, e.y - 0.9, e.z, 0.3, 4.5, VIO, 0.35, 0.95);
    F.flash(e.x, e.y, e.z, VIO, 7, 0.3);
    for (let i = 0; i < 4; i++) F.fx.splat(e.x + (Math.random() - 0.5) * 3, e.y - 1, e.z + (Math.random() - 0.5) * 3, 1.5);
    F.shake(0.12);
  };

  // ---------------- Exército de Sombras ----------------
  AFX.ult.shadow_ult = { start(F, e, mine) { if (mine) { F.shake(0.3); F.R.flashInvert(0.06); } }, end() {} };
  AFX.ally.shade = {
    build(F, a) { return shadowBody(F, a, true, 0.95); },
    update(F, v, a, dt) { shadowUpdate(F, v, a, dt, 0.7); F.atmo({ grade: 0x5020c0, gradeAmt: 0.12, dark: 0.18 }); },
    end(F, e) { smoke(F, e.x, e.y - 1, e.z, 10, 2); },
  };
  AFX.vfx['shadow_ult:slash'] = (F, e) => {
    const v = F.allies[e.id]; if (v) v.atk = 0.3;
    F.fx.crescent(new T.Vector3(e.x, e.y, e.z), Math.random() * 6.28, -0.3, Math.random() * 360, 1.2, VIO, 0.12, false, RIM);
  };
  AFX.vfx['shadow_ult:charge'] = (F, e, mine) => { if (mine) { F.kick(8); F.shake(0.3); } };
  AFX.vfx['shadow_ult:merge'] = (F, e) => {
    // the shade flows back into its caster as a stream of smoke
    const pl = F.player; if (!pl) return;
    const T0 = 0.5;
    for (let i = 0; i < 20; i++) F.fx.inkP.emit(e.x + (Math.random() - 0.5), e.y + (Math.random() - 0.5) * 1.5, e.z + (Math.random() - 0.5), (pl.pos.x - e.x) / T0, (pl.pos.y + 1 - e.y) / T0, (pl.pos.z - e.z) / T0, 0.1, 0.04, 0.2, 0.35, T0, 0, 0);
  };
})(window.SO = window.SO || {});
