// Ability visuals driver. Each of the 80 school abilities draws itself in its own file
// (src/render/afx/<school>.js) by registering in SO.AFX:
//   cast[id](F, e, mine)            the moment the skill fires (event 'ability')
//   vfx['id:moment'](F, e, mine)    moments the sim announces with K.vfx()
//   spell[look] = { build(F, q) -> view, update(F, v, dt), hit(F, e), boom(F, e), end(F, e) }
//   effect[kind] = { build(F, fx) -> view, update(F, v, fx, dt), end(F, v, fx) -> fade seconds }
//   status['by:name' | 'by' | 'name'] = { build(F, ctx) -> view, update(F, v, s, e, dt), end(F, v) }
//   buff[name] = { build(F, b) -> view, update(F, v, b, dt), end(F, v) }       (local player)
//   ult[id] = { start(F, e, mine), end(F, e, mine) }
//   ally[kind] = { build(F, a) -> view, update(F, v, a, dt) }
// This file only runs them: object lifetimes, colored light flashes, lightning, the ultimate
// atmosphere (color grade, darkness, RGB split, lensing) and the material/shape toolkit (SO.AFXLib).
(function (SO) {
  'use strict';
  const T = THREE;
  const AFX = SO.AFX = SO.AFX || {};
  for (const k of ['cast', 'vfx', 'spell', 'effect', 'status', 'buff', 'ult', 'ally']) AFX[k] = AFX[k] || {};

  // ---------------- toolkit: materials, textures, shapes ----------------
  const L = SO.AFXLib = {};
  const texCache = {};
  const VS_UV = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }';
  const NOISE = `
    float h21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float n2(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(h21(i), h21(i + vec2(1, 0)), f.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), f.x), f.y); }
    float fb(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * n2(p); p *= 2.07; a *= 0.5; } return v; }`;

  L.add = (color, opacity) => new T.MeshBasicMaterial({ color, transparent: true, opacity: opacity == null ? 1 : opacity, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide, fog: false });
  L.solid = (color) => new T.MeshBasicMaterial({ color, fog: false });
  L.alpha = (color, opacity) => new T.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: T.DoubleSide, fog: false });
  L.lit = (color, emissive) => new T.MeshLambertMaterial({ color, emissive: emissive || 0x000000 });

  // rim glow: bright where the surface turns away from the eye (spectral shells, auras)
  L.fresnel = (color, power, strength) => new T.ShaderMaterial({
    uniforms: { uColor: { value: new T.Color(color) }, uPow: { value: power || 2.2 }, uK: { value: strength == null ? 1 : strength } },
    transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.FrontSide,
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 mv = modelViewMatrix * vec4(position, 1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'uniform vec3 uColor; uniform float uPow, uK; varying vec3 vN; varying vec3 vV; void main(){ float r = pow(1.0 - abs(dot(vN, vV)), uPow); gl_FragColor = vec4(uColor * r * uK, 1.0); }',
  });

  // Flowing energy along uv.y with a noise edge; o: { color2, freq, speed, sharp, edge, alpha }.
  L.energy = (color, o) => {
    o = o || {};
    return new T.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uK: { value: 1 }, uColor: { value: new T.Color(color) }, uColor2: { value: new T.Color(o.color2 != null ? o.color2 : 0xffffff) },
        uFreq: { value: o.freq || 3 }, uSpeed: { value: o.speed || 2 }, uSharp: { value: o.sharp || 0.5 }, uEdge: { value: o.edge == null ? 0.25 : o.edge } },
      transparent: true, depthWrite: false, blending: o.normal ? T.NormalBlending : T.AdditiveBlending, side: T.DoubleSide,
      vertexShader: VS_UV,
      fragmentShader: NOISE + `
        uniform float uTime, uK, uFreq, uSpeed, uSharp, uEdge; uniform vec3 uColor, uColor2; varying vec2 vUv;
        void main(){
          float n = fb(vec2(vUv.x * uFreq * 2.0, vUv.y * uFreq - uTime * uSpeed));
          float core = smoothstep(uSharp, 1.0, n + (1.0 - abs(vUv.x - 0.5) * 2.0) * 0.35);
          float edge = smoothstep(0.0, uEdge, vUv.y) * smoothstep(1.0, 1.0 - uEdge, vUv.y);
          float a = core * edge * uK;
          if (a < 0.02) discard;
          gl_FragColor = vec4(mix(uColor, uColor2, smoothstep(0.75, 1.0, n)) * a * 1.6, 1.0);
        }`,
    });
  };

  // Licking flames on a cylinder or plane (uv.y = height); o: { tip, speed, scale }.
  L.flame = (color, o) => {
    o = o || {};
    return new T.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uK: { value: 1 }, uColor: { value: new T.Color(color) }, uTip: { value: new T.Color(o.tip != null ? o.tip : 0xfff0a0) }, uSpeed: { value: o.speed || 3 }, uScale: { value: o.scale || 3 } },
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      vertexShader: VS_UV,
      fragmentShader: NOISE + `
        uniform float uTime, uK, uSpeed, uScale; uniform vec3 uColor, uTip; varying vec2 vUv;
        void main(){
          float n = fb(vec2(vUv.x * uScale * 2.0, vUv.y * uScale - uTime * uSpeed));
          float body = n - vUv.y * 0.95 + 0.25;
          float a = smoothstep(0.05, 0.35, body) * uK;
          if (a < 0.04) discard;
          gl_FragColor = vec4(mix(uColor, uTip, smoothstep(0.35, 0.8, body)) * a * 1.5, 1.0);
        }`,
    });
  };

  // Hexagonal cell field with cracks (uCrack 0..1) and hit pulses; used on shields and domes.
  L.hex = (color, o) => {
    o = o || {};
    return new T.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uK: { value: 1 }, uColor: { value: new T.Color(color) }, uCrack: { value: 0 }, uHit: { value: 0 }, uScale: { value: o.scale || 8 }, uBuild: { value: 1 } },
      transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
      vertexShader: VS_UV,
      fragmentShader: NOISE + `
        uniform float uTime, uK, uCrack, uHit, uScale, uBuild; uniform vec3 uColor; varying vec2 vUv;
        void main(){
          vec2 q = vUv * vec2(uScale * 1.732, uScale);
          vec2 h = vec2(q.x + q.y * 0.57735, q.y * 1.1547);
          vec2 id = floor(h); vec2 f = fract(h) - 0.5;
          float edge = smoothstep(0.36, 0.48, max(abs(f.x), max(abs(f.y), abs(f.x + f.y) * 0.85)));
          float born = step(h21(id), uBuild);            // cells assemble one by one
          float cr = step(1.0 - uCrack * 0.9, h21(id + 7.0)) * step(0.82, n2(q * 3.0 + id));
          float pulse = 0.5 + 0.5 * sin(uTime * 5.0 + h21(id) * 6.28);
          float a = (edge * (0.65 + 0.35 * pulse) + 0.1 + uHit * 0.6 + cr * 1.2) * born * uK;
          if (a < 0.05) discard;
          gl_FragColor = vec4(mix(uColor, vec3(1.0), cr + uHit * 0.4) * a, 1.0);
        }`,
    });
  };

  // Canvas texture made once per key; draw(ctx, size).
  L.tex = (key, size, draw) => {
    if (texCache[key]) return texCache[key];
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const c = cv.getContext('2d');
    draw(c, size);
    const t = new T.CanvasTexture(cv);
    t.anisotropy = 4;
    return (texCache[key] = t);
  };
  // drawing helpers for magic circles
  L.draw = {
    ring(c, s, r, w, col) { c.strokeStyle = col; c.lineWidth = w; c.beginPath(); c.arc(s / 2, s / 2, r, 0, Math.PI * 2); c.stroke(); },
    glyphs(c, s, r, text, px, col, rot) {
      c.save(); c.translate(s / 2, s / 2); c.fillStyle = col; c.font = px + 'px "DotGothic16","MS Gothic",serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
      const n = text.length;
      for (let i = 0; i < n; i++) { c.save(); c.rotate((i / n) * Math.PI * 2 + (rot || 0)); c.translate(0, -r); c.fillText(text[i], 0, 0); c.restore(); }
      c.restore();
    },
    star(c, s, r, n, skip, w, col) {
      c.strokeStyle = col; c.lineWidth = w; c.beginPath();
      for (let i = 0; i <= n; i++) { const a = (i * skip / n) * Math.PI * 2 - Math.PI / 2; const x = s / 2 + Math.cos(a) * r, y = s / 2 + Math.sin(a) * r; if (i) c.lineTo(x, y); else c.moveTo(x, y); }
      c.stroke();
    },
    ticks(c, s, r0, r1, n, w, col) { c.strokeStyle = col; c.lineWidth = w; for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; c.beginPath(); c.moveTo(s / 2 + Math.cos(a) * r0, s / 2 + Math.sin(a) * r0); c.lineTo(s / 2 + Math.cos(a) * r1, s / 2 + Math.sin(a) * r1); c.stroke(); } },
  };
  // a flat disc on the floor showing a canvas circle
  L.disc = (tex, r, color, opacity) => {
    const m = new T.Mesh(new T.PlaneGeometry(r * 2, r * 2).rotateX(-Math.PI / 2), new T.MeshBasicMaterial({ map: tex, color: color != null ? color : 0xffffff, transparent: true, opacity: opacity == null ? 1 : opacity, blending: T.AdditiveBlending, depthWrite: false, fog: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    m.renderOrder = 2;
    return m;
  };
  // a camera-facing sprite with a canvas texture
  L.sprite = (tex, size, color, additive) => {
    const s = new T.Sprite(new T.SpriteMaterial({ map: tex, color: color != null ? color : 0xffffff, transparent: true, blending: additive === false ? T.NormalBlending : T.AdditiveBlending, depthWrite: false, fog: false }));
    s.scale.setScalar(size);
    return s;
  };
  // soft round dot texture for glows
  L.dot = () => L.tex('dot', 64, (c, s) => { const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, s, s); });

  // Ribbon trail that follows a moving point (spells, blades, dashes).
  class Trail {
    constructor(scene, n, width, color, o) {
      o = o || {};
      this.n = n; this.w = width; this.pts = [];
      this.pos = new Float32Array(n * 2 * 3); this.age = new Float32Array(n * 2);
      const g = new T.BufferGeometry(), idx = [];
      for (let i = 0; i < n - 1; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      g.setAttribute('position', new T.BufferAttribute(this.pos, 3).setUsage(T.DynamicDrawUsage));
      g.setAttribute('age', new T.BufferAttribute(this.age, 1).setUsage(T.DynamicDrawUsage));
      g.setIndex(idx); g.setDrawRange(0, 0);
      this.mat = new T.ShaderMaterial({
        uniforms: { uColor: { value: new T.Color(color) }, uCore: { value: new T.Color(o.core != null ? o.core : 0xffffff) } },
        transparent: true, depthWrite: false, blending: T.AdditiveBlending, side: T.DoubleSide,
        vertexShader: 'attribute float age; varying float vA; void main(){ vA = age; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: 'uniform vec3 uColor, uCore; varying float vA; void main(){ float a = pow(1.0 - vA, 1.5); gl_FragColor = vec4(mix(uColor, uCore, a * a) * a, 1.0); }',
      });
      this.mesh = new T.Mesh(g, this.mat); this.mesh.frustumCulled = false; this.geo = g;
      scene.add(this.mesh);
      this.scene = scene; this.life = o.life || 0.25; this.up = new T.Vector3(0, 1, 0);
    }
    // a: centre point, side: direction of the ribbon's width (defaults to vertical)
    push(a, side, dt) {
      for (const p of this.pts) p.t += dt;
      if (a) this.pts.push({ p: a.clone(), s: (side || this.up).clone(), t: 0 });
      while (this.pts.length > this.n || (this.pts.length && this.pts[0].t > this.life)) this.pts.shift();
      const m = this.pts.length;
      for (let i = 0; i < m; i++) {
        const q = this.pts[i], k = i * 6, w = this.w * (i / Math.max(1, m - 1));
        this.pos[k] = q.p.x + q.s.x * w; this.pos[k + 1] = q.p.y + q.s.y * w; this.pos[k + 2] = q.p.z + q.s.z * w;
        this.pos[k + 3] = q.p.x - q.s.x * w; this.pos[k + 4] = q.p.y - q.s.y * w; this.pos[k + 5] = q.p.z - q.s.z * w;
        const ag = Math.min(1, q.t / this.life); this.age[i * 2] = ag; this.age[i * 2 + 1] = ag;
      }
      this.geo.setDrawRange(0, Math.max(0, (m - 1) * 6));
      this.geo.attributes.position.needsUpdate = true; this.geo.attributes.age.needsUpdate = true;
      return m;
    }
    dispose() { this.scene.remove(this.mesh); this.geo.dispose(); this.mat.dispose(); }
  }
  L.Trail = Trail;

  // shapes
  L.bladeGeo = (len, width, curve, thick) => {
    const s = new T.Shape(), n = 14;
    const spine = (y) => curve * Math.pow(y / len, 2);
    s.moveTo(-width / 2, 0);
    for (let i = 0; i <= n; i++) { const y = (len * 0.9) * i / n; s.lineTo(spine(y) - width / 2 * (1 - 0.35 * y / len), y); }
    s.lineTo(spine(len), len);
    for (let i = n; i >= 0; i--) { const y = (len * 0.9) * i / n; s.lineTo(spine(y) + width / 2 * (1 - 0.6 * y / len), y); }
    return new T.ExtrudeGeometry(s, { depth: thick || 0.02, bevelEnabled: false }).translate(0, 0, -(thick || 0.02) / 2);
  };
  L.shardGeo = (len, r) => new T.OctahedronGeometry(1, 0).scale(r, len / 2, r);
  L.crescentGeo = () => SO.Mat.crescentGeometry(140, 24);

  // ---------------- the driver ----------------
  const _v = new T.Vector3(), _q = new T.Quaternion();

  class AbilityFX {
    constructor(R) {
      this.R = R; this.scene = R.scene; this.fx = R.fx;
      this.objs = []; this.effects = {}; this.statuses = {}; this.buffs = {}; this.allies = {}; this.warned = {};
      this.t = 0;
      this.lights = [];
      for (let i = 0; i < 6; i++) { const l = new T.PointLight(0xffffff, 0, 20, 2); this.scene.add(l); this.lights.push({ l, t: 1, dur: 0.3, peak: 0 }); }
      this.lIdx = 0;
      // lightning: instanced segments with a per-bolt color (white core + colored halo)
      const seg = new T.BoxGeometry(1, 1, 1);
      this.boltMax = 700;
      this.boltCore = new T.InstancedMesh(seg, new T.MeshBasicMaterial({ color: 0xffffff, fog: false }), this.boltMax);
      this.boltHalo = new T.InstancedMesh(seg, new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.75, depthWrite: false, blending: T.AdditiveBlending, fog: false }), this.boltMax);
      for (const m of [this.boltCore, this.boltHalo]) { m.instanceMatrix.setUsage(T.DynamicDrawUsage); m.frustumCulled = false; m.count = 0; this.scene.add(m); }
      this.boltHalo.setColorAt(0, new T.Color(1, 1, 1));
      this.segs = [];
      this.dummy = new T.Object3D();
      this.tmpC = new T.Color();
      this.atmoAcc = null;
      this.lens = null;
    }

    get cam() { return this.R.camera; }
    get vm() { return this.R.vm; }

    // ---------- helpers for the school files ----------
    add(o, parent) { (parent || this.scene).add(o); return o; }
    remove(o) { if (o && o.parent) o.parent.remove(o); }
    // fn(dt, age) returns false when done; objects listed in `own` are removed then
    spawn(fn, own) { this.objs.push({ fn, own: own || [], age: 0 }); }
    flash(x, y, z, color, intensity, dur) { const L0 = this.lights[this.lIdx++ % this.lights.length]; L0.l.position.set(x, y, z); L0.l.color.setHex(color); L0.peak = intensity; L0.t = 0; L0.dur = dur; }
    shake(k) { this.R.addTrauma(k); }
    white(k) { this.R.flashWhite(k); }
    kick(k) { this.R.kickFov(k); }
    v3(x, y, z) { return new T.Vector3(x, y, z); }
    // world point near the casting (left) hand, slightly in front of the camera
    hand(side, fwd) {
      const c = this.cam;
      return _v.set((side || -1) * 0.3, -0.28, -(fwd || 0.9)).applyQuaternion(c.quaternion).add(c.position).clone();
    }
    eye() { return this.cam.position.clone(); }
    look() { return new T.Vector3(0, 0, -1).applyQuaternion(this.cam.quaternion); }
    enemyView(id) { return this.R.views.enemies[id]; }
    // an enemy model reused for allies / apparitions, recolored. o: { color, emissive, opacity, scale }
    model(name, h, o) {
      if (!SO.models || !SO.models.ready || !SO.models.has(name)) return null;
      o = o || {};
      const ctl = SO.models.instance(name, h);
      for (const m of ctl.mats) {
        if (o.color != null) m.color.setHex(o.color);
        m.emissive.setHex(o.emissive != null ? o.emissive : 0x000000);
        if (o.opacity != null) { m.transparent = true; m.opacity = o.opacity; m.depthWrite = false; }
      }
      ctl.root.traverse((c) => { if (c.isSkinnedMesh && c.material === SO.models.outline && o.outline === false) c.visible = false; });
      return ctl;
    }
    enemy(id) { const w = this.world; return w && w.enemies[id]; }

    // Jagged bolt from a to b; color for the halo; branch adds forks.
    bolt(a, b, width, life, color, branch, jag) {
      const n = Math.max(3, Math.round(a.distanceTo(b) / 1.1));
      let prev = a.clone();
      for (let s = 1; s <= n; s++) {
        const k = s / n;
        const p = a.clone().lerp(b, k);
        if (s < n) p.add(new T.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar((jag || 1.2) * Math.sin(k * Math.PI)));
        this.segs.push({ a: prev.clone(), b: p.clone(), w: width, t: 0, life, c: color });
        if (branch && Math.random() < 0.3 && s < n) this.bolt(p, p.clone().add(new T.Vector3((Math.random() - 0.5) * 4, -Math.random() * 3, (Math.random() - 0.5) * 4)), width * 0.5, life * 0.8, color, false, jag);
        prev = p;
      }
    }

    // ultimate atmosphere for this frame (strongest request wins per channel)
    atmo(o) {
      const a = this.atmoAcc || (this.atmoAcc = { grade: new T.Color(0xffffff), gradeAmt: 0, dark: 0, aberr: 0, kaleido: 0, invert: 0 });
      if (o.gradeAmt > a.gradeAmt) { a.gradeAmt = o.gradeAmt; a.grade.setHex(o.grade); }
      a.dark = Math.max(a.dark, o.dark || 0);
      a.aberr = Math.max(a.aberr, o.aberr || 0);
      a.kaleido = Math.max(a.kaleido, o.kaleido || 0);
    }
    // screen-space gravitational lensing around a world point
    lensAt(pos, radius, strength) { const d = this.cam.position.distanceTo(pos); if (!this.lens || d < this.lens.d) this.lens = { pos: pos.clone(), radius, strength, d }; }

    // ---------- routing ----------
    warn(key) { if (!this.warned[key]) { this.warned[key] = 1; console.warn('[afx] sem visual para', key); } }

    event(e, mine) {
      switch (e.type) {
        case 'ability': { const f = AFX.cast[e.id]; if (f) f(this, e, mine); else this.warn('cast ' + e.id); break; }
        case 'vfx': {
          if (e.k === 'spellHit' || e.k === 'boom') { const s = AFX.spell[e.look]; const f = s && s[e.k === 'boom' ? 'boom' : 'hit']; if (f) f(this, e); break; }
          const f = AFX.vfx[e.k]; if (f) f(this, e, mine); else this.warn('vfx ' + e.k);
          break;
        }
        case 'spellLaunch': { const s = AFX.spell[e.look]; if (s && s.launch) s.launch(this, e); break; }
        case 'projEnd': { if (e.look) { const s = AFX.spell[e.look]; if (s && s.end) s.end(this, e); } break; }
        case 'ultStart': { const u = AFX.ult[e.id]; if (u && u.start) u.start(this, e, mine); else this.warn('ult ' + e.id); break; }
        case 'ultEnd': { const u = AFX.ult[e.id]; if (u && u.end) u.end(this, e, mine); break; }
        case 'statusEnd': { const v = this.statuses[e.id + ':' + e.s]; if (v) this.endStatus(e.id + ':' + e.s, v, e); break; }
        case 'allySpawn': case 'allyAttack': case 'allyEnd': case 'allyHurt': case 'allyBlock': {
          const d = AFX.ally[e.kind || (this.allies[e.id] && this.allies[e.id].kind)];
          const k = e.type.slice(4).toLowerCase();
          if (d && d[k]) d[k](this, e, this.allies[e.id]);
          break;
        }
        default: break;
      }
    }

    // ---------- spells (called from render/views.js) ----------
    buildSpell(q) {
      const s = AFX.spell[q.look];
      if (!s || !s.build) { this.warn('spell ' + q.look); const root = new T.Group(); return { root }; }
      const v = s.build(this, q) || {};
      v.root = v.root || new T.Group();
      v.def = s; v.q = { look: q.look, color: q.color, variant: q.variant, slot: q.slot, roll: q.roll, yaw: q.yaw, radius: q.radius };
      return v;
    }
    updateSpell(v, dt, vel, t) { if (v.def && v.def.update) v.def.update(this, v, dt, vel, t); }
    disposeSpell(v) { if (v.def && v.def.dispose) v.def.dispose(this, v); if (v.trail) v.trail.dispose(); }

    // ---------- per frame ----------
    sync(dt, world, player, camera) {
      this.world = world; this.player = player; this.dt = dt;
      this.t += dt;
      const t = this.t;
      this.atmoAcc = null; this.lens = null;

      // lasting effects from the sim
      const seen = {};
      if (world) {
        for (const fx of world.effects) {
          seen[fx.id] = 1;
          let v = this.effects[fx.id];
          if (!v) {
            const d = AFX.effect[fx.kind];
            if (!d) { this.warn('effect ' + fx.kind); this.effects[fx.id] = { dead: true }; continue; }
            v = d.build(this, fx) || {};
            v.def = d; v.fx = fx;
            this.effects[fx.id] = v;
          }
          if (v.dead) continue;
          v.fx = fx;
          if (v.def.update) v.def.update(this, v, fx, dt);
        }
      }
      for (const id in this.effects) {
        if (seen[id]) continue;
        const v = this.effects[id];
        if (v.dead) { delete this.effects[id]; continue; }
        if (!v.fading) {
          v.fading = true;
          v.fade = v.def.end ? (v.def.end(this, v, v.fx) || 0) : 0;
          v.fadeT = 0;
        }
        v.fadeT += dt;
        if (v.fadeT >= v.fade) { this.disposeView(v); delete this.effects[id]; }
        else if (v.def.fadeUpdate) v.def.fadeUpdate(this, v, v.fadeT / v.fade, dt);
      }

      // statuses on enemies
      const live = {};
      if (world) {
        for (const k in world.enemies) {
          const e = world.enemies[k];
          if (!e.st) continue;
          const view = this.R.views.enemies[k];
          if (!view) continue;
          for (const name in e.st) {
            const s = e.st[name];
            const key = k + ':' + name;
            live[key] = 1;
            let v = this.statuses[key];
            if (!v || v.by !== s.by) {
              if (v) this.endStatus(key, v);
              const d = AFX.status[(s.by || '') + ':' + name] || AFX.status[s.by] || AFX.status[name];
              if (!d) { this.warn('status ' + (s.by || '') + ':' + name); this.statuses[key] = { dead: true, by: s.by }; continue; }
              v = d.build(this, { e, view, s, name }) || {};
              v.def = d; v.by = s.by; v.view = view;
              this.statuses[key] = v;
            }
            if (!v.dead && v.def.update) v.def.update(this, v, s, e, dt);
          }
        }
      }
      for (const key in this.statuses) if (!live[key]) this.endStatus(key, this.statuses[key]);

      // the local player's buffs (first person)
      const bl = {};
      if (player && player.buffs) {
        for (const name in player.buffs) {
          bl[name] = 1;
          const b = player.buffs[name];
          let v = this.buffs[name];
          if (!v) {
            const d = AFX.buff[name];
            if (!d) { this.buffs[name] = { dead: true }; continue; }
            v = d.build(this, b) || {};
            v.def = d;
            this.buffs[name] = v;
          }
          if (!v.dead && v.def.update) v.def.update(this, v, b, dt);
        }
      }
      for (const name in this.buffs) if (!bl[name]) { const v = this.buffs[name]; if (!v.dead && v.def.end) v.def.end(this, v); this.disposeView(v); delete this.buffs[name]; }

      // allies (summons, clones, decoys)
      const al = {};
      if (world) {
        for (const k in world.allies) {
          const a = world.allies[k];
          al[k] = 1;
          let v = this.allies[k];
          if (!v) {
            const d = AFX.ally[a.kind];
            if (!d) { this.warn('ally ' + a.kind); this.allies[k] = { dead: true, kind: a.kind }; continue; }
            v = d.build(this, a) || {};
            v.def = d; v.kind = a.kind;
            v.cur = new T.Vector3(a.pos.x, a.pos.y, a.pos.z); v.prev = v.cur.clone();
            if (v.root) this.scene.add(v.root);
            this.allies[k] = v;
          }
          if (v.dead) continue;
          v.prev.lerp(v.cur, 1); v.cur.set(a.pos.x, a.pos.y, a.pos.z);
          if (v.root) { v.root.position.lerp(v.cur, Math.min(1, dt * 20)); }
          if (v.def.update) v.def.update(this, v, a, dt);
        }
      }
      for (const k in this.allies) if (!al[k]) { const v = this.allies[k]; if (v.root && !v.keep) this.remove(v.root); if (v.ctl) v.ctl = null; delete this.allies[k]; }

      // transient objects
      for (let i = this.objs.length - 1; i >= 0; i--) {
        const o = this.objs[i];
        o.age += dt;
        let keep = false;
        try { keep = o.fn(dt, o.age); } catch (err) { console.warn('[afx]', err); keep = false; }
        if (!keep) { for (const m of o.own) this.remove(m); this.objs.splice(i, 1); }
      }

      this.updateBolts(dt);
      for (const L0 of this.lights) { L0.t += dt; L0.l.intensity = L0.t < L0.dur ? L0.peak * (1 - L0.t / L0.dur) * (0.85 + Math.random() * 0.3) : 0; }

      // apply the atmosphere and lensing to the post shader
      const pu = this.R.postMat.uniforms, a = this.atmoAcc;
      const calm = this.R.calm ? 0.4 : 1;
      this.smooth = this.smooth || { g: 0, d: 0, ab: 0, k: 0, col: new T.Color(1, 1, 1) };
      const sm = this.smooth, kk = Math.min(1, dt * 3);
      sm.g += ((a ? a.gradeAmt : 0) - sm.g) * kk;
      sm.d += ((a ? a.dark : 0) - sm.d) * kk;
      sm.ab += ((a ? a.aberr : 0) - sm.ab) * Math.min(1, dt * 8);
      sm.k += ((a ? a.kaleido : 0) - sm.k) * kk;
      if (a && a.gradeAmt > 0) sm.col.lerp(a.grade, kk);
      pu.uGrade.value.copy(sm.col); pu.uGradeAmt.value = sm.g * calm; pu.uDark.value = sm.d; pu.uAberr.value = sm.ab * calm;
      this.R.shared.uDomain.value = Math.max(this.R.shared.uDomain.value, sm.k * calm);
      pu.uWell.value.w = 0;
      if (this.lens) {
        const p = this.lens.pos.clone().project(camera);
        if (p.z < 1 && Math.abs(p.x) < 1.4 && Math.abs(p.y) < 1.4) pu.uWell.value.set(p.x * 0.5 + 0.5, p.y * 0.5 + 0.5, SO.clamp(this.lens.radius / Math.max(1, this.lens.d), 0.05, 0.5), this.lens.strength);
      }
      void t; void _q;
    }

    endStatus(key, v) {
      if (!v.dead && v.def.end) { const fade = v.def.end(this, v); if (fade) { const own = v.own || []; const def = v.def; v.endT = 0; this.spawn((dt) => { v.endT += dt; if (def.fadeUpdate) def.fadeUpdate(this, v, v.endT / fade, dt); return v.endT < fade; }, own.concat(v.root ? [v.root] : [])); delete this.statuses[key]; return; } }
      this.disposeView(v);
      delete this.statuses[key];
    }

    disposeView(v) {
      if (!v || v.dead) return;
      if (v.root) this.remove(v.root);
      if (v.own) for (const o of v.own) this.remove(o);
      if (v.trail) v.trail.dispose();
      if (v.trails) for (const tr of v.trails) tr.dispose();
    }

    updateBolts(dt) {
      const dmy = this.dummy;
      let n = 0;
      for (let i = this.segs.length - 1; i >= 0; i--) {
        const s = this.segs[i];
        s.t += dt;
        if (s.t > s.life) { this.segs.splice(i, 1); continue; }
        if (n >= this.boltMax) continue;
        const flick = Math.random() < 0.15 ? 0 : 1 - s.t / s.life;
        const len = s.a.distanceTo(s.b);
        dmy.position.copy(s.a).lerp(s.b, 0.5); dmy.lookAt(s.b);
        dmy.scale.set(s.w * 0.32 * flick + 0.001, s.w * 0.32 * flick + 0.001, len); dmy.updateMatrix();
        this.boltCore.setMatrixAt(n, dmy.matrix);
        dmy.scale.set(s.w * 1.5 * flick + 0.001, s.w * 1.5 * flick + 0.001, len); dmy.updateMatrix();
        this.boltHalo.setMatrixAt(n, dmy.matrix);
        this.boltHalo.setColorAt(n, this.tmpC.setHex(s.c));
        n++;
      }
      this.boltCore.count = n; this.boltHalo.count = n;
      this.boltCore.instanceMatrix.needsUpdate = true; this.boltHalo.instanceMatrix.needsUpdate = true;
      if (this.boltHalo.instanceColor) this.boltHalo.instanceColor.needsUpdate = true;
    }

    clear() {
      for (const id in this.effects) this.disposeView(this.effects[id]);
      for (const k in this.statuses) this.disposeView(this.statuses[k]);
      for (const k in this.buffs) this.disposeView(this.buffs[k]);
      for (const k in this.allies) if (this.allies[k].root) this.remove(this.allies[k].root);
      for (const o of this.objs) for (const m of o.own) this.remove(m);
      this.effects = {}; this.statuses = {}; this.buffs = {}; this.allies = {}; this.objs = []; this.segs = [];
    }
  }

  SO.AbilityFX = AbilityFX;
})(window.SO = window.SO || {});
