// 5. MANIPULAÇÃO DE SANGUE — liquid, glossy, heavy blood that obeys the caster.
//   Chicote Sanguíneo: drops gather in the air into a barbed whip that lashes out and bursts back into drops.
//   Lâminas Hemáticas: rings of blood squeeze into curved blades that orbit dripping, then fly spinning.
//   Prisão Carmesim: tentacles rise around the victim and crystallize into a faceted red cage.
//   Maré Carmesim: blood climbs into a spiral around you, drops float upward, and a colossal wave breaks forward.
(function (SO) {
  'use strict';
  const T = THREE, L = SO.AFXLib, AFX = SO.AFX;
  const RED = 0xe0102e, DARK = 0x5a0010, SHINE = 0xff8090;

  const wet = () => new T.MeshLambertMaterial({ color: 0x7a0010, emissive: 0x6a0010 });
  function drops(F, x, y, z, n, sp, up, size) {
    const sz = size || 0.13;
    for (let i = 0; i < n; i++) F.fx.inkP.emit(x + (Math.random() - 0.5) * 0.3, y + (Math.random() - 0.5) * 0.3, z + (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * sp, Math.random() * (up || sp), (Math.random() - 0.5) * sp, 0.55, 0.02, 0.08, sz * (0.7 + Math.random() * 0.6), 0.6 + Math.random() * 0.4, 14, 0.5);
  }
  // curved blood blade (crescent, thick in the middle, sharp at both tips)
  let crescentGeo = null;
  function bladeGeo() {
    if (crescentGeo) return crescentGeo;
    const s = new T.Shape(), n = 20;
    for (let i = 0; i <= n; i++) { const a = -1.2 + 2.4 * i / n; const r = 0.8; (i ? s.lineTo.bind(s) : s.moveTo.bind(s))(Math.cos(a) * r, Math.sin(a) * r); }
    for (let i = n; i >= 0; i--) { const a = -1.2 + 2.4 * i / n; const r = 0.8 - 0.28 * Math.cos(a * 1.3); s.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    crescentGeo = new T.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }).translate(0, 0, -0.03);
    return crescentGeo;
  }
  function blade(scale) {
    const g = new T.Group();
    const m = new T.Mesh(bladeGeo(), wet());
    const rim = new T.Mesh(bladeGeo(), L.add(RED, 0.5)); rim.scale.setScalar(1.15);
    g.add(rim); g.add(m); g.scale.setScalar(scale);
    return g;
  }

  // ---------------- Chicote Sanguíneo ----------------
  AFX.cast.blood_1 = () => {};
  AFX.vfx['blood_1:lash'] = (F, e, mine) => {
    const hand = mine ? F.hand(-1, 0.9) : null;
    const from = hand || new T.Vector3();
    const ends = e.ids.map((id) => { const en = F.enemy(id); return en ? new T.Vector3(en.pos.x, en.pos.y + en.def.height * 0.6, en.pos.z) : null; }).filter(Boolean);
    if (!ends.length && mine) ends.push(from.clone().add(F.look().multiplyScalar(9)));
    // drops gather at the hand, then each lash shoots out as a chain of barbed segments
    drops(F, from.x, from.y, from.z, 8, 2, 1.5, 0.035); // tiny: this is right by the camera
    for (const to of ends) {
      const segs = [], n = 22;
      const geo = new T.ConeGeometry(0.09, 0.42, 5).rotateX(Math.PI / 2);
      for (let i = 0; i < n; i++) { const m = new T.Mesh(geo, wet()); F.add(m); segs.push(m); }
      const side = new T.Vector3((Math.random() - 0.5), 1, (Math.random() - 0.5)).normalize();
      F.spawn((dt, age) => {
        const out = Math.min(1, age / 0.14), gone = Math.max(0, (age - 0.3) / 0.25);
        for (let i = 0; i < n; i++) {
          const k = (i / (n - 1)) * out;
          const p = from.clone().lerp(to, k).addScaledVector(side, Math.sin(k * Math.PI) * 1.2 * (1 - out * 0.6) + Math.sin(k * 14 - age * 40) * 0.12);
          const q = from.clone().lerp(to, Math.min(1, k + 0.02));
          segs[i].position.copy(p); segs[i].lookAt(q);
          segs[i].scale.setScalar(Math.max(0.01, 1 - gone) * (0.7 + 0.6 * Math.sin(i * 1.7)));
        }
        if (gone > 0 && gone < 0.3) for (let i = 0; i < n; i += 3) drops(F, segs[i].position.x, segs[i].position.y, segs[i].position.z, 2, 2, 1);
        return gone < 1;
      }, segs);
      F.fx.blood(to.x, to.y, to.z, null, 1.2);
    }
    if (mine) F.kick(3);
  };

  // ---------------- Lâminas Hemáticas ----------------
  AFX.cast.blood_2 = () => {};
  AFX.effect.blood_2 = {
    build(F, fx) {
      const root = new T.Group();
      const blades = [];
      for (let i = 0; i < 5; i++) { const b = blade(0.55); root.add(b); blades.push(b); }
      F.add(root);
      return { root, blades, born: 0 };
    },
    update(F, v, fx, dt) {
      v.born = Math.min(1, v.born + dt / 0.5);
      v.root.position.set(fx.x, fx.y, fx.z);
      v.blades.forEach((b, i) => {
        b.visible = i < fx.n;
        const a = F.t * 3 + i * 1.2566;
        b.position.set(Math.cos(a) * 1.7, 1.25 + Math.sin(F.t * 4 + i) * 0.1, Math.sin(a) * 1.7);
        b.rotation.set(Math.PI / 2, 0, -a);
        // squeezing from a liquid ring into a blade as it appears
        b.scale.set(0.55 * v.born, 0.55 * (2 - v.born), 0.55);
        if (b.visible && Math.random() < 0.08) { const p = b.getWorldPosition(new T.Vector3()); F.fx.inkP.emit(p.x, p.y - 0.1, p.z, 0, -0.5, 0, 0.6, 0.02, 0.08, 0.1, 0.8, 9, 0); }
      });
    },
    end(F, v) { F.remove(v.root); return 0; },
  };
  AFX.spell.blood_2 = {
    build(F) { const root = new T.Group(), b = blade(0.6); root.add(b); return { root, b, trail: new L.Trail(F.scene, 14, 0.18, RED, { core: SHINE, life: 0.2 }) }; },
    update(F, v, dt, vel) {
      const sp = Math.hypot(vel.x, vel.y, vel.z);
      if (sp > 0.1) v.root.lookAt(v.root.position.x + vel.x, v.root.position.y + vel.y, v.root.position.z + vel.z);
      v.b.rotation.z += dt * 22;
      v.trail.push(v.root.position, new T.Vector3(0, 1, 0), dt);
      if (Math.random() < 0.5) F.fx.inkP.emit(v.root.position.x, v.root.position.y, v.root.position.z, 0, -1, 0, 0.6, 0.02, 0.08, 0.12, 0.6, 10, 0);
    },
    hit(F, e) { F.fx.blood(e.x, e.y, e.z, null, 1.4); drops(F, e.x, e.y, e.z, 8, 6, 4); },
    end(F, e) { drops(F, e.x, e.y, e.z, 10, 4, 3); },
  };

  // ---------------- Prisão Carmesim ----------------
  AFX.cast.blood_3 = () => {};
  AFX.status['blood_3:prison'] = {
    build(F, ctx) {
      const h = ctx.e.def.height, r = ctx.e.def.radius + 0.5;
      const g = new T.Group();
      // tentacles: curved tubes rising and wrapping
      const tents = [];
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * 6.28;
        const pts = [];
        for (let k = 0; k <= 8; k++) { const t = k / 8; pts.push(new T.Vector3(Math.cos(a + t * 2.4) * r * (1.2 - t * 0.5), t * h * 1.05, Math.sin(a + t * 2.4) * r * (1.2 - t * 0.5))); }
        const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 24, 0.12, 6), wet());
        m.scale.set(1, 0.01, 1);
        g.add(m); tents.push(m);
      }
      // the crystal cage
      const crystal = new T.Mesh(new T.IcosahedronGeometry(1, 1), new T.MeshLambertMaterial({ color: 0xc01030, emissive: 0x5a0010, transparent: true, opacity: 0.55, depthWrite: false }));
      const rim = new T.Mesh(new T.IcosahedronGeometry(1.02, 1), L.fresnel(RED, 1.6, 1.4));
      crystal.scale.set(r * 1.3, h * 0.65, r * 1.3); rim.scale.copy(crystal.scale);
      crystal.position.y = rim.position.y = h * 0.5;
      crystal.visible = rim.visible = false;
      g.add(crystal); g.add(rim);
      ctx.view.root.add(g);
      return { root: g, tents, crystal, rim, t: 0 };
    },
    update(F, v, s, e, dt) {
      v.t += dt;
      const grow = Math.min(1, v.t / 0.35);
      for (const m of v.tents) m.scale.y = Math.max(0.01, grow);
      if (v.t > 0.4) { v.crystal.visible = v.rim.visible = true; const c = Math.min(1, (v.t - 0.4) / 0.2); v.crystal.material.opacity = 0.55 * c; v.rim.material.uniforms.uK.value = 1.4 * c; }
      v.root.rotation.y = -F.t * 0.3;
    },
  };
  AFX.vfx['blood_3:shatter'] = (F, e) => {
    F.fx.gibs(e.x, e.y, e.z, 26, 0x9a0820, null, 10);
    drops(F, e.x, e.y, e.z, 24, 8, 6);
    F.flash(e.x, e.y, e.z, RED, 5, 0.25);
  };

  // ---------------- Maré Carmesim ----------------
  AFX.ult.blood_ult = { start(F, e, mine) { if (mine) { F.R.flashBlood(0.6); F.shake(0.3); } }, end() {} };
  AFX.effect.blood_ult = {
    build(F, fx) {
      const root = new T.Group();
      // a spiral of blood climbing around the caster
      const pts = [];
      for (let k = 0; k <= 120; k++) { const t = k / 120; pts.push(new T.Vector3(Math.cos(t * 18) * (3 + t * 9), t * 14, Math.sin(t * 18) * (3 + t * 9))); }
      const spiral = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 300, 0.35, 6), L.energy(RED, { color2: SHINE, freq: 30, speed: 3, sharp: 0.3, edge: 0.02, normal: true }));
      root.add(spiral);
      F.add(root);
      return { root, spiral, open: 0 };
    },
    update(F, v, fx, dt) {
      v.open = Math.min(1, v.open + dt / 1);
      const close = Math.min(1, Math.max(0, (fx.dur - fx.t) / 0.6));
      v.root.position.set(fx.x, fx.y, fx.z);
      v.root.rotation.y = F.t * 0.8;
      v.spiral.material.uniforms.uTime.value = F.t; v.spiral.material.uniforms.uK.value = v.open * close;
      v.spiral.scale.set(1, v.open, 1);
      // drops float upward against gravity all around
      for (let i = 0; i < 6; i++) { const a = Math.random() * 6.28, r = 3.5 + Math.random() * (fx.r - 3.5); F.fx.inkP.emit(fx.x + Math.cos(a) * r, fx.y + Math.random() * 2, fx.z + Math.sin(a) * r, 0, 1.5, 0, 0.6, 0.02, 0.08, 0.07 + Math.random() * 0.06, 1.5, -1.2, 0.3); }
      F.atmo({ grade: 0xd00820, gradeAmt: 0.42 * v.open * close, dark: 0.2 * v.open * close });
    },
    end(F, v) { F.remove(v.root); return 0; },
  };
  AFX.vfx['blood_ult:siphon'] = (F, e) => {
    const en = F.enemy(e.id), pl = F.player;
    if (!en || !pl) return;
    const sx = en.pos.x, sy = en.pos.y + en.def.height * 0.6, sz = en.pos.z;
    const T0 = 0.45;
    for (let i = 0; i < 8; i++) F.fx.inkP.emit(sx, sy, sz, (pl.pos.x - sx) / T0, (pl.pos.y + 1 - sy) / T0 + 4, (pl.pos.z - sz) / T0, 0.6, 0.02, 0.08, 0.18, T0, 9, 0);
  };
  AFX.spell.blood_ult = {
    build(F, q) {
      const root = new T.Group();
      // the wave: a tall curled wall of blood with a frothing crest
      const shape = new T.PlaneGeometry(11, 6, 24, 8);
      const pos = shape.attributes.position;
      for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) + 3; pos.setZ(i, -Math.pow(y / 6, 2) * 2.4); pos.setY(i, y - 2.2); }
      shape.computeVertexNormals();
      const wall = new T.Mesh(shape, L.energy(RED, { color2: SHINE, freq: 6, speed: 4, sharp: 0.2, edge: 0.05, normal: true }));
      const body = new T.Mesh(shape, new T.MeshLambertMaterial({ color: 0x6a0010, emissive: 0x3a0008, side: T.DoubleSide }));
      body.position.z = 0.2;
      root.add(body); root.add(wall);
      root.rotation.y = (q.yaw || 0);
      return { root, wall };
    },
    update(F, v) {
      v.wall.material.uniforms.uTime.value = F.t;
      const p = v.root.position;
      for (let i = 0; i < 10; i++) { const s = (Math.random() - 0.5) * 10, c = Math.cos(v.root.rotation.y), si = Math.sin(v.root.rotation.y); F.fx.inkP.emit(p.x + s * c, p.y + 3.5 + Math.random(), p.z - s * si, (Math.random() - 0.5) * 4, 4 + Math.random() * 3, (Math.random() - 0.5) * 4, 0.7, 0.03, 0.1, 0.25, 0.7, 14, 0.3); }
      if (Math.random() < 0.5) F.fx.splat(p.x + (Math.random() - 0.5) * 8, p.y - 2, p.z + (Math.random() - 0.5) * 8, 2.2);
    },
    hit(F, e) { F.fx.blood(e.x, e.y, e.z, null, 2); },
    end(F, e) { drops(F, e.x, e.y, e.z, 60, 10, 8); },
  };
})(window.SO = window.SO || {});
