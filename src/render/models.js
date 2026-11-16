// Rigged 3D enemies made from the author's enemy sheet: image -> 3D (TRELLIS) -> cleaned, rigged and
// animated in Blender by tools/blender/rig_enemy.py -> embedded by tools/embed-models.js.
// Each model has the actions Idle, Walk, Windup, Attack, Hit and Death. This file loads them,
// gives every instance an animation controller, a hit-flash tint and a skinned ink outline.
(function (SO) {
  'use strict';
  const T = THREE;

  function b64ToBuffer(b64) {
    const bin = atob(b64);
    const buf = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
    return buf.buffer;
  }

  // Back faces pushed out along the skinned normal: an outline that follows the animation.
  function outlineMaterial() {
    const m = new T.MeshLambertMaterial({ color: 0x050307, side: T.BackSide, skinning: true });
    m.onBeforeCompile = (sh) => {
      sh.vertexShader = sh.vertexShader.replace('#include <skinning_vertex>', '#include <skinning_vertex>\n transformed += normalize(objectNormal) * 0.012;');
    };
    return m;
  }

  class Models {
    constructor() { this.ready = false; this.gltf = {}; this.outline = null; }

    async load() {
      const src = window.SO_MODELS;
      if (!src || !T.GLTFLoader || !T.SkeletonUtils) throw new Error('3D enemy models are missing');
      const loader = new T.GLTFLoader();
      for (const name of Object.keys(src)) {
        this.gltf[name] = await new Promise((res, rej) => loader.parse(b64ToBuffer(src[name]), '', res, rej));
      }
      this.outline = outlineMaterial();
      this.ready = true;
    }

    has(name) { return !!this.gltf[name]; }

    // Models are exported 1 unit tall with the feet at the origin, facing +Z.
    instance(name, height) {
      const g = this.gltf[name];
      const body = T.SkeletonUtils.clone(g.scene);
      body.scale.setScalar(height);
      const root = new T.Group();
      root.add(body);
      const mats = [];
      const skinned = [];
      body.traverse((o) => {
        if (!o.isMesh) return;
        o.frustumCulled = false;
        // the texture also lights itself a little so the design reads in the dark arena
        const m = new T.MeshLambertMaterial({ map: o.material.map, emissiveMap: o.material.map, emissive: 0x737373, skinning: !!o.isSkinnedMesh });
        if (m.map) { m.map.magFilter = T.NearestFilter; m.map.minFilter = T.NearestFilter; }
        o.material = m;
        mats.push(m);
        if (o.isSkinnedMesh) skinned.push(o);
      });
      for (const o of skinned) {
        const ol = new T.SkinnedMesh(o.geometry, this.outline);
        ol.bind(o.skeleton, o.bindMatrix);
        ol.frustumCulled = false;
        o.parent.add(ol);
      }
      const mixer = new T.AnimationMixer(body);
      const clips = {};
      for (const c of g.animations) clips[c.name] = c;
      const ctl = {
        root, mats, mixer, current: null, currentName: '',
        // Cross-fade to a clip; once = play to the end and hold the last frame.
        play(clip, o) {
          o = o || {};
          if (this.currentName === clip && !o.restart) { if (o.speed != null && this.current) this.current.timeScale = o.speed; return; }
          const c = clips[clip];
          if (!c) return;
          const a = mixer.clipAction(c);
          a.reset();
          a.setLoop(o.once ? T.LoopOnce : T.LoopRepeat, Infinity);
          a.clampWhenFinished = !!o.once;
          a.timeScale = o.duration ? c.duration / o.duration : (o.speed != null ? o.speed : 1);
          if (this.current && this.current !== a) a.crossFadeFrom(this.current, o.fade != null ? o.fade : 0.12, false);
          a.play();
          this.current = a; this.currentName = clip;
        },
        update(dt) { mixer.update(dt); },
      };
      return ctl;
    }
  }

  SO.models = new Models();
})(window.SO = window.SO || {});
