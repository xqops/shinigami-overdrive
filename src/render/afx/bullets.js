// 12. RAJADA DE BALAS — red energy fire from a spectral cannon in the left hand.
//   Disparo Rápido: five red muzzle flashes in a row and tracer lines down range.
//   Balas Buscadoras: bullets hang in front of you inside red rings, then curve into their targets.
//   Metralhadora: the spectral barrels spin up and glow white-hot; energy casings spill out; the
//     tracers merge into an almost unbroken red line.
//   Chuva de Projéteis: red circles open in the air; thousands of rounds hang over the arena and
//     rain down in a storm, heaviest on the marked.
(function (SO) {
  'use strict';
  const T = THREE, L = SO.AFXLib, AFX = SO.AFX;
  const RED = 0xff3030, HOT = 0xffd0c0, DARK = 0x6a0808;

  const ringTex = () => L.tex('bullet-ring', 256, (c, s) => {
    const col = 'rgba(255,70,60,1)';
    L.draw.ring(c, s, s * 0.46, 6, col); L.draw.ring(c, s, s * 0.36, 2, col);
    L.draw.ticks(c, s, s * 0.36, s * 0.46, 12, 4, col);
    L.draw.glyphs(c, s, s * 0.41, '弾幕弾幕弾幕', 20, col);
  });
  const flashTex = () => L.tex('bullet-flash', 128, (c, s) => {
    c.translate(s / 2, s / 2); c.fillStyle = 'rgba(255,220,200,1)';
    for (let i = 0; i < 6; i++) { c.rotate(Math.PI / 3); c.beginPath(); c.moveTo(0, -4); c.lineTo(s * 0.45, 0); c.lineTo(0, 4); c.fill(); }
    const g = c.createRadialGradient(0, 0, 0, 0, 0, s * 0.25); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,60,40,0)'); c.fillStyle = g; c.fillRect(-s / 2, -s / 2, s, s);
  });
  function muzzle(F, scale) {
    const s = L.sprite(flashTex(), 0.25 * scale, RED);
    s.material.rotation = Math.random() * 6.28;
    F.add(s);
    F.spawn((dt, age) => { s.position.copy(F.hand(-1, 0.95)); s.material.opacity = 1 - age / 0.06; return age < 0.06; }, [s]);
  }
  function tracer(F) {
    return {
      build(F2) { const root = new T.Group(); const m = new T.Mesh(new T.BoxGeometry(0.06, 0.06, 1.6), L.add(HOT, 1)); const g = new T.Mesh(new T.BoxGeometry(0.2, 0.2, 2.2), L.add(RED, 0.6)); root.add(g); root.add(m); return { root }; },
      update(F2, v, dt, vel) { const p = v.root.position; v.root.lookAt(p.x + vel.x, p.y + vel.y, p.z + vel.z); },
      hit(F2, e) { F2.fx.burst(e.x, e.y, e.z, 6, 6, RED, 0.18, 0.2, 4); F2.flash(e.x, e.y, e.z, RED, 1.5, 0.08); },
      end(F2, e) { F2.fx.burst(e.x, e.y, e.z, 4, 4, RED, 0.15, 0.2, 6); },
    };
  }

  // ---------------- Disparo Rápido ----------------
  AFX.cast.bullets_1 = () => {};
  AFX.vfx['bullets_1:shot'] = (F, e, mine) => { if (mine) { muzzle(F, 1.2); F.kick(1.5); F.shake(0.03); } };
  AFX.spell.bullets_1 = tracer();

  // ---------------- Balas Buscadoras ----------------
  AFX.cast.bullets_2 = () => {};
  AFX.spell.bullets_2 = {
    build(F) {
      const root = new T.Group();
      const ball = new T.Mesh(new T.SphereGeometry(0.1, 10, 8), L.solid(HOT));
      const ring = L.sprite(ringTex(), 0.55, RED);
      root.add(ball); root.add(ring);
      return { root, ring, trail: new L.Trail(F.scene, 20, 0.07, RED, { core: HOT, life: 0.3 }) };
    },
    update(F, v, dt, vel) {
      const sp = Math.hypot(vel.x, vel.y, vel.z);
      // while hanging: the ring spins and pulses; once launched it shrinks into the round
      v.ring.material.rotation += dt * 5;
      v.ring.scale.setScalar(sp < 0.5 ? 0.55 + Math.sin(F.t * 20) * 0.05 : Math.max(0.01, v.ring.scale.x - dt * 3));
      if (sp > 0.5) v.trail.push(v.root.position, new T.Vector3(0, 1, 0), dt); else v.trail.push(null, null, dt);
    },
    launch(F, e) { F.flash(e.x, e.y, e.z, RED, 2, 0.08); },
    hit(F, e) { F.fx.burst(e.x, e.y, e.z, 14, 8, RED, 0.22, 0.25, 4); F.flash(e.x, e.y, e.z, RED, 3, 0.12); },
    end(F, e) { F.fx.burst(e.x, e.y, e.z, 6, 4, RED, 0.15, 0.2, 6); },
  };

  // ---------------- Metralhadora ----------------
  AFX.cast.bullets_3 = () => {};
  AFX.buff.bullets_3 = {
    build(F) {
      // a spectral rotary cannon of red energy held in the left hand (viewmodel space)
      const gun = new T.Group();
      const barrels = new T.Group();
      for (let i = 0; i < 6; i++) { const b = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.42, 6).rotateX(Math.PI / 2), new T.MeshBasicMaterial({ color: DARK })); const a = i / 6 * 6.28; b.position.set(Math.cos(a) * 0.035, Math.sin(a) * 0.035, 0); barrels.add(b); }
      const shroud = new T.Mesh(new T.CylinderGeometry(0.06, 0.07, 0.18, 10, 1, true).rotateX(Math.PI / 2), L.add(RED, 0.5)); shroud.position.z = 0.12;
      gun.add(barrels); gun.add(shroud);
      gun.position.set(-0.24, -0.22, -0.62);
      gun.renderOrder = 10;
      F.vm.scene.add(gun);
      return { gun, barrels, shroud, spin: 0 };
    },
    update(F, v, b, dt) {
      v.spin += dt * (10 + b.heat * 50);
      v.barrels.rotation.z = v.spin;
      // heat: dark red to white-hot
      const k = b.heat;
      for (const m of v.barrels.children) m.material.color.setRGB(0.4 + k * 0.6, 0.03 + k * 0.85, 0.03 + k * 0.75);
      v.gun.position.x = -0.24 + (Math.random() - 0.5) * 0.006; v.gun.position.y = -0.22 + (Math.random() - 0.5) * 0.006;
      if (Math.random() < 0.7) muzzle(F, 0.9);
      // energy casings spilling out of the side
      if (Math.random() < 0.5) { const h = F.hand(-1, 0.75); const side = new T.Vector3(-1, 0.6, 0).applyQuaternion(F.cam.quaternion); F.fx.glowP.emit(h.x, h.y, h.z, side.x * 3, side.y * 3 + 1, side.z * 3, 1, 0.4, 0.2, 0.05, 0.5, 14, 0); }
      F.shake(0.01);
    },
    end(F, v) { F.vm.scene.remove(v.gun); },
  };
  AFX.spell.bullets_3 = tracer();

  // ---------------- Chuva de Projéteis ----------------
  AFX.ult.bullets_ult = { start(F, e, mine) { if (mine) F.kick(5); }, end() {} };
  AFX.effect.bullets_ult = {
    build(F, fx) {
      const root = new T.Group();
      // red circles opening above the arena, with rounds hanging inside them
      const circles = [];
      for (let i = 0; i < 9; i++) { const m = new T.Mesh(new T.PlaneGeometry(9, 9), new T.MeshBasicMaterial({ map: ringTex(), color: RED, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false })); m.rotation.x = Math.PI / 2; const a = i / 9 * 6.28; m.position.set(Math.cos(a) * (8 + (i % 3) * 8), 22 + (i % 2) * 3, Math.sin(a) * (8 + (i % 3) * 8)); root.add(m); circles.push(m); }
      const n = 600, geo = new T.BufferGeometry(), pos = new Float32Array(n * 3);
      for (let i = 0; i < n; i++) { const a = Math.random() * 6.28, r = Math.random() * 30; pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = 19 + Math.random() * 8; pos[i * 3 + 2] = Math.sin(a) * r; }
      geo.setAttribute('position', new T.BufferAttribute(pos, 3));
      const pts = new T.Points(geo, new T.PointsMaterial({ color: RED, size: 0.35, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
      root.add(pts);
      root.position.set(fx.x, 0, fx.z);
      F.add(root);
      return { root, circles, pts };
    },
    update(F, v, fx) {
      const k = Math.min(1, fx.t / 0.6) * Math.min(1, (fx.dur - fx.t) / 0.5);
      v.circles.forEach((m, i) => { m.rotation.z = F.t * (i % 2 ? 1 : -1); m.scale.setScalar(Math.max(0.01, k)); });
      v.pts.material.opacity = k; v.pts.material.size = 0.3 + Math.sin(F.t * 12) * 0.05;
      F.atmo({ grade: 0xff3020, gradeAmt: 0.2 * k, dark: 0.15 * k });
    },
    end(F, v) { F.remove(v.root); return 0; },
  };
  AFX.spell.bullets_ult = {
    build() { const root = new T.Group(); const m = new T.Mesh(new T.BoxGeometry(0.05, 0.05, 2.4), L.add(HOT, 1)); const g = new T.Mesh(new T.BoxGeometry(0.16, 0.16, 3), L.add(RED, 0.5)); root.add(g); root.add(m); return { root }; },
    update(F, v, dt, vel) { const p = v.root.position; v.root.lookAt(p.x + vel.x, p.y + vel.y, p.z + vel.z); },
    hit(F, e) { F.fx.burst(e.x, e.y, e.z, 5, 6, RED, 0.18, 0.18, 4); },
    end(F, e) { F.fx.burst(e.x, e.y, e.z, 4, 5, RED, 0.16, 0.2, 6); F.fx.ring(e.x, e.y + 0.05, e.z, 0.1, 0.8, RED, 0.15, 0.8); },
  };
  AFX.status['bullets_ult:mark'] = {
    build(F, ctx) {
      const s = L.sprite(ringTex(), ctx.e.def.height * 0.8 + 0.6, RED);
      s.position.y = ctx.e.def.height * 0.55;
      ctx.view.root.add(s);
      return { root: s };
    },
    update(F, v) { v.root.material.rotation = -F.t * 4; v.root.material.opacity = 0.5 + 0.3 * Math.sin(F.t * 10); },
  };
})(window.SO = window.SO || {});
