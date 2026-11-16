// 06 ESCUDO DE ENERGIA — "Égide Arcana": a lozenge shield of gold filigree and dark glass with a
// star burning at its heart, floating over the open right hand. Ice-white crystals orbit it on a
// tilted ring. Inspect (author's sheet): it floats, turning; rings of light gather around it; the
// rings multiply and the crystals swing wide; a golden dome closes over it all.
(function (SO) {
  'use strict';
  const T = THREE, CW = SO.CharWeapons, AFX = SO.AFX, PI = Math.PI;
  const K = (t, p, a, f, roll, ease) => ({ t, p, a, f, roll, ease: ease || 'inout' });
  const R = (t) => ({ t, rest: true, ease: 'inout' });
  const GOLDL = 0xffd070, WHITE = 0xfff4d0, ICE = 0x9ad0ff;

  function ringMesh(r, w, color, op) {
    const m = new T.Mesh(new T.TorusGeometry(r, w, 4, 64), new T.MeshBasicMaterial({ color, transparent: true, opacity: op, blending: T.AdditiveBlending, depthWrite: false }));
    m.renderOrder = 5;
    return m;
  }
  // a pixel-dithered shell of light with a lattice (the dome)
  function domeMat(color) {
    return new T.ShaderMaterial({
      uniforms: { uColor: { value: new T.Color(color) }, uK: { value: 0 }, uTime: { value: 0 } },
      transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending,
      vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec2 vUv; void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: `uniform vec3 uColor; uniform float uK, uTime; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
        void main(){
          float rim = pow(1.0 - abs(dot(vN, vV)), 2.2);
          vec2 g = vUv * vec2(24.0, 12.0);
          float lat = step(0.93, fract(g.x)) + step(0.93, fract(g.y + uTime * 0.2));
          float a = (rim * 0.9 + lat * 0.35 + 0.05) * uK;
          vec2 c = floor(gl_FragCoord.xy / 3.0);
          float d = fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453);
          if (a < 0.1 + d * 0.45) discard;
          gl_FragColor = vec4(uColor * (0.6 + rim), 1.0);
        }`,
    });
  }

  CW.reg.aegis = {
    slot: 0,
    oneHand: true,
    restR: { p: [0.13, -0.12, -0.66], a: 0, f: 0.05, roll: 0 },
    gripR: 0,
    // the right hand open, palm up under the shield
    palm(pose) { return { p: [pose.p.x + 0.07, pose.p.y - 0.2, pose.p.z + 0.16], F: [-0.3, 0.55, -1], B: [0.35, -1, 0.25], curl: 0.22, idx: 0.12 }; },

    build(vm) {
      const right = SO.Voxel.build('weapons/egide_escudo', { voxel: 0.0042, grip: 0.5, glow: 0.35, haloPx: 2, depth: () => 2.4 });
      if (!right) return null;
      right.userData.halo.material.color.setHex(GOLDL);
      const s = { right, motes: new CW.Motes(vm.scene, 200), acc: 0, fired: {}, spin: 0 };
      s.crystals = [];
      for (let i = 0; i < 6; i++) {
        const c = SO.Voxel.build('weapons/egide_cristal', { voxel: 0.0036, grip: 0.5, glow: 0.3, depth: () => 2.2 });
        if (!c) continue;
        c.userData.halo.material.color.setHex(ICE);
        vm.scene.add(c);
        s.crystals.push({ m: c, a: i / 6 * PI * 2, launch: 0 });
      }
      s.rings = [ringMesh(0.19, 0.0035, GOLDL, 0.85), ringMesh(0.15, 0.003, WHITE, 0.6), ringMesh(0.24, 0.003, GOLDL, 0.6), ringMesh(0.12, 0.0025, WHITE, 0.6)];
      s.rings.forEach((r) => { r.visible = false; vm.scene.add(r); });
      s.dome = new T.Mesh(new T.SphereGeometry(0.34, 32, 16), domeMat(GOLDL));
      s.dome.renderOrder = 4; s.dome.visible = false; vm.scene.add(s.dome);
      s.trail = new CW.Trail(vm.scene, { color: 0x8a6020, core: WHITE, life: 0.1, width: 1 });
      return s;
    },

    update(vm, s, dt, ctx) {
      const insp = ctx.inspect, ud = s.right.userData;
      const beat = insp < 0 ? 0 : insp < 0.24 ? 1 : insp < 0.48 ? 2 : insp < 0.72 ? 3 : insp < 0.95 ? 4 : 0;
      // float: bob and a slow breath of light
      s.right.position.y = Math.sin(ctx.time * 1.8) * 0.008;
      ud.halo.material.opacity = 0.3 + Math.sin(ctx.time * 2.2) * 0.08 + (beat >= 3 ? 0.25 : 0);
      const c = s.right.getWorldPosition(new T.Vector3());
      // orbiting crystals on a tilted ring (wider in the show; fired forward by the volley)
      const wide = beat === 3 || beat === 4 ? 1.6 : beat === 2 ? 1.25 : 1;
      const volley = ctx.swing && ctx.swing.name === 'aegis_a3' ? ctx.swing.t : -1;
      s.crystals.forEach((h, i) => {
        h.a += dt * (beat ? 1.4 : 0.9);
        const r = 0.17 * wide, tilt = 0.45;
        const x = Math.cos(h.a) * r, y = Math.sin(h.a) * r * Math.sin(tilt) + Math.sin(ctx.time * 2 + i) * 0.01, z = Math.sin(h.a) * r * Math.cos(tilt);
        const p = c.clone().add(new T.Vector3(x, y, z));
        if (volley >= 0.35 && volley < 0.85 && i < 5) p.add(new T.Vector3(0, 0, -(volley - 0.35) * 6));
        h.m.position.copy(p);
        h.m.rotation.set(0, h.a, Math.sin(h.a) * 0.3);
        h.m.visible = !(volley >= 0.5 && volley < 0.85 && i < 5);
      });
      // rings of light: one in beat 2, all four turning in beats 3-4
      s.rings.forEach((r, i) => {
        r.visible = (beat === 2 && i < 2) || beat >= 3;
        if (!r.visible) return;
        r.position.copy(c).add(new T.Vector3(0, (i - 1.5) * 0.07, 0));
        r.rotation.set(PI / 2 + Math.sin(ctx.time + i) * 0.15, 0, ctx.time * (i % 2 ? 1 : -1));
        r.scale.setScalar(beat >= 3 ? 1.2 + i * 0.1 : 1);
      });
      // the dome
      const dk = beat === 4 ? Math.min(1, (insp - 0.72) * 6) * Math.min(1, (0.95 - insp) * 12) : (ctx.swing && ctx.swing.name === 'aegis_h' ? Math.sin(Math.min(1, Math.max(0, (ctx.swing.t - 0.45) / 0.45)) * PI) : 0);
      s.dome.visible = dk > 0.01;
      if (s.dome.visible) { s.dome.position.copy(c); s.dome.scale.setScalar(0.6 + dk * 0.6); s.dome.material.uniforms.uK.value = dk; s.dome.material.uniforms.uTime.value = ctx.time; s.dome.rotation.y = ctx.time * 0.3; }
      // sparkles
      s.acc += dt * (beat ? 22 : 6);
      while (s.acc >= 1) { s.acc -= 1; const a = Math.random() * PI * 2, r = 0.05 + Math.random() * 0.25 * wide; s.motes.emit({ pos: c.clone().add(new T.Vector3(Math.cos(a) * r, (Math.random() - 0.5) * 0.3, Math.sin(a) * r * 0.5)), vel: new T.Vector3(0, 0.02, 0), life: 0.6, size: 0.004, size1: 0.012, color: Math.random() < 0.6 ? WHITE : GOLDL, opacity: 1, tex: CW.dotTex(), drag: 1, fadeIn: 0.4 }); }
      s.motes.update(dt, ctx.time);
      s.trail.update(dt, s.right, ctx.trailOn(ctx.swing ? ctx.swing.trail : null));
    },

    clips: {
      aegis_a1: { trail: [2, 2], R: [K(0.22, [0.15, -0.13, -0.5], 0, 0.05, 0), K(0.45, [0.04, -0.1, -0.98], 0, 0.1, 0, 'out'), K(0.66, [0.05, -0.1, -0.95], 0, 0.1, 0), R(1)] },
      aegis_a2: { trail: [0.25, 0.65], R: [K(0.2, [0.4, -0.1, -0.6], -0.6, 0.1, 0.6), K(0.5, [-0.3, -0.16, -0.66], 0.6, 0.1, -0.6, 'out'), K(0.7, [-0.32, -0.18, -0.64], 0.65, 0.1, -0.65), R(1)] },
      aegis_a3: { trail: [2, 2], R: [K(0.25, [0.12, -0.1, -0.55], 0, 0, 0), K(0.4, [0.1, -0.08, -0.72], 0, 0, 0, 'out'), K(0.7, [0.11, -0.09, -0.7], 0, 0, 0), R(1)] },
      aegis_h: { trail: [2, 2], R: [K(0.35, [0.02, 0.0, -0.55], 0, 0, PI, 'stop'), K(0.6, [0.03, -0.05, -0.62], 0, 0, 2 * PI, 'out'), K(0.85, [0.06, -0.08, -0.64], 0, 0, 2 * PI), R(1)] },
    },

    swing(F, e, view) {
      const f = new T.Vector3(-Math.sin(view.yaw) * Math.cos(view.pitch), Math.sin(view.pitch), -Math.cos(view.yaw) * Math.cos(view.pitch));
      if (e.step === 0) setTimeout(() => shock(F, view.eye.clone().addScaledVector(f, 2.2), f, 1.6), 120);
      else if (e.step === 1) setTimeout(() => CW.slashArc(F, { pos: view.eye, yaw: view.yaw, pitch: view.pitch * 0.85, roll: 180, color: 0x8a6020, core: WHITE, radius: 1.8, width: 0.25, arc: 2.4, dur: 0.22, wisp: 0.2, cells: [120, 5], alpha: 0.6 }), 80);
    },
    hit(F, e) {
      F.fx.burst(e.x, e.y, e.z, 12, 8, GOLDL, 0.3, 0.25, 0, { dir: new T.Vector3(e.dx, e.dy + 0.3, e.dz) });
      F.fx.burst(e.x, e.y, e.z, 5, 5, ICE, 0.35, 0.3, -6);
      F.fx.blood(e.x, e.y, e.z, new T.Vector3(e.dx, e.dy + 0.3, e.dz), 0.8);
      F.flash(e.x, e.y, e.z, GOLDL, 4, 0.12);
    },

    inspect: {
      dur: 4.4,
      R: [
        K(0.12, [0.06, -0.1, -0.6], 0, 0.02, PI * 0.5),
        K(0.24, [0.06, -0.1, -0.6], 0, 0.02, PI * 1.0),
        K(0.36, [0.04, -0.08, -0.6], 0, 0.0, PI * 1.6),
        K(0.48, [0.04, -0.08, -0.6], 0, 0.0, PI * 2),
        K(0.72, [0.02, -0.06, -0.62], 0, 0.0, PI * 2.2),
        K(0.94, [0.02, -0.06, -0.62], 0, 0.0, PI * 2),
        R(1),
      ],
    },

    dispose(vm, s) {
      s.motes.clear(); s.trail.dispose(vm.scene);
      for (const h of s.crystals) vm.scene.remove(h.m);
      for (const r of s.rings) vm.scene.remove(r);
      vm.scene.remove(s.dome);
    },
  };

  // bash: a golden shockwave ring rolling forward
  function shock(F, pos, dir, r) {
    const m = ringMesh(r, 0.06, GOLDL, 0.9);
    m.position.copy(pos); m.lookAt(pos.clone().add(dir));
    F.add(m);
    F.spawn((dt, age) => { const k = age / 0.3; m.scale.setScalar(0.4 + k * 1.2); m.position.addScaledVector(dir, dt * 6); m.material.opacity = 0.9 * (1 - k); if (k < 1) return true; m.geometry.dispose(); m.material.dispose(); return false; }, [m]);
  }
  // the volley's crystals
  AFX.spell.cw_aegis_shard = {
    build(F, q) {
      const root = new T.Group();
      const m = new T.Mesh(new T.OctahedronGeometry(0.16, 0).scale(0.6, 0.6, 2.4), new T.MeshBasicMaterial({ color: 0xe8f4ff }));
      const g = new T.Mesh(new T.OctahedronGeometry(0.26, 0).scale(0.6, 0.6, 2.2), new T.MeshBasicMaterial({ color: ICE, transparent: true, opacity: 0.45, blending: T.AdditiveBlending, depthWrite: false }));
      root.add(m); root.add(g);
      return { root, own: [m, g], trail: new SO.AFXLib.Trail(F.scene, 10, 0.12, ICE, { core: WHITE, life: 0.12 }) };
    },
    update(F, v, dt, vel) {
      const p = v.root.position;
      const moving = Math.hypot(vel.x, vel.y, vel.z) > 0.5;
      if (moving) v.root.lookAt(p.x + vel.x, p.y + vel.y, p.z + vel.z);
      v.trail.push(moving ? p : null, new T.Vector3(0, 1, 0), dt);
    },
    dispose(F, v) { for (const m of v.own) { m.geometry.dispose(); m.material.dispose(); } },
    hit(F, e) { F.fx.burst(e.x, e.y, e.z, 8, 7, ICE, 0.25, 0.2, -4); F.fx.glint(e.x, e.y, e.z, WHITE); },
    end(F, e) { F.fx.burst(e.x, e.y, e.z, 6, 4, ICE, 0.2, 0.2, -6); },
  };
  // the dome blooming out from you
  AFX.vfx['cw_aegis:dome'] = (F, e, mine) => {
    const m = new T.Mesh(new T.SphereGeometry(1, 32, 16), domeMat(GOLDL));
    m.position.set(e.x, e.y + 1, e.z);
    F.add(m);
    F.spawn((dt, age) => { const k = age / 0.55; m.scale.setScalar(0.5 + k * 7); m.material.uniforms.uK.value = 1 - k * k; m.material.uniforms.uTime.value = F.t; if (k < 1) return true; m.geometry.dispose(); m.material.dispose(); return false; }, [m]);
    const ring = ringMesh(1, 0.08, GOLDL, 0.9); ring.rotation.x = PI / 2; ring.position.set(e.x, e.y + 0.1, e.z); F.add(ring);
    F.spawn((dt, age) => { const k = age / 0.5; ring.scale.setScalar(0.5 + k * 7); ring.material.opacity = 0.9 * (1 - k); if (k < 1) return true; ring.geometry.dispose(); ring.material.dispose(); return false; }, [ring]);
    F.flash(e.x, e.y + 1, e.z, GOLDL, 8, 0.3);
    if (mine) { F.kick(3); F.white(0.25); }
  };
})(window.SO = window.SO || {});
