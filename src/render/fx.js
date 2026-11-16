// Visual effects in ink and blood: particle pools, brush-stroke slashes, shockwave rings,
// iaido cut lines, telegraph glints, gibs, falling ash, and blood splats that stay on the ground.
(function (SO) {
  'use strict';
  const T = THREE;

  class ParticlePool {
    constructor(scene, n, additive) {
      this.n = n;
      this.count = 0;
      this.pos = new Float32Array(n * 3);
      this.col = new Float32Array(n * 3);
      this.size = new Float32Array(n);
      this.alpha = new Float32Array(n);
      this.vel = new Float32Array(n * 3);
      this.life = new Float32Array(n);
      this.max = new Float32Array(n);
      this.grav = new Float32Array(n);
      this.drag = new Float32Array(n);
      this.s0 = new Float32Array(n);
      const g = new T.BufferGeometry();
      this.aPos = new T.BufferAttribute(this.pos, 3).setUsage(T.DynamicDrawUsage);
      this.aCol = new T.BufferAttribute(this.col, 3).setUsage(T.DynamicDrawUsage);
      this.aSize = new T.BufferAttribute(this.size, 1).setUsage(T.DynamicDrawUsage);
      this.aAlpha = new T.BufferAttribute(this.alpha, 1).setUsage(T.DynamicDrawUsage);
      g.setAttribute('position', this.aPos);
      g.setAttribute('color', this.aCol);
      g.setAttribute('size', this.aSize);
      g.setAttribute('alpha', this.aAlpha);
      g.setDrawRange(0, 0);
      this.geom = g;
      this.mat = new T.ShaderMaterial({
        uniforms: { uScale: { value: 300 }, uSoft: { value: additive ? 1 : 0 } },
        transparent: true, depthWrite: false,
        blending: T.NormalBlending,
        vertexShader: `
          attribute float size; attribute float alpha; attribute vec3 color;
          varying vec3 vC; varying float vA;
          uniform float uScale;
          void main(){ vC = color; vA = alpha; vec4 mv = modelViewMatrix * vec4(position, 1.0); gl_PointSize = size * uScale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }
        `,
        fragmentShader: `
          varying vec3 vC; varying float vA; uniform float uSoft;
          void main(){
            vec2 q = gl_PointCoord - 0.5;
            float d = length(q);
            float a = uSoft > 0.5 ? smoothstep(0.5, 0.0, d) : step(max(abs(q.x), abs(q.y)), 0.45);
            if (a < 0.01) discard;
            if (a * vA < 0.45) discard;
            gl_FragColor = vec4(vC, 1.0);
          }
        `,
      });
      this.points = new T.Points(g, this.mat);
      this.points.frustumCulled = false;
      scene.add(this.points);
    }

    emit(x, y, z, vx, vy, vz, r, g, b, size, life, grav, drag) {
      let i = this.count;
      if (i >= this.n) i = Math.floor(Math.random() * this.n); else this.count++;
      const i3 = i * 3;
      this.pos[i3] = x; this.pos[i3 + 1] = y; this.pos[i3 + 2] = z;
      this.vel[i3] = vx; this.vel[i3 + 1] = vy; this.vel[i3 + 2] = vz;
      this.col[i3] = r; this.col[i3 + 1] = g; this.col[i3 + 2] = b;
      this.size[i] = size; this.s0[i] = size; this.alpha[i] = 1;
      this.life[i] = life; this.max[i] = life; this.grav[i] = grav; this.drag[i] = drag;
    }

    update(dt) {
      const P = this.pos, Vv = this.vel;
      for (let i = 0; i < this.count; i++) {
        this.life[i] -= dt;
        if (this.life[i] <= 0) {
          // swap-remove with last
          const j = --this.count;
          if (i !== j) {
            const i3 = i * 3, j3 = j * 3;
            for (let k = 0; k < 3; k++) { P[i3 + k] = P[j3 + k]; Vv[i3 + k] = Vv[j3 + k]; this.col[i3 + k] = this.col[j3 + k]; }
            this.size[i] = this.size[j]; this.s0[i] = this.s0[j]; this.alpha[i] = this.alpha[j];
            this.life[i] = this.life[j]; this.max[i] = this.max[j]; this.grav[i] = this.grav[j]; this.drag[i] = this.drag[j];
            i--;
          }
          continue;
        }
        const i3 = i * 3;
        const dr = Math.exp(-this.drag[i] * dt);
        Vv[i3] *= dr; Vv[i3 + 1] = Vv[i3 + 1] * dr - this.grav[i] * dt; Vv[i3 + 2] *= dr;
        P[i3] += Vv[i3] * dt; P[i3 + 1] += Vv[i3 + 1] * dt; P[i3 + 2] += Vv[i3 + 2] * dt;
        if (P[i3 + 1] < 0.02 && this.grav[i] > 0) { P[i3 + 1] = 0.02; Vv[i3 + 1] *= -0.3; Vv[i3] *= 0.6; Vv[i3 + 2] *= 0.6; }
        const t = this.life[i] / this.max[i];
        this.alpha[i] = Math.min(1, t * 2.2);
        this.size[i] = this.s0[i] * (0.4 + 0.6 * t);
      }
      this.geom.setDrawRange(0, this.count);
      this.aPos.needsUpdate = true; this.aCol.needsUpdate = true; this.aSize.needsUpdate = true; this.aAlpha.needsUpdate = true;
    }
  }

  class FX {
    constructor(R) {
      this.R = R;
      const scene = R.scene;
      this.scene = scene;
      this.glowP = new ParticlePool(scene, 6000, true);
      this.inkP = new ParticlePool(scene, 3000, false);
      this.tmpC = new T.Color();

      // Crescent slash pool
      this.crescentGeo = SO.Mat.crescentGeometry(200, 48);
      this.crescents = [];
      for (let i = 0; i < 14; i++) {
        const outer = new T.Group();
        const roll = new T.Group();
        const m = new T.Mesh(this.crescentGeo, SO.Mat.crescent());
        m.frustumCulled = false;
        roll.add(m); outer.add(roll);
        outer.visible = false;
        outer.rotation.order = 'YXZ';
        scene.add(outer);
        this.crescents.push({ outer, roll, mesh: m, t: 0, dur: 0, active: false, follow: false });
      }
      this.cIdx = 0;

      // Rings
      this.ringGeo = new T.RingGeometry(0.85, 1, 64, 1);
      this.ringGeo.rotateX(-Math.PI / 2);
      this.rings = [];
      for (let i = 0; i < 16; i++) {
        const m = new T.Mesh(this.ringGeo, new T.MeshBasicMaterial({ color: SO.PAL.fx, transparent: true, depthWrite: false, side: T.DoubleSide }));
        m.visible = false; m.frustumCulled = false;
        scene.add(m);
        this.rings.push({ m, t: 0, dur: 1, r0: 0, r1: 1, active: false });
      }
      this.rIdx = 0;

      // Lines (iaido cuts, blink trails)
      this.lineGeo = new T.BoxGeometry(1, 1, 1);
      this.lines = [];
      for (let i = 0; i < 40; i++) {
        const m = new T.Mesh(this.lineGeo, new T.MeshBasicMaterial({ color: SO.PAL.fx, transparent: true, depthWrite: false }));
        m.visible = false; m.frustumCulled = false;
        scene.add(m);
        this.lines.push({ m, t: 0, dur: 1, w: 0.1, active: false, len: 1 });
      }
      this.lIdx = 0;

      // Glints (telegraph stars)
      this.glints = [];
      for (let i = 0; i < 16; i++) {
        const g = new T.Group();
        const mat = new T.MeshBasicMaterial({ color: SO.PAL.ink, depthTest: false });
        const a = new T.Mesh(this.lineGeo, mat), b = new T.Mesh(this.lineGeo, mat);
        a.scale.set(1.4, 0.07, 0.07); b.scale.set(0.07, 1.4, 0.07);
        g.add(a); g.add(b);
        g.visible = false;
        g.renderOrder = 5;
        scene.add(g);
        this.glints.push({ g, mat, t: 0, active: false, follow: null });
      }
      this.gIdx = 0;

      // Gibs
      this.gibMax = 400;
      const gibGeo = new T.TetrahedronGeometry(0.22, 0);
      this.gibMesh = new T.InstancedMesh(gibGeo, new T.MeshBasicMaterial({ color: 0xffffff }), this.gibMax);
      this.gibMesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
      this.gibMesh.frustumCulled = false;
      this.gibList = [];
      for (let i = 0; i < this.gibMax; i++) {
        this.gibList.push({ p: new T.Vector3(), v: new T.Vector3(), r: new T.Euler(), w: new T.Vector3(), s: 1, life: 0 });
        this.gibMesh.setColorAt(i, new T.Color(1, 1, 1));
      }
      this.gibIdx = 0;
      this.dummy = new T.Object3D();
      scene.add(this.gibMesh);

      this.buildSakura();
      this.buildDecals();
    }

    buildDecals() {
      this.splatMats = [];
      for (let k = 0; k < 4; k++) {
        const cv = document.createElement('canvas'); cv.width = cv.height = 32;
        const g = cv.getContext('2d');
        g.fillStyle = '#7a0818';
        const r = SO.rng(500 + k);
        g.beginPath(); g.arc(16, 16, 6 + r() * 3, 0, Math.PI * 2); g.fill();
        for (let i = 0; i < 14; i++) { const a = r() * 6.28, d = 6 + r() * 9, s = 1 + r() * 3; g.beginPath(); g.arc(16 + Math.cos(a) * d, 16 + Math.sin(a) * d, s, 0, 6.28); g.fill(); }
        const tex = new T.CanvasTexture(cv);
        tex.magFilter = T.NearestFilter; tex.minFilter = T.NearestFilter;
        this.splatMats.push(new T.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
      }
      const geo = new T.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
      this.decals = [];
      this.dIdx = 0;
      for (let i = 0; i < 180; i++) {
        const m = new T.Mesh(geo, this.splatMats[0]);
        m.visible = false;
        m.rotation.order = 'YXZ';
        this.scene.add(m);
        this.decals.push(m);
      }
    }

    buildSakura() {
      const n = 900;
      const g = new T.BufferGeometry();
      const pos = new Float32Array(n * 3), phase = new Float32Array(n);
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * 70;
        pos[i * 3] = Math.cos(a) * r; pos[i * 3 + 1] = Math.random() * 40; pos[i * 3 + 2] = Math.sin(a) * r;
        phase[i] = Math.random() * 100;
      }
      g.setAttribute('position', new T.BufferAttribute(pos, 3));
      g.setAttribute('phase', new T.BufferAttribute(phase, 1));
      this.sakuraMat = new T.ShaderMaterial({
        uniforms: { uTime: this.R.shared.uTime, uDomain: this.R.shared.uDomain, uScale: { value: 300 } },
        transparent: true, depthWrite: false,
        vertexShader: `
          attribute float phase; uniform float uTime; uniform float uScale; varying float vP;
          void main(){
            vec3 p = position;
            float t = uTime + phase;
            p.y = mod(p.y + uTime * 1.1 + phase * 0.4, 40.0);
            p.x += sin(t * 0.7) * 2.0 + sin(t * 0.23) * 4.0;
            p.z += cos(t * 0.5) * 2.0;
            vP = phase;
            vec4 mv = modelViewMatrix * vec4(p, 1.0);
            gl_PointSize = 0.12 * uScale / max(0.1, -mv.z);
            gl_Position = projectionMatrix * mv;
          }
        `,
        fragmentShader: `
          uniform float uTime; uniform float uDomain; varying float vP;
          void main(){
            vec2 q = gl_PointCoord - 0.5;
            float a = uTime * 2.0 + vP;
            q = mat2(cos(a), -sin(a), sin(a), cos(a)) * q;
            float d = length(q * vec2(1.0, 2.2));
            if (d > 0.45) discard;
            gl_FragColor = vec4(vec3(1.0, 0.25 + fract(vP * 7.3) * 0.35, 0.08), 1.0);
          }
        `,
      });
      this.sakura = new T.Points(g, this.sakuraMat);
      this.sakura.frustumCulled = false;
      this.scene.add(this.sakura);
    }

    setScale(s) { this.glowP.mat.uniforms.uScale.value = s; this.inkP.mat.uniforms.uScale.value = s; this.sakuraMat.uniforms.uScale.value = s; }

    // ----- emitters -----
    burst(x, y, z, n, speed, color, size, life, grav, opts) {
      opts = opts || {};
      const c = this.tmpC.set(color);
      const dir = opts.dir;
      for (let i = 0; i < n; i++) {
        let vx = (Math.random() * 2 - 1), vy = (Math.random() * 2 - 1), vz = (Math.random() * 2 - 1);
        const l = Math.sqrt(vx * vx + vy * vy + vz * vz) || 1;
        const s = speed * (0.3 + Math.random() * 0.7);
        vx = vx / l * s; vy = vy / l * s + (opts.up || 0); vz = vz / l * s;
        if (dir) { vx += dir.x * speed * 0.8; vy += dir.y * speed * 0.8; vz += dir.z * speed * 0.8; }
        const pool = opts.ink ? this.inkP : this.glowP;
        const k = opts.vary ? 0.6 + Math.random() * 0.6 : 1;
        pool.emit(x, y, z, vx, vy, vz, c.r * k, c.g * k, c.b * k, size * (0.6 + Math.random() * 0.8), life * (0.6 + Math.random() * 0.6), grav, opts.drag == null ? 2 : opts.drag);
      }
    }

    blood(x, y, z, dir, amount) {
      this.burst(x, y, z, Math.round(22 * amount), 10, SO.PAL.blood, 0.24, 1.0, 22, { ink: true, dir, up: 3, drag: 1 });
      this.burst(x, y, z, Math.round(8 * amount), 6, SO.PAL.blood, 0.4, 0.3, 0, { dir, drag: 5 });
      const n = amount > 1.5 ? 3 : 1;
      for (let i = 0; i < n; i++) this.splat(x + (Math.random() - 0.5) * 2 + (dir ? dir.x * 1.5 : 0), y, z + (Math.random() - 0.5) * 2 + (dir ? dir.z * 1.5 : 0), 0.8 + amount * 0.6 * Math.random());
    }

    // Death of a sprite enemy: the drawing bursts into its own pixels, flying outward.
    shatter(v, dir) {
      const s = SO.Voxel && SO.Voxel.sprite(v.sprite);
      if (!s) return;
      const cam = this.R.camera;
      const rx = Math.cos(v.root.rotation.y), rz = -Math.sin(v.root.rotation.y);
      const base = v.root.position;
      const px = v.spriteW / s.w;
      const n = Math.min(260, Math.floor(s.w * s.h * 0.12));
      for (let i = 0, tries = 0; i < n && tries < n * 6; tries++) {
        const x = (Math.random() * s.w) | 0, y = (Math.random() * s.h) | 0;
        const o = (y * s.w + x) * 4;
        if (s.data[o + 3] < 128) continue;
        i++;
        const u = (x / s.w - 0.5) * v.flip, h = (1 - y / s.h) * v.spriteH;
        const wx = base.x + rx * u * v.spriteW, wy = base.y + h, wz = base.z + rz * u * v.spriteW;
        const ox = wx - base.x, oz = wz - base.z;
        const sp = 3 + Math.random() * 6;
        this.glowP.emit(wx, wy, wz,
          ox * 2 + (dir ? dir.x * sp : 0) + (Math.random() - 0.5) * 3, Math.random() * 6 + 1, oz * 2 + (dir ? dir.z * sp : 0) + (Math.random() - 0.5) * 3,
          s.data[o] / 255, s.data[o + 1] / 255, s.data[o + 2] / 255, px * 2.4, 1.2 + Math.random() * 0.8, 16, 1.5);
      }
      void cam;
    }

    // Blood stays: flat splat decals on the ground or the top of whatever box is below.
    splat(x, y, z, size) {
      const d = this.decals[this.dIdx++ % this.decals.length];
      let gy = this.R.ground ? this.R.ground.groundY(x, z) : 0;
      for (const b of this.R.arena.boxes) if (x > b.min.x && x < b.max.x && z > b.min.z && z < b.max.z && b.max.y <= y + 0.6 && b.max.y > gy) gy = b.max.y;
      d.position.set(x, gy + 0.02 + (this.dIdx % 7) * 0.002, z);
      d.rotation.y = Math.random() * Math.PI * 2;
      d.scale.setScalar(size);
      d.material = this.splatMats[(Math.random() * this.splatMats.length) | 0];
      d.visible = true;
    }

    clearDecals() { for (const d of this.decals) d.visible = false; }

    crescent(pos, yaw, pitch, roll, radius, color, dur, follow, core) {
      const c = this.crescents[this.cIdx++ % this.crescents.length];
      c.outer.position.copy(pos);
      c.outer.rotation.set(pitch, yaw, 0);
      c.roll.rotation.z = roll * Math.PI / 180;
      c.mesh.scale.setScalar(radius);
      c.mesh.material.uniforms.uColor.value.set(color);
      c.mesh.material.uniforms.uCore.value.set(core == null ? color : core);
      c.mesh.material.uniforms.uSeed.value = Math.random() * 100;
      c.mesh.material.uniforms.uProg.value = 0;
      c.mesh.material.uniforms.uFade.value = 1;
      c.outer.visible = true;
      c.t = 0; c.dur = dur; c.active = true; c.follow = follow || false;
      return c;
    }

    ring(x, y, z, r0, r1, color, dur, opacity) {
      const r = this.rings[this.rIdx++ % this.rings.length];
      r.m.position.set(x, y + 0.06, z);
      r.m.material.color.set(color);
      r.m.material.opacity = opacity == null ? 1 : opacity;
      r.op = r.m.material.opacity;
      r.m.visible = true;
      r.t = 0; r.dur = dur; r.r0 = r0; r.r1 = r1; r.active = true;
      r.m.scale.setScalar(r0);
    }

    line(ax, ay, az, bx, by, bz, w, color, dur) {
      const L = this.lines[this.lIdx++ % this.lines.length];
      const dx = bx - ax, dy = by - ay, dz = bz - az;
      const len = Math.sqrt(dx * dx + dy * dy + dz * dz) || 0.01;
      L.m.position.set((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
      L.m.lookAt(bx, by, bz);
      L.m.scale.set(w, w, len);
      L.m.material.color.set(color);
      L.m.visible = true;
      L.t = 0; L.dur = dur; L.w = w; L.len = len; L.active = true;
      return L;
    }

    glint(x, y, z, color, follow) {
      const g = this.glints[this.gIdx++ % this.glints.length];
      g.g.position.set(x, y, z);
      g.mat.color.set(color);
      g.g.visible = true;
      g.t = 0; g.active = true; g.follow = follow || null;
    }

    gibs(x, y, z, n, color, dir, speed) {
      const c = new T.Color(color);
      for (let i = 0; i < n; i++) {
        const k = this.gibIdx++ % this.gibMax;
        const gb = this.gibList[k];
        gb.p.set(x + (Math.random() - 0.5) * 0.6, y + (Math.random() - 0.5) * 0.8, z + (Math.random() - 0.5) * 0.6);
        gb.v.set((Math.random() - 0.5) * speed, Math.random() * speed * 0.9 + 3, (Math.random() - 0.5) * speed);
        if (dir) gb.v.addScaledVector(dir, speed * 0.6);
        gb.w.set(Math.random() * 14 - 7, Math.random() * 14 - 7, Math.random() * 14 - 7);
        gb.s = 0.6 + Math.random() * 1.4;
        gb.life = 2.5 + Math.random() * 1.5;
        const shade = 0.5 + Math.random() * 0.5;
        this.gibMesh.setColorAt(k, new T.Color(c.r * shade, c.g * shade, c.b * shade));
      }
      if (this.gibMesh.instanceColor) this.gibMesh.instanceColor.needsUpdate = true;
    }

    ripple(x, z, speed) {
      const m = this.R.floorMat;
      const r = m.ripples[m.rippleIdx++ % m.ripples.length];
      r.set(x, z, this.R.shared.uTime.value, speed || 14);
    }

    // ----- per frame -----
    update(dt, camera) {
      this.glowP.update(dt);
      this.inkP.update(dt);

      for (const c of this.crescents) {
        if (!c.active) continue;
        c.t += dt;
        const k = c.t / c.dur;
        const u = c.mesh.material.uniforms;
        u.uProg.value = Math.min(1.25, k * 1.6);
        u.uFade.value = 1 - SO.clamp((k - 0.5) / 0.5, 0, 1);
        c.mesh.scale.multiplyScalar(1 + dt * 0.8);
        if (c.follow) { c.outer.position.copy(camera.position); }
        if (k >= 1) { c.active = false; c.outer.visible = false; }
      }
      for (const r of this.rings) {
        if (!r.active) continue;
        r.t += dt;
        const k = r.t / r.dur;
        const e = 1 - Math.pow(1 - k, 2);
        r.m.scale.setScalar(r.r0 + (r.r1 - r.r0) * e);
        r.m.material.opacity = r.op * (1 - k);
        if (k >= 1) { r.active = false; r.m.visible = false; }
      }
      for (const L of this.lines) {
        if (!L.active) continue;
        L.t += dt;
        const k = L.t / L.dur;
        const w = L.w * (k < 0.15 ? k / 0.15 : 1 - (k - 0.15) / 0.85) + 0.005;
        L.m.scale.x = w; L.m.scale.y = w;
        L.m.material.opacity = 1 - k * k;
        if (k >= 1) { L.active = false; L.m.visible = false; }
      }
      for (const g of this.glints) {
        if (!g.active) continue;
        g.t += dt;
        const k = g.t / 0.35;
        const s = Math.sin(Math.min(1, k) * Math.PI) * 1.2;
        g.g.scale.setScalar(Math.max(0.001, s));
        g.g.quaternion.copy(camera.quaternion);
        g.g.rotateZ(g.t * 3);
        if (g.follow && g.follow.root) { g.g.position.copy(g.follow.root.position); g.g.position.y += g.follow.headY || 1.5; }
        if (k >= 1) { g.active = false; g.g.visible = false; }
      }
      const d = this.dummy;
      for (let i = 0; i < this.gibMax; i++) {
        const gb = this.gibList[i];
        if (gb.life <= 0) { d.scale.setScalar(0); d.updateMatrix(); this.gibMesh.setMatrixAt(i, d.matrix); continue; }
        gb.life -= dt;
        gb.v.y -= 30 * dt;
        gb.p.addScaledVector(gb.v, dt);
        if (gb.p.y < 0.1) { gb.p.y = 0.1; gb.v.y *= -0.35; gb.v.x *= 0.7; gb.v.z *= 0.7; gb.w.multiplyScalar(0.7); }
        gb.r.x += gb.w.x * dt; gb.r.y += gb.w.y * dt; gb.r.z += gb.w.z * dt;
        d.position.copy(gb.p); d.rotation.copy(gb.r);
        d.scale.setScalar(gb.s * Math.min(1, gb.life * 2));
        d.updateMatrix();
        this.gibMesh.setMatrixAt(i, d.matrix);
      }
      this.gibMesh.instanceMatrix.needsUpdate = true;
    }
  }

  SO.FX = FX;
})(window.SO = window.SO || {});
