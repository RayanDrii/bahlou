'use strict';

/* ============================================================ état */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const MAIN_CONV = 'c:general'; // le Salon
let CONV = MAIN_CONV;       // la conversation affichée : le Salon ou un message privé
const state = {
  me: null,
  users: [],
  messages: [],
  more: false,
  seen: 0,
  unread: 0,
  typing: {},
  fresh: new Set(),
  newBelow: 0,
  sound: true,
  reply: null,
  image: null,
  convs: {},   // messages privés : conv -> { other, unread, ts }
};
const QUICK = ['👍', '❤️', '😂', '😮', '🔥', '🎉'];
const mobile = matchMedia('(max-width: 760px)');

const store = {
  get(k, d) { try { const v = localStorage.getItem('bahlou.' + k); return v === null ? d : JSON.parse(v); } catch { return d; } },
  set(k, v) { try { localStorage.setItem('bahlou.' + k, JSON.stringify(v)); } catch {} },
};
state.seen = store.get('seen1', 0);
state.sound = store.get('sound', true);

/* ============================================================ API */
async function api(method, url, body) {
  const res = await fetch(url, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error(data.error || 'Erreur réseau'), { status: res.status });
  return data;
}

/* ============================================================ helpers */
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const userOf = (name) => state.users.find((u) => u.name === name) || {};
const isOnline = (name) => !!userOf(name).online;
const initials = (name) => {
  const parts = name.split(/[._-]+/).filter(Boolean);
  return (parts.length > 1 ? parts[0][0] + parts[1][0] : name.replace(/[^a-z0-9]/gi, '').slice(0, 2)) || '?';
};

function avatar(name, size = '', dot = false) {
  const el = document.createElement('div');
  el.className = 'avatar ' + size;
  el.textContent = initials(name);
  if (userOf(name).frame) el.classList.add(userOf(name).frame);
  const v = userOf(name).avatar;
  if (v) {
    const img = new Image();
    img.alt = '';
    img.src = `/avatars/${encodeURIComponent(name)}.jpg?v=${v}`;
    img.onerror = () => img.remove();
    el.appendChild(img);
  }
  if (dot) {
    const d = document.createElement('span');
    d.className = 'dot' + (isOnline(name) ? ' on' : '');
    el.appendChild(d);
  }
  return el;
}

function format(text) {
  const blocks = [];
  let s = text.replace(/```(?:[\w+-]*\n)?([\s\S]*?)```/g, (_, code) => {
    blocks.push(`<pre>${esc(code.replace(/^\n|\n$/g, ''))}</pre>`);
    return `\u0000${blocks.length - 1}\u0000`;
  });
  s = esc(s)
    .replace(/`([^`\n]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[\s(])_([^_\n]+)_(?=$|[\s).,!?])/g, '$1<em>$2</em>')
    .replace(/~~([^~\n]+)~~/g, '<s>$1</s>')
    .replace(/\bhttps?:\/\/[^\s<]+[^\s<.,;:!?)\]'"]/g, (u) => `<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`)
    .replace(/(^|\s)@([a-z0-9._-]{2,24})/gi, (m, pre, n) =>
      state.users.some((u) => u.name === n.toLowerCase()) ? `${pre}<span class="at">@${n}</span>` : m);
  return s.replace(/\u0000(\d+)\u0000/g, (_, i) => blocks[i]);
}
const onlyEmoji = (t) => /^(?:\p{Extended_Pictographic}(?:️|\p{Emoji_Modifier}|‍\p{Extended_Pictographic})*\s*){1,3}$/u.test(t.trim());
const mentionsMe = (t) => new RegExp(`(^|\\s)@${state.me.replace(/[.]/g, '\\.')}(?![a-z0-9._-])`, 'i').test(t);

const fmtTime = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit' });
const fmtDay = new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
const sameDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();
function dayLabel(ts) {
  if (sameDay(ts, Date.now())) return "Aujourd'hui";
  if (sameDay(ts, Date.now() - 864e5)) return 'Hier';
  const s = fmtDay.format(ts);
  return s[0].toUpperCase() + s.slice(1);
}

/* ============================================================ photo : recadrage carré 256px */
function readPhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith('image/')) return reject(new Error('Choisis une image.'));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const size = 256, side = Math.min(img.width, img.height);
      const c = Object.assign(document.createElement('canvas'), { width: size, height: size });
      const ctx = c.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(c.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible.')); };
    img.src = url;
  });
}
const uploadPhoto = (dataUrl) => api('POST', '/api/avatar', { image: dataUrl });

/* ============================================================ toasts & son */
function toast(msg, err = false) {
  const t = document.createElement('div');
  t.className = 'toast' + (err ? ' err' : '');
  t.textContent = msg;
  $('#toasts').appendChild(t);
  setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 300); }, 3200);
}
let actx = null;
function ding() {
  if (!state.sound) return;
  try {
    actx ||= new (window.AudioContext || window.webkitAudioContext)();
    const now = actx.currentTime;
    [[880, 0], [1320, .09]].forEach(([f, d]) => {
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0, now + d);
      g.gain.linearRampToValueAtTime(.12, now + d + .015);
      g.gain.exponentialRampToValueAtTime(.0001, now + d + .35);
      o.connect(g).connect(actx.destination);
      o.start(now + d);
      o.stop(now + d + .4);
    });
  } catch {}
}

