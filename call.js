// Bahlou — appel vocal du Salon. Le serveur met les participants en relation, le son passe directement entre eux.
'use strict';

const MAX_MEMBERS = 10;
const TIMEOUT = 25_000;   // sans signe de vie du client, il est retiré de l'appel

module.exports = function createCall({ routes, send, readBody, broadcast, postSystem }) {
  const members = new Map();   // pseudo -> { cid, muted, deaf, seen }
  let startedAt = 0;

  const iceServers = [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun.cloudflare.com:3478'] }];
  if (process.env.TURN_URL) iceServers.push({ urls: process.env.TURN_URL, username: process.env.TURN_USER, credential: process.env.TURN_PASS });

  const view = () => ({ startedAt, members: [...members].map(([name, m]) => ({ name, cid: m.cid, muted: m.muted, deaf: m.deaf })) });
  const share = () => broadcast('call', view());
  const validCid = (c) => typeof c === 'string' && /^[a-z0-9]{8,32}$/.test(c);
  const auth = (fn) => async (req, res, user, url) => (user ? fn(req, res, user, url) : send(res, 401, { error: 'non connecté' }));

  function remove(user) {
    if (!members.delete(user)) return;
    if (!members.size) {
      const min = Math.max(1, Math.round((Date.now() - startedAt) / 60_000));
      startedAt = 0;
      postSystem(`Appel terminé, ${min} min.`);
    }
    share();
  }

  setInterval(() => {
    const limit = Date.now() - TIMEOUT;
    for (const [name, m] of members) if (m.seen < limit) remove(name);
  }, 5_000).unref();

  routes['GET /api/call'] = auth((req, res) => send(res, 200, view()));

  routes['POST /api/call/join'] = auth(async (req, res, user) => {
    const { cid, muted = false, deaf = false } = await readBody(req);
    if (!validCid(cid)) return send(res, 400, { error: 'requête invalide' });
    const old = members.get(user);
    if (!old && members.size >= MAX_MEMBERS) return send(res, 403, { error: `L'appel est plein (${MAX_MEMBERS} personnes).` });
    if (old && old.cid !== cid) broadcast('call:kick', { cid: old.cid }, [user]);
    const first = !members.size;
    if (first) startedAt = Date.now();
    members.set(user, { cid, muted: !!muted, deaf: !!deaf, seen: Date.now() });
    if (first) postSystem(`**${user}** a lancé un appel.`);
    share();
    send(res, 200, { ...view(), iceServers });
  });

  routes['POST /api/call/leave'] = auth(async (req, res, user) => {
    const { cid } = await readBody(req);
    if (members.get(user)?.cid === cid) remove(user);
    send(res, 200, { ok: true });
  });

  // sert aussi de signe de vie ; 410 si le client n'est plus dans l'appel (redémarrage du serveur)
  routes['POST /api/call/state'] = auth(async (req, res, user) => {
    const { cid, muted, deaf } = await readBody(req);
    const m = members.get(user);
    if (!m || m.cid !== cid) return send(res, 410, { error: 'hors appel' });
    m.seen = Date.now();
    const changed = (typeof muted === 'boolean' && muted !== m.muted) || (typeof deaf === 'boolean' && deaf !== m.deaf);
    if (typeof muted === 'boolean') m.muted = muted;
    if (typeof deaf === 'boolean') m.deaf = deaf;
    if (changed) share();
    send(res, 200, { ok: true });
  });

  routes['POST /api/call/signal'] = auth(async (req, res, user) => {
    const { cid, to, toCid, data } = await readBody(req);
    const me = members.get(user), peer = members.get(String(to));
    if (!me || me.cid !== cid || !peer || peer.cid !== toCid || !data || typeof data !== 'object') return send(res, 409, { error: 'hors appel' });
    broadcast('call:signal', { from: user, fromCid: cid, toCid, data }, [to]);
    send(res, 200, { ok: true });
  });
};
