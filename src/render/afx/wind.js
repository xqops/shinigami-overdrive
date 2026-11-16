// 15. VENTO CORTANTE — white pressure blades and spinning air; dust and leaves carried along.
//   Corte de Vento: a white arc of compressed air rushes out, warping what is behind it.
//   Redemoinho: a small twister of stacked wind rings, lifting dust as it drifts.
//   Lâminas Aéreas: three quick arcs thrown in a fan that cross on the target.
//   Fúria dos Ventos: a colossal tornado column around you, white blades turning inside it,
//     the screen shuddering, then everything flung outward.
(function (SO) {
  'use strict';
  const T = THREE, L = SO.AFXLib, AFX = SO.AFX;
  const WIND = 0xdfe6ee, PALE = 0xffffff, TINT = 0xa8d8ff;

  // streaked wind shader on a cone/cylinder: bright diagonal streaks scrolling around
  function windMat(o) {
    o = o || {};
    return new T.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uK: { value: 1 }, uSpeed: { value: o.speed || 3 }, uThin: { value: o.thin || 0.35 } },
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float uTime, uK, uSpeed, uThin; varying vec2 vUv;
        float h(float x){ return fract(sin(x * 91.3) * 47453.1); }
        void main(){
          float x = vUv.x * 18.0 + vUv.y * 4.0 - uTime * uSpeed;
          float id = floor(x), f = fract(x);
          float streak = smoothstep(0.0, 0.05, f) * smoothstep(uThin + h(id) * uThin, 0.06, f) * step(0.35, h(id + 3.0));
          float a = streak * uK * smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.8, vUv.y);
          if (a < 0.05) discard;
          gl_FragColor = vec4(vec3(0.85, 0.92, 1.0) * a, 1.0);
        }`,
    });
  }
  function dust(F, x, y, z, n, up) { for (let i = 0; i < n; i++) F.fx.inkP.emit(x + (Math.random() - 0.5) * 2, y + Math.random(), z + (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 3, up + Math.random() * 3, (Math.random() - 0.5) * 3, 0.42, 0.4, 0.36, 0.2 + Math.random() * 0.2, 0.8, 1, 1); }
  function crescentView(F, color, scale, roll) {
    const root = new T.Group();
    const m = new T.Mesh(F.R.fx.crescentGeo, SO.Mat.crescent());
    const u = m.material.uniforms;
    u.uProg.value = 1.02; u.uWidth.value = 0.9; u.uColor.value.setHex(color); u.uCore.value.setHex(PALE); u.uSeed.value = Math.random() * 50;
    m.rotation.y = Math.PI; m.scale.setScalar(scale);
    const rollG = new T.Group(); rollG.rotation.z = (roll || 0) * Math.PI / 180; rollG.add(m);
    root.add(rollG);
    return { root, m };
  }

  // ---------------- Corte de Vento ----------------
  AFX.cast.wind_1 = (F, e, mine) => { if (mine) F.kick(3); };
  AFX.spell.wind_1 = {
    build(F, q) { const v = crescentView(F, WIND, 1.9, q.roll); return v; },
    update(F, v, dt, vel) {
      const p = v.root.position;
      v.root.lookAt(p.x + vel.x, p.y + vel.y, p.z + vel.z);
      v.m.scale.multiplyScalar(1 + dt * 0.5);
      F.lensAt(p, 1.5, 0.12);
      for (let i = 0; i < 3; i++) F.fx.glowP.emit(p.x + (Math.random() - 0.5) * 2, p.y + (Math.random() - 0.5) * 1, p.z + (Math.random() - 0.5) * 2, -vel.x * 0.1, 0, -vel.z * 0.1, 0.9, 0.95, 1, 0.08, 0.2, 0, 2);
    },
    hit(F, e) { F.fx.crescent(new T.Vector3(e.x, e.y, e.z), Math.random() * 6.28, 0, Math.random() * 360, 1.2, WIND, 0.12, false, PALE); },
    end(F, e) { dust(F, e.x, e.y - 1, e.z, 6, 1); },
  };

  // ---------------- Redemoinho ----------------
  AFX.cast.wind_2 = () => {};
  AFX.effect.wind_2 = {
    build(F, fx) {
      const root = new T.Group();
      const funnel = new T.Mesh(new T.CylinderGeometry(fx.r * 0.75, 0.4, 7, 24, 6, true).translate(0, 3.5, 0), windMat({ speed: 6 }));
      const inner = new T.Mesh(new T.CylinderGeometry(fx.r * 0.45, 0.25, 6, 20, 4, true).translate(0, 3, 0), windMat({ speed: 9 }));
      const rings = [0, 1, 2, 3].map((i) => { const m = new T.Mesh(new T.TorusGeometry(0.6 + i * 0.7, 0.04, 6, 32).rotateX(Math.PI / 2), L.add(PALE, 0.7)); m.position.y = 0.5 + i * 1.5; root.add(m); return m; });
      root.add(funnel); root.add(inner);
      F.add(root);
      return { root, funnel, inner, rings };
    },
    update(F, v, fx, dt) {
      const k = Math.min(1, fx.t / 0.3) * Math.min(1, (fx.dur - fx.t) / 0.4);
      v.root.position.set(fx.x, fx.y, fx.z);
      v.funnel.rotation.y += dt * 9; v.inner.rotation.y -= dt * 13;
      for (const m of [v.funnel, v.inner]) { m.material.uniforms.uTime.value = F.t; m.material.uniforms.uK.value = k; }
      v.rings.forEach((m, i) => { m.rotation.z = F.t * (3 + i); m.position.x = Math.sin(F.t * 4 + i) * 0.25; m.scale.setScalar(k); });
      dust(F, fx.x, fx.y, fx.z, 3, 4);
    },
    end(F, v) { F.remove(v.root); return 0; },
  };

  // ---------------- Lâminas Aéreas ----------------
  AFX.cast.wind_3 = (F, e, mine) => { if (mine) F.kick(4); };
  AFX.spell.wind_3 = {
    build(F, q) { const v = crescentView(F, TINT, 1.2, q.roll); v.trail = new L.Trail(F.scene, 14, 0.5, WIND, { core: PALE, life: 0.15 }); return v; },
    update(F, v, dt, vel) {
      const p = v.root.position;
      const moving = Math.hypot(vel.x, vel.y, vel.z) > 0.5;
      v.root.visible = moving;
      if (moving) v.root.lookAt(p.x + vel.x, p.y + vel.y, p.z + vel.z);
      v.trail.push(moving ? p : null, new T.Vector3(0, 1, 0), dt);
    },
    hit(F, e) { F.fx.crescent(new T.Vector3(e.x, e.y, e.z), Math.random() * 6.28, 0.3, Math.random() * 360, 1.4, TINT, 0.14, false, PALE); F.fx.glint(e.x, e.y, e.z, PALE); },
    end(F, e) { dust(F, e.x, e.y - 1, e.z, 5, 1); },
  };

  // ---------------- Fúria dos Ventos ----------------
  AFX.ult.wind_ult = { start(F, e, mine) { if (mine) F.kick(10); }, end() {} };
  AFX.effect.wind_ult = {
    build(F, fx) {
      const root = new T.Group();
      const outer = new T.Mesh(new T.CylinderGeometry(fx.r * 1.5, fx.r * 0.75, 32, 40, 8, true).translate(0, 16, 0), windMat({ speed: 4, thin: 0.16 }));
      const mid = new T.Mesh(new T.CylinderGeometry(fx.r * 1.1, fx.r * 0.6, 26, 32, 6, true).translate(0, 13, 0), windMat({ speed: 7, thin: 0.12 }));
      root.add(outer); root.add(mid);
      // white blades turning inside the column
      const blades = [];
      for (let i = 0; i < 10; i++) { const v = crescentView(F, PALE, 1.6, Math.random() * 360); v.root.userData = { a: i / 10 * 6.28, h: 1 + (i % 5) * 3, r: 5 + (i % 3) * 2 }; root.add(v.root); blades.push(v.root); }
      const debris = [];
      const geo = new T.BoxGeometry(0.3, 0.3, 0.3), mat = new T.MeshLambertMaterial({ color: 0x5a5560 });
      for (let i = 0; i < 26; i++) { const m = new T.Mesh(geo, mat); m.scale.setScalar(0.4 + Math.random() * 1.4); m.userData = { a: Math.random() * 6.28, h: Math.random() * 18, r: 4 + Math.random() * 9 }; root.add(m); debris.push(m); }
      F.add(root);
      return { root, outer, mid, blades, debris };
    },
    update(F, v, fx, dt) {
      const k = Math.min(1, fx.t / 1) * Math.min(1, (fx.dur - fx.t) / 0.5);
      v.root.position.set(fx.x, fx.y, fx.z);
      v.outer.rotation.y += dt * 2.2; v.mid.rotation.y -= dt * 3.3;
      for (const m of [v.outer, v.mid]) { m.material.uniforms.uTime.value = F.t; m.material.uniforms.uK.value = k * 0.55; }
      v.root.scale.set(Math.max(0.01, k), 1, Math.max(0.01, k));
      for (const b of v.blades) { const u = b.userData; u.a += dt * 4; b.position.set(Math.cos(u.a) * u.r, u.h + Math.sin(F.t * 2 + u.a) * 0.6, Math.sin(u.a) * u.r); b.rotation.y = -u.a; }
      for (const d of v.debris) { const u = d.userData; u.a += dt * (3 + 8 / u.r); u.h = (u.h + dt * 2) % 20; d.position.set(Math.cos(u.a) * u.r, u.h, Math.sin(u.a) * u.r); d.rotation.x += dt * 4; d.rotation.y += dt * 3; }
      F.atmo({ grade: 0xd8e8ff, gradeAmt: 0.15 * k, aberr: 0.15 * k });
      F.R.speedFx = Math.max(F.R.speedFx, 0.6 * k);
      if (Math.random() < 0.2) F.shake(0.04);
    },
    end(F, v) { F.remove(v.root); return 0; },
  };
  AFX.vfx['wind_ult:fling'] = (F, e, mine) => {
    F.fx.ring(e.x, e.y + 0.2, e.z, 1, 18, WIND, 0.5, 0.9);
    F.fx.ring(e.x, e.y + 3, e.z, 1, 14, PALE, 0.45, 0.8);
    dust(F, e.x, e.y, e.z, 60, 4);
    if (mine) { F.kick(12); F.shake(0.5); }
  };
  AFX.status['wind_ult:float'] = {
    build(F, ctx) { return { e: ctx.e }; },
    update(F, v, s, e) { if (Math.random() < 0.4) F.fx.glowP.emit(e.pos.x, e.pos.y + Math.random() * e.def.height, e.pos.z, (Math.random() - 0.5) * 6, 1, (Math.random() - 0.5) * 6, 0.9, 0.95, 1, 0.07, 0.3, 0, 1); },
  };
})(window.SO = window.SO || {});
