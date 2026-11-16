// First-person arms: the rigged "Rigged Fps Arms" mesh (J-Toastie, CC BY 3.0, via Poly Pizza;
// assets/models/player/arms.glb, untouched) recolored here and driven by analytic two-bone IK every frame. The right hand grips the
// weapon at its handle; the left hand either joins the grip (two-handed weapons) or plays a
// casting gesture for each power. Hand targets are frames: F = wrist->knuckles, B = back of hand.
(function (SO) {
  'use strict';
  const T = THREE;

  const SCALE = 1.25; // x a real forearm (0.32 m); bigger reads better in first person
  // shoulders sit below and behind the camera (sway space), out of view
  const SHOULDER = { R: new T.Vector3(0.25, -0.44, 0.12), L: new T.Vector3(-0.25, -0.44, 0.12) };
  const POLE = { R: new T.Vector3(0.9, -1, 0.4), L: new T.Vector3(-0.9, -1, 0.4) };
  // where each hand holds each weapon, along the handle axis from the pivot (weapon units)
  const GRIP = [
    { r: -0.05, l: -0.15 }, // longsword
    { r: 0.0, l: 0, staff: true }, // scythe: left hand up the (diagonal) staff, see Voxel shaft
    { r: -0.06, l: -0.18 }, // greatsword
  ];
  // clips whose motion would tangle a second hand on the handle
  const ONE_HAND = { sc_spin: 1, g_spin: 1, k_iaido: 1, i_katana: 1, i_scythe: 1, i_zanbato: 1, sc_reap: 1 };
  const FREE = { p: [-0.36, -0.62, -0.3], F: [0.25, 0.35, -1], B: [-0.7, 0.5, 0.2], curl: 0.55 };

  // Casting gestures for the left hand. Keys in sway space, t = normalized time; the base pose
  // (grip or free) is implicit at t=0 and t=1. curl: 0 open .. 1 fist; idx overrides the index.
  const G = (t, p, F, B, curl, extra) => Object.assign({ t, p, F, B, curl }, extra || {});
  const GESTURES = {
    wave: { dur: 0.42, keys: [G(0.2, [-0.14, -0.16, -0.58], [0.1, 1, -0.25], [0, 0.2, 1], 0.05, { glow: 1 }), G(0.55, [-0.12, -0.15, -0.56], [0.1, 1, -0.25], [0, 0.2, 1], 0.1, { glow: 0.6 })] },
    soulswords: { dur: 0.6, keys: [G(0.16, [-0.38, -0.12, -0.46], [0.1, 0.1, -1], [0, 1, 0.1], 0.05, { glow: 1 }), G(0.55, [-0.04, -0.1, -0.52], [0.3, 0.1, -1], [0, 1, 0.1], 0.05, { glow: 1 }), G(0.75, [-0.03, -0.12, -0.5], [0.3, 0.1, -1], [0, 1, 0.1], 0.2, { glow: 0.5 })] },
    blood: { dur: 0.55, keys: [G(0.18, [-0.26, 0.04, -0.42], [0.25, 0.7, -1], [0, 0.8, 0.6], 0.55, { glow: 1, idx: 0.5 }), G(0.48, [-0.06, -0.22, -0.5], [0.2, -0.3, -1], [0, 1, -0.2], 0.62, { glow: 1, idx: 0.6 }), G(0.7, [-0.05, -0.24, -0.48], [0.2, -0.3, -1], [0, 1, -0.2], 0.7, { glow: 0.4 })] },
    shield: { dur: 0.7, keys: [G(0.2, [-0.2, -0.1, -0.42], [0.08, 1, 0.05], [0, 0.05, 1], 0.0, { glow: 1 }), G(0.7, [-0.2, -0.1, -0.44], [0.08, 1, 0.05], [0, 0.05, 1], 0.05, { glow: 0.8 })] },
    chaos: { dur: 0.7, keys: [G(0.15, [-0.2, -0.05, -0.45], [0, 1, -0.3], [0, 0, 1], 0.45, { glow: 1 }), G(0.32, [-0.06, -0.12, -0.45], [1, 0.3, -0.3], [0, 0, 1], 0.45, { glow: 1 }), G(0.5, [-0.18, -0.22, -0.45], [0, -1, -0.3], [0, 0, 1], 0.45, { glow: 1 }), G(0.68, [-0.3, -0.1, -0.45], [-1, 0.3, -0.3], [0, 0, 1], 0.45, { glow: 1 })] },
    gravity: { dur: 0.75, keys: [G(0.2, [-0.1, -0.12, -0.52], [0.05, 1, -0.15], [0, 0.15, 1], 0.0, { glow: 1 }), G(0.5, [-0.1, -0.12, -0.55], [0.05, 1, -0.15], [0, 0.15, 1], 0.15, { glow: 1 }), G(0.68, [-0.1, -0.15, -0.46], [0.05, 1, -0.15], [0, 0.15, 1], 1.0, { glow: 1.4 })] },
    meteor: { dur: 0.7, keys: [G(0.22, [-0.22, 0.0, -0.46], [0, 1, -0.15], [0, 0.1, 1], 0.95, { glow: 1, idx: 0 }), G(0.45, [-0.22, 0.02, -0.48], [0, 1, -0.15], [0, 0.1, 1], 0.95, { glow: 1, idx: 0 }), G(0.66, [-0.1, -0.24, -0.6], [0, -0.35, -1], [0, 1, -0.3], 0.95, { glow: 1, idx: 0 })] },
    thunder: { dur: 0.6, keys: [G(0.2, [-0.24, -0.02, -0.48], [0.05, 1, -0.4], [0, 0.4, 1], 0.1, { glow: 1 }), G(0.4, [-0.24, 0.0, -0.5], [0.05, 1, -0.4], [0, 0.4, 1], 0.0, { glow: 1.4 }), G(0.6, [-0.12, -0.1, -0.55], [0.05, 0.6, -1], [0, 1, 0.5], 0.3, { glow: 0.6 })] },
    // hand seals: index (and the folded fingers) raised in front of the face
    blink: { dur: 0.36, keys: [G(0.3, [-0.17, -0.14, -0.4], [0.05, 1, 0], [-0.6, 0, 0.8], 0.95, { glow: 0.6, idx: 0 }), G(0.6, [-0.17, -0.14, -0.4], [0.05, 1, 0], [-0.6, 0, 0.8], 0.95, { glow: 0.4, idx: 0 })] },
    domain: { dur: 1.1, keys: [G(0.18, [-0.14, -0.12, -0.4], [0.05, 1, 0], [-0.6, 0, 0.8], 0.95, { glow: 1, idx: 0 }), G(0.75, [-0.14, -0.11, -0.4], [0.05, 1, 0], [-0.6, 0, 0.8], 0.95, { glow: 1.5, idx: 0 })] },
  };

  const _v = new T.Vector3(), _w = new T.Vector3(), _q = new T.Quaternion(), _m = new T.Matrix4();
  const X = new T.Vector3(), Y = new T.Vector3(), Z = new T.Vector3();

  // rotation whose +Y is y and whose +Z leans toward zRef
  function frame(y, zRef, out) {
    Y.copy(y).normalize();
    Z.copy(zRef).addScaledVector(Y, -zRef.dot(Y));
    if (Z.lengthSq() < 1e-6) Z.set(Y.y, -Y.x, 0.3).addScaledVector(Y, -0.3 * Y.z);
    Z.normalize();
    X.crossVectors(Y, Z);
    _m.makeBasis(X, Y, Z);
    return out.setFromRotationMatrix(_m);
  }
  const v3 = (a) => new T.Vector3(a[0], a[1], a[2]);
  const ease = (x) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2);

  class Arms {
    constructor(parent, gltf) {
      this.root = new T.Group();
      this.root.add(gltf.scene);
      parent.add(this.root);
      // the file is authored at an arbitrary scale: size it from the forearm bone
      this.root.updateMatrixWorld(true);
      const lowerR = gltf.scene.getObjectByName('LowerArmR001'), handR = gltf.scene.getObjectByName('HandR001');
      const raw = lowerR.getWorldPosition(new T.Vector3()).distanceTo(handR.getWorldPosition(new T.Vector3())) / parent.getWorldScale(new T.Vector3()).x;
      this.root.scale.setScalar(SCALE * 0.32 / raw);
      const mats = {
        Shirt: SO.Mat.toon(0x241519, 0x0b0507), Glove: SO.Mat.toon(0x1d1a1c, 0x070607), Skin: SO.Mat.toon(0x8c7262, 0x120c0a),
      };
      // outline push is in geometry units: ~4 mm on screen whatever the file's own scale
      let meshScale = 1;
      gltf.scene.traverse((o) => { if (o.isSkinnedMesh) meshScale = o.getWorldScale(new T.Vector3()).x / parent.getWorldScale(new T.Vector3()).x; });
      const ol = 0.004 / meshScale;
      const outline = new T.MeshLambertMaterial({ color: 0x050307, side: T.BackSide, skinning: true }); // Basic has no objectNormal
      outline.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <skinning_vertex>', '#include <skinning_vertex>\n transformed += normalize(objectNormal) * ' + ol.toFixed(6) + ';'); };
      const skinned = [];
      gltf.scene.traverse((o) => {
        if (!o.isMesh) return;
        o.frustumCulled = false;
        const m = (mats[o.material.name] || mats.Shirt).clone();
        m.skinning = !!o.isSkinnedMesh;
        o.material = m;
        if (o.isSkinnedMesh) skinned.push(o);
      });
      for (const o of skinned) {
        const ol = new T.SkinnedMesh(o.geometry, outline);
        ol.bind(o.skeleton, o.bindMatrix);
        ol.frustumCulled = false;
        o.parent.add(ol);
      }
      // a mote of the power's color held in the left palm while casting
      this.orb = new T.Mesh(new T.IcosahedronGeometry(0.035, 1), SO.Mat.glow(0xffffff));
      this.orbHalo = new T.Mesh(new T.IcosahedronGeometry(0.07, 1), SO.Mat.glow(0xffffff, 0.35));
      this.orb.add(this.orbHalo);
      this.orb.visible = false;
      parent.add(this.orb);
      this.light = new T.PointLight(0xffffff, 0, 1.2);
      parent.add(this.light);

      this.root.updateMatrixWorld(true);
      // GLTFLoader strips '.' (and []:/) from node names
      const bone = (n) => gltf.scene.getObjectByName(n.replace(/[.[\]:/]/g, ''));
      this.side = {};
      for (const [s, sfx, fsfx, tag] of [['R', '.R.001', '.001', -1], ['L', '.L', '', 1]]) {
        const a = {
          upper: bone('UpperArm' + sfx), lower: bone('LowerArm' + sfx), hand: bone('Hand' + sfx),
          sign: tag, shoulder: SHOULDER[s], pole: POLE[s],
          fingers: [
            [bone('DoubleFingersBeginning' + fsfx), bone('DoubleFingers' + sfx), bone('DoubleFingersTip' + sfx)],
            [bone('IndexBeginning' + sfx), bone('Index' + sfx), bone('IndexTip' + sfx)],
            [bone('ThumbBeginning' + sfx), bone('Thumb' + sfx), bone('ThumbTip' + sfx)],
          ],
          curl: 0, idx: 0,
          q: new T.Quaternion(), p: new T.Vector3(),
        };
        const wp = (o) => o.getWorldPosition(new T.Vector3());
        a.L1 = wp(a.upper).distanceTo(wp(a.lower));
        a.L2 = wp(a.lower).distanceTo(wp(a.hand));
        a.palm = wp(a.hand).distanceTo(wp(a.fingers[0][0]));
        // rest hand frame from the mesh itself: fingers along the bone, back of the hand from
        // the thumb (right hand: B = F x T, left: B = T x F)
        const F = new T.Vector3(0, 1, 0).applyQuaternion(a.hand.getWorldQuaternion(new T.Quaternion()));
        const Tt = wp(a.fingers[2][1]).sub(wp(a.hand));
        Tt.addScaledVector(F, -Tt.dot(F)).normalize();
        const B = s === 'R' ? new T.Vector3().crossVectors(F, Tt) : new T.Vector3().crossVectors(Tt, F);
        // each driven bone: rotation offset between its rest world rotation and the canonical frame
        const off = (o) => {
          const dir = new T.Vector3(0, 1, 0).applyQuaternion(o.getWorldQuaternion(new T.Quaternion()));
          const c = frame(dir, B, new T.Quaternion());
          return c.invert().multiply(o.getWorldQuaternion(new T.Quaternion()));
        };
        a.offUpper = off(a.upper); a.offLower = off(a.lower); a.offHand = off(a.hand);
        // finger curl axes in each finger bone's local space (curl = rotate F toward the palm)
        const C = new T.Vector3().crossVectors(B, F).normalize();
        const thumbAxis = F.clone().multiplyScalar(s === 'R' ? -1 : 1).addScaledVector(C, 0.6).normalize();
        a.restLocal = [];
        a.axes = a.fingers.map((ch, fi) => ch.map((o) => {
          a.restLocal.push(o.quaternion.clone());
          const inv = o.getWorldQuaternion(new T.Quaternion()).invert();
          return (fi === 2 ? thumbAxis : C).clone().applyQuaternion(inv).normalize();
        }));
        this.side[s] = a;
      }
      this.leftW = 0; // 0 = left hand on the weapon, 1 = free / gesturing
      this.gest = null;
      this.gestT = 0;
      this.tmpPose = { p: new T.Vector3(), q: new T.Quaternion(), curl: 0, idx: 0, glow: 0 };
      this.keyPose = { p: new T.Vector3(), q: new T.Quaternion(), curl: 0, idx: 0, glow: 0 };
      this.baseL = { p: new T.Vector3(), q: new T.Quaternion(), curl: 0, idx: 0, glow: 0 };
      this.color = new T.Color(0xffffff);
    }

    cast(id) {
      const g = GESTURES[id];
      if (!g) return;
      this.gest = g; this.gestT = 0;
      // the glow in the palm takes the school's color (E's shunpo stays pale)
      const school = SO.Schools && SO.Schools.BY_ID[String(id).split('_')[0]];
      this.color.setHex(school ? school.color : SO.PAL.fx);
    }

    // The hand frame that wraps a handle with axis A at point G, wrist on the shoulder's side.
    gripPose(a, G, A, sway, out) {
      const S = _w.copy(a.shoulder).applyMatrix4(sway.matrixWorld);
      const F = _v.subVectors(G, S);
      F.addScaledVector(A, -F.dot(A));
      if (F.lengthSq() < 1e-6) F.set(0, 0, -1);
      F.normalize();
      const B = new T.Vector3().crossVectors(F, A).multiplyScalar(a.sign < 0 ? 1 : -1);
      frame(F, B, out.q);
      // fist around the handle: the handle sits in the curled fingers, palm side of the bone line
      out.p.copy(G).addScaledVector(F, -a.palm * 1.2).addScaledVector(B, a.palm * 0.3);
      out.curl = 0.88; out.idx = 0.84; out.glow = 0;
      return out;
    }

    gestureKey(key, sway, out) {
      const sq = sway.getWorldQuaternion(_q);
      out.p.copy(v3(key.p)).applyMatrix4(sway.matrixWorld);
      frame(v3(key.F).applyQuaternion(sq), v3(key.B).applyQuaternion(sq), out.q);
      out.curl = key.curl; out.idx = key.idx != null ? key.idx : key.curl;
      out.glow = key.glow || 0;
      return out;
    }

    blendPose(out, A, B, k) {
      out.p.lerpVectors(A.p, B.p, k);
      out.q.copy(A.q).slerp(B.q, k);
      out.curl = A.curl + (B.curl - A.curl) * k;
      out.idx = A.idx + (B.idx - A.idx) * k;
      out.glow = A.glow + (B.glow - A.glow) * k;
      return out;
    }

    // st: { pivot (Object3D at the grip, +Y along the handle), model (userData.base = shaft top),
    //       weapon, scale, clip, dt, hidden, time }
    update(sway, st) {
      sway.updateMatrixWorld(true);
      const A = new T.Vector3(0, 1, 0).applyQuaternion(st.pivot.getWorldQuaternion(_q)).normalize();
      const P = st.pivot.getWorldPosition(new T.Vector3());
      const sc = st.scale || 1;
      const gr = GRIP[st.weapon] || GRIP[0];
      let GL = null;
      if (gr.staff && st.model && st.model.userData.shaft) {
        // a staff drawn at a slant in the sprite: follow the traced shaft, not the pivot's axis
        GL = st.model.userData.shaft.getWorldPosition(new T.Vector3());
        A.subVectors(GL, P).normalize();
      }
      const R = this.side.R, L = this.side.L;

      // an open palm under a floating weapon (st.palmR, a gesture-style key in sway space) or a fist on the handle
      const rPose = st.palmR ? this.gestureKey(st.palmR, sway, this.tmpPose) : this.gripPose(R, P.clone().addScaledVector(A, (st.gripR != null ? st.gripR : gr.r) * sc), A, sway, this.tmpPose);
      this.solve(R, sway, rPose);

      // left hand: grip, free, or a gesture blended on top
      let base;
      if (st.pivotL) {
        // the left hand holds its own weapon
        const AL = new T.Vector3(0, 1, 0).applyQuaternion(st.pivotL.getWorldQuaternion(_q)).normalize();
        const PL = st.pivotL.getWorldPosition(new T.Vector3()).addScaledVector(AL, st.gripL || 0);
        base = this.gripPose(L, PL, AL, sway, this.baseL);
        this.leftW = 0;
      } else {
        const free = st.hidden || ONE_HAND[st.clip] || st.oneHand || (st.freeClips && st.freeClips[st.clip]);
        this.leftW += ((free ? 1 : 0) - this.leftW) * Math.min(1, st.dt * 12);
        const lGrip = this.gripPose(L, st.gripL2 != null ? P.clone().addScaledVector(A, st.gripL2) : GL || P.clone().addScaledVector(A, gr.l * sc), A, sway, this.baseL);
        const lFree = this.gestureKey(FREE, sway, this.keyPose);
        base = this.blendPose(this.baseL, lGrip, lFree, this.leftW);
      }
      let pose = base;
      if (this.gest) {
        this.gestT += st.dt / this.gest.dur;
        if (this.gestT >= 1) this.gest = null;
        else pose = this.sampleGesture(base, sway);
      }
      this.solve(L, sway, pose);
      if (st.pivotL) {
        const h = this.lHold || (this.lHold = { grip: { p: new T.Vector3(), q: new T.Quaternion() }, final: { p: new T.Vector3(), q: new T.Quaternion() } });
        h.grip.p.copy(base.p); h.grip.q.copy(base.q); h.final.p.copy(pose.p); h.final.q.copy(pose.q);
      } else this.lHold = null;

      // the palm mote and its light follow the casting hand
      const glow = pose.glow || 0;
      this.orb.visible = glow > 0.05;
      if (this.orb.visible) {
        const hand = L.hand;
        hand.getWorldPosition(this.orb.position);
        const F = _v.set(0, 1, 0).applyQuaternion(pose.q), B = _w.set(0, 0, 1).applyQuaternion(pose.q);
        this.orb.position.addScaledVector(F, L.palm * 0.6).addScaledVector(B, -L.palm * 0.55);
        this.orb.position.applyMatrix4(_m.copy(sway.matrixWorld).invert());
        const pulse = 1 + Math.sin(st.time * 40) * 0.12;
        this.orb.scale.setScalar(Math.min(1.5, glow) * pulse);
        this.orb.material.color.copy(this.color).lerp(new T.Color(0xffffff), 0.55);
        this.orbHalo.material.color.copy(this.color);
      }
      this.light.position.copy(this.orb.position);
      this.light.color.copy(this.color);
      this.light.intensity = Math.min(2.2, glow * 1.6);
    }

    sampleGesture(base, sway) {
      const keys = this.gest.keys, t = this.gestT;
      let prevT = 0, prev = base;
      const kp = this._k0 || (this._k0 = { p: new T.Vector3(), q: new T.Quaternion() });
      const kn = this._k1 || (this._k1 = { p: new T.Vector3(), q: new T.Quaternion() });
      for (let i = 0; i <= keys.length; i++) {
        const nextT = i < keys.length ? keys[i].t : 1;
        const next = i < keys.length ? this.gestureKey(keys[i], sway, i % 2 ? kn : kp) : base;
        if (t <= nextT) {
          const k = ease(SO.clamp((t - prevT) / Math.max(1e-4, nextT - prevT), 0, 1));
          return this.blendPose(this.outPose || (this.outPose = { p: new T.Vector3(), q: new T.Quaternion() }), prev, next, k);
        }
        // keep the previous key alive in its own buffer before the next one overwrites it
        prev = this.blendPose(i % 2 ? (this._pa || (this._pa = { p: new T.Vector3(), q: new T.Quaternion() })) : (this._pb || (this._pb = { p: new T.Vector3(), q: new T.Quaternion() })), next, next, 0);
        prevT = nextT;
      }
      return base;
    }

    // Two-bone IK from the shoulder to the wrist target, then the hand frame and finger curl.
    solve(a, sway, pose) {
      const S = new T.Vector3().copy(a.shoulder).applyMatrix4(sway.matrixWorld);
      const W = pose.p;
      const L1 = a.L1, L2 = a.L2;
      const d0 = S.distanceTo(W);
      // out of reach: the shoulder follows (it is off-screen) instead of the hand letting go
      if (d0 > (L1 + L2) * 0.985) {
        S.lerp(W, Math.min(0.4, d0 - (L1 + L2) * 0.985) / d0);
        // ...but keep the sleeve's open end below the bottom of the view (sway-space frustum)
        const sl = _v.copy(S).applyMatrix4(_m.copy(sway.matrixWorld).invert());
        if (sl.z < 0) { sl.y = Math.min(sl.y, sl.z * 0.6 - 0.18); S.copy(sl.applyMatrix4(sway.matrixWorld)); }
      }
      const dir = new T.Vector3().subVectors(W, S);
      const d = SO.clamp(dir.length(), Math.abs(L1 - L2) + 1e-3, (L1 + L2) * 0.999);
      dir.normalize();
      const along = (L1 * L1 - L2 * L2 + d * d) / (2 * d);
      const h = Math.sqrt(Math.max(0, L1 * L1 - along * along));
      const pole = a.pole.clone().transformDirection(sway.matrixWorld);
      pole.addScaledVector(dir, -pole.dot(dir)).normalize();
      const E = S.clone().addScaledVector(dir, along).addScaledVector(pole, h);
      const handB = _v.set(0, 0, 1).applyQuaternion(pose.q);

      // upper arm: place the shoulder bone, aim it at the elbow
      const par = a.upper.parent;
      par.updateMatrixWorld(true);
      a.upper.position.copy(par.worldToLocal(S.clone()));
      const segB = (segDir) => {
        const b = handB.clone().addScaledVector(segDir, -handB.dot(segDir));
        return b.lengthSq() > 1e-4 ? b : pole.clone().negate();
      };
      const dU = new T.Vector3().subVectors(E, S).normalize();
      this.setWorldQ(a.upper, frame(dU, segB(dU).lerp(pole.clone().negate(), 0.5), new T.Quaternion()).multiply(a.offUpper));
      const dL = new T.Vector3().subVectors(W, E).normalize();
      this.setWorldQ(a.lower, frame(dL, segB(dL), new T.Quaternion()).multiply(a.offLower));
      this.setWorldQ(a.hand, new T.Quaternion().copy(pose.q).multiply(a.offHand));

      // fingers: [middle-ring-pinky, index, thumb] x [base, mid, tip]
      const gains = [[1.5, 1.7, 1.2], [1.45, 1.6, 1.1], [0.35, 0.7, 0.6]];
      let n = 0;
      for (let f = 0; f < 3; f++) {
        const c = f === 1 ? pose.idx : f === 2 ? Math.min(1, pose.curl * 0.9) : pose.curl;
        for (let j = 0; j < 3; j++) {
          const o = a.fingers[f][j];
          if (!o) { n++; continue; }
          o.quaternion.copy(a.restLocal[n]).multiply(_q.setFromAxisAngle(a.axes[f][j], c * gains[f][j]));
          n++;
        }
      }
      a.hand.updateMatrixWorld(true);
    }

    setWorldQ(o, q) {
      o.parent.updateMatrixWorld(true);
      o.quaternion.copy(o.parent.getWorldQuaternion(_q).invert().multiply(q));
      o.updateMatrixWorld(true);
    }
  }

  SO.Arms = Arms;
  SO.Arms.GESTURES = GESTURES;
})(window.SO = window.SO || {});
