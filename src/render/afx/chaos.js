// 19. LÂMINAS DO CAOS — magenta curved blades with pink trails; magic circles overlapping.
//   Órbita Caótica: three blades come out of small magic circles and spin at their own speeds.
//   Corte Telecinético: one blade swings out in a wide curve ahead of you and comes back.
//   Espiral de Lâminas: blades appear one after another around the target, spiral in and burst.
//   Dança do Caos: dozens of blades lock into a metal flower around you; each of your blows changes
//     the pattern (flower, ring, spiral, crown); at the end they all fly at the marked.
(function (SO) {
  'use strict';
  const T = THREE, L = SO.AFXLib, AFX = SO.AFX;
  const MAG = 0xff2bd6, PINK = 0xffc0f0, DEEP = 0x6a0a5a;

  const circleTex = () => L.tex('chaos-circle', 256, (c, s) => {
    const col = 'rgba(255,90,220,1)';
    L.draw.ring(c, s, s * 0.46, 4, col); L.draw.ring(c, s, s * 0.32, 2, col);
    L.draw.star(c, s, s * 0.32, 8, 3, 2, col);
    L.draw.glyphs(c, s, s * 0.39, '混沌刃舞混沌刃舞', 18, col);
  });
  // a hooked curved blade: sharp crescent with a tang
  let geo = null;
  function bladeGeo() {
    if (geo) return geo;
    const s = new T.Shape(), n = 16;
    for (let i = 0; i <= n; i++) { const a = -0.3 + 2.2 * i / n; const r = 0.75; (i ? s.lineTo.bind(s) : s.moveTo.bind(s))(Math.cos(a) * r, Math.sin(a) * r); }
    for (let i = n; i >= 0; i--) { const a = -0.3 + 2.2 * i / n; const r = 0.75 - 0.22 * Math.sin((i / n) * Math.PI); s.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    geo = new T.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: false }).translate(0, 0, -0.015);
    return geo;
  }
  function blade(scale) {
    const g = new T.Group();
    const m = new T.Mesh(bladeGeo(), new T.MeshLambertMaterial({ color: 0xb0a0b8, emissive: 0x401030 }));
    const edge = new T.Mesh(bladeGeo(), L.add(MAG, 0.7)); edge.scale.setScalar(1.12);
    g.add(edge); g.add(m); g.scale.setScalar(scale);
    return g;
  }
  function summonCircle(F, pos, size) {
    const s = L.sprite(circleTex(), size, MAG); s.position.copy(pos); F.add(s);
    F.spawn((dt, age) => { s.material.rotation = age * 6; s.material.opacity = Math.max(0, 1 - age / 0.4); s.scale.setScalar(size * (0.5 + age * 2)); return age < 0.4; }, [s]);
  }
  function cut(F, x, y, z, big) { F.fx.crescent(new T.Vector3(x, y, z), Math.random() * 6.28, (Math.random() - 0.5) * 0.8, Math.random() * 360, big ? 1.8 : 1.1, MAG, 0.14, false, PINK); }

  // ---------------- Órbita Caótica ----------------
  const ORBIT = [{ r: 2.2, w: 6.5, y: 1.1 }, { r: 2.8, w: -5.2, y: 0.6 }, { r: 1.8, w: 8.1, y: 1.6 }];
  AFX.cast.chaos_1 = () => {};
  AFX.effect.chaos_1 = {
    build(F, fx) {
      const root = new T.Group();
      const blades = ORBIT.map(() => { const b = blade(0.8); root.add(b); return b; });
      const trails = ORBIT.map(() => new L.Trail(F.scene, 16, 0.2, MAG, { core: PINK, life: 0.2 }));
      F.add(root);
      ORBIT.forEach((o, i) => summonCircle(F, new T.Vector3(fx.x + Math.cos(i * 2.094) * o.r, fx.y + o.y, fx.z + Math.sin(i * 2.094) * o.r), 1.6));
      return { root, blades, trails };
    },
    update(F, v, fx, dt) {
      const k = Math.min(1, fx.t / 0.3) * Math.min(1, (fx.dur - fx.t) / 0.3);
      v.root.position.set(fx.x, fx.y, fx.z);
      ORBIT.forEach((o, i) => {
        const a = fx.t * o.w + i * 2.094;
        const b = v.blades[i];
        b.position.set(Math.cos(a) * o.r, o.y, Math.sin(a) * o.r);
        b.rotation.set(Math.PI / 2, 0, -a + (o.w > 0 ? 0 : Math.PI));
        b.scale.setScalar(0.8 * k);
        v.trails[i].push(b.getWorldPosition(new T.Vector3()), new T.Vector3(0, 1, 0), dt);
      });
    },
    end(F, v) { F.remove(v.root); return 0; },
  };

  // ---------------- Corte Telecinético ----------------
  AFX.cast.chaos_2 = () => {};
  AFX.effect.chaos_2 = {
    build(F, fx) { const b = blade(1.3); F.add(b); summonCircle(F, F.hand(-1, 0.9), 0.8); return { root: b, b, trail: new L.Trail(F.scene, 30, 0.4, MAG, { core: PINK, life: 0.3 }) }; },
    update(F, v, fx, dt) {
      if (fx.bx == null) return;
      const p = new T.Vector3(fx.bx, fx.by, fx.bz);
      v.b.position.copy(p);
      v.b.rotation.set(Math.PI / 2, 0, F.t * 26);
      v.trail.push(p, new T.Vector3(0, 1, 0), dt);
      if (Math.random() < 0.5) F.fx.glowP.emit(p.x, p.y, p.z, 0, 0, 0, 1, 0.3, 0.85, 0.15, 0.25, 0, 0);
    },
    end(F, v) { F.remove(v.root); return 0; },
  };

  // ---------------- Espiral de Lâminas ----------------
  AFX.cast.chaos_3 = () => {};
  AFX.effect.chaos_3 = {
    build(F, fx) {
      const root = new T.Group();
      const blades = [];
      for (let i = 0; i < 6; i++) { const b = blade(0.7); b.visible = false; root.add(b); blades.push(b); }
      const disc = L.disc(circleTex(), 4.4, MAG, 0.9); disc.position.y = -1.1; root.add(disc);
      F.add(root);
      return { root, blades, disc, trails: blades.map(() => new L.Trail(F.scene, 14, 0.15, MAG, { core: PINK, life: 0.18 })) };
    },
    update(F, v, fx, dt) {
      v.root.position.set(fx.x, fx.y, fx.z);
      v.disc.rotation.y = F.t * 3; v.disc.material.opacity = Math.max(0, 0.9 - Math.max(0, fx.t - 0.9) * 4);
      v.blades.forEach((b, i) => {
        const born = fx.t - i * 0.07;
        b.visible = born > 0 && fx.t < 0.92;
        if (!b.visible) return;
        const k = Math.min(1, fx.t / 0.9);
        const r = 4.2 * (1 - k) + 0.3, a = i * 1.047 + fx.t * 9;
        b.position.set(Math.cos(a) * r, Math.sin(fx.t * 6 + i) * 0.5, Math.sin(a) * r);
        b.rotation.set(Math.PI / 2, 0, -a);
        v.trails[i].push(b.getWorldPosition(new T.Vector3()), new T.Vector3(0, 1, 0), dt);
        if (born < 0.05) summonCircle(F, b.getWorldPosition(new T.Vector3()), 0.9);
      });
    },
    end(F, v) { F.remove(v.root); return 0; },
  };
  AFX.vfx['chaos_3:converge'] = (F, e) => {
    for (let i = 0; i < 8; i++) cut(F, e.x, e.y, e.z, true);
    F.fx.burst(e.x, e.y, e.z, 50, 10, MAG, 0.3, 0.4, 0);
    F.flash(e.x, e.y, e.z, MAG, 8, 0.3);
  };

  // ---------------- Dança do Caos ----------------
  // four formations for the 24 blades; each blow of yours moves to the next one
  function formation(form, i, n, t) {
    const a = (i / n) * 6.28;
    if (form === 0) { const petal = i % 8, ring = Math.floor(i / 8); const pa = petal / 8 * 6.28 + t * 0.6; const r = 1.6 + ring * 0.9; return { p: new T.Vector3(Math.cos(pa) * r, 1.0 + ring * 0.25, Math.sin(pa) * r), rot: -pa + Math.PI / 2 }; }
    if (form === 1) { const aa = a + t * 1.6; return { p: new T.Vector3(Math.cos(aa) * 3.2, 1.1, Math.sin(aa) * 3.2), rot: -aa }; }
    if (form === 2) { const aa = a * 2 + t * 2; const r = 1.2 + (i / n) * 2.6; return { p: new T.Vector3(Math.cos(aa) * r, 0.3 + (i / n) * 2.4, Math.sin(aa) * r), rot: -aa }; }
    const aa = a + t; return { p: new T.Vector3(Math.cos(aa) * 2.2, 2.6 + Math.sin(a * 3 + t * 4) * 0.3, Math.sin(aa) * 2.2), rot: -aa };
  }
  AFX.ult.chaos_ult = { start(F, e, mine) { if (mine) F.kick(5); }, end() {} };
  AFX.effect.chaos_ult = {
    build(F, fx) {
      const root = new T.Group();
      const blades = [];
      for (let i = 0; i < fx.n; i++) { const b = blade(0.55); root.add(b); blades.push({ b, dart: null }); }
      const circles = [0, 1, 2].map((i) => { const m = new T.Mesh(new T.PlaneGeometry(5 + i * 2, 5 + i * 2), new T.MeshBasicMaterial({ map: circleTex(), color: MAG, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.08 + i * 0.02; root.add(m); return m; });
      F.add(root);
      return { root, blades, circles, form: 0, mix: 1 };
    },
    update(F, v, fx, dt) {
      const born = Math.min(1, fx.t / 0.6);
      v.root.position.set(fx.x, fx.y, fx.z);
      if (fx.form !== v.form) { v.prevForm = v.form; v.form = fx.form; v.mix = 0; }
      v.mix = Math.min(1, v.mix + dt * 5);
      v.circles.forEach((m, i) => { m.rotation.z = F.t * (i % 2 ? 0.8 : -0.6); m.material.opacity = 0.7 * born; });
      v.blades.forEach((s, i) => {
        const to = formation(v.form, i, fx.n, F.t);
        const p = v.mix < 1 ? formation(v.prevForm, i, fx.n, F.t).p.lerp(to.p, v.mix) : to.p;
        if (s.dart) {
          s.dart.t += dt;
          const k = s.dart.t / 0.25, out = k < 0.5 ? k * 2 : (1 - k) * 2;
          p.lerp(s.dart.to.clone().sub(v.root.position), out);
          if (k >= 1) s.dart = null;
        }
        s.b.position.copy(p).multiplyScalar(born);
        s.b.rotation.set(Math.PI / 2, 0, to.rot);
      });
    },
    end(F, v) { F.remove(v.root); return 0; },
  };
  AFX.vfx['chaos_ult:dart'] = (F, e) => {
    const v = Object.values(F.effects).find((x) => x.def === AFX.effect.chaos_ult);
    if (v) { const s = v.blades[e.slot % v.blades.length]; if (!s.dart) s.dart = { t: 0, to: new T.Vector3(e.x, e.y, e.z) }; }
    cut(F, e.x, e.y, e.z, false);
  };
  AFX.vfx['chaos_ult:form'] = (F, e, mine) => { if (mine) { F.kick(2); const p = F.player.pos; summonCircle(F, new T.Vector3(p.x, p.y + 1, p.z), 5); } };
  AFX.spell.chaos_ult = {
    build(F) { const root = new T.Group(), b = blade(0.6); root.add(b); return { root, b, trail: new L.Trail(F.scene, 16, 0.18, MAG, { core: PINK, life: 0.2 }) }; },
    update(F, v, dt, vel) { const p = v.root.position; if (Math.hypot(vel.x, vel.y, vel.z) > 0.5) v.root.lookAt(p.x + vel.x, p.y + vel.y, p.z + vel.z); v.b.rotation.z += dt * 30; v.trail.push(p, new T.Vector3(0, 1, 0), dt); },
    hit(F, e) { cut(F, e.x, e.y, e.z, true); F.fx.burst(e.x, e.y, e.z, 10, 6, MAG, 0.2, 0.25, 0); },
    end(F, e) { F.fx.burst(e.x, e.y, e.z, 6, 4, MAG, 0.18, 0.25, 0); },
  };
  AFX.status['chaos_ult:mark'] = {
    build(F, ctx) { const s = L.sprite(circleTex(), ctx.e.def.radius * 2 + 0.6, MAG); s.position.y = ctx.e.def.height + 0.6; ctx.view.root.add(s); return { root: s }; },
    update(F, v) { v.root.material.rotation = F.t * 5; },
  };
})(window.SO = window.SO || {});
