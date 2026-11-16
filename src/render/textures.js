// Procedural 64x64 grayscale textures in brush-and-ink style (nearest filtering). Values only:
// the post pass maps them onto the paper / wash / ink palette with dithering.
(function (SO) {
  'use strict';
  const T = THREE;
  const S = 64;

  function make(draw) {
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const g = c.getContext('2d');
    draw(g, SO.rng(1234));
    const tex = new T.CanvasTexture(c);
    tex.magFilter = T.NearestFilter;
    tex.minFilter = T.NearestFilter;
    tex.generateMipmaps = false;
    tex.wrapS = tex.wrapT = T.RepeatWrapping;
    return tex;
  }

  const gray = (v) => { v = Math.max(0, Math.min(255, v | 0)); return `rgb(${v},${v},${v})`; };
  function specks(g, rnd, base, amount, density) {
    for (let i = 0; i < S * S * density; i++) {
      g.fillStyle = gray(base + (rnd() - 0.5) * amount);
      g.fillRect((rnd() * S) | 0, (rnd() * S) | 0, 1, 1);
    }
  }
  // A dry-brush stroke: a wobbly line of dots that thins out.
  function stroke(g, rnd, x, y, dx, dy, len, v) {
    for (let i = 0; i < len; i++) {
      if (rnd() < 0.15 + i / len * 0.5) { x += dx; y += dy; continue; }
      g.fillStyle = gray(v);
      g.fillRect(((x % S) + S) % S | 0, ((y % S) + S) % S | 0, 1, 1);
      x += dx + (rnd() - 0.5) * 0.6; y += dy + (rnd() - 0.5) * 0.6;
    }
  }

  function blocks(g, rnd, base, mortar, bw, bh) {
    g.fillStyle = gray(mortar); g.fillRect(0, 0, S, S);
    for (let row = 0; row < S / bh; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let col = -1; col < S / bw + 1; col++) {
        const v = base + (rnd() - 0.5) * 22;
        g.fillStyle = gray(v);
        g.fillRect(col * bw + off + 1, row * bh + 1, bw - 2, bh - 2);
      }
    }
    specks(g, rnd, base - 20, 30, 0.08);
    for (let i = 0; i < 3; i++) stroke(g, rnd, rnd() * S, rnd() * S, 1, 0.4, 12, mortar);
  }

  function planks(g, rnd, base, vertical, pw) {
    for (let i = 0; i < S / pw; i++) {
      const v = base + (rnd() - 0.5) * 18;
      g.fillStyle = gray(v);
      if (vertical) g.fillRect(i * pw, 0, pw, S); else g.fillRect(0, i * pw, S, pw);
      g.fillStyle = gray(base * 0.35);
      if (vertical) g.fillRect(i * pw, 0, 1, S); else g.fillRect(0, i * pw, S, 1);
      for (let k = 0; k < 6; k++) {
        if (vertical) stroke(g, rnd, i * pw + 1 + rnd() * (pw - 2), rnd() * S, 0, 1, 18, v + 26);
        else stroke(g, rnd, rnd() * S, i * pw + 1 + rnd() * (pw - 2), 1, 0, 18, v + 26);
      }
    }
  }

  function build() {
    const t = {};
    t.stone = make((g, r) => blocks(g, r, 178, 96, 16, 8));
    t.step = make((g, r) => blocks(g, r, 196, 110, 32, 16));
    t.wall = make((g, r) => { blocks(g, r, 150, 80, 16, 10); specks(g, r, 60, 20, 0.06); });
    t.lantern = make((g, r) => blocks(g, r, 205, 120, 32, 21));
    t.pillar = make((g, r) => {
      blocks(g, r, 165, 90, 32, 16);
      // carved warding script, brushed in ink
      for (let i = 0; i < 4; i++) {
        const x = 8 + i * 14;
        stroke(g, r, x, 18, 0, 1, 22, 20);
        stroke(g, r, x - 4, 26, 1, 0, 9, 20);
        stroke(g, r, x - 3, 34, 1, 0.2, 7, 20);
      }
    });
    t.wood = make((g, r) => planks(g, r, 70, true, 8));
    t.bridge = make((g, r) => planks(g, r, 88, false, 8));
    t.post = make((g, r) => planks(g, r, 46, true, 16));
    t.lacquer = make((g, r) => { g.fillStyle = gray(30); g.fillRect(0, 0, S, S); specks(g, r, 40, 16, 0.25); for (let i = 0; i < 5; i++) stroke(g, r, r() * S, 0, 0, 1, 64, 58); });
    t.torii = t.lacquer;
    t.toriiTop = make((g, r) => { g.fillStyle = gray(18); g.fillRect(0, 0, S, S); specks(g, r, 26, 12, 0.3); g.fillStyle = gray(210); g.fillRect(0, S - 4, S, 2); });
    t.roof = make((g, r) => {
      g.fillStyle = gray(36); g.fillRect(0, 0, S, S);
      for (let y = 0; y < S; y += 8) for (let x = 0; x < S; x += 8) {
        const o = (y / 8) % 2 ? 4 : 0;
        g.fillStyle = gray(70 + (r() - 0.5) * 16); g.fillRect(x + o, y, 7, 6);
        g.fillStyle = gray(120); g.fillRect(x + o, y, 7, 1);
      }
    });
    t.floor = make((g, r) => {
      g.fillStyle = gray(178); g.fillRect(0, 0, S, S);
      const cells = [[0, 0, 30, 22], [31, 0, 33, 30], [0, 23, 22, 41], [23, 31, 41, 18], [23, 50, 20, 14], [44, 50, 20, 14]];
      for (const [x, y, w, h] of cells) {
        g.fillStyle = gray(246 + (r() - 0.5) * 10);
        g.fillRect(x + 1, y + 1, w - 2, h - 2);
      }
      specks(g, r, 215, 30, 0.05);
      for (let i = 0; i < 4; i++) stroke(g, r, r() * S, r() * S, 1, 0.6, 14, 120);
    });
    return t;
  }

  let cache = null;
  SO.Textures = { get() { return cache || (cache = build()); } };
})(window.SO = window.SO || {});
