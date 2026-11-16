// Inspect (T) sounds of the characters' own weapons, timed to each show's beats.
(function (SO) {
  'use strict';
  const SFX = SO.SFX = SO.SFX || {};

  // swings: a thin steel whistle under a breath of ghost voices; the X rings both blades with the
  // chain; the heavy draws breath, then both blades fall with a wail
  SFX['swing:souls'] = (a, e) => {
    const t = a.ctx.currentTime;
    if (e.step === 'h') {
      a.sample('unsheath_2', { vol: 0.35, rate: 1.3 });
      a.sample('whisper_creepy', { vol: 0.3, rate: 1.25, rev: 0.6 });
      a.sample('woosh_big', { vol: 0.6, rate: 1.2, when: t + 0.24 });
      a.sample('energy_slash', { vol: 0.5, rate: 0.85, when: t + 0.27, rev: 0.5 });
      a.sample('choir', { vol: 0.2, rate: 1.3, when: t + 0.28, rev: 0.8 });
      return;
    }
    a.sample('swing_light', { vol: 0.5, rate: e.step === 1 ? 1.12 : 1.0 });
    a.sample('whispers', { vol: 0.14, rate: 1.5 + e.step * 0.1, offset: Math.random() * 2 });
    if (e.step === 2) { a.sample('swing_light', { vol: 0.45, rate: 1.2, when: t + 0.05 }); a.sample('chains', { vol: 0.22, rate: 1.4, when: t + 0.08 }); }
  };
  SFX['hit:souls'] = (a, e) => {
    a.sample('slash', { vol: 0.55, rate: 1.1 });
    a.sample('flesh', { vol: 0.4 });
    a.sample('bowl', { vol: 0.12, rate: 2.2, rev: 0.6 });
    if (e.crit) a.sample('clash_3', { vol: 0.3, rate: 1.5, rev: 0.5 });
  };
  SFX['cw_souls_x:hit'] = (a) => { if (a.every('soulsx', 60)) { a.sample('magic_strike', { vol: 0.4, rate: 1.3 }); a.sample('whispers', { vol: 0.15, rate: 1.8 }); } };
  SFX['cw_souls_x:launch'] = (a) => { a.sample('energy_slash', { vol: 0.45, rate: 1.1 }); };

  // 02 Lâmina do Vazio: thin cuts that leave a hollow suck of air behind; the stab pops through
  // a portal; the rift tears open, hums, then slams shut.
  SFX['swing:void'] = (a, e) => {
    const t = a.ctx.currentTime;
    if (e.step === 'h') {
      a.sample('unsheath_1', { vol: 0.35, rate: 0.8 });
      a.sample('swing_heavy', { vol: 0.5, rate: 1.25, when: t + 0.22 });
      a.sample('portal', { vol: 0.55, rate: 0.75, when: t + 0.25 });
      a.sample('glass_break', { vol: 0.3, rate: 0.6, when: t + 0.27 });
      return;
    }
    a.sample('swing_light', { vol: 0.45, rate: 1.15 - e.step * 0.05 });
    a.tone({ f0: 900, f1: 120, dur: 0.18, vol: 0.05, type: 'sine', rev: 0.5 });
    if (e.step === 2) a.sample('teleport', { vol: 0.45, rate: 1.4 });
  };
  SFX['hit:void'] = (a, e) => { a.sample('slash', { vol: 0.55, rate: 1.2 }); a.sample('flesh', { vol: 0.35 }); a.sample('glass_slow', { vol: 0.14, rate: 2, offset: 0.1 }); if (e.crit) a.sample('clash_3', { vol: 0.3, rate: 1.6 }); };
  SFX['cw_void:step'] = (a) => { a.sample('teleport', { vol: 0.5, rate: 1.1 }); a.sample('portal', { vol: 0.25, rate: 1.6 }); };
  SFX['cw_rift:implode'] = (a) => { a.sample('explosion', { vol: 0.5, rate: 0.85 }); a.sample('dark_spell', { vol: 0.5, rate: 1.1 }); a.sample('glass_break', { vol: 0.4, rate: 0.7 }); };
  SFX['inspect:void'] = (a) => {
    const t = a.ctx.currentTime;
    a.sample('unsheath_1', { vol: 0.45, rate: 1.1, when: t + 0.1 });
    a.sample('magic_ring', { vol: 0.35, rate: 0.8, when: t + 1.15, rev: 0.6 });
    a.sample('portal', { vol: 0.3, rate: 1.5, when: t + 1.3 });
    a.sample('glass_break', { vol: 0.45, rate: 0.9, when: t + 2.25 });
    a.sample('whispers', { vol: 0.2, rate: 0.7, when: t + 2.4, rev: 0.7 });
    a.sample('portal', { vol: 0.55, rate: 0.7, when: t + 3.35 });
    a.sample('glass_slow', { vol: 0.35, rate: 0.6, when: t + 3.6, rev: 0.6 });
    a.sample('swing_light', { vol: 0.35, when: t + 4.1 });
  };

  // 03 Canhão Ritual: iron whooshing through the air with the chain rattling; the slam lands on
  // stone and bursts into fire; the shot is a deep cannon boom with a roar of flame.
  SFX['swing:demon'] = (a, e) => {
    const t = a.ctx.currentTime;
    if (e.step === 'h') {
      a.sample('charge', { vol: 0.3, rate: 0.7 });
      a.sample('chain_heavy', { vol: 0.3, rate: 1.1 });
      a.sample('fire_explosion', { vol: 0.75, rate: 0.85, when: t + 0.3 });
      a.sample('boom_low', { vol: 0.7, rate: 0.9, when: t + 0.3 });
      a.sample('gong', { vol: 0.2, rate: 1.4, when: t + 0.32, rev: 0.6 });
      return;
    }
    a.sample('swing_heavy', { vol: 0.6, rate: 0.8 });
    a.sample('chains', { vol: 0.2, rate: 1.2, when: t + 0.05 });
    a.sample('fire_whoosh', { vol: 0.25, rate: 1.3, when: t + 0.1 });
    if (e.step === 2) { a.sample('explosion_2', { vol: 0.55, rate: 0.9, when: t + 0.29 }); a.sample('rock', { vol: 0.5, when: t + 0.3 }); a.sample('flame_burst', { vol: 0.45, when: t + 0.31 }); }
  };
  SFX['hit:demon'] = (a, e) => { a.sample('punch', { vol: 0.6, rate: 0.8 }); a.sample('metal_1', { vol: 0.3, rate: 0.75 }); a.sample('flesh', { vol: 0.4 }); a.sample('fire_flash', { vol: 0.2, rate: 1.3 }); if (e.crit) a.sample('clash_2', { vol: 0.3, rate: 0.9 }); };
  SFX['cw_demon_shell:boom'] = (a, e) => { a.sample('explosion_3', { vol: 0.85, rate: 0.85, pos: e }); a.sample('fire_roar', { vol: 0.45, pos: e }); a.sample('debris_big', { vol: 0.4, pos: e }); };
  SFX['cw_demon:slam'] = () => {};
  SFX['inspect:demon'] = (a) => {
    const t = a.ctx.currentTime;
    a.sample('chain_heavy', { vol: 0.35, when: t + 0.1 });
    a.sample('bell', { vol: 0.2, rate: 1.8, when: t + 0.3 });
    a.sample('fire_loop', { vol: 0.25, rate: 0.8, when: t + 1.1 });
    a.sample('magic_ring', { vol: 0.3, rate: 0.6, when: t + 1.25, rev: 0.5 });
    a.sample('metal_2', { vol: 0.3, rate: 0.7, when: t + 2.3 });
    a.sample('fire_whoosh', { vol: 0.4, rate: 0.8, when: t + 2.5 });
    a.sample('charge', { vol: 0.35, rate: 0.6, when: t + 3.0 });
    a.sample('fire_explosion', { vol: 0.65, when: t + 3.42 });
    a.sample('demon_growl', { vol: 0.3, rate: 1.1, when: t + 3.5, rev: 0.6 });
    a.sample('chains', { vol: 0.3, when: t + 4.3 });
  };

  // 04 Cetro Abissal: a heavy staff whooshing with bells; the eye's glare is a hiss and a
  // shriek; the circle groans open and the claws burst through stone.
  SFX['swing:summon'] = (a, e) => {
    const t = a.ctx.currentTime;
    if (e.step === 'h') {
      a.sample('swing_heavy', { vol: 0.4, rate: 1.1 });
      a.sample('rock', { vol: 0.5, rate: 0.8, when: t + 0.36 });
      a.sample('dark_spell', { vol: 0.5, rate: 0.7, when: t + 0.38 });
      a.sample('demon_awoken', { vol: 0.4, rate: 1.0, when: t + 0.45 });
      return;
    }
    if (e.step === 2) { a.sample('laser_bolt', { vol: 0.35, rate: 0.6, when: t + 0.16 }); a.sample('whisper_creepy', { vol: 0.25, rate: 1.6, when: t + 0.16 }); a.sample('swing_light', { vol: 0.3, rate: 0.9 }); return; }
    a.sample('swing_heavy', { vol: 0.45, rate: 1.15 });
  };
  SFX['hit:summon'] = (a, e) => { a.sample('punch', { vol: 0.55, rate: 1.0 }); a.sample('flesh', { vol: 0.35 }); a.sample('bell', { vol: 0.1, rate: 2.4 }); if (e.crit) a.sample('clash_2', { vol: 0.3 }); };
  SFX['cw_summon:gaze'] = () => {};
  SFX['cw_abyss:claws'] = (a, e) => { if (!a.every('claws', 150)) return; a.sample('debris_big', { vol: 0.45, pos: e }); a.sample('beast_roar', { vol: e.n > 5 ? 0.35 : 0.2, rate: 1.3, pos: e }); a.sample('flesh', { vol: 0.4, rate: 0.7 }); };
  SFX['inspect:summon'] = (a) => {
    const t = a.ctx.currentTime;
    a.sample('bell', { vol: 0.3, rate: 1.6, when: t + 0.2 });
    a.sample('bell', { vol: 0.25, rate: 1.9, when: t + 0.55 });
    a.sample('heartbeat', { vol: 0.35, rate: 0.9, when: t + 1.1 });
    a.sample('squish', { vol: 0.3, rate: 0.7, when: t + 1.2 });
    a.sample('whispers', { vol: 0.3, rate: 0.8, when: t + 2.3, rev: 0.6 });
    a.sample('magic_ring', { vol: 0.35, rate: 0.5, when: t + 2.4, rev: 0.7 });
    a.sample('demon_awoken', { vol: 0.55, when: t + 3.45 });
    a.sample('demon_growl', { vol: 0.35, rate: 0.8, when: t + 3.7, rev: 0.6 });
    a.sample('bell', { vol: 0.3, rate: 1.2, when: t + 4.4, rev: 0.7 });
  };

  // 05 Foice Sanguínea: a long scythe hiss with a wet splash; the harvest spins twice; the crescent
  // of blood leaves with a liquid roar and each cut sucks blood back.
  SFX['swing:blood'] = (a, e) => {
    const t = a.ctx.currentTime;
    if (e.step === 'h') { a.sample('swing_heavy', { vol: 0.5, rate: 1.0, when: t + 0.18 }); a.sample('splash_big', { vol: 0.45, rate: 1.1, when: t + 0.22 }); a.sample('energy_slash', { vol: 0.35, rate: 0.75, when: t + 0.22 }); return; }
    if (e.step === 2) { a.sample('swing_light', { vol: 0.45, rate: 0.85 }); a.sample('swing_light', { vol: 0.45, rate: 0.95, when: t + 0.24 }); a.sample('splash', { vol: 0.25, when: t + 0.12 }); return; }
    a.sample('swing_heavy', { vol: 0.45, rate: 1.25 }); a.sample('splash', { vol: 0.18, rate: 1.4, when: t + 0.08 });
  };
  SFX['hit:blood'] = (a, e) => { a.sample('flesh', { vol: 0.55 }); a.sample('gore', { vol: 0.35 }); a.sample('heartbeat', { vol: 0.12, rate: 1.6 }); if (e.crit) a.sample('slash', { vol: 0.4, rate: 0.9 }); };
  SFX['cw_blood_wave:hit'] = (a) => { if (a.every('bloodwave', 70)) { a.sample('gore', { vol: 0.45 }); a.sample('heal_pop', { vol: 0.2, rate: 0.7 }); } };
  SFX['cw_blood_wave:end'] = (a) => { a.sample('splash_big', { vol: 0.3, rate: 0.8 }); };
  SFX['inspect:blood'] = (a) => {
    const t = a.ctx.currentTime;
    a.sample('swing_light', { vol: 0.3, rate: 0.8, when: t + 0.1 });
    a.sample('splash', { vol: 0.25, rate: 1.6, when: t + 0.5 });
    a.sample('splash', { vol: 0.2, rate: 1.8, when: t + 0.8 });
    a.sample('mud_splat', { vol: 0.3, rate: 0.7, when: t + 1.2 });
    a.sample('heartbeat', { vol: 0.4, when: t + 1.4 });
    a.sample('squish', { vol: 0.35, rate: 0.6, when: t + 2.3 });
    a.sample('whispers', { vol: 0.2, rate: 0.6, when: t + 2.4, rev: 0.6 });
    a.sample('splash_big', { vol: 0.35, rate: 0.7, when: t + 3.4 });
    a.sample('heartbeat', { vol: 0.45, rate: 1.2, when: t + 3.5 });
  };

  // 06 Égide Arcana: glassy chimes and a hum; the bash is a bell-like thud, the crystals sing as
  // they fly, the dome is a choir swell with a deep pulse.
  SFX['swing:aegis'] = (a, e) => {
    const t = a.ctx.currentTime;
    if (e.step === 'h') { a.sample('forcefield', { vol: 0.5, rate: 0.8, when: t + 0.2 }); a.sample('angel', { vol: 0.4, rate: 1.2, when: t + 0.3 }); a.sample('energy_blast', { vol: 0.45, rate: 0.7, when: t + 0.33 }); return; }
    if (e.step === 0) { a.sample('woosh_big', { vol: 0.3, rate: 1.5 }); a.sample('bell', { vol: 0.35, rate: 0.9, when: t + 0.12 }); a.sample('punch', { vol: 0.3, when: t + 0.12 }); return; }
    if (e.step === 2) { for (let i = 0; i < 5; i++) a.sample('magic_missiles', { vol: 0.16, rate: 1.4 + i * 0.08, when: t + 0.16 + i * 0.04 }); a.sample('glass_slow', { vol: 0.2, rate: 1.8, when: t + 0.1 }); return; }
    a.sample('swing_light', { vol: 0.4, rate: 0.9 }); a.sample('magic_ring', { vol: 0.2, rate: 1.6 });
  };
  SFX['hit:aegis'] = (a, e) => { a.sample('punch', { vol: 0.5, rate: 1.1 }); a.sample('bell', { vol: 0.12, rate: 2.2 }); if (e.crit) a.sample('clash_3', { vol: 0.3, rate: 1.4 }); };
  SFX['cw_aegis_shard:hit'] = (a) => { if (a.every('aegisshard', 50)) { a.sample('glass_break', { vol: 0.25, rate: 1.6 }); a.sample('punch', { vol: 0.2, rate: 1.5 }); } };
  SFX['cw_aegis:dome'] = () => {};
  SFX['inspect:aegis'] = (a) => {
    const t = a.ctx.currentTime;
    a.sample('hum_ship', { vol: 0.2, rate: 1.4, when: t + 0.1 });
    a.sample('magic_ring', { vol: 0.3, rate: 1.2, when: t + 0.3, rev: 0.6 });
    a.sample('bell', { vol: 0.25, rate: 1.5, when: t + 1.1, rev: 0.6 });
    a.sample('glass_slow', { vol: 0.25, rate: 1.4, when: t + 2.1 });
    a.sample('harmony', { vol: 0.3, rate: 1.1, when: t + 2.2 });
    a.sample('forcefield', { vol: 0.45, rate: 0.9, when: t + 3.15 });
    a.sample('choir', { vol: 0.35, rate: 1.2, when: t + 3.2, rev: 0.8 });
  };

  // 07 Martelo Astral: rock grinding and a heavy whoosh; impacts crack stone; the call is a
  // rising roar from the sky and a ground-shaking crash.
  SFX['swing:meteor'] = (a, e) => {
    const t = a.ctx.currentTime;
    if (e.step === 'h') { a.sample('rock', { vol: 0.4, rate: 0.7 }); a.sample('fire_roar', { vol: 0.4, rate: 0.8, when: t + 0.3 }); a.sample('woosh_big', { vol: 0.5, rate: 0.6, when: t + 0.55 }); return; }
    a.sample('swing_heavy', { vol: 0.6, rate: 0.75 });
    a.sample('rock', { vol: 0.2, rate: 1.3 });
    if (e.step === 2) { a.sample('earthquake', { vol: 0.5, when: t + 0.33 }); a.sample('explosion_2', { vol: 0.5, rate: 0.8, when: t + 0.34 }); }
    else a.sample('fire_whoosh', { vol: 0.25, rate: 1.1, when: t + 0.12 });
  };
  SFX['hit:meteor'] = (a, e) => { a.sample('punch', { vol: 0.6, rate: 0.7 }); a.sample('rock', { vol: 0.45, rate: 0.9 }); a.sample('flesh', { vol: 0.35 }); if (e.crit) a.sample('debris_big', { vol: 0.3 }); };
  SFX['cw_meteor_rock:launch'] = (a) => { a.sample('fire_roar', { vol: 0.5, rate: 0.6 }); a.sample('woosh_big', { vol: 0.4, rate: 0.5 }); };
  SFX['cw_meteor_rock:boom'] = (a, e) => { a.sample('explosion_3', { vol: 0.9, rate: 0.75, pos: e }); a.sample('earthquake', { vol: 0.6, pos: e }); a.sample('debris_big', { vol: 0.5, pos: e }); };
  SFX['cw_meteor_frag:boom'] = (a, e) => { if (a.every('mfrag', 90)) { a.sample('explosion', { vol: 0.35, rate: 1.2, pos: e }); a.sample('rock', { vol: 0.3, pos: e }); } };
  SFX['cw_meteor:quake'] = () => {};
  SFX['cw_meteor:mark'] = (a) => { a.sample('charge', { vol: 0.25, rate: 0.6 }); };
  SFX['inspect:meteor'] = (a) => {
    const t = a.ctx.currentTime;
    a.sample('rock', { vol: 0.3, rate: 0.8, when: t + 0.2 });
    a.sample('mining', { vol: 0.25, rate: 0.7, when: t + 1.2 });
    a.sample('rock', { vol: 0.25, rate: 1.1, when: t + 1.5 });
    a.sample('fire_loop', { vol: 0.3, rate: 0.7, when: t + 2.3 });
    a.sample('earthquake', { vol: 0.3, rate: 1.2, when: t + 2.5 });
    a.sample('fire_explosion', { vol: 0.55, rate: 0.85, when: t + 3.45 });
    a.sample('fire_roar', { vol: 0.35, when: t + 3.6 });
    a.sample('debris_big', { vol: 0.45, rate: 1.1, when: t + 4.5 });
  };

  // 08 Lança Ígnea: every move is a roar of flame; the charge is a jet-engine whoosh of fire.
  SFX['swing:fire'] = (a, e) => {
    const t = a.ctx.currentTime;
    if (e.step === 'h') { a.sample('flamewind', { vol: 0.6, rate: 1.1 }); a.sample('fire_roar', { vol: 0.5, rate: 1.2, when: t + 0.05 }); a.sample('woosh_big', { vol: 0.5, rate: 0.9, when: t + 0.05 }); return; }
    if (e.step === 2) { a.sample('fire_whoosh', { vol: 0.5, rate: 0.8 }); a.sample('swing_light', { vol: 0.35, rate: 0.8 }); a.sample('flame_burst', { vol: 0.5, rate: 0.9, when: t + 0.16 }); return; }
    a.sample('fire_whoosh', { vol: 0.45, rate: 1.1 + e.step * 0.1 }); a.sample('swing_light', { vol: 0.35, rate: 1.1 });
  };
  SFX['hit:fire'] = (a, e) => { a.sample('flesh', { vol: 0.45 }); a.sample('fire_flash', { vol: 0.35, rate: 1.2 }); if (e.crit) a.sample('flame_burst', { vol: 0.3 }); };
  SFX['cw_fire:ring'] = () => {};
  SFX['cw_fire:charge'] = () => {};
  SFX['inspect:fire'] = (a) => {
    const t = a.ctx.currentTime;
    a.sample('fire_flash', { vol: 0.35, when: t + 0.1 });
    a.sample('fire_loop', { vol: 0.25, when: t + 0.3 });
    a.sample('fire_whoosh', { vol: 0.45, rate: 0.8, when: t + 1.1 });
    a.sample('flamewind', { vol: 0.4, rate: 0.9, when: t + 2.2 });
    a.sample('fire_roar', { vol: 0.5, when: t + 3.3 });
    a.sample('fire_explosion', { vol: 0.35, rate: 1.2, when: t + 3.4 });
    a.sample('fire_whoosh', { vol: 0.4, rate: 0.7, when: t + 4.35 });
  };

  // 09 Lança de Plasma: electric buzz on every move; the bolt zaps; the beam charges with a rising
  // whine and fires a heavy cannon.
  SFX['swing:plasma'] = (a, e) => {
    const t = a.ctx.currentTime;
    if (e.step === 'h') { a.sample('charge', { vol: 0.45, rate: 1.3 }); a.sample('electric_loop', { vol: 0.3, rate: 1.2, offset: 0.2 }); a.sample('laser_cannon', { vol: 0.75, rate: 0.9, when: t + 0.36 }); a.sample('beam_heavy', { vol: 0.5, when: t + 0.37 }); a.sample('thunder', { vol: 0.35, rate: 1.4, when: t + 0.4 }); return; }
    a.sample('swing_light', { vol: 0.4, rate: 1.1 }); a.sample('zap', { vol: 0.25, rate: 1.2 + Math.random() * 0.3, when: t + 0.05 });
    if (e.step === 2) a.sample('laser_bolt', { vol: 0.45, rate: 1.1, when: t + 0.1 });
  };
  SFX['hit:plasma'] = (a, e) => { a.sample('shock_zap', { vol: 0.4, rate: 1.1 }); a.sample('flesh', { vol: 0.35 }); if (e.crit) a.sample('high_voltage', { vol: 0.25 }); };
  SFX['cw_plasma_bolt:hit'] = (a) => { a.sample('shock_zap', { vol: 0.45 }); a.sample('spark', { vol: 0.3 }); };
  SFX['cw_plasma:beam'] = () => {};
  SFX['inspect:plasma'] = (a) => {
    const t = a.ctx.currentTime;
    a.sample('spark', { vol: 0.3, when: t + 0.2 });
    a.sample('hum_ship', { vol: 0.25, rate: 1.6, when: t + 1.1 });
    a.sample('magic_ring', { vol: 0.25, rate: 1.4, when: t + 1.2 });
    a.sample('electric_loop', { vol: 0.3, when: t + 2.2 });
    a.sample('spark', { vol: 0.35, rate: 1.3, when: t + 2.6 });
    a.sample('high_voltage', { vol: 0.45, when: t + 3.3 });
    a.sample('thunder', { vol: 0.3, rate: 1.5, when: t + 3.5 });
    a.sample('shock_zap', { vol: 0.35, when: t + 4.3 });
  };

  // 10 Alabarda Glacial: a cold whistle and crackle of frost on every swing; the spikes burst one
  // after another out of the ground.
  SFX['swing:ice'] = (a, e) => {
    const t = a.ctx.currentTime;
    if (e.step === 'h') { a.sample('swing_heavy', { vol: 0.5, rate: 0.9, when: t + 0.15 }); a.sample('ice_break', { vol: 0.5, when: t + 0.32 }); a.sample('icicles', { vol: 0.45, when: t + 0.36 }); return; }
    a.sample('swing_heavy', { vol: 0.4, rate: 1.2 }); a.sample('wind_gust', { vol: 0.15, rate: 1.6 }); a.sample('freeze_fx', { vol: 0.2, rate: 1.4, when: t + 0.1 });
  };
  SFX['hit:ice'] = (a, e) => { a.sample('ice_crack', { vol: 0.45 }); a.sample('flesh', { vol: 0.3 }); if (e.crit) a.sample('ice_shatter', { vol: 0.3 }); };
  SFX['cw_ice:spike'] = (a, e) => { if (a.every('icespike', 90)) a.sample('ice_break', { vol: 0.35, rate: 1 + (e.i || 0) * 0.04, pos: e }); };
  SFX['inspect:ice'] = (a) => {
    const t = a.ctx.currentTime;
    a.sample('wind_loop', { vol: 0.2, rate: 0.8, when: t + 0.1 });
    a.sample('freeze_fx', { vol: 0.35, when: t + 1.1 });
    a.sample('glass_slow', { vol: 0.25, rate: 1.3, when: t + 2.2 });
    a.sample('icicles', { vol: 0.35, when: t + 2.4 });
    a.sample('ice_shatter', { vol: 0.45, rate: 0.9, when: t + 3.3 });
    a.sample('ice_break', { vol: 0.4, when: t + 3.45 });
  };

  // 11 Martelo do Vazio: deep whooshes that suck the air in; the well hums; the hole implodes.
  SFX['swing:gravity'] = (a, e) => {
    const t = a.ctx.currentTime;
    if (e.step === 'h') { a.sample('swing_heavy', { vol: 0.5, rate: 0.8, when: t + 0.2 }); a.sample('dark_spell', { vol: 0.5, rate: 0.6, when: t + 0.28 }); return; }
    a.sample('swing_heavy', { vol: 0.6, rate: 0.7 }); a.tone({ f0: 80, f1: 40, dur: 0.4, vol: 0.12, type: 'sine' });
    if (e.step === 2) { a.sample('earthquake', { vol: 0.45, when: t + 0.32 }); a.sample('boom_low', { vol: 0.5, when: t + 0.33 }); a.sample('hum_ship', { vol: 0.3, rate: 0.5, when: t + 0.35 }); }
  };
  SFX['hit:gravity'] = (a, e) => { a.sample('punch', { vol: 0.6, rate: 0.6 }); a.sample('rock', { vol: 0.3, rate: 0.7 }); a.sample('flesh', { vol: 0.3 }); if (e.crit) a.sample('boom_low', { vol: 0.3, rate: 1.4 }); };
  SFX['cw_grav:implode'] = (a, e) => { a.sample('explosion_3', { vol: 0.6, rate: 0.6, pos: e }); a.sample('dark_spell', { vol: 0.5, rate: 0.5, pos: e }); a.sample('boom_low', { vol: 0.6, pos: e }); };
  SFX['cw_grav_hole:launch'] = (a) => { a.sample('portal', { vol: 0.45, rate: 0.5 }); a.sample('hum_ship', { vol: 0.3, rate: 0.6 }); };
  SFX['inspect:gravity'] = (a) => {
    const t = a.ctx.currentTime;
    a.sample('hum_ship', { vol: 0.25, rate: 0.5, when: t + 0.1 });
    a.sample('rock', { vol: 0.3, rate: 0.6, when: t + 1.2 });
    a.sample('mining', { vol: 0.2, rate: 0.5, when: t + 1.5 });
    a.sample('wind_loop', { vol: 0.25, rate: 0.6, when: t + 2.3 });
    a.sample('portal', { vol: 0.5, rate: 0.45, when: t + 3.4 });
    a.sample('dark_spell', { vol: 0.4, rate: 0.5, when: t + 3.5 });
    a.sample('debris_big', { vol: 0.35, rate: 0.7, when: t + 4.2 });
  };

  // 12 Metralhadora da Caveira: real gunfire, the drum's whir, the shells ringing on stone.
  SFX['swing:bullets'] = (a, e) => {
    const t = a.ctx.currentTime;
    if (e.step === 'h') { a.sample('charge', { vol: 0.35, rate: 1.6 }); for (let i = 0; i < 18; i++) a.sample('mg_shot', { vol: 0.35, rate: 0.95 + Math.random() * 0.15, when: t + 0.25 + i * 0.042 }); a.sample('shells', { vol: 0.35, when: t + 0.5 }); return; }
    const n = [3, 4, 6][e.step] || 3;
    for (let i = 0; i < n; i++) a.sample('mg_shot', { vol: 0.4, rate: 1 + Math.random() * 0.1, when: t + i * 0.045 });
    a.sample('shells', { vol: 0.2, rate: 1.1, when: t + 0.12 });
  };
  SFX['hit:bullets'] = (a) => { if (a.every('bulhit', 40)) { a.sample('flesh', { vol: 0.25, rate: 1.3 }); a.sample('punch', { vol: 0.15, rate: 1.6 }); } };
  SFX['cw_bullets:burst'] = () => {};
  SFX['inspect:bullets'] = (a) => {
    const t = a.ctx.currentTime;
    a.sample('chain_heavy', { vol: 0.3, when: t + 0.1 });
    a.sample('bell', { vol: 0.2, rate: 1.7, when: t + 0.3 });
    a.sample('fire_loop', { vol: 0.2, rate: 1.4, when: t + 1.1 });
    a.sample('charge', { vol: 0.35, rate: 0.9, when: t + 2.2 });
    a.sample('shells', { vol: 0.45, when: t + 2.6 });
    a.sample('fire_flash', { vol: 0.4, when: t + 3.4 });
    a.sample('shells', { vol: 0.4, rate: 0.9, when: t + 3.7 });
  };

  // 13 Lança Sagrada: bright chimes on each thrust; the throw sings and lands as a bell of light.
  SFX['swing:spear'] = (a, e) => {
    const t = a.ctx.currentTime;
    if (e.step === 'h') { a.sample('swing_heavy', { vol: 0.5, rate: 1.1, when: t + 0.25 }); a.sample('magic_cast', { vol: 0.4, rate: 1.3, when: t + 0.3 }); return; }
    a.sample('swing_light', { vol: 0.45, rate: 1.05 }); a.sample('magic_ring', { vol: 0.15, rate: 1.9, when: t + 0.05 });
  };
  SFX['hit:spear'] = (a, e) => { a.sample('slash', { vol: 0.5, rate: 1.15 }); a.sample('flesh', { vol: 0.35 }); a.sample('bell', { vol: 0.08, rate: 2.5 }); if (e.crit) a.sample('clash_3', { vol: 0.3, rate: 1.5 }); };
  SFX['cw_light_spear:launch'] = (a) => { a.sample('angel', { vol: 0.3, rate: 1.4 }); };
  SFX['cw_light_spear:boom'] = (a, e) => { a.sample('magic_smite', { vol: 0.7, pos: e }); a.sample('bell', { vol: 0.45, rate: 0.9, rev: 0.7, pos: e }); a.sample('explosion', { vol: 0.4, rate: 1.2, pos: e }); };
  SFX['inspect:spear'] = (a) => {
    const t = a.ctx.currentTime;
    a.sample('magic_ring', { vol: 0.3, rate: 1.3, when: t + 0.2 });
    a.sample('harmony', { vol: 0.3, rate: 1.2, when: t + 1.1 });
    a.sample('glass_slow', { vol: 0.2, rate: 1.8, when: t + 2.2 });
    a.sample('angel', { vol: 0.45, when: t + 3.3 });
    a.sample('bell', { vol: 0.35, rate: 1.1, when: t + 3.4, rev: 0.8 });
  };

  // 14 Adagas das Sombras: quick hissing cuts; the echo is a whisper; the dash two rushes of dark.
  SFX['swing:shadow'] = (a, e) => {
    const t = a.ctx.currentTime;
    if (e.step === 'h') { a.sample('whisper_creepy', { vol: 0.35, rate: 1.3 }); a.sample('woosh_big', { vol: 0.45, rate: 1.3, when: t + 0.2 }); a.sample('dark_spell', { vol: 0.35, rate: 1.4, when: t + 0.2 }); return; }
    a.sample('swing_light', { vol: 0.42, rate: 1.25 + e.step * 0.05 });
    if (e.step === 2) { a.sample('swing_light', { vol: 0.35, rate: 1.4, when: t + 0.05 }); a.sample('whispers', { vol: 0.2, rate: 1.5, when: t + 0.15 }); a.sample('slash', { vol: 0.3, rate: 1.3, when: t + 0.33 }); }
  };
  SFX['hit:shadow'] = (a, e) => { a.sample('slash', { vol: 0.45, rate: 1.3 }); a.sample('flesh', { vol: 0.3, rate: 1.2 }); if (e.crit) a.sample('clash_3', { vol: 0.25, rate: 1.7 }); };
  SFX['cw_shadow:dash'] = () => {};
  SFX['inspect:shadow'] = (a) => {
    const t = a.ctx.currentTime;
    a.sample('unsheath_1', { vol: 0.35, rate: 1.3, when: t + 0.1 });
    a.sample('whispers', { vol: 0.3, rate: 0.9, when: t + 1.1, rev: 0.6 });
    a.sample('swing_light', { vol: 0.3, rate: 1.5, when: t + 2.3 });
    a.sample('swing_light', { vol: 0.25, rate: 1.6, when: t + 2.45 });
    a.sample('whisper_creepy', { vol: 0.45, when: t + 3.35, rev: 0.6 });
    a.sample('dark_spell', { vol: 0.3, rate: 0.8, when: t + 3.4 });
  };

  // 15 Foice do Vendaval: gusts on every sweep; the tornado howls.
  SFX['swing:wind'] = (a, e) => {
    const t = a.ctx.currentTime;
    if (e.step === 'h') { a.sample('wind_gust', { vol: 0.5, when: t + 0.2 }); a.sample('woosh_big', { vol: 0.45, rate: 0.8, when: t + 0.25 }); a.sample('wind_loop', { vol: 0.4, rate: 0.9, when: t + 0.35 }); return; }
    if (e.step === 2) { a.sample('wind_whip', { vol: 0.45 }); a.sample('wind_whip', { vol: 0.4, rate: 1.1, when: t + 0.24 }); return; }
    a.sample('wind_whip', { vol: 0.42, rate: 1.0 + e.step * 0.1 }); a.sample('wind_gust', { vol: 0.2, rate: 1.4, when: t + 0.08 });
  };
  SFX['hit:wind'] = (a, e) => { a.sample('slash', { vol: 0.5, rate: 1.1 }); a.sample('flesh', { vol: 0.3 }); if (e.crit) a.sample('wind_whip', { vol: 0.3, rate: 1.5 }); };
  SFX['cw_wind_blade:hit'] = (a) => { if (a.every('windblade', 60)) a.sample('slash', { vol: 0.3, rate: 1.4 }); };
  SFX['inspect:wind'] = (a) => {
    const t = a.ctx.currentTime;
    a.sample('wind_gust', { vol: 0.3, when: t + 0.1 });
    a.sample('wind_loop', { vol: 0.25, rate: 0.9, when: t + 1.1 });
    a.sample('wind_whip', { vol: 0.35, when: t + 2.3 });
    a.sample('woosh_big', { vol: 0.4, rate: 0.7, when: t + 3.3 });
    a.sample('wind_gust', { vol: 0.45, rate: 0.8, when: t + 3.5 });
  };

  // 16 Báculo da Natureza: soft woody thuds with chimes; flowers sprout with a bright pop; the
  // field blooms with a choir and a harp-like shimmer.
  SFX['swing:regen'] = (a, e) => {
    const t = a.ctx.currentTime;
    if (e.step === 'h') { a.sample('wood_break', { vol: 0.35, rate: 1.3, when: t + 0.36 }); a.sample('angel', { vol: 0.5, rate: 1.1, when: t + 0.38 }); a.sample('harmony', { vol: 0.4, when: t + 0.5 }); a.sample('heal_rpg', { vol: 0.5, when: t + 0.55 }); return; }
    a.sample('swing_heavy', { vol: 0.35, rate: 1.3 });
    a.sample('heal_pop', { vol: 0.25, rate: 1.3 + e.step * 0.1, when: t + 0.12 });
    if (e.step === 2) a.sample('harmony', { vol: 0.3, rate: 1.3, when: t + 0.22 });
  };
  SFX['hit:regen'] = (a, e) => { a.sample('punch', { vol: 0.4, rate: 1.2 }); a.sample('wood_break', { vol: 0.2, rate: 1.6 }); if (e.crit) a.sample('bell', { vol: 0.15, rate: 2 }); };
  SFX['inspect:regen'] = (a) => {
    const t = a.ctx.currentTime;
    a.sample('heal_pop', { vol: 0.3, when: t + 0.2 });
    a.sample('harmony', { vol: 0.35, rate: 1.2, when: t + 1.15 });
    a.sample('heal_pop', { vol: 0.25, rate: 1.4, when: t + 1.4 });
    a.sample('wind_loop', { vol: 0.15, rate: 1.3, when: t + 2.3 });
    a.sample('heal_rpg', { vol: 0.45, when: t + 3.45 });
    a.sample('choir', { vol: 0.35, rate: 1.2, when: t + 3.5, rev: 0.8 });
  };

  // 17 Martelo da Tempestade: thunder-heavy smashes; arcs zap; the call splits the sky.
  SFX['swing:thunder'] = (a, e) => {
    const t = a.ctx.currentTime;
    if (e.step === 'h') { a.sample('charge', { vol: 0.35, rate: 0.9 }); a.sample('thunder', { vol: 0.8, when: t + 0.32 }); a.sample('rain_storm', { vol: 0.2, when: t + 0.3 }); return; }
    a.sample('swing_heavy', { vol: 0.6, rate: 0.75 }); a.sample('spark', { vol: 0.2, rate: 1.4, when: t + 0.1 });
    if (e.step === 2) { a.sample('thunder', { vol: 0.6, rate: 1.1, when: t + 0.33 }); a.sample('earthquake', { vol: 0.4, when: t + 0.33 }); }
  };
  SFX['hit:thunder'] = (a, e) => { a.sample('punch', { vol: 0.6, rate: 0.7 }); a.sample('shock_zap', { vol: 0.35 }); if (e.crit) a.sample('high_voltage', { vol: 0.25 }); };
  SFX['cw_thunder:arc'] = (a) => { a.sample('zap', { vol: 0.35, rate: 1.1 }); a.sample('shock_zap', { vol: 0.25, rate: 1.3 }); };
  SFX['cw_thunder:strike'] = (a, e) => { a.sample('thunder', { vol: e.big ? 0.75 : 0.5, rate: 1 + Math.random() * 0.2, pos: e }); a.sample('explosion', { vol: 0.35, rate: 1.3, pos: e }); };
  SFX['inspect:thunder'] = (a) => {
    const t = a.ctx.currentTime;
    a.sample('spark', { vol: 0.3, when: t + 0.2 });
    a.sample('electric_loop', { vol: 0.3, when: t + 1.15 });
    a.sample('rock', { vol: 0.3, rate: 0.8, when: t + 2.3 });
    a.sample('high_voltage', { vol: 0.35, when: t + 2.5 });
    a.sample('thunder', { vol: 0.65, when: t + 3.45 });
    a.sample('rain_storm', { vol: 0.2, when: t + 3.5 });
  };

  // 18 Foice do Eclipse: low hollow swishes with a breath of whispers; the reap drags a groan.
  SFX['swing:dark'] = (a, e) => {
    const t = a.ctx.currentTime;
    if (e.step === 'h') { a.sample('swing_heavy', { vol: 0.5, rate: 0.85, when: t + 0.18 }); a.sample('dark_spell', { vol: 0.5, rate: 0.8, when: t + 0.22 }); a.sample('whisper_creepy', { vol: 0.3, rate: 0.9, when: t + 0.22 }); return; }
    if (e.step === 2) { a.sample('swing_heavy', { vol: 0.5, rate: 0.8, when: t + 0.15 }); a.sample('demon_growl', { vol: 0.2, rate: 1.4, when: t + 0.25 }); return; }
    a.sample('swing_heavy', { vol: 0.45, rate: 1.05 }); a.sample('whispers', { vol: 0.12, rate: 1.2, offset: Math.random() * 2 });
  };
  SFX['hit:dark'] = (a, e) => { a.sample('slash', { vol: 0.5 }); a.sample('flesh', { vol: 0.35 }); if (e.crit) a.sample('dark_spell', { vol: 0.25, rate: 1.4 }); };
  SFX['cw_night_wave:launch'] = (a) => { a.sample('dark_spell', { vol: 0.45, rate: 0.9 }); };
  SFX['cw_night_wave:hit'] = (a) => { if (a.every('night', 70)) { a.sample('flesh', { vol: 0.3 }); a.sample('heal_pop', { vol: 0.15, rate: 0.6 }); } };
  SFX['inspect:dark'] = (a) => {
    const t = a.ctx.currentTime;
    a.sample('whispers', { vol: 0.3, rate: 0.7, when: t + 0.1, rev: 0.6 });
    a.sample('wind_loop', { vol: 0.2, rate: 0.5, when: t + 1.1 });
    a.sample('dark_spell', { vol: 0.35, rate: 0.6, when: t + 2.3 });
    a.sample('whisper_creepy', { vol: 0.4, rate: 0.8, when: t + 3.4, rev: 0.7 });
    a.sample('bowl', { vol: 0.4, rate: 0.5, when: t + 3.5, rev: 0.8 });
  };

  // 19 Foices do Caos: whistling hooks and rattling chain; the whirl roars around you.
  SFX['swing:chaos'] = (a, e) => {
    const t = a.ctx.currentTime;
    if (e.step === 'h') { a.sample('chain_heavy', { vol: 0.45 }); for (let i = 0; i < 6; i++) a.sample('swing_light', { vol: 0.35, rate: 0.9 + (i % 2) * 0.15, when: t + 0.08 + i * 0.13 }); a.sample('chains', { vol: 0.35, when: t + 0.3 }); return; }
    if (e.step === 2) { a.sample('throw_whip', { vol: 0.5 }); a.sample('chains', { vol: 0.4, rate: 1.2, when: t + 0.05 }); return; }
    a.sample('swing_light', { vol: 0.45, rate: 1.15 }); a.sample('chains', { vol: 0.15, rate: 1.5, when: t + 0.05 });
  };
  SFX['hit:chaos'] = (a, e) => { a.sample('slash', { vol: 0.5, rate: 1.2 }); a.sample('gore', { vol: 0.3 }); if (e.crit) a.sample('clash_3', { vol: 0.3, rate: 1.4 }); };
  SFX['inspect:chaos'] = (a) => {
    const t = a.ctx.currentTime;
    a.sample('chains', { vol: 0.35, when: t + 0.2 });
    for (let i = 0; i < 10; i++) a.sample('swing_light', { vol: 0.25 + i * 0.02, rate: 0.85 + (i % 3) * 0.1, when: t + 1.3 + i * 0.3 });
    a.sample('chain_heavy', { vol: 0.4, when: t + 4.4 });
  };

  // 20 Cetro Elemental: each blow has its element's voice; the storm is four bursts in a row.
  SFX['swing:elemental'] = (a, e) => {
    const t = a.ctx.currentTime;
    if (e.step === 'h') { a.sample('magic_cast', { vol: 0.45 }); a.sample('magic_missiles', { vol: 0.35, when: t + 0.3 }); return; }
    a.sample('swing_heavy', { vol: 0.35, rate: 1.3 });
    if (e.step === 0) a.sample('fire_whoosh', { vol: 0.35, rate: 1.2, when: t + 0.08 });
    else if (e.step === 1) a.sample('freeze_fx', { vol: 0.3, rate: 1.3, when: t + 0.08 });
    else { a.sample('zap', { vol: 0.35, when: t + 0.2 }); a.sample('magic_smite', { vol: 0.4, rate: 1.3, when: t + 0.22 }); }
  };
  SFX['hit:elemental'] = (a, e) => { a.sample('punch', { vol: 0.45, rate: 1.1 }); a.sample('magic_strike', { vol: 0.2, rate: 1.4 }); if (e.crit) a.sample('bell', { vol: 0.15, rate: 2 }); };
  SFX['cw_elem_orb:boom'] = (a, e) => {
    const el = e.variant;
    if (el === 'fire') a.sample('fire_explosion', { vol: 0.5, pos: e });
    else if (el === 'ice') a.sample('ice_shatter', { vol: 0.5, pos: e });
    else if (el === 'thunder') a.sample('thunder', { vol: 0.5, rate: 1.3, pos: e });
    else a.sample('dark_spell', { vol: 0.45, rate: 0.8, pos: e });
  };
  SFX['cw_elem:pulse'] = () => {};
  SFX['inspect:elemental'] = (a) => {
    const t = a.ctx.currentTime;
    a.sample('magic_ring', { vol: 0.3, when: t + 0.2 });
    a.sample('fire_flash', { vol: 0.25, when: t + 1.15 });
    a.sample('freeze_fx', { vol: 0.25, when: t + 1.35 });
    a.sample('spark', { vol: 0.25, when: t + 1.55 });
    a.sample('harmony', { vol: 0.3, rate: 1.1, when: t + 2.3 });
    a.sample('angel', { vol: 0.4, when: t + 3.45 });
    a.sample('magic_smite', { vol: 0.4, when: t + 3.5 });
  };

  // 01 Espadas Almas (4.6 s): blue blade drawn with whispers, purple blade rings, the blades
  // cross with the chain rattling, the dead rise wailing, both blades snap back.
  SFX['inspect:souls'] = (a) => {
    const t = a.ctx.currentTime;
    a.sample('unsheath_2', { vol: 0.5, rate: 1.05, when: t + 0.1 });
    a.sample('whispers', { vol: 0.35, rate: 1.15, when: t + 0.25, rev: 0.6 });
    a.sample('unsheath_1', { vol: 0.45, rate: 0.9, when: t + 1.35 });
    a.sample('bowl', { vol: 0.3, rate: 1.6, when: t + 1.6, rev: 0.7 });
    a.sample('clash_1', { vol: 0.3, rate: 1.35, when: t + 2.55, rev: 0.5 });
    a.sample('chains', { vol: 0.45, rate: 1.1, when: t + 2.6 });
    a.sample('whisper_creepy', { vol: 0.45, rate: 0.95, when: t + 3.4, rev: 0.7 });
    a.sample('choir', { vol: 0.28, rate: 0.75, when: t + 3.45, rev: 0.8 });
    a.sample('swing_light', { vol: 0.4, rate: 1.1, when: t + 4.35 });
    a.sample('chain_heavy', { vol: 0.25, rate: 1.4, when: t + 4.45 });
  };
})(window.SO = window.SO || {});
