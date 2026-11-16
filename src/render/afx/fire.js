// 8. CORPO DE FOGO — the caster's own body burns.
//   Aura Flamejante: flames climb from the bottom of the view and wrap the arms without hiding the aim.
//   Impulso Ígneo: you become a fire bolt — the screen streaks — and a line of embers stays on the floor.
//   Explosão Corporal: white-hot silhouette, orange cracks in the arms, then a sphere of fire.
//   Fênix Viva: great wings of fire at the edges of your view, burning trails on every jump, an
//     explosive dive, and the wings closing around you to burst at the end.
(function (SO) {
  'use strict';
  const T = THREE, L = SO.AFXLib, AFX = SO.AFX;
  const FIRE = 0xff5a00, HOT = 0xffe0a0, RED = 0xff2a00;

  // flames drawn in the viewmodel scene (camera space), so they hug the screen edges
  function vmFlame(F, w, h, x, y, z, rotZ) {
    const m = new T.Mesh(new T.PlaneGeometry(w, h).translate(0, h / 2, 0), L.flame(FIRE, { tip: HOT, scale: 2.4, speed: 4 }));
    m.position.set(x, y, z); m.rotation.z = rotZ || 0;
    m.renderOrder = 10;
    F.vm.scene.add(m);
    return m;
  }
  function burst(F, x, y, z, r, self) {
    const g = new T.Group(); g.position.set(x, y, z);
    const core = new T.Mesh(new T.SphereGeometry(1, 24, 16), L.add(HOT, 1));
    const shell = new T.Mesh(new T.SphereGeometry(1.2, 24, 16), L.flame(FIRE, { tip: HOT, scale: 3, speed: 5 }));
    g.add(core); g.add(shell);
    F.add(g);
    F.spawn((dt, age) => { const k = age / 0.6; core.scale.setScalar(r * 0.6 * (1 - k)); shell.scale.setScalar(r * (0.3 + k)); shell.material.uniforms.uTime.value = F.t; shell.material.uniforms.uK.value = 1 - k; return k < 1; }, [g]);
    if (self) {
      // centred on the caster: sparks start outside the camera's reach
      for (let i = 0; i < 80; i++) { const a = Math.random() * 6.28, rr = 1.6 + Math.random() * 1.5, sp = 8 + Math.random() * 8; F.fx.glowP.emit(x + Math.cos(a) * rr, y - 0.5 + Math.random() * 2, z + Math.sin(a) * rr, Math.cos(a) * sp, Math.random() * 6, Math.sin(a) * sp, 1, 0.45 + Math.random() * 0.3, 0.1, 0.3, 0.7, 6, 1); }
    } else F.fx.burst(x, y, z, 80, 12, FIRE, 0.4, 0.8, 6, { up: 6 });
    F.fx.ring(x, y - 0.9, z, 0.3, r * 1.3, FIRE, 0.45, 0.95);
    F.flash(x, y, z, FIRE, 12, 0.5);
  }

  // ---------------- Aura Flamejante ----------------
  AFX.cast.fire_1 = () => {};
  AFX.buff.fire_1 = {
    build(F) {
      // low flames licking up the bottom corners only, the aim stays clear
      const own = [vmFlame(F, 0.55, 0.42, -0.62, -0.7, -0.8, 0.25), vmFlame(F, 0.55, 0.42, 0.62, -0.7, -0.8, -0.25), vmFlame(F, 0.9, 0.22, 0, -0.74, -0.85, 0)];
      return { own, born: 0 };
    },
    update(F, v, b, dt) {
      v.born = Math.min(1, v.born + dt / 0.4);
      const k = v.born * Math.min(1, b.t / 0.4);
      for (const m of v.own) { m.material.uniforms.uTime.value = F.t; m.material.uniforms.uK.value = k * 0.75; m.scale.y = 0.4 + 0.6 * k; }
      const p = F.player && F.player.pos;
      if (p) for (let i = 0; i < 4; i++) { const a = Math.random() * 6.28, r = 0.6 + Math.random() * 3; F.fx.glowP.emit(p.x + Math.cos(a) * r, p.y + Math.random() * 0.5, p.z + Math.sin(a) * r, 0, 2.5 + Math.random() * 2, 0, 1, 0.45 + Math.random() * 0.3, 0.1, 0.2, 0.6, -1, 0); }
      F.atmo({ grade: 0xff7020, gradeAmt: 0.12 * k });
    },
    end(F, v) { for (const m of v.own) F.vm.scene.remove(m); v.own = []; },
  };
  AFX.status['fire_1:burn'] = {
    build(F, ctx) {
      const m = new T.Mesh(new T.CylinderGeometry(ctx.e.def.radius * 0.9, ctx.e.def.radius * 1.2, ctx.e.def.height * 0.9, 10, 1, true).translate(0, ctx.e.def.height * 0.45, 0), L.flame(FIRE, { tip: HOT, scale: 2, speed: 5 }));
      ctx.view.root.add(m);
      return { root: m };
    },
    update(F, v, s) { v.root.material.uniforms.uTime.value = F.t; v.root.material.uniforms.uK.value = Math.min(1, s.t / 0.3); },
  };

  // ---------------- Impulso Ígneo ----------------
  AFX.cast.fire_2 = (F, e, mine) => {
    if (!mine) return;
    F.kick(16); F.R.speedFx = Math.max(F.R.speedFx || 0, 1);
    F.spawn((dt, age) => { F.atmo({ grade: 0xff6010, gradeAmt: 0.35 * (1 - age / 0.35), aberr: 0.4 * (1 - age / 0.35) }); return age < 0.35; });
  };
  AFX.effect.fire_2 = {
    build(F, fx) {
      // a row of low flames along the dash line
      const a = new T.Vector3(fx.x, fx.y - 1, fx.z), b = new T.Vector3(fx.bx, fx.by - 1, fx.bz);
      const n = Math.max(2, Math.round(a.distanceTo(b) / 0.9));
      const root = new T.Group(), mats = [];
      for (let i = 0; i <= n; i++) {
        const p = a.clone().lerp(b, i / n);
        if (p.distanceTo(b) < 2.5) continue; // not under the camera where the dash ends
        p.y = Math.max(p.y, 0);
        const m = new T.Mesh(new T.PlaneGeometry(0.9, 1.1).translate(0, 0.55, 0), L.flame(FIRE, { tip: HOT, scale: 2, speed: 5 }));
        m.position.copy(p); m.rotation.y = Math.random() * 3;
        root.add(m); mats.push(m.material);
      }
      F.add(root);
      return { root, mats, a, b };
    },
    update(F, v, fx) {
      const k = Math.min(1, (fx.dur - fx.t) / fx.dur);
      for (const m of v.mats) { m.uniforms.uTime.value = F.t; m.uniforms.uK.value = k; }
      if (Math.random() < 0.6) { const p = v.a.clone().lerp(v.b, Math.random()); F.fx.glowP.emit(p.x, p.y + 0.2, p.z, 0, 2 + Math.random() * 2, 0, 1, 0.5, 0.1, 0.14, 0.6, -1, 0); }
    },
    end(F, v) { F.remove(v.root); return 0; },
  };
  AFX.status['fire_2:burn'] = AFX.status['fire_1:burn'];

  // ---------------- Explosão Corporal ----------------
  AFX.cast.fire_3 = () => {};
  AFX.buff.fire_3 = {
    build(F) { return { arms: F.vm.arms }; },
    update(F, v, b) {
      // charging: the view whitens at the edges, the arms glow through orange cracks
      const k = 1 - b.t / b.max;
      F.atmo({ grade: 0xfff0d0, gradeAmt: 0.45 * k, aberr: 0.3 * k });
      if (v.arms && v.arms.root) v.arms.root.traverse((o) => { if (o.material && o.material.emissive) o.material.emissive.setRGB(1.2 * k, 0.4 * k, 0.05 * k); });
      const h = F.hand(-1, 0.7);
      F.fx.glowP.emit(h.x + (Math.random() - 0.5) * 0.3, h.y, h.z + (Math.random() - 0.5) * 0.3, 0, 1, 0, 1, 0.85, 0.5, 0.06, 0.25, 0, 0);
    },
    end(F, v) { if (v.arms && v.arms.root) v.arms.root.traverse((o) => { if (o.material && o.material.emissive) o.material.emissive.setRGB(0, 0, 0); }); },
  };
  AFX.vfx['fire_3:burst'] = (F, e, mine) => { burst(F, e.x, e.y, e.z, 7, true); if (mine) { F.white(0.35); F.shake(0.4); } };
  AFX.status['fire_3:burn'] = {
    build(F, ctx) { return { e: ctx.e }; },
    update(F, v, s, e) { if (Math.random() < 0.7) F.fx.glowP.emit(e.pos.x + (Math.random() - 0.5) * e.def.radius * 2, e.pos.y + Math.random() * e.def.height, e.pos.z + (Math.random() - 0.5) * e.def.radius * 2, 0, 3, 0, 1, 0.5 + Math.random() * 0.3, 0.1, 0.22, 0.4, -2, 0); },
  };

  // ---------------- Fênix Viva ----------------
  function wing(side) {
    // a feathered wing: long flame feathers fanning up and out from the shoulder
    const g = new T.Group();
    for (let i = 0; i < 9; i++) {
      const len = 1.5 - Math.abs(i - 3) * 0.12;
      const m = new T.Mesh(new T.PlaneGeometry(0.22, len).translate(0, len / 2, 0), L.flame(i % 2 ? FIRE : RED, { tip: 0xffa030, scale: 1.6, speed: 4 }));
      m.rotation.z = side * (-0.35 + i * 0.2);
      g.add(m);
    }
    return g;
  }
  AFX.ult.fire_ult = { start(F, e, mine) { if (mine) { F.white(0.5); F.shake(0.4); } }, end() {} };
  AFX.buff.fire_ult = {
    build(F) {
      const wl = wing(1), wr = wing(-1);
      wl.position.set(-1.25, -0.55, -1.3); wr.position.set(1.25, -0.55, -1.3);
      F.vm.scene.add(wl); F.vm.scene.add(wr);
      return { wl, wr, born: 0, own: [] };
    },
    update(F, v, b, dt) {
      v.born = Math.min(1, v.born + dt / 0.6);
      const flap = Math.sin(F.t * 4) * 0.1;
      v.wl.rotation.z = flap; v.wr.rotation.z = -flap;
      v.wl.scale.setScalar(v.born); v.wr.scale.setScalar(v.born);
      for (const w of [v.wl, v.wr]) w.children.forEach((m) => { m.material.uniforms.uTime.value = F.t; m.material.uniforms.uK.value = 0.8; });
      const p = F.player;
      if (p && !p.grounded) for (let i = 0; i < 4; i++) F.fx.glowP.emit(p.pos.x + (Math.random() - 0.5), p.pos.y + Math.random() * 1.5, p.pos.z + (Math.random() - 0.5), 0, 0.5, 0, 1, 0.45, 0.1, 0.3, 0.9, -0.5, 0);
      F.atmo({ grade: 0xff7020, gradeAmt: 0.2 * v.born });
    },
    end(F, v) {
      // the wings close around you and burst
      const wl = v.wl, wr = v.wr;
      F.spawn((dt, age) => { const k = age / 0.35; wl.position.x = -1.05 + k * 1.0; wr.position.x = 1.05 - k * 1.0; wl.rotation.y = k * 1.2; wr.rotation.y = -k * 1.2; for (const w of [wl, wr]) w.children.forEach((m) => { m.material.uniforms.uTime.value = F.t; m.material.uniforms.uK.value = 1 - k * 0.3; }); if (k >= 1) { F.vm.scene.remove(wl); F.vm.scene.remove(wr); } return k < 1; });
    },
  };
  AFX.vfx['fire_ult:rise'] = (F, e, mine) => { if (mine) { F.kick(8); F.white(0.2); } };
  AFX.vfx['fire_ult:dive'] = (F, e, mine) => {
    burst(F, e.x, e.y + 1, e.z, 10, true);
    // a pillar of fire where the phoenix lands
    const col = new T.Mesh(new T.CylinderGeometry(2, 4, 22, 20, 1, true).translate(0, 11, 0), L.flame(FIRE, { tip: HOT, scale: 2, speed: 6 }));
    col.position.set(e.x, e.y, e.z);
    F.add(col);
    F.spawn((dt, age) => { col.material.uniforms.uTime.value = F.t; col.material.uniforms.uK.value = Math.max(0, 1 - age / 0.9); col.scale.set(1 + age, 1, 1 + age); return age < 0.9; }, [col]);
    if (mine) { F.white(0.6); F.shake(0.8); }
  };
  AFX.vfx['fire_ult:close'] = (F, e, mine) => { burst(F, e.x, e.y, e.z, 8, true); if (mine) F.white(0.5); };
  AFX.status['fire_ult:burn'] = AFX.status['fire_1:burn'];
})(window.SO = window.SO || {});