/* ============================================================ connexion / inscription */
let authMode = 'login';
let regPhoto = null;
const AUTH_TEXT = {
  login: ['Connexion', 'Sur invitation uniquement.', 'Entrer'],
  register: ['Inscription', "Le code d'invitation vous est remis par l'admin.", 'Créer mon compte'],
};
$$('.seg-btn').forEach((b) => b.addEventListener('click', () => {
  authMode = b.dataset.mode;
  $('.seg').dataset.mode = authMode;
  $$('.seg-btn').forEach((x) => x.classList.toggle('active', x === b));
  $$('.register-only').forEach((el) => (el.hidden = authMode !== 'register'));
  $('#auth-form [name=password]').autocomplete = authMode === 'register' ? 'new-password' : 'current-password';
  const [t, s, c] = AUTH_TEXT[authMode];
  $('#auth-title').textContent = t;
  $('#auth-sub').textContent = s;
  $('#auth-submit .cta-label').textContent = c;
  $('#auth-error').textContent = '';
}));
$('#eye').addEventListener('click', () => {
  const p = $('#auth-form [name=password]');
  p.type = p.type === 'password' ? 'text' : 'password';
  $('#eye').classList.toggle('on', p.type === 'text');
});
$('#reg-file').addEventListener('change', async (e) => {
  try {
    regPhoto = await readPhoto(e.target.files[0]);
    $('#reg-avatar').innerHTML = `<img src="${regPhoto}" alt="">`;
  } catch (err) { $('#auth-error').textContent = err.message; }
  e.target.value = '';
});

$('#auth-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target));
  const err = $('#auth-error');
  err.textContent = '';
  if ((data.username || '').trim().length < 2) return (err.textContent = 'Choisis un pseudo (2 caractères min).');
  if ((data.password || '').length < 6) return (err.textContent = 'Mot de passe : 6 caractères minimum.');
  if (authMode === 'register' && !(data.invite || '').trim()) return (err.textContent = "Il manque le code d'invitation.");
  const btn = $('#auth-submit');
  btn.classList.add('loading');
  btn.disabled = true;
  try {
    await api('POST', '/api/' + authMode, data);
    if (authMode === 'register' && regPhoto) await uploadPhoto(regPhoto).catch(() => toast("La photo n'a pas pu être envoyée", true));
    e.target.reset();
    await start();
  } catch (ex) {
    requestAnimationFrame(() => (err.textContent = ex.message));
  } finally {
    btn.classList.remove('loading');
    btn.disabled = false;
  }
});

/* ============================================================ démarrage */
async function start() {
  let s;
  try { s = await api('GET', '/api/state'); }
  catch { $('#auth').hidden = false; $('#app').hidden = true; $('#auth-form [name=username]').focus(); return; }

  state.me = s.me;
  state.users = s.users;
  state.admin = !!s.admin;
  initConvs(s.last);
  $('#tab-admin').hidden = !state.admin;
  $('#auth').hidden = true;
  $('#app').hidden = false;
  setMembers(store.get('members', innerWidth >= 1280));
  renderPeople();
  connect();
  await loadMessages();
  await Club.init();
  Call.init();
  Work.checkReminders();
  setInterval(Work.checkReminders, 30 * 60e3);
  if (s.alert) showAlert(s.alert);
  if ('Notification' in window && Notification.permission === 'default') {
    document.addEventListener('click', () => Notification.requestPermission(), { once: true });
  }
}

async function loadMessages() {
  try {
    const r = await api('GET', '/api/messages?conv=' + encodeURIComponent(CONV));
    state.messages = r.messages;
    state.more = r.more;
  } catch (e) { toast(e.message, true); return; }
  renderMessages('bottom');
  markSeen();
  if (matchMedia('(pointer: fine)').matches) $('#input').focus();
}

async function loadMore() {
  if (state.messages.length > state.show) { state.show += 70; renderMessages('top'); return; }
  if (!state.more || !state.messages.length) return;
  const r = await api('GET', `/api/messages?conv=${encodeURIComponent(CONV)}&before=${state.messages[0].id}`);
  state.messages = r.messages.concat(state.messages);
  state.more = r.more;
  state.show += r.messages.length;
  renderMessages('top');
}

