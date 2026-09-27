# Assets

Kuromi Clicker never draws the character itself. Drop your own images here.
Every file is optional: if one is missing, the game shows a placeholder (for the character) or an emoji (for buildings).

| File | Used for | Recommended size |
|---|---|---|
| `kuromi.png` | The big clickable character | 512×512, transparent PNG |
| `baku.png` | Baku's icon in the store and lair (used if `icons/baku.png` is missing) | 64×64, transparent PNG |
| `icons/note.png` | Mischief Note | 64×64 |
| `icons/diary.png` | Diary Page | 64×64 |
| `icons/baku.png` | Baku | 64×64 |
| `icons/gang.png` | Gang Member | 64×64 |
| `icons/scooter.png` | Scooter Gang Ride | 64×64 |
| `icons/shallot.png` | Shallot Farm | 64×64 |
| `icons/hq.png` | Rival Scheme HQ | 64×64 |
| `icons/boutique.png` | Punk Boutique | 64×64 |
| `icons/press.png` | Romance Novel Press | 64×64 |
| `icons/realm.png` | Nightmare Realm | 64×64 |
| `icons/concert.png` | Midnight Concert | 64×64 |
| `icons/moon.png` | Skull Moon | 64×64 |

Building icons also appear on that building's tier-upgrade tiles.

`kuromi-alt.png` is a second character image. It isn't used by default: to use it, rename it to `kuromi.png`.

**After adding building PNGs, set `probeOptionalImages: true` in `data.js`.** It's off by default because
the game ships with its own SVG icons, and looking for PNGs that don't exist would log 404 errors in the console.
