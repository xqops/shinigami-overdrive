// Entity views: yokai built from primitives in ink (black silhouettes, white eyes, red wounds;
// see docs/ART.md), plus projectile, hazard and remote-player views. Reads world state only and
// interpolates between ticks, so it works the same with a local World or server snapshots.
(function (SO) {
  'use strict';
  const T = THREE;
  const M = () => SO.Mat;
  const UPV = new T.Vector3(0, 1, 0);
  const P = () => SO.PAL;

  // Shared materials. Body materials are cloned per enemy so hit flashes stay per-instance.
  let MATS = null;
  function mats() {
    if (MATS) return MATS;
    MATS = {
      ink: () => M().toon(0x2c2830),
      bone: () => M().toon(0xe4ded0),
      eye: new T.MeshBasicMaterial({ color: 0xffffff }),
      red: new T.MeshBasicMaterial({ color: P().blood }),
      steel: new T.MeshBasicMaterial({ color: P().steel }),
    };
    return MATS;
  }

  // Helper: inked part attached to a parent, its material registered for hit flashes.
  function maker(root, list) {
    return function part(geom, mat, x, y, z, parent, ink) {
      const g = ink === false ? new T.Mesh(geom, mat) : M().inked(geom, mat, ink || 0.07);
      g.position.set(x || 0, y || 0, z || 0);
      (parent || root).add(g);
      if (mat.emissive) list.push(mat);
      return g;
    };
  }
  function limb(len, r0, r1) { return new T.CylinderGeometry(r1, r0, len, 6).translate(0, -len / 2, 0); }
  function pivot(parent, x, y, z) { const g = new T.Group(); g.position.set(x, y, z); parent.add(g); return g; }

  const BUILD = {
    // Gaki: starving ghost. Hunched, swollen belly, arms that drag on the ground.
    husk() {
      const root = new T.Group(), inner = new T.Group(); root.add(inner);
      const list = [], m = mats(), body = m.ink(), part = maker(inner, list);
      const hip = pivot(inner, 0, 0.95, 0);
      const torso = part(new T.CylinderGeometry(0.16, 0.26, 0.75, 7).translate(0, 0.37, 0), body, 0, 0, 0, hip);
      torso.rotation.x = 0.55;
      part(new T.SphereGeometry(0.3, 8, 6), body, 0, 0.12, 0.16, hip);
      const neck = pivot(hip, 0, 0.62, 0.38);
      const head = part(new T.SphereGeometry(0.21, 8, 6), body, 0, 0.02, 0.12, neck);
      head.scale.set(1, 1.15, 1.05);
      part(new T.SphereGeometry(0.045, 5, 4), m.eye, 0.09, 0.06, 0.3, neck, false);
      part(new T.SphereGeometry(0.035, 5, 4), m.eye, -0.08, 0.08, 0.3, neck, false);
      const jaw = pivot(neck, 0, -0.08, 0.2);
      part(new T.BoxGeometry(0.2, 0.08, 0.16), m.red, 0, -0.02, 0.02, jaw, false);
      for (let i = 0; i < 5; i++) {
        const h = part(new T.BoxGeometry(0.025, 0.4 + (i % 2) * 0.2, 0.025).translate(0, -0.2, 0), body, -0.12 + i * 0.06, 0.18, 0.02, neck, false);
        h.rotation.x = -0.3;
      }
      const arms = [];
      for (const s of [-1, 1]) {
        const sh = pivot(hip, s * 0.3, 0.55, 0.3);
        part(limb(0.62, 0.065, 0.05), body, 0, 0, 0, sh);
        const el = pivot(sh, 0, -0.62, 0);
        part(limb(0.66, 0.05, 0.035), body, 0, 0, 0, el);
        for (let f = 0; f < 3; f++) {
          const c = part(new T.ConeGeometry(0.025, 0.24, 4).translate(0, -0.12, 0), m.bone, (f - 1) * 0.04, -0.66, 0, el, false);
          c.rotation.z = (f - 1) * 0.2;
        }
        arms.push({ sh, el, s });
      }
      const legs = [];
      for (const s of [-1, 1]) {
        const th = pivot(hip, s * 0.14, 0, 0);
        part(limb(0.5, 0.07, 0.05), body, 0, 0, 0, th);
        const kn = pivot(th, 0, -0.5, 0);
        part(limb(0.48, 0.05, 0.04), body, 0, 0, 0, kn);
        legs.push({ th, kn, s });
      }
      return {
        root, inner, mats: list, headY: 1.9, color: P().ink, ground: true,
        animate(e, t, v) {
          const sp = Math.min(1, Math.sqrt(v.x * v.x + v.z * v.z) / 10);
          const ph = t * 13;
          legs.forEach((l, i) => { const k = Math.sin(ph + i * Math.PI); l.th.rotation.x = k * 0.8 * sp - 0.2; l.kn.rotation.x = Math.max(0, -k) * 1.1 * sp + 0.25; });
          hip.position.y = 0.9 + Math.abs(Math.sin(ph)) * 0.06 * sp;
          neck.rotation.z = Math.sin(t * 3.1) * 0.15;
          jaw.rotation.x = 0.3 + Math.sin(t * 9) * 0.2;
          arms.forEach((a, i) => {
            if (e.s === 'windup') { a.sh.rotation.set(-2.7, 0, a.s * 0.5); a.el.rotation.x = -0.8; jaw.rotation.x = 0.9; }
            else if (e.s === 'attack') { a.sh.rotation.set(0.6, 0, -a.s * 0.3); a.el.rotation.x = -0.2; }
            else if (e.stun > 0) { a.sh.rotation.set(-0.6, 0, a.s * 0.9); a.el.rotation.x = -0.4; neck.rotation.x = -0.6; }
            else { a.sh.rotation.set(0.35 + Math.sin(ph + i * Math.PI) * 0.5 * sp, 0, a.s * 0.12); a.el.rotation.x = -0.25; neck.rotation.x = 0; }
          });
        },
      };
    },

    // Nukekubi: a flying severed head. White face, ink hair streaming behind, a red raw neck.
    caster() {
      const root = new T.Group(), inner = new T.Group(); root.add(inner);
      const list = [], m = mats(), part = maker(inner, list);
      const headG = pivot(inner, 0, 0.9, 0);
      const face = part(new T.SphereGeometry(0.42, 10, 8), m.bone(), 0, 0, 0, headG);
      face.scale.set(0.9, 1.1, 0.95);
      part(new T.SphereGeometry(0.46, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), m.ink(), 0, 0.06, -0.06, headG).rotation.x = -0.5;
      const eyes = [];
      for (const s of [-1, 1]) {
        const e = part(new T.BoxGeometry(0.16, 0.05, 0.02), mats().ink(), s * 0.15, 0.08, 0.38, headG, false);
        e.rotation.z = s * -0.25;
        eyes.push(e);
      }
      const irisMat = new T.MeshBasicMaterial({ color: P().ink });
      const irises = [-1, 1].map((s) => part(new T.SphereGeometry(0.035, 5, 4), irisMat, s * 0.15, 0.08, 0.4, headG, false));
      const mouth = part(new T.BoxGeometry(0.2, 0.06, 0.04), m.red, 0, -0.2, 0.36, headG, false);
      part(new T.CylinderGeometry(0.13, 0.1, 0.25, 7), m.red, 0, -0.5, -0.02, headG, false);
      const hair = [];
      for (let i = 0; i < 9; i++) {
        const a = (i / 8 - 0.5) * 2.2;
        const strand = pivot(headG, Math.sin(a) * 0.32, 0.15, -0.3 + Math.abs(Math.sin(a)) * 0.1);
        part(new T.BoxGeometry(0.06, 1.1 + (i % 3) * 0.35, 0.04).translate(0, -0.55, 0), m.ink(), 0, 0, 0, strand, false);
        hair.push({ strand, a, i });
      }
      return {
        root, inner, mats: list, headY: 1.7, color: P().blood,
        animate(e, t) {
          headG.position.y = 0.9 + Math.sin(t * 2) * 0.12;
          headG.rotation.z = Math.sin(t * 1.3) * 0.15;
          hair.forEach((h) => { h.strand.rotation.x = 0.9 + Math.sin(t * 5 + h.i) * 0.25; h.strand.rotation.z = h.a * 0.3 + Math.sin(t * 3 + h.i * 1.7) * 0.15; });
          const w = e.s === 'windup';
          irisMat.color.setHex(w ? P().blood : P().ink);
          irises.forEach((ir) => ir.scale.setScalar(w ? 1.8 : 1));
          mouth.scale.y = w ? 3 + Math.sin(t * 40) : 1 + Math.sin(t * 6) * 0.3;
        },
      };
    },

    // Karasu-tengu: crow-headed demon with wide feathered wings.
    tengu() {
      const root = new T.Group(), inner = new T.Group(); root.add(inner);
      const list = [], m = mats(), body = m.ink(), part = maker(inner, list);
      const torso = part(new T.CylinderGeometry(0.2, 0.32, 0.8, 7), body, 0, 0.9, 0);
      torso.rotation.x = 0.3;
      const head = pivot(inner, 0, 1.45, 0.12);
      part(new T.SphereGeometry(0.2, 8, 6), body, 0, 0, 0, head);
      const beak = part(new T.ConeGeometry(0.08, 0.42, 5).rotateX(Math.PI / 2), body, 0, -0.04, 0.3, head);
      beak.scale.y = 0.7;
      part(new T.SphereGeometry(0.04, 5, 4), m.eye, 0.1, 0.05, 0.14, head, false);
      part(new T.SphereGeometry(0.04, 5, 4), m.eye, -0.1, 0.05, 0.14, head, false);
      const wings = [];
      for (const s of [-1, 1]) {
        const w = pivot(inner, s * 0.22, 1.2, -0.1);
        for (let f = 0; f < 6; f++) {
          const len = 0.9 + f * 0.18;
          const feather = part(new T.BoxGeometry(len, 0.03, 0.16).translate(s * len / 2, 0, 0), body, 0, 0, 0, w, f < 3 ? 0.08 : false);
          feather.rotation.y = s * (f * 0.13 - 0.25);
          feather.rotation.z = s * (-f * 0.06);
        }
        wings.push({ w, s });
      }
      const legs = [-1, 1].map((s) => {
        const l = pivot(inner, s * 0.12, 0.55, 0);
        part(limb(0.5, 0.05, 0.03), body, 0, 0, 0, l);
        for (let f = 0; f < 3; f++) part(new T.ConeGeometry(0.02, 0.16, 4).rotateX(Math.PI / 2), m.bone(), (f - 1) * 0.05, -0.5, 0.06, l, false);
        return l;
      });
      return {
        root, inner, mats: list, headY: 1.9, color: P().ink,
        animate(e, t) {
          const fast = e.s === 'windup' ? 3 : 1;
          const flap = e.s === 'dive' ? -0.4 : Math.sin(t * 8 * fast) * 0.7;
          wings.forEach((w) => { w.w.rotation.z = w.s * flap; w.w.rotation.y = e.s === 'dive' ? w.s * 0.9 : 0; });
          inner.rotation.x = e.s === 'dive' ? 1.0 : e.s === 'crashed' ? -1.3 : 0.1;
          head.rotation.x = e.s === 'windup' ? -0.5 : Math.sin(t * 4) * 0.1;
          legs.forEach((l, i) => { l.rotation.x = e.s === 'dive' ? -1.2 : Math.sin(t * 3 + i) * 0.2; });
        },
      };
    },

    // Oni of the Hannya: a giant holding a white Hannya mask as a shield, kanabo in the other hand.
    brute() {
      const root = new T.Group(), inner = new T.Group(); root.add(inner);
      const list = [], m = mats(), body = m.ink(), part = maker(inner, list);
      const torso = part(new T.CylinderGeometry(0.85, 0.65, 1.8, 8), body, 0, 2.3, 0);
      torso.scale.z = 0.75;
      part(new T.BoxGeometry(1.5, 0.5, 1.1), m.ink(), 0, 1.35, 0);
      const head = pivot(inner, 0, 3.45, 0.1);
      part(new T.BoxGeometry(0.75, 0.7, 0.7), body, 0, 0, 0, head);
      for (const s of [-1, 1]) {
        const horn = part(new T.ConeGeometry(0.11, 0.65, 5), m.bone(), s * 0.27, 0.55, 0, head);
        horn.rotation.z = -s * 0.4;
        part(new T.BoxGeometry(0.16, 0.06, 0.04), m.eye, s * 0.17, 0.08, 0.36, head, false);
      }
      part(new T.BoxGeometry(0.4, 0.07, 0.04), m.red, 0, -0.18, 0.36, head, false);
      // Left arm: the Hannya mask shield, held in front of the chest.
      const shL = pivot(inner, 0.95, 2.9, 0.1);
      part(limb(1.2, 0.26, 0.22), body, 0, 0, 0, shL);
      const mask = pivot(shL, -0.55, -1.0, 0.75);
      const plate = part(new T.SphereGeometry(0.85, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.55).rotateX(Math.PI / 2), m.bone(), 0, 0, 0, mask, 0.05);
      plate.scale.set(1, 1.25, 0.45);
      for (const s of [-1, 1]) {
        const hh = part(new T.ConeGeometry(0.12, 0.7, 5), m.bone(), s * 0.5, 0.95, 0, mask);
        hh.rotation.z = -s * 0.6;
        const brow = part(new T.BoxGeometry(0.42, 0.08, 0.06), mats().ink(), s * 0.26, 0.3, 0.4, mask, false);
        brow.rotation.z = s * 0.45;
        part(new T.SphereGeometry(0.08, 6, 5), m.red, s * 0.26, 0.15, 0.38, mask, false);
      }
      const grin = part(new T.BoxGeometry(0.72, 0.18, 0.06), m.red, 0, -0.42, 0.36, mask, false);
      for (let i = 0; i < 6; i++) part(new T.ConeGeometry(0.035, 0.12, 3).rotateX(Math.PI), m.eye, -0.28 + i * 0.11, -0.36, 0.4, mask, false);
      // Right arm: kanabo
      const shR = pivot(inner, -0.95, 2.9, 0);
      part(limb(1.2, 0.26, 0.22), body, 0, 0, 0, shR);
      const club = pivot(shR, 0, -1.25, 0.15);
      part(new T.CylinderGeometry(0.22, 0.12, 2.3, 8).translate(0, 0, 0).rotateX(Math.PI / 2), body, 0, 0, 1.0, club);
      for (let i = 0; i < 8; i++) part(new T.ConeGeometry(0.06, 0.18, 4), m.bone(), Math.cos(i) * 0.2, Math.sin(i) * 0.2, 1.3 + (i % 4) * 0.22, club, false).rotation.set(Math.PI / 2, 0, i);
      const legs = [-1, 1].map((s) => { const l = pivot(inner, s * 0.45, 1.2, 0); part(limb(1.2, 0.3, 0.26), body, 0, 0, 0, l); return l; });
      const bar = hpBar(2.4); bar.root.position.y = 4.8; root.add(bar.root);
      return {
        root, inner, mats: list, headY: 4.6, color: P().ink, ground: true, bar,
        animate(e, t, v) {
          const sp = Math.min(1, Math.sqrt(v.x * v.x + v.z * v.z) / 6);
          legs.forEach((l, i) => { l.rotation.x = Math.sin(t * 6 + i * Math.PI) * 0.5 * sp; });
          inner.position.y = Math.abs(Math.sin(t * 6)) * 0.12 * sp;
          shL.rotation.x = e.stun > 0 ? 0.6 : -0.9;
          shL.rotation.z = e.stun > 0 ? -0.8 : 0;
          if (e.s === 'windup' || e.s === 'leapWind') { shR.rotation.x = -2.9; head.rotation.x = -0.3; }
          else if (e.s === 'recover') { shR.rotation.x = 0.5; head.rotation.x = 0.2; }
          else if (e.s === 'leap') { shR.rotation.x = -2.6; }
          else { shR.rotation.x = -0.3 + Math.sin(t * 6) * 0.25 * sp; head.rotation.x = 0; }
          grin.scale.y = 1 + Math.sin(t * 2) * 0.15;
        },
      };
    },

    // Ashura: three white faces, six arms with white blades, an ensō halo, ink flames below.
    ashura() {
      const root = new T.Group(), inner = new T.Group(); root.add(inner);
      const list = [], m = mats(), body = m.ink(), part = maker(inner, list);
      part(new T.CylinderGeometry(1.0, 0.7, 2.6, 10), body, 0, 3.4, 0);
      const flames = [];
      for (let i = 0; i < 7; i++) {
        const f = part(new T.ConeGeometry(0.4, 2.4, 5).rotateX(Math.PI), body, Math.cos(i) * 0.5, 1.4, Math.sin(i) * 0.5, inner, false);
        flames.push(f);
      }
      const head = pivot(inner, 0, 5.2, 0);
      part(new T.BoxGeometry(0.9, 1.0, 0.9), body, 0, 0, 0, head);
      const eyeMats = [];
      for (let i = 0; i < 3; i++) {
        const f = pivot(head, 0, 0, 0); f.rotation.y = i * Math.PI * 2 / 3;
        part(new T.BoxGeometry(0.72, 0.82, 0.08), m.bone(), 0, 0, 0.47, f);
        const em = new T.MeshBasicMaterial({ color: P().blood });
        eyeMats.push(em);
        for (const s of [-1, 1]) { const e = part(new T.BoxGeometry(0.2, 0.06, 0.04), em, s * 0.18, 0.12, 0.52, f, false); e.rotation.z = s * 0.3; }
        part(new T.SphereGeometry(0.06, 5, 4), em, 0, 0.3, 0.52, f, false);
        part(new T.BoxGeometry(0.3, 0.05, 0.04), mats().ink(), 0, -0.2, 0.52, f, false);
      }
      const arms = [];
      for (let i = 0; i < 6; i++) {
        const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
        const pv = pivot(inner, side * 1.0, 4.3 - row * 0.65, 0);
        part(limb(1.9, 0.18, 0.14), body, 0, 0, 0, pv);
        const blade = part(new T.BoxGeometry(0.06, 1.7, 0.22).translate(0, -0.85, 0), m.steel, 0, -1.9, 0.1, pv);
        blade.rotation.x = 0.4;
        arms.push({ pv, side, row });
      }
      const halo = pivot(inner, 0, 5.2, -0.9);
      halo.add(new T.Mesh(new T.TorusGeometry(2.3, 0.16, 6, 48, Math.PI * 1.8), M().glow(P().blood)));
      const bar = null;
      return {
        root, inner, mats: list, headY: 6.6, color: P().ink, boss: true, bar,
        animate(e, t) {
          halo.rotation.z = t * 0.5;
          flames.forEach((f, i) => { f.scale.y = 1 + Math.sin(t * 9 + i) * 0.2; });
          head.rotation.y = Math.sin(t * 0.5) * 0.4;
          const wind = e.s === 'windup';
          arms.forEach((a, i) => {
            a.pv.rotation.z = a.side * (0.6 + a.row * 0.35 + Math.sin(t * 2 + i) * 0.25 + (wind ? 0.9 : 0));
            a.pv.rotation.x = Math.sin(t * 1.7 + i * 1.3) * 0.5 - (wind ? 1.2 : 0);
          });
          eyeMats.forEach((em) => em.color.setHex(wind && Math.sin(t * 30) > 0 ? 0xffffff : P().blood));
        },
      };
    },
  };

  // ---------- billboard sprites from the author's enemy sheet (assets/sprites/enemies) ----------
  // Each enemy type uses one drawing. It always faces the camera (like Doom/Cultic), mirrors
  // when walking left, and is animated in code: bob, lean, squash before a strike, stretch on
  // the strike, shake when stunned, rising out of the floor on spawn, and a tint for hits/windups.
  const SPRITES = {
    husk: { name: 'enemies/soldado_sombrio', h: 2.3 },
    caster: { name: 'enemies/lacaio_caos', h: 2.3 },
    tengu: { name: 'enemies/gargula', h: 2.4 },
    brute: { name: 'enemies/esqueleto_guerreiro', h: 4.8 },
    ashura: { name: 'enemies/tita_sombras', h: 7.5 },
  };
  const texCache = {};
  function spriteTex(name) {
    if (texCache[name]) return texCache[name];
    const s = SO.Voxel && SO.Voxel.sprite(name);
    if (!s) return null;
    const tex = new T.DataTexture(s.data, s.w, s.h, T.RGBAFormat);
    tex.magFilter = T.NearestFilter; tex.minFilter = T.NearestFilter; tex.generateMipmaps = false;
    tex.needsUpdate = true;
    return (texCache[name] = { tex, w: s.w, h: s.h, s });
  }

  function billboardMaterial(tex, R) {
    return new T.ShaderMaterial({
      uniforms: { uMap: { value: tex }, uTint: { value: new T.Color(1, 1, 1) }, uTintAmt: { value: 0 }, uFogColor: R.shared.uFogColor, uFogDensity: R.shared.uFogDensity },
      side: T.DoubleSide,
      vertexShader: `varying vec2 vUv; varying vec3 vW;
        void main(){ vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`,
      fragmentShader: `uniform sampler2D uMap; uniform vec3 uTint; uniform float uTintAmt; uniform vec3 uFogColor; uniform float uFogDensity;
        varying vec2 vUv; varying vec3 vW;
        void main(){
          if (vW.y < -0.02) discard; // hidden while rising out of the floor
          vec4 t = texture2D(uMap, vec2(vUv.x, 1.0 - vUv.y));
          if (t.a < 0.5) discard;
          vec3 col = mix(t.rgb * 1.25, uTint, uTintAmt);
          float d = length(vW - cameraPosition);
          col = mix(col, uFogColor, clamp(1.0 - exp(-pow(d * uFogDensity, 1.5)), 0.0, 1.0));
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
  }

  function buildBillboard(type, R) {
    const cfg = SPRITES[type];
    const st = cfg && spriteTex(cfg.name);
    if (!st) return null;
    const def = SO.Enemies.DEFS[type];
    const root = new T.Group(), inner = new T.Group(); root.add(inner);
    const H = cfg.h, W = H * st.w / st.h;
    const mat = billboardMaterial(st.tex, R);
    const plane = new T.Mesh(new T.PlaneGeometry(W, H).translate(0, H / 2, 0), mat);
    inner.add(plane);
    if (def.ground) {
      const shadow = new T.Mesh(new T.CircleGeometry(W * 0.35, 16).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.55, depthWrite: false }));
      shadow.position.y = 0.03;
      root.add(shadow);
    }
    const v = { root, inner, plane, mat, mats: [], headY: H * 0.9, color: P().blood, ground: !!def.ground, billboard: true, sprite: cfg.name, spriteW: W, spriteH: H, type, flip: 1 };
    if (type === 'brute') { v.bar = hpBar(2.4); v.bar.root.position.y = H + 0.3; root.add(v.bar.root); }
    v.animate = (e, t, vel) => {
      const sp = Math.min(1, Math.sqrt(vel.x * vel.x + vel.z * vel.z) / Math.max(4, def.speed));
      let sx = 1, sy = 1, lean = 0, lift = 0, fwd = 0;
      if (def.ground) { lift = Math.abs(Math.sin(t * 9)) * 0.1 * sp; lean = Math.sin(t * 9) * 0.06 * sp; }
      else { lift = Math.sin(t * 2.2) * 0.15; lean = Math.sin(t * 1.3) * 0.05; }
      if (e.s === 'windup' || e.s === 'leapWind') { const k = Math.min(1, e.st / 0.4); sx = 1 + 0.12 * k; sy = 1 - 0.1 * k; lean = -0.08 * k; }
      else if (e.s === 'attack' || e.s === 'dive') { sx = 0.9; sy = 1.12; fwd = 0.5; }
      else if (e.s === 'leap') { sy = 1.1; sx = 0.92; }
      else if (e.s === 'crashed') { lean = 1.35; lift = -H * 0.15; }
      if (e.stun > 0) { lean += Math.sin(t * 50) * 0.08; }
      if (e.g === false && def.ground && e.s !== 'leap') lean += Math.sin(t * 14) * 0.25; // juggled
      inner.scale.set(sx * v.flip, sy, 1);
      inner.rotation.z = lean;
      inner.position.set(0, lift, fwd);
    };
    return v;
  }

  // ---------- rigged 3D enemies (src/render/models.js) ----------
  // Which model each sim type uses; husks alternate between two designs for variety.
  const MODELS = {
    husk: [{ name: 'soldado_sombrio', h: 2.1 }, { name: 'demonio_impuro', h: 2.3 }],
    caster: [{ name: 'arqueiro_espectral', h: 2.0 }],
    tengu: [{ name: 'gargula', h: 2.2 }],
    brute: [{ name: 'esqueleto_guerreiro', h: 4.4 }],
  };
  const WINDUP = { husk: 0.42, caster: 0.55, tengu: 0.45, brute: 0.75 };

  function buildModel3D(e) {
    const opts = MODELS[e.etype];
    if (!opts || !SO.models || !SO.models.ready) return null;
    const pick = opts[e.id % 3 === 0 && opts.length > 1 ? 1 : 0];
    if (!SO.models.has(pick.name)) return null;
    const def = SO.Enemies.DEFS[e.etype];
    const ctl = SO.models.instance(pick.name, pick.h);
    const root = new T.Group(), inner = new T.Group();
    root.add(inner); inner.add(ctl.root);
    const v = { root, inner, ctl, mats: [], model3d: true, headY: pick.h * 0.95, color: P().blood, ground: !!def.ground, type: e.etype, prevStun: 0, force: 0 };
    if (e.etype === 'brute') { v.bar = hpBar(2.4); v.bar.root.position.y = pick.h + 0.3; root.add(v.bar.root); }
    v.animate = (st, t, vel, now) => {
      const c = v.ctl;
      const sp = Math.sqrt(vel.x * vel.x + vel.z * vel.z);
      const fresh = st.stun > v.prevStun + 0.05;
      v.prevStun = st.stun;
      if (now < v.force) return;
      if (fresh && e.etype !== 'brute') { c.play('Hit', { once: true, restart: true, duration: 0.32, fade: 0.05 }); v.force = now + 0.28; return; }
      if (st.stun > 0 && e.etype === 'brute') { c.play('Hit', { once: true, duration: 0.6 }); return; }
      if (st.s === 'windup' || st.s === 'leapWind') c.play('Windup', { once: true, duration: WINDUP[e.etype] || 0.5 });
      else if (st.s === 'attack' || st.s === 'dive' || st.s === 'leap') c.play('Attack', { once: true, duration: 0.4 });
      else if (st.s === 'crashed') c.play('Death', { once: true, duration: 0.5 });
      else if (def.ground && sp > 0.8) c.play('Walk', { speed: SO.clamp(sp / 4, 0.7, 2.2) });
      else c.play('Idle');
    };
    return v;
  }

  function hpBar(w) {
    const root = new T.Group();
    const bg = new T.Mesh(new T.PlaneGeometry(w, 0.18), new T.MeshBasicMaterial({ color: P().ink, depthTest: false }));
    const fg = new T.Mesh(new T.PlaneGeometry(w - 0.06, 0.1), new T.MeshBasicMaterial({ color: P().blood, depthTest: false }));
    fg.position.z = 0.01;
    bg.renderOrder = 10; fg.renderOrder = 11;
    root.add(bg); root.add(fg);
    return { root, fg, w, set(k) { fg.scale.x = Math.max(0.001, k); fg.position.x = -(1 - k) * (w - 0.06) / 2; } };
  }

  // ---------- projectiles ----------
  function buildProjectile(R, q) {
    const root = new T.Group();
    const v = { root, kind: q.kind };
    if (q.kind === 'orb') {
      const shell = M().inked(new T.SphereGeometry(q.radius * 1.2, 10, 8), new T.MeshBasicMaterial({ color: 0xffffff }), 0.18);
      const core = new T.Mesh(new T.SphereGeometry(q.radius * 0.55, 8, 6), new T.MeshBasicMaterial({ color: P().blood }));
      root.add(shell); root.add(core);
      v.shell = shell.userData.mesh;
    } else if (q.kind === 'spear') {
      const g = new T.Group(); root.add(g);
      const shaft = M().inked(new T.OctahedronGeometry(0.4, 0), new T.MeshBasicMaterial({ color: P().bone }), 0.1);
      shaft.scale.set(0.45, 0.45, 2.6);
      const tip = new T.Mesh(new T.ConeGeometry(0.16, 0.5, 4).rotateX(Math.PI / 2), new T.MeshBasicMaterial({ color: P().blood }));
      tip.position.z = 1.1;
      g.add(shaft); g.add(tip);
      v.shell = shaft.userData.mesh;
    } else if (q.kind === 'wave') {
      const g = new T.Group(); root.add(g);
      const m = new T.Mesh(R.fx.crescentGeo, M().crescent());
      const u = m.material.uniforms;
      u.uProg.value = 1.02; u.uWidth.value = 1.1; u.uColor.value.setHex(P().fx); u.uCore.value.setHex(P().blood); u.uSeed.value = Math.random() * 50;
      m.rotation.y = Math.PI;
      m.scale.setScalar(q.radius * 1.1);
      const roll = new T.Group(); roll.rotation.z = (q.roll || 0) * Math.PI / 180; roll.add(m); g.add(roll);
      v.mesh = m;
    } else if (q.kind === 'spell') {
      // school abilities: every look is drawn by its own ability (render/afx/*.js)
      const sv = R.afx.buildSpell(q);
      sv.kind = 'spell';
      R.scene.add(sv.root);
      return sv;
    } else if (q.kind === 'scythe') {
      const s = R.vm.buildScytheModel(true);
      s.scale.setScalar(1.6);
      const spin = new T.Group(); spin.add(s); s.position.y = -0.6;
      root.add(spin);
      v.spin = spin;
    }
    R.scene.add(root);
    return v;
  }

  function buildAvatar() {
    const root = new T.Group(), list = [];
    const part = maker(root, list), m = mats();
    part(new T.CylinderGeometry(0.3, 0.4, 1.1, 8), m.ink(), 0, 0.95, 0);
    part(new T.SphereGeometry(0.24, 8, 6), m.bone(), 0, 1.72, 0);
    part(new T.BoxGeometry(0.1, 0.05, 0.9), m.red, 0, 1.45, -0.45, root, false);
    return { root, mats: list, headY: 2.2, color: P().ink, animate() {} };
  }

  class Views {
    constructor(R) {
      this.R = R;
      this.enemies = {};
      this.projectiles = {};
      this.hazards = {};
      this.players = {};
      this.ringGeo = new T.RingGeometry(0.85, 1, 64, 1).rotateX(-Math.PI / 2);
      this.boxGeo = new T.BoxGeometry(1, 1, 1);
      this.time = 0;
      this.dying = [];
    }

    clear() {
      for (const k in this.enemies) this.R.scene.remove(this.enemies[k].root);
      for (const k in this.projectiles) { const pv = this.projectiles[k]; this.R.scene.remove(pv.root); if (pv.kind === 'spell') this.R.afx.disposeSpell(pv); }
      for (const k in this.hazards) this.R.scene.remove(this.hazards[k].root);
      for (const k in this.players) this.R.scene.remove(this.players[k].root);
      for (const v of this.dying) this.R.scene.remove(v.root);
      this.dying = [];
      this.enemies = {}; this.projectiles = {}; this.hazards = {}; this.players = {};
    }

    // Called after every sim tick: shift cur -> prev for interpolation.
    capture(world, localPid) {
      for (const k in world.enemies) {
        const e = world.enemies[k];
        let v = this.enemies[k];
        if (!v) {
          v = buildModel3D(e) || buildBillboard(e.etype, this.R) || BUILD[e.etype]();
          v.cur = new T.Vector3(e.pos.x, e.pos.y, e.pos.z);
          v.prev = v.cur.clone();
          v.born = this.time;
          v.vel = { x: 0, z: 0 };
          this.R.scene.add(v.root);
          this.enemies[k] = v;
        }
        v.prev.copy(v.cur);
        v.cur.set(e.pos.x, e.pos.y, e.pos.z);
        v.vel = e.vel;
        v.e = { s: e.state, st: e.stateT, flash: e.flash, yaw: e.yaw, hp: e.hp, max: e.maxHp, stun: e.stun, g: e.grounded };
        v.seen = true;
      }
      for (const k in this.enemies) {
        if (!this.enemies[k].seen) { this.R.scene.remove(this.enemies[k].root); delete this.enemies[k]; }
        else this.enemies[k].seen = false;
      }

      for (const k in world.projectiles) {
        const q = world.projectiles[k];
        let v = this.projectiles[k];
        if (!v) {
          v = buildProjectile(this.R, q);
          v.cur = new T.Vector3(q.pos.x, q.pos.y, q.pos.z);
          v.prev = v.cur.clone();
          this.projectiles[k] = v;
        }
        v.prev.copy(v.cur);
        v.cur.set(q.pos.x, q.pos.y, q.pos.z);
        v.vel = q.vel;
        v.parried = q.parried;
        v.seen = true;
      }
      for (const k in this.projectiles) {
        if (!this.projectiles[k].seen) { const pv = this.projectiles[k]; this.R.scene.remove(pv.root); if (pv.kind === 'spell') this.R.afx.disposeSpell(pv); delete this.projectiles[k]; }
        else this.projectiles[k].seen = false;
      }

      const seenH = {};
      for (const h of world.hazards) {
        seenH[h.hid] = true;
        let v = this.hazards[h.hid];
        if (!v) {
          const root = new T.Group();
          if (h.kind === 'ring') {
            const m = new T.Mesh(this.ringGeo, M().glow(P().ember));
            const inner = new T.Mesh(new T.RingGeometry(0.8, 0.86, 64, 1).rotateX(-Math.PI / 2), M().glow(P().blood));
            inner.position.y = 0.02;
            const wall = new T.Mesh(new T.CylinderGeometry(1, 1, 0.7, 64, 1, true), new T.MeshBasicMaterial({ color: P().blood, transparent: true, opacity: 0.5, side: T.DoubleSide, depthWrite: false }));
            wall.position.y = 0.35;
            root.add(m); root.add(inner); root.add(wall);
            v = { root, kind: 'ring', parts: [m, inner, wall] };
          } else {
            const core = new T.Mesh(this.boxGeo, M().glow(P().blood));
            const outer = new T.Mesh(this.boxGeo, M().glow(P().ember));
            root.add(outer); root.add(core);
            v = { root, kind: 'beam', core, outer };
          }
          this.R.scene.add(root);
          this.hazards[h.hid] = v;
        }
        v.h = { r: h.r, x: h.x, y: h.y, z: h.z, angle: h.angle, len: h.len, age: h.age, warn: h.warn };
      }
      for (const k in this.hazards) if (!seenH[k]) { this.R.scene.remove(this.hazards[k].root); delete this.hazards[k]; }

      for (const k in world.players) {
        if (Number(k) === localPid) continue;
        const p = world.players[k];
        let v = this.players[k];
        if (!v) {
          v = buildAvatar();
          v.cur = new T.Vector3(p.pos.x, p.pos.y, p.pos.z); v.prev = v.cur.clone();
          this.R.scene.add(v.root); this.players[k] = v;
        }
        v.prev.copy(v.cur); v.cur.set(p.pos.x, p.pos.y, p.pos.z); v.yaw = p.yaw; v.dead = p.dead;
        v.seen = true;
      }
      for (const k in this.players) {
        if (!this.players[k].seen) { this.R.scene.remove(this.players[k].root); delete this.players[k]; }
        else this.players[k].seen = false;
      }
    }

    // Removes the view right away; the kill event's burst (or pixel shatter) covers the disappearance.
    kill(id, ev) {
      const v = this.enemies[id];
      if (!v) return null;
      delete this.enemies[id];
      if (v.model3d && !(ev && ev.overkill)) {
        // 3D enemies collapse, then sink into the floor
        v.ctl.play('Death', { once: true, restart: true, duration: 0.7, fade: 0.05 });
        v.ctl.mats.forEach((m) => m.emissive.setRGB(0.3, 0.3, 0.3));
        if (v.bar) v.bar.root.visible = false;
        v.deathT = 0;
        this.dying.push(v);
      } else this.R.scene.remove(v.root);
      return v;
    }

    update(dt, alpha, camera, ets) {
      this.time += dt;
      const t = this.time;
      for (const k in this.enemies) {
        const v = this.enemies[k];
        v.root.position.lerpVectors(v.prev, v.cur, alpha);
        if (v.billboard) {
          // face the camera; mirror the drawing when the enemy moves toward the screen's left
          const dx = camera.position.x - v.root.position.x, dz = camera.position.z - v.root.position.z;
          v.root.rotation.y = Math.atan2(dx, dz);
          const rx = Math.cos(v.root.rotation.y), rz = -Math.sin(v.root.rotation.y);
          const side = v.vel.x * rx + v.vel.z * rz;
          if (side < -1) v.flip = -1; else if (side > 1) v.flip = 1;
        } else v.root.rotation.y = v.e.yaw;
        // spawning: ground yokai claw out of the floor, flyers fade in by scale
        const born = (t - v.born) / 0.8;
        if (born < 1) {
          if (v.ground) { v.inner.position.y = -v.headY * (1 - born); v.root.scale.setScalar(1); }
          else v.root.scale.setScalar(Math.max(0.01, born));
        } else if (v.root.scale.x !== 1) v.root.scale.setScalar(1);
        // hit flash: the body flares to paper white; windup throbs toward blood red
        const fl = v.e.flash > 0 ? 1 : 0;
        const wind = v.e.s === 'windup' || v.e.s === 'leapWind' ? (Math.sin(t * 30) > 0 ? 1 : 0) : 0;
        if (v.model3d) {
          for (const m of v.ctl.mats) {
            if (fl) m.emissive.setRGB(2.5, 2.5, 2.5);
            else if (wind) m.emissive.setRGB(1.6, 0.1, 0.12);
            else m.emissive.setRGB(0.45, 0.45, 0.45);
          }
        }
        if (v.billboard) {
          const u = v.mat.uniforms;
          if (fl) { u.uTint.value.setRGB(1, 1, 1); u.uTintAmt.value = 0.85; }
          else if (wind) { u.uTint.value.setRGB(1, 0.05, 0.1); u.uTintAmt.value = 0.55; }
          else u.uTintAmt.value = 0;
        }
        for (let i = 0; i < v.mats.length; i++) {
          const m = v.mats[i];
          if (fl) m.emissive.setRGB(0.95, 0.93, 0.88);
          else if (wind) m.emissive.setRGB(0.55, 0.0, 0.05);
          else m.emissive.setRGB(0, 0, 0);
        }
        v.animate(v.e, t + Number(k) * 0.37, v.vel, t);
        if (v.ctl) v.ctl.update(dt * (ets == null ? 1 : ets));
        if (v.billboard && v.ground && born < 1) v.inner.position.y -= v.spriteH * (1 - born);
        if (v.bar) { v.bar.set(Math.max(0, v.e.hp / v.e.max)); v.bar.root.quaternion.copy(v.root.quaternion).invert().multiply(camera.quaternion); }
      }
      for (let i = this.dying.length - 1; i >= 0; i--) {
        const v = this.dying[i];
        v.deathT += dt;
        v.ctl.update(dt);
        if (v.deathT > 1.3) v.root.position.y -= dt * 0.9;
        if (v.deathT > 2.8) { this.R.scene.remove(v.root); this.dying.splice(i, 1); }
      }
      for (const k in this.projectiles) {
        const v = this.projectiles[k];
        v.root.position.lerpVectors(v.prev, v.cur, alpha);
        const vel = v.vel;
        const px = v.root.position.x, py = v.root.position.y, pz = v.root.position.z;
        if (v.kind === 'orb') {
          v.root.scale.setScalar(1 + Math.sin(t * 25) * 0.12);
          v.shell.material.color.setHex(v.parried ? P().blood : 0xffffff);
          if (Math.random() < 0.4) this.R.fx.burst(px, py, pz, 1, 0.5, P().blood, 0.3, 0.4, 0);
        } else if (v.kind === 'spear') {
          v.root.lookAt(px + vel.x, py + vel.y, pz + vel.z);
          v.shell.material.color.setHex(v.parried ? P().blood : P().bone);
          if (Math.random() < 0.4) this.R.fx.burst(px, py, pz, 1, 0.5, P().ember, 0.25, 0.3, 0);
        } else if (v.kind === 'wave') {
          v.root.lookAt(px + vel.x, py + vel.y, pz + vel.z);
          v.mesh.scale.multiplyScalar(1 + dt * 0.6);
          this.R.fx.burst(px, py, pz, 2, 3, P().fx, 0.35, 0.35, 0);
        } else if (v.kind === 'spell') {
          this.R.afx.updateSpell(v, dt, vel, t);
        } else if (v.kind === 'scythe') {
          v.root.lookAt(px + vel.x, py, pz + vel.z);
          v.spin.rotation.x = -Math.PI / 2;
          v.spin.rotation.y = -t * 22;
        }
      }
      for (const k in this.hazards) {
        const v = this.hazards[k], h = v.h;
        if (v.kind === 'ring') {
          v.root.position.set(h.x, h.y + 0.05, h.z);
          const r = Math.max(0.01, h.r);
          v.root.scale.set(r, 1, r);
        } else {
          v.root.position.set(h.x, h.y, h.z);
          v.root.rotation.y = -h.angle;
          const warn = h.age < h.warn;
          const w = warn ? 0.05 : 0.5 + Math.sin(t * 50) * 0.08;
          v.core.scale.set(h.len, w * 0.5, w * 0.5);
          v.outer.scale.set(h.len, w * 1.5, w * 1.5);
          v.outer.visible = !warn;
          v.core.position.x = h.len / 2; v.outer.position.x = h.len / 2;
          if (!warn && Math.random() < 0.8) {
            const d = Math.random() * h.len;
            this.R.fx.burst(h.x + Math.cos(h.angle) * d, h.y, h.z + Math.sin(h.angle) * d, 2, 4, P().ember, 0.35, 0.4, 0, { up: 3 });
          }
        }
      }
      for (const k in this.players) {
        const v = this.players[k];
        v.root.position.lerpVectors(v.prev, v.cur, alpha);
        v.root.rotation.y = v.yaw + Math.PI;
        v.root.visible = !v.dead;
      }
    }
  }

  SO.Views = Views;
  SO.Views.BUILD = BUILD;
})(window.SO = window.SO || {});
