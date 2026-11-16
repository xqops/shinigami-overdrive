// Sound recipes for schools 1-10. Each ability layers its own recordings (CC0 bank, tools/sounds.json),
// pitched and timed for it, with synth underneath where it needs weight. Ultimates have a start,
// a loop that runs for their whole duration, and an end.
(function (SO) {
  'use strict';
  const SFX = SO.SFX;
  const at = (e) => (e && e.x != null ? { x: e.x, z: e.z } : null);
  const later = (a, s) => a.ctx.currentTime + s;

  // ======================= Espadas Almas =======================
  SFX.souls_1 = (a) => { a.sample('magic_cast', { vol: 0.6, rate: 1.35 }); a.sample('unsheath_2', { vol: 0.3, rate: 1.5 }); };
  SFX['souls_1:summon'] = (a) => { [0, 0.13, 0.26].forEach((d, i) => { a.metal(1400 + i * 300, 0.7, 0.05, { rev: 0.6, when: later(a, d) }); a.sample('unsheath_1', { vol: 0.18, rate: 1.6 + i * 0.15, when: later(a, d) }); }); };
  SFX['souls_1:launch'] = (a, e) => { a.sample('swing_light', { vol: 0.4, rate: 1.4, pos: at(e) }); a.sample('energy_slash', { vol: 0.25, rate: 1.7, pos: at(e) }); };
  SFX['souls_1:hit'] = (a, e) => { a.sample('slash_2', { vol: 0.4, rate: 1.35, pos: at(e) }); a.sample('flesh', { vol: 0.35, pos: at(e) }); };
  SFX.souls_2 = (a) => { a.sample('harmony', { vol: 0.35, rate: 1.3 }); for (let i = 0; i < 4; i++) a.sample('swing_light', { vol: 0.2, rate: 1.1 + i * 0.12, when: later(a, i * 0.09) }); };
  SFX['souls_2:strike'] = (a, e) => { if (!a.every('souls_2', 90)) return; a.sample('swing_light', { vol: 0.28, rate: 1.7, pos: at(e) }); a.sample('clash_3', { vol: 0.12, rate: 2.2, pos: at(e) }); };
  SFX['souls_2:parry'] = (a, e) => { a.sample('clash_2', { vol: 0.45, rate: 1.5, pos: at(e) }); };
  SFX.souls_3 = (a) => { a.sample('magic_ring', { vol: 0.45, rate: 0.85 }); a.sample('choir', { vol: 0.25, rate: 0.7 }); };
  SFX['souls_3:impact'] = (a, e) => {
    const big = e.big;
    a.sample('explosion_2', { vol: big ? 1 : 0.7, rate: big ? 0.7 : 1, pos: at(e), dist: true });
    a.sample('clash_1', { vol: 0.6, rate: big ? 0.45 : 0.6, rev: 0.7, pos: at(e) });
    a.sample('glass_slow', { vol: 0.45, rate: big ? 0.8 : 1.2, pos: at(e) });
    a.sample('boom_low', { vol: 0.8, pos: at(e) });
  };
  SFX['souls_ult:start'] = (a) => { a.sample('choir', { vol: 0.8, rate: 0.6, rev: 0.6, vary: 0 }); a.sample('glass_slow', { vol: 0.6, rate: 0.55 }); a.sample('bell', { vol: 0.5, rate: 0.9, rev: 0.8 }); };
  SFX['souls_ult:loop'] = (a) => [a.loop('glow_loop', { vol: 0.35, rate: 0.7 }), a.loop('hum_ship', { vol: 0.15, rate: 1.8 })];
  SFX['souls_ult:end'] = (a) => { a.sample('bell', { vol: 0.6, rate: 0.55, rev: 0.9 }); a.sample('charge', { vol: 0.4, rate: 0.8 }); };
  SFX['souls_ult:launch'] = (a, e) => { if (a.every('souls_ult_l', 70)) a.sample('throw_whip', { vol: 0.2, rate: 1.4, pos: at(e) }); };
  SFX['souls_ult:hit'] = (a, e) => { if (a.every('souls_ult_h', 60)) a.sample('slash', { vol: 0.22, rate: 1.5, pos: at(e) }); };

  // ======================= Teleporte =======================
  SFX.void_1 = () => {};
  SFX['void_1:step'] = (a) => { a.sample('teleport', { vol: 0.55, rate: 1.4 }); a.sample('glass_break', { vol: 0.25, rate: 1.7 }); a.sample('woosh_big', { vol: 0.35, rate: 1.5 }); };
  SFX.void_2 = () => {};
  SFX['void_2:swap'] = (a) => { a.sample('teleport', { vol: 0.6, rate: 0.8 }); a.sample('portal', { vol: 0.35, rate: 1.6 }); a.sample('glass_break', { vol: 0.4, rate: 0.9 }); };
  SFX['void_2:bonus'] = (a) => { a.sample('zap', { vol: 0.2, rate: 2 }); };
  SFX.void_3 = (a) => { a.sample('glass_slow', { vol: 0.7, rate: 1.1 }); a.sample('woosh_big', { vol: 0.6, rate: 0.9 }); a.sample('teleport', { vol: 0.4, rate: 1.1 }); };
  SFX['void_3:pass'] = (a, e) => { a.sample('glass_break', { vol: 0.25, rate: 2, pos: at(e) }); };
  SFX['void_ult:start'] = (a) => { a.sample('portal', { vol: 0.8, rate: 0.7 }); a.sample('whisper_creepy', { vol: 0.5, rate: 1.2 }); a.sample('glass_slow', { vol: 0.6, rate: 0.7 }); };
  SFX['void_ult:loop'] = (a) => [a.loop('hum_ship', { vol: 0.3, rate: 1.6 }), a.loop('whispers', { vol: 0.2, rate: 1.3 })];
  SFX['void_ult:end'] = (a) => { a.tone({ f0: 400, f1: 40, dur: 1.4, slide: 1.4, vol: 0.4, type: 'sine', rev: 0.6 }); };
  SFX['void_ult:burst'] = (a, e) => { a.sample('glass_break', { vol: 0.6, pos: at(e) }); a.sample('energy_blast', { vol: 0.5, rate: 1.3, pos: at(e) }); };
  SFX['void_ult:collapse'] = (a, e) => { a.sample('portal', { vol: 0.9, rate: 0.5, pos: at(e) }); a.sample('boom_low', { vol: 1, pos: at(e) }); a.sample('explosion_3', { vol: 0.7, rate: 0.7, pos: at(e) }); };
  SFX['ally:afterimage:allySpawn'] = (a, e) => { a.sample('teleport', { vol: 0.12, rate: 1.9, pos: at(e) }); };

  // ======================= Explosão Demoníaca =======================
  SFX.demon_1 = () => {};
  SFX['demon_1:slam'] = (a) => { a.sample('punch', { vol: 0.8, rate: 0.6 }); a.sample('explosion_1', { vol: 0.8 }); a.sample('rock', { vol: 0.6, rate: 0.9 }); a.sample('fire_flash', { vol: 0.5, rate: 0.8 }); a.sample('demon_growl', { vol: 0.25, rate: 1.3 }); };
  SFX.demon_2 = (a) => { a.sample('flamewind', { vol: 0.8, rate: 1.2 }); a.sample('fire_explosion', { vol: 0.4, rate: 1.5 }); };
  SFX['demon_2:end'] = (a, e) => { a.sample('fire_flash', { vol: 0.4, pos: at(e) }); };
  SFX['demon_2:hit'] = (a, e) => { if (a.every('demon_2', 80)) a.sample('flesh', { vol: 0.3, rate: 0.8, pos: at(e) }); };
  SFX['demon_3:mark'] = (a) => { a.sample('whisper_creepy', { vol: 0.35, rate: 1.5 }); a.sample('magic_strike', { vol: 0.4, rate: 0.7 }); };
  SFX.demon_3 = () => {};
  SFX['demon_3:boom'] = (a, e) => { a.sample('fire_explosion', { vol: 0.7, rate: 1 + (e.order || 0) * 0.07, pos: at(e) }); a.sample('explosion_3', { vol: 0.4, pos: at(e) }); };
  SFX['demon_ult:start'] = (a) => { a.sample('demon_awoken', { vol: 0.9 }); a.sample('earthquake', { vol: 0.6 }); a.sample('choir', { vol: 0.4, rate: 0.5, rev: 0.6 }); };
  SFX['demon_ult:loop'] = (a) => [a.loop('fire_roar', { vol: 0.4, rate: 0.8 }), a.loop('whispers', { vol: 0.25, rate: 0.6 })];
  SFX['demon_ult:end'] = () => {};
  SFX['demon_ult:nova'] = (a, e) => { a.sample('explosion_2', { vol: 1, rate: 0.75, pos: at(e), dist: true }); a.sample('boom_low', { vol: 1, pos: at(e) }); a.sample('beast_roar', { vol: 0.7, rate: 0.8 }); };
  SFX['demon_ult:boom'] = (a, e) => { a.sample('explosion_3', { vol: 0.55, rate: 0.85 + Math.random() * 0.3, pos: at(e), dist: true }); a.sample('fire_flash', { vol: 0.3, pos: at(e) }); };

  // ======================= Invocação de Demônios =======================
  SFX.summon_1 = (a) => { a.sample('dark_spell', { vol: 0.4, rate: 1.3 }); };
  SFX['ally:imp:allySpawn'] = (a, e) => { a.sample('mud_splat', { vol: 0.4, rate: 0.7, pos: at(e) }); a.sample('demon_growl', { vol: 0.3, rate: 1.6, pos: at(e) }); };
  SFX['ally:imp:allyAttack'] = (a, e) => { if (a.every('imp', 120)) a.sample('flesh', { vol: 0.3, rate: 1.3, pos: at(e) }); };
  SFX['ally:imp:allyEnd'] = (a, e) => { a.sample('fire_flash', { vol: 0.2, rate: 1.4, pos: at(e) }); };
  SFX.summon_2 = (a) => { a.sample('portal', { vol: 0.6, rate: 0.9 }); a.sample('chain_heavy', { vol: 0.5 }); a.sample('demon_awoken', { vol: 0.5, rate: 1.2 }); };
  SFX['ally:guardian:allyAttack'] = (a, e) => { a.sample('swing_heavy', { vol: 0.45, rate: 0.8, pos: at(e) }); a.sample('fire_flash', { vol: 0.3, pos: at(e) }); };
  SFX['ally:guardian:allyBlock'] = (a, e) => { a.sample('clash_2', { vol: 0.4, rate: 0.9, pos: at(e) }); };
  SFX['ally:guardian:allyEnd'] = (a, e) => { a.sample('flame_burst', { vol: 0.4, rate: 1.3, pos: at(e) }); };
  SFX.summon_3 = (a) => { a.sample('chains', { vol: 0.6 }); a.sample('magic_ring', { vol: 0.35, rate: 0.6 }); a.sample('dark_spell', { vol: 0.35, rate: 0.7 }); };
  SFX['summon_3:chain'] = (a, e) => { if (a.every('summon_3', 400)) a.sample('chains', { vol: 0.18, rate: 1.3, pos: at(e) }); };
  SFX['summon_ult:start'] = (a) => { a.sample('chain_heavy', { vol: 0.8 }); a.sample('portal', { vol: 0.8, rate: 0.5 }); a.sample('beast_roar', { vol: 0.6, rate: 0.8 }); a.sample('earthquake', { vol: 0.5 }); };
  SFX['summon_ult:loop'] = (a) => [a.loop('whispers', { vol: 0.3, rate: 0.7 }), a.loop('fire_roar', { vol: 0.25, rate: 0.6 })];
  SFX['summon_ult:end'] = () => {};
  SFX['summon_ult:emerge'] = (a, e) => { a.sample('demon_growl', { vol: 0.4, rate: 0.9 + Math.random() * 0.5, pos: at(e) }); };
  SFX['summon_ult:finale'] = (a, e) => { a.sample('explosion_2', { vol: 0.9, pos: at(e), dist: true }); a.sample('boom_low', { vol: 0.9, pos: at(e) }); a.sample('dragon_roar', { vol: 0.6, rate: 0.7, pos: at(e) }); };
  for (const k of ['warrior', 'flyer', 'commander']) {
    SFX['ally:' + k + ':allySpawn'] = (a, e) => { a.sample(k === 'commander' ? 'beast_roar' : 'demon_growl', { vol: k === 'commander' ? 0.6 : 0.25, rate: k === 'flyer' ? 1.8 : 1, pos: at(e) }); };
    SFX['ally:' + k + ':allyAttack'] = (a, e) => { if (a.every('troop', 110)) a.sample(k === 'commander' ? 'swing_heavy' : 'flesh', { vol: 0.3, rate: 1.1, pos: at(e) }); };
  }

  // ======================= Manipulação de Sangue =======================
  SFX.blood_1 = () => {};
  SFX['blood_1:lash'] = (a) => { a.sample('throw_whip', { vol: 0.7, rate: 0.85 }); a.sample('squish', { vol: 0.5 }); a.sample('gore', { vol: 0.4, rate: 1.2, when: later(a, 0.12) }); };
  SFX.blood_2 = (a) => { a.sample('splash', { vol: 0.4, rate: 1.4 }); a.sample('dark_spell', { vol: 0.3, rate: 1.6 }); };
  SFX['blood_2:launch'] = (a, e) => { a.sample('swing_light', { vol: 0.35, rate: 1.3, pos: at(e) }); a.sample('squish', { vol: 0.2, rate: 1.4, pos: at(e) }); };
  SFX['blood_2:hit'] = (a, e) => { a.sample('gore', { vol: 0.5, pos: at(e) }); a.sample('flesh', { vol: 0.35, pos: at(e) }); };
  SFX.blood_3 = (a) => { a.sample('splash_big', { vol: 0.5, rate: 0.8 }); a.sample('ice_crack', { vol: 0.4, rate: 1.4, when: later(a, 0.35) }); a.sample('gore', { vol: 0.3, rate: 0.8 }); };
  SFX['blood_3:shatter'] = (a, e) => { a.sample('glass_break', { vol: 0.5, rate: 0.8, pos: at(e) }); a.sample('gore', { vol: 0.4, pos: at(e) }); };
  SFX['blood_ult:start'] = (a) => { a.sample('heartbeat', { vol: 0.8, vary: 0 }); a.sample('splash_big', { vol: 0.6, rate: 0.6 }); a.sample('choir', { vol: 0.3, rate: 0.5, rev: 0.6 }); };
  SFX['blood_ult:loop'] = (a) => [a.loop('heartbeat', { vol: 0.45 }), a.loop('rain_storm', { vol: 0.2, rate: 0.7 })];
  SFX['blood_ult:end'] = (a) => { a.sample('splash_big', { vol: 1, rate: 0.55 }); a.sample('earthquake', { vol: 0.5, rate: 1.2 }); a.sample('gore', { vol: 0.6, rate: 0.7 }); };
  SFX['blood_ult:siphon'] = (a) => { if (a.every('siphon', 250)) a.sample('squish', { vol: 0.12, rate: 0.8 + Math.random() * 0.5 }); };
  SFX['blood_ult:hit'] = (a, e) => { if (a.every('bloodwave', 80)) a.sample('gore', { vol: 0.4, pos: at(e) }); };

  // ======================= Escudo de Energia =======================
  SFX.aegis_1 = (a) => { a.sample('forcefield', { vol: 0.6, rate: 1.2 }); for (let i = 0; i < 6; i++) a.sample('clash_3', { vol: 0.08, rate: 2.2 + i * 0.1, when: later(a, i * 0.04) }); };
  SFX['aegis_1:crack'] = (a) => { a.sample('glass_break', { vol: 0.3, rate: 2 }); };
  SFX['aegis_1:break'] = (a) => { a.sample('glass_slow', { vol: 0.6, rate: 1.3 }); };
  SFX.aegis_2 = (a) => { a.sample('forcefield', { vol: 0.45, rate: 1.6 }); a.sample('harmony', { vol: 0.25, rate: 1.5 }); };
  SFX['aegis_2:reflect'] = (a, e) => { a.sample('clash_1', { vol: 0.6, rate: e.perfect ? 1.5 : 1.25 }); if (e.perfect) a.sample('bell', { vol: 0.5, rate: 1.5, rev: 0.6 }); };
  SFX.aegis_3 = (a) => { a.sample('magic_ring', { vol: 0.45, rate: 1.1 }); a.sample('forcefield', { vol: 0.6, rate: 0.8 }); };
  SFX['aegis_3:hit'] = (a) => { if (a.every('dome', 80)) a.sample('clash_2', { vol: 0.3, rate: 1.6 }); };
  SFX['aegis_3:break'] = (a, e) => { a.sample('glass_slow', { vol: 0.7, pos: at(e) }); };
  SFX['aegis_ult:start'] = (a) => { a.sample('forcefield', { vol: 0.9, rate: 0.6 }); [0, 0.15, 0.3].forEach((d, i) => a.sample('clash_3', { vol: 0.25, rate: 1.2 + i * 0.2, when: later(a, d) })); a.sample('choir', { vol: 0.35, rate: 0.9 }); };
  SFX['aegis_ult:loop'] = (a) => [a.loop('hum_ship', { vol: 0.35, rate: 1.2 }), a.loop('glow_loop', { vol: 0.15, rate: 1.4 })];
  SFX['aegis_ult:end'] = () => {};
  SFX['aegis_ult:burst'] = (a) => { a.sample('clash_1', { vol: 0.4, rate: 0.9 }); a.sample('energy_blast', { vol: 0.35, rate: 1.4 }); };
  SFX['aegis_ult:release'] = (a) => { a.sample('energy_blast', { vol: 0.9, rate: 0.8 }); a.sample('explosion_3', { vol: 0.6 }); a.sample('glass_slow', { vol: 0.8, rate: 0.8 }); };

  // ======================= Meteoro =======================
  SFX.meteor_1 = (a) => { a.sample('fire_whoosh', { vol: 0.4, rate: 1.4 }); };
  SFX['meteor_1:mark'] = (a, e) => { a.sample('magic_strike', { vol: 0.2, rate: 1.2, pos: at(e) }); };
  SFX['meteor_1:launch'] = (a, e) => { a.sample('fire_flash', { vol: 0.2, rate: 0.7, pos: at(e) }); };
  SFX['meteor_1:boom'] = (a, e) => { a.sample('explosion_3', { vol: 0.6, rate: 1.2, pos: at(e), dist: true }); a.sample('rock', { vol: 0.35, pos: at(e) }); };
  SFX.meteor_2 = (a) => { a.sample('fire_whoosh', { vol: 0.6, rate: 0.8 }); a.sample('flamewind', { vol: 0.45, rate: 0.7 }); };
  SFX['meteor_2:boom'] = (a, e) => { a.sample('explosion_1', { vol: 0.8, pos: at(e), dist: true }); a.sample('rock_1', { vol: 0.5, pos: at(e) }); };
  SFX['meteor_2:frag:end'] = (a, e) => { if (a.every('frag', 60)) a.sample('fire_flash', { vol: 0.12, rate: 2, pos: at(e) }); };
  SFX.meteor_3 = (a) => { a.sample('fire_roar', { vol: 0.5, rate: 0.5 }); a.sample('earthquake', { vol: 0.3, rate: 1.2 }); };
  SFX['meteor_3:impact'] = (a, e) => { a.sample('explosion_2', { vol: 1, rate: e.big ? 0.6 : 0.9, pos: at(e), dist: true }); a.sample('boom_low', { vol: 1, pos: at(e) }); a.sample('debris_big', { vol: 0.7, pos: at(e), when: later(a, 0.12) }); };
  SFX['meteor_ult:start'] = (a) => { a.sample('earthquake', { vol: 0.7 }); a.sample('fire_roar', { vol: 0.6, rate: 0.6 }); };
  SFX['meteor_ult:loop'] = (a) => [a.loop('fire_roar', { vol: 0.35, rate: 0.7 }), a.loop('rain_storm', { vol: 0.2, rate: 0.6 })];
  SFX['meteor_ult:end'] = (a) => { a.sample('fire_whoosh', { vol: 0.8, rate: 0.5 }); };
  SFX['meteor_ult:boom'] = (a, e) => { if (a.every('meteor_ult', 90)) { a.sample('explosion_3', { vol: 0.45, rate: 0.8 + Math.random() * 0.4, pos: at(e), dist: true }); a.sample('rock', { vol: 0.25, pos: at(e) }); } };

  // ======================= Corpo de Fogo =======================
  SFX.fire_1 = (a) => { a.sample('flame_burst', { vol: 0.6, rate: 1.3 }); a.sample('fire_loop', { vol: 0.25, rate: 1.25 }); };
  SFX.fire_2 = (a) => { a.sample('flamewind', { vol: 0.7, rate: 1.6 }); a.sample('woosh_big', { vol: 0.6 }); a.sample('fire_flash', { vol: 0.5 }); };
  SFX.fire_3 = (a) => { a.sample('charge', { vol: 0.45, rate: 1.6 }); a.sample('fire_loop', { vol: 0.3, rate: 1.6 }); };
  SFX['fire_3:burst'] = (a) => { a.sample('fire_explosion', { vol: 0.9 }); a.sample('explosion_1', { vol: 0.6 }); a.sample('boom_low', { vol: 0.7 }); };
  SFX['fire_ult:start'] = (a) => { a.sample('flame_burst', { vol: 0.8, rate: 0.7 }); a.sample('dragon_roar', { vol: 0.5, rate: 1.7 }); a.sample('choir', { vol: 0.3, rate: 1.2 }); };
  SFX['fire_ult:loop'] = (a) => [a.loop('fire_roar', { vol: 0.32, rate: 1.1 }), a.loop('fire_loop', { vol: 0.2 })];
  SFX['fire_ult:end'] = () => {};
  SFX['fire_ult:rise'] = (a) => { a.sample('woosh_big', { vol: 0.6, rate: 0.8 }); a.sample('flame_burst', { vol: 0.5 }); };
  SFX['fire_ult:dive'] = (a) => { a.sample('explosion_2', { vol: 1, rate: 0.9 }); a.sample('fire_explosion', { vol: 0.8 }); a.sample('boom_low', { vol: 1 }); a.sample('dragon_roar', { vol: 0.4, rate: 1.9 }); };
  SFX['fire_ult:close'] = (a) => { a.sample('fire_explosion', { vol: 0.8, rate: 0.85 }); a.sample('flame_burst', { vol: 0.5, rate: 0.8 }); };

  // ======================= Raio de Plasma =======================
  SFX.plasma_1 = (a) => { a.sample('laser_bolt', { vol: 0.6 }); a.sample('zap', { vol: 0.25, rate: 1.4 }); };
  SFX['plasma_1:hit'] = (a, e) => { a.sample('zap', { vol: 0.4, rate: 0.9, pos: at(e) }); };
  SFX.plasma_2 = () => {};
  SFX['plasma_2:arc'] = (a) => { a.sample('shock_zap', { vol: 0.6 }); a.sample('zap', { vol: 0.4, rate: 0.8 }); a.sample('electric_loop', { vol: 0.2, rate: 1.5 }); };
  SFX.plasma_3 = (a) => { a.sample('charge', { vol: 0.4, rate: 2 }); a.sample('beam_heavy', { vol: 0.7, when: later(a, 0.15) }); };
  SFX['plasma_ult:start'] = (a) => { a.sample('laser_cannon', { vol: 0.8, rate: 0.7 }); a.sample('energy_blast', { vol: 0.5, rate: 0.6 }); };
  SFX['plasma_ult:loop'] = (a) => [a.loop('beam_loop', { vol: 0.45, rate: 0.7 }), a.loop('high_voltage', { vol: 0.25, rate: 0.8 })];
  SFX['plasma_ult:end'] = () => {};
  SFX['plasma_ult:blast'] = (a) => { a.sample('explosion_2', { vol: 0.9 }); a.sample('laser_cannon', { vol: 0.6, rate: 0.5 }); a.sample('boom_low', { vol: 0.9 }); };
  SFX['status:plasma:shock'] = (a, e) => { if (a.every('pshock', 150)) a.sample('spark', { vol: 0.25, rate: 0.8 + Math.random() * 0.5, pos: at(e) }); };

  // ======================= Congelamento =======================
  SFX.ice_1 = (a) => { a.sample('freeze_fx', { vol: 0.35, rate: 1.6 }); a.sample('throw_whip', { vol: 0.5 }); };
  SFX['ice_1:hit'] = (a, e) => { a.sample('ice_shatter', { vol: 0.5, pos: at(e) }); };
  SFX['ice_1:shatter'] = (a, e) => { a.sample('glass_break', { vol: 0.6, pos: at(e) }); a.sample('icicles', { vol: 0.5, pos: at(e) }); a.sample('ice_break', { vol: 0.4, rate: 1.2, pos: at(e) }); };
  SFX.ice_2 = (a) => { a.sample('ice_crack', { vol: 0.7, rate: 1.3 }); a.sample('wind_gust', { vol: 0.35, rate: 1.5 }); a.sample('freeze_fx', { vol: 0.4 }); };
  SFX['status:ice_2:freeze'] = (a, e) => { if (a.every('ice2f', 80)) a.sample('icicles', { vol: 0.25, rate: 0.9 + Math.random() * 0.3, pos: at(e) }); };
  SFX.ice_3 = (a) => { a.sample('freeze_fx', { vol: 0.6 }); a.sample('ice_crack', { vol: 0.5, rate: 0.9, when: later(a, 0.2) }); };
  SFX['ice_3:burst'] = (a, e) => { a.sample('ice_break', { vol: 0.7, pos: at(e) }); a.sample('glass_slow', { vol: 0.5, rate: 1.2, pos: at(e) }); };
  SFX['ice_ult:start'] = (a) => { a.sample('freeze_fx', { vol: 0.9, rate: 0.6 }); a.sample('wind_gust', { vol: 0.6, rate: 0.7 }); a.sample('ice_crack', { vol: 0.6 }); a.sample('choir', { vol: 0.2, rate: 1.3 }); };
  SFX['ice_ult:loop'] = (a) => [a.loop('wind_loop', { vol: 0.4, rate: 0.7 })];
  SFX['ice_ult:end'] = () => {};
  SFX['ice_ult:shatter'] = (a, e) => { if (a.every('iceult', 70)) { a.sample('ice_shatter', { vol: 0.5, rate: 0.8 + Math.random() * 0.4, pos: at(e) }); a.sample('icicles', { vol: 0.3, pos: at(e) }); } };
  SFX['ice_ult:thaw'] = (a) => { a.sample('ice_break', { vol: 0.8, rate: 0.8 }); a.sample('glass_slow', { vol: 0.6, rate: 0.9 }); };
})(window.SO = window.SO || {});
