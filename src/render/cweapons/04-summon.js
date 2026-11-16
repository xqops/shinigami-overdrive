// 04 INVOCAÇÃO DE DEMÔNIOS — "Cetro Abissal": a spiked ring around a great red eye on a black
// shaft, held in one hand. Bells swing on chains from its head, ofudas and red ribbons hang from
// its neck, a string of blood beads drips. The eye sleeps half-lidded and blinks. Inspect (author's
// sheet): raised; the eye opens wide; the free hand reaches toward it and a ring of red runes
// lights around the head; demons rise from a red circle behind it.
(function (SO) {
  'use strict';
  const T = THREE, CW = SO.CharWeapons, AFX = SO.AFX, PI = Math.PI;
  const K = (t, p, a, f, roll, ease) => ({ t, p, a, f, roll, ease: ease || 'inout' });
  const R = (t) => ({ t, rest: true, ease: 'inout' });
  const RED = 0xff1a3a, BLOOD = 0xa00010, DARK = 0x1a0004, LID = 0x3a2408;
  const VX = 0.0045;

  const DEMONS = [
    ['..#......#..', '..##....##..', '...######...', '..########..', '.###+##+###.', '.##########.', '..########..', '.##########.', '############', '##.######.##', '#..######..#', '...##..##...', '...##..##...', '..###..###..'],
    ['.#........#.', '.##......##.', '..##....##..', '..########..', '.##+####+##.', '############', '.##########.', '############', '############', '#.########.#', '#..######..#', '...######...', '..##....##..', '.###....###.'],
  ];
  const runeRingTex = () => CW.pixelTex('abyss-runes', 64, (x, y, s) => {
    const dx = (x + 0.5) / s - 0.5, dy = (y + 0.5) / s - 0.5, r = Math.sqrt(dx * dx + dy * dy) * 2, a = Math.atan2(dy, dx);
    if (r > 0.97 || r < 0.66) return 0;
    if (r > 0.92 || (r < 0.72)) return 1;
    const cell = Math.floor((a + PI) / (PI * 2) * 16), u = ((a + PI) / (PI * 2) * 16) % 1, v = (r - 0.72) / 0.2;
    const g = (cell * 37) % 7; // a different glyph per cell
    return (Math.abs(u - 0.5) < 0.09 || (g > 2 && Math.abs(v - 0.5) < 0.1 && u > 0.2 && u < 0.8) || (g % 2 && Math.abs(u - v) < 0.1)) ? 1 : 0;
  });
  const circleTex = () => CW.pixelTex('abyss-circle', 64, (x, y, s) => {
    const dx = (x + 0.5) / s - 0.5, dy = (y + 0.5) / s - 0.5, r = Math.sqrt(dx * dx + dy * dy) * 2, a = Math.atan2(dy, dx);
    if (r > 1) return 0;
    if (r > 0.93 || (r > 0.8 && r < 0.84)) return 1;
    // a five-pointed star inside
    for (let i = 0; i < 5; i++) {
      const a0 = i * PI * 2 / 5 - PI / 2, a1 = a0 + PI * 4 / 5;
      const px = Math.cos(a0) * 0.8, py = Math.sin(a0) * 0.8, qx = Math.cos(a1) * 0.8, qy = Math.sin(a1) * 0.8;
      const ex = qx - px, ey = qy - py, t = Math.max(0, Math.min(1, ((dx * 2 - px) * ex + (dy * 2 - py) * ey) / (ex * ex + ey * ey)));
      if (Math.hypot(dx * 2 - px - ex * t, dy * 2 - py - ey * t) < 0.035) return 1;
    }
    return r < 0.8 ? 0.15 * (1 - r) : 0;
  });

  function scepter() {
    return SO.Voxel.build('weapons/abissal_cetro', { voxel: VX, grip: 0.6, glow: 0.35, haloPx: 1.5, depth: (r) => (r > 150 ? 2.6 : 1.6) });
  }
  // a lid over the eye (in the model's own space): scaleY 1 = shut, 0 = open
  function lid(model, y, up) {
    const g = new T.PlaneGeometry(20 * VX, 7 * VX).translate(0, up ? -3.5 * VX : 3.5 * VX, 0);
    const m = new T.Mesh(g, new T.MeshLambertMaterial({ color: LID, side: T.DoubleSide }));
    m.position.set(0, y + (up ? 6 * VX : -6 * VX), 1.4 * VX);
    model.add(m);
    return m;
  }
  function sprite(scene, tex, color, additive, order) {
    const sp = new T.Sprite(new T.SpriteMaterial({ map: tex, color, transparent: true, depthWrite: false, blending: additive ? T.AdditiveBlending : T.NormalBlending }));
    sp.renderOrder = order || 6; sp.visible = false; scene.add(sp);
    return sp;
  }

  CW.reg.summon = {
    slot: 0,
    oneHand: true,
    restR: { p: [0.3, -0.34, -0.62], a: 0.22, f: 0.35, roll: 0 },
    gripR: 0,

    build(vm) {
      const right = scepter();
      if (!right) return null;
      right.userData.halo.material.color.setHex(RED);
      const headY = (222 - 29 - Math.floor(222 * 0.6)) * VX; // eye center above the grip
      const s = { right, motes: new CW.Motes(vm.scene, 220), acc: 0, blink: 2, fired: {}, headY, scene: vm.scene };
      s.lidU = lid(right, headY, true); s.lidD = lid(right, headY, false);
      const anchor = (x, y) => { const o = new T.Object3D(); o.position.set(x * VX, headY + y * VX, 0); right.add(o); return o; };
      s.eye = anchor(0, 0);
      // bells on chains from the ring's sides, ofudas and ribbons from the neck, a bead string
      s.parts = [];
      const chainSet = (ax, ay, n, len, end, voxel) => {
        const g = new T.Group(); vm.scene.add(g);
        const links = CW.chainMeshes('weapons/almas_elo', n, 0.0032, g);
        const rope = new CW.Rope(n + 1, len);
        const hang = end ? SO.Voxel.build(end, { voxel: voxel || 0.004, grip: 0.95, depth: end === 'weapons/demonio_sino' ? 4 : 0.8 }) : null;
        if (hang) g.add(hang);
        s.parts.push({ g, links, rope, hang, a: anchor(ax, ay) });
      };
      chainSet(-15, -6, 5, 0.12, 'weapons/demonio_sino');
      chainSet(15, -6, 6, 0.15, 'weapons/demonio_sino');
      chainSet(-4, -26, 2, 0.05, 'weapons/almas_ofuda', 0.0032);
      // blood beads
      s.beads = { rope: new CW.Rope(6, 0.16), a: anchor(6, -24), sp: [] };
      for (let i = 0; i < 5; i++) s.beads.sp.push(sprite(vm.scene, CW.dotTex(), i === 4 ? 0xff3040 : 0xc0101e, true, 6));
      s.ribbons = [new CW.Ribbon(vm.scene, { color: 0x7a0812, width: 0.016, length: 0.34, n: 12 }), new CW.Ribbon(vm.scene, { color: 0x4a040c, width: 0.013, length: 0.26, n: 10 })];
      s.ribbonA = [anchor(-3, -30), anchor(3, -32)];
      s.trail = new CW.Trail(vm.scene, { color: 0x8a0010, core: 0xff6a6a, life: 0.1, width: 0.35 });
      s.runes = sprite(vm.scene, runeRingTex(), RED, true, 7);
      s.demons = [0, 1, 2].map((i) => ({ rim: sprite(vm.scene, CW.artTex('abyss-demon' + (i % 2), DEMONS[i % 2]), 0xc01020, true, 1), body: sprite(vm.scene, CW.artTex('abyss-demon' + (i % 2), DEMONS[i % 2]), 0x14020a, false, 2), eyes: sprite(vm.scene, CW.dotTex(), 0xff3a3a, true, 3) }));
      s.circle = sprite(vm.scene, circleTex(), RED, true, 1);
      return s;
    },

    update(vm, s, dt, ctx) {
      const insp = ctx.inspect, ud = s.right.userData;
      const beat = insp < 0 ? 0 : insp < 0.24 ? 1 : insp < 0.48 ? 2 : insp < 0.72 ? 3 : insp < 0.95 ? 4 : 0;
      const eye = s.eye.getWorldPosition(new T.Vector3());
      // eyelids: half shut at rest with a slow blink; wide open on the gaze and in the show
      s.blink -= dt;
      let shut = 0.45;
      if (s.blink < 0.14) shut = 1;
      if (s.blink < 0) s.blink = 2.5 + Math.random() * 3;
      const wide = (ctx.swing && ctx.swing.name === 'summon_a3') || (ctx.swing && ctx.swing.name === 'summon_h') || beat >= 2;
      if (wide) shut = 0;
      if (beat === 1) shut = 0.7;
      s.lidK = s.lidK == null ? shut : s.lidK + (shut - s.lidK) * (1 - Math.exp(-14 * dt));
      s.lidU.scale.y = Math.max(0.02, s.lidK); s.lidD.scale.y = Math.max(0.02, s.lidK);
      ud.halo.material.opacity = 0.18 + (1 - s.lidK) * 0.3 + (beat >= 3 ? 0.25 : 0) + Math.sin(ctx.time * 4) * 0.03;
      // red motes drifting off the eye
      s.acc += dt * (beat >= 2 ? 26 : 5);
      while (s.acc >= 1) { s.acc -= 1; s.motes.emit({ pos: eye.clone().add(new T.Vector3((Math.random() - 0.5) * 0.06, (Math.random() - 0.5) * 0.06, 0.01)), vel: new T.Vector3((Math.random() - 0.5) * 0.08, 0.04 + Math.random() * 0.08, 0), life: 0.6 + Math.random() * 0.5, size: 0.009, size1: 0.003, color: Math.random() < 0.7 ? RED : 0xff9a9a, opacity: 1, tex: CW.dotTex(), drag: 0.8, curl: 1, fadeIn: 0.05 }); }
      // the free hand's gesture in beat 3 comes from the arms (see gestures)
      if (beat === 3 && !s.fired.g) { s.fired.g = 1; vm.cast('summon_3'); }
      if (beat !== 3) s.fired.g = 0;
      // rune ring around the head
      s.runes.visible = beat >= 3 && beat <= 4;
      if (s.runes.visible) { const k = Math.min(1, (insp - 0.48) * 8); s.runes.position.copy(eye); s.runes.scale.set(0.3 * k, 0.3 * k, 1); s.runes.material.rotation = ctx.time * 0.8; s.runes.material.opacity = 0.9 * Math.min(1, (0.95 - insp) * 10); }
      // demons rising behind
      const dk = beat === 4 ? Math.min(1, (insp - 0.72) * 6) : 0;
      s.circle.visible = dk > 0;
      if (s.circle.visible) { s.circle.position.set(0, -0.78, -1.6); s.circle.scale.set(2.4 * dk, 0.7 * dk, 1); s.circle.material.opacity = 0.85 * Math.min(1, (0.95 - insp) * 10); }
      s.demons.forEach((d, i) => {
        d.body.visible = d.eyes.visible = d.rim.visible = dk > 0;
        if (!d.body.visible) return;
        const x = (i - 1) * 0.55, rise = Math.min(1, dk * 1.4 - i * 0.15);
        const sz = 0.36 + (i === 1 ? 0.08 : 0);
        d.body.position.set(x * 1.15, -0.78 + rise * 0.48, -1.75 - i % 2 * 0.1);
        d.body.scale.set(sz, sz * 1.15, 1);
        d.body.material.opacity = 0.95 * Math.max(0, rise) * Math.min(1, (0.95 - insp) * 10);
        d.rim.position.copy(d.body.position).add(new T.Vector3(0, 0.01, -0.02)); d.rim.scale.set(sz * 1.14, sz * 1.15 * 1.12, 1); d.rim.material.opacity = d.body.material.opacity * (0.8 + Math.sin(ctx.time * 6 + i) * 0.2);
        d.eyes.position.copy(d.body.position).add(new T.Vector3(0, sz * 0.17, 0.02));
        d.eyes.scale.set(sz * 0.5, sz * 0.08, 1);
        d.eyes.material.opacity = d.body.material.opacity * (0.7 + Math.sin(ctx.time * 9 + i) * 0.3);
      });
      s.motes.update(dt, ctx.time);
      s.trail.update(dt, s.right, ctx.trailOn(ctx.swing ? ctx.swing.trail : null));
      // hanging pieces
      for (const h of s.parts) {
        const a = h.a.getWorldPosition(new T.Vector3());
        h.rope.step(Math.min(dt, 1 / 30), a, null, 9);
        CW.layChain(h.links, h.rope);
        if (h.hang) { const e = h.rope.p[h.rope.n - 1], q = h.rope.p[h.rope.n - 2]; h.hang.position.copy(e); h.hang.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), q.clone().sub(e).normalize()); }
      }
      const b = s.beads; b.rope.step(Math.min(dt, 1 / 30), b.a.getWorldPosition(new T.Vector3()), null, 9);
      b.sp.forEach((sp, i) => { sp.visible = true; sp.position.copy(b.rope.p[i + 1]); const z = i === 4 ? 0.016 : 0.011; sp.scale.set(z, i === 4 ? z * 1.4 : z, 1); });
      s.ribbons.forEach((r, i) => r.update(dt, s.ribbonA[i].getWorldPosition(new T.Vector3()), ctx.swing ? 0.006 : 0.0025));
      // bells ring when swung
      const bell = s.parts[1].rope.p[s.parts[1].rope.n - 1];
      const sp = bell.distanceTo(s.lastBell || bell) / Math.max(1e-3, dt);
      s.lastBell = bell.clone();
      if (sp > 1.4 && SO.game && SO.game.audio && SO.game.audio.ok() && SO.game.audio.every('abyssbell', 380)) SO.game.audio.sample('bell', { vol: 0.13, rate: 1.7 + Math.random() * 0.4 });
    },

    clips: {
      summon_a1: { trail: [0.25, 0.68], R: [K(0.2, [0.45, -0.05, -0.5], -1.2, 0.45, 0), K(0.42, [0.1, -0.14, -0.7], 0.5, 0.4, 0), K(0.6, [-0.25, -0.28, -0.6], 1.7, 0.4, 0, 'out'), K(0.78, [-0.27, -0.3, -0.58], 1.8, 0.4, 0), R(1)] },
      summon_a2: { trail: [0.25, 0.68], R: [K(0.2, [-0.25, -0.1, -0.5], 1.4, 0.45, PI), K(0.42, [0.08, -0.16, -0.7], -0.3, 0.4, PI), K(0.6, [0.42, -0.28, -0.6], -1.6, 0.4, PI, 'out'), K(0.78, [0.44, -0.3, -0.58], -1.7, 0.4, PI), R(1)] },
      summon_a3: { trail: [2, 2], R: [K(0.25, [0.24, -0.22, -0.42], 0.1, 0.9, 0), K(0.42, [0.08, -0.12, -0.85], 0.05, 1.35, 0, 'out'), K(0.75, [0.08, -0.12, -0.82], 0.05, 1.35, 0), R(1)] },
      summon_h: { trail: [2, 2], R: [K(0.35, [0.15, 0.08, -0.45], 0.1, -0.4, 0, 'stop'), K(0.55, [0.1, -0.35, -0.55], 0.05, -0.15, 0, 'out'), K(0.82, [0.1, -0.36, -0.55], 0.05, -0.14, 0), R(1)] },
    },

    swing(F, e, view) {
      const o = { pos: view.eye, yaw: view.yaw, pitch: view.pitch * 0.85, color: 0x6a0010, core: 0xff5a5a, wisp: 0.9, cells: [110, 6], alpha: 0.5 };
      if (e.step === 0) setTimeout(() => CW.slashArc(F, Object.assign(o, { roll: 0, radius: 1.8, width: 0.32, arc: 2.4, dur: 0.24 })), 60);
      else if (e.step === 1) setTimeout(() => CW.slashArc(F, Object.assign(o, { roll: 180, radius: 1.8, width: 0.32, arc: 2.4, dur: 0.24 })), 60);
    },
    hit(F, e) {
      const dir = new T.Vector3(e.dx, e.dy + 0.3, e.dz);
      F.fx.burst(e.x, e.y, e.z, 12, 8, RED, 0.3, 0.25, 0, { dir });
      F.fx.blood(e.x, e.y, e.z, dir, 1.3);
      F.flash(e.x, e.y, e.z, RED, 3, 0.12);
    },

    inspect: {
      dur: 4.8,
      R: [
        K(0.12, [0.2, -0.24, -0.58], 0.12, 0.25, 0),
        K(0.22, [0.2, -0.24, -0.58], 0.16, 0.28, 0.3),
        K(0.32, [0.1, -0.3, -0.46], 0.05, 0.12, 0),
        K(0.46, [0.1, -0.3, -0.46], 0.08, 0.14, -0.15),
        K(0.56, [0.12, -0.28, -0.5], 0.1, 0.18, 0),
        K(0.7, [0.12, -0.28, -0.5], 0.12, 0.2, 0.15),
        K(0.78, [0.24, -0.36, -0.6], 0.25, 0.3, 0),
        K(0.93, [0.24, -0.36, -0.6], 0.27, 0.32, 0),
        R(1),
      ],
    },

    dispose(vm, s) {
      s.motes.clear(); s.trail.dispose(vm.scene);
      for (const h of s.parts) vm.scene.remove(h.g);
      for (const sp of s.beads.sp) vm.scene.remove(sp);
      for (const r of s.ribbons) r.dispose();
      vm.scene.remove(s.runes); vm.scene.remove(s.circle);
      for (const d of s.demons) { vm.scene.remove(d.body); vm.scene.remove(d.eyes); vm.scene.remove(d.rim); }
    },
  };

  // ---- world ----
  // the gaze leaves the same abyssal weakness as the school's circle (red sigil over the body)
  AFX.status['cw_summon:weak'] = AFX.status['summon_3:weak'];
  // the glare: a thin red beam with a hot core, flickering out
  AFX.vfx['cw_summon:gaze'] = (F, e) => {
    const len = e.len || 12;
    const g = new T.Group();
    const outer = new T.Mesh(new T.CylinderGeometry(0.12, 0.12, len, 6, 1, true).rotateX(PI / 2).translate(0, 0, -len / 2), new T.MeshBasicMaterial({ color: RED, transparent: true, opacity: 0.6, blending: T.AdditiveBlending, depthWrite: false }));
    const core = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, len, 5, 1, true).rotateX(PI / 2).translate(0, 0, -len / 2), new T.MeshBasicMaterial({ color: 0xffd0d0, transparent: true, blending: T.AdditiveBlending, depthWrite: false }));
    g.add(outer); g.add(core);
    g.position.set(e.x, e.y - 0.25, e.z);
    g.lookAt(e.x - e.dx, e.y - 0.25 - e.dy, e.z - e.dz);
    F.add(g);
    F.flash(e.x + e.dx * 3, e.y + e.dy * 3, e.z + e.dz * 3, RED, 5, 0.2);
    F.spawn((dt, age) => { const k = 1 - age / 0.28; const fl = 0.7 + Math.random() * 0.3; outer.material.opacity = 0.6 * k * fl; core.material.opacity = k; outer.scale.set(k, k, 1); if (age < 0.28) return true; for (const m of [outer, core]) { m.geometry.dispose(); m.material.dispose(); } return false; }, [g]);
    for (let i = 0; i < 10; i++) { const u = Math.random() * len; F.fx.glowP.emit(e.x + e.dx * u, e.y - 0.25 + e.dy * u, e.z + e.dz * u, 0, 1 + Math.random(), 0, 1, 0.15, 0.2, 0.12, 0.35, 0, 2); }
  };
  // the abyssal circle: a red pentagram over a black pit, embers sucked to the middle
  AFX.effect.cw_abyss = {
    build(F, fx) {
      const r = fx.r;
      const pit = new T.Mesh(new T.CircleGeometry(r * 0.85, 32).rotateX(-PI / 2), new T.MeshBasicMaterial({ color: 0x050002, transparent: true, opacity: 0.85, depthWrite: false }));
      const sig = new T.Mesh(new T.PlaneGeometry(r * 2.1, r * 2.1).rotateX(-PI / 2), new T.MeshBasicMaterial({ map: circleTex(), color: RED, transparent: true, depthWrite: false, blending: T.AdditiveBlending }));
      pit.position.y = 0.04; sig.position.y = 0.06;
      const root = new T.Group(); root.add(pit); root.add(sig);
      root.position.set(fx.x, fx.y, fx.z);
      F.add(root);
      return { root, pit, sig };
    },
    update(F, v, fx, dt) {
      const k = Math.min(1, fx.t / 0.2) * Math.min(1, (fx.dur - fx.t) / 0.3);
      v.root.scale.setScalar(0.2 + 0.8 * Math.min(1, fx.t / 0.2));
      v.sig.rotation.y += dt * 0.6;
      v.sig.material.opacity = k; v.pit.material.opacity = 0.85 * k;
      for (let i = 0; i < 3; i++) { const a = Math.random() * PI * 2, rr = fx.r * (0.6 + Math.random() * 0.4); F.fx.glowP.emit(fx.x + Math.cos(a) * rr, fx.y + 0.2, fx.z + Math.sin(a) * rr, -Math.cos(a) * rr * 2, 0.5, -Math.sin(a) * rr * 2, 1, 0.1, 0.15, 0.12, 0.45, 0, 1); }
    },
    end(F, v) { v.root.traverse((o) => { if (o.material) { o.material.dispose(); o.geometry.dispose(); } }); return 0; },
  };
  // claws of the abyss tearing up out of the circle
  AFX.vfx['cw_abyss:claws'] = (F, e) => {
    const mat = new T.MeshLambertMaterial({ color: 0x1a0406, emissive: 0x3a0008 });
    const tipMat = new T.MeshBasicMaterial({ color: RED });
    for (let i = 0; i < e.n; i++) {
      const a = Math.random() * PI * 2, rr = Math.random() * e.r * 0.8;
      const g = new T.Group();
      for (let f = 0; f < 3; f++) {
        const finger = new T.Group();
        const seg = new T.Mesh(new T.ConeGeometry(0.16, 1.6, 5).translate(0, 0.8, 0), mat);
        const tip = new T.Mesh(new T.ConeGeometry(0.07, 0.5, 4).translate(0, 0.25, 0), tipMat);
        tip.position.y = 1.5; tip.rotation.z = -0.5;
        finger.add(seg); finger.add(tip);
        finger.rotation.set(0, f * 2.1, 0.35);
        g.add(finger);
      }
      g.position.set(e.x + Math.cos(a) * rr, e.y - 1.6, e.z + Math.sin(a) * rr);
      g.rotation.y = Math.random() * PI;
      F.add(g);
      const delay = Math.random() * 0.12, s0 = 0.8 + Math.random() * 0.6;
      g.scale.setScalar(s0);
      F.spawn((dt, age) => {
        const t = Math.max(0, age - delay);
        const up = t < 0.12 ? t / 0.12 : t < 0.45 ? 1 : Math.max(0, 1 - (t - 0.45) / 0.25);
        g.position.y = e.y - 1.7 * s0 + up * 1.7 * s0;
        g.children.forEach((fg, fi) => { fg.rotation.z = 0.35 + (t > 0.1 ? Math.min(0.6, (t - 0.1) * 3) : 0) * (fi % 2 ? -1 : 1) * 0.5; });
        return age < 0.75 + delay;
      }, [g]);
      F.fx.burst(g.position.x, e.y + 0.2, g.position.z, 6, 6, 0x3a2a24, 0.4, 0.4, -6);
    }
    F.flash(e.x, e.y + 1, e.z, RED, 6, 0.2);
    F.kick(3);
  };
})(window.SO = window.SO || {});
