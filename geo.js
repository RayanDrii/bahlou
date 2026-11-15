'use strict';
const crypto = require('node:crypto');

// Zones où Street View couvre bien les routes : [nom, continent, latMin, latMax, lngMin, lngMax, poids]
const ZONES = [
  ['France', 'Europe', 42.4, 50.9, -4.5, 7.8, 6], ['Espagne', 'Europe', 36.2, 43.5, -8.8, 3.2, 5], ['Portugal', 'Europe', 37, 42, -8.9, -6.9, 2],
  ['Italie', 'Europe', 37.8, 46.5, 7, 18.4, 5], ['Allemagne', 'Europe', 47.5, 54.8, 6, 14.9, 5], ['Royaume-Uni', 'Europe', 50.2, 58.5, -5.6, 1.7, 5],
  ['Irlande', 'Europe', 51.6, 55.2, -10, -6.1, 2], ['Benelux', 'Europe', 50.8, 53.4, 3.4, 7, 2], ['Suisse et Autriche', 'Europe', 46, 48.8, 6.1, 16.9, 3],
  ['Pologne', 'Europe', 49.4, 54.7, 14.3, 24, 3], ['Tchéquie et Slovaquie', 'Europe', 47.8, 51, 12.3, 22.5, 2], ['Hongrie et Roumanie', 'Europe', 44, 48.4, 16.3, 28.6, 3],
  ['Balkans', 'Europe', 41.4, 46.2, 13.7, 28.5, 3], ['Grèce', 'Europe', 36.8, 41.7, 20.2, 26.5, 2], ['Suède et Norvège', 'Europe', 55.5, 63.5, 5.5, 18.5, 3],
  ['Finlande', 'Europe', 60, 65, 21.5, 29.5, 2], ['Danemark', 'Europe', 54.6, 57.7, 8.1, 12.6, 1], ['Pays baltes', 'Europe', 54, 59.5, 21, 28, 2],
  ['Turquie', 'Europe', 36.5, 41.7, 26.5, 44, 3],
  ['États-Unis (est)', 'Amériques', 30, 45, -90, -71, 6], ['États-Unis (ouest)', 'Amériques', 32.5, 48.5, -123, -104, 5], ['États-Unis (centre)', 'Amériques', 29, 48, -104, -90, 5],
  ['Canada', 'Amériques', 43, 53, -123, -64, 4], ['Mexique', 'Amériques', 16, 28, -110, -90, 4], ['Brésil', 'Amériques', -30, -5, -55, -35, 5],
  ['Argentine', 'Amériques', -41, -24, -70, -57, 3], ['Chili', 'Amériques', -42, -18.5, -73.5, -70, 2], ['Colombie et Pérou', 'Amériques', -13, 10, -80, -72, 3],
  ['Japon', 'Asie et Océanie', 31.5, 43.5, 130, 145.5, 5], ['Corée du Sud', 'Asie et Océanie', 34.5, 38, 126.3, 129.5, 2], ['Taïwan', 'Asie et Océanie', 22, 25.3, 120, 121.9, 1],
  ['Thaïlande', 'Asie et Océanie', 6, 20, 98, 105, 3], ['Malaisie et Indonésie', 'Asie et Océanie', -8.5, 6.5, 100, 115, 3], ['Philippines', 'Asie et Océanie', 6, 18.5, 120, 126, 2],
  ['Inde', 'Asie et Océanie', 8.5, 30, 72, 88, 3], ['Israël', 'Asie et Océanie', 29.5, 33.2, 34.3, 35.9, 1], ['Russie', 'Europe', 50, 60, 30, 60, 3],
  ['Australie (est)', 'Asie et Océanie', -38.5, -17, 141, 153.5, 4], ['Australie (sud et ouest)', 'Asie et Océanie', -35, -28, 114, 140, 2], ['Nouvelle-Zélande', 'Asie et Océanie', -46.5, -35, 166.5, 178.5, 2],
  ['Afrique du Sud', 'Afrique', -34.5, -22.5, 17, 32.5, 3], ['Kenya', 'Afrique', -4.5, 4.5, 34, 41, 1], ['Sénégal', 'Afrique', 12.5, 16.5, -17.5, -11.5, 1], ['Tunisie', 'Afrique', 30, 37.3, 7.5, 11.5, 1],
].map(([name, continent, latMin, latMax, lngMin, lngMax, weight]) => ({ name, continent, latMin, latMax, lngMin, lngMax, weight }));

// zones de jeu : quelles régions, et à quelle distance le score fond (petite zone = il faut être précis)
const MODES = {
  world: { label: 'Monde entier', scale: 2000, zones: () => true },
  europe: { label: 'Europe', scale: 500, zones: z => z.continent === 'Europe' },
  france: { label: 'France', scale: 120, zones: z => z.name === 'France' },
  americas: { label: 'Amériques', scale: 1200, zones: z => z.continent === 'Amériques' },
  asia: { label: 'Asie et Océanie', scale: 1200, zones: z => z.continent === 'Asie et Océanie' },
};
const ROUND_CHOICES = [3, 5, 10], TIME_CHOICES = [0, 60, 90, 120, 180];
const DEFAULTS = { mode: 'world', rounds: 5, seconds: 90, move: true };
const IDLE_MS = 3_600_000, SEEDS = 40, SEED_RADIUS_KM = 60, HINT_FACTOR = 0.75;

