// Shaders and material factories for the "Abismo retrô" look (see docs/ART.md): a dark abyss of
// cold stone and black silhouettes, blood red as the base accent, and each power owning its own
// color. The post pass posterizes with ordered dithering and draws ink outlines from depth.
(function (SO) {
  'use strict';

  // Semantic palette. `fx` is the default color for sparks, rings and slash strokes: light ash
  // that reads on the dark world. Power colors live with the powers (src/sim/weapons.js).
  const PAL = { bg: 0x0b090d, stone: 0x3a3640, ink: 0x0b090d, bone: 0xd9d2c3, fx: 0xc9c2b6, blood: 0xc8102e, ember: 0xff4a1c, steel: 0xb8bcc4 };
  PAL.paper = PAL.bone; // legacy name used by older call sites
  PAL.wash = 0x5a5560;
  PAL.white = 0xffffff;
  SO.PAL = PAL;

  const NOISE = `
    float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float vnoise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), f.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), f.x), f.y); }
    float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * vnoise(p); p *= 2.03; a *= 0.5; } return v; }
  `;
  const INKS = `
    const vec3 VOID = vec3(0.028, 0.022, 0.036);
    const vec3 HAZE = vec3(0.16, 0.075, 0.085);
    const vec3 STONE = vec3(0.42, 0.40, 0.46);
    const vec3 INK = vec3(0.03, 0.025, 0.035);
    const vec3 BLOOD = vec3(0.784, 0.063, 0.180);
    const vec3 EMBER = vec3(1.0, 0.29, 0.11);
  `;
  const FOG = `
    uniform vec3 uFogColor; uniform float uFogDensity;
    vec3 applyFog(vec3 col, vec3 wpos){
      float d = length(wpos - cameraPosition);
      float f = 1.0 - exp(-pow(d * uFogDensity, 1.5));
      return mix(col, uFogColor, clamp(f, 0.0, 1.0));
    }
  `;

  // The abyss sky: black void above, a blood haze at the horizon, a red moon, ember streaks,
  // and black mountain ridges (farther ridges fade into the haze).
  function sky(shared) {
    return new THREE.ShaderMaterial({
      uniforms: { uTime: shared.uTime },
      side: THREE.BackSide, depthWrite: false, fog: false,
      vertexShader: `
        varying vec3 vDir;
        void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position = p.xyww; }
      `,
      fragmentShader: NOISE + INKS + `
        uniform float uTime;
        varying vec3 vDir;
        void main(){
          vec3 d = normalize(vDir);
          float h = d.y;
          float a = atan(d.z, d.x);
          vec3 col = mix(HAZE, VOID, smoothstep(0.0, 0.45, h));
          float c = fbm(vec2(a * 2.5 + uTime * 0.006, h * 9.0));
          col += vec3(0.22, 0.05, 0.05) * smoothstep(0.62, 0.8, c) * smoothstep(0.05, 0.3, h) * (1.0 - smoothstep(0.3, 0.7, h));
          // the blood moon with a soft halo
          vec3 md = normalize(vec3(0.0, 0.22, -1.0));
          float m = dot(d, md);
          col += BLOOD * pow(max(m, 0.0), 60.0) * 0.6;
          col = mix(col, BLOOD * 1.1, smoothstep(0.9935, 0.9942, m));
          col = mix(col, BLOOD * 0.7, smoothstep(0.9965, 0.997, m) * step(0.5, fbm(d.xy * 60.0)));
          for (int i = 0; i < 3; i++) {
            float fi = float(i);
            float ridge = 0.015 + (0.13 - fi * 0.033) * fbm(vec2(a * (1.6 + fi * 1.3) + fi * 9.0, fi * 3.7));
            ridge += 0.02 * pow(abs(sin(a * (3.0 + fi * 2.0) + fi)), 6.0);
            vec3 tone = mix(HAZE * 0.75, INK, fi * 0.5);
            col = mix(col, tone, smoothstep(ridge, ridge - 0.004, h));
          }
          if (h < 0.0) col = mix(col, HAZE * 0.8, smoothstep(0.0, -0.05, h));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }

  // Ground: cold flagstones; the arena edge is a ring of blood-red runes that pulse.
  function floor(shared) {
    const ripples = [];
    for (let i = 0; i < 8; i++) ripples.push(new THREE.Vector4(0, 0, -100, 10));
    const m = new THREE.ShaderMaterial({
      uniforms: {
        uTime: shared.uTime, uFogColor: shared.uFogColor, uFogDensity: shared.uFogDensity,
        uRipples: { value: ripples }, uRadius: { value: SO.CFG.ARENA_RADIUS }, uMap: { value: SO.Textures.get().floor },
      },
      vertexShader: `
        attribute float aDmg;
        varying vec3 vW; varying vec3 vN; varying float vD;
        void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; vN = normal; vD = aDmg; gl_Position = projectionMatrix * viewMatrix * w; }
      `,
      fragmentShader: NOISE + INKS + FOG + `
        uniform float uTime, uRadius;
        uniform vec4 uRipples[8];
        uniform sampler2D uMap;
        varying vec3 vW; varying vec3 vN; varying float vD;
        void main(){
          vec2 p = vW.xz;
          float r = length(p);
          vec3 col = texture2D(uMap, p / 4.0).rgb * STONE * 0.62;
          // craters (render/ground.js): relief from the moon side, scorched bowl, cracked rim
          vec3 nn = normalize(vN);
          float sl = dot(nn, normalize(vec3(-0.6, 0.8, -0.4)));
          col *= clamp(1.0 + (sl - 0.743) * 2.4, 0.2, 1.45); // flat floor = 1.0
          if (vD > 0.001) {
            float burn = smoothstep(0.55, 1.0, vD);
            col = mix(col, vec3(0.045, 0.035, 0.04), burn * 0.5);
            float cn = vnoise(p * 1.9) + 0.5 * vnoise(p * 4.3 + 7.0);
            float crack = 1.0 - smoothstep(0.0, 0.05, abs(cn - 0.75));
            col = mix(col, vec3(0.01), crack * smoothstep(0.05, 0.35, vD));
            // a few cracks still glow faintly where the heat went in
            col += BLOOD * 0.5 * crack * burn * step(0.6, vnoise(p * 0.8 + 3.0));
            col *= 1.0 - 0.25 * vD * vnoise(p * 9.0);
          }
          float n = fbm(p * 0.07);
          col *= mix(1.0, 0.7, smoothstep(0.45, 0.7, n));
          // blood seeping in the cracks near the rim
          col = mix(col, BLOOD * 0.35, smoothstep(0.7, 0.85, fbm(p * 0.35)) * smoothstep(uRadius - 14.0, uRadius, r));
          float ang = atan(p.y, p.x);
          float runes = step(0.5, fract(ang * 24.0 / 6.28318)) * step(0.35, vnoise(vec2(floor(ang * 48.0 / 6.28318), 1.0)));
          float band = smoothstep(1.0, 0.7, abs(r - uRadius - 0.8));
          col = mix(col, BLOOD * (0.55 + 0.45 * sin(uTime * 2.0 - ang * 3.0)), band * runes);
          col = mix(col, INK, smoothstep(0.25, 0.0, abs(r - uRadius - 1.9)));
          for (int i = 0; i < 8; i++) {
            vec4 rp = uRipples[i];
            float age = uTime - rp.z;
            if (age < 0.0 || age > 1.2) continue;
            float rr = length(p - rp.xy);
            float wv = smoothstep(0.55, 0.0, abs(rr - age * rp.w) + (fbm(p * 2.0) - 0.5) * 0.4) * (1.0 - age / 1.2);
            col = mix(col, vec3(0.85, 0.8, 0.72), wv * 0.8);
          }
          if (r > uRadius + 3.0) col *= 0.5;
          gl_FragColor = vec4(applyFog(col, vW), 1.0);
        }
      `,
    });
    m.ripples = ripples;
    m.rippleIdx = 0;
    return m;
  }

  // Architecture: grayscale texture tinted to cold stone, hard two-step light, wobbly ink edges.
  function textured(shared, tex, size, opts) {
    opts = opts || {};
    return new THREE.ShaderMaterial({
      uniforms: {
        uFogColor: shared.uFogColor, uFogDensity: shared.uFogDensity,
        uMap: { value: tex }, uSize: { value: new THREE.Vector3(size.x, size.y, size.z) },
        uScale: { value: opts.scale || 0.5 }, uTone: { value: opts.tone == null ? 1 : opts.tone },
      },
      vertexShader: `
        varying vec3 vW; varying vec3 vL; varying vec3 vN;
        void main(){ vL = position; vN = normal; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }
      `,
      fragmentShader: NOISE + INKS + FOG + `
        uniform float uScale, uTone;
        uniform vec3 uSize; uniform sampler2D uMap;
        varying vec3 vW; varying vec3 vL; varying vec3 vN;
        void main(){
          vec3 an = abs(vN);
          vec2 uv = an.y > 0.5 ? vW.xz : (an.x > 0.5 ? vW.zy : vW.xy);
          vec3 tex = texture2D(uMap, uv * uScale).rgb * uTone * STONE;
          vec3 moon = normalize(vec3(0.0, 0.4, -1.0));
          float lit = dot(vN, moon) > 0.1 ? 1.0 : 0.6;
          vec3 col = tex * lit;
          // red bounce light from the moon side
          col += BLOOD * 0.08 * max(dot(vN, moon), 0.0);
          col *= mix(0.55, 1.0, smoothstep(0.0, 1.4, vW.y));
          vec3 ds = uSize * 0.5 - abs(vL);
          float mid = max(min(ds.x, ds.y), min(max(ds.x, ds.y), ds.z));
          float wob = (vnoise(vW.xz * 3.0 + vW.y * 2.0) - 0.5) * 0.04;
          col = mix(col, INK, 1.0 - smoothstep(0.03, 0.07, mid + wob));
          gl_FragColor = vec4(applyFog(col, vW), 1.0);
        }
      `,
    });
  }

  // Flat unlit color (sparks, glints, telegraphs, glowing details).
  function glow(color, opacity) {
    const see = opacity != null && opacity < 1;
    return new THREE.MeshBasicMaterial({ color, transparent: see, opacity: opacity == null ? 1 : opacity, depthWrite: !see, side: THREE.DoubleSide, fog: false });
  }

  // Brush-stroke crescent (slashes and wave attacks). a = along the stroke, b = across it.
  function crescent() {
    return new THREE.ShaderMaterial({
      uniforms: { uProg: { value: 0 }, uFade: { value: 1 }, uColor: { value: new THREE.Color(PAL.fx) }, uCore: { value: new THREE.Color(PAL.fx) }, uWidth: { value: 0.6 }, uSeed: { value: 0 } },
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      vertexShader: `
        attribute float a; attribute float b;
        varying float vA; varying float vB;
        void main(){ vA = a; vB = b; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
      `,
      fragmentShader: NOISE + `
        uniform float uProg, uFade, uWidth, uSeed; uniform vec3 uColor, uCore;
        varying float vA; varying float vB;
        void main(){
          float head = uProg;
          float body = smoothstep(head - uWidth, head - uWidth * 0.6, vA) * step(vA, head);
          float bristle = vnoise(vec2(vB * 18.0 + uSeed, vA * 2.0));
          float edge = smoothstep(0.0, 0.25 + bristle * 0.25, vB) * smoothstep(1.0, 0.7 - bristle * 0.2, vB);
          float dry = step(0.28, vnoise(vec2(vA * 40.0 + uSeed, vB * 6.0)) + (1.0 - (head - vA) / uWidth) * 0.6);
          float alpha = body * edge * dry * uFade;
          if (alpha < 0.5) discard;
          vec3 col = mix(uColor, uCore, smoothstep(0.35, 0.6, vB) * smoothstep(0.85, 0.6, vB));
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }

  function crescentGeometry(arcDeg, segments) {
    const A = arcDeg * Math.PI / 180;
    const pos = [], aa = [], bb = [], idx = [];
    for (let i = 0; i <= segments; i++) {
      const s = i / segments;
      const th = -A / 2 + A * s;
      const w = 0.04 + 0.22 * Math.sin(s * Math.PI);
      for (let j = 0; j < 2; j++) {
        const r = j === 0 ? 1 - w : 1 + w * 0.25;
        pos.push(-Math.sin(th) * r, 0, -Math.cos(th) * r);
        aa.push(s); bb.push(j);
      }
      if (i < segments) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 1, k + 3, k + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('a', new THREE.Float32BufferAttribute(aa, 1));
    g.setAttribute('b', new THREE.Float32BufferAttribute(bb, 1));
    g.setIndex(idx);
    return g;
  }

  let gradTex = null;
  function toonGradient() {
    if (gradTex) return gradTex;
    gradTex = new THREE.DataTexture(new Uint8Array([110, 110, 110, 255, 255, 255]), 2, 1, THREE.RGBFormat);
    gradTex.minFilter = THREE.NearestFilter; gradTex.magFilter = THREE.NearestFilter; gradTex.generateMipmaps = false;
    gradTex.needsUpdate = true;
    return gradTex;
  }
  function toon(color, emissive) {
    return new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), emissive: emissive || 0x000000 });
  }
  const outlineMat = new THREE.MeshBasicMaterial({ color: PAL.ink, side: THREE.BackSide });

  function inked(geom, mat, thickness) {
    const g = new THREE.Group();
    const m = new THREE.Mesh(geom, mat);
    const o = new THREE.Mesh(geom, outlineMat);
    o.scale.setScalar(1 + (thickness || 0.08));
    g.add(o); g.add(m);
    g.userData.mesh = m;
    return g;
  }

  const QUAD_VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  function brightPass() {
    return new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null } },
      depthTest: false, depthWrite: false, vertexShader: QUAD_VS,
      fragmentShader: `
        uniform sampler2D tDiffuse; varying vec2 vUv;
        void main(){
          vec3 c = texture2D(tDiffuse, vUv).rgb;
          float mx = max(c.r, max(c.g, c.b)), mn = min(c.r, min(c.g, c.b));
          float sat = mx > 0.0 ? (mx - mn) / mx : 0.0;
          // saturated colors (magic) bloom early; pure white only when very bright
          float k = smoothstep(0.62, 0.95, mx) * mix(0.2, 1.0, smoothstep(0.35, 0.7, sat));
          gl_FragColor = vec4(c * k, 1.0);
        }`,
    });
  }
  function blur() {
    return new THREE.ShaderMaterial({
      uniforms: { tDiffuse: { value: null }, uDir: { value: new THREE.Vector2(1, 0) } },
      depthTest: false, depthWrite: false, vertexShader: QUAD_VS,
      fragmentShader: `
        uniform sampler2D tDiffuse; uniform vec2 uDir; varying vec2 vUv;
        void main(){
          vec3 c = texture2D(tDiffuse, vUv).rgb * 0.227;
          c += texture2D(tDiffuse, vUv + uDir * 1.385).rgb * 0.316;
          c += texture2D(tDiffuse, vUv - uDir * 1.385).rgb * 0.316;
          c += texture2D(tDiffuse, vUv + uDir * 3.231).rgb * 0.07;
          c += texture2D(tDiffuse, vUv - uDir * 3.231).rgb * 0.07;
          gl_FragColor = vec4(c, 1.0);
        }`,
    });
  }

  // Post: depth-edge ink outlines, then a retro posterize with Bayer dithering (keeps colors,
  // limits each channel to a few steps). Domain expansion inverts and hue-cycles the image and
  // folds it into a kaleidoscope (the psychedelic reward); parry inverts for a few frames.
  function post(shared) {
    return new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null }, tDepth: { value: null }, uTime: shared.uTime, uDomain: shared.uDomain,
        uRes: { value: new THREE.Vector2(1, 1) }, uNear: { value: 0.05 }, uFar: { value: 1200 },
        uInvert: { value: 0 }, uSpeed: { value: 0 }, uHurt: { value: 0 }, uWhite: { value: 0 },
        tBloom: { value: null }, uBloom: { value: 1.0 }, uAspect: { value: 1.6 },
        uWell: { value: new THREE.Vector4(0, 0, 0, 0) }, uShield: { value: 0 }, uShieldHit: { value: 0 }, uShieldColor: { value: new THREE.Color(0x52e6ff) },
        // ultimate atmospheres (render/afx.js): color grade, darkness under the glow, RGB split
        uGrade: { value: new THREE.Color(0xffffff) }, uGradeAmt: { value: 0 }, uDark: { value: 0 }, uAberr: { value: 0 },
      },
      depthTest: false, depthWrite: false,
      vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`,
      fragmentShader: NOISE + INKS + `
        uniform sampler2D tDiffuse, tDepth, tBloom;
        uniform float uTime, uDomain, uNear, uFar, uInvert, uSpeed, uHurt, uWhite, uBloom, uAspect, uShield, uShieldHit, uGradeAmt, uDark, uAberr;
        uniform vec4 uWell; uniform vec3 uShieldColor, uGrade;
        uniform vec2 uRes;
        varying vec2 vUv;
        float bayer2(vec2 a){ a = floor(a); return fract(dot(a, vec2(0.5, a.y * 0.75))); }
        float bayer4(vec2 a){ return bayer2(0.5 * a) * 0.25 + bayer2(a); }
        float lin(vec2 uv){ float z = texture2D(tDepth, uv).r * 2.0 - 1.0; return 2.0 * uNear * uFar / (uFar + uNear - z * (uFar - uNear)); }
        vec3 hueShift(vec3 c, float a){ const vec3 k = vec3(0.57735); float ca = cos(a); return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca); }
        void main(){
          vec2 uv = vUv;
          vec2 c = uv - 0.5;
          if (uDomain > 0.0) {
            float ang = atan(c.y, c.x), r = length(c);
            float seg = 6.28318 / 6.0;
            float a2 = mod(ang + uTime * 0.25, seg); a2 = abs(a2 - seg * 0.5);
            uv = mix(uv, vec2(cos(a2), sin(a2)) * r + 0.5, uDomain * 0.3 * smoothstep(0.1, 0.55, r));
            uv += vec2(sin(uv.y * 14.0 + uTime * 3.0), cos(uv.x * 12.0 + uTime * 2.4)) * 0.006 * uDomain;
          }
          if (uWell.w > 0.0) {
            vec2 dw = uv - uWell.xy; dw.x *= uAspect;
            float r = length(dw);
            float k = uWell.w * smoothstep(uWell.z, 0.0, r);
            float a = k * 2.6;
            vec2 rot = vec2(dw.x * cos(a) - dw.y * sin(a), dw.x * sin(a) + dw.y * cos(a));
            rot *= 1.0 + k * 0.35;
            rot.x /= uAspect;
            uv = uWell.xy + rot;
          }
          vec3 col = texture2D(tDiffuse, uv).rgb;
          if (uAberr > 0.0) { vec2 ao = c * uAberr * 0.03; col.r = texture2D(tDiffuse, uv + ao).r; col.b = texture2D(tDiffuse, uv - ao).b; }
          vec2 px = floor(uv * uRes);
          vec2 tx = 1.0 / uRes;
          float d0 = lin(uv);
          float dd = max(max(abs(lin(uv + vec2(tx.x, 0.0)) - d0), abs(lin(uv - vec2(tx.x, 0.0)) - d0)),
                         max(abs(lin(uv + vec2(0.0, tx.y)) - d0), abs(lin(uv - vec2(0.0, tx.y)) - d0)));
          float edge = step(0.06 + d0 * 0.012, dd) * (1.0 - smoothstep(60.0, 150.0, d0));
          col = mix(col, INK, edge * 0.9);
          float b = bayer4(px);
          // speed lines: ash streaks radiating from the center
          float ang = atan(c.y, c.x);
          float line = step(0.9, hash(vec2(floor(ang * 70.0), floor(uTime * 20.0))));
          float rr = length(c);
          if (line * uSpeed * smoothstep(0.25, 0.6, rr) > b + 0.15) col = mix(col, vec3(0.8, 0.76, 0.7), 0.6);
          float vig = smoothstep(0.3, 0.8, rr + (fbm(px * 0.05) - 0.5) * 0.25);
          if (vig * uHurt > b * 0.9 + 0.05) col = BLOOD;
          col *= 1.0 - smoothstep(0.45, 0.95, rr) * 0.45;
          if (uWhite > b) col = vec3(0.95, 0.9, 0.85);
          if (uInvert > 0.5) col = vec3(1.0) - col;
          if (uDomain > 0.01) {
            float lum = dot(col, vec3(0.3, 0.59, 0.11));
            vec3 dc = hueShift(vec3(1.0, 0.1, 0.5), uTime * 1.6 + lum * 6.0) * (0.25 + lum * 2.2);
            col = mix(col, dc, step(1.0 - uDomain, b * 0.98 + 0.01));
          }
          if (uGradeAmt > 0.0) { float gl = dot(col, vec3(0.3, 0.59, 0.11)); col = mix(col, uGrade * (gl * 1.7 + 0.06) + col * 0.2, uGradeAmt); }
          // darkness swallows the world but not the glow: bloom is added after it
          if (uDark > 0.0) col *= 1.0 - uDark * (0.55 + 0.4 * smoothstep(0.1, 0.7, rr));
          col += texture2D(tBloom, uv).rgb * uBloom * (1.0 + uDark * 0.6);
          if (uShield > 0.0) {
            // hexagonal barrier at the screen edges, pulsing on each blocked hit
            vec2 q = vec2(c.x * uAspect, c.y) * 26.0;
            vec2 h = vec2(q.x + q.y * 0.57735, q.y * 1.1547);
            vec2 f = fract(h) - 0.5;
            float hex = smoothstep(0.42, 0.48, max(abs(f.x), max(abs(f.y), abs(f.x + f.y) * 0.85)));
            float edgeMask = smoothstep(0.38, 0.72, rr);
            float wave = 0.5 + 0.5 * sin(uTime * 6.0 - rr * 20.0);
            col += uShieldColor * (hex * edgeMask * (0.16 + 0.12 * wave) + edgeMask * 0.05) * uShield;
            col += uShieldColor * uShieldHit * edgeMask * 0.9;
          }
          // retro posterize: 6 steps per channel with ordered dithering
          const float L = 6.0;
          col = floor(clamp(col, 0.0, 1.0) * L + b * 0.95) / L;
          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
  }

  SO.Mat = { sky, floor, textured, glow, crescent, crescentGeometry, toon, inked, post, outlineMat, brightPass, blur };
})(window.SO = window.SO || {});