/* ============================================================ temps réel */
/* même interface qu'EventSource, sur WebSocket, avec reconnexion automatique */
function createLive() {
  const handlers = new Map();
  const live = { onopen: null, onerror: null, addEventListener(ev, f) { if (!handlers.has(ev)) handlers.set(ev, []); handlers.get(ev).push(f); } };
  let ws = null, last = 0;
  function open() {
    ws = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/api/ws`);
    ws.onopen = () => { last = Date.now(); live.onopen?.(); };
    ws.onmessage = (e) => {
      last = Date.now();
      const m = JSON.parse(e.data);
      if (m.e === 'ping') return;
      (handlers.get(m.e) || []).forEach((f) => f({ data: JSON.stringify(m.d) }));
    };
    ws.onclose = () => { live.onerror?.(); setTimeout(open, 1500); };
  }
  setInterval(() => { if (ws?.readyState === 1 && Date.now() - last > 50000) ws.close(); }, 10000);
  open();
  return live;
}

function connect() {
  const es = createLive();
  let wasDown = false;
  es.onopen = () => {
    $('#conn').classList.remove('off');
    if (wasDown) { wasDown = false; resync(); }
  };
  es.onerror = () => {
    wasDown = true;
    $('#conn').classList.add('off');
    api('GET', '/api/me').then((r) => { if (!r.user) location.reload(); }).catch(() => {});
  };
  es.addEventListener('users', (e) => {
    const look = (list) => JSON.stringify(list.map(({ online, ...u }) => u));
    const before = look(state.users || []);
    state.users = JSON.parse(e.data);
    renderPeople();
    if (look(state.users) !== before) renderMessages('keep'); // une photo ou un badge a changé
  });
  Club.bind(es);
  Geo.bind(es);
  Call.bind(es);
  es.addEventListener('poll', (e) => { const d = JSON.parse(e.data); const m = state.messages.find((x) => x.id === d.id); if (m) { m.poll = d.poll; renderMessages('keep'); } });
  es.addEventListener('message', (e) => onMessage(JSON.parse(e.data)));
  es.addEventListener('typing', (e) => onTyping(JSON.parse(e.data)));
  es.addEventListener('alert', (e) => showAlert(JSON.parse(e.data)));
  es.addEventListener('reaction', (e) => {
    const { id, reactions } = JSON.parse(e.data);
    const m = state.messages.find((x) => x.id === id);
    if (m) { m.reactions = reactions; renderMessages('keep'); }
  });
  es.addEventListener('delete', (e) => {
    const { id } = JSON.parse(e.data);
    state.messages = state.messages.filter((x) => x.id !== id);
    renderMessages('keep');
  });
}
async function resync() {
  try {
    const s = await api('GET', '/api/state');
    state.users = s.users;
    renderPeople();
    await loadMessages();
    await Club.refresh();
    Geo.refresh();
    Call.refresh();
  } catch {}
}

/* ============================================================ messages privés */
const dmId = (a, b) => 'd:' + [a, b].sort().join('|');
function convOf(conv) {
  if (conv === MAIN_CONV) return null;
  if (!state.convs[conv]) {
    const [a, b] = conv.slice(2).split('|');
    if (a !== state.me && b !== state.me) return null;
    state.convs[conv] = { other: a === state.me ? b : a, unread: 0, ts: 0 };
  }
  return state.convs[conv];
}
function initConvs(last = {}) {
  for (const [conv, m] of Object.entries(last)) {
    const c = convOf(conv);
    if (!c) continue;
    c.ts = m.ts;
    if (m.from !== state.me && m.id > store.get('seen:' + conv, 0)) c.unread = 1;
  }
  renderConvs();
}
function bumpUnread(conv) {
  if (conv === MAIN_CONV) state.unread++;
  else { const c = convOf(conv); if (c) c.unread++; }
  updateTitle();
  renderConvs();
}
function renderConvs() {
  const bar = $('#conv-bar');
  if (!bar) return;
  const list = Object.entries(state.convs).sort((a, b) => b[1].ts - a[1].ts);
  const badge = (n, on) => (n && !on ? `<i>${n}</i>` : '');
  bar.innerHTML = `<button type="button" class="cv ${CONV === MAIN_CONV ? 'on' : ''}" data-conv="${MAIN_CONV}"><b>Salon</b>${badge(state.unread, CONV === MAIN_CONV)}</button>`
    + list.map(([id, c]) => `<button type="button" class="cv ${id === CONV ? 'on' : ''}" data-conv="${esc(id)}"><span class="cv-av"></span><b>${esc(c.other)}</b>${badge(c.unread, id === CONV)}</button>`).join('')
    + '<button type="button" class="cv cv-new" id="cv-new">+ Message privé</button>';
  bar.querySelectorAll('[data-conv]').forEach((b) => {
    b.onclick = () => openConv(b.dataset.conv);
    const av = b.querySelector('.cv-av');
    if (av) av.replaceWith(avatar(state.convs[b.dataset.conv].other, 'xs'));
  });
  $('#cv-new').onclick = () => { setMembers(true); toast('Choisis un membre pour lui écrire en privé.'); };
}
function paintChatHead() {
  const c = convOf(CONV), h = $('.chat-id h2');
  if (!c) {
    h.textContent = 'Le Salon';
    const on = state.users.filter((u) => u.online);
    $('#chat-sub').innerHTML = `${on.length} en ligne · ${state.users.length} membre${state.users.length > 1 ? 's' : ''}`;
    $('#input').placeholder = 'Écrire au Salon';
  } else {
    h.textContent = c.other;
    $('#chat-sub').textContent = `Message privé · ${userOf(c.other).online ? 'en ligne' : 'hors ligne'}`;
    $('#input').placeholder = `Écrire à ${c.other}`;
  }
  $('#chat-view').classList.toggle('is-dm', !!c);
}
async function openConv(conv) {
  if (conv !== MAIN_CONV && !convOf(conv)) return;
  if (conv !== CONV) {
    CONV = conv;
    state.messages = []; state.more = false; state.show = 70; state.newBelow = 0;
    state.reply = null; state.image = null; paintExtra();
    Object.keys(state.typing).forEach(clearTyping);
    paintChatHead(); renderConvs(); renderMessages('bottom');
  }
  if (!Club.inChat()) location.hash = '#/chat';
  await loadMessages();
}
window.openConv = openConv;
function onOtherConv(m) {
  const mine = m.from === state.me;
  if (m.conv === MAIN_CONV) {
    if (!mine && !m.sys) { bumpUnread(MAIN_CONV); if (mentionsMe(m.text)) notify(m); }
    return;
  }
  const c = convOf(m.conv);
  if (!c) return;
  c.ts = m.ts;
  if (!mine) { bumpUnread(m.conv); notify(m); if (!document.hidden) Club.peek({ ...m, text: msgPreview(m) }); }
  renderConvs();
}

function onMessage(m) {
  if (m.conv !== CONV) return onOtherConv(m);
  if (state.messages.some((x) => x.id === m.id)) return;
  if (CONV !== MAIN_CONV) { convOf(CONV).ts = m.ts; renderConvs(); }
  state.messages.push(m);
  state.fresh.add(m.id);
  clearTyping(m.from);
  const mine = m.from === state.me;
  const box = $('#messages');
  const near = box.scrollHeight - box.scrollTop - box.clientHeight < 160;
  if (!near && !mine) state.show = (state.show || 70) + 1; // garde ce qu'on est en train de lire à sa place
  renderMessages(near || mine ? 'smooth' : 'keep');
  if (!near && !mine) { state.newBelow++; updateToBottom(); }

  if (mine || (!document.hidden && Club.inChat())) markSeen();
  else bumpUnread(CONV);
  if (!mine && !m.sys) {
    notify(m);
    if (!Club.inChat() && !document.hidden) Club.peek({ ...m, text: msgPreview(m) });
  }
}

const msgPreview = (m) => m.text || (m.image ? 'Image' : m.poll ? `Sondage : ${m.poll.q}` : '');
function notify(m) {
  const mention = mentionsMe(m.text), dm = !!m.conv && m.conv !== MAIN_CONV;
  const away = document.hidden || !document.hasFocus();
  if (away || mention || (dm && m.conv !== CONV) || !Club.inChat()) ding();
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  if (!away && !mention) return;
  const n = new Notification(dm ? `Message privé de ${m.from}` : mention ? `${m.from} t'a mentionné` : m.from, { body: msgPreview(m).slice(0, 160), icon: '/icon.png', tag: 'bahlou' });
  n.onclick = () => { window.focus(); n.close(); };
}
function updateTitle() {
  const total = state.unread + Object.values(state.convs).reduce((t, c) => t + c.unread, 0);
  document.title = total ? `(${total}) Bahlou` : 'Bahlou';
  Club.badge(total);
}
function markSeen() {
  const last = state.messages[state.messages.length - 1];
  if (CONV === MAIN_CONV) {
    if (last && last.id > state.seen) { state.seen = last.id; store.set('seen1', state.seen); }
    state.unread = 0;
  } else {
    const c = convOf(CONV);
    if (c) { if (last) store.set('seen:' + CONV, last.id); c.unread = 0; }
  }
  updateTitle();
  renderConvs();
}
document.addEventListener('visibilitychange', () => { if (!document.hidden && Club.inChat()) markSeen(); });

/* ============================================================ « écrit… » */
function onTyping({ user, conv }) {
  if (user === state.me || (conv && conv !== CONV)) return;
  clearTimeout(state.typing[user]);
  state.typing[user] = setTimeout(() => clearTyping(user), 4000);
  renderTyping();
}
function clearTyping(user) {
  if (state.typing[user]) { clearTimeout(state.typing[user]); delete state.typing[user]; renderTyping(); }
}
function renderTyping() {
  const who = Object.keys(state.typing);
  const el = $('#typing');
  if (!who.length) return (el.innerHTML = '');
  const txt = who.length === 1 ? `<b>${esc(who[0])}</b> écrit`
    : who.length < 4 ? `<b>${who.map(esc).join(', ')}</b> écrivent`
    : '<b>Plusieurs personnes</b> écrivent';
  el.innerHTML = `<span class="typing-dots"><span></span><span></span><span></span></span><span>${txt}…</span>`;
}

/* ============================================================ en-tête, membres, profil */
function renderPeople() {
  const on = state.users.filter((u) => u.online);
  paintChatHead();
  $('#rail-name').textContent = state.me;
  const pile = $('#facepile');
  pile.replaceChildren(...on.slice(0, 5).map((u) => { const a = avatar(u.name, 'sm'); a.title = u.name; return a; }));
  if (on.length > 5) pile.insertAdjacentHTML('beforeend', `<span class="more">+${on.length - 5}</span>`);
  $('#me-btn').replaceChildren(avatar(state.me, 'sm'));

  const box = $('#member-list');
  const sorted = (l) => l.sort((a, b) => (a.name === state.me ? -1 : b.name === state.me ? 1 : a.name.localeCompare(b.name)));
  const off = state.users.filter((u) => !u.online);
  box.innerHTML = '';
  for (const [title, list] of [[`En ligne — ${on.length}`, sorted([...on])], [`Hors ligne — ${off.length}`, sorted(off)]]) {
    if (!list.length) continue;
    box.insertAdjacentHTML('beforeend', `<div class="side-title">${title}</div>`);
    for (const u of list) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'member' + (u.online ? '' : ' off');
      b.appendChild(avatar(u.name, 'sm', true));
      b.insertAdjacentHTML('beforeend', `<div><strong>${esc(u.name)}${u.name === state.me ? ' <span class="muted">(toi)</span>' : ''}</strong>
        <small class="${u.online ? 'on' : ''}">${u.online ? 'En ligne' : 'Hors ligne'}</small></div>`);
      b.title = u.name === state.me ? 'Mon profil' : `Écrire en privé à ${u.name}`;
      if (u.name !== state.me) b.insertAdjacentHTML('beforeend', `<span class="m-at" title="Mentionner ${esc(u.name)} au Salon">@</span>`);
      b.addEventListener('click', async (e) => {
        if (u.name === state.me) return openProfile();
        if (innerWidth < 1000) setMembers(false);
        if (e.target.closest('.m-at')) { await openConv(MAIN_CONV); insertAtCursor(`@${u.name} `); }
        else openConv(dmId(state.me, u.name));
      });
      box.appendChild(b);
    }
  }

  $('#profile-avatar').replaceChildren(avatar(state.me, 'xl'));
  $('#profile-name').textContent = state.me;
  $('#pfp-remove').hidden = !userOf(state.me).avatar;
}

