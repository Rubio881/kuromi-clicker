/* =====================================================================
   Kuromi Clicker — game.js
   Engine, UI and save system. All tunable numbers live in data.js (window.KD).
   ===================================================================== */
(() => {
  'use strict';

  const D = window.KD;
  const C = D.CONFIG;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const byId = list => Object.fromEntries(list.map(x => [x.id, x]));
  const B_BY_ID = byId(D.BUILDINGS);
  const U_BY_ID = byId(D.UPGRADES);
  const A_BY_ID = byId(D.ACHIEVEMENTS);
  const P_BY_ID = byId(D.DREAM_PERKS);
  const SKIN_BY_ID = byId(D.SKINS);
  const SAVE_KEY = 'kuromiClicker.save';
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII'];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const rand = (a, b) => a + Math.random() * (b - a);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* =====================================================================
     Number formatting
     ===================================================================== */
  function sci(n) { return n.toExponential(2).replace('e+', 'e'); }

  // 999 → "999", 83.25 → "83.3" (decimals only below 1,000), 1234 → "1.23K", 4.56e6 → "4.56M" … Dc, then scientific.
  function fmt(n, decimals = 0) {
    if (n === Infinity) return '∞';
    if (!Number.isFinite(n)) return '0';
    if (n < 0) return '-' + fmt(-n, decimals);
    if (n < 1000) {
      if (!decimals) return String(Math.floor(n + 1e-9));
      return String(+n.toFixed(decimals));
    }
    if (state && state.settings.numberFormat === 'sci') return sci(n);
    let tier = Math.floor(Math.log10(n) / 3);
    let v = n / Math.pow(1000, tier);
    if (v >= 1000) { tier++; v /= 1000; }
    if (tier >= D.NUMBER_SUFFIXES.length) return sci(n);
    const dp = v < 10 ? 2 : v < 100 ? 1 : 0;
    const p = Math.pow(10, dp);
    v = Math.floor(v * p + 1e-6) / p; // floor, so we never show more than you have
    return v.toFixed(dp) + D.NUMBER_SUFFIXES[tier];
  }

  function fmtTime(sec) {
    sec = Math.max(0, Math.floor(sec));
    const d = Math.floor(sec / 86400), h = Math.floor(sec % 86400 / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    if (d) return `${d}d ${h}h`;
    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m ${s}s`;
    return `${s}s`;
  }

  /* =====================================================================
     State
     ===================================================================== */
  let state = null;
  const owned = { upg: new Set(), ach: new Set(), perk: new Set() };
  const hasUpg = id => owned.upg.has(id);
  const hasPerk = id => owned.perk.has(id);

  function freshState() {
    const now = Date.now();
    return {
      version: D.SAVE_VERSION,
      kuromis: 0,
      runEarned: 0,          // earned since the last Wake Up
      allTimeEarned: 0,      // earned across every run (drives prestige)
      handmadeRun: 0, handmadeTotal: 0,
      clicksRun: 0, clicksTotal: 0,
      buildings: Object.fromEntries(D.BUILDINGS.map(b => [b.id, 0])),
      revealed: {},
      upgrades: [],
      achievements: [],
      shardsEarned: 0, shardsSpent: 0,
      perks: [],
      prestiges: 0,
      burstsClicked: 0,
      buffs: [],             // { type, left, total }
      burstTimer: rand(C.burstMinDelay, C.burstMaxDelay),
      titleClicks: 0,
      soldBaku: false,
      combos: 0, crits: 0,
      daily: { last: '', streak: 0, claims: 0 },   // last = local 'YYYY-MM-DD' of the last gift opened
      event: {
        cakes: 0, earned: 0, combos: 0, played: false,
        treats: 0, treatsTotal: 0, tbursts: 0, tricked: 0,   // Treats 🍬 (kept in the save between years)
        owned: [], costume: '', tickerFont: false, batCursor: false, // shop purchases + what's equipped
        greeted: '', bdayCostume: false,
      },
      timePlayed: 0, bestCps: 0,
      statsOpened: false, musicPlayed: false,
      skinsUnlocked: ['default'],
      settings: {
        particles: true, floaters: true, sound: false, haptics: true, numberFormat: 'short', theme: 'default',
        music: false, sfxVolume: C.audio.sfxVolume, musicVolume: C.audio.musicVolume, eventOverride: 'auto',
      },
      startedAt: now, runStartedAt: now, lastSaved: now,
    };
  }

  function syncSets() {
    owned.upg = new Set(state.upgrades);
    owned.ach = new Set(state.achievements);
    owned.perk = new Set(state.perks);
  }

  /* =====================================================================
     Production — cached, recomputed only when something changes
     ===================================================================== */
  let dirty = true;
  const cache = { cps: 0, cpsNoBuff: 0, click: 1, bMult: {}, bCps: {}, allMult: 1, pinkyPct: 0, globalMult: 1, shardMult: 1, prodBuff: 1, clickBuff: 1 };

  function buffMult(kind) {
    let m = 1;
    for (const bf of state.buffs) {
      if (kind === 'prod' && bf.type === 'frenzy') m *= C.frenzy.mult;
      if (kind === 'prod' && bf.type === 'cake') m *= EV.cake.mult;
      if (kind === 'click' && bf.type === 'mischief') m *= C.mischief.mult;
      if (kind === 'click' && bf.type === 'combo') m *= C.combo.mult;
      if (kind === 'prod' && bf.type === 'trick') m *= EV.trick.prodMult;
      if (kind === 'prod' && bf.type === 'haunted') m *= SHOP_BY_ID.boost_haunted.mult;
      if (kind === 'click' && bf.type === 'sugar') m *= SHOP_BY_ID.boost_sugar.mult;
    }
    return m;
  }

  /* ---------------------------------------------------------------------
     THE PRODUCTION FORMULA (single source of truth)

       total = Σ_b ( baseCps_b × count_b × tierMult_b × synergyMult_b )
               × globalMult                          Π (1 + Gang Loyalty %)
               × (1 + achievements × pinkyBonus)     pinkyBonus = 4% × Σ k (Pinky Promise upgrades)
               × (1 + dreamShards × 1%)              prestige
               × (1 + Birthday Wish 5%)              event shop, permanent
               × buffMult                            Frenzy ×7, Cake ×13, Trick ×3, Haunted Lair ×1.5 …

     tierMult_b    = 2 ^ (tier upgrades bought for b)
     synergyMult_b = 1 + Σ (pct × count of the partner building)

     Click power   = (clickBase × 2^doublers + total × Σ cpsPct) × clickBuff
     --------------------------------------------------------------------- */
  function computeProduction() {
    const tierMult = {}, synPct = {};
    let globalMult = 1, pinkyK = 0, doublers = 0, clickPct = 0;
    for (const b of D.BUILDINGS) { tierMult[b.id] = 1; synPct[b.id] = 0; }

    for (const id of owned.upg) {
      const u = U_BY_ID[id];
      if (!u) continue;
      switch (u.type) {
        case 'tier': tierMult[u.building] *= 2; break;
        case 'synergy': for (const e of u.effects) synPct[e.target] += e.pct * state.buildings[e.per]; break;
        case 'global': globalMult *= 1 + u.pct; break;
        case 'pinky': pinkyK += u.k; break;
        case 'click': if (u.double) doublers++; if (u.cpsPct) clickPct += u.cpsPct; break;
      }
    }

    const pinkyBonus = C.pinkyPerAchievement * pinkyK;
    const pinkyMult = 1 + owned.ach.size * pinkyBonus;
    const shardMult = 1 + state.shardsEarned * C.shardBonus;
    const prodBuff = buffMult('prod');
    const wishMult = 1 + (evOwns('wish') ? SHOP_BY_ID.wish.pct : 0);
    const allNoBuff = globalMult * pinkyMult * shardMult * wishMult;
    const all = allNoBuff * prodBuff;

    let raw = 0;
    for (const b of D.BUILDINGS) {
      const m = tierMult[b.id] * (1 + synPct[b.id]);
      const r = b.baseCps * state.buildings[b.id] * m;
      cache.bMult[b.id] = m;
      cache.bCps[b.id] = r * all;
      raw += r;
    }

    cache.cpsNoBuff = raw * allNoBuff;
    cache.cps = raw * all;
    cache.allMult = all;
    cache.globalMult = globalMult;
    cache.pinkyPct = owned.ach.size * pinkyBonus;
    cache.pinkyUpgMult = pinkyK;
    cache.shardMult = shardMult;
    cache.prodBuff = prodBuff;
    cache.clickBuff = buffMult('click');
    cache.click = (C.clickBase * Math.pow(2, doublers) + cache.cps * clickPct) * cache.clickBuff;
    dirty = false;
  }
  const recalc = () => computeProduction();
  const hasBuff = type => state.buffs.some(b => b.type === type);

  function earn(x) {
    if (!(x > 0)) return;
    state.kuromis += x;
    state.runEarned += x;
    state.allTimeEarned += x;
    if (eventOn) state.event.earned += x;
  }

  /* =====================================================================
     Calendar: daily gift + limited events use the device's local date.
     `clock.offset` lets the debug panel / tests pretend it's another day.
     ===================================================================== */
  const EV = D.EVENT, SD = D.EVENT.specialDay;
  const SHOP_BY_ID = byId(EV.shop);
  const COSTUMES = EV.shop.filter(i => i.kind === 'costume');
  const clock = { offset: 0, now: () => new Date(Date.now() + clock.offset) };
  const pad2 = n => String(n).padStart(2, '0');
  const dayKey = d => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  function inEventWindow(d, ev = EV) {
    const v = (d.getMonth() + 1) * 100 + d.getDate();
    const a = ev.start[0] * 100 + ev.start[1], b = ev.end[0] * 100 + ev.end[1];
    return a <= b ? v >= a && v <= b : v >= a || v <= b; // handles windows that wrap past New Year
  }
  // eventOverride (debug panel): 'auto' (device date) · 'on' (event, not Birthday Day) · 'birthday' · 'off'
  function eventActive() {
    const o = state.settings.eventOverride;
    if (o === 'on' || o === 'birthday') return true;
    if (o === 'off') return false;
    return inEventWindow(clock.now());
  }
  function onSpecialDay() {
    const o = state.settings.eventOverride;
    if (o === 'birthday') return true;
    if (o === 'on' || o === 'off') return false;
    const d = clock.now();
    return inEventWindow(d) && d.getMonth() + 1 === SD.date[0] && d.getDate() === SD.date[1];
  }
  // When does the current (or next) event window end? Local midnight after the last day.
  function eventEndsAt() {
    const n = clock.now();
    for (const y of [n.getFullYear() - 1, n.getFullYear(), n.getFullYear() + 1]) {
      const endYear = EV.end[0] < EV.start[0] ? y + 1 : y;
      const end = new Date(endYear, EV.end[0] - 1, EV.end[1] + 1);
      if (end > n) return end;
    }
    return null;
  }
  const evOwns = id => state.event.owned.includes(id);
  const hasEventStuff = () => state.event.treatsTotal > 0 || state.event.owned.length > 0;
  let eventOn = false, bdayOn = false; // cached each slow tick

  /* =====================================================================
     Time — production uses real elapsed time, so throttled tabs stay correct
     ===================================================================== */
  let lastT = performance.now();
  let debugSpeed = 1;

  function advance(dt) {
    if (!(dt > 0)) return;
    const total = dt;
    // Split the step at buff expiry so Frenzy never over-pays across a long gap.
    let guard = 0;
    while (dt > 1e-9 && guard++ < 50) {
      const before = state.buffs.length;
      state.buffs = state.buffs.filter(b => b.left > 1e-9);
      if (state.buffs.length !== before) dirty = true;
      if (dirty) recalc();
      let step = dt;
      for (const bf of state.buffs) step = Math.min(step, bf.left);
      earn(cache.cps * step);
      for (const bf of state.buffs) bf.left -= step;
      dt -= step;
    }
    const before = state.buffs.length;
    state.buffs = state.buffs.filter(b => b.left > 1e-9);
    if (state.buffs.length !== before) { dirty = true; ui.buffKey = null; }

    combo = Math.max(0, combo - C.combo.decayPerSec * total);

    // Nightmare Burst scheduling
    if (burst) {
      burst.left -= total;
      if (burst.left <= 0) removeBurst();
    } else {
      state.burstTimer -= total;
      if (state.burstTimer <= 0) spawnBurst();
    }
  }

  function sync() {
    const now = performance.now();
    const real = (now - lastT) / 1000;
    if (!document.hidden && real > 0) state.timePlayed += Math.min(real, 60); // only while you're looking
    advance(real * debugSpeed);
    lastT = now;
  }

  /* =====================================================================
     Clicking + juice
     ===================================================================== */
  const kuromiBtn = $('#kuromi-btn');
  const fxLayer = $('#fx-layer');
  let bounceAnim = null, lastParticleAt = 0, lastPopAt = 0;
  let combo = 0; // combo meter, 0 → 1 (not saved: it's about clicking fast right now)

  function clickKuromi(e) {
    sync();
    if (dirty) recalc();
    state.clicksRun++; state.clicksTotal++;
    const crit = state.clicksTotal % C.crit.every === 0;          // every 100th click
    const amt = cache.click * (crit ? C.crit.mult : 1);
    earn(amt);
    state.handmadeRun += amt; state.handmadeTotal += amt;
    if (crit) state.crits++;
    if (!hasBuff('combo')) {
      combo += C.combo.perClick;
      if (combo >= 1) triggerCombo();
    }

    let x, y;
    if (e && (e.clientX || e.clientY)) { x = e.clientX; y = e.clientY; }
    else { const r = kuromiBtn.getBoundingClientRect(); x = r.left + r.width / 2; y = r.top + r.height / 3; }

    if (eventOn && Math.random() < EV.currency.dropChance * (bdayOn ? SD.treatDropMult : 1)) gainTreats(1, x, y);

    const motionOk = !reducedMotion.matches;
    if (motionOk) {
      if (bounceAnim) bounceAnim.cancel();
      bounceAnim = kuromiBtn.animate( // slight squash: wider + shorter, then springs back
        [{ transform: 'scale(1,1)' }, { transform: 'scale(1.06,0.9)', offset: 0.3 }, { transform: 'scale(0.97,1.04)', offset: 0.65 }, { transform: 'scale(1,1)' }],
        { duration: 240, easing: 'ease-out' });
    }
    if (crit) {
      if (state.settings.floaters) floater(x, y - 10, `+${fmt(amt, 1)} ✦ CRIT`, 'crit');
      if (state.settings.particles && motionOk) { particles(x, y, 16); ripple(x, y, true); }
      sound('crit');
    } else {
      if (state.settings.floaters) floater(x, y, '+' + fmt(amt, 1));
      if (state.settings.particles && motionOk) { particles(x, y); ripple(x, y); }
      const now = performance.now();
      if (now - lastPopAt > 40) { sound('pop'); lastPopAt = now; }
    }
    haptic();
  }

  // Treats: count them, and fly a little 🍬 from where it dropped to the counter.
  function gainTreats(n, x, y) {
    if (!(n > 0)) return;
    state.event.treats += n; state.event.treatsTotal += n;
    const pill = $('#treats-pill');
    $('#treats').textContent = fmt(state.event.treats);
    if (x === undefined || pill.hidden || reducedMotion.matches || !state.settings.particles) return;
    const to = pill.getBoundingClientRect();
    const t = document.createElement('div');
    t.className = 'treat-fly';
    t.textContent = EV.currency.icon;
    t.style.left = x + 'px'; t.style.top = y + 'px';
    fxLayer.appendChild(t);
    const dx = to.left + to.width / 2 - x, dy = to.top + to.height / 2 - y;
    t.animate([
      { transform: 'translate(-50%,-50%) scale(.6)', opacity: 0 },
      { transform: `translate(calc(-50% + ${dx * 0.2}px), calc(-50% + ${dy * 0.2 - 50}px)) scale(1.4)`, opacity: 1, offset: 0.3 },
      { transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(.7)`, opacity: 0.9 },
    ], { duration: 800, easing: 'cubic-bezier(.4,0,.6,1)' }).onfinish = () => { t.remove(); pill.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.25)' }, { transform: 'scale(1)' }], { duration: 250 }); };
    sound('buy');
  }

  function triggerCombo() {
    combo = 0;
    addBuff('combo', C.combo.duration);
    state.combos++;
    if (eventOn) state.event.combos++;
    const r = kuromiBtn.getBoundingClientRect();
    floater(r.left + r.width / 2, r.top + r.height * 0.2, `COMBO! ×${C.combo.mult} clicks`, 'big');
    sound('chime');
  }

  // pink ring expanding from the tap point
  let lastRippleAt = 0;
  function ripple(x, y, big = false) {
    const now = performance.now();
    if (!big && now - lastRippleAt < C.particleThrottleMs) return;
    lastRippleAt = now;
    const r = document.createElement('div');
    r.className = 'ripple' + (big ? ' big' : '');
    r.style.left = x + 'px';
    r.style.top = y + 'px';
    fxLayer.appendChild(r);
    setTimeout(() => r.remove(), big ? 800 : 600);
  }

  // tiny skulls/hearts/stars raining from the top on achievements
  function confetti() {
    if (!state.settings.particles || reducedMotion.matches) return;
    if (fxLayer.querySelectorAll('.confetti').length > C.confettiCount * 2) return;
    for (let i = 0; i < C.confettiCount; i++) {
      const [cls, glyph] = PARTICLE_KINDS[i % PARTICLE_KINDS.length];
      const p = document.createElement('div');
      p.className = 'particle confetti ' + cls;
      p.textContent = glyph;
      const x0 = rand(innerWidth * 0.15, innerWidth * 0.85);
      p.style.left = x0 + 'px';
      p.style.top = '-20px';
      fxLayer.appendChild(p);
      const anim = p.animate([
        { transform: 'translate(0,0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${rand(-80, 80)}px, ${rand(innerHeight * 0.45, innerHeight * 0.85)}px) rotate(${rand(-360, 360)}deg)`, opacity: 0 },
      ], { duration: rand(1300, 2100), delay: rand(0, 250), easing: 'cubic-bezier(.3,.1,.6,1)', fill: 'backwards' });
      anim.onfinish = () => p.remove();
    }
  }

  // a little star sparkle when you buy something
  function sparkle(x, y) {
    if (!state.settings.particles || reducedMotion.matches) return;
    for (let i = 0; i < 7; i++) {
      const p = document.createElement('div');
      p.className = 'particle star';
      p.textContent = '✦';
      p.style.left = (x - 7) + 'px';
      p.style.top = (y - 7) + 'px';
      fxLayer.appendChild(p);
      const a = (i / 7) * Math.PI * 2, d = rand(18, 36);
      p.animate([{ transform: 'scale(.4)', opacity: 1 }, { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d}px) scale(1.2)`, opacity: 0 }],
        { duration: 500, easing: 'ease-out' }).onfinish = () => p.remove();
    }
  }

  // Short buzz on Android (iOS Safari has no vibrate API). Needs a prior tap, or Chrome blocks it.
  function haptic() {
    if (!state.settings.haptics || !navigator.vibrate) return;
    if (navigator.userActivation && !navigator.userActivation.hasBeenActive) return;
    try { navigator.vibrate(10); } catch (e) { /* unsupported */ }
  }

  function floater(x, y, text, kind = '') { // kind: '' | 'big' | 'crit'
    const live = fxLayer.querySelectorAll('.floater');
    if (live.length >= C.maxFloaters) live[0].remove();
    const el = document.createElement('div');
    el.className = 'floater';
    el.textContent = text;
    el.style.left = (x + rand(-14, 14)) + 'px';
    el.style.top = (y + rand(-8, 8)) + 'px';
    if (kind === true) kind = 'big';
    if (kind) el.classList.add(kind);
    fxLayer.appendChild(el);
    // keep long messages fully on screen (they're centred on x)
    const half = el.offsetWidth / 2 + 8;
    if (half * 2 < innerWidth) el.style.left = Math.min(Math.max(parseFloat(el.style.left), half), innerWidth - half) + 'px';
    else { el.style.whiteSpace = 'normal'; el.style.width = (innerWidth - 16) + 'px'; el.style.left = innerWidth / 2 + 'px'; el.style.textAlign = 'center'; }
    setTimeout(() => el.remove(), kind ? 2300 : 1200);
  }

  const PARTICLE_KINDS = [['skull', ''], ['heart', '♥'], ['star', '★']];
  function particles(x, y, count) {
    const now = performance.now();
    if (!count && now - lastParticleAt < C.particleThrottleMs) return; // throttle auto-clickers
    lastParticleAt = now;
    const live = fxLayer.querySelectorAll('.particle').length;
    const n = Math.min(count || 3 + Math.floor(Math.random() * 3), C.maxParticles - live);
    for (let i = 0; i < n; i++) {
      const [cls, glyph] = PARTICLE_KINDS[Math.floor(Math.random() * PARTICLE_KINDS.length)];
      const p = document.createElement('div');
      p.className = 'particle ' + cls;
      p.textContent = glyph;
      p.style.left = (x - 7) + 'px';
      p.style.top = (y - 7) + 'px';
      fxLayer.appendChild(p);
      const a = rand(0, Math.PI * 2), d = rand(40, 90);
      const anim = p.animate([
        { transform: 'translate(0,0) scale(1) rotate(0deg)', opacity: 1 },
        { transform: `translate(${Math.cos(a) * d}px, ${Math.sin(a) * d - 30}px) scale(.4) rotate(${rand(-180, 180)}deg)`, opacity: 0 },
      ], { duration: rand(550, 850), easing: 'cubic-bezier(.2,.8,.4,1)' });
      anim.onfinish = () => p.remove();
    }
  }

  /* =====================================================================
     Buildings: cost = baseCost × 1.15^owned
     ===================================================================== */
  let buyMode = 'buy', buyAmt = 1;

  function bulkCost(b, have, n) {
    const g = C.costGrowth;
    if (n <= 0) return 0;
    if (n === 1) return Math.ceil(b.baseCost * Math.pow(g, have));
    return Math.ceil(b.baseCost * Math.pow(g, have) * (Math.pow(g, n) - 1) / (g - 1));
  }

  function maxAffordable(b, have, bank) {
    const g = C.costGrowth;
    let n = Math.floor(Math.log(bank * (g - 1) / (b.baseCost * Math.pow(g, have)) + 1) / Math.log(g));
    if (!Number.isFinite(n) || n < 0) n = 0;
    while (n > 0 && bulkCost(b, have, n) > bank) n--;
    return n;
  }

  function sellRefund(b, have, n) { return Math.floor(bulkCost(b, have - n, n) * C.sellRefund); }

  function buyBuilding(id, amt = buyAmt) {
    const b = B_BY_ID[id];
    const have = state.buildings[id];
    const n = amt === 'max' ? maxAffordable(b, have, state.kuromis) : amt;
    if (n <= 0) return false;
    const cost = bulkCost(b, have, n);
    if (cost > state.kuromis) return false;
    state.kuromis -= cost;
    state.buildings[id] += n;
    state.revealed[id] = true;
    dirty = true; ui.lairDirty = true;
    sound('buy');
    const row = el.store.querySelector(`.bld[data-id="${id}"]`);
    if (row) { const r = row.getBoundingClientRect(); sparkle(r.left + 34, r.top + r.height / 2); }
    return true;
  }

  function sellBuilding(id, amt = buyAmt) {
    const b = B_BY_ID[id];
    const have = state.buildings[id];
    const n = amt === 'max' ? have : Math.min(have, amt);
    if (n <= 0) return false;
    state.kuromis += sellRefund(b, have, n);
    state.buildings[id] -= n;
    if (id === 'baku') state.soldBaku = true;
    dirty = true; ui.lairDirty = true;
    sound('pop');
    return true;
  }

  /* =====================================================================
     Upgrades
     ===================================================================== */
  function isUnlocked(u) {
    const q = u.unlock;
    switch (q.type) {
      case 'owned': return state.buildings[q.b] >= q.n;
      case 'both': return state.buildings[q.a] >= q.an && state.buildings[q.b] >= q.bn;
      case 'clicks': return state.clicksTotal >= q.n;
      case 'handmade': return state.handmadeTotal >= q.n;
      case 'earned': return state.allTimeEarned >= q.n;
      case 'ach': return owned.ach.size >= q.n;
      case 'bursts': return state.burstsClicked >= q.n;
      default: return false;
    }
  }

  function buyUpgrade(id) {
    const u = U_BY_ID[id];
    if (!u || hasUpg(id) || !isUnlocked(u) || u.cost > state.kuromis) return false;
    state.kuromis -= u.cost;
    state.upgrades.push(id);
    owned.upg.add(id);
    dirty = true; ui.upgKey = null;
    sound('buy');
    const tile = el.upgrades.querySelector(`[data-upg="${id}"]`);
    if (tile) { const r = tile.getBoundingClientRect(); sparkle(r.left + r.width / 2, r.top + r.height / 2); }
    hideTip();
    return true;
  }

  function visibleUpgrades() {
    const avail = D.UPGRADES.filter(u => !hasUpg(u.id) && isUnlocked(u)).sort((a, b) => a.cost - b.cost);
    // "affordable-or-close": within 10× your bank or ~10 minutes of production; always show the cheapest 3.
    const close = Math.max(state.kuromis * 10, cache.cps * 600);
    return avail.filter((u, i) => i < 3 || u.cost <= close);
  }

  const burstUpgs = () => D.UPGRADES.filter(u => u.type === 'burst' && hasUpg(u.id));
  const burstFreqMult = () => burstUpgs().reduce((m, u) => m * u.freqMult, 1) / (hasPerk('burst_often') ? 1.1 : 1);
  const burstLifeMult = () => burstUpgs().reduce((m, u) => m * u.lifeMult, 1);
  const buffDurMult = () => burstUpgs().reduce((m, u) => m * u.durMult, 1);

  /* =====================================================================
     Nightmare Burst (golden-cookie equivalent)
     ===================================================================== */
  let burst = null;

  function burstDelay() { return rand(C.burstMinDelay, C.burstMaxDelay) * burstFreqMult(); }

  function spawnBurst(forceCake = false) {
    if (burst) return;
    const life = C.burstLifetime * burstLifeMult();
    const cake = forceCake || (bdayOn && Math.random() < SD.cakeChance);
    const tot = !cake && eventOn;                                   // Trick-or-Treat Burst
    const b = document.createElement('button');
    b.className = 'burst' + (cake ? ' cake' : '') + (tot ? ' tot' : '');
    if (cake) b.style.backgroundImage = `url("${window.KICONS.uri('cake')}")`;
    b.setAttribute('aria-label', cake ? 'Birthday Cake! Click it!' : tot ? 'Trick-or-Treat Burst! Click it!' : 'Nightmare Burst! Click it!');
    b.style.setProperty('--life', life + 's');
    b.style.left = rand(24, Math.max(40, innerWidth - 100)) + 'px';
    b.style.top = rand(80, Math.max(100, innerHeight - (innerWidth <= 800 ? 170 : 100))) + 'px';
    b.addEventListener('click', clickBurst);
    $('#burst-layer').appendChild(b);
    burst = { el: b, left: life, cake, tot };
    sound('whoosh');
  }

  function removeBurst() {
    if (!burst) return;
    burst.el.remove();
    burst = null;
    state.burstTimer = burstDelay();
  }

  function addBuff(type, duration, extra = {}) {
    const existing = state.buffs.find(b => b.type === type);
    if (existing) Object.assign(existing, { left: duration, total: duration }, extra);
    else state.buffs.push({ type, left: duration, total: duration, ...extra });
    dirty = true; ui.buffKey = null;
  }

  // Normal burst rewards; `boost` stretches buffs / payouts (Treat outcome = ×1.5).
  function burstReward(boost) {
    const total = C.frenzy.weight + C.lucky.weight + C.mischief.weight;
    let roll = Math.random() * total;
    if ((roll -= C.frenzy.weight) < 0) {
      const d = C.frenzy.duration * buffDurMult() * boost;
      addBuff('frenzy', d);
      return `Frenzy! ×${C.frenzy.mult} production for ${Math.round(d)}s`;
    }
    if ((roll -= C.lucky.weight) < 0) {
      const gain = (Math.min(state.kuromis * C.lucky.bankPct, cache.cpsNoBuff * C.lucky.cpsSeconds) + C.lucky.flat) * boost;
      earn(gain);
      return `Lucky! +${fmt(gain)} Kuromis`;
    }
    const d = C.mischief.duration * buffDurMult() * boost;
    addBuff('mischief', d);
    return `Mischief Click! ×${C.mischief.mult} click power for ${Math.round(d)}s`;
  }
  const TRICKS = { shuffle: 'The building list shuffled itself!', spooky: 'Your numbers went spooky!', flip: 'Kuromi flipped upside-down!' };

  function clickBurst(e) {
    e.stopPropagation();
    if (!burst) return;
    sync();
    if (dirty) recalc();
    const r = burst.el.getBoundingClientRect();
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    let msg;
    if (burst.cake) {
      const d = EV.cake.duration * buffDurMult();
      addBuff('cake', d);
      state.event.cakes++;
      msg = `🎂 Birthday Cake! ×${EV.cake.mult} production for ${Math.round(d)}s`;
    } else if (burst.tot) {
      const [lo, hi] = EV.burst.treats;
      const treats = lo + Math.floor(Math.random() * (hi - lo + 1));
      gainTreats(treats, x, y);
      state.event.tbursts++;
      if (Math.random() < EV.burst.treatChance) {
        msg = `🍬 Treat! +${treats} Treats · ` + burstReward(EV.burst.treatBoost);
      } else {
        const kind = EV.trick.kinds[Math.floor(Math.random() * EV.trick.kinds.length)];
        addBuff('trick', EV.trick.duration, { kind });
        state.event.tricked++;
        msg = `🙃 Trick! ${TRICKS[kind]} (+${treats} Treats, still ×${EV.trick.prodMult} production)`;
      }
    } else {
      msg = burstReward(1);
    }
    state.burstsClicked++;
    floater(x, y, msg, 'big');
    if (state.settings.particles && !reducedMotion.matches) particles(x, y, 12);
    sound('chime');
    removeBurst();
  }

  /* =====================================================================
     Achievements
     ===================================================================== */
  function achMet(a) {
    const q = a.req;
    switch (q.type) {
      case 'earned': return state.allTimeEarned >= q.n;
      case 'cps': return cache.cps >= q.n;
      case 'clicks': return state.clicksTotal >= q.n;
      case 'handmade': return state.handmadeTotal >= q.n;
      case 'owned': return state.buildings[q.b] >= q.n;
      case 'upgrades': return state.upgrades.length >= q.n;
      case 'bursts': return state.burstsClicked >= q.n;
      case 'prestige': return state.prestiges >= q.n;
      case 'title': return state.titleClicks >= 13;
      case 'halloween': return bdayOn;
      case 'evTreats': return state.event.treatsTotal >= q.n;
      case 'evBursts': return state.event.tbursts >= q.n;
      case 'evTricked': return state.event.tricked >= q.n;
      case 'evCostumes': return COSTUMES.every(c => evOwns(c.id));
      case 'evBdayCostume': return state.event.bdayCostume;
      case 'evWish': return evOwns('wish');
      case 'ev31': return bdayOn && D.BUILDINGS.some(b => state.buildings[b.id] >= 31);
      case 'thirteen': return D.BUILDINGS.every(b => state.buildings[b.id] === 13);
      case 'soldBaku': return state.soldBaku;
      case 'midnight': return clock.now().getHours() === 0;
      case 'combos': return state.combos >= q.n;
      case 'crits': return state.crits >= q.n;
      case 'dailyClaims': return state.daily.claims >= q.n;
      case 'streak': return state.daily.streak >= q.n;
      case 'skins': return state.skinsUnlocked.length >= q.n;
      case 'music': return state.musicPlayed;
      case 'statsOpened': return state.statsOpened;
      case 'timePlayed': return state.timePlayed >= q.n;
      case 'doubleTrouble': return hasBuff('frenzy') && hasBuff('mischief');
      case 'sugarHigh': return hasBuff('combo') && (hasBuff('frenzy') || hasBuff('cake'));
      case 'totalBuildings': return D.BUILDINGS.reduce((n, b) => n + state.buildings[b.id], 0) >= q.n;
      // limited event: only while it's running
      case 'evPlay': return eventOn;
      case 'evCakes': return eventOn && state.event.cakes >= q.n;
      case 'evEarned': return eventOn && state.event.earned >= q.n;
      case 'evCombo': return eventOn && state.event.combos >= 1;
      default: return false;
    }
  }

  function award(a, silent = false) {
    if (owned.ach.has(a.id)) return;
    state.achievements.push(a.id);
    owned.ach.add(a.id);
    dirty = true;
    if (!silent) { toast('Achievement unlocked', a.name, a.desc); sound('fanfare'); confetti(); }
  }

  function checkAchievements() {
    for (const a of D.ACHIEVEMENTS) if (!owned.ach.has(a.id) && achMet(a)) award(a);
  }

  /* ---------- Toasts (max 3 on screen, rest queued) ---------- */
  const toastQueue = [];
  let toastsShown = 0;
  function toast(title, name, desc) { toastQueue.push({ title, name, desc }); pumpToasts(); }
  const phoneQuery = window.matchMedia('(max-width: 800px)');
  function pumpToasts() {
    const maxShown = phoneQuery.matches ? 1 : 3; // one slim toast at a time on phones
    // A pile-up (e.g. many achievements at once) collapses into a single summary toast.
    if (toastQueue.length > maxShown + 2) {
      const n = toastQueue.length;
      toastQueue.length = 0;
      toastQueue.push({ title: 'Achievements unlocked', name: `${n} new achievements!`, desc: 'Check the Achievements screen, brat.' });
    }
    while (toastsShown < maxShown && toastQueue.length) {
      const t = toastQueue.shift();
      const box = document.createElement('div');
      box.className = 'toast';
      box.innerHTML = `<div class="t-ico"></div><div><div class="t-title">${esc(t.title)}</div><div class="t-name">${esc(t.name)}</div><div class="t-desc">${t.desc}</div></div>`;
      $('#toasts').appendChild(box);
      toastsShown++;
      const dismiss = () => {
        if (box.dataset.out) return;
        box.dataset.out = '1';
        box.classList.add('out');
        setTimeout(() => { box.remove(); toastsShown--; pumpToasts(); }, 300);
      };
      box.addEventListener('click', dismiss);
      setTimeout(dismiss, phoneQuery.matches ? 3000 : 4000);
    }
  }

  /* =====================================================================
     Prestige — "Wake Up"
     ===================================================================== */
  const canWake = () => state.allTimeEarned >= C.prestigeThreshold;
  const shardsTotalFor = x => Math.floor(Math.cbrt(x / C.prestigeDivisor));
  const shardsPending = () => Math.max(0, shardsTotalFor(state.allTimeEarned) - state.shardsEarned);
  const shardsAvailable = () => state.shardsEarned - state.shardsSpent;

  function wakeUp() {
    sync();
    const keep = hasPerk('keep_bank') ? state.kuromis * 0.01 : 0;
    const gained = shardsPending();
    state.shardsEarned += gained;
    state.prestiges++;
    state.kuromis = keep;
    state.runEarned = 0; state.handmadeRun = 0; state.clicksRun = 0;
    for (const b of D.BUILDINGS) state.buildings[b.id] = 0;
    if (hasPerk('start_notes')) state.buildings.note = 10;
    state.upgrades = []; owned.upg.clear();
    state.buffs = [];
    state.revealed = {};
    state.runStartedAt = Date.now();
    if (burst) removeBurst(); else state.burstTimer = burstDelay();
    dirty = true;
    resetUiCaches();
    checkAchievements();
    save();
    toast('Good morning, brat', `You woke up with +${gained} Dream Shard${gained === 1 ? '' : 's'}`, `Production is now +${Math.round(state.shardsEarned * C.shardBonus * 100)}% permanently.`);
  }

  /* =====================================================================
     Save system (localStorage, versioned, migrations)
     ===================================================================== */
  // MIGRATIONS[v] upgrades a save from version v to v+1. Add a new entry whenever SAVE_VERSION bumps.
  const MIGRATIONS = {
    0: s => s, // pre-versioned saves → v1 (missing fields are filled in by the merge below)
  };

  function migrate(obj) {
    if (!obj || typeof obj !== 'object') throw new Error('Not a save');
    let v = Number(obj.version) || 0;
    while (v < D.SAVE_VERSION) {
      const step = MIGRATIONS[v];
      if (step) obj = step(obj);
      v++;
    }
    const base = freshState();
    const s = {
      ...base, ...obj,
      settings: { ...base.settings, ...(obj.settings || {}) },
      buildings: { ...base.buildings, ...(obj.buildings || {}) },
      revealed: { ...(obj.revealed || {}) },
      daily: { ...base.daily, ...(obj.daily || {}) },
      event: { ...base.event, ...(obj.event || {}) },
    };
    for (const k of Object.keys(base)) {
      if (typeof base[k] !== 'number') continue;
      const n = Number(s[k]);
      s[k] = Number.isFinite(n) ? n : base[k];
    }
    for (const b of D.BUILDINGS) s.buildings[b.id] = Math.max(0, Math.floor(Number(s.buildings[b.id]) || 0));
    s.upgrades = [...new Set((s.upgrades || []).filter(id => U_BY_ID[id]))];
    s.achievements = [...new Set((s.achievements || []).filter(id => A_BY_ID[id]))];
    s.perks = [...new Set((s.perks || []).filter(id => P_BY_ID[id]))];
    const BUFF_TYPES = ['frenzy', 'mischief', 'combo', 'cake', 'trick', 'sugar', 'haunted'];
    s.event.owned = [...new Set(Array.isArray(s.event.owned) ? s.event.owned : [])].filter(id => SHOP_BY_ID[id]);
    if (s.event.costume && !s.event.owned.includes(s.event.costume)) s.event.costume = '';
    for (const k of ['treats', 'treatsTotal', 'tbursts', 'tricked', 'cakes', 'earned', 'combos']) s.event[k] = Math.max(0, Number(s.event[k]) || 0);
    if (!['auto', 'on', 'birthday', 'off'].includes(s.settings.eventOverride)) s.settings.eventOverride = 'auto';
    s.buffs = Array.isArray(s.buffs) ? s.buffs.filter(b => b && BUFF_TYPES.includes(b.type) && b.left > 0) : [];
    s.skinsUnlocked = [...new Set(['default', ...(Array.isArray(s.skinsUnlocked) ? s.skinsUnlocked : [])])].filter(id => SKIN_BY_ID[id]);
    for (const k of ['sfxVolume', 'musicVolume']) { const v = Number(s.settings[k]); s.settings[k] = Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : base.settings[k]; }
    s.version = D.SAVE_VERSION;
    return s;
  }

  let savingSuspended = false; // set right before a deliberate reload (debug "Fake 1h away")

  function save() {
    if (savingSuspended) return false;
    try {
      sync();
      state.lastSaved = Date.now();
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
      return true;
    } catch (err) {
      console.warn('Kuromi Clicker: save failed', err);
      return false;
    }
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return freshState();
      return migrate(JSON.parse(raw));
    } catch (err) {
      console.warn('Kuromi Clicker: could not load save, starting fresh', err);
      return freshState();
    }
  }

  const toBase64 = str => btoa(unescape(encodeURIComponent(str)));
  const fromBase64 = b64 => decodeURIComponent(escape(atob(b64.trim())));
  function exportSave() { save(); return toBase64(JSON.stringify(state)); }
  function importSave(b64) {
    const s = migrate(JSON.parse(fromBase64(b64)));
    state = s;
    syncSets();
    if (burst) { burst.el.remove(); burst = null; }
    dirty = true;
    lastT = performance.now();
    resetUiCaches();
    save();
  }

  function hardReset() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* storage blocked — nothing to remove */ }
    state = freshState();
    syncSets();
    if (burst) { burst.el.remove(); burst = null; }
    dirty = true;
    resetUiCaches();
    save();
  }

  function applyOffline() {
    const away = (Date.now() - (state.lastSaved || Date.now())) / 1000;
    if (!(away >= C.offlineMinSeconds)) return;
    for (const bf of state.buffs) bf.left -= away;
    state.buffs = state.buffs.filter(b => b.left > 0);
    recalc();
    const capHours = C.offlineCapHours + (hasPerk('long_naps') ? 16 : 0);
    const secs = Math.min(away, capHours * 3600);
    const gain = cache.cpsNoBuff * secs * C.offlineEfficiency;
    const treats = eventOn ? Math.min(EV.currency.offlineCap, Math.floor(secs / 3600 * EV.currency.offlinePerHour)) : 0;
    if (gain <= 0 && treats <= 0) return;
    earn(gain);
    if (treats) gainTreats(treats);
    openModal({
      title: 'Welcome back, brat!', narrow: true,
      html: `<p>While you were away, Baku collected</p>
             <div class="big-number"><span class="skull-ico"></span> ${fmt(gain)} Kuromis</div>
             ${treats ? `<p style="text-align:center">…and found <b>${treats} ${EV.currency.icon} Treats</b> in a pumpkin.</p>` : ''}
             <p class="muted small">Away for ${fmtTime(away)} · ${Math.round(C.offlineEfficiency * 100)}% efficiency · capped at ${capHours}h${away > secs ? ' (cap reached!)' : ''}</p>`,
      actions: [{ label: 'Gimme', cls: 'pink', close: true }],
    });
  }

  /* =====================================================================
     Sound (Web Audio, generated — no files)
     ===================================================================== */
  let actx = null, sfxBus = null, musicBus = null;
  function ctxGet() { // lazily create the context + two volume buses (effects, music)
    try {
      if (!actx) {
        actx = new (window.AudioContext || window.webkitAudioContext)();
        sfxBus = actx.createGain(); sfxBus.connect(actx.destination);
        musicBus = actx.createGain(); musicBus.connect(actx.destination);
        applyVolumes();
      }
      if (actx.state === 'suspended' && !document.hidden) actx.resume();
    } catch (e) { return null; }
    return actx;
  }
  function applyVolumes() {
    if (!actx) return;
    sfxBus.gain.value = state.settings.sfxVolume;
    musicBus.gain.value = state.settings.musicVolume * 0.6;
  }
  function audio() { return state.settings.sound ? ctxGet() : null; }
  function tone(ctx, { freq, to, dur = 0.1, type = 'sine', vol = 0.12, delay = 0, bus = sfxBus, at = null }) {
    const t = (at ?? ctx.currentTime) + delay;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function sound(name) {
    const ctx = audio();
    if (!ctx) return;
    if (name === 'pop') tone(ctx, { freq: 620, to: 260, dur: 0.08, vol: 0.1 });
    else if (name === 'crit') { tone(ctx, { freq: 880, to: 1760, dur: 0.18, type: 'square', vol: 0.05 }); tone(ctx, { freq: 1320, dur: 0.3, vol: 0.08, delay: 0.08 }); }
    else if (name === 'buy') [988, 1319, 1760].forEach((f, i) => tone(ctx, { freq: f, dur: 0.12, type: 'triangle', vol: 0.06, delay: i * 0.05 }));
    else if (name === 'chime') [1047, 1568, 2093].forEach((f, i) => tone(ctx, { freq: f, dur: 0.6, vol: 0.06, delay: i * 0.09 }));
    else if (name === 'fanfare') [784, 988, 1175, 1568, 2093].forEach((f, i) => { // louder achievement chime
      tone(ctx, { freq: f, dur: 0.9, vol: 0.13, delay: i * 0.08 });
      tone(ctx, { freq: f * 2, dur: 0.5, vol: 0.04, delay: i * 0.08 });
    });
    else if (name === 'whoosh') {
      const len = ctx.sampleRate * 0.9, buf = ctx.createBuffer(1, len, ctx.sampleRate), data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(), t = ctx.currentTime;
      src.buffer = buf; f.type = 'bandpass'; f.Q.value = 3;
      f.frequency.setValueAtTime(200, t); f.frequency.exponentialRampToValueAtTime(1400, t + 0.4); f.frequency.exponentialRampToValueAtTime(150, t + 0.9);
      g.gain.value = 0.18;
      src.connect(f).connect(g).connect(sfxBus);
      src.start(t);
    }
  }

  /* ---------- Background music: music box + soft bass, looped (data in KD.MUSIC) ---------- */
  const midiHz = m => 440 * Math.pow(2, (m - 69) / 12);
  let musicTimer = null, musicNext = 0, musicStep = 0;
  function musicBox(ctx, midi, t) {
    const f = midiHz(midi);
    tone(ctx, { freq: f, dur: 0.9, vol: 0.09, bus: musicBus, at: t });              // bell body
    tone(ctx, { freq: f * 2, dur: 0.35, vol: 0.03, bus: musicBus, at: t });         // tine shimmer
    tone(ctx, { freq: f * 3.01, dur: 0.15, vol: 0.012, bus: musicBus, at: t });
  }
  function bassNote(ctx, midi, t, dur) {
    const o = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    o.type = 'triangle'; o.frequency.value = midiHz(midi);
    lp.type = 'lowpass'; lp.frequency.value = 420;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp).connect(g).connect(musicBus);
    o.start(t); o.stop(t + dur + 0.05);
  }
  function scheduleMusic() {
    const ctx = actx, M = D.MUSIC;
    if (!ctx || ctx.state !== 'running') return;
    const stepDur = 60 / M.bpm / 2; // eighth notes
    if (musicNext < ctx.currentTime - 0.1) musicNext = ctx.currentTime + 0.05; // after a pause, don't burst-play missed notes
    while (musicNext < ctx.currentTime + 0.3) {
      const n = M.melody[musicStep % M.melody.length];
      const bn = M.bass[musicStep % M.bass.length];
      if (n != null) musicBox(ctx, n, musicNext);
      if (bn != null) bassNote(ctx, bn, musicNext, stepDur * 2);
      musicNext += stepDur;
      musicStep++;
    }
  }
  function startMusic() {
    if (musicTimer || !state.settings.music) return;
    const ctx = ctxGet();
    if (!ctx) return;
    state.musicPlayed = true;
    musicNext = ctx.currentTime + 0.1; musicStep = 0;
    musicTimer = setInterval(scheduleMusic, 60);
    scheduleMusic();
  }
  function stopMusic() { clearInterval(musicTimer); musicTimer = null; }

  /* =====================================================================
     Optional images (assets/icons/<id>.png, assets/baku.png)
     ===================================================================== */
  const iconSrc = {};
  function probe(src) {
    return new Promise(res => { const i = new Image(); i.onload = () => res(src); i.onerror = () => res(null); i.src = src; });
  }
  async function resolveIcons() {
    if (!C.probeOptionalImages) return;
    await Promise.all(D.BUILDINGS.map(async b => {
      const candidates = [`assets/icons/${b.id}.png`];
      if (b.id === 'baku') candidates.push('assets/baku.png');
      for (const c of candidates) if (await probe(c)) { iconSrc[b.id] = c; break; }
    }));
    if (Object.keys(iconSrc).length) resetUiCaches();
  }
  // Your PNG (assets/icons/<id>.png) wins; otherwise the built-in SVG from icons.js; emoji as a last resort.
  const bIconSrc = id => iconSrc[id] || (window.KICONS && window.KICONS.uri(id));
  const bIcon = b => { const src = bIconSrc(b.id); return src ? `<img src="${src}" alt="" draggable="false">` : b.emoji; };
  // Upgrade art: an SVG from icons.js plus small corner badges for what it boosts
  // (building icons for tier/synergy upgrades, or click / all / trophy / burst badges).
  const artSrc = id => (B_BY_ID[id] ? bIconSrc(id) : window.KICONS && window.KICONS.uri(id)) || '';
  function upgIcon(u) {
    const main = window.KICONS && window.KICONS.uri(u.icon);
    const badges = (u.badges || []).map((id, i) => `<span class="u-badge u-badge-${i}"><img src="${artSrc(id)}" alt="" draggable="false"></span>`).join('');
    const tier = u.type === 'tier' ? `<span class="tier-badge">${ROMAN[u.tier]}</span>` : '';
    return (main ? `<img class="u-main" src="${main}" alt="" draggable="false">` : '✦') + badges + tier;
  }
  function upgBoosts(u) {
    const names = (u.badges || []).map(id => B_BY_ID[id] ? B_BY_ID[id].name : { b_click: 'your clicks', b_all: 'all production', b_trophy: 'achievement bonus', b_burst: 'Nightmare Bursts' }[id]).filter(Boolean);
    return names.length ? 'boosts ' + names.join(' + ') : '';
  }

  /* =====================================================================
     UI rendering
     ===================================================================== */
  const ui = { upgKey: null, buffKey: null, lairDirty: true, lairCounts: {}, decorCount: -1, afford: {}, bAfford: {} };
  const el = {
    bank: $('#bank'), cps: $('#cps'), click: $('#click-power'), buffs: $('#buffs'), store: $('#store'),
    upgrades: $('#upgrades'), lair: $('#lair'), wake: $$('.wake-trigger'), tip: $('#tooltip'), ticker: $('#ticker-text'),
  };

  function resetUiCaches() {
    ui.upgKey = null; ui.buffKey = null; ui.lairDirty = true; ui.lairCounts = {}; ui.decorCount = -1; ui.afford = {}; ui.bAfford = {};
    el.lair.innerHTML = '';
    buildStore();
    applyTheme();
    if (typeof applyCosmetics === 'function' && state) { applyCosmetics(); updateEvent(true); }
  }

  function buildStore() {
    el.store.innerHTML = D.BUILDINGS.map(b => `
      <button class="bld" data-id="${b.id}" data-tip="bld:${b.id}">
        <div class="b-icon">${bIcon(b)}</div>
        <div><div class="b-name"></div><div class="b-cost"><span class="skull-ico"></span><span class="b-cost-v"></span></div><div class="b-rate"></div></div>
        <div class="b-owned"></div>
      </button>`).join('');
    renderStore();
  }

  function renderStore() {
    let mysteries = 0;
    for (const row of el.store.children) {
      const b = B_BY_ID[row.dataset.id];
      const have = state.buildings[b.id];
      const revealed = state.revealed[b.id] || have > 0;
      const icon = row.querySelector('.b-icon');
      if (!revealed) {
        row.classList.toggle('hide', mysteries >= 2);
        row.classList.add('mystery');
        row.classList.remove('poor', 'selling');
        mysteries++;
        row.querySelector('.b-name').textContent = '???';
        row.querySelector('.b-cost-v').textContent = fmt(b.baseCost);
        row.querySelector('.b-owned').textContent = '';
        row.querySelector('.b-rate').textContent = '';
        icon.style.filter = 'brightness(0)';
        continue;
      }
      row.classList.remove('hide', 'mystery');
      icon.style.filter = '';
      row.querySelector('.b-name').textContent = b.name;
      row.querySelector('.b-owned').textContent = have || '';
      let label, ok;
      if (buyMode === 'buy') {
        const n = buyAmt === 'max' ? maxAffordable(b, have, state.kuromis) : buyAmt;
        const shownN = Math.max(1, n);
        const cost = bulkCost(b, have, shownN);
        ok = cost <= state.kuromis;
        label = (buyAmt !== 1 ? `×${shownN} ` : '') + fmt(cost);
      } else {
        const n = buyAmt === 'max' ? have : Math.min(have, buyAmt);
        ok = n > 0;
        label = n > 0 ? `sell ×${n}: +${fmt(sellRefund(b, have, n))}` : 'nothing to sell';
      }
      row.querySelector('.b-cost-v').textContent = label;
      row.querySelector('.b-rate').textContent = `+${fmt(b.baseCps * cache.bMult[b.id] * cache.allMult, 1)}/s each`;
      row.classList.toggle('poor', !ok);
      row.classList.toggle('selling', buyMode === 'sell');
      if (buyMode === 'buy' && ok && ui.bAfford[b.id] === false && !reducedMotion.matches) { // pulse once when it becomes affordable
        row.classList.remove('pulse'); void row.offsetWidth; row.classList.add('pulse');
        setTimeout(() => row.classList.remove('pulse'), 700);
      }
      ui.bAfford[b.id] = buyMode === 'buy' ? ok : undefined;
    }
  }

  function renderUpgrades() {
    const list = visibleUpgrades();
    const key = list.map(u => u.id).join(',');
    if (key !== ui.upgKey) {
      ui.upgKey = key;
      el.upgrades.innerHTML = list.length
        ? list.map(u => `<button class="upg type-${u.type}" data-upg="${u.id}" data-tip="upg:${u.id}" aria-label="${esc(u.name)}"><span class="u-ico">${upgIcon(u)}</span><span class="u-info"><span class="u-name">${esc(u.name)}</span><span class="u-desc">${u.desc}</span></span><span class="u-cost"><span class="skull-ico"></span>${fmt(u.cost)}</span></button>`).join('')
        : '<p class="muted small">Nothing yet. Keep clicking, brat.</p>';
    }
    for (const btn of el.upgrades.children) {
      const id = btn.dataset.upg;
      if (!id) continue;
      const ok = U_BY_ID[id].cost <= state.kuromis;
      btn.classList.toggle('poor', !ok);
      if (ok && ui.afford[id] === false && !reducedMotion.matches) { // wiggle once when it becomes affordable
        btn.classList.remove('wiggle'); void btn.offsetWidth; btn.classList.add('wiggle');
        setTimeout(() => btn.classList.remove('wiggle'), 650);
      }
      ui.afford[id] = ok;
    }
  }

  function renderLair() { // cheap: only rows whose count changed are redrawn
    ui.lairDirty = false;
    const rowsBefore = el.lair.querySelectorAll('.lair-row').length;
    renderLairRows();
    if (el.lair.querySelectorAll('.lair-row').length !== rowsBefore) fitLair();
  }
  function renderLairRows() {
    if (!D.BUILDINGS.some(b => state.buildings[b.id] > 0)) {
      if (el.lair.querySelector('.lair-empty')) return;
      el.lair.innerHTML = '<p class="lair-empty">Your lair is empty. Buy something mischievous →</p>';
      ui.lairCounts = {};
      return;
    }
    const empty = el.lair.querySelector('.lair-empty');
    if (empty) empty.remove();
    D.BUILDINGS.forEach((b, bi) => {
      const n = state.buildings[b.id];
      let row = el.lair.querySelector(`.lair-row[data-id="${b.id}"]`);
      if (!n) { if (row) row.remove(); delete ui.lairCounts[b.id]; return; }
      if (ui.lairCounts[b.id] === n && row) return;
      ui.lairCounts[b.id] = n;
      if (!row) {
        row = document.createElement('div');
        row.className = 'lair-row';
        row.dataset.id = b.id;
        row.dataset.tip = 'bld:' + b.id;
        const next = D.BUILDINGS.slice(bi + 1).map(x => el.lair.querySelector(`.lair-row[data-id="${x.id}"]`)).find(Boolean);
        el.lair.insertBefore(row, next || null); // keep rows in building order
      }
      const shown = Math.min(n, C.lairRowCap); // 8 slots that shrink to fit — never a half-cut icon
      let icons = '';
      for (let i = 0; i < shown; i++) icons += `<span class="lair-icon" style="animation-delay:${((i * 0.17) % 2.4).toFixed(2)}s">${bIcon(b)}</span>`;
      const more = n - shown;
      row.innerHTML = `<div class="lr-head"><span>${b.plural}</span><span>×${fmt(n)}</span></div>
        <div class="lr-icons">${icons}${more > 0 ? `<span class="lr-more" aria-label="${more} more">+${fmt(more)}</span>` : ''}</div>`;
    });
  }

  // Desktop: the Lair gets the whole middle column. If the rows don't all fit, its height snaps to a
  // whole number of rows and scrolling snaps row by row — so a row is never shown half cut off.
  function fitLair() {
    const lair = el.lair;
    lair.style.height = ''; lair.style.flex = ''; lair.style.removeProperty('--row-h');
    if (phoneQuery.matches) return;                        // phones scroll the page instead
    const rows = lair.querySelectorAll('.lair-row');
    if (rows.length < 2) return;
    const gap = parseFloat(getComputedStyle(lair).rowGap) || 0;
    // Rows are all one line tall; round up to whole pixels so snap points land exactly on row edges.
    const rowH = Math.ceil(Math.max(...[...rows].map(r => r.getBoundingClientRect().height)));
    lair.style.setProperty('--row-h', rowH + 'px');
    const stride = rowH + gap;
    const avail = lair.clientHeight;
    if (rows.length * stride - gap <= avail + 0.5) return; // everything fits: no scrolling needed
    const n = Math.max(1, Math.floor((avail + gap + 0.5) / stride));
    lair.style.flex = 'none';
    lair.style.height = (n * stride - gap) + 'px';
  }
  // The goals card sits under "per click" in the left column on desktop, but under the Lair on phones
  // (there the left column is the sticky header).
  function placeGoals() {
    const goals = $('#goals'), home = phoneQuery.matches ? $('#col-mid') : $('#col-left');
    if (goals.parentElement !== home) home.appendChild(goals);
    fitLair();
  }

  // Costume overlays (accessories only — drawn over your image), bat cursor, spooky ticker font.
  function applyCosmetics() {
    const c = SHOP_BY_ID[state.event.costume];
    const art = c ? `<img class="cos-${c.id.split('_')[1]}" src="${window.KICONS.uri(c.art)}" alt="" draggable="false">` : '';
    $('#costume-back').innerHTML = c && c.id === 'costume_wings' ? art : '';
    $('#costume-front').innerHTML = c && c.id !== 'costume_wings' ? art : '';
    document.body.classList.toggle('bat-cursor', state.event.batCursor && evOwns('cursor_bat'));
    $('.ticker').classList.toggle('spooky-font', state.event.tickerFont && evOwns('font_spooky'));
  }
  // Tricks: harmless 20s pranks (production still ×3).
  let trickShown = '';
  function renderTrick() {
    const tr = state.buffs.find(b => b.type === 'trick');
    const kind = tr ? tr.kind : '';
    if (kind === trickShown) return;
    if (trickShown === 'shuffle') for (const row of el.store.children) row.style.order = '';
    trickShown = kind;
    document.body.dataset.trick = kind;
    if (kind === 'shuffle') {
      const order = [...el.store.children].map((_, i) => i).sort(() => Math.random() - 0.5);
      [...el.store.children].forEach((row, i) => { row.style.order = order[i]; });
    }
  }

  const BUFF_INFO = {
    frenzy: () => `Frenzy · ×${C.frenzy.mult} production`,
    mischief: () => `Mischief Click · ×${C.mischief.mult} clicks`,
    combo: () => `Combo · ×${C.combo.mult} clicks`,
    cake: () => `🎂 Birthday Cake · ×${EV.cake.mult} production`,
    trick: b => `🙃 Trick: ${TRICKS[b.kind] || 'Pranked!'} · ×${EV.trick.prodMult} production`,
    sugar: () => `🍭 Sugar Rush · ×${SHOP_BY_ID.boost_sugar.mult} clicks`,
    haunted: () => `👻 Haunted Lair · +${Math.round((SHOP_BY_ID.boost_haunted.mult - 1) * 100)}% production`,
  };
  function renderBuffs() {
    const key = state.buffs.map(b => b.type + (b.kind || '')).join(',');
    if (key !== ui.buffKey) {
      ui.buffKey = key;
      el.buffs.innerHTML = state.buffs.map(b => `<div class="buff" data-type="${b.type}"><span class="t"></span>${BUFF_INFO[b.type](b)}<div class="bar"></div></div>`).join('');
    }
    state.buffs.forEach((b, i) => {
      const row = el.buffs.children[i];
      if (!row) return;
      row.querySelector('.t').textContent = b.left >= 60 ? fmtTime(b.left) : Math.ceil(b.left) + 's';
      row.querySelector('.bar').style.width = (100 * b.left / b.total) + '%';
    });
  }

  function renderDecor() {
    const n = D.DECOR_MILESTONES.filter(([m]) => state.allTimeEarned >= m).length;
    if (n === ui.decorCount) return;
    ui.decorCount = n;
    const layer = $('#decor');
    layer.innerHTML = '';
    D.DECOR_MILESTONES.slice(0, n).forEach(([, glyph]) => {
      for (let k = 0; k < 2; k++) {
        const d = document.createElement('div');
        d.className = 'decor-item';
        d.textContent = glyph;
        d.style.left = rand(2, 95) + 'vw';
        d.style.top = rand(10, 90) + 'vh';
        d.style.animationDelay = -rand(0, 18) + 's';
        d.style.animationDuration = rand(14, 24) + 's';
        layer.appendChild(d);
      }
    });
  }

  function initSparkles() {
    const layer = $('#sparkles');
    for (let i = 0; i < 18; i++) {
      const s = document.createElement('div');
      s.className = 'sparkle';
      s.style.left = rand(0, 100) + 'vw';
      s.style.animationDuration = rand(9, 18) + 's';
      s.style.animationDelay = -rand(0, 18) + 's';
      const size = rand(2, 5);
      s.style.width = s.style.height = size + 'px';
      layer.appendChild(s);
    }
  }

  /* ---------- News ticker ---------- */
  // Headlines scroll as one continuous strip: the set is repeated until it's wider than the ticker,
  // then doubled, and the track slides by exactly half its width — so it loops with no gap and
  // text is visible from the first frame.
  let tickerSig = '', tickerStatic = 0;
  function newsPool() {
    const unlocked = D.NEWS.filter(([m]) => state.allTimeEarned >= m).map(x => x[1]).reverse(); // newest first
    const pool = [...unlocked];
    if (eventOn) pool.unshift(...EV.news);
    for (const [bid, t] of D.NEWS_DYNAMIC) if (state.buildings[bid] > 0) pool.push(t.replace('{n}', fmt(state.buildings[bid])));
    return { pool, unlocked: unlocked.length };
  }
  function buildTicker(force = false) {
    const { pool, unlocked } = newsPool();
    const sig = pool.join('|');
    if (!force && sig === tickerSig) return;
    tickerSig = sig; tickerStatic = unlocked;
    const one = pool.map(l => `<span class="tk-item">${esc(l)}</span>`).join('');
    el.ticker.innerHTML = `<span class="tk-copy">${one}</span>`;
    const copy = el.ticker.firstElementChild;
    const view = el.ticker.parentElement.clientWidth || innerWidth;
    for (let i = 0; i < 20 && copy.scrollWidth < view + 40; i++) copy.insertAdjacentHTML('beforeend', one);
    el.ticker.insertAdjacentHTML('beforeend', `<span class="tk-copy" aria-hidden="true">${copy.innerHTML}</span>`);
    el.ticker.style.setProperty('--dur', (copy.getBoundingClientRect().width / C.tickerSpeed).toFixed(2) + 's');
    el.ticker.style.animation = 'none'; void el.ticker.offsetWidth; el.ticker.style.animation = '';
  }
  // Fresh numbers are swapped in at the loop point (seamless); a newly unlocked headline shows right away.
  el.ticker.addEventListener('animationiteration', () => buildTicker());
  function checkTicker() {
    const ev = String(eventOn);
    if (newsPool().unlocked !== tickerStatic || ev !== el.ticker.dataset.event) { el.ticker.dataset.event = ev; buildTicker(true); }
  }
  let tickerResize = null;
  addEventListener('resize', () => { clearTimeout(tickerResize); tickerResize = setTimeout(() => buildTicker(true), 200); requestAnimationFrame(fitLair); });

  /* ---------- Skins ---------- */
  function skinUnlocked(sk) {
    if (!sk.unlock) return true;
    if (sk.unlock.shop) return evOwns(sk.unlock.shop);
    return (sk.unlock.perk && hasPerk(sk.unlock.perk)) || (sk.unlock.ach && owned.ach.size >= sk.unlock.ach) || false;
  }
  function skinReq(sk) {
    const bits = [];
    if (sk.unlock.shop) return 'the event shop';
    if (sk.unlock.ach) bits.push(`${sk.unlock.ach} achievements`);
    if (sk.unlock.perk) bits.push('the Dream Shop');
    return bits.join(' or ');
  }
  function setSkin(id) {
    const sk = SKIN_BY_ID[id];
    if (!sk || !skinUnlocked(sk)) return false;
    state.settings.theme = id;
    applyTheme();
    return true;
  }
  function checkSkins(silent = false) { // remember newly unlocked skins and announce them once
    for (const sk of D.SKINS) {
      if (skinUnlocked(sk) && !state.skinsUnlocked.includes(sk.id)) {
        state.skinsUnlocked.push(sk.id);
        if (!silent) toast('New skin unlocked', sk.name, 'Pick it in Settings → Skins.');
      }
    }
  }
  function applyTheme() {
    const sk = SKIN_BY_ID[state.settings.theme];
    document.body.dataset.theme = sk && skinUnlocked(sk) ? sk.id : 'default';
  }

  /* ---------- Tooltips ---------- */
  let tipTarget = null;
  function tipHTML(key) {
    const [kind, id] = key.split(':');
    if (kind === 'bld') {
      const b = B_BY_ID[id];
      const have = state.buildings[id];
      if (!state.revealed[id] && !have) return `<div class="tt-name">???</div><div class="tt-flavour">Collect more Kuromis to find out.</div>`;
      const each = b.baseCps * cache.bMult[id] * cache.allMult;
      const tot = cache.bCps[id];
      const share = cache.cps > 0 ? tot / cache.cps * 100 : 0;
      return `<div class="tt-head"><span class="tt-name"><span class="tt-ico">${bIcon(b)}</span>${esc(b.name)}</span><span class="tt-cost"><span class="skull-ico"></span> ${fmt(bulkCost(b, have, 1))}</span></div>
        <div class="tt-tag">owned: ${have}</div>
        <ul><li>each ${esc(b.name)} makes <b>${fmt(each, 1)}</b>/s</li>
            <li>${have} ${esc(have === 1 ? b.name : b.plural)} making <b>${fmt(tot, 1)}</b>/s${have ? ` (${share.toFixed(1)}% of total)` : ''}</li>
            <li>building multiplier ×${fmt(cache.bMult[id], 2)}</li></ul>
        <div class="tt-flavour">"${esc(b.flavour)}"</div>`;
    }
    if (kind === 'upg') {
      const u = U_BY_ID[id];
      const isOwned = hasUpg(id);
      const tag = { tier: 'Building upgrade', click: 'Click upgrade', synergy: 'Synergy', global: 'Global multiplier', pinky: 'Pinky Promise', burst: 'Nightmare Burst' }[u.type];
      let status = isOwned ? 'Owned' : u.cost <= state.kuromis ? 'Click to buy!' : `Need ${fmt(u.cost - state.kuromis)} more`;
      if (u.type === 'pinky') status += ` · Pinky Promise now: +${(cache.pinkyPct * 100).toFixed(1)}%`;
      return `<div class="tt-head"><span class="tt-name">${esc(u.name)}</span><span class="tt-cost"><span class="skull-ico"></span> ${fmt(u.cost)}</span></div>
        <div class="tt-tag">${tag} · ${upgBoosts(u)}</div>
        <div class="tt-tag">${status}</div>
        <div class="tt-body">${u.desc}</div>
        <div class="tt-flavour">"${esc(u.flavour)}"</div>`;
    }
    if (kind === 'treats') {
      return `<div class="tt-name">${EV.currency.icon} ${fmt(state.event.treats)} ${EV.currency.name}</div><div class="tt-body">Event currency: spend it in the ${esc(EV.name)} shop (tap the banner).</div>`;
    }
    if (kind === 'gift') {
      const ready = giftReady();
      const next = ready ? (state.daily.last === dayKey(new Date(clock.now().getFullYear(), clock.now().getMonth(), clock.now().getDate() - 1)) ? state.daily.streak + 1 : 1) : state.daily.streak;
      return ready
        ? `<div class="tt-name">🎁 Daily gift ready!</div><div class="tt-body">Worth about <b>${fmt(dailyReward(next))}</b> Kuromis · day ${next} streak.</div><div class="tt-flavour">Click to open.</div>`
        : `<div class="tt-name">🎁 Gift opened</div><div class="tt-body">Next gift in <b>${fmtTime(secsToTomorrow())}</b>. Streak: ${state.daily.streak} day${state.daily.streak === 1 ? '' : 's'}.</div>`;
    }
    if (kind === 'ach') {
      const a = A_BY_ID[id];
      const got = owned.ach.has(id);
      const limited = a.limited && !got ? `<div class="tt-flavour">${EV.icon} Limited: only during ${esc(EV.name)} (Oct ${EV.start[1]} – Nov ${EV.end[1]}).</div>` : '';
      return `<div class="tt-name">${got ? esc(a.name) : '???'}</div><div class="tt-tag">${esc(a.group)} · ${got ? 'unlocked' : 'locked'}</div><div class="tt-body">${a.desc}</div>${limited}`;
    }
    return '';
  }
  function showTip(target) {
    tipTarget = target;
    el.tip.innerHTML = tipHTML(target.dataset.tip);
    el.tip.hidden = false;
    placeTip();
  }
  function hideTip() { tipTarget = null; el.tip.hidden = true; }
  // Tooltips float beside the hovered item and never cover the building/upgrade column:
  // items in the right column get their tooltip to the left of that column; everything else
  // goes beside the item on whichever side doesn't overlap the right column.
  function placeTip() {
    if (el.tip.hidden || !tipTarget) return;
    const GAP = 12, EDGE = 8;
    const w = el.tip.offsetWidth, h = el.tip.offsetHeight;
    const t = tipTarget.getBoundingClientRect();
    const inModal = !!tipTarget.closest('.modal');
    const rightCol = innerWidth > 800 && !inModal ? $('#col-right').getBoundingClientRect() : null;
    const inRight = rightCol && tipTarget.closest('#col-right');
    const anchor = inRight ? rightCol : t;
    const hitsRight = x => rightCol && !inRight && x < rightCol.right && x + w > rightCol.left;
    const fits = x => x >= EDGE && x + w <= innerWidth - EDGE && !hitsRight(x);
    const left = anchor.left - GAP - w, right = anchor.right + GAP;
    let x, y;
    if (inRight ? fits(left) : fits(right)) x = inRight ? left : right;
    else if (fits(left)) x = left;
    else if (fits(right)) x = right;
    if (x !== undefined) {
      y = Math.min(Math.max(EDGE, t.top + t.height / 2 - h / 2), innerHeight - h - EDGE);
    } else { // no room at the sides (narrow screens): above or below the item
      const maxX = rightCol && !inRight ? rightCol.left - GAP - w : innerWidth - w - EDGE; // still keep off the right column
      x = Math.max(EDGE, Math.min(t.left + t.width / 2 - w / 2, maxX));
      y = t.bottom + GAP + h <= innerHeight - EDGE ? t.bottom + GAP : Math.max(EDGE, t.top - GAP - h);
    }
    el.tip.style.left = x + 'px';
    el.tip.style.top = y + 'px';
  }
  let lastPointerType = 'mouse';
  document.addEventListener('pointerdown', e => { lastPointerType = e.pointerType; if (e.pointerType !== 'mouse') hideTip(); }, true);
  document.addEventListener('mouseover', e => {
    if (lastPointerType !== 'mouse') return;
    const t = e.target.closest('[data-tip]');
    if (t === tipTarget) return;
    if (t) showTip(t); else hideTip();
  });
  // Scrolling moves the tooltip with its item; it hides once the item leaves the visible part of its list.
  document.addEventListener('scroll', () => {
    if (!tipTarget) return;
    const box = tipTarget.closest('.store, .lair, .upgrades, .modal');
    const t = tipTarget.getBoundingClientRect(), v = box ? box.getBoundingClientRect() : { top: 0, bottom: innerHeight };
    if (t.bottom < v.top + 4 || t.top > v.bottom - 4) hideTip(); else placeTip();
  }, true);

  /* =====================================================================
     Modals
     ===================================================================== */
  let modal = null; // { root, refresh }
  function openModal({ title, html, narrow = false, actions = [], refresh = null, onMount = null }) {
    closeModal();
    const root = document.createElement('div');
    root.className = 'modal-backdrop';
    root.innerHTML = `<div class="modal ${narrow ? 'narrow' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        <button class="sticker modal-close" aria-label="Close">✕</button>
        <h2>${title}</h2><div class="modal-body">${html}</div>
        ${actions.length ? `<div class="modal-actions">${actions.map((a, i) => `<button class="sticker ${a.cls || ''}" data-act="${i}">${a.label}</button>`).join('')}</div>` : ''}
      </div>`;
    root.addEventListener('click', e => { if (e.target === root) closeModal(); });
    root.querySelector('.modal-close').addEventListener('click', closeModal);
    actions.forEach((a, i) => root.querySelector(`[data-act="${i}"]`).addEventListener('click', () => {
      if (a.close) closeModal();
      if (a.onClick) a.onClick();
    }));
    $('#modal-root').appendChild(root);
    modal = { root, refresh };
    if (onMount) onMount(root);
    root.querySelector('.modal-close').focus({ preventScroll: true });
    return root;
  }
  function closeModal() {
    if (!modal) return;
    modal.root.remove();
    modal = null;
    hideTip();
  }
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

  /* ---------- Stats ---------- */
  function statsHTML() {
    const totalOwned = D.BUILDINGS.reduce((s, b) => s + state.buildings[b.id], 0);
    const rows = [
      ['Kuromis in bank', fmt(state.kuromis)],
      ['Kuromis per second', fmt(cache.cps, 1)],
      ['Kuromis per click', fmt(cache.click, 1)],
      ['Collected this run', fmt(state.runEarned)],
      ['Collected all time', fmt(state.allTimeEarned)],
      ['Kuromis from clicking (all time)', fmt(state.handmadeTotal)],
      ['Clicks (run / all time)', `${fmt(state.clicksRun)} / ${fmt(state.clicksTotal)}`],
      ['Buildings owned', fmt(totalOwned)],
      ['Upgrades bought', `${state.upgrades.length} / ${D.UPGRADES.length}`],
      ['Achievements', `${owned.ach.size} / ${D.ACHIEVEMENTS.length}`],
      ['Pinky Promise bonus', `+${(cache.pinkyPct * 100).toFixed(1)}%`],
      ['Gang Loyalty multiplier', `×${cache.globalMult.toFixed(2)}`],
      ['Dream Shards (earned / spendable)', `${state.shardsEarned} / ${shardsAvailable()}`],
      ['Dream Shard bonus', `+${Math.round((cache.shardMult - 1) * 100)}%`],
      ['Times woken up', state.prestiges],
      ['Nightmare Bursts clicked', fmt(state.burstsClicked)],
      ['Total clicks', fmt(state.clicksTotal)],
      ['CRIT clicks / combos filled', `${fmt(state.crits)} / ${fmt(state.combos)}`],
      ['Best Kuromis per second', fmt(state.bestCps, 1)],
      ['Daily gift streak', `${state.daily.streak} day${state.daily.streak === 1 ? '' : 's'} · ${state.daily.claims} opened`],
      ['Time played', fmtTime(state.timePlayed)],
      ...(hasEventStuff() ? [[`${EV.currency.name} (now / all time)`, `${fmt(state.event.treats)} / ${fmt(state.event.treatsTotal)}`]] : []),
      ['This run', fmtTime((Date.now() - state.runStartedAt) / 1000)],
      ['Since you started', fmtTime((Date.now() - state.startedAt) / 1000)],
    ];
    const bought = state.upgrades.map(id => U_BY_ID[id]).filter(Boolean);
    return `<h3 style="margin-top:0">Kuromis per second · last 10 minutes</h3>${cpsGraphSVG()}
      <div class="stat-grid">${rows.map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join('')}</div>
      <h3>Bought upgrades (${bought.length})</h3>
      <div class="icon-grid">${bought.length ? bought.map(u => `<div class="upg type-${u.type}" data-tip="upg:${u.id}">${upgIcon(u)}</div>`).join('') : '<p class="muted small">None yet.</p>'}</div>`;
  }
  // Samples of Kuromis/sec, one every statsSampleSeconds (kept in memory only).
  const cpsHistory = [];
  let lastSampleAt = -Infinity;
  function sampleCps(force = false) {
    const now = performance.now();
    if (!force && now - lastSampleAt < C.statsSampleSeconds * 1000) return;
    lastSampleAt = now;
    cpsHistory.push({ t: Date.now(), v: cache.cps });
    while (cpsHistory.length > C.statsSamples + 1) cpsHistory.shift();
  }
  function cpsGraphSVG() {
    const W = 600, H = 130, PADL = 8, PADR = 8, PADT = 12, PADB = 22;
    if (cpsHistory.length < 2) return `<div class="graph graph-empty muted small">Collecting data… check back in ${C.statsSampleSeconds}s.</div>`;
    const now = Date.now(), span = C.statsSamples * C.statsSampleSeconds * 1000;
    const max = Math.max(...cpsHistory.map(p => p.v), 1e-9);
    const xs = p => PADL + (1 - Math.min(1, (now - p.t) / span)) * (W - PADL - PADR);
    const ys = p => PADT + (1 - p.v / max) * (H - PADT - PADB);
    const pts = cpsHistory.map(p => `${xs(p).toFixed(1)},${ys(p).toFixed(1)}`).join(' ');
    const first = cpsHistory[0], last = cpsHistory[cpsHistory.length - 1];
    const area = `${xs(first).toFixed(1)},${H - PADB} ${pts} ${xs(last).toFixed(1)},${H - PADB}`;
    return `<svg class="graph" viewBox="0 0 ${W} ${H}" role="img" aria-label="Kuromis per second over the last 10 minutes, peak ${fmt(max, 1)}">
      <line x1="${PADL}" x2="${W - PADR}" y1="${H - PADB}" y2="${H - PADB}" class="g-axis"/>
      <line x1="${PADL}" x2="${W - PADR}" y1="${PADT}" y2="${PADT}" class="g-grid"/>
      <polygon points="${area}" class="g-area"/>
      <polyline points="${pts}" class="g-line"/>
      <circle cx="${xs(last).toFixed(1)}" cy="${ys(last).toFixed(1)}" r="4" class="g-dot"/>
      <text x="${PADL}" y="${PADT - 2}" class="g-label">peak ${fmt(max, 1)}/s</text>
      <text x="${PADL}" y="${H - 6}" class="g-label">10 min ago</text>
      <text x="${W - PADR}" y="${H - 6}" class="g-label" text-anchor="end">now · ${fmt(last.v, 1)}/s</text>
    </svg>`;
  }
  function openStats() {
    state.statsOpened = true;
    sampleCps(true);
    openModal({ title: 'Stats', html: statsHTML(), refresh: root => { root.querySelector('.modal-body').innerHTML = statsHTML(); } });
  }

  /* ---------- Achievements ---------- */
  function openAchievements() {
    const groups = [];
    for (const a of D.ACHIEVEMENTS) {
      let g = groups.find(x => x.name === a.group);
      if (!g) groups.push(g = { name: a.group, list: [] });
      g.list.push(a);
    }
    const hiddenLeft = D.ACHIEVEMENTS.filter(a => a.hidden && !owned.ach.has(a.id)).length;
    const milk = owned.ach.size * C.pinkyPerAchievement * 100;
    const html = `<p>Unlocked <b>${owned.ach.size}</b> / ${D.ACHIEVEMENTS.length} · Pinky Promise: <b>${Math.round(milk)}%</b>
        → production bonus <b>+${(cache.pinkyPct * 100).toFixed(1)}%</b>${cache.pinkyUpgMult ? '' : ' <span class="muted small">(buy Pinky Promise upgrades to cash it in)</span>'}</p>
      ${groups.map(g => {
        const shown = g.list.filter(a => !a.hidden || owned.ach.has(a.id));
        if (!shown.length) return '';
        return `<div class="ach-group-title">${esc(g.name)}</div><div class="icon-grid">${shown.map(a => {
          const got = owned.ach.has(a.id);
          const icon = a.req.type === 'owned' ? bIcon(B_BY_ID[a.req.b]) : a.icon;
          return `<div class="ach ${got ? '' : 'locked'} ${a.hidden ? 'hidden-ach' : ''} ${a.limited ? 'limited' : ''}" data-tip="ach:${a.id}">${got ? icon : '???'}</div>`;
        }).join('')}</div>`;
      }).join('')}
      ${hiddenLeft ? `<p class="muted small" style="margin-top:14px">…and ${hiddenLeft} secret achievement${hiddenLeft > 1 ? 's' : ''} you haven't found yet.</p>` : ''}`;
    openModal({ title: 'Achievements', html });
  }

  /* ---------- Dream Shop ---------- */
  function dreamShopHTML() {
    const pending = shardsPending();
    const avail = shardsAvailable();
    return `<p class="shard-count">💎 ${avail} Dream Shard${avail === 1 ? '' : 's'} to spend</p>
      <p class="muted small">Every Dream Shard you've ever earned gives <b>+${Math.round(C.shardBonus * 100)}%</b> production forever — spending them here doesn't remove the bonus. Earned so far: ${state.shardsEarned}.</p>
      ${D.DREAM_PERKS.map(p => {
        const got = hasPerk(p.id);
        return `<div class="perk ${got ? 'owned' : ''}"><div class="p-ico">${p.icon}</div>
          <div><div class="p-name">${esc(p.name)}</div><div class="p-desc">${p.desc}</div></div>
          <button class="sticker ${got ? '' : 'pink'}" data-perk="${p.id}" ${got || avail < p.cost ? 'disabled' : ''}>${got ? 'Owned' : `💎 ${p.cost}`}</button></div>`;
      }).join('')}
      <h3>Wake Up</h3>
      ${canWake()
        ? `<p>You can wake up now for <b>+${pending}</b> Dream Shard${pending === 1 ? '' : 's'}.</p><button class="sticker wake" data-wake="1">☾ Wake Up…</button>`
        : `<p class="muted">Collect <b>${fmt(C.prestigeThreshold)}</b> Kuromis all-time to wake up (${fmt(state.allTimeEarned)} so far).</p>`}`;
  }
  function openDreamShop() {
    const mount = root => {
      root.querySelectorAll('[data-perk]').forEach(btn => btn.addEventListener('click', () => {
        const p = P_BY_ID[btn.dataset.perk];
        if (hasPerk(p.id) || shardsAvailable() < p.cost) return;
        state.shardsSpent += p.cost;
        state.perks.push(p.id); owned.perk.add(p.id);
        if (p.id === 'theme_bubblegum') setSkin('bubblegum');
        if (p.id === 'theme_goth') setSkin('goth');
        checkSkins();
        if (p.id === 'burst_often' && !burst) state.burstTimer = Math.min(state.burstTimer, burstDelay());
        sound('buy');
        save();
        root.querySelector('.modal-body').innerHTML = dreamShopHTML();
        mount(root);
      }));
      const w = root.querySelector('[data-wake]');
      if (w) w.addEventListener('click', openPrestige);
    };
    openModal({ title: 'Dream Shop', html: dreamShopHTML(), onMount: mount });
  }

  /* ---------- Event panel + Treat shop ---------- */
  function buyShopItem(id) {
    const it = SHOP_BY_ID[id];
    if (!it || !eventOn || state.event.treats < it.cost) return false;
    if (it.kind === 'boost') {
      if (hasBuff(it.buff)) return false;                    // one of each at a time
      addBuff(it.buff, it.duration);
    } else {
      if (evOwns(id)) return false;
      state.event.owned.push(id);
      if (it.kind === 'costume') state.event.costume = id;  // wear it right away
      if (it.kind === 'font') state.event.tickerFont = true;
      if (it.kind === 'cursor') state.event.batCursor = true;
      if (it.kind === 'skin') { checkSkins(); setSkin(it.skin); }
    }
    state.event.treats -= it.cost;
    $('#treats').textContent = fmt(state.event.treats);
    dirty = true;
    applyCosmetics();
    sound('buy'); confetti();
    checkAchievements();
    save();
    return true;
  }
  function wearCostume(id) {
    if (id && !evOwns(id)) return false;
    state.event.costume = id || '';
    applyCosmetics();
    save();
    return true;
  }
  function eventPanelHTML() {
    const t = state.event.treats, on = eventOn;
    const end = eventEndsAt(), left = end ? (end - clock.now()) / 1000 : 0;
    const preview = on && state.settings.eventOverride !== 'auto' && !inEventWindow(clock.now());
    const status = preview
      ? `${bdayOn ? `${SD.icon} <b>${SD.name}</b> preview. ` : ''}<b>Preview mode</b> (debug toggle). The real event runs Oct ${EV.start[1]} – Nov ${EV.end[1]}.`
      : on
      ? `${bdayOn ? `${SD.icon} <b>${SD.name}!</b> ×${SD.treatDropMult} Treats and Birthday Cakes today. · ` : ''}Ends in <b>${left > 86400 ? `${Math.floor(left / 86400)}d ${Math.floor(left % 86400 / 3600)}h` : fmtTime(left)}</b>`
      : `The event is over. Your Treats, cosmetics and achievements are saved for next year (Oct ${EV.start[1]} – Nov ${EV.end[1]}). The shop is browse-only until then.`;
    const btn = it => {
      const owns = it.kind !== 'boost' && evOwns(it.id);
      if (it.kind === 'costume' && owns) return state.event.costume === it.id
        ? `<button class="sticker" data-wear="">Take off</button>` : `<button class="sticker pink" data-wear="${it.id}">Wear</button>`;
      if (it.kind === 'font' && owns) return `<button class="sticker ${state.event.tickerFont ? '' : 'pink'}" data-toggle="tickerFont">${state.event.tickerFont ? 'On' : 'Off'}</button>`;
      if (it.kind === 'cursor' && owns) return `<button class="sticker ${state.event.batCursor ? '' : 'pink'}" data-toggle="batCursor">${state.event.batCursor ? 'On' : 'Off'}</button>`;
      if (owns) return `<button class="sticker" disabled>Owned</button>`;
      const active = it.kind === 'boost' && state.buffs.find(b => b.type === it.buff);
      if (active) return `<button class="sticker" disabled>Active · ${fmtTime(active.left)}</button>`;
      return `<button class="sticker pink" data-buy="${it.id}" ${!on || t < it.cost ? 'disabled' : ''}>🍬 ${fmt(it.cost)}</button>`;
    };
    const card = it => `<div class="shop-item ${it.kind !== 'boost' && evOwns(it.id) ? 'owned' : ''}">
        <div class="si-ico">${it.art ? `<img src="${window.KICONS.uri(it.art)}" alt="">` : it.icon}</div>
        <div><div class="si-name">${esc(it.name)}${it.kind !== 'boost' && evOwns(it.id) ? ' <span class="si-owned">Owned</span>' : ''}</div><div class="si-desc">${it.desc}</div></div>
        ${btn(it)}</div>`;
    const group = (title, kinds) => `<h3>${title}</h3><div class="shop-grid">${EV.shop.filter(i => kinds.includes(i.kind)).map(card).join('')}</div>`;
    return `<p class="event-status">${status}</p>
      <div class="treat-balance">${EV.currency.icon} <b>${fmt(t)}</b> ${EV.currency.name} <span class="muted small">· ${fmt(state.event.treatsTotal)} collected all-time</span></div>
      <p class="muted small">Treats drop from ~${Math.round(EV.currency.dropChance * 100)}% of clicks and from Trick-or-Treat Bursts (orange). A Trick is a harmless 20s prank that still pays ×${EV.trick.prodMult} production.</p>
      ${group('Costumes', ['costume'])}
      ${group('Boosts (one of each at a time)', ['boost'])}
      ${group('Cosmetics & the big wish', ['skin', 'font', 'cursor', 'upgrade'])}
      <h3>Event stats</h3>
      <div class="stat-grid">
        <div class="k">Trick-or-Treat Bursts</div><div class="v">${state.event.tbursts}</div>
        <div class="k">Times tricked</div><div class="v">${state.event.tricked}</div>
        <div class="k">Birthday Cakes</div><div class="v">${state.event.cakes}</div>
      </div>`;
  }
  function openEvent() {
    const mount = root => {
      const redraw = () => { root.querySelector('.modal-body').innerHTML = eventPanelHTML(); mount(root); };
      root.querySelectorAll('[data-buy]').forEach(b => b.addEventListener('click', () => { if (buyShopItem(b.dataset.buy)) redraw(); }));
      root.querySelectorAll('[data-wear]').forEach(b => b.addEventListener('click', () => { wearCostume(b.dataset.wear); redraw(); }));
      root.querySelectorAll('[data-toggle]').forEach(b => b.addEventListener('click', () => { state.event[b.dataset.toggle] = !state.event[b.dataset.toggle]; applyCosmetics(); save(); redraw(); }));
    };
    openModal({ title: `${EV.icon} ${EV.name}`, html: eventPanelHTML(), onMount: mount });
  }

  /* ---------- Prestige confirm ---------- */
  function openPrestige() {
    if (!canWake()) { openDreamShop(); return; }
    const pending = shardsPending();
    const newTotal = state.shardsEarned + pending;
    openModal({
      title: '☾ Wake Up?',
      html: `<p>All of this was a dream. Wake up and start over — but stronger.</p>
        <div class="big-number">+${pending} Dream Shard${pending === 1 ? '' : 's'}</div>
        <p class="muted small" style="text-align:center">Total after waking: ${newTotal} → <b>+${Math.round(newTotal * C.shardBonus * 100)}%</b> permanent production</p>
        <div class="keep-lose">
          <div class="keep"><b>You keep</b><ul class="skull-list">
            <li>All ${owned.ach.size} achievements (and their Pinky Promise)</li>
            <li>Dream Shards &amp; Dream Shop perks</li>
            <li>All-time stats</li>
            ${hasPerk('keep_bank') ? `<li>1% of your Kuromis (${fmt(state.kuromis * 0.01)})</li>` : ''}
            ${hasPerk('start_notes') ? '<li>A fresh start with 10 Mischief Notes</li>' : ''}
          </ul></div>
          <div class="lose"><b>You lose</b><ul class="skull-list">
            <li>${fmt(state.kuromis)} Kuromis in the bank</li>
            <li>All ${D.BUILDINGS.reduce((s, b) => s + state.buildings[b.id], 0)} buildings</li>
            <li>All ${state.upgrades.length} upgrades</li>
            <li>Active buffs</li>
          </ul></div>
        </div>
        ${pending === 0 ? '<p class="muted small">Heads up: you would gain 0 shards right now.</p>' : ''}`,
      actions: [
        { label: 'Keep dreaming', close: true },
        { label: '☾ Wake Up', cls: 'wake', close: true, onClick: wakeUp },
      ],
    });
  }

  /* ---------- Settings ---------- */
  function settingsHTML() {
    const s = state.settings;
    const sw = (key, label) => `<label class="setting-row"><span>${label}</span><span class="switch"><input type="checkbox" data-set="${key}" ${s[key] ? 'checked' : ''}><span></span></span></label>`;
    const slider = (key, label) => `<label class="setting-row"><span>${label}</span><input type="range" min="0" max="1" step="0.05" data-set="${key}" value="${s[key]}" aria-label="${label}"></label>`;
    const skins = D.SKINS.filter(sk => !sk.event || skinUnlocked(sk) || eventOn).map(sk => {
      const open = skinUnlocked(sk), on = document.body.dataset.theme === sk.id;
      return `<button class="skin-btn ${on ? 'on' : ''}" data-skin="${sk.id}" ${open ? '' : 'disabled'} aria-pressed="${on}">
        <span class="skin-swatch">${sk.preview.map(c => `<i style="background:${c}"></i>`).join('')}</span>
        <span class="skin-name">${esc(sk.name)}</span>
        <span class="skin-req">${open ? (on ? 'Wearing it' : 'Tap to wear') : `🔒 ${skinReq(sk)}`}</span></button>`;
    }).join('');
    return `${sw('particles', 'Particles')}${sw('floaters', 'Floating numbers')}${sw('haptics', 'Haptic feedback <span class="muted small">(Android)</span>')}
      <h3>Sound</h3>
      ${sw('sound', 'Sound effects')}${slider('sfxVolume', 'Effects volume')}
      ${sw('music', 'Background music')}${slider('musicVolume', 'Music volume')}
      <h3>Skins</h3>
      <div class="skin-grid">${skins}</div>
      <h3>Display</h3>
      <label class="setting-row"><span>Number format</span><select data-set="numberFormat">
        <option value="short" ${s.numberFormat === 'short' ? 'selected' : ''}>Short (1.23M)</option>
        <option value="sci" ${s.numberFormat === 'sci' ? 'selected' : ''}>Scientific (1.23e6)</option></select></label>
      <h3>Export save</h3>
      <textarea class="save-box" id="export-box" readonly></textarea>
      <div class="modal-actions" style="justify-content:flex-start"><button class="sticker" id="copy-btn">Copy</button><button class="sticker" id="save-now">Save now</button></div>
      <h3>Import save</h3>
      <textarea class="save-box" id="import-box" placeholder="Paste a save string here"></textarea>
      <div class="modal-actions" style="justify-content:flex-start;align-items:center"><button class="sticker pink" id="import-btn">Import</button><span id="import-msg" class="muted small"></span></div>
      <h3>Danger zone</h3>
      <button class="sticker danger" id="hard-reset">Hard reset…</button>
      <p class="muted small">Kuromi Clicker is a personal, non-commercial fan project. Kuromi © Sanrio.</p>`;
  }
  function openSettings() {
    openModal({
      title: 'Settings', html: settingsHTML(), onMount: root => {
        root.querySelector('#export-box').value = exportSave();
        root.querySelectorAll('[data-set]').forEach(inp => inp.addEventListener(inp.type === 'range' ? 'input' : 'change', () => {
          const k = inp.dataset.set;
          state.settings[k] = inp.type === 'checkbox' ? inp.checked : inp.type === 'range' ? Number(inp.value) : inp.value;
          if (inp.type === 'range') applyVolumes();
          if (k === 'sound' && inp.checked) { ctxGet(); sound('chime'); }
          if (k === 'music') { if (inp.checked) startMusic(); else stopMusic(); }
          ui.upgKey = null;
          if (inp.type !== 'range') save();
        }));
        root.querySelectorAll('[data-set][type=range]').forEach(inp => inp.addEventListener('change', () => { save(); if (inp.dataset.set === 'sfxVolume') sound('pop'); }));
        root.querySelectorAll('[data-skin]').forEach(btn => btn.addEventListener('click', () => {
          if (!setSkin(btn.dataset.skin)) return;
          sound('buy');
          save();
          root.querySelectorAll('[data-skin]').forEach(b => {
            const on = b.dataset.skin === btn.dataset.skin;
            b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on));
            if (!b.disabled) b.querySelector('.skin-req').textContent = on ? 'Wearing it' : 'Tap to wear';
          });
        }));
        root.querySelector('#copy-btn').addEventListener('click', async e => {
          const box = root.querySelector('#export-box');
          box.value = exportSave();
          try { await navigator.clipboard.writeText(box.value); }
          catch (err) { box.select(); document.execCommand('copy'); }
          e.target.textContent = 'Copied!';
          setTimeout(() => { e.target.textContent = 'Copy'; }, 1500);
        });
        root.querySelector('#save-now').addEventListener('click', e => {
          save(); root.querySelector('#export-box').value = exportSave();
          e.target.textContent = 'Saved!'; setTimeout(() => { e.target.textContent = 'Save now'; }, 1500);
        });
        root.querySelector('#import-btn').addEventListener('click', () => {
          try {
            importSave(root.querySelector('#import-box').value);
            closeModal();
            toast('Save imported', 'Welcome back!', 'Your save was loaded.');
          } catch (err) {
            root.querySelector('#import-msg').textContent = 'That save string looks broken.';
          }
        });
        root.querySelector('#hard-reset').addEventListener('click', confirmHardReset);
      },
    });
  }
  function confirmHardReset() {
    openModal({
      title: 'Hard reset?', narrow: true,
      html: '<p>This wipes <b>everything</b>: Kuromis, buildings, upgrades, achievements, Dream Shards and perks.</p>',
      actions: [{ label: 'Nope', close: true }, {
        label: 'Yes, reset', cls: 'danger', onClick: () => openModal({
          title: 'Really really?', narrow: true,
          html: '<p>Last chance. Baku is looking at you with big sad eyes. 🥺</p>',
          actions: [{ label: 'I changed my mind', close: true }, {
            label: 'Wipe it all', cls: 'danger', close: true,
            onClick: () => { hardReset(); toast('Hard reset', 'Fresh start', 'Everything is gone. Even the diary.'); },
          }],
        }),
      }],
    });
  }

  /* =====================================================================
     Debug panel (press D three times)
     ===================================================================== */
  const dPresses = [];
  function buildDebug() {
    const dbg = $('#debug');
    const btns = [
      ['+1K', () => earn(1e3)], ['+1M', () => earn(1e6)], ['+1B', () => earn(1e9)], ['+1T', () => earn(1e12)],
      ['×100 speed', b => { debugSpeed = debugSpeed === 1 ? 100 : 1; b.textContent = debugSpeed === 1 ? '×100 speed' : 'normal speed'; }],
      ['Spawn burst', () => { if (burst) removeBurst(); spawnBurst(); }],
      ['Frenzy', () => addBuff('frenzy', C.frenzy.duration)],
      ['Spawn cake', () => { if (burst) removeBurst(); spawnBurst(true); }],
      ['Fill combo', () => { combo = 0.99; }],
      ['Next click = CRIT', () => { state.clicksTotal = Math.ceil((state.clicksTotal + 1) / C.crit.every) * C.crit.every - 1; }],
      ['Skip a day', () => { clock.offset += 864e5; toast('Debug', 'Tomorrow already?', dayKey(clock.now())); }],
      ['Event: auto', b => {
        const order = ['auto', 'on', 'birthday', 'off']; // auto = device date · on = force event · birthday = force Birthday Day
        state.settings.eventOverride = order[(order.indexOf(state.settings.eventOverride) + 1) % order.length];
        b.textContent = 'Event: ' + state.settings.eventOverride;
        updateEvent(true);
      }],
      ['+100 Treats', () => { gainTreats(100); }],
      ['Unlock all', () => { D.ACHIEVEMENTS.forEach(a => award(a, true)); D.BUILDINGS.forEach(b => { state.revealed[b.id] = true; }); toast('Debug', 'Unlocked everything', 'All achievements & buildings revealed.'); }],
      ['Fake 1h away', () => {
        save();
        const raw = JSON.parse(localStorage.getItem(SAVE_KEY));
        raw.lastSaved -= 3600e3;
        localStorage.setItem(SAVE_KEY, JSON.stringify(raw));
        savingSuspended = true;
        location.reload();
      }],
      ['Reset', () => hardReset()],
    ];
    dbg.innerHTML = '<div class="dbg-title">🛠 debug (press D×3 to hide)</div>';
    btns.find(x => x[0] === 'Event: auto')[0] = 'Event: ' + state.settings.eventOverride;
    btns.forEach(([label, fn]) => {
      const b = document.createElement('button');
      b.className = 'sticker';
      b.textContent = label;
      b.addEventListener('click', () => { sync(); fn(b); dirty = true; });
      dbg.appendChild(b);
    });
  }
  document.addEventListener('keydown', e => {
    if (e.target.matches && e.target.matches('input, textarea, select')) return;
    if (!e.key || e.key.toLowerCase() !== 'd' || e.repeat) return;
    const now = performance.now();
    dPresses.push(now);
    while (dPresses.length && now - dPresses[0] > 1200) dPresses.shift();
    if (dPresses.length >= 3) {
      dPresses.length = 0;
      const dbg = $('#debug');
      if (!dbg.children.length) buildDebug();
      dbg.hidden = !dbg.hidden;
    }
  });

  /* =====================================================================
     Wiring
     ===================================================================== */
  // pointerdown fires the moment a finger lands (no 300ms delay) and once per finger for multi-touch.
  kuromiBtn.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.pointerType !== 'mouse') e.preventDefault(); // no emulated mouse events / text selection
    clickKuromi(e);
  });
  // Keyboard (Enter/Space) still works: those clicks have detail 0; pointer clicks are ignored here.
  kuromiBtn.addEventListener('click', e => { if (e.detail === 0) clickKuromi(e); });
  kuromiBtn.addEventListener('contextmenu', e => e.preventDefault());

  const kImg = $('#kuromi-img');
  const showPlaceholder = () => { kImg.hidden = true; $('#kuromi-placeholder').hidden = false; };
  kImg.addEventListener('error', showPlaceholder);
  if (kImg.complete && kImg.naturalWidth === 0) showPlaceholder();

  $('#title').addEventListener('click', () => { state.titleClicks++; });

  el.store.addEventListener('click', e => {
    const row = e.target.closest('.bld');
    if (!row || row.classList.contains('mystery')) return;
    sync();
    const ok = buyMode === 'buy' ? buyBuilding(row.dataset.id) : sellBuilding(row.dataset.id);
    if (ok) { if (dirty) recalc(); renderStore(); renderLair(); if (tipTarget) showTip(tipTarget); }
  });
  el.upgrades.addEventListener('click', e => {
    const btn = e.target.closest('[data-upg]');
    if (!btn) return;
    sync();
    if (buyUpgrade(btn.dataset.upg)) { recalc(); renderUpgrades(); }
  });
  $('#mode-seg').addEventListener('click', e => {
    const b = e.target.closest('[data-mode]');
    if (!b) return;
    buyMode = b.dataset.mode;
    $$('#mode-seg .seg-btn').forEach(x => x.classList.toggle('active', x === b));
    renderStore();
  });
  $('#amount-seg').addEventListener('click', e => {
    const b = e.target.closest('[data-amt]');
    if (!b) return;
    buyAmt = b.dataset.amt === 'max' ? 'max' : Number(b.dataset.amt);
    $$('#amount-seg .seg-btn').forEach(x => x.classList.toggle('active', x === b));
    renderStore();
  });
  const OPENERS = { event: () => openEvent(), stats: () => openStats(), achievements: () => openAchievements(), dreamshop: () => openDreamShop(), settings: () => openSettings(), prestige: () => openPrestige() };
  $$('[data-open]').forEach(b => b.addEventListener('click', () => { sync(); if (dirty) recalc(); OPENERS[b.dataset.open](); }));

  window.addEventListener('beforeunload', () => save());
  window.addEventListener('pagehide', () => save());
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { save(); if (actx && actx.state === 'running') actx.suspend(); }
    else { sync(); if (actx && (state.settings.music || state.settings.sound)) actx.resume(); }
  });
  // Browsers only allow audio after a gesture: start saved-on music at the first tap/click.
  document.addEventListener('pointerdown', () => { if (state.settings.music) startMusic(); }, { once: true, capture: true });
  $('#event-banner').addEventListener('click', () => { sync(); openEvent(); });
  $('#gift-btn').addEventListener('click', () => {
    if (giftReady()) claimDaily();
    else toast('Daily gift', 'Already opened today', `Next gift in ${fmtTime(secsToTomorrow())}. Streak: ${state.daily.streak} day${state.daily.streak === 1 ? '' : 's'}.`);
  });

  /* =====================================================================
     Loops
     ===================================================================== */
  // Displayed numbers count up smoothly (and drop instantly when you spend).
  const shown = { bank: 0, cps: 0, t: performance.now() };
  function ease(cur, target, dt) {
    if (!Number.isFinite(cur) || target < cur || reducedMotion.matches) return target;
    const next = cur + (target - cur) * Math.min(1, dt * C.countUpSpeed);
    return target - next < Math.max(0.05, target * 1e-4) ? target : next;
  }
  function frame(now) {
    sync();
    if (dirty) recalc();
    const dt = Math.min(0.25, ((now || performance.now()) - shown.t) / 1000);
    shown.t = now || performance.now();
    shown.bank = ease(shown.bank, state.kuromis, dt);
    shown.cps = ease(shown.cps, cache.cps, dt);
    el.bank.textContent = fmt(shown.bank);
    el.cps.textContent = fmt(shown.cps, 1);
    renderBuffs();
    renderCombo();
    renderFrenzyFx(shown.t);
    renderTrick();
    requestAnimationFrame(frame);
  }

  function renderCombo() {
    const cb = state.buffs.find(b => b.type === 'combo');
    const fill = cb ? cb.left / cb.total : combo;
    $('#combo-fill').style.width = (fill * 100).toFixed(1) + '%';
    $('#combo').classList.toggle('hot', !!cb);
    $('#combo-name').textContent = cb ? `COMBO ×${C.combo.mult}!` : 'Combo';
    $('#combo-text').textContent = cb ? Math.ceil(cb.left) + 's' : (combo > 0.02 ? Math.round(combo * 100) + '%' : 'click fast!');
  }

  // Soft pink vignette + a light shake now and then while Frenzy/Cake is running.
  let frenzyWas = false, lastShake = 0;
  function renderFrenzyFx(now) {
    const on = hasBuff('frenzy') || hasBuff('cake');
    document.body.classList.toggle('frenzy', on);
    if (on && (!frenzyWas || now - lastShake > C.frenzyShakeEvery * 1000)) { shake(); lastShake = now; }
    frenzyWas = on;
  }
  function shake() {
    if (reducedMotion.matches) return;
    $('.columns').animate([
      { transform: 'translate(0,0)' }, { transform: 'translate(-3px,1px)' }, { transform: 'translate(3px,-2px)' },
      { transform: 'translate(-2px,2px)' }, { transform: 'translate(2px,-1px)' }, { transform: 'translate(0,0)' },
    ], { duration: 420, easing: 'ease-out' });
  }

  /* ---------- Next goals: the closest milestones / upgrades, with progress ---------- */
  function achProgress(a) {
    const q = a.req, n = q.n;
    const b = D.BUILDINGS.reduce((t, x) => t + state.buildings[x.id], 0);
    const cur = {
      earned: state.allTimeEarned, cps: cache.cps, clicks: state.clicksTotal, handmade: state.handmadeTotal,
      owned: q.b && state.buildings[q.b], upgrades: state.upgrades.length, bursts: state.burstsClicked, prestige: state.prestiges,
      combos: state.combos, crits: state.crits, dailyClaims: state.daily.claims, streak: state.daily.streak,
      skins: state.skinsUnlocked.length, timePlayed: state.timePlayed, totalBuildings: b,
      evCakes: eventOn ? state.event.cakes : undefined, evEarned: eventOn ? state.event.earned : undefined,
    }[q.type];
    if (cur === undefined || !n) return null;
    return { cur, need: n, time: q.type === 'timePlayed' };
  }
  function goalList() {
    const out = [];
    for (const a of D.ACHIEVEMENTS) {
      if (owned.ach.has(a.id) || a.hidden || (a.limited && !eventOn)) continue;
      const p = achProgress(a);
      if (!p) continue;
      const icon = a.req.type === 'owned' ? bIcon(B_BY_ID[a.req.b]) : `<span class="g-emoji">${a.icon}</span>`;
      out.push({ key: 'ach:' + a.group, icon, name: a.name, desc: a.desc, ...p, tip: 'ach:' + a.id });
    }
    for (const u of visibleUpgrades()) {
      if (u.cost <= state.kuromis) continue; // affordable ones are already waiting in the shop
      out.push({ key: 'upg', icon: `<span class="g-upg">${upgIcon(u)}</span>`, name: u.name, desc: `Save up for this ${u.type === 'tier' ? 'building upgrade' : 'upgrade'}.`, cur: state.kuromis, need: u.cost, tip: 'upg:' + u.id });
    }
    if (!canWake()) out.push({ key: 'wake', icon: '<span class="g-emoji">🌙</span>', name: 'Wake Up', desc: `Collect <b>${fmt(C.prestigeThreshold)}</b> Kuromis all-time to earn Dream Shards.`, cur: state.allTimeEarned, need: C.prestigeThreshold });
    // closest first, at most one per kind so the card stays varied
    const seen = new Set(), picked = [];
    for (const g of out.map(g => ({ ...g, pct: Math.min(1, g.cur / g.need) })).filter(g => g.pct < 1).sort((a, b) => b.pct - a.pct)) {
      if (seen.has(g.key)) continue;
      seen.add(g.key); picked.push(g);
      if (picked.length >= C.goalsShown) break;
    }
    return picked;
  }
  function renderGoals() {
    const list = goalList();
    $('#goals-list').innerHTML = list.length ? list.map(g => `
      <div class="goal" ${g.tip ? `data-tip="${g.tip}"` : ''}>
        <div class="g-icon">${g.icon}</div>
        <div class="g-body">
          <div class="g-top"><span class="g-name">${esc(g.name)}</span><span class="g-pct">${Math.floor(g.pct * 100)}%</span></div>
          <div class="g-desc">${g.desc}</div>
          <div class="g-line">
            <div class="g-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.floor(g.pct * 100)}"><div style="width:${(g.pct * 100).toFixed(1)}%"></div></div>
            <span class="g-nums">${g.time ? fmtTime(g.cur) : fmt(g.cur, g.cur < 1000 ? 1 : 0)} / ${g.time ? fmtTime(g.need) : fmt(g.need)}</span>
          </div>
        </div>
      </div>`).join('') : '<p class="muted small">Nothing left to chase… for now. 😈</p>';
  }

  /* ---------- Daily login gift ---------- */
  function secsToTomorrow() {
    const n = clock.now();
    return (new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1) - n) / 1000;
  }
  function renderGift() {
    const btn = $('#gift-btn'), ready = giftReady();
    btn.classList.toggle('ready', ready);
    btn.setAttribute('aria-label', ready ? 'Daily gift ready — open it' : 'Daily gift already opened');
    $('#gift-streak').textContent = ready ? '!' : state.daily.streak || '';
  }
  const giftReady = () => state.daily.last !== dayKey(clock.now());
  function dailyReward(streak) {
    const mult = 1 + C.daily.streakBonus * (Math.min(streak, C.daily.maxStreak) - 1);
    return Math.max(C.daily.minReward, cache.cpsNoBuff * C.daily.minutes * 60) * mult * (bdayOn ? SD.giftMult : 1);
  }
  function claimDaily() {
    if (!giftReady()) return 0;
    sync(); if (dirty) recalc();
    const today = clock.now();
    const y = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
    const streak = state.daily.last === dayKey(y) ? state.daily.streak + 1 : 1; // missed a day → back to 1
    const reward = dailyReward(streak);
    earn(reward);
    state.daily = { last: dayKey(today), streak, claims: state.daily.claims + 1 };
    if (bdayOn) gainTreats(SD.giftTreats);
    renderGift();
    const days = Array.from({ length: C.daily.maxStreak }, (_, i) =>
      `<span class="streak-dot ${i < Math.min(streak, C.daily.maxStreak) ? 'on' : ''}">${i + 1}</span>`).join('');
    const bonus = Math.round(C.daily.streakBonus * (Math.min(streak, C.daily.maxStreak) - 1) * 100);
    openModal({
      title: bdayOn ? '🎂 Birthday gift!' : '🎁 Daily gift!', narrow: true,
      html: `<p>${bdayOn ? `A birthday present! ×${SD.giftMult} the usual, plus Treats.` : "Baku dragged in a present. It's slightly chewed."}</p>
        <div class="big-number"><span class="skull-ico"></span> +${fmt(reward)} Kuromis</div>
        ${bdayOn ? `<div class="big-number">+${SD.giftTreats} ${EV.currency.icon}</div>` : ''}
        <div class="streak">${days}</div>
        <p class="muted small" style="text-align:center">Day ${streak} streak${bonus ? ` · +${bonus}% streak bonus` : ''} · worth ${C.daily.minutes} minutes of production. Come back tomorrow!</p>`,
      actions: [{ label: 'Mine!', cls: 'pink', close: true }],
    });
    sound('fanfare');
    confetti();
    save();
    return reward;
  }

  /* ---------- Birthday event overlay ---------- */
  function updateEvent(force = false) {
    const on = eventActive(), bday = on && onSpecialDay();
    for (const t of $$('.event-trigger')) t.hidden = !(on || hasEventStuff());
    if (!force && on === eventOn && bday === bdayOn && document.body.classList.contains('event-halloween') === on) { renderEventBanner(); return; }
    eventOn = on; bdayOn = bday;
    document.body.classList.toggle('event-halloween', on);
    document.body.classList.toggle('event-bday', bday);
    $('#event-banner').hidden = !on;
    $('#treats-pill').hidden = !on;
    $('#treats').textContent = fmt(state.event.treats);
    renderEventBanner();
    // a few slow bats + tiny pumpkins drifting in the background
    const layer = $('#event-layer');
    layer.innerHTML = '';
    if (on) {
      EV.decor.forEach((id, i) => {
        const d = document.createElement('img');
        d.className = 'event-item';
        d.src = window.KICONS.uri(id); d.alt = '';
        d.style.top = rand(8, 88) + 'vh';
        d.style.width = (id === 'ev_bat' ? rand(26, 38) : rand(18, 26)) + 'px';
        d.style.animationDuration = rand(55, 90) + 's';
        d.style.animationDelay = -rand(0, 90) + 's';
        if (i % 2) d.style.animationDirection = 'reverse';
        layer.appendChild(d);
      });
      if (!state.event.played) { state.event.played = true; toast('Event', EV.name + '!', 'Treats 🍬 drop from clicks and Trick-or-Treat Bursts. Tap the banner to shop.'); }
      if (bday && state.event.greeted !== dayKey(clock.now())) {
        state.event.greeted = dayKey(clock.now());
        setTimeout(() => {
          confetti(); confetti(); sound('fanfare');
          const html = `<div class="bday-hero">🎂</div><p style="text-align:center">It's Kuromi's birthday! All day: <b>×${SD.treatDropMult} Treats</b>, Birthday Cake bursts (×${EV.cake.mult} production), and a <b>special birthday gift</b>.</p>`;
          if (!modal) openModal({ title: 'Happy Birthday, Kuromi!', narrow: true, html, actions: [{ label: 'Party time', cls: 'pink', close: true }] });
          else toast(SD.name, 'Happy Birthday, Kuromi!', `×${SD.treatDropMult} Treats and Birthday Cakes all day!`);
        }, 400);
      }
    }
    fitLair();
    checkTicker();
  }
  function renderEventBanner() {
    if (!eventOn) return;
    const end = eventEndsAt(), left = end ? (end - clock.now()) / 1000 : 0;
    const preview = state.settings.eventOverride !== 'auto' && !inEventWindow(clock.now());
    const when = left > 86400 ? `${Math.floor(left / 86400)}d ${Math.floor(left % 86400 / 3600)}h` : fmtTime(left);
    $('#event-banner-text').textContent = bdayOn
      ? `${SD.icon} ${SD.name}! ×${SD.treatDropMult} Treats & Birthday Cakes · ${EV.name}${preview ? ' (preview)' : `, ends in ${when}`}`
      : `${EV.icon} ${EV.name}${preview ? ' (preview)' : `, ends in ${when}`}`;
  }


  let slowTicks = 0;
  function slowTick() {
    sync();
    if (dirty) recalc();
    if (slowTicks % 10 === 0) updateEvent();
    else if (slowTicks % 5 === 0) renderEventBanner();
    if (bdayOn && state.event.costume) state.event.bdayCostume = true;
    if (cache.cps > state.bestCps) state.bestCps = cache.cps;
    sampleCps();
    renderGift();
    checkSkins();
    for (const b of D.BUILDINGS) if (!state.revealed[b.id] && state.kuromis >= b.baseCost / 2) state.revealed[b.id] = true;
    checkAchievements();
    if (dirty) recalc();
    renderStore();
    renderUpgrades();
    renderLair();
    renderDecor();
    el.click.textContent = fmt(cache.click, 1);
    for (const w of el.wake) w.hidden = !canWake();
    renderPhoneBits();
    if (tipTarget) {
      if (!document.body.contains(tipTarget)) hideTip();
      else { el.tip.innerHTML = tipHTML(tipTarget.dataset.tip); placeTip(); }
    }
    if (slowTicks % 5 === 0) { renderGoals(); checkTicker(); }
    if (++slowTicks % 5 === 0) {
      document.title = `${fmt(state.kuromis)} Kuromis · Kuromi Clicker`;
      if (modal && modal.refresh) modal.refresh(modal.root);
    }
  }

  /* =====================================================================
     Phone layout: bottom tab bar (Click / Buildings / Upgrades / More)
     ===================================================================== */
  const TAB_KEY = 'kuromiClicker.tab'; // UI-only; the save lives under SAVE_KEY
  let mtab = 'click';

  function updateHeadMode() {
    // Big character on the Click tab; compact sticky header elsewhere and on short screens.
    document.body.classList.toggle('head-compact', mtab !== 'click' || innerHeight < 600);
  }
  function setMTab(t, scroll = true) {
    mtab = t;
    document.body.dataset.mtab = t;
    $$('.mtab').forEach(b => { const on = b.dataset.mtab === t; b.classList.toggle('active', on); b.setAttribute('aria-pressed', String(on)); });
    updateHeadMode();
    hideTip();
    if (scroll) window.scrollTo(0, 0);
    if (t === 'more') renderMoreStats();
    try { localStorage.setItem(TAB_KEY, t); } catch (e) { /* storage blocked */ }
  }
  function initPhoneTabs() {
    $$('.mtab').forEach(b => b.addEventListener('click', () => setMTab(b.dataset.mtab)));
    addEventListener('resize', updateHeadMode);
    let saved = 'click';
    try { saved = localStorage.getItem(TAB_KEY) || 'click'; } catch (e) { /* storage blocked */ }
    setMTab(['click', 'buildings', 'upgrades', 'more'].includes(saved) ? saved : 'click', false);
  }
  function renderMoreStats() {
    const rows = [
      ['Collected all time', fmt(state.allTimeEarned)],
      ['Per second', fmt(cache.cps, 1)],
      ['Per click', fmt(cache.click, 1)],
      ['Achievements', `${owned.ach.size} / ${D.ACHIEVEMENTS.length}`],
      ['Dream Shards', state.shardsEarned],
      ['Nightmare Bursts', state.burstsClicked],
    ];
    $('#more-stats').innerHTML = rows.map(([k, v]) => `<div class="k">${k}</div><div class="v">${v}</div>`).join('');
  }
  function renderPhoneBits() {
    const affordable = visibleUpgrades().filter(u => u.cost <= state.kuromis).length;
    const badge = $('#upg-badge');
    badge.hidden = affordable === 0;
    badge.textContent = affordable > 9 ? '9+' : affordable;
    if (mtab === 'more' && slowTicks % 5 === 0) renderMoreStats();
  }

  /* =====================================================================
     Installable app (PWA): service worker, update banner, install button
     ===================================================================== */
  let deferredInstall = null;
  function initPWA() {
    const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
    if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone) $('#ios-install-hint').hidden = false;
    const installBtn = $('#install-btn');
    addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferredInstall = e; installBtn.hidden = false; });
    addEventListener('appinstalled', () => { installBtn.hidden = true; deferredInstall = null; });
    installBtn.addEventListener('click', async () => {
      if (!deferredInstall) return;
      deferredInstall.prompt();
      try { await deferredInstall.userChoice; } catch (e) { /* dismissed */ }
      deferredInstall = null;
      installBtn.hidden = true;
    });

    // Service workers need http(s) — opening index.html as a file still plays, just without offline/install.
    if (!('serviceWorker' in navigator) || !/^https?:$/.test(location.protocol)) return;
    let updateRequested = false, reloading = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!updateRequested || reloading) return; // first install also fires this; don't reload then
      reloading = true;
      save();
      location.reload();
    });
    navigator.serviceWorker.register('sw.js').then(reg => {
      const offer = worker => {
        if (!navigator.serviceWorker.controller) return; // first install: nothing to refresh yet
        const banner = $('#update-banner');
        banner.hidden = false;
        banner.onclick = () => { updateRequested = true; banner.textContent = 'Updating…'; worker.postMessage('SKIP_WAITING'); };
      };
      if (reg.waiting) offer(reg.waiting);
      reg.addEventListener('updatefound', () => {
        const w = reg.installing;
        if (w) w.addEventListener('statechange', () => { if (w.state === 'installed') offer(w); });
      });
      const check = () => reg.update().catch(() => { /* offline */ });
      document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
      setInterval(check, 30 * 60 * 1000);
    }).catch(err => console.warn('Kuromi Clicker: service worker registration failed', err));
  }

  /* =====================================================================
     Boot
     ===================================================================== */
  function init() {
    state = load();
    syncSets();
    checkSkins(true);
    applyTheme();
    updateEvent(true);
    applyCosmetics();
    initSparkles();
    buildStore();
    recalc();
    applyOffline();
    checkAchievements();
    recalc();
    lastT = performance.now();
    buildTicker(true);
    slowTick();
    requestAnimationFrame(frame);
    setInterval(slowTick, 200);
    setInterval(save, C.autosaveSeconds * 1000);
    resolveIcons();
    initPhoneTabs();
    placeGoals();
    phoneQuery.addEventListener('change', placeGoals);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitLair); // row height settles once fonts load
    initPWA();
    save();
  }

  // Small test/debug surface for the dev console.
  window.KG = {
    get state() { return state; }, cache, fmt, bulkCost, maxAffordable, recalc, save, load, advance, sync,
    buyBuilding, sellBuilding, buyUpgrade, clickKuromi, spawnBurst, wakeUp, exportSave, importSave, shardsPending, checkAchievements,
    setSpeed: s => { debugSpeed = s; },
    goalList, renderGoals, buildTicker, fitLair,
    gainTreats, buyShopItem, wearCostume, openEvent, onSpecialDay, eventEndsAt, get eventState() { return { on: eventOn, bday: bdayOn }; },
    get combo() { return combo; }, set combo(v) { combo = v; }, advanceCombo: dt => { combo = Math.max(0, combo - C.combo.decayPerSec * dt); },
    clock, dayKey, inEventWindow, eventActive, updateEvent, claimDaily, giftReady, dailyReward,
    skinUnlocked: id => skinUnlocked(SKIN_BY_ID[id]), setSkin, checkSkins, placeTip,
    get shownBank() { return shown.bank; },
  };

  init();
})();
