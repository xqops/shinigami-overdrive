// Checks that every ability has its own visual and sound: every skill / ultimate id, every visual
// moment the sim emits (K.vfx), every lasting effect kind, every spell look and every ally kind
// must be handled by the renderer (render/afx/*.js) and have a recipe in the sound files.
// Usage: node tools/coveragetest.js
'use strict';
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const read = (d) => fs.readdirSync(path.join(root, d)).filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(root, d, f), 'utf8')).join('\n');
const sim = ['src/sim/abilities-1.js', 'src/sim/abilities-2.js', 'src/sim/abilities-3.js', 'src/sim/abilities-4.js', 'src/sim/allies.js'].map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n');
const afx = read('src/render/afx');
const sfxFiles = fs.existsSync(path.join(root, 'src/audio/sfx')) ? read('src/audio/sfx') : '';
const all = (re, s) => [...new Set([...s.matchAll(re)].map((m) => m[1]))];

for (const f of ['core/util.js', 'sim/schools.js']) require(path.join(root, 'src', f));
const ids = [];
for (const s of globalThis.SO.Schools.LIST) { for (const k of s.skills) ids.push(k.id); ids.push(s.ult.id); }

// registered as AFX.reg['key'] = ... or AFX.reg.key = ...
const has = (reg, key) => afx.includes('AFX.' + reg + "['" + key + "']") || afx.includes('AFX.' + reg + '.' + key + ' =');
const missing = [];
for (const id of ids) {
  if (id.endsWith('_ult')) { if (!has('ult', id)) missing.push('ult visual ' + id); }
  else if (!has('cast', id)) missing.push('cast visual ' + id);
}
for (const k of all(/K\.vfx\(world, '([^'<]+)'/g, sim)) if (!has('vfx', k)) missing.push('vfx ' + k);
for (const k of all(/K\.effect\(world, '([^']+)'/g, sim)) if (!has('effect', k)) missing.push('effect ' + k);
for (const k of all(/look: '([^']+)'/g, sim)) if (!has('spell', k)) missing.push('spell ' + k);
for (const k of all(/^\s{4}(\w+):\s+\{ hp:/gm, sim)) if (!has('ally', k)) missing.push('ally ' + k);

// sounds: one recipe per skill / ultimate (start + end) in src/audio/sfx/*.js
if (sfxFiles) {
  const hasS = (key) => sfxFiles.includes("'" + key + "'") || sfxFiles.includes('SFX.' + key + ' ') || sfxFiles.includes('SFX.' + key + '=');
  for (const id of ids) {
    if (id.endsWith('_ult')) { for (const m of ['start', 'loop', 'end']) if (!hasS(id + ':' + m)) missing.push('sound ' + id + ':' + m); }
    else if (!hasS(id)) missing.push('sound ' + id);
  }
}
// every ability has an icon: cropped from the design sheet (assets/icons) or painted in ui/icons.js
const iconsJs = fs.readFileSync(path.join(root, 'src/ui/icons.js'), 'utf8');
for (const id of ids) if (!fs.existsSync(path.join(root, 'assets/icons', id + '.jpg')) && !iconsJs.includes('    ' + id + ': (g)')) missing.push('icon ' + id);
// every character has its own weapon: a moveset (sim), a model with a clip for every swing and an
// inspect show (render/cweapons), and swing / hit / inspect sounds
require(path.join(root, 'src', 'sim', 'charweapons.js'));
const cwRender = fs.readdirSync(path.join(root, 'src/render/cweapons')).map((f) => fs.readFileSync(path.join(root, 'src/render/cweapons', f), 'utf8')).join('\n');
for (const s of globalThis.SO.Schools.LIST) {
  const W = globalThis.SO.CHAR_WEAPONS[s.id];
  if (!W) { missing.push('weapon ' + s.id); continue; }
  if (!cwRender.includes('CW.reg.' + s.id + ' = ')) missing.push('weapon model ' + s.id);
  for (const d of W.combo.concat([W.heavy])) if (!cwRender.includes(d.anim + ': {') && !cwRender.includes(d.anim + ': kicks')) missing.push('weapon clip ' + d.anim);
  for (const m of ['swing', 'hit', 'inspect']) if (!sfxFiles.includes("'" + m + ':' + s.id + "'")) missing.push('weapon sound ' + m + ':' + s.id);
}
for (const k of all(/look: '(cw_[^']+)'/g, fs.readFileSync(path.join(root, 'src/sim/charweapons.js'), 'utf8'))) if (!cwRender.includes('AFX.spell.' + k + ' =')) missing.push('weapon spell ' + k);
// every sample a recipe names must exist in the bank (a file name or a group like "rock" for rock_1..3)
const bank = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'sounds.json'), 'utf8')).sounds.map((x) => x.name);
const names = new Set(bank.concat(bank.map((n) => n.replace(/_\d+$/, ''))));
const audio = sfxFiles + fs.readFileSync(path.join(root, 'src/audio/audio.js'), 'utf8');
for (const k of all(/\.(?:sample|loop)\('([^']+)'/g, audio)) if (!names.has(k)) missing.push('unknown sample ' + k);
console.log(missing.length ? missing.join('\n') : 'every ability has its own visuals' + (sfxFiles ? ' and sounds' : ''));
console.log(ids.length + ' abilities checked');
process.exit(missing.length ? 1 : 0);