function setMembers(on) {
  $('#app').classList.toggle('show-members', on);
  $('#toggle-members').classList.toggle('on', on);
  store.set('members', on);
}
$('#toggle-members').addEventListener('click', () => setMembers(!$('#app').classList.contains('show-members')));
$('#close-members').addEventListener('click', () => setMembers(false));
$('#facepile').addEventListener('click', () => setMembers(true));

const profile = $('#profile');
function openProfile() {
  $('#sound-label').textContent = state.sound ? 'Sons activés' : 'Sons coupés';
  profile.hidden = false;
}
$('#me-btn').addEventListener('click', openProfile);
$('#profile-close').addEventListener('click', () => (profile.hidden = true));
profile.addEventListener('mousedown', (e) => { if (e.target === profile) profile.hidden = true; });
$('#pfp-change').addEventListener('click', () => $('#profile-file').click());
$('#profile-file').addEventListener('change', async (e) => {
  try {
    const data = await readPhoto(e.target.files[0]);
    await uploadPhoto(data);
    toast('Photo mise à jour !');
  } catch (err) { toast(err.message, true); }
  e.target.value = '';
});
$('#pfp-remove').addEventListener('click', async () => {
  try { await uploadPhoto(null); toast('Photo retirée'); } catch (err) { toast(err.message, true); }
});
$('#sound-toggle').addEventListener('click', () => {
  state.sound = !state.sound;
  store.set('sound', state.sound);
  $('#sound-label').textContent = state.sound ? 'Sons activés' : 'Sons coupés';
  if (state.sound) ding();
});
$('#logout').addEventListener('click', async () => {
  await api('POST', '/api/logout').catch(() => {});
  location.reload();
});

