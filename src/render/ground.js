// The arena floor as a deformable grid. Craters from the sim (sim/destruct.js) push the vertices
// down to the same height the bodies walk on, scorch the bowl and crack the stone around it.
// Outside the arena square a flat ring keeps the horizon (it never deforms).
(function (SO) {
  'use strict';
  const T = THREE;
  const HALF = 50, N = 200; // 100 m square, 0.5 m cells

  class Ground {
    constructor(R, mat) {
      this.R = R;
      const g = new T.PlaneGeometry(HALF * 2, HALF * 2, N, N).rotateX(-Math.PI / 2);
      this.dmg = new Float32Array(g.attributes.position.count);
      g.setAttribute('aDmg', new T.BufferAttribute(this.dmg, 1).setUsage(T.DynamicDrawUsage));
      g.attributes.position.setUsage(T.DynamicDrawUsage);
      g.attributes.normal.setUsage(T.DynamicDrawUsage);
      this.geo = g;
      this.mesh = new T.Mesh(g, mat);
      R.scene.add(this.mesh);

      const s = new T.Shape();
      s.moveTo(-160, -160); s.lineTo(160, -160); s.lineTo(160, 160); s.lineTo(-160, 160); s.lineTo(-160, -160);
      const hole = new T.Path();
      hole.moveTo(-HALF, -HALF); hole.lineTo(-HALF, HALF); hole.lineTo(HALF, HALF); hole.lineTo(HALF, -HALF); hole.lineTo(-HALF, -HALF);
      s.holes.push(hole);
      const rg = new T.ShapeGeometry(s).rotateX(-Math.PI / 2);
      rg.setAttribute('aDmg', new T.BufferAttribute(new Float32Array(rg.attributes.position.count), 1));
      R.scene.add(new T.Mesh(rg, mat));
      this.heal = 0; // > 0 while the floor smooths itself back at wave start
      this.dirty = false;
    }

    groundY(x, z) { return SO.Destruct.groundY(this.R.arena, x, z); }

    // Re-evaluate heights, normals and damage for the vertices in a square around (cx, cz).
    refresh(cx, cz, rad) {
      const pos = this.geo.attributes.position.array, nor = this.geo.attributes.normal.array;
      const craters = this.R.arena.craters || [];
      const step = (HALF * 2) / N;
      const i0 = Math.max(0, Math.floor((cx - rad + HALF) / step)), i1 = Math.min(N, Math.ceil((cx + rad + HALF) / step));
      const j0 = Math.max(0, Math.floor((cz - rad + HALF) / step)), j1 = Math.min(N, Math.ceil((cz + rad + HALF) / step));
      const e = 0.3;
      for (let j = j0; j <= j1; j++) {
        for (let i = i0; i <= i1; i++) {
          const v = j * (N + 1) + i;
          const x = pos[v * 3], z = pos[v * 3 + 2];
          const y = this.groundY(x, z);
          pos[v * 3 + 1] = y;
          const nx = this.groundY(x - e, z) - this.groundY(x + e, z), nz = this.groundY(x, z - e) - this.groundY(x, z + e);
          const l = Math.sqrt(nx * nx + 4 * e * e + nz * nz);
          nor[v * 3] = nx / l; nor[v * 3 + 1] = 2 * e / l; nor[v * 3 + 2] = nz / l;
          // scorch inside the bowl, cracks fading out to 1.6x the radius
          let d = 0;
          for (const c of craters) {
            const dx = x - c.x, dz = z - c.z, s = Math.sqrt(dx * dx + dz * dz) / c.r;
            const k = s < 1 ? 1 : s < 1.6 ? (1.6 - s) / 0.6 * 0.6 : 0;
            if (k > d) d = k;
          }
          this.dmg[v] = d;
        }
      }
      this.geo.attributes.position.needsUpdate = true;
      this.geo.attributes.normal.needsUpdate = true;
      this.geo.attributes.aDmg.needsUpdate = true;
    }

    crater(c) {
      SO.Destruct.addCrater(this.R.arena, c);
      this.refresh(c.x, c.z, c.r * 1.7);
    }

    // wave start: the craters fill back in over ~0.8 s
    restore() {
      if (!this.R.arena.craters || !this.R.arena.craters.length) return;
      this.R.arena.craters.length = 0;
      this.heal = 1;
    }

    reset() {
      if (this.R.arena.craters) this.R.arena.craters.length = 0;
      this.heal = 0;
      this.refresh(0, 0, HALF + 1);
    }

    update(dt) {
      if (this.heal <= 0) return;
      this.heal = Math.max(0, this.heal - dt / 0.8);
      const pos = this.geo.attributes.position.array, nor = this.geo.attributes.normal.array;
      const k = Math.min(1, dt * 6);
      for (let v = 0, n = this.dmg.length; v < n; v++) {
        if (this.heal === 0) { pos[v * 3 + 1] = 0; nor[v * 3] = 0; nor[v * 3 + 1] = 1; nor[v * 3 + 2] = 0; this.dmg[v] = 0; continue; }
        if (pos[v * 3 + 1] === 0 && this.dmg[v] === 0) continue;
        pos[v * 3 + 1] *= 1 - k;
        this.dmg[v] *= 1 - k;
      }
      this.geo.attributes.position.needsUpdate = true;
      this.geo.attributes.normal.needsUpdate = true;
      this.geo.attributes.aDmg.needsUpdate = true;
    }
  }

  SO.Ground = Ground;
})(window.SO = window.SO || {});
