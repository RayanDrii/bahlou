'use strict';
/* Bahlou — icônes du casino : formes pleines sur une grille de 96, chacune aux couleurs de son jeu. */
const Icons = (() => {
  const BG = 'var(--i-c)';
  const RED = '#c8102e', BLACK = '#0e0e11', IVORY = '#f2efe6', GOLD = '#e9bf5a', GREEN = '#0f9d58', LIME = '#17b377', BLUE = '#4aa8ff', ICE = '#b5e0ff', SILVER = '#c9c9d0', BRICK = '#8a5f22';
  const SPADE = 'M24 4C30 14 44 21 44 31c0 6-5 10-10 10-3 0-6-1-8-3 1 4 2 6 5 8H17c3-2 4-4 5-8-2 2-5 3-8 3-5 0-10-4-10-10C4 21 18 14 24 4Z';
  const HEART = 'M24 44C10 33 4 25 4 16 4 9 9 5 15 5c4 0 7 2 9 6 2-4 5-6 9-6 6 0 11 4 11 11 0 9-6 17-20 28Z';
  const DIAMOND = 'M24 3 42 24 24 45 6 24Z';
  const CLUB = 'M24 3a10.5 10.5 0 0 1 9.5 15 10.5 10.5 0 1 1-6.5 18c1 4 2 7 5 9H16c3-2 4-5 5-9a10.5 10.5 0 1 1-6.5-18A10.5 10.5 0 0 1 24 3Z';
  const suit = (d, x, y, s, fill) => `<path transform="translate(${x} ${y}) scale(${s})" d="${d}" fill="${fill}"/>`;
  const wedge = (cx, cy, r, a0, a1, fill) => {
    const p = (a) => `${(cx + r * Math.cos(a)).toFixed(2)} ${(cy + r * Math.sin(a)).toFixed(2)}`;
    return `<path d="M${cx} ${cy}L${p(a0)}A${r} ${r} 0 0 1 ${p(a1)}Z" fill="${fill}"/>`;
  };
  const seven = (x) => `<path d="M${x + 2} 37h13v5l-6 17h-6l6.5-16H${x + 2}Z" fill="${RED}"/>`;
  const star = (cx, cy, R, r, n, fill) => `<path d="M${Array.from({ length: n * 2 }, (_, i) => { const a = -Math.PI / 2 + (i * Math.PI) / n, d = i % 2 ? r : R; return `${(cx + d * Math.cos(a)).toFixed(2)} ${(cy + d * Math.sin(a)).toFixed(2)}`; }).join('L')}Z" fill="${fill}"/>`;
  const STEP = Math.PI / 6;
  const WHEEL = [RED, GOLD, GREEN, IVORY];

  return {
    roulette: `<circle cx="48" cy="48" r="45" fill="${GOLD}"/><circle cx="48" cy="48" r="41" fill="${BLACK}"/>${Array.from({ length: 12 }, (_, i) => { const a0 = -Math.PI / 2 - STEP / 2 + i * STEP; return i === 0 ? wedge(48, 48, 40, a0, a0 + STEP, GREEN) : i % 2 ? wedge(48, 48, 40, a0, a0 + STEP, RED) : ''; }).join('')}<circle cx="48" cy="48" r="23" fill="${IVORY}"/><circle cx="48" cy="48" r="19" fill="${BLACK}"/><circle cx="48" cy="48" r="9" fill="${GOLD}"/><path d="M46.5 33h3v30h-3zM33 46.5h30v3H33z" fill="${GOLD}"/><circle cx="70" cy="22" r="6" fill="${IVORY}"/>`,
    blackjack: `<rect x="16" y="14" width="44" height="64" rx="5" transform="rotate(-14 38 46)" fill="${RED}"/><rect x="24" y="24" width="28" height="44" transform="rotate(-14 38 46)" fill="none" stroke="${GOLD}" stroke-width="2.5"/><rect x="36" y="18" width="46" height="66" rx="5" transform="rotate(9 59 51)" fill="${IVORY}" stroke="${BG}" stroke-width="4"/><g transform="rotate(9 59 51)">${suit(SPADE, 41, 33, 0.75, BLACK)}</g>`,
    poker: `${suit(SPADE, 5, 5, 0.82, IVORY)}${suit(HEART, 52, 5, 0.82, RED)}${suit(DIAMOND, 5, 52, 0.82, RED)}${suit(CLUB, 52, 52, 0.82, IVORY)}`,
    slots: `<rect x="2" y="14" width="76" height="70" rx="6" fill="${RED}"/><rect x="2" y="14" width="76" height="13" rx="6" fill="${GOLD}"/><rect x="9" y="33" width="19" height="36" fill="${IVORY}"/><rect x="31" y="33" width="19" height="36" fill="${IVORY}"/><rect x="53" y="33" width="19" height="36" fill="${IVORY}"/><g transform="translate(-5 -1)">${seven(14)}${seven(36)}${seven(58)}</g><path d="M78 56h9V24h-4v28h-5Z" fill="${SILVER}"/><circle cx="85" cy="19" r="8" fill="${GOLD}"/>`,
    wheel: `<circle cx="48" cy="53" r="43" fill="${GOLD}"/><circle cx="48" cy="53" r="39" fill="${BLACK}"/>${Array.from({ length: 12 }, (_, i) => { const a0 = -Math.PI / 2 - STEP / 2 + i * STEP; return wedge(48, 53, 37, a0 + 0.02, a0 + STEP - 0.02, WHEEL[i % WHEEL.length]); }).join('')}<circle cx="48" cy="53" r="13" fill="${BLACK}"/><circle cx="48" cy="53" r="6" fill="${GOLD}"/><path d="M38 1h20L48 21Z" fill="${IVORY}" stroke="${BG}" stroke-width="3"/>`,
    scratch: `<g transform="rotate(-8 48 48)"><path d="M12 20h72a6 6 0 0 1 6 6v14a8 8 0 0 0 0 16v14a6 6 0 0 1-6 6H12a6 6 0 0 1-6-6V56a8 8 0 0 0 0-16V26a6 6 0 0 1 6-6Z" fill="${GREEN}"/><rect x="20" y="31" width="56" height="34" fill="${SILVER}"/><path d="M20 31h34l-6 6 7 5-8 5 7 5-8 5 5 8H20Z" fill="${BLACK}"/>${star(36, 48, 13, 5.5, 5, GOLD)}</g>`,
    crash: `<path d="M10 6v80h80" fill="none" stroke="${IVORY}" stroke-width="8"/><path d="M23 73C44 72 58 58 65 38" fill="none" stroke="${LIME}" stroke-width="9"/>${star(70, 25, 23, 10, 9, RED)}${star(70, 25, 11, 5, 9, GOLD)}`,
    tower: `${[8, 36, 64].map((x) => `<rect x="${x + 3}" y="4" width="18" height="13" fill="${BRICK}"/>`).join('')}${[[0, 1, 0], [0, 0, 1], [1, 0, 0]].map((row, r) => row.map((on, k) => `<rect x="${8 + k * 28}" y="${21 + r * 24}" width="24" height="20" fill="${on ? GOLD : BRICK}"/>`).join('')).join('')}<rect x="8" y="89" width="80" height="4" fill="${BRICK}"/>`,
    mines: `<path d="M23 16h44l21 25-43 47L2 41Z" fill="${BLUE}"/><path d="M33 16h24l9 25H24Z" fill="${ICE}"/><path d="M2 41h86M24 41l21 47 21-47" fill="none" stroke="${BG}" stroke-width="3.5"/>${star(83, 13, 12, 3, 4, IVORY)}`,
    plinko: `${[[3, 13], [4, 29], [5, 45], [6, 61]].map(([n, y]) => Array.from({ length: n }, (_, i) => `<circle cx="${48 + (i - (n - 1) / 2) * 15}" cy="${y}" r="4" fill="${IVORY}"/>`).join('')).join('')}<circle cx="55.5" cy="45" r="10" fill="${GOLD}" stroke="${BG}" stroke-width="3"/>${[RED, GOLD, LIME, GOLD, RED].map((c, i) => `<rect x="${7 + i * 17}" y="77" width="14" height="13" fill="${c}"/>`).join('')}`,
    duel: `<circle cx="36" cy="38" r="31" fill="${SILVER}"/><circle cx="36" cy="38" r="23" fill="none" stroke="${BG}" stroke-width="3"/><circle cx="60" cy="59" r="33" fill="${GOLD}" stroke="${BG}" stroke-width="5"/><circle cx="60" cy="59" r="24" fill="none" stroke="${BLACK}" stroke-width="3"/><path d="M53 45h14a10 10 0 0 1 0 20h-6v9h-8Zm8 7v6h5a3 3 0 0 0 0-6Z" fill="${BLACK}"/>`,
  };
})();
