#!/usr/bin/env node
// Bahlou — petite messagerie entre potes. Zéro dépendance : Node.js >= 18 suffit.
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const zlib = require('zlib');
const createGames = require('./games');
const createWork = require('./work');
const createGeo = require('./geo');
const createCall = require('./call');
const createAdmin = require('./admin');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const PUBLIC_DIR = path.join(__dirname, 'public');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const AVATAR_DIR = path.join(DATA_DIR, 'avatars');
const UPLOAD_DIR = path.join(DATA_DIR, 'uploads');
const MAX_UPLOAD = 4 * 1024 * 1024, MAX_UPLOADS_TOTAL = 1024 ** 3;
const PROMO_DIR = path.join(DATA_DIR, 'promo-photos'); // photos importées, jamais servies directement
const MAX_MSG_LEN = 2000;
const MAX_HISTORY = 5000;   // messages gardés par conversation
const PAGE_SIZE = 60;
const REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '🔥', '🎉', '👀', '💯', '🙏'];

// ---------------------------------------------------------------- stockage
fs.mkdirSync(AVATAR_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
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
  return s && db.users[s.name] && !db.users[s.name].banned ? s.name : null;
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

// le Salon, ouvert à tous, et les messages privés entre deux membres (« d:alice|bob », pseudos triés)
const MAIN = 'c:general';
function dmUsers(conv) {
  const m = /^d:([a-z0-9._-]{2,32})\|([a-z0-9._-]{2,32})$/.exec(String(conv));
  if (!m || m[1] >= m[2] || !Object.hasOwn(db.users, m[1]) || !Object.hasOwn(db.users, m[2])) return null;
  return [m[1], m[2]];
}
function canAccess(user, conv) { return conv === MAIN || !!dmUsers(conv)?.includes(user); }
function participants(conv) { return conv === MAIN ? null : dmUsers(conv); }

// ---------------------------------------------------------------- temps réel (WebSocket : les tunnels gratuits ne laissent pas passer les flux SSE)
const clients = new Set(); // { user, send, close }
function online() {
  const s = new Set();
  for (const c of clients) s.add(c.user);
  return s;
}
function broadcast(event, data, onlyUsers = null) {
  const payload = JSON.stringify({ e: event, d: data });
  for (const c of clients) {
    if (!onlyUsers || onlyUsers.includes(c.user)) c.send(payload);
  }
}

function publicUsers() {
  const on = online();
  return Object.entries(db.users).map(([name, u]) => ({ name, avatar: u.avatar || null, online: on.has(name), ...games.badge(name) }));
}

// message automatique du Club dans le chat ("Club" ne peut pas être un pseudo : les pseudos sont en minuscules)
function postSystem(text) {
  const msg = { id: ++db.seq, conv: MAIN, from: 'Club', sys: true, text, ts: Date.now() };
  const list = (db.messages[MAIN] ||= []);
  list.push(msg);
  if (list.length > MAX_HISTORY) list.splice(0, list.length - MAX_HISTORY);
  save();
  broadcast('message', msg);
}

// ---------------------------------------------------------------- messages enrichis
const UPLOAD_RE = /^[a-f0-9]{24}\.(jpg|png|gif|webp)$/;
const UPLOAD_MIME = { jpg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };
function imageType(b) {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg';
  if (b.length > 8 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (b.subarray(0, 4).toString('latin1') === 'GIF8') return 'gif';
  if (b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP') return 'webp';
  return null;
}
const uploads = new Map();
function uploadLimited(user) {
  const now = Date.now(), l = (uploads.get(user) || []).filter((t) => now - t < 600_000);
  l.push(now); uploads.set(user, l);
  return l.length > 30;
}
const preview = (m) => (m.text ? m.text.slice(0, 140) : m.image ? 'Image' : m.poll ? `Sondage : ${m.poll.q}` : '');
function pushMessage(list, msg, conv) {
  list.push(msg);
  if (list.length > MAX_HISTORY) {
    for (const old of list.splice(0, list.length - MAX_HISTORY)) if (old.image) fs.rmSync(path.join(UPLOAD_DIR, old.image), { force: true });
  }
  save();
  broadcast('message', msg, participants(conv));
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
    if (u.banned) return send(res, 403, { error: 'Ce compte est suspendu.' });
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
    const alert = db.alert && Date.now() - db.alert.ts < 86400000 ? db.alert : null;
    send(res, 200, { me: user, users: publicUsers(), last, admin: admin.isAdmin(user), alert });
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
    const { conv = '', text = '', reply = null, image = null } = await readBody(req);
    const body = String(text).replace(/\r\n/g, '\n').trim();
    const img = image === null ? null : String(image);
    if (img && (!UPLOAD_RE.test(img) || !fs.existsSync(path.join(UPLOAD_DIR, img)))) return send(res, 400, { error: 'image introuvable' });
    if (!body && !img) return send(res, 400, { error: 'message vide' });
    if (body.length > MAX_MSG_LEN) return send(res, 400, { error: `max ${MAX_MSG_LEN} caractères` });
    if (!canAccess(user, conv)) return send(res, 403, { error: 'accès refusé' });
    const msg = { id: ++db.seq, conv, from: user, text: body, ts: Date.now() };
    if (img) msg.image = img;
    const list = (db.messages[conv] ||= []);
    if (reply !== null) {
      const o = list.find((m) => m.id === Number(reply));
      if (o) msg.reply = { id: o.id, from: o.from, text: preview(o) };
    }
    pushMessage(list, msg, conv);
    games.onChat(user);
    send(res, 200, { message: msg });
  },

  // photos du Salon : formats vérifiés au contenu, jamais de SVG ni de HTML
  'POST /api/upload': async (req, res, user) => {
    if (!user) return send(res, 401, { error: 'non connecté' });
    if (uploadLimited(user)) return send(res, 429, { error: 'Trop d’images d’un coup, attends un peu.' });
    const { image = '' } = await readBody(req, MAX_UPLOAD * 1.4 + 1024);
    const m = /^data:image\/(jpeg|png|gif|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(image));
    if (!m) return send(res, 400, { error: 'Format d’image non pris en charge.' });
    const buf = Buffer.from(m[2], 'base64');
    const ext = imageType(buf);
    if (!ext || buf.length > MAX_UPLOAD) return send(res, 400, { error: 'Image invalide ou trop lourde (4 Mo maximum).' });
    const used = fs.readdirSync(UPLOAD_DIR).reduce((t, f) => t + fs.statSync(path.join(UPLOAD_DIR, f)).size, 0);
    if (used + buf.length > MAX_UPLOADS_TOTAL) return send(res, 507, { error: 'Le stockage des images est plein.' });
    const name = `${crypto.randomBytes(12).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(UPLOAD_DIR, name), buf);
    send(res, 200, { name });
  },

  'POST /api/poll': async (req, res, user) => {
    if (!user) return send(res, 401, { error: 'non connecté' });
    const { conv = '', q = '', options = [] } = await readBody(req);
    if (!canAccess(user, conv)) return send(res, 403, { error: 'accès refusé' });
    const question = String(q).trim().slice(0, 200);
    const opts = (Array.isArray(options) ? options : []).map((o) => String(o).trim().slice(0, 80)).filter(Boolean).slice(0, 6);
    if (!question || opts.length < 2 || new Set(opts).size !== opts.length) return send(res, 400, { error: 'Il faut une question et au moins 2 choix différents.' });
    const msg = { id: ++db.seq, conv, from: user, text: '', ts: Date.now(), poll: { q: question, options: opts.map((t) => ({ t, votes: [] })) } };
    pushMessage((db.messages[conv] ||= []), msg, conv);
    games.onChat(user);
    send(res, 200, { message: msg });
  },

  'POST /api/poll/vote': async (req, res, user) => {
    if (!user) return send(res, 401, { error: 'non connecté' });
    const { conv = '', id = 0, i = -1 } = await readBody(req);
    if (!canAccess(user, conv)) return send(res, 403, { error: 'accès refusé' });
    const msg = (db.messages[conv] || []).find((m) => m.id === Number(id));
    const opt = msg?.poll?.options?.[Number(i)];
    if (!opt) return send(res, 404, { error: 'sondage introuvable' });
    const had = opt.votes.includes(user);
    msg.poll.options.forEach((o) => { o.votes = o.votes.filter((v) => v !== user); });
    if (!had) opt.votes.push(user);
    save();
    broadcast('poll', { conv, id: msg.id, poll: msg.poll }, participants(conv));
    send(res, 200, { poll: msg.poll });
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
    if (list[i].from !== user && !admin.isAdmin(user)) return send(res, 403, { error: 'ce n\'est pas ton message' });
    const [gone] = list.splice(i, 1);
    if (gone.image) fs.rmSync(path.join(UPLOAD_DIR, gone.image), { force: true });
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

};

const games = createGames({
  db, routes, send, readBody, broadcast, save, online, postSystem,
  usersChanged: () => { save(); broadcast('users', publicUsers()); },
});

const geo = createGeo({ routes, send, readBody, broadcast });
createWork({ routes, send, readBody, dataDir: DATA_DIR, games });
require('./words')({ routes, send, readBody, db, save, games, postSystem });
createCall({ routes, send, readBody, broadcast, postSystem });
const admin = createAdmin({ routes, send, readBody, db, save, games, online, clients, broadcast, publicUsers, postSystem, hashPassword, dataDir: DATA_DIR });

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
  const up = /^\/uploads\/([^/]+)$/.exec(url.pathname);
  if (up) {
    if (!currentUser(req) || !UPLOAD_RE.test(up[1])) { res.writeHead(404); return res.end(); }
    return fs.readFile(path.join(UPLOAD_DIR, up[1]), (err, data) => {
      if (err) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': UPLOAD_MIME[up[1].split('.').pop()], 'Cache-Control': 'private, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
      res.end(data);
    });
  }
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
  let a;
  try { a = staticAsset(file); } catch { res.writeHead(404); return res.end('404'); }
  const ext = path.extname(file);
  const forever = ext === '.woff2' || (url.searchParams.get('v') === a.tag && (ext === '.js' || ext === '.css'));
  const headers = { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': forever ? 'public, max-age=31536000, immutable' : 'no-cache', ETag: `W/"${a.tag}"`, Vary: 'Accept-Encoding' };
  if (String(req.headers['if-none-match'] || '').includes(a.tag)) { res.writeHead(304, headers); return res.end(); }
  const accepts = String(req.headers['accept-encoding'] || '');
  if (a.br && /\bbr\b/.test(accepts)) { headers['Content-Encoding'] = 'br'; res.writeHead(200, headers); return res.end(a.br); }
  if (a.gz && /\bgzip\b/.test(accepts)) { headers['Content-Encoding'] = 'gzip'; res.writeHead(200, headers); return res.end(a.gz); }
  res.writeHead(200, headers);
  res.end(a.raw);
}

// fichiers de l'interface : gardés compressés en mémoire, et versionnés pour que l'appli ne les retélécharge qu'après une mise à jour
const assets = new Map();
const COMPRESS = new Set(['.html', '.js', '.css', '.json', '.svg', '.webmanifest']);
function packAsset(raw, ext, sig) {
  const a = { sig, raw, tag: crypto.createHash('sha1').update(raw).digest('hex').slice(0, 16), gz: null, br: null };
  if (COMPRESS.has(ext) && raw.length > 512) {
    a.gz = zlib.gzipSync(raw, { level: 9 });
    a.br = zlib.brotliCompressSync(raw, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 10 } });
  }
  return a;
}
function staticAsset(file) {
  const st = fs.statSync(file);
  if (!st.isFile()) throw new Error('pas un fichier');
  const isIndex = path.basename(file) === 'index.html' && path.dirname(file) === PUBLIC_DIR;
  if (!isIndex) {
    const sig = `${st.mtimeMs}:${st.size}`;
    let a = assets.get(file);
    if (!a || a.sig !== sig) { a = packAsset(fs.readFileSync(file), path.extname(file), sig); assets.set(file, a); }
    return a;
  }
  const html = fs.readFileSync(file, 'utf8');
  const out = html.replace(/(href|src)="\/([\w-]+\.(?:css|js))"/g, (m, attr, name) => {
    try { return `${attr}="/${name}?v=${staticAsset(path.join(PUBLIC_DIR, name)).tag}"`; } catch { return m; }
  });
  let a = assets.get(file);
  if (!a || a.sig !== out) { a = packAsset(Buffer.from(out), '.html', out); assets.set(file, a); }
  return a;
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

// ---------------------------------------------------------------- WebSocket, sans dépendance
const WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
function wsFrame(opcode, body) {
  const n = body.length;
  const head = n < 126 ? Buffer.from([0x80 | opcode, n])
    : n < 65536 ? Buffer.from([0x80 | opcode, 126, n >> 8, n & 255])
    : Buffer.concat([Buffer.from([0x80 | opcode, 127, 0, 0, 0, 0]), Buffer.from([(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255])]);
  return Buffer.concat([head, body]);
}
server.on('upgrade', (req, socket) => {
  const url = new URL(req.url, 'http://localhost');
  const user = url.pathname === '/api/ws' ? currentUser(req) : null;
  const key = req.headers['sec-websocket-key'];
  // refuse qu'un autre site ouvre cette connexion avec le cookie d'un joueur
  let sameSite = !req.headers.origin;
  try { sameSite ||= new URL(req.headers.origin).host === req.headers.host; } catch {}
  if (!user || !key || !sameSite) { socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n'); return; }
  const accept = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
  socket.write(`HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ${accept}\r\n\r\n`);
  socket.setNoDelay(true);
  const client = {
    user, seen: Date.now(),
    send(text) { if (!socket.writable) return; if (socket.writableLength > 4e6) return socket.destroy(); socket.write(wsFrame(1, Buffer.from(text))); },
    ping() { if (socket.writable) socket.write(wsFrame(9, Buffer.alloc(0))); },
    close() { if (socket.writable) socket.end(wsFrame(8, Buffer.alloc(0))); else socket.destroy(); },
    stale: () => Date.now() - client.seen > 70_000,
    kill: () => socket.destroy(),
  };
  const wasOnline = online().has(user);
  clients.add(client);
  if (!wasOnline) broadcast('users', publicUsers());
  let buf = Buffer.alloc(0);
  socket.on('data', (chunk) => {
    client.seen = Date.now();
    buf = Buffer.concat([buf, chunk]);
    if (buf.length > 1 << 20) return socket.destroy();
    while (buf.length >= 2) {
      const op = buf[0] & 15, masked = buf[1] & 128;
      let len = buf[1] & 127, at = 2;
      if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); at = 4; }
      else if (len === 127) return socket.destroy();
      const total = at + (masked ? 4 : 0) + len;
      if (buf.length < total) return;
      if (op === 8) return client.close();
      if (op === 9) { const m = masked ? buf.subarray(at, at + 4) : null; const p = Buffer.from(buf.subarray(total - len, total)); if (m) p.forEach((v, i) => { p[i] = v ^ m[i % 4]; }); if (socket.writable) socket.write(wsFrame(10, p)); }
      buf = buf.subarray(total);
    }
  });
  const gone = () => {
    if (!clients.delete(client)) return;
    if (!online().has(user)) broadcast('users', publicUsers());
  };
  socket.on('close', gone);
  socket.on('error', gone);
});
setInterval(() => {
  for (const c of clients) { if (c.stale()) c.kill(); else { c.ping(); c.send('{"e":"ping"}'); } }
}, 20_000);

if (Object.keys(db.users).filter(applyPromoPhoto).length) save();

server.listen(PORT, HOST, () => {
  const nets = require('os').networkInterfaces();
  const ips = Object.values(nets).flat().filter(n => n && n.family === 'IPv4' && !n.internal).map(n => n.address);
  console.log('\n  💬  Bahlou est lancé !\n');
  console.log(`  Local    : http://localhost:${PORT}`);
  ips.forEach(ip => console.log(`  Réseau   : http://${ip}:${PORT}`));
  console.log(`\n  🔑 Code d'invitation à donner à tes potes : ${db.invite}\n`);
});

// commande d'admin, depuis le PC seulement : écrire data/admin-cmd.json puis envoyer SIGUSR2 au serveur
process.on('SIGUSR2', () => {
  const file = path.join(DATA_DIR, 'admin-cmd.json');
  let result;
  try {
    const cmd = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (cmd.removeTestUser === 'test.reseau') {
      delete db.users['test.reseau'];
      for (const [t, s] of Object.entries(db.sessions)) if (s.name === 'test.reseau') delete db.sessions[t];
      delete db.games?.players?.['test.reseau'];
      save(); broadcast('users', publicUsers());
      fs.rmSync(file, { force: true });
      fs.writeFileSync(path.join(DATA_DIR, 'admin-result.json'), '{"removed":true}', { mode: 0o600 });
      return;
    }
    if (cmd.resetPassword !== undefined) {
      if (!Object.hasOwn(db.users, cmd.resetPassword)) throw new Error('joueur inconnu');
      const password = crypto.randomBytes(9).toString('base64url');
      const salt = crypto.randomBytes(16).toString('hex');
      Object.assign(db.users[cmd.resetPassword], { salt, hash: hashPassword(password, salt) });
      for (const [t, s] of Object.entries(db.sessions)) if (s.name === cmd.resetPassword) delete db.sessions[t];
      for (const c of clients) if (c.user === cmd.resetPassword) c.close();
      save();
      const out = path.join(DATA_DIR, 'nouveau-mot-de-passe.txt');
      fs.rmSync(out, { force: true });
      fs.writeFileSync(out, password + '\n', { mode: 0o600 });
      fs.rmSync(file, { force: true });
      fs.writeFileSync(path.join(DATA_DIR, 'admin-result.json'), '{"reset":true}', { mode: 0o600 });
      return;
    }
    if (cmd.to !== undefined && !Object.hasOwn(db.users, cmd.to)) throw new Error('joueur inconnu');
    if (!Number.isInteger(amount) || amount < 1 || amount > 10_000_000) throw new Error('montant invalide');
    result = { amount, players: (cmd.to !== undefined ? [cmd.to] : [...online()]).map((name) => ({ name, coins: games.gift(name, amount) })) };
  } catch (e) { result = { error: e.message }; }
  fs.rmSync(file, { force: true });
  fs.writeFileSync(path.join(DATA_DIR, 'admin-result.json'), JSON.stringify(result), { mode: 0o600 });
});

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => { geo.close(); games.shutdown(); saveNow(); process.exit(0); });
}
