// 20. DOMÍNIO ELEMENTAL — fire, ice, lightning and arcane, each in its own color and symbol.
//   Fusão Elemental: two elemental spheres circle each other in the hand and fuse; the shot is steam
//     (white swirl), plasma (magenta-orange with arcs) or freezing discharge (cyan crystal + arcs).
//   Orbes Elementais: four symbols turn into four orbs on separate orbits, each striking in its element.
//   Combo Elemental: three symbols light up on the target in turn, joined by lines, then explode in color.
//   Cataclismo Elemental: the four symbols orbit you and draw a mandala; the sky cycles red, blue,
//     yellow and violet; meteors, ice pillars, bolts and arcane waves; all fuse into a white core.
(function (SO) {
  'use strict';
  const T = THREE, L = SO.AFXLib, AFX = SO.AFX;
  const EC = SO.Schools.ELEMENT_COLORS;
  const COL = { fire: EC.fire, ice: EC.ice, thunder: EC.thunder, arcane: EC.arcane };
  const ORDER = ['fire', 'ice', 'thunder', 'arcane'];
  const KANJI = { fire: '火', ice: '氷', thunder: '雷', arcane: '魔' };

  const symTex = (el) => L.tex('elem-' + el, 128, (c, s) => {
    const col = '#' + COL[el].toString(16).padStart(6, '0');
    L.draw.ring(c, s, s * 0.44, 5, col); L.draw.ring(c, s, s * 0.34, 2, col);
    c.fillStyle = col; c.font = '60px "DotGothic16",serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(KANJI[el], s / 2, s / 2 + 3);
  });
  const mandalaTex = () => L.tex('elem-mandala', 1024, (c, s) => {
    ORDER.forEach((el, i) => {
      const col = '#' + COL[el].toString(16).padStart(6, '0');
      c.strokeStyle = col; c.lineWidth = 12; c.beginPath(); c.arc(s / 2, s / 2, s * 0.47, i * Math.PI / 2, (i + 1) * Math.PI / 2); c.stroke();
      c.lineWidth = 4; c.beginPath(); c.arc(s / 2, s / 2, s * 0.36, i * Math.PI / 2 + 0.2, (i + 1) * Math.PI / 2 - 0.2); c.stroke();
      c.fillStyle = col; c.font = '110px "DotGothic16",serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const a = i * Math.PI / 2 + Math.PI / 4; c.fillText(KANJI[el], s / 2 + Math.cos(a) * s * 0.41, s / 2 + Math.sin(a) * s * 0.41);
    });
    L.draw.star(c, s, s * 0.3, 8, 3, 3, '#ffffff'); L.draw.ring(c, s, s * 0.12, 6, '#ffffff');
  });
  function orb(el, r) {
    const g = new T.Group();
    const core = new T.Mesh(new T.SphereGeometry(r * 0.5, 14, 10), L.solid(0xffffff));
    const shell = el === 'fire' ? new T.Mesh(new T.SphereGeometry(r, 14, 10), L.flame(COL.fire, { tip: 0xffd080, scale: 2, speed: 5 })) : new T.Mesh(new T.SphereGeometry(r, 14, 10), L.fresnel(COL[el], 1.4, 2));
    g.add(shell); g.add(core);
    g.userData.shell = shell;
    return g;
  }
  function burst(F, x, y, z, el, n) {
    const c = new T.Color(COL[el]);
    for (let i = 0; i < n; i++) F.fx.glowP.emit(x, y, z, (Math.random() - 0.5) * 10, Math.random() * 7, (Math.random() - 0.5) * 10, c.r, c.g, c.b, 0.18, 0.4, 6, 1.5);
  }
  function elementStrike(F, el, from, to) {
    if (el === 'thunder') F.bolt(from, to, 0.25, 0.25, COL.thunder, true, 1);
    else if (el === 'ice') { const n = 6; for (let i = 0; i < n; i++) { const p = from.clone().lerp(to, i / n); F.fx.glowP.emit(p.x, p.y, p.z, 0, 0, 0, 0.7, 0.95, 1, 0.12, 0.3, 0, 0); } }
    else if (el === 'fire') { for (let i = 0; i < 10; i++) { const p = from.clone().lerp(to, i / 10); F.fx.glowP.emit(p.x, p.y, p.z, (Math.random() - 0.5), Math.random(), (Math.random() - 0.5), 1, 0.45, 0.1, 0.2, 0.3, -1, 0); } }
    else F.fx.ring(to.x, to.y, to.z, 0.1, 1.4, COL.arcane, 0.25, 0.95);
    burst(F, to.x, to.y, to.z, el, 10);
  }

  // ---------------- Fusão Elemental ----------------
  const PAIRS = { steam: ['fire', 'ice'], plasma: ['fire', 'thunder'], frost: ['ice', 'thunder'] };
  AFX.cast.elemental_1 = () => {};
  AFX.vfx['elemental_1:fuse'] = (F, e, mine) => {
    if (!mine) return;
    const pair = PAIRS[e.variant];
    const a = orb(pair[0], 0.05), b = orb(pair[1], 0.05);
    F.vm.scene.add(a); F.vm.scene.add(b);
    F.spawn((dt, age) => { const k = age / 0.25, r = 0.08 * (1 - k); const ang = age * 30; a.position.set(-0.22 + Math.cos(ang) * r, -0.2 + Math.sin(ang) * r, -0.7); b.position.set(-0.22 - Math.cos(ang) * r, -0.2 - Math.sin(ang) * r, -0.7); if (k >= 1) { F.vm.scene.remove(a); F.vm.scene.remove(b); } return k < 1; });
  };
  AFX.spell.elemental_1 = {
    build(F, q) {
      const root = new T.Group(), variant = q.variant;
      const pair = PAIRS[variant];
      const a = orb(pair[0], 0.4), b = orb(pair[1], 0.4);
      root.add(a); root.add(b);
      return { root, a, b, variant, trail: new L.Trail(F.scene, 16, 0.2, COL[pair[0]], { core: COL[pair[1]], life: 0.2 }) };
    },
    update(F, v, dt) {
      const ang = F.t * 18;
      v.a.position.set(Math.cos(ang) * 0.25, Math.sin(ang) * 0.25, 0); v.b.position.set(-Math.cos(ang) * 0.25, -Math.sin(ang) * 0.25, 0);
      for (const o of [v.a, v.b]) if (o.userData.shell.material.uniforms.uTime) o.userData.shell.material.uniforms.uTime.value = F.t;
      v.trail.push(v.root.position, new T.Vector3(0, 1, 0), dt);
      const p = v.root.position;
      if (v.variant !== 'steam' && Math.random() < 0.3) F.bolt(p.clone(), p.clone().add(new T.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)), 0.06, 0.08, v.variant === 'plasma' ? 0xff60ff : COL.ice, false, 0.3);
      if (v.variant === 'steam') F.fx.glowP.emit(p.x, p.y, p.z, (Math.random() - 0.5), 1, (Math.random() - 0.5), 0.95, 0.9, 0.9, 0.3, 0.4, -1, 1);
    },
    hit(F, e) { burst(F, e.x, e.y, e.z, 'arcane', 12); },
    boom(F, e) {
      // steam: a scalding white cloud blooming out
      for (let i = 0; i < 60; i++) { const a = Math.random() * 6.28, sp = 3 + Math.random() * 5; F.fx.glowP.emit(e.x, e.y, e.z, Math.cos(a) * sp, Math.random() * 3, Math.sin(a) * sp, 0.95, 0.92, 0.9, 0.6 + Math.random() * 0.4, 1.1, -1.5, 2); }
      F.flash(e.x, e.y, e.z, 0xffe0d0, 6, 0.3);
    },
    end(F, e) { burst(F, e.x, e.y, e.z, e.variant === 'frost' ? 'ice' : 'fire', 8); },
  };
  AFX.vfx['elemental_1:frostArc'] = (F, e) => { const pts = e.pts.map((p) => new T.Vector3(p[0], p[1], p[2])); for (let i = 1; i < pts.length; i++) F.bolt(pts[i - 1], pts[i], 0.25, 0.3, COL.ice, true, 1.2); };
  AFX.vfx['reaction:steam'] = (F, e) => { for (let i = 0; i < 40; i++) F.fx.glowP.emit(e.x, e.y, e.z, (Math.random() - 0.5) * 6, Math.random() * 4, (Math.random() - 0.5) * 6, 0.95, 0.92, 0.9, 0.5, 0.9, -1, 2); F.flash(e.x, e.y, e.z, 0xffffff, 4, 0.2); };

  // ---------------- Orbes Elementais ----------------
  AFX.cast.elemental_2 = (F, e, mine) => { if (!mine) return; const p = F.player.pos; ORDER.forEach((el, i) => { const s = L.sprite(symTex(el), 1, COL[el]); const a = i * 1.57; s.position.set(p.x + Math.cos(a) * 1.8, p.y + 1.3, p.z + Math.sin(a) * 1.8); F.add(s); F.spawn((dt, age) => { s.material.opacity = 1 - age / 0.5; s.scale.setScalar(1 - age); return age < 0.5; }, [s]); }); };
  AFX.effect.elemental_2 = {
    build(F) {
      const root = new T.Group();
      const orbs = ORDER.map((el) => { const o = orb(el, 0.28); root.add(o); return o; });
      const trails = ORDER.map((el) => new L.Trail(F.scene, 14, 0.1, COL[el], { core: 0xffffff, life: 0.25 }));
      F.add(root);
      return { root, orbs, trails };
    },
    update(F, v, fx, dt) {
      const k = Math.min(1, fx.t / 0.5) * Math.min(1, (fx.dur - fx.t) / 0.4);
      v.root.position.set(fx.x, fx.y, fx.z);
      v.orbs.forEach((o, i) => {
        const a = F.t * (1.6 + i * 0.3) + i * 1.57;
        o.position.set(Math.cos(a) * 2, 0.7 + i * 0.4 + Math.sin(F.t * 2 + i) * 0.15, Math.sin(a) * 2);
        o.scale.setScalar(k);
        if (o.userData.shell.material.uniforms.uTime) o.userData.shell.material.uniforms.uTime.value = F.t;
        v.trails[i].push(o.getWorldPosition(new T.Vector3()), new T.Vector3(0, 1, 0), dt);
      });
    },
    end(F, v) { F.remove(v.root); return 0; },
  };
  AFX.vfx['elemental_2:shot'] = (F, e) => {
    const v = Object.values(F.effects).find((x) => x.def === AFX.effect.elemental_2);
    const from = v ? v.orbs[e.orb].getWorldPosition(new T.Vector3()) : new T.Vector3(e.x, e.y + 2, e.z);
    elementStrike(F, e.el, from, new T.Vector3(e.x, e.y, e.z));
  };

  // ---------------- Combo Elemental ----------------
  AFX.cast.elemental_3 = () => {};
  AFX.effect.elemental_3 = {
    build(F, fx) {
      // the three symbols wait on the target in a turning triangle, joined to your hand by light
      const root = new T.Group();
      const syms = ['fire', 'ice', 'thunder'].map((el) => { const sp = L.sprite(symTex(el), 0.9, COL[el]); root.add(sp); return sp; });
      const line = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 1, 5, 1, true).rotateX(Math.PI / 2).translate(0, 0, 0.5), L.add(0xffffff, 0.8));
      F.add(root); F.add(line);
      return { root, syms, line, own: [line] };
    },
    update(F, v, fx) {
      v.root.position.set(fx.x, fx.y, fx.z);
      v.syms.forEach((sp, i) => { const a = F.t * 4 + i * 2.09; sp.position.set(Math.cos(a) * 1.3, Math.sin(a) * 1.3, 0); sp.quaternion.copy(F.cam.quaternion); sp.material.opacity = i < fx.stage ? 0.25 : 1; });
      const from = F.hand(-1, 0.8), to = v.root.position;
      v.line.position.copy(from); v.line.lookAt(to); v.line.scale.set(1, 1, from.distanceTo(to));
      v.line.material.color.setHex(COL[['fire', 'ice', 'thunder'][Math.min(2, fx.stage)]]);
    },
    end(F, v) { F.remove(v.root); F.remove(v.line); return 0; },
  };
  AFX.vfx['elemental_3:stage'] = (F, e) => {
    const el = ['fire', 'ice', 'thunder'][e.stage];
    const s = L.sprite(symTex(el), 1.6, COL[el]);
    s.position.set(e.x, e.y + 0.6 + e.stage * 0.9, e.z);
    F.add(s);
    F.spawn((dt, age) => { s.material.rotation = age * 3; s.material.opacity = Math.max(0, 1 - Math.max(0, age - 0.5) / 0.3); return age < 0.8; }, [s]);
    burst(F, e.x, e.y, e.z, el, 16);
    if (e.stage === 2) {
      // the combined explosion: three colored rings and a multicolor burst
      ORDER.forEach((x, i) => F.fx.ring(e.x, e.y - 0.8 + i * 0.3, e.z, 0.3, 5 - i * 0.6, COL[x], 0.4, 0.95));
      for (const x of ORDER) burst(F, e.x, e.y, e.z, x, 20);
      F.flash(e.x, e.y, e.z, 0xffffff, 9, 0.35); F.shake(0.2);
    }
  };

  // ---------------- Cataclismo Elemental ----------------
  AFX.ult.elemental_ult = { start(F, e, mine) { if (mine) { F.white(0.4); F.kick(6); } }, end() {} };
  AFX.effect.elemental_ult = {
    build(F, fx) {
      const root = new T.Group();
      const mandala = new T.Mesh(new T.PlaneGeometry(26, 26), new T.MeshBasicMaterial({ map: mandalaTex(), transparent: true, blending: T.AdditiveBlending, depthWrite: false, fog: false, side: T.DoubleSide }));
      mandala.rotation.x = -Math.PI / 2; mandala.position.y = 0.09;
      root.add(mandala);
      const syms = ORDER.map((el) => { const s = L.sprite(symTex(el), 2.2, COL[el]); root.add(s); return s; });
      F.add(root);
      return { root, mandala, syms };
    },
    update(F, v, fx) {
      const k = Math.min(1, fx.t / 0.8) * Math.min(1, (fx.dur - fx.t) / 1.2);
      const p = F.player ? F.player.pos : fx;
      v.root.position.set(p.x, p.y, p.z);
      v.mandala.rotation.z = F.t * 0.3; v.mandala.material.opacity = k;
      v.syms.forEach((s, i) => { const a = F.t * 0.9 + i * 1.57; s.position.set(Math.cos(a) * 5, 2.4 + Math.sin(F.t * 2 + i) * 0.4, Math.sin(a) * 5); s.material.opacity = k; });
      // the sky turns with the active element
      F.atmo({ grade: COL[ORDER[fx.turn % 4]], gradeAmt: 0.3 * k, dark: 0.15 * k });
    },
    end(F, v) { F.remove(v.root); return 0; },
  };
  AFX.spell['elemental_ult:fire'] = {
    build(F) { const root = new T.Group(); const o = orb('fire', 0.9); root.add(o); return { root, o, trail: new L.Trail(F.scene, 20, 0.7, COL.fire, { core: 0xffd080, life: 0.3 }) }; },
    update(F, v, dt) { v.o.userData.shell.material.uniforms.uTime.value = F.t; v.trail.push(v.root.position, new T.Vector3(1, 0, 0), dt); },
    boom(F, e) { burst(F, e.x, e.y, e.z, 'fire', 50); F.fx.ring(e.x, e.y + 0.05, e.z, 0.3, 4, COL.fire, 0.3, 0.9); F.flash(e.x, e.y + 1, e.z, COL.fire, 6, 0.3); },
  };
  AFX.vfx['elemental_ult:icePillar'] = (F, e) => {
    const g = new T.Group();
    for (let i = 0; i < 5; i++) { const m = new T.Mesh(L.shardGeo(3 + Math.random() * 3, 0.4 + Math.random() * 0.3).translate(0, 1.5, 0), new T.MeshLambertMaterial({ color: 0xa8e4ff, emissive: 0x2a6a9a, transparent: true, opacity: 0.85 })); m.rotation.set((Math.random() - 0.5) * 0.6, Math.random() * 6, (Math.random() - 0.5) * 0.6); g.add(m); }
    g.position.set(e.x, e.y, e.z); g.scale.y = 0.01; F.add(g);
    F.spawn((dt, age) => { g.scale.y = age < 0.15 ? Math.max(0.01, age / 0.15) : Math.max(0.01, 1 - Math.max(0, age - 1.2) / 0.4); return age < 1.6; }, [g]);
    burst(F, e.x, e.y + 1, e.z, 'ice', 24);
  };
  AFX.vfx['elemental_ult:bolt'] = (F, e) => { const pts = e.pts.map((p) => new T.Vector3(p[0], p[1], p[2])); for (let i = 1; i < pts.length; i++) F.bolt(pts[i - 1], pts[i], i === 1 ? 1 : 0.4, 0.35, COL.thunder, true, 1.6); F.flash(pts[1].x, pts[1].y, pts[1].z, COL.thunder, 8, 0.3); };
  AFX.vfx['elemental_ult:arcane'] = (F, e) => { F.fx.ring(e.x, e.y + 0.1, e.z, 0.5, 8, COL.arcane, 0.45, 0.95); F.fx.ring(e.x, e.y + 0.6, e.z, 0.5, 6, 0xffffff, 0.35, 0.6); burst(F, e.x, e.y + 0.5, e.z, 'arcane', 30); };
  AFX.effect['elemental_ult:sphere'] = {
    build(F, fx) {
      const root = new T.Group(); root.position.set(fx.x, fx.y, fx.z);
      const core = new T.Mesh(new T.SphereGeometry(1, 28, 18), L.solid(0xffffff));
      const orbs = ORDER.map((el) => { const o = orb(el, 0.9); root.add(o); return o; });
      root.add(core);
      F.add(root);
      return { root, core, orbs };
    },
    update(F, v, fx) {
      const k = Math.min(1, fx.t / fx.dur);
      v.orbs.forEach((o, i) => { const a = F.t * 6 + i * 1.57, r = 9 * (1 - k) + 0.5; o.position.set(Math.cos(a) * r, Math.sin(a * 0.7) * r * 0.3, Math.sin(a) * r); if (o.userData.shell.material.uniforms.uTime) o.userData.shell.material.uniforms.uTime.value = F.t; });
      v.core.scale.setScalar(0.3 + k * 2.5);
      F.flash(fx.x, fx.y, fx.z, 0xffffff, 4 * k, 0.1);
    },
    end(F, v) { F.remove(v.root); return 0; },
  };
  AFX.vfx['elemental_ult:nova'] = (F, e, mine) => {
    ORDER.forEach((el, i) => F.fx.ring(e.x, Math.max(0.1, e.y - 3.5 + i * 0.5), e.z, 0.5, 14 - i, COL[el], 0.7, 0.95));
    for (const el of ORDER) burst(F, e.x, e.y, e.z, el, 70);
    const shell = new T.Mesh(new T.SphereGeometry(1, 28, 18), L.fresnel(0xffffff, 1.2, 2.5)); shell.position.set(e.x, e.y, e.z); F.add(shell);
    F.spawn((dt, age) => { shell.scale.setScalar(1 + age * 35); shell.material.uniforms.uK.value = Math.max(0, 2.5 - age * 4.5); return age < 0.6; }, [shell]);
    F.flash(e.x, e.y, e.z, 0xffffff, 20, 0.8);
    if (mine) { F.white(0.8); F.shake(0.8); }
  };
  // elemental statuses: each keeps its element's look
  AFX.status['elemental:burn'] = AFX.status['elemental_1:burn'] = AFX.status['elemental_2:burn'] = AFX.status['elemental_3:burn'] = {
    build(F, ctx) { return { e: ctx.e }; },
    update(F, v, s, e) { if (Math.random() < 0.4) F.fx.glowP.emit(e.pos.x + (Math.random() - 0.5) * e.def.radius, e.pos.y + Math.random() * e.def.height, e.pos.z + (Math.random() - 0.5) * e.def.radius, 0, 2.5, 0, 1, 0.4, 0.1, 0.18, 0.4, -1, 0); },
  };
  const elFreeze = {
    build(F, ctx) { const h = ctx.e.def.height, r = ctx.e.def.radius; const m = new T.Mesh(new T.IcosahedronGeometry(1, 0), new T.MeshLambertMaterial({ color: 0xa8e4ff, emissive: 0x2a6a9a, transparent: true, opacity: 0.5, depthWrite: false })); m.scale.set(r * 1.5, h * 0.6, r * 1.5); m.position.y = h * 0.5; ctx.view.root.add(m); return { root: m }; },
  };
  AFX.status['elemental:freeze'] = AFX.status['elemental_1:freeze'] = AFX.status['elemental_3:freeze'] = elFreeze;
  AFX.status['elemental_2:slow'] = { build(F, ctx) { return { e: ctx.e }; }, update(F, v, s, e) { if (Math.random() < 0.25) F.fx.glowP.emit(e.pos.x, e.pos.y + e.def.height, e.pos.z, (Math.random() - 0.5), -0.5, (Math.random() - 0.5), 0.8, 0.95, 1, 0.07, 0.9, 1, 1); } };
  const elShock = { build(F, ctx) { return { e: ctx.e }; }, update(F, v, s, e) { if (Math.random() < 0.3) { const a = new T.Vector3(e.pos.x, e.pos.y + Math.random() * e.def.height, e.pos.z); F.bolt(a, a.clone().add(new T.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)), 0.07, 0.08, COL.thunder, false, 0.3); } } };
  AFX.status['elemental:shock'] = AFX.status['elemental_2:shock'] = elShock;
  const elWeak = { build(F, ctx) { const s = L.sprite(symTex('arcane'), 0.9, COL.arcane); s.position.y = ctx.e.def.height + 0.5; ctx.view.root.add(s); return { root: s }; }, update(F, v) { v.root.material.rotation = F.t * 2; } };
  AFX.status['elemental:weak'] = AFX.status['elemental_2:weak'] = elWeak;
})(window.SO = window.SO || {});
