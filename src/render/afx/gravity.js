// 11. GRAVIDADE — violet, but mostly the absence of light: bent space, dark cores, floating debris.
//   Puxão: lines of violet curve in toward the point and everything spirals in.
//   Campo Gravitacional: rings turn around a dark core inside a faint sphere; stones lift off the floor.
//   Esmagamento: a sigil hangs over each target, then an invisible column crushes them and cracks the floor.
//   Colapso Gravitacional: a black singularity with a burning accretion ring, light bending around it,
//     rubble orbiting faster and faster until it bursts.
(function (SO) {
  'use strict';
  const T = THREE, L = SO.AFXLib, AFX = SO.AFX;
  const VIO = 0x9b4dff, PALE = 0xe0c8ff, DEEP = 0x2a0860;

  const sigilTex = () => L.tex('grav-sigil', 256, (c, s) => {
    const col = 'rgba(190,140,255,1)';
    L.draw.ring(c, s, s * 0.46, 5, col); L.draw.ring(c, s, s * 0.3, 2, col); L.draw.ring(c, s, s * 0.12, 6, col);
    for (let i = 0; i < 3; i++) { c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.arc(s / 2, s / 2, s * 0.38, i * 2.09, i * 2.09 + 1.4); c.stroke(); }
    L.draw.ticks(c, s, s * 0.12, s * 0.3, 8, 3, col);
  });
  const crackTex = () => L.tex('grav-crack', 256, (c, s) => {
    c.strokeStyle = 'rgba(170,110,255,1)';
    for (let i = 0; i < 10; i++) { let x = s / 2, y = s / 2, a = i / 10 * 6.28; c.lineWidth = 4; c.beginPath(); c.moveTo(x, y); for (let k = 0; k < 5; k++) { a += (Math.random() - 0.5) * 0.6; x += Math.cos(a) * 22; y += Math.sin(a) * 22; c.lineTo(x, y); } c.stroke(); }
  });
  // spiralling motes drawn toward a point
  function inward(F, at, r, n, swirl) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, rr = r * (0.4 + Math.random() * 0.6);
      const px = at.x + Math.cos(a) * rr, pz = at.z + Math.sin(a) * rr, py = at.y + (Math.random() - 0.5) * r * 0.5;
      F.fx.glowP.emit(px, py, pz, (at.x - px) * 2.4 - Math.sin(a) * swirl, (at.y - py) * 2.4, (at.z - pz) * 2.4 + Math.cos(a) * swirl, 0.6, 0.3, 1, 0.16, 0.4, 0, 0);
    }
  }
  function stones(F, n, rMin, rMax) {
    const geo = new T.DodecahedronGeometry(1, 0), mat = new T.MeshLambertMaterial({ color: 0x3a3440, emissive: 0x1a0830 });
    const list = [];
    for (let i = 0; i < n; i++) { const m = new T.Mesh(geo, mat); m.scale.setScalar(0.12 + Math.random() * 0.35); m.userData = { a: Math.random() * 6.28, r: rMin + Math.random() * (rMax - rMin), y: Math.random(), w: 0.5 + Math.random(), tilt: (Math.random() - 0.5) * 0.6 }; list.push(m); }
    return list;
  }

  // ---------------- Puxão ----------------
  AFX.cast.gravity_1 = () => {};
  AFX.effect.gravity_1 = {
    build(F, fx) {
      const root = new T.Group(); root.position.set(fx.x, fx.y, fx.z);
      const core = new T.Mesh(new T.SphereGeometry(0.45, 16, 12), L.solid(0x000000));
      const rim = new T.Mesh(new T.SphereGeometry(0.5, 16, 12), L.fresnel(VIO, 1.3, 2));
      root.add(core); root.add(rim);
      // curved field lines converging on the point
      const lines = [];
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * 6.28, pts = [];
        for (let k = 0; k <= 16; k++) { const t = k / 16; const r = fx.r * (1 - t); pts.push(new T.Vector3(Math.cos(a + t * 2.2) * r, Math.sin(t * 3.14) * 1.2 - (1 - t) * 0.8, Math.sin(a + t * 2.2) * r)); }
        const m = new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 40, 0.05, 4), L.energy(VIO, { color2: PALE, freq: 10, speed: 8, sharp: 0.35, edge: 0.05 }));
        root.add(m); lines.push(m);
      }
      F.add(root);
      return { root, core, rim, lines };
    },
    update(F, v, fx) {
      const k = Math.min(1, fx.t / 0.1) * Math.min(1, (fx.dur - fx.t) / 0.2);
      for (const m of v.lines) { m.material.uniforms.uTime.value = F.t; m.material.uniforms.uK.value = k; }
      v.root.rotation.y = F.t * 2;
      inward(F, fx, fx.r, 10, 6);
      F.lensAt(v.root.position, 4, 0.4 * k);
    },
    end(F, v) { F.remove(v.root); return 0; },
  };

  // ---------------- Campo Gravitacional ----------------
  AFX.cast.gravity_2 = () => {};
  AFX.effect.gravity_2 = {
    build(F, fx) {
      const root = new T.Group(); root.position.set(fx.x, fx.y, fx.z);
      const sphere = new T.Mesh(new T.SphereGeometry(fx.r, 32, 20), L.fresnel(VIO, 2.6, 0.9)); sphere.position.y = 2.4;
      const core = new T.Mesh(new T.SphereGeometry(0.5, 16, 12), L.solid(0x05000a)); core.position.y = 2.4;
      const rings = [0, 1, 2].map((i) => { const m = new T.Mesh(new T.TorusGeometry(1.4 + i * 0.7, 0.04, 6, 64), L.add(i === 1 ? PALE : VIO, 0.9)); m.position.y = 2.4; root.add(m); return m; });
      const disc = L.disc(sigilTex(), fx.r, VIO, 0.7); disc.position.y = 0.06;
      const rocks = stones(F, 22, 1.5, fx.r * 0.9);
      for (const r of rocks) root.add(r);
      root.add(sphere); root.add(core); root.add(disc);
      F.add(root);
      return { root, sphere, core, rings, disc, rocks };
    },
    update(F, v, fx) {
      const k = Math.min(1, fx.t / 0.5) * Math.min(1, (fx.dur - fx.t) / 0.5);
      v.sphere.scale.setScalar(Math.max(0.01, k)); v.sphere.material.uniforms.uK.value = 0.9 * k;
      v.rings.forEach((m, i) => { m.rotation.set(F.t * (0.7 + i * 0.4), F.t * (i % 2 ? -0.5 : 0.6), i * 0.7); m.scale.setScalar(k); });
      v.disc.rotation.y = F.t * 0.6; v.disc.material.opacity = 0.7 * k;
      // stones rise off the floor and drift in slow orbits
      for (const r of v.rocks) { const u = r.userData; u.a += 0.004 * u.w; const y = Math.min(1, fx.t / 1.2) * (0.6 + u.y * 3.5) * k; r.position.set(Math.cos(u.a) * u.r, y, Math.sin(u.a) * u.r); r.rotation.x += 0.01; r.rotation.y += 0.013; }
      F.lensAt(new T.Vector3(fx.x, fx.y + 2.4, fx.z), 3, 0.35 * k);
    },
    end(F, v) { F.remove(v.root); return 0; },
  };
  AFX.status['gravity_2:float'] = {
    build(F, ctx) { const m = new T.Mesh(new T.TorusGeometry(ctx.e.def.radius + 0.3, 0.035, 6, 32).rotateX(Math.PI / 2), L.add(VIO, 0.9)); ctx.view.root.add(m); return { root: m, e: ctx.e }; },
    update(F, v, s, e) { v.root.position.y = -0.2 + Math.sin(F.t * 4) * 0.1; v.root.scale.setScalar(1 + Math.sin(F.t * 6) * 0.08); if (Math.random() < 0.2) F.fx.glowP.emit(e.pos.x, e.pos.y, e.pos.z, 0, -1, 0, 0.6, 0.3, 1, 0.1, 0.4, 0, 0); },
  };

  // ---------------- Esmagamento ----------------
  AFX.cast.gravity_3 = () => {};
  AFX.status['gravity_3:mark'] = {
    build(F, ctx) { const s = L.disc(sigilTex(), ctx.e.def.radius + 0.9, VIO, 1); s.position.y = ctx.e.def.height + 1.2; ctx.view.root.add(s); return { root: s }; },
    update(F, v, s) { v.root.rotation.y = F.t * 6; v.root.position.y -= 0.004; v.root.scale.setScalar(1 + (0.5 - s.t) * 0.8); },
  };
  AFX.vfx['gravity_3:crush'] = (F, e) => {
    // the pressure column: a faint shimmering cylinder slamming down
    const col = new T.Mesh(new T.CylinderGeometry(1.6, 1.6, 14, 20, 1, true).translate(0, 7, 0), L.energy(VIO, { color2: PALE, freq: 2, speed: 18, sharp: 0.6, edge: 0.1 }));
    col.position.set(e.x, e.y, e.z);
    const crack = L.disc(crackTex(), 2.6, VIO, 1); crack.position.set(e.x, e.y + 0.06, e.z); crack.rotation.y = Math.random() * 6;
    F.add(col); F.add(crack);
    F.spawn((dt, age) => { col.material.uniforms.uTime.value = F.t; col.material.uniforms.uK.value = Math.max(0, 1 - age / 0.35); col.scale.set(1 - age, 1, 1 - age); crack.material.opacity = Math.max(0, 1 - age / 1.5); return age < 1.5; }, [col, crack]);
    F.fx.burst(e.x, e.y + 0.2, e.z, 30, 6, 0x2a2430, 0.5, 0.8, 8, { ink: true, up: 2 });
    F.lensAt(new T.Vector3(e.x, e.y + 1, e.z), 3, 0.8);
    F.shake(0.15);
  };

  // ---------------- Colapso Gravitacional ----------------
  AFX.ult.gravity_ult = { start(F, e, mine) { if (mine) F.shake(0.3); }, end() {} };
  AFX.effect.gravity_ult = {
    build(F, fx) {
      const root = new T.Group(); root.position.set(fx.x, fx.y, fx.z);
      const core = new T.Mesh(new T.SphereGeometry(1, 32, 20), L.solid(0x000000));
      const halo = new T.Mesh(new T.SphereGeometry(1.15, 32, 20), L.fresnel(VIO, 1.1, 2.4));
      // the accretion disk: a flat ring of streaming light, tilted
      const disk = new T.Mesh(new T.RingGeometry(1.4, 4.2, 96, 1), new T.ShaderMaterial({
        uniforms: { uTime: { value: 0 } }, transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
        vertexShader: 'varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform float uTime; varying vec2 vP;
          float h(vec2 p){ return fract(sin(dot(p, vec2(12.9, 78.2))) * 43758.5); }
          void main(){ float r = length(vP), a = atan(vP.y, vP.x);
            float band = sin(a * 3.0 - uTime * 6.0 + r * 4.0) * 0.5 + 0.5;
            float fade = smoothstep(4.2, 1.6, r) * smoothstep(1.4, 1.8, r);
            float streak = step(0.6, h(vec2(floor(a * 30.0 - uTime * 8.0), floor(r * 6.0))));
            vec3 col = mix(vec3(0.5, 0.15, 1.0), vec3(1.0, 0.85, 1.0), band * 0.6 + streak * 0.4) * fade * (0.5 + band);
            gl_FragColor = vec4(col, 1.0); }`,
      }));
      disk.rotation.x = Math.PI / 2 - 0.35;
      root.add(core); root.add(halo); root.add(disk);
      const rocks = stones(F, 40, 3, 12);
      for (const r of rocks) root.add(r);
      F.add(root);
      return { root, core, halo, disk, rocks };
    },
    update(F, v, fx, dt) {
      const born = Math.min(1, fx.t / 0.8), close = Math.min(1, Math.max(0.01, (fx.dur - fx.t) / 0.4));
      const s = (0.8 + Math.min(4, fx.mass * 0.12)) * born;
      v.core.scale.setScalar(s * (1 - (1 - close) * 0.8)); v.halo.scale.setScalar(s); v.disk.scale.setScalar(s * 1.1);
      v.disk.material.uniforms.uTime.value = F.t;
      v.disk.rotation.z = F.t * 0.8;
      for (const r of v.rocks) {
        const u = r.userData;
        u.r = Math.max(1.5, u.r - dt * (0.4 + fx.t * 0.08));
        u.a += dt * (6 / u.r) * (1 + fx.t * 0.2);
        r.position.set(Math.cos(u.a) * u.r, Math.sin(u.a * 2) * u.tilt * u.r * 0.4, Math.sin(u.a) * u.r);
        r.rotation.x += dt * 3;
        if (u.r <= 1.6 && Math.random() < 0.02) { u.r = 6 + Math.random() * 7; }
      }
      inward(F, fx, 14, 8, 16);
      F.lensAt(v.root.position, 5 + Math.min(4, fx.mass * 0.15), (0.35 + Math.min(0.35, fx.mass * 0.015)) * born);
      F.atmo({ grade: 0x6020c0, gradeAmt: 0.25 * born * close, dark: 0.3 * born * close });
    },
    end(F, v) { F.remove(v.root); return 0; },
  };
  AFX.vfx['gravity_ult:eat'] = (F, e) => { F.flash(e.x, e.y, e.z, PALE, 5, 0.15); };
  AFX.vfx['gravity_ult:burst'] = (F, e) => {
    F.white(0.7); F.shake(0.8);
    F.flash(e.x, e.y, e.z, VIO, 20, 0.8);
    const shell = new T.Mesh(new T.SphereGeometry(1, 32, 20), L.fresnel(PALE, 1.4, 2.5)); shell.position.set(e.x, e.y, e.z); F.add(shell);
    F.spawn((dt, age) => { shell.scale.setScalar(1 + age * 40); shell.material.uniforms.uK.value = Math.max(0, 2.5 - age * 4.5); return age < 0.6; }, [shell]);
    for (let i = 0; i < 220; i++) { const a = Math.random() * 6.28, b = (Math.random() - 0.5) * 3, sp = 10 + Math.random() * 20; F.fx.glowP.emit(e.x, e.y, e.z, Math.cos(a) * Math.cos(b) * sp, Math.sin(b) * sp, Math.sin(a) * Math.cos(b) * sp, 0.6, 0.3, 1, 0.25, 0.8, 0, 1.5); }
    F.fx.ring(e.x, Math.max(0.1, e.y - 3), e.z, 0.5, 16, VIO, 0.7, 0.95);
  };
})(window.SO = window.SO || {});
