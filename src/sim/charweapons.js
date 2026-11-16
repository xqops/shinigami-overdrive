// Character weapons (pure data + specials, sim side). Each school's character carries its own
// weapon in slot 1: a three-hit basic combo on the left button and a heavy attack on the right.
// Swing defs use the same fields as SO.WEAPONS combos (anim, dur, hit window, range, arc, dmg,
// push, launch, lunge, stop, roll, stun, cancel, rehit, spin, thrust, heavy). A def may name a
// `special` in SO.CharSpecials, run once when its hit window opens (waves, blasts, pulls...).
(function (SO) {
  'use strict';

  const S = (anim, dur, hit, range, arc, dmg, o) => Object.assign({ anim, dur, hit, range, arc, dmg, push: 3, lunge: 4, stop: 0.04, roll: 0, stun: 0.3, cancel: dur * 0.62 }, o || {});

  const CW = {};
  const def = (school, o) => { CW[school] = Object.assign({ id: 'cw_' + school, school, comboWindow: 0.45, heavyCd: 0.5 }, o); };

  // 01 Espadas Almas: two fast katanas. Purple cuts right-to-left, blue answers left-to-right,
  // then both cross in an X; heavy: both blades swing down together and release a cross of souls.
  def('souls', {
    name: 'ESPADAS ALMAS', jp: '魂双剣', color: 0xa030ff, color2: 0x2f7cff,
    combo: [
      S('souls_a1', 0.24, [0.05, 0.13], 3.8, 80, 20, { roll: 0, lunge: 4 }),
      S('souls_a2', 0.24, [0.05, 0.13], 3.8, 80, 20, { roll: 180, lunge: 4 }),
      S('souls_a3', 0.34, [0.12, 0.22], 4.0, 95, 15, { roll: 90, lunge: 6, rehit: 0.07, stun: 0.45, push: 5 }),
    ],
    heavy: S('souls_h', 0.52, [0.28, 0.36], 4.4, 70, 44, { roll: 90, lunge: 7, push: 9, stun: 0.8, stop: 0.1, heavy: true, special: 'soulCross', cancel: 0.4 }),
  });

  // 02 Teleporte: a long void blade, one hand. Two diagonal cuts, then a stab that steps through
  // a small portal; heavy: a vertical cut that tears a rift along the ground which drags enemies
  // in and implodes.
  def('void', {
    name: 'LÂMINA DO VAZIO', jp: '虚空刃', color: 0xb44dff, color2: 0x2a0a4a,
    combo: [
      S('void_a1', 0.25, [0.06, 0.14], 4.0, 75, 22, { roll: 30, lunge: 4 }),
      S('void_a2', 0.25, [0.06, 0.14], 4.0, 75, 22, { roll: 210, lunge: 4 }),
      S('void_a3', 0.34, [0.1, 0.2], 5.0, 26, 36, { roll: 0, lunge: 3, push: 10, stun: 0.6, thrust: true, special: 'voidStep' }),
    ],
    heavy: S('void_h', 0.5, [0.24, 0.32], 4.6, 40, 40, { roll: 90, lunge: 4, push: 4, stun: 0.7, stop: 0.08, heavy: true, special: 'riftCut', cancel: 0.4 }),
  });

  // 03 Explosão Demoníaca: a spiked ritual cannon swung like a club with both hands. Two heavy
  // sweeps, then an overhead slam that bursts in hellfire; heavy: the seal breaks and the cannon
  // fires a shell of magma that explodes.
  def('demon', {
    name: 'CANHÃO RITUAL', jp: '魔砲', color: 0xff3a10, color2: 0xffb020, comboWindow: 0.55, heavyCd: 0.9,
    combo: [
      S('demon_a1', 0.44, [0.16, 0.27], 4.6, 105, 34, { roll: 0, lunge: 5, push: 11, stun: 0.6, stop: 0.08 }),
      S('demon_a2', 0.44, [0.16, 0.27], 4.6, 105, 34, { roll: 180, lunge: 5, push: 11, stun: 0.6, stop: 0.08 }),
      S('demon_a3', 0.58, [0.26, 0.34], 4.4, 55, 52, { roll: 90, lunge: 6, push: 6, launch: 4, stun: 0.9, stop: 0.12, heavy: true, special: 'demonSlam' }),
    ],
    heavy: S('demon_h', 0.7, [0.3, 0.32], 2.5, 30, 10, { roll: 0, lunge: -3, push: 3, stun: 0.3, stop: 0.05, heavy: true, special: 'demonCannon', cancel: 0.55 }),
  });

  // 04 Invocação de Demônios: the abyssal scepter, one hand. Two swings of its spiked head, then
  // the eye glares a red beam; heavy: the butt strikes the ground, an abyssal circle drags enemies
  // in and claws burst out of it.
  def('summon', {
    name: 'CETRO ABISSAL', jp: '冥杖', color: 0xff1a3a, color2: 0x6a0010, comboWindow: 0.5, heavyCd: 0.8,
    combo: [
      S('summon_a1', 0.32, [0.1, 0.19], 4.4, 95, 26, { roll: 0, lunge: 3, push: 7, stun: 0.45 }),
      S('summon_a2', 0.32, [0.1, 0.19], 4.4, 95, 26, { roll: 180, lunge: 3, push: 7, stun: 0.45 }),
      S('summon_a3', 0.42, [0.16, 0.22], 3.2, 30, 18, { roll: 0, lunge: 2, push: 4, stun: 0.4, thrust: true, special: 'abyssGaze' }),
    ],
    heavy: S('summon_h', 0.66, [0.34, 0.38], 3.0, 60, 20, { roll: 90, lunge: 2, push: 3, stun: 0.5, stop: 0.08, heavy: true, special: 'abyssCircle', cancel: 0.5 }),
  });

  // 05 Manipulação de Sangue: the blood scythe, two hands. Wide sweeps, then a spinning harvest;
  // heavy: the blade flings a crescent of blood that cuts through everything and drinks for you.
  def('blood', {
    name: 'FOICE SANGUÍNEA', jp: '血鎌', color: 0xe0102e, color2: 0x6a0010, comboWindow: 0.5, heavyCd: 0.7,
    combo: [
      S('blood_a1', 0.36, [0.12, 0.22], 5.0, 115, 26, { roll: 0, lunge: 4, push: 6, stun: 0.35, lifesteal: 3 }),
      S('blood_a2', 0.36, [0.12, 0.22], 5.0, 115, 26, { roll: 180, lunge: 4, push: 6, stun: 0.35, lifesteal: 3 }),
      S('blood_a3', 0.56, [0.1, 0.44], 5.2, 180, 15, { roll: 0, lunge: 6, push: 3, stun: 0.3, rehit: 0.14, spin: true, cancel: 0.46, lifesteal: 2 }),
    ],
    heavy: S('blood_h', 0.5, [0.22, 0.3], 5.2, 90, 30, { roll: 210, lunge: 4, push: 6, stun: 0.6, stop: 0.08, heavy: true, special: 'bloodCrescent', cancel: 0.4 }),
  });

  // 06 Escudo de Energia: the floating aegis over an open hand. A bash, a sweep of its edge, then
  // its orbiting crystals fire; heavy: it blooms into a dome that blasts everything away, burns
  // enemy shots out of the air and shields you for a moment.
  def('aegis', {
    name: 'ÉGIDE ARCANA', jp: '聖盾', color: 0xffd070, color2: 0x9ad0ff, comboWindow: 0.5, heavyCd: 1.4,
    combo: [
      S('aegis_a1', 0.3, [0.08, 0.18], 3.6, 50, 24, { roll: 0, lunge: 6, push: 14, stun: 0.6, stop: 0.06, thrust: true }),
      S('aegis_a2', 0.32, [0.1, 0.2], 4.0, 110, 20, { roll: 180, lunge: 3, push: 8, stun: 0.4 }),
      S('aegis_a3', 0.4, [0.14, 0.18], 2.0, 20, 0, { roll: 0, lunge: 0, push: 0, stun: 0, special: 'aegisShards' }),
    ],
    heavy: S('aegis_h', 0.6, [0.3, 0.34], 2.0, 30, 0, { roll: 0, lunge: 0, push: 0, stun: 0, heavy: true, special: 'aegisDome', cancel: 0.5 }),
  });

  // 07 Meteoro: a hammer whose head is a cluster of fallen-star rock. Two heavy smashes, then a
  // slam that shakes fragments down from the sky around the impact; heavy: the hammer points at
  // the sky and a meteor falls on the aimed spot.
  def('meteor', {
    name: 'MARTELO ASTRAL', jp: '隕鎚', color: 0xff7a1a, color2: 0x3a2a24, comboWindow: 0.55, heavyCd: 1.6,
    combo: [
      S('meteor_a1', 0.46, [0.18, 0.28], 4.5, 90, 36, { roll: 45, lunge: 5, push: 10, launch: 3, stun: 0.6, stop: 0.09, heavy: true }),
      S('meteor_a2', 0.46, [0.18, 0.28], 4.5, 100, 34, { roll: 180, lunge: 5, push: 12, stun: 0.6, stop: 0.09, heavy: true }),
      S('meteor_a3', 0.62, [0.3, 0.38], 4.2, 60, 48, { roll: 90, lunge: 6, push: 6, launch: 6, stun: 0.9, stop: 0.13, heavy: true, special: 'meteorQuake' }),
    ],
    heavy: S('meteor_h', 0.75, [0.4, 0.42], 2.0, 20, 0, { roll: 0, lunge: 0, push: 0, stun: 0, heavy: true, special: 'meteorCall', cancel: 0.6 }),
  });

  // 08 Corpo de Fogo: a spear whose blade is living flame. A thrust, a burning sweep, a spin that
  // throws a ring of fire; heavy: you become the fire and charge through everything, leaving a
  // trail of flame on the ground.
  def('fire', {
    name: 'LANÇA ÍGNEA', jp: '炎槍', color: 0xff5a10, color2: 0xffd040, comboWindow: 0.45, heavyCd: 1.1,
    combo: [
      S('fire_a1', 0.3, [0.08, 0.17], 5.6, 26, 26, { roll: 0, lunge: 6, push: 8, stun: 0.4, thrust: true, status: 'burn' }),
      S('fire_a2', 0.34, [0.1, 0.2], 5.0, 110, 22, { roll: 180, lunge: 3, push: 6, stun: 0.35 }),
      S('fire_a3', 0.5, [0.12, 0.38], 4.8, 180, 14, { roll: 0, lunge: 4, push: 5, stun: 0.3, rehit: 0.12, spin: true, special: 'fireRing', cancel: 0.42 }),
    ],
    heavy: S('fire_h', 0.5, [0.1, 0.4], 3.0, 70, 24, { roll: 0, lunge: 0, push: 9, launch: 4, stun: 0.6, rehit: 0.2, heavy: true, special: 'fireCharge', cancel: 0.42 }),
  });

  // 09 Raio de Plasma: a lance with a plasma core held in a gold ring. A thrust, a crackling sweep,
  // a thrust that looses a bolt of plasma; heavy: the core overcharges and the lance fires a beam
  // that burns straight through the line.
  def('plasma', {
    name: 'LANÇA DE PLASMA', jp: '雷槍', color: 0x4aa8ff, color2: 0xe0f4ff, comboWindow: 0.45, heavyCd: 1.2,
    combo: [
      S('plasma_a1', 0.28, [0.07, 0.16], 5.6, 26, 24, { roll: 0, lunge: 6, push: 8, stun: 0.4, thrust: true, status: 'shock', statusT: 1.2 }),
      S('plasma_a2', 0.32, [0.1, 0.19], 5.0, 110, 22, { roll: 180, lunge: 3, push: 6, stun: 0.4 }),
      S('plasma_a3', 0.34, [0.1, 0.18], 5.4, 26, 22, { roll: 0, lunge: 4, push: 6, stun: 0.4, thrust: true, special: 'plasmaBolt' }),
    ],
    heavy: S('plasma_h', 0.62, [0.36, 0.38], 2.0, 20, 0, { roll: 0, lunge: -2, push: 0, stun: 0, heavy: true, special: 'plasmaBeam', cancel: 0.5 }),
  });

  // 10 Congelamento: the frost halberd. Two chilling sweeps, a thrust that freezes; heavy: the axe
  // hits the ground and a row of ice spikes erupts toward the aim, freezing what it impales.
  def('ice', {
    name: 'ALABARDA GLACIAL', jp: '氷戟', color: 0x8ad8ff, color2: 0xe8f8ff, comboWindow: 0.5, heavyCd: 1.2,
    combo: [
      S('ice_a1', 0.38, [0.13, 0.23], 5.0, 110, 26, { roll: 30, lunge: 4, push: 7, stun: 0.4, status: 'slow', statusT: 2 }),
      S('ice_a2', 0.38, [0.13, 0.23], 5.0, 110, 26, { roll: 210, lunge: 4, push: 7, stun: 0.4, status: 'slow', statusT: 2 }),
      S('ice_a3', 0.34, [0.1, 0.19], 5.6, 26, 32, { roll: 0, lunge: 6, push: 8, stun: 0.5, thrust: true, status: 'freeze', statusT: 1.6 }),
    ],
    heavy: S('ice_h', 0.62, [0.32, 0.4], 4.6, 50, 30, { roll: 90, lunge: 4, push: 5, stun: 0.7, stop: 0.1, heavy: true, special: 'iceSpikes', cancel: 0.48 }),
  });

  // 11 Gravidade: a void hammer with a black hole for a core. Its blows drag enemies in instead of
  // throwing them off; the slam opens a well that pulls the crowd together; heavy: it hurls the
  // black hole, which swallows a crowd and implodes.
  def('gravity', {
    name: 'MARTELO DO VAZIO', jp: '重鎚', color: 0xa040ff, color2: 0x14061e, comboWindow: 0.55, heavyCd: 1.6,
    combo: [
      S('gravity_a1', 0.46, [0.18, 0.28], 4.6, 100, 34, { roll: 30, lunge: 5, push: -6, stun: 0.6, stop: 0.09, heavy: true }),
      S('gravity_a2', 0.46, [0.18, 0.28], 4.6, 100, 34, { roll: 210, lunge: 5, push: -6, stun: 0.6, stop: 0.09, heavy: true }),
      S('gravity_a3', 0.6, [0.3, 0.36], 4.2, 60, 44, { roll: 90, lunge: 6, push: 2, stun: 1, stop: 0.12, heavy: true, special: 'gravWell' }),
    ],
    heavy: S('gravity_h', 0.56, [0.3, 0.32], 2.0, 20, 0, { roll: 0, lunge: 0, push: 0, stun: 0, heavy: true, special: 'gravThrow', cancel: 0.45 }),
  });

  // 12 Rajada de Balas: a skull gatling, two hands. Left click fires bursts that grow (3 / 4 / 6
  // rounds); heavy: the barrels spin up and unload a long storm of fire.
  def('bullets', {
    name: 'METRALHADORA DA CAVEIRA', jp: '髑髏砲', color: 0xff2a1a, color2: 0xffb040, comboWindow: 0.35, heavyCd: 1.4,
    combo: [
      S('bullets_a1', 0.2, [0.02, 0.04], 1, 1, 0, { roll: 0, lunge: 0, push: 0, stun: 0, special: 'gunBurst', rounds: 3, cancel: 0.17 }),
      S('bullets_a2', 0.22, [0.02, 0.04], 1, 1, 0, { roll: 0, lunge: 0, push: 0, stun: 0, special: 'gunBurst', rounds: 4, cancel: 0.19 }),
      S('bullets_a3', 0.3, [0.02, 0.04], 1, 1, 0, { roll: 0, lunge: 0, push: 0, stun: 0, special: 'gunBurst', rounds: 6, cancel: 0.26 }),
    ],
    heavy: S('bullets_h', 1.1, [0.25, 0.27], 1, 1, 0, { roll: 0, lunge: 0, push: 0, stun: 0, heavy: true, special: 'gunStorm', cancel: 1.0 }),
  });

  // 13 Lança de Energia: a sacred spear of light. Thrust, a radiant sweep, a thrust that leaves a
  // lance of light standing in the target; heavy: the spear is thrown and bursts into a pillar of
  // light where it lands.
  def('spear', {
    name: 'LANÇA SAGRADA', jp: '聖槍', color: 0xffd060, color2: 0xfff8e0, comboWindow: 0.45, heavyCd: 1.3,
    combo: [
      S('spear_a1', 0.28, [0.07, 0.16], 5.8, 24, 26, { roll: 0, lunge: 7, push: 9, stun: 0.4, thrust: true }),
      S('spear_a2', 0.34, [0.1, 0.2], 5.2, 110, 22, { roll: 180, lunge: 3, push: 6, stun: 0.4 }),
      S('spear_a3', 0.34, [0.1, 0.19], 6.0, 22, 34, { roll: 0, lunge: 8, push: 10, launch: 3, stun: 0.6, thrust: true }),
    ],
    heavy: S('spear_h', 0.55, [0.3, 0.32], 2.0, 20, 0, { roll: 0, lunge: 0, push: 0, stun: 0, heavy: true, special: 'lightJavelin', cancel: 0.42 }),
  });

  // 14 Clones Sombrios: twin shadow daggers. Quick crossing cuts; the third cut is echoed by a
  // shadow clone; heavy: two clones burst out of your shadow and dash through the enemies ahead.
  def('shadow', {
    name: 'ADAGAS DAS SOMBRAS', jp: '影双刃', color: 0xa050ff, color2: 0x1a0a2a, comboWindow: 0.4, heavyCd: 1.2,
    combo: [
      S('shadow_a1', 0.2, [0.04, 0.11], 3.4, 80, 17, { roll: 20, lunge: 5 }),
      S('shadow_a2', 0.2, [0.04, 0.11], 3.4, 80, 17, { roll: 200, lunge: 5 }),
      S('shadow_a3', 0.3, [0.08, 0.17], 3.8, 90, 16, { roll: 90, lunge: 7, rehit: 0.07, push: 5, stun: 0.45, special: 'shadowEcho' }),
    ],
    heavy: S('shadow_h', 0.45, [0.2, 0.22], 2.0, 20, 0, { roll: 0, lunge: 0, push: 0, stun: 0, heavy: true, special: 'shadowDash', cancel: 0.36 }),
  });

  // 15 Vento Cortante: the gale scythe. Sweeps that throw small crescents of wind; heavy: a
  // tornado spins up where you aim and hurls everything inside into the air.
  def('wind', {
    name: 'FOICE DO VENDAVAL', jp: '風鎌', color: 0x7ae0ff, color2: 0xe0faff, comboWindow: 0.45, heavyCd: 1.6,
    combo: [
      S('wind_a1', 0.32, [0.1, 0.2], 5.0, 120, 22, { roll: 0, lunge: 4, push: 9, stun: 0.35, special: 'windCrescent' }),
      S('wind_a2', 0.32, [0.1, 0.2], 5.0, 120, 22, { roll: 180, lunge: 4, push: 9, stun: 0.35, special: 'windCrescent' }),
      S('wind_a3', 0.5, [0.1, 0.4], 5.2, 180, 13, { roll: 0, lunge: 5, push: 6, launch: 4, stun: 0.3, rehit: 0.12, spin: true, cancel: 0.42 }),
    ],
    heavy: S('wind_h', 0.55, [0.3, 0.32], 2.0, 20, 0, { roll: 0, lunge: 0, push: 0, stun: 0, heavy: true, special: 'windTornado', cancel: 0.45 }),
  });

  // 16 Regeneração: the flowering staff. Its blows plant flowers where they land, and flowers heal
  // you while you stand among them; the third blow plants a bloom; heavy: the staff strikes the
  // ground and the whole field around you bursts into flower, thorns lash the enemies, you heal.
  def('regen', {
    name: 'BÁCULO DA NATUREZA', jp: '生杖', color: 0x60ff90, color2: 0xfff4f8, comboWindow: 0.5, heavyCd: 2.5,
    combo: [
      S('regen_a1', 0.34, [0.11, 0.21], 4.4, 100, 22, { roll: 30, lunge: 3, push: 7, stun: 0.4, special: 'regenSeed' }),
      S('regen_a2', 0.34, [0.11, 0.21], 4.4, 100, 22, { roll: 210, lunge: 3, push: 7, stun: 0.4, special: 'regenSeed' }),
      S('regen_a3', 0.46, [0.2, 0.28], 4.0, 50, 28, { roll: 90, lunge: 4, push: 4, launch: 4, stun: 0.6, heavy: true, special: 'regenBloom' }),
    ],
    heavy: S('regen_h', 0.66, [0.36, 0.38], 2.0, 20, 0, { roll: 0, lunge: 0, push: 0, stun: 0, heavy: true, special: 'regenField', cancel: 0.5 }),
  });

  // 17 Trovão: the storm hammer. Smashes that arc lightning to the nearest enemies; the third
  // calls a bolt down on the impact; heavy: three bolts of lightning hammer the aimed spot.
  def('thunder', {
    name: 'MARTELO DA TEMPESTADE', jp: '雷鎚', color: 0x5aa0ff, color2: 0xe8f4ff, comboWindow: 0.55, heavyCd: 1.6,
    combo: [
      S('thunder_a1', 0.44, [0.17, 0.27], 4.5, 95, 32, { roll: 30, lunge: 5, push: 9, stun: 0.6, stop: 0.08, heavy: true, special: 'thunderArc' }),
      S('thunder_a2', 0.44, [0.17, 0.27], 4.5, 95, 32, { roll: 210, lunge: 5, push: 9, stun: 0.6, stop: 0.08, heavy: true, special: 'thunderArc' }),
      S('thunder_a3', 0.6, [0.3, 0.36], 4.2, 60, 44, { roll: 90, lunge: 6, push: 6, launch: 6, stun: 1, stop: 0.12, heavy: true, special: 'thunderSlam' }),
    ],
    heavy: S('thunder_h', 0.7, [0.36, 0.38], 2.0, 20, 0, { roll: 0, lunge: 0, push: 0, stun: 0, heavy: true, special: 'thunderCall', cancel: 0.56 }),
  });

  // 18 Escuridão: the eclipse scythe. Sweeps that blind; a reaping pull; heavy: a crescent of night
  // that cuts through the line, blinds and drinks life back to you.
  def('dark', {
    name: 'FOICE DO ECLIPSE', jp: '蝕鎌', color: 0x9a40ff, color2: 0x0a0410, comboWindow: 0.5, heavyCd: 1.1,
    combo: [
      S('dark_a1', 0.36, [0.12, 0.22], 5.0, 115, 25, { roll: 0, lunge: 4, push: 6, stun: 0.4, status: 'blind', statusT: 1.2 }),
      S('dark_a2', 0.36, [0.12, 0.22], 5.0, 115, 25, { roll: 180, lunge: 4, push: 6, stun: 0.4, status: 'blind', statusT: 1.2 }),
      S('dark_a3', 0.5, [0.2, 0.3], 5.6, 70, 52, { roll: 90, lunge: 3, push: -11, stun: 0.7, stop: 0.1, reap: true, lifesteal: 6 }),
    ],
    heavy: S('dark_h', 0.5, [0.22, 0.3], 5.0, 90, 26, { roll: 210, lunge: 4, push: 6, stun: 0.6, stop: 0.08, heavy: true, special: 'nightCrescent', cancel: 0.4 }),
  });

  // 19 Lâminas do Caos: two red sickles on a chain, one in each hand. Hooking cuts; a lash of the
  // chain that reaches far; heavy: the sickles are flung out on their chains and whirl around you.
  def('chaos', {
    name: 'FOICES DO CAOS', jp: '混沌鎖刃', color: 0xff2030, color2: 0x4a0008, comboWindow: 0.42, heavyCd: 1.4,
    combo: [
      S('chaos_a1', 0.24, [0.06, 0.14], 4.0, 85, 21, { roll: 20, lunge: 4 }),
      S('chaos_a2', 0.24, [0.06, 0.14], 4.0, 85, 21, { roll: 200, lunge: 4 }),
      S('chaos_a3', 0.38, [0.12, 0.22], 7.5, 22, 30, { roll: 0, lunge: 2, push: -9, stun: 0.6, thrust: true }),
    ],
    heavy: S('chaos_h', 0.9, [0.1, 0.8], 6.0, 180, 14, { roll: 0, lunge: 0, push: 8, stun: 0.4, rehit: 0.18, spin: true, heavy: true, cancel: 0.8 }),
  });

  // 20 Domínio Elemental: the elemental scepter. Each blow carries a different element (fire,
  // frost, lightning); heavy: the four orbs leave the scepter, fly to the aim and burst together.
  def('elemental', {
    name: 'CETRO ELEMENTAL', jp: '元素杖', color: 0xffe080, color2: 0xffffff, comboWindow: 0.5, heavyCd: 1.8,
    combo: [
      S('elemental_a1', 0.32, [0.1, 0.2], 4.6, 100, 22, { roll: 30, lunge: 3, push: 6, stun: 0.4, status: 'burn', statusT: 2.5 }),
      S('elemental_a2', 0.32, [0.1, 0.2], 4.6, 100, 22, { roll: 210, lunge: 3, push: 6, stun: 0.4, status: 'slow', statusT: 2.5 }),
      S('elemental_a3', 0.42, [0.16, 0.24], 4.2, 50, 30, { roll: 90, lunge: 4, push: 5, stun: 0.6, heavy: true, status: 'shock', statusT: 1.5, special: 'elemPulse' }),
    ],
    heavy: S('elemental_h', 0.6, [0.32, 0.34], 2.0, 20, 0, { roll: 0, lunge: 0, push: 0, stun: 0, heavy: true, special: 'elemStorm', cancel: 0.5 }),
  });

  // returns the weapon a player swings in slot i (the character's own in slot 0)
  function weaponFor(p, i) {
    if (i === 0 && p.school && CW[p.school]) return CW[p.school];
    return SO.WEAPONS[i];
  }

  // Heavy-attack specials. (world, p, def) -> nothing; use SO.Kit for damage and visuals.
  // lasting effects of the specials, stepped by SO.Powers like the abilities' (registered lazily:
  // the abilities registry loads after this file)
  const FX = {
    // rift: pulls for 0.55 s, then implodes along its length
    cw_rift(world, fx, dt) {
      const K = SO.Kit, p = world.players[fx.pid];
      const dir = { x: fx.dx, y: 0, z: fx.dz };
      if (!fx.done) {
        for (const e of K.lineHits(world, { x: fx.x, y: fx.y + 1, z: fx.z }, dir, fx.len, 3.2)) {
          if (e.def.big) continue;
          // toward the closest point of the rift
          const t = SO.clamp((e.pos.x - fx.x) * fx.dx + (e.pos.z - fx.z) * fx.dz, 0, fx.len);
          const tx = fx.x + fx.dx * t - e.pos.x, tz = fx.z + fx.dz * t - e.pos.z, l = Math.sqrt(tx * tx + tz * tz) || 1;
          e.vel.x += tx / l * 40 * dt; e.vel.z += tz / l * 40 * dt;
        }
        if (fx.t >= 0.55) {
          fx.done = 1;
          for (const e of K.lineHits(world, { x: fx.x, y: fx.y + 1, z: fx.z }, dir, fx.len, 1.8)) K.hit(world, p, e, 46, { kind: 'void', push: 3, launch: 7, stun: 0.8, stop: 0.06, style: 'FENDA', pts: 10 });
          K.vfx(world, 'cw_rift:implode', { x: fx.x, y: fx.y, z: fx.z, dx: fx.dx, dz: fx.dz, len: fx.len });
          world.emit('blast', { x: fx.x + fx.dx * fx.len * 0.5, y: fx.y, z: fx.z + fx.dz * fx.len * 0.5, r: 2.4, dmg: 40, owner: 'player' });
        }
      }
      return fx.t >= fx.dur;
    },
  };
  // abyssal circle: drags enemies to its center, then claws erupt (0.5 s) and slash twice
  FX.cw_abyss = (world, fx, dt) => {
    const K = SO.Kit, p = world.players[fx.pid];
    for (const e of K.enemiesIn(world, fx, fx.r)) {
      if (e.def.big) continue;
      const dx = fx.x - e.pos.x, dz = fx.z - e.pos.z, l = Math.sqrt(dx * dx + dz * dz) || 1;
      if (l > 0.8) { e.vel.x += dx / l * 30 * dt; e.vel.z += dz / l * 30 * dt; }
    }
    for (const [key, t, dmg, up] of [['c1', 0.5, 34, 9], ['c2', 0.85, 24, 4]]) {
      if (fx.t >= t && !fx[key]) {
        fx[key] = 1;
        K.blast(world, p, { x: fx.x, y: fx.y + 0.5, z: fx.z }, fx.r, dmg, { kind: 'abyss', push: 2, launch: up, stun: 0.8, falloff: 0.25, crater: key === 'c1' ? [1.8, 0.35] : null, style: 'MÃOS DO ABISMO', pts: 8 });
        K.vfx(world, 'cw_abyss:claws', { x: fx.x, y: fx.y, z: fx.z, r: fx.r, n: key === 'c1' ? 7 : 5 });
      }
    }
    return fx.t >= fx.dur;
  };
  // the burning trail: anything standing in it catches fire
  FX.cw_firetrail = (world, fx, dt) => {
    const K = SO.Kit;
    fx._tick = (fx._tick || 0) - dt;
    if (fx._tick <= 0) {
      fx._tick = 0.25;
      for (const e of K.lineHits(world, { x: fx.x, y: fx.y + 1, z: fx.z }, { x: fx.dx, y: 0, z: fx.dz }, fx.len, 1.2)) K.status(world, e, 'burn', 1.5, { pid: fx.pid, by: 'cw_fire', dps: 9 });
    }
    return fx.t >= fx.dur;
  };
  // ice spikes rising one after another along a line (fx.i spikes so far)
  FX.cw_icespikes = (world, fx) => {
    const K = SO.Kit, p = world.players[fx.pid];
    fx.i = fx.i || 0;
    while (fx.i < fx.n && fx.t >= fx.i * 0.055) {
      const d = 1 + fx.i * fx.step, x = fx.x + fx.dx * d, z = fx.z + fx.dz * d, y = K.groundAt(world, x, z, fx.y + 1);
      for (const e of K.enemiesIn(world, { x, y: y + 1, z }, 1.6)) {
        K.hit(world, p, e, 24, { kind: 'ice', push: 2, launch: 8, stun: 0.6, style: 'GELO ETERNO', pts: 5 });
        K.status(world, e, 'freeze', 2, { pid: fx.pid, by: 'cw_ice' });
      }
      K.vfx(world, 'cw_ice:spike', { x, y, z, i: fx.i });
      fx.i++;
    }
    return fx.t >= fx.dur;
  };
  // a gravity well: drags enemies to its center; optionally implodes at the end
  FX.cw_well = (world, fx, dt) => {
    const K = SO.Kit, p = world.players[fx.pid];
    for (const e of K.enemiesIn(world, fx, fx.r)) {
      const dx = fx.x - e.pos.x, dz = fx.z - e.pos.z, l = Math.sqrt(dx * dx + dz * dz) || 1;
      const k = (e.def.big ? 0.35 : 1) * fx.force * dt;
      if (l > 0.7) { e.vel.x += dx / l * k; e.vel.z += dz / l * k; }
      if (!e.def.ground && fx.boom) e.vel.y += (fx.y - e.pos.y) * dt * 4;
    }
    if (fx.boom && !fx.done && fx.t >= fx.dur - 0.05) {
      fx.done = 1;
      K.blast(world, p, fx, fx.r * 0.7, fx.boom, { kind: 'void', push: 16, launch: 9, stun: 1, falloff: 0.3, crater: [2.4, 0.8], style: 'COLAPSO', pts: 14 });
      K.vfx(world, 'cw_grav:implode', { x: fx.x, y: fx.y, z: fx.z, r: fx.r });
    }
    return fx.t >= fx.dur;
  };
  // the gatling's storm: a long stream of rounds where you aim
  FX.cw_storm = (world, fx, dt) => {
    const p = world.players[fx.pid];
    if (!p || p.dead) return true;
    fx._acc = (fx._acc || 0) + dt * 22;
    if (fx._acc >= 2) { const n = Math.floor(fx._acc); fx._acc -= n; SPECIALS.gunBurst(world, p, { rounds: n }); }
    return fx.t >= fx.dur;
  };
  // the shadow clone's echo cut (lands 0.18 s after it appears)
  FX.cw_echo = (world, fx) => {
    if (!fx.done && fx.t >= 0.18) {
      fx.done = 1;
      SO.Kit.blast(world, world.players[fx.pid], fx, 2.6, 20, { kind: 'shadow', push: 5, stun: 0.5, falloff: 0.2, scenery: false, style: 'ECO', pts: 4 });
    }
    return fx.t >= fx.dur;
  };
  // tornado: drags enemies into its funnel and throws them up; hits every 0.3 s
  FX.cw_tornado = (world, fx, dt) => {
    const K = SO.Kit, p = world.players[fx.pid];
    for (const e of K.enemiesIn(world, { x: fx.x, y: fx.y + 2, z: fx.z }, fx.r + 2)) {
      const dx = fx.x - e.pos.x, dz = fx.z - e.pos.z, l = Math.sqrt(dx * dx + dz * dz) || 1;
      const k = e.def.big ? 0.3 : 1;
      e.vel.x += (dx / l * 18 - dz / l * 14) * dt * k; e.vel.z += (dz / l * 18 + dx / l * 14) * dt * k;
      if (l < fx.r && !e.def.big) e.vel.y = Math.max(e.vel.y, 7 * k);
    }
    fx._tick = (fx._tick || 0) - dt;
    if (fx._tick <= 0) { fx._tick = 0.3; K.blast(world, p, { x: fx.x, y: fx.y + 1.5, z: fx.z }, fx.r, 9, { kind: 'wind', push: 1, stun: 0.3, falloff: 0, scenery: false, style: 'FÚRIA DOS VENTOS', pts: 2 }); }
    return fx.t >= fx.dur;
  };
  // flowers: heal the player while standing among them; a field also slows enemies inside
  FX.cw_flowers = (world, fx, dt) => {
    const K = SO.Kit;
    for (const k in world.players) {
      const p = world.players[k];
      if (p.dead || Math.hypot(p.pos.x - fx.x, p.pos.z - fx.z) > fx.r) continue;
      p.hp = Math.min(p.maxHp, p.hp + fx.heal * dt);
    }
    if (fx.field) {
      fx._tick = (fx._tick || 0) - dt;
      if (fx._tick <= 0) { fx._tick = 0.5; for (const e of K.enemiesIn(world, fx, fx.r)) K.status(world, e, 'slow', 1, { pid: fx.pid, by: 'cw_regen' }); }
    }
    return fx.t >= fx.dur;
  };
  // three bolts, one after another, on and around the aimed spot
  FX.cw_bolts = (world, fx) => {
    const K = SO.Kit, p = world.players[fx.pid];
    fx.i = fx.i || 0;
    while (fx.i < 3 && fx.t >= 0.15 + fx.i * 0.22) {
      const a = fx.i * 2.1, r = fx.i ? 2 : 0;
      const x = fx.x + Math.cos(a) * r, z = fx.z + Math.sin(a) * r, y = K.groundAt(world, x, z, fx.y + 1);
      K.blast(world, p, { x, y: y + 0.5, z }, 3.4, 48, { kind: 'thunder', push: 9, launch: 7, stun: 1.1, falloff: 0.3, crater: [1.8, 0.6], status: 'shock', statusT: 2, by: 'cw_thunder', style: 'RAIO DIVINO', pts: 10 });
      K.vfx(world, 'cw_thunder:strike', { x, y, z, big: 1 });
      fx.i++;
    }
    return fx.t >= fx.dur;
  };
  function effect(world, kind, o) {
    const A = SO.Abilities;
    if (A && !A.FX[kind]) A.FX[kind] = FX[kind];
    return SO.Kit.effect(world, kind, o);
  }

  const SPECIALS = {
    // a short blink forward through a portal, the stab lands where you come out
    voidStep(world, p) {
      const K = SO.Kit;
      const from = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
      const f = SO.forwardFlat(p.yaw, { x: 0, y: 0, z: 0 });
      K.slide(world, p, f, 3.2);
      p.invuln = Math.max(p.invuln, 0.15);
      K.vfx(world, 'cw_void:step', { pid: p.id, x: from.x, y: from.y, z: from.z, x2: p.pos.x, y2: p.pos.y, z2: p.pos.z });
    },
    // the club hits the floor: a ring of hellfire and a crater where it landed
    demonSlam(world, p) {
      const K = SO.Kit, f = SO.forwardFlat(p.yaw, { x: 0, y: 0, z: 0 });
      const x = p.pos.x + f.x * 3, z = p.pos.z + f.z * 3, y = K.groundAt(world, x, z, p.pos.y + 0.5);
      K.blast(world, p, { x, y: y + 0.5, z }, 3.4, 30, { kind: 'fire', push: 9, launch: 5, stun: 0.7, falloff: 0.4, crater: [1.6, 0.45], status: 'burn', statusT: 2, statusData: { dps: 8 }, by: 'cw_demon', style: 'INFERNO', pts: 6 });
      K.vfx(world, 'cw_demon:slam', { x, y, z });
    },
    // the seal breaks: a magma shell, heavy recoil
    demonCannon(world, p) {
      const K = SO.Kit, eye = K.eye(p), f = K.fwd(p);
      K.spell(world, p, {
        look: 'cw_demon_shell', pos: { x: eye.x + f.x * 1.4, y: eye.y - 0.25 + f.y * 1.4, z: eye.z + f.z * 1.4 }, vel: { x: 0, y: 0, z: 0 }, dir: f, speed: 46, grav: 6,
        radius: 0.6, dmg: 40, life: 2.2, hitKind: 'fire', explodeOnHit: true,
        explode: { r: 5.2, dmg: 70, falloff: 0.45, crater: [2.6, 0.9], opts: { push: 14, launch: 8, stun: 1, status: 'burn', statusT: 3, statusData: { dps: 10 }, by: 'cw_demon', style: 'SELO ROMPIDO', pts: 14 } },
      });
      const fl = SO.forwardFlat(p.yaw, { x: 0, y: 0, z: 0 });
      p.vel.x -= fl.x * 9; p.vel.z -= fl.z * 9;
    },
    // the eye's glare: a red beam through the line of sight, weakening what it touches
    abyssGaze(world, p) {
      const K = SO.Kit, eye = K.eye(p), f = K.fwd(p);
      const len = world.raycast ? Math.min(14, world.raycast(eye, f, 14)) : 14;
      for (const e of K.lineHits(world, eye, f, len, 0.7)) {
        K.hit(world, p, e, 24, { kind: 'abyss', push: 5, stun: 0.5, style: 'OLHAR ABISSAL', pts: 6 });
        K.status(world, e, 'weak', 3, { pid: p.id, by: 'cw_summon', k: 0.25 });
      }
      K.vfx(world, 'cw_summon:gaze', { pid: p.id, x: eye.x, y: eye.y, z: eye.z, dx: f.x, dy: f.y, dz: f.z, len });
    },
    abyssCircle(world, p) {
      const f = SO.forwardFlat(p.yaw, { x: 0, y: 0, z: 0 });
      const x = p.pos.x + f.x * 4.5, z = p.pos.z + f.z * 4.5;
      effect(world, 'cw_abyss', { pid: p.id, x, y: SO.Kit.groundAt(world, x, z, p.pos.y + 0.5), z, r: 4.6, dur: 1.4 });
    },
    // a crescent of blood that passes through enemies and heals its owner on every cut
    bloodCrescent(world, p) {
      const A = SO.Abilities, K = SO.Kit;
      if (A && !A.SPELL_HIT.cw_bloodLeech) A.SPELL_HIT.cw_bloodLeech = (w, q) => { const o = w.players[q.pid]; if (o) K.heal(w, o, 7); };
      const eye = K.eye(p), f = K.fwd(p);
      K.spell(world, p, {
        look: 'cw_blood_wave', pos: { x: eye.x + f.x * 1.2, y: eye.y - 0.3 + f.y * 1.2, z: eye.z + f.z * 1.2 }, vel: { x: 0, y: 0, z: 0 }, dir: f, speed: 30,
        radius: 1.9, dmg: 34, life: 0.85, pierce: true, hitKind: 'blood', hit: { push: 5, stun: 0.5, style: 'MARÉ RUBRA', pts: 6 }, on: 'cw_bloodLeech', roll: -25,
      });
    },
    // five crystals leave their orbit and seek the nearest enemies in front
    aegisShards(world, p) {
      const K = SO.Kit, eye = K.eye(p), f = K.fwd(p), r = { x: Math.cos(p.yaw), z: -Math.sin(p.yaw) };
      for (let i = 0; i < 5; i++) {
        const s = (i - 2) * 0.35;
        K.spell(world, p, {
          look: 'cw_aegis_shard', pos: { x: eye.x + f.x * 0.8 + r.x * s, y: eye.y - 0.1 + Math.abs(s) * 0.3, z: eye.z + f.z * 0.8 + r.z * s }, vel: { x: 0, y: 0, z: 0 },
          dir: { x: f.x + r.x * s * 0.15, y: f.y, z: f.z + r.z * s * 0.15 }, speed: 44, delay: i * 0.04, homing: 9, retarget: 14,
          radius: 0.45, dmg: 15, life: 1.4, hitKind: 'light', hit: { push: 3, stun: 0.25, style: 'CRISTAL', pts: 3 },
        });
      }
    },
    // the dome: blast around you, enemy shots erased, a short invulnerability
    aegisDome(world, p) {
      const K = SO.Kit;
      K.blast(world, p, { x: p.pos.x, y: p.pos.y + 1, z: p.pos.z }, 7, 34, { kind: 'light', push: 22, launch: 6, stun: 1, falloff: 0.3, scenery: false, style: 'ÉGIDE', pts: 10 });
      for (const k in world.projectiles) {
        const q = world.projectiles[k];
        if (q.owner === 'enemy' && Math.hypot(q.pos.x - p.pos.x, q.pos.z - p.pos.z) < 9) SO.Projectiles.remove(world, q, 'intercept');
      }
      p.invuln = Math.max(p.invuln, 0.6);
      K.vfx(world, 'cw_aegis:dome', { pid: p.id, x: p.pos.x, y: p.pos.y, z: p.pos.z });
    },
    // the slam cracks the floor and shakes star fragments down around it
    meteorQuake(world, p) {
      const K = SO.Kit, f = SO.forwardFlat(p.yaw, { x: 0, y: 0, z: 0 });
      const x = p.pos.x + f.x * 3, z = p.pos.z + f.z * 3, y = K.groundAt(world, x, z, p.pos.y + 0.5);
      K.blast(world, p, { x, y: y + 0.5, z }, 3.6, 28, { kind: 'fire', push: 8, launch: 7, stun: 0.8, falloff: 0.4, crater: [2.0, 0.6], style: 'IMPACTO', pts: 6 });
      K.vfx(world, 'cw_meteor:quake', { x, y, z });
      for (let i = 0; i < 4; i++) {
        const a = world.rng() * Math.PI * 2, r = 2 + world.rng() * 3.5, tx = x + Math.cos(a) * r, tz = z + Math.sin(a) * r;
        K.spell(world, p, {
          look: 'cw_meteor_frag', pos: { x: tx + 1.5, y: y + 11 + i * 1.5, z: tz + 1 }, vel: { x: 0, y: 0, z: 0 }, dir: SO.V.norm(SO.V.v(), { x: -1.5, y: -11 - i * 1.5, z: -1 }), speed: 26, delay: 0.15 + i * 0.12,
          radius: 0.5, dmg: 14, life: 2, hitKind: 'fire', explodeOnHit: true, explode: { r: 2.3, dmg: 20, falloff: 0.5, crater: [1.2, 0.35], opts: { push: 6, launch: 4, stun: 0.5 } },
        });
      }
    },
    // a meteor called down on the aimed spot
    meteorCall(world, p) {
      const K = SO.Kit, pt = K.aimPoint(world, p, 42, 4);
      const from = { x: pt.x + 6, y: pt.y + 34, z: pt.z + 4 };
      K.spell(world, p, {
        look: 'cw_meteor_rock', pos: from, vel: { x: 0, y: 0, z: 0 }, dir: SO.V.norm(SO.V.v(), { x: pt.x - from.x, y: pt.y - from.y, z: pt.z - from.z }), speed: 46, delay: 0.25,
        radius: 1.2, dmg: 40, life: 3, hitKind: 'fire', explodeOnHit: true,
        explode: { r: 6.5, dmg: 85, falloff: 0.45, crater: [3.4, 1.2], opts: { push: 16, launch: 10, stun: 1.2, status: 'burn', statusT: 3, statusData: { dps: 8 }, by: 'cw_meteor', style: 'ASTRO CAÍDO', pts: 16 } },
      });
      K.vfx(world, 'cw_meteor:mark', { x: pt.x, y: pt.y, z: pt.z });
    },
    // the spin throws a ring of fire outward
    fireRing(world, p) {
      const K = SO.Kit;
      K.blast(world, p, { x: p.pos.x, y: p.pos.y + 1, z: p.pos.z }, 5.5, 12, { kind: 'fire', push: 7, stun: 0.4, falloff: 0.3, scenery: false, status: 'burn', statusT: 2.5, statusData: { dps: 8 }, by: 'cw_fire', style: 'ANEL DE FOGO', pts: 6 });
      K.vfx(world, 'cw_fire:ring', { x: p.pos.x, y: p.pos.y, z: p.pos.z });
    },
    // the charge: a burst of speed through enemies, a burning trail left on the floor
    fireCharge(world, p) {
      const K = SO.Kit, f = SO.forwardFlat(p.yaw, { x: 0, y: 0, z: 0 });
      const from = { x: p.pos.x, y: p.pos.y, z: p.pos.z };
      K.slide(world, p, f, 8.5);
      p.invuln = Math.max(p.invuln, 0.3);
      const len = Math.hypot(p.pos.x - from.x, p.pos.z - from.z);
      for (const e of K.lineHits(world, { x: from.x, y: from.y + 1, z: from.z }, { x: f.x, y: 0, z: f.z }, len + 1, 1.6)) {
        K.hit(world, p, e, 30, { kind: 'fire', push: 9, launch: 4, stun: 0.6, style: 'CORPO EM CHAMAS', pts: 8 });
        K.status(world, e, 'burn', 3, { pid: p.id, by: 'cw_fire', dps: 10 });
      }
      effect(world, 'cw_firetrail', { pid: p.id, x: from.x, y: K.groundAt(world, from.x, from.z, from.y + 0.5), z: from.z, dx: f.x, dz: f.z, len, dur: 2.5 });
      K.vfx(world, 'cw_fire:charge', { pid: p.id, x: from.x, y: from.y, z: from.z, x2: p.pos.x, y2: p.pos.y, z2: p.pos.z });
    },
    plasmaBolt(world, p) {
      const K = SO.Kit, eye = K.eye(p), f = K.fwd(p);
      K.spell(world, p, {
        look: 'cw_plasma_bolt', pos: { x: eye.x + f.x * 1.4, y: eye.y - 0.2 + f.y * 1.4, z: eye.z + f.z * 1.4 }, vel: { x: 0, y: 0, z: 0 }, dir: f, speed: 60,
        radius: 0.5, dmg: 28, life: 1, hitKind: 'plasma', hit: { push: 6, stun: 0.5, style: 'PLASMA', pts: 5 }, status: { name: 'shock', t: 1.5, data: {} },
      });
    },
    plasmaBeam(world, p) {
      const K = SO.Kit, eye = K.eye(p), f = K.fwd(p);
      const len = Math.min(28, world.raycast(eye, f, 28));
      for (const e of K.lineHits(world, eye, f, len, 1.1)) {
        K.hit(world, p, e, 62, { kind: 'plasma', push: 12, launch: 3, stun: 1, stop: 0.08, style: 'ANIQUILAÇÃO', pts: 12 });
        K.status(world, e, 'shock', 2, { pid: p.id, by: 'cw_plasma' });
      }
      world.emit('blast', { x: eye.x + f.x * len, y: eye.y + f.y * len, z: eye.z + f.z * len, r: 2.2, dmg: 50, crater: [1.2, 0.4], owner: 'player' });
      K.vfx(world, 'cw_plasma:beam', { pid: p.id, x: eye.x, y: eye.y, z: eye.z, dx: f.x, dy: f.y, dz: f.z, len });
    },
    iceSpikes(world, p) {
      const f = SO.forwardFlat(p.yaw, { x: 0, y: 0, z: 0 });
      effect(world, 'cw_icespikes', { pid: p.id, x: p.pos.x + f.x * 1.5, y: p.pos.y, z: p.pos.z + f.z * 1.5, dx: f.x, dz: f.z, n: 9, step: 1.4, dur: 1.4 });
    },
    gravWell(world, p) {
      const K = SO.Kit, f = SO.forwardFlat(p.yaw, { x: 0, y: 0, z: 0 });
      const x = p.pos.x + f.x * 3, z = p.pos.z + f.z * 3, y = K.groundAt(world, x, z, p.pos.y + 0.5);
      K.blast(world, p, { x, y: y + 0.5, z }, 2.6, 20, { kind: 'void', push: -4, stun: 0.8, falloff: 0.3, crater: [1.6, 0.5], style: 'GRAVIDADE', pts: 5 });
      effect(world, 'cw_well', { pid: p.id, x, y: y + 1, z, r: 6, force: 34, dur: 1.2, boom: 0 });
    },
    gravThrow(world, p) {
      const A = SO.Abilities, K = SO.Kit;
      if (A && !A.SPELL_END.cw_holeEnd) A.SPELL_END.cw_holeEnd = (w, q) => effect(w, 'cw_well', { pid: q.pid, x: q.pos.x, y: q.pos.y, z: q.pos.z, r: 8, force: 50, dur: 1.8, boom: 70 });
      const eye = K.eye(p), f = K.fwd(p);
      K.spell(world, p, {
        look: 'cw_grav_hole', pos: { x: eye.x + f.x * 1.2, y: eye.y - 0.2 + f.y * 1.2, z: eye.z + f.z * 1.2 }, vel: { x: 0, y: 0, z: 0 }, dir: f, speed: 22,
        radius: 0.8, dmg: 20, life: 0.8, hitKind: 'void', onEnd: 'cw_holeEnd', hit: { push: -4, stun: 0.6 },
      });
    },
    // hitscan bursts with a little spread; each bullet a tracer
    gunBurst(world, p, def) {
      const K = SO.Kit, eye = K.eye(p);
      const n = def.rounds || 3, shots = [];
      for (let i = 0; i < n; i++) {
        const f = K.fwd(p);
        f.x += (world.rng() - 0.5) * 0.06; f.y += (world.rng() - 0.5) * 0.05; f.z += (world.rng() - 0.5) * 0.06;
        SO.V.norm(f, f);
        const len = world.raycast(eye, f, 40);
        const hits = K.lineHits(world, eye, f, len, 0.35);
        if (hits.length) {
          const e = hits[0];
          K.hit(world, p, e, 9, { kind: 'bullet', push: 1.5, stun: 0.15, style: 'RAJADA', pts: 1.5 });
          const c = K.center(e); shots.push([c.x - eye.x, c.y - eye.y, c.z - eye.z, 1]);
        } else shots.push([f.x * len, f.y * len, f.z * len, 0]);
      }
      K.vfx(world, 'cw_bullets:burst', { pid: p.id, x: eye.x, y: eye.y, z: eye.z, shots });
    },
    gunStorm(world, p) {
      effect(world, 'cw_storm', { pid: p.id, dur: 0.8, x: p.pos.x, y: p.pos.y, z: p.pos.z });
    },
    lightJavelin(world, p) {
      const K = SO.Kit, eye = K.eye(p), f = K.fwd(p);
      K.spell(world, p, {
        look: 'cw_light_spear', pos: { x: eye.x + f.x * 1.2, y: eye.y - 0.1 + f.y * 1.2, z: eye.z + f.z * 1.2 }, vel: { x: 0, y: 0, z: 0 }, dir: f, speed: 58, grav: 3,
        radius: 0.5, dmg: 40, life: 2, hitKind: 'light', pierce: 2, explodeOnHit: false,
        explode: { r: 4.6, dmg: 60, falloff: 0.4, crater: [1.6, 0.5], opts: { push: 8, launch: 9, stun: 1, style: 'PILAR DE LUZ', pts: 12 } },
      });
    },
    // a shadow clone repeats the cut a beat later on what is in front
    shadowEcho(world, p) {
      const K = SO.Kit, f = SO.forwardFlat(p.yaw, { x: 0, y: 0, z: 0 });
      const at = { x: p.pos.x + f.x * 2.2, y: p.pos.y + 1, z: p.pos.z + f.z * 2.2 };
      effect(world, 'cw_echo', { pid: p.id, x: at.x, y: at.y, z: at.z, dx: f.x, dz: f.z, dur: 0.35 });
    },
    // two clones out of your shadow, dashing through the line ahead
    shadowDash(world, p) {
      const K = SO.Kit, f = SO.forwardFlat(p.yaw, { x: 0, y: 0, z: 0 }), r = { x: -f.z, y: 0, z: f.x };
      const lanes = [];
      for (const side of [-1, 1]) {
        const from = { x: p.pos.x + r.x * side * 1.2, y: p.pos.y, z: p.pos.z + r.z * side * 1.2 };
        const len = 10;
        for (const e of K.lineHits(world, { x: from.x, y: from.y + 1, z: from.z }, f, len, 1.4)) {
          K.hit(world, p, e, 28, { kind: 'shadow', push: 4, stun: 0.6, style: 'SOMBRA DUPLA', pts: 6 });
          K.status(world, e, 'blind', 1.2, { pid: p.id, by: 'cw_shadow' });
        }
        lanes.push([from.x, from.y, from.z, from.x + f.x * len, from.z + f.z * len]);
      }
      K.vfx(world, 'cw_shadow:dash', { pid: p.id, lanes });
    },
    windCrescent(world, p, def) {
      const K = SO.Kit, eye = K.eye(p), f = K.fwd(p);
      K.spell(world, p, {
        look: 'cw_wind_blade', pos: { x: eye.x + f.x * 1.3, y: eye.y - 0.25 + f.y * 1.3, z: eye.z + f.z * 1.3 }, vel: { x: 0, y: 0, z: 0 }, dir: f, speed: 36,
        radius: 1.3, dmg: 14, life: 0.55, pierce: true, hitKind: 'wind', hit: { push: 7, stun: 0.3, style: 'VENTO', pts: 3 }, roll: def.roll,
      });
    },
    windTornado(world, p) {
      const K = SO.Kit, pt = K.aimPoint(world, p, 22, 5);
      effect(world, 'cw_tornado', { pid: p.id, x: pt.x, y: pt.y, z: pt.z, r: 4.2, dur: 2.4 });
    },
    // flowers where the blow lands (a small healing patch)
    regenSeed(world, p) {
      const K = SO.Kit, f = SO.forwardFlat(p.yaw, { x: 0, y: 0, z: 0 });
      const x = p.pos.x + f.x * 2.6, z = p.pos.z + f.z * 2.6;
      effect(world, 'cw_flowers', { pid: p.id, x, y: K.groundAt(world, x, z, p.pos.y + 0.5), z, r: 1.6, heal: 5, n: 5, dur: 7 });
    },
    regenBloom(world, p) {
      const K = SO.Kit, f = SO.forwardFlat(p.yaw, { x: 0, y: 0, z: 0 });
      const x = p.pos.x + f.x * 3, z = p.pos.z + f.z * 3, y = K.groundAt(world, x, z, p.pos.y + 0.5);
      K.blast(world, p, { x, y: y + 0.5, z }, 3, 14, { kind: 'nature', push: 6, launch: 5, stun: 0.6, falloff: 0.3, scenery: false, style: 'FLORESCER', pts: 6 });
      effect(world, 'cw_flowers', { pid: p.id, x, y, z, r: 3, heal: 9, n: 12, dur: 9 });
    },
    regenField(world, p) {
      const K = SO.Kit;
      K.heal(world, p, 25);
      K.blast(world, p, { x: p.pos.x, y: p.pos.y + 0.5, z: p.pos.z }, 8, 26, { kind: 'nature', push: 10, launch: 7, stun: 0.9, falloff: 0.3, scenery: false, style: 'JARDIM ETERNO', pts: 12, status: 'slow', statusT: 3, by: 'cw_regen' });
      effect(world, 'cw_flowers', { pid: p.id, x: p.pos.x, y: K.groundAt(world, p.pos.x, p.pos.z, p.pos.y + 0.5), z: p.pos.z, r: 8, heal: 12, n: 40, dur: 12, field: 1 });
    },
    // the hammer's lightning jumps to the closest enemies
    thunderArc(world, p) {
      const K = SO.Kit, f = SO.forwardFlat(p.yaw, { x: 0, y: 0, z: 0 });
      const from = { x: p.pos.x + f.x * 2.5, y: p.pos.y + 1.1, z: p.pos.z + f.z * 2.5 };
      const first = K.nearest(world, from, 4);
      if (!first) return;
      const pts = K.chain(world, p, first, 3, 9, 14, { kind: 'thunder', status: 'shock', statusT: 1.2, by: 'cw_thunder', decay: 0.8, style: 'CORRENTE', pts: 3 });
      K.vfx(world, 'cw_thunder:arc', { x: from.x, y: from.y, z: from.z, pts });
    },
    thunderSlam(world, p) {
      const K = SO.Kit, f = SO.forwardFlat(p.yaw, { x: 0, y: 0, z: 0 });
      const x = p.pos.x + f.x * 3, z = p.pos.z + f.z * 3, y = K.groundAt(world, x, z, p.pos.y + 0.5);
      K.blast(world, p, { x, y: y + 0.5, z }, 3.8, 34, { kind: 'thunder', push: 8, launch: 8, stun: 1, falloff: 0.35, crater: [2, 0.6], status: 'shock', statusT: 1.5, by: 'cw_thunder', style: 'TROVÃO', pts: 8 });
      K.vfx(world, 'cw_thunder:strike', { x, y, z, big: 0 });
    },
    thunderCall(world, p) {
      const K = SO.Kit, pt = K.aimPoint(world, p, 36, 4);
      effect(world, 'cw_bolts', { pid: p.id, x: pt.x, y: pt.y, z: pt.z, dur: 0.9 });
    },
    nightCrescent(world, p) {
      const A = SO.Abilities, K = SO.Kit;
      if (A && !A.SPELL_HIT.cw_nightLeech) A.SPELL_HIT.cw_nightLeech = (w, q) => { const o = w.players[q.pid]; if (o) K.heal(w, o, 5); };
      const eye = K.eye(p), f = K.fwd(p);
      K.spell(world, p, {
        look: 'cw_night_wave', pos: { x: eye.x + f.x * 1.2, y: eye.y - 0.3 + f.y * 1.2, z: eye.z + f.z * 1.2 }, vel: { x: 0, y: 0, z: 0 }, dir: f, speed: 26,
        radius: 2, dmg: 32, life: 0.9, pierce: true, hitKind: 'dark', hit: { push: 4, stun: 0.6, style: 'NOITE', pts: 6 }, on: 'cw_nightLeech', status: { name: 'blind', t: 2.5, data: {} },
      });
    },
    elemPulse(world, p) {
      const K = SO.Kit, f = SO.forwardFlat(p.yaw, { x: 0, y: 0, z: 0 });
      const x = p.pos.x + f.x * 3, z = p.pos.z + f.z * 3, y = K.groundAt(world, x, z, p.pos.y + 0.5);
      K.blast(world, p, { x, y: y + 0.5, z }, 3.2, 20, { kind: 'elemental', push: 7, launch: 4, stun: 0.6, falloff: 0.3, crater: [1.4, 0.4], style: 'PRISMA', pts: 6 });
      K.vfx(world, 'cw_elem:pulse', { x, y, z });
    },
    // the four orbs fly to the aim one after another and burst, each with its element
    elemStorm(world, p) {
      const K = SO.Kit, eye = K.eye(p), pt = K.aimPoint(world, p, 34, 4);
      const els = [['fire', 'burn'], ['ice', 'freeze'], ['thunder', 'shock'], ['void', 'weak']];
      els.forEach(([el, st], i) => {
        const a = i / 4 * Math.PI * 2;
        const f = K.fwd(p); const from = { x: eye.x + f.x * 2 + Math.cos(a) * 0.8, y: eye.y + 0.4 + Math.sin(a) * 0.5, z: eye.z + f.z * 2 };
        const to = { x: pt.x + Math.cos(a) * 1.6, y: pt.y + 0.8, z: pt.z + Math.sin(a) * 1.6 };
        K.spell(world, p, {
          look: 'cw_elem_orb', variant: el, pos: from, vel: { x: 0, y: 0, z: 0 }, dir: SO.V.norm(SO.V.v(), { x: to.x - from.x, y: to.y - from.y, z: to.z - from.z }), speed: 34, delay: 0.1 + i * 0.1,
          radius: 0.6, dmg: 16, life: 2, hitKind: el, explodeOnHit: true,
          explode: { r: 3.4, dmg: 34, falloff: 0.4, crater: [1.3, 0.4], opts: { push: 7, launch: 5, stun: 0.7, status: st, statusT: 2.5, by: 'cw_elemental', style: 'CATACLISMO', pts: 6 } },
        });
      });
    },
    riftCut(world, p) {
      const f = SO.forwardFlat(p.yaw, { x: 0, y: 0, z: 0 });
      const x = p.pos.x + f.x * 1.5, z = p.pos.z + f.z * 1.5;
      effect(world, 'cw_rift', { pid: p.id, x, y: SO.Kit.groundAt(world, x, z, p.pos.y + 0.5), z, dx: f.x, dz: f.z, len: 11, dur: 1.1 });
    },
    // two crossed soul waves fly forward through everything
    soulCross(world, p) {
      const K = SO.Kit;
      const eye = K.eye(p), f = K.fwd(p);
      K.spell(world, p, {
        look: 'cw_souls_x', pos: { x: eye.x + f.x * 2.2, y: eye.y - 0.2 + f.y * 2.2, z: eye.z + f.z * 2.2 }, vel: { x: 0, y: 0, z: 0 }, dir: f, speed: 34,
        radius: 1.6, dmg: 38, life: 0.9, pierce: true, hitKind: 'soul', hit: { push: 6, stun: 0.6 },
      });
    },
  };

  SO.CHAR_WEAPONS = CW;
  SO.CharSpecials = SPECIALS;
  SO.weaponFor = weaponFor;
})(typeof window !== 'undefined' ? (window.SO = window.SO || {}) : (globalThis.SO = globalThis.SO || {}));
