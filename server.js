#!/usr/bin/env node
// Bahlou — petite messagerie entre potes. Zéro dépendance : Node.js >= 18 suffit.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const createGames = require('./games');
const createWork = require('./work');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const AVATAR_DIR = path.join(DATA_DIR, 'avatars');
const PROMO_DIR = path.join(DATA_DIR, 'promo-photos'); // photos importées, jamais servies directement
const MAX_MSG_LEN = 2000;
const MAX_HISTORY = 5000;   // messages gardés par conversation
const PAGE_SIZE = 60;
const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👀', '💯', '🙏'];

// ---------------------------------------------------------------- stockage
fs.mkdirSync(AVATAR_DIR, { recursive: true });
fs.mkdirSync(PROMO_DIR, { recursive: true });

let db = {
  invite: null,
  users: {},      // name -> { salt, hash, color, created }
  sessions: {},   // token -> { name, created }
  messages: {},   // convId -> [ { id, conv, from, text, ts } ]
  seq: 0,
};

if (fs.existsSync(DB_FILE)) {
  try { db = Object.assign(db, JSON.parse(fs.readFileSync(DB_FILE, 'utf8'))); }
  catch (e) { console.error('db.json illisible :', e.message); process.exit(1); }
}
if (process.env.INVITE_CODE) db.invite = process.env.INVITE_CODE;
if (!db.invite) db.invite = crypto.randomBytes(4).toString('hex');

// donne la photo de la promo à un utilisateur qui n'en a pas encore
function applyPromoPhoto(name) {
  const u = db.users[name];
  const src = path.join(PROMO_DIR, name + '.jpg');
  if (!u || u.avatar || !fs.existsSync(src)) return false;
  fs.copyFileSync(src, path.join(AVATAR_DIR, name + '.jpg'));
  u.avatar = Date.now();
  return true;
}

let saveTimer = null;
function save() {
  if (saveTimer) return;
  saveTimer = setTimeout(() => {
    saveTimer = null;
    const tmp = DB_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(db));
    fs.renameSync(tmp, DB_FILE);
  }, 300);
}
function saveNow() {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  fs.writeFileSync(DB_FILE, JSON.stringify(db));
}
save();

// ---------------------------------------------------------------- utilitaires
const COLORS = ['#7c5cff', '#ff6b8b', '#ffb547', '#2ec4b6', '#4d96ff', '#ff7aa2', '#6bcb77', '#c77dff', '#f9844a', '#43aa8b'];

function hashPassword(password, salt) {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}
function safeEqual(a, b) {
  const A = Buffer.from(a, 'hex'), B = Buffer.from(b, 'hex');
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}
function parseCookies(req) {
  const out = {};
  (req.headers.cookie || '').split(';').forEach(p => {
    const i = p.indexOf('=');
    if (i > 0) out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
  });
  return out;
}
function currentUser(req) {
  const t = parseCookies(req).bahlou;
  const s = t && db.sessions[t];
  return s && db.users[s.name] ? s.name : null;
}
function send(res, status, obj, headers = {}) {
  res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, headers));
  res.end(JSON.stringify(obj));
}
function readBody(req, limit = 64 * 1024) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > limit) { reject(new Error('trop gros')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {}); }
      catch { reject(new Error('JSON invalide')); }
    });
    req.on('error', reject);
  });
}
function sessionCookie(req, token, maxAge) {
  const secure = req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : '';
  return `bahlou=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${secure}`;
}
function clientIp(req) {
  return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress;
}

// anti-bruteforce très simple : 10 tentatives / minute / IP
const attempts = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const list = (attempts.get(ip) || []).filter(t => now - t < 60_000);
  list.push(now);
  attempts.set(ip, list);
  return list.length > 10;
}

// une seule conversation : le chat de la promo
const MAIN = 'c:general';
function canAccess(user, conv) { return conv === MAIN; }
function participants() { return null; }

