// DOM HUD: vitals, loadout, style meter, wave counter in kanji numerals, banners and pops.
(function (SO) {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const KN = ['', '一', '二', '三', '四', '五', '六', '七', '八', '九'];

  function kanjiNumber(n) {
    if (n <= 0) return '零';
    if (n < 10) return KN[n];
    if (n < 100) { const t = Math.floor(n / 10), o = n % 10; return (t > 1 ? KN[t] : '') + '十' + KN[o]; }
    return String(n);
  }

  class HUD {
    constructor() {
      this.el = {
        hud: $('hud'), cross: $('crosshair'), charge: $('charge'), chargeFill: $('charge').firstElementChild,
        waveKanji: $('waveKanji'), remain: $('remain'),
        boss: $('boss'), bossFill: $('bossFill'), score: $('scoreVal'),
        style: $('style'), rankLetter: $('rankLetter'), rankFill: $('rankFill'), feed: $('feed'),
        vitals: $('vitals'), hpText: $('hpText'), hpFill: $('hpFill'), enFill: $('enFill'), dash: $('dash').querySelectorAll('i'),
        weapons: $('weapons'), powers: $('powers'),
        banner: $('banner'), bannerBig: $('bannerBig'), bannerSmall: $('bannerSmall'), pops: $('pops'),
      };
      this.buildWeapons();
      this.cache = {};
      this.feedItems = [];
      this.bannerT = 0;
      this.crossT = 0;
      this.lastRank = 0;
    }

    // slot 1 shows the character's own weapon when the school has one
    buildWeapons(school) {
      const w = this.el.weapons;
      w.innerHTML = '';
      this.wpEls = SO.WEAPONS.map((d0, i) => {
        const def = SO.weaponFor && school ? SO.weaponFor({ school }, i) : d0;
        const d = document.createElement('div');
        d.className = 'wp';
        d.innerHTML = `<kbd>${i + 1}</kbd>${def.jp}`;
        d.title = def.name;
        w.appendChild(d);
        return d;
      });

    }

    set(key, el, prop, val) {
      if (this.cache[key] === val) return;
      this.cache[key] = val;
      if (prop === 'text') el.textContent = val; else if (prop === 'width') el.style.width = val; else el.setAttribute(prop, val);
    }

    reset() {
      this.cache = {};
      this.el.feed.innerHTML = '';
      this.feedItems = [];
      this.el.boss.hidden = true;
      this.schoolKey = null;
      this.el.banner.classList.remove('on');
    }

    update(dt, world, p, extra) {
      const el = this.el;
      const d = world.director;
      this.set('wk', el.waveKanji, 'text', '第' + kanjiNumber(Math.max(1, d.wave)) + '波');
      const rem = SO.Waves.remaining(world, d);
      this.set('rm', el.remain, 'text', d.state === 'fight' ? '残 ' + rem : '…');
      this.set('sc', el.score, 'text', p.score.toLocaleString('pt-BR'));

      const hp = Math.max(0, Math.round(p.hp));
      this.set('hp', el.hpText, 'text', String(hp));
      this.set('hpw', el.hpFill, 'width', (p.hp / p.maxHp * 100).toFixed(1) + '%');
      el.vitals.classList.toggle('low', p.hp < 30);
      this.set('en', el.enFill, 'width', p.energy.toFixed(1) + '%');
      for (let i = 0; i < 3; i++) el.dash[i].classList.toggle('off', i >= p.dashCharges);

      this.wpEls.forEach((w, i) => w.classList.toggle('on', i === p.weapon));

      // power slots: the school's skills on Q / R / G, E teleport, F the school's ultimate
      if (this.schoolKey !== p.school) { this.buildPowers(p.school); this.buildWeapons(p.school); this.schoolKey = p.school; }
      const P = SO.POWERS;
      const school = SO.Schools.get(p.school);
      for (const sl of this.powerSlots) {
        let cd = 0, cdMax = 1, ready;
        if (sl.slot === 'E') { cd = Math.max(0, p.blinkCd); cdMax = P.blink.cd; ready = (p.energy >= P.blink.cost && cd <= 0) || !!p.buffs.voidwalk; }
        else if (sl.slot === 3) {
          ready = !p.ult && p.overdrive >= 100;
          sl.bar.style.width = (p.ult ? (1 - p.ult.t / p.ult.dur) * 100 : Math.floor(p.overdrive)) + '%';
          sl.el.classList.toggle('active', !!p.ult);
        } else { cd = p.skillCd[sl.slot] || 0; cdMax = school.skills[sl.slot].cd; ready = cd <= 0; }
        sl.el.classList.toggle('off', !ready && !(sl.slot === 3 && p.ult));
        sl.el.classList.toggle('ready', ready);
        sl.cd.style.height = (SO.clamp(cd / cdMax, 0, 1) * 100).toFixed(0) + '%';
        if (sl.num) sl.num.textContent = cd > 0 ? (cd >= 10 ? Math.ceil(cd) : cd.toFixed(1)) : '';
      }
      const st = p.style;
      const R = SO.World.RANKS[st.rank];
      this.set('rl', el.rankLetter, 'text', R.l);
      this.set('rf', el.rankFill, 'width', SO.clamp(st.gauge, 0, 100).toFixed(1) + '%');
      this.set('rk', el.style, 'data-rank', String(st.rank));
      if (st.rank > this.lastRank) { el.rankLetter.classList.remove('bump'); void el.rankLetter.offsetWidth; el.rankLetter.classList.add('bump'); }
      this.lastRank = st.rank;

      // boss bar
      let boss = null;
      for (const k in world.enemies) if (world.enemies[k].def.boss) boss = world.enemies[k];
      el.boss.hidden = !boss;
      if (boss) this.set('bf', el.bossFill, 'width', (Math.max(0, boss.hp) / boss.maxHp * 100).toFixed(1) + '%');

      // iaido charge bar + crit marker
      const charging = p.alt && p.alt.kind === 'iaido';
      el.charge.classList.toggle('on', !!charging);
      if (charging) { el.chargeFill.style.width = (p.alt.charge * 100) + '%'; el.charge.classList.toggle('full', p.alt.charge >= 1); }
      el.cross.classList.toggle('crit-ready', p.crit > 0);

      // timers
      this.crossT -= dt;
      if (this.crossT <= 0) el.cross.classList.remove('hit', 'crit', 'kill');
      if (this.bannerT > 0) { this.bannerT -= dt; if (this.bannerT <= 0) el.banner.classList.remove('on'); }
      const now = performance.now();
      for (let i = this.feedItems.length - 1; i >= 0; i--) {
        const f = this.feedItems[i];
        const age = (now - f.t) / 1000;
        if (age > 3.2) { f.el.remove(); this.feedItems.splice(i, 1); }
        else if (age > 2.6) f.el.classList.add('old');
      }
    }

    styleEvent(name, pts, fresh) {
      const li = document.createElement('li');
      li.innerHTML = `+ ${name}<b>${pts}</b>`;
      if (!fresh) li.classList.add('stale');
      this.el.feed.prepend(li);
      this.feedItems.push({ el: li, t: performance.now() });
      while (this.feedItems.length > 7) { const f = this.feedItems.shift(); f.el.remove(); }
    }

    hitmarker(kind) {
      const c = this.el.cross;
      c.classList.remove('hit', 'crit', 'kill');
      void c.offsetWidth;
      c.classList.add('hit');
      if (kind) c.classList.add(kind);
      this.crossT = 0.12;
    }

    banner(big, small, cls, dur) {
      const b = this.el.banner;
      b.className = '';
      if (cls) b.classList.add(cls);
      this.el.bannerBig.textContent = big;
      this.el.bannerSmall.textContent = small || '';
      void b.offsetWidth;
      b.classList.add('on');
      this.bannerT = dur || 1.6;
    }

    buildPowers(schoolId) {
      const hex = (c) => '#' + c.toString(16).padStart(6, '0');
      const school = SO.Schools.get(schoolId);
      const slots = [
        { key: 'Q', slot: 0, a: school.skills[0] }, { key: 'R', slot: 1, a: school.skills[1] }, { key: 'G', slot: 2, a: school.skills[2] },
        { key: 'E', slot: 'E', label: '瞬歩', title: 'Shunpo (teleporte básico)', color: 0xb070ff },
        { key: 'F', slot: 3, a: school.ult },
      ];
      this.el.powers.innerHTML = '';
      this.powerSlots = slots.map((s) => {
        const el = document.createElement('div');
        el.className = 'pw' + (s.slot === 3 ? ' ult' : '');
        el.style.setProperty('--pc', hex(s.a ? school.color : s.color));
        el.title = s.a ? s.a.name + ' — ' + s.a.desc : s.title;
        const icon = s.a && SO.Icons ? SO.Icons.html(s.a.id) : '';
        const label = s.a ? (s.slot === 3 ? school.jp : String(s.slot + 1)) : s.label;
        el.innerHTML = '<kbd>' + s.key + '</kbd>' + (icon || '<span class="pj">' + label + '</span>') + '<div class="cd"></div><span class="num"></span>' + (s.slot === 3 ? '<div class="od"><div></div></div>' : '');
        this.el.powers.appendChild(el);
        return { slot: s.slot, id: s.a ? s.a.id : 'blink', el, cd: el.querySelector('.cd'), num: el.querySelector('.num'), bar: el.querySelector('.od div') };
      });
    }

    // brief shake on a slot when a power can't be used (cooldown or energy)
    denied(id, slot) {
      const sl = (this.powerSlots || []).find((s) => s.id === id || (slot != null && s.slot === slot));
      if (!sl) return;
      sl.el.classList.remove('deny'); void sl.el.offsetWidth; sl.el.classList.add('deny');
    }

    pop(text, cls, color) {
      const d = document.createElement('div');
      d.className = 'pop' + (cls ? ' ' + cls : '');
      if (color != null) d.style.color = '#' + color.toString(16).padStart(6, '0');
      d.textContent = text;
      d.style.left = (46 + (Math.random() - 0.5) * 16) + '%';
      d.style.top = (38 + (Math.random() - 0.5) * 12) + '%';
      this.el.pops.appendChild(d);
      setTimeout(() => d.remove(), 750);
    }
  }

  SO.HUD = HUD;
  SO.HUD.kanjiNumber = kanjiNumber;
})(window.SO = window.SO || {});
