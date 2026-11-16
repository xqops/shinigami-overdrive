// Sounds of the 80 school abilities. Each ability has its own recipe in SO.SFX (filled per school
// further down): recorded CC0 layers + synth, keyed by ability id and moment. The game calls the
// methods below from the event router (main.js).
(function (SO) {
  'use strict';
  const SFX = SO.SFX = SO.SFX || {};
  const P = SO.Audio.prototype;

  function run(a, key, e, mine) {
    const f = SFX[key];
    if (!f || !a.ok()) return;
    try { f(a, e || {}, mine); } catch (err) { console.warn('[sfx]', key, err); }
  }

  P.ability = function (e, mine) { run(this, e.id, e, mine); };
  P.ultStart = function (e, mine) { run(this, e.id + ':start', e, mine); this.ultLoop(e.id, e.dur); };
  P.ultEnd = function (e, mine) { this.stopUltLoop(); run(this, e.id + ':end', e, mine); };
  P.vfx = function (e, mine) {
    // a spell's own hit / blast sound lives under its look
    if (e.k === 'spellHit') return run(this, e.look + ':hit', e, mine);
    if (e.k === 'boom') return run(this, e.look + ':boom', e, mine);
    run(this, e.k, e, mine);
  };
  // true at most once per `ms` for a key (rains of bullets / blades would stack hundreds of voices)
  P.every = function (key, ms) {
    const now = this.ctx ? this.ctx.currentTime * 1000 : 0;
    this.lastAt = this.lastAt || {};
    if (now - (this.lastAt[key] || -1e9) < ms) return false;
    this.lastAt[key] = now;
    return true;
  };
  P.spellLaunch = function (e) { run(this, e.look + ':launch', e); };
  P.spellEnd = function (e) { run(this, e.look + ':end', e); };
  P.status = function (e) { run(this, 'status:' + (e.by || '') + ':' + e.s, e); };
  P.ally = function (e) { run(this, 'ally:' + (e.kind || '') + ':' + e.type, e); };
  // inspect (T) show of a character's own weapon: SFX['inspect:<school>']
  P.inspectWeapon = function (id) { run(this, 'inspect:' + id, {}); };
  // character weapons: SFX['swing:<school>'] (e.step = combo step or 'h'), SFX['hit:<school>']
  P.cwSwing = function (e) { run(this, 'swing:' + e.cw, e); };
  P.cwHit = function (e) { const id = String(e.weapon).slice(3); if (SFX['hit:' + id]) run(this, 'hit:' + id, e); else this.hit(0, e.crit, e, e.dmg > 50); };
  P.absorb = function () { if (this.ok()) this.sample('clash_2', { vol: 0.35, rate: 1.4 }); };

  // ultimate loops: a recipe 'id:loop' returns the nodes to stop when the ultimate ends
  P.ultLoop = function (id) {
    this.stopUltLoop();
    const f = SFX[id + ':loop'];
    if (!f || !this.ok()) return;
    this.loopNodes = f(this) || [];
  };
  P.stopUltLoop = function () {
    const t = this.ctx ? this.ctx.currentTime : 0;
    for (const n of this.loopNodes || []) { try { if (n.gain) { n.gain.gain.setTargetAtTime(0, t, 0.25); } if (n.src) n.src.stop(t + 1.2); } catch (e) { /* already stopped */ } }
    this.loopNodes = [];
  };
  // a looping sample that fades in; returns { src, gain } for stopUltLoop
  P.loop = function (name, o) {
    o = o || {};
    const list = this.groups[name];
    const buf = this.buffers[list ? list[0] : name];
    if (!buf) return null;
    const ctx = this.ctx, t = ctx.currentTime;
    const src = ctx.createBufferSource();
    src.buffer = buf; src.loop = true; src.playbackRate.value = o.rate || 1;
    if (o.from != null) { src.loopStart = o.from; src.loopEnd = o.to || buf.duration; }
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(o.vol || 0.4, t + (o.fade || 0.6));
    src.connect(g); g.connect(this.out(o));
    src.start(t, o.offset || 0);
    return { src, gain: g };
  };
})(window.SO = window.SO || {});
