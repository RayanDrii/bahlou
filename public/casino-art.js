'use strict';
/* Bahlou — scène d'accueil du casino : roue, éventail de cartes et jetons, dessinés en SVG. */
const CasinoArt = (() => {
  const ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const REDS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const GOLD = '<linearGradient id="lh-g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff0b8"/><stop offset=".45" stop-color="#e9bf5a"/><stop offset="1" stop-color="#9a6f22"/></linearGradient>';

  function rotor() {
    const n = ORDER.length, A = (2 * Math.PI) / n, pt = (r, a) => `${(200 + r * Math.cos(a)).toFixed(2)} ${(200 + r * Math.sin(a)).toFixed(2)}`;
    const cells = ORDER.map((v, i) => {
      const a0 = -Math.PI / 2 + (i - 0.5) * A, a1 = a0 + A, mid = ((i * 360) / n).toFixed(2);
      const fill = v === 0 ? '#0e7a52' : REDS.has(v) ? '#c8102e' : '#0c1411';
      return `<path d="M${pt(150, a0)}A150 150 0 0 1 ${pt(150, a1)}L${pt(112, a1)}A112 112 0 0 0 ${pt(112, a0)}Z" fill="${fill}" stroke="#e9bf5a" stroke-width=".8"/><text transform="rotate(${mid} 200 200)" x="200" y="66" text-anchor="middle" font-family="Big Shoulders, Impact, sans-serif" font-weight="800" font-size="16" fill="#fff">${v}</text>`;
    }).join('');
    return `<svg class="lh-rotor" viewBox="0 0 400 400" aria-hidden="true">${cells}</svg>`;
  }
  function wheel() {
    return `<svg class="lh-bowl" viewBox="0 0 400 400" aria-hidden="true"><defs>${GOLD}<radialGradient id="lh-h" cx=".4" cy=".35" r=".9"><stop offset="0" stop-color="#3a4640"/><stop offset=".55" stop-color="#101a16"/><stop offset="1" stop-color="#060b09"/></radialGradient></defs><circle cx="200" cy="200" r="198" fill="url(#lh-g)"/><circle cx="200" cy="200" r="187" fill="#0a100d"/><circle cx="200" cy="200" r="172" fill="none" stroke="url(#lh-g)" stroke-width="2.5"/><circle cx="200" cy="200" r="158" fill="none" stroke="url(#lh-g)" stroke-width="2.5"/></svg>${rotor()}<svg class="lh-hub" viewBox="0 0 400 400" aria-hidden="true"><circle cx="200" cy="200" r="112" fill="url(#lh-h)" stroke="url(#lh-g)" stroke-width="2.5"/><path d="M200 96a104 104 0 0 1 90 52c-46-18-100-12-148 22 4-36 26-74 58-74Z" fill="#fff" opacity=".07"/><circle cx="200" cy="200" r="24" fill="url(#lh-g)"/></svg>`;
  }
  function chip(base, dark) {
    const stripes = (cy) => `<ellipse cx="60" cy="${cy}" rx="48" ry="25" fill="none" stroke="#f6f3ea" stroke-width="10" pathLength="100" stroke-dasharray="7 18"/>`;
    return `<svg viewBox="0 0 120 84" aria-hidden="true"><path d="M4 34v14a56 30 0 0 0 112 0V34Z" fill="${dark}"/><path d="M4 40v8a56 30 0 0 0 112 0v-8a56 30 0 0 1-112 0Z" fill="#f6f3ea" opacity=".85" pathLength="100" stroke-dasharray="1"/><ellipse cx="60" cy="34" rx="56" ry="30" fill="${base}"/>${stripes(34)}<ellipse cx="60" cy="34" rx="34" ry="17" fill="${base}" stroke="#f6f3ea" stroke-width="1.4" stroke-dasharray="3 3"/></svg>`;
  }
  function hero(cardSvg) {
    const DECK = [4, 18, 42, 29, 5, 17, 45, 31, 6];
    const fan = DECK.map((c, i) => `<div class="lh-c" style="--a:${-76 + i * 19}deg">${cardSvg(c)}</div>`).join('');
    return `<div class="lh-art" aria-hidden="true"><div class="lh-fan">${fan}</div><div class="lh-wheel">${wheel()}</div><div class="lh-chip c1">${chip('#c8102e', '#7d0a1c')}</div><div class="lh-chip c2">${chip('#0e7a52', '#075038')}</div><div class="lh-chip c3">${chip('#0c1411', '#000')}</div></div>`;
  }
  return { hero };
})();
