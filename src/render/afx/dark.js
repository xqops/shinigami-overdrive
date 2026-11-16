// 18. ESCURIDÃO — deep violet smoke and true black; lights die; souls glow.
//   Nuvem Sombria: violet smoke boils up from the floor and its tendrils wrap whoever is inside.
//   Cegueira: a black wave with violet edges sweeps out; nearby lights go out for a moment.
//   Devorar Almas: the victim's shadow is torn out, forms a violet orb and you absorb it.
//   Noite Eterna: a black sphere swells out from you and swallows the light; enemies glow as violet
//     silhouettes; violet eyes open in the dark and great shadows cross the arena.
(function (SO) {
  'use strict';
  const T = THREE, L = SO.AFXLib, AFX = SO.AFX;
  const VIO = 0x8a3cff, PALE = 0xd8b8ff, INK = 0x05000a;

  const smokeTex = () => L.tex('dark-smoke', 128, (c, s) => { for (let i = 0; i < 18; i++) { const x = s / 2 + (Math.random() - 0.5) * s * 0.5, y = s / 2 + (Math.random() - 0.5) * s * 0.5, r = s * (0.12 + Math.random() * 0.2); const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(40,10,70,0.6)'); g.addColorStop(1, 'rgba(10,0,20,0)'); c.fillStyle = g; c.fillRect(0, 0, s, s); } });
  const eyeTex = () => L.tex('dark-eye', 128, (c, s) => { c.fillStyle = 'rgba(220,170,255,1)'; c.beginPath(); c.ellipse(s / 2, s / 2, s * 0.42, s * 0.14, 0, 0, 6.28); c.fill(); c.fillStyle = 'rgba(20,0,30,1)'; c.beginPath(); c.ellipse(s / 2, s / 2, s * 0.05, s * 0.12, 0, 0, 6.28); c.fill(); });
  function smokeSprite(size) { const s = new T.Sprite(new T.SpriteMaterial({ map: smokeTex(), color: 0xffffff, transparent: true, depthWrite: false, fog: false })); s.scale.setScalar(size); return s; }

  // ---------------- Nuvem Sombria ----------------
  AFX.cast.dark_1 = () => {};
  AFX.effect.dark_1 = {
    build(F, fx) {
      const root = new T.Group(); root.position.set(fx.x, fx.y, fx.z);
      const puffs = [];
      for (let i = 0; i < 26; i++) { const s = smokeSprite(2.5 + Math.random() * 2.5); const a = Math.random() * 6.28, r = Math.random() * fx.r; s.position.set(Math.cos(a) * r, 0.6 + Math.random() * 2.4, Math.sin(a) * r); s.userData = { a, r, y: s.position.y, w: (Math.random() - 0.5) * 0.6 }; root.add(s); puffs.push(s); }
      // tendrils curling up out of the smoke
      const tendrils = [];
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * 6.28, pts = [];
        for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push(new T.Vector3(Math.cos(a + t * 3) * fx.r * 0.5 * (1 - t * 0.5), t * 3.5, Math.sin(a + t * 3) * fx.r * 0.5 * (1 - t * 0.5))); }
        const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, 0.1, 5), new T.MeshBasicMaterial({ color: 0x1a0630 }));
        m.scale.y = 0.01; root.add(m); tendrils.push(m);
      }
      F.add(root);
      return { root, puffs, tendrils };
    },
    update(F, v, fx, dt) {
      const k = Math.min(1, fx.t / 0.5) * Math.min(1, (fx.dur - fx.t) / 0.6);
      for (const s of v.puffs) { const u = s.userData; u.a += dt * u.w; s.position.x = Math.cos(u.a) * u.r; s.position.z = Math.sin(u.a) * u.r; s.material.opacity = k * 0.95; s.material.rotation += dt * u.w; }
      v.tendrils.forEach((m, i) => { m.scale.y = Math.max(0.01, k); m.rotation.y = F.t * (i % 2 ? 0.8 : -0.8); });
    },
    end(F, v) { F.remove(v.root); return 0; },
  };
  AFX.status['dark_1:blind'] = {
    build(F, ctx) { const s = smokeSprite(1.6); s.position.y = ctx.e.def.height; ctx.view.root.add(s); return { root: s }; },
    update(F, v) { v.root.material.rotation += 0.03; },
  };

  // ---------------- Cegueira ----------------
  AFX.cast.dark_2 = () => {};
  AFX.vfx['dark_2:pulse'] = (F, e, mine) => {
    const wave = new T.Mesh(new T.SphereGeometry(1, 32, 16), new T.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.85, depthWrite: false, side: T.BackSide }));
    const edge = new T.Mesh(new T.SphereGeometry(1.02, 32, 16), L.fresnel(VIO, 1.2, 2));
    wave.position.set(e.x, e.y + 1, e.z); edge.position.copy(wave.position);
    F.add(wave); F.add(edge);
    F.spawn((dt, age) => { const k = age / 0.6; wave.scale.setScalar(1 + k * 18); edge.scale.setScalar(1 + k * 18); wave.material.opacity = 0.85 * (1 - k); edge.material.uniforms.uK.value = 2 * (1 - k); return k < 1; }, [wave, edge]);
    // the lights go out for a moment
    if (mine) F.spawn((dt, age) => { F.atmo({ dark: 0.75 * Math.max(0, 1 - Math.max(0, age - 0.6) / 1.2), grade: 0x6020c0, gradeAmt: 0.2 * (1 - age / 1.8) }); return age < 1.8; });
  };
  AFX.status['dark_2:blind'] = {
    build(F, ctx) {
      // a black band over the eyes with a violet question glyph
      const band = new T.Mesh(new T.CylinderGeometry(ctx.e.def.radius * 0.7, ctx.e.def.radius * 0.7, 0.2, 12, 1, true), new T.MeshBasicMaterial({ color: INK, side: T.DoubleSide }));
      band.position.y = ctx.e.def.height * 0.86;
      const q = L.sprite(L.tex('dark-q', 64, (c, s) => { c.fillStyle = 'rgba(210,160,255,1)'; c.font = '52px "DotGothic16",serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', s / 2, s / 2); }), 0.6, VIO);
      q.position.y = ctx.e.def.height + 0.5;
      ctx.view.root.add(band); ctx.view.root.add(q);
      return { own: [band, q], q };
    },
    update(F, v) { v.q.position.y += Math.sin(F.t * 4) * 0.003; },
  };

  // ---------------- Devorar Almas ----------------
  AFX.cast.dark_3 = () => {};
  AFX.status['dark_3:drain'] = {
    build(F, ctx) {
      // the shadow torn out: a dark stretched silhouette, and the soul orb forming
      const orb = new T.Mesh(new T.SphereGeometry(0.3, 16, 12), L.add(PALE, 1));
      const shell = new T.Mesh(new T.SphereGeometry(0.45, 16, 12), L.fresnel(VIO, 1.5, 2));
      const g = new T.Group(); g.add(orb); g.add(shell);
      F.add(g);
      return { own: [g], g, e: ctx.e, t: 0 };
    },
    update(F, v, s, e, dt) {
      v.t += dt;
      const a = new T.Vector3(e.pos.x, e.pos.y + e.def.height * 0.6, e.pos.z), b = F.hand(-1, 0.6);
      const k = Math.min(1, v.t / 0.8);
      v.g.position.copy(a).lerp(b, Math.pow(k, 2));
      v.g.scale.setScalar(0.5 + k);
      for (let i = 0; i < 4; i++) F.fx.inkP.emit(a.x + (Math.random() - 0.5) * 0.5, a.y + (Math.random() - 0.5), a.z + (Math.random() - 0.5) * 0.5, (v.g.position.x - a.x) * 2, (v.g.position.y - a.y) * 2, (v.g.position.z - a.z) * 2, 0.08, 0.02, 0.16, 0.3, 0.3, 0, 0);
    },
    end(F, v) { const p = v.g.position; F.fx.burst(p.x, p.y, p.z, 20, 5, VIO, 0.25, 0.3, 0); F.spawn((dt, age) => { F.atmo({ grade: VIO, gradeAmt: 0.25 * (1 - age / 0.4) }); return age < 0.4; }); },
  };
  AFX.status['dark_3:shock'] = { build() { return {}; } };

  // ---------------- Noite Eterna ----------------
  AFX.ult.dark_ult = { start(F, e, mine) { if (mine) F.R.flashInvert(0.06); }, end() {} };
  AFX.effect.dark_ult = {
    build(F, fx) {
      const root = new T.Group();
      const sphere = new T.Mesh(new T.SphereGeometry(1, 32, 16), new T.MeshBasicMaterial({ color: INK, transparent: true, opacity: 0.7, depthWrite: false, side: T.BackSide }));
      sphere.position.set(fx.x, fx.y + 1, fx.z);
      root.add(sphere);
      // pairs of violet eyes opening in the dark, and great shadows crossing
      const eyes = [];
      for (let i = 0; i < 10; i++) { const g = new T.Group(); for (const s of [-1, 1]) { const e = L.sprite(eyeTex(), 1.2, VIO); e.position.x = s * 0.9; g.add(e); } const a = Math.random() * 6.28, r = 20 + Math.random() * 18; g.position.set(fx.x + Math.cos(a) * r, 3 + Math.random() * 8, fx.z + Math.sin(a) * r); g.userData = { open: Math.random() * 5 }; root.add(g); eyes.push(g); }
      const shades = [];
      for (let i = 0; i < 3; i++) { const m = new T.Mesh(new T.PlaneGeometry(14, 22), new T.MeshBasicMaterial({ map: smokeTex(), color: 0x000000, transparent: true, opacity: 0.8, depthWrite: false, side: T.DoubleSide })); m.userData = { a: i * 2.09, r: 26 }; root.add(m); shades.push(m); }
      F.add(root);
      return { root, sphere, eyes, shades };
    },
    update(F, v, fx, dt) {
      const k = Math.min(1, fx.t / 0.8) * Math.min(1, (fx.dur - fx.t) / 0.8);
      v.sphere.scale.setScalar(1 + Math.min(1, fx.t / 0.8) * 60); v.sphere.material.opacity = 0.7 * (1 - Math.min(1, fx.t / 0.8));
      for (const g of v.eyes) { const o = (Math.sin(F.t * 1.3 + g.userData.open) + 1) / 2; g.children.forEach((s) => { s.scale.set(1.2, 1.2 * o * k + 0.01, 1); }); }
      for (const m of v.shades) { const u = m.userData; u.a += dt * 0.25; m.position.set(fx.x + Math.cos(u.a) * u.r, 8, fx.z + Math.sin(u.a) * u.r); m.lookAt(F.cam.position); }
      F.atmo({ dark: 0.8 * k, grade: 0x3a1080, gradeAmt: 0.25 * k });
    },
    end(F, v) { F.remove(v.root); return 0; },
  };
  // under the eternal night, enemies show as glowing violet silhouettes
  AFX.status['dark_ult:blind'] = {
    build(F, ctx) {
      const v = ctx.view;
      const mats = v.ctl ? v.ctl.mats : (v.mats || []);
      return { mats, view: v };
    },
    update(F, v) { for (const m of v.mats) if (m.emissive) m.emissive.setRGB(0.75, 0.3, 1.6); },
    end(F, v) { for (const m of v.mats) if (m.emissive) m.emissive.setRGB(0.45, 0.45, 0.45); },
  };
  AFX.vfx['dark_ult:dawn'] = (F, e, mine) => { if (mine) F.white(0.25); };
  AFX.status['steam:blind'] = {
    build(F, ctx) { return { e: ctx.e }; },
    update(F, v, s, e) { if (Math.random() < 0.4) F.fx.glowP.emit(e.pos.x, e.pos.y + e.def.height, e.pos.z, (Math.random() - 0.5) * 2, 1.5, (Math.random() - 0.5) * 2, 0.95, 0.9, 0.9, 0.4, 0.7, -0.5, 1); },
  };
})(window.SO = window.SO || {});
