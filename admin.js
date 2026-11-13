// Bahlou — administration. Réservée aux comptes listés dans BAHLOU_ADMIN ; chaque route le vérifie.
// N'expose jamais les mots de passe, ni les données Epitech des joueurs.
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const MAX_COINS = 100_000_000;

module.exports = function createAdmin({ routes, send, readBody, db, save, games, online, clients, broadcast, publicUsers, postSystem, hashPassword, dataDir }) {
  const admins = new Set((process.env.BAHLOU_ADMIN || '').split(',').map((s) => s.trim()).filter(Boolean));
  const isAdmin = (user) => !!user && admins.has(user);
  const log = (by, action) => {
    db.adminLog ||= [];
    db.adminLog.unshift({ by, action, ts: Date.now() });
    db.adminLog.length = Math.min(db.adminLog.length, 50);
    save();
  };
  const only = (fn) => async (req, res, user, url) => (isAdmin(user) ? fn(req, res, user, url) : send(res, 403, { error: 'accès refusé' }));
  const exists = (name) => typeof name === 'string' && Object.hasOwn(db.users, name);
  function endSessions(name) {
    for (const [t, s] of Object.entries(db.sessions)) if (s.name === name) delete db.sessions[t];
  }
  function disconnect(name) { for (const c of clients) if (c.user === name) c.close(); }
  function publicUrl() { try { return fs.readFileSync(path.join(path.dirname(dataDir), 'public-url'), 'utf8').trim(); } catch { return null; } }

  routes['GET /api/admin'] = only((req, res) => {
    const on = online();
    const overview = games.overview();
    const players = Object.entries(db.users).map(([name, u]) => ({ name, online: on.has(name), banned: !!u.banned, created: u.created || null, admin: admins.has(name), cosmetics: games.cosmetics(name), ...(overview.players[name] || { coins: 0, level: 1, rank: '' }) })).sort((a, b) => (b.online - a.online) || (b.coins - a.coins));
    const messages = Object.values(db.messages).reduce((t, l) => t + l.length, 0);
    send(res, 200, { players, invite: db.invite, publicUrl: publicUrl(), log: db.adminLog || [], stats: { accounts: players.length, online: on.size, coins: players.reduce((t, p) => t + p.coins, 0), jackpot: overview.jackpot, messages } });
  });

  routes['POST /api/admin/coins'] = only(async (req, res, user) => {
    const { to = '', amount = 0 } = await readBody(req);
    const n = Math.trunc(Number(amount));
    if (!Number.isFinite(n) || n === 0 || Math.abs(n) > MAX_COINS) return send(res, 400, { error: 'Montant invalide.' });
    let names;
    if (to === '@online') names = [...online()];
    else if (to === '@all') names = Object.keys(db.users);
    else if (exists(to)) names = [to];
    else return send(res, 404, { error: 'Joueur inconnu.' });
    names.forEach((name) => games.adjust(name, n));
    log(user, `${n > 0 ? '+' : ''}${n.toLocaleString('fr-FR')} bahlous pour ${to === '@online' ? `les ${names.length} joueurs en ligne` : to === '@all' ? `les ${names.length} comptes` : to}`);
    send(res, 200, { count: names.length });
  });

  routes['POST /api/admin/cosmetic'] = only(async (req, res, user) => {
    const { name, id } = await readBody(req);
    if (!exists(name)) return send(res, 404, { error: 'Joueur inconnu.' });
    const removed = games.revoke(name, String(id));
    if (!removed) return send(res, 404, { error: 'Objet non possédé.' });
    log(user, `Retrait de « ${removed} » à ${name}`);
    send(res, 200, { removed });
  });

  routes['POST /api/admin/ban'] = only(async (req, res, user) => {
    const { name, banned } = await readBody(req);
    if (!exists(name)) return send(res, 404, { error: 'Joueur inconnu.' });
    if (admins.has(name)) return send(res, 400, { error: 'Impossible de suspendre un admin.' });
    db.users[name].banned = !!banned;
    if (banned) { endSessions(name); disconnect(name); }
    log(user, `${banned ? 'Suspension' : 'Réactivation'} de ${name}`);
    save();
    broadcast('users', publicUsers());
    send(res, 200, { ok: true });
  });

  routes['POST /api/admin/password'] = only(async (req, res, user) => {
    const { name } = await readBody(req);
    if (!exists(name)) return send(res, 404, { error: 'Joueur inconnu.' });
    const password = crypto.randomBytes(6).toString('base64url');
    const salt = crypto.randomBytes(16).toString('hex');
    Object.assign(db.users[name], { salt, hash: hashPassword(password, salt) });
    endSessions(name);
    disconnect(name);
    log(user, `Nouveau mot de passe pour ${name}`);
    send(res, 200, { password });
  });

  routes['POST /api/admin/invite'] = only((req, res, user) => {
    db.invite = crypto.randomBytes(4).toString('hex');
    log(user, 'Nouveau code d’invitation');
    send(res, 200, { invite: db.invite });
  });

  routes['POST /api/admin/announce'] = only(async (req, res, user) => {
    const text = String((await readBody(req)).text || '').trim();
    if (!text || text.length > 500) return send(res, 400, { error: 'Annonce vide ou trop longue.' });
    postSystem(text);
    log(user, 'Annonce au Salon');
    send(res, 200, { ok: true });
  });

  return { isAdmin };
};
