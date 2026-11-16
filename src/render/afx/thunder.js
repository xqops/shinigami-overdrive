// 17. TROVÃO — yellow lightning: thick forked bolts, flashes, sparks scattered on the stone.
//   Raios em Cadeia: discharges jump from body to body along crooked paths with small flashes.
//   Salto Elétrico: lightning wraps your legs; the floor explodes where you leave and where you land.
//   Pilar de Raios: dark clouds gather and churn over the mark, then a thick bolt drops through.
//   Tempestade Divina: yellow-black storm clouds over the arena, bolts falling by themselves, a giant
//     electric sigil in the sky before the final strike.
(function (SO) {
  'use strict';
  const T = THREE, L = SO.AFXLib, AFX = SO.AFX;
  const YEL = 0xffe14a, WHITE = 0xfffbe0, DARK = 0x16140a;

  const sigilTex = () => L.tex('thunder-sigil', 512, (c, s) => {
    const col = 'rgba(255,230,90,1)';
    L.draw.ring(c, s, s * 0.47, 8, col); L.draw.ring(c, s, s * 0.4, 3, col);
    L.draw.star(c, s, s * 0.4, 6, 2, 4, col);
    L.draw.glyphs(c, s, s * 0.435, '雷電霆轟雷電霆轟雷電霆轟', 28, col);
    c.fillStyle = col; c.font = '150px "DotGothic16",serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('雷', s / 2, s / 2 + 8);
  });
  const cloudTex = () => L.tex('thunder-cloud', 256, (c, s) => {
    for (let i = 0; i < 40; i++) { const x = s / 2 + (Math.random() - 0.5) * s * 0.6, y = s / 2 + (Math.random() - 0.5) * s * 0.6, r = s * (0.08 + Math.random() * 0.14); const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(40,36,30,0.55)'); g.addColorStop(1, 'rgba(20,18,14,0)'); c.fillStyle = g; c.fillRect(0, 0, s, s); }
  });
  function sparks(F, x, y, z, n) { for (let i = 0; i < n; i++) F.fx.glowP.emit(x, y, z, (Math.random() - 0.5) * 10, Math.random() * 8, (Math.random() - 0.5) * 10, 1, 0.95, 0.5, 0.12, 0.3, 14, 1); }
  function strike(F, x, y, z, top, w) {
    F.bolt(new T.Vector3(x + (Math.random() - 0.5) * 4, top, z + (Math.random() - 0.5) * 4), new T.Vector3(x, y, z), w, 0.35, YEL, true, 1.8);
    F.flash(x, y + 2, z, YEL, 7, 0.3);
    sparks(F, x, y + 0.2, z, 16);
    F.fx.ring(x, y + 0.05, z, 0.2, 2.5 * w, YEL, 0.25, 0.9);
  }
  function groundBolts(F, x, y, z, r, n) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.28; F.bolt(new T.Vector3(x, y + 0.2, z), new T.Vector3(x + Math.cos(a) * r, y + 0.1, z + Math.sin(a) * r), 0.25, 0.3, YEL, true, 1); } }

  // ---------------- Raios em Cadeia ----------------
  AFX.cast.thunder_1 = () => {};
  AFX.vfx['thunder_1:chain'] = (F, e, mine) => {
    const pts = e.pts.map((p) => new T.Vector3(p[0], p[1], p[2]));
    for (let i = 1; i < pts.length; i++) {
      F.bolt(pts[i - 1], pts[i], i === 1 ? 0.6 : 0.45, 0.32, YEL, true, 1.6);
      F.flash(pts[i].x, pts[i].y, pts[i].z, YEL, 5, 0.25);
      sparks(F, pts[i].x, pts[i].y, pts[i].z, 12);
    }
    if (mine) F.white(0.15);
  };
  const shock = {
    build(F, ctx) { return { e: ctx.e }; },
    update(F, v, s, e) { if (Math.random() < 0.35) { const a = new T.Vector3(e.pos.x + (Math.random() - 0.5) * e.def.radius * 2, e.pos.y + Math.random() * e.def.height, e.pos.z + (Math.random() - 0.5) * e.def.radius * 2); F.bolt(a, a.clone().add(new T.Vector3((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 1.2)), 0.08, 0.08, YEL, false, 0.4); } },
  };
  AFX.status['thunder:shock'] = shock;
  AFX.status['thunder_ult:shock'] = shock;

  // ---------------- Salto Elétrico ----------------
  AFX.cast.thunder_2 = () => {};
  AFX.vfx['thunder_2:takeoff'] = (F, e, mine) => { groundBolts(F, e.x, e.y, e.z, 4.5, 8); F.flash(e.x, e.y + 1, e.z, YEL, 8, 0.3); sparks(F, e.x, e.y, e.z, 30); if (mine) { F.kick(8); F.white(0.15); } };
  AFX.vfx['thunder_2:land'] = (F, e, mine) => { groundBolts(F, e.x, e.y, e.z, 5.5, 10); F.flash(e.x, e.y + 1, e.z, YEL, 9, 0.35); sparks(F, e.x, e.y, e.z, 40); F.fx.ring(e.x, e.y + 0.05, e.z, 0.3, 5.5, YEL, 0.3, 0.9); if (mine) F.shake(0.3); };
  AFX.buff.thunder_2 = {
    build() { return {}; },
    update(F) {
      // lightning crawling around your legs and a yellow trail while airborne
      const p = F.player; if (!p) return;
      if (Math.random() < 0.6) { const a = new T.Vector3(p.pos.x + (Math.random() - 0.5) * 0.6, p.pos.y + Math.random() * 0.8, p.pos.z + (Math.random() - 0.5) * 0.6); F.bolt(a, a.clone().add(new T.Vector3((Math.random() - 0.5), Math.random() * 0.6, (Math.random() - 0.5))), 0.1, 0.1, YEL, false, 0.4); }
      F.fx.glowP.emit(p.pos.x, p.pos.y + 0.6, p.pos.z, 0, 0, 0, 1, 0.9, 0.3, 0.3, 0.5, 0, 0);
    },
  };

  // ---------------- Pilar de Raios (and the storm's final strike) ----------------
  AFX.cast.thunder_3 = () => {};
  AFX.effect.thunder_3 = {
    build(F, fx) {
      const S = fx.scale || 1;
      const root = new T.Group(); root.position.set(fx.x, fx.y, fx.z);
      const clouds = [];
      for (let i = 0; i < 7; i++) { const m = new T.Mesh(new T.PlaneGeometry(9 * S, 9 * S), new T.MeshBasicMaterial({ map: cloudTex(), transparent: true, depthWrite: false, side: T.DoubleSide, fog: false })); m.rotation.x = Math.PI / 2; m.position.y = 18 * S + i * 0.4; m.userData = { a: i / 7 * 6.28, r: 3 * S }; root.add(m); clouds.push(m); }
      const mark = new T.Mesh(new T.RingGeometry(fx.r * 0.9, fx.r, 48).rotateX(-Math.PI / 2), L.add(YEL, 0.7)); mark.position.y = 0.06;
      root.add(mark);
      let sigil = null;
      if (S > 1) { sigil = new T.Mesh(new T.PlaneGeometry(30, 30), new T.MeshBasicMaterial({ map: sigilTex(), color: YEL, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false })); sigil.rotation.x = Math.PI / 2; sigil.position.y = 28; root.add(sigil); }
      F.add(root);
      return { root, clouds, mark, sigil, S };
    },
    update(F, v, fx, dt) {
      const k = Math.min(1, fx.t / fx.dur);
      v.clouds.forEach((m, i) => { const u = m.userData; u.a += dt * (1 + k * 3); m.position.x = Math.cos(u.a) * u.r * (1 - k * 0.7); m.position.z = Math.sin(u.a) * u.r * (1 - k * 0.7); m.rotation.z += dt * (i % 2 ? 1 : -1); m.material.opacity = Math.min(1, fx.t * 3); });
      v.mark.material.opacity = 0.4 + 0.5 * Math.sin(F.t * 30 * k);
      // flickers inside the clouds before the bolt
      if (Math.random() < k * 0.4) { const y = 18 * v.S; F.bolt(new T.Vector3(fx.x + (Math.random() - 0.5) * 6 * v.S, fx.y + y, fx.z + (Math.random() - 0.5) * 6 * v.S), new T.Vector3(fx.x + (Math.random() - 0.5) * 6 * v.S, fx.y + y, fx.z + (Math.random() - 0.5) * 6 * v.S), 0.2, 0.08, YEL, false, 1); }
      if (v.sigil) { v.sigil.rotation.z = F.t * 0.5; v.sigil.material.opacity = Math.min(1, fx.t / 0.4); }
      F.atmo({ grade: 0x806a20, gradeAmt: 0.25 * k * v.S / 2, dark: 0.25 * k });
    },
    end(F, v) { F.remove(v.root); return 0; },
  };
  AFX.vfx['thunder_3:strike'] = (F, e, mine) => {
    const big = e.big ? 1 : 0, S = big ? 3 : 1;
    // the thick bolt itself, struck several times in a few frames
    for (let i = 0; i < 3 + big * 3; i++) F.bolt(new T.Vector3(e.x + (Math.random() - 0.5) * S, e.y + 20 * S, e.z + (Math.random() - 0.5) * S), new T.Vector3(e.x, e.y, e.z), (i ? 1 : 2.4) * S, 0.45, YEL, true, 2 * S);
    groundBolts(F, e.x, e.y, e.z, 4.5 * S, 10 + big * 10);
    const col = new T.Mesh(new T.CylinderGeometry(1.2 * S, 1.6 * S, 30 * S, 16, 1, true).translate(0, 15 * S, 0), L.add(WHITE, 0.6));
    col.position.set(e.x, e.y, e.z); F.add(col);
    F.spawn((dt, age) => { col.material.opacity = 0.6 * (1 - age / 0.3); col.scale.set(1 - age * 2, 1, 1 - age * 2); return age < 0.3; }, [col]);
    F.flash(e.x, e.y + 3, e.z, YEL, 14 + big * 12, 0.5);
    sparks(F, e.x, e.y, e.z, 60 + big * 100);
    if (mine) { F.white(0.4 + big * 0.4); F.shake(0.4 + big * 0.5); }
  };

  // ---------------- Tempestade Divina ----------------
  AFX.ult.thunder_ult = { start(F, e, mine) { if (mine) F.white(0.3); }, end() {} };
  AFX.effect.thunder_ult = {
    build(F, fx) {
      // a ceiling of churning yellow-black cloud over the arena
      const sky = new T.Mesh(new T.PlaneGeometry(220, 220, 1, 1), new T.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uK: { value: 0 }, uFlash: { value: 0 } }, transparent: true, depthWrite: false, side: T.DoubleSide, fog: false,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform float uTime, uK, uFlash; varying vec2 vUv;
          float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
          float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
          void main(){ vec2 p = vUv * 8.0; float c = n(p + uTime * 0.2) * 0.6 + n(p * 2.3 - uTime * 0.3) * 0.4;
            vec3 col = mix(vec3(0.05, 0.045, 0.02), vec3(0.26, 0.21, 0.04), c * c * c) + vec3(1.0, 0.9, 0.4) * uFlash * c * c;
            gl_FragColor = vec4(col, uK * (0.85 + 0.15 * c)); }`,
      }));
      sky.rotation.x = Math.PI / 2; sky.position.y = 55;
      F.add(sky);
      return { root: sky, sky, flash: 0 };
    },
    update(F, v, fx, dt) {
      const k = Math.min(1, fx.t / 1) * Math.min(1, (fx.dur - fx.t) / 1);
      v.flash = Math.max(0, v.flash - dt * 6);
      if (Math.random() < 0.05) v.flash = 1;
      const u = v.sky.material.uniforms; u.uTime.value = F.t; u.uK.value = k; u.uFlash.value = v.flash;
      v.sky.position.x = F.cam.position.x; v.sky.position.z = F.cam.position.z;
      F.atmo({ grade: 0x9a8030, gradeAmt: 0.25 * k, dark: 0.35 * k });
      // speed: sparks streaming off the body
      const p = F.player;
      if (p && Math.random() < 0.6) { const a = new T.Vector3(p.pos.x + (Math.random() - 0.5) * 1.2, p.pos.y + Math.random() * 1.6, p.pos.z + (Math.random() - 0.5) * 1.2); F.bolt(a, a.clone().add(new T.Vector3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5), (Math.random() - 0.5) * 1.5)), 0.08, 0.1, YEL, false, 0.5); }
    },
    end(F, v) { F.remove(v.root); return 0; },
  };
  AFX.vfx['thunder_ult:bolt'] = (F, e) => { strike(F, e.x, e.y, e.z, 50, 1.3); const v = Object.values(F.effects).find((x) => x.def === AFX.effect.thunder_ult); if (v) v.flash = 1; };
})(window.SO = window.SO || {});
