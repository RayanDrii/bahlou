'use strict';
const crypto = require('node:crypto');

// Le Menteur : on pose des cartes face cachée en annonçant une valeur, le suivant suit ou crie « Menteur ! ».
// Cartes : couleur * 13 + valeur. Couleurs 0 pique, 1 cœur, 2 carreau, 3 trèfle ; valeurs 0 = 2 … 8 = 10, 9 valet, 10 dame, 11 roi, 12 as.
const RANK_NAMES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Valet', 'Dame', 'Roi', 'As'];
const QUEEN_OF_HEARTS = 13 + 10, QUEEN_OF_SPADES = 10;
const TURN_CHOICES = [0, 30, 45, 60];
const DEFAULTS = { turn: 45 };
const MAX_PLAYERS = 13, IDLE_MS = 3_600_000, LOG_SIZE = 30;
const BOT_NAMES = ['Robot Lulu', 'Robot Max', 'Robot Zoé', 'Robot Paco', 'Robot Nina', 'Robot Gus', 'Robot Léa', 'Robot Tom', 'Robot Inès', 'Robot Hugo', 'Robot Jade', 'Robot Noé'];
const rankOf = c => c % 13;
const announce = (count, rank) => `${['', 'un', 'double', 'triple', 'carré de'][count]} ${RANK_NAMES[rank]}`;

