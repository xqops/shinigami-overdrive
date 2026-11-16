// 9. RAIO DE PLASMA — violet plasma: hard white cores, crackling discharges, heat haze.
//   Disparo de Plasma: a violet bolt forms in the hand and leaves with small electric discharges.
//   Corrente Elétrica: the beam splits into jagged arcs that light up each victim.
//   Feixe Contínuo: three rings spin up in front of the hand and fuse into a steady beam.
//   Aniquilação: an orbital column from the sky, technological circles around it, the floor
//     glowing and cracking under it, and a plasma blast at the end.
(function (SO) {
  'use strict';
  const T = THREE, L = SO.AFXLib, AFX = SO.AFX;
  const VIO = 0xb44dff, CORE = 0xf4e8ff, DEEP = 0x5a10c0;

  const techTex = () => L.tex('plasma-tech', 512, (c, s) => {
    const col = 'rgba(200,140,255,1)';
    L.draw.ring(c, s, s * 0.48, 3, col); L.draw.ring(c, s, s * 0.44, 1, col); L.draw.ring(c, s, s * 0.3, 2, col);
    for (let i = 0; i < 24; i++) { const a0 = i / 24 * 6.28, a1 = a0 + 0.18; c.strokeStyle = col; c.lineWidth = i % 3 ? 4 : 10; c.beginPath(); c.arc(s / 2, s / 2, s * 0.38, a0, a1); c.stroke(); }
    L.draw.ticks(c, s, s * 0.3, s * 0.34, 72, 1, col);
    c.fillStyle = col; c.font = '14px monospace'; c.textAlign = 'center';
    for (let i = 0; i < 8; i++) { c.save(); c.translate(s / 2, s / 2); c.rotate(i / 8 * 6.28); c.fillText('0x' + (0xa0 + i * 7).toString(16).toUpperCase(), 0, -s * 0.46 + 14); c.restore(); }
    L.draw.star(c, s, s * 0.3, 3, 1, 2, col);
  });
  const crackTex = () => L.tex('plasma-crack', 512, (c, s) => {
    c.strokeStyle = 'rgba(220,170,255,1)'; c.lineCap = 'round';
    for (let i = 0; i < 14; i++) { let x = s / 2, y = s / 2, a = i / 14 * 6.28; c.lineWidth = 5; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 9; k++) { a += (Math.random() - 0.5) * 0.9; x += Math.cos(a) * 24; y += Math.sin(a) * 24; c.lineTo(x, y); c.lineWidth = Math.max(1, 5 - k * 0.5); } c.stroke(); }
  });

  function sparks(F, x, y, z, n, sp) { for (let i = 0; i < n; i++) F.fx.glowP.emit(x, y, z, (Math.random() - 0.5) * sp, (Math.random() - 0.5) * sp, (Math.random() - 0.5) * sp, 0.8, 0.5, 1, 0.1 + Math.random() * 0.1, 0.2 + Math.random() * 0.2, 4, 2); }
  function crackle(F, at, r, n) { for (let i = 0; i < n; i++) { const d = new T.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(r * (0.5 + Math.random())); F.bolt(at.clone(), at.clone().add(d), 0.08, 0.08, VIO, false, 0.3); } }

  // ---------------- Disparo de Plasma ----------------
  AFX.cast.plasma_1 = (F, e, mine) => { if (!mine) return; const h = F.hand(-1, 0.85); sparks(F, h.x, h.y, h.z, 14, 4); F.flash(h.x, h.y, h.z, VIO, 3, 0.15); };
  AFX.spell.plasma_1 = {
    build(F) {
      const root = new T.Group();
      const core = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, 1, 8), L.solid(CORE));
      core.rotation.x = Math.PI / 2;
      const halo = new T.Mesh(new T.SphereGeometry(0.42, 12, 8), L.add(VIO, 0.55)); halo.scale.set(1, 1, 2.6);
      root.add(halo); root.add(core);
      return { root, trail: new L.Trail(F.scene, 14, 0.18, VIO, { core: CORE, life: 0.14 }) };
    },
    update(F, v, dt, vel) {
      const p = v.root.position;
      v.root.lookAt(p.x + vel.x, p.y + vel.y, p.z + vel.z);
      v.trail.push(p, new T.Vector3(0, 1, 0), dt);
      if (Math.random() < 0.35) crackle(F, p.clone(), 0.7, 1);
    },
    hit(F, e) { sparks(F, e.x, e.y, e.z, 22, 10); crackle(F, new T.Vector3(e.x, e.y, e.z), 1.2, 4); F.flash(e.x, e.y, e.z, VIO, 4, 0.15); },
    end(F, e) { sparks(F, e.x, e.y, e.z, 10, 5); },
  };

  // ---------------- Corrente Elétrica ----------------
  AFX.cast.plasma_2 = () => {};
  AFX.vfx['plasma_2:arc'] = (F, e) => {
    const pts = e.pts.map((p) => new T.Vector3(p[0], p[1], p[2]));
    for (let i = 1; i < pts.length; i++) {
      // two or three crooked arcs per jump, re-struck for a moment
      for (let k = 0; k < 3; k++) F.bolt(pts[i - 1], pts[i], k ? 0.12 : 0.28, 0.25 + k * 0.05, VIO, k === 0, 1.6);
      F.flash(pts[i].x, pts[i].y, pts[i].z, VIO, 6, 0.3);
      sparks(F, pts[i].x, pts[i].y, pts[i].z, 18, 8);
    }
  };
  AFX.status['plasma:shock'] = {
    build(F, ctx) { return { e: ctx.e }; },
    update(F, v, s, e) { if (Math.random() < 0.5) crackle(F, new T.Vector3(e.pos.x, e.pos.y + e.def.height * Math.random(), e.pos.z), e.def.radius + 0.5, 1); },
  };

  // ---------------- Feixe Contínuo ----------------
  AFX.cast.plasma_3 = () => {};
  AFX.buff.plasma_3 = {
    build(F) {
      // three rings spinning in front of the hand (viewmodel space), then the beam in the world
      const rings = [0.035, 0.05, 0.065].map((r, i) => { const m = new T.Mesh(new T.TorusGeometry(r, 0.004, 6, 32), L.add(i === 1 ? CORE : VIO, 0.9)); m.position.set(-0.2, -0.2, -0.75 - i * 0.07); m.renderOrder = 10; F.vm.scene.add(m); return m; });
      const beam = new T.Group();
      const core = new T.Mesh(new T.CylinderGeometry(0.09, 0.09, 1, 8, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5), L.solid(CORE));
      const glow = new T.Mesh(new T.CylinderGeometry(0.32, 0.32, 1, 12, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5), L.energy(VIO, { color2: CORE, freq: 8, speed: -14, sharp: 0.15, edge: 0.02 }));
      beam.add(glow); beam.add(core);
      F.add(beam);
      return { rings, beam, glow, root: beam };
    },
    update(F, v, b, dt) {
      const warm = Math.max(0, b.warm);
      v.rings.forEach((m, i) => { m.rotation.z += dt * (10 + i * 6) * (i % 2 ? -1 : 1); m.position.z = -0.75 - i * 0.07 * (1 - Math.min(1, (0.2 - warm) / 0.2)); });
      const on = warm <= 0 && b.ex != null;
      v.beam.visible = on;
      if (!on) return;
      const from = F.hand(-1, 0.95), to = new T.Vector3(b.ex, b.ey, b.ez);
      const len = from.distanceTo(to);
      v.beam.position.copy(from); v.beam.lookAt(to); v.beam.scale.set(1 + Math.sin(F.t * 60) * 0.15, 1 + Math.sin(F.t * 60) * 0.15, len);
      v.glow.material.uniforms.uTime.value = F.t;
      sparks(F, to.x, to.y, to.z, 4, 6);
      F.lensAt(to, 2, 0.25);
      if (Math.random() < 0.3) crackle(F, to, 1, 1);
    },
    end(F, v) { for (const m of v.rings) F.vm.scene.remove(m); },
  };

  // ---------------- Aniquilação ----------------
  AFX.ult.plasma_ult = { start(F, e, mine) { if (mine) { F.white(0.3); F.shake(0.3); } }, end() {} };
  AFX.effect.plasma_ult = {
    build(F, fx) {
      const root = new T.Group();
      const col = new T.Mesh(new T.CylinderGeometry(fx.r, fx.r, 120, 24, 1, true).translate(0, 60, 0), L.energy(VIO, { color2: CORE, freq: 3, speed: -6, sharp: 0.35, edge: 0.01 }));
      const core = new T.Mesh(new T.CylinderGeometry(fx.r * 0.35, fx.r * 0.35, 120, 12, 1, true).translate(0, 60, 0), L.add(CORE, 0.95));
      const rings = [0, 1, 2].map((i) => { const m = new T.Mesh(new T.PlaneGeometry(fx.r * (4 + i * 1.6), fx.r * (4 + i * 1.6)), new T.MeshBasicMaterial({ map: techTex(), color: i === 1 ? CORE : VIO, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false })); m.rotation.x = -Math.PI / 2; m.position.y = 0.2 + i * 6; root.add(m); return m; });
      const glowDisc = L.disc(crackTex(), fx.r * 2.4, VIO, 1); glowDisc.position.y = 0.06;
      root.add(col); root.add(core); root.add(glowDisc);
      F.add(root);
      return { root, col, core, rings, glowDisc, scars: [] };
    },
    update(F, v, fx, dt) {
      const k = Math.min(1, fx.t / 0.6) * Math.min(1, (fx.dur - fx.t) / 0.3);
      v.root.position.set(fx.x, fx.y, fx.z);
      v.col.material.uniforms.uTime.value = F.t; v.col.material.uniforms.uK.value = k;
      v.core.material.opacity = 0.95 * k; v.core.scale.set(1 + Math.sin(F.t * 50) * 0.1, 1, 1 + Math.sin(F.t * 50) * 0.1);
      v.rings.forEach((m, i) => { m.rotation.z = F.t * (i % 2 ? -1 : 1) * (0.6 + i * 0.4); m.material.opacity = k; });
      v.glowDisc.rotation.y = F.t * 0.5; v.glowDisc.material.opacity = k;
      // the floor it passes over keeps glowing and cracked for a while
      v.scarT = (v.scarT || 0) + dt;
      if (v.scarT > 0.25) {
        v.scarT = 0;
        const d = L.disc(crackTex(), fx.r * 1.4, VIO, 0.8); d.position.set(fx.x, fx.y + 0.05, fx.z); d.rotation.y = Math.random() * 6.28;
        F.add(d);
        F.spawn((dt2, age) => { d.material.opacity = 0.8 * (1 - age / 3); return age < 3; }, [d]);
      }
      sparks(F, fx.x + (Math.random() - 0.5) * fx.r * 2, fx.y + 0.2, fx.z + (Math.random() - 0.5) * fx.r * 2, 6, 10);
      F.flash(fx.x, fx.y + 2, fx.z, VIO, 6 * k, 0.1);
      F.atmo({ grade: 0x9040ff, gradeAmt: 0.25 * k, dark: 0.2 * k });
    },
    end(F, v) { F.remove(v.root); return 0; },
  };
  AFX.vfx['plasma_ult:blast'] = (F, e) => {
    F.white(0.6); F.shake(0.6);
    F.flash(e.x, e.y + 2, e.z, VIO, 16, 0.7);
    const s = new T.Mesh(new T.SphereGeometry(1, 28, 18), L.fresnel(VIO, 1.2, 2.5)); s.position.set(e.x, e.y, e.z); F.add(s);
    const c = new T.Mesh(new T.SphereGeometry(1, 28, 18), L.add(CORE, 1)); c.position.set(e.x, e.y, e.z); F.add(c);
    F.spawn((dt, age) => { const k = age / 0.6; s.scale.setScalar(1 + k * 16); s.material.uniforms.uK.value = 2.5 * (1 - k); c.scale.setScalar(4 * (1 - k) + 0.01); return k < 1; }, [s, c]);
    sparks(F, e.x, e.y + 1, e.z, 160, 24);
  };
})(window.SO = window.SO || {});
