// Game shell: fixed-timestep loop, menus/settings, and the event router that turns
// sim events into visuals, sound and HUD feedback (hitstop, shake, flashes, pops).
(function (SO) {
  'use strict';
  const T = THREE;
  const $ = (id) => document.getElementById(id);
  const STEP = SO.CFG.TICK;

  // ---------- settings ----------
  const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DEFAULTS = { school: 'souls', sens: 1, fov: 95, scale: 0.4, vol: 0.8, mus: 0.6, sfx: 0.9, shake: 1, calm: reduced, invert: false };
  let settings = Object.assign({}, DEFAULTS);
  try { const s = JSON.parse(localStorage.getItem('so-settings') || 'null'); if (s) settings = Object.assign(settings, s); } catch (e) { /* storage unavailable */ }
  function saveSettings() { try { localStorage.setItem('so-settings', JSON.stringify(settings)); } catch (e) { /* ignore */ } }

  const canvas = $('game');
  const input = new SO.Input(canvas);
  const audio = new SO.Audio();
  const renderer = new SO.Renderer(canvas, { fov: settings.fov, scale: settings.scale, shake: settings.shake, calm: settings.calm });
  // a toppled column or beam hitting the ground
  renderer.rubble.onImpact = (pos, vol) => audio.crumble(Math.min(1, vol / 12), Math.max(0, 1 - Math.hypot(pos.x - curPos.x, pos.z - curPos.z) / 40));
  const hud = new SO.HUD();
  audio.onBeat = () => renderer.onBeat();

  function applySettings() {
    input.sens = settings.sens;
    input.invertY = settings.invert;
    renderer.settings.fov = settings.fov;
    renderer.settings.scale = settings.scale;
    renderer.settings.shake = settings.shake;
    renderer.setCalm(settings.calm);
    renderer.resize();
    audio.vol.master = settings.vol; audio.vol.music = settings.mus; audio.vol.sfx = settings.sfx;
    audio.applyVolume();
  }
  applySettings();

  // ---------- state ----------
  let state = 'title';
  let session = null;
  let hitstop = 0, slowT = 0, acc = 0, deathT = 0;
  const prevPos = new T.Vector3(), curPos = new T.Vector3(), lerpPos = new T.Vector3();
  const titleDummy = { vel: { x: 0, y: 0, z: 0 }, sliding: false, hp: 100, maxHp: 100, weapon: 0, alt: null, crit: 0, grounded: true, slamming: false, dashTimer: 0, style: { rank: 2 } };

  function newGame() {
    if (session) session.close();
    renderer.clear();
    session = new SO.Net.LocalSession({ name: 'RONIN', school: schoolId() });
    const p = session.player;
    curPos.set(p.pos.x, p.pos.y, p.pos.z); prevPos.copy(curPos);
    input.reset();
    input.yaw = 0; input.pitch = -0.05;
    hud.reset();
    hitstop = 0; slowT = 0; acc = 0; deathT = 0; maxRank = 0;
    audio.setDomain(false);
  }

  function show(id, on) { $(id).hidden = !on; }
  function setState(s) {
    state = s;
    show('title', s === 'title');
    show('pause', s === 'paused');
    show('death', s === 'dead');
    show('hud', s === 'playing' || s === 'paused' || s === 'dying');
    show('warn', s === 'title');
    input.enabled = s === 'playing';
    renderer.vm.scene.visible = s !== 'title';
    canvas.style.cursor = s === 'playing' ? 'none' : 'default';
  }

  function play() {
    audio.init();
    audio.startMusic();
    newGame();
    setState('playing');
    input.lock();
  }
  function resume() { setState('playing'); input.lock(); }
  function pause() { if (state !== 'playing') return; setState('paused'); input.reset(); }
  function toMenu() { input.unlock(); setState('title'); }

  input.onUnlock = () => { if (state === 'playing') pause(); };
  // If the browser refuses to capture the mouse, pause instead of steering with a cursor that
  // stops at the window edge; clicking CONTINUAR asks again.
  input.onLockFail = () => { if (state === 'playing') pause(); };
  canvas.addEventListener('click', () => { if (state === 'playing' && !input.locked) input.lock(); });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && state === 'playing' && !input.locked) pause();
    if (e.code === 'KeyR' && (state === 'dead' || state === 'paused')) { e.preventDefault(); play(); }
    if (e.code === 'KeyT' && state === 'playing' && !e.repeat) { const cw = renderer.vm.inspect(); if (cw) audio.inspectWeapon(cw); else if (session.player.weapon === 0) setTimeout(() => audio.ok() && audio.metal(2600, 0.6, 0.07, { rev: 0.6 }), 1500); }
  });

  const playBtn = $('btnPlay');
  playBtn.onclick = play;
  playBtn.disabled = true;
  playBtn.textContent = '…';
  SO.models.load().catch((err) => console.warn('Inimigos 3D indisponíveis, usando sprites:', err)).finally(() => { playBtn.disabled = false; playBtn.textContent = '始 JOGAR'; });
  $('btnResume').onclick = resume;
  $('btnRestart').onclick = play;
  $('btnRetry').onclick = play;
  $('btnMenu').onclick = toMenu;
  $('btnMenu2').onclick = toMenu;

  // settings panel
  let settingsReturn = 'title';
  function openSettings() { settingsReturn = state; show('settings', true); syncSettingsUI(); }
  $('btnSettings').onclick = openSettings;
  $('btnSettings2').onclick = openSettings;
  $('btnCloseSettings').onclick = () => { show('settings', false); saveSettings(); };
  const bindRange = (id, out, key, fmt) => {
    const el = $(id);
    el.addEventListener('input', () => { settings[key] = Number(el.value); $(out).textContent = fmt(settings[key]); applySettings(); });
  };
  bindRange('sSens', 'oSens', 'sens', (v) => v.toFixed(2));
  bindRange('sFov', 'oFov', 'fov', (v) => v + '°');
  bindRange('sVol', 'oVol', 'vol', (v) => Math.round(v * 100) + '%');
  bindRange('sMus', 'oMus', 'mus', (v) => Math.round(v * 100) + '%');
  bindRange('sSfx', 'oSfx', 'sfx', (v) => Math.round(v * 100) + '%');
  bindRange('sShake', 'oShake', 'shake', (v) => Math.round(v * 100) + '%');
  $('sScale').addEventListener('change', (e) => { settings.scale = Number(e.target.value); applySettings(); });
  $('sCalm').addEventListener('change', (e) => { settings.calm = e.target.checked; applySettings(); });
  $('sInvert').addEventListener('change', (e) => { settings.invert = e.target.checked; applySettings(); });
  function syncSettingsUI() {
    const s = settings;
    $('sSens').value = s.sens; $('oSens').textContent = s.sens.toFixed(2);
    $('sFov').value = s.fov; $('oFov').textContent = s.fov + '°';
    $('sVol').value = s.vol; $('oVol').textContent = Math.round(s.vol * 100) + '%';
    $('sMus').value = s.mus; $('oMus').textContent = Math.round(s.mus * 100) + '%';
    $('sSfx').value = s.sfx; $('oSfx').textContent = Math.round(s.sfx * 100) + '%';
    $('sShake').value = s.shake; $('oShake').textContent = Math.round(s.shake * 100) + '%';
    $('sScale').value = String(s.scale);
    $('sCalm').checked = s.calm; $('sInvert').checked = s.invert;
  }

  // ---------- grimoire: choose the school (Q / R / G skills + F ultimate) ----------
  function schoolId() { return SO.Schools.BY_ID[settings.school] ? settings.school : SO.Schools.DEFAULT; }
  const hexc = (c) => '#' + c.toString(16).padStart(6, '0');
  let grimView = null;
  function renderGrimoire() {
    const cur = schoolId();
    if (!grimView) grimView = cur;
    const list = $('grimList');
    list.innerHTML = '';
    for (const s of SO.Schools.LIST) {
      const b = document.createElement('button');
      b.className = 'grim-school' + (s.id === cur ? ' used' : '') + (s.id === grimView ? ' sel' : '');
      b.style.setProperty('--pc', hexc(s.color));
      b.innerHTML = (SO.Icons ? SO.Icons.html(s.ult.id) : '') + '<span class="gk">' + s.jp + '</span><span class="gn">' + s.name + '</span>';
      b.onclick = () => { grimView = s.id; renderGrimoire(); };
      list.appendChild(b);
    }
    const s = SO.Schools.get(grimView);
    const det = $('grimSlots');
    det.style.setProperty('--pc', hexc(s.color));
    const card = (key, a, extra) => '<div class="grim-ab">' + (SO.Icons ? SO.Icons.html(a.id, 'big') : '') + '<div><kbd>' + key + '</kbd> <b>' + a.name + '</b><span class="gm">' + extra + '</span><p>' + a.desc + '</p></div></div>';
    det.innerHTML = '<div class="grim-head"><span class="gk">' + s.jp + '</span><div><h3>' + s.name + '</h3><span class="gm">' + s.tag + '</span></div>' +
      '<button id="grimPick" class="grim-pick">' + (s.id === cur ? '✓ ESCOLA ATUAL' : 'USAR ESTA ESCOLA') + '</button></div>' +
      s.skills.map((a, i) => card('QRG'[i], a, 'dano ' + a.dmg + ' · recarga ' + a.cd + ' s')).join('') +
      card('F', s.ult, 'ultimate · ' + s.ult.dur + ' s · dano ' + s.ult.dmg + ' · carrega com o estilo');
    $('grimPick').onclick = () => {
      settings.school = s.id; saveSettings();
      if (session && !session.player.ult) { session.player.school = s.id; session.player.skillCd = [0, 0, 0]; }
      renderGrimoire();
    };
  }
  function openGrimoire() { grimView = schoolId(); renderGrimoire(); show('grimoire', true); }
  $('btnGrimoire').onclick = openGrimoire;
  $('btnGrimoire2').onclick = openGrimoire;
  $('btnCloseGrim').onclick = () => show('grimoire', false);

  // ---------- event router ----------
  // Every effect uses the art palette only: ink, paper, wash, and blood (docs/ART.md).
  const C = SO.PAL;
  const tmpV = new T.Vector3();
  const KILL_KANJI = ['斬', '殺', '滅', '断', '散'];
  function eyePos() { return tmpV.set(curPos.x, curPos.y + SO.CFG.EYE, curPos.z); }
  function widx(id) { return id === 'katana' ? 0 : id === 'scythe' ? 1 : id === 'zanbato' ? 2 : -1; }
  function distTo(e) { const dx = e.x - curPos.x, dz = e.z - curPos.z; return Math.sqrt(dx * dx + dz * dz); }
  function stop(k) { hitstop = Math.min(0.16, Math.max(hitstop, k)); }

  function handle(e) {
    const fx = renderer.fx;
    const mine = e.pid === session.pid;
    switch (e.type) {
      case 'swing': {
        if (!mine) break;
        renderer.vm.play(e.anim, e.dur);
        if (e.cw) {
          // a character's own weapon: its own swing sound and its own slash in the world
          audio.cwSwing(e);
          const cwd = SO.CharWeapons && SO.CharWeapons.get(e.cw);
          if (cwd && cwd.swing) cwd.swing(renderer.afx, e, { eye: eyePos().clone(), yaw: input.yaw, pitch: input.pitch });
          if (e.heavy) renderer.addTrauma(0.14);
          break;
        }
        audio.swing(e.w, e.heavy);
        const roll = e.roll + (Math.random() - 0.5) * 16;
        const crit = session.player.crit > 0;
        fx.crescent(eyePos().clone().add(new T.Vector3(0, -0.15, 0)), input.yaw, input.pitch * 0.8, roll, e.range * 0.72, C.fx, Math.min(0.3, e.dur * 0.75), false, crit ? C.blood : C.fx);
        if (e.heavy) renderer.addTrauma(0.12);
        break;
      }
      case 'hit': {
        const w = widx(e.weapon);
        const dir = new T.Vector3(e.dx, e.dy + 0.3, e.dz);
        fx.blood(e.x, e.y, e.z, dir, e.dmg > 40 ? 1.8 : 1.1);
        const cwHit = e.weapon && String(e.weapon).slice(0, 3) === 'cw_' && SO.CharWeapons && SO.CharWeapons.get(String(e.weapon).slice(3));
        if (cwHit && cwHit.hit) { cwHit.hit(renderer.afx, e, input.yaw); audio.cwHit(e); }
        else {
          fx.burst(e.x, e.y, e.z, 8, 9, C.fx, 0.25, 0.25, 0, { dir });
          fx.crescent(new T.Vector3(e.x, e.y, e.z), input.yaw, 0, Math.random() * 360, 1.1 + Math.min(1.5, e.dmg / 50), C.fx, 0.16, false, C.blood);
          audio.hit(w < 0 ? 0 : w, e.crit, e, w === 2 || e.dmg > 50);
        }
        if (mine) {
          stop(e.stop || 0);
          renderer.addTrauma(0.05 + Math.min(0.25, e.dmg / 300));
          renderer.vm.hitKick(Math.min(1, e.dmg / 50));
          hud.hitmarker(e.crit ? 'crit' : null);
          if (e.crit) hud.pop('会心', 'crit');
        }
        break;
      }
      case 'kill': {
        const kv = renderer.views.kill(e.id, e);
        const dir = new T.Vector3(e.dx, e.dy, e.dz);
        if (kv && kv.billboard) fx.shatter(kv, dir);
        fx.gibs(e.x, e.y, e.z, e.big ? 40 : 16, C.fx, dir, e.big ? 14 : 9);
        fx.gibs(e.x, e.y, e.z, e.big ? 16 : 5, C.blood, dir, 10);
        fx.blood(e.x, e.y, e.z, dir, e.big ? 4.5 : 2.6);
        fx.burst(e.x, e.y, e.z, e.big ? 70 : 26, e.big ? 15 : 10, C.fx, 0.4, 0.45, 4);
        fx.ring(e.x, Math.max(0, e.y - 0.8), e.z, 0.5, e.big ? 9 : 4, C.fx, 0.35);
        audio.kill(e.big, e);
        if (mine) {
          stop(e.big ? 0.14 : 0.06);
          renderer.addTrauma(e.big ? 0.6 : 0.18);
          if (e.big) renderer.flashWhite(0.6);
          hud.hitmarker('kill');
          hud.pop(KILL_KANJI[Math.floor(Math.random() * KILL_KANJI.length)]);
          if (e.etype === 'ashura') { slowT = 1.6; hud.banner('成仏', 'ASHURA DERROTADO', 'boss', 2.8); }
        }
        break;
      }
      case 'parry':
        if (!mine) break;
        audio.parry();
        hud.pop('弾', 'parry');
        stop(0.13);
        renderer.flashInvert(0.12);
        renderer.addTrauma(0.3);
        fx.burst(e.x, e.y, e.z, 34, 12, C.fx, 0.35, 0.35, 0);
        fx.ring(e.x, e.y - 0.5, e.z, 0.3, 4, C.fx, 0.3);
        break;
      case 'dash':
        if (!mine) break;
        audio.dash();
        renderer.kickFov(9);
        for (let i = 0; i < 8; i++) fx.burst(e.x + (Math.random() - 0.5), e.y + 0.3 + Math.random() * 1.5, e.z + (Math.random() - 0.5), 1, 2, C.wash, 0.22, 0.3, 0, { dir: { x: -e.dx, y: 0, z: -e.dz } });
        break;
      case 'jump': if (mine) audio.jump(); break;
      case 'airJump':
        if (!mine) break;
        audio.airJump();
        fx.ring(e.x, e.y, e.z, 0.3, 2.2, C.fx, 0.25, 0.8);
        break;
      case 'wallJump':
        if (!mine) break;
        audio.wallJump();
        fx.burst(e.x, e.y + 1, e.z, 12, 5, C.wash, 0.22, 0.3, 4);
        break;
      case 'land':
        if (!mine) break;
        audio.land(e.vy);
        renderer.vm.land(e.vy);
        if (e.vy < -20) renderer.addTrauma(0.12);
        break;
      case 'slide': if (mine) audio.slide(); break;
      case 'slamStart': case 'meteorStart': if (mine) audio.dash(); break;
      case 'slam': {
        audio.slam(e.meteor, e);
        fx.ring(e.x, e.y, e.z, 0.5, e.r * 1.1, C.fx, e.meteor ? 0.6 : 0.4);
        fx.ripple(e.x, e.z, e.meteor ? 22 : 15);
        fx.burst(e.x, e.y + 0.2, e.z, e.meteor ? 80 : 30, e.meteor ? 16 : 9, C.fx, 0.35, 0.6, 12, { up: 6 });
        if (mine) {
          renderer.addTrauma(e.meteor ? 0.85 : 0.35);
          if (e.meteor) { renderer.flashWhite(0.5); renderer.vm.play('g_slam', 0.4); stop(0.08); }
        }
        break;
      }
      case 'slamJump': if (mine) { audio.airJump(); renderer.kickFov(10); } break;
      case 'pad': if (mine) { audio.pad(); renderer.kickFov(12); } fx.burst(e.x, 0.3, e.z, 30, 8, C.fx, 0.3, 0.6, 0, { up: 14 }); break;
      case 'iaidoCharge': if (mine) audio.iaidoCharge(); break;
      case 'iaido': {
        if (!mine) break;
        audio.iaido();
        renderer.vm.play('k_iaido', 0.45);
        renderer.kickFov(16);
        renderer.flashWhite(0.35);
        fx.line(e.fx, e.fy + 1.1, e.fz, e.tx, e.ty + 1.1, e.tz, 0.3, C.fx, 0.5);
        if (e.n > 0) hud.pop('居合', 'crit');
        break;
      }
      case 'iaidoCut': {
        audio.iaidoCut(e);
        const L = 4.5, a = e.a, b = a + Math.PI / 2 + (Math.random() - 0.5) * 0.6;
        fx.line(e.x - Math.cos(a) * L, e.y - Math.sin(a) * L * 0.6, e.z, e.x + Math.cos(a) * L, e.y + Math.sin(a) * L * 0.6, e.z, 0.14, C.fx, 0.5);
        fx.line(e.x, e.y - Math.sin(b) * L * 0.6, e.z - Math.cos(b) * L, e.x, e.y + Math.sin(b) * L * 0.6, e.z + Math.cos(b) * L, 0.1, C.blood, 0.5);
        break;
      }
      case 'getsuga':
        if (!mine) break;
        audio.getsuga();
        renderer.vm.cast('wave');
        renderer.vm.play(SO.WEAPONS[e.w].combo[0].anim, 0.3);
        renderer.addTrauma(0.1);
        renderer.kickFov(4);
        break;
      case 'blink':
        if (!mine) break;
        audio.blink();
        renderer.vm.cast('blink');
        renderer.kickFov(18);
        fx.line(e.fx, e.fy + 1, e.fz, e.tx, e.ty + 1, e.tz, 0.45, C.fx, 0.35);
        fx.burst(e.fx, e.fy + 1, e.fz, 24, 4, C.fx, 0.35, 0.5, 0);
        if (e.yaw != null) input.yaw = e.yaw;
        prevPos.set(e.tx, e.ty, e.tz); // snap interpolation so the camera doesn't sweep the map
        break;
      case 'weaponSwitch': if (mine) audio.unsheath(); break;
      case 'scytheThrow': if (mine) audio.swing(1, false); break;
      case 'scytheCatch': if (mine && audio.ok()) audio.sample('clash_3', { vol: 0.4, rate: 1.2 }); break;
      case 'playerHurt':
        if (!mine) break;
        audio.hurt();
        renderer.flashBlood(1);
        renderer.addTrauma(0.4);
        break;
      case 'playerDeath':
        if (!mine) break;
        slowT = 1.2;
        deathT = 1.1;
        state = 'dying';
        input.enabled = false;
        renderer.flashBlood(1);
        renderer.addTrauma(1);
        $('deathStats').innerHTML = `<span>波</span><b>${e.wave}</b><span>斬</span><b>${e.kills}</b><span>点</span><b>${e.score.toLocaleString('pt-BR')}</b><span>極</span><b>${SO.World.RANKS[maxRank].l}</b>`;
        break;
      case 'spawn':
        fx.ring(e.x, e.y, e.z, 0.2, e.boss ? 8 : 2.4, C.fx, 0.8);
        fx.burst(e.x, e.y + 0.4, e.z, e.boss ? 100 : 20, e.boss ? 10 : 4, C.fx, 0.35, 0.8, -3, { up: 4 });
        audio.spawn(e);
        if (e.boss) { hud.banner('阿修羅', 'ASHURA', 'boss', 2.6); renderer.addTrauma(0.5); }
        break;
      case 'enemyWindup': {
        const v = renderer.views.enemies[e.id];
        if (!v) break;
        // white star = what comes next can be parried; red star = get out of the way
        const parryable = e.etype !== 'brute' && e.etype !== 'tengu' && e.etype !== 'husk';
        fx.glint(v.root.position.x, v.root.position.y + v.headY, v.root.position.z, parryable ? 0xffffff : C.blood, v);
        audio.windup(v.root.position, e.etype === 'brute');
        break;
      }
      case 'enemyShoot': audio.enemyShoot(e); break;
      case 'enemyAttack': if (audio.ok()) audio.noise({ f: 500, f1: 1500, dur: 0.15, vol: 0.15, pos: curPos }); break;
      case 'bruteSmash': case 'bruteSlam':
        audio.ring(e);
        fx.ripple(e.x, e.z, 18);
        fx.burst(e.x, e.y + 0.3, e.z, 36, 8, C.fx, 0.35, 0.6, 10, { up: 5 });
        renderer.addTrauma(Math.max(0, 0.5 - distTo(e) * 0.02));
        break;
      case 'tenguCrash': fx.burst(e.x, e.y + 0.3, e.z, 18, 6, C.fx, 0.3, 0.4, 10); audio.land(-25); break;
      case 'block':
        fx.burst(e.x, e.y, e.z, 16, 9, C.fx, 0.22, 0.25, 6);
        fx.glint(e.x, e.y, e.z, 0xffffff);
        if (audio.ok()) audio.metal(900, 0.35, 0.12, { pos: e });
        if (e.pid === session.pid) { hud.pop('防', 'parry'); stop(0.04); }
        break;
      case 'summon':
        fx.ring(e.x, 0, e.z, 0.3, 5, C.fx, 0.6);
        fx.burst(e.x, e.y, e.z, 26, 5, C.fx, 0.35, 0.6, -3, { up: 3 });
        audio.bossWindup(e);
        break;
      case 'enemyDodge':
        fx.burst(e.x, e.y, e.z, 12, 4, C.wash, 0.3, 0.3, 0);
        audio.dash();
        break;
      case 'stagger': fx.glint(e.x, e.y + 1, e.z, 0xffffff); hud.pop('崩', 'crit'); break;
      case 'bossWindup': audio.bossWindup(e); break;
      case 'bossAttack': if (e.attack === 'ring' || e.attack === 'summon') fx.ring(e.x, 0, e.z, 1, 12, C.blood, 0.6); break;
      case 'boxHit': renderer.arenaEvent(e); break;
      case 'boxBreak': {
        const size = renderer.arenaEvent(e);
        const near = Math.max(0, 1 - Math.hypot(e.x - curPos.x, e.z - curPos.z) / 40);
        renderer.addTrauma(Math.min(0.5, 0.06 + size * 0.004) * near);
        audio.crumble(Math.min(1, size / 40), near);
        break;
      }
      case 'crater': {
        const size = renderer.arenaEvent(e);
        const near = Math.max(0, 1 - Math.hypot(e.x - curPos.x, e.z - curPos.z) / 45);
        renderer.addTrauma(Math.min(0.6, 0.05 + size * 0.01) * near);
        audio.crumble(Math.min(1, size / 25), near);
        break;
      }
      case 'arenaRestore': renderer.arenaEvent(e); if (audio.ok()) audio.tone({ f0: 220, f1: 440, dur: 0.6, vol: 0.05, type: 'triangle' }); break;
      case 'explosion':
        audio.explosion(e);
        fx.blood(e.x, e.y, e.z, null, 2);
        fx.burst(e.x, e.y, e.z, 50, 12, C.fx, 0.4, 0.5, 0);
        fx.ring(e.x, Math.max(0, e.y - 1), e.z, 0.5, e.r * 1.4, C.blood, 0.4);
        renderer.addTrauma(0.2);
        break;
      case 'projEnd':
        if (e.reason === 'wall' || e.reason === 'expire') fx.burst(e.x, e.y, e.z, 8, 4, C.fx, 0.28, 0.3, 0);
        break;
      case 'waveStart':
        hud.banner('第' + SO.HUD.kanjiNumber(e.wave) + '波', e.boss ? '阿修羅' : '', e.boss ? 'boss' : null, 1.8);
        audio.waveStart(e.boss);
        break;
      case 'waveClear':
        hud.banner('浄化', '', 'clear', 2.0);
        slowT = Math.max(slowT, 0.7);
        break;
      // ----- school abilities (sim/abilities-*.js; visuals render/afx/*.js; sounds audio/abilitysfx.js) -----
      case 'ability': {
        renderer.afx.event(e, mine);
        audio.ability(e, mine);
        if (mine) { renderer.vm.cast(e.id); const s = SO.Schools.get(e.school); hud.pop(s.jp, 'power', s.color); }
        break;
      }
      case 'ultStart': {
        renderer.afx.event(e, mine);
        audio.ultStart(e, mine);
        if (mine) { renderer.vm.cast(e.id); const s = SO.Schools.get(e.school); hud.banner(s.jp + ' 奥義', e.name.toUpperCase(), 'domain', 2.4); stop(0.08); }
        break;
      }
      case 'ultEnd': renderer.afx.event(e, mine); audio.ultEnd(e, mine); break;
      case 'vfx': renderer.afx.event(e, mine); audio.vfx(e, mine); break;
      case 'spellLaunch': renderer.afx.event(e, mine); audio.spellLaunch(e); break;
      case 'projEnd': if (e.look) { renderer.afx.event(e, mine); audio.spellEnd(e); } break;
      case 'statusEnd': renderer.afx.event(e, mine); break;
      case 'status': audio.status(e); break;
      case 'allySpawn': case 'allyAttack': case 'allyEnd': case 'allyHurt': case 'allyBlock': renderer.afx.event(e, mine); audio.ally(e); break;
      case 'reaction': renderer.afx.event(Object.assign({}, e, { type: 'vfx', k: 'reaction:' + e.k }), mine); audio.vfx({ k: 'reaction:' + e.k, x: e.x, y: e.y, z: e.z }); break;
      case 'absorb': if (mine) { renderer.addTrauma(0.1); audio.absorb(); } break;
      case 'powerFail': if (mine) { audio.powerFail(); hud.denied(e.id, e.slot); } break;
      case 'rankUp': if (mine) audio.rankUp(e.rank); break;
      case 'style': if (mine) hud.styleEvent(e.name, e.pts, e.fresh); break;
      default: break;
    }
  }

  // ---------- loop ----------
  let maxRank = 0;
  function tickOnce() {
    const p = session.player;
    input.currentWeapon = p.weapon;
    session.submit(input.buildCommand());
    prevPos.copy(curPos);
    const events = session.tick(STEP);
    curPos.set(p.pos.x, p.pos.y, p.pos.z);
    for (let i = 0; i < events.length; i++) handle(events[i]);
    renderer.views.capture(session.world, session.pid);
    if (p.style.rank > maxRank) maxRank = p.style.rank;
  }

  let last = performance.now();
  let titleT = 0;
  let stepDist = 0;
  let debugTimeScale = 1;
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.1) dt = 0.1;
    dt *= debugTimeScale; // 1 in play; slowed down by automated visual tests

    if (state === 'title' || !session) {
      titleT += dt;
      const a = titleT * 0.08;
      lerpPos.set(Math.cos(a) * 31, 7.5, Math.sin(a) * 31);
      const yaw = Math.atan2(lerpPos.x, lerpPos.z);
      audio.intensity = 0.25;
      renderer.update(dt, { player: titleDummy, pos: lerpPos, yaw, pitch: 0.02, moveX: 0, frozen: false, look: { dx: 0, dy: 0 }, rank: 2, domain: false, alpha: 1 });
      renderer.render();
      return;
    }

    const world = session.world;
    const p = session.player;
    let frozen = state !== 'playing' && state !== 'dying';
    if (!frozen) {
      if (hitstop > 0) { hitstop -= dt; frozen = true; }
      else {
        const scale = slowT > 0 ? 0.3 : 1;
        if (slowT > 0) slowT -= dt;
        acc += dt * scale;
        let n = 0;
        while (acc >= STEP && n < 6) {
          tickOnce();
          acc -= STEP; n++;
          if (hitstop > 0) { acc = 0; break; }
        }
        if (n >= 6) acc = 0;
      }
    }
    if (state === 'dying') {
      deathT -= dt;
      if (deathT <= 0) { input.unlock(); setState('dead'); }
    }

    const alpha = SO.clamp(acc / STEP, 0, 1);
    lerpPos.lerpVectors(prevPos, curPos, alpha);
    audio.listener.x = curPos.x; audio.listener.z = curPos.z; audio.listener.yaw = input.yaw;
    // footsteps: one per stride on the ground (not while sliding)
    if (!frozen && p.grounded && !p.sliding && !p.dead) {
      const sp = Math.hypot(p.vel.x, p.vel.z);
      stepDist += sp * dt;
      if (stepDist > 2.2 + sp * 0.12 && sp > 2) { stepDist = 0; audio.footstep(sp); } // longer strides when running fast
    }
    audio.intensity = SO.clamp(0.35 + p.style.rank * 0.1 + (world.enemyCount() > 0 ? 0.15 : 0), 0, 1);
    const k = input.keys;
    renderer.update(dt, {
      player: p, pos: lerpPos, yaw: input.yaw, pitch: input.pitch,
      moveX: (k.KeyD ? 1 : 0) - (k.KeyA ? 1 : 0), frozen, look: input.consumeLook(),
      rank: p.style.rank, domain: false, alpha, ets: world.enemyTimeScale(), world,
    });
    hud.update(dt, world, p);
    renderer.render();
  }

  setState('title');
  requestAnimationFrame(frame);

  // Exposed for debugging and automated smoke tests.
  SO.game = { get session() { return session; }, get state() { return state; }, input, renderer, audio, play, setState, set timeScale(k) { debugTimeScale = k; }, get timeScale() { return debugTimeScale; } };
})(window.SO = window.SO || {});
