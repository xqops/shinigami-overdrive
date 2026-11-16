// Character weapons: each character (school) carries its own weapon in first person, with its own
// idle effects and its own inspect (T) show. One file per weapon in render/cweapons/*.js registers
//   SO.CharWeapons.reg[schoolId] = {
//     slot,                       weapon slot whose look it replaces (0 = the katana moveset)
//     restR, restL,               rest poses {p, a, f, roll} for the right / left hand (left optional)
//     gripR, gripL,               where each hand holds along its handle (weapon units)
//     build(vm) -> s              s.right (+ s.left): Groups from SO.Voxel.build, grip at the origin
//     update(vm, s, dt, ctx)      idle effects every frame; ctx: { time, inspect: 0..1 | -1, hands }
//     inspect: { dur, R: keys, L: keys, trail }   keys in the viewmodel's K() format
//     dispose(vm, s)
//   }
// Shared here: a small particle pool living in the viewmodel scene (pixel smoke, motes, sprites)
// and a verlet rope for chains.
(function (SO) {
  'use strict';
  const T = THREE;
  const reg = {};

  // ---------- pixel textures (nearest filtered, dithered: the retro look) ----------
  const texCache = {};
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  function pixelTex(key, size, alphaAt) {
    if (texCache[key]) return texCache[key];
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d'), img = g.createImageData(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const a = alphaAt(x, y, size);
      const on = a > (BAYER[(y % 4) * 4 + (x % 4)] + 0.5) / 16;
      const i = (y * size + x) * 4;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255;
      img.data[i + 3] = on ? 255 : 0;
    }
    g.putImageData(img, 0, 0);
    const t = new T.CanvasTexture(c);
    t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter; t.generateMipmaps = false;
    texCache[key] = t;
    return t;
  }
  // soft round puff, lumpy edge
  const puffTex = () => pixelTex('puff', 16, (x, y, s) => {
    const dx = (x + 0.5) / s - 0.5, dy = (y + 0.5) / s - 0.5;
    const r = Math.sqrt(dx * dx + dy * dy) * 2;
    const lump = 0.12 * Math.sin(Math.atan2(dy, dx) * 5 + 1.3);
    return Math.max(0, 1 - Math.pow(r / (0.95 + lump), 1.6)) * 0.95;
  });
  const dotTex = () => pixelTex('dot', 8, (x, y, s) => { const dx = x + 0.5 - s / 2, dy = y + 0.5 - s / 2; return Math.max(0, 1 - Math.sqrt(dx * dx + dy * dy) / (s * 0.5)); });

  // a picture from rows of characters: '#' solid, '+' half (dithered), '.' empty
  function artTex(key, rows) {
    if (texCache[key]) return texCache[key];
    const h = rows.length, w = rows[0].length;
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const g = c.getContext('2d'), img = g.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const ch = rows[y][x], i = (y * w + x) * 4;
      const a = ch === '#' ? 255 : ch === '+' ? 140 : ch === '-' ? 70 : 0;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = 255; img.data[i + 3] = a;
    }
    g.putImageData(img, 0, 0);
    const t = new T.CanvasTexture(c);
    t.magFilter = T.NearestFilter; t.minFilter = T.NearestFilter; t.generateMipmaps = false;
    texCache[key] = t;
    return t;
  }

  // ---------- particle pool in the viewmodel scene ----------
  class Motes {
    constructor(scene, max) {
      this.scene = scene; this.list = []; this.free = []; this.max = max || 260;
    }
    // o: { pos, vel, life, size, size1, color, opacity, tex, drag, curl, up, spin, additive }
    emit(o) {
      if (this.list.length >= this.max) return null;
      let sp = this.free.pop();
      const additive = o.additive !== false;
      if (!sp || sp.userData.additive !== additive) {
        if (sp) { sp.material.dispose(); }
        sp = new T.Sprite(new T.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: true, blending: additive ? T.AdditiveBlending : T.NormalBlending }));
        sp.userData.additive = additive;
      }
      sp.material.map = o.tex || puffTex();
      sp.material.color.setHex(o.color != null ? o.color : 0xffffff);
      sp.material.rotation = o.rot || Math.random() * 6.28;
      sp.renderOrder = 5;
      sp.position.copy(o.pos);
      this.scene.add(sp);
      const m = { sp, vel: (o.vel || new T.Vector3()).clone(), age: 0, life: o.life || 1, s0: o.size || 0.05, s1: o.size1 != null ? o.size1 : (o.size || 0.05) * 2,
        op: o.opacity != null ? o.opacity : 0.6, drag: o.drag != null ? o.drag : 1.5, curl: o.curl || 0, up: o.up || 0, spin: o.spin || 0, seed: Math.random() * 100, fadeIn: o.fadeIn != null ? o.fadeIn : 0.15, onStep: o.onStep };
      this.list.push(m);
      return m;
    }
    update(dt, time) {
      for (let i = this.list.length - 1; i >= 0; i--) {
        const m = this.list[i];
        m.age += dt;
        const k = m.age / m.life;
        if (k >= 1) { this.scene.remove(m.sp); this.free.push(m.sp); this.list.splice(i, 1); continue; }
        if (m.curl) {
          // a cheap curl: the velocity turns with a slow noise so smoke twists as it rises
          const a = time * 2.3 + m.seed, b = time * 1.7 + m.seed * 1.3;
          m.vel.x += Math.sin(a + m.sp.position.y * 9) * m.curl * dt;
          m.vel.z += Math.cos(b + m.sp.position.x * 9) * m.curl * dt;
        }
        m.vel.y += m.up * dt;
        m.vel.multiplyScalar(Math.exp(-m.drag * dt));
        m.sp.position.addScaledVector(m.vel, dt);
        m.sp.material.rotation += m.spin * dt;
        const s = m.s0 + (m.s1 - m.s0) * k;
        m.sp.scale.set(s, s, 1);
        const fade = Math.min(1, k / m.fadeIn) * (1 - Math.pow(k, 1.8));
        m.sp.material.opacity = m.op * fade;
        if (m.onStep) m.onStep(m, k);
      }
    }
    clear() { for (const m of this.list) this.scene.remove(m.sp); this.free.push(...this.list.map((m) => m.sp)); this.list.length = 0; }
  }

  // ---------- verlet rope (chains, ribbons) in viewmodel scene space ----------
  class Rope {
    constructor(n, length) {
      this.n = n; this.seg = length / (n - 1);
      this.p = []; this.q = [];
      for (let i = 0; i < n; i++) { this.p.push(new T.Vector3()); this.q.push(new T.Vector3()); }
      this.ready = false;
    }
    // a, b: end anchors (b may be null = loose end); gravity in scene units/s^2
    step(dt, a, b, gravity) {
      const n = this.n;
      if (!this.ready) { for (let i = 0; i < n; i++) { const k = i / (n - 1); this.p[i].copy(a).lerp(b || a, k); this.p[i].y -= Math.sin(k * Math.PI) * this.seg * n * 0.3; this.q[i].copy(this.p[i]); } this.ready = true; }
      const g = gravity * dt * dt;
      for (let i = 0; i < n; i++) {
        const p = this.p[i], q = this.q[i];
        const vx = (p.x - q.x) * 0.985, vy = (p.y - q.y) * 0.985, vz = (p.z - q.z) * 0.985;
        q.copy(p);
        p.x += vx; p.y += vy - g; p.z += vz;
      }
      for (let it = 0; it < 8; it++) {
        this.p[0].copy(a);
        if (b) this.p[n - 1].copy(b);
        for (let i = 0; i < n - 1; i++) {
          const p0 = this.p[i], p1 = this.p[i + 1];
          const dx = p1.x - p0.x, dy = p1.y - p0.y, dz = p1.z - p0.z;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
          const diff = (d - this.seg) / d;
          const w0 = i === 0 ? 0 : 0.5, w1 = i + 1 === n - 1 && b ? 0 : 0.5;
          const sum = w0 + w1 || 1;
          p0.x += dx * diff * w0 / sum; p0.y += dy * diff * w0 / sum; p0.z += dz * diff * w0 / sum;
          p1.x -= dx * diff * w1 / sum; p1.y -= dy * diff * w1 / sum; p1.z -= dz * diff * w1 / sum;
        }
      }
    }
    // teleport the whole rope (on big jumps, so it doesn't whip across the screen)
    reset() { this.ready = false; }
  }

  // a chain of voxel links along a rope: alternate links turn 90 degrees, like real chain
  function chainMeshes(sprite, n, voxel, parent) {
    const links = [];
    for (let i = 0; i < n; i++) {
      const m = SO.Voxel.build(sprite, { voxel, grip: 0.5, depth: 1.2 });
      if (!m) break;
      parent.add(m);
      links.push(m);
    }
    return links;
  }
  const _a = new T.Vector3(), _q = new T.Quaternion(), _q2 = new T.Quaternion(), UP = new T.Vector3(0, 1, 0);
  function layChain(links, rope) {
    for (let i = 0; i < links.length; i++) {
      const k = (i + 0.5) / links.length * (rope.n - 1);
      const j = Math.min(rope.n - 2, Math.floor(k)), f = k - j;
      const p0 = rope.p[j], p1 = rope.p[j + 1];
      links[i].position.copy(p0).lerp(p1, f);
      _a.subVectors(p1, p0).normalize();
      _q.setFromUnitVectors(UP, _a);
      _q2.setFromAxisAngle(UP, i % 2 ? Math.PI / 2 : 0);
      links[i].quaternion.copy(_q).multiply(_q2);
    }
  }

  // ---------- swing trail: a ribbon swept by a blade (base..tip), fading from a hot core ----------
  // o: { color, core, life (s), width (fraction of the blade it covers from the tip), dither }
  class Trail {
    constructor(scene, o) {
      this.o = o; this.max = 60; this.samples = [];
      const n = this.max * 2;
      this.pos = new Float32Array(n * 3); this.age = new Float32Array(n); this.side = new Float32Array(n);
      for (let i = 0; i < this.max; i++) { this.side[i * 2] = 0; this.side[i * 2 + 1] = 1; }
      const idx = [];
      for (let i = 0; i < this.max - 1; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      const g = new T.BufferGeometry();
      this.aP = new T.BufferAttribute(this.pos, 3).setUsage(T.DynamicDrawUsage);
      this.aA = new T.BufferAttribute(this.age, 1).setUsage(T.DynamicDrawUsage);
      g.setAttribute('position', this.aP); g.setAttribute('age', this.aA); g.setAttribute('side', new T.BufferAttribute(this.side, 1));
      g.setIndex(idx); g.setDrawRange(0, 0);
      this.mat = new T.ShaderMaterial({
        uniforms: { uColor: { value: new T.Color(o.color) }, uCore: { value: new T.Color(o.core != null ? o.core : 0xffffff) }, uK: { value: 1 } },
        transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending,
        vertexShader: 'attribute float age; attribute float side; varying float vA; varying float vS; void main(){ vA = age; vS = side; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
        fragmentShader: `uniform vec3 uColor, uCore; uniform float uK; varying float vA; varying float vS;
          void main(){
            float a = pow(1.0 - vA, 1.3) * smoothstep(0.0, 0.35, vS) * uK;
            vec2 c = floor(gl_FragCoord.xy / 3.0);
            float d = fract(sin(dot(c, vec2(12.9898, 78.233))) * 43758.5453);
            if (a < 0.12 + d * 0.5) discard;
            gl_FragColor = vec4(mix(uColor, uCore, smoothstep(0.55, 1.0, a * vS)), 1.0);
          }`,
      });
      this.mesh = new T.Mesh(g, this.mat);
      this.mesh.frustumCulled = false; this.mesh.renderOrder = 4;
      scene.add(this.mesh);
      this.geo = g;
    }
    // model: voxel weapon with userData.base/tip; on: sampling this frame
    update(dt, model, on) {
      const life = this.o.life || 0.16, w = this.o.width != null ? this.o.width : 1;
      for (const s of this.samples) s.age += dt;
      if (on && dt > 0) {
        const tip = model.userData.tip.getWorldPosition(new T.Vector3());
        const base = model.userData.base.getWorldPosition(new T.Vector3()).lerp(tip, 1 - w);
        const last = this.samples[this.samples.length - 1];
        // densify fast arcs so the ribbon stays a smooth curve
        if (last && last.tip.distanceTo(tip) > 0.06) {
          const n = Math.min(4, Math.floor(last.tip.distanceTo(tip) / 0.06));
          for (let i = 1; i <= n; i++) { const k = i / (n + 1); this.samples.push({ tip: last.tip.clone().lerp(tip, k), base: last.base.clone().lerp(base, k), age: last.age * (1 - k) }); }
        }
        this.samples.push({ tip, base, age: 0 });
      }
      while (this.samples.length && (this.samples[0].age > life || this.samples.length > this.max)) this.samples.shift();
      const n = this.samples.length;
      for (let i = 0; i < n; i++) {
        const s = this.samples[i], k = i * 6;
        this.pos[k] = s.base.x; this.pos[k + 1] = s.base.y; this.pos[k + 2] = s.base.z;
        this.pos[k + 3] = s.tip.x; this.pos[k + 4] = s.tip.y; this.pos[k + 5] = s.tip.z;
        const ag = Math.min(1, s.age / life);
        this.age[i * 2] = ag; this.age[i * 2 + 1] = ag;
      }
      this.geo.setDrawRange(0, Math.max(0, (n - 1) * 6));
      this.aP.needsUpdate = true; this.aA.needsUpdate = true;
    }
    dispose(scene) { scene.remove(this.mesh); this.geo.dispose(); this.mat.dispose(); }
  }

  // ---------- spirit flame: wisps that wrap a blade, drawn in fat dithered pixels ----------
  // A strip along the blade (two crossed planes so it reads edge-on too). Noise rises along it,
  // pinched toward the blade's line, quantized to the weapon's own pixel grid and dithered.
  // o: { color, soft (hot core), width (m), cells: [across, along], speed, wild, reach (past tip) }
  function flameMat(o) {
    return new T.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 }, uK: { value: 1 }, uSeed: { value: Math.random() * 10 },
        uColor: { value: new T.Color(o.color) }, uSoft: { value: new T.Color(o.soft != null ? o.soft : 0xffffff) },
        uCells: { value: new T.Vector2(o.cells ? o.cells[0] : 18, o.cells ? o.cells[1] : 150) },
        uSpeed: { value: o.speed || 1.4 }, uWild: { value: o.wild || 1 },
      },
      transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `
        uniform float uTime, uK, uSeed, uSpeed, uWild; uniform vec3 uColor, uSoft; uniform vec2 uCells; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        float fbm(vec2 p){ float a = 0.5, s = 0.0; for (int i = 0; i < 4; i++) { s += a * n(p); p *= 2.03; a *= 0.5; } return s; }
        float bayer(vec2 c){ vec2 m = mod(c, 4.0); int i = int(m.x) + int(m.y) * 4;
          float b[16]; b[0]=0.;b[1]=8.;b[2]=2.;b[3]=10.;b[4]=12.;b[5]=4.;b[6]=14.;b[7]=6.;b[8]=3.;b[9]=11.;b[10]=1.;b[11]=9.;b[12]=15.;b[13]=7.;b[14]=13.;b[15]=5.;
          for (int k = 0; k < 16; k++) if (k == i) return (b[k] + 0.5) / 16.0; return 0.5; }
        void main(){
          vec2 cell = floor(vUv * uCells);
          vec2 q = (cell + 0.5) / uCells;
          float t = uTime * uSpeed + uSeed;
          // sideways sway that grows toward the tip, rising noise
          float sway = (fbm(vec2(q.y * 3.0 - t * 0.6, uSeed)) - 0.5) * 0.5 * uWild * q.y;
          float x = abs(q.x - 0.5 - sway) * 2.0;
          float body = fbm(vec2(q.x * 4.0 + sway * 3.0, q.y * 7.0 - t * 2.2));
          float tongues = fbm(vec2(q.x * 9.0, q.y * 14.0 - t * 3.4));
          float a = (1.0 - x * (1.15 - 0.35 * body)) + (tongues - 0.55) * 0.9 * uWild;
          a *= smoothstep(0.0, 0.08, q.y) * (1.0 - smoothstep(0.72, 1.0, q.y + (body - 0.5) * 0.3));
          a = clamp(a * uK, 0.0, 1.2);
          // dither in the flame's own cells: one solid layer per cell, no smooth gradients
          if (a < bayer(cell) * 0.9 + 0.06) discard;
          vec3 col = mix(uColor, uSoft, smoothstep(0.55, 1.05, a));
          gl_FragColor = vec4(col * 0.85, 1.0);
        }`,
    });
  }
  // wrap a voxel blade (userData.base/tip) in two crossed flame strips; returns the material
  function flameOn(model, o) {
    const ud = model.userData;
    const b = ud.base.position, t = ud.tip.position;
    const len = b.distanceTo(t) * (1 + (o.reach != null ? o.reach : 0.35)), w = o.width || 0.1;
    const mat = flameMat(o);
    const g = new T.Group();
    for (let i = 0; i < 2; i++) {
      const m = new T.Mesh(new T.PlaneGeometry(w * (i ? 0.7 : 1), len).translate(0, len / 2, 0), mat);
      m.rotation.y = i * Math.PI / 2;
      m.renderOrder = 3;
      g.add(m);
    }
    g.position.copy(b).lerp(t, 0.02);
    g.position.y -= len * 0.04;
    g.rotation.z = Math.atan2(-(t.x - b.x), t.y - b.y);
    model.add(g);
    ud.flame = mat;
    return mat;
  }

  // ---------- ribbon: a cloth strip hanging from an anchor, a rope inside, a few flat pixels wide ----
  // o: { color, color2 (underside), width, length, n, glow }
  class Ribbon {
    constructor(scene, o) {
      this.o = o; this.n = o.n || 9;
      this.rope = new Rope(this.n, o.length || 0.3);
      const pos = new Float32Array(this.n * 2 * 3), idx = [];
      for (let i = 0; i < this.n - 1; i++) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
      this.geo = new T.BufferGeometry();
      this.attr = new T.BufferAttribute(pos, 3).setUsage(T.DynamicDrawUsage);
      this.geo.setAttribute('position', this.attr); this.geo.setIndex(idx);
      this.mesh = new T.Mesh(this.geo, o.glow ? new T.MeshBasicMaterial({ color: o.color, side: T.DoubleSide, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false }) : new T.MeshLambertMaterial({ color: o.color, side: T.DoubleSide }));
      this.mesh.frustumCulled = false; this.mesh.renderOrder = 3;
      scene.add(this.mesh);
      this.scene = scene; this.t = Math.random() * 10;
    }
    // anchor: Vector3 in scene space; wind: a sideways flutter amount
    update(dt, anchor, wind) {
      this.t += dt;
      this.rope.step(Math.min(dt, 1 / 30), anchor, null, 7);
      // flutter: nudge the loose end sideways
      const end = this.rope.p[this.n - 1];
      end.x += Math.sin(this.t * 7) * (wind || 0.002); end.z += Math.cos(this.t * 5) * (wind || 0.002) * 0.5;
      const w = (this.o.width || 0.03) / 2, a = this.attr.array;
      for (let i = 0; i < this.n; i++) {
        const p = this.rope.p[i], q = this.rope.p[Math.min(this.n - 1, i + 1)], r0 = this.rope.p[Math.max(0, i - 1)];
        const dx = q.x - r0.x, dy = q.y - r0.y;
        const l = Math.sqrt(dx * dx + dy * dy) || 1;
        const twist = Math.sin(this.t * 3 + i * 0.6) * 0.5;
        const sx = -dy / l * w, sy = dx / l * w, sz = twist * w;
        const taper = 1 - i / this.n * 0.4;
        a[i * 6] = p.x - sx * taper; a[i * 6 + 1] = p.y - sy * taper; a[i * 6 + 2] = p.z - sz;
        a[i * 6 + 3] = p.x + sx * taper; a[i * 6 + 4] = p.y + sy * taper; a[i * 6 + 5] = p.z + sz;
      }
      this.attr.needsUpdate = true;
      this.geo.computeVertexNormals();
    }
    dispose() { this.scene.remove(this.mesh); this.geo.dispose(); this.mesh.material.dispose(); }
  }

  // ---------- world slash: a crescent swept in front of the player, in dithered pixels ----------
  // Built around the eye in the plane of the cut: roll 0 = horizontal right-to-left, 180 = left-to-
  // right, 90 = top-down, 270 = bottom-up. The arc is revealed along the swing like a smear frame.
  // o: { pos, yaw, pitch, roll (deg), radius, arc (rad), width (m), color, core, dur, wisp (0..1),
  //      cells [along, across], tilt, drop }
  function arcGeo(r0, r1, a0, a1, seg) {
    const pos = [], uv = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const u = i / seg, a = a0 + (a1 - a0) * u;
      for (let j = 0; j < 2; j++) { const r = j ? r1 : r0; pos.push(Math.cos(a) * r, 0, -Math.sin(a) * r); uv.push(u, j); }
      if (i < seg) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    return g;
  }
  function slashMat(o) {
    return new T.ShaderMaterial({
      uniforms: { uT: { value: 0 }, uColor: { value: new T.Color(o.color) }, uCore: { value: new T.Color(o.core != null ? o.core : 0xffffff) }, uSeed: { value: Math.random() * 10 },
        uCells: { value: new T.Vector2(o.cells ? o.cells[0] : 90, o.cells ? o.cells[1] : 10) }, uWisp: { value: o.wisp != null ? o.wisp : 0.5 }, uDir: { value: o.dir || 1 }, uAlpha: { value: o.alpha != null ? o.alpha : 1 } },
      transparent: true, depthWrite: false, side: T.DoubleSide, blending: T.AdditiveBlending,
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `uniform float uT, uSeed, uWisp, uDir, uAlpha; uniform vec3 uColor, uCore; uniform vec2 uCells; varying vec2 vUv;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
        void main(){
          vec2 cell = floor(vUv * uCells), q = (cell + 0.5) / uCells;
          float along = uDir > 0.0 ? q.x : 1.0 - q.x;
          float head = uT * 1.6;
          if (along > head) discard;
          float age = head - along;
          float thick = pow(sin(along * 3.14159), 0.7) * (1.0 - smoothstep(0.0, 0.9, age) * 0.6);
          float edge = q.y;
          float wisp = n(vec2(along * 18.0 + uSeed, edge * 3.0 - uT * 6.0));
          float body = smoothstep(1.0 - thick, 1.0 - thick * 0.4, edge) * (1.0 - uWisp + uWisp * wisp * 1.6);
          float a = body * (1.0 - smoothstep(0.1, 0.6, age)) * (1.0 - smoothstep(0.75, 1.0, uT)) * uAlpha;
          float b = h(cell + floor(uT * 30.0) * 0.0) ;
          if (a < 0.18 + b * 0.55) discard;
          float hot = smoothstep(0.8, 0.98, edge) * (1.0 - smoothstep(0.0, 0.35, age));
          gl_FragColor = vec4(mix(uColor, uCore, hot), 1.0);
        }`,
    });
  }
  function slashArc(F, o) {
    const arc = o.arc || 1.9, r = o.radius || 2.6, w = o.width || 0.9;
    const mat = slashMat(Object.assign({ dir: (o.roll === 180 || o.roll === 270) ? -1 : 1 }, o));
    const mesh = new T.Mesh(arcGeo(r - w, r, Math.PI / 2 - arc / 2, Math.PI / 2 + arc / 2, 48), mat);
    const tilt = new T.Group(); tilt.rotation.x = o.tilt != null ? o.tilt : -0.32; tilt.add(mesh);
    const rollG = new T.Group(); rollG.rotation.z = -((o.roll || 0) % 180) * Math.PI / 180; rollG.add(tilt);
    rollG.position.z = -(o.ahead != null ? o.ahead : (o.radius || 2.6) * 1.25 + 0.6); // centered ahead: reads as a crescent, not a wall
    const g = new T.Group(); g.rotation.order = 'YXZ'; g.rotation.set(o.pitch || 0, o.yaw || 0, 0); g.add(rollG);
    g.position.copy(o.pos); g.position.y -= o.drop != null ? o.drop : 0.25;
    F.add(g);
    const dur = o.dur || 0.24;
    F.spawn((dt, age) => { mat.uniforms.uT.value = age / dur; if (age < dur) return true; mesh.geometry.dispose(); mat.dispose(); return false; }, [g]);
    return g;
  }

  SO.CharWeapons = {
    reg,
    get(school) { return reg[school] || null; },
    Motes, Rope, Trail, Ribbon, chainMeshes, layChain, pixelTex, artTex, puffTex, dotTex, flameMat, flameOn, slashArc, arcGeo, slashMat,
  };
})(window.SO = window.SO || {});
