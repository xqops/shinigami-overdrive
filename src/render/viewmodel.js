// First-person weapons: procedurally modeled katana, scythe and zanbato, keyframed swing
// clips (one per combo step), blade trails, idle sway/bob and the iaido sheath stance.
// Poses live in camera space: p = hand position; the blade direction is a "clock hand" on the
// screen (a: 0 = up, +PI/2 = left, -PI/2 = right) tilted f radians into the screen
// (0 = flat on screen, PI/2 = straight ahead, >PI/2 = forward and down); roll spins the edge.
// Sweeping `a` keeps blades readable across the screen instead of foreshortening into it.
(function (SO) {
  'use strict';
  const T = THREE;
  const PI = Math.PI;

  const REST = [
    { p: [0.26, -0.2, -0.62], a: 0.45, f: 0.55, roll: 0 },
    { p: [0.3, -0.3, -0.72], a: 0.35, f: 0.5, roll: 0 },
    { p: [0.28, -0.24, -0.68], a: 0.55, f: 0.6, roll: 0 },
  ];

  // K(t, p, a, f, roll, ease): normalized time 0..1; R(t) returns to the weapon's rest pose.
  const K = (t, p, a, f, roll, ease) => ({ t, p, a, f, roll, ease: ease || 'inout' });
  const R = (t) => ({ t, rest: true, ease: 'inout' });

  const CLIPS = {
    // ---- katana ----
    k_r2l: { trail: [0.1, 0.66], keys: [K(0.14, [0.4, -0.08, -0.55], -1.25, 0.35, 0), K(0.46, [-0.18, -0.28, -0.6], 2.0, 0.3, 0, 'out'), K(0.64, [-0.25, -0.32, -0.58], 2.3, 0.3, 0), R(1)] },
    k_l2r: { trail: [0.1, 0.66], keys: [K(0.14, [-0.12, -0.05, -0.55], 1.3, 0.35, PI), K(0.46, [0.36, -0.28, -0.6], -2.0, 0.3, PI, 'out'), K(0.64, [0.4, -0.32, -0.58], -2.3, 0.3, PI), R(1)] },
    k_up: { trail: [0.12, 0.68], keys: [K(0.14, [0.18, -0.36, -0.55], -2.8, 0.3, PI / 2), K(0.48, [0.1, 0.0, -0.62], 0.05, 0.25, PI / 2, 'out'), K(0.66, [0.12, 0.04, -0.6], 0.2, 0.2, PI / 2), R(1)] },
    k_thrust: { trail: [0.14, 0.5], keys: [K(0.16, [0.3, -0.2, -0.4], 0.2, 1.25, 0), K(0.4, [0.08, -0.15, -0.95], 0.1, 1.38, 0, 'out'), K(0.7, [0.1, -0.17, -0.9], 0.1, 1.38, 0), R(1)] },
    k_iaido: { trail: [0.0, 0.45], keys: [K(0.3, [-0.3, -0.12, -0.62], 1.6, 0.3, 0, 'out'), K(0.6, [-0.34, -0.18, -0.6], 1.9, 0.3, 0), R(1)] },
    // ---- scythe ----
    sc_sweep: { trail: [0.12, 0.7], keys: [K(0.16, [0.45, -0.1, -0.65], -1.2, 0.3, 0), K(0.5, [-0.25, -0.25, -0.75], 2.1, 0.3, 0, 'out'), K(0.7, [-0.3, -0.3, -0.72], 2.4, 0.3, 0), R(1)] },
    sc_back: { trail: [0.12, 0.7], keys: [K(0.16, [-0.2, -0.05, -0.65], 1.2, 0.3, PI), K(0.5, [0.4, -0.28, -0.75], -2.1, 0.3, PI, 'out'), K(0.7, [0.44, -0.32, -0.72], -2.4, 0.3, PI), R(1)] },
    sc_spin: { trail: [0.1, 0.88], keys: [K(0.1, [0.05, -0.12, -0.85], 0, 0.15, 0), K(0.88, [0.05, -0.12, -0.85], 4 * PI, 0.15, 0, 'linear'), R(1)] },
    sc_reap: { trail: [0.24, 0.7], keys: [K(0.24, [0.2, 0.05, -0.5], 0.3, -0.5, 0), K(0.55, [0.12, -0.22, -0.7], -2.5, 0.45, 0, 'out'), K(0.76, [0.14, -0.25, -0.68], -2.65, 0.45, 0), R(1)] },
    // ---- zanbato ----
    g_overhead: { trail: [0.3, 0.7], keys: [K(0.32, [0.25, 0.1, -0.45], 0.3, -0.6, 0), K(0.52, [0.12, -0.25, -0.7], -2.5, 0.45, 0, 'out'), K(0.76, [0.13, -0.27, -0.68], -2.65, 0.45, 0), R(1)] },
    g_sweep: { trail: [0.3, 0.72], keys: [K(0.32, [0.5, -0.1, -0.5], -1.4, 0.3, 0), K(0.58, [-0.3, -0.3, -0.7], 2.0, 0.3, 0, 'out'), K(0.76, [-0.34, -0.33, -0.68], 2.25, 0.3, 0), R(1)] },
    g_spin: { trail: [0.18, 0.84], keys: [K(0.18, [0.5, -0.1, -0.5], -1.4, 0.3, 0), K(0.45, [-0.3, -0.28, -0.7], 2.0, 0.3, 0, 'linear'), K(0.58, [0.0, -0.36, -0.6], 4.6, 0.3, 0, 'linear'), K(0.84, [-0.3, -0.28, -0.7], 8.2, 0.3, 0, 'out'), R(1)] },
    g_upper: { trail: [0.12, 0.72], keys: [K(0.12, [0.25, -0.38, -0.55], -2.8, 0.3, PI / 2), K(0.45, [0.1, 0.05, -0.65], 0.0, 0.25, PI / 2, 'out'), K(0.7, [0.12, 0.08, -0.62], 0.2, 0.2, PI / 2), R(1)] },
    g_slam: { trail: [0.0, 0.55], keys: [K(0.3, [0.12, -0.25, -0.7], -2.5, 0.45, 0, 'out'), K(0.65, [0.13, -0.27, -0.68], -2.65, 0.45, 0), R(1)] },
    // ---- inspect (T): cosmetic flourishes, client-side only ----
    i_katana: { trail: [0.62, 0.8], keys: [K(0.12, [0.05, -0.12, -0.5], 1.45, 0.15, 0), K(0.3, [0.05, -0.1, -0.48], 1.45, 0.15, PI), K(0.42, [0.0, -0.08, -0.5], 1.5, 0.2, PI), K(0.6, [0.15, -0.05, -0.55], 1.5 + 2 * PI, 0.25, PI, 'linear'), K(0.72, [0.3, -0.35, -0.6], -2.6 + 4 * PI, 0.3, PI, 'out'), K(0.84, [0.3, -0.36, -0.6], -2.6 + 4 * PI, 0.3, PI), R(1)] },
    i_scythe: { trail: [0.15, 0.7], keys: [K(0.12, [0.0, -0.12, -0.8], 0, 0.15, 0), K(0.45, [0.0, -0.12, -0.8], 2 * PI, 0.15, 0, 'linear'), K(0.7, [0.0, -0.12, -0.8], 6 * PI, 0.15, 0, 'linear'), K(0.85, [0.35, -0.2, -0.5], 6 * PI - 0.6, -0.9, PI / 2, 'out'), R(1)] },
    i_zanbato: { trail: [0.7, 0.82], keys: [K(0.18, [0.3, -0.05, -0.35], 0.9, -1.0, 0), K(0.38, [0.3, -0.05, -0.35], 0.9, -1.0, PI / 2), K(0.55, [0.05, -0.1, -0.6], 0.2, 0.3, PI / 2), K(0.68, [0.05, -0.1, -0.6], 0.2, 0.3, 0), K(0.8, [0.1, -0.3, -0.85], -0.05, 2.0, 0, 'out'), K(0.9, [0.1, -0.3, -0.85], -0.05, 2.0, 0), R(1)] },
  };

  const HOLD = {
    iaido: { p: [0.4, -0.38, -0.45], a: -2.3, f: 0.1, roll: 0 },
    meteor: { p: [0.18, 0.12, -0.45], a: 0.3, f: -0.6, roll: 0 },
  };

  function ease(kind, x) {
    if (kind === 'linear') return x;
    if (kind === 'out') return 1 - Math.pow(1 - x, 3);
    if (kind === 'in') return x * x * x;
    return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
  }

  // Character-weapon clips run on a spline instead of eased segments: the hand never stops at a
  // key unless asked to (key.stop), so arcs flow (Catmull-Rom tangents over uneven key times,
  // Hermite segments). keys: [{ t, pose, stop }] from t=0 to t=1.
  const CH = ['x', 'y', 'z', 'a', 'f', 'roll'];
  const getC = (P, c) => (c === 'x' ? P.p.x : c === 'y' ? P.p.y : c === 'z' ? P.p.z : P[c]);
  function splinePose(list, k, out) {
    let i = 0;
    while (i < list.length - 2 && k > list[i + 1].t) i++;
    const A = list[i], B = list[i + 1];
    const h = Math.max(1e-4, B.t - A.t);
    let u = SO.clamp((k - A.t) / h, 0, 1);
    if (B.snap) u = 1 - Math.pow(1 - u, 2.2); // strike: leaves fast, lands soft
    const u2 = u * u, u3 = u2 * u;
    const h00 = 2 * u3 - 3 * u2 + 1, h10 = u3 - 2 * u2 + u, h01 = -2 * u3 + 3 * u2, h11 = u3 - u2;
    const P0 = list[i - 1] || A, P3 = list[i + 2] || B;
    for (const c of CH) {
      const a = getC(A.pose, c), b = getC(B.pose, c);
      const ta = A.stop || i === 0 ? 0 : (b - getC(P0.pose, c)) / Math.max(1e-4, B.t - P0.t) * h;
      const tb = B.stop || i + 1 === list.length - 1 ? 0 : (getC(P3.pose, c) - a) / Math.max(1e-4, P3.t - A.t) * h;
      const v = h00 * a + h10 * ta + h01 * b + h11 * tb;
      if (c === 'x') out.p.x = v; else if (c === 'y') out.p.y = v; else if (c === 'z') out.p.z = v; else out[c] = v;
    }
    return out;
  }

  function poseFrom(src) { return { p: new T.Vector3(src.p[0], src.p[1], src.p[2]), a: src.a, f: src.f, roll: src.roll }; }
  function lerpPose(out, a, b, k) {
    out.p.lerpVectors(a.p, b.p, k);
    out.a = a.a + (b.a - a.a) * k;
    out.f = a.f + (b.f - a.f) * k;
    out.roll = a.roll + (b.roll - a.roll) * k;
    return out;
  }
  const UP = new T.Vector3(0, 1, 0);
  function bladeDir(pose, out) {
    const c = Math.cos(pose.f), s = Math.sin(pose.f);
    return out.set(-Math.sin(pose.a) * c, Math.cos(pose.a) * c, -s).normalize();
  }

  class Viewmodel {
    constructor(Rr) {
      this.R = Rr;
      this.scene = new T.Scene();
      this.camera = new T.PerspectiveCamera(58, 1, 0.01, 20);
      this.scene.add(new T.AmbientLight(0xffffff, 0.8));
      const dl = new T.DirectionalLight(0xffffff, 0.9); dl.position.set(1, 2, 1.5); this.scene.add(dl);
      this.pl = new T.PointLight(0xffffff, 0.3, 3); this.pl.position.set(0.2, 0.1, -0.5); this.scene.add(this.pl);

      this.sway = new T.Group(); this.scene.add(this.sway);
      this.pivot = new T.Group(); this.sway.add(this.pivot);
      this.dirV = new T.Vector3();
      this.rollG = new T.Group(); this.pivot.add(this.rollG);
      // second hand weapon (character weapons with a blade in each hand): posed like the right
      // one, then carried by the left hand's real transform so casting gestures move it too
      this.pivotL = new T.Group(); this.sway.add(this.pivotL);
      this.rollGL = new T.Group(); this.pivotL.add(this.rollGL);
      this.leftWorld = new T.Group(); this.leftWorld.matrixAutoUpdate = false; this.scene.add(this.leftWorld);
      this.cw = null; this.cwS = null; this.cwKey = null;

      // fallback hands until the rigged arms (SO.Arms) are loaded
      const fist = this.fist = SO.Mat.inked(new T.BoxGeometry(0.075, 0.09, 0.085), SO.Mat.toon(0x1c1a19), 0.1);
      this.pivot.add(fist);
      this.arm = new T.Group();
      const armMesh = SO.Mat.inked(new T.CylinderGeometry(0.034, 0.05, 1, 8).rotateX(PI / 2).translate(0, 0, 0.5), SO.Mat.toon(0x1c1a19), 0.06);
      this.arm.add(armMesh);
      const band = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 0.05, 8).rotateX(PI / 2).translate(0, 0, 0.12), SO.Mat.glow(0xe9e3d5));
      this.arm.add(band);
      this.sway.add(this.arm);
      this.elbow = new T.Vector3(0.55, -0.85, 0.1);

      // Weapons come from the player's pixel-art sheet (assets/sprites/weapons), extruded into
      // voxels; the hand-built models remain only as a fallback if the sprites are missing.
      const vox = (name, o) => (SO.Voxel && SO.Voxel.build(name, o));
      const longsword = vox('weapons/espada_longa', { voxel: 0.0105, flip: true, grip: 'guard' });
      const scythe = vox('weapons/foice', { voxel: 0.0148, grip: 0.12, base: 'top' });
      const greatsword = vox('weapons/espada_larga', { voxel: 0.0125, flip: true, grip: 'guard', depth: 2 });
      this.models = [longsword || this.buildKatana(), scythe || this.buildScytheModel(false), greatsword || this.buildZanbato()];
      this.models.forEach((m, i) => { m.visible = i === 0; this.rollG.add(m); });
      this.scales = [longsword ? 1 : 0.62, scythe ? 1 : 0.52, greatsword ? 1 : 0.46];
      this.models.forEach((m, i) => m.scale.setScalar(this.scales[i]));

      this.weapon = 0;
      this.pose = poseFrom(REST[0]);
      this.from = poseFrom(REST[0]);
      this.tmpA = poseFrom(REST[0]);
      this.tmpB = poseFrom(REST[0]);
      this.clip = null; this.clipT = 0; this.clipDur = 0.3;
      this.drawT = 1;
      this.bobT = 0;
      this.swayV = new T.Vector2();
      this.dip = 0;
      this.kick = 0;
      this.tilt = 0;
      this.shake = 0;
      this.buildTrail();
    }

    // ---------- models ----------
    glowMat(color, op) { return SO.Mat.glow(color, op); }

    buildKatana() {
      const g = new T.Group();
      const L = 1.08;
      const spine = (y) => -0.022 - 0.06 * Math.pow(y / L, 2);
      const width = (y) => 0.046 * (1 - 0.3 * y / L);
      const shape = new T.Shape();
      shape.moveTo(spine(0.05), 0.05);
      for (let i = 1; i <= 12; i++) { const y = 0.05 + (L - 0.17) * i / 12; shape.lineTo(spine(y), y); }
      shape.lineTo(spine(L) + 0.012, L);
      for (let i = 12; i >= 0; i--) { const y = 0.05 + (L - 0.17) * i / 12; shape.lineTo(spine(y) + width(y), y); }
      const bladeGeo = new T.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: false }).translate(0.0, 0, -0.004);
      const blade = SO.Mat.inked(bladeGeo, new T.MeshToonMaterial({ color: 0xdcd8cc, emissive: 0x3a3836 }), 0.04);
      g.add(blade);
      const gm = this.glowMat(SO.PAL.blood);
      const glow = new T.Mesh(bladeGeo, gm); gm.userData.mesh = glow; glow.scale.set(1.3, 1.0, 0.5); g.add(glow);
      const hamon = new T.Mesh(new T.BoxGeometry(0.006, L - 0.2, 0.01).translate(0, 0.05 + (L - 0.2) / 2, 0), this.glowMat(0xffffff, 0.7));
      hamon.position.x = -0.005; g.add(hamon);
      const tsuba = SO.Mat.inked(new T.CylinderGeometry(0.068, 0.068, 0.018, 10), SO.Mat.toon(0x1c1a19), 0.08); tsuba.position.y = 0.02; g.add(tsuba);
      const habaki = SO.Mat.inked(new T.BoxGeometry(0.03, 0.05, 0.016), SO.Mat.toon(0x8a857c), 0.1); habaki.position.set(-0.006, 0.055, 0); g.add(habaki);
      const handle = SO.Mat.inked(new T.CylinderGeometry(0.024, 0.026, 0.3, 8), SO.Mat.toon(0x1c1a19), 0.08); handle.position.y = -0.14; g.add(handle);
      for (let i = 0; i < 5; i++) {
        const w = new T.Mesh(new T.TorusGeometry(0.026, 0.006, 4, 8).rotateX(PI / 2), SO.Mat.toon(0xe9e3d5)); w.position.y = -0.03 - i * 0.055; g.add(w);
      }
      const tip = new T.Object3D(); tip.position.set(spine(L) + 0.012, L, 0); g.add(tip);
      const base = new T.Object3D(); base.position.set(0, 0.14, 0); g.add(base);
      g.userData = { tip, base, glows: [gm], color: SO.WEAPONS[0].color };
      return g;
    }

    buildScytheModel(forProjectile) {
      if (forProjectile && SO.Voxel) { const v = SO.Voxel.build('weapons/foice', { voxel: 0.022, grip: 0.12, base: 'top' }); if (v) return v; }
      const g = new T.Group();
      const staff = SO.Mat.inked(new T.CylinderGeometry(0.024, 0.03, 1.9, 8), SO.Mat.toon(0x1c1a19), 0.08); staff.position.y = 0.45; g.add(staff);
      [0.0, 0.9, 1.3].forEach((y) => { const r = new T.Mesh(new T.TorusGeometry(0.032, 0.01, 4, 10).rotateX(PI / 2), SO.Mat.toon(0x8a857c)); r.position.y = y; g.add(r); });
      const shape = new T.Shape();
      const N = 18;
      const outer = (s) => [0.92 * s, 0.22 * Math.sin(PI * s * 0.85) - 0.36 * s * s * s];
      const thick = (s) => 0.17 * (1 - s) + 0.01;
      shape.moveTo(0, 0);
      for (let i = 1; i <= N; i++) { const s = i / N; const o = outer(s); shape.lineTo(o[0], o[1]); }
      for (let i = N; i >= 0; i--) { const s = i / N; const o = outer(s); shape.lineTo(o[0] - 0.02 * s, o[1] - thick(s)); }
      const bladeGeo = new T.ExtrudeGeometry(shape, { depth: 0.014, bevelEnabled: false }).translate(0, 0, -0.007);
      const blade = SO.Mat.inked(bladeGeo, new T.MeshToonMaterial({ color: 0xdcd8cc, emissive: 0x3a3836 }), 0.03);
      blade.position.set(0.0, 1.34, 0); g.add(blade);
      const gm = this.glowMat(SO.PAL.blood);
      const glow = new T.Mesh(bladeGeo, gm); gm.userData.mesh = glow; glow.position.copy(blade.position); glow.scale.set(1.04, 1.12, 0.6); g.add(glow);
      const skull = SO.Mat.inked(new T.SphereGeometry(0.06, 8, 6), SO.Mat.toon(0xf0ead8), 0.1); skull.position.set(0, 1.36, 0.0); g.add(skull);
      const eyeM = this.glowMat(SO.PAL.ink);
      const se = new T.Mesh(new T.SphereGeometry(0.014, 4, 4), eyeM); se.position.set(0.02, 1.37, 0.052); g.add(se);
      const se2 = se.clone(); se2.position.x = -0.02; g.add(se2);
      const ribbon = new T.Mesh(new T.BoxGeometry(0.015, 0.35, 0.004).translate(0, -0.17, 0), this.glowMat(0xe9e3d5)); ribbon.position.set(0, 1.3, 0); ribbon.rotation.z = 0.2; g.add(ribbon);
      const tipO = outer(1);
      const tip = new T.Object3D(); tip.position.set(tipO[0], 1.34 + tipO[1], 0); g.add(tip);
      const base = new T.Object3D(); base.position.set(0.12, 1.34, 0); g.add(base);
      g.userData = { tip, base, glows: [gm], color: SO.WEAPONS[1].color, ribbon };
      return g;
    }

    buildZanbato() {
      const g = new T.Group();
      const shape = new T.Shape();
      shape.moveTo(-0.15, 0.1); shape.lineTo(0.15, 0.1); shape.lineTo(0.15, 1.42); shape.lineTo(-0.02, 1.75); shape.lineTo(-0.15, 1.6); shape.lineTo(-0.15, 0.1);
      const hole = new T.Path(); hole.absarc(0.0, 0.3, 0.05, 0, PI * 2, true); shape.holes.push(hole);
      const bladeGeo = new T.ExtrudeGeometry(shape, { depth: 0.034, bevelEnabled: false }).translate(0, 0, -0.017);
      const blade = SO.Mat.inked(bladeGeo, SO.Mat.toon(0x2a2826), 0.025);
      g.add(blade);
      const gm = this.glowMat(SO.PAL.blood);
      const glow = new T.Mesh(bladeGeo, gm); gm.userData.mesh = glow; glow.scale.set(1.1, 1.02, 0.6); g.add(glow);
      const rm = this.glowMat(0xe9e3d5);
      for (let i = 0; i < 4; i++) {
        const r = new T.Mesh(new T.BoxGeometry(0.035, 0.2, 0.04), rm); r.position.set(0, 0.55 + i * 0.27, 0); g.add(r);
        const r2 = new T.Mesh(new T.BoxGeometry(0.1, 0.025, 0.04), rm); r2.position.set(0, 0.6 + i * 0.27, 0); g.add(r2);
      }
      const edge = new T.Mesh(new T.BoxGeometry(0.012, 1.32, 0.04).translate(0, 0.76, 0), this.glowMat(0xdcd8cc)); edge.position.x = 0.15; g.add(edge);
      const guard = SO.Mat.inked(new T.BoxGeometry(0.42, 0.07, 0.1), SO.Mat.toon(0x8a857c), 0.06); guard.position.y = 0.07; g.add(guard);
      const handle = SO.Mat.inked(new T.CylinderGeometry(0.03, 0.032, 0.42, 8), SO.Mat.toon(0x1c1a19), 0.08); handle.position.y = -0.16; g.add(handle);
      const pommel = SO.Mat.inked(new T.SphereGeometry(0.045, 8, 6), SO.Mat.toon(0x8a857c), 0.1); pommel.position.y = -0.4; g.add(pommel);
      const tip = new T.Object3D(); tip.position.set(0.0, 1.7, 0); g.add(tip);
      const base = new T.Object3D(); base.position.set(0, 0.35, 0); g.add(base);
      g.userData = { tip, base, glows: [gm, rm], color: SO.WEAPONS[2].color };
      return g;
    }

    buildTrail() {
      this.trailMax = 48;
      this.samples = [];
      const n = this.trailMax * 2;
      this.tPos = new Float32Array(n * 3);
      this.tAge = new Float32Array(n);
      this.tSide = new Float32Array(n);
      const idx = [];
      for (let i = 0; i < this.trailMax - 1; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      const g = new T.BufferGeometry();
      this.aTP = new T.BufferAttribute(this.tPos, 3).setUsage(T.DynamicDrawUsage);
      this.aTA = new T.BufferAttribute(this.tAge, 1).setUsage(T.DynamicDrawUsage);
      g.setAttribute('position', this.aTP);
      g.setAttribute('age', this.aTA);
      g.setAttribute('side', new T.BufferAttribute(this.tSide, 1));
      g.setIndex(idx);
      g.setDrawRange(0, 0);
      for (let i = 0; i < this.trailMax; i++) { this.tSide[i * 2] = 0; this.tSide[i * 2 + 1] = 1; }
      this.trailMat = new T.ShaderMaterial({
        uniforms: { uColor: { value: new T.Color(0x37fff2) } },
        transparent: true, depthWrite: false, side: T.DoubleSide,
        vertexShader: `attribute float age; attribute float side; varying float vA; varying float vS; void main(){ vA = age; vS = side; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
        fragmentShader: `uniform vec3 uColor; varying float vA; varying float vS;
          void main(){ float a = pow(1.0 - vA, 1.2) * mix(0.25, 1.0, vS); if (a < 0.45) discard; gl_FragColor = vec4(uColor, 1.0); }`,
      });
      this.trail = new T.Mesh(g, this.trailMat);
      this.trail.frustumCulled = false;
      this.scene.add(this.trail);
      this.trailGeo = g;
    }

    // ---------- control ----------
    setWeapon(i) {
      if (i === this.weapon) return;
      this.weapon = i;
      this.models.forEach((m, k) => { m.visible = k === i; });
      this.clip = null;
      this.drawT = 0;
      this.pose = poseFrom(REST[i]);
      this.samples.length = 0;
    }

    play(anim, dur) {
      const c = CLIPS[anim];
      if (!c) { const cc = this.cw && this.cw.clips && this.cw.clips[anim]; if (cc) this.playCW(cc, dur, anim); return; }
      this.clip = c; this.clipName = anim; this.clipT = 0; this.clipDur = dur;
      this.from.p.copy(this.pose.p); this.from.a = this.pose.a; this.from.f = this.pose.f; this.from.roll = this.pose.roll;
      this.samples.length = 0;
    }

    // returns the character weapon's id when it has its own inspect show (for its sound)
    inspect() {
      if (this.clip) return null;
      if (this.cw && this.cw.inspect) { this.playCW(this.cw.inspect, this.cw.inspect.dur, 'cw_inspect'); return this.cwKey; }
      this.play(['i_katana', 'i_scythe', 'i_zanbato'][this.weapon], [2.2, 2.4, 2.6][this.weapon]);
      return null;
    }

    // Swap in the character's own weapon when its school owns the current slot.
    syncChar(p) {
      const def = SO.CharWeapons && SO.CharWeapons.get(p.school);
      const want = def && def.slot === this.weapon ? p.school : null;
      if (want === this.cwKey) return;
      if (this.cwS) {
        this.rollG.remove(this.cwS.right);
        if (this.cwS.left) this.leftWorld.remove(this.cwS.left);
        if (this.cw.dispose) this.cw.dispose(this, this.cwS);
      }
      this.cw = null; this.cwS = null; this.cwKey = want;
      this.models.forEach((m, k) => { m.visible = k === this.weapon; });
      if (!want) return;
      const s = def.build(this);
      if (!s) return;
      this.cw = def; this.cwS = s;
      this.rollG.add(s.right);
      if (s.left) this.leftWorld.add(s.left);
      this.models[this.weapon].visible = false;
      this.poseL = poseFrom(def.restL || REST[0]);
      this.clip = null;
    }

    // a character weapon's clip: R keys for the right hand, optional L keys for the left
    playCW(c, dur, name) {
      this.clip = { keys: c.R, trail: c.trail || [2, 2], trailL: c.trailL, cw: true };
      this.clipL = c.L || null;
      this.clipName = name; this.clipT = 0; this.clipDur = dur;
      this.from.p.copy(this.pose.p); this.from.a = this.pose.a; this.from.f = this.pose.f; this.from.roll = this.pose.roll;
      if (this.poseL) this.fromL = poseFrom({ p: this.poseL.p.toArray(), a: this.poseL.a, f: this.poseL.f, roll: this.poseL.roll });
      this.samples.length = 0;
    }

    // spline evaluation of keys from a start pose to a rest pose
    evalSpline(keys, k, from, rest, out, cache) {
      const list = cache.list || (cache.list = []);
      list.length = 0;
      list.push({ t: 0, pose: from });
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const P = cache[i] || (cache[i] = poseFrom(REST[0]));
        if (key.rest) {
          // land on the rest pose by the shortest way round after spins
          const prev = list[list.length - 1].pose;
          P.p.copy(rest.p); P.f = rest.f;
          P.a = rest.a + 2 * PI * Math.round((prev.a - rest.a) / (2 * PI));
          P.roll = rest.roll + 2 * PI * Math.round((prev.roll - rest.roll) / (2 * PI));
        } else this.keyPose(key, P);
        // spins: keep each key's angles within half a turn of the previous one unless it says so
        list.push({ t: key.t, pose: P, stop: key.stop || key.ease === 'stop', snap: key.ease === 'out' || key.snap });
      }
      if (list[list.length - 1].t < 1) {
        const prev = list[list.length - 1].pose, P = cache.end || (cache.end = poseFrom(REST[0]));
        P.p.copy(rest.p); P.f = rest.f; P.a = rest.a + 2 * PI * Math.round((prev.a - rest.a) / (2 * PI)); P.roll = rest.roll + 2 * PI * Math.round((prev.roll - rest.roll) / (2 * PI));
        list.push({ t: 1, pose: P });
      }
      return splinePose(list, k, out);
    }

    activeModel() { return this.cwS ? this.cwS.right : this.models[this.weapon]; }

    // the left blade's pose: its own inspect keys, else back to its rest
    updateLeft(dt) {
      const restP = this._restL || (this._restL = poseFrom(this.cw.restL));
      if (this.clip && this.clip.cw && this.clipL) {
        const target = this.evalSpline(this.clipL, this.clipT, this.fromL, restP, this._lT || (this._lT = poseFrom(this.cw.restL)), this._lCache || (this._lCache = {}));
        lerpPose(this.poseL, this.poseL, target, 1);
      } else {
        this.poseL.roll = wrapNear(this.poseL.roll, restP.roll);
        this.poseL.a = wrapNear(this.poseL.a, restP.a);
        lerpPose(this.poseL, this.poseL, restP, 1 - Math.exp(-12 * dt));
      }
      this.pivotL.position.copy(this.poseL.p);
      this.pivotL.quaternion.setFromUnitVectors(UP, bladeDir(this.poseL, this.dirV));
      this.rollGL.rotation.y = this.poseL.roll;
    }

    // the left blade follows the left hand: hand(now) * hand(at grip)^-1 * blade(at grip)
    placeLeft() {
      this.sway.updateMatrixWorld(true);
      const M = this.leftWorld.matrix;
      M.copy(this.rollGL.matrixWorld);
      const h = this.arms && this.arms.lHold;
      if (h) {
        const one = this._one || (this._one = new T.Vector3(1, 1, 1));
        const mg = (this._mg || (this._mg = new T.Matrix4())).compose(h.grip.p, h.grip.q, one);
        const mf = (this._mf || (this._mf = new T.Matrix4())).compose(h.final.p, h.final.q, one);
        M.premultiply(mg.invert()).premultiply(mf);
      }
      this.leftWorld.matrixWorldNeedsUpdate = true;
      this.leftWorld.updateMatrixWorld(true);
    }

    // left-hand casting gesture for a power (or blink/domain)
    cast(id) { if (this.arms) this.arms.cast(id); }

    land(v) { this.dip = Math.min(0.12, Math.abs(v) * 0.004); }
    hitKick(k) { this.kick = Math.max(this.kick, k); }

    evalClip(k) {
      if (this.clip.cw) return this.evalSpline(this.clip.keys, k, this.from, this.restPose(), this.tmpA, this._rCache || (this._rCache = {}));
      const c = this.clip, keys = c.keys;
      let prevT = 0, A = this.from;
      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (k <= key.t) {
          const B = key.rest ? this.restPose() : this.keyPose(key, this.tmpB);
          const local = (k - prevT) / Math.max(1e-4, key.t - prevT);
          return lerpPose(this.tmpA, A, B, ease(key.ease, SO.clamp(local, 0, 1)));
        }
        A = key.rest ? this.restPose() : this.keyPose(key, i % 2 ? this.tmpRA || (this.tmpRA = poseFrom(REST[0])) : this.tmpRB || (this.tmpRB = poseFrom(REST[0])));
        prevT = key.t;
      }
      return this.restPose();
    }

    keyPose(key, out) { out.p.set(key.p[0], key.p[1], key.p[2]); out.a = key.a; out.f = key.f; out.roll = key.roll; return out; }
    restPose() { if (!this._rest) this._rest = poseFrom(REST[0]); const r = this.cw && this.cw.restR ? this.cw.restR : REST[this.weapon]; this._rest.p.set(r.p[0], r.p[1], r.p[2]); this._rest.a = r.a; this._rest.f = r.f; this._rest.roll = r.roll; return this._rest; }

    update(dt, st) {
      // st: { player, look, frozen, domain, beat, time }
      const p = st.player;
      const adt = st.frozen ? 0 : dt;
      if (p.weapon !== this.weapon) this.setWeapon(p.weapon);
      this.syncChar(p);
      const W = SO.WEAPONS[this.weapon];

      let target = null;
      if (this.clip) {
        this.clipT += adt / this.clipDur;
        if (this.clipT >= 1) { this.clip = null; this.clipName = ''; }
        else target = this.evalClip(this.clipT);
      }
      if (target) {
        lerpPose(this.pose, this.pose, target, 1); // clips are authoritative while playing
      } else {
        let hold = null;
        if (p.alt && p.alt.kind === 'iaido') hold = HOLD.iaido;
        else if (p.slamming && p.meteor) hold = HOLD.meteor;
        const goal = hold ? this.keyPose(hold, this.tmpB) : this.restPose();
        const k = 1 - Math.exp(-(hold ? 18 : 12) * dt);
        // unwrap big roll/yaw spins so the return to rest is short
        this.pose.roll = wrapNear(this.pose.roll, goal.roll);
        this.pose.a = wrapNear(this.pose.a, goal.a);
        lerpPose(this.pose, this.pose, goal, k);
      }

      // Idle motion
      const sp = Math.sqrt(p.vel.x * p.vel.x + p.vel.z * p.vel.z);
      if (p.grounded && !p.sliding) this.bobT += dt * sp * 0.75;
      const bobK = p.grounded && !p.sliding ? Math.min(1, sp / 14) : 0;
      const bx = Math.sin(this.bobT) * 0.014 * bobK;
      const by = -Math.abs(Math.cos(this.bobT)) * 0.02 * bobK + Math.sin(st.time * 1.6) * 0.004;
      const look = st.look;
      this.swayV.x += (SO.clamp(-look.dx * 0.0005, -0.07, 0.07) - this.swayV.x) * Math.min(1, dt * 10);
      this.swayV.y += (SO.clamp(look.dy * 0.0005, -0.07, 0.07) - this.swayV.y) * Math.min(1, dt * 10);
      this.dip *= Math.exp(-8 * dt);
      this.kick *= Math.exp(-14 * dt);
      const tiltGoal = p.sliding ? 0.32 : 0;
      this.tilt += (tiltGoal - this.tilt) * Math.min(1, dt * 10);
      this.drawT = Math.min(1, this.drawT + dt / 0.22);
      const draw = 1 - ease('out', this.drawT);
      const airLift = p.grounded ? 0 : SO.clamp(-p.vel.y * 0.002, -0.04, 0.04);
      let jitter = 0;
      if (p.alt && p.alt.kind === 'iaido') jitter = p.alt.charge * 0.006;
      this.sway.position.set(bx + this.swayV.x + (Math.random() - 0.5) * jitter, by + this.swayV.y - this.dip - draw * 0.55 + airLift + (Math.random() - 0.5) * jitter, this.kick * 0.06);
      this.sway.rotation.set(-draw * 0.6, 0, this.tilt + this.swayV.x * 1.2);

      const scytheAway = this.weapon === 1 && p.scytheOut;
      this.models[this.weapon].visible = !scytheAway && !this.cwS;

      if (this.cwS && this.cwS.left) this.updateLeft(adt);
      this.pivot.position.copy(this.pose.p);
      this.pivot.quaternion.setFromUnitVectors(UP, bladeDir(this.pose, this.dirV));
      this.rollG.rotation.y = this.pose.roll;
      if (scytheAway) { this.pivot.position.set(0.36, -0.5, -0.6); this.pivot.quaternion.setFromUnitVectors(UP, this.dirV.set(-0.2, 0.9, -0.4).normalize()); }

      if (!this.arms && SO.Arms && SO.models && SO.models.ready && SO.models.has('player_arms')) {
        try { this.arms = new SO.Arms(this.sway, SO.models.gltf.player_arms); } catch (err) { console.warn('braços 3D indisponíveis:', err); SO.Arms = null; }
        if (this.arms) { this.fist.visible = false; this.arm.visible = false; }
      }
      if (this.arms) {
        const cwL = this.cwS && this.cwS.left;
        this.arms.update(this.sway, { pivot: this.pivot, model: this.activeModel(), weapon: this.weapon, scale: this.cwS ? 1 : this.scales[this.weapon], clip: this.clip ? this.clipName : '', hidden: scytheAway, dt: adt || dt * 0.0001, time: st.time,
          gripR: this.cwS ? this.cw.gripR : null, pivotL: cwL ? this.pivotL : null, gripL: this.cw ? this.cw.gripL : 0,
          oneHand: !!(this.cwS && this.cw.oneHand), palmR: this.cwS && this.cw.palm ? this.cw.palm(this.pose, this.cwS) : null, gripL2: this.cwS && !cwL && this.cw.gripL2 != null ? this.cw.gripL2 : null, freeClips: this.cwS ? this.cw.freeClips : null });
      }
      if (this.cwS) {
        if (this.cwS.left) this.placeLeft();
        const insp = this.clip && this.clipName === 'cw_inspect' ? this.clipT : -1;
        const c = this.clip;
        const sw = c && c.cw && this.clipName !== 'cw_inspect' ? { name: this.clipName, t: this.clipT, trail: c.trail, trailL: c.trailL } : null;
        this.cw.update(this, this.cwS, adt, { time: st.time, inspect: insp, player: p, swing: sw, trailOn: (r) => !!(sw && r && this.clipT >= r[0] && this.clipT <= r[1]) || !!(c && c.cw && this.clipName === 'cw_inspect' && r && this.clipT >= r[0] && this.clipT <= r[1]) });
      }
      // Forearm from an elbow anchor below-right to the fist
      this.sway.updateMatrixWorld(true);
      this.arm.position.copy(this.elbow);
      this.arm.lookAt(this.pivot.getWorldPosition(this.tmpHand || (this.tmpHand = new T.Vector3())));
      this.arm.scale.set(1, 1, this.elbow.distanceTo(this.pivot.position));

      // Glow
      const m = this.activeModel();
      const charge = p.alt && p.alt.kind === 'iaido' ? p.alt.charge : 0;
      // The blade drinks blood: its rim shows red on crits, while charging iaido, at high style
      // rank and during the domain. Otherwise steel and ink only.
      const bloody = p.crit > 0 || charge > 0.3 || (p.style && p.style.rank >= 4) || st.domain;
      m.userData.glows.forEach((g, i) => { if (i === 0 && g.userData.mesh) g.userData.mesh.visible = !!bloody; });
      const domainCol = bloody ? SO.PAL.blood : SO.PAL.fx;
      if (m.userData.ribbon) m.userData.ribbon.rotation.z = 0.2 + Math.sin(st.time * 6) * 0.3 + this.swayV.x * 3;

      this.updateTrail(dt, adt, domainCol);
    }

    updateTrail(dt, adt, color) {
      this.trailMat.uniforms.uColor.value.setHex(color);
      const c = this.clip;
      const m = this.activeModel();
      const active = c && !c.cw && this.clipT >= c.trail[0] && this.clipT <= c.trail[1] && m.visible;
      for (const s of this.samples) s.age += dt;
      if (active && adt > 0) {
        const tip = m.userData.tip.getWorldPosition(new T.Vector3());
        const base = m.userData.base.getWorldPosition(new T.Vector3());
        this.samples.push({ tip, base, age: 0 });
        // Densify between frames for smooth fast arcs
        if (this.samples.length >= 2) {
          const a = this.samples[this.samples.length - 2], b = this.samples[this.samples.length - 1];
          if (a.tip.distanceTo(b.tip) > 0.12) {
            const mid = { tip: a.tip.clone().lerp(b.tip, 0.5), base: a.base.clone().lerp(b.base, 0.5), age: (a.age + b.age) / 2 };
            this.samples.splice(this.samples.length - 1, 0, mid);
          }
        }
      }
      const life = 0.12;
      while (this.samples.length && (this.samples[0].age > life || this.samples.length > this.trailMax)) this.samples.shift();
      const n = this.samples.length;
      for (let i = 0; i < n; i++) {
        const s = this.samples[i];
        const k = i * 6;
        this.tPos[k] = s.base.x; this.tPos[k + 1] = s.base.y; this.tPos[k + 2] = s.base.z;
        this.tPos[k + 3] = s.tip.x; this.tPos[k + 4] = s.tip.y; this.tPos[k + 5] = s.tip.z;
        const ag = Math.min(1, s.age / life);
        this.tAge[i * 2] = ag; this.tAge[i * 2 + 1] = ag;
      }
      this.trailGeo.setDrawRange(0, Math.max(0, (n - 1) * 6));
      this.aTP.needsUpdate = true; this.aTA.needsUpdate = true;
    }
  }

  function wrapNear(a, b) {
    while (a - b > PI) a -= 2 * PI;
    while (a - b < -PI) a += 2 * PI;
    return a;
  }

  SO.Viewmodel = Viewmodel;
  SO.Viewmodel.CLIPS = CLIPS;
})(window.SO = window.SO || {});