// ---------------------------------------------------------------- temps réel (SSE)
const clients = new Set(); // { res, user }
function online() {
  const s = new Set();
  for (const c of clients) s.add(c.user);
  return s;
}
function broadcast(event, data, onlyUsers = null) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const c of clients) {
    if (!onlyUsers || onlyUsers.includes(c.user)) c.res.write(payload);
  }
}
function publicUsers() {
  const on = online();
  return Object.entries(db.users).map(([name, u]) => ({ name, avatar: u.avatar || null, online: on.has(name), ...games.badge(name) }));
}
setInterval(() => { for (const c of clients) c.res.write(': ping\n\n'); }, 25_000);

// message automatique du Club dans le chat ("Club" ne peut pas être un pseudo : les pseudos sont en minuscules)
function postSystem(text) {
  const msg = { id: ++db.seq, conv: MAIN, from: 'Club', sys: true, text, ts: Date.now() };
  const list = (db.messages[MAIN] ||= []);
  list.push(msg);
  if (list.length > MAX_HISTORY) list.splice(0, list.length - MAX_HISTORY);
  save();
  broadcast('message', msg);
}

// ---------------------------------------------------------------- routes API
const routes = {
  'GET /api/me': (req, res, user) => send(res, 200, { user }),

  'POST /api/register': async (req, res) => {
    if (rateLimited(clientIp(req))) return send(res, 429, { error: 'Trop de tentatives, attends une minute.' });
    const { username = '', password = '', invite = '' } = await readBody(req);
    const name = String(username).trim().toLowerCase().replace(/@epitech\.eu$/, '');
    if (!/^[a-z0-9._-]{2,32}$/.test(name)) return send(res, 400, { error: 'Pseudo : 2 à 32 caractères (lettres, chiffres, . _ -).' });
    if (String(password).length < 6) return send(res, 400, { error: 'Mot de passe : 6 caractères minimum.' });
    if (String(invite).trim() !== db.invite) return send(res, 403, { error: "Code d'invitation incorrect." });
    if (db.users[name]) return send(res, 409, { error: 'Ce pseudo est déjà pris.' });
    const salt = crypto.randomBytes(16).toString('hex');
    db.users[name] = {
      salt, hash: hashPassword(String(password), salt),
      color: COLORS[Object.keys(db.users).length % COLORS.length], created: Date.now(),
    };
    applyPromoPhoto(name);
    const token = crypto.randomBytes(32).toString('hex');
    db.sessions[token] = { name, created: Date.now() };
    save();
    broadcast('users', publicUsers());
    send(res, 200, { user: name }, { 'Set-Cookie': sessionCookie(req, token, 60 * 60 * 24 * 90) });
  },

  'POST /api/login': async (req, res) => {
    if (rateLimited(clientIp(req))) return send(res, 429, { error: 'Trop de tentatives, attends une minute.' });
    const { username = '', password = '' } = await readBody(req);
    const name = String(username).trim().toLowerCase().replace(/@epitech\.eu$/, '');
    const u = db.users[name];
    if (!u || !safeEqual(hashPassword(String(password), u.salt), u.hash)) {
      return send(res, 401, { error: 'Pseudo ou mot de passe incorrect.' });
    }
    const token = crypto.randomBytes(32).toString('hex');
    db.sessions[token] = { name, created: Date.now() };
    save();
    send(res, 200, { user: name }, { 'Set-Cookie': sessionCookie(req, token, 60 * 60 * 24 * 90) });
  },

  'POST /api/logout': (req, res) => {
    const t = parseCookies(req).bahlou;
    if (t) { delete db.sessions[t]; save(); }
    send(res, 200, { ok: true }, { 'Set-Cookie': sessionCookie(req, '', 0) });
  },

  'GET /api/state': (req, res, user) => {
    if (!user) return send(res, 401, { error: 'non connecté' });
    // dernier message de chaque conversation accessible (pour les non-lus)
    const last = {};
    for (const [conv, list] of Object.entries(db.messages)) {
      if (list.length && canAccess(user, conv)) last[conv] = list[list.length - 1];
    }
    send(res, 200, { me: user, users: publicUsers(), last });
  },

  'GET /api/messages': (req, res, user, url) => {
    if (!user) return send(res, 401, { error: 'non connecté' });
    const conv = url.searchParams.get('conv') || '';
    if (!canAccess(user, conv)) return send(res, 403, { error: 'accès refusé' });
    const before = Number(url.searchParams.get('before')) || Infinity;
    const list = (db.messages[conv] || []).filter(m => m.id < before);
    send(res, 200, { messages: list.slice(-PAGE_SIZE), more: list.length > PAGE_SIZE });
  },

  'POST /api/messages': async (req, res, user) => {
    if (!user) return send(res, 401, { error: 'non connecté' });
    const { conv = '', text = '' } = await readBody(req);
    const body = String(text).replace(/\r\n/g, '\n').trim();
    if (!body) return send(res, 400, { error: 'message vide' });
    if (body.length > MAX_MSG_LEN) return send(res, 400, { error: `max ${MAX_MSG_LEN} caractères` });
    if (!canAccess(user, conv)) return send(res, 403, { error: 'accès refusé' });
    const msg = { id: ++db.seq, conv, from: user, text: body, ts: Date.now() };
    const list = (db.messages[conv] ||= []);
    list.push(msg);
    if (list.length > MAX_HISTORY) list.splice(0, list.length - MAX_HISTORY);
    save();
    broadcast('message', msg, participants(conv));
    games.onChat(user);
    send(res, 200, { message: msg });
  },

  'POST /api/react': async (req, res, user) => {
    if (!user) return send(res, 401, { error: 'non connecté' });
    const { conv = '', id = 0, emoji = '' } = await readBody(req);
    if (!canAccess(user, conv)) return send(res, 403, { error: 'accès refusé' });
    if (!REACTIONS.includes(emoji)) return send(res, 400, { error: 'réaction inconnue' });
    const msg = (db.messages[conv] || []).find(m => m.id === Number(id));
    if (!msg) return send(res, 404, { error: 'message introuvable' });
    const r = (msg.reactions ||= {});
    const list = (r[emoji] ||= []);
    const i = list.indexOf(user);
    if (i >= 0) list.splice(i, 1); else list.push(user);
    if (!list.length) delete r[emoji];
    save();
    broadcast('reaction', { conv, id: msg.id, reactions: r }, participants(conv));
    send(res, 200, { reactions: r });
  },

  'POST /api/delete': async (req, res, user) => {
    if (!user) return send(res, 401, { error: 'non connecté' });
    const { conv = '', id = 0 } = await readBody(req);
    if (!canAccess(user, conv)) return send(res, 403, { error: 'accès refusé' });
    const list = db.messages[conv] || [];
    const i = list.findIndex(m => m.id === Number(id));
    if (i < 0) return send(res, 404, { error: 'message introuvable' });
    if (list[i].from !== user) return send(res, 403, { error: 'ce n\'est pas ton message' });
    list.splice(i, 1);
    save();
    broadcast('delete', { conv, id: Number(id), last: list[list.length - 1] || null }, participants(conv));
    send(res, 200, { ok: true });
  },

  'POST /api/avatar': async (req, res, user) => {
    if (!user) return send(res, 401, { error: 'non connecté' });
    const { image = null } = await readBody(req, 600 * 1024);
    const file = path.join(AVATAR_DIR, user + '.jpg');
    if (image === null) {
      fs.rmSync(file, { force: true });
      delete db.users[user].avatar;
    } else {
      const m = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(String(image));
      if (!m) return send(res, 400, { error: 'image invalide' });
      const buf = Buffer.from(m[1], 'base64');
      if (buf.length > 400 * 1024 || buf[0] !== 0xff || buf[1] !== 0xd8) return send(res, 400, { error: 'image invalide ou trop lourde' });
      fs.writeFileSync(file, buf);
      db.users[user].avatar = Date.now();
    }
    save();
    broadcast('users', publicUsers());
    send(res, 200, { avatar: db.users[user].avatar || null });
  },

  'POST /api/typing': async (req, res, user) => {
    if (!user) return send(res, 401, { error: 'non connecté' });
    const { conv = '' } = await readBody(req);
    if (!canAccess(user, conv)) return send(res, 403, { error: 'accès refusé' });
    broadcast('typing', { conv, user }, participants(conv));
    send(res, 200, { ok: true });
  },

  // sert à prévenir les applis ouvertes qu'une nouvelle interface est en ligne
  'GET /api/version': (req, res) => {
    const v = Math.max(...fs.readdirSync(PUBLIC_DIR).map((f) => fs.statSync(path.join(PUBLIC_DIR, f)).mtimeMs));
    send(res, 200, { v });
  },

  // affiché sur la page publique de téléchargement, à la demande de l'admin
  'GET /api/invite': (req, res) => send(res, 200, { invite: db.invite }),

  'GET /api/events': (req, res, user) => {
    if (!user) return send(res, 401, { error: 'non connecté' });
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    res.write('retry: 3000\n\n');
    const client = { res, user };
    const wasOnline = online().has(user);
    clients.add(client);
    if (!wasOnline) broadcast('users', publicUsers());
    req.on('close', () => {
      clients.delete(client);
      if (!online().has(user)) broadcast('users', publicUsers());
    });
  },
};

