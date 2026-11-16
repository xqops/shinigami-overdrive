// Sound recipes for schools 11-20 (see schools-a.js).
(function (SO) {
  'use strict';
  const SFX = SO.SFX;
  const at = (e) => (e && e.x != null ? { x: e.x, z: e.z } : null);
  const later = (a, s) => a.ctx.currentTime + s;

  // ======================= Gravidade =======================
  SFX.gravity_1 = (a) => { a.sample('portal', { vol: 0.4, rate: 2 }); a.tone({ f0: 420, f1: 55, dur: 0.7, slide: 0.7, vol: 0.3, type: 'sine', rev: 0.4 }); a.sample('woosh_big', { vol: 0.3, rate: 0.7, when: later(a, 0.2) }); };
  SFX.gravity_2 = (a) => { a.sample('magic_ring', { vol: 0.45, rate: 0.5 }); a.sample('earthquake', { vol: 0.2, rate: 1.4 }); a.tone({ f0: 55, f1: 50, dur: 2, vol: 0.25, type: 'sine', attack: 0.4 }); };
  SFX['status:gravity_2:float'] = (a, e) => { if (a.every('float', 300)) a.tone({ f0: 300, f1: 600, dur: 0.4, vol: 0.05, type: 'sine', pos: at(e), rev: 0.5 }); };
  SFX.gravity_3 = (a) => { a.sample('magic_ring', { vol: 0.2, rate: 1.4 }); };
  SFX['gravity_3:crush'] = (a, e) => { if (!a.every('crush', 50)) return; a.sample('boom_low', { vol: 0.7, rate: 1.4, pos: at(e) }); a.sample('rock', { vol: 0.5, pos: at(e) }); a.sample('punch', { vol: 0.5, rate: 0.5, pos: at(e) }); };
  SFX['gravity_ult:start'] = (a) => { a.sample('portal', { vol: 0.8, rate: 0.4 }); a.sample('boom_low', { vol: 0.7, rate: 0.6 }); a.sample('choir', { vol: 0.25, rate: 0.4, rev: 0.7 }); };
  SFX['gravity_ult:loop'] = (a) => [a.loop('hum_ship', { vol: 0.45, rate: 0.45 }), a.loop('wind_loop', { vol: 0.25, rate: 0.5 })];
  SFX['gravity_ult:end'] = () => {};
  SFX['gravity_ult:eat'] = (a) => { if (a.every('eat', 100)) a.sample('glass_break', { vol: 0.25, rate: 0.6 }); };
  SFX['gravity_ult:burst'] = (a, e) => { a.sample('explosion_2', { vol: 1, rate: 0.8, pos: at(e), dist: true }); a.sample('boom_low', { vol: 1, pos: at(e) }); a.sample('glass_slow', { vol: 0.6, rate: 0.6, pos: at(e) }); };

  // ======================= Rajada de Balas =======================
  SFX.bullets_1 = () => {};
  SFX['bullets_1:shot'] = (a) => { a.sample('gunshot', { vol: 0.45, rate: 1.3 }); a.sample('laser_bolt', { vol: 0.25, rate: 0.8 }); };
  SFX['bullets_1:hit'] = (a, e) => { if (a.every('b1hit', 50)) a.sample('zap', { vol: 0.15, rate: 1.8, pos: at(e) }); };
  SFX.bullets_2 = (a) => { a.sample('charge', { vol: 0.25, rate: 2.4 }); };
  SFX['bullets_2:launch'] = (a, e) => { a.sample('pistol', { vol: 0.35, rate: 1.4, pos: at(e) }); a.sample('laser_bolt', { vol: 0.2, rate: 1.2, pos: at(e) }); };
  SFX['bullets_2:hit'] = (a, e) => { a.sample('zap', { vol: 0.25, rate: 1.6, pos: at(e) }); a.sample('flesh', { vol: 0.25, pos: at(e) }); };
  SFX.bullets_3 = (a) => { a.sample('charge', { vol: 0.3, rate: 2.4 }); a.sample('mg_loop', { vol: 0.6, when: later(a, 0.08) }); a.sample('shells', { vol: 0.35, when: later(a, 0.5) }); a.sample('shells', { vol: 0.3, rate: 1.1, when: later(a, 1.8) }); };
  SFX['bullets_3:hit'] = (a, e) => { if (a.every('b3hit', 90)) a.sample('zap', { vol: 0.12, rate: 2, pos: at(e) }); };
  SFX['bullets_ult:start'] = (a) => { a.sample('magic_ring', { vol: 0.5, rate: 1.4 }); a.sample('gunshot', { vol: 0.6, rate: 0.7 }); };
  SFX['bullets_ult:loop'] = (a) => [a.loop('mg_loop', { vol: 0.35, rate: 0.9 }), a.loop('rain_storm', { vol: 0.25, rate: 1.4 })];
  SFX['bullets_ult:end'] = (a) => { a.sample('shells', { vol: 0.5 }); };
  SFX['bullets_ult:end:hit'] = () => {};
  SFX['bullets_ult:hit'] = (a, e) => { if (a.every('rain', 90)) a.sample('mg_shot', { vol: 0.1, rate: 0.9 + Math.random() * 0.4, pos: at(e) }); };

  // ======================= Lança de Energia =======================
  SFX.spear_1 = (a) => { a.sample('energy_slash', { vol: 0.5, rate: 0.8 }); a.sample('throw_whip', { vol: 0.5, rate: 0.7 }); };
  SFX['spear_1:hit'] = (a, e) => { a.sample('flesh', { vol: 0.4, pos: at(e) }); };
  SFX['spear_1:end'] = (a, e) => { a.sample('clash_3', { vol: 0.35, rate: 1.2, pos: at(e) }); };
  SFX.spear_2 = () => {};
  SFX['spear_2:charge'] = (a) => { a.sample('woosh_big', { vol: 0.7, rate: 1.3 }); a.sample('energy_blast', { vol: 0.35, rate: 1.8 }); a.sample('flesh', { vol: 0.35, rate: 0.8, when: later(a, 0.1) }); };
  SFX.spear_3 = (a) => { a.sample('throw_whip', { vol: 0.5 }); a.sample('energy_slash', { vol: 0.35, rate: 1.1 }); };
  SFX['spear_3:split'] = (a, e) => { a.sample('glass_break', { vol: 0.3, rate: 1.8, pos: at(e) }); for (let i = 0; i < 5; i++) a.sample('laser_bolt', { vol: 0.15, rate: 1 + i * 0.12, pos: at(e), when: later(a, i * 0.03) }); };
  SFX['spear_3:shard:hit'] = (a, e) => { a.sample('flesh', { vol: 0.25, rate: 1.2, pos: at(e) }); };
  SFX['spear_ult:start'] = (a) => { a.sample('magic_ring', { vol: 0.6, rate: 1.6 }); a.sample('charge', { vol: 0.5, rate: 1.3 }); };
  SFX['spear_ult:strike'] = (a) => { a.sample('laser_cannon', { vol: 0.9, rate: 1.2 }); a.sample('energy_blast', { vol: 0.7 }); a.sample('boom_low', { vol: 0.8 }); a.sample('woosh_big', { vol: 0.7, rate: 0.7 }); };
  SFX['spear_ult:loop'] = (a) => [a.loop('electric_loop', { vol: 0.18, rate: 0.6 })];
  SFX['spear_ult:end'] = (a) => { a.sample('energy_blast', { vol: 0.3, rate: 0.5 }); };

  // ======================= Clones Sombrios =======================
  SFX.shadow_1 = (a) => { a.sample('whisper_creepy', { vol: 0.3, rate: 1.6 }); };
  SFX['shadow_1:echo'] = (a, e) => { a.sample('swing_light', { vol: 0.35, rate: 0.7, pos: at(e) }); a.sample('slash', { vol: 0.35, rate: 0.8, pos: at(e) }); };
  SFX.shadow_2 = (a) => { a.sample('teleport', { vol: 0.4, rate: 0.6 }); a.sample('whisper_creepy', { vol: 0.3, rate: 1.1 }); };
  SFX['ally:clone:allySpawn'] = (a, e) => { if (a.every('clonesp', 60)) a.sample('mud_splat', { vol: 0.3, rate: 0.6, pos: at(e) }); };
  SFX['ally:clone:allyAttack'] = (a, e) => { if (a.every('clonea', 100)) a.sample('swing_light', { vol: 0.2, rate: 0.75, pos: at(e) }); };
  SFX.shadow_3 = (a) => { a.sample('whisper_creepy', { vol: 0.35, rate: 0.8 }); };
  SFX['shadow_3:burst'] = (a, e) => { a.sample('splash', { vol: 0.5, rate: 0.7, pos: at(e) }); a.sample('explosion_3', { vol: 0.5, rate: 0.7, pos: at(e) }); a.sample('squish', { vol: 0.3, pos: at(e) }); };
  SFX['shadow_ult:start'] = (a) => { a.sample('whispers', { vol: 0.6, rate: 0.8 }); a.sample('demon_awoken', { vol: 0.35, rate: 1.5 }); a.sample('earthquake', { vol: 0.2 }); };
  SFX['shadow_ult:loop'] = (a) => [a.loop('whispers', { vol: 0.28, rate: 0.7 }), a.loop('heartbeat', { vol: 0.25, rate: 0.9 })];
  SFX['shadow_ult:end'] = () => {};
  SFX['shadow_ult:slash'] = (a, e) => { if (a.every('shade', 70)) a.sample('swing_light', { vol: 0.18, rate: 0.75 + Math.random() * 0.2, pos: at(e) }); };
  SFX['shadow_ult:charge'] = (a) => { a.sample('woosh_big', { vol: 0.8, rate: 0.6 }); for (let i = 0; i < 4; i++) a.sample('swing_heavy', { vol: 0.3, rate: 0.8 + i * 0.1, when: later(a, i * 0.05) }); };
  SFX['shadow_ult:merge'] = (a) => { if (a.every('merge', 120)) a.sample('teleport', { vol: 0.18, rate: 0.5 }); };

  // ======================= Vento Cortante =======================
  SFX.wind_1 = (a) => { a.sample('woosh_big', { vol: 0.55, rate: 1.5 }); a.sample('swing_light', { vol: 0.35, rate: 1.2 }); };
  SFX['wind_1:hit'] = (a, e) => { a.sample('slash', { vol: 0.3, rate: 1.5, pos: at(e) }); };
  SFX.wind_2 = (a) => { a.sample('wind_gust', { vol: 0.6, rate: 1.2 }); a.sample('wind_whip', { vol: 0.35, rate: 1.1 }); };
  SFX.wind_3 = (a) => { [0, 0.07, 0.14].forEach((d, i) => a.sample('throw_whip', { vol: 0.5, rate: 0.9 + i * 0.15, when: later(a, d) })); a.sample('swing_light', { vol: 0.3, rate: 1.3 }); };
  SFX['wind_3:hit'] = (a, e) => { a.sample('slash', { vol: 0.3, rate: 1.3, pos: at(e) }); };
  SFX['wind_ult:start'] = (a) => { a.sample('wind_gust', { vol: 0.8, rate: 0.6 }); a.sample('woosh_big', { vol: 0.6, rate: 0.5 }); a.sample('earthquake', { vol: 0.2, rate: 1.5 }); };
  SFX['wind_ult:loop'] = (a) => [a.loop('wind_loop', { vol: 0.55 }), a.loop('wind_whip', { vol: 0.3, rate: 0.8 })];
  SFX['wind_ult:end'] = () => {};
  SFX['wind_ult:fling'] = (a) => { a.sample('woosh_big', { vol: 0.9, rate: 0.6 }); a.sample('boom_low', { vol: 0.6 }); a.sample('wind_gust', { vol: 0.6, rate: 1.4 }); };

  // ======================= Regeneração =======================
  SFX.regen_1 = () => {};
  SFX['regen_1:wave'] = (a) => { a.sample('heal_rpg', { vol: 0.6 }); a.sample('harmony', { vol: 0.3, rate: 1.2 }); };
  SFX.regen_2 = (a) => { a.sample('heal_pop', { vol: 0.4, rate: 0.7 }); a.sample('bowl', { vol: 0.35, rate: 1.5 }); };
  SFX['status:regen_2:drain'] = (a, e) => { a.sample('harmony', { vol: 0.3, rate: 0.8, pos: at(e) }); a.sample('heartbeat', { vol: 0.2, rate: 1.3 }); };
  SFX.regen_3 = (a) => { a.sample('bowl', { vol: 0.5 }); a.sample('heal_pop', { vol: 0.35, rate: 1.2 }); };
  SFX['regen_ult:start'] = (a) => { a.sample('angel', { vol: 0.8 }); a.sample('choir', { vol: 0.5, rate: 1.1, rev: 0.7 }); a.sample('bell', { vol: 0.45, rate: 1.3, rev: 0.8 }); };
  SFX['regen_ult:loop'] = (a) => [a.loop('glow_loop', { vol: 0.4 }), a.loop('heartbeat', { vol: 0.2, rate: 0.85 })];
  SFX['regen_ult:end'] = () => {};
  SFX['regen_ult:pulse'] = (a) => { a.sample('energy_blast', { vol: 0.4, rate: 1.6 }); a.sample('harmony', { vol: 0.35, rate: 1.4 }); };
  SFX['regen_ult:seal'] = (a) => { a.sample('glass_slow', { vol: 0.45, rate: 1.5 }); a.sample('bell', { vol: 0.5, rate: 1.1, rev: 0.7 }); };

  // ======================= Trovão =======================
  SFX.thunder_1 = () => {};
  SFX['thunder_1:chain'] = (a) => { a.sample('shock_zap', { vol: 0.7 }); a.sample('thunder', { vol: 0.4, rate: 1.4 }); a.sample('zap', { vol: 0.4, rate: 0.9 }); };
  SFX['status:thunder:shock'] = (a, e) => { if (a.every('tshock', 160)) a.sample('spark', { vol: 0.3, rate: 0.7 + Math.random() * 0.6, pos: at(e) }); };
  SFX.thunder_2 = () => {};
  SFX['thunder_2:takeoff'] = (a) => { a.sample('zap', { vol: 0.6, rate: 0.8 }); a.sample('boom_low', { vol: 0.5, rate: 1.6 }); a.sample('woosh_big', { vol: 0.4, rate: 1.2 }); };
  SFX['thunder_2:land'] = (a) => { a.sample('thunder_1', { vol: 0.5, rate: 1.3 }); a.sample('explosion_3', { vol: 0.5, rate: 1.4 }); a.sample('shock_zap', { vol: 0.4 }); };
  SFX.thunder_3 = (a) => { a.sample('electric_loop', { vol: 0.25, rate: 0.7 }); a.sample('earthquake', { vol: 0.25, rate: 1.6 }); };
  SFX['thunder_3:strike'] = (a, e) => { a.sample('thunder_2', { vol: 1, rate: e.big ? 0.8 : 1, pos: at(e), dist: true }); a.sample('boom_low', { vol: 0.9, pos: at(e) }); a.sample('shock_zap', { vol: 0.5, pos: at(e) }); };
  SFX['thunder_ult:start'] = (a) => { a.sample('thunder', { vol: 0.9, rate: 0.85 }); a.sample('high_voltage', { vol: 0.4, rate: 1.2 }); };
  SFX['thunder_ult:loop'] = (a) => [a.loop('rain_storm', { vol: 0.5 }), a.loop('electric_loop', { vol: 0.15, rate: 0.8 })];
  SFX['thunder_ult:end'] = () => {};
  SFX['thunder_ult:bolt'] = (a, e) => { if (a.every('tbolt', 120)) { a.sample('thunder', { vol: 0.45, rate: 0.9 + Math.random() * 0.4, pos: at(e) }); a.sample('zap', { vol: 0.3, pos: at(e) }); } };

  // ======================= Escuridão =======================
  SFX.dark_1 = (a) => { a.sample('whispers', { vol: 0.3, rate: 1.2 }); a.sample('dark_spell', { vol: 0.4, rate: 0.8 }); };
  SFX.dark_2 = () => {};
  SFX['dark_2:pulse'] = (a) => { a.sample('boom_low', { vol: 0.8, rate: 0.6 }); a.sample('whisper_creepy', { vol: 0.5 }); a.tone({ f0: 80, f1: 30, dur: 1.4, vol: 0.4, type: 'sine', rev: 0.6 }); };
  SFX.dark_3 = (a) => { a.sample('dark_spell', { vol: 0.5, rate: 0.6 }); a.sample('whisper_creepy', { vol: 0.4, rate: 0.7 }); };
  SFX['status:dark_3:drain'] = (a, e) => { a.sample('portal', { vol: 0.3, rate: 1.8, pos: at(e) }); a.sample('heartbeat', { vol: 0.35, rate: 0.8 }); };
  SFX['dark_ult:start'] = (a) => { a.sample('heartbeat', { vol: 0.8, rate: 0.8 }); a.sample('boom_low', { vol: 0.8, rate: 0.5 }); a.sample('choir', { vol: 0.3, rate: 0.4, rev: 0.8 }); };
  SFX['dark_ult:loop'] = (a) => [a.loop('whispers', { vol: 0.4, rate: 0.8 }), a.loop('heartbeat', { vol: 0.4, rate: 0.75 })];
  SFX['dark_ult:end'] = () => {};
  SFX['dark_ult:dawn'] = (a) => { a.sample('bell', { vol: 0.5, rate: 0.8, rev: 0.8 }); a.sample('angel', { vol: 0.3, rate: 0.8 }); };

  // ======================= Lâminas do Caos =======================
  SFX.chaos_1 = (a) => { a.sample('magic_strike', { vol: 0.4, rate: 1.3 }); for (let i = 0; i < 3; i++) a.sample('swing_light', { vol: 0.25, rate: 1.4 + i * 0.1, when: later(a, i * 0.08) }); };
  SFX.chaos_2 = (a) => { a.sample('throw_swing', { vol: 0.6 }); a.sample('swing_heavy', { vol: 0.45, rate: 1.3 }); a.tone({ f0: 300, f1: 900, dur: 0.5, vol: 0.06, type: 'sawtooth', filter: 1500, rev: 0.3 }); };
  SFX.chaos_3 = (a) => { for (let i = 0; i < 6; i++) a.sample('swing_light', { vol: 0.22, rate: 1.1 + i * 0.12, when: later(a, i * 0.11) }); };
  SFX['chaos_3:converge'] = (a, e) => { a.sample('clash_1', { vol: 0.6, rate: 1.4, pos: at(e) }); a.sample('slash', { vol: 0.5, pos: at(e) }); a.sample('flesh', { vol: 0.4, pos: at(e) }); };
  SFX['chaos_ult:start'] = (a) => { a.sample('magic_ring', { vol: 0.5, rate: 1.8 }); a.sample('clash_2', { vol: 0.4, rate: 0.8 }); a.sample('harmony', { vol: 0.3, rate: 2 }); };
  SFX['chaos_ult:loop'] = (a) => [a.loop('wind_whip', { vol: 0.25, rate: 1.6 }), a.loop('glow_loop', { vol: 0.15, rate: 1.8 })];
  SFX['chaos_ult:end'] = (a) => { a.sample('swing_heavy', { vol: 0.6, rate: 1.2 }); };
  SFX['chaos_ult:dart'] = (a, e) => { if (a.every('cdart', 90)) a.sample('swing_light', { vol: 0.15, rate: 1.8, pos: at(e) }); };
  SFX['chaos_ult:form'] = (a) => { a.sample('clash_3', { vol: 0.2, rate: 1.8 }); };
  SFX['chaos_ult:hit'] = (a, e) => { if (a.every('chit', 50)) a.sample('slash', { vol: 0.2, rate: 1.6, pos: at(e) }); };

  // ======================= Domínio Elemental =======================
  SFX.elemental_1 = () => {};
  SFX['elemental_1:fuse'] = (a, e) => {
    if (e.variant === 'steam') { a.sample('fire_flash', { vol: 0.4 }); a.sample('freeze_fx', { vol: 0.3, rate: 2 }); }
    else if (e.variant === 'plasma') { a.sample('fire_flash', { vol: 0.4 }); a.sample('zap', { vol: 0.4 }); }
    else { a.sample('freeze_fx', { vol: 0.35, rate: 1.6 }); a.sample('zap', { vol: 0.35, rate: 1.3 }); }
  };
  SFX['elemental_1:launch'] = (a) => { a.sample('energy_slash', { vol: 0.3, rate: 1.2 }); };
  SFX['elemental_1:boom'] = (a, e) => { a.noise({ f: 6000, f1: 2500, dur: 1.2, vol: 0.25, ftype: 'highpass', pos: at(e) }); a.sample('splash', { vol: 0.35, rate: 1.8, pos: at(e) }); };
  SFX['elemental_1:frostArc'] = (a) => { a.sample('shock_zap', { vol: 0.4 }); a.sample('ice_shatter', { vol: 0.4 }); };
  SFX['reaction:steam'] = (a, e) => { a.noise({ f: 5000, f1: 2000, dur: 0.8, vol: 0.2, ftype: 'highpass', pos: at(e) }); a.sample('fire_flash', { vol: 0.25, pos: at(e) }); };
  SFX.elemental_2 = (a) => { a.sample('harmony', { vol: 0.4 }); a.sample('magic_cast', { vol: 0.35, rate: 1.5 }); };
  SFX['elemental_2:shot'] = (a, e) => {
    const s = { fire: ['fire_flash', 1], ice: ['ice_shatter', 1.5], thunder: ['zap', 1], arcane: ['magic_strike', 1.4] }[e.el];
    if (s) a.sample(s[0], { vol: 0.35, rate: s[1], pos: at(e) });
  };
  SFX.elemental_3 = () => {};
  SFX['elemental_3:stage'] = (a, e) => {
    if (e.stage === 0) a.sample('fire_flash', { vol: 0.5, pos: at(e) });
    else if (e.stage === 1) a.sample('freeze_fx', { vol: 0.45, rate: 1.8, pos: at(e) });
    else { a.sample('explosion_3', { vol: 0.7, pos: at(e) }); a.sample('zap', { vol: 0.4, pos: at(e) }); a.sample('magic_smite', { vol: 0.5, pos: at(e) }); }
  };
  SFX['elemental_ult:start'] = (a) => { a.sample('magic_ring', { vol: 0.6 }); a.sample('choir', { vol: 0.5, rate: 1.0 }); a.sample('bell', { vol: 0.4, rate: 1.2 }); a.sample('harmony', { vol: 0.35 }); };
  SFX['elemental_ult:loop'] = (a) => [a.loop('glow_loop', { vol: 0.35, rate: 0.8 }), a.loop('wind_loop', { vol: 0.18, rate: 1.2 })];
  SFX['elemental_ult:end'] = () => {};
  SFX['elemental_ult:icePillar'] = (a, e) => { a.sample('ice_crack', { vol: 0.45, rate: 1.3, pos: at(e) }); a.sample('ice_break', { vol: 0.35, pos: at(e) }); };
  SFX['elemental_ult:bolt'] = (a) => { a.sample('thunder', { vol: 0.45, rate: 1.3 }); };
  SFX['elemental_ult:arcane'] = (a, e) => { a.sample('magic_smite', { vol: 0.5, rate: 0.8, pos: at(e) }); };
  SFX['elemental_ult:fire:boom'] = (a, e) => { a.sample('fire_explosion', { vol: 0.6, pos: at(e), dist: true }); };
  SFX['elemental_ult:nova'] = (a, e) => { a.sample('explosion_2', { vol: 1, pos: at(e), dist: true }); a.sample('boom_low', { vol: 1, pos: at(e) }); a.sample('choir', { vol: 0.5, rate: 1.5 }); a.sample('bell', { vol: 0.5, rate: 0.9, rev: 0.8 }); };
})(window.SO = window.SO || {});