/* ============================================================ messages */
function renderMessages(scroll) {
  if ($('#chat-view').hidden) { state.fresh.clear(); return; } // le Salon sera dessiné en y revenant
  if (scroll === 'bottom' || !state.show) state.show = 70;
  const shown = state.messages.slice(-state.show); // les plus anciens restent chargeables à la demande
  const box = $('#messages');
  const prevH = box.scrollHeight, prevTop = box.scrollTop;
  const frag = document.createDocumentFragment();
  frag.appendChild(Object.assign(document.createElement('div'), { className: 'spacer' }));

  if (state.more || state.messages.length > state.show) {
    const b = Object.assign(document.createElement('button'), { className: 'load-more', textContent: '↑ Messages précédents' });
    b.onclick = loadMore;
    frag.appendChild(b);
  }
  if (!state.messages.length) {
    const w = document.createElement('div');
    w.className = 'welcome';
    w.innerHTML = `<h3>Le Salon</h3><p>Personne n'a encore pris la parole.</p>`;
    frag.appendChild(w);
  }

  let group = null, prev = null;
  for (const m of shown) {
    if (!prev || !sameDay(prev.ts, m.ts)) {
      frag.appendChild(Object.assign(document.createElement('div'), { className: 'day', textContent: dayLabel(m.ts) }));
      group = null;
    }
    if (m.sys) {
      const s = document.createElement('div');
      s.className = 'sys-row' + (state.fresh.has(m.id) ? ' new' : '');
      s.innerHTML = format(m.text);
      frag.appendChild(s);
      group = null; prev = m;
      continue;
    }
    if (!group || prev.from !== m.from || m.ts - prev.ts > 5 * 60e3) {
      group = makeGroup(m.from);
      frag.appendChild(group.el);
    }
    group.body.appendChild(makeRow(m));
    prev = m;
  }

  box.replaceChildren(frag);
  state.fresh.clear();
  if (scroll === 'bottom') box.scrollTop = box.scrollHeight;
  else if (scroll === 'smooth') box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' });
  else if (scroll === 'top') box.scrollTop = box.scrollHeight - prevH + prevTop;
  else box.scrollTop = prevTop;
}

