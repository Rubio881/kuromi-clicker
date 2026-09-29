/* =====================================================================
   Kuromi Clicker — data.js
   ALL balance numbers and content live here. Tweak freely.
   Loaded before game.js and exposed as window.KD.
   ===================================================================== */
window.KD = (() => {
  'use strict';

  const SAVE_VERSION = 1;

  /* ---------- Core tuning ---------- */
  const CONFIG = {
    clickBase: 1,              // Kuromis per click before upgrades
    costGrowth: 1.15,          // cost = baseCost × costGrowth ^ owned
    sellRefund: 0.25,          // selling refunds 25% of what that unit cost
    pinkyPerAchievement: 0.04, // each achievement = +4% Pinky Promise
    shardBonus: 0.01,          // each Dream Shard = +1% production
    prestigeThreshold: 1e12,   // all-time Kuromis needed to Wake Up
    prestigeDivisor: 1e12,     // shards = floor(cbrt(allTime / divisor))

    burstMinDelay: 120,        // seconds between Nightmare Bursts (min)
    burstMaxDelay: 240,        //                                  (max)
    burstLifetime: 12,         // seconds a burst stays on screen
    frenzy:   { mult: 7,   duration: 77, weight: 35 },
    lucky:    { bankPct: 0.15, cpsSeconds: 900, flat: 13, weight: 50 },
    mischief: { mult: 777, duration: 13, weight: 15 },

    offlineEfficiency: 0.5,    // 50% of normal production while away
    offlineCapHours: 8,        // max hours of offline production (perks add more)
    offlineMinSeconds: 30,     // don't bother with the modal for shorter absences

    autosaveSeconds: 30,
    maxParticles: 45,          // hard cap on live particles
    particleThrottleMs: 70,    // min gap between particle bursts
    maxFloaters: 24,           // hard cap on live "+N" numbers

    // Look for your own building PNGs (assets/icons/<id>.png, assets/baku.png) to replace the built-in SVG icons.
    // Off by default: each missing file would log a "404 not found" in the console. Turn on after adding PNGs.
    probeOptionalImages: false,

    /* ---------- Game feel ---------- */
    crit: { every: 100, mult: 10 },            // every 100th click is a CRIT worth 10× a normal click
    combo: { perClick: 0.045, decayPerSec: 0.15, mult: 2, duration: 10 }, // meter 0→1; full = ×2 clicks for 10s
    countUpSpeed: 8,
    tickerSpeed: 55,                           // news ticker scroll speed, pixels per second
    goalsShown: 3,                             // "Next goals" card: how many to show                           // how fast the big counter catches up (higher = snappier)
    frenzyShakeEvery: 7,                       // seconds between light screen shakes during Frenzy/Cake
    confettiCount: 26,                         // pieces of confetti per achievement
    lairRowCap: 8,                             // icons per lair row; the rest show as a "+N" badge

    /* ---------- Daily login gift ---------- */
    daily: { minutes: 10, streakBonus: 0.15, maxStreak: 7, minReward: 100 }, // +15% per streak day, up to day 7

    /* ---------- Stats graph ---------- */
    statsSampleSeconds: 10,                    // sample Kuromis/sec every 10s…
    statsSamples: 60,                          // …and keep 60 samples = 10 minutes

    /* ---------- Audio ---------- */
    audio: { sfxVolume: 0.7, musicVolume: 0.45 },
  };

  /* ---------- Limited-time event ----------
     One reusable block: copy it and change the numbers/text for another event later.
     Dates are [month, day], inclusive, by the device's local date. */
  const EVENT = {
    id: 'halloween',
    name: "Kuromi's Birthday Nightmare",
    icon: '🎃',
    start: [10, 24], end: [11, 2],
    specialDay: {                               // Birthday Day
      date: [10, 31], name: 'Birthday Day', icon: '🎂',
      treatDropMult: 2,                         // ×2 Treat drops all day
      giftMult: 3, giftTreats: 31,              // daily gift = ×3 value + 31 Treats
      cakeChance: 0.35,                         // chance a burst is a Birthday Cake (Birthday Day only)
    },
    cake: { mult: 13, duration: 31 },           // ×13 production for 31s
    currency: { name: 'Treats', icon: '🍬', dropChance: 0.02, offlinePerHour: 4, offlineCap: 30 },
    burst: {                                    // Trick-or-Treat Bursts (replace Nightmare Bursts during the event)
      treats: [3, 8],                           // Treats per burst (random in range)
      treatChance: 0.65,                        // otherwise it's a Trick
      treatBoost: 1.5,                          // "Treat" outcome = normal burst reward ×1.5 (duration or payout)
    },
    trick: { duration: 20, prodMult: 3, kinds: ['shuffle', 'spooky', 'flip'] }, // harmless pranks, still pay ×3
    // Shop items. kind: boost (temporary, one of each at a time) · costume · skin · font · cursor · upgrade (permanent)
    shop: [
      { id: 'boost_sugar',    kind: 'boost',   name: 'Sugar Rush',        cost: 15,  icon: '🍭', buff: 'sugar',   mult: 2,   duration: 600, desc: '×2 click power for 10 minutes.' },
      { id: 'boost_haunted',  kind: 'boost',   name: 'Haunted Lair',      cost: 25,  icon: '👻', buff: 'haunted', mult: 1.5, duration: 900, desc: '+50% production for 15 minutes.' },
      { id: 'costume_hat',    kind: 'costume', name: 'Witch Hat',         cost: 40,  art: 'cos_hat',    desc: 'A tall, slightly crooked witch hat.' },
      { id: 'costume_bucket', kind: 'costume', name: 'Pumpkin Bucket',    cost: 40,  art: 'cos_bucket', desc: 'A tiny trick-or-treat bucket.' },
      { id: 'costume_wings',  kind: 'costume', name: 'Bat Wings',         cost: 60,  art: 'cos_wings',  desc: 'Little bat wings, worn behind.' },
      { id: 'costume_crown',  kind: 'costume', name: 'Candy-Corn Crown',  cost: 80,  art: 'cos_crown',  desc: 'Royalty, but make it sugary.' },
      { id: 'skin_pumpkin',   kind: 'skin',    name: 'Pumpkin Punk skin', cost: 120, icon: '🎃', skin: 'pumpkin', desc: 'Orange, black and purple. Pick it in Settings → Skins.' },
      { id: 'font_spooky',    kind: 'font',    name: 'Spooky ticker font', cost: 30, icon: '🕸️', desc: 'Headlines in a creepy font.' },
      { id: 'cursor_bat',     kind: 'cursor',  name: 'Bat cursor',        cost: 30,  icon: '🦇', desc: 'Click Kuromi with a tiny bat.' },
      { id: 'wish',           kind: 'upgrade', name: 'Birthday Wish',     cost: 750, icon: '🕯️', pct: 0.05, desc: '<b>+5%</b> all production, forever.' },
    ],
    decor: ['ev_bat', 'ev_pumpkin', 'ev_bat', 'ev_pumpkin', 'ev_bat', 'ev_pumpkin', 'ev_bat'], // few + slow
    // Headlines that only run during the event (Kuromi's voice).
    news: [
      'BREAKING: Local imp demands 31 candles. Fire department on standby.',
      'Birthday cake sightings reported in the Nightmare Realm. Baku "not involved", has frosting on face.',
      'Pumpkin prices soar. A certain someone bought all of them "for decorations".',
      'Rival bunny sends birthday card. Card returned with a skull sticker and a tiny "thx".',
      'Local imp demands birthday cake, receives three. Demands a fourth "on principle".',
      'Baku eats a nightmare, rates it 10/10, "would dream again".',
      'Trick-or-treaters report receiving "a lecture on proper skull etiquette" and one (1) candy.',
      'Jack-o\'-lanterns across town mysteriously carved with tiny jester hoods.',
      'Costume contest cancelled after one entrant "won by intimidation".',
      'Kuromi\'s birthday party guest list: 1 name, underlined three times. It is hers.',
      'Candy-corn declared "the official vegetable of mischief". Nutritionists weep.',
      'Bats seen forming a heart shape over the lair. Sources say they were paid in Treats.',
      'Haunted house tour ends early: the ghosts wanted her autograph.',
      'Local bunny\'s pumpkin pie goes missing. Crumbs lead directly to a scooter.',
      'Moon briefly wears a witch hat. Astronomers "not even surprised anymore".',
    ],
  };

  /* ---------- Skins (colour themes) ----------
     Unlocked by reaching `ach` achievements OR buying the Dream Shop `perk`. */
  const SKINS = [
    { id: 'default',   name: 'Midnight Purple', unlock: null,                               preview: ['#1a0f24', '#2a1838', '#8b5cf6', '#ff5fae'] },
    { id: 'bubblegum', name: 'Bubblegum Punk',  unlock: { ach: 30, perk: 'theme_bubblegum' }, preview: ['#2a0f22', '#3d1834', '#e0569b', '#ffd6ec'] },
    { id: 'goth',      name: 'Monochrome Goth', unlock: { ach: 60, perk: 'theme_goth' },      preview: ['#0c0c0e', '#1c1c21', '#8d8d97', '#f2f2f5'] },
    // event skin: bought in the event shop; hidden in the picker until owned (or while the event runs)
    { id: 'pumpkin',   name: 'Pumpkin Punk',    unlock: { shop: 'skin_pumpkin' }, event: true,  preview: ['#140b10', '#2a1420', '#ff8a2b', '#a855f7'] },
  ];

  /* ---------- Background music (Web Audio chiptune) ----------
     One step = an eighth note. MIDI note numbers, null = rest. */
  const MUSIC = {
    bpm: 104,
    melody: [
      76, null, 72, 74, 76, null, 79, null,
      77, 76, 74, null, 72, null, 69, null,
      71, null, 72, 74, 75, null, 74, 72,
      71, null, 68, null, 69, null, null, null,
      76, null, 72, 74, 76, null, 81, null,
      79, 77, 76, null, 74, null, 72, null,
      71, 72, 74, null, 75, 74, 72, 71,
      69, null, null, null, 64, null, null, null,
    ],
    bass: [
      45, null, 52, null, 45, null, 52, null,
      41, null, 48, null, 41, null, 48, null,
      43, null, 50, null, 44, null, 50, null,
      40, null, 47, null, 45, null, null, null,
    ],
  };

  /* ---------- Buildings (generators) ----------
     Roughly ×10–12 cost / ×6–8 production per tier (Cookie Clicker curve). */
  const BUILDINGS = [
    { id: 'note',     name: 'Mischief Note',       plural: 'Mischief Notes',       baseCost: 15,     baseCps: 0.1,   emoji: '📝',
      flavour: 'A prank scribbled in the margins. "u smell like carrots" — K.' },
    { id: 'diary',    name: 'Diary Page',          plural: 'Diary Pages',          baseCost: 100,    baseCps: 1,     emoji: '📔',
      flavour: 'Every secret feeling = more Kuromis. DO NOT READ. (you are reading it.)' },
    { id: 'baku',     name: 'Baku',                plural: 'Baku',                 baseCost: 1100,   baseCps: 8,     emoji: '💤',
      flavour: 'Snacks on dreams, burps out Kuromis. Loyal. Sleepy. Slightly sticky.' },
    { id: 'gang',     name: 'Gang Member',         plural: 'Gang Members',         baseCost: 12000,  baseCps: 47,    emoji: '😈',
      flavour: 'Recruited into Kuromi\'s crew. Initiation: one (1) sick eyeliner flick.' },
    { id: 'scooter',  name: 'Scooter Gang Ride',   plural: 'Scooter Gang Rides',   baseCost: 130000, baseCps: 260,   emoji: '🛵',
      flavour: 'Midnight laps around town. Helmets are mandatory. Mischief is optional (it isn\'t).' },
    { id: 'shallot',  name: 'Shallot Farm',        plural: 'Shallot Farms',        baseCost: 1.4e6,  baseCps: 1400,  emoji: '🧅',
      flavour: 'Her favourite snack, grown industrially. The fields smell amazing and slightly tearful.' },
    { id: 'hq',       name: 'Rival Scheme HQ',     plural: 'Rival Scheme HQs',     baseCost: 2e7,    baseCps: 7800,  emoji: '🎯',
      flavour: 'Plotting against a certain pink bunny. The corkboard has so much red string.' },
    { id: 'boutique', name: 'Punk Boutique',       plural: 'Punk Boutiques',       baseCost: 3.3e8,  baseCps: 44000, emoji: '🛍️',
      flavour: 'Skull merch sells itself. Bows are 2-for-1. Glitter is non-refundable.' },
    { id: 'press',    name: 'Romance Novel Press', plural: 'Romance Novel Presses', baseCost: 5.1e9, baseCps: 2.6e5, emoji: '📚',
      flavour: 'Printing her secret favourites. Anyone who asks is "just holding it for a friend".' },
    { id: 'realm',    name: 'Nightmare Realm',     plural: 'Nightmare Realms',     baseCost: 7.5e10, baseCps: 1.6e6, emoji: '🌀',
      flavour: 'Where bad dreams become currency. Baku calls it "the buffet".' },
    { id: 'concert',  name: 'Midnight Concert',    plural: 'Midnight Concerts',    baseCost: 1e12,   baseCps: 1e7,   emoji: '🎤',
      flavour: 'Sold-out goth-pop tour. The encore is just her yelling "I\'M THE BEST".' },
    { id: 'moon',     name: 'Skull Moon',          plural: 'Skull Moons',          baseCost: 1.4e13, baseCps: 6.5e7, emoji: '🌙',
      flavour: 'A whole moon wearing the hood. The tides are now officially mischievous.' },
  ];

  /* ---------- Building tier upgrades ----------
     Unlocked at owning N of a building; each doubles that building. */
  const TIERS = {
    thresholds: [1, 5, 25, 50, 100, 150, 200],
    costMults:  [10, 50, 500, 5e4, 5e6, 5e8, 5e10],
    names:      ['Sticker-Bombed', 'Glitter-Laced', 'Safety-Pinned', 'Studded', 'Midnight', 'Skull-Stamped', 'Legendary Bratty'],
    icons:      ['up_sticker', 'up_glitter', 'up_pin', 'up_stud', 'up_midnight', 'up_stamp', 'up_crown'], // SVG ids in icons.js
    flavours: [
      'Slapped a skull sticker on it. Instantly twice as cool.',
      'Glitter gets everywhere. So do Kuromis.',
      'Held together with safety pins and spite.',
      'Studs increase aerodynamics. Probably.',
      'Only works after dark. Fortunately it is always dark here.',
      'Officially stamped: "PROPERTY OF KUROMI. HANDS OFF, BUNNY."',
      'So bratty it has its own theme song.',
    ],
  };

  const UPGRADES = [];

  BUILDINGS.forEach(b => {
    TIERS.thresholds.forEach((t, i) => {
      UPGRADES.push({
        id: `tier_${b.id}_${i}`, type: 'tier', building: b.id, tier: i, icon: TIERS.icons[i], badges: [b.id],
        name: `${TIERS.names[i]} ${b.plural}`,
        desc: `${b.plural} are <b>twice</b> as efficient.`,
        flavour: TIERS.flavours[i],
        cost: b.baseCost * TIERS.costMults[i],
        unlock: { type: 'owned', b: b.id, n: t },
      });
    });
  });

  /* ---------- Click upgrades ----------
     First three double click power; later ones add +1% of Kuromis/sec per click. */
  [
    ['click_hood',     'Sharper Hood',   100, { type: 'clicks', n: 15 },  'The ears are now pointy enough to poke.'],
    ['click_gloves',   'Punk Gloves',    500, { type: 'clicks', n: 100 }, 'Fingerless. Obviously.'],
    ['click_knuckles', 'Skull Knuckles', 1e4, { type: 'clicks', n: 500 }, 'Tiny skulls on every knuckle. Tap tap tap.'],
  ].forEach(([id, name, cost, unlock, flavour]) => UPGRADES.push({
    id, name, cost, unlock, flavour, type: 'click', double: true, icon: 'up_glove', badges: ['b_click'],
    desc: 'Clicking is <b>twice</b> as powerful.',
  }));
  [
    ['click_glitter', 'Glitter Knuckles',      5e4,  1e4,  'Every punch leaves a sparkle.'],
    ['click_sticker', 'Sticker Slap',          5e6,  1e6,  'Slap! Sticker! Slap! Sticker!'],
    ['click_fingers', 'Mischief Fingers',      5e8,  1e8,  'Ten fingers. Ten tiny pranks.'],
    ['click_ring',    'Skull Ring Punch',      5e10, 1e10, 'The ring has a ring. It is rings all the way down.'],
    ['click_poke',    'Nightmare Poke',        5e12, 1e12, 'A poke so rude it wakes Baku up.'],
    ['click_smack',   'Midnight Smack',        5e14, 1e14, 'Timed exactly at 00:00 for maximum drama.'],
    ['click_hood2',   'Hood of Infinite Taps', 5e16, 1e16, 'The hood clicks by itself now. Creepy. Cute.'],
  ].forEach(([id, name, cost, handmade, flavour]) => UPGRADES.push({
    id, name, cost, flavour, type: 'click', cpsPct: 0.01, icon: 'up_sparkfist', badges: ['b_click'],
    unlock: { type: 'handmade', n: handmade },
    desc: 'Clicking gains <b>+1%</b> of your Kuromis/sec.',
  }));

  /* ---------- Synergy upgrades ----------
     effects: `target` building gains +pct per `per` building owned. */
  [
    ['syn_baku_diary', 'Baku reads the Diary', 1.5e5, ['baku', 10, 'diary', 10],
      [{ target: 'baku', per: 'diary', pct: 0.05 }, { target: 'diary', per: 'baku', pct: 0.001 }],
      'He promised not to tell. He burped it out anyway.'],
    ['syn_gang_note', 'Passing Notes in Class', 2e6, ['gang', 15, 'note', 15],
      [{ target: 'gang', per: 'note', pct: 0.01 }, { target: 'note', per: 'gang', pct: 0.001 }],
      '"do u want to join my gang y/n" — circled yes.'],
    ['syn_shallot_scooter', 'Shallot Delivery Route', 2e8, ['shallot', 15, 'scooter', 15],
      [{ target: 'shallot', per: 'scooter', pct: 0.05 }, { target: 'scooter', per: 'shallot', pct: 0.001 }],
      'Fresh shallots, delivered at 2am, whether you want them or not.'],
    ['syn_press_hq', 'Enemies-to-Rivals Draft', 5e11, ['press', 15, 'hq', 15],
      [{ target: 'press', per: 'hq', pct: 0.05 }, { target: 'hq', per: 'press', pct: 0.001 }],
      'Chapter 1: she was annoying. Chapter 40: she was STILL annoying.'],
    ['syn_concert_boutique', 'Tour Merch Table', 1e14, ['concert', 15, 'boutique', 15],
      [{ target: 'concert', per: 'boutique', pct: 0.05 }, { target: 'boutique', per: 'concert', pct: 0.001 }],
      'Limited edition skull hoodies. Limited to infinity.'],
    ['syn_moon_realm', 'Moonlit Nightmares', 1.4e15, ['moon', 15, 'realm', 15],
      [{ target: 'moon', per: 'realm', pct: 0.05 }, { target: 'realm', per: 'moon', pct: 0.001 }],
      'The moon has bad dreams now. Baku is thrilled.'],
  ].forEach(([id, name, cost, [a, an, b, bn], effects, flavour]) => {
    const A = BUILDINGS.find(x => x.id === a), B = BUILDINGS.find(x => x.id === b);
    const pct = p => +(p * 100).toFixed(2);
    UPGRADES.push({
      id, name, cost, effects, flavour, type: 'synergy', icon: 'up_link', badges: [a, b],
      unlock: { type: 'both', a, an, b, bn },
      desc: `${A.plural} gain <b>+${pct(effects[0].pct)}%</b> per ${B.name}.<br>${B.plural} gain <b>+${pct(effects[1].pct)}%</b> per ${A.name}.`,
    });
  });

  /* ---------- Global multipliers: Gang Loyalty ---------- */
  const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
  const LOYALTY_FLAVOUR = ['Matching jackets.', 'Secret handshake (it\'s just a fist bump).', 'Group chat named "SKULL SQUAD".',
    'Friendship bracelets, but spiky.', 'Everyone got the same tattoo (sticker).', 'Blood oath (ketchup).',
    'Gang anthem: 3 chords, 1 scream.', 'Loyalty cards. Punched with skulls.', 'Legendary crew status achieved.',
    'They would follow her into a nightmare. They literally have.'];
  [
    [0.10, 5e4], [0.10, 1e6], [0.15, 5e7], [0.15, 1e9], [0.20, 5e10],
    [0.20, 1e12], [0.20, 5e13], [0.25, 1e15], [0.25, 5e16], [0.25, 1e18],
  ].forEach(([pct, earned], i) => UPGRADES.push({
    id: `global_${i}`, type: 'global', pct, icon: 'up_loyalty', badges: ['b_all'],
    name: `Gang Loyalty ${ROMAN[i]}`,
    desc: `All production <b>+${Math.round(pct * 100)}%</b>.`,
    flavour: LOYALTY_FLAVOUR[i],
    cost: earned * 2,
    unlock: { type: 'earned', n: earned },
  }));

  /* ---------- Pinky Promise (milk-style) upgrades ----------
     pinkyPromiseBonus = pinkyPerAchievement × Σ k   (production × (1 + achievements × bonus)) */
  [
    ['Pinky Promise', 0.10, 5, 9e3], ['Double Pinky Promise', 0.125, 10, 9e5],
    ['Blood-Oath Pinky', 0.15, 20, 9e7], ['Diary-Sealed Promise', 0.175, 30, 9e9],
    ['Skull-Sworn Promise', 0.20, 40, 9e11], ['Crossed-Heart Pact', 0.20, 50, 9e13],
    ['Moonlit Vow', 0.20, 65, 9e15], ['Forever Rivals Oath', 0.25, 80, 9e17],
  ].forEach(([name, k, achN, cost], i) => UPGRADES.push({
    id: `pinky_${i}`, type: 'pinky', k, name, cost, icon: 'up_promise', badges: ['b_trophy'],
    unlock: { type: 'ach', n: achN },
    desc: `Pinky Promise power <b>+${+(k * 100).toFixed(1)}%</b> (scales with achievements).`,
    flavour: 'Pinky promises are legally binding in the Nightmare Realm.',
  }));

  /* ---------- Nightmare Burst upgrades ----------
     freqMult multiplies the delay between bursts, lifeMult how long the skull stays, durMult buff length. */
  [
    ['burst_0', 'Bad Dream Magnet',    777777, 7,  0.85, 2, 1,   'Bursts appear <b>15%</b> more often and stay <b>twice</b> as long.', 'Magnet made of pure bad vibes.'],
    ['burst_1', 'Nightmare Fuel',      7.77e7, 27, 1,    1, 1.3, 'Burst effects last <b>30%</b> longer.', 'Unleaded. Extremely leaded.'],
    ['burst_2', 'Recurring Nightmare', 7.77e10, 77, 0.85, 1, 1,  'Bursts appear <b>15%</b> more often.', 'Oh no. Oh no. Oh yes.'],
  ].forEach(([id, name, cost, bursts, freqMult, lifeMult, durMult, desc, flavour]) => UPGRADES.push({
    id, name, cost, desc, flavour, type: 'burst', freqMult, lifeMult, durMult, icon: ['up_magnet', 'up_hourglass', 'up_burst'][+id.slice(-1)], badges: ['b_burst'],
    unlock: { type: 'bursts', n: bursts },
  }));

  /* ---------- Achievements ---------- */
  const ACHIEVEMENTS = [];
  const ach = (id, name, desc, group, icon, req, hidden = false) =>
    ACHIEVEMENTS.push({ id, name, desc, group, icon, req, hidden });
  const num = n => n.toLocaleString('en-US');

  [[1, 'Tiny Troublemaker'], [1e3, 'Pocket Change Punk'], [1e5, 'Skull Savings'], [1e6, 'Millionaire Brat'],
   [1e7, 'Hood Rich'], [1e8, 'Stacking Skulls'], [1e9, 'Billion-Kuromi Brat'], [1e10, 'Dream Tycoon'],
   [1e12, 'Trillion Tantrum'], [1e15, 'Quadrillion Queen'], [1e18, 'Nightmare Economy'], [1e21, 'Bigger Than the Moon']]
    .forEach(([n, name], i) => ach(`earned_${i}`, name, `Collect <b>${num(n)}</b> Kuromi${n > 1 ? 's' : ''} in total.`, 'Kuromis collected', '★', { type: 'earned', n }));

  [[1, 'Drip Feed'], [10, 'Steady Mischief'], [100, 'Prank Engine'], [1e3, 'Chaos Factory'], [1e4, 'Mischief Machine'],
   [1e5, 'Unstoppable Brat'], [1e6, 'Nightmare Generator'], [1e7, 'Skull Storm'], [1e8, 'Pure Punk Power'], [1e9, 'Cosmic Brat']]
    .forEach(([n, name], i) => ach(`cps_${i}`, name, `Reach <b>${num(n)}</b> Kuromis per second.`, 'Kuromis per second', '⚡', { type: 'cps', n }));

  [[1, 'Poke!'], [100, 'Clicky Little Imp'], [1000, 'Finger Workout'], [5000, 'Tap Dancer'], [10000, 'Carpal Tunnel Club'], [25000, 'The Hood Demands More']]
    .forEach(([n, name], i) => ach(`clicks_${i}`, name, `Click Kuromi <b>${num(n)}</b> time${n > 1 ? 's' : ''}.`, 'Clicks', '👆', { type: 'clicks', n }));

  [[1e3, 'Handmade Mischief'], [1e5, 'Artisanal Chaos'], [1e7, 'Hand-Crafted Havoc'], [1e9, 'Knuckles of Gold'], [1e11, 'Fist of Fortune'], [1e13, 'Legendary Poker']]
    .forEach(([n, name], i) => ach(`hand_${i}`, name, `Earn <b>${num(n)}</b> Kuromis from clicking.`, 'Kuromis from clicking', '✊', { type: 'handmade', n }));

  const OWN_LEVELS = [1, 50, 100, 150, 200];
  const OWN_NAMES = ['First {name}', '{plural} Galore', 'Certified {name} Hoarder', '{name} Overlord', 'The {name} Singularity'];
  BUILDINGS.forEach(b => OWN_LEVELS.forEach((n, i) => ach(`own_${b.id}_${i}`,
    OWN_NAMES[i].replace('{name}', b.name).replace('{plural}', b.plural),
    `Own <b>${n}</b> ${n === 1 ? b.name : b.plural}.`, 'Buildings', b.emoji, { type: 'owned', b: b.id, n })));

  [[1, 'Shopping Spree'], [10, 'Upgrade Addict'], [25, 'Deluxe Edition'], [50, 'Fully Customised'], [100, 'Maxed-Out Mischief']]
    .forEach(([n, name], i) => ach(`upg_${i}`, name, `Buy <b>${n}</b> upgrade${n > 1 ? 's' : ''}.`, 'Upgrades', '🎀', { type: 'upgrades', n }));

  [[1, 'Bad Dream'], [7, 'Night Terrors'], [27, 'Sleep Paralysis Pal'], [77, 'Nightmare Collector'], [777, 'Dream Eater']]
    .forEach(([n, name], i) => ach(`burst_${i}`, name, `Click <b>${n}</b> Nightmare Burst${n > 1 ? 's' : ''}.`, 'Nightmare Bursts', '💀', { type: 'bursts', n }));

  [[1, 'Rise and Shine, Brat'], [3, 'Snooze Button'], [10, 'Lucid Dreamer']]
    .forEach(([n, name], i) => ach(`prestige_${i}`, name, `Wake Up <b>${n}</b> time${n > 1 ? 's' : ''}.`, 'Wake Up', '🌙', { type: 'prestige', n }));

  ach('hid_title', 'Stop Poking My Name', 'Click the title 13 times.', 'Secret', '🦇', { type: 'title' }, true);
  ach('hid_thirteen', 'Unlucky for Some', 'Own exactly 13 of every building.', 'Secret', '🔮', { type: 'thirteen' }, true);
  ach('hid_sellbaku', 'How Could You', 'Sell a Baku. He trusted you.', 'Secret', '💔', { type: 'soldBaku' }, true);
  ach('hid_midnight', 'Witching Hour', 'Play between midnight and 1am.', 'Secret', '🕛', { type: 'midnight' }, true);

  /* ---------- Achievements for the newer systems (20) ---------- */
  [[1, 'Combo Starter'], [10, 'Combo Queen'], [50, 'Combo Menace']]
    .forEach(([n, name], i) => ach(`combo_${i}`, name, `Fill the combo meter <b>${n}</b> time${n > 1 ? 's' : ''}.`, 'Combos & crits', '🔥', { type: 'combos', n }));
  [[1, 'Critical Brat'], [50, 'Crit Happens'], [500, 'Crit Machine']]
    .forEach(([n, name], i) => ach(`crit_${i}`, name, `Land <b>${n}</b> CRIT click${n > 1 ? 's' : ''}.`, 'Combos & crits', '✦', { type: 'crits', n }));
  ach('daily_0', 'Present for Me?', 'Open a daily gift.', 'Daily gifts', '🎁', { type: 'dailyClaims', n: 1 });
  ach('daily_1', 'Habit Forming', 'Reach a <b>3</b>-day gift streak.', 'Daily gifts', '🎁', { type: 'streak', n: 3 });
  ach('daily_2', 'Seven Nights of Mischief', 'Reach a <b>7</b>-day gift streak.', 'Daily gifts', '🎁', { type: 'streak', n: 7 });
  ach('daily_3', 'Spoiled Rotten', 'Open <b>30</b> daily gifts.', 'Daily gifts', '🎁', { type: 'dailyClaims', n: 30 });
  ach('skin_0', 'New Look, Who Dis', 'Unlock a second skin.', 'Style & sound', '👗', { type: 'skins', n: 2 });
  ach('skin_1', 'Full Wardrobe', 'Unlock three skins.', 'Style & sound', '👗', { type: 'skins', n: 3 });
  ach('music_0', 'DJ Brat', 'Turn on the background music.', 'Style & sound', '🎵', { type: 'music' });
  ach('stats_0', 'Graph Goblin', 'Open the Stats screen.', 'Style & sound', '📈', { type: 'statsOpened' });
  ach('time_0', 'One More Click', 'Play for <b>1 hour</b>.', 'Time played', '⏳', { type: 'timePlayed', n: 3600 });
  ach('time_1', 'No Sleep for Brats', 'Play for <b>10 hours</b>.', 'Time played', '⏳', { type: 'timePlayed', n: 36000 });
  ach('buff_0', 'Double Trouble', 'Have Frenzy and Mischief Click active at the same time.', 'Combos & crits', '💥', { type: 'doubleTrouble' });
  ach('buff_1', 'Sugar High', 'Have a Combo running during Frenzy or a Birthday Cake.', 'Combos & crits', '🍭', { type: 'sugarHigh' });
  ach('total_0', 'Crowded Lair', 'Own <b>500</b> buildings in total.', 'Buildings', '🏚️', { type: 'totalBuildings', n: 500 });
  ach('total_1', 'Mischief Metropolis', 'Own <b>1,000</b> buildings in total.', 'Buildings', '🏙️', { type: 'totalBuildings', n: 1000 });

  /* ---------- Limited: Kuromi's Birthday Nightmare (Oct 24 – Nov 2) — marked with a 🎃 ---------- */
  const EV = '🎃 Birthday Nightmare (limited)';
  ach('ev_play', 'Party Crasher', 'Play during Kuromi\'s Birthday Nightmare.', EV, '🎉', { type: 'evPlay' });
  ach('ev_cake1', 'Cake Snatcher', 'Click a Birthday Cake burst.', EV, '🎂', { type: 'evCakes', n: 1 });
  ach('ev_cake13', 'Sweet Thirteen', 'Click <b>13</b> Birthday Cake bursts.', EV, '🎂', { type: 'evCakes', n: 13 });
  ach('ev_earn', 'Birthday Haul', 'Collect <b>3,100,000</b> Kuromis during the event.', EV, '🎃', { type: 'evEarned', n: 3.1e6 });
  ach('ev_combo', 'Sugar Rush', 'Fill the combo meter during the event.', EV, '🍬', { type: 'evCombo' });
  // id kept from the old secret achievement so existing saves keep it
  ach('hid_halloween', 'Happy Birthday, Brat!', 'Play on Birthday Day (October 31st).', EV, '🎂', { type: 'halloween' });
  ach('ev_treat1', 'Sweet Tooth', 'Collect your first Treat.', EV, '🍬', { type: 'evTreats', n: 1 });
  ach('ev_treat100', 'Candy Hoarder', 'Collect <b>100</b> Treats.', EV, '🍬', { type: 'evTreats', n: 100 });
  ach('ev_treat1000', 'Sugar Empire', 'Collect <b>1,000</b> Treats.', EV, '🍬', { type: 'evTreats', n: 1000 });
  ach('ev_tob13', 'Trick or Treat ×13', 'Click <b>13</b> Trick-or-Treat Bursts.', EV, '🎃', { type: 'evBursts', n: 13 });
  ach('ev_tricked5', 'Pranked!', 'Get tricked <b>5</b> times.', EV, '🙃', { type: 'evTricked', n: 5 });
  ach('ev_costumes', 'Dress-Up Queen', 'Buy every costume.', EV, '🧙', { type: 'evCostumes' });
  ach('ev_bday_costume', 'Birthday Suit (Costume)', 'Wear a costume on Birthday Day.', EV, '👑', { type: 'evBdayCostume' });
  ach('ev_wish', 'Make a Wish', 'Buy the Birthday Wish.', EV, '🕯️', { type: 'evWish' });
  ach('ev_31', 'Thirty-One Candles', 'Own <b>31</b> of any building on Birthday Day.', EV, '🕯️', { type: 'ev31' }, true);
  ACHIEVEMENTS.filter(a => a.group === EV).forEach(a => { a.limited = true; });

  /* ---------- Dream Shop (prestige perks, bought with Dream Shards) ---------- */
  const DREAM_PERKS = [
    { id: 'start_notes',     name: 'Pocket Full of Notes',      cost: 1, icon: '📝', desc: 'Start every run with <b>10 Mischief Notes</b>.' },
    { id: 'theme_bubblegum', name: 'Bubblegum Punk Skin',       cost: 2, icon: '🍬', desc: 'Unlocks the <b>Bubblegum Punk</b> skin right away (Settings).' },
    { id: 'theme_goth',      name: 'Monochrome Goth Skin',      cost: 3, icon: '🖤', desc: 'Unlocks the <b>Monochrome Goth</b> skin right away (Settings).' },
    { id: 'burst_often',     name: 'Light Sleeper',             cost: 3, icon: '💀', desc: 'Nightmare Bursts appear <b>10%</b> more often.' },
    { id: 'long_naps',       name: 'Long Naps',                 cost: 4, icon: '😴', desc: 'Offline production cap <b>+16 hours</b>.' },
    { id: 'keep_bank',       name: 'Sticky Fingers',            cost: 5, icon: '🫳', desc: 'Keep <b>1%</b> of your Kuromis when you Wake Up.' },
  ];

  /* ---------- News ticker: [minAllTimeKuromis, line] ---------- */
  const NEWS = [
    [0, 'Local bunny reports suspicious skull graffiti.'],
    [0, 'Baku denies eating your homework, burps.'],
    [0, 'Mysterious imp spotted clicking herself. "It\'s called self-care," she says.'],
    [0, 'Town council bans pranks. Council building immediately pranked.'],
    [0, 'Diary found on bench. Finder "dared not read it". Finder read it.'],
    [50, 'Stationery shop reports shortage of black gel pens.'],
    [200, 'Rival bunny bakes apology cookies. Cookies returned, uneaten, with a skull sticker.'],
    [1e3, 'Sales of jester hoods up 300%. Experts baffled.'],
    [1e3, 'Tapir sightings increase downtown. "He was just vibing," say witnesses.'],
    [5e3, 'Scientists confirm: dreams do taste like shallots.'],
    [2e4, 'Gang recruitment posters appear overnight. They\'re glittery. Everyone is scared.'],
    [1e5, 'Noise complaints filed over "extremely loud scooter giggling".'],
    [1e5, 'Pink bunny files 47th formal complaint this week. Complaint used as a paper plane.'],
    [5e5, 'Shallot prices skyrocket. Kuromi "not involved". Kuromi owns 14 farms.'],
    [1e6, 'Kuromi declares herself "Queen of Everything". Nobody is brave enough to disagree.'],
    [5e6, 'Local bookstore\'s romance section mysteriously empties every Tuesday.'],
    [2e7, 'Rival Scheme HQ corkboard now contains more red string than cork.'],
    [1e8, 'Skull merch officially outsells all other merch. "Obviously," says Kuromi.'],
    [5e8, 'Baku wins "Most Loyal Sidekick" award, eats trophy (it was a dream).'],
    [1e9, 'Economists propose switching to the Kuromi standard.'],
    [5e9, 'New romance novel "Hood Over Heels" tops charts. Author: "anonymous". Author wears a hood.'],
    [1e10, 'Nightmare tourism booming. Reviews: "5 skulls, would scream again".'],
    [1e11, 'Midnight Concert tickets sell out in 0.4 seconds. Encore lasts 3 hours.'],
    [1e12, 'Reality starting to feel a little dreamy. Maybe it\'s time to Wake Up?'],
    [1e13, 'Astronomers confirm the moon is now wearing a hood. It suits it.'],
    [1e14, 'Entire galaxy reportedly "a bit bratty now".'],
    [1e16, 'The universe files a noise complaint. It is ignored.'],
  ];
  // Dynamic lines: shown once you own at least 1 of the building; {n} = owned count.
  const NEWS_DYNAMIC = [
    ['baku', 'Census: {n} Baku now roam the city, all napping.'],
    ['gang', 'Kuromi\'s gang reaches {n} members. Matching jackets on backorder.'],
    ['note', '{n} mischief notes found taped to lockers. Contents: rude, but funny.'],
    ['shallot', '{n} shallot farms and counting. Nobody\'s eyes are dry.'],
  ];

  /* ---------- Floating background decorations: [minAllTimeKuromis, glyph] ---------- */
  const DECOR_MILESTONES = [
    [1e3, '🦇'], [1e4, '🎀'], [1e5, '🌙'], [1e6, '🖤'], [1e7, '👻'], [1e8, '🍬'],
    [1e9, '🔮'], [1e10, '⛓️'], [1e11, '🎸'], [1e12, '🌌'], [1e14, '🪐'], [1e16, '💫'],
  ];

  const NUMBER_SUFFIXES = ['', 'K', 'M', 'B', 'T', 'Qa', 'Qi', 'Sx', 'Sp', 'Oc', 'No', 'Dc'];

  return { SAVE_VERSION, CONFIG, BUILDINGS, TIERS, UPGRADES, ACHIEVEMENTS, DREAM_PERKS, NEWS, NEWS_DYNAMIC, DECOR_MILESTONES, NUMBER_SUFFIXES, EVENT, SKINS, MUSIC };
})();
