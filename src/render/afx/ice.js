// 10. CONGELAMENTO — translucent pale-blue crystal, frost, snow, and the sound-of-glass shattering.
//   Estaca de Gelo: crystals gather in the hand into a stake that leaves a trail of snow.
//   Onda Fria: a sheet of ice races over the floor in a fan, raising crystal spikes as it goes.
//   Prisão Glacial: six ice pillars rise around the target and grow together into a crystal cage.
//   Era do Gelo: the light turns blue, snow covers everything, spikes break out of the floor,
//     a mountain of ice rises behind you and the enemies turn into crystal blocks.
(function (SO) {
  'use strict';
  const T = THREE, L = SO.AFXLib, AFX = SO.AFX;
  const ICE = 0x9be8ff, WHITE = 0xeefaff, DEEP = 0x3a8cd0;

  const iceMat = (op) => new T.MeshLambertMaterial({ color: 0xa8e4ff, emissive: 0x2a6a9a, transparent: true, opacity: op == null ? 0.75 : op, depthWrite: false });
  const frostTex = () => L.tex('ice-frost', 512, (c, s) => {
    c.strokeStyle = 'rgba(210,245,255,1)';
    for (let i = 0; i < 40; i++) { let x = s / 2, y = s / 2, a = Math.random() * 6.28; c.lineWidth = 1 + Math.random() * 2; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 8; k++) { a += (Math.random() - 0.5) * 0.5; x += Math.cos(a) * 30; y += Math.sin(a) * 30; c.lineTo(x, y); if (Math.random() < 0.3) { c.moveTo(x, y); c.lineTo(x + Math.cos(a + 0.8) * 12, y + Math.sin(a + 0.8) * 12); c.moveTo(x, y); } } c.stroke(); }
  });

  function shards(F, x, y, z, n, sp, size) {
    for (let i = 0; i < n; i++) F.fx.glowP.emit(x + (Math.random() - 0.5) * 0.5, y + (Math.random() - 0.5) * 0.8, z + (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * sp, Math.random() * sp * 0.8, (Math.random() - 0.5) * sp, 0.75, 0.95, 1, (size || 0.14) * (0.6 + Math.random() * 0.8), 0.5 + Math.random() * 0.4, 14, 1);
  }
  function snow(F, x, y, z, n) { for (let i = 0; i < n; i++) F.fx.glowP.emit(x + (Math.random() - 0.5) * 0.4, y, z + (Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.6, -0.5, (Math.random() - 0.5) * 0.6, 0.9, 0.97, 1, 0.07, 1, 1.2, 1); }
  function crystalCluster(n, h) {
    const g = new T.Group();
    for (let i = 0; i < n; i++) {
      const m = new T.Mesh(L.shardGeo(h * (0.5 + Math.random() * 0.6), 0.18 + Math.random() * 0.15).translate(0, h * 0.3, 0), iceMat(0.8));
      m.rotation.set((Math.random() - 0.5) * 0.9, Math.random() * 6, (Math.random() - 0.5) * 0.9);
      g.add(m);
    }
    return g;
  }

  // ---------------- Estaca de Gelo ----------------
  AFX.cast.ice_1 = (F, e, mine) => { if (!mine) return; const h = F.hand(-1, 0.85); for (let i = 0; i < 12; i++) { const a = Math.random() * 6.28; F.fx.glowP.emit(h.x + Math.cos(a) * 0.4, h.y + Math.sin(a) * 0.4, h.z, -Math.cos(a) * 1.5, -Math.sin(a) * 1.5, 0, 0.8, 0.95, 1, 0.05, 0.25, 0, 0); } };
  AFX.spell.ice_1 = {
    build(F) {
      const root = new T.Group();
      const main = new T.Mesh(L.shardGeo(1.6, 0.16).rotateX(Math.PI / 2), iceMat(0.9));
      const rim = new T.Mesh(L.shardGeo(1.7, 0.2).rotateX(Math.PI / 2), L.fresnel(ICE, 1.5, 1.5));
      root.add(main); root.add(rim);
      for (let i = 0; i < 4; i++) { const s = new T.Mesh(L.shardGeo(0.6, 0.07).rotateX(Math.PI / 2), iceMat(0.8)); s.position.set(Math.cos(i * 1.57) * 0.16, Math.sin(i * 1.57) * 0.16, -0.25); s.rotation.set(Math.sin(i) * 0.3, Math.cos(i) * 0.3, 0); root.add(s); }
      return { root };
    },
    update(F, v, dt, vel) {
      const p = v.root.position;
      v.root.lookAt(p.x - vel.x, p.y - vel.y, p.z - vel.z);
      snow(F, p.x, p.y, p.z, 2);
    },
    hit(F, e) { shards(F, e.x, e.y, e.z, 18, 7); },
    end(F, e) { shards(F, e.x, e.y, e.z, 10, 5); },
  };
  AFX.vfx['ice_1:shatter'] = (F, e) => { shards(F, e.x, e.y, e.z, 60, 12, 0.2); F.flash(e.x, e.y, e.z, ICE, 6, 0.3); F.shake(0.1); };
  AFX.status['ice_1:slow'] = {
    build(F, ctx) { const d = L.disc(frostTex(), ctx.e.def.radius + 0.6, ICE, 0.7); d.position.y = 0.05; ctx.view.root.add(d); return { root: d, e: ctx.e }; },
    update(F, v, s, e) { if (Math.random() < 0.3) snow(F, e.pos.x + (Math.random() - 0.5) * e.def.radius * 2, e.pos.y + e.def.height, e.pos.z + (Math.random() - 0.5) * e.def.radius * 2, 1); },
  };

  // ---------------- Onda Fria ----------------
  AFX.cast.ice_2 = () => {};
  AFX.effect.ice_2 = {
    build(F, fx) {
      const root = new T.Group(); root.position.set(fx.x, fx.y + 0.05, fx.z);
      const sheet = new T.Mesh(new T.CircleGeometry(1, 40, -fx.arc / 2 - 0.25, fx.arc + 0.5).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: frostTex(), color: ICE, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, fog: false }));
      sheet.rotation.y = fx.yaw + Math.PI / 2;
      root.add(sheet);
      F.add(root);
      return { root, sheet, lastR: 0, spikes: [] };
    },
    update(F, v, fx) {
      v.sheet.scale.setScalar(Math.max(0.01, fx.r));
      // crystal spikes erupt along the advancing edge
      while (v.lastR < fx.r - 1.2) {
        v.lastR += 1.2;
        const n = Math.round(v.lastR * 0.9);
        for (let i = 0; i < n; i++) {
          const a = fx.yaw + Math.PI + (Math.random() - 0.5) * (fx.arc + 0.4);
          const c = crystalCluster(3, 1.2 + v.lastR * 0.04);
          c.position.set(fx.x - Math.sin(a + Math.PI) * v.lastR, fx.y, fx.z - Math.cos(a + Math.PI) * v.lastR);
          c.scale.set(1, 0.01, 1);
          F.add(c); v.spikes.push(c);
          snow(F, c.position.x, c.position.y + 0.3, c.position.z, 3);
        }
      }
      for (const c of v.spikes) c.scale.y = Math.min(1, c.scale.y + 0.2);
    },
    end(F, v) {
      const spikes = v.spikes, sheet = v.sheet;
      F.spawn((dt, age) => { const k = age / 2.5; sheet.material.opacity = 0.85 * (1 - k); for (const c of spikes) { c.scale.y = Math.max(0.01, 1 - Math.max(0, k - 0.5) * 2); } return k < 1; }, spikes.concat([v.root]));
      return 0.001;
    },
  };
  // frozen light enemies get a frost crust with icicles
  AFX.status['ice_2:freeze'] = {
    build(F, ctx) {
      const h = ctx.e.def.height, r = ctx.e.def.radius;
      const g = new T.Group();
      const shell = new T.Mesh(new T.CylinderGeometry(r * 1.1, r * 1.25, h * 1.02, 8, 1).translate(0, h * 0.51, 0), iceMat(0.5));
      const rim = new T.Mesh(new T.CylinderGeometry(r * 1.12, r * 1.27, h * 1.04, 8, 1).translate(0, h * 0.52, 0), L.fresnel(ICE, 1.4, 1));
      g.add(shell); g.add(rim);
      for (let i = 0; i < 6; i++) { const ic = new T.Mesh(new T.ConeGeometry(0.06, 0.4, 4).rotateX(Math.PI), iceMat(0.9)); const a = i / 6 * 6.28; ic.position.set(Math.cos(a) * r * 1.1, h * (0.5 + Math.random() * 0.4), Math.sin(a) * r * 1.1); g.add(ic); }
      ctx.view.root.add(g);
      return { root: g };
    },
  };
  AFX.status['ice_2:slow'] = AFX.status['ice_1:slow'];

  // ---------------- Prisão Glacial ----------------
  AFX.cast.ice_3 = () => {};
  AFX.status['ice_3:freeze'] = {
    build(F, ctx) {
      const h = ctx.e.def.height, r = ctx.e.def.radius + 0.7;
      const g = new T.Group();
      const pillars = [];
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * 6.28;
        const m = new T.Mesh(new T.CylinderGeometry(0.22, 0.35, h * 1.3, 6).translate(0, h * 0.65, 0), iceMat(0.85));
        m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); m.rotation.set(-Math.sin(a) * 0.18, 0, Math.cos(a) * 0.18);
        m.scale.y = 0.01; g.add(m); pillars.push(m);
      }
      // the crystal walls that join them
      const wall = new T.Mesh(new T.CylinderGeometry(r * 0.92, r, h * 1.15, 6, 1, true).translate(0, h * 0.58, 0), iceMat(0.45));
      const rim = new T.Mesh(new T.CylinderGeometry(r * 0.94, r * 1.02, h * 1.17, 6, 1, true).translate(0, h * 0.59, 0), L.fresnel(ICE, 1.3, 1.2));
      wall.scale.y = 0.01; rim.scale.y = 0.01;
      g.add(wall); g.add(rim);
      ctx.view.root.add(g);
      return { root: g, pillars, wall, rim, t: 0 };
    },
    update(F, v, s, e, dt) {
      v.t += dt;
      v.pillars.forEach((m, i) => { m.scale.y = Math.max(0.01, Math.min(1, (v.t - i * 0.05) / 0.25)); });
      const w = Math.max(0.01, Math.min(1, (v.t - 0.35) / 0.3));
      v.wall.scale.y = w; v.rim.scale.y = w;
    },
  };
  AFX.vfx['ice_3:burst'] = (F, e) => {
    shards(F, e.x, e.y, e.z, 90, 14, 0.22);
    F.fx.ring(e.x, e.y - e.h * 0.5 + 0.05, e.z, 0.3, 5, ICE, 0.35, 0.9);
    F.flash(e.x, e.y, e.z, ICE, 8, 0.4); F.shake(0.15);
  };
  AFX.status['ice_3:slow'] = AFX.status['ice_1:slow'];

  // ---------------- Era do Gelo ----------------
  AFX.ult.ice_ult = { start(F, e, mine) { if (mine) { F.white(0.4); F.shake(0.3); } }, end() {} };
  AFX.effect.ice_ult = {
    build(F, fx) {
      const root = new T.Group();
      // the mountain of ice behind the caster
      const mount = new T.Group();
      for (let i = 0; i < 9; i++) { const m = new T.Mesh(L.shardGeo(18 + Math.random() * 22, 4 + Math.random() * 4).translate(0, 10, 0), new T.MeshLambertMaterial({ color: 0x9ad8f8, emissive: 0x1a4a7a })); m.position.set((i - 4) * 6 + (Math.random() - 0.5) * 3, -4, Math.random() * 6); m.rotation.z = (i - 4) * 0.08; mount.add(m); }
      const pl = F.player;
      const yaw = pl ? pl.yaw : 0;
      mount.position.set(fx.x + Math.sin(yaw) * 46, 0, fx.z + Math.cos(yaw) * 46);
      mount.rotation.y = yaw;
      mount.scale.y = 0.01;
      root.add(mount);
      F.add(root);
      return { root, mount, spikes: [], acc: 0 };
    },
    update(F, v, fx, dt) {
      const k = Math.min(1, fx.t / 1.2) * Math.min(1, (fx.dur - fx.t) / 0.8);
      v.mount.scale.y = Math.max(0.01, Math.min(1, fx.t / 1.5)) * Math.min(1, (fx.dur - fx.t) / 0.8 + 0.01);
      // snow all around the camera
      const c = F.cam.position;
      for (let i = 0; i < 10; i++) F.fx.glowP.emit(c.x + (Math.random() - 0.5) * 40, c.y + 8 + Math.random() * 6, c.z + (Math.random() - 0.5) * 40, 1.5, -3, 0.5, 0.92, 0.97, 1, 0.08 + Math.random() * 0.06, 4, 0, 0);
      // spikes break out of the floor across the arena
      v.acc += dt;
      if (v.acc > 0.12 && fx.t < fx.dur - 1) {
        v.acc = 0;
        const a = Math.random() * 6.28, r = 6 + Math.random() * 34;
        const cl = crystalCluster(4, 2.5 + Math.random() * 2);
        cl.position.set(c.x + Math.cos(a) * r, 0, c.z + Math.sin(a) * r); cl.scale.y = 0.01;
        F.add(cl); v.spikes.push(cl);
      }
      for (const s of v.spikes) s.scale.y = Math.min(1, s.scale.y + dt * 4) * Math.max(0.01, k);
      F.atmo({ grade: 0x8ad0ff, gradeAmt: 0.42 * k, dark: 0.1 * k });
    },
    end(F, v) { for (const s of v.spikes) F.remove(s); F.remove(v.root); return 0; },
  };
  // the enemies of the ice age: whole bodies inside crystal blocks
  AFX.status['ice_ult:freeze'] = {
    build(F, ctx) {
      const h = ctx.e.def.height, r = ctx.e.def.radius;
      const g = new T.Group();
      const block = new T.Mesh(new T.DodecahedronGeometry(1, 0), iceMat(0.55));
      block.scale.set(r * 1.9, h * 0.75, r * 1.9); block.position.y = h * 0.5;
      const rim = new T.Mesh(new T.DodecahedronGeometry(1.03, 0), L.fresnel(WHITE, 1.2, 1.4)); rim.scale.copy(block.scale); rim.position.copy(block.position);
      g.add(block); g.add(rim);
      g.scale.setScalar(0.01);
      ctx.view.root.add(g);
      return { root: g };
    },
    update(F, v) { v.root.scale.setScalar(Math.min(1, v.root.scale.x + 0.12)); },
  };
  AFX.status['ice_ult:slow'] = AFX.status['ice_1:slow'];
  AFX.vfx['ice_ult:shatter'] = (F, e) => { shards(F, e.x, e.y, e.z, 70, 13, 0.22); F.flash(e.x, e.y, e.z, WHITE, 5, 0.25); F.fx.gibs(e.x, e.y, e.z, 12, 0xa8e4ff, null, 10); };
  AFX.vfx['ice_ult:thaw'] = (F, e, mine) => { F.fx.ring(e.x, e.y + 0.1, e.z, 0.5, 40, ICE, 1.2, 0.9); if (mine) F.white(0.3); };
})(window.SO = window.SO || {});