const games = createGames({
  db, routes, send, readBody, broadcast, save, online, postSystem,
  usersChanged: () => { save(); broadcast('users', publicUsers()); },
});

createWork({ routes, send, readBody, dataDir: DATA_DIR });

// ---------------------------------------------------------------- fichiers statiques
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png',
  '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json',
};
const DOWNLOADS = path.join(path.dirname(DATA_DIR), 'downloads');
const PACKAGES = { 'Bahlou.AppImage': 'application/octet-stream', 'bahlou.deb': 'application/vnd.debian.binary-package', 'bahlou.pacman': 'application/octet-stream' };

// les paquets pèsent une centaine de Mo : envoyés au fil de l'eau, sans passer par la mémoire
function serveDownload(res, name) {
  const file = path.join(DOWNLOADS, name);
  fs.stat(file, (err, st) => {
    if (err) { res.writeHead(404); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': PACKAGES[name], 'Content-Length': st.size, 'Content-Disposition': `attachment; filename="${name}"`, 'Cache-Control': 'no-cache' });
    fs.createReadStream(file).on('error', () => res.destroy()).pipe(res);
  });
}

function serveStatic(req, res, url) {
  const dl = /^\/download\/([^/]+)$/.exec(url.pathname);
  if (dl && Object.hasOwn(PACKAGES, dl[1])) return serveDownload(res, dl[1]);
  const av = /^\/avatars\/([a-z0-9._-]{2,32})\.jpg$/.exec(url.pathname);
  if (av) {
    return fs.readFile(path.join(AVATAR_DIR, av[1] + '.jpg'), (err, data) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=31536000, immutable' });
      res.end(data);
    });
  }
  let p = decodeURIComponent(url.pathname);
  if (p === '/') p = '/index.html';
  const file = path.normalize(path.join(PUBLIC_DIR, p));
  if (!file.startsWith(PUBLIC_DIR + path.sep)) { res.writeHead(403); return res.end(); }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); return res.end('404'); }
    const ext = path.extname(file);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ext === '.woff2' ? 'public, max-age=31536000, immutable' : 'no-cache' });
    res.end(data);
  });
}

