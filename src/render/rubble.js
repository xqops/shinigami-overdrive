// Visual side of the destructible temple (sim/destruct.js). Purely cosmetic, so it can be as
// physical as it likes without touching the sim:
//  - big broken parts (pillar tops, torii columns, beams, bridge decks) fall as one rigid piece,
//    topple away from the hit and shatter where they strike the ground;
//  - small parts burst into irregular stone/wood fragments that bounce, tumble and stay as rubble
//    until the temple heals at wave start;
//  - hits that do not break anything knock chips off; craters throw floor slabs.
(function (SO) {
  'use strict';
  const T = THREE;
  const MAX = 520;
  const G = 24;
  const _v = new T.Vector3(), _q = new T.Quaternion();

  class Rubble {
    constructor(R) {
      this.R = R;
      // irregular chunk shapes, scaled non-uniformly per piece
      this.geos = [new T.BoxGeometry(1, 1, 1), new T.IcosahedronGeometry(0.62, 0), new T.DodecahedronGeometry(0.6, 0), new T.TetrahedronGeometry(0.8, 0)];
      this.slabMat = new T.MeshLambertMaterial({ color: 0x3e3a42 });
      this.pieces = [];
      this.rigid = [];
      this.grow = [];
      this.shake = [];
    }

    groundAt(x, z, y) {
      let g = this.R.ground ? this.R.ground.groundY(x, z) : 0;
      for (const b of this.R.arena.boxes) if (x > b.min.x && x < b.max.x && z > b.min.z && z < b.max.z && b.max.y <= y + 0.3 && b.max.y > g) g = b.max.y;
      return g;
    }

    // box: arena box (renderer copy), mesh: its Mesh. Matches the mesh to the box's current height.
    refit(b, mesh) {
      mesh.visible = !b.gone;
      if (b.gone) return;
      const h = b.max.y - b.min.y, h0 = mesh.userData.h0;
      mesh.scale.y = h / h0;
      mesh.position.y = b.min.y + h / 2;
    }

    // ---------- fragments ----------
    frag(mat, x, y, z, sx, sy, sz, v, spin) {
      if (this.pieces.length >= MAX) this.kill(this.pieces[0]);
      const m = new T.Mesh(this.geos[(Math.random() * this.geos.length) | 0], mat);
      m.scale.set(sx * (0.6 + Math.random() * 0.5), sy * (0.6 + Math.random() * 0.5), sz * (0.6 + Math.random() * 0.5));
      m.position.set(x, y, z);
      m.rotation.set(Math.random() * 6.3, Math.random() * 6.3, Math.random() * 6.3);
      this.R.scene.add(m);
      const p = {
        m, v: v.clone(),
        w: new T.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(spin),
        rest: false, half: Math.min(m.scale.x, m.scale.y, m.scale.z) * 0.45, sink: 0,
      };
      this.pieces.push(p);
      return p;
    }

    kill(p) {
      this.R.scene.remove(p.m);
      const i = this.pieces.indexOf(p);
      if (i >= 0) this.pieces.splice(i, 1);
    }

    // Splits an oriented volume (center c, half sizes h, rotation q) into fragments.
    shatterVolume(mat, c, h, q, baseV, at, blast) {
      const sx = h.x * 2, sy = h.y * 2, sz = h.z * 2;
      const cell = Math.max(0.35, Math.cbrt(sx * sy * sz / 40));
      const nx = Math.max(1, Math.min(5, Math.round(sx / cell)));
      const ny = Math.max(1, Math.min(12, Math.round(sy / cell)));
      const nz = Math.max(1, Math.min(5, Math.round(sz / cell)));
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) for (let k = 0; k < nz; k++) {
        const w = sx / nx, hh = sy / ny, d = sz / nz;
        _v.set(-h.x + (i + 0.5) * w, -h.y + (j + 0.5) * hh, -h.z + (k + 0.5) * d).applyQuaternion(q).add(c);
        const out = new T.Vector3().subVectors(_v, at);
        const dl = out.length() || 1;
        const sp = blast * (0.5 + Math.random()) / Math.max(1, dl * 0.4);
        const vel = new T.Vector3().copy(baseV).addScaledVector(out, sp / dl);
        vel.x += (Math.random() - 0.5) * 2; vel.z += (Math.random() - 0.5) * 2;
        vel.y += Math.random() * (1 + blast * 0.4);
        this.frag(mat, _v.x, _v.y, _v.z, w, hh, d, vel, 4 + blast);
      }
    }

    // The part of box b between heights y0..y1 breaks off, hit from `at`.
    burst(b, mesh, y0, y1, at, how) {
      const sx = b.max.x - b.min.x, sz = b.max.z - b.min.z, sy = y1 - y0;
      if (sy <= 0) return;
      const mat = mesh.material;
      const c = new T.Vector3((b.min.x + b.max.x) / 2, (y0 + y1) / 2, (b.min.z + b.max.z) / 2);
      const h = new T.Vector3(sx / 2, sy / 2, sz / 2);
      const atV = new T.Vector3(at.x, at.y, at.z);
      const collapse = how === 'collapse';
      // a clean break leaves splinters at the fracture line
      const chipsAt = new T.Vector3(c.x, y0, c.z);
      for (let i = 0; i < 6; i++) {
        const s = Math.min(0.3, Math.min(sx, sz) * 0.3);
        this.frag(mat, chipsAt.x + (Math.random() - 0.5) * sx, chipsAt.y + Math.random() * 0.3, chipsAt.z + (Math.random() - 0.5) * sz, s, s, s,
          new T.Vector3((Math.random() - 0.5) * 6, 2 + Math.random() * 4, (Math.random() - 0.5) * 6), 10);
      }
      if (Math.max(sx, sy, sz) > 2.2) {
        // big piece: one rigid body that topples away from the hit and shatters on impact
        const g = new T.Mesh(new T.BoxGeometry(sx, sy, sz), mat);
        g.position.copy(c);
        this.R.scene.add(g);
        const push = new T.Vector3(c.x - at.x, 0, c.z - at.z);
        if (push.lengthSq() < 1e-4) push.set(Math.random() - 0.5, 0, Math.random() - 0.5);
        push.normalize();
        const axis = new T.Vector3().crossVectors(new T.Vector3(0, 1, 0), push).normalize();
        const tall = sy > Math.max(sx, sz);
        this.rigid.push({
          m: g, h, mat,
          v: collapse ? new T.Vector3(push.x * 0.6, 0, push.z * 0.6) : new T.Vector3(push.x * 3.5, 1.5, push.z * 3.5),
          w: axis.multiplyScalar(collapse ? 0.25 + Math.random() * 0.4 : tall ? 1.4 + Math.random() : 0.6),
          age: 0,
        });
        return;
      }
      this.shatterVolume(mat, c, h, new T.Quaternion(), new T.Vector3(), atV, collapse ? 1.5 : 9);
    }

    // a hit that did not break the piece knocks a few chips off its surface
    chips(b, mesh, at) {
      if (!b || b.gone) return;
      const x = SO.clamp(at.x, b.min.x, b.max.x), y = SO.clamp(at.y, b.min.y, b.max.y), z = SO.clamp(at.z, b.min.z, b.max.z);
      const n = new T.Vector3(at.x - x, 0.5, at.z - z).normalize();
      for (let i = 0; i < 3; i++) {
        const s = 0.08 + Math.random() * 0.12;
        this.frag(mesh.material, x, y, z, s, s, s, n.clone().multiplyScalar(4 + Math.random() * 5).add(new T.Vector3((Math.random() - 0.5) * 3, Math.random() * 3, (Math.random() - 0.5) * 3)), 14);
      }
    }

    // floor slabs thrown out of a fresh crater
    floorBurst(c) {
      const n = Math.min(28, Math.round(6 + c.r * 3.5));
      for (let i = 0; i < n; i++) {
        const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * c.r * 0.8;
        const x = c.x + Math.cos(a) * rr, z = c.z + Math.sin(a) * rr;
        const s = (0.25 + Math.random() * 0.45) * Math.min(1.6, 0.5 + c.r * 0.2);
        const sp = 3 + c.d * 5 * (0.5 + Math.random());
        this.frag(this.slabMat, x, this.R.ground.groundY(x, z) + 0.2, z, s, s * 0.35, s * (0.7 + Math.random() * 0.6),
          new T.Vector3(Math.cos(a) * sp * 0.6, sp * (0.8 + Math.random() * 0.6), Math.sin(a) * sp * 0.6), 9);
      }
    }

    // a hit that did not break the piece: it trembles a little
    tremble(mesh) { if (!this.shake.some((s) => s.m === mesh)) this.shake.push({ m: mesh, t: 0.25, x: mesh.position.x, z: mesh.position.z }); }

    regrow(mesh) {
      mesh.visible = true;
      this.grow.push({ m: mesh, t: 0, y: mesh.position.y, sy: mesh.scale.y });
    }

    // wave start: the rubble sinks away as the temple heals
    sweep() {
      for (const p of this.pieces) { p.rest = true; p.sink = 0.001 + Math.random() * 0.3; }
      for (const r of this.rigid) this.R.scene.remove(r.m);
      this.rigid.length = 0;
    }

    clear() {
      for (const p of this.pieces.slice()) this.kill(p);
      for (const r of this.rigid) this.R.scene.remove(r.m);
      this.rigid.length = 0;
      for (const g of this.grow) { g.m.scale.y = g.sy; g.m.position.y = g.y; }
      this.grow.length = 0;
      for (const s of this.shake) { s.m.position.x = s.x; s.m.position.z = s.z; }
      this.shake.length = 0;
    }

    update(dt) {
      // rigid falling parts
      for (let i = this.rigid.length - 1; i >= 0; i--) {
        const r = this.rigid[i];
        r.age += dt;
        r.v.y -= G * dt;
        r.m.position.addScaledVector(r.v, dt);
        const wl = r.w.length();
        if (wl > 0) { _q.setFromAxisAngle(_v.copy(r.w).divideScalar(wl), wl * dt); r.m.quaternion.premultiply(_q); }
        r.w.multiplyScalar(1 + dt * 1.2); // toppling speeds up as it leans
        // lowest corner against the ground (or a box top below it)
        let hitG = false;
        for (let k = 0; k < 8 && !hitG; k++) {
          _v.set(k & 1 ? r.h.x : -r.h.x, k & 2 ? r.h.y : -r.h.y, k & 4 ? r.h.z : -r.h.z).applyQuaternion(r.m.quaternion).add(r.m.position);
          if (_v.y < this.groundAt(_v.x, _v.z, _v.y + 0.5)) hitG = true;
        }
        if ((hitG && r.age > 0.08) || r.age > 4) {
          this.R.scene.remove(r.m);
          this.rigid.splice(i, 1);
          const at = r.m.position.clone();
          at.y -= r.h.y;
          this.shatterVolume(r.mat, r.m.position, r.h, r.m.quaternion, r.v.clone().multiplyScalar(0.25).setY(0), at, 4 + Math.min(8, -r.v.y * 0.4));
          this.R.fx.burst(r.m.position.x, this.groundAt(r.m.position.x, r.m.position.z, r.m.position.y) + 0.3, r.m.position.z, 40, 5, 0x5a5048, 0.7, 1.2, 2, { drag: 2 });
          this.R.addTrauma(0.08);
          if (this.onImpact) this.onImpact(r.m.position, r.h.x * r.h.y * r.h.z * 8);
        }
      }
      // fragments
      for (let i = this.pieces.length - 1; i >= 0; i--) {
        const p = this.pieces[i];
        if (p.sink > 0) {
          p.sink += dt;
          if (p.sink > 0.4) p.m.position.y -= dt * 2.5;
          if (p.sink > 1.4) this.kill(p);
          continue;
        }
        if (p.rest) continue;
        p.v.y -= G * dt;
        p.m.position.addScaledVector(p.v, dt);
        p.m.rotation.x += p.w.x * dt; p.m.rotation.y += p.w.y * dt; p.m.rotation.z += p.w.z * dt;
        const g = this.groundAt(p.m.position.x, p.m.position.z, p.m.position.y) + p.half;
        if (p.m.position.y < g) {
          p.m.position.y = g;
          if (p.v.y < -2.5) { p.v.y *= -0.25; p.v.x *= 0.5; p.v.z *= 0.5; p.w.multiplyScalar(0.45); }
          else if (Math.abs(p.v.x) + Math.abs(p.v.z) > 1.2) { p.v.y = 0; p.v.x *= 0.85; p.v.z *= 0.85; p.w.multiplyScalar(0.8); } // tumbles and slides
          else p.rest = true;
        }
        if (p.m.position.y < -20) this.kill(p);
      }
      // regrowth: rises from the ground like ink filling a brush stroke
      for (let i = this.grow.length - 1; i >= 0; i--) {
        const g = this.grow[i];
        g.t += dt / 0.7;
        const k = g.t >= 1 ? 1 : 1 - Math.pow(1 - g.t, 3);
        const h = g.sy * Math.max(0.02, k);
        const base = g.y - g.sy * g.m.userData.h0 / 2;
        g.m.scale.y = h;
        g.m.position.y = base + h * g.m.userData.h0 / 2;
        if (g.t >= 1) this.grow.splice(i, 1);
      }
      for (let i = this.shake.length - 1; i >= 0; i--) {
        const s = this.shake[i];
        s.t -= dt;
        const a = Math.max(0, s.t) * 0.25;
        s.m.position.x = s.x + (Math.random() - 0.5) * a;
        s.m.position.z = s.z + (Math.random() - 0.5) * a;
        if (s.t <= 0) { s.m.position.x = s.x; s.m.position.z = s.z; this.shake.splice(i, 1); }
      }
    }
  }

  SO.Rubble = Rubble;
})(window.SO = window.SO || {});