function makeGroup(from) {
  const el = document.createElement('div');
  const me = from === state.me;
  el.className = 'group' + (me ? ' me' : '');
  const av = document.createElement('div');
  av.className = 'g-av';
  if (!me) av.appendChild(avatar(from, 'sm'));
  const body = document.createElement('div');
  body.className = 'g-body';
  if (!me) {
    const u = userOf(from);
    const head = document.createElement('div');
    head.className = 'g-head';
    const n = document.createElement('span');
    n.className = 'g-name' + (u.color ? ' ' + u.color : '');
    n.textContent = from;
    head.appendChild(n);
    if (u.level > 1) head.insertAdjacentHTML('beforeend', `<span class="lvl-chip">Niv. ${u.level}</span>`);
    if (u.title) head.insertAdjacentHTML('beforeend', `<span class="u-title">${esc(u.title)}</span>`);
    body.appendChild(head);
  }
  el.append(av, body);
  return { el, body };
}

const TRASH = '<span class="x">×</span>';
function pollHtml(m) {
  const total = m.poll.options.reduce((t, o) => t + o.votes.length, 0);
  return `<div class="poll"><h4>${esc(m.poll.q)}</h4>${m.poll.options.map((o, i) => `<button type="button" data-poll="${m.id}" data-i="${i}" class="${o.votes.includes(state.me) ? 'mine' : ''}" title="${esc(o.votes.join(', '))}"><i style="width:${total ? (o.votes.length / total) * 100 : 0}%"></i><span>${esc(o.t)}</span><em>${o.votes.length}</em></button>`).join('')}<small>${total} vote${total > 1 ? 's' : ''}</small></div>`;
}

function makeRow(m) {
  const row = document.createElement('div');
  const mine = m.from === state.me;
  row.dataset.mid = m.id;
  row.className = 'row'
    + (state.fresh.has(m.id) ? ' new' : '')
    + (m.text && !m.image && !m.reply && !m.poll && onlyEmoji(m.text) ? ' only-emoji' : '')
    + (!mine && mentionsMe(m.text) ? ' mention' : '');

  const bubble = document.createElement('div');
  bubble.className = 'bubble';
  const quote = m.reply ? `<button type="button" class="quote" data-to="${m.reply.id}"><b>${esc(m.reply.from)}</b><span>${esc(m.reply.text)}</span></button>` : '';
  const image = m.image ? `<img class="msg-img" src="/uploads/${esc(m.image)}" alt="Image envoyée" loading="lazy">` : '';
  bubble.innerHTML = quote + image + (m.poll ? pollHtml(m) : '') + format(m.text) + `<span class="stamp">${fmtTime.format(m.ts)}</span>`;
  bubble.title = new Date(m.ts).toLocaleString('fr-FR');
  row.appendChild(bubble);

  const bar = document.createElement('div');
  bar.className = 'actions';
  const rb = Object.assign(document.createElement('button'), { type: 'button', textContent: '↩', title: 'Répondre' });
  rb.onclick = () => setReply(m);
  bar.appendChild(rb);
  for (const e of QUICK) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = e;
    b.title = 'Réagir ' + e;
    b.onclick = () => react(m, e);
    bar.appendChild(b);
  }
  if ((mine || state.admin)) {
    bar.insertAdjacentHTML('beforeend', '<span class="sep"></span>');
    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'danger';
    del.title = 'Supprimer';
    del.innerHTML = TRASH;
    del.onclick = () => {
      if (!del.dataset.armed) {
        del.dataset.armed = '1';
        del.innerHTML = '✓';
        del.title = 'Clique encore pour confirmer';
        bar.classList.add('open');
        setTimeout(() => { if (del.isConnected) { delete del.dataset.armed; bar.classList.remove('open'); del.innerHTML = TRASH; } }, 2500);
        return;
      }
      api('POST', '/api/delete', { conv: CONV, id: m.id }).catch((e) => toast(e.message, true));
    };
    bar.appendChild(del);
  }
  row.appendChild(bar);

  const reactions = Object.entries(m.reactions || {});
  if (reactions.length) {
    const wrap = document.createElement('div');
    wrap.className = 'reacts';
    for (const [e, users] of reactions) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'react' + (users.includes(state.me) ? ' mine' : '');
      b.innerHTML = `<span>${e}</span><span>${users.length}</span>`;
      b.title = users.join(', ');
      b.onclick = () => react(m, e);
      wrap.appendChild(b);
    }
    row.appendChild(wrap);
  }
  return row;
}

async function react(m, emoji) {
  try {
    const { reactions } = await api('POST', '/api/react', { conv: CONV, id: m.id, emoji });
    m.reactions = reactions;
    renderMessages('keep');
  } catch (e) { toast(e.message, true); }
}

const box = $('#messages');
function updateToBottom() {
  const away = box.scrollHeight - box.scrollTop - box.clientHeight > 300;
  if (!away) state.newBelow = 0;
  $('#to-bottom').classList.toggle('show', away);
  $('#to-bottom-count').textContent = state.newBelow || '';
}
box.addEventListener('scroll', updateToBottom, { passive: true });
$('#to-bottom').addEventListener('click', () => box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' }));

/* ============================================================ zone d'écriture */
const input = $('#input');
function autosize() {
  input.style.height = 'auto';
  input.style.height = Math.min(input.scrollHeight, 220) + 'px';
  $('#send').disabled = !input.value.trim() && !state.image;
}
let lastTyping = 0;
input.addEventListener('input', () => {
  autosize();
  if (input.value.trim() && Date.now() - lastTyping > 2500) {
    lastTyping = Date.now();
    api('POST', '/api/typing', { conv: CONV }).catch(() => {});
  }
});
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && !mobile.matches) {
    e.preventDefault();
    $('#composer').requestSubmit();
  }
});
function paintExtra() {
  const box = $('#compose-extra');
  box.hidden = !state.reply && !state.image;
  box.replaceChildren();
  if (state.image) box.insertAdjacentHTML('beforeend', `<img src="${state.image}" alt=""><span>Image prête à envoyer</span><button type="button" data-x="image">Retirer</button>`);
  if (state.reply) box.insertAdjacentHTML('beforeend', `<span>Réponse à <b>${esc(state.reply.from)}</b> : ${esc(msgPreview(state.reply))}</span><button type="button" data-x="reply">Annuler</button>`);
  autosize();
}
$('#compose-extra').addEventListener('click', (e) => {
  const k = e.target.dataset?.x;
  if (k) { state[k] = null; paintExtra(); }
});
function setReply(m) { state.reply = m; paintExtra(); input.focus(); }