// ---------------------------------------------------------------- serveur
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  const handler = routes[`${req.method} ${url.pathname}`];
  if (!handler) {
    if (req.method === 'GET' && !url.pathname.startsWith('/api/')) return serveStatic(req, res, url);
    return send(res, 404, { error: 'introuvable' });
  }
  // protection CSRF basique : les requêtes POST doivent être en JSON
  if (req.method === 'POST' && !(req.headers['content-type'] || '').includes('application/json')) {
    return send(res, 415, { error: 'JSON attendu' });
  }
  try { await handler(req, res, currentUser(req), url); }
  catch (e) { if (!res.headersSent) send(res, 400, { error: e.message }); }
});

if (Object.keys(db.users).filter(applyPromoPhoto).length) save();

server.listen(PORT, HOST, () => {
  const nets = require('os').networkInterfaces();
  const ips = Object.values(nets).flat().filter(n => n && n.family === 'IPv4' && !n.internal).map(n => n.address);
  console.log('\n  💬  Bahlou est lancé !\n');
  console.log(`  Local    : http://localhost:${PORT}`);
  ips.forEach(ip => console.log(`  Réseau   : http://${ip}:${PORT}`));
  console.log(`\n  🔑 Code d'invitation à donner à tes potes : ${db.invite}\n`);
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { games.shutdown(); saveNow(); process.exit(0); });
}
