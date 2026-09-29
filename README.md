# Kuromi Clicker

A cute-but-bratty incremental clicker in the style of Cookie Clicker. It's a personal, non-commercial fan project. Kuromi © Sanrio.

## Run it

Open `index.html` in a browser. There's no build step and no server.
It uses plain HTML, CSS and vanilla JavaScript. Google Fonts load from the web, with system-font fallbacks when you're offline.

## Features at a glance

- **Clicking:** the character breathes and wobbles when idle, squashes on each click, and sends a pink ripple from where you tapped. Every **100th click is a CRIT** worth 10×.
- **Combo meter:** clicking fast fills it. When it's full you get ×2 click power for 10s, and it drains when you stop.
- **Lair & goals:** each owned building gets a row of up to 8 icons plus a "+N" badge. The Lair fills the middle column; with many buildings it scrolls a whole row at a time, so no row is ever cut off. **Next goals** (under "per click" on desktop, under the Lair on phones) shows the 3 milestones or upgrades you're closest to, with progress bars.
- **News ticker:** headlines scroll continuously with no gaps; hover to pause.
- **Daily gift:** a small 🎁 badge next to the counter wiggles when a gift is ready, once a day, worth 10 minutes of production. Each day in a row adds +15%, up to day 7; missing a day resets the streak.
- **Kuromi's Birthday Nightmare (Oct 24 – Nov 2, by device date; Oct 31 is Birthday Day):**
  - A warm purple→orange theme on top of any skin, with a few slow bats and pumpkins, a candle glow and orange stitching.
  - A live countdown banner, tap it to open the event panel.
  - **Treats 🍬** drop from about 2% of clicks. Trick-or-Treat Bursts give Treats plus either a Treat (a boosted reward) or a Trick (a harmless 20s prank that still pays ×3). You also collect a few Treats while offline.
  - The Treat shop has boosts (Sugar Rush, Haunted Lair), costumes drawn on top of your image (witch hat, pumpkin bucket, bat wings, candy-corn crown), the Pumpkin Punk skin, a spooky ticker font, a bat cursor, and **Birthday Wish** (+5% forever).
  - **Birthday Day:** confetti, ×2 Treats, Birthday Cake bursts (×13 for 31s), and a ×3 birthday gift with 31 Treats.
  - 15 limited 🎃 achievements and 15 event headlines.
  - Outside the dates everything event-related is hidden, but Treats, cosmetics and achievements stay in your save, and the shop stays browsable.
- **Skins:** Midnight Purple, Bubblegum Punk (30 achievements or Dream Shop) and Monochrome Goth (60 achievements or Dream Shop). Pick one in Settings → Skins.
- **Sound:** generated effects plus an optional chiptune loop (music box + soft bass), with separate volume sliders. Music is off by default.
- **Stats:** time played, best Kuromis/sec, total clicks, bursts, and a graph of Kuromis/sec over the last 10 minutes.
- **137 achievements:** 112 core, 20 for the newer systems, and 5 limited event ones.

## Phone & installing as an app

Under 800px wide, the game switches to an app layout. The character and counter stay pinned at the top, and a tab bar at the bottom switches between **Click / Buildings / Upgrades / More**.
Taps register the moment your finger lands, several fingers at once all count, and Android phones buzz briefly on each tap (you can turn that off in Settings).

To make it **installable and playable offline**, it has to be served over `https://` or `http://localhost`. Browsers don't run service workers for files opened with `file://`; opened that way, the game still plays normally but can't be installed.

- **Try it locally:** run `python3 -m http.server 8000` in this folder, then open http://localhost:8000.
- **Put it on your phone:** host the folder on any static host (GitHub Pages, Netlify, Cloudflare Pages…), open it on the phone, then:
  - Android (Chrome): *More → Install app*, or use the browser menu.
  - iPhone (Safari): *Share → Add to Home Screen*.

**Publishing an update:** bump `CACHE_VERSION` in `sw.js` (e.g. `kuromi-v1` → `kuromi-v2`) whenever you change any file. Players then get a "New version — tap to refresh" banner. Because the service worker serves game files from its cache first, a change you make without bumping the version won't reach people who already installed the app.

App icons live in `app-icons/` and were generated from `assets/kuromi.png`. If you swap in a different character image, remake them at 192×192, 512×512, 512×512 maskable (character inside the middle 60%) and 180×180 (`apple-touch-icon.png`).

## Live site & redeploying

Play it at **https://rubio881.github.io/kuromi-clicker/** (GitHub Pages, served from the `main` branch root).

**iPhone:** open the link in **Safari** → tap **Share** → **Add to Home Screen** → **Add**. It opens full-screen like an app and works offline.

**After making changes**, run this one command from this folder:

```
./deploy.sh "what changed"
```

It bumps `CACHE_VERSION` in `sw.js` for you (so installed copies get the "New version — tap to refresh" banner), commits everything and pushes. GitHub Pages is live again about a minute later.

## Images

Put your images in `assets/`. See [`assets/README.md`](assets/README.md) for the exact filenames and sizes.

- `assets/kuromi.png` is the clickable character (512×512 transparent PNG recommended).
- `assets/baku.png` and `assets/icons/<buildingId>.png` are optional building icons (64×64).

