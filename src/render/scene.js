// Renderer: builds the temple arena from sim data in the retro sumi-e style (docs/ART.md),
// drives the camera (shake, FOV, roll), and renders world + viewmodel into a low-res target
// whose color and depth feed the palette/ink post pass.
(function (SO) {
  'use strict';
  const T = THREE;
  const P = () => SO.PAL;

  const KIND_STYLE = {
    stone: { tex: 'stone' }, step: { tex: 'step' }, wood: { tex: 'wood' }, lacquer: { tex: 'lacquer' },
    torii: { tex: 'torii', scale: 1 }, toriiTop: { tex: 'toriiTop', scale: 1 }, bridge: { tex: 'bridge' },
    post: { tex: 'post', scale: 1 }, pillar: { tex: 'pillar', scale: 0.25 }, lantern: { tex: 'lantern', scale: 1 },
    wall: { tex: 'wall' },
  };

  class Renderer {
    constructor(canvas, settings) {
      this.settings = settings;
      const r = this.r = new T.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
      r.setPixelRatio(1);
      r.autoClear = false;
      r.setClearColor(0x1c0d11, 1);

      this.shared = {
        uTime: { value: 0 }, uDomain: { value: 0 },
        uFogColor: { value: new T.Color(0x1c0d11) }, uFogDensity: { value: 0.012 },
      };

      const scene = this.scene = new T.Scene();
      scene.fog = new T.FogExp2(0x1c0d11, 0.012);
      this.camera = new T.PerspectiveCamera(settings.fov, 1, 0.05, 1200);
      this.camera.rotation.order = 'YXZ';
      scene.add(this.camera);
      scene.add(new T.HemisphereLight(0x9a90a8, 0x2a0c12, 0.75));
      const dl = new T.DirectionalLight(0xffa898, 0.7); dl.position.set(0, 40, -100); scene.add(dl); // red moonlight

      const sky = new T.Mesh(new T.SphereGeometry(600, 48, 24), SO.Mat.sky(this.shared));
      sky.frustumCulled = false; sky.renderOrder = -1;
      scene.add(sky);

      this.floorMat = SO.Mat.floor(this.shared);

      this.tex = SO.Textures.get();
      this.arena = SO.Arena.build();
      this.anim = [];
      this.ground = new SO.Ground(this, this.floorMat);
      this.rubble = new SO.Rubble(this);
      this.buildArena();
      this.buildDecor();

      this.fx = new SO.FX(this);
      this.afx = new SO.AbilityFX(this); // the 80 school abilities (render/afx.js + render/afx/*.js)
      this.vm = new SO.Viewmodel(this);
      this.views = new SO.Views(this);

      this.rt = new T.WebGLRenderTarget(4, 4, { minFilter: T.NearestFilter, magFilter: T.NearestFilter, depthBuffer: true });
      this.rt.depthTexture = new T.DepthTexture();
      this.rt.depthTexture.type = T.UnsignedIntType;
      this.postMat = SO.Mat.post(this.shared);
      this.brightMat = SO.Mat.brightPass();
      this.blurMat = SO.Mat.blur();
      const bOpt = { minFilter: T.LinearFilter, magFilter: T.LinearFilter, depthBuffer: false };
      this.bA = new T.WebGLRenderTarget(4, 4, bOpt);
      this.bB = new T.WebGLRenderTarget(4, 4, bOpt);
      this.quadScene = new T.Scene();
      const quad = new T.Mesh(new T.PlaneGeometry(2, 2), this.postMat);
      quad.frustumCulled = false;
      this.quad = quad;
      this.quadScene.add(quad);
      this.postCam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);

      this.trauma = 0; this.fovKick = 0; this.fov = settings.fov; this.eyeY = SO.CFG.EYE; this.roll = 0;
      this.invert = 0; this.white = 0; this.hurt = 0; this.heal = 0; this.speedFx = 0; this.beat = 0; this.domainAmt = 0;

      window.addEventListener('resize', () => this.resize());
      this.resize();
    }

    // ---------- arena ----------
    buildArena() {
      this.boxMesh = [];
      this.boxDeco = {}; // decoration that belongs to a destructible box (lantern caps, bridge rails)
      for (const b of this.arena.boxes) {
        const sx = b.max.x - b.min.x, sy = b.max.y - b.min.y, sz = b.max.z - b.min.z;
        const st = KIND_STYLE[b.kind] || KIND_STYLE.stone;
        const m = new T.Mesh(new T.BoxGeometry(sx, sy, sz), SO.Mat.textured(this.shared, this.tex[st.tex], { x: sx, y: sy, z: sz }, st));
        m.position.set((b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2, (b.min.z + b.max.z) / 2);
        m.userData.h0 = sy;
        this.boxMesh[b.id] = m;
        this.scene.add(m);
      }
      this.buildPagodaRoofs();
      this.buildBridges();
      this.buildLanterns();

      // Jump pads: a small ensō of ink on a pale stone disc
      this.pads = [];
      for (const p of this.arena.pads) {
        const g = new T.Group(); g.position.set(p.x, 0.04, p.z);
        const base = SO.Mat.inked(new T.CylinderGeometry(p.r * 1.05, p.r * 1.15, 0.25, 20), SO.Mat.toon(0x4a4652), 0.05);
        base.position.y = 0.06;
        const ring = new T.Mesh(new T.RingGeometry(p.r * 0.5, p.r * 0.85, 28, 1, 0.4, Math.PI * 1.8).rotateX(-Math.PI / 2), SO.Mat.glow(P().blood));
        ring.position.y = 0.2;
        const arrow = SO.Mat.inked(new T.ConeGeometry(0.4, 0.7, 4), SO.Mat.toon(P().bone), 0.08);
        arrow.position.y = 1.2;
        g.add(base); g.add(ring); g.add(arrow);
        this.scene.add(g);
        this.pads.push({ g, arrow, ring });
      }
    }

    // Flared eaves under each pagoda tier: square frustums (4-sided cylinders turned 45°).
    buildPagodaRoofs() {
      const roofMat = new T.MeshToonMaterial({ map: this.tex.roof, side: T.DoubleSide });
      const ink = SO.Mat.toon(P().ink);
      const tiers = [{ y: 3, half: 6, over: 2.2 }, { y: 6, half: 3.5, over: 1.8 }, { y: 8.4, half: 1.8, over: 1.6 }];
      for (const t of tiers) {
        const rTop = (t.half + 0.05) / Math.SQRT1_2, rBot = (t.half + t.over) / Math.SQRT1_2;
        const roof = new T.Mesh(new T.CylinderGeometry(rTop, rBot, 1.0, 4, 1, true).rotateY(Math.PI / 4), roofMat);
        roof.position.set(0, t.y - 0.55, 0);
        this.scene.add(roof);
        const lip = new T.Mesh(new T.CylinderGeometry(rBot + 0.05, rBot + 0.05, 0.16, 4, 1, true).rotateY(Math.PI / 4), ink);
        lip.position.set(0, t.y - 1.05, 0);
        this.scene.add(lip);
        for (let c = 0; c < 4; c++) {
          const a = c * Math.PI / 2 + Math.PI / 4;
          const tip = SO.Mat.inked(new T.ConeGeometry(0.2, 0.9, 5), ink, 0.05);
          tip.position.set(Math.cos(a) * rBot * 0.98, t.y - 0.75, Math.sin(a) * rBot * 0.98);
          tip.rotation.z = Math.cos(a) * -0.9; tip.rotation.x = Math.sin(a) * 0.9;
          this.scene.add(tip);
        }
      }
      const plaque = this.kanjiPlane('死神', 2.6, 1.3);
      plaque.position.set(0, 7.3, 1.84);
      this.scene.add(plaque);
    }

    buildBridges() {
      const rail = SO.Mat.toon(P().ink);
      const paper = SO.Mat.toon(0x8a5a3a, 0x3a1206); // dim so only magic blooms
      for (const b of this.arena.bridges) {
        const deco = this.boxDeco[b.id] = [];
        const scene = { add: (o) => { this.scene.add(o); deco.push(o); } };
        for (const side of [-1, 1]) {
          const r1 = new T.Mesh(new T.BoxGeometry(20, 0.14, 0.14), rail);
          r1.position.set(0, 5.5, b.z + side * 1.9);
          scene.add(r1);
          for (let x = -9.5; x <= 9.5; x += 2.375) {
            const post = new T.Mesh(new T.BoxGeometry(0.14, 0.9, 0.14), rail);
            post.position.set(x, 5.05, b.z + side * 1.9);
            scene.add(post);
          }
          for (let x = -7; x <= 7; x += 3.5) {
            const lan = SO.Mat.inked(new T.CylinderGeometry(0.36, 0.36, 0.8, 8), paper, 0.07);
            const cap = new T.Mesh(new T.CylinderGeometry(0.22, 0.22, 0.1, 8), rail); cap.position.y = 0.45; lan.add(cap);
            lan.position.set(x, 3.7, b.z + side * 2.3);
            scene.add(lan);
            this.anim.push({ kind: 'sway', m: lan, off: x + b.z });
          }
        }
      }
    }

    buildLanterns() {
      const cap = SO.Mat.toon(0x3a3632);
      const light = SO.Mat.glow(0x9a5a2a);
      for (const l of this.arena.lanterns) {
        const deco = this.boxDeco[l.id] = [];
        const scene = { add: (o) => { this.scene.add(o); deco.push(o); } };
        const c = SO.Mat.inked(new T.ConeGeometry(1.15, 0.7, 4).rotateY(Math.PI / 4), cap, 0.05);
        c.position.set(l.x, l.y + 0.35, l.z);
        scene.add(c);
        const g = new T.Mesh(new T.BoxGeometry(0.72, 0.56, 0.72), light);
        g.position.set(l.x, l.y - 0.55, l.z);
        scene.add(g);
      }
    }

    kanjiPlane(text, w, h) {
      const cv = document.createElement('canvas'); cv.width = 128; cv.height = 64;
      const tex = new T.CanvasTexture(cv);
      tex.magFilter = T.NearestFilter; tex.minFilter = T.NearestFilter;
      const draw = () => {
        const c = cv.getContext('2d');
        c.fillStyle = '#0e0c0c'; c.fillRect(0, 0, 128, 64);
        c.strokeStyle = '#e9e3d5'; c.lineWidth = 3; c.strokeRect(3, 3, 122, 58);
        c.fillStyle = '#e9e3d5'; c.textAlign = 'center'; c.textBaseline = 'middle';
        c.font = '44px "DotGothic16", "MS Gothic", monospace';
        c.fillText(text, 64, 34);
        tex.needsUpdate = true;
      };
      draw();
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(draw);
      return new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshBasicMaterial({ map: tex }));
    }

    buildDecor() {
      const rnd = SO.rng(77);
      const ink = SO.Mat.toon(P().ink), wash = SO.Mat.toon(0x6a655e);
      // Sumi-e pines ringing the arena: crooked trunks with flat layered needle pads.
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2 + rnd() * 0.25;
        const rr = 52 + rnd() * 18;
        const g = new T.Group();
        g.position.set(Math.cos(a) * rr, 0, Math.sin(a) * rr);
        const h = 8 + rnd() * 7;
        let x = 0, y = 0;
        for (let s = 0; s < 4; s++) {
          const len = h / 4, lean = (rnd() - 0.5) * 0.7;
          const seg = new T.Mesh(new T.CylinderGeometry(0.28 - s * 0.05, 0.42 - s * 0.05, len, 5), ink);
          seg.position.set(x + Math.sin(lean) * len / 2, y + len / 2, 0);
          seg.rotation.z = -lean;
          g.add(seg);
          x += Math.sin(lean) * len; y += Math.cos(lean) * len * 0.98;
          if (s >= 1) {
            const pad = new T.Mesh(new T.CylinderGeometry(1.4 + rnd() * 1.8, 2.2 + rnd() * 2.2, 0.7, 7), rnd() < 0.5 ? ink : wash);
            pad.position.set(x + (rnd() - 0.5) * 2, y, (rnd() - 0.5) * 1.5);
            pad.scale.z = 0.7;
            g.add(pad);
          }
        }
        g.rotation.y = rnd() * Math.PI * 2;
        this.scene.add(g);
      }
      // Distant torii silhouettes standing in the mist
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const g = new T.Group();
        const pillar = new T.CylinderGeometry(0.9, 1.05, 18, 10);
        const p1 = new T.Mesh(pillar, ink); p1.position.set(-7, 9, 0); g.add(p1);
        const p2 = new T.Mesh(pillar, ink); p2.position.set(7, 9, 0); g.add(p2);
        const kasagi = new T.Mesh(new T.BoxGeometry(20, 1.3, 2.2), ink); kasagi.position.y = 18.6; g.add(kasagi);
        const nuki = new T.Mesh(new T.BoxGeometry(17, 0.8, 1.2), ink); nuki.position.y = 14; g.add(nuki);
        g.position.set(Math.cos(a) * 82, 0, Math.sin(a) * 82);
        g.rotation.y = -a + Math.PI / 2;
        this.scene.add(g);
      }
      // Floating rocks fading into the paper sky
      this.islands = [];
      for (let i = 0; i < 7; i++) {
        const g = new T.Group();
        const a = (i / 7) * Math.PI * 2 + rnd();
        const rr = 100 + rnd() * 90;
        g.position.set(Math.cos(a) * rr, 40 + rnd() * 50, Math.sin(a) * rr);
        const s = 4 + rnd() * 7;
        const rock = new T.Mesh(new T.ConeGeometry(s, s * 1.8, 5), wash);
        rock.rotation.x = Math.PI; rock.position.y = -s * 0.9;
        g.add(rock);
        const pine = new T.Mesh(new T.ConeGeometry(s * 0.35, s * 0.9, 5), ink); pine.position.y = s * 0.45; g.add(pine);
        this.scene.add(g);
        this.islands.push({ g, base: g.position.y, off: rnd() * 10 });
      }
    }

    resize() {
      const w = window.innerWidth, h = window.innerHeight;
      this.r.setSize(w, h);
      const s = this.settings.scale;
      const rw = Math.max(2, Math.floor(w * s)), rh = Math.max(2, Math.floor(h * s));
      this.rt.setSize(rw, rh);
      this.bA.setSize(Math.max(2, rw >> 1), Math.max(2, rh >> 1));
      this.bB.setSize(Math.max(2, rw >> 1), Math.max(2, rh >> 1));
      this.postMat.uniforms.uAspect.value = w / h;
      this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
      this.vm.camera.aspect = w / h; this.vm.camera.updateProjectionMatrix();
      this.postMat.uniforms.uRes.value.set(rw, rh);
      this.fx.setScale(rh / (2 * Math.tan(this.settings.fov * Math.PI / 360)));
    }

    setCalm(on) { this.calm = !!on; }

    addTrauma(k) { this.trauma = Math.min(1, this.trauma + k * this.settings.shake); }
    kickFov(k) { this.fovKick = Math.max(this.fovKick, k); }
    // Retro palette flashes: white = paper flash, invert = paper/ink swap (parry).
    flashWhite(k) { if (!this.calm) this.white = Math.max(this.white, k); }
    flashInvert(t) { if (!this.calm) this.invert = Math.max(this.invert, t); }
    flashBlood(k) { this.hurt = Math.max(this.hurt, k); }
    onBeat() { this.beat = 1; }
    clear() {
      this.views.clear(); this.fx.clearDecals(); this.afx.clear();
      // a new match starts with the temple whole
      this.rubble.clear();
      this.ground.reset();
      for (const b of this.arena.all) { SO.Destruct.apply(this.arena, b.id, b.max0); this.syncBox(b); }
    }

    syncBox(b) {
      const m = this.boxMesh[b.id];
      if (m) this.rubble.refit(b, m);
      for (const o of this.boxDeco[b.id] || []) o.visible = !b.gone;
    }

    // Sim destruction events (see sim/destruct.js). Returns the size of what broke, for sound/shake.
    arenaEvent(e) {
      if (e.type === 'boxHit') { const m = this.boxMesh[e.id]; if (m) { this.rubble.tremble(m); this.rubble.chips(this.arena.all[e.id], m, e); } return 0; }
      if (e.type === 'crater') {
        this.ground.crater(e);
        this.rubble.floorBurst(e);
        // dust thrown up around the rim (not from the centre, which may be right under the camera)
        for (let i = 0, n = Math.round(20 + e.r * 12); i < n; i++) {
          const a = Math.random() * 6.28, rr = e.r * (0.55 + Math.random() * 0.5), sp = 2 + e.d * 3;
          const px = e.x + Math.cos(a) * rr, pz = e.z + Math.sin(a) * rr;
          if (Math.hypot(px - this.camera.position.x, pz - this.camera.position.z) < 3) continue; // no dust in the lens
          this.fx.inkP.emit(e.x + Math.cos(a) * rr, 0.4 + Math.random(), e.z + Math.sin(a) * rr, Math.cos(a) * sp, 1.5 + Math.random() * 2, Math.sin(a) * sp, 0.35, 0.31, 0.28, 0.35 + e.r * 0.06, 1.4, 3, 1.5);
        }
        return e.r * e.r * e.d * 2;
      }
      if (e.type === 'boxBreak') {
        const b = SO.Destruct.apply(this.arena, e.id, e.h);
        if (!b) return 0;
        const m = this.boxMesh[e.id];
        this.rubble.burst(b, m, e.h < 0 ? b.min.y : e.h, e.from, e, e.how);
        this.syncBox(b);
        const sx = b.max.x - b.min.x, sz = b.max.z - b.min.z;
        const cx = (b.min.x + b.max.x) / 2, cz = (b.min.z + b.max.z) / 2;
        this.fx.burst(cx, (e.h < 0 ? b.min.y : e.h) + 0.5, cz, 30, 4, 0x6a6058, 0.6, 0.9, 2, { drag: 2 });
        return sx * sz * (e.from - (e.h < 0 ? b.min.y : e.h));
      }
      if (e.type === 'arenaRestore') {
        if (e.floor) { this.ground.restore(); this.rubble.sweep(); }
        for (const id of e.ids) {
          const b = this.arena.all[id];
          const wasGone = b.gone, wasShort = b.max.y !== b.max0;
          SO.Destruct.apply(this.arena, id, b.max0);
          this.syncBox(b);
          if (wasGone || wasShort) this.rubble.regrow(this.boxMesh[id]);
        }
      }
      return 0;
    }

    update(dt, st) {
      const sh = this.shared;
      sh.uTime.value += dt;
      const t = sh.uTime.value;
      this.beat *= Math.exp(-5 * dt);
      this.domainAmt += ((st.domain ? 1 : 0) - this.domainAmt) * Math.min(1, dt * 4);
      sh.uDomain.value = this.calm ? Math.min(this.domainAmt, 0.35) : this.domainAmt;

      const p = st.player;
      const eyeGoal = p.sliding ? SO.CFG.EYE_SLIDE : SO.CFG.EYE;
      this.eyeY += (eyeGoal - this.eyeY) * Math.min(1, dt * 14);
      const cam = this.camera;
      cam.position.set(st.pos.x, st.pos.y + this.eyeY, st.pos.z);
      this.trauma = Math.max(0, this.trauma - dt * 1.6);
      const tr = this.trauma * this.trauma;
      const sx = (Math.random() * 2 - 1) * tr * 0.05, sy = (Math.random() * 2 - 1) * tr * 0.05, sr = (Math.random() * 2 - 1) * tr * 0.05;
      const rollGoal = -(st.moveX || 0) * 0.025 + (p.sliding ? 0.05 : 0);
      this.roll += (rollGoal - this.roll) * Math.min(1, dt * 8);
      cam.rotation.set(st.pitch + sy, st.yaw + sx, this.roll + sr);

      const hs = Math.sqrt(p.vel.x * p.vel.x + p.vel.z * p.vel.z);
      const spd = Math.max(0, hs - SO.CFG.MOVE_SPEED) / 20;
      this.fovKick *= Math.exp(-7 * dt);
      const fovGoal = this.settings.fov + Math.min(14, spd * 14) + this.fovKick;
      this.fov += (fovGoal - this.fov) * Math.min(1, dt * 10);
      cam.fov = this.fov; cam.updateProjectionMatrix();
      this.speedFx += (SO.clamp(spd * 1.4 + (p.dashTimer > 0 ? 0.8 : 0) + (p.slamming ? 0.9 : 0), 0, 1) - this.speedFx) * Math.min(1, dt * 10);

      this.white = Math.max(0, this.white - dt * 6);
      this.invert = Math.max(0, this.invert - dt);
      this.hurt = Math.max(0, this.hurt - dt * 1.8);
      const pu = this.postMat.uniforms;
      pu.uWhite.value = this.white;
      pu.uInvert.value = this.invert > 0 ? 1 : 0;
      pu.uSpeed.value = this.speedFx * (this.calm ? 0.4 : 1);
      pu.uHurt.value = Math.max(this.hurt, p.hp < 30 ? 0.3 + Math.sin(t * 6) * 0.08 : 0);

      for (const pd of this.pads) {
        pd.arrow.position.y = 1.2 + Math.sin(t * 4) * 0.25;
        pd.arrow.rotation.y = t * 2;
        pd.ring.rotation.y = -t * 1.5;
      }
      for (const a of this.anim) if (a.kind === 'sway') a.m.rotation.z = Math.sin(t * 1.3 + a.off) * 0.1;
      for (const isl of this.islands) isl.g.position.y = isl.base + Math.sin(t * 0.3 + isl.off) * 3;

      this.views.update(dt, st.alpha, cam, st.ets);
      this.fx.update(dt, cam);
      this.rubble.update(dt);
      this.ground.update(dt);
      this.afx.sync(dt, st.world, p, cam);
      this.vm.update(dt, { player: p, look: st.look, frozen: st.frozen, domain: st.domain, beat: this.beat, time: t });
    }

    pass(mat, input, target) {
      this.quad.material = mat;
      mat.uniforms.tDiffuse.value = input;
      this.r.setRenderTarget(target);
      this.r.render(this.quadScene, this.postCam);
    }

    render() {
      const r = this.r;
      r.setRenderTarget(this.rt);
      r.clear();
      r.render(this.scene, this.camera);
      r.clearDepth();
      r.render(this.vm.scene, this.vm.camera);
      // selective bloom at half the low-res target: bright pass, then separable blur
      this.pass(this.brightMat, this.rt.texture, this.bA);
      this.blurMat.uniforms.uDir.value.set(1 / this.bA.width, 0);
      this.pass(this.blurMat, this.bA.texture, this.bB);
      this.blurMat.uniforms.uDir.value.set(0, 1 / this.bA.height);
      this.pass(this.blurMat, this.bB.texture, this.bA);
      this.blurMat.uniforms.uDir.value.set(2 / this.bA.width, 0);
      this.pass(this.blurMat, this.bA.texture, this.bB);
      this.blurMat.uniforms.uDir.value.set(0, 2 / this.bA.height);
      this.pass(this.blurMat, this.bB.texture, this.bA);
      this.quad.material = this.postMat;
      this.postMat.uniforms.tBloom.value = this.bA.texture;
      this.postMat.uniforms.tDiffuse.value = this.rt.texture;
      this.postMat.uniforms.tDepth.value = this.rt.depthTexture;
      r.setRenderTarget(null);
      r.clear();
      r.render(this.quadScene, this.postCam);
    }
  }

  SO.Renderer = Renderer;
})(window.SO = window.SO || {});
