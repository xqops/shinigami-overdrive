// 1. ESPADAS ALMAS — spectral copies of the author's long sword, in blue light.
//   Corte Fantasma: three blades materialize from motes (left, right, above), then cut with blue trails.
//   Dança das Lâminas: seven blades on separate orbits; each strike is one blade darting out and back.
//   Execução Celestial: a rune circle locks on, lightning crawls up a colossal blade that falls and shatters.
//   Trono das Mil Espadas: the sky tears open in blue; a ring of hundreds of swords rains on the marked.
(function (SO) {
  'use strict';
  const T = THREE, L = SO.AFXLib, AFX = SO.AFX;
  const BLUE = 0x4aa8ff, PALE = 0xc8e8ff, DEEP = 0x1a4cff;

  // the author's longsword sprite extruded once, reused by every spectral blade
  let bladeGeo = null;
  function geo() {
    if (bladeGeo) return bladeGeo;
    const v = SO.Voxel && SO.Voxel.build('weapons/espada_longa', { voxel: 0.026, flip: true, grip: 'guard' });
    bladeGeo = v ? v.userData.mesh.geometry : L.bladeGeo(1.8, 0.16, 0, 0.04);
    return bladeGeo;
  }
  // spectral blade: white-hot core + blue shell + soft halo
  function blade(scale) {
    const g = new T.Group();
    const core = new T.Mesh(geo(), L.solid(PALE));
    const shell = new T.Mesh(geo(), L.add(BLUE, 0.75)); shell.scale.set(1.7, 1.05, 2.6);
    const halo = new T.Mesh(geo(), L.add(DEEP, 0.35)); halo.scale.set(3.2, 1.12, 5);
    g.add(halo); g.add(shell); g.add(core);
    g.scale.setScalar(scale || 1);
    g.userData = { core, shell, halo };
    return g;
  }
  const UP = new T.Vector3(0, 1, 0);
  function riftMaterial() {
    return new T.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uOpen: { value: 0 } },
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide, fog: false,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        uniform float uTime, uOpen; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(41.3, 289.1))) * 45758.5); }
        float n(float x){ float i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f); return mix(h(vec2(i, 0.0)), h(vec2(i + 1.0, 0.0)), f); }
        void main(){
          float x = vUv.x * 9.0;
          float c = 0.5 + (n(x) - 0.5) * 0.35 + (n(x * 3.1 + 7.0) - 0.5) * 0.12;
          float w = uOpen * (0.02 + 0.05 * n(x * 1.7 + 3.0)) * smoothstep(0.0, 0.15, vUv.x) * smoothstep(1.0, 0.85, vUv.x);
          float d = abs(vUv.y - c);
          float inside = step(d, w);
          float lip = exp(-max(0.0, d - w) * 140.0) * uOpen;
          float halo = exp(-d * 9.0) * uOpen * 0.55;
          vec2 sp = floor(vUv * vec2(900.0, 280.0));
          float star = step(0.985, h(sp)) * inside * (0.6 + 0.4 * sin(uTime * 3.0 + h(sp) * 40.0));
          vec3 col = vec3(0.16, 0.42, 1.0) * halo + vec3(0.85, 0.95, 1.0) * lip + vec3(0.02, 0.05, 0.18) * inside + vec3(0.8, 0.9, 1.0) * star;
          if (dot(col, vec3(1.0)) < 0.03) discard;
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
  }
  const runeTex = () => L.tex('souls-rune', 512, (c, s) => {
    const col = 'rgba(160,215,255,1)';
    L.draw.ring(c, s, s * 0.47, 6, col); L.draw.ring(c, s, s * 0.42, 2, col); L.draw.ring(c, s, s * 0.24, 3, col);
    L.draw.star(c, s, s * 0.42, 8, 3, 3, col); L.draw.star(c, s, s * 0.24, 4, 1, 2, col);
    L.draw.glyphs(c, s, s * 0.445, '魂剣斬天魂剣斬天魂剣斬天魂剣斬天', 22, col);
    L.draw.ticks(c, s, s * 0.27, s * 0.33, 32, 2, col);
  });
  const sigilTex = () => L.tex('souls-sigil', 128, (c, s) => {
    const col = 'rgba(170,220,255,1)';
    L.draw.ring(c, s, s * 0.44, 4, col); L.draw.star(c, s, s * 0.4, 6, 2, 3, col);
    c.fillStyle = col; c.font = '54px "DotGothic16",serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('魂', s / 2, s / 2 + 3);
  });

  function motes(F, x, y, z, n, spread, inward) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, b = Math.random() * 6.28, r = spread * (0.5 + Math.random() * 0.5);
      const px = x + Math.cos(a) * Math.sin(b) * r, py = y + Math.cos(b) * r, pz = z + Math.sin(a) * Math.sin(b) * r;
      const k = inward ? -3.2 : 2.5;
      F.fx.glowP.emit(px, py, pz, (px - x) * k, (py - y) * k, (pz - z) * k, 0.55 + Math.random() * 0.3, 0.8, 1, 0.16 + Math.random() * 0.14, 0.3, 0, 0);
    }
  }

  // ---------------- Corte Fantasma ----------------
  AFX.cast.souls_1 = (F) => { F.kick(3); };
  AFX.vfx['souls_1:summon'] = (F, e, mine) => {
    // three rune sigils flash where the blades will form (left, right, above the view)
    if (!mine) return;
    const c = F.cam;
    [[-1.3, 0.1], [1.3, 0.1], [0, 1.2]].forEach((o, i) => {
      const s = L.sprite(sigilTex(), 1.1, BLUE);
      F.add(s);
      const local = new T.Vector3(o[0], o[1], -1.8);
      F.spawn((dt, age) => {
        s.position.copy(local).applyQuaternion(c.quaternion).add(c.position);
        const k = age / (0.35 + i * 0.13);
        s.material.opacity = k < 1 ? Math.min(1, k * 3) : Math.max(0, 1 - (k - 1) * 4);
        s.material.rotation = age * 4 * (i % 2 ? -1 : 1);
        s.scale.setScalar(1.1 * (0.6 + Math.min(1, k) * 0.5));
        return k < 1.25;
      }, [s]);
    });
  };
  AFX.spell.souls_1 = {
    build(F, q) {
      const root = new T.Group(), b = blade(0.92);
      root.add(b);
      const trail = new L.Trail(F.scene, 26, 0.32, BLUE, { core: PALE, life: 0.22 });
      return { root, b, trail, age: 0, side: new T.Vector3() };
    },
    update(F, v, dt, vel) {
      v.age += dt;
      const sp = Math.hypot(vel.x, vel.y, vel.z);
      const p = v.root.position;
      if (sp < 0.5) {
        // materializing: grows out of converging motes, tip trembling toward the crosshair
        const k = Math.min(1, v.age / 0.18);
        v.b.scale.setScalar(0.92 * k);
        v.b.quaternion.setFromUnitVectors(UP, F.look());
        v.b.position.y = Math.sin(v.age * 30) * 0.02;
        if (Math.random() < 0.8) motes(F, p.x, p.y, p.z, 2, 0.9, true);
        v.trail.push(null, null, dt);
        return;
      }
      const d = new T.Vector3(vel.x / sp, vel.y / sp, vel.z / sp);
      v.b.quaternion.setFromUnitVectors(UP, d);
      v.b.scale.setScalar(0.92);
      v.side.crossVectors(d, UP).normalize();
      v.trail.push(p, v.side, dt);
      if (Math.random() < 0.7) F.fx.glowP.emit(p.x, p.y, p.z, -vel.x * 0.05, -vel.y * 0.05, -vel.z * 0.05, 0.6, 0.85, 1, 0.22, 0.25, 0, 2);
    },
    launch(F, e) { F.flash(e.x, e.y, e.z, BLUE, 4, 0.2); motes(F, e.x, e.y, e.z, 10, 0.4, false); },
    hit(F, e) {
      // a blue cut mark across the target and a spray of spectral splinters
      F.fx.crescent(new T.Vector3(e.x, e.y, e.z), Math.random() * 6.28, (Math.random() - 0.5) * 0.6, Math.random() * 360, 1.4, BLUE, 0.16, false, PALE);
      for (let i = 0; i < 14; i++) F.fx.glowP.emit(e.x, e.y, e.z, (Math.random() - 0.5) * 14, Math.random() * 8, (Math.random() - 0.5) * 14, 0.6, 0.85, 1, 0.18, 0.3, 14, 1);
    },
    end(F, e) { motes(F, e.x, e.y, e.z, 18, 0.5, false); },
  };

  // ---------------- Dança das Lâminas ----------------
  const ORB = [0, 1, 2, 3, 4, 5, 6].map((i) => ({ r: 2.8 + (i % 3) * 0.55, h: 0.3 + (i % 4) * 0.22, w: (i % 2 ? -1 : 1) * (1.6 + i * 0.17), ph: i * 0.9, tilt: (i - 3) * 0.12 }));
  AFX.cast.souls_2 = (F) => { F.kick(2); };
  AFX.effect.souls_2 = {
    build(F, fx) {
      const root = new T.Group();
      const blades = ORB.map(() => { const b = blade(0.45); root.add(b); return { b, dart: null, trail: new L.Trail(F.scene, 14, 0.14, BLUE, { core: PALE, life: 0.18 }) }; });
      F.add(root);
      return { root, blades, born: 0, trails: blades.map((x) => x.trail) };
    },
    update(F, v, fx, dt) {
      v.born = Math.min(1, v.born + dt / 0.6);
      const T0 = F.t;
      const fade = Math.min(1, (fx.dur - fx.t) / 0.6);
      v.root.position.set(fx.x, fx.y, fx.z);
      v.blades.forEach((s, i) => {
        const o = ORB[i];
        const a = T0 * o.w + o.ph;
        const home = new T.Vector3(Math.cos(a) * o.r, o.h + Math.sin(T0 * 2 + i) * 0.12, Math.sin(a) * o.r);
        let pos = home, look = new T.Vector3(-Math.sin(a) * Math.sign(o.w), o.tilt, Math.cos(a) * Math.sign(o.w));
        if (s.dart) {
          // out to the enemy and back along a slight arc
          s.dart.t += dt;
          const k = s.dart.t / 0.32;
          const to = s.dart.to.clone().sub(v.root.position);
          const out = k < 0.5 ? k * 2 : (1 - k) * 2;
          pos = home.clone().lerp(to, Math.sin(out * Math.PI * 0.5));
          look = to.clone().sub(home).normalize().multiplyScalar(k < 0.5 ? 1 : -1);
          if (k >= 1) s.dart = null;
        }
        s.b.position.copy(pos);
        s.b.quaternion.setFromUnitVectors(UP, look.normalize());
        s.b.scale.setScalar(0.45 * v.born * fade);
        const wp = pos.clone().add(v.root.position);
        s.trail.push(wp, UP, dt);
      });
    },
    end(F, v) { for (const s of v.blades) { const p = s.b.getWorldPosition(new T.Vector3()); motes(F, p.x, p.y, p.z, 8, 0.4, false); } return 0; },
  };
  AFX.vfx['souls_2:strike'] = (F, e) => {
    const v = F.effects[e.fx];
    if (v) { const s = v.blades[e.slot % v.blades.length]; s.dart = { t: 0, to: new T.Vector3(e.x, e.y, e.z) }; }
    F.fx.crescent(new T.Vector3(e.x, e.y, e.z), Math.random() * 6.28, 0, Math.random() * 360, 1, BLUE, 0.12, false, PALE);
    F.fx.glint(e.x, e.y, e.z, PALE);
  };
  AFX.vfx['souls_2:parry'] = (F, e) => {
    F.fx.ring(e.x, e.y, e.z, 0.1, 1.2, BLUE, 0.2, 0.9);
    for (let i = 0; i < 12; i++) F.fx.glowP.emit(e.x, e.y, e.z, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, 1, 1, 1, 0.12, 0.2, 0, 3);
    F.flash(e.x, e.y, e.z, PALE, 3, 0.15);
  };

  // ---------------- Execução Celestial (and the ultimate's finale) ----------------
  AFX.cast.souls_3 = (F) => { F.kick(4); };
  AFX.effect.souls_3 = {
    build(F, fx) {
      const S = fx.scale || 1;
      const root = new T.Group();
      root.position.set(fx.x, fx.y, fx.z);
      const circle = L.disc(runeTex(), 3.4 * S, BLUE, 0.95);
      circle.position.y = 0.06;
      const inner = L.disc(runeTex(), 1.6 * S, PALE, 0.9);
      inner.position.y = 0.08;
      const pillar = new T.Mesh(new T.CylinderGeometry(0.35 * S, 1.6 * S, 26 * S, 16, 1, true).translate(0, 13 * S, 0), L.energy(BLUE, { color2: PALE, freq: 2, speed: -3, sharp: 0.55, edge: 0.15 }));
      const sword = blade(5.2 * S);
      sword.rotation.z = Math.PI; // point down
      sword.position.y = 16 * S;
      root.add(circle); root.add(inner); root.add(pillar); root.add(sword);
      F.add(root);
      return { root, circle, inner, pillar, sword, S, struck: false, shards: null };
    },
    update(F, v, fx, dt) {
      const S = v.S, t = fx.t, hitT = fx.hitT;
      v.root.position.set(fx.x, fx.y, fx.z);
      const k = Math.min(1, t / hitT);
      v.circle.scale.setScalar(0.3 + 0.7 * Math.min(1, t / 0.18));
      v.circle.rotation.y = t * 1.5; v.inner.rotation.y = -t * 3;
      v.pillar.material.uniforms.uTime.value = F.t;
      v.pillar.material.uniforms.uK.value = t < hitT ? k * 0.8 : Math.max(0, 1 - (t - hitT) * 3);
      if (t < hitT) {
        // the blade hangs, then accelerates down with lightning crawling along it
        // hangs high in the frame first, then drops hard
        const fall = Math.pow(k, 2.6);
        v.sword.position.y = (16 - fall * 15.2) * S;
        v.sword.rotation.y = t * 0.6;
        if (Math.random() < 0.5 + k) {
          const top = new T.Vector3(fx.x + (Math.random() - 0.5) * S, fx.y + v.sword.position.y, fx.z + (Math.random() - 0.5) * S);
          F.bolt(top, top.clone().add(new T.Vector3((Math.random() - 0.5) * 3 * S, -Math.random() * 4 * S, (Math.random() - 0.5) * 3 * S)), 0.25 * S, 0.12, BLUE, false, 0.8);
        }
        F.atmo({ grade: 0x4a8cff, gradeAmt: 0.18 * k * Math.min(S, 2), dark: 0.15 * k });
      } else if (!v.struck) {
        v.struck = true;
        v.sword.position.y = 0.6 * S;
      } else {
        // after the impact the blade cracks apart into light
        const a = t - hitT;
        v.sword.userData.core.material.color.setRGB(1, 1, 1);
        v.sword.scale.setScalar(5.2 * S * (1 + a * 0.4));
        v.sword.userData.shell.material.opacity = Math.max(0, 0.75 - a * 2);
        v.sword.userData.halo.material.opacity = Math.max(0, 0.35 - a);
        v.sword.visible = a < 0.32;
        v.circle.material.opacity = Math.max(0, 0.95 - a * 2.5);
        v.inner.material.opacity = Math.max(0, 0.9 - a * 3);
      }
    },
    end(F, v) { F.remove(v.root); return 0; },
  };
  AFX.vfx['souls_3:impact'] = (F, e) => {
    const big = e.big ? 1 : 0, S = big ? 3.2 : 1;
    F.flash(e.x, e.y + 3, e.z, BLUE, 12 + big * 14, 0.6);
    F.white(0.35 + big * 0.35); F.shake(0.4 + big * 0.5);
    F.fx.ring(e.x, e.y + 0.05, e.z, 0.4, 8 * S, BLUE, 0.55, 0.95);
    F.fx.ring(e.x, e.y + 0.1, e.z, 0.2, 5 * S, PALE, 0.35, 0.95);
    // hundreds of motes where the blade breaks apart
    for (let i = 0; i < 220 * (1 + big); i++) {
      const h = Math.random() * 6 * S, a = Math.random() * 6.28, sp = 3 + Math.random() * 10 * S;
      F.fx.glowP.emit(e.x + Math.cos(a) * 0.4 * S, e.y + h, e.z + Math.sin(a) * 0.4 * S, Math.cos(a) * sp, Math.random() * 6, Math.sin(a) * sp, 0.5 + Math.random() * 0.4, 0.8, 1, 0.2 + Math.random() * 0.3 * S, 0.5 + Math.random() * 0.6, 3, 1.2);
    }
    for (let i = 0; i < 6 + big * 8; i++) {
      const a = Math.random() * 6.28;
      F.bolt(new T.Vector3(e.x, e.y + 0.3, e.z), new T.Vector3(e.x + Math.cos(a) * 6 * S, e.y + 0.2, e.z + Math.sin(a) * 6 * S), 0.3 * S, 0.3, BLUE, true, 1.4);
    }
  };

  // ---------------- Trono das Mil Espadas ----------------
  AFX.ult.souls_ult = {
    start(F, e, mine) { F.white(0.6); F.shake(0.5); if (mine) F.kick(8); },
    end() {},
  };
  AFX.effect.souls_ult = {
    build(F, fx) {
      const root = new T.Group();
      // the rift: a seam torn across the sky, white at the lips, stars visible through it
      const rift = new T.Mesh(new T.PlaneGeometry(220, 70).rotateX(Math.PI / 2), riftMaterial());
      rift.position.y = 72;
      const riftGlow = rift;
      root.add(rift);
      // floating magic circles in the air
      const circles = [];
      for (let i = 0; i < 7; i++) {
        const m = new T.Mesh(new T.PlaneGeometry(9, 9), new T.MeshBasicMaterial({ map: runeTex(), color: BLUE, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide }));
        const a = (i / 7) * 6.28;
        m.position.set(Math.cos(a) * 26, 28 + (i % 3) * 6, Math.sin(a) * 26);
        m.lookAt(0, 10, 0);
        root.add(m); circles.push(m);
      }
      // the arsenal: a slowly turning ring of swords above the arena, as many as remain
      const g = geo();
      const inst = new T.InstancedMesh(g, L.add(BLUE, 0.85), 160);
      const instCore = new T.InstancedMesh(g, L.solid(PALE), 160);
      inst.frustumCulled = false; instCore.frustumCulled = false;
      root.add(inst); root.add(instCore);
      F.add(root);
      return { root, rift, riftGlow, circles, inst, instCore, open: 0, dummy: new T.Object3D() };
    },
    update(F, v, fx, dt) {
      v.open = Math.min(1, v.open + dt / 1.2);
      const end = Math.min(1, Math.max(0, (fx.dur - fx.t) / 0.8));
      v.rift.material.uniforms.uOpen.value = v.open * end; v.rift.material.uniforms.uTime.value = F.t;
      v.circles.forEach((m, i) => { m.rotation.z = F.t * (i % 2 ? 0.4 : -0.4); m.material.opacity = v.open * end * 0.8; });
      const n = Math.min(160, 30 + (fx.arsenal || 0) * 2);
      const d = v.dummy;
      for (let i = 0; i < n; i++) {
        const a = (i / Math.max(n, 1)) * 6.28 + F.t * 0.15, r = 18 + (i % 5) * 2.2;
        d.position.set(Math.cos(a) * r, 22 + (i % 7) * 1.4 + Math.sin(F.t * 2 + i) * 0.4, Math.sin(a) * r);
        d.rotation.set(Math.PI, 0, 0.25 * Math.sin(i));
        d.scale.setScalar(1.4 * v.open);
        d.updateMatrix();
        v.inst.setMatrixAt(i, d.matrix); v.instCore.setMatrixAt(i, d.matrix);
      }
      v.inst.count = n; v.instCore.count = n;
      v.inst.instanceMatrix.needsUpdate = true; v.instCore.instanceMatrix.needsUpdate = true;
      v.root.position.set(fx.x, 0, fx.z);
      F.atmo({ grade: 0x3a7cff, gradeAmt: 0.32 * v.open * end, dark: 0.35 * v.open * end });
    },
    end(F, v) { F.remove(v.root); return 0; },
  };
  AFX.spell.souls_ult = {
    build(F) {
      const root = new T.Group(), b = blade(0.75);
      root.add(b);
      return { root, b, trail: new L.Trail(F.scene, 18, 0.22, BLUE, { core: PALE, life: 0.16 }) };
    },
    update(F, v, dt, vel) {
      const sp = Math.hypot(vel.x, vel.y, vel.z) || 1;
      const d = new T.Vector3(vel.x / sp, vel.y / sp, vel.z / sp);
      v.b.quaternion.setFromUnitVectors(UP, sp > 0.5 ? d : new T.Vector3(0, -1, 0));
      v.trail.push(v.root.position, new T.Vector3().crossVectors(d, UP).normalize(), dt);
    },
    hit(F, e) {
      F.fx.crescent(new T.Vector3(e.x, e.y, e.z), Math.random() * 6.28, -0.8, Math.random() * 360, 1.1, BLUE, 0.12, false, PALE);
      for (let i = 0; i < 8; i++) F.fx.glowP.emit(e.x, e.y, e.z, (Math.random() - 0.5) * 9, Math.random() * 6, (Math.random() - 0.5) * 9, 0.6, 0.85, 1, 0.18, 0.25, 10, 1);
    },
    end(F, e) { motes(F, e.x, e.y, e.z, 6, 0.4, false); },
  };
  // a small blade sigil turning over every enemy the throne has marked
  AFX.status['souls_ult:mark'] = {
    build(F, ctx) {
      const s = L.sprite(sigilTex(), 0.9, BLUE);
      s.position.y = ctx.e.def.height + 0.7;
      ctx.view.root.add(s);
      return { root: s, s };
    },
    update(F, v) { v.s.material.rotation = F.t * 3; v.s.scale.setScalar(0.85 + Math.sin(F.t * 8) * 0.08); },
  };
})(window.SO = window.SO || {});