async function pickImage(file) {
  if (!file || !file.type.startsWith('image/')) return toast('Ce fichier n’est pas une image.', true);
  try {
    let data;
    if (file.type === 'image/gif') {
      if (file.size > 4 * 1024 * 1024) return toast('GIF trop lourd (4 Mo maximum).', true);
      data = await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(file); });
    } else {
      const bmp = await createImageBitmap(file);
      const k = Math.min(1, 1800 / Math.max(bmp.width, bmp.height));
      const c = Object.assign(document.createElement('canvas'), { width: Math.round(bmp.width * k), height: Math.round(bmp.height * k) });
      const g = c.getContext('2d');
      g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height);
      g.drawImage(bmp, 0, 0, c.width, c.height);
      data = c.toDataURL('image/jpeg', 0.86);
    }
    state.image = data;
    paintExtra();
    input.focus();
  } catch { toast('Image illisible.', true); }
}
$('#attach-btn').addEventListener('click', () => $('#attach-file').click());
$('#attach-file').addEventListener('change', (e) => { pickImage(e.target.files[0]); e.target.value = ''; });
input.addEventListener('paste', (e) => {
  const f = [...(e.clipboardData?.files || [])].find((x) => x.type.startsWith('image/'));
  if (f) { e.preventDefault(); pickImage(f); }
});
const chatView = $('#chat-view');
chatView.addEventListener('dragover', (e) => { e.preventDefault(); chatView.classList.add('drag'); });
chatView.addEventListener('dragleave', (e) => { if (!chatView.contains(e.relatedTarget)) chatView.classList.remove('drag'); });
chatView.addEventListener('drop', (e) => { e.preventDefault(); chatView.classList.remove('drag'); pickImage(e.dataTransfer.files[0]); });

box.addEventListener('click', (e) => {
  const q = e.target.closest('.quote');
  if (q) {
    const row = box.querySelector(`[data-mid="${q.dataset.to}"]`);
    if (row) { row.scrollIntoView({ block: 'center', behavior: 'smooth' }); row.classList.add('flash'); setTimeout(() => row.classList.remove('flash'), 1500); }
    return;
  }
  const v = e.target.closest('[data-poll]');
  if (v) { api('POST', '/api/poll/vote', { conv: CONV, id: Number(v.dataset.poll), i: Number(v.dataset.i) }).catch((err) => toast(err.message, true)); return; }
  if (e.target.matches('.msg-img')) { const l = $('#lightbox'); l.innerHTML = `<img src="${esc(e.target.src)}" alt="">`; l.hidden = false; }
});
box.addEventListener('load', (e) => { if (e.target.matches?.('.msg-img') && box.scrollHeight - box.scrollTop - box.clientHeight < 500) box.scrollTop = box.scrollHeight; }, true);
$('#lightbox').addEventListener('click', () => { $('#lightbox').hidden = true; });

/* sondages */
function pollField() { $('#poll-opts').insertAdjacentHTML('beforeend', '<input maxlength="80" placeholder="Un choix">'); }
$('#poll-btn').addEventListener('click', () => {
  $('#poll-form').reset();
  $('#poll-opts').replaceChildren();
  pollField(); pollField();
  $('#poll-modal').hidden = false;
  $('#poll-form [name=q]').focus();
});
$('#poll-close').addEventListener('click', () => { $('#poll-modal').hidden = true; });
$('#poll-add').addEventListener('click', () => { if ($('#poll-opts').children.length < 6) pollField(); });
$('#poll-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const options = [...$('#poll-opts').querySelectorAll('input')].map((x) => x.value.trim()).filter(Boolean);
  try {
    const { message } = await api('POST', '/api/poll', { conv: CONV, q: e.target.q.value, options });
    $('#poll-modal').hidden = true;
    onMessage(message);
  } catch (err) { toast(err.message, true); }
});

$('#composer').addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = input.value.trim(), picture = state.image, reply = state.reply;
  if (!text && !picture) return;
  input.value = '';
  state.image = null; state.reply = null;
  paintExtra();
  lastTyping = 0;
  closePopovers();
  try {
    const image = picture ? (await api('POST', '/api/upload', { image: picture })).name : null;
    const { message } = await api('POST', '/api/messages', { conv: CONV, text, reply: reply ? reply.id : null, image });
    onMessage(message);
  } catch (err) {
    input.value = text;
    state.image = picture; state.reply = reply;
    paintExtra();
    toast('Message pas envoyé : ' + err.message, true);
  }
  input.focus();
});

