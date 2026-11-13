'use strict';
const crypto = require('node:crypto');
const ROUND_MS = 90_000, ROUND_COUNT = 5, IDLE_MS = 3_600_000;
// Candidates only: the browser resolves fresh, available outdoor panoramas per game.
const CANDIDATES = [
  [48.853, 2.349], [51.507, -0.128], [40.72, -73.998], [35.686, 139.703],
  [-33.869, 151.209], [-23.557, -46.659], [50.087, 14.421], [41.901, 12.473],
  [37.566, 126.978], [59.329, 18.069], [-33.925, 18.424], [19.427, -99.167],
  [13.747, 100.534], [52.374, 4.898], [38.714, -9.139], [43.651, -79.383],
  [-34.604, -58.382], [1.3, 103.855], [55.677, 12.568], [-36.849, 174.764],
  [60.17, 24.939], [45.504, -73.572], [47.498, 19.04], [39.47, -0.376],
].map(([lat, lng]) => ({ lat, lng }));
const validPoint = p => p && typeof p.lat === 'number' && Number.isFinite(p.lat) && Math.abs(p.lat) <= 90 && typeof p.lng === 'number' && Number.isFinite(p.lng) && Math.abs(p.lng) <= 180;
function distanceKm(a, b) {
  const rad = n => n * Math.PI / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
const score = km => Math.round(5000 * Math.exp(-km / 2000));

module.exports = function createGeo({ routes, send, readBody, broadcast, apiKey = process.env.GOOGLE_MAPS_API_KEY || '', now = Date.now, randomInt = crypto.randomInt, timers = true }) {
  // ponytail: in-memory, single process; use shared storage before running multiple replicas.
  const rooms = new Map(), memberships = new Map(), creations = new Map();
  const fail = (status, message) => { const e = new Error(message); e.status = status; throw e; };
  const members = r => r.players.filter(p => !p.left);
  const roomOf = name => rooms.get(memberships.get(name));
  function drop(r) {
    rooms.delete(r.code);
    for (const p of r.players) if (memberships.get(p.name) === r.code) memberships.delete(p.name);
  }
  function view(r, name) {
    if (!r) return null;
    return {
      code: r.code, host: r.host, phase: r.phase, version: r.version,
      preparedCount: r.locations.length,
      players: r.players.map(p => ({ name: p.name, score: p.score, left: p.left, submitted: !!r.guesses[p.name] })),
      round: r.round ? { id: r.round.id, number: r.round.number, total: ROUND_COUNT, deadline: r.round.deadline,
        panoId: r.phase === 'playing' ? r.locations[r.round.number - 1].panoId : null,
        guess: r.guesses[name] || null } : null,
      result: r.history.at(-1) || null, history: r.history,
    };
  }
  function cast(r) {
    r.version++;
    for (const p of members(r)) broadcast('geo:state', { room: view(r, p.name), serverNow: now() }, [p.name]);
  }
  function finish(r) {
    if (r.phase !== 'playing') return;
    const location = r.locations[r.round.number - 1];
    const answers = r.players.map(p => {
      const guess = r.guesses[p.name] || null;
      const km = guess ? distanceKm(location, guess) : null;
      const points = km === null ? 0 : score(km);
      p.score += points;
      return { name: p.name, guess, distanceKm: km, points };
    });
    r.history.push({ number: r.round.number, location: { lat: location.lat, lng: location.lng }, answers });
    r.phase = r.round.number === ROUND_COUNT ? 'finished' : 'results';
    r.touched = now();
    cast(r);
  }
  function sweep() {
    for (const r of rooms.values()) {
      if (now() - r.touched > IDLE_MS) {
        for (const p of members(r)) broadcast('geo:state', { room: null, serverNow: now(), message: 'Le salon a expiré. Crée une nouvelle partie.' }, [p.name]);
        drop(r);
      } else if (r.phase === 'playing' && now() >= r.round.deadline) finish(r);
    }
    for (const [name, list] of creations) if (!list.some(t => now() - t < 600_000)) creations.delete(name);
  }
  function getRoom(name, host = false) {
    const r = roomOf(name);
    if (!r) fail(404, 'Tu ne fais pas partie d’un salon.');
    if (host && r.host !== name) fail(403, 'Seul l’hôte peut faire ça.');
    return r;
  }
  function requireRound(r, b, phase) {
    if (r.phase !== phase || !r.round || b.roundId !== r.round.id) fail(409, 'Cette manche est terminée ou a changé.');
  }
  function begin(r, number) {
    r.guesses = Object.create(null);
    r.round = { id: crypto.randomBytes(12).toString('hex'), number, deadline: now() + ROUND_MS };
    r.phase = 'playing';
  }
  function route(method, path, handler) {
    routes[`${method} /api/geo/${path}`] = async (req, res, user) => {
      if (!user) return send(res, 401, { error: 'Connecte-toi à Bahlou pour jouer.' });
      try {
        sweep();
        const body = method === 'POST' ? await readBody(req) : {};
        if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Requête invalide.');
        // Recheck the deadline after asynchronous body parsing.
        sweep();
        const data = handler(user, body);
        send(res, 200, data || { room: view(roomOf(user), user), serverNow: now() });
      } catch (e) { send(res, e.status || 400, { error: e.status ? e.message : 'Requête Geo invalide.' }); }
    };
  }
  route('GET', 'config', () => ({ configured: !!apiKey, apiKey, candidates: CANDIDATES, rounds: ROUND_COUNT, seconds: ROUND_MS / 1000 }));
  route('GET', 'state', name => ({ room: view(roomOf(name), name), serverNow: now() }));
  route('POST', 'create', name => {
    if (!apiKey) fail(503, 'Street View n’est pas configuré. Demande à l’hôte du site d’ajouter la clé Google Maps.');
    if (roomOf(name)) fail(409, 'Quitte ton salon actuel avant d’en créer un.');
    const recent = (creations.get(name) || []).filter(t => now() - t < 600_000);
    if (recent.length >= 5) fail(429, 'Trop de salons créés. Réessaie dans dix minutes.');
    if (rooms.size >= 100) fail(503, 'Tous les salons sont occupés. Réessaie plus tard.');
    recent.push(now()); creations.set(name, recent);
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code;
    do { code = Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join(''); } while (rooms.has(code));
    const r = { code, host: name, phase: 'waiting', version: 0, players: [{ name, score: 0, left: false }], locations: [], guesses: Object.create(null), round: null, history: [], touched: now() };
    rooms.set(code, r); memberships.set(name, code); cast(r);
  });
  route('POST', 'join', (name, b) => {
    if (typeof b.code !== 'string' || !/^[A-Z2-9]{6}$/.test(b.code.trim().toUpperCase())) fail(400, 'Entre le code à 6 caractères du salon.');
    const code = b.code.trim().toUpperCase();
    const r = rooms.get(code);
    if (!r) fail(404, 'Ce salon n’existe plus. Vérifie le code.');
    if (roomOf(name) === r) return;
    if (roomOf(name)) fail(409, 'Quitte ton salon actuel avant d’en rejoindre un autre.');
    if (r.phase !== 'waiting') fail(409, 'La partie a déjà commencé.');
    if (members(r).length >= 12) fail(409, 'Ce salon est complet (12 joueurs).');
    r.players.push({ name, score: 0, left: false }); memberships.set(name, code); r.touched = now(); cast(r);
  });
  route('POST', 'prepare', (name, b) => {
    const r = getRoom(name, true);
    if (r.phase !== 'waiting') fail(409, 'La partie a déjà commencé.');
    if (!Array.isArray(b.locations) || b.locations.length < ROUND_COUNT || b.locations.length > CANDIDATES.length) fail(400, 'Il faut au moins 5 panoramas disponibles. Réessaie.');
    const ids = new Set(), indices = new Set();
    const locations = b.locations.map(p => {
      if (!p || !Number.isInteger(p.index) || !CANDIDATES[p.index] || !validPoint(p) || typeof p.panoId !== 'string' || !/^[\w.-]{1,256}$/.test(p.panoId) || ids.has(p.panoId) || indices.has(p.index) || distanceKm(p, CANDIDATES[p.index]) > 2) fail(400, 'Panorama invalide. Relance la préparation.');
      ids.add(p.panoId); indices.add(p.index);
      return { panoId: p.panoId, lat: p.lat, lng: p.lng };
    });
    r.locations = locations; r.touched = now(); cast(r);
  });
  route('POST', 'start', name => {
    const r = getRoom(name, true);
    if (r.phase !== 'waiting') fail(409, 'La partie a déjà commencé.');
    if (members(r).length < 2 || r.locations.length < ROUND_COUNT) fail(400, 'Il faut 2 joueurs et 5 panoramas prêts.');
    for (let i = r.locations.length - 1; i > 0; i--) { const j = randomInt(i + 1); [r.locations[i], r.locations[j]] = [r.locations[j], r.locations[i]]; }
    r.locations = r.locations.slice(0, ROUND_COUNT);
    begin(r, 1); r.touched = now(); cast(r);
  });
  route('POST', 'guess', (name, b) => {
    const r = getRoom(name); requireRound(r, b, 'playing');
    if (!validPoint(b)) fail(400, 'Choisis un point valide sur la carte.');
    if (r.guesses[name]) fail(409, 'Ta réponse est déjà confirmée.');
    r.guesses[name] = { lat: b.lat, lng: b.lng }; r.touched = now();
    if (members(r).every(p => r.guesses[p.name])) finish(r); else cast(r);
  });
  route('POST', 'next', (name, b) => {
    const r = getRoom(name, true); requireRound(r, b, 'results');
    begin(r, r.round.number + 1); r.touched = now(); cast(r);
  });
  route('POST', 'rematch', (name, b) => {
    const r = getRoom(name, true); requireRound(r, b, 'finished');
    r.players = members(r); r.players.forEach(p => { p.score = 0; });
    r.phase = 'waiting'; r.locations = []; r.round = null; r.history = []; r.guesses = Object.create(null); r.touched = now(); cast(r);
  });
  route('POST', 'leave', name => {
    const r = getRoom(name);
    memberships.delete(name);
    if (r.phase === 'waiting') r.players = r.players.filter(p => p.name !== name);
    else r.players.find(p => p.name === name).left = true;
    if (!members(r).length) { drop(r); return; }
    if (r.host === name) r.host = members(r)[0].name;
    r.touched = now();
    if (r.phase === 'playing' && members(r).every(p => r.guesses[p.name])) finish(r); else cast(r);
  });
  const timer = timers ? setInterval(sweep, 1000) : null;
  timer?.unref();
  return { close() { if (timer) clearInterval(timer); }, sweep };
};
module.exports.distanceKm = distanceKm;
module.exports.score = score;
