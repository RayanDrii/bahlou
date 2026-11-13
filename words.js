// Bahlou — jeu « Mots » : un mot de 5 lettres en 6 essais. Le mot reste sur le serveur, le client ne reçoit que les couleurs.
'use strict';

const { ANSWERS, VALID, norm } = require('./words-fr');

const LEN = 5;
const TRIES = 6;
const REWARDS = [3000, 2200, 1600, 1100, 700, 400]; // bahlous selon le nombre d'essais, mot du jour seulement

// g : bonne lettre bien placée, y : présente ailleurs, x : absente (les lettres en double sont comptées)
function score(guess, word) {
  const out = Array(LEN).fill('x'), left = {};
  for (let i = 0; i < LEN; i++) {
    if (guess[i] === word[i]) out[i] = 'g';
    else left[word[i]] = (left[word[i]] || 0) + 1;
  }
  for (let i = 0; i < LEN; i++) {
    if (out[i] !== 'g' && left[guess[i]]) { out[i] = 'y'; left[guess[i]]--; }
  }
  return out.join('');
}

module.exports = function createWords({ routes, send, readBody, db, save, games, postSystem }) {
  const W = (db.words ||= { day: null, used: [], free: {}, stats: {} });
  const parisDay = (d = new Date()) => new Intl.DateTimeFormat('fr-CA', { timeZone: 'Europe/Paris' }).format(d);
  const dayBefore = (s) => { const d = new Date(s + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() - 1); return d.toISOString().slice(0, 10); };
  const pick = (avoid) => { const pool = ANSWERS.filter((w) => !avoid.includes(w)); return pool[Math.floor(Math.random() * pool.length)] || ANSWERS[0]; };
  const auth = (fn) => async (req, res, user) => (user ? fn(req, res, user) : send(res, 401, { error: 'non connecté' }));

  function daily() {
    const d = parisDay();
    if (!W.day || W.day.date !== d) {
      const word = pick(W.used);
      W.used = [word, ...W.used].slice(0, 300);
      W.day = { date: d, word, results: {} };
      save();
    }
    return W.day;
  }
  const stat = (name) => (W.stats[name] ||= { played: 0, won: 0, streak: 0, best: 0, last: null, dist: [0, 0, 0, 0, 0, 0] });
  const view = (game, word) => ({ guesses: game.guesses.map((g) => ({ w: g, s: score(g, word) })), done: game.done, won: game.won, word: game.done ? word : null });

  function state(name) {
    const day = daily();
    const mine = day.results[name] || { guesses: [], done: false, won: false };
    const free = W.free[name];
    const board = Object.entries(day.results).filter(([, r]) => r.done)
      .map(([n, r]) => ({ name: n, won: r.won, tries: r.guesses.length, ts: r.ts }))
      .sort((a, b) => (b.won - a.won) || (a.tries - b.tries) || (a.ts - b.ts));
    return { date: day.date, len: LEN, tries: TRIES, rewards: REWARDS, daily: view(mine, day.word), free: free ? view(free, free.word) : null, board, stats: stat(name) };
  }

  function finishDaily(name, game) {
    const s = stat(name), n = game.guesses.length, today = W.day.date;
    s.played++;
    if (game.won) {
      s.won++;
      s.dist[n - 1]++;
      s.streak = s.last === dayBefore(today) ? s.streak + 1 : 1;
      s.best = Math.max(s.best, s.streak);
      s.last = today;
      games.bonus(name, REWARDS[n - 1], 'Mot du jour', `Trouvé en ${n} essai${n > 1 ? 's' : ''}`);
    } else s.streak = 0;
    const grid = game.guesses.map((g) => [...score(g, W.day.word)].map((c) => (c === 'g' ? '🟩' : c === 'y' ? '🟨' : '⬛')).join('')).join(' ');
    postSystem(`**${name}** ${game.won ? `a trouvé le mot du jour en ${n}/${TRIES}` : "n'a pas trouvé le mot du jour"} ${grid}`);
  }

  routes['GET /api/words'] = auth((req, res, user) => send(res, 200, state(user)));

  routes['POST /api/words/guess'] = auth(async (req, res, user) => {
    const { mode, word } = await readBody(req);
    const g = norm(word);
    if (g.length !== LEN) return send(res, 400, { error: `Il faut ${LEN} lettres.` });
    if (!VALID.has(g)) return send(res, 400, { error: 'Mot inconnu du dictionnaire.' });
    let game, target;
    if (mode === 'free') {
      game = W.free[user];
      if (!game || game.done) return send(res, 400, { error: 'Lance une nouvelle partie.' });
      target = game.word;
    } else {
      const day = daily();
      game = (day.results[user] ||= { guesses: [], done: false, won: false, ts: 0 });
      target = day.word;
    }
    if (game.done) return send(res, 400, { error: 'Partie terminée.' });
    if (game.guesses.includes(g)) return send(res, 400, { error: 'Déjà essayé.' });
    game.guesses.push(g);
    if (g === target) game.done = game.won = true;
    else if (game.guesses.length >= TRIES) game.done = true;
    if (game.done) {
      game.ts = Date.now();
      if (mode !== 'free') finishDaily(user, game);
    }
    save();
    send(res, 200, state(user));
  });

  routes['POST /api/words/new'] = auth((req, res, user) => {
    const cur = W.free[user];
    if (cur && !cur.done && cur.guesses.length) return send(res, 400, { error: 'Termine ta partie en cours.' });
    W.free[user] = { word: pick([daily().word]), guesses: [], done: false, won: false };
    save();
    send(res, 200, state(user));
  });

  return { score };
};