const EMOJIS = {
  'Fréquents': '😂 🤣 😭 😅 😊 😍 🥰 😎 🤔 🙄 😴 🥲 😤 😡 🤯 🥶 🤡 💀 👀 🙏 👍 👎 👏 🙌 💪 🤝 ✌️ 🫡 ❤️ 🔥 💯 ✨',
  'Visages': '😀 😃 😄 😁 😆 🙂 🙃 😉 😇 🤩 😘 😋 😛 😜 🤪 🤑 🤗 🤭 🤫 🤐 😐 😑 😶 😏 😒 😬 😌 😔 😪 🤤 😷 🤒 🥵 🥴 😵 🤠 🥳 🤓 🧐 😕 😟 😮 😲 😳 🥺 😨 😰 😢 😱 😖 😣 😞 😓 😩 😫 🥱 👻 👽 🤖 💩',
  'Gestes': '👋 🤚 ✋ 🖖 👌 🤌 🤏 🤞 🤟 🤘 🤙 👈 👉 👆 👇 ☝️ ✊ 👊 🤛 🤜 🫶 👐 🤲 ✍️ 💅 🧠 🫀',
  'Objets': '💻 🖥️ ⌨️ 🖱️ 💾 📱 🔋 🔌 💡 📚 📝 ✏️ 📌 📎 🔒 🔑 🛠️ ⚙️ 🧪 🐛 🚀 🎮 🎧 🎵 ☕ 🍕 🍔 🍟 🌮 🍜 🍩 🍺 🎉 🎂 🏆 ⚽ 🏀',
  'Symboles': '💜 💙 💚 💛 🧡 🤍 🖤 💔 ❗ ❓ ⚠️ ✅ ❌ ⭐ 🌟 ⚡ 💥 💫 🎯 📈 📉 ⏰ 🆗 🆘 💤',
};
function buildEmojiPop() {
  const pop = $('#emoji-pop');
  for (const [cat, list] of Object.entries(EMOJIS)) {
    pop.insertAdjacentHTML('beforeend', `<div class="cat">${cat}</div>`);
    for (const e of list.split(' ')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = e;
      b.onclick = () => insertAtCursor(e);
      pop.appendChild(b);
    }
  }
}
function insertAtCursor(t) {
  const s = input.selectionStart ?? input.value.length, e = input.selectionEnd ?? s;
  input.value = input.value.slice(0, s) + t + input.value.slice(e);
  input.selectionStart = input.selectionEnd = s + t.length;
  input.focus();
  autosize();
}
$('#emoji-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  const pop = $('#emoji-pop');
  if (!pop.children.length) buildEmojiPop();
  pop.hidden = !pop.hidden;
  $('#emoji-btn').classList.toggle('on', !pop.hidden);
});
$('#emoji-pop').addEventListener('click', (e) => e.stopPropagation());
function closePopovers() {
  $('#emoji-pop').hidden = true;
  $('#emoji-btn').classList.remove('on');
}
document.addEventListener('click', closePopovers);
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (!$('#lightbox').hidden) $('#lightbox').hidden = true;
  else if (!$('#poll-modal').hidden) $('#poll-modal').hidden = true;
  else if (state.reply || state.image) { state.reply = null; state.image = null; paintExtra(); }
  else if (!profile.hidden) profile.hidden = true;
  else if (!$('#emoji-pop').hidden) closePopovers();
  else if (innerWidth < 1000) setMembers(false);
});


/* ============================================================ annonce plein écran (admin) */
let alertCtx = null;
function fanfare() {
  if (!state.sound) return;
  try {
    alertCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const t0 = alertCtx.currentTime;
    [[523, 0], [659, .16], [784, .32], [1047, .5], [784, .74], [1047, .9]].forEach(([f, d]) => {
      const o = alertCtx.createOscillator(), g = alertCtx.createGain();
      o.type = 'triangle'; o.frequency.value = f;
      g.gain.setValueAtTime(0, t0 + d); g.gain.linearRampToValueAtTime(.18, t0 + d + .02); g.gain.exponentialRampToValueAtTime(.0001, t0 + d + .34);
      o.connect(g); g.connect(alertCtx.destination); o.start(t0 + d); o.stop(t0 + d + .36);
    });
  } catch {}
}
function showAlert(a) {
  if (!a || a.id <= store.get('alertSeen', 0)) return;
  document.querySelector('#alert-over')?.remove();
  const el = document.createElement('div');
  el.id = 'alert-over';
  el.className = 'alert-over';
  el.innerHTML = `<div class="alert-card"><small>Annonce</small><h2 class="${a.text.length > 90 ? 'long' : ''}">${esc(a.text)}</h2><p>de ${esc(a.by)}</p><button type="button">Compris</button></div>`;
  const close = () => { store.set('alertSeen', a.id); el.classList.add('out'); setTimeout(() => el.remove(), 260); };
  el.querySelector('button').onclick = close;
  document.body.appendChild(el);
  el.querySelector('button').focus();
  fanfare();
  if ((document.hidden || !document.hasFocus()) && window.Notification?.permission === 'granted') {
    const n = new Notification('Annonce Bahlou', { body: a.text.slice(0, 180), icon: '/icon.png', tag: 'bahlou-alert', requireInteraction: true });
    n.onclick = () => { window.focus(); n.close(); };
  }
}
