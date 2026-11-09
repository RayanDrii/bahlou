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

