// 07 METEORO — "Martelo Astral": a hammer whose head is a cluster of black star-rock split by
// glowing lava seams (real 3D rocks, so they can break loose). Embers rise off it, a chain with an
// ofuda hangs under the head. Inspect (author's sheet): held; the rocks start to drift apart;
// they float around the haft burning; the head erupts in fire, then slams back together.
(function (SO) {
  'use strict';
  const T = THREE, CW = SO.CharWeapons, AFX = SO.AFX, PI = Math.PI;
  const K = (t, p, a, f, roll, ease) => ({ t, p, a, f, roll, ease: ease || 'inout' });
  const R = (t) => ({ t, rest: true, ease: 'inout' });
  const ORANGE = 0xff7a1a, HOT = 0xffd070, RED = 0xd82a08, ROCK = 0x1c1618;
  const VX = 0.0048;

  // a jagged rock: a randomized icosahedron, flat shaded, with its edges as glowing lava seams
  function rock(r, seed) {
    const g = new T.IcosahedronGeometry(r, 0);
    const pos = g.attributes.position;
    let s = seed * 9301 + 49297;
    const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
    const seen = {};
    for (let i = 0; i < pos.count; i++) {
      const key = pos.getX(i).toFixed(4) + pos.getY(i).toFixed(4) + pos.getZ(i).toFixed(4);
      const k = seen[key] || (seen[key] = 0.75 + rnd() * 0.5);
      pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * (0.85 + rnd() * 0.0), pos.getZ(i) * k);
    }
    g.computeVertexNormals();
    const m = new T.Mesh(g, lavaRockMat(seed));
    // kept for callers: the 'seams' are now the shader's heat uniform
    m.userData.seams = { material: { set opacity(v) { m.material.uniforms.uHeat.value = v; } }, geometry: { dispose() {} } };
    return m;
  }

  // black star-rock lit from above, split by thin lava cracks (a 3D noise band, pixel-stepped)
  function lavaRockMat(seed) {
    return new T.ShaderMaterial({
      uniforms: { uHeat: { value: 0.6 }, uSeed: { value: seed * 1.7 } },
      vertexShader: 'varying vec3 vP; varying vec3 vN; void main(){ vP = position * 75.0; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float uHeat, uSeed; varying vec3 vP; varying vec3 vN;
        float h(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
        float n(vec3 p){ vec3 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(mix(h(i), h(i + vec3(1,0,0)), f.x), mix(h(i + vec3(0,1,0)), h(i + vec3(1,1,0)), f.x), f.y),
                     mix(mix(h(i + vec3(0,0,1)), h(i + vec3(1,0,1)), f.x), mix(h(i + vec3(0,1,1)), h(i + vec3(1,1,1)), f.x), f.y), f.z); }
        void main(){
          vec3 p = floor(vP) + uSeed;
          float v = n(p * 0.22) * 0.7 + n(p * 0.55) * 0.3;
          float crack = 1.0 - step(0.035, abs(v - 0.5));
          float light = 0.25 + 0.75 * max(0.0, dot(vN, normalize(vec3(0.4, 0.8, 0.5))));
          vec3 rock = vec3(0.09, 0.075, 0.08) * light + vec3(0.06, 0.015, 0.0) * uHeat;
          vec3 lava = mix(vec3(1.0, 0.32, 0.05), vec3(1.0, 0.85, 0.4), crack * uHeat);
          gl_FragColor = vec4(mix(rock, lava, crack * clamp(uHeat * 1.2, 0.0, 1.0)), 1.0);
        }`,
    });
  }

  CW.reg.meteor = {
    slot: 0,
    restR: { p: [0.26, -0.33, -0.58], a: 0.55, f: 0.5, roll: 0 },
    gripR: 0, gripL2: 0.26,

    build(vm) {
      const right = SO.Voxel.build('weapons/meteoro_cabo', { voxel: VX, grip: 0.22, depth: (r) => (r > 150 ? 4 : 2.6) });
      if (!right) return null;
      const headY = (206 - 34 - Math.floor(206 * 0.22)) * VX;
      const s = { right, motes: new CW.Motes(vm.scene, 300), acc: 0, fired: {}, headY, rocks: [] };
      // the head: a molten core with rocks packed around it
      s.core = new T.Mesh(new T.IcosahedronGeometry(0.035, 1), new T.MeshBasicMaterial({ color: RED }));
      s.core.position.set(0, headY, 0); right.add(s.core);
      const layout = [[0, 0.06, 0.04, 0.08], [-0.09, 0.01, 0.01, 0.075], [0.09, 0.0, 0.0, 0.078], [0.0, -0.05, 0.07, 0.068], [-0.05, 0.1, -0.03, 0.062], [0.06, 0.1, -0.02, 0.064], [-0.06, -0.06, -0.05, 0.066], [0.05, -0.08, -0.05, 0.062], [0.0, 0.15, 0.0, 0.055], [0.0, 0.0, -0.08, 0.075], [0.0, 0.02, 0.0, 0.07]];
      layout.forEach(([x, y, z, r], i) => {
        const m = rock(r, i + 3);
        const home = new T.Vector3(x * 1.2, headY + 0.02 + y * 1.2, z * 1.2);
        m.position.copy(home);
        m.rotation.set(i, i * 2, i * 0.5);
        m.scale.setScalar(1.25);
        right.add(m);
        s.rocks.push({ m, home, dir: new T.Vector3(x, y + 0.02, z).normalize(), spin: new T.Vector3((i % 3) - 1, ((i + 1) % 3) - 1, 1).multiplyScalar(0.8) });
      });
      s.hook = new T.Object3D(); s.hook.position.set(0.012, headY - 0.1, 0); right.add(s.hook);
      s.chainG = new T.Group(); vm.scene.add(s.chainG);
      s.links = CW.chainMeshes('weapons/almas_elo', 5, 0.0034, s.chainG);
      s.rope = new CW.Rope(6, 0.13);
      s.tag = SO.Voxel.build('weapons/almas_ofuda', { voxel: 0.003, grip: 0.97, depth: 0.8 });
      if (s.tag) s.chainG.add(s.tag);
      // trail from the head
      right.userData.tip.position.set(0, headY + 0.14, 0);
      right.userData.base.position.set(0, headY - 0.08, 0);
      s.trail = new CW.Trail(vm.scene, { color: 0xa83008, core: HOT, life: 0.13, width: 1 });
      return s;
    },

    update(vm, s, dt, ctx) {
      const insp = ctx.inspect;
      const beat = insp < 0 ? 0 : insp < 0.24 ? 1 : insp < 0.48 ? 2 : insp < 0.72 ? 3 : insp < 0.95 ? 4 : 0;
      // how far the rocks have broken loose
      let spread = 0;
      if (beat === 2) spread = (insp - 0.24) / 0.24 * 0.04;
      else if (beat === 3) spread = 0.04 + (insp - 0.48) / 0.24 * 0.06;
      else if (beat === 4) spread = 0.1 + Math.sin((insp - 0.72) / 0.23 * PI) * 0.04;
      if (insp > 0.93) spread *= Math.max(0, 1 - (insp - 0.93) * 20);
      if (ctx.swing && ctx.swing.name === 'meteor_h') spread = 0.02 * Math.sin(ctx.swing.t * PI);
      const heat = beat >= 3 ? 1 : beat === 2 ? 0.7 : ctx.swing ? 0.6 : 0.4;
      s.rocks.forEach((h, i) => {
        h.m.position.copy(h.home).addScaledVector(h.dir, spread * (1 + (i % 3) * 0.3));
        if (spread > 0.001) { h.m.position.y += Math.sin(ctx.time * 3 + i) * spread * 0.2; h.m.rotation.x += h.spin.x * dt; h.m.rotation.y += h.spin.y * dt; }
        h.m.material.uniforms.uHeat.value = 0.35 + heat * 0.65 * (0.85 + Math.sin(ctx.time * 5 + i * 1.7) * 0.15);
              });
      s.core.scale.setScalar(0.8 + Math.sin(ctx.time * 8) * 0.05);
      const head = s.core.getWorldPosition(new T.Vector3());
      // embers (fire everywhere on the last beat)
      s.acc += dt * (beat === 4 ? 90 : beat === 3 ? 30 : ctx.swing ? 25 : 8);
      while (s.acc >= 1) {
        s.acc -= 1;
        const big = beat === 4 && Math.random() < 0.5;
        const p = head.clone().add(new T.Vector3((Math.random() - 0.5) * (0.12 + spread * 2), (Math.random() - 0.5) * (0.12 + spread * 2), (Math.random() - 0.5) * 0.1));
        s.motes.emit(big ? { pos: p, vel: new T.Vector3((Math.random() - 0.5) * 0.2, 0.15 + Math.random() * 0.2, 0), life: 0.5, size: 0.03, size1: 0.07, color: Math.random() < 0.4 ? HOT : Math.random() < 0.7 ? ORANGE : RED, opacity: 0.85, drag: 2, curl: 1.5, up: 0.3, fadeIn: 0.05 }
          : { pos: p, vel: new T.Vector3((Math.random() - 0.5) * 0.06, 0.1 + Math.random() * 0.15, 0), life: 0.7 + Math.random() * 0.5, size: 0.008, size1: 0.003, color: Math.random() < 0.5 ? ORANGE : HOT, opacity: 1, tex: CW.dotTex(), drag: 0.6, curl: 1.4, fadeIn: 0.05 });
      }
      s.motes.update(dt, ctx.time);
      s.trail.update(dt, s.right, ctx.trailOn(ctx.swing ? ctx.swing.trail : null));
      s.rope.step(Math.min(dt, 1 / 30), s.hook.getWorldPosition(new T.Vector3()), null, 9);
      CW.layChain(s.links, s.rope);
      if (s.tag) { const e = s.rope.p[s.rope.n - 1], q = s.rope.p[s.rope.n - 2]; s.tag.position.copy(e); s.tag.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), q.clone().sub(e).normalize()); }
    },

    clips: {
      meteor_a1: { trail: [0.36, 0.66], R: [K(0.3, [0.38, 0.05, -0.45], -0.6, -0.3, 0, 'stop'), K(0.5, [0.0, -0.2, -0.72], 1.4, 0.6, 0), K(0.6, [-0.2, -0.32, -0.7], 2.3, 0.7, 0, 'out'), K(0.8, [-0.21, -0.33, -0.7], 2.35, 0.7, 0), R(1)] },
      meteor_a2: { trail: [0.36, 0.66], R: [K(0.3, [-0.3, -0.12, -0.5], 1.5, 0.4, PI, 'stop'), K(0.48, [0.05, -0.2, -0.72], -0.2, 0.45, PI), K(0.6, [0.4, -0.28, -0.62], -1.8, 0.45, PI, 'out'), K(0.8, [0.42, -0.3, -0.6], -1.9, 0.45, PI), R(1)] },
      meteor_a3: { trail: [0.42, 0.6], R: [K(0.38, [0.18, 0.02, -0.48], 0.2, -0.45, 0, 'stop'), K(0.55, [0.06, -0.3, -0.78], 0, 1.3, 0, 'out'), K(0.82, [0.06, -0.32, -0.76], 0, 1.32, 0), R(1)] },
      meteor_h: { trail: [2, 2], R: [K(0.35, [0.1, 0.05, -0.5], 0.05, -0.3, 0), K(0.55, [0.08, 0.12, -0.45], 0.02, -0.55, 0, 'stop'), K(0.75, [0.08, 0.12, -0.45], 0.02, -0.55, 0, 'stop'), R(1)] },
    },

    swing(F, e, view) {
      const o = { pos: view.eye, yaw: view.yaw, pitch: view.pitch * 0.85, color: 0x6a1a04, core: HOT, wisp: 0.95, cells: [100, 6], alpha: 0.5 };
      if (e.step === 0) setTimeout(() => CW.slashArc(F, Object.assign(o, { roll: 45, radius: 1.8, width: 0.5, arc: 2.2, dur: 0.24 })), 160);
      else if (e.step === 1) setTimeout(() => CW.slashArc(F, Object.assign(o, { roll: 180, radius: 1.8, width: 0.5, arc: 2.2, dur: 0.24 })), 160);
      else if (e.step === 'h') setTimeout(() => { F.flash(view.eye.x, view.eye.y + 2, view.eye.z, ORANGE, 6, 0.3); F.white(0.15); }, 380);
    },
    hit(F, e) {
      const dir = new T.Vector3(e.dx, e.dy + 0.5, e.dz);
      F.fx.burst(e.x, e.y, e.z, 14, 10, ORANGE, 0.3, 0.3, -6, { dir });
      chunks(F, e.x, e.y, e.z, 4, 5);
      F.fx.blood(e.x, e.y, e.z, dir, 1.3);
      F.flash(e.x, e.y, e.z, ORANGE, 4, 0.14);
    },

    inspect: {
      dur: 4.8,
      R: [
        K(0.12, [0.18, -0.3, -0.55], 0.5, 0.35, 0),
        K(0.24, [0.18, -0.3, -0.55], 0.55, 0.38, 0.3),
        K(0.36, [0.14, -0.38, -0.66], 0.45, 0.55, 0),
        K(0.48, [0.14, -0.38, -0.66], 0.42, 0.55, 0.4),
        K(0.72, [0.14, -0.38, -0.68], 0.4, 0.5, 0.9),
        K(0.86, [0.15, -0.38, -0.66], 0.45, 0.55, 0.5),
        K(0.94, [0.2, -0.32, -0.56], 0.5, 0.45, 0, 'out'),
        R(1),
      ],
    },

    dispose(vm, s) { s.motes.clear(); s.trail.dispose(vm.scene); vm.scene.remove(s.chainG); },
  };

  // flying rock chunks in the world
  function chunks(F, x, y, z, n, speed) {
    for (let i = 0; i < n; i++) {
      const m = rock(0.08 + Math.random() * 0.1, (Math.random() * 1000) | 0);
      m.position.set(x, y, z); F.add(m);
      const v = new T.Vector3((Math.random() - 0.5) * 2, Math.random() * 1.5 + 0.5, (Math.random() - 0.5) * 2).multiplyScalar(speed);
      const sp = new T.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(10);
      F.spawn((dt, age) => {
        m.position.addScaledVector(v, dt); v.y -= 18 * dt;
        m.rotation.x += sp.x * dt; m.rotation.y += sp.y * dt;
        m.userData.seams.material.opacity = Math.max(0, 1 - age / 1.2);
        if (age < 1.2) return true;
        m.geometry.dispose(); m.material.dispose(); return false;
      }, [m]);
    }
  }
  AFX.vfx['cw_meteor:quake'] = (F, e) => {
    chunks(F, e.x, e.y + 0.4, e.z, 7, 7);
    F.fx.burst(e.x, e.y + 0.3, e.z, 24, 9, ORANGE, 0.4, 0.4, -6);
    F.fx.burst(e.x, e.y + 0.3, e.z, 14, 5, 0x3a2a24, 0.7, 0.8, -2);
    F.flash(e.x, e.y + 1, e.z, ORANGE, 6, 0.2);
    F.kick(4);
  };
  // where the meteor will land: a burning ring that tightens
  AFX.vfx['cw_meteor:mark'] = (F, e) => {
    const m = new T.Mesh(new T.RingGeometry(0.8, 1, 40).rotateX(-PI / 2), new T.MeshBasicMaterial({ color: ORANGE, transparent: true, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    m.position.set(e.x, e.y + 0.08, e.z); F.add(m);
    F.spawn((dt, age) => { const k = age / 1.0; m.scale.setScalar(6.5 * (1 - k * 0.7)); m.material.opacity = 0.4 + Math.sin(age * 30) * 0.3; if (k < 1) return true; m.geometry.dispose(); m.material.dispose(); return false; }, [m]);
  };
  function rockSpell(size) {
    return {
      build(F) {
        const root = new T.Group();
        const m = rock(size, (Math.random() * 1000) | 0);
        const glow = new T.Mesh(new T.IcosahedronGeometry(size * 1.35, 1), new T.MeshBasicMaterial({ color: ORANGE, transparent: true, opacity: 0.35, blending: T.AdditiveBlending, depthWrite: false }));
        root.add(m); root.add(glow);
        return { root, m, glow };
      },
      update(F, v, dt) {
        v.m.rotation.x += dt * 4; v.m.rotation.z += dt * 3;
        const p = v.root.getWorldPosition(new T.Vector3());
        const n = size > 0.6 ? 6 : 2;
        for (let i = 0; i < n; i++) F.fx.glowP.emit(p.x + (Math.random() - 0.5) * size, p.y + (Math.random() - 0.5) * size, p.z + (Math.random() - 0.5) * size, 0, 1.5, 0, 1, 0.4 + Math.random() * 0.4, 0.08, size * 0.5, 0.45, -1, 2);
      },
      dispose(F, v) { v.m.geometry.dispose(); v.m.material.dispose(); v.glow.geometry.dispose(); v.glow.material.dispose(); },
      boom(F, e) {
        const big = size > 0.6;
        chunks(F, e.x, e.y, e.z, big ? 12 : 4, big ? 10 : 6);
        F.fx.burst(e.x, e.y, e.z, big ? 50 : 16, big ? 14 : 8, ORANGE, big ? 0.7 : 0.4, big ? 0.6 : 0.35, -6);
        F.fx.burst(e.x, e.y, e.z, big ? 24 : 8, big ? 8 : 4, HOT, 0.4, 0.35, -3);
        F.fx.burst(e.x, e.y, e.z, big ? 26 : 8, big ? 6 : 3, 0x2a2220, 1, 1, -1.5);
        F.flash(e.x, e.y + 1, e.z, ORANGE, big ? 14 : 5, big ? 0.4 : 0.15);
        F.kick(big ? 8 : 2);
      },
    };
  }
  AFX.spell.cw_meteor_rock = rockSpell(1.1);
  AFX.spell.cw_meteor_frag = rockSpell(0.35);
})(window.SO = window.SO || {});
