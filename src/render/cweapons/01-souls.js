// 01 ESPADAS ALMAS — two soul katanas, the purple one in the right hand and the blue one in the
// left, their pommels joined by a gold chain with an ofuda charm. Spirit flames always wrap the
// blades. Inspect (after the author's sheet, 4 beats): the blue blade is raised and its flame
// flares; the purple blade turns in the light; both cross with the chain swinging between them;
// both rise in a V while the spirits of the dead climb out of the flames as skulls.
(function (SO) {
  'use strict';
  const T = THREE, CW = SO.CharWeapons, PI = Math.PI;
  const K = (t, p, a, f, roll, ease) => ({ t, p, a, f, roll, ease: ease || 'inout' });
  const R = (t) => ({ t, rest: true, ease: 'inout' });
  const BLUE = 0x2f7cff, BLUE_SOFT = 0xbfeaff, PURPLE = 0xa030ff, PURPLE_SOFT = 0xffc0ff;

  const SKULL = [
    '....######....',
    '..##########..',
    '.############.',
    '.############.',
    '.###..##..###.',
    '.##....#...##.',
    '.##....#...##.',
    '.###..###.###.',
    '..#####.#####.',
    '...###...###..',
    '...##########.',
    '...#+#+#+#+#..',
    '...#.#.#.#.#..',
    '....+.+.+.+...',
  ];

  // voxel katana: thin blade, thick guard, round-ish handle
  function katana(name) {
    const o = { voxel: 0.0042, grip: 'guard', pommel: true, glow: 0.22, haloPx: 1.6 };
    o.depth = (r) => (r > o.guardRow + 6 ? 1.3 : r >= o.guardRow - 6 ? 3.4 : 2.6);
    return SO.Voxel.build(name, o);
  }

  // sparse sparks of soul light peeling off the blade
  function sparks(s, model, color, rate, dt) {
    const ud = model.userData;
    s.acc[color] = (s.acc[color] || 0) + rate * dt;
    while (s.acc[color] >= 1) {
      s.acc[color] -= 1;
      const pos = ud.base.getWorldPosition(s.tmpA).lerp(ud.tip.getWorldPosition(s.tmpB), Math.random()).clone();
      s.motes.emit({ pos, vel: new T.Vector3((Math.random() - 0.5) * 0.08, 0.1 + Math.random() * 0.12, (Math.random() - 0.5) * 0.05), life: 0.5 + Math.random() * 0.6, size: 0.012, size1: 0.004, color, opacity: 1, tex: CW.dotTex(), curl: 1.2, drag: 0.8, fadeIn: 0.05 });
    }
  }

  function skull(s, from, color, side) {
    const tex = CW.artTex('soul-skull', SKULL);
    const m = s.motes.emit({ pos: from.clone(), vel: new T.Vector3(side * 0.05, 0.12, -0.03), life: 1.6, size: 0.06, size1: 0.15, color, opacity: 1, tex, drag: 0.5, curl: 0.15, fadeIn: 0.15, rot: 0, additive: true });
    if (m) m.onStep = (mm, k) => { mm.sp.material.rotation = Math.sin(k * 8) * 0.12 * side; };
    // a ghostly tail under each skull
    for (let i = 0; i < 14; i++) {
      s.motes.emit({ pos: from.clone().add(new T.Vector3((Math.random() - 0.5) * 0.03, -0.02 - i * 0.008, 0)), vel: new T.Vector3(side * 0.04, 0.11, -0.02), life: 0.6 + i * 0.05, size: 0.035, size1: 0.012, color, opacity: 0.55, curl: 2.2, drag: 0.5 });
    }
  }

  // the heavy's flying cross: two crescents of soul fire, one of each blade
  SO.AFX.spell.cw_souls_x = {
    build(F, q) {
      const root = new T.Group();
      const mats = [];
      for (const [roll, col, core] of [[45, PURPLE, PURPLE_SOFT], [-45, BLUE, BLUE_SOFT]]) {
        const mat = CW.slashMat({ color: col === PURPLE ? 0x5a1490 : 0x123c90, core, wisp: 0.9, cells: [80, 7], alpha: 0.7 });
        const m = new T.Mesh(CW.arcGeo(0.75, 1.3, PI / 2 - 1.2, PI / 2 + 1.2, 40), mat);
        m.position.z = 0.55;
        const g = new T.Group(); g.rotation.z = roll * PI / 180; g.add(m);
        const tilt = new T.Group(); tilt.rotation.x = -PI / 2; tilt.add(g);
        root.add(tilt); mats.push(mat);
      }
      return { root, mats, age: 0 };
    },
    update(F, v, dt, vel) {
      v.age += dt;
      const p = v.root.position;
      v.root.lookAt(p.x - vel.x, p.y - vel.y, p.z - vel.z);
      for (const m of v.mats) m.uniforms.uT.value = 0.62 + Math.min(0.12, v.age * 0.15);
      v.root.scale.setScalar(1 + v.age * 0.5);
      if (v.age > 0.08) for (let i = 0; i < 2; i++) F.fx.glowP.emit(p.x + (Math.random() - 0.5) * 2.4, p.y + (Math.random() - 0.5) * 2.4, p.z + (Math.random() - 0.5) * 2.4, 0, 1.5, 0, i % 2 ? 0.75 : 0.35, i % 2 ? 0.45 : 0.6, 1, 0.045, 0.3, 0, 1);
    },
    dispose(F, v) { for (const m of v.mats) m.dispose(); },
    hit(F, e) { F.fx.burst(e.x, e.y, e.z, 14, 9, Math.random() < 0.5 ? PURPLE : BLUE, 0.35, 0.25, 0); F.flash(e.x, e.y, e.z, PURPLE, 4, 0.15); },
    end(F, e) { F.fx.burst(e.x, e.y, e.z, 18, 6, BLUE_SOFT, 0.5, 0.2, -2); },
  };

  CW.reg.souls = {
    slot: 0,
    restR: { p: [0.27, -0.21, -0.62], a: 0.42, f: 0.55, roll: 0 },
    restL: { p: [-0.28, -0.23, -0.62], a: -0.42, f: 0.55, roll: PI },
    gripR: -0.02, gripL: -0.02,

    build(vm) {
      const right = katana('weapons/almas_roxa'), left = katana('weapons/almas_azul');
      if (!right || !left) return null;
      if (right.userData.halo) right.userData.halo.material.color.setHex(PURPLE);
      if (left.userData.halo) left.userData.halo.material.color.setHex(BLUE);
      const s = { right, left, motes: new CW.Motes(vm.scene, 260), acc: {}, tmpA: new T.Vector3(), tmpB: new T.Vector3(), fired: {} };
      s.flameR = CW.flameOn(right, { color: PURPLE, soft: PURPLE_SOFT, width: 0.17, cells: [14, 110], speed: 1.1, wild: 1.2, reach: 0.3 });
      s.flameL = CW.flameOn(left, { color: BLUE, soft: BLUE_SOFT, width: 0.17, cells: [14, 110], speed: 1.25, wild: 1.2, reach: 0.3 });
      // chain from pommel to pommel, the ofuda hanging from its middle
      s.chain = new T.Group(); vm.scene.add(s.chain);
      s.links = CW.chainMeshes('weapons/almas_elo', 15, 0.004, s.chain);
      s.rope = new CW.Rope(12, 0.62);
      s.tag = SO.Voxel.build('weapons/almas_ofuda', { voxel: 0.0036, grip: 0.97, depth: 0.8 });
      if (s.tag) s.chain.add(s.tag);
      s.tagRope = new CW.Rope(3, 0.05);
      s.trailR = new CW.Trail(vm.scene, { color: 0x6a18b0, core: PURPLE_SOFT, life: 0.09, width: 0.5 });
      s.trailL = new CW.Trail(vm.scene, { color: 0x1846b0, core: BLUE_SOFT, life: 0.09, width: 0.5 });
      return s;
    },

    update(vm, s, dt, ctx) {
      const insp = ctx.inspect; // -1 when not inspecting, else 0..1
      // ---- flames: calm at rest, each blade flares on its beat ----
      let blue = 0.78, purple = 0.78;
      if (insp >= 0 && insp < 0.96) {
        if (insp < 0.28) blue = 1.25; else if (insp < 0.52) purple = 1.25; else if (insp < 0.74) { blue = 0.95; purple = 0.95; } else { blue = 1.45; purple = 1.45; }
      }
      const sw = ctx.swing;
      if (sw) {
        const hot = sw.t < 0.75 ? 1 : 0;
        if (sw.name === 'souls_a1') purple = 1.1 + hot * 0.3;
        else if (sw.name === 'souls_a2') blue = 1.1 + hot * 0.3;
        else { blue = purple = 1.2 + hot * 0.3; }
      }
      const ease = 1 - Math.exp(-(sw ? 14 : 6) * dt);
      for (const [mat, k] of [[s.flameL, blue], [s.flameR, purple]]) {
        mat.uniforms.uTime.value = ctx.time;
        mat.uniforms.uK.value += (k - mat.uniforms.uK.value) * ease;
        mat.uniforms.uWild.value = 0.8 + mat.uniforms.uK.value * 0.4;
      }
      sparks(s, s.left, BLUE_SOFT, 3 + blue * 10, dt);
      sparks(s, s.right, PURPLE_SOFT, 3 + purple * 10, dt);
      // ---- skulls on the last beat ----
      if (insp >= 0) {
        const at = (key, t, fn) => { if (insp >= t && !s.fired[key]) { s.fired[key] = 1; fn(); } };
        const mid = (m, k) => m.userData.base.getWorldPosition(new T.Vector3()).lerp(m.userData.tip.getWorldPosition(new T.Vector3()), k);
        at('sL', 0.76, () => skull(s, mid(s.left, 0.3), BLUE_SOFT, -1));
        at('sR', 0.8, () => skull(s, mid(s.right, 0.3), PURPLE_SOFT, 1));
      } else s.fired = {};
      const pulse = 0.2 + Math.sin(ctx.time * 3) * 0.04;
      if (s.right.userData.halo) s.right.userData.halo.material.opacity = pulse * purple * 1.3;
      if (s.left.userData.halo) s.left.userData.halo.material.opacity = pulse * blue * 1.3;
      s.motes.update(dt, ctx.time);
      s.trailR.update(dt, s.right, ctx.trailOn(sw ? sw.trail : (insp >= 0 ? [0.95, 0.99] : null)));
      s.trailL.update(dt, s.left, ctx.trailOn(sw ? sw.trailL : (insp >= 0 ? [0.95, 0.99] : null)));

      // ---- chain physics ----
      const a = s.right.userData.pommel.getWorldPosition(new T.Vector3());
      const b = s.left.userData.pommel.getWorldPosition(new T.Vector3());
      s.rope.step(Math.min(dt, 1 / 30), a, b, 9);
      CW.layChain(s.links, s.rope);
      if (s.tag) {
        const mid = s.rope.p[Math.floor(s.rope.n / 2)];
        s.tagRope.step(Math.min(dt, 1 / 30), mid, null, 9);
        const end = s.tagRope.p[s.tagRope.n - 1];
        s.tag.position.copy(end);
        s.tag.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), mid.clone().sub(end).normalize());
      }
    },

    // ---- attacks: 1 purple right-to-left, 2 blue left-to-right, 3 both cut down in an X,
    // heavy: both raised overhead (long wind-up), then slammed down together ----
    clips: {
      souls_a1: {
        trail: [0.12, 0.62],
        R: [K(0.14, [0.42, -0.06, -0.55], -1.3, 0.38, 0), K(0.32, [0.12, -0.12, -0.68], 0.4, 0.3, 0), K(0.5, [-0.2, -0.28, -0.6], 2.05, 0.3, 0, 'out'), K(0.7, [-0.26, -0.33, -0.57], 2.3, 0.32, 0), R(1)],
        L: [K(0.3, [-0.34, -0.3, -0.58], -0.85, 0.5, PI), R(1)],
      },
      souls_a2: {
        trailL: [0.12, 0.62],
        L: [K(0.14, [-0.42, -0.06, -0.55], 1.3, 0.38, PI), K(0.32, [-0.12, -0.12, -0.68], -0.4, 0.3, PI), K(0.5, [0.2, -0.28, -0.6], -2.05, 0.3, PI, 'out'), K(0.7, [0.26, -0.33, -0.57], -2.3, 0.32, PI), R(1)],
        R: [K(0.3, [0.34, -0.3, -0.58], 0.85, 0.5, 0), R(1)],
      },
      souls_a3: {
        trail: [0.22, 0.66], trailL: [0.22, 0.66],
        R: [K(0.22, [0.3, 0.03, -0.5], -0.55, -0.25, 0), K(0.42, [0.06, -0.12, -0.66], 1.2, 0.3, 0), K(0.56, [-0.13, -0.3, -0.62], 2.45, 0.45, 0, 'out'), K(0.74, [-0.15, -0.32, -0.6], 2.55, 0.45, 0), R(1)],
        L: [K(0.22, [-0.3, 0.03, -0.5], 0.55, -0.25, PI), K(0.42, [-0.06, -0.12, -0.66], -1.2, 0.3, PI), K(0.56, [0.13, -0.3, -0.62], -2.45, 0.45, PI, 'out'), K(0.74, [0.15, -0.32, -0.6], -2.55, 0.45, PI), R(1)],
      },
      souls_h: {
        trail: [0.36, 0.66], trailL: [0.36, 0.66],
        R: [K(0.2, [0.16, 0.04, -0.46], 0.25, -0.55, 0), K(0.36, [0.12, 0.1, -0.42], 0.12, -0.8, 0, 'stop'), K(0.5, [0.09, -0.12, -0.7], -0.02, 0.6, 0), K(0.6, [0.08, -0.3, -0.72], -0.05, 1.2, 0, 'out'), K(0.82, [0.08, -0.31, -0.7], -0.05, 1.22, 0), R(1)],
        L: [K(0.2, [-0.16, 0.04, -0.46], -0.25, -0.55, PI), K(0.36, [-0.12, 0.1, -0.42], -0.12, -0.8, PI, 'stop'), K(0.5, [-0.09, -0.12, -0.7], 0.02, 0.6, PI), K(0.6, [-0.08, -0.3, -0.72], 0.05, 1.2, PI, 'out'), K(0.82, [-0.08, -0.31, -0.7], 0.05, 1.22, PI), R(1)],
      },
    },

    // world slash of each step: the blade's own soul fire torn into a crescent
    swing(F, e, view) {
      const base = { pos: view.eye, yaw: view.yaw, pitch: view.pitch * 0.85, wisp: 1.0, cells: [120, 7], alpha: 0.4 };
      const P = { color: 0x5a1490, core: PURPLE_SOFT }, B = { color: 0x123c90, core: BLUE_SOFT };
      const arc = (o) => CW.slashArc(F, Object.assign({}, base, o));
      if (e.step === 0) arc(Object.assign({ roll: 0, radius: 1.5, width: 0.32, arc: 2.6, dur: 0.2 }, P));
      else if (e.step === 1) arc(Object.assign({ roll: 180, radius: 1.5, width: 0.32, arc: 2.6, dur: 0.2 }, B));
      else if (e.step === 2) {
        arc(Object.assign({ roll: 125, radius: 1.6, width: 0.34, arc: 2.5, dur: 0.28, drop: 0.1 }, P));
        arc(Object.assign({ roll: 55, radius: 1.6, width: 0.34, arc: 2.5, dur: 0.28, drop: 0.1 }, B));
      } else {
        setTimeout(() => {
          arc(Object.assign({ roll: 90, radius: 1.8, width: 0.42, arc: 2.6, dur: 0.34, drop: 0.05 }, P));
          arc(Object.assign({ roll: 90, radius: 1.45, width: 0.3, arc: 2.5, dur: 0.34, drop: 0.05, yaw: view.yaw + 0.05 }, B));
          F.kick(3);
        }, 280);
      }
    },
    // on hit: the cut leaves a split of both soul colors and a wisp that climbs off the body
    hit(F, e) {
      const c = Math.random() < 0.5 ? PURPLE : BLUE;
      F.fx.burst(e.x, e.y, e.z, 12, 8, c, 0.3, 0.22, 0, { dir: new T.Vector3(e.dx, e.dy + 0.3, e.dz) });
      F.fx.burst(e.x, e.y, e.z, 6, 4, c === PURPLE ? PURPLE_SOFT : BLUE_SOFT, 0.5, 0.16, -3);
      F.fx.blood(e.x, e.y, e.z, new T.Vector3(e.dx, e.dy + 0.3, e.dz), e.dmg > 30 ? 1.4 : 0.9);
      F.flash(e.x, e.y, e.z, c, 3, 0.12);
    },

    inspect: {
      dur: 4.8,
      trail: [0.95, 0.99],
      // right hand: the purple blade. Beat 1 it hangs low out of the way; beat 2 it rises and
      // turns a full face; beat 3 it leans in to cross; beat 4 it rises in the V; snap back.
      R: [
        K(0.1, [0.4, -0.44, -0.6], -2.2, 0.35, 0),
        K(0.27, [0.41, -0.45, -0.6], -2.25, 0.35, 0),
        K(0.36, [0.07, -0.14, -0.58], 0.06, 0.12, 0, 'out'),
        K(0.5, [0.06, -0.13, -0.58], 0.02, 0.14, PI),
        K(0.58, [0.14, -0.2, -0.62], 0.42, 0.2, PI),
        K(0.73, [0.14, -0.2, -0.62], 0.46, 0.22, PI + 0.25),
        K(0.8, [0.21, -0.17, -0.64], -0.26, 0.1, 2 * PI),
        K(0.93, [0.22, -0.17, -0.64], -0.3, 0.12, 2 * PI),
        K(0.97, [0.3, -0.3, -0.62], 0.8, 0.5, 2 * PI, 'out'),
        R(1),
      ],
      // left hand: the blue blade. Beat 1 it rises and turns; beat 2 it hangs low; then the cross
      // and the V, mirrored.
      L: [
        K(0.12, [-0.08, -0.14, -0.58], -0.08, 0.12, PI, 'out'),
        K(0.26, [-0.08, -0.13, -0.58], -0.05, 0.14, PI + 0.7),
        K(0.34, [-0.4, -0.44, -0.6], 2.2, 0.35, PI),
        K(0.5, [-0.41, -0.45, -0.6], 2.25, 0.35, PI),
        K(0.58, [-0.14, -0.2, -0.62], -0.42, 0.2, PI),
        K(0.73, [-0.14, -0.2, -0.62], -0.46, 0.22, PI - 0.25),
        K(0.8, [-0.21, -0.17, -0.64], 0.26, 0.1, PI),
        K(0.93, [-0.22, -0.17, -0.64], 0.3, 0.12, PI),
        K(0.97, [-0.3, -0.3, -0.62], -0.8, 0.5, PI, 'out'),
        R(1),
      ],
    },

    dispose(vm, s) {
      s.motes.clear();
      s.trailR.dispose(vm.scene); s.trailL.dispose(vm.scene);
      vm.scene.remove(s.chain);
    },
  };
})(window.SO = window.SO || {});
