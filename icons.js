/* =====================================================================
   Kuromi Clicker — icons.js
   Original, generic SVG icons in one style: thick dark outline,
   purple/pink palette, little faces. (No characters are drawn here —
   the character art always comes from your images in assets/.)
   A PNG in assets/icons/<id>.png replaces the matching icon.
   ===================================================================== */
window.KICONS = (() => {
  'use strict';
  const O = '#2a1233';                     // outline
  const P = '#8b5cf6', L = '#c9a7ff', K = '#ff5fae', B = '#ffb3d9', W = '#fff4fb';
  const S = (w = 3.5) => `stroke="${O}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

  // a tiny cute face centred on (x, y)
  const face = (x, y, sleepy = false) => `
    ${sleepy
      ? `<path d="M${x - 8} ${y} q2.5 2.5 5 0 M${x + 3} ${y} q2.5 2.5 5 0" stroke="${O}" stroke-width="2.2" fill="none" stroke-linecap="round"/>`
      : `<circle cx="${x - 5.5}" cy="${y}" r="2.3" fill="${O}"/><circle cx="${x + 5.5}" cy="${y}" r="2.3" fill="${O}"/>`}
    <path d="M${x - 2.5} ${y + 4} q2.5 2.5 5 0" stroke="${O}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="${x - 9}" cy="${y + 4}" rx="2.6" ry="1.6" fill="${K}" opacity=".7"/>
    <ellipse cx="${x + 9}" cy="${y + 4}" rx="2.6" ry="1.6" fill="${K}" opacity=".7"/>`;

  const svg = body => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">${body}</svg>`;
  const svgV = (vb, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}">${body}</svg>`;
  const OR = '#ff8a2b', OR2 = '#ffb36b';

  const ICONS = {
    // pencil + scribbled note
    note: svg(`
      <rect x="8" y="10" width="34" height="44" rx="5" fill="${W}" ${S()}/>
      <path d="M15 22h20M15 30h20M15 38h12" stroke="${L}" stroke-width="3" stroke-linecap="round"/>
      <g transform="rotate(35 46 34)">
        <rect x="40" y="10" width="12" height="34" rx="3" fill="${K}" ${S()}/>
        <rect x="40" y="10" width="12" height="7" rx="2" fill="${P}" ${S()}/>
        <path d="M40 44 l6 11 l6 -11z" fill="${B}" ${S()}/>
      </g>`),

    // diary with a heart clasp
    diary: svg(`
      <rect x="12" y="7" width="42" height="50" rx="7" fill="${P}" ${S()}/>
      <rect x="12" y="7" width="10" height="50" rx="5" fill="${L}" ${S()}/>
      <path d="M38 22c-3-5-11-3-9 3 1 4 9 9 9 9s8-5 9-9c2-6-6-8-9-3z" fill="${K}" ${S(2.6)}/>
      <path d="M30 44h16" stroke="${B}" stroke-width="3" stroke-linecap="round"/>`),

    // generic sleepy dream-cloud (fallback for Baku)
    baku: svg(`
      <path d="M15 46a10 10 0 0 1 1-20 13 13 0 0 1 25-5 11 11 0 0 1 9 21 7 7 0 0 1-5 4z" fill="${L}" ${S()}/>
      ${face(31, 34, true)}
      <text x="44" y="17" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-weight="700" font-size="12" fill="${K}" stroke="${O}" stroke-width="1.2">z</text>
      <text x="51" y="10" font-family="Arial Rounded MT Bold, Arial, sans-serif" font-weight="700" font-size="9" fill="${B}" stroke="${O}" stroke-width="1">z</text>`),

    // generic spiked bracelet (fallback for Gang Member)
    gang: svg(`
      <path d="M10 33 L13 17 L21 28z M20 27 L25 11 L31 25z M33 25 L39 11 L44 27z M43 28 L51 17 L54 33z" fill="${W}" ${S(3)}/>
      <ellipse cx="32" cy="38" rx="24" ry="15" fill="${P}" ${S()}/>
      <ellipse cx="32" cy="38" rx="14" ry="6.5" fill="#1a0f24" ${S()}/>
      <circle cx="16" cy="44" r="2.4" fill="${B}"/><circle cx="32" cy="50" r="2.4" fill="${B}"/><circle cx="48" cy="44" r="2.4" fill="${B}"/>`),

    // scooter
    scooter: svg(`
      <path d="M42 12h9" ${S()} fill="none"/>
      <path d="M46 12 l4 30" ${S()} fill="none"/>
      <path d="M10 42h36c4 0 7 2 8 5H14c-3 0-4-2-4-5z" fill="${K}" ${S()}/>
      <path d="M14 42c0-6 4-9 10-9h8c3 0 5 3 5 9" fill="${P}" ${S()}/>
      <rect x="18" y="28" width="12" height="5" rx="2.5" fill="${B}" ${S()}/>
      <circle cx="17" cy="49" r="7" fill="${L}" ${S()}/><circle cx="17" cy="49" r="2.2" fill="${O}"/>
      <circle cx="49" cy="49" r="7" fill="${L}" ${S()}/><circle cx="49" cy="49" r="2.2" fill="${O}"/>`),

    // shallot with a face
    shallot: svg(`
      <path d="M32 19c-2-7-7-11-12-13M32 19c1-8 5-12 10-14" stroke="${O}" stroke-width="7" fill="none" stroke-linecap="round"/>
      <path d="M32 19c-2-7-7-11-12-13M32 19c1-8 5-12 10-14" stroke="${L}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M32 18c11 8 19 15 19 26a19 13 0 0 1-38 0c0-11 8-18 19-26z" fill="${B}" ${S()}/>
      <path d="M24 30c-3 5-4 10-3 16M40 30c3 5 4 10 3 16" stroke="${K}" stroke-width="2.4" fill="none" stroke-linecap="round" opacity=".7"/>
      ${face(32, 42)}`),

    // scheme target + dart
    hq: svg(`
      <circle cx="30" cy="36" r="23" fill="${W}" ${S()}/>
      <circle cx="30" cy="36" r="15.5" fill="${K}" ${S()}/>
      <circle cx="30" cy="36" r="8" fill="${W}" ${S()}/>
      <circle cx="30" cy="36" r="2.8" fill="${P}"/>
      <path d="M31 35 L54 12" ${S()} fill="none"/>
      <path d="M50 8 l8 0 -4 4z M54 12 l0 8 4-4z" fill="${P}" ${S(2.4)}/>`),

    // shopping bag with a skull
    boutique: svg(`
      <path d="M22 22c0-10 20-10 20 0" ${S()} fill="none"/>
      <path d="M12 22h40l-4 34H16z" fill="${P}" ${S()}/>
      <path d="M32 29c-6 0-9 4-9 8 0 3 1.5 5 3.5 6v3h11v-3c2-1 3.5-3 3.5-6 0-4-3-8-9-8z" fill="${W}" ${S(2.6)}/>
      <circle cx="28.5" cy="37" r="2.1" fill="${O}"/><circle cx="35.5" cy="37" r="2.1" fill="${O}"/>
      <path d="M17 22h30" stroke="${B}" stroke-width="3" stroke-linecap="round"/>`),

    // printing press with a heart page
    press: svg(`
      <rect x="8" y="30" width="48" height="22" rx="5" fill="${P}" ${S()}/>
      <rect x="14" y="12" width="36" height="16" rx="8" fill="${L}" ${S()}/>
      <path d="M20 20h24" stroke="${W}" stroke-width="3" stroke-linecap="round"/>
      <path d="M18 44 l4-14 h22 l4 14z" fill="${W}" ${S(2.8)}/>
      <path d="M33 34c-2-3-7-2-6 2 1 2.6 6 5.5 6 5.5s5-2.9 6-5.5c1-4-4-5-6-2z" fill="${K}"/>
      <circle cx="14" cy="47" r="2.5" fill="${B}"/><circle cx="50" cy="47" r="2.5" fill="${B}"/>`),

    // swirly portal
    realm: svg(`
      <circle cx="32" cy="33" r="24" fill="${P}" ${S()}/>
      <path d="M32 33 m0 -3 a3 3 0 1 1 -3 3 a7 7 0 0 1 7 -7 a11 11 0 0 1 11 11 a15 15 0 0 1 -15 15 a19 19 0 0 1 -19 -19"
            fill="none" stroke="${B}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="50" cy="14" r="3" fill="${W}" ${S(2)}/><circle cx="12" cy="52" r="2.2" fill="${K}"/>`),

    // microphone + sparkle
    concert: svg(`
      <path d="M26 38 l-8 18" stroke="${O}" stroke-width="9" stroke-linecap="round"/>
      <path d="M26 38 l-8 18" stroke="${K}" stroke-width="4.5" stroke-linecap="round"/>
      <circle cx="32" cy="26" r="15" fill="${L}" ${S()}/>
      <path d="M22 20h20M20 27h24M22 34h20M27 13v26M37 13v26" stroke="${P}" stroke-width="2" opacity=".75"/>
      <path d="M52 8 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="${B}" ${S(2)}/>`),

    // sleepy crescent moon
    moon: svg(`
      <path d="M38 6a26 26 0 1 0 20 40A22 22 0 0 1 38 6z" fill="${B}" ${S()}/>
      ${face(26, 36, true)}
      <path d="M50 12 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" fill="${L}" ${S(1.8)}/>`),

    /* ---------- Upgrade art (same style) ---------- */
    // tier 1: star sticker
    up_sticker: svg(`
      <path d="M32 6l7.6 15.4 17 2.5-12.3 12 2.9 16.9L32 44.8 16.8 52.8l2.9-16.9L7.4 23.9l17-2.5z" fill="${B}" ${S()}/>
      <path d="M44 50 l8 -8 v8z" fill="${W}" ${S(2.6)}/>
      ${face(32, 30)}`),
    // tier 2: glitter sparkles
    up_glitter: svg(`
      <path d="M26 8 l5 13 13 5 -13 5 -5 13 -5 -13 -13 -5 13 -5z" fill="${K}" ${S()}/>
      <path d="M47 32 l3.5 8.5 8.5 3.5 -8.5 3.5 -3.5 8.5 -3.5 -8.5 -8.5 -3.5 8.5 -3.5z" fill="${L}" ${S(3)}/>
      <path d="M16 44 l2.5 6 6 2.5 -6 2.5 -2.5 6 -2.5 -6 -6 -2.5 6 -2.5z" fill="${B}" ${S(2.6)}/>`),
    // tier 3: safety pin
    up_pin: svg(`
      <path d="M17 50 L47 16" stroke="${O}" stroke-width="8" stroke-linecap="round"/>
      <path d="M17 50 L47 16" stroke="${L}" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M22 55 L52 21" stroke="${O}" stroke-width="8" stroke-linecap="round"/>
      <path d="M22 55 L52 21" stroke="${W}" stroke-width="3.5" stroke-linecap="round"/>
      <rect x="42" y="8" width="16" height="14" rx="5" transform="rotate(42 50 15)" fill="${K}" ${S()}/>
      <circle cx="16" cy="54" r="7" fill="${B}" ${S()}/><circle cx="16" cy="54" r="2.4" fill="${O}"/>`),
    // tier 4: studs
    up_stud: svg(`
      <rect x="6" y="34" width="52" height="18" rx="8" fill="${P}" ${S()}/>
      <path d="M12 36 L19 14 L26 36z" fill="${W}" ${S()}/><path d="M19 14 L22 36" stroke="${L}" stroke-width="2.4"/>
      <path d="M26 36 L33 10 L40 36z" fill="${W}" ${S()}/><path d="M33 10 L36 36" stroke="${L}" stroke-width="2.4"/>
      <path d="M40 36 L47 16 L54 36z" fill="${W}" ${S()}/><path d="M47 16 L50 36" stroke="${L}" stroke-width="2.4"/>`),
    // tier 5: midnight clock
    up_midnight: svg(`
      <circle cx="32" cy="34" r="23" fill="${W}" ${S()}/>
      <path d="M32 34 V17 M32 34 L41 39" stroke="${O}" stroke-width="4" stroke-linecap="round"/>
      <circle cx="32" cy="34" r="3" fill="${K}"/>
      <path d="M32 14v2M52 34h-2M32 54v-2M12 34h2" stroke="${P}" stroke-width="3" stroke-linecap="round"/>
      <path d="M50 4a9 9 0 1 0 8 13 7 7 0 0 1-8-13z" fill="${L}" ${S(2.6)}/>`),
    // tier 6: skull stamp
    up_stamp: svg(`
      <circle cx="32" cy="12" r="8" fill="${K}" ${S()}/>
      <rect x="27" y="18" width="10" height="12" fill="${L}" ${S()}/>
      <rect x="10" y="30" width="44" height="12" rx="4" fill="${P}" ${S()}/>
      <rect x="12" y="42" width="40" height="6" rx="2" fill="${O}"/>
      <path d="M32 50c-4 0-6 2.5-6 5 0 2 1 3 2 3.6V61h8v-2.4c1-.6 2-1.6 2-3.6 0-2.5-2-5-6-5z" fill="${B}"/>`),
    // tier 7: crown
    up_crown: svg(`
      <path d="M8 22 L20 36 L32 12 L44 36 L56 22 L52 50 H12z" fill="${B}" ${S()}/>
      <rect x="12" y="44" width="40" height="8" rx="3" fill="${P}" ${S()}/>
      <circle cx="32" cy="30" r="4" fill="${K}" ${S(2.4)}/>
      <circle cx="8" cy="20" r="3.5" fill="${L}" ${S(2.4)}/><circle cx="56" cy="20" r="3.5" fill="${L}" ${S(2.4)}/><circle cx="32" cy="10" r="3.5" fill="${L}" ${S(2.4)}/>`),
    // click doubler: fingerless glove
    up_glove: svg(`
      <path d="M14 30c0-10 8-16 18-16h6c9 0 14 6 14 14v8c0 9-7 14-15 14H26c-7 0-12-5-12-10z" fill="${K}" ${S()}/>
      <path d="M24 14v-4c0-3 5-3 5 0v4M31 14v-5c0-3 5-3 5 0v5M38 14v-4c0-3 5-3 5 0v5" fill="${B}" ${S(3)}/>
      <rect x="18" y="48" width="28" height="10" rx="4" fill="${P}" ${S()}/>
      <circle cx="26" cy="30" r="2.2" fill="${W}"/><circle cx="34" cy="30" r="2.2" fill="${W}"/><circle cx="42" cy="30" r="2.2" fill="${W}"/>`),
    // click % of cps: glove with sparkle
    up_sparkfist: svg(`
      <path d="M10 32c0-10 8-16 18-16h6c9 0 14 6 14 14v8c0 9-7 14-15 14H22c-7 0-12-5-12-10z" fill="${P}" ${S()}/>
      <rect x="14" y="50" width="28" height="9" rx="4" fill="${L}" ${S()}/>
      <path d="M22 30h18M22 38h14" stroke="${B}" stroke-width="3" stroke-linecap="round"/>
      <path d="M52 4 l3 7.5 7.5 3 -7.5 3 -3 7.5 -3 -7.5 -7.5 -3 7.5 -3z" fill="${B}" ${S(2.4)}/>`),
    // synergy: chain link
    up_link: svg(`
      <rect x="6" y="22" width="30" height="18" rx="9" transform="rotate(-30 21 31)" fill="none" stroke="${O}" stroke-width="10"/>
      <rect x="6" y="22" width="30" height="18" rx="9" transform="rotate(-30 21 31)" fill="none" stroke="${L}" stroke-width="4.5"/>
      <rect x="28" y="24" width="30" height="18" rx="9" transform="rotate(-30 43 33)" fill="none" stroke="${O}" stroke-width="10"/>
      <rect x="28" y="24" width="30" height="18" rx="9" transform="rotate(-30 43 33)" fill="none" stroke="${K}" stroke-width="4.5"/>`),
    // global: gang loyalty heart with banner
    up_loyalty: svg(`
      <path d="M32 54S8 40 8 23c0-8 6-14 13-14 5 0 9 3 11 7 2-4 6-7 11-7 7 0 13 6 13 14 0 17-24 31-24 31z" fill="${K}" ${S()}/>
      <path d="M6 30 h52 l-4 6 4 6 H6 l4-6z" fill="${W}" ${S(3)}/>
      <path d="M18 36h28" stroke="${P}" stroke-width="3" stroke-linecap="round"/>`),
    // pinky promise: ring with a heart gem
    up_promise: svg(`
      <circle cx="32" cy="40" r="17" fill="none" stroke="${O}" stroke-width="11"/>
      <circle cx="32" cy="40" r="17" fill="none" stroke="${L}" stroke-width="5"/>
      <path d="M32 26c-3-5-12-4-11 2 1 5 11 10 11 10s10-5 11-10c1-6-8-7-11-2z" fill="${K}" ${S(3)}/>
      <path d="M50 8 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="${B}" ${S(2)}/>`),
    // burst upgrades
    up_magnet: svg(`
      <path d="M14 10 v22 a18 18 0 0 0 36 0 V10 h-12 v22 a6 6 0 0 1 -12 0 V10z" fill="${K}" ${S()}/>
      <rect x="14" y="10" width="12" height="8" fill="${W}" ${S(3)}/><rect x="38" y="10" width="12" height="8" fill="${W}" ${S(3)}/>
      <path d="M6 44 l-2 4 M58 44 l2 4 M32 58 v4" stroke="${B}" stroke-width="3" stroke-linecap="round"/>`),
    up_hourglass: svg(`
      <rect x="12" y="6" width="40" height="7" rx="3" fill="${P}" ${S()}/>
      <rect x="12" y="51" width="40" height="7" rx="3" fill="${P}" ${S()}/>
      <path d="M18 13 h28 c0 12 -10 14 -10 19 s10 7 10 19 H18 c0-12 10-14 10-19 s-10-7-10-19z" fill="${W}" ${S()}/>
      <path d="M24 46 h16 c-1-5-5-7-8-9-3 2-7 4-8 9z M26 19 h12 c-1 4-4 6-6 7-2-1-5-3-6-7z" fill="${K}"/>`),
    up_burst: svg(`
      <path d="M32 3v8M32 53v8M3 32h8M53 32h8M11 11l6 6M47 47l6 6M53 11l-6 6M11 53l6-6" stroke="${K}" stroke-width="4" stroke-linecap="round"/>
      <path d="M32 14c-10 0-17 7-17 16 0 5 2.5 9.5 6.5 12v5.5c0 1.7 1.3 3 3 3h15c1.7 0 3-1.3 3-3V42c4-2.5 6.5-7 6.5-12 0-9-7-16-17-16z" fill="${W}" ${S()}/>
      <circle cx="25.5" cy="31" r="4.2" fill="${O}"/><circle cx="38.5" cy="31" r="4.2" fill="${O}"/>
      <path d="M32 36 l-2.4 4.4 h4.8z" fill="${O}"/>`),

    /* ---------- Event: decor ---------- */
    ev_bat: svgV('0 0 64 40', `
      <path d="M32 14c-3-6-9-8-14-6 2 2 2 5 0 7-4-3-10-3-14 1 5 1 8 5 8 10 4-3 9-3 12 0 2-3 5-5 8-5s6 2 8 5c3-3 8-3 12 0 0-5 3-9 8-10-4-4-10-4-14-1-2-2-2-5 0-7-5-2-11 0-14 6z" fill="#3a1f4d" ${S(2.4)}/>
      <circle cx="28.5" cy="18" r="1.6" fill="${OR2}"/><circle cx="35.5" cy="18" r="1.6" fill="${OR2}"/>`),
    ev_pumpkin: svg(`
      <path d="M32 18c-2-5 0-9 4-11" stroke="${O}" stroke-width="6" fill="none" stroke-linecap="round"/>
      <path d="M32 18c-2-5 0-9 4-11" stroke="${L}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
      <ellipse cx="32" cy="38" rx="25" ry="19" fill="${OR}" ${S()}/>
      <path d="M22 21c-6 8-6 26 0 34M42 21c6 8 6 26 0 34M32 19v38" stroke="${O}" stroke-width="2.4" fill="none" opacity=".45"/>
      <path d="M21 33l5-5 5 5zM33 33l5-5 5 5z" fill="${O}"/>
      <path d="M22 43q10 7 20 0" stroke="${O}" stroke-width="3" fill="none" stroke-linecap="round"/>`),

    /* ---------- Event: costume accessories (drawn over your character image, never the character) ---------- */
    cos_hat: svgV('0 0 100 80', `
      <path d="M54 4 C44 18 40 34 34 54 L72 54 C66 40 64 26 70 12 C66 14 60 10 54 4z" fill="#3a1f4d" ${S(4)}/>
      <path d="M36 48 L70 48" stroke="${OR}" stroke-width="7" stroke-linecap="round"/>
      <rect x="49" y="42" width="11" height="11" rx="2" fill="${OR2}" ${S(2.6)}/>
      <ellipse cx="53" cy="58" rx="46" ry="11" fill="#3a1f4d" ${S(4)}/>
      <path d="M72 26 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="${B}" ${S(1.6)}/>`),
    cos_bucket: svgV('0 0 64 64', `
      <path d="M14 26c0-16 36-16 36 0" stroke="${O}" stroke-width="7" fill="none"/>
      <path d="M14 26c0-16 36-16 36 0" stroke="${L}" stroke-width="3" fill="none"/>
      <path d="M8 30h48l-5 26a4 4 0 0 1-4 3H17a4 4 0 0 1-4-3z" fill="${OR}" ${S()}/>
      <path d="M20 40l5-5 5 5zM34 40l5-5 5 5z" fill="${O}"/>
      <path d="M22 49q10 6 20 0" stroke="${O}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <circle cx="22" cy="28" r="4" fill="${K}" ${S(2)}/><circle cx="34" cy="26" r="4" fill="${B}" ${S(2)}/><circle cx="45" cy="28" r="3.5" fill="${L}" ${S(2)}/>`),
    cos_wings: svgV('0 0 200 100', `
      <path d="M100 50 C84 20 52 8 14 14 C24 22 26 30 22 40 C32 38 40 42 42 52 C52 48 60 52 64 62 C74 56 86 58 100 66z" fill="#3a1f4d" ${S(4)}/>
      <path d="M100 50 C116 20 148 8 186 14 C176 22 174 30 178 40 C168 38 160 42 158 52 C148 48 140 52 136 62 C126 56 114 58 100 66z" fill="#3a1f4d" ${S(4)}/>
      <path d="M100 52 C82 32 58 24 34 24 M100 52 C118 32 142 24 166 24" stroke="${P}" stroke-width="3" fill="none" opacity=".8"/>`),
    cos_crown: svgV('0 0 100 56', `
      <path d="M8 50 L14 14 L32 34 L50 6 L68 34 L86 14 L92 50z" fill="#fff4d6" ${S(4)}/>
      <path d="M11 38 L89 38 L92 50 L8 50z" fill="${OR}"/>
      <path d="M13 26 L30 40 L50 18 L70 40 L87 26 L89 38 L11 38z" fill="#ffd36e"/>
      <path d="M8 50 L14 14 L32 34 L50 6 L68 34 L86 14 L92 50z" fill="none" ${S(4)}/>
      <circle cx="50" cy="44" r="4" fill="${K}" ${S(2)}/>`),

    /* ---------- Small corner badges ---------- */
    b_click: svg(`<path d="M16 8 L50 34 L35 36 L44 54 L36 58 L27 40 L16 50z" fill="${W}" ${S(4)}/>`),
    b_all: svg(`<path d="M32 6l7.6 15.4 17 2.5-12.3 12 2.9 16.9L32 44.8 16.8 52.8l2.9-16.9L7.4 23.9l17-2.5z" fill="${B}" ${S(4)}/>`),
    b_trophy: svg(`
      <path d="M18 8h28v14c0 9-6 15-14 15s-14-6-14-15z" fill="${B}" ${S(4)}/>
      <path d="M18 14H8c0 8 4 12 10 12M46 14h10c0 8-4 12-10 12" fill="none" ${S(4)}/>
      <rect x="26" y="37" width="12" height="9" fill="${L}" ${S(3.5)}/><rect x="16" y="46" width="32" height="10" rx="3" fill="${P}" ${S(4)}/>`),
    b_burst: svg(`
      <path d="M32 6c-13 0-22 9-22 21 0 7 3.5 12.5 8.5 15.5v7c0 2 1.6 3.5 3.5 3.5h20c2 0 3.5-1.5 3.5-3.5v-7c5-3 8.5-8.5 8.5-15.5 0-12-9-21-22-21z" fill="${K}" ${S(4)}/>
      <circle cx="23" cy="28" r="5.5" fill="${O}"/><circle cx="41" cy="28" r="5.5" fill="${O}"/>`),

    // extras used by the event
    cake: svg(`
      <path d="M32 6c3 4 3 7 0 9-3-2-3-5 0-9z" fill="#ffb347" ${S(2.4)}/>
      <rect x="29" y="15" width="6" height="11" rx="2" fill="${W}" ${S(2.6)}/>
      <rect x="14" y="26" width="36" height="14" rx="5" fill="${B}" ${S()}/>
      <rect x="8" y="40" width="48" height="16" rx="5" fill="${P}" ${S()}/>
      <path d="M14 30c3 4 6 4 9 0s6 4 9 0 6 4 9 0 6 4 9 0" stroke="${W}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <path d="M8 45c4 5 8 5 12 0s8 5 12 0 8 5 12 0 8 5 12 0" stroke="${K}" stroke-width="3" fill="none" stroke-linecap="round"/>`),
  };

  const cacheUri = {};
  return {
    svg: id => ICONS[id] || null,
    uri: id => ICONS[id] ? (cacheUri[id] || (cacheUri[id] = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(ICONS[id]))) : null,
    ids: Object.keys(ICONS),
  };
})();
