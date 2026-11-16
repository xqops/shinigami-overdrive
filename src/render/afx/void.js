// 2. TELEPORTE — violet dimensional energy: fragments, threads of light, glass-broken space.
//   Passo do Vazio: the body breaks into violet shards, a bright thread links both ends, the arrival bends space.
//   Troca Dimensional: two circles open under both bodies; a helix tunnel carries each one the other way.
//   Ruptura Espacial: two holes crack open like glass on a starry void; a violet wake hangs between them.
//   Colapso das Dimensões: colors invert, afterimages everywhere, rifts that burst, then all of space folds in.
(function (SO) {
  'use strict';
  const T = THREE, L = SO.AFXLib, AFX = SO.AFX;
  const VIO = 0xa35bff, DEEP = 0x4a10c0, PALE = 0xeedcff;

  const circleTex = () => L.tex('void-circle', 256, (c, s) => {
    const col = 'rgba(205,160,255,1)';
    L.draw.ring(c, s, s * 0.46, 4, col); L.draw.ring(c, s, s * 0.38, 2, col);
    L.draw.star(c, s, s * 0.38, 5, 2, 2, col);
    L.draw.glyphs(c, s, s * 0.42, '転移転移転移転移', 18, col);
  });

  // shattered-glass hole onto a starfield, cracks radiating from the rim
  function portalMat() {
    return new T.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpen: { value: 0 } },
      transparent: true, depthWrite: false, side: T.DoubleSide, fog: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        uniform float uTime, uOpen; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
        void main(){
          vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.y, p.x);
          float rim = uOpen * (0.62 + 0.08 * sin(a * 7.0) + 0.05 * sin(a * 13.0 + 2.0));
          float inside = step(r, rim);
          float sector = floor((a + 3.1416) / 6.2832 * 9.0);
          float crack = step(abs(fract((a + 3.1416) / 6.2832 * 9.0) - 0.5), 0.02 + 0.03 * h(vec2(sector, 1.0))) * step(rim, r) * step(r, rim + 0.35 * uOpen * h(vec2(sector, 2.0)));
          float lip = exp(-abs(r - rim) * 40.0) * uOpen;
          vec2 sp = floor(p * 120.0);
          float star = step(0.97, h(sp)) * inside * (0.6 + 0.4 * sin(uTime * 4.0 + h(sp) * 30.0));
          vec3 col = vec3(0.03, 0.0, 0.08) * inside + vec3(0.8, 0.6, 1.0) * star + vec3(0.75, 0.45, 1.0) * lip * 1.6 + vec3(0.95, 0.85, 1.0) * crack;
          float alpha = max(inside, max(lip, crack));
          if (alpha < 0.05) discard;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
  }

  function shards(F, x, y, z, n, sp) {
    for (let i = 0; i < n; i++) {
      const vx = (Math.random() - 0.5) * sp, vy = (Math.random() - 0.2) * sp, vz = (Math.random() - 0.5) * sp;
      F.fx.glowP.emit(x + (Math.random() - 0.5) * 0.6, y + Math.random() * 1.8, z + (Math.random() - 0.5) * 0.6, vx, vy, vz, 0.65, 0.35, 1, 0.15 + Math.random() * 0.15, 0.35 + Math.random() * 0.25, 0, 2.5);
      if (i % 3 === 0) F.fx.inkP.emit(x, y + Math.random() * 1.8, z, vx * 0.6, vy * 0.6, vz * 0.6, 0.12, 0.03, 0.22, 0.3, 0.4, 0, 2);
    }
  }
  function thread(F, a, b, life, width) {
    const len = a.distanceTo(b);
    const g = new T.Group();
    const core = new T.Mesh(new T.CylinderGeometry(width * 0.3, width * 0.3, len, 6, 1, true).rotateX(Math.PI / 2), L.add(PALE, 1));
    const glow = new T.Mesh(new T.CylinderGeometry(width, width, len, 8, 1, true).rotateX(Math.PI / 2), L.add(VIO, 0.5));
    g.add(glow); g.add(core);
    g.position.copy(a).lerp(b, 0.5); g.lookAt(b);
    F.add(g);
    F.spawn((dt, age) => { const k = age / life; core.material.opacity = 1 - k; glow.material.opacity = 0.5 * (1 - k); g.scale.set(1 - k * 0.8, 1 - k * 0.8, 1); return k < 1; }, [g]);
  }
  function bend(F, at, dur, strength) { F.spawn((dt, age) => { const k = age / dur; F.lensAt(at, 4, strength * Math.sin(Math.min(1, k) * Math.PI)); return k < 1; }); }

  // ---------------- Passo do Vazio ----------------
  AFX.cast.void_1 = () => {};
  AFX.vfx['void_1:step'] = (F, e, mine) => {
    const a = new T.Vector3(e.fx, e.fy + 1, e.fz), b = new T.Vector3(e.tx, e.ty + 1, e.tz);
    shards(F, e.fx, e.fy, e.fz, 50, 9);
    thread(F, a, b, 0.45, 0.22);
    F.flash(e.tx, e.ty + 1.2, e.tz, VIO, 5, 0.3);
    bend(F, b, 0.35, 0.9);
    if (mine) { F.kick(10); F.spawn((dt, age) => { F.atmo({ aberr: 1.2 * (1 - age / 0.3), grade: VIO, gradeAmt: 0.2 * (1 - age / 0.3) }); return age < 0.3; }); }
  };
  // the afterimage left behind: a violet silhouette that glitches and fades
  AFX.ally.afterimage = {
    build(F, a) {
      const root = new T.Group();
      const ctl = F.model('soldado_sombrio', 1.9, { color: 0x1a0830, emissive: 0x7a2aff, opacity: 0.55, outline: false });
      if (ctl) { root.add(ctl.root); ctl.play('Idle'); }
      root.rotation.y = a.yaw || 0;
      return { root, ctl, life0: a.life };
    },
    update(F, v, a, dt) {
      if (v.ctl) v.ctl.update(dt * 0.2);
      const k = Math.max(0, a.life / (v.life0 || 2));
      if (v.ctl) for (const m of v.ctl.mats) m.opacity = 0.55 * k * (Math.random() < 0.1 ? 0.3 : 1);
      // horizontal glitch slices
      v.root.position.x += (Math.random() < 0.12 ? (Math.random() - 0.5) * 0.25 : 0);
      if (Math.random() < 0.3) F.fx.glowP.emit(a.pos.x + (Math.random() - 0.5) * 0.6, a.pos.y + Math.random() * 1.9, a.pos.z + (Math.random() - 0.5) * 0.6, 0, 0.8, 0, 0.6, 0.3, 1, 0.12, 0.4, 0, 0);
    },
    end(F, e) { shards(F, e.x, e.y - 1, e.z, 24, 5); },
  };

  // ---------------- Troca Dimensional ----------------
  AFX.cast.void_2 = () => {};
  AFX.vfx['void_2:swap'] = (F, e, mine) => {
    const A = new T.Vector3(e.ax, e.ay, e.az), B = new T.Vector3(e.bx, e.by, e.bz);
    for (const P of [A, B]) {
      const d = L.disc(circleTex(), 1.6, VIO, 1);
      d.position.set(P.x, P.y + 0.06, P.z);
      F.add(d);
      F.spawn((dt, age) => { d.rotation.y = age * 4; const k = age / 0.7; d.scale.setScalar(k < 0.2 ? k * 5 : 1); d.material.opacity = 1 - Math.max(0, (k - 0.6) / 0.4); return k < 1; }, [d]);
    }
    // helix tunnel: two streams of motes spiralling in opposite directions between the bodies
    const ax = A.clone().setY(A.y + 1), bx = B.clone().setY(B.y + 1);
    const dir = bx.clone().sub(ax), len = dir.length(); dir.normalize();
    const side = new T.Vector3(-dir.z, 0, dir.x).normalize(), up = new T.Vector3().crossVectors(dir, side);
    F.spawn((dt, age) => {
      for (let s = 0; s < 2; s++) for (let i = 0; i < 6; i++) {
        const k = Math.random(), ang = k * 18 + age * 20 * (s ? 1 : -1);
        const p = ax.clone().addScaledVector(dir, (s ? k : 1 - k) * len).addScaledVector(side, Math.cos(ang) * 0.7).addScaledVector(up, Math.sin(ang) * 0.7);
        F.fx.glowP.emit(p.x, p.y, p.z, dir.x * (s ? 14 : -14), dir.y * (s ? 14 : -14), dir.z * (s ? 14 : -14), s ? 0.75 : 0.95, s ? 0.4 : 0.7, 1, 0.16, 0.2, 0, 0);
      }
      return age < 0.4;
    });
    thread(F, ax, bx, 0.5, 0.15);
    F.flash(B.x, B.y + 1, B.z, VIO, 6, 0.35);
    if (mine) { F.R.flashInvert(0.08); F.kick(8); }
  };
  AFX.vfx['void_2:bonus'] = (F) => { const h = F.hand(1, 0.8); F.fx.burst(h.x, h.y, h.z, 18, 4, VIO, 0.2, 0.3, 0); };
  // disoriented: violet stars spinning around the head
  AFX.status['void_2:blind'] = {
    build(F, ctx) {
      const g = new T.Group(); g.position.y = ctx.e.def.height + 0.3;
      const stars = [];
      for (let i = 0; i < 4; i++) { const s = L.sprite(L.dot(), 0.32, VIO); g.add(s); stars.push(s); }
      ctx.view.root.add(g);
      return { root: g, stars };
    },
    update(F, v) { v.stars.forEach((s, i) => { const a = F.t * 6 + i * 1.57; s.position.set(Math.cos(a) * 0.5, Math.sin(F.t * 9 + i) * 0.08, Math.sin(a) * 0.5); }); },
  };

  // ---------------- Ruptura Espacial ----------------
  AFX.cast.void_3 = (F, e, mine) => { if (mine) { F.kick(14); F.white(0.15); } };
  AFX.effect.void_3 = {
    build(F, fx) {
      const root = new T.Group();
      const mk = (x, y, z) => {
        const m = new T.Mesh(new T.PlaneGeometry(3.6, 3.6), portalMat());
        m.position.set(x, y, z); m.rotation.y = fx.yaw;
        root.add(m);
        return m;
      };
      const pa = mk(fx.x, fx.y, fx.z), pb = mk(fx.bx, fx.by, fx.bz);
      // the wake: a violet ribbon between the two holes
      const a = new T.Vector3(fx.x, fx.y, fx.z), b = new T.Vector3(fx.bx, fx.by, fx.bz);
      const len = a.distanceTo(b);
      const wake = new T.Mesh(new T.PlaneGeometry(1, len), L.energy(VIO, { color2: PALE, freq: 4, speed: 6, sharp: 0.45 }));
      wake.position.copy(a).lerp(b, 0.5);
      wake.lookAt(b); wake.rotateX(Math.PI / 2);
      root.add(wake);
      F.add(root);
      shards(F, fx.x, fx.y - 1, fx.z, 40, 10);
      shards(F, fx.bx, fx.by - 1, fx.bz, 40, 10);
      bend(F, b, 0.5, 1);
      return { root, pa, pb, wake };
    },
    update(F, v, fx) {
      const open = Math.min(1, fx.t / 0.15) * Math.min(1, (fx.dur - fx.t) / 0.4);
      for (const m of [v.pa, v.pb]) { m.material.uniforms.uOpen.value = open; m.material.uniforms.uTime.value = F.t; m.quaternion.copy(F.cam.quaternion); }
      v.wake.material.uniforms.uTime.value = F.t;
      v.wake.material.uniforms.uK.value = Math.max(0, 1 - fx.t / 1.2);
    },
    end(F, v) { F.remove(v.root); return 0; },
  };
  AFX.vfx['void_3:pass'] = (F, e) => { shards(F, e.x, e.y - 1, e.z, 14, 6); F.flash(e.x, e.y, e.z, PALE, 3, 0.15); };

  // ---------------- Colapso das Dimensões ----------------
  AFX.ult.void_ult = { start(F, e, mine) { if (mine) { F.R.flashInvert(0.15); F.kick(10); } }, end() {} };
  AFX.effect.void_ult = {
    build() { return {}; },
    update(F, v, fx) {
      const k = Math.min(1, fx.t / 0.6) * Math.min(1, (fx.dur - fx.t) / 0.6);
      // inverted, folding space: kaleidoscope + RGB split + a magenta-violet grade
      F.atmo({ kaleido: 0.55 * k, aberr: 0.6 * k, grade: 0xff40ff, gradeAmt: 0.25 * k });
    },
  };
  AFX.effect['void_ult:rift'] = {
    build(F, fx) {
      const m = new T.Mesh(new T.PlaneGeometry(1.6, 3.2), portalMat());
      m.position.set(fx.x, fx.y, fx.z);
      F.add(m);
      return { root: m, m };
    },
    update(F, v, fx) {
      const u = v.m.material.uniforms;
      u.uTime.value = F.t;
      u.uOpen.value = Math.min(1, fx.t / 0.3) * (0.8 + 0.2 * Math.sin(F.t * 10 + fx.id));
      v.m.quaternion.copy(F.cam.quaternion);
      if (fx.collapse) {
        // drawn toward the collapse point
        v.m.position.lerp(new T.Vector3(fx.cx, fx.cy, fx.cz), 0.08);
        v.m.scale.multiplyScalar(0.96);
      }
      if (Math.random() < 0.15) F.fx.glowP.emit(fx.x, fx.y + (Math.random() - 0.5) * 2, fx.z, (Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2, 0.7, 0.35, 1, 0.12, 0.4, 0, 0);
    },
    end(F, v) { F.remove(v.root); return 0; },
  };
  AFX.vfx['void_ult:burst'] = (F, e) => {
    shards(F, e.x, e.y - 1, e.z, 60, 14);
    F.fx.ring(e.x, e.y - 1, e.z, 0.3, 5, VIO, 0.35, 0.95);
    F.flash(e.x, e.y, e.z, VIO, 8, 0.35);
    bend(F, new T.Vector3(e.x, e.y, e.z), 0.35, 1.2);
    F.shake(0.15);
  };
  AFX.effect['void_ult:implode'] = {
    build(F, fx) {
      const root = new T.Group();
      root.position.set(fx.x, fx.y, fx.z);
      const core = new T.Mesh(new T.SphereGeometry(1, 24, 16), L.solid(0x000000));
      const rim = new T.Mesh(new T.SphereGeometry(1.08, 24, 16), L.fresnel(VIO, 1.4, 2));
      root.add(core); root.add(rim);
      // every rift sends a beam of light into the collapse point
      const beams = (fx.rifts || []).map((r) => {
        const a = new T.Vector3(r[0], r[1], r[2]), b = new T.Vector3(fx.x, fx.y, fx.z);
        const len = a.distanceTo(b) || 0.1;
        const m = new T.Mesh(new T.CylinderGeometry(0.08, 0.08, len, 5, 1, true).rotateX(Math.PI / 2), L.add(PALE, 0.9));
        m.position.copy(a).lerp(b, 0.5); m.lookAt(b);
        F.add(m);
        return m;
      });
      F.add(root);
      return { root, core, rim, own: beams };
    },
    update(F, v, fx) {
      const k = fx.t / fx.dur;
      const s = 0.4 + k * 2.6 * (1 - Math.pow(k, 6));
      v.core.scale.setScalar(s); v.rim.scale.setScalar(s * 1.08);
      for (const b of v.own) b.scale.set(1 + Math.sin(F.t * 30) * 0.3, 1 + Math.sin(F.t * 30) * 0.3, 1);
      F.lensAt(v.root.position, 10, 0.5 + k * 1.1);
      F.atmo({ aberr: k * 1.4, kaleido: 0.3 + k * 0.4 });
      for (let i = 0; i < 6; i++) {
        const a = Math.random() * 6.28, r = 6 + Math.random() * 8;
        const px = fx.x + Math.cos(a) * r, pz = fx.z + Math.sin(a) * r, py = fx.y + (Math.random() - 0.5) * 6;
        F.fx.glowP.emit(px, py, pz, (fx.x - px) * 3, (fx.y - py) * 3, (fx.z - pz) * 3, 0.75, 0.4, 1, 0.2, 0.32, 0, 0);
      }
    },
    end(F, v) { F.remove(v.root); for (const b of v.own) F.remove(b); return 0; },
  };
  AFX.vfx['void_ult:collapse'] = (F, e) => {
    F.white(0.7); F.R.flashInvert(0.1); F.shake(0.7);
    F.flash(e.x, e.y, e.z, VIO, 16, 0.7);
    F.fx.ring(e.x, Math.max(0.1, e.y - 1.5), e.z, 0.5, 14, VIO, 0.6, 0.95);
    shards(F, e.x, e.y - 1, e.z, 160, 22);
    const shell = new T.Mesh(new T.SphereGeometry(1, 24, 16), L.fresnel(PALE, 2, 2));
    shell.position.set(e.x, e.y, e.z);
    F.add(shell);
    F.spawn((dt, age) => { shell.scale.setScalar(1 + age * 30); shell.material.uniforms.uK.value = Math.max(0, 2 - age * 4); return age < 0.5; }, [shell]);
  };
})(window.SO = window.SO || {});
