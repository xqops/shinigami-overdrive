// 16. REGENERAÇÃO — living green light: rising motes, threads, roots, glyphs of life.
//   Cura Rápida: a green wave runs up through you; motes rise around your body.
//   Transferência: green threads tie you to the victim and glowing beads travel along them to you.
//   Renovação: glyphs of life circle your hands and pulse at a steady rhythm.
//   Imortalidade: a huge green aura, roots of light breaking from the ground, symbols of life
//     floating around you; at the end the aura closes into crystal armor.
(function (SO) {
  'use strict';
  const T = THREE, L = SO.AFXLib, AFX = SO.AFX;
  const GREEN = 0x3dff7a, PALE = 0xd0ffe0, DEEP = 0x0a6a2a;

  const glyphTex = () => L.tex('regen-glyph', 128, (c, s) => {
    const col = 'rgba(140,255,180,1)';
    L.draw.ring(c, s, s * 0.42, 4, col);
    c.fillStyle = col; c.font = '64px "DotGothic16",serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('生', s / 2, s / 2 + 3);
  });
  function rise(F, x, y, z, n, r) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, rr = r * (0.3 + Math.random() * 0.7); F.fx.glowP.emit(x + Math.cos(a) * rr, y + Math.random() * 0.5, z + Math.sin(a) * rr, 0, 2 + Math.random() * 2.5, 0, 0.3, 1, 0.5, 0.1 + Math.random() * 0.1, 0.9, -0.5, 0); } }

  // ---------------- Cura Rápida ----------------
  AFX.cast.regen_1 = () => {};
  AFX.vfx['regen_1:wave'] = (F, e, mine) => {
    if (!mine) return;
    const p = F.player.pos;
    // the wave: a ring that climbs from the feet past the eyes
    const ring = new T.Mesh(new T.TorusGeometry(1, 0.06, 6, 40).rotateX(Math.PI / 2), L.add(GREEN, 1));
    F.add(ring);
    F.spawn((dt, age) => { const k = age / 0.5; ring.position.set(p.x, p.y + k * 2.4, p.z); ring.scale.setScalar(1.6 - k * 0.6); ring.material.opacity = 1 - k; return k < 1; }, [ring]);
    rise(F, p.x, p.y, p.z, 50, 2.5);
    F.spawn((dt, age) => { F.atmo({ grade: GREEN, gradeAmt: 0.22 * (1 - age / 0.6) }); return age < 0.6; });
  };

  // ---------------- Transferência ----------------
  AFX.cast.regen_2 = () => {};
  AFX.status['regen_2:drain'] = {
    build(F, ctx) {
      const threads = [0, 1, 2].map(() => { const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(), new T.Vector3(0, 1, 0), new T.Vector3(0, 2, 0)]), 20, 0.025, 4), L.add(GREEN, 0.8)); F.add(m); return m; });
      const beads = [0, 1, 2, 3, 4].map(() => { const b = L.sprite(L.dot(), 0.35, PALE); F.add(b); return b; });
      return { own: threads.concat(beads), threads, beads, e: ctx.e };
    },
    update(F, v, s, e) {
      const pl = F.player; if (!pl) return;
      const a = new T.Vector3(e.pos.x, e.pos.y + e.def.height * 0.6, e.pos.z), b = F.hand(-1, 0.7);
      v.threads.forEach((m, i) => {
        const mid = a.clone().lerp(b, 0.5).add(new T.Vector3(Math.sin(F.t * 3 + i * 2) * 0.8, 1 + i * 0.4, Math.cos(F.t * 2 + i) * 0.8));
        m.geometry.dispose();
        m.geometry = new T.TubeGeometry(new T.CatmullRomCurve3([a, mid, b]), 20, 0.025 + i * 0.01, 4);
      });
      v.beads.forEach((bd, i) => { const k = (F.t * 1.6 + i / 5) % 1; const mid = a.clone().lerp(b, 0.5).add(new T.Vector3(0, 1.2, 0)); const p1 = a.clone().lerp(mid, k), p2 = mid.clone().lerp(b, k); bd.position.copy(p1.lerp(p2, k)); });
    },
    end(F, v) { for (const o of v.own) F.remove(o); },
  };

  // ---------------- Renovação ----------------
  AFX.cast.regen_3 = () => {};
  AFX.buff.regen_3 = {
    build(F) { const glyphs = [0, 1, 2].map(() => { const s = L.sprite(glyphTex(), 0.13, GREEN); s.renderOrder = 10; F.vm.scene.add(s); return s; }); return { glyphs, pulse: 0 }; },
    update(F, v, b, dt) {
      v.glyphs.forEach((s, i) => { const a = F.t * 2 + i * 2.09; s.position.set(-0.28 + Math.cos(a) * 0.12, -0.3 + Math.sin(a) * 0.05, -0.65 + Math.sin(a) * 0.08); s.material.opacity = b.hurt > 0 ? 0.4 : 0.9; });
      // a pulse every second
      v.pulse += dt;
      if (v.pulse > 1) { v.pulse = 0; F.spawn((d, age) => { F.atmo({ grade: GREEN, gradeAmt: 0.12 * (1 - age / 0.3) }); return age < 0.3; }); const p = F.player.pos; rise(F, p.x, p.y, p.z, 12, 1.5); }
    },
    end(F, v) { for (const s of v.glyphs) F.vm.scene.remove(s); },
  };

  // ---------------- Imortalidade ----------------
  AFX.ult.regen_ult = { start(F, e, mine) { if (mine) F.white(0.3); }, end() {} };
  AFX.buff.regen_ult = {
    build(F) {
      const p = F.player.pos;
      // roots of light breaking out of the ground around you
      const roots = [];
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * 6.28 + Math.random() * 0.4, pts = [];
        for (let k = 0; k <= 10; k++) { const t = k / 10; pts.push(new T.Vector3(Math.cos(a) * (1.5 + t * 6), Math.sin(t * 3.14) * 1.4 - t * 0.2, Math.sin(a) * (1.5 + t * 6)).add(new T.Vector3((Math.random() - 0.5) * 0.4, 0, (Math.random() - 0.5) * 0.4))); }
        const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 30, 0.09, 5), L.energy(GREEN, { color2: PALE, freq: 6, speed: 3, sharp: 0.3, edge: 0.02 }));
        m.position.set(p.x, p.y + 0.05, p.z);
        F.add(m); roots.push(m);
      }
      const symbols = [0, 1, 2, 3, 4, 5].map(() => { const s = L.sprite(glyphTex(), 0.9, GREEN); F.add(s); return s; });
      return { roots, symbols, own: roots.concat(symbols), born: 0 };
    },
    update(F, v, b, dt) {
      v.born = Math.min(1, v.born + dt / 0.6);
      const p = F.player.pos;
      v.roots.forEach((m, i) => { m.material.uniforms.uTime.value = F.t + i; m.material.uniforms.uK.value = v.born; m.position.lerp(new T.Vector3(p.x, p.y + 0.05, p.z), 0.02); });
      v.symbols.forEach((s, i) => { const a = F.t * 0.8 + i * 1.047; s.position.set(p.x + Math.cos(a) * 3.2, p.y + 1.2 + Math.sin(F.t * 2 + i) * 0.6, p.z + Math.sin(a) * 3.2); });
      rise(F, p.x, p.y, p.z, 4, 3.5);
      F.atmo({ grade: 0x40ff90, gradeAmt: 0.25 * v.born });
    },
    end(F, v) { for (const o of v.own) F.remove(o); },
  };
  AFX.vfx['regen_ult:pulse'] = (F, e) => { F.fx.ring(e.x, e.y + 0.1, e.z, 0.3, 6.5, GREEN, 0.4, 0.95); rise(F, e.x, e.y, e.z, 30, 3); F.flash(e.x, e.y + 1, e.z, GREEN, 6, 0.3); };
  AFX.vfx['regen_ult:seal'] = (F, e, mine) => {
    // crystal shards converge onto the body and lock into armor
    for (let i = 0; i < 60; i++) { const a = Math.random() * 6.28, b = (Math.random() - 0.3) * 1.2, r = 5; const x = e.x + Math.cos(a) * Math.cos(b) * r, y = e.y + 1 + Math.sin(b) * r, z = e.z + Math.sin(a) * Math.cos(b) * r; F.fx.glowP.emit(x, y, z, (e.x - x) * 2.5, (e.y + 1 - y) * 2.5, (e.z - z) * 2.5, 0.6, 1, 0.75, 0.2, 0.4, 0, 0); }
    if (mine) { F.white(0.4); F.spawn((dt, age) => { F.atmo({ grade: 0x80ffb0, gradeAmt: 0.4 * (1 - age / 0.6) }); return age < 0.6; }); }
  };
})(window.SO = window.SO || {});
