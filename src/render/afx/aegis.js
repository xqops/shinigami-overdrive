// 6. ESCUDO DE ENERGIA — cyan hexagonal energy, built cell by cell, cracking under load.
//   Barreira Energética: hex plates snap together into a curved wall in front of you; cracks light up per hit.
//   Reflexo: a tight bright hexagon by the hand; returned shots leave a blue wave (white when perfect).
//   Campo Protetor: a ring runs along the floor and grows into a dome of hexagonal cells.
//   Fortaleza Absoluta: layered shells lock around you; every blow pulses out; at the end the layers
//     expand and shatter into thousands of blue fragments.
(function (SO) {
  'use strict';
  const T = THREE, L = SO.AFXLib, AFX = SO.AFX;
  const CY = 0x52e6ff, PALE = 0xd8fbff;

  function fragments(F, x, y, z, n, sp) {
    for (let i = 0; i < n; i++) F.fx.glowP.emit(x + (Math.random() - 0.5), y + (Math.random() - 0.5), z + (Math.random() - 0.5), (Math.random() - 0.5) * sp, (Math.random() - 0.3) * sp, (Math.random() - 0.5) * sp, 0.4, 0.9, 1, 0.14 + Math.random() * 0.14, 0.5 + Math.random() * 0.4, 6, 1);
  }
  const hexTex = () => L.tex('aegis-hex', 128, (c, s) => {
    c.strokeStyle = 'rgba(180,250,255,1)'; c.lineWidth = 6; c.beginPath();
    for (let i = 0; i <= 6; i++) { const a = i / 6 * 6.28 + Math.PI / 6; const x = s / 2 + Math.cos(a) * s * 0.42, y = s / 2 + Math.sin(a) * s * 0.42; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
    c.stroke(); c.lineWidth = 2; c.beginPath();
    for (let i = 0; i <= 6; i++) { const a = i / 6 * 6.28 + Math.PI / 6; const x = s / 2 + Math.cos(a) * s * 0.26, y = s / 2 + Math.sin(a) * s * 0.26; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
    c.stroke();
  });

  // ---------------- Barreira Energética ----------------
  AFX.cast.aegis_1 = () => {};
  AFX.buff.aegis_1 = {
    build(F) {
      // a curved wall of hex cells held in front of the camera
      const geo = new T.CylinderGeometry(2.6, 2.6, 2.6, 40, 1, true, -0.65, 1.3).rotateY(Math.PI);
      const m = new T.Mesh(geo, L.hex(CY, { scale: 6 }));
      m.renderOrder = 5;
      F.add(m);
      return { root: m, m, crack: 0 };
    },
    update(F, v, b, dt) {
      const c = F.cam;
      v.m.position.copy(c.position).add(new T.Vector3(0, -0.35, 0));
      v.m.quaternion.copy(c.quaternion);
      const u = v.m.material.uniforms;
      u.uTime.value = F.t; u.uBuild.value = Math.min(1, (b.max - b.t) / 0.25);
      u.uCrack.value = 1 - Math.max(0, b.pool) / 300;
      u.uHit.value = Math.max(0, u.uHit.value - dt * 4);
      u.uK.value = 0.55 * Math.min(1, b.t / 0.2);
      v.hit = u;
    },
    end(F, v) { const p = F.cam.position.clone().add(F.look().multiplyScalar(2)); fragments(F, p.x, p.y, p.z, 40, 8); },
  };
  AFX.vfx['aegis_1:crack'] = (F, e) => {
    const v = F.buffs.aegis_1; if (v && v.hit) v.hit.uHit.value = 1;
    F.fx.burst(e.x, e.y, e.z, 12, 5, CY, 0.2, 0.25, 0);
  };
  AFX.vfx['aegis_1:break'] = (F) => { const p = F.cam.position.clone().add(F.look().multiplyScalar(2)); fragments(F, p.x, p.y, p.z, 70, 10); F.shake(0.2); };

  // ---------------- Reflexo ----------------
  AFX.cast.aegis_2 = () => {};
  AFX.buff.aegis_2 = {
    build(F) { const s = L.sprite(hexTex(), 0.5, CY); F.add(s); return { root: s, s }; },
    update(F, v, b) {
      const perfect = b.max - b.t < 0.45;
      v.s.position.copy(F.hand(-1, 0.75));
      v.s.material.rotation = F.t * (perfect ? 9 : 3);
      v.s.scale.setScalar(perfect ? 0.3 + Math.sin(F.t * 40) * 0.05 : 0.45);
      v.s.material.color.setHex(perfect ? PALE : CY);
    },
  };
  AFX.vfx['aegis_2:reflect'] = (F, e) => {
    const big = e.perfect;
    F.fx.ring(e.x, e.y, e.z, 0.1, big ? 3 : 1.8, big ? PALE : CY, 0.25, 0.95);
    fragments(F, e.x, e.y, e.z, big ? 30 : 12, big ? 10 : 6);
    F.flash(e.x, e.y, e.z, big ? PALE : CY, big ? 7 : 3, 0.2);
    if (big) F.spawn((dt, age) => { F.atmo({ aberr: 1 - age / 0.25 }); return age < 0.25; });
  };

  // ---------------- Campo Protetor ----------------
  AFX.cast.aegis_3 = () => {};
  AFX.effect.aegis_3 = {
    build(F, fx) {
      const root = new T.Group(); root.position.set(fx.x, fx.y, fx.z);
      const ring = new T.Mesh(new T.RingGeometry(0.92, 1, 64).rotateX(-Math.PI / 2), L.add(PALE, 1)); ring.position.y = 0.05;
      const dome = new T.Mesh(new T.SphereGeometry(fx.r, 48, 24, 0, Math.PI * 2, 0, Math.PI / 2), L.hex(CY, { scale: 14 }));
      root.add(ring); root.add(dome);
      F.add(root);
      return { root, ring, dome };
    },
    update(F, v, fx, dt) {
      const run = Math.min(1, fx.t / 0.25);
      v.ring.scale.setScalar(Math.max(0.01, run * v.fx.r)); v.ring.material.opacity = 1 - Math.max(0, (fx.t - 0.6) / 0.4);
      const u = v.dome.material.uniforms;
      u.uTime.value = F.t; u.uBuild.value = Math.min(1, Math.max(0, (fx.t - 0.15) / 0.45));
      u.uCrack.value = 1 - Math.max(0, fx.pool) / 300; u.uHit.value = Math.max(0, u.uHit.value - dt * 4);
      u.uK.value = 0.7 * Math.min(1, (fx.dur - fx.t) / 0.4);
    },
    end(F, v, fx) { F.remove(v.root); if (fx.pool > 0) fragments(F, fx.x, fx.y + 2, fx.z, 40, 6); return 0; },
  };
  AFX.vfx['aegis_3:hit'] = (F, e) => { const v = F.effects[e.fx]; if (v && v.dome) v.dome.material.uniforms.uHit.value = 1; F.fx.burst(e.x, e.y, e.z, 10, 4, CY, 0.2, 0.25, 0); };
  AFX.vfx['aegis_3:break'] = (F, e) => {
    for (let i = 0; i < 160; i++) { const a = Math.random() * 6.28, b = Math.random() * 1.5; const x = e.x + Math.cos(a) * Math.cos(b) * e.r, y = e.y + Math.sin(b) * e.r, z = e.z + Math.sin(a) * Math.cos(b) * e.r; F.fx.glowP.emit(x, y, z, (x - e.x) * 1.5, 2, (z - e.z) * 1.5, 0.4, 0.9, 1, 0.18, 0.7, 10, 1); }
    F.shake(0.25);
  };

  // ---------------- Fortaleza Absoluta ----------------
  AFX.ult.aegis_ult = { start(F, e, mine) { if (mine) { F.white(0.3); F.kick(6); } }, end() {} };
  AFX.buff.aegis_ult = {
    build(F) {
      // three nested hex shells locked around the body, turning on different axes
      const root = new T.Group();
      const shells = [1.6, 2.1, 2.7].map((r, i) => { const m = new T.Mesh(new T.IcosahedronGeometry(r, 2), L.hex(i ? CY : PALE, { scale: 5 + i * 2 })); root.add(m); return m; });
      F.add(root);
      return { root, shells, born: 0 };
    },
    update(F, v, b, dt) {
      v.born = Math.min(1, v.born + dt / 0.8);
      v.root.position.copy(F.cam.position).add(new T.Vector3(0, -0.6, 0));
      v.shells.forEach((m, i) => {
        const u = m.material.uniforms;
        u.uTime.value = F.t + i; u.uBuild.value = Math.min(1, v.born * 1.4 - i * 0.2);
        u.uCrack.value = 1 - Math.max(0, b.pool) / 1000; u.uHit.value = Math.max(0, u.uHit.value - dt * 3);
        u.uK.value = 0.12 + i * 0.04;
        m.rotation.set(F.t * (0.2 + i * 0.1), F.t * (i % 2 ? -0.3 : 0.25), 0);
      });
      const pu = F.R.postMat.uniforms; pu.uShield.value = 0.7 * v.born; pu.uShieldColor.value.setHex(CY);
      v.pu = pu;
    },
    end(F, v) { if (v.pu) v.pu.uShield.value = 0; },
  };
  AFX.vfx['aegis_ult:burst'] = (F, e) => {
    const v = F.buffs.aegis_ult; if (v) for (const m of v.shells) m.material.uniforms.uHit.value = 1;
    F.fx.ring(e.x, e.y - 0.8, e.z, 0.3, 4.5, CY, 0.3, 0.95);
    fragments(F, e.x, e.y, e.z, 20, 7);
    F.R.postMat.uniforms.uShieldHit.value = 1;
  };
  AFX.vfx['aegis_ult:release'] = (F, e) => {
    F.white(0.6); F.shake(0.6);
    F.flash(e.x, e.y + 1, e.z, CY, 16, 0.8);
    const shell = new T.Mesh(new T.IcosahedronGeometry(1, 3), L.hex(PALE, { scale: 10 }));
    shell.position.set(e.x, e.y + 1, e.z);
    F.add(shell);
    F.spawn((dt, age) => { const k = age / 0.6; shell.scale.setScalar(2 + k * 14); shell.material.uniforms.uK.value = Math.max(0, 1 - k); shell.material.uniforms.uCrack.value = k; shell.material.uniforms.uTime.value = F.t; return k < 1; }, [shell]);
    for (let i = 0; i < 400; i++) { const a = Math.random() * 6.28, b = (Math.random() - 0.3) * 1.6, sp = 8 + Math.random() * 16; F.fx.glowP.emit(e.x, e.y + 1, e.z, Math.cos(a) * Math.cos(b) * sp, Math.sin(b) * sp, Math.sin(a) * Math.cos(b) * sp, 0.4, 0.9, 1, 0.15 + Math.random() * 0.2, 0.6 + Math.random() * 0.6, 4, 1); }
    F.fx.ring(e.x, e.y + 0.1, e.z, 0.5, 14, CY, 0.6, 0.95);
  };
})(window.SO = window.SO || {});
