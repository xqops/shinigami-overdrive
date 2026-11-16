// WebAudio: synthesized psytrance-style music on the Japanese hirajoshi scale, and SFX that layer
// recorded CC0 samples (src/assets/sounds.js, see tools/sounds.json) over short synth thumps.
// Sounds are positioned by stereo pan + distance.
(function (SO) {
  'use strict';

  const HIRAJOSHI = [0, 2, 3, 7, 8];
  const PROG = [0, 0, -4, -2, 0, 0, 3, -5]; // root offsets (semitones), 2 bars each
  const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

  class AudioSys {
    constructor() {
      this.ctx = null;
      this.vol = { master: 0.8, music: 0.6, sfx: 0.9 };
      this.intensity = 0.3;
      this.listener = { x: 0, z: 0, yaw: 0 };
      this.onBeat = null;
      this.step = 0;
      this.bar = 0;
      this.domainOn = false;
      this.musicOn = false;
    }

    init() {
      if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      const ctx = this.ctx = new AC();
      this.comp = ctx.createDynamicsCompressor();
      this.comp.threshold.value = -14; this.comp.ratio.value = 6; this.comp.attack.value = 0.003; this.comp.release.value = 0.2;
      this.master = ctx.createGain();
      this.master.connect(this.comp); this.comp.connect(ctx.destination);
      this.musicBus = ctx.createGain();
      this.musicFilter = ctx.createBiquadFilter(); this.musicFilter.type = 'lowpass'; this.musicFilter.frequency.value = 18000;
      this.musicBus.connect(this.musicFilter); this.musicFilter.connect(this.master);
      this.sfxBus = ctx.createGain(); this.sfxBus.connect(this.master);
      this.duck = ctx.createGain(); this.duck.connect(this.musicBus); // sidechained bass + pads

      // Noise buffer
      const len = ctx.sampleRate * 2;
      this.noiseBuf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;

      // Reverb send (generated impulse)
      this.reverb = ctx.createConvolver();
      const ir = ctx.createBuffer(2, ctx.sampleRate * 2.8, ctx.sampleRate);
      for (let c = 0; c < 2; c++) {
        const ch = ir.getChannelData(c);
        for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / ch.length, 2.6);
      }
      this.reverb.buffer = ir;
      this.revGain = ctx.createGain(); this.revGain.gain.value = 0.55;
      this.reverb.connect(this.revGain); this.revGain.connect(this.master);

      // Lead delay
      this.delay = ctx.createDelay(1); this.delay.delayTime.value = (60 / 150) * 0.75;
      this.delayFb = ctx.createGain(); this.delayFb.gain.value = 0.38;
      this.delay.connect(this.delayFb); this.delayFb.connect(this.delay); this.delay.connect(this.musicBus);

      // Soft-clip curve for crunchy hits
      this.shaper = ctx.createWaveShaper();
      const curve = new Float32Array(1024);
      for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; curve[i] = Math.tanh(x * 3); }
      this.shaper.curve = curve;
      this.shaper.connect(this.sfxBus);

      this.applyVolume();
      this.loadSamples();
    }

    applyVolume() {
      if (!this.ctx) return;
      this.master.gain.value = this.vol.master;
      this.musicBus.gain.value = this.vol.music * 0.55;
      this.sfxBus.gain.value = this.vol.sfx;
    }

    // ---------- primitives ----------
    out(opts) {
      // Returns a node to connect a voice into: optional pan + distance attenuation + reverb send.
      const ctx = this.ctx;
      let dest = opts && opts.music ? this.musicBus : (opts && opts.dist ? this.shaper : this.sfxBus);
      let gain = 1;
      if (opts && opts.pos) {
        const dx = opts.pos.x - this.listener.x, dz = opts.pos.z - this.listener.z;
        const d = Math.sqrt(dx * dx + dz * dz);
        gain = 1 / (1 + d * 0.06);
        const rx = Math.cos(this.listener.yaw), rz = -Math.sin(this.listener.yaw);
        const pan = SO.clamp((dx * rx + dz * rz) / (d + 2), -0.9, 0.9);
        if (ctx.createStereoPanner) {
          const p = ctx.createStereoPanner(); p.pan.value = pan; p.connect(dest); dest = p;
        }
      }
      const g = ctx.createGain(); g.gain.value = gain; g.connect(dest);
      if (opts && opts.rev) { const s = ctx.createGain(); s.gain.value = opts.rev; g.connect(s); s.connect(this.reverb); }
      return g;
    }

    tone(o) {
      const ctx = this.ctx, t = o.when || ctx.currentTime;
      const osc = ctx.createOscillator();
      osc.type = o.type || 'sine';
      osc.frequency.setValueAtTime(o.f0, t);
      if (o.f1) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), t + (o.slide || o.dur));
      if (o.detune) osc.detune.value = o.detune;
      const g = ctx.createGain();
      const a = o.attack || 0.002;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(o.vol || 0.3, t + a);
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      let node = osc;
      if (o.filter) {
        const f = ctx.createBiquadFilter(); f.type = o.filterType || 'lowpass'; f.frequency.setValueAtTime(o.filter, t);
        if (o.filter1) f.frequency.exponentialRampToValueAtTime(o.filter1, t + o.dur);
        f.Q.value = o.q || 1; osc.connect(f); node = f;
      }
      node.connect(g); g.connect(o.dest || this.out(o));
      osc.start(t); osc.stop(t + o.dur + 0.05);
    }

    noise(o) {
      const ctx = this.ctx, t = o.when || ctx.currentTime;
      const src = ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const f = ctx.createBiquadFilter();
      f.type = o.ftype || 'bandpass';
      f.frequency.setValueAtTime(o.f || 1000, t);
      if (o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + o.dur);
      f.Q.value = o.q || 1;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(o.vol || 0.3, t + (o.attack || 0.004));
      g.gain.exponentialRampToValueAtTime(0.0001, t + o.dur);
      src.connect(f); f.connect(g); g.connect(o.dest || this.out(o));
      src.start(t, Math.random()); src.stop(t + o.dur + 0.05);
    }

    // ---------- recorded samples (CC0 bank, tools/sounds.json) ----------
    // Decoded once the AudioContext exists. Groups: "swing_light" picks swing_light_1..5 at random.
    loadSamples() {
      const src = window.SO_SOUNDS;
      this.buffers = {};
      this.groups = {};
      if (!src || !this.ctx) return;
      for (const name of Object.keys(src)) {
        const bin = atob(src[name]);
        const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        const group = name.replace(/_\d+$/, '');
        (this.groups[group] || (this.groups[group] = [])).push(name);
        this.ctx.decodeAudioData(buf.buffer).then((b) => { this.buffers[name] = b; }).catch(() => {});
      }
    }

    // o: { vol, rate, vary (random pitch spread), pos, dist, rev, when, offset }
    sample(name, o) {
      o = o || {};
      const list = this.groups[name];
      const pick = list ? list[(Math.random() * list.length) | 0] : name;
      const buf = this.buffers[pick];
      if (!buf) return false;
      const ctx = this.ctx, t = o.when || ctx.currentTime;
      const s = ctx.createBufferSource();
      s.buffer = buf;
      s.playbackRate.value = (o.rate || 1) * (1 + ((Math.random() * 2 - 1) * (o.vary != null ? o.vary : 0.06)));
      const g = ctx.createGain();
      g.gain.value = o.vol != null ? o.vol : 0.6;
      s.connect(g); g.connect(this.out(o));
      s.start(t, o.offset || 0);
      return true;
    }

    // stone and wood breaking: k = size 0..1, near = distance falloff 0..1
    crumble(k, near) {
      if (!this.ok() || near <= 0.02) return;
      const v = (0.3 + k * 0.5) * near;
      if (k > 0.45) { this.sample('debris_big', { vol: v, rate: 0.95 }); this.sample('boom_low', { vol: v * 0.6, rate: 1.2 }); }
      else this.sample(k > 0.15 ? 'rock' : 'mining', { vol: v, rate: 1.1 - k * 0.3 });
      if (Math.random() < 0.4) this.sample('wood_break', { vol: v * 0.5, rate: 0.8 });
      this.tone({ f0: 70 + (1 - k) * 60, f1: 35, dur: 0.3 + k * 0.4, vol: v * 0.5 });
    }

    metal(freq, dur, vol, opts) {
      [1, 1.47, 2.09, 2.76].forEach((m, i) => this.tone(Object.assign({ f0: freq * m, dur: dur * (1 - i * 0.18), vol: vol / (1 + i * 0.8), attack: 0.001 }, opts)));
    }

    ok() { return !!this.ctx && this.ctx.state === 'running'; }

    // ---------- SFX ----------
    swing(w, heavy) {
      if (!this.ok()) return;
      if (w === 0) this.sample(heavy ? 'slash' : 'swing_light', { vol: 0.5, rate: 1.12 });
      else if (w === 1) { this.sample('swing_heavy', { vol: 0.55, rate: 1.05 }); this.sample('swing_light', { vol: 0.2, rate: 0.8 }); }
      else { this.sample('swing_heavy', { vol: 0.75, rate: 0.72 }); this.tone({ f0: 90, f1: 45, dur: 0.3, vol: 0.18 }); }
    }

    hit(w, crit, pos, heavy) {
      if (!this.ok()) return;
      const o = { pos };
      // the meat of the hit is the recording; a short synth thump keeps the punch on small speakers
      this.sample('flesh', { vol: 0.65, pos, rate: w === 2 ? 0.8 : 1 });
      if (heavy || w === 2) this.sample('gore', { vol: 0.45, pos, rate: 0.9 });
      this.tone(Object.assign({ f0: heavy ? 110 : 150, f1: 40, dur: heavy ? 0.22 : 0.11, vol: heavy ? 0.5 : 0.3, dist: true }, o));
      if (w === 0) this.sample('slash', { vol: 0.25, pos, rate: 1.3 });
      if (crit) { this.sample('clash_3', { vol: 0.35, rate: 1.4, rev: 0.5 }); this.metal(4200, 0.5, 0.05, { rev: 0.6 }); }
    }

    kill(big, pos) {
      if (!this.ok()) return;
      this.sample('gore', { vol: big ? 0.9 : 0.7, pos, rate: big ? 0.75 : 1 });
      if (big) { this.sample('body_fall', { vol: 0.8, pos }); this.sample('boom_low', { vol: 0.5, pos, rate: 1.3 }); }
      this.tone({ f0: big ? 70 : 110, f1: 25, dur: big ? 0.6 : 0.25, vol: 0.4, type: 'square', filter: 500, pos, dist: true });
    }

    parry() {
      if (!this.ok()) return;
      this.sample('clash_1', { vol: 0.9, rev: 0.6 });
      this.sample('clash_2', { vol: 0.4, rate: 1.2 });
      this.tone({ f0: 60, f1: 30, dur: 0.4, vol: 0.5, dist: true });
    }

    dash() { if (this.ok()) { this.sample('swing_heavy', { vol: 0.35, rate: 1.4 }); this.noise({ f: 2600, f1: 400, dur: 0.2, vol: 0.12, q: 1.4 }); } }
    jump() { if (this.ok()) this.sample('step', { vol: 0.35, rate: 0.85 }); }
    airJump() { if (this.ok()) { this.sample('swing_light', { vol: 0.3, rate: 1.5 }); this.tone({ f0: 500, f1: 1100, dur: 0.12, vol: 0.04, type: 'triangle', rev: 0.3 }); } }
    wallJump() { if (this.ok()) { this.sample('punch', { vol: 0.35, rate: 1.3 }); this.sample('step', { vol: 0.4 }); } }
    land(v) {
      if (!this.ok()) return;
      const k = Math.min(1, Math.abs(v) / 30);
      this.sample(k > 0.6 ? 'body_fall' : 'step', { vol: 0.25 + k * 0.5, rate: 0.9 - k * 0.15 });
      this.tone({ f0: 100, f1: 40, dur: 0.1, vol: Math.min(0.3, 0.04 + Math.abs(v) * 0.01) });
    }
    // footsteps on stone (main.js calls this every ~2.6 m walked; not "step", which is the music sequencer counter)
    footstep(speed) { if (this.ok()) this.sample('step', { vol: 0.08 + Math.min(0.1, speed * 0.005), rate: 0.95 + Math.min(0.25, speed * 0.008) }); }
    slide() { if (this.ok()) { this.sample('rock_3', { vol: 0.2, rate: 1.4 }); this.noise({ f: 700, f1: 300, dur: 0.35, vol: 0.08, ftype: 'lowpass' }); } }
    pad() { if (this.ok()) { this.sample('teleport', { vol: 0.35, rate: 0.8 }); this.tone({ f0: 180, f1: 1000, dur: 0.3, vol: 0.12, type: 'sine', rev: 0.4 }); } }
    unsheath() { if (this.ok()) this.sample('unsheath_1', { vol: 0.35, rate: 1.15 }); }

    slam(meteor, pos) {
      if (!this.ok()) return;
      if (meteor) { this.sample('boom_low', { vol: 1, pos }); this.sample('rock', { vol: 0.7, pos, rate: 0.85 }); this.sample('explosion_3', { vol: 0.5, pos }); }
      else { this.sample('punch', { vol: 0.7, pos, rate: 0.7 }); this.sample('body_fall', { vol: 0.5, pos }); }
      this.tone({ f0: meteor ? 70 : 100, f1: 22, dur: meteor ? 0.9 : 0.4, vol: meteor ? 0.7 : 0.4, dist: true });
    }

    hurt() {
      if (!this.ok()) return;
      this.sample('punch', { vol: 0.7, rate: 0.85 });
      this.sample('flesh', { vol: 0.35, rate: 0.7 });
      this.tone({ f0: 220, f1: 70, dur: 0.2, vol: 0.25, type: 'sawtooth', filter: 900, dist: true });
    }

    blink() { if (this.ok()) { this.sample('teleport', { vol: 0.55, rate: 1.25 }); this.noise({ f: 5000, f1: 1500, dur: 0.12, vol: 0.06, q: 2 }); } }

    domain() {
      if (!this.ok()) return;
      this.sample('gong', { vol: 1, rev: 0.8, rate: 0.85, vary: 0 });
      this.sample('dark_spell', { vol: 0.5, rev: 0.6, rate: 0.8 });
      [55, 82.4, 110.3, 138.6].forEach((f, i) => this.tone({ f0: f, dur: 4.5, vol: 0.12 / (1 + i * 0.3), type: i % 2 ? 'sine' : 'triangle', attack: 0.02, rev: 0.9 }));
      this.tone({ f0: 50, f1: 20, dur: 1.2, vol: 0.8, dist: true });
    }

    iaidoCharge() { if (this.ok()) { this.sample('unsheath_2', { vol: 0.45, rate: 0.85 }); this.sample('charge', { vol: 0.2, rate: 1.2 }); } }
    iaido() { if (this.ok()) { this.sample('slash_1', { vol: 0.8, rate: 0.9, rev: 0.4 }); this.sample('energy_slash', { vol: 0.5 }); this.tone({ f0: 40, dur: 0.3, vol: 0.35, dist: true }); } }
    iaidoCut(pos) { if (this.ok()) { this.sample('flesh', { vol: 0.7, pos, rate: 1.1 }); this.sample('clash_3', { vol: 0.3, pos, rate: 1.6, rev: 0.7 }); } }

    getsuga() {
      if (!this.ok()) return;
      this.sample('energy_slash', { vol: 0.8, rate: 0.8, rev: 0.4 });
      this.sample('swing_heavy', { vol: 0.6, rate: 0.9 });
      this.tone({ f0: 520, f1: 130, dur: 0.5, vol: 0.1, type: 'sawtooth', filter: 2000, filter1: 300, rev: 0.4 });
    }

    enemyShoot(pos) { if (this.ok()) { this.sample('magic_strike', { vol: 0.25, pos, rate: 1.6 }); this.tone({ f0: 700, f1: 180, dur: 0.15, vol: 0.08, type: 'square', filter: 1800, pos }); } }
    windup(pos, big) { if (this.ok()) this.tone({ f0: big ? 120 : 900, f1: big ? 60 : 1300, dur: big ? 0.5 : 0.08, vol: big ? 0.3 : 0.07, type: big ? 'sawtooth' : 'triangle', filter: big ? 600 : 4000, pos }); }
    explosion(pos) { if (this.ok()) { this.sample('explosion', { vol: 0.8, pos, dist: true }); this.tone({ f0: 90, f1: 30, dur: 0.5, vol: 0.35, pos }); } }
    spawn(pos) { if (this.ok()) { this.sample('portal', { vol: 0.18, pos, rate: 1.5 }); } }
    ring(pos) { if (this.ok()) { this.sample('boom_low', { vol: 0.7, pos }); this.tone({ f0: 70, f1: 30, dur: 0.6, vol: 0.5, pos, dist: true }); } }
    bossWindup(pos) { if (this.ok()) { this.sample('dark_spell', { vol: 0.4, pos, rate: 0.7 }); this.tone({ f0: 60, f1: 120, dur: 0.8, vol: 0.3, type: 'sawtooth', filter: 400, pos, rev: 0.5 }); } }

    rankUp(rank) {
      if (!this.ok()) return;
      const base = 72 + rank * 2;
      [0, 3, 7, 12].forEach((s, i) => this.tone({ f0: mtof(base + s), dur: 0.18, vol: 0.06, type: 'square', filter: 3000, when: this.ctx.currentTime + i * 0.05, rev: 0.3 }));
    }

    waveStart(boss) {
      if (!this.ok()) return;
      const t = this.ctx.currentTime;
      // Taiko hits
      [0, 0.22, 0.44, boss ? 0.66 : null].forEach((dt) => {
        if (dt == null) return;
        this.tone({ f0: 95, f1: 45, dur: 0.5, vol: 0.9, when: t + dt, dist: true });
        this.noise({ f: 400, f1: 100, dur: 0.25, vol: 0.4, ftype: 'lowpass', when: t + dt });
      });
      if (boss) this.metal(220, 3, 0.15, { rev: 1, when: t + 0.7 });
    }

    // ---------- powers ----------
    power(id, pos) {
      if (!this.ok()) return;
      switch (id) {
        case 'soulswords': // spectral blades ringing into place
          this.sample('magic_missiles', { vol: 0.7, rev: 0.6 });
          this.sample('unsheath_1', { vol: 0.4, rate: 1.4, rev: 0.5 });
          break;
        case 'blood': // dark spell and wet tearing
          this.sample('dark_spell', { vol: 0.7, rate: 1.1 });
          this.sample('gore', { vol: 0.7, rate: 0.85, dist: true });
          this.tone({ f0: 70, f1: 40, dur: 0.6, vol: 0.4, type: 'sawtooth', filter: 400, dist: true });
          break;
        case 'shield': // barrier humming up
          this.sample('forcefield', { vol: 0.75, rev: 0.4 });
          this.sample('magic_cast', { vol: 0.3, rate: 1.2 });
          break;
        case 'chaos': // whirling blades
          for (let i = 0; i < 4; i++) this.sample('swing_light', { vol: 0.3, rate: 1.2 + i * 0.1, when: this.ctx.currentTime + i * 0.07 });
          this.sample('magic_strike', { vol: 0.45, rate: 1.1 });
          break;
        case 'gravity': // a rift opening
          this.sample('portal', { vol: 0.85, pos, rev: 0.5 });
          this.tone({ f0: 300, f1: 40, dur: 1.4, slide: 1.4, vol: 0.25, type: 'sine', rev: 0.5 });
          break;
        case 'meteor': // fire falling from the sky
          this.sample('fire_whoosh', { vol: 0.8, pos, rate: 0.85 });
          this.sample('magic_smite', { vol: 0.35, rate: 0.8 });
          break;
        case 'thunder': // crack and roll
          this.sample('thunder', { vol: 1, dist: true, rev: 0.3 });
          this.noise({ f: 6000, f1: 800, dur: 0.1, vol: 0.4, ftype: 'highpass', dist: true });
          break;
      }
    }
    powerFail() { if (this.ok()) this.tone({ f0: 160, f1: 120, dur: 0.08, vol: 0.12, type: 'square', filter: 800 }); }
    shieldBlock() { if (this.ok()) { this.sample('clash_2', { vol: 0.6, rev: 0.5 }); this.sample('forcefield', { vol: 0.35, rate: 1.5 }); } }
    wellBurst(pos) { if (this.ok()) { this.sample('boom_low', { vol: 1, pos, dist: true }); this.sample('explosion_3', { vol: 0.6, pos, rate: 0.8, rev: 0.5 }); } }
    meteorImpact(pos) {
      if (!this.ok()) return;
      this.sample('explosion_2', { vol: 1, pos, dist: true });
      this.sample('boom_low', { vol: 0.9, pos });
      this.sample('debris_big', { vol: 0.6, pos, when: this.ctx.currentTime + 0.15 });
      this.tone({ f0: 60, f1: 20, dur: 1.2, vol: 0.6, pos, dist: true });
    }

    // ---------- music ----------
    startMusic() {
      if (!this.ctx || this.musicOn) return;
      this.musicOn = true;
      this.bpm = 148;
      this.next = this.ctx.currentTime + 0.1;
      this.step = 0;
      this.timer = setInterval(() => this.schedule(), 25);
    }
    stopMusic() { this.musicOn = false; clearInterval(this.timer); }

    setDomain(on) {
      this.domainOn = on;
      if (!this.ctx) return;
      const f = this.musicFilter.frequency;
      f.cancelScheduledValues(this.ctx.currentTime);
      f.setTargetAtTime(on ? 700 : 18000, this.ctx.currentTime, on ? 0.05 : 0.4);
    }

    schedule() {
      const spb = 60 / this.bpm / 4; // seconds per 16th
      while (this.next < this.ctx.currentTime + 0.12) {
        this.playStep(this.step, this.next);
        this.next += spb;
        this.step++;
      }
    }

    playStep(s, t) {
      const I = this.intensity;
      const st = s % 16;
      const bar = Math.floor(s / 16);
      const root = 45 + PROG[Math.floor(bar / 2) % PROG.length]; // A2-based
      const mb = { music: true };

      if (st % 4 === 0) {
        // kick + sidechain duck
        this.tone(Object.assign({ f0: 160, f1: 42, slide: 0.09, dur: 0.32, vol: 0.9, when: t }, mb));
        this.duck.gain.cancelScheduledValues(t);
        this.duck.gain.setValueAtTime(0.25, t);
        this.duck.gain.linearRampToValueAtTime(1, t + 0.14);
        if (this.onBeat) { const delay = (t - this.ctx.currentTime) * 1000; const b = s / 4; setTimeout(() => this.onBeat && this.onBeat(b), Math.max(0, delay)); }
      }
      // Rolling psytrance bass on the three 16ths between kicks.
      if (st % 4 !== 0) {
        const note = root + (st % 4 === 3 && I > 0.6 ? 12 : 0);
        this.tone({ f0: mtof(note), dur: 0.11, vol: 0.32, type: 'sawtooth', filter: 300 + I * 900, filter1: 120, q: 4, when: t, dest: this.duck });
      }
      if (I > 0.15 && st % 2 === 1) this.noise(Object.assign({ f: 9000, ftype: 'highpass', dur: 0.035, vol: 0.12, when: t }, mb));
      if (I > 0.3 && st % 4 === 2) this.noise(Object.assign({ f: 7000, ftype: 'highpass', dur: 0.12, vol: 0.08, when: t }, mb));
      if (I > 0.35 && (st === 4 || st === 12)) {
        this.noise(Object.assign({ f: 1900, dur: 0.16, vol: 0.32, q: 0.8, when: t }, mb));
        this.tone(Object.assign({ f0: 210, f1: 140, dur: 0.1, vol: 0.18, type: 'triangle', when: t }, mb));
      }
      // Hirajoshi arp lead
      if (I > 0.5) {
        const pat = [0, 2, 4, 1, 3, 4, 2, 0, 4, 3, 1, 2, 0, 4, 3, 1];
        const deg = pat[(st + bar * 3) % 16];
        const oct = (st % 8 < 4) ? 24 : 36;
        const note = root + oct + HIRAJOSHI[deg];
        this.tone({ f0: mtof(note), dur: 0.09, vol: 0.05 + (I - 0.5) * 0.06, type: 'square', filter: 1200 + I * 3000, q: 3, when: t, dest: this.delay });
        this.tone(Object.assign({ f0: mtof(note), dur: 0.09, vol: 0.04, type: 'square', filter: 2200, when: t }, mb));
      }
      // Koto-like pluck stabs at low intensity, eerie pad at high
      if (st === 0 && bar % 2 === 0) {
        [0, 3, 7].forEach((s2, i) => this.tone({ f0: mtof(root + 24 + HIRAJOSHI[(i * 2) % 5]), dur: 2.4, vol: 0.05, type: 'sawtooth', filter: 900 + I * 1200, attack: 0.4, when: t, dest: this.duck, detune: i * 7 }));
      }
      if (I < 0.6 && st % 8 === 6) {
        const n = root + 24 + HIRAJOSHI[(bar + st) % 5];
        this.tone(Object.assign({ f0: mtof(n), dur: 0.5, vol: 0.06, type: 'triangle', when: t, rev: 0.4 }, mb));
      }
    }
  }

  SO.Audio = AudioSys;
})(window.SO = window.SO || {});
