// 7. METEORO — rocks from the sky: black stone split by glowing cracks, fire envelopes, smoke trails.
//   Chuva de Meteoros: three orange points in the sky grow into burning rocks; small fires stay behind.
//   Meteoro Guiado: a spinning meteor whose curved trail bends after your crosshair; a glowing crater.
//   Impacto Celeste: a shadow grows on the floor, the sky goes orange, a huge boulder falls with a shockwave.
//   Tempestade Astral: the sky fills with burning streaks, every impact shakes the arena, and the last
//     meteor breaks through the clouds wrapped in rings of fire.
(function (SO) {
  'use strict';
  const T = THREE, L = SO.AFXLib, AFX = SO.AFX;
  const OR = 0xff7a1a, HOT = 0xffd080, RED = 0xff3a10;

  const lavaTex = () => L.tex('meteor-lava', 256, (c, s) => {
    c.fillStyle = '#000'; c.fillRect(0, 0, s, s);
    c.strokeStyle = 'rgba(255,150,40,1)'; c.lineCap = 'round';
    for (let i = 0; i < 26; i++) {
      let x = Math.random() * s, y = Math.random() * s, a = Math.random() * 6.28;
      c.lineWidth = 1 + Math.random() * 4; c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 6; k++) { a += (Math.random() - 0.5) * 1.2; x += Math.cos(a) * 14; y += Math.sin(a) * 14; c.lineTo(x, y); }
      c.stroke();
    }
  });
  const shadowTex = () => L.tex('meteor-shadow', 256, (c, s) => { const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(0,0,0,0.9)'); g.addColorStop(0.7, 'rgba(0,0,0,0.6)'); g.addColorStop(0.92, 'rgba(255,120,30,0.8)'); g.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, s, s); });
  const markTex = () => L.tex('meteor-mark', 128, (c, s) => { const col = 'rgba(255,140,40,1)'; L.draw.ring(c, s, s * 0.44, 5, col); L.draw.ticks(c, s, s * 0.2, s * 0.36, 4, 5, col); });

  // incandescent rock: black stone with glowing cracks, inside a flickering fire shell
  function rock(r, detail) {
    const g = new T.Group();
    const stone = new T.Mesh(new T.DodecahedronGeometry(r, detail || 0), new T.MeshLambertMaterial({ color: 0x241410, emissive: 0xffffff, emissiveMap: lavaTex() }));
    const fire = new T.Mesh(new T.SphereGeometry(r * 1.45, 14, 10), L.flame(OR, { tip: HOT, scale: 2.5, speed: 7 }));
    g.add(stone); g.add(fire);
    g.userData = { stone, fire };
    return g;
  }
  function explode(F, x, y, z, r, big) {
    F.flash(x, y + 1.5, z, OR, 6 + r * 2, 0.4 + r * 0.05);
    F.fx.burst(x, y + 0.4, z, Math.round(30 + r * 20), 6 + r * 2.5, OR, 0.4 + r * 0.05, 0.6, 10, { up: 5 + r });
    F.fx.burst(x, y + 0.4, z, Math.round(15 + r * 10), 4 + r, 0x1a1210, 0.6 + r * 0.1, 1.2, 4, { ink: true, up: 4 + r });
    F.fx.ring(x, y + 0.05, z, 0.3, r * 1.6, OR, 0.4 + r * 0.03, 0.95);
    F.fx.gibs(x, y + 0.5, z, Math.round(6 + r * 3), 0x2a1810, null, 8 + r * 2);
    // the glowing crater that cools down from yellow to dark red
    const d = new T.Mesh(new T.CircleGeometry(r * 0.6, 24).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: HOT, transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, fog: false }));
    d.position.set(x, y + 0.05, z);
    F.add(d);
    const life = big ? 7 : 3.5;
    F.spawn((dt, age) => { const k = age / life; d.material.color.setRGB(1, Math.max(0.05, 0.8 - k * 1.6), Math.max(0, 0.3 - k)); d.material.opacity = 0.9 * (1 - k); return k < 1; }, [d]);
  }
  function fallingRock(r) {
    return {
      build(F) {
        const root = new T.Group(), g = rock(r);
        root.add(g);
        return { root, g, trail: new L.Trail(F.scene, 24, r * 0.9, OR, { core: HOT, life: 0.35 }) };
      },
      update(F, v, dt, vel) {
        v.g.rotation.x += dt * 4; v.g.rotation.y += dt * 2.5;
        v.g.userData.fire.material.uniforms.uTime.value = F.t;
        const p = v.root.position;
        v.trail.push(p, new T.Vector3(1, 0, 0), dt);
        F.fx.inkP.emit(p.x, p.y + 0.3, p.z, -vel.x * 0.05, 1, -vel.z * 0.05, 0.12, 0.09, 0.08, r * 1.6, 0.9, -1, 1);
        if (Math.random() < 0.6) F.fx.glowP.emit(p.x, p.y, p.z, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 3, 1, 0.5, 0.1, r * 0.4, 0.3, 0, 1);
      },
      boom(F, e) { explode(F, e.x, e.y, e.z, r * 3); F.shake(0.08 + r * 0.06); },
    };
  }

  // ---------------- Chuva de Meteoros ----------------
  AFX.cast.meteor_1 = () => {};
  AFX.vfx['meteor_1:mark'] = (F, e) => {
    const d = L.disc(markTex(), 3.4, OR, 1); d.position.set(e.x, e.y + 0.06, e.z);
    F.add(d);
    F.spawn((dt, age) => { d.rotation.y = -age * 2; d.material.opacity = (0.6 + 0.4 * Math.sin(age * 30)) * Math.max(0, 1 - age / 1.1); return age < 1.1; }, [d]);
  };
  AFX.spell.meteor_1 = Object.assign(fallingRock(0.85), {
    // while it waits high up, it is just an orange point that brightens
    launch(F, e) { F.fx.glowP.emit(e.x, e.y, e.z, 0, 0, 0, 1, 0.6, 0.2, 1.5, 0.25, 0, 0); },
  });
  AFX.effect['meteor_1:flames'] = {
    build(F, fx) {
      const root = new T.Group(); root.position.set(fx.x, fx.y, fx.z);
      const mats = [];
      for (let i = 0; i < 3; i++) { const m = new T.Mesh(new T.PlaneGeometry(fx.r * 1.6, 1.4).translate(0, 0.7, 0), L.flame(OR, { tip: HOT, scale: 3, speed: 4 })); m.rotation.y = i * 1.05; root.add(m); mats.push(m.material); }
      F.add(root);
      return { root, mats };
    },
    update(F, v, fx) { const k = Math.min(1, (fx.dur - fx.t) / 0.6); for (const m of v.mats) { m.uniforms.uTime.value = F.t; m.uniforms.uK.value = k; } if (Math.random() < 0.3) F.fx.glowP.emit(fx.x + (Math.random() - 0.5) * 2, fx.y + 0.5, fx.z + (Math.random() - 0.5) * 2, 0, 3, 0, 1, 0.5, 0.1, 0.15, 0.6, -1, 0); },
    end(F, v) { F.remove(v.root); return 0; },
  };

  // ---------------- Meteoro Guiado ----------------
  AFX.cast.meteor_2 = (F, e, mine) => { if (mine) F.kick(3); };
  AFX.spell['meteor_2'] = fallingRock(1.2);
  AFX.spell['meteor_2:frag'] = {
    build(F) { const root = new T.Group(); const m = new T.Mesh(new T.DodecahedronGeometry(0.2, 0), new T.MeshBasicMaterial({ color: HOT })); root.add(m); return { root, m, trail: new L.Trail(F.scene, 10, 0.08, OR, { core: HOT, life: 0.3 }) }; },
    update(F, v, dt) { v.m.rotation.x += dt * 10; v.trail.push(v.root.position, new T.Vector3(0, 1, 0), dt); },
    hit(F, e) { F.fx.burst(e.x, e.y, e.z, 8, 4, OR, 0.2, 0.3, 6); },
    end(F, e) { F.fx.burst(e.x, e.y, e.z, 6, 3, OR, 0.18, 0.3, 6); },
  };

  // ---------------- Impacto Celeste (and the storm's last meteor) ----------------
  AFX.cast.meteor_3 = () => {};
  AFX.effect.meteor_3 = {
    build(F, fx) {
      const S = fx.scale || 1;
      const root = new T.Group(); root.position.set(fx.x, fx.y, fx.z);
      const shadow = L.disc(shadowTex(), fx.r, 0xffffff, 1); shadow.material.blending = T.NormalBlending; shadow.position.y = 0.07;
      const boulder = rock(2.2 * S, 1);
      // rings of fire around the colossal one
      const rings = [];
      if (S > 1) for (let i = 0; i < 3; i++) { const r = new T.Mesh(new T.TorusGeometry(2.2 * S * (1.6 + i * 0.5), 0.5, 6, 40), L.flame(OR, { tip: HOT, scale: 5, speed: 6 })); r.rotation.x = Math.PI / 2 + (i - 1) * 0.4; boulder.add(r); rings.push(r); }
      root.add(shadow); root.add(boulder);
      F.add(root);
      return { root, shadow, boulder, rings, S, trail: new L.Trail(F.scene, 30, 2.2 * S, OR, { core: HOT, life: 0.4 }) };
    },
    update(F, v, fx, dt) {
      const k = Math.min(1, fx.t / fx.dur), S = v.S;
      v.shadow.scale.setScalar(0.1 + 0.9 * k);
      const fall = 1 - Math.pow(k, 2);
      v.boulder.position.set(fall * 18 * S, fall * 60 * S + 1.5 * S, fall * 12 * S);
      v.boulder.rotation.x += dt * 1.5; v.boulder.rotation.z += dt;
      v.boulder.userData.fire.material.uniforms.uTime.value = F.t;
      for (const r of v.rings) r.material.uniforms.uTime.value = F.t;
      v.trail.push(v.boulder.getWorldPosition(new T.Vector3()), new T.Vector3(1, 0, 0), dt);
      const bp = v.boulder.getWorldPosition(new T.Vector3());
      for (let i = 0; i < 3 * S; i++) F.fx.inkP.emit(bp.x + (Math.random() - 0.5) * 2 * S, bp.y + 2 * S, bp.z + (Math.random() - 0.5) * 2 * S, 8, 16, 6, 0.14, 0.1, 0.08, 1.4 * S, 1.2, -2, 1);
      F.atmo({ grade: 0xff8a20, gradeAmt: (0.25 + 0.15 * S) * k, dark: 0.1 * k });
    },
    end(F, v) { F.remove(v.root); v.trail.dispose(); return 0; },
  };
  AFX.vfx['meteor_3:impact'] = (F, e) => {
    const big = e.big ? 1 : 0;
    explode(F, e.x, e.y, e.z, big ? 18 : 8, true);
    F.white(0.4 + big * 0.4); F.shake(0.6 + big * 0.4);
    const dome = new T.Mesh(new T.SphereGeometry(1, 28, 16), L.fresnel(OR, 1.3, 2.4));
    dome.position.set(e.x, e.y, e.z);
    F.add(dome);
    F.spawn((dt, age) => { dome.scale.setScalar(1 + age * (big ? 45 : 22)); dome.material.uniforms.uK.value = Math.max(0, 2.4 - age * 4.5); return age < 0.55; }, [dome]);
  };

  // ---------------- Tempestade Astral ----------------
  AFX.ult.meteor_ult = { start(F, e, mine) { if (mine) F.shake(0.3); }, end() {} };
  AFX.effect.meteor_ult = {
    build() { return {}; },
    update(F, v, fx) {
      const k = Math.min(1, fx.t / 1) * Math.min(1, (fx.dur - fx.t) / 1);
      F.atmo({ grade: 0xff6a10, gradeAmt: 0.35 * k, dark: 0.25 * k });
      // distant streaks across the whole sky, beyond the ones that land
      if (Math.random() < 0.6 * k) {
        const x = F.cam.position.x + (Math.random() - 0.5) * 140, z = F.cam.position.z + (Math.random() - 0.5) * 140;
        for (let i = 0; i < 6; i++) F.fx.glowP.emit(x + i * 1.6, 70 - i * 3, z + i, 30, -50, 18, 1, 0.55, 0.15, 1.2 - i * 0.12, 1.2, 0, 0);
      }
      if (Math.random() < 0.05 * k) F.shake(0.05);
    },
  };
  AFX.spell.meteor_ult = fallingRock(1.05);
  // meteor burns: smouldering embers stuck to the body, smoke curling off (not open flames)
  AFX.status['meteor_1:burn'] = {
    build(F, ctx) {
      const g = new T.Group(), embers = [];
      for (let i = 0; i < 6; i++) { const m = new T.Mesh(new T.DodecahedronGeometry(0.07, 0), new T.MeshBasicMaterial({ color: HOT })); const a = Math.random() * 6.28; m.position.set(Math.cos(a) * ctx.e.def.radius * 0.8, Math.random() * ctx.e.def.height * 0.9, Math.sin(a) * ctx.e.def.radius * 0.8); g.add(m); embers.push(m); }
      ctx.view.root.add(g);
      return { root: g, embers, e: ctx.e };
    },
    update(F, v, s, e) {
      v.embers.forEach((m, i) => m.material.color.setRGB(1, 0.35 + 0.35 * Math.sin(F.t * 9 + i), 0.05));
      if (Math.random() < 0.4) F.fx.inkP.emit(e.pos.x + (Math.random() - 0.5) * e.def.radius, e.pos.y + e.def.height * 0.6, e.pos.z + (Math.random() - 0.5) * e.def.radius, 0, 1.8, 0, 0.18, 0.15, 0.13, 0.35, 0.9, -0.6, 0.6);
    },
  };
  AFX.status['meteor_2:burn'] = AFX.status['meteor_1:burn'];
  AFX.status['meteor_2:frag:burn'] = AFX.status['meteor_1:burn'];
})(window.SO = window.SO || {});