module.exports = function createMenteur({ routes, send, readBody, broadcast, now = Date.now, randomInt = crypto.randomInt, random = Math.random, timers = true }) {
  const rooms = new Map(), memberships = new Map(), creations = new Map();
  let revealSeq = 0, playSeq = 0;
  const fail = (status, message) => { const e = new Error(message); e.status = status; throw e; };
  const roomOf = name => rooms.get(memberships.get(name));
  const humans = r => r.players.filter(p => !p.bot && !p.left);
  const auto = p => p.bot || p.left;
  const current = r => r.players[r.turn];

  function view(r, name) {
    if (!r) return null;
    const me = r.players.find(p => p.name === name);
    return {
      code: r.code, host: r.host, phase: r.phase, version: r.version, settings: r.settings, max: MAX_PLAYERS,
      players: r.players.map(p => ({ name: p.name, bot: p.bot, left: p.left, count: p.hand.length })),
      hand: me ? [...me.hand].sort((a, b) => rankOf(a) - rankOf(b) || a - b) : [],
      turn: r.phase === 'playing' ? current(r).name : null, lead: r.lead, rank: r.rank, pile: r.pile.length,
      last: r.last && { id: r.last.id, by: r.last.by, count: r.last.cards.length, rank: r.last.rank },
      removed: r.removed, log: r.log, reveal: r.reveal, winner: r.winner, deadline: r.deadline, starter: r.starter,
    };
  }
  function touch(r) {
    r.version++; r.touched = now();
    for (const p of humans(r)) broadcast('menteur:state', { room: view(r, p.name), serverNow: now() }, [p.name]);
  }
  function drop(r) {
    rooms.delete(r.code);
    for (const p of r.players) if (memberships.get(p.name) === r.code) memberships.delete(p.name);
  }
  function log(r, entry) { r.log.push({ ...entry, at: now() }); if (r.log.length > LOG_SIZE) r.log.shift(); }

  // une famille complète (les quatre cartes d'une valeur) quitte la main et part hors du jeu
  function removeFamilies(r, p) {
    const count = new Array(13).fill(0);
    for (const c of p.hand) count[rankOf(c)]++;
    for (let rank = 0; rank < 13; rank++) if (count[rank] === 4) {
      p.hand = p.hand.filter(c => rankOf(c) !== rank);
      r.removed.push({ by: p.name, rank });
      log(r, { t: 'family', by: p.name, rank });
    }
  }
  function schedule(r) {
    if (r.phase !== 'playing') { r.deadline = null; r.botAt = null; return; }
    const p = current(r);
    r.deadline = r.settings.turn ? now() + r.settings.turn * 1000 : null;
    r.botAt = auto(p) ? now() + 1100 + Math.floor(random() * 1500) : null;
  }
  function win(r, name) {
    r.phase = 'over'; r.winner = name; r.deadline = null; r.botAt = null;
    log(r, { t: 'win', by: name });
  }
  function deal(r) {
    const deck = Array.from({ length: 52 }, (_, i) => i);
    for (let i = deck.length - 1; i > 0; i--) { const j = randomInt(i + 1); [deck[i], deck[j]] = [deck[j], deck[i]]; }
    for (const p of r.players) p.hand = [];
    deck.forEach((c, i) => r.players[i % r.players.length].hand.push(c));
    Object.assign(r, { phase: 'playing', pile: [], last: null, lead: true, rank: null, removed: [], log: [], reveal: null, winner: null });
    for (const p of r.players) removeFamilies(r, p);
    // la dame de cœur commence ; si elle est partie dans une famille, la dame de pique ; sinon le premier joueur
    const holder = c => r.players.findIndex(p => p.hand.includes(c));
    const qh = holder(QUEEN_OF_HEARTS), qs = holder(QUEEN_OF_SPADES);
    r.turn = qh >= 0 ? qh : qs >= 0 ? qs : 0;
    r.starter = { name: r.players[r.turn].name, card: qh >= 0 ? QUEEN_OF_HEARTS : qs >= 0 ? QUEEN_OF_SPADES : null };
    const empty = r.players.find(p => !p.hand.length);
    if (empty) win(r, empty.name); else schedule(r);
  }
  const nextTurn = r => { r.turn = (r.turn + 1) % r.players.length; };

  function play(r, p, cards, rank) {
    if (r.phase !== 'playing' || current(r) !== p) fail(409, 'Ce n’est pas ton tour.');
    if (!Array.isArray(cards) || cards.length < 1 || cards.length > 4) fail(400, 'Pose entre une et quatre cartes.');
    if (new Set(cards).size !== cards.length || !cards.every(c => Number.isInteger(c) && p.hand.includes(c))) fail(400, 'Ces cartes ne sont pas dans ta main.');
    if (r.lead) {
      if (!Number.isInteger(rank) || rank < 0 || rank > 12) fail(400, 'Choisis la valeur que tu annonces.');
      r.rank = rank;
    } else if (r.last && !players(r, r.last.by).hand.length) {
      // le précédent a vidé sa main et personne ne l'a traité de menteur : il gagne
      win(r, r.last.by); return;
    }
    p.hand = p.hand.filter(c => !cards.includes(c));
    r.pile.push(...cards);
    r.last = { id: ++playSeq, by: p.name, cards, rank: r.rank };
    r.lead = false;
    log(r, { t: 'play', by: p.name, count: cards.length, rank: r.rank });
    nextTurn(r); schedule(r);
    // un robot hors tour qui sait que l'annonce est impossible (il a les cartes) peut crier le premier
    r.outCall = null;
    const sure = r.players.filter(x => x.bot && x !== current(r) && x.name !== p.name && x.hand.filter(c => rankOf(c) === r.rank).length + cards.length > 4);
    if (sure.length && random() < 0.4) r.outCall = { id: r.last.id, name: sure[Math.floor(random() * sure.length)].name, at: now() + 700 + Math.floor(random() * 900) };
  }
  // n'importe qui à la table (sauf celui qui vient de poser) peut crier « Menteur ! » tant que personne n'a rejoué
  function liar(r, p, playId) {
    if (r.phase !== 'playing') fail(409, 'La partie n’est pas en cours.');
    if (r.lead || !r.last) fail(409, 'Il n’y a rien à contester pour l’instant.');
    if (playId !== undefined && playId !== r.last.id) fail(409, 'Trop tard : quelqu’un a déjà rejoué.');
    if (r.last.by === p.name) fail(409, 'Tu ne peux pas t’accuser toi-même.');
    const { by, cards, rank } = r.last, lied = cards.some(c => rankOf(c) !== rank);
    const accused = players(r, by), loser = lied ? accused : p;
    const taken = r.pile.length;
    loser.hand.push(...r.pile);
    r.reveal = { id: ++revealSeq, caller: p.name, by, cards, rank, lied, loser: loser.name, taken };
    log(r, { t: 'liar', by: p.name, target: by, lied, loser: loser.name, taken });
    Object.assign(r, { pile: [], last: null, lead: true, rank: null, outCall: null });
    removeFamilies(r, loser);
    if (!lied && !accused.hand.length) { win(r, by); return; }
    if (!loser.hand.length) { win(r, loser.name); return; }
    // le tour ne saute personne : celui qui devait jouer ouvre une nouvelle manche
    schedule(r);
  }
  const players = (r, name) => r.players.find(p => p.name === name);

  // robots et joueurs absents : simple, mais ils comptent les cartes visibles
  function decide(r, p) {
    const count = new Array(13).fill(0);
    for (const c of p.hand) count[rankOf(c)]++;
    const pickRank = rank => p.hand.filter(c => rankOf(c) === rank);
    const junk = n => {
      const order = [...p.hand].sort((a, b) => count[rankOf(a)] - count[rankOf(b)] || random() - .5);
      return order.slice(0, Math.max(1, Math.min(n, p.hand.length)));
    };
    if (r.lead) {
      const best = count.indexOf(Math.max(...count));
      const cards = pickRank(best);
      if (p.hand.length > cards.length + 2 && cards.length < 4 && random() < 0.2) cards.push(junk(1).find(c => rankOf(c) !== best) ?? cards[0]);
      return { act: 'play', cards: [...new Set(cards)].slice(0, 4), rank: best };
    }
    const claimed = r.last.count ?? r.last.cards.length, own = count[r.rank];
    const finishing = !players(r, r.last.by).hand.length;
    const chance = own + claimed > 4 ? 1 : finishing ? 0.85 : Math.min(0.55, 0.06 + 0.09 * (claimed - 1) + 0.13 * own);
    if (random() < chance) return { act: 'liar' };
    if (own) return { act: 'play', cards: pickRank(r.rank) };
    return { act: 'play', cards: junk(random() < 0.3 ? 2 : 1) };
  }
  function autoMove(r) {
    const p = current(r), move = decide(r, p);
    if (move.act === 'liar') liar(r, p); else play(r, p, move.cards, move.rank);
  }
  function tick() {
    const t = now();
    for (const r of [...rooms.values()]) {
      if (t - r.touched > IDLE_MS || !humans(r).length) { drop(r); continue; }
      if (r.phase !== 'playing') continue;
      if (r.outCall && t >= r.outCall.at) {
        const call = r.outCall; r.outCall = null;
        const bot = players(r, call.name);
        if (bot && r.last?.id === call.id && r.last.by !== bot.name) { liar(r, bot, call.id); touch(r); continue; }
      }
      const p = current(r);
      if ((r.botAt && t >= r.botAt && auto(p)) || (r.deadline && t >= r.deadline)) {
        if (!auto(p)) log(r, { t: 'timeout', by: p.name });
        autoMove(r); touch(r);
      }
    }
  }
  const timer = timers ? setInterval(tick, 300) : null;
  timer?.unref?.();

  function getRoom(name, host = false) {
    const r = roomOf(name);
    if (!r) fail(404, 'Tu n’es dans aucun salon.');
    if (host && r.host !== name) fail(403, 'Seul l’hôte peut faire ça.');
    return r;
  }
  function route(method, path, handler) {
    routes[`${method} /api/menteur/${path}`] = async (req, res, user) => {
      if (!user) return send(res, 401, { error: 'Connecte-toi à Bahlou pour jouer.' });
      try {
        const body = method === 'POST' ? await readBody(req) : {};
        if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Requête invalide.');
        tick();
        const r = handler(user, body);
        if (r) touch(r);
        send(res, 200, { room: view(roomOf(user), user), serverNow: now() });
      } catch (e) { send(res, e.status || 400, { error: e.status ? e.message : 'Requête invalide.' }); }
    };
  }

  routes['GET /api/menteur/config'] = (req, res, user) => user ? send(res, 200, { turns: TURN_CHOICES, defaults: DEFAULTS, max: MAX_PLAYERS, ranks: RANK_NAMES }) : send(res, 401, { error: 'Connecte-toi à Bahlou pour jouer.' });
  route('GET', 'state', () => null);
  route('POST', 'create', (name, b) => {
    if (roomOf(name)) fail(409, 'Quitte ton salon actuel avant d’en créer un.');
    const recent = (creations.get(name) || []).filter(t => now() - t < 600_000);
    if (recent.length >= 8) fail(429, 'Trop de salons créés. Réessaie dans dix minutes.');
    if (rooms.size >= 100) fail(503, 'Tous les salons sont occupés. Réessaie plus tard.');
    recent.push(now()); creations.set(name, recent);
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do { code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join(''); } while (rooms.has(code));
    const r = { code, host: name, version: 0, phase: 'waiting', players: [{ name, bot: false, left: false, hand: [] }], settings: { ...DEFAULTS }, touched: now(),
      pile: [], last: null, lead: true, rank: null, removed: [], log: [], reveal: null, winner: null, deadline: null, botAt: null, turn: 0, starter: null };
    rooms.set(code, r); memberships.set(name, code);
    // partie rapide : deux robots, et c'est parti
    if (b.solo === true) { addBot(r); addBot(r); deal(r); }
    return r;
  });
  function addBot(r) {
    if (r.players.length >= MAX_PLAYERS) fail(409, 'La table est pleine.');
    const name = BOT_NAMES.find(n => !r.players.some(p => p.name === n));
    r.players.push({ name, bot: true, left: false, hand: [] });
  }
  route('POST', 'join', (name, b) => {
    const code = typeof b.code === 'string' ? b.code.trim().toUpperCase() : '';
    if (!/^[A-Z2-9]{6}$/.test(code)) fail(400, 'Entre le code à 6 caractères du salon.');
    const r = rooms.get(code);
    if (!r) fail(404, 'Ce salon n’existe plus. Vérifie le code.');
    if (memberships.get(name) === code) return r;
    if (roomOf(name)) fail(409, 'Quitte ton salon actuel avant d’en rejoindre un autre.');
    if (r.phase !== 'waiting') fail(409, 'La partie a déjà commencé.');
    if (r.players.length >= MAX_PLAYERS) {
      const bot = r.players.findIndex(p => p.bot);
      if (bot < 0) fail(409, 'La table est pleine.');
      r.players.splice(bot, 1);
    }
    r.players.push({ name, bot: false, left: false, hand: [] }); memberships.set(name, code);
    return r;
  });
  route('POST', 'settings', (name, b) => {
    const r = getRoom(name, true);
    if (r.phase !== 'waiting') fail(409, 'La partie a déjà commencé.');
    if (b.turn !== undefined) { if (!TURN_CHOICES.includes(b.turn)) fail(400, 'Temps invalide.'); r.settings.turn = b.turn; }
    return r;
  });
  route('POST', 'bot', name => {
    const r = getRoom(name, true);
    if (r.phase !== 'waiting') fail(409, 'La partie a déjà commencé.');
    addBot(r); return r;
  });
  route('POST', 'unbot', (name, b) => {
    const r = getRoom(name, true);
    if (r.phase !== 'waiting') fail(409, 'La partie a déjà commencé.');
    const i = r.players.findIndex(p => p.bot && p.name === b.name);
    if (i < 0) fail(404, 'Ce robot n’est pas à la table.');
    r.players.splice(i, 1); return r;
  });
  route('POST', 'start', name => {
    const r = getRoom(name, true);
    if (r.phase !== 'waiting') fail(409, 'La partie a déjà commencé.');
    if (r.players.length < 2) fail(409, 'Il faut au moins deux joueurs : ajoute un robot ou invite quelqu’un.');
    deal(r); return r;
  });
  route('POST', 'play', (name, b) => {
    const r = getRoom(name), p = players(r, name);
    play(r, p, b.cards, b.rank); return r;
  });
  route('POST', 'liar', (name, b) => {
    const r = getRoom(name), p = players(r, name);
    if (p.left) fail(409, 'Tu as quitté cette partie.');
    liar(r, p, Number.isInteger(b.playId) ? b.playId : undefined); return r;
  });
  route('POST', 'rematch', name => {
    const r = getRoom(name, true);
    if (r.phase !== 'over') fail(409, 'La partie n’est pas finie.');
    r.players = r.players.filter(p => !p.left);
    if (r.players.length < 2) { r.phase = 'waiting'; r.winner = null; return r; }
    deal(r); return r;
  });
  route('POST', 'leave', name => {
    const r = roomOf(name);
    if (!r) return null;
    memberships.delete(name);
    const p = players(r, name);
    if (r.phase === 'playing') { p.left = true; log(r, { t: 'left', by: name }); if (current(r) === p) schedule(r); }
    else r.players = r.players.filter(x => x !== p);
    if (!humans(r).length) { drop(r); return null; }
    if (r.host === name) r.host = humans(r)[0].name;
    return r;
  });

  return { close() { if (timer) clearInterval(timer); }, tick, rooms };
};
module.exports.RANK_NAMES = RANK_NAMES;
module.exports.announce = announce;
module.exports.rankOf = rankOf;
