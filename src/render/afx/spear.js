// 13. LANÇA DE ENERGIA — hard-light cyan spears: long shafts, diamond heads, ringed trails.
//   Arremesso: cyan motes gather into a spear in the hand; it spins in flight.
//   Investida: a cone of light on the spear tip and luminous streaks along the charge.
//   Multiplicação: the spear breaks into glowing segments that reform as five spears.
//   Lança Dimensional: cyan circles line up across the arena; a giant spear runs through them,
//     a line of light splits the arena, and a rift stays burning along it.
(function (SO) {
  'use strict';
  const T = THREE, L = SO.AFXLib, AFX = SO.AFX;
  const CY = 0x2ef2ff, WHITE = 0xe8ffff, DEEP = 0x0a6a8a;

  function spear(len, r) {
    const g = new T.Group();
    const shaft = new T.Mesh(new T.CylinderGeometry(r * 0.35, r * 0.35, len, 6).rotateX(Math.PI / 2), L.solid(WHITE));
    const glow = new T.Mesh(new T.CylinderGeometry(r, r, len * 1.04, 8).rotateX(Math.PI / 2), L.add(CY, 0.45));
    const head = new T.Mesh(new T.OctahedronGeometry(1, 0).scale(r * 1.6, r * 1.6, r * 6), L.solid(WHITE)); head.position.z = len / 2 + r * 4;
    const headGlow = new T.Mesh(new T.OctahedronGeometry(1, 0).scale(r * 3, r * 3, r * 9), L.add(CY, 0.6)); headGlow.position.copy(head.position);
    // energy rings along the shaft
    for (let i = 0; i < 3; i++) { const ring = new T.Mesh(new T.TorusGeometry(r * 1.6, r * 0.18, 6, 16), L.add(CY, 0.9)); ring.position.z = -len / 2 + len * (0.25 + i * 0.25); g.add(ring); }
    g.add(glow); g.add(shaft); g.add(headGlow); g.add(head);
    return g;
  }
  function motes(F, x, y, z, n) { for (let i = 0; i < n; i++) F.fx.glowP.emit(x, y, z, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, 0.4, 0.95, 1, 0.12, 0.35, 0, 2); }

  // ---------------- Arremesso ----------------
  AFX.cast.spear_1 = (F, e, mine) => {
    if (!mine) return;
    const h = F.hand(1, 0.85);
    for (let i = 0; i < 16; i++) { const a = Math.random() * 6.28, r = 0.6; F.fx.glowP.emit(h.x + Math.cos(a) * r, h.y + Math.sin(a) * r, h.z, -Math.cos(a) * 3, -Math.sin(a) * 3, 0, 0.4, 0.95, 1, 0.06, 0.2, 0, 0); }
  };
  AFX.spell.spear_1 = {
    build(F) { const root = new T.Group(), s = spear(2.2, 0.08); root.add(s); return { root, s, trail: new L.Trail(F.scene, 18, 0.12, CY, { core: WHITE, life: 0.18 }) }; },
    update(F, v, dt, vel) { const p = v.root.position; v.root.lookAt(p.x + vel.x, p.y + vel.y, p.z + vel.z); v.s.rotation.z += dt * 25; v.trail.push(p, new T.Vector3(0, 1, 0), dt); if (Math.random() < 0.5) motes(F, p.x, p.y, p.z, 1); },
    hit(F, e) { motes(F, e.x, e.y, e.z, 14); F.flash(e.x, e.y, e.z, CY, 3, 0.12); },
    end(F, e) { motes(F, e.x, e.y, e.z, 20); F.fx.ring(e.x, e.y, e.z, 0.1, 1.5, CY, 0.2, 0.9); },
  };

  // ---------------- Investida ----------------
  AFX.cast.spear_2 = () => {};
  AFX.vfx['spear_2:charge'] = (F, e, mine) => {
    const a = new T.Vector3(e.ax, e.ay, e.az), b = new T.Vector3(e.bx, e.by, e.bz);
    const len = Math.max(0.5, a.distanceTo(b));
    // luminous streaks along the path
    const g = new T.Group();
    for (let i = 0; i < 5; i++) { const m = new T.Mesh(new T.BoxGeometry(0.04, 0.04, len), L.add(i ? CY : WHITE, 0.9)); m.position.set((Math.random() - 0.5) * 1.4, (Math.random() - 0.5) * 1.2, 0); g.add(m); }
    g.position.copy(a).lerp(b, 0.5); g.lookAt(b);
    F.add(g);
    F.spawn((dt, age) => { g.children.forEach((m) => { m.material.opacity = 0.9 * (1 - age / 0.4); }); g.scale.set(1 - age, 1 - age, 1); return age < 0.4; }, [g]);
    if (mine) {
      // the light cone on the spear tip, in front of the camera for the charge
      const cone = new T.Mesh(new T.ConeGeometry(0.35, 1.6, 16, 1, true).rotateX(-Math.PI / 2), L.energy(CY, { color2: WHITE, freq: 4, speed: 10, sharp: 0.3, edge: 0.1 }));
      F.add(cone);
      F.spawn((dt, age) => { cone.position.copy(F.cam.position).add(F.look().multiplyScalar(1.6)).add(new T.Vector3(0, -0.3, 0)); cone.quaternion.copy(F.cam.quaternion); cone.material.uniforms.uTime.value = F.t; cone.material.uniforms.uK.value = 1 - age / 0.35; return age < 0.35; }, [cone]);
      F.kick(14);
      F.spawn((dt, age) => { F.atmo({ aberr: 0.6 * (1 - age / 0.3) }); return age < 0.3; });
    }
  };

  // ---------------- Multiplicação ----------------
  AFX.cast.spear_3 = () => {};
  AFX.spell.spear_3 = {
    build(F) { const root = new T.Group(), s = spear(2.4, 0.09); root.add(s); return { root, s }; },
    update(F, v, dt, vel) { const p = v.root.position; v.root.lookAt(p.x + vel.x, p.y + vel.y, p.z + vel.z); v.s.rotation.z += dt * 18; },
  };
  AFX.vfx['spear_3:split'] = (F, e) => {
    // the spear breaks into five glowing segments that fly apart
    for (let i = 0; i < 5; i++) {
      const m = new T.Mesh(new T.BoxGeometry(0.12, 0.12, 0.45), L.add(WHITE, 1));
      m.position.set(e.x, e.y, e.z);
      const d = new T.Vector3(Math.cos(i * 1.256), 0.4, Math.sin(i * 1.256));
      F.add(m);
      F.spawn((dt, age) => { m.position.addScaledVector(d, dt * 6); m.rotation.x += dt * 12; m.material.opacity = 1 - age / 0.25; return age < 0.25; }, [m]);
    }
    motes(F, e.x, e.y, e.z, 26); F.flash(e.x, e.y, e.z, CY, 5, 0.2);
  };
  AFX.spell['spear_3:shard'] = {
    build(F) { const root = new T.Group(), s = spear(1.2, 0.05); root.add(s); return { root, s, trail: new L.Trail(F.scene, 14, 0.07, CY, { core: WHITE, life: 0.2 }) }; },
    update(F, v, dt, vel) { const p = v.root.position; v.root.lookAt(p.x + vel.x, p.y + vel.y, p.z + vel.z); v.trail.push(p, new T.Vector3(0, 1, 0), dt); },
    hit(F, e) { motes(F, e.x, e.y, e.z, 10); },
    end(F, e) { motes(F, e.x, e.y, e.z, 6); },
  };

  // ---------------- Lança Dimensional ----------------
  AFX.ult.spear_ult = { start(F, e, mine) { if (mine) F.kick(6); }, end() {} };
  AFX.effect.spear_ult = {
    build(F, fx) {
      const root = new T.Group();
      const d = new T.Vector3(fx.dx, fx.dy, fx.dz), a = new T.Vector3(fx.x, fx.y, fx.z);
      // circles lined up across the arena
      const rings = [];
      for (let i = 0; i < 8; i++) {
        const m = new T.Mesh(new T.TorusGeometry(2.4 - i * 0.12, 0.12, 8, 48), L.add(i % 2 ? CY : WHITE, 0.95));
        m.position.copy(a).addScaledVector(d, 4 + i * 9);
        m.lookAt(m.position.clone().add(d));
        m.scale.setScalar(0.01);
        root.add(m); rings.push(m);
      }
      const big = spear(16, 0.6);
      big.position.copy(a).addScaledVector(d, -12); big.lookAt(big.position.clone().add(d));
      big.visible = false;
      root.add(big);
      // the dividing line of light, and the rift it leaves on the floor
      const lineGeo = new T.PlaneGeometry(0.6, fx.len).rotateX(-Math.PI / 2).translate(0, 0, fx.len / 2);
      const line = new T.Mesh(lineGeo, L.energy(CY, { color2: WHITE, freq: 12, speed: 8, sharp: 0.2, edge: 0.01 }));
      line.position.set(a.x, 0.08, a.z); line.lookAt(a.x + d.x, 0.08, a.z + d.z);
      line.visible = false;
      root.add(line);
      F.add(root);
      return { root, rings, big, line, d, a };
    },
    update(F, v, fx, dt) {
      v.rings.forEach((m, i) => { const k = Math.min(1, Math.max(0, (fx.t - i * 0.06) / 0.2)); m.scale.setScalar(Math.max(0.01, k * (fx.struck ? Math.max(0, 1 - (fx.t - 0.65) * 2) : 1))); m.rotation.z += dt * 3; });
      if (fx.t >= 0.6 && fx.t < 1.1) {
        // the giant spear accelerates through every circle
        v.big.visible = true;
        const k = (fx.t - 0.6) / 0.5;
        v.big.position.copy(v.a).addScaledVector(v.d, -12 + Math.pow(k, 1.6) * (fx.len + 30));
        v.big.rotation.z += dt * 10;
      } else v.big.visible = false;
      v.line.visible = !!fx.struck;
      if (fx.struck) {
        const fade = Math.min(1, (fx.dur - fx.t) / 1);
        v.line.material.uniforms.uTime.value = F.t; v.line.material.uniforms.uK.value = fade * (fx.t < 1.2 ? 2 : 1);
        v.line.scale.x = fx.t < 1.2 ? 6 : 1 + Math.sin(F.t * 20) * 0.2;
        if (Math.random() < 0.5) { const p = v.a.clone().addScaledVector(v.d, Math.random() * fx.len); F.fx.glowP.emit(p.x, 0.2, p.z, 0, 2 + Math.random() * 3, 0, 0.4, 0.95, 1, 0.14, 0.5, 0, 0); }
      }
      F.atmo({ grade: 0x40e0ff, gradeAmt: 0.18 * Math.min(1, fx.t / 0.6) * Math.min(1, (fx.dur - fx.t) / 1) });
    },
    end(F, v) { F.remove(v.root); return 0; },
  };
  AFX.vfx['spear_ult:strike'] = (F, e, mine) => {
    const d = new T.Vector3(e.dx, e.dy, e.dz);
    for (let s = 6; s < e.len; s += 6) { const p = new T.Vector3(e.x, e.y, e.z).addScaledVector(d, s); motes(F, p.x, p.y, p.z, 10); }
    F.flash(e.x + d.x * 20, e.y, e.z + d.z * 20, CY, 18, 0.6);
    if (mine) { F.white(0.5); F.shake(0.6); }
  };
})(window.SO = window.SO || {});