If an image is missing, the character becomes a purple placeholder circle and buildings fall back to emoji. Everything else keeps working.

## Files

| File | What it holds |
|---|---|
| `index.html` | Page layout (three columns, top-bar tabs) |
| `style.css` | Theme. The palette is in `:root` CSS variables, the unlockable theme in `body[data-theme="bubblegum"]` |
| `data.js` | **All balance numbers and content**: buildings, upgrades, achievements, perks, news, combo/crit/daily numbers, events, skins, music notes |
| `icons.js` | Original SVG icons in one style (thick outline, purple/pink): buildings, upgrade art (`up_*`) and small corner badges (`b_*`). A PNG in `assets/icons/<id>.png` replaces the matching building icon |
| `game.js` | Engine: production formula, game loop, UI, save system, phone tabs, PWA registration |
| `sw.js` | Service worker: offline cache (bump `CACHE_VERSION` to ship updates) |
| `manifest.webmanifest`, `app-icons/` | Install info and icons |

## Rebalancing (`data.js`)

- **`CONFIG`**: global knobs. Click power, cost growth (1.15), sell refund, Pinky Promise per achievement, shard bonus, prestige threshold, Nightmare Burst timing, the three burst rewards and their weights, offline efficiency and cap, and autosave interval.
- **`BUILDINGS`**: `baseCost`, `baseCps`, `emoji` and flavour text for each generator. Cost is `baseCost × 1.15^owned`.
- **`TIERS`**: when building-tier upgrades unlock (owning 1/5/25/50/100/150/200) and their cost multipliers (×10, ×50, ×500, ×50,000 …). Each one doubles that building.
- **Upgrade blocks**: click upgrades, synergies (`effects: [{ target, per, pct }]`), Gang Loyalty globals, Pinky Promise (`k`), and Nightmare Burst upgrades (`freqMult`, `lifeMult`, `durMult`). Each has an `unlock` rule: `owned`, `both`, `clicks`, `handmade`, `earned`, `ach` or `bursts`.
- **`ACHIEVEMENTS`**: generated lists. Add one with `ach(id, name, desc, group, icon, req, hidden)`.
- **`DREAM_PERKS`**: prestige shop items, bought with Dream Shards.
- **`NEWS`** / **`NEWS_DYNAMIC`** / **`DECOR_MILESTONES`**: ticker headlines and background decorations, each gated by all-time Kuromis. `NEWS_EVENT` adds headlines during the birthday event.
- **`CONFIG.crit`, `CONFIG.combo`, `CONFIG.daily`**: CRIT frequency and multiplier; combo fill per click, decay per second, multiplier and duration; daily gift minutes, streak bonus and cap.
- **`EVENT`**: one reusable block holding everything for the event: dates (`start`/`end`, `[month, day]`), the special day and its bonuses, Treat drop and offline rates, Trick-or-Treat odds, trick duration and payout, the shop items (cost, kind, effect), decor and headlines. Copy it for a future event.
- **`SKINS`**: each skin's unlock rule (`ach` count and/or Dream Shop `perk`) and its preview colours. The colours themselves live in `style.css` (`body[data-theme="…"]`).
- **Upgrade art:** each upgrade in `data.js` has an `icon` (an `up_*` id from `icons.js`) and `badges`: the building ids it boosts, or `b_click` / `b_all` / `b_trophy` / `b_burst`. Tier upgrades take their art from `TIERS.icons`.
- **`CONFIG.lairRowCap`, `tickerSpeed`, `goalsShown`**: icons per lair row, ticker speed in px/s, and how many Next goals to show.
- **`MUSIC`**: tempo plus melody and bass as MIDI note numbers (`null` = rest).

The whole production formula lives in `computeProduction()` in `game.js`:

```
total = Σ(base × count × tierMult × synergyMult)
        × Π(1 + Gang Loyalty %)
        × (1 + achievements × 4% × Σ Pinky k)
        × (1 + Dream Shards × 1%)
        × buffs (Frenzy ×7)
```

**Balance** (measured with a simulated player that buys the best-payback item and catches 70% of bursts): first building at about 8s, first Baku at 4–7 min, 1M in roughly 12–25 min, first prestige (1T all-time) after about 4h. A human buys more slowly than the bot, so real play runs somewhat slower.

## Saves

- Autosave runs every 30s, whenever the tab is hidden, and on `pagehide`/close (iOS doesn't reliably fire `beforeunload`). It saves to `localStorage` under the key `kuromiClicker.save`.
- The save format is versioned. When you change its shape, bump `SAVE_VERSION` in `data.js` and add a step to `MIGRATIONS` in `game.js`.
- Offline progress pays 50% efficiency for up to 8h (the Dream Shop adds +16h).
- Settings has export (base64), import, and a hard reset that asks twice.

## Debug panel

Press **D three times** quickly. It gives you: add Kuromis, ×100 speed, spawn a Nightmare Burst or Birthday Cake, Frenzy, fill combo, next click = CRIT, skip a day (for the daily gift), **Event: auto → on → birthday → off** (preview the event or Birthday Day any time), +100 Treats, unlock all, fake 1h away (to test the offline modal), and reset.
The browser console also exposes `window.KG` for poking at the game.
