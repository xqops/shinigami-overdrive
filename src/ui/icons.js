// Ability icons for the HUD and the grimoire. Most come from the design sheet (src/assets/icons.js,
// made by tools/crop-icons.sh + tools/embed-icons.js); the blood school is not on the sheet, so its
// four icons are painted here in the same style: a dark panel, a glowing motif and a small figure.
(function (SO) {
  'use strict';
  const SHEET = window.SO_ICONS || {};
  const cache = {};

  function panel(draw) {
    const c = document.createElement('canvas');
    c.width = c.height = 80;
    const g = c.getContext('2d');
    const bg = g.createRadialGradient(40, 44, 4, 40, 44, 56);
    bg.addColorStop(0, '#2a0710'); bg.addColorStop(1, '#07040a');
    g.fillStyle = bg; g.fillRect(0, 0, 80, 80);
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.shadowColor = '#ff1a3a';
    draw(g);
    return c.toDataURL('image/png');
  }
  // glowing stroke: a wide dim pass and a thin hot core
  function glow(g, path, w) {
    g.shadowBlur = 10; g.strokeStyle = 'rgba(224,16,46,0.75)'; g.lineWidth = w; path(); g.stroke();
    g.shadowBlur = 4; g.strokeStyle = '#ff9aa8'; g.lineWidth = Math.max(1, w * 0.3); path(); g.stroke();
  }
  // the little caster silhouette the sheet puts in every panel
  function figure(g, x, y, s, arm) {
    g.shadowBlur = 6; g.strokeStyle = '#ff5a70'; g.lineWidth = 1.6;
    g.beginPath(); g.arc(x, y - 13 * s, 3 * s, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(x, y - 10 * s); g.lineTo(x - 1 * s, y); g.lineTo(x - 5 * s, y + 10 * s);
    g.moveTo(x - 1 * s, y); g.lineTo(x + 4 * s, y + 10 * s);
    g.moveTo(x, y - 7 * s); g.lineTo(x + arm[0] * s, y + arm[1] * s);
    g.moveTo(x, y - 7 * s); g.lineTo(x - 5 * s, y - 2 * s); g.stroke();
  }

  const PAINT = {
    // whip: a spiked lash curling out of the hand
    blood_1: (g) => {
      figure(g, 20, 52, 1.1, [8, -10]);
      const lash = () => { g.beginPath(); g.moveTo(29, 40); g.bezierCurveTo(48, 20, 70, 30, 58, 48); g.bezierCurveTo(50, 60, 66, 68, 74, 58); };
      glow(g, lash, 4);
      g.fillStyle = '#ff6a80';
      for (const [x, y, a] of [[40, 29, -0.9], [52, 25, -0.2], [62, 33, 0.6], [60, 47, 2.3], [62, 64, 2.9]]) {
        g.save(); g.translate(x, y); g.rotate(a); g.beginPath(); g.moveTo(-2, 0); g.lineTo(0, -6); g.lineTo(2, 0); g.fill(); g.restore();
      }
    },
    // hemal blades: crescents orbiting the body, two flying out
    blood_2: (g) => {
      figure(g, 40, 50, 1.15, [7, -8]);
      g.save(); g.translate(40, 44); g.scale(1, 0.38);
      glow(g, () => { g.beginPath(); g.arc(0, 0, 26, 0, Math.PI * 2); }, 2);
      g.restore();
      const cres = (x, y, r, a) => {
        g.save(); g.translate(x, y); g.rotate(a);
        g.shadowBlur = 10; g.fillStyle = '#e0102e';
        g.beginPath(); g.arc(0, 0, r, -1.3, 1.3); g.arc(-r * 0.45, 0, r * 0.82, 1.1, -1.1, true); g.fill();
        g.shadowBlur = 0; g.fillStyle = '#ffb0bc';
        g.beginPath(); g.arc(0, 0, r, -1.1, 1.1); g.arc(-r * 0.2, 0, r * 0.9, 1.0, -1.0, true); g.fill();
        g.restore();
      };
      cres(15, 46, 7, Math.PI); cres(64, 41, 7, 0); cres(40, 54, 6, Math.PI / 2);
      cres(62, 16, 9, -0.7); cres(74, 26, 7, -0.4);
    },
    // crimson prison: tentacles closing a cracked crystal sphere
    blood_3: (g) => {
      const sph = g.createRadialGradient(36, 34, 2, 40, 40, 20);
      sph.addColorStop(0, 'rgba(255,170,185,0.9)'); sph.addColorStop(0.6, 'rgba(160,10,35,0.55)'); sph.addColorStop(1, 'rgba(90,0,20,0.2)');
      g.shadowBlur = 14; g.fillStyle = sph; g.beginPath(); g.arc(40, 40, 19, 0, Math.PI * 2); g.fill();
      figure(g, 40, 44, 0.75, [5, 4]);
      g.shadowBlur = 0; g.strokeStyle = 'rgba(255,200,210,0.7)'; g.lineWidth = 1;
      g.beginPath(); g.moveTo(28, 28); g.lineTo(36, 36); g.lineTo(33, 47); g.moveTo(36, 36); g.lineTo(50, 31); g.stroke();
      for (let i = 0; i < 6; i++) {
        const a = Math.PI * (0.15 + i * 0.14) + (i > 2 ? Math.PI * 0.28 : 0), s = i % 2 ? 1 : -1;
        const x0 = 40 + Math.cos(a) * 40, y0 = 78;
        glow(g, () => { g.beginPath(); g.moveTo(x0, y0); g.quadraticCurveTo(40 + Math.cos(a) * 34 + s * 10, 52, 40 + Math.cos(a + s) * 20, 40 - Math.sin(a + s) * 20); }, 3);
      }
    },
    // crimson tide: a colossal wave of blood towering over the caster
    blood_ult: (g) => {
      const sky = g.createLinearGradient(0, 0, 0, 80);
      sky.addColorStop(0, '#3a0010'); sky.addColorStop(1, '#07040a');
      g.fillStyle = sky; g.fillRect(0, 0, 80, 80);
      const wave = g.createLinearGradient(0, 10, 0, 80);
      wave.addColorStop(0, '#ff4060'); wave.addColorStop(0.4, '#b00a28'); wave.addColorStop(1, '#3a0010');
      g.shadowBlur = 16; g.fillStyle = wave;
      g.beginPath(); g.moveTo(0, 80); g.lineTo(0, 40); g.bezierCurveTo(10, 10, 46, 0, 64, 14); g.bezierCurveTo(74, 22, 70, 34, 58, 30);
      g.bezierCurveTo(50, 27, 52, 40, 62, 46); g.lineTo(80, 60); g.lineTo(80, 80); g.closePath(); g.fill();
      glow(g, () => { g.beginPath(); g.moveTo(2, 38); g.bezierCurveTo(12, 12, 46, 3, 63, 16); g.bezierCurveTo(72, 23, 68, 32, 58, 30); }, 2.5);
      g.fillStyle = '#ff8a9c'; g.shadowBlur = 6;
      for (let i = 0; i < 14; i++) { g.beginPath(); g.arc(20 + ((i * 37) % 55), 6 + ((i * 23) % 26), 1 + (i % 3) * 0.6, 0, Math.PI * 2); g.fill(); }
      figure(g, 40, 64, 1, [6, -12]);
    },
  };

  function src(id) {
    if (SHEET[id]) return SHEET[id];
    if (!(id in cache)) cache[id] = PAINT[id] && typeof document !== 'undefined' ? panel(PAINT[id]) : null;
    return cache[id];
  }

  SO.Icons = {
    src,
    // <img> for a slot (HUD) or 'big' for the grimoire cards; '' when an ability has no icon
    html(id, size) {
      const s = src(id);
      return s ? '<img class="ic' + (size === 'big' ? ' big' : '') + '" src="' + s + '" alt="" draggable="false">' : '';
    },
  };
})(window.SO = window.SO || {});
