// Bahlou Club — moteur des jeux. Tout est décidé ici : le navigateur n'affiche que le résultat.
// Monnaie fictive uniquement : rien ne s'achète, rien ne s'échange, rien ne se retire.
'use strict';

const crypto = require('crypto');
const installCards = require('./games-cards');
const rint = (n) => crypto.randomInt(n);
const rnd = () => crypto.randomInt(2 ** 47) / 2 ** 47;
const shuffled = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = rint(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

// ---------------------------------------------------------------- réglages
const START_COINS = 5000;
const MIN_BET = 10;
const JACKPOT_SEED = 10000;
const CHEST_MS = 4 * 3600e3;
const BAILOUT_MS = 10 * 60e3;
const STREAK_REWARDS = [500, 750, 1000, 1500, 2000, 3000, 7500];
const RANKS = [[1, 'Piscineux'], [5, 'Tek1'], [10, 'Tek2'], [15, 'Tek3'], [20, 'Tek4'], [30, 'Tek5'], [40, 'Légende']];

const xpFor = (lvl) => Math.floor(60 * Math.pow(lvl - 1, 1.8));
function levelOf(xp) { let l = 1; while (xp >= xpFor(l + 1)) l++; return l; }
const rankOf = (lvl) => RANKS.reduce((r, [min, n]) => (lvl >= min ? n : r), RANKS[0][1]);

const dayKey = (t = Date.now()) => new Date(t).toLocaleDateString('sv');
function weekKey(t = Date.now()) { const d = new Date(t); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return dayKey(d.getTime()); }
const isGolden = () => new Date().getHours() === 21;

const FREE_WHEEL = [100, 250, 50, 500, 150, 1000, 75, 300, 200, 2500, 125, 5000];
const WHEEL = [0, 1.5, 0, 2, 0, 1.5, 0, 5, 0, 1.5, 0, 2, 0, 1.5, 0, 3, 0, 1.5, 0, 2, 0, 1.5, 0, 0];

const SCRATCH_TIERS = { bronze: 100, argent: 500, or: 2500 };
const SCRATCH_VALUES = [1, 2, 5, 10, 50, 200];
const SCRATCH_ODDS = [[1, 1500], [2, 1000], [5, 450], [10, 150], [50, 30], [200, 4]]; // sur 10 000

const PLINKO_ROWS = 12;
const PLINKO = {
  low: [10, 3, 1.6, 1.4, 1.1, 1, 0.5, 1, 1.1, 1.4, 1.6, 3, 10],
  mid: [32, 11, 4, 2, 1.1, 0.6, 0.3, 0.6, 1.1, 2, 4, 11, 32],
  high: [165, 24, 8, 2, 0.7, 0.2, 0.2, 0.2, 0.7, 2, 8, 24, 165],
};
for (const k in PLINKO) PLINKO[k] = PLINKO[k].map((m) => Math.round(m * 97.5) / 100); // ~96,5 % de retour

// machine à sous : 5 rouleaux × 3 lignes, 9 lignes de gain
const SLOT_WEIGHTS = [30, 26, 20, 14, 8, 4, 5, 4]; // 🍒 🍋 🍇 🔔 7️⃣ 💎 joker fusée
const S_WILD = 6, S_SCATTER = 7, S_DIAMOND = 5;
const SLOT_PAY = [[2, 6, 20], [2, 8, 25], [4, 12, 40], [6, 20, 80], [12, 50, 250], [20, 100, 1000]];
const SLOT_SCALE = 1.77; // calé par simulation (voir test) pour rester autour de 95 %
const SLOT_LINES = [
  [1, 1, 1, 1, 1], [0, 0, 0, 0, 0], [2, 2, 2, 2, 2], [0, 1, 2, 1, 0], [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2], [2, 2, 1, 0, 0], [1, 0, 0, 0, 1], [1, 2, 2, 2, 1],
];
const SLOT_TOTAL = SLOT_WEIGHTS.reduce((a, b) => a + b, 0);
function slotSymbol() { let r = rint(SLOT_TOTAL); for (let i = 0; i < SLOT_WEIGHTS.length; i++) { if ((r -= SLOT_WEIGHTS[i]) < 0) return i; } return 0; }
const slotGrid = () => Array.from({ length: 5 }, () => [slotSymbol(), slotSymbol(), slotSymbol()]);
function slotEval(grid, bet, mult = 1) {
  const wins = []; let total = 0;
  SLOT_LINES.forEach((line, li) => {
    const syms = line.map((row, reel) => grid[reel][row]);
    if (syms[0] === S_SCATTER) return;
    let base = syms.find((s) => s !== S_WILD);
    if (base === undefined) base = S_DIAMOND;
    if (base === S_SCATTER) return;
    let n = 0;
    while (n < 5 && (syms[n] === base || syms[n] === S_WILD)) n++;
    if (n < 3) return;
    const pay = Math.floor((bet / SLOT_LINES.length) * SLOT_PAY[base][n - 3] * SLOT_SCALE * mult);
    if (pay > 0) { total += pay; wins.push({ line: li, n, pay }); }
  });
  return { wins, total };
}
const slotScatters = (grid) => grid.flat().filter((s) => s === S_SCATTER).length;
function slotSpin(bet) {
  const grid = slotGrid();
  const first = { grid, ...slotEval(grid, bet) };
  const free = [];
  if (slotScatters(grid) >= 3) {
    for (let i = 0; i < 8; i++) { const g = slotGrid(); free.push({ grid: g, ...slotEval(g, bet, 2) }); }
  }
  return { first, free, total: first.total + free.reduce((a, s) => a + s.total, 0) };
}

// roulette européenne : « ivoire » reprend les cases rouges classiques
const ROU_IVORY = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
function rouletteMult(key, n) {
  const m = /^n(\d{1,2})$/.exec(key);
  if (m) { const v = +m[1]; if (v > 36) return null; return v === n ? 36 : 0; }
  const d = /^([dc])([012])$/.exec(key);
  if (d) { if (n === 0) return 0; const i = +d[2]; return (d[1] === 'd' ? Math.floor((n - 1) / 12) === i : (n - 1) % 3 === i) ? 3 : 0; }
  const tests = { ivoire: () => ROU_IVORY.has(n), noir: () => !ROU_IVORY.has(n), pair: () => n % 2 === 0, impair: () => n % 2 === 1, manque: () => n <= 18, passe: () => n >= 19 };
  if (!Object.hasOwn(tests, key)) return null;
  return n !== 0 && tests[key]() ? 2 : 0;
}

// la tour : [portes par étage, portes piégées]
const TOWER_FLOORS = 8;
const TOWER = { facile: [4, 1], moyen: [3, 1], difficile: [2, 1], extreme: [3, 2] };
const towerMult = ([doors, traps], k) => Math.floor(Math.pow(doors / (doors - traps), k) * 97) / 100;

// ---------------------------------------------------------------- cartes : 0..51, rang = c % 13 (0 = deux, 12 = as)
const freshDeck = (n = 1) => shuffled(Array.from({ length: 52 * n }, (_, i) => i % 52));

function eval5(c) {
  const ranks = c.map((x) => x % 13).sort((a, b) => b - a);
  const flush = c.every((x) => Math.floor(x / 13) === Math.floor(c[0] / 13));
  const count = {};
  ranks.forEach((r) => (count[r] = (count[r] || 0) + 1));
  const groups = Object.entries(count).map(([r, n]) => [n, +r]).sort((a, b) => b[0] - a[0] || b[1] - a[1]);
  const uniq = groups.length === 5;
  let top = -1;
  if (uniq) {
    if (ranks[0] - ranks[4] === 4) top = ranks[0];
    else if (ranks[0] === 12 && ranks[1] === 3) top = 3; // quinte blanche A-2-3-4-5
  }
  let cat;
  if (top >= 0 && flush) cat = 8;
  else if (groups[0][0] === 4) cat = 7;
  else if (groups[0][0] === 3 && groups[1][0] === 2) cat = 6;
  else if (flush) cat = 5;
  else if (top >= 0) cat = 4;
  else if (groups[0][0] === 3) cat = 3;
  else if (groups[0][0] === 2 && groups[1][0] === 2) cat = 2;
  else if (groups[0][0] === 2) cat = 1;
  else cat = 0;
  const order = top >= 0 ? [top] : groups.map((g) => g[1]);
  let score = cat;
  for (let i = 0; i < 5; i++) score = score * 13 + (order[i] ?? 0);
  return score;
}
const COMBOS_7 = [];
for (let a = 0; a < 7; a++) for (let b = a + 1; b < 7; b++) COMBOS_7.push([a, b]);
function bestHand(cards) {
  let best = -1;
  for (const [x, y] of COMBOS_7) {
    const s = eval5(cards.filter((_, i) => i !== x && i !== y));
    if (s > best) best = s;
  }
  return best;
}
const HAND_NAMES = ['Carte haute', 'Paire', 'Double paire', 'Brelan', 'Quinte', 'Couleur', 'Full', 'Carré', 'Quinte flush'];
const handName = (score) => HAND_NAMES[Math.floor(score / 13 ** 5)];

// blackjack
const cardValue = (c) => { const r = c % 13; return r <= 8 ? r + 2 : r === 12 ? 11 : 10; };
function bjTotal(cards) {
  let t = 0, aces = 0;
  for (const c of cards) { t += cardValue(c); if (c % 13 === 12) aces++; }
  while (t > 21 && aces) { t -= 10; aces--; }
  return { total: t, soft: aces > 0 };
}
const minesMult = (m, k) => { let r = 1; for (let i = 0; i < k; i++) r *= (25 - i) / (25 - m - i); return Math.floor(r * 97) / 100; };

// ---------------------------------------------------------------- boutique, missions, succès
const SHOP = [
  { id: 'f-neon', type: 'frame', name: 'Trait', price: 5000 },
  { id: 'f-aurora', type: 'frame', name: 'Double trait', price: 15000 },
  { id: 'f-gold', type: 'frame', name: 'Or massif', price: 50000 },
  { id: 'f-fire', type: 'frame', name: 'Braise', price: 150000, lvl: 10 },
  { id: 'f-void', type: 'frame', name: 'Onyx', price: 500000, lvl: 20 },
  { id: 'f-legend', type: 'frame', name: 'Souverain', price: 2000000, lvl: 30 },
  { id: 'c-mint', type: 'color', name: 'Menthe', price: 3000 },
  { id: 'c-sunset', type: 'color', name: 'Sanguine', price: 10000 },
  { id: 'c-chrome', type: 'color', name: 'Platine', price: 40000 },
  { id: 'c-rainbow', type: 'color', name: 'Néon', price: 200000, lvl: 15 },
  { id: 't-joueur', type: 'title', name: 'Gros joueur', price: 2000 },
  { id: 't-norme', type: 'title', name: 'Allergique à la norme', price: 8000 },
  { id: 't-segv', type: 'title', name: 'Survivant du segfault', price: 15000 },
  { id: 't-core', type: 'title', name: 'Core dumped', price: 25000 },
  { id: 't-banque', type: 'title', name: 'La Banque', price: 100000, lvl: 10 },
  { id: 't-roi', type: 'title', name: 'Bahlou Suprême', price: 1000000, lvl: 25 },
  { id: 'freeze', type: 'item', name: 'Gel de série', price: 2000, desc: 'Sauve ta série si tu rates un jour. 2 max.' },
  { id: 'boost', type: 'item', name: 'Boost XP ×2', price: 5000, desc: "Double ton XP pendant 1 heure." },
];
const shopItem = (id) => SHOP.find((s) => s.id === id);

const MISSIONS = [
  { id: 'r25', key: 'round', n: 25, txt: 'Jouer 25 parties', r: 800 },
  { id: 'w5k', key: 'wager', n: 5000, txt: 'Miser 5 000 bahlous', r: 700 },
  { id: 'w20k', key: 'wager', n: 20000, txt: 'Miser 20 000 bahlous', r: 1800 },
  { id: 'win10', key: 'win', n: 10, txt: 'Gagner 10 parties', r: 800 },
  { id: 'x5', key: 'mult5', n: 3, txt: 'Réaliser 3 gains à ×5 ou plus', r: 1500 },
  { id: 'cr3', key: 'crash3', n: 2, txt: 'Encaisser 2 fois à ×3 à Crash', r: 1200 },
  { id: 'cr', key: 'game:crash', n: 5, txt: 'Jouer 5 vols à Crash', r: 500 },
  { id: 'sl', key: 'game:slots', n: 20, txt: 'Lancer 20 fois la machine à sous', r: 700 },
  { id: 'wh', key: 'game:wheel', n: 4, txt: 'Tourner la Big Six 4 fois', r: 500 },
  { id: 'sc', key: 'game:scratch', n: 3, txt: 'Gratter 3 billets', r: 500 },
  { id: 'mi', key: 'game:mines', n: 5, txt: 'Terminer 5 parties de Mines', r: 600 },
  { id: 'mi6', key: 'mines6', n: 1, txt: 'Trouver 6 diamants dans une partie de Mines', r: 1200 },
  { id: 'bj', key: 'bjwin', n: 3, txt: 'Gagner 3 mains de Blackjack', r: 800 },
  { id: 'po', key: 'game:poker', n: 5, txt: 'Jouer 5 mains de poker', r: 900 },
  { id: 'pl', key: 'game:plinko', n: 20, txt: 'Lâcher 20 billes au Plinko', r: 500 },
  { id: 'du', key: 'game:duel', n: 3, txt: 'Jouer 3 Pile ou Face', r: 600 },
  { id: 'ro', key: 'game:roulette', n: 8, txt: 'Jouer 8 tours de Roulette', r: 700 },
  { id: 'to', key: 'game:tower', n: 5, txt: 'Terminer 5 parties de Tower', r: 600 },
  { id: 'to5', key: 'tower5', n: 1, txt: 'Atteindre le 5e étage de Tower', r: 1200 },
  { id: 'ch', key: 'chat', n: 5, txt: 'Envoyer 5 messages au Salon', r: 500 },
];

const ACH = [
  { id: 'first', name: 'Premier sang', d: 'Gagner une partie', r: 200, t: (p) => p.stats.wins >= 1 },
  { id: 'x10', name: 'Ça sent bon', d: 'Gagner à ×10', r: 500, t: (p) => p.stats.maxMult >= 10 },
  { id: 'x100', name: 'Centurion', d: 'Gagner à ×100', r: 5000, t: (p) => p.stats.maxMult >= 100 },
  { id: 'lvl5', name: 'Sorti de la piscine', d: 'Atteindre le niveau 5', r: 1000, t: (p) => levelOf(p.xp) >= 5 },
  { id: 'lvl15', name: 'Vétéran', d: 'Atteindre le niveau 15', r: 10000, t: (p) => levelOf(p.xp) >= 15 },
  { id: 'lvl40', name: 'Légende vivante', d: 'Atteindre le niveau 40', r: 200000, t: (p) => levelOf(p.xp) >= 40 },
  { id: 'streak7', name: 'Assidu', d: '7 jours de série', r: 3000, t: (p) => p.streak >= 7 },
  { id: 'streak30', name: 'Moine', d: '30 jours de série', r: 30000, t: (p) => p.streak >= 30 },
  { id: 'rich100', name: 'Salaire de CTO', d: 'Posséder 100 000 bahlous', r: 5000, t: (p) => p.coins >= 100000 },
  { id: 'rich1m', name: 'Millionnaire', d: 'Posséder 1 000 000 bahlous', r: 50000, t: (p) => p.coins >= 1000000 },
  { id: 'jackpot', name: 'LE JACKPOT', d: 'Décrocher le jackpot', r: 10000, t: (p) => p.flags.jackpot },
  { id: 'natural', name: 'Blackjack !', d: 'Recevoir un blackjack servi', r: 500, t: (p) => p.flags.natural },
  { id: 'crash50', name: 'Astronaute', d: 'Encaisser à ×50 à Crash', r: 10000, t: (p) => p.flags.crash50 },
  { id: 'mines15', name: 'Démineur', d: 'Trouver 15 diamants dans une partie', r: 5000, t: (p) => p.flags.mines15 },
  { id: 'quads', name: 'Main de fer', d: 'Gagner au poker avec un carré ou mieux', r: 3000, t: (p) => p.flags.quads },
  { id: 'crous', name: 'Boursier', d: 'Toucher la bourse du CROUS', r: 100, t: (p) => p.flags.crous },
  { id: 'shop', name: 'Consommateur', d: 'Acheter à la boutique', r: 300, t: (p) => p.owned.length >= 1 },
  { id: 'wager1m', name: 'Flambeur', d: 'Miser 1 000 000 au total', r: 25000, t: (p) => p.stats.wagered >= 1000000 },
];

// ---------------------------------------------------------------- module
module.exports = function createGames({ db, routes, send, readBody, broadcast, save, online, usersChanged, postSystem }) {
  const g = (db.games ||= {});
  g.players ||= {};
  g.jackpot ||= JACKPOT_SEED;
  g.feed ||= [];
  g.duels ||= [];
  g.crashHist ||= [];
  g.week ||= weekKey();

  const events = new Map();
  const emit = (name, ev) => { if (!events.has(name)) events.set(name, []); events.get(name).push(ev); };
  const flush = (name) => { const l = events.get(name) || []; events.delete(name); return l; };

  function player(name) {
    const p = (g.players[name] ||= { coins: START_COINS });
    p.xp ??= 0; p.streak ??= 0; p.lastDaily ??= null; p.chestAt ??= 0; p.wheelDay ??= null; p.bailoutAt ??= 0;
    p.owned ??= []; p.frame ??= null; p.color ??= null; p.title ??= null; p.freeze ??= 0; p.boostUntil ??= 0;
    p.ach ??= []; p.flags ??= {}; p.weekNet ??= 0; p.best ??= { amount: 0, game: null, mult: 0 };
    p.stats ??= { rounds: 0, wins: 0, wagered: 0, won: 0, maxMult: 0, games: {} };
    p.active ??= {};
    p.cards ??= {}; p.setsDone ??= [];
    p.missions ??= { day: null, list: [], bonus: false };
    return p;
  }

  function ensureDay(p) {
    const d = dayKey();
    if (p.missions.day === d) return;
    const pool = shuffled([...MISSIONS]);
    const list = []; const keys = new Set();
    for (const m of pool) { if (list.length < 3 && !keys.has(m.key)) { keys.add(m.key); list.push({ id: m.id, p: 0, done: false }); } }
    p.missions = { day: d, list, bonus: false };
  }

  function gift(p, amount) { p.coins += Math.floor(amount); }

  function addXp(name, amount) {
    const p = player(name);
    const before = levelOf(p.xp);
    p.xp += amount;
    const after = levelOf(p.xp);
    if (after === before) return;
    let reward = 0;
    for (let l = before + 1; l <= after; l++) reward += 300 * l;
    gift(p, reward);
    emit(name, { type: 'level', level: after, rank: rankOf(after), reward });
    if (rankOf(after) !== rankOf(before)) postSystem(`**${name}** accède au rang **${rankOf(after)}**, niveau ${after}.`);
    usersChanged();
  }

  function progress(name, key, v = 1) {
    const p = player(name);
    ensureDay(p);
    const scale = 1 + (levelOf(p.xp) - 1) * 0.1;
    for (const m of p.missions.list) {
      const def = MISSIONS.find((x) => x.id === m.id);
      if (m.done || !def || def.key !== key) continue;
      m.p = Math.min(def.n, m.p + v);
      if (m.p >= def.n) {
        m.done = true;
        const reward = Math.floor(def.r * scale);
        gift(p, reward);
        emit(name, { type: 'mission', txt: def.txt, reward });
      }
    }
    if (!p.missions.bonus && p.missions.list.length && p.missions.list.every((m) => m.done)) {
      p.missions.bonus = true;
      const reward = Math.floor(3000 * scale);
      gift(p, reward);
      addXp(name, 150);
      emit(name, { type: 'mission', txt: 'Toutes les missions du jour !', reward, bonus: true });
    }
  }

  function checkAch(name) {
    const p = player(name);
    for (const a of ACH) {
      if (p.ach.includes(a.id) || !a.t(p)) continue;
      p.ach.push(a.id);
      gift(p, a.r);
      emit(name, { type: 'ach', name: a.name, d: a.d, reward: a.r });
    }
  }

  let lastChatPost = 0;
  function pushFeed(item) {
    g.feed.unshift(item);
    g.feed.length = Math.min(g.feed.length, 30);
    broadcast('g:feed', item);
  }

  const GAME_LABEL = { crash: 'Crash', wheel: 'Big Six', scratch: 'Ticket à gratter', slots: 'Machine à sous', mines: 'Mines', blackjack: 'Blackjack', poker: "Hold'em", plinko: 'Plinko', duel: 'Pile ou Face', roulette: 'Roulette', tower: 'Tower' };

  // applique le résultat d'une partie : stats, XP, missions, succès, fil en direct
  function settle(name, game, bet, payout, opts = {}) {
    const p = player(name);
    payout = Math.floor(payout);
    if (!opts.noCoins) p.coins += payout;
    const mult = bet > 0 ? payout / bet : 0;
    const net = payout - bet;
    p.stats.rounds++;
    p.stats.wagered += bet;
    p.stats.won += payout;
    p.stats.games[game] = (p.stats.games[game] || 0) + 1;
    p.weekNet += net;
    if (net > 0) {
      p.stats.wins++;
      if (mult > p.stats.maxMult) p.stats.maxMult = mult;
      if (payout > p.best.amount) p.best = { amount: payout, game, mult: Math.round(mult * 100) / 100 };
      progress(name, 'win');
      if (mult >= 5) progress(name, 'mult5');
    }
    progress(name, 'round');
    progress(name, 'wager', bet);
    progress(name, 'game:' + game);
    const lvl = levelOf(p.xp);
    let xp = Math.min(10 + lvl * 5, 1 + Math.floor(bet / 25));
    if (isGolden()) xp *= 2;
    if (p.boostUntil > Date.now()) xp *= 2;
    addXp(name, xp);
    checkAch(name);

    const big = (mult >= 10 && payout >= 1000) || payout >= 10000;
    if (net > 0 && big) {
      pushFeed({ name, game, bet, payout, mult: Math.round(mult * 100) / 100, ts: Date.now() });
      const huge = payout >= 50000 || (mult >= 100 && payout >= 5000);
      if (huge && Date.now() - lastChatPost > 60e3) {
        lastChatPost = Date.now();
        postSystem(`**${name}** remporte **${payout.toLocaleString('fr-FR')} bahlous** à ${GAME_LABEL[game] || game}, ×${Math.round(mult * 100) / 100}.`);
      }
    }
  }

  function parseBet(p, raw) {
    const b = Math.floor(Number(raw));
    if (!Number.isFinite(b) || b < MIN_BET) throw new Error(`Mise minimum : ${MIN_BET}`);
    if (b > p.coins) throw new Error('Pas assez de bahlous');
    return b;
  }
  let jackpotDirty = false;
  function take(p, b) { p.coins -= b; g.jackpot += Math.max(1, Math.floor(b * 0.01)); jackpotDirty = true; }

  function pub(name) {
    const p = player(name);
    ensureDay(p);
    const level = levelOf(p.xp);
    const now = Date.now();
    const today = dayKey();
    const dayN = (p.lastDaily === today ? p.streak - 1 : nextStreak(p) - 1);
    return {
      name, coins: p.coins, level, rank: rankOf(level), xp: p.xp, xpCur: xpFor(level), xpNext: xpFor(level + 1),
      streak: p.streak, canDaily: p.lastDaily !== today, streakDay: ((dayN % 7) + 7) % 7, chestIn: Math.max(0, p.chestAt - now),
      wheelFree: p.wheelDay !== today, bailoutIn: Math.max(0, p.bailoutAt - now), canBailout: p.coins < 100 && !p.active.mines && !p.active.bj && !p.active.tower,
      missions: p.missions.list.map((m) => { const d = MISSIONS.find((x) => x.id === m.id); return { txt: d.txt, n: d.n, p: m.p, done: m.done, r: Math.floor(d.r * (1 + (level - 1) * 0.1)) }; }),
      missionBonus: p.missions.bonus, ach: p.ach, owned: p.owned, frame: p.frame, color: p.color, title: p.title,
      freeze: p.freeze, boostIn: Math.max(0, p.boostUntil - now), golden: isGolden(), best: p.best, stats: p.stats, weekNet: p.weekNet, cards: p.cards, setsDone: p.setsDone,
    };
  }
  function nextStreak(p) {
    const y = dayKey(Date.now() - 864e5);
    return p.lastDaily === y ? p.streak + 1 : (p.freeze > 0 && p.streak > 0 && p.lastDaily === dayKey(Date.now() - 2 * 864e5) ? p.streak + 1 : 1);
  }
  function pushMe(name) { broadcast('g:me', { me: pub(name), events: flush(name) }, [name]); }

  // anti-spam : 40 actions / 2 s
  const hits = new Map();
  function throttle(name) {
    const now = Date.now();
    const l = (hits.get(name) || []).filter((t) => now - t < 2000);
    l.push(now);
    hits.set(name, l);
    if (l.length > 40) throw new Error('Doucement !');
  }
  function route(key, fn) {
    routes['POST /api/g/' + key] = async (req, res, user) => {
      if (!user) return send(res, 401, { error: 'non connecté' });
      const body = await readBody(req);
      throttle(user);
      const out = fn(player(user), body, user) || {};
      save();
      send(res, 200, { ...out, me: pub(user), events: flush(user) });
    };
  }

  // ------------------------------------------------------------ récompenses
  route('daily', (p, _b, name) => {
    if (p.lastDaily === dayKey()) throw new Error('Déjà récupéré aujourd\'hui');
    const n = nextStreak(p);
    if (p.freeze > 0 && p.streak > 0 && p.lastDaily === dayKey(Date.now() - 2 * 864e5)) p.freeze--;
    p.streak = n;
    p.lastDaily = dayKey();
    const reward = Math.floor(STREAK_REWARDS[(n - 1) % 7] * (1 + Math.min(n / 30, 1)));
    gift(p, reward);
    addXp(name, 25);
    checkAch(name);
    return { reward, streak: n };
  });

  route('chest', (p, _b, name) => {
    if (p.chestAt > Date.now()) throw new Error('Coffre pas encore prêt');
    p.chestAt = Date.now() + CHEST_MS;
    const r = rint(100);
    const [tier, lo, hi] = r < 70 ? ['Commun', 300, 800] : r < 94 ? ['Rare', 1500, 3000] : r < 99 ? ['Épique', 5000, 10000] : ['Légendaire', 25000, 25001];
    const reward = Math.floor((lo + rint(hi - lo)) * (1 + (levelOf(p.xp) - 1) * 0.05));
    gift(p, reward);
    addXp(name, 15);
    checkAch(name);
    return { tier, reward };
  });

  route('bailout', (p, _b, name) => {
    if (p.coins >= 100) throw new Error("Tu n'es pas assez fauché");
    if (p.active.mines || p.active.bj || p.active.tower) throw new Error('Termine ta partie en cours');
    if (p.bailoutAt > Date.now()) throw new Error('Le CROUS traite ton dossier…');
    p.bailoutAt = Date.now() + BAILOUT_MS;
    gift(p, 1000);
    p.flags.crous = true;
    checkAch(name);
    return { reward: 1000 };
  });

  route('buy', (p, b, name) => {
    const it = shopItem(String(b.id));
    if (!it) throw new Error('Article inconnu');
    if (it.lvl && levelOf(p.xp) < it.lvl) throw new Error(`Niveau ${it.lvl} requis`);
    if (it.type !== 'item' && p.owned.includes(it.id)) throw new Error('Déjà possédé');
    if (it.id === 'freeze' && p.freeze >= 2) throw new Error('2 gels maximum');
    if (p.coins < it.price) throw new Error('Pas assez de bahlous');
    p.coins -= it.price;
    if (it.id === 'freeze') p.freeze++;
    else if (it.id === 'boost') p.boostUntil = Math.max(p.boostUntil, Date.now()) + 3600e3;
    else { p.owned.push(it.id); p[it.type] = it.id; usersChanged(); }
    p.flags.bought = true;
    checkAch(name);
  });

  route('equip', (p, b) => {
    const type = String(b.type);
    if (!['frame', 'color', 'title'].includes(type)) throw new Error('Type inconnu');
    if (b.id === null) p[type] = null;
    else {
      const it = shopItem(String(b.id));
      if (!it || it.type !== type || !p.owned.includes(it.id)) throw new Error('Article non possédé');
      p[type] = it.id;
    }
    usersChanged();
  });

  // ------------------------------------------------------------ roue
  route('wheel', (p, b, name) => {
    if (b.free) {
      if (p.wheelDay === dayKey()) throw new Error('Tour gratuit déjà utilisé');
      p.wheelDay = dayKey();
      const index = rint(FREE_WHEEL.length);
      const payout = FREE_WHEEL[index];
      gift(p, payout);
      addXp(name, 15);
      progress(name, 'game:wheel');
      checkAch(name);
      return { index, payout };
    }
    const bet = parseBet(p, b.bet);
    take(p, bet);
    const index = rint(WHEEL.length);
    const payout = Math.floor(bet * WHEEL[index]);
    settle(name, 'wheel', bet, payout);
    return { index, payout, mult: WHEEL[index] };
  });

  // ------------------------------------------------------------ grattage
  // un même tirage de gains pour les trois tickets : seule la présentation change
  const SCRATCH_BASES = [1, 2, 5, 10, 20, 50, 100, 200];
  const SCRATCH_MULTS = [[1, 60], [2, 25], [5, 12], [10, 3]];
  const SCRATCH_PARTS = [1, 2, 3, 5, 10, 20, 25, 50, 100, 200];
  function scratchPrize() {
    let r = rint(10000);
    for (const [v, w] of SCRATCH_ODDS) { if ((r -= w) < 0) return v; }
    return 0;
  }
  const scratchShown = () => SCRATCH_ODDS[(() => { let r = rint(SCRATCH_ODDS.reduce((t, [, w]) => t + w, 0)); return SCRATCH_ODDS.findIndex(([, w]) => (r -= w) < 0); })()][0];
  function scratchMatch(prize, values) {
    const pool = shuffled(values.filter((v) => v !== prize).flatMap((v) => [v, v]));
    return shuffled(prize ? [prize, prize, prize, ...pool.slice(0, 6)] : pool.slice(0, 9));
  }
  function scratchTicket(tier, prize) {
    if (tier === 'argent') {
      const numbers = shuffled(Array.from({ length: 30 }, (_, i) => i + 1));
      const winning = numbers.slice(0, 2);
      const others = numbers.slice(2);
      const splits = SCRATCH_PARTS.flatMap((a) => SCRATCH_PARTS.filter((b) => b >= a && a + b === prize).map((b) => [a, b]));
      const parts = !prize ? [] : splits.length && rint(2) ? splits[rint(splits.length)] : [prize];
      const hits = parts.map((v, i) => ({ n: winning[i % 2], v }));
      const rest = Array.from({ length: 8 - hits.length }, (_, i) => ({ n: others[i], v: scratchShown() }));
      return { kind: 'numbers', winning, cells: shuffled([...hits, ...rest]) };
    }
    if (tier === 'or') {
      const options = prize ? SCRATCH_BASES.flatMap((base) => SCRATCH_MULTS.filter(([m]) => base * m === prize).map(([m]) => ({ base, mult: m }))) : [];
      const mult = () => { let r = rint(100); return SCRATCH_MULTS.find(([, w]) => (r -= w) < 0)[0]; };
      const pick = prize ? options[rint(options.length)] : { base: 0, mult: mult() };
      return { kind: 'bonus', grid: scratchMatch(pick.base, SCRATCH_BASES), base: pick.base, mult: pick.mult };
    }
    return { kind: 'match', grid: scratchMatch(prize, SCRATCH_VALUES) };
  }
  route('scratch', (p, b, name) => {
    const tier = String(b.tier);
    const bet = Object.hasOwn(SCRATCH_TIERS, tier) ? SCRATCH_TIERS[tier] : 0;
    if (!bet) throw new Error('Ticket inconnu');
    if (p.coins < bet) throw new Error('Pas assez de bahlous');
    take(p, bet);
    const prize = scratchPrize();
    const ticket = scratchTicket(tier, prize);
    const payout = bet * prize;
    settle(name, 'scratch', bet, payout);
    return { ...ticket, prize, payout, bet };
  });

  // ------------------------------------------------------------ machine à sous
  route('slots', (p, b, name) => {
    const bet = parseBet(p, b.bet);
    take(p, bet);
    const spin = slotSpin(bet);
    let jackpot = 0;
    if (rint(4000) < Math.min(1000, bet) / 1000) {
      for (let r = 0; r < 5; r++) spin.first.grid[r][1] = S_DIAMOND;
      jackpot = g.jackpot;
      g.jackpot = JACKPOT_SEED;
      jackpotDirty = true;
      p.flags.jackpot = true;
      postSystem(`**${name}** remporte le jackpot : **${jackpot.toLocaleString('fr-FR')} bahlous**.`);
    }
    const payout = spin.total + jackpot;
    settle(name, 'slots', bet, payout);
    return { first: spin.first, free: spin.free, jackpot, payout };
  });

  // ------------------------------------------------------------ plinko
  route('plinko', (p, b, name) => {
    const risk = Object.hasOwn(PLINKO, String(b.risk)) ? String(b.risk) : 'mid';
    const bet = parseBet(p, b.bet);
    take(p, bet);
    const path = Array.from({ length: PLINKO_ROWS }, () => rint(2));
    const slot = path.reduce((a, c) => a + c, 0);
    const mult = PLINKO[risk][slot];
    const payout = Math.floor(bet * mult);
    settle(name, 'plinko', bet, payout);
    return { path, slot, mult, payout };
  });

  // ------------------------------------------------------------ mines
  const minesView = (a, over) => {
    const k = a.rev.length;
    return { bet: a.bet, mines: a.n, rev: a.rev, mult: minesMult(a.n, k), next: k < 25 - a.n ? minesMult(a.n, k + 1) : null, field: over ? a.field : undefined };
  };
  function minesEnd(p, name, a, payout) {
    delete p.active.mines;
    if (a.rev.length >= 6) progress(name, 'mines6');
    if (a.rev.length >= 15) p.flags.mines15 = true;
    settle(name, 'mines', a.bet, payout);
  }
  route('mines/start', (p, b) => {
    if (p.active.mines) throw new Error('Partie déjà en cours');
    const n = clamp(Math.floor(Number(b.mines)) || 3, 1, 24);
    const bet = parseBet(p, b.bet);
    take(p, bet);
    p.active.mines = { bet, n, field: shuffled(Array.from({ length: 25 }, (_, i) => i)).slice(0, n), rev: [] };
    return { game: minesView(p.active.mines) };
  });
  route('mines/reveal', (p, b, name) => {
    const a = p.active.mines;
    if (!a) throw new Error('Aucune partie en cours');
    const i = Math.floor(Number(b.i));
    if (!(i >= 0 && i < 25) || a.rev.includes(i)) throw new Error('Case invalide');
    if (a.field.includes(i)) {
      const view = minesView(a, true);
      minesEnd(p, name, a, 0);
      return { game: view, boom: i, payout: 0 };
    }
    a.rev.push(i);
    if (a.rev.length === 25 - a.n) {
      const view = minesView(a, true);
      const payout = Math.floor(a.bet * view.mult);
      minesEnd(p, name, a, payout);
      return { game: view, payout, cleared: true };
    }
    return { game: minesView(a) };
  });
  route('mines/cash', (p, _b, name) => {
    const a = p.active.mines;
    if (!a || !a.rev.length) throw new Error('Rien à encaisser');
    const view = minesView(a, true);
    const payout = Math.floor(a.bet * view.mult);
    minesEnd(p, name, a, payout);
    return { game: view, payout };
  });

  // ------------------------------------------------------------ roulette
  route('roulette', (p, b, name) => {
    if (!Array.isArray(b.bets) || !b.bets.length || b.bets.length > 60) throw new Error('Place au moins un jeton');
    const seen = new Set(); let total = 0;
    for (const x of b.bets) {
      const a = Math.floor(Number(x && x.a)), k = String(x && x.k);
      if (!(a >= 1) || !Number.isFinite(a) || seen.has(k) || rouletteMult(k, 1) === null) throw new Error('Mise invalide');
      seen.add(k); total += a;
    }
    const bet = parseBet(p, total);
    take(p, bet);
    const number = rint(37);
    let payout = 0;
    for (const x of b.bets) payout += Math.floor(x.a) * rouletteMult(String(x.k), number);
    settle(name, 'roulette', bet, payout);
    return { number, payout, bet };
  });

  // ------------------------------------------------------------ la tour
  const towerView = (a, over) => ({
    bet: a.bet, diff: a.diff, floor: a.picks.length, picks: a.picks, doors: TOWER[a.diff][0],
    mult: towerMult(TOWER[a.diff], a.picks.length), next: a.picks.length < TOWER_FLOORS ? towerMult(TOWER[a.diff], a.picks.length + 1) : null,
    traps: over ? a.traps : undefined,
  });
  function towerEnd(p, name, a, payout) {
    delete p.active.tower;
    if (a.picks.length >= 5) progress(name, 'tower5');
    settle(name, 'tower', a.bet, payout);
  }
  route('tower/start', (p, b) => {
    if (p.active.tower) throw new Error('Ascension déjà en cours');
    const diff = Object.hasOwn(TOWER, String(b.diff)) ? String(b.diff) : 'moyen';
    const bet = parseBet(p, b.bet);
    take(p, bet);
    const [doors, n] = TOWER[diff];
    p.active.tower = { bet, diff, picks: [], traps: Array.from({ length: TOWER_FLOORS }, () => shuffled(Array.from({ length: doors }, (_, i) => i)).slice(0, n)) };
    return { game: towerView(p.active.tower) };
  });
  route('tower/pick', (p, b, name) => {
    const a = p.active.tower;
    if (!a) throw new Error('Aucune ascension en cours');
    const door = Math.floor(Number(b.door));
    if (!(door >= 0 && door < TOWER[a.diff][0])) throw new Error('Porte invalide');
    if (a.traps[a.picks.length].includes(door)) {
      const view = towerView(a, true);
      towerEnd(p, name, a, 0);
      return { game: view, trapped: door, payout: 0 };
    }
    a.picks.push(door);
    if (a.picks.length === TOWER_FLOORS) {
      const view = towerView(a, true);
      const payout = Math.floor(a.bet * view.mult);
      towerEnd(p, name, a, payout);
      return { game: view, payout, top: true };
    }
    return { game: towerView(a) };
  });
  route('tower/cash', (p, _b, name) => {
    const a = p.active.tower;
    if (!a || !a.picks.length) throw new Error('Rien à encaisser');
    const view = towerView(a, true);
    const payout = Math.floor(a.bet * view.mult);
    towerEnd(p, name, a, payout);
    return { game: view, payout };
  });

  // ------------------------------------------------------------ blackjack
  // une partie = une ou plusieurs mains ; les anciennes parties sauvegardées sont converties
  function bjUp(a) {
    if (a && !a.hands) { a.hands = [{ cards: a.player, bet: a.bet, doubled: !!a.doubled }]; a.cur = 0; delete a.player; }
    return a;
  }
  const bjView = (a, over) => {
    const hand = a.hands[Math.min(a.cur, a.hands.length - 1)];
    return {
      bet: a.hands.reduce((t, h) => t + h.bet, 0), player: hand.cards, dealer: over ? a.dealer : [a.dealer[0], -1],
      hands: a.hands.map((h) => ({ cards: h.cards, bet: h.bet, total: bjTotal(h.cards).total, result: h.result || null })), cur: a.cur,
      total: bjTotal(hand.cards).total, dealerTotal: over ? bjTotal(a.dealer).total : bjTotal([a.dealer[0]]).total,
      canDouble: !over && hand.cards.length === 2 && !hand.doubled && !hand.aces,
      canSplit: !over && hand.cards.length === 2 && cardValue(hand.cards[0]) === cardValue(hand.cards[1]) && a.hands.length < 4 && !hand.aces, handBet: hand.bet,
    };
  };
  function bjFinish(p, name, a, natural) {
    const live = a.hands.some((h) => bjTotal(h.cards).total <= 21);
    if (live && !natural) while (bjTotal(a.dealer).total < 17) a.dealer.push(a.deck.pop());
    const de = bjTotal(a.dealer).total;
    const dealerNat = a.dealer.length === 2 && de === 21;
    let payout = 0, wins = 0;
    for (const h of a.hands) {
      const pl = bjTotal(h.cards).total;
      let got = 0, result = 'lose';
      if (pl > 21) result = 'bust';
      else if (natural && dealerNat) { got = h.bet; result = 'push'; }
      else if (natural) { got = Math.floor(h.bet * 2.5); result = 'blackjack'; p.flags.natural = true; }
      else if (dealerNat) result = 'lose';
      else if (de > 21 || pl > de) { got = h.bet * 2; result = 'win'; }
      else if (pl === de) { got = h.bet; result = 'push'; }
      h.result = result;
      payout += got;
      if (got > h.bet) wins++;
    }
    const total = a.hands.reduce((t, h) => t + h.bet, 0);
    const view = bjView(a, true);
    const result = a.hands.length === 1 ? a.hands[0].result : payout > total ? 'win' : payout === total ? 'push' : 'lose';
    delete p.active.bj;
    if (wins) progress(name, 'bjwin', wins);
    settle(name, 'blackjack', total, payout);
    return { game: view, result, payout, over: true };
  }
  function bjNext(p, name, a) {
    const n = a.hands.findIndex((h) => !h.done);
    if (n < 0) return bjFinish(p, name, a, false);
    a.cur = n;
    return { game: bjView(a) };
  }
  const bjCur = (p) => { const a = bjUp(p.active.bj); if (!a) throw new Error('Aucune main en cours'); return [a, a.hands[a.cur]]; };
  route('bj/start', (p, b, name) => {
    if (p.active.bj) throw new Error('Main déjà en cours');
    const bet = parseBet(p, b.bet);
    take(p, bet);
    const deck = freshDeck(6).slice(0, 60);
    const a = { deck, hands: [{ cards: [deck.pop(), deck.pop()], bet, doubled: false }], cur: 0, dealer: [deck.pop(), deck.pop()] };
    p.active.bj = a;
    const pn = bjTotal(a.hands[0].cards).total === 21, dn = bjTotal(a.dealer).total === 21;
    if (pn) return bjFinish(p, name, a, true);
    if (dn) return bjFinish(p, name, a, false);
    return { game: bjView(a) };
  });
  route('bj/hit', (p, _b, name) => {
    const [a, h] = bjCur(p);
    h.cards.push(a.deck.pop());
    if (bjTotal(h.cards).total >= 21) { h.done = true; return bjNext(p, name, a); }
    return { game: bjView(a) };
  });
  route('bj/stand', (p, _b, name) => {
    const [a, h] = bjCur(p);
    h.done = true;
    return bjNext(p, name, a);
  });
  route('bj/double', (p, _b, name) => {
    const [a, h] = bjCur(p);
    if (h.cards.length !== 2 || h.doubled || h.aces) throw new Error('Impossible de doubler');
    if (p.coins < h.bet) throw new Error('Pas assez de bahlous');
    take(p, h.bet);
    h.bet *= 2; h.doubled = true; h.done = true;
    h.cards.push(a.deck.pop());
    return bjNext(p, name, a);
  });
  route('bj/split', (p, _b, name) => {
    const [a, h] = bjCur(p);
    if (h.cards.length !== 2 || cardValue(h.cards[0]) !== cardValue(h.cards[1]) || a.hands.length >= 4 || h.aces) throw new Error('Impossible de séparer');
    if (p.coins < h.bet) throw new Error('Pas assez de bahlous');
    take(p, h.bet);
    const aces = h.cards[0] % 13 === 12;
    const second = { cards: [h.cards.pop(), a.deck.pop()], bet: h.bet, doubled: false, aces };
    h.cards.push(a.deck.pop());
    h.aces = aces;
    a.hands.splice(a.cur + 1, 0, second);
    // deux as séparés : une seule carte chacun, comme au casino
    if (aces) { h.done = true; second.done = true; }
    for (const x of [h, second]) if (bjTotal(x.cards).total === 21) x.done = true;
    return bjNext(p, name, a);
  });

  // ------------------------------------------------------------ duels
  function expireDuels() {
    const now = Date.now();
    for (let i = g.duels.length - 1; i >= 0; i--) {
      const d = g.duels[i];
      if (now - d.ts > 30 * 60e3) { player(d.from).coins += d.bet; g.duels.splice(i, 1); pushMe(d.from); broadcast('g:duels', g.duels); }
    }
  }
  route('duel/create', (p, b, name) => {
    const bet = parseBet(p, b.bet);
    if (g.duels.filter((d) => d.from === name).length >= 3) throw new Error('3 duels ouverts maximum');
    const side = b.side === 'face' ? 'face' : 'pile';
    p.coins -= bet;
    g.duels.push({ id: crypto.randomBytes(5).toString('hex'), from: name, bet, side, ts: Date.now() });
    broadcast('g:duels', g.duels);
  });
  route('duel/cancel', (p, b, name) => {
    const i = g.duels.findIndex((d) => d.id === b.id && d.from === name);
    if (i < 0) throw new Error('Duel introuvable');
    p.coins += g.duels[i].bet;
    g.duels.splice(i, 1);
    broadcast('g:duels', g.duels);
  });
  route('duel/join', (p, b, name) => {
    const i = g.duels.findIndex((d) => d.id === b.id);
    if (i < 0) throw new Error('Trop tard, duel déjà pris');
    const d = g.duels[i];
    if (d.from === name) throw new Error('Pas contre toi-même');
    if (p.coins < d.bet) throw new Error('Pas assez de bahlous');
    p.coins -= d.bet;
    g.duels.splice(i, 1);
    const flip = rint(2) ? 'pile' : 'face';
    const winner = flip === d.side ? d.from : name;
    const prize = Math.floor(d.bet * 1.94);
    settle(d.from, 'duel', d.bet, winner === d.from ? prize : 0);
    settle(name, 'duel', d.bet, winner === name ? prize : 0);
    const result = { id: d.id, flip, winner, a: d.from, b: name, bet: d.bet, prize };
    broadcast('g:duels', g.duels);
    broadcast('g:duel', result, [d.from, name]);
    pushMe(d.from);
    return { result };
  });
  route('duel/house', (p, b, name) => {
    const bet = parseBet(p, b.bet);
    const side = b.side === 'face' ? 'face' : 'pile';
    take(p, bet);
    const flip = rint(2) ? 'pile' : 'face';
    const payout = flip === side ? Math.floor(bet * 1.94) : 0;
    settle(name, 'duel', bet, payout);
    return { flip, payout, side };
  });

  // ------------------------------------------------------------ crash (multijoueur en direct)
  const K = 0.00009;
  const curve = (ms) => Math.exp(K * ms);
  const floor2 = (x) => Math.floor(x * 100) / 100;
  const C = { phase: 'idle', id: 0, until: 0, point: 0, start: 0, bets: new Map(), timer: null, tick: null };
  const crashView = () => ({
    phase: C.phase, id: C.id, left: Math.max(0, C.until - Date.now()), elapsed: C.phase === 'run' ? Date.now() - C.start : 0,
    point: C.phase === 'end' ? C.point : undefined, hist: g.crashHist.slice(0, 16),
    bets: [...C.bets.entries()].map(([name, b]) => ({ name, bet: b.bet, cash: b.cash || null, win: b.win || 0})),
  });
  const castCrash = () => broadcast('g:crash', crashView());
  function crashPrepare() {
    clearTimeout(C.timer);
    if (online().size === 0) { C.phase = 'idle'; C.timer = setTimeout(crashPrepare, 4000); return; }
    C.phase = 'bet'; C.id++; C.bets = new Map(); C.until = Date.now() + 8000;
    castCrash();
    C.timer = setTimeout(crashLaunch, 8000);
  }
  function crashLaunch() {
    const r = rnd();
    C.point = clamp(Math.floor((97 / (1 - r))) / 100, 1, 1000);
    C.start = Date.now();
    C.phase = 'run';
    castCrash();
    C.tick = setInterval(crashTick, 40);
  }
  function crashPay(name, b, at) {
    b.cash = at;
    b.win = Math.floor(b.bet * at);
    if (at >= 3) progress(name, 'crash3');
    if (at >= 50) player(name).flags.crash50 = true;
    settle(name, 'crash', b.bet, b.win);
  }
  function crashTick() {
    const m = curve(Date.now() - C.start);
    let changed = false;
    for (const [name, b] of C.bets) {
      if (!b.cash && b.auto && b.auto <= m && b.auto <= C.point) { crashPay(name, b, b.auto); pushMe(name); changed = true; }
    }
    if (m >= C.point) {
      clearInterval(C.tick);
      C.phase = 'end';
      for (const [name, b] of C.bets) { if (!b.cash) { settle(name, 'crash', b.bet, 0); pushMe(name); } }
      g.crashHist.unshift(C.point);
      g.crashHist.length = Math.min(g.crashHist.length, 30);
      save();
      castCrash();
      C.timer = setTimeout(crashPrepare, 4000);
    } else if (changed) { save(); castCrash(); }
  }
  route('crash/bet', (p, b, name) => {
    if (C.phase !== 'bet') throw new Error('Attends le prochain décollage');
    if (C.bets.has(name)) throw new Error('Tu as déjà misé');
    const bet = parseBet(p, b.bet);
    const auto = Number(b.auto) >= 1.01 ? floor2(Number(b.auto)) : 0;
    take(p, bet);
    C.bets.set(name, { bet, auto });
    castCrash();
  });
  route('crash/cash', (p, _b, name) => {
    if (C.phase !== 'run') throw new Error('Trop tard');
    const b = C.bets.get(name);
    if (!b || b.cash) throw new Error('Rien à encaisser');
    const m = floor2(curve(Date.now() - C.start));
    if (m > C.point || curve(Date.now() - C.start) >= C.point) throw new Error('Trop tard !');
    crashPay(name, b, m);
    castCrash();
    return { at: m, payout: b.win };
  });

  // ------------------------------------------------------------ Texas Hold'em
  let SB = 25, BB = 50;
  const MIN_BUYIN = 1000;
  const T_BUYIN = 2000, T_CHIPS = 5000, T_HOUSE = 10000, T_MAX = 6, T_LEVEL_MS = 4 * 60e3;
  const T_LEVELS = [[25, 50], [50, 100], [75, 150], [100, 200], [150, 300], [200, 400], [300, 600], [400, 800], [600, 1200], [800, 1600], [1000, 2000], [1500, 3000]];
  g.tourney ||= { entrants: [], points: {}, last: null, autoWeek: null };
  const TT = { on: false, pending: false, level: 0, nextAt: 0, out: [], entrants: [] };
  const tourneyView = () => ({ on: TT.on, pending: TT.pending, level: TT.level + 1, sb: SB, bb: BB, nextIn: TT.on ? Math.max(0, TT.nextAt - Date.now()) : 0, alive: TT.on ? T.seats.filter((s) => s && s.stack > 0).map((s) => s.name) : [], entrants: TT.on ? TT.entrants : g.tourney.entrants, buyin: T_BUYIN, chips: T_CHIPS, house: T_HOUSE, max: T_MAX, points: g.tourney.points, last: g.tourney.last });
  const castTourney = () => broadcast('g:tourney', tourneyView());
  const BOT_NAMES = ['Marvin', 'HAL', 'GLaDOS', 'Clippy'];
  const T = { seats: Array(6).fill(null), btn: -1, phase: 'idle', board: [], deck: [], cur: -1, bet: 0, minRaise: BB, deadline: 0, hand: 0, result: null, timer: null };
  const humans = () => T.seats.filter((s) => s && !s.bot);
  const inHand = () => T.seats.map((s, i) => [s, i]).filter(([s]) => s && s.in);
  const alive = () => inHand().filter(([s]) => !s.folded);
  const canAct = () => alive().filter(([s]) => !s.allin);
  const inPlay = () => !['idle', 'done'].includes(T.phase);

  function pokerView(viewer) {
    const reveal = T.phase === 'done' && T.result && T.result.showdown;
    return {
      phase: T.phase, board: T.board, btn: T.btn, cur: T.cur, bet: T.bet, minRaise: T.minRaise, sb: SB, bb: BB, hand: T.hand,
      left: Math.max(0, T.deadline - Date.now()), pot: T.seats.reduce((a, s) => a + (s && s.in ? s.total : 0), 0), result: T.result,
      minBuyin: MIN_BUYIN, tourney: TT.on ? tourneyView() : null,
      seats: T.seats.map((s) => s && ({
        name: s.name, bot: !!s.bot, leaving: !!s.leaving, stack: s.stack, street: s.street, folded: s.folded, allin: s.allin, in: s.in,
        hole: !s.hole ? null : (s.name === viewer || (reveal && !s.folded)) ? s.hole : [-1, -1],
      })),
    };
  }
  function castPoker() {
    const on = online();
    for (const name of on) broadcast('g:poker', pokerView(name), [name]);
  }
  function clearT() { clearTimeout(T.timer); T.timer = null; }

  function fillBots() {
    if (TT.on) return;
    const h = humans().length;
    if (h === 0) { T.seats = T.seats.map((s) => (s && s.bot ? null : s)); return; }
    let bots = T.seats.filter((s) => s && s.bot).length;
    const target = Math.max(0, 4 - h);
    for (let i = 5; i >= 0 && bots > target; i--) { if (T.seats[i] && T.seats[i].bot) { T.seats[i] = null; bots--; } }
    const used = new Set(T.seats.filter(Boolean).map((s) => s.name));
    for (let i = 0; i < 6 && bots < target; i++) {
      if (T.seats[i]) continue;
      const n = BOT_NAMES.find((x) => !used.has(x));
      used.add(n);
      T.seats[i] = { name: n, bot: true, stack: 5000, aggro: 0.6 + rnd() * 0.8 };
      bots++;
    }
  }
  function nextIdx(i, pred) {
    for (let k = 1; k <= 6; k++) { const j = (i + k + 6) % 6; const s = T.seats[j]; if (s && pred(s, j)) return j; }
    return -1;
  }
  function pay(s, x) { const v = Math.min(x, s.stack); s.stack -= v; s.street += v; s.total += v; if (s.stack === 0) s.allin = true; return v; }
  function standUp(i) {
    const s = T.seats[i];
    if (!s) return;
    if (!s.bot && !TT.on) { player(s.name).coins += s.stack; pushMe(s.name); }
    T.seats[i] = null;
  }

  function tourneyBegin() {
    TT.pending = false;
    T.seats.forEach((s, i) => { if (s) standUp(i); });
    TT.on = true; TT.level = 0; TT.nextAt = Date.now() + T_LEVEL_MS; TT.out = [];
    TT.entrants = g.tourney.entrants.slice();
    g.tourney.entrants = [];
    [SB, BB] = T_LEVELS[0];
    TT.entrants.forEach((name, i) => { T.seats[i] = { name, stack: T_CHIPS, in: false, hole: null, street: 0, total: 0, folded: false, allin: false }; });
    T.btn = -1;
    postSystem(`Le tournoi commence avec ${TT.entrants.length} joueurs.`);
    save(); castTourney();
  }
  function tourneyEnd() {
    const last = T.seats.find((s) => s && s.stack > 0);
    const ranking = [...(last ? [last.name] : []), ...TT.out.slice().reverse()];
    const n = TT.entrants.length;
    const pool = T_BUYIN * n + T_HOUSE;
    const shares = n >= 4 ? [0.5, 0.3, 0.2] : n === 3 ? [0.6, 0.3, 0.1] : [0.7, 0.3];
    ranking.forEach((name, i) => {
      const reward = Math.floor(pool * (shares[i] || 0));
      const pts = (n - i) * 10;
      g.tourney.points[name] = (g.tourney.points[name] || 0) + pts;
      if (reward) { player(name).coins += reward; }
      addXp(name, 150 - i * 25 > 25 ? 150 - i * 25 : 25);
      emit(name, { type: 'tourney', place: i + 1, reward, pts });
      pushMe(name);
    });
    if (ranking[0]) { g.tourney.last = { name: ranking[0], n, pool, ts: Date.now() }; postSystem(`**${ranking[0]}** remporte le tournoi et **${Math.floor(pool * shares[0]).toLocaleString('fr-FR')} bahlous**.`); }
    TT.on = false; TT.out = []; TT.entrants = [];
    SB = 25; BB = 50;
    T.seats = Array(6).fill(null);
    T.phase = 'idle'; T.board = []; T.cur = -1; T.result = null;
    save(); castPoker(); castTourney();
  }
  function startHand() {
    clearT();
    if (TT.pending) tourneyBegin();
    if (TT.on) {
      T.seats.map((s, i) => [s, i]).filter(([s]) => s && s.stack <= 0).sort(([a], [b]) => a.total - b.total).forEach(([s, i]) => { TT.out.push(s.name); T.seats[i] = null; });
      if (T.seats.filter(Boolean).length <= 1) return tourneyEnd();
      if (Date.now() >= TT.nextAt && TT.level < T_LEVELS.length - 1) { TT.level++; TT.nextAt = Date.now() + T_LEVEL_MS; [SB, BB] = T_LEVELS[TT.level]; }
      castTourney();
    } else
    T.seats.forEach((s, i) => { if (s && !s.bot && (s.leaving || s.stack <= 0)) standUp(i); });
    T.seats.forEach((s) => { if (s && s.bot && s.stack < 1000) s.stack = 5000; });
    fillBots();
    const ready = T.seats.filter((s) => s && s.stack > 0);
    if (humans().length < 1 || ready.length < 2) {
      T.phase = 'idle'; T.board = []; T.cur = -1; T.result = null;
      T.seats.forEach((s) => { if (s) Object.assign(s, { in: false, hole: null, street: 0, total: 0, folded: false, allin: false }); });
      save(); castPoker();
      return;
    }
    T.hand++; T.phase = 'preflop'; T.board = []; T.result = null; T.deck = freshDeck();
    T.seats.forEach((s) => { if (s) Object.assign(s, { in: s.stack > 0, hole: null, street: 0, total: 0, folded: false, allin: false, acted: false }); });
    T.btn = nextIdx(T.btn, (s) => s.in);
    const hu = ready.length === 2;
    const sb = hu ? T.btn : nextIdx(T.btn, (s) => s.in);
    const bb = nextIdx(sb, (s) => s.in);
    pay(T.seats[sb], SB); pay(T.seats[bb], BB);
    T.bet = BB; T.minRaise = BB;
    T.seats.forEach((s) => { if (s && s.in) s.hole = [T.deck.pop(), T.deck.pop()]; });
    T.cur = nextIdx(bb, (s) => s.in && !s.allin && !s.folded);
    if (T.cur < 0 || alive().filter(([s]) => !s.allin).length === 0) { T.cur = -1; castPoker(); T.timer = setTimeout(nextStreet, 1200); return; }
    beginTurn();
  }

  function beginTurn() {
    clearT();
    const s = T.seats[T.cur];
    if (s.leaving) { T.timer = setTimeout(() => pokerAct(T.cur, T.bet - s.street > 0 ? 'fold' : 'check'), 300); castPoker(); return; }
    if (s.bot) { T.deadline = 0; castPoker(); T.timer = setTimeout(() => botPlay(T.cur), 900 + rint(1300)); return; }
    T.deadline = Date.now() + 25000;
    castPoker();
    T.timer = setTimeout(() => {
      const c = T.seats[T.cur];
      if (!c) return;
      c.miss = (c.miss || 0) + 1;
      if (c.miss >= 2) c.leaving = true;
      pokerAct(T.cur, T.bet - c.street > 0 ? 'fold' : 'check');
    }, 25000);
  }

  function pokerAct(i, type, amount) {
    const s = T.seats[i];
    if (!inPlay() || i !== T.cur || !s) throw new Error("Ce n'est pas ton tour");
    const toCall = T.bet - s.street;
    if (type === 'fold') s.folded = true;
    else if (type === 'check') { if (toCall > 0) throw new Error('Tu ne peux pas checker'); }
    else if (type === 'call') { if (toCall <= 0) throw new Error('Rien à suivre'); pay(s, toCall); }
    else if (type === 'raise') {
      const maxTo = s.street + s.stack;
      let to = Math.floor(Number(amount));
      if (!Number.isFinite(to)) throw new Error('Montant invalide');
      const minTo = T.bet + T.minRaise;
      if (to >= maxTo) to = maxTo;
      else if (to < minTo) throw new Error(`Relance minimum : ${minTo}`);
      if (to <= T.bet) throw new Error('Relance trop petite');
      const size = to - T.bet;
      pay(s, to - s.street);
      if (size >= T.minRaise) {
        T.minRaise = size;
        T.seats.forEach((x) => { if (x && x !== s && x.in && !x.folded) x.acted = false; });
      }
      T.bet = to;
    } else throw new Error('Action inconnue');
    s.acted = true;
    clearT();
    pokerProgress();
  }

  function pokerProgress() {
    if (alive().length === 1) return pokerFinish();
    const ca = canAct();
    if (ca.every(([s]) => s.acted && s.street === T.bet)) return nextStreet();
    T.cur = nextIdx(T.cur, (s) => s.in && !s.folded && !s.allin && (!s.acted || s.street < T.bet));
    beginTurn();
  }

  function nextStreet() {
    clearT();
    T.seats.forEach((s) => { if (s && s.in) { s.street = 0; s.acted = false; } });
    T.bet = 0; T.minRaise = BB; T.cur = -1;
    if (T.phase === 'preflop') { T.phase = 'flop'; T.board.push(T.deck.pop(), T.deck.pop(), T.deck.pop()); }
    else if (T.phase === 'flop') { T.phase = 'turn'; T.board.push(T.deck.pop()); }
    else if (T.phase === 'turn') { T.phase = 'river'; T.board.push(T.deck.pop()); }
    else return pokerFinish();
    if (canAct().length <= 1) { castPoker(); T.timer = setTimeout(nextStreet, 1300); return; }
    T.cur = nextIdx(T.btn, (s) => s.in && !s.folded && !s.allin);
    beginTurn();
  }

  function pokerFinish() {
    clearT();
    const players = inHand().map(([s]) => s);
    const live = players.filter((s) => !s.folded);
    const won = new Map(players.map((s) => [s, 0]));
    const showdown = live.length > 1;
    const seen = T.board.length >= 3;
    let rakeTotal = 0;
    if (showdown && T.board.length < 5) while (T.board.length < 5) T.board.push(T.deck.pop());
    const scores = new Map();
    if (showdown) for (const s of live) scores.set(s, bestHand([...s.hole, ...T.board]));

    const levels = [...new Set(live.map((s) => s.total))].sort((a, b) => a - b);
    let prev = 0;
    for (const L of levels) {
      let pot = 0;
      for (const s of players) pot += Math.min(s.total, L) - Math.min(s.total, prev);
      const eligible = live.filter((s) => s.total >= L);
      if (eligible.length > 1 && seen && !TT.on) { const r = Math.min(500, Math.floor(pot * 0.02)); pot -= r; rakeTotal += r; }
      let winners = eligible;
      if (showdown && eligible.length > 1) {
        const best = Math.max(...eligible.map((s) => scores.get(s)));
        winners = eligible.filter((s) => scores.get(s) === best);
      }
      const part = Math.floor(pot / winners.length);
      let odd = pot - part * winners.length;
      for (const s of winners) { won.set(s, won.get(s) + part + (odd > 0 ? 1 : 0)); if (odd > 0) odd--; }
      prev = L;
    }
    // jetons misés au-delà du plus gros tapis encore en jeu : ils reviennent au dernier vivant
    const top = levels[levels.length - 1] || 0;
    let extra = 0;
    for (const s of players) extra += Math.max(0, s.total - top);
    if (extra) { const w = live[0]; won.set(w, won.get(w) + extra); }

    if (rakeTotal) { g.jackpot += rakeTotal; jackpotDirty = true; }
    const winners = [];
    for (const s of players) {
      const w = won.get(s);
      s.stack += w;
      if (w > 0) winners.push({ name: s.name, amount: w, hand: showdown && scores.has(s) ? handName(scores.get(s)) : null });
      if (!s.bot && TT.on) pushMe(s.name);
      else if (!s.bot) {
        s.miss = 0;
        if (w > s.total && scores.has(s) && Math.floor(scores.get(s) / 13 ** 5) >= 7) player(s.name).flags.quads = true;
        settle(s.name, 'poker', s.total, w, { noCoins: true });
        pushMe(s.name);
      }
    }
    T.result = { winners: winners.sort((a, b) => b.amount - a.amount), showdown, hands: showdown ? Object.fromEntries(live.map((s) => [s.name, handName(scores.get(s))])) : {} };
    T.phase = 'done'; T.cur = -1;
    save();
    castPoker();
    T.timer = setTimeout(startHand, showdown ? 6000 : 3000);
  }

  function equity(hole, board, opp, sims = 220) {
    const known = new Set([...hole, ...board]);
    const rest = Array.from({ length: 52 }, (_, i) => i).filter((c) => !known.has(c));
    let score = 0;
    for (let n = 0; n < sims; n++) {
      const need = 5 - board.length + opp * 2;
      for (let i = 0; i < need; i++) { const j = i + Math.floor(Math.random() * (rest.length - i)); [rest[i], rest[j]] = [rest[j], rest[i]]; }
      const b = [...board, ...rest.slice(0, 5 - board.length)];
      const mine = bestHand([...hole, ...b]);
      let lost = false, ties = 0, off = 5 - board.length;
      for (let o = 0; o < opp; o++) {
        const v = bestHand([rest[off], rest[off + 1], ...b]);
        off += 2;
        if (v > mine) { lost = true; break; }
        if (v === mine) ties++;
      }
      if (!lost) score += 1 / (1 + ties);
    }
    return score / sims;
  }
  function botPlay(i) {
    const s = T.seats[i];
    if (!s || !inPlay() || T.cur !== i) return;
    const toCall = T.bet - s.street;
    const pot = T.seats.reduce((a, x) => a + (x && x.in ? x.total : 0), 0);
    const eq = equity(s.hole, T.board, Math.max(1, alive().length - 1));
    const odds = toCall / (pot + toCall || 1);
    const r = rnd();
    const raiseTo = () => Math.max(T.bet + T.minRaise, T.bet + Math.floor(pot * (0.45 + 0.4 * r) * s.aggro));
    let [type, amt] = ['check'];
    const fair = 1 / alive().length;
    if (toCall === 0) {
      if (eq > fair * 1.5 && r < 0.65 * s.aggro) [type, amt] = ['raise', raiseTo()];
      else if (r < 0.07 * s.aggro) [type, amt] = ['raise', raiseTo()];
    } else if (eq > Math.max(0.7, fair * 1.9) && r < 0.55 * s.aggro && s.stack > toCall) [type, amt] = ['raise', raiseTo()];
    else if (eq > odds + 0.06) type = 'call';
    else if (toCall <= BB && r < 0.25) type = 'call';
    else type = 'fold';
    try { pokerAct(i, type, amt); }
    catch { pokerAct(i, toCall > 0 ? 'fold' : 'check'); }
  }
  const seatOf = (name) => T.seats.findIndex((s) => s && s.name === name);

  route('poker/sit', (p, b, name) => {
    if (TT.on || TT.pending) throw new Error('Tournoi en cours à cette table');
    if (seatOf(name) >= 0) throw new Error('Tu es déjà à table');
    const buyin = Math.floor(Number(b.buyin));
    if (!(buyin >= MIN_BUYIN) || !Number.isFinite(buyin)) throw new Error(`Cave minimum : ${MIN_BUYIN}`);
    if (p.coins < buyin) throw new Error('Pas assez de bahlous');
    let i = T.seats.findIndex((s) => !s);
    if (i < 0 && !inPlay()) { i = T.seats.findIndex((s) => s && s.bot); }
    if (i < 0) throw new Error('Table pleine, réessaie à la prochaine main');
    p.coins -= buyin;
    T.seats[i] = { name, stack: buyin, in: false, hole: null, street: 0, total: 0, folded: false, allin: false };
    if (T.phase === 'idle') { fillBots(); clearT(); T.timer = setTimeout(startHand, 1500); }
    castPoker();
  });
  route('poker/leave', (p, _b, name) => {
    const i = seatOf(name);
    if (i < 0) throw new Error("Tu n'es pas à table");
    const s = T.seats[i];
    if (TT.on) { s.leaving = true; castPoker(); return; }   // en tournoi : absent, couché d'office
    if (!inPlay() || !s.in || s.folded) {
      // déjà couché : ses mises restent au pot, seul son tapis repart
      if (inPlay() && s.in) { s.leaving = true; }
      else { standUp(i); if (humans().length === 0 && T.phase !== 'idle') { clearT(); startHand(); } }
    } else s.leaving = true;
    castPoker();
  });
  route('poker/back', (p, _b, name) => {
    const i = seatOf(name);
    if (i >= 0 && TT.on) { T.seats[i].leaving = false; T.seats[i].miss = 0; castPoker(); }
  });
  route('tourney/join', (p, _b, name) => {
    if (TT.on || TT.pending) throw new Error('Tournoi déjà en cours');
    const e = g.tourney.entrants;
    if (e.includes(name)) throw new Error('Déjà inscrit');
    if (e.length >= T_MAX) throw new Error('Tournoi complet');
    if (p.coins < T_BUYIN) throw new Error('Pas assez de bahlous');
    p.coins -= T_BUYIN;
    e.push(name);
    if (e.length === 1) postSystem(`**${name}** ouvre les inscriptions du tournoi de poker.`);
    castTourney();
  });
  route('tourney/leave', (p, _b, name) => {
    if (TT.on || TT.pending) throw new Error('Tournoi déjà en cours');
    const e = g.tourney.entrants, i = e.indexOf(name);
    if (i < 0) throw new Error('Tu n’es pas inscrit');
    e.splice(i, 1);
    p.coins += T_BUYIN;
    castTourney();
  });
  function tourneyStart() {
    if (TT.on || TT.pending || g.tourney.entrants.length < 2) return false;
    if (inPlay()) { TT.pending = true; castTourney(); return true; }
    clearT();
    TT.pending = true;
    startHand();
    return true;
  }
  route('tourney/start', (p, _b, name) => {
    if (!g.tourney.entrants.includes(name)) throw new Error('Inscris-toi d’abord');
    if (g.tourney.entrants.length < 2) throw new Error('Il faut au moins 2 joueurs');
    if (!tourneyStart()) throw new Error('Tournoi déjà en cours');
  });

  route('poker/act', (p, b, name) => {
    const i = seatOf(name);
    if (i < 0) throw new Error("Tu n'es pas à table");
    T.seats[i].miss = 0;
    pokerAct(i, String(b.type), b.amount);
  });

  const cards = installCards({ route, player, rint, emit, addXp, postSystem });

  // ------------------------------------------------------------ lecture
  routes['GET /api/g/state'] = (req, res, user) => {
    if (!user) return send(res, 401, { error: 'non connecté' });
    expireDuels();
    send(res, 200, {
      me: pub(user), events: flush(user), tourney: tourneyView(), jackpot: g.jackpot, feed: g.feed.slice(0, 20), crash: crashView(), duels: g.duels, poker: pokerView(user),
      mines: player(user).active.mines ? minesView(player(user).active.mines) : null,
      bj: player(user).active.bj ? bjView(bjUp(player(user).active.bj)) : null,
      tower: player(user).active.tower ? towerView(player(user).active.tower) : null,
      config: { ...cards.config, minBet: MIN_BET, K, wheel: WHEEL, freeWheel: FREE_WHEEL, scratch: SCRATCH_TIERS, plinko: PLINKO, plinkoRows: PLINKO_ROWS, shop: SHOP, ach: ACH.map(({ id, name, d, r }) => ({ id, name, d, r })), streak: STREAK_REWARDS, slotLines: SLOT_LINES, tower: { floors: TOWER_FLOORS, diff: TOWER, mult: Object.fromEntries(Object.entries(TOWER).map(([k, v]) => [k, Array.from({ length: TOWER_FLOORS }, (_, i) => towerMult(v, i + 1))])) } },
    });
  };
  routes['GET /api/g/board'] = (req, res, user) => {
    if (!user) return send(res, 401, { error: 'non connecté' });
    const rows = Object.keys(g.players).filter((n) => db.users[n]).map((name) => {
      const p = player(name); const level = levelOf(p.xp);
      return { name, coins: p.coins, level, rank: rankOf(level), best: p.best, weekNet: p.weekNet, streak: p.streak };
    });
    send(res, 200, { rows });
  };

  // ------------------------------------------------------------ tâches de fond
  setInterval(() => { if (jackpotDirty) { jackpotDirty = false; broadcast('g:jackpot', { jackpot: g.jackpot }); save(); } }, 1500);
  setInterval(() => {
    expireDuels();
    const wk = weekKey();
    if (wk === g.week) return;
    g.week = wk;
    const top = Object.entries(g.players).filter(([, p]) => (p.weekNet || 0) > 0).sort((a, b) => b[1].weekNet - a[1].weekNet).slice(0, 3);
    const prizes = [25000, 10000, 5000];
    top.forEach(([name, p], i) => { p.coins += prizes[i]; emit(name, { type: 'week', place: i + 1, reward: prizes[i] }); pushMe(name); });
    const pts = Object.entries(g.tourney.points).sort((a, b) => b[1] - a[1]).slice(0, 3);
    [30000, 15000, 7500].forEach((reward, i) => { if (!pts[i]) return; const name = pts[i][0]; player(name).coins += reward; emit(name, { type: 'tourney-week', place: i + 1, reward }); pushMe(name); });
    if (pts.length) postSystem(`Tournois de la semaine : ${pts.map(([n], i) => `**${i + 1}. ${n}**`).join(' · ')}.`);
    g.tourney.points = {};
    if (top.length) postSystem(`Classement de la semaine : ${top.map(([n], i) => `**${i + 1}. ${n}**`).join(' · ')}.`);
    Object.values(g.players).forEach((p) => { p.weekNet = 0; });
    save();
  }, 60e3);
  // rendez-vous du dimanche soir, 21 h
  setInterval(() => {
    const d = new Date();
    if (d.getDay() !== 0 || d.getHours() !== 21 || g.tourney.autoWeek === weekKey()) return;
    if (tourneyStart()) { g.tourney.autoWeek = weekKey(); save(); }
  }, 30e3);
  crashPrepare();

  return {
    badge(name) { const p = g.players[name]; return p ? { level: levelOf(p.xp || 0), frame: p.frame || null, color: p.color || null, title: p.title ? shopItem(p.title).name : null } : { level: 1 }; },
    onChat(name) { progress(name, 'chat'); pushMe(name); },
    adjust(name, amount) { const p = player(name); p.coins = Math.max(0, p.coins + amount); if (amount > 0) emit(name, { type: 'ach', name: 'Cadeau', d: 'Offert par le casino', reward: amount }); save(); pushMe(name); },
    cosmetics(name) { const p = player(name); return p.owned.map((id) => { const it = shopItem(id); return it ? { id, type: it.type, name: it.name, on: p[it.type] === id } : null; }).filter(Boolean); },
    revoke(name, id) {
      const p = player(name), at = p.owned.indexOf(id);
      if (at < 0) return null;
      const it = shopItem(id);
      p.owned.splice(at, 1);
      if (it && p[it.type] === id) p[it.type] = null;
      usersChanged();
      pushMe(name);
      return it ? it.name : id;
    },
    overview() { return { jackpot: g.jackpot, players: Object.fromEntries(Object.keys(db.users).map((name) => { const p = player(name), level = levelOf(p.xp); return [name, { coins: p.coins, level, rank: rankOf(level) }]; })) }; },
    gift(name, amount) { const p = player(name); p.coins += amount; emit(name, { type: 'ach', name: 'Cadeau', d: 'Offert par le casino', reward: amount }); save(); pushMe(name); return p.coins; },
    bonus(name, amount, title, txt) { const p = player(name); p.coins += Math.floor(amount); emit(name, { type: 'bonus', title, txt, reward: Math.floor(amount) }); save(); pushMe(name); },
    reward(name, amount, txt) { const p = player(name); p.coins += Math.floor(amount); emit(name, { type: 'work', txt, reward: Math.floor(amount) }); save(); pushMe(name); },
    shutdown() {
      for (const [name, b] of C.bets) { if (!b.cash && C.phase !== 'end') player(name).coins += b.bet; }
      if (TT.on) { for (const name of TT.entrants) if (!TT.out.includes(name)) player(name).coins += T_BUYIN; }
      else for (const s of T.seats) { if (s && !s.bot) player(s.name).coins += s.stack + (s.in && inPlay() ? s.total : 0); }
    },
    _test: { eval5, bestHand, handName, slotSpin, SLOT_SCALE, WHEEL, FREE_WHEEL, PLINKO, PLINKO_ROWS, SCRATCH_ODDS, scratchPrize, scratchTicket, minesMult, bjTotal, T, pokerView, pokerAct, startHand, player, levelOf },
  };
};
