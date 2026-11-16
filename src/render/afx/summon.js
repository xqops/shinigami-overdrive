// 4. INVOCAÇÃO DE DEMÔNIOS — crimson summoning circles, clawed hands, chains and the troop itself.
//   Lacaios do Inferno: hands claw out of red circles, then the imps climb out after them.
//   Demônio Guardião: a vertical portal is pried open by two huge hands; the armored guardian
//     walks through carrying a flaming sword.
//   Círculo Demoníaco: runes burn into the floor and spectral chains rise to bind whoever stands in it.
//   Portal Abissal: giant chains drag a portal out of the void; warriors, flyers and a commander
//     pour out; the commander ends it slamming the floor.
(function (SO) {
  'use strict';
  const T = THREE, L = SO.AFXLib, AFX = SO.AFX;
  const CRIM = 0xd4143a, EMBER = 0xff5a1a, DARK = 0x2a0408;

  const sumTex = () => L.tex('summon-circle', 512, (c, s) => {
    const col = 'rgba(240,40,70,1)';
    L.draw.ring(c, s, s * 0.47, 7, col); L.draw.ring(c, s, s * 0.41, 2, col); L.draw.ring(c, s, s * 0.2, 3, col);
    L.draw.star(c, s, s * 0.41, 7, 3, 3, col);
    L.draw.glyphs(c, s, s * 0.44, '召魔喚鬼召魔喚鬼召魔喚鬼', 26, col);
    L.draw.ticks(c, s, s * 0.2, s * 0.28, 24, 3, col);
  });
  const ritualTex = () => L.tex('summon-ritual', 512, (c, s) => {
    const col = 'rgba(255,50,60,1)';
    L.draw.ring(c, s, s * 0.48, 4, col); L.draw.ring(c, s, s * 0.44, 10, 'rgba(120,10,20,1)'); L.draw.ring(c, s, s * 0.3, 3, col);
    for (let i = 0; i < 6; i++) { const a = i / 6 * 6.28; c.strokeStyle = col; c.lineWidth = 3; c.beginPath(); c.arc(s / 2 + Math.cos(a) * s * 0.3, s / 2 + Math.sin(a) * s * 0.3, s * 0.09, 0, 6.28); c.stroke(); }
    L.draw.glyphs(c, s, s * 0.37, '縛鎖呪獄縛鎖呪獄縛鎖呪獄縛鎖', 22, col, 0.1);
    L.draw.star(c, s, s * 0.3, 6, 2, 2, col);
  });

  // a clawed demon hand: palm + four long curved fingers
  function hand(scale) {
    const g = new T.Group(), m = L.lit(0x1a0306, 0x7a0a14);
    const palm = new T.Mesh(new T.BoxGeometry(0.5, 0.6, 0.22), m); palm.position.y = 0.3; g.add(palm);
    for (let i = 0; i < 4; i++) {
      const f = new T.Mesh(new T.ConeGeometry(0.06, 0.75, 5).translate(0, 0.37, 0), m);
      f.position.set(-0.19 + i * 0.13, 0.6, 0); f.rotation.x = 0.4 + Math.random() * 0.3; f.rotation.z = (i - 1.5) * 0.12;
      g.add(f);
    }
    const thumb = new T.Mesh(new T.ConeGeometry(0.07, 0.5, 5).translate(0, 0.25, 0), m); thumb.position.set(0.28, 0.25, 0.05); thumb.rotation.z = -0.9; g.add(thumb);
    g.scale.setScalar(scale);
    return g;
  }
  function summonCircle(F, x, y, z, r, dur) {
    const d = L.disc(sumTex(), r, CRIM, 1); d.position.set(x, y + 0.06, z);
    F.add(d);
    F.spawn((dt, age) => { d.rotation.y = age * 1.6; d.scale.setScalar(Math.min(1, age / 0.15)); d.material.opacity = Math.max(0, 1 - Math.max(0, age - dur + 0.3) / 0.3); return age < dur; }, [d]);
  }
  // demonic glow on a reused enemy model
  function tint(ctl, color, emissive) { if (ctl) for (const m of ctl.mats) { m.color.setHex(color); m.emissive.setHex(emissive); } }
  function rise(v, dt, h, dur) { if (v.riseT == null) v.riseT = 0; v.riseT += dt; const k = Math.min(1, v.riseT / dur); if (v.inner) v.inner.position.y = -h * (1 - k); return k; }
  function anim(v, a) {
    if (!v.ctl) return;
    const sp = Math.hypot(a.vel.x, a.vel.z);
    if (v.atk > 0) v.ctl.play('Attack', { once: true, duration: 0.35 });
    else if (sp > 1) v.ctl.play('Walk', { speed: SO.clamp(sp / 5, 0.8, 2.2) });
    else v.ctl.play('Idle');
  }

  // ---------------- Lacaios do Inferno ----------------
  AFX.cast.summon_1 = () => {};
  AFX.ally.imp = {
    build(F, a) {
      const root = new T.Group(), inner = new T.Group(); root.add(inner);
      const ctl = F.model('demonio_impuro', 1.55, { color: 0xb02020, emissive: 0xc01828 });
      if (ctl) inner.add(ctl.root);
      // two glowing eyes
      for (const s of [-1, 1]) { const e = new T.Mesh(new T.SphereGeometry(0.05, 6, 4), L.solid(0xffd040)); e.position.set(s * 0.09, 1.38, 0.2); inner.add(e); }
      summonCircle(F, a.pos.x, a.pos.y, a.pos.z, 1.3, 1.2);
      // the hands come first
      const hands = [hand(0.8), hand(0.8)];
      hands.forEach((h, i) => { h.position.set(a.pos.x + (i ? 0.4 : -0.4), a.pos.y - 1.2, a.pos.z); h.rotation.z = i ? -0.3 : 0.3; F.add(h); });
      F.spawn((dt, age) => { hands.forEach((h) => { h.position.y = a.pos.y - 1.2 + Math.min(1, age / 0.25) * 1.1 - Math.max(0, age - 0.45) * 3; }); return age < 0.8; }, hands);
      return { root, inner, ctl, atk: 0 };
    },
    update(F, v, a, dt) {
      rise(v, dt, 1.6, 0.6);
      v.root.rotation.y = a.yaw;
      v.atk -= dt; anim(v, a);
      if (v.ctl) v.ctl.update(dt);
      if (Math.random() < 0.25) F.fx.glowP.emit(a.pos.x, a.pos.y + 0.2, a.pos.z, 0, 1.5, 0, 1, 0.25, 0.1, 0.15, 0.4, -1, 0);
    },
    attack(F, e, v) { if (v) v.atk = 0.35; F.fx.crescent(new T.Vector3(e.x, e.y, e.z), Math.random() * 6.28, -0.4, 60 + Math.random() * 60, 0.9, CRIM, 0.12, false, EMBER); F.fx.blood(e.x, e.y, e.z, null, 0.6); },
    end(F, e) { F.fx.burst(e.x, e.y, e.z, 26, 4, EMBER, 0.3, 0.6, -2); F.fx.burst(e.x, e.y, e.z, 16, 3, 0x1a0404, 0.6, 0.7, -1, { ink: true }); },
  };

  // ---------------- Demônio Guardião ----------------
  AFX.cast.summon_2 = () => {};
  AFX.ally.guardian = {
    build(F, a) {
      const root = new T.Group(), inner = new T.Group(); root.add(inner);
      const ctl = F.model('esqueleto_guerreiro', 3.1, { color: 0x8a3a24, emissive: 0xa03010 });
      if (ctl) inner.add(ctl.root);
      // flaming sword held at the right side
      const sword = new T.Group();
      const blade = new T.Mesh(L.bladeGeo(2.2, 0.32, 0.15, 0.06), L.lit(0x2a0a04, 0xff4a10));
      const fire = new T.Mesh(new T.PlaneGeometry(0.9, 2.6).translate(0, 1.3, 0), L.flame(EMBER, { tip: 0xffe090, scale: 2, speed: 5 }));
      const fire2 = fire.clone(); fire2.material = fire.material; fire2.rotation.y = Math.PI / 2;
      sword.add(blade); sword.add(fire); sword.add(fire2);
      sword.position.set(0.85, 1.4, 0.4); sword.rotation.x = 0.6;
      inner.add(sword);
      // the portal it steps out of, pried open by two great hands
      const portal = new T.Group();
      portal.position.set(a.pos.x, a.pos.y + 1.8, a.pos.z);
      portal.rotation.y = a.yaw;
      const ring = new T.Mesh(new T.TorusGeometry(1.7, 0.12, 8, 40), L.add(CRIM, 1));
      const inside = new T.Mesh(new T.CircleGeometry(1.65, 40), L.flame(DARK, { tip: CRIM, scale: 3, speed: 2 }));
      portal.add(inside); portal.add(ring);
      const hl = hand(1.6), hr = hand(1.6);
      hl.position.set(-1.6, -0.6, 0.2); hl.rotation.z = 0.5; hr.position.set(1.6, -0.6, 0.2); hr.rotation.z = -0.5;
      portal.add(hl); portal.add(hr);
      F.add(portal);
      F.spawn((dt, age) => {
        const open = Math.min(1, age / 0.5), close = Math.max(0, 1 - Math.max(0, age - 1.4) / 0.4);
        portal.scale.set(0.3 + open * 0.9 * close, (0.6 + open * 0.4) * close + 0.001, 1);
        hl.position.x = -1.2 - open * 0.7; hr.position.x = 1.2 + open * 0.7;
        inside.material.uniforms.uTime.value = F.t;
        return age < 1.8;
      }, [portal]);
      return { root, inner, ctl, sword, fire, atk: 0 };
    },
    update(F, v, a, dt) {
      const k = rise(v, dt, 0, 0.6);
      v.inner.scale.setScalar(0.2 + 0.8 * k);
      v.root.rotation.y = a.yaw;
      v.atk -= dt; anim(v, a);
      v.sword.rotation.x = v.atk > 0 ? 0.6 - Math.sin((0.35 - v.atk) / 0.35 * Math.PI) * 1.8 : 0.6;
      v.fire.material.uniforms.uTime.value = F.t;
      if (v.ctl) v.ctl.update(dt);
    },
    attack(F, e, v) { if (v) v.atk = 0.35; F.fx.crescent(new T.Vector3(e.x, e.y, e.z), Math.random() * 6.28, -0.6, 90, 1.7, EMBER, 0.16, false, 0xffe090); F.fx.burst(e.x, e.y, e.z, 20, 7, EMBER, 0.3, 0.5, 4); },
    block(F, e) { F.fx.ring(e.x, e.y, e.z, 0.1, 1.4, EMBER, 0.2, 0.9); F.flash(e.x, e.y, e.z, EMBER, 4, 0.2); },
    end(F, e) { F.fx.burst(e.x, e.y, e.z, 60, 6, EMBER, 0.4, 0.8, -2); summonCircle(F, e.x, e.y - 1.5, e.z, 2, 0.8); },
  };

  // ---------------- Círculo Demoníaco ----------------
  AFX.cast.summon_3 = () => {};
  AFX.effect.summon_3 = {
    build(F, fx) {
      const root = new T.Group(); root.position.set(fx.x, fx.y, fx.z);
      const disc = L.disc(ritualTex(), fx.r, CRIM, 1); disc.position.y = 0.07;
      const glow = new T.Mesh(new T.CylinderGeometry(fx.r, fx.r, 2.4, 48, 1, true).translate(0, 1.2, 0), L.energy(CRIM, { color2: EMBER, freq: 5, speed: 1.5, sharp: 0.6, edge: 0.4 }));
      root.add(disc); root.add(glow);
      F.add(root);
      return { root, disc, glow, chains: {} };
    },
    update(F, v, fx, dt) {
      const k = Math.min(1, fx.t / 0.4) * Math.min(1, (fx.dur - fx.t) / 0.5);
      v.disc.scale.setScalar(k); v.disc.rotation.y = -F.t * 0.4;
      v.glow.material.uniforms.uTime.value = F.t; v.glow.material.uniforms.uK.value = 0.6 * k;
      // the chains keep hold of their victims
      for (const id in v.chains) {
        const c = v.chains[id], en = F.enemy(id);
        c.t -= dt;
        if (!en || c.t <= 0) { F.remove(c.m); delete v.chains[id]; continue; }
        const top = new T.Vector3(en.pos.x, en.pos.y + en.def.height * 0.6, en.pos.z);
        const len = c.from.distanceTo(top);
        c.m.position.copy(c.from).lerp(top, 0.5); c.m.lookAt(top); c.m.scale.set(1, 1, len);
        c.m.material.uniforms.uTime.value = F.t;
      }
      if (Math.random() < 0.5 * k) { const a = Math.random() * 6.28, r = Math.random() * fx.r; F.fx.inkP.emit(fx.x + Math.cos(a) * r, fx.y + 0.1, fx.z + Math.sin(a) * r, 0, 1.2, 0, 0.08, 0.0, 0.02, 0.7, 0.9, -0.5, 1); }
    },
    end(F, v) { F.remove(v.root); for (const id in v.chains) F.remove(v.chains[id].m); return 0; },
  };
  AFX.vfx['summon_3:chain'] = (F, e) => {
    const v = Object.values(F.effects).find((x) => x.def === AFX.effect.summon_3 && x.fx && Math.abs(x.fx.x - e.x) < 0.01 && Math.abs(x.fx.z - e.z) < 0.01);
    if (!v) return;
    if (v.chains[e.id]) { v.chains[e.id].t = 0.6; return; }
    const en = F.enemy(e.id); if (!en) return;
    const a = Math.atan2(en.pos.z - e.z, en.pos.x - e.x);
    const from = new T.Vector3(e.x + Math.cos(a) * v.fx.r, e.y + 0.1, e.z + Math.sin(a) * v.fx.r);
    // a spectral chain: a stretched box with a link-pattern energy shader
    const m = new T.Mesh(new T.BoxGeometry(0.16, 0.16, 1), L.energy(CRIM, { color2: 0xffc0c0, freq: 12, speed: 4, sharp: 0.35, edge: 0.05 }));
    F.add(m);
    v.chains[e.id] = { m, from, t: 0.6 };
  };
  AFX.status['summon_3:weak'] = {
    build(F, ctx) {
      const s = L.disc(ritualTex(), ctx.e.def.radius + 0.5, CRIM, 0.6);
      s.position.y = 0.05; ctx.view.root.add(s);
      return { root: s };
    },
    update(F, v) { v.root.rotation.y = F.t * 2; },
  };

  // ---------------- Portal Abissal ----------------
  AFX.ult.summon_ult = { start(F, e, mine) { if (mine) { F.shake(0.5); F.white(0.3); } }, end() {} };
  AFX.effect.summon_ult = {
    build(F, fx) {
      const root = new T.Group();
      root.position.set(fx.x, fx.y + 5.5, fx.z); root.rotation.y = fx.yaw; // its face looks back at the summoner
      const ring = new T.Mesh(new T.TorusGeometry(5, 0.45, 10, 64), L.lit(0x1a0306, 0xa01020));
      const fireRing = new T.Mesh(new T.TorusGeometry(5, 0.9, 8, 64), L.flame(CRIM, { tip: EMBER, scale: 5, speed: 3 }));
      const vortex = new T.Mesh(new T.CircleGeometry(4.9, 64), new T.ShaderMaterial({
        uniforms: { uTime: { value: 0 }, uK: { value: 0 } }, side: T.DoubleSide, transparent: true, depthWrite: false,
        vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform float uTime, uK; varying vec2 vUv;
          void main(){ vec2 p = vUv - 0.5; float r = length(p) * 2.0, a = atan(p.y, p.x);
            float sw = sin(a * 5.0 + r * 16.0 - uTime * 4.0) * 0.5 + 0.5;
            vec3 col = mix(vec3(0.02, 0.0, 0.0), vec3(0.85, 0.06, 0.12), sw * r) + vec3(1.0, 0.4, 0.2) * pow(r, 6.0);
            if (r > uK) discard; gl_FragColor = vec4(col, 1.0); }`,
      }));
      root.add(vortex); root.add(ring); root.add(fireRing);
      // giant chains hanging from the sky, pulling the portal out of the void
      const chains = [];
      for (let i = 0; i < 4; i++) {
        const m = new T.Mesh(new T.BoxGeometry(0.5, 40, 0.5).translate(0, 20, 0), L.energy(0x8a1020, { color2: 0xff6040, freq: 18, speed: 2, sharp: 0.3, edge: 0.02, normal: true }));
        const a = (i / 4) * 6.28 + 0.78;
        m.position.set(Math.cos(a) * 4.6, Math.sin(a) * 4.6, 0); m.rotation.z = a - Math.PI / 2 + (i % 2 ? 0.3 : -0.3);
        root.add(m); chains.push(m);
      }
      F.add(root);
      return { root, ring, fireRing, vortex, chains };
    },
    update(F, v, fx) {
      const open = Math.min(1, fx.t / 1.0), close = Math.min(1, Math.max(0, (fx.dur - fx.t) / 0.8));
      v.vortex.material.uniforms.uTime.value = F.t; v.vortex.material.uniforms.uK.value = open * close;
      v.fireRing.material.uniforms.uTime.value = F.t; v.fireRing.material.uniforms.uK.value = close;
      v.root.scale.setScalar(0.4 + 0.6 * open);
      v.chains.forEach((m, i) => { m.material.uniforms.uTime.value = F.t + i; m.material.uniforms.uK.value = close; m.scale.y = 1 - open * 0.3; });
      F.atmo({ grade: 0xd01020, gradeAmt: 0.3 * open * close, dark: 0.25 * open * close });
    },
    end(F, v) { F.remove(v.root); return 0; },
  };
  AFX.vfx['summon_ult:emerge'] = (F, e) => { F.fx.burst(e.x, e.y + 4, e.z, 30, 6, CRIM, 0.4, 0.6, 2); F.flash(e.x, e.y + 4, e.z, CRIM, 5, 0.3); };
  AFX.vfx['summon_ult:finale'] = (F, e) => {
    F.white(0.5); F.shake(0.7);
    F.flash(e.x, e.y + 2, e.z, CRIM, 16, 0.8);
    F.fx.ring(e.x, e.y + 0.1, e.z, 0.5, 12, CRIM, 0.7, 0.95);
    F.fx.burst(e.x, e.y + 1, e.z, 160, 16, EMBER, 0.5, 0.9, 6, { up: 6 });
    F.fx.burst(e.x, e.y + 1, e.z, 80, 10, 0x1a0404, 0.8, 1.2, 4, { ink: true, up: 5 });
  };
  // the abyss brands whoever you strike: a burning crimson sigil the troop hunts first
  AFX.status['summon_ult:mark'] = {
    build(F, ctx) {
      const s = L.sprite(sumTex(), ctx.e.def.height * 0.7 + 0.5, CRIM);
      s.position.y = ctx.e.def.height + 0.6;
      ctx.view.root.add(s);
      return { root: s };
    },
    update(F, v) { v.root.material.rotation = -F.t * 2.5; v.root.material.opacity = 0.65 + 0.3 * Math.sin(F.t * 8); },
  };
  // the troop: armored warriors, gargoyle flyers and the horned commander
  function troop(model, h, color, emissive, extra) {
    return {
      build(F, a) {
        const root = new T.Group(), inner = new T.Group(); root.add(inner);
        const ctl = F.model(model, h, { color, emissive });
        if (ctl) inner.add(ctl.root);
        if (extra) extra(F, inner, h);
        F.fx.burst(a.pos.x, a.pos.y + h / 2, a.pos.z, 20, 4, CRIM, 0.35, 0.5, 0);
        return { root, inner, ctl, atk: 0 };
      },
      update(F, v, a, dt) {
        v.root.rotation.y = a.yaw; v.atk -= dt; anim(v, a);
        if (v.ctl) v.ctl.update(dt);
        if (v.flame) v.flame.material.uniforms.uTime.value = F.t;
      },
      attack(F, e, v) { if (v) v.atk = 0.35; F.fx.crescent(new T.Vector3(e.x, e.y, e.z), Math.random() * 6.28, -0.3, Math.random() * 180, 1.2, CRIM, 0.13, false, EMBER); F.fx.blood(e.x, e.y, e.z, null, 0.7); },
      end(F, e) { F.fx.burst(e.x, e.y, e.z, 40, 6, CRIM, 0.4, 0.6, -2); F.fx.burst(e.x, e.y, e.z, 20, 4, 0x1a0404, 0.6, 0.8, -1, { ink: true }); },
    };
  }
  AFX.ally.warrior = troop('demonio_impuro', 2.1, 0xa01820, 0xb01020, (F, inner) => {
    const horns = new T.Group();
    for (const s of [-1, 1]) { const h = new T.Mesh(new T.ConeGeometry(0.07, 0.45, 5), L.lit(0x1a0404, 0x400404)); h.position.set(s * 0.14, 2.0, 0.05); h.rotation.z = -s * 0.5; horns.add(h); }
    inner.add(horns);
  });
  AFX.ally.flyer = troop('gargula', 1.9, 0x9a1020, 0xc01830);
  AFX.ally.commander = troop('esqueleto_guerreiro', 4.4, 0x8a1010, 0xd01820, (F, inner, h) => {
    const crown = new T.Mesh(new T.TorusGeometry(0.4, 0.06, 6, 12).rotateX(Math.PI / 2), L.solid(0xff3020));
    crown.position.y = h * 0.98; inner.add(crown);
    for (let i = 0; i < 6; i++) { const s = new T.Mesh(new T.ConeGeometry(0.06, 0.4, 4), L.solid(0xff3020)); const a = i / 6 * 6.28; s.position.set(Math.cos(a) * 0.4, h * 0.98 + 0.2, Math.sin(a) * 0.4); inner.add(s); }
  });
})(window.SO = window.SO || {});