const validPoint = p => p && typeof p.lat === 'number' && Number.isFinite(p.lat) && Math.abs(p.lat) <= 90 && typeof p.lng === 'number' && Number.isFinite(p.lng) && Math.abs(p.lng) <= 180;
function distanceKm(a, b) {
  const rad = n => n * Math.PI / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
const score = (km, scale = 2000) => Math.round(5000 * Math.exp(-km / scale));

module.exports = function createGeo({ routes, send, readBody, broadcast, apiKey = process.env.GOOGLE_MAPS_API_KEY || '', now = Date.now, randomInt = crypto.randomInt, random = Math.random, timers = true }) {
  // en mémoire, un seul processus : les salons disparaissent au redémarrage
  const rooms = new Map(), memberships = new Map(), creations = new Map();
  const fail = (status, message) => { const e = new Error(message); e.status = status; throw e; };
  const members = r => r.players.filter(p => !p.left);
  const roomOf = name => rooms.get(memberships.get(name));
  const modeOf = r => MODES[r.settings.mode];

  // points de départ tirés au hasard dans les zones de la partie ; l'hôte demande à Google le panorama le plus proche
  function seeds(mode) {
    const zones = ZONES.map((z, i) => ({ ...z, i })).filter(MODES[mode].zones);
    const total = zones.reduce((t, z) => t + z.weight, 0);
    return Array.from({ length: SEEDS }, () => {
      let pick = random() * total, z = zones[0];
      for (const c of zones) { pick -= c.weight; if (pick <= 0) { z = c; break; } }
      return { lat: +(z.latMin + random() * (z.latMax - z.latMin)).toFixed(5), lng: +(z.lngMin + random() * (z.lngMax - z.lngMin)).toFixed(5), zone: z.i };
    });
  }
  function reset(r) {
    r.phase = 'waiting'; r.locations = []; r.round = null; r.history = []; r.guesses = Object.create(null); r.hints = Object.create(null);
    r.seeds = seeds(r.settings.mode); r.seedVersion = (r.seedVersion || 0) + 1;
  }
  function drop(r) {
    rooms.delete(r.code);
    for (const p of r.players) if (memberships.get(p.name) === r.code) memberships.delete(p.name);
  }
  function view(r, name) {
    if (!r) return null;
    const zone = loc => ZONES[loc.zone];
    return {
      code: r.code, host: r.host, phase: r.phase, version: r.version, settings: r.settings, modeLabel: modeOf(r).label,
      preparedCount: r.locations.length,
      seeds: r.phase === 'waiting' && name === r.host ? { version: r.seedVersion, points: r.seeds.map(({ lat, lng }) => ({ lat, lng })) } : null,
      players: r.players.map(p => ({ name: p.name, score: p.score, left: p.left, submitted: !!r.guesses[p.name] })),
      round: r.round ? {
        id: r.round.id, number: r.round.number, total: r.settings.rounds, deadline: r.round.deadline,
        panoId: r.phase === 'playing' ? r.locations[r.round.number - 1].panoId : null,
        guess: r.guesses[name] || null,
        hint: r.phase === 'playing' && r.hints[name] ? zone(r.locations[r.round.number - 1]).continent : null,
      } : null,
      result: r.history.at(-1) || null, history: r.history,
    };
  }
  function cast(r) {
    r.version++;
    for (const p of members(r)) broadcast('geo:state', { room: view(r, p.name), serverNow: now() }, [p.name]);
  }
  function finish(r) {
    if (r.phase !== 'playing') return;
    const location = r.locations[r.round.number - 1], zone = ZONES[location.zone];
    const answers = r.players.map(p => {
      const guess = r.guesses[p.name] || null;
      const km = guess ? distanceKm(location, guess) : null;
      const hinted = !!r.hints[p.name];
      const points = km === null ? 0 : Math.round(score(km, modeOf(r).scale) * (hinted ? HINT_FACTOR : 1));
      p.score += points;
      return { name: p.name, guess, distanceKm: km, points, hinted };
    });
    r.history.push({ number: r.round.number, location: { lat: location.lat, lng: location.lng, zone: zone.name, continent: zone.continent }, answers });
    r.phase = r.round.number === r.settings.rounds ? 'finished' : 'results';
    r.touched = now();
    cast(r);
  }
  function sweep() {
    for (const r of rooms.values()) {
      if (now() - r.touched > IDLE_MS) {
        for (const p of members(r)) broadcast('geo:state', { room: null, serverNow: now(), message: 'Le salon a expiré. Crée une nouvelle partie.' }, [p.name]);
        drop(r);
      } else if (r.phase === 'playing' && r.round.deadline && now() >= r.round.deadline) finish(r);
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
    r.guesses = Object.create(null); r.hints = Object.create(null);
    r.round = { id: crypto.randomBytes(12).toString('hex'), number, deadline: r.settings.seconds ? now() + r.settings.seconds * 1000 : null };
    r.phase = 'playing';
  }
  function route(method, path, handler) {
    routes[`${method} /api/geo/${path}`] = async (req, res, user) => {
      if (!user) return send(res, 401, { error: 'Connecte-toi à Bahlou pour jouer.' });
      try {
        sweep();
        const body = method === 'POST' ? await readBody(req) : {};
        if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Requête invalide.');
        sweep(); // l'échéance a pu passer pendant la lecture de la requête
        const data = handler(user, body);
        send(res, 200, data || { room: view(roomOf(user), user), serverNow: now() });
      } catch (e) { send(res, e.status || 400, { error: e.status ? e.message : 'Requête Geo invalide.' }); }
    };
  }
  route('GET', 'config', () => ({
    configured: !!apiKey, apiKey, seedRadiusKm: SEED_RADIUS_KM - 10,
    modes: Object.entries(MODES).map(([id, m]) => ({ id, label: m.label })), rounds: ROUND_CHOICES, times: TIME_CHOICES, defaults: DEFAULTS, hintFactor: HINT_FACTOR,
  }));
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
    const r = { code, host: name, version: 0, players: [{ name, score: 0, left: false }], settings: { ...DEFAULTS }, touched: now() };
    reset(r);
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
  route('POST', 'settings', (name, b) => {
    const r = getRoom(name, true);
    if (r.phase !== 'waiting') fail(409, 'La partie a déjà commencé.');
    const next = { ...r.settings };
    if (b.mode !== undefined) { if (!Object.hasOwn(MODES, b.mode)) fail(400, 'Zone inconnue.'); next.mode = b.mode; }
    if (b.rounds !== undefined) { if (!ROUND_CHOICES.includes(b.rounds)) fail(400, 'Nombre de manches invalide.'); next.rounds = b.rounds; }
    if (b.seconds !== undefined) { if (!TIME_CHOICES.includes(b.seconds)) fail(400, 'Durée invalide.'); next.seconds = b.seconds; }
    if (b.move !== undefined) { if (typeof b.move !== 'boolean') fail(400, 'Réglage invalide.'); next.move = b.move; }
    const reseed = b.reseed === true || next.mode !== r.settings.mode || (r.locations.length && next.rounds > r.locations.length);
    r.settings = next;
    if (reseed) reset(r);
    r.touched = now(); cast(r);
  });
  route('POST', 'prepare', (name, b) => {
    const r = getRoom(name, true);
    if (r.phase !== 'waiting') fail(409, 'La partie a déjà commencé.');
    if (b.seedVersion !== r.seedVersion) fail(409, 'Les réglages ont changé. Relance la préparation.');
    if (!Array.isArray(b.locations) || b.locations.length < r.settings.rounds || b.locations.length > SEEDS) fail(400, `Il faut au moins ${r.settings.rounds} panoramas disponibles. Réessaie.`);
    const ids = new Set(), indices = new Set();
    const locations = b.locations.map(p => {
      const seed = p && Number.isInteger(p.index) ? r.seeds[p.index] : null;
      if (!seed || !validPoint(p) || typeof p.panoId !== 'string' || !/^[\w.-]{1,256}$/.test(p.panoId) || ids.has(p.panoId) || indices.has(p.index) || distanceKm(p, seed) > SEED_RADIUS_KM) fail(400, 'Panorama invalide. Relance la préparation.');
      ids.add(p.panoId); indices.add(p.index);
      return { panoId: p.panoId, lat: p.lat, lng: p.lng, zone: seed.zone };
    });
    r.locations = locations; r.touched = now(); cast(r);
  });
  route('POST', 'start', name => {
    const r = getRoom(name, true);
    if (r.phase !== 'waiting') fail(409, 'La partie a déjà commencé.');
    if (r.locations.length < r.settings.rounds) fail(400, `Il faut ${r.settings.rounds} panoramas prêts.`);
    for (let i = r.locations.length - 1; i > 0; i--) { const j = randomInt(i + 1); [r.locations[i], r.locations[j]] = [r.locations[j], r.locations[i]]; }
    r.locations = r.locations.slice(0, r.settings.rounds);
    begin(r, 1); r.touched = now(); cast(r);
  });
  route('POST', 'hint', (name, b) => {
    const r = getRoom(name); requireRound(r, b, 'playing');
    if (r.guesses[name]) fail(409, 'Ta réponse est déjà confirmée.');
    r.hints[name] = true; r.touched = now();
    return { room: view(r, name), serverNow: now() };
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
    reset(r); r.touched = now(); cast(r);
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
module.exports.ZONES = ZONES;
module.exports.MODES = MODES;
