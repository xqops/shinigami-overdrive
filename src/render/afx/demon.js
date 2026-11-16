// 3. EXPLOSÃO DEMONÍACA — scarlet demonic fire, black smoke, cracked stone.
//   Bastião Infernal: red fissures race out from the fist, crystal spikes stab up, a burning ring expands.
//   Onda de Choque: a wall of scarlet flame tears a burning furrow across the floor.
//   Detonação Total: turning runes over each victim, then incandescent blasts one after another.
//   Apocalipse: a demonic circle covers the arena, sigils burn in the sky, pillars of fire rise,
//   red meteors fall and the central sphere swells until it bursts.
(function (SO) {
  'use strict';
  const T = THREE, L = SO.AFXLib, AFX = SO.AFX;
  const RED = 0xff2a1a, DARK = 0x5a0000, HOT = 0xffb070;

  const crackTex = () => L.tex('demon-cracks', 512, (c, s) => {
    c.strokeStyle = 'rgba(255,70,40,1)'; c.lineCap = 'round';
    const branch = (x, y, a, len, w, depth) => {
      if (depth > 5 || len < 6) return;
      let px = x, py = y;
      c.lineWidth = w; c.beginPath(); c.moveTo(px, py);
      const steps = 6;
      for (let i = 0; i < steps; i++) { a += (Math.random() - 0.5) * 0.7; px += Math.cos(a) * len / steps; py += Math.sin(a) * len / steps; c.lineTo(px, py); }
      c.stroke();
      branch(px, py, a + 0.5, len * 0.6, w * 0.65, depth + 1);
      if (Math.random() < 0.6) branch(px, py, a - 0.6, len * 0.55, w * 0.6, depth + 1);
    };
    for (let i = 0; i < 9; i++) branch(s / 2, s / 2, (i / 9) * Math.PI * 2, s * 0.24, 7, 0);
  });
  const runeTex = () => L.tex('demon-rune', 256, (c, s) => {
    const col = 'rgba(255,60,40,1)';
    L.draw.ring(c, s, s * 0.46, 5, col); L.draw.ring(c, s, s * 0.36, 2, col);
    L.draw.star(c, s, s * 0.36, 5, 2, 3, col);
    L.draw.glyphs(c, s, s * 0.41, '魔爆滅焔魔爆滅焔', 20, col, Math.PI / 8);
    c.fillStyle = col; c.font = '64px "DotGothic16",serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('魔', s / 2, s / 2 + 4);
  });
  const bigCircleTex = () => L.tex('demon-big', 1024, (c, s) => {
    const col = 'rgba(255,40,30,1)';
    for (const [r, w] of [[0.49, 10], [0.47, 3], [0.4, 6], [0.27, 4], [0.12, 3]]) L.draw.ring(c, s, s * r, w, col);
    L.draw.star(c, s, s * 0.4, 5, 2, 6, col); L.draw.star(c, s, s * 0.27, 6, 2, 3, col);
    L.draw.glyphs(c, s, s * 0.435, '魔滅焔獄血骨魔滅焔獄血骨魔滅焔獄血骨魔滅焔獄血骨', 34, col);
    L.draw.glyphs(c, s, s * 0.335, '終末終末終末終末終末終末', 28, col, 0.2);
    L.draw.ticks(c, s, s * 0.12, s * 0.2, 60, 2, col);
  });

  function fireball(F, x, y, z, r, dur) {
    const g = new T.Group(); g.position.set(x, y, z);
    const core = new T.Mesh(new T.SphereGeometry(1, 20, 14), L.add(HOT, 1));
    const shell = new T.Mesh(new T.SphereGeometry(1, 20, 14), L.flame(RED, { tip: HOT, scale: 2.5, speed: 4 }));
    const smoke = new T.Mesh(new T.SphereGeometry(1, 16, 12), new T.MeshBasicMaterial({ color: 0x140404, transparent: true, opacity: 0.85, depthWrite: false }));
    g.add(smoke); g.add(shell); g.add(core);
    F.add(g);
    F.spawn((dt, age) => {
      const k = age / dur;
      core.scale.setScalar(r * 0.5 * (1 - k)); shell.scale.setScalar(r * (0.4 + k * 0.8));
      shell.material.uniforms.uTime.value = F.t; shell.material.uniforms.uK.value = 1 - k;
      smoke.scale.setScalar(r * (0.3 + k * 1.2)); smoke.material.opacity = 0.85 * (1 - k) * Math.min(1, k * 4);
      return k < 1;
    }, [g]);
    for (let i = 0; i < 30; i++) F.fx.glowP.emit(x, y, z, (Math.random() - 0.5) * r * 9, Math.random() * r * 7, (Math.random() - 0.5) * r * 9, 1, 0.45 + Math.random() * 0.3, 0.15, 0.2 + Math.random() * 0.2, 0.6 + Math.random() * 0.5, 12, 1);
  }

  // ---------------- Bastião Infernal ----------------
  AFX.cast.demon_1 = () => {};
  AFX.vfx['demon_1:slam'] = (F, e, mine) => {
    const y = e.y + 0.05;
    const cracks = L.disc(crackTex(), 7, RED, 1); cracks.position.set(e.x, y, e.z); cracks.rotation.y = Math.random() * 6.28;
    const ring = new T.Mesh(new T.TorusGeometry(1, 0.22, 6, 48).rotateX(Math.PI / 2), L.flame(RED, { tip: HOT, scale: 6, speed: 6 }));
    ring.position.set(e.x, y + 0.2, e.z);
    F.add(cracks); F.add(ring);
    // demonic crystal spikes stab out of the floor in a broken ring
    const spikes = [];
    const geo = new T.ConeGeometry(0.22, 1.8, 5).translate(0, 0.9, 0);
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * 6.28 + Math.random() * 0.3, r = 2 + Math.random() * 3.5;
      const m = new T.Mesh(geo, L.lit(0x2a0404, 0xc01008));
      m.position.set(e.x + Math.cos(a) * r, y, e.z + Math.sin(a) * r);
      m.rotation.set((Math.random() - 0.5) * 0.5 + Math.cos(a) * 0.3, 0, (Math.random() - 0.5) * 0.5 - Math.sin(a) * 0.3);
      m.scale.set(1, 0.01, 1); m.userData = { h: 0.7 + Math.random() * 1.1, d: r * 0.025 };
      F.add(m); spikes.push(m);
    }
    F.spawn((dt, age) => {
      cracks.scale.setScalar(Math.min(1, age / 0.12)); cracks.material.opacity = Math.max(0, 1 - Math.max(0, age - 0.5) / 0.6);
      const rk = age / 0.45, rs = 0.3 + rk * 6.5; ring.scale.set(rs, 1, rs); ring.material.uniforms.uTime.value = F.t; ring.material.uniforms.uK.value = Math.max(0, 1 - rk);
      for (const m of spikes) { const t = age - m.userData.d; const up = t < 0 ? 0 : t < 0.08 ? t / 0.08 : t < 0.45 ? 1 : Math.max(0, 1 - (t - 0.45) / 0.3); m.scale.set(1, Math.max(0.01, up * m.userData.h), 1); }
      return age < 1.1;
    }, [cracks, ring].concat(spikes));
    F.flash(e.x, e.y + 1, e.z, RED, 9, 0.5);
    F.fx.burst(e.x, e.y + 0.3, e.z, 40, 7, 0x1a0606, 0.6, 0.9, 4, { ink: true, up: 4 });
    if (mine) { F.shake(0.45); F.kick(5); }
  };

  // ---------------- Onda de Choque ----------------
  AFX.cast.demon_2 = (F, e, mine) => { if (mine) F.kick(6); };
  AFX.spell.demon_2 = {
    build(F, q) {
      const root = new T.Group();
      const wall = new T.Mesh(new T.PlaneGeometry(5.2, 3.4).translate(0, 0.5, 0), L.flame(RED, { tip: HOT, scale: 3.2, speed: 5 }));
      const back = new T.Mesh(new T.PlaneGeometry(5.6, 4.2).translate(0, 0.9, 0), L.flame(DARK, { tip: RED, scale: 2.2, speed: 3 }));
      back.position.z = 0.4;
      root.add(back); root.add(wall);
      root.rotation.y = q.yaw || 0;
      return { root, wall, back, last: null };
    },
    update(F, v, dt) {
      for (const m of [v.wall, v.back]) m.material.uniforms.uTime.value = F.t;
      const p = v.root.position;
      // a burning furrow and flying embers in its wake
      for (let i = 0; i < 6; i++) {
        const sx = (Math.random() - 0.5) * 4.6, c = Math.cos(v.root.rotation.y), s = Math.sin(v.root.rotation.y);
        F.fx.glowP.emit(p.x + sx * c, p.y - 1 + Math.random() * 2.4, p.z - sx * s, (Math.random() - 0.5) * 3, 3 + Math.random() * 5, (Math.random() - 0.5) * 3, 1, 0.3 + Math.random() * 0.4, 0.1, 0.25, 0.5, 2, 1);
      }
      if (Math.random() < 0.5) F.fx.inkP.emit(p.x, p.y + 1.6, p.z, 0, 4, 0, 0.1, 0.03, 0.03, 0.9, 0.7, -1, 1);
      if (!v.last || v.last.distanceTo(p) > 1.2) { v.last = p.clone(); F.fx.splat(p.x + (Math.random() - 0.5), p.y - 1.2, p.z + (Math.random() - 0.5), 1.2); }
    },
    hit(F, e) { F.fx.burst(e.x, e.y, e.z, 12, 6, RED, 0.3, 0.4, 4); },
    end(F, e) { fireball(F, e.x, e.y, e.z, 1.6, 0.6); },
  };

  // ---------------- Detonação Total ----------------
  AFX.cast.demon_3 = () => {};
  AFX.vfx['demon_3:mark'] = (F, e) => {
    // a thin red line flicks from the hand to every rune
    const h = F.hand(-1, 0.9);
    for (const id of e.ids) { const en = F.enemy(id); if (!en) continue; F.bolt(h, new T.Vector3(en.pos.x, en.pos.y + en.def.height * 0.6, en.pos.z), 0.1, 0.18, RED, false, 0.4); }
  };
  AFX.status['demon_3:mark'] = {
    build(F, ctx) {
      const g = new T.Group(); g.position.y = ctx.e.def.height * 0.55;
      const a = L.sprite(runeTex(), ctx.e.def.height * 0.9 + 0.8, RED);
      const b = L.sprite(runeTex(), ctx.e.def.height * 0.5 + 0.5, HOT);
      g.add(a); g.add(b);
      ctx.view.root.add(g);
      return { root: g, a, b, max: ctx.s.max };
    },
    update(F, v, s) {
      const k = 1 - s.t / (v.max || 1);
      v.a.material.rotation = F.t * 3; v.b.material.rotation = -F.t * 5;
      v.a.material.opacity = 0.7 + 0.3 * Math.sin(F.t * (10 + k * 30));
      v.b.scale.setScalar((0.5 + k * 1.2) * (1 + 0.1 * Math.sin(F.t * 40)));
    },
  };
  AFX.vfx['demon_3:boom'] = (F, e) => {
    fireball(F, e.x, e.y, e.z, 2.2, 0.55);
    F.flash(e.x, e.y, e.z, RED, 8, 0.3);
    F.fx.gibs(e.x, e.y, e.z, 10, 0x2a0a06, null, 12);
    F.shake(0.12);
  };

  // ---------------- Apocalipse ----------------
  AFX.ult.demon_ult = { start(F, e, mine) { F.white(0.4); if (mine) F.shake(0.4); }, end() {} };
  AFX.effect.demon_ult = {
    build(F, fx) {
      const root = new T.Group(); root.position.set(fx.x, fx.y, fx.z);
      const circle = L.disc(bigCircleTex(), fx.r, RED, 0.95); circle.position.y = 0.08;
      root.add(circle);
      // pillars of fire around the rim
      const pillars = [];
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * 6.28;
        const m = new T.Mesh(new T.CylinderGeometry(1.2, 1.8, 16, 12, 1, true).translate(0, 8, 0), L.flame(RED, { tip: HOT, scale: 2.5, speed: 3 }));
        m.position.set(Math.cos(a) * fx.r * 0.92, 0, Math.sin(a) * fx.r * 0.92);
        root.add(m); pillars.push(m);
      }
      // sigils burning in the sky
      const sky = [];
      for (let i = 0; i < 4; i++) {
        const m = new T.Mesh(new T.PlaneGeometry(26, 26), new T.MeshBasicMaterial({ map: runeTex(), color: RED, transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide }));
        const a = (i / 4) * 6.28 + 0.4;
        m.position.set(Math.cos(a) * 24, 48, Math.sin(a) * 24); m.rotation.x = Math.PI / 2;
        root.add(m); sky.push(m);
      }
      // the sphere growing over the centre
      const sphere = new T.Group(); sphere.position.y = 9;
      const core = new T.Mesh(new T.SphereGeometry(1, 28, 20), L.add(HOT, 1));
      const flame = new T.Mesh(new T.SphereGeometry(1.15, 28, 20), L.flame(RED, { tip: HOT, scale: 3, speed: 2 }));
      const rim = new T.Mesh(new T.SphereGeometry(1.3, 28, 20), L.fresnel(RED, 1.6, 2));
      sphere.add(core); sphere.add(flame); sphere.add(rim);
      root.add(sphere);
      F.add(root);
      return { root, circle, pillars, sky, sphere, core, flame, rim };
    },
    update(F, v, fx, dt) {
      const k = Math.min(1, fx.t / 0.8), prog = Math.min(1, fx.t / fx.total);
      v.circle.rotation.y = F.t * 0.08; v.circle.scale.setScalar(k); v.circle.material.opacity = 0.6 + 0.35 * Math.sin(F.t * 3);
      v.pillars.forEach((m, i) => { m.material.uniforms.uTime.value = F.t + i; m.material.uniforms.uK.value = k * (0.7 + 0.3 * Math.sin(F.t * 4 + i)); m.scale.set(1, k * (0.8 + 0.25 * Math.sin(F.t * 2 + i)), 1); });
      v.sky.forEach((m, i) => { m.rotation.z = F.t * (i % 2 ? 0.2 : -0.2); m.material.opacity = k * 0.8; });
      const s = 0.4 + prog * 5.5 + Math.sin(F.t * 20) * 0.1 * prog;
      v.sphere.scale.setScalar(s);
      v.flame.material.uniforms.uTime.value = F.t;
      F.atmo({ grade: 0xff2010, gradeAmt: 0.38 * k, dark: 0.3 * k });
      if (Math.random() < 0.4) F.fx.glowP.emit(fx.x + (Math.random() - 0.5) * 6, fx.y + 9 + (Math.random() - 0.5) * 6, fx.z + (Math.random() - 0.5) * 6, 0, -2, 0, 1, 0.3, 0.1, 0.4, 0.6, -4, 0);
    },
    end(F, v) { F.remove(v.root); return 0; },
  };
  AFX.spell.demon_ult = {
    build(F) {
      const root = new T.Group();
      const rock = new T.Mesh(new T.IcosahedronGeometry(0.75, 0), L.lit(0x200404, 0xd01810));
      const shell = new T.Mesh(new T.IcosahedronGeometry(1.15, 1), L.flame(RED, { tip: HOT, scale: 2, speed: 6 }));
      root.add(rock); root.add(shell);
      return { root, rock, shell, trail: new L.Trail(F.scene, 20, 0.9, RED, { core: HOT, life: 0.3 }) };
    },
    update(F, v, dt) {
      v.rock.rotation.x += dt * 5; v.rock.rotation.y += dt * 3;
      v.shell.material.uniforms.uTime.value = F.t;
      v.trail.push(v.root.position, new T.Vector3(1, 0, 0), dt);
      const p = v.root.position;
      F.fx.inkP.emit(p.x, p.y + 0.5, p.z, 0, 2, 0, 0.1, 0.02, 0.02, 0.8, 0.6, -1, 1);
    },
    boom(F, e) { fireball(F, e.x, e.y + 0.5, e.z, 2.6, 0.6); F.flash(e.x, e.y + 1, e.z, RED, 6, 0.3); F.fx.ring(e.x, e.y + 0.05, e.z, 0.3, 4, RED, 0.35, 0.9); },
  };
  AFX.vfx['demon_ult:nova'] = (F, e) => {
    F.white(0.8); F.shake(0.9);
    F.flash(e.x, e.y + 8, e.z, RED, 22, 1);
    fireball(F, e.x, e.y + 6, e.z, 12, 1.1);
    const dome = new T.Mesh(new T.SphereGeometry(1, 32, 20), L.fresnel(RED, 1.2, 2.5));
    dome.position.set(e.x, e.y, e.z);
    F.add(dome);
    F.spawn((dt, age) => { dome.scale.setScalar(2 + age * 50); dome.material.uniforms.uK.value = Math.max(0, 2.5 - age * 4); return age < 0.7; }, [dome]);
    F.fx.ring(e.x, e.y + 0.1, e.z, 1, 30, RED, 0.9, 0.95);
  };
  // the burning a demonic blast leaves on its victims
  AFX.status['demon:burn'] = {
    build(F, ctx) { return { e: ctx.e }; },
    update(F, v, s, e) { if (Math.random() < 0.5) F.fx.glowP.emit(e.pos.x + (Math.random() - 0.5) * e.def.radius * 2, e.pos.y + Math.random() * e.def.height, e.pos.z + (Math.random() - 0.5) * e.def.radius * 2, 0, 2.5, 0, 1, 0.15, 0.08, 0.25, 0.45, -1, 0); },
  };
})(window.SO = window.SO || {});
