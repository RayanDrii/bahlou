'use strict';
/* Le Cercle — navigation, solde, récompenses, boutique, classement. */
const Club = (() => {
  const C = { me: null, cfg: null, jackpot: 0, feed: [], crash: null, duels: [], poker: null, mines: null, bj: null, tower: null, held: 0, meAt: 0 };
  const games = {};
  const pages = {};

  /* ---------- événements internes */
  const listeners = new Map();
  const on = (ev, fn) => { if (!listeners.has(ev)) listeners.set(ev, new Set()); listeners.get(ev).add(fn); return () => listeners.get(ev).delete(fn); };
  const emit = (ev, d) => listeners.get(ev)?.forEach((fn) => fn(d));
  function makeCtx() {
    const off = [];
    return {
      alive: true,
      on(e, f) { off.push(on(e, f)); },
      add(f) { off.push(f); },
      every(ms, f) { const t = setInterval(f, ms); off.push(() => clearInterval(t)); },
      later(ms, f) { const t = setTimeout(f, ms); off.push(() => clearTimeout(t)); },
      loop(f) { let id, live = true; const go = (t) => { if (!live) return; f(t); id = requestAnimationFrame(go); }; id = requestAnimationFrame(go); off.push(() => { live = false; cancelAnimationFrame(id); }); },
      stop() { this.alive = false; off.forEach((f) => f()); },
    };
  }

  /* ---------- formats */
  const nf = new Intl.NumberFormat('fr-FR');
  const fmt = (n) => nf.format(Math.floor(n)).replace(/ /g, ' ');
  const short = (n) => (n >= 1e6 ? (n / 1e6).toFixed(n >= 1e7 ? 0 : 1).replace('.', ',') + ' M' : n >= 1e4 ? Math.floor(n / 1e3) + ' k' : fmt(n));
  const coin = '<i class="coin"></i>';
  const CHIP_VALUES = [10, 50, 100, 500, 1000, 5000];
  const chipLabel = (v) => (v >= 1000 ? v / 1000 + 'k' : v);
  const chipHtml = (v, cls = '') => `<span class="chip c${v} ${cls}"><b>${chipLabel(v)}</b></span>`;
  function stackHtml(amount, max = 7) {
    let left = Math.floor(amount), out = '', n = 0;
    for (const v of [...CHIP_VALUES].reverse()) while (left >= v && n < max) { out += `<span class="chip c${v}" style="--i:${n}"></span>`; left -= v; n++; }
    return `<span class="stack" style="--n:${n}">${out}</span>`;
  }

  /* afficheur à segments, comme les tableaux lumineux des salles de jeu */
  const SEG = { a: 'M3.5 1.5h13l-2.5 3h-8z', b: 'M18 3.5l-3 3v9.5l1.6 1.6 1.4-1.4z', c: 'M18 32.5l-3-3v-9.5l1.6-1.6 1.4 1.4z', d: 'M6 31.5h8l2.5 3h-13z', e: 'M2 32.5l3-3v-9.5l-1.6-1.6-1.4 1.4z', f: 'M2 3.5l3 3v9.5l-1.6 1.6-1.4-1.4z', g: 'M4 18l2-1.6h8l2 1.6-2 1.6h-8z' };
  const DIGIT = ['abcdef', 'bc', 'abged', 'abgcd', 'fgbc', 'afgcd', 'afgedc', 'abc', 'abcdefg', 'abcdfg'];
  function led(str) {
    let x = 0, body = '';
    for (const ch of String(str)) {
      if (ch >= '0' && ch <= '9') {
        const on = DIGIT[+ch];
        body += `<g transform="translate(${x})">` + Object.entries(SEG).map(([k, d]) => `<path d="${d}" fill="currentColor"${on.includes(k) ? '' : ' opacity=".07"'}/>`).join('') + '</g>';
        x += 24;
      } else if (ch === ',' || ch === '.') { body += `<circle cx="${x + 2}" cy="32.5" r="2.4" fill="currentColor"/>`; x += 9; }
      else x += 11;
    }
    return `<svg class="led" viewBox="0 0 ${Math.max(x - 3, 1)} 36">${body}</svg>`;
  }

  /* cartes dessinées comme de vraies cartes */
  const SUIT_PATH = [
    'M24 6c14 11 18 17 18 23a8.5 8.5 0 0 1-15 5.5c.4 3.4 1.6 5.8 4 8.5H17c2.4-2.7 3.6-5.1 4-8.5A8.5 8.5 0 0 1 6 29c0-6 4-12 18-23Z',
    'M24 42C10 31 6 24 6 17a9.5 9.5 0 0 1 18-4 9.5 9.5 0 0 1 18 4c0 7-4 14-18 25Z',
    'M24 4 40 24 24 44 8 24Z',
    'M21 26c-.4 7-1.6 11-4 17h14c-2.4-6-3.6-10-4-17a8.5 8.5 0 1 0 8-9 8.5 8.5 0 1 0-22 0 8.5 8.5 0 1 0 8 9Z',
  ];
  const RANKS = '2 3 4 5 6 7 8 9 10 V D R A'.split(' ');
  const PIPS = { 0: [[50, 30], [50, 110]], 1: [[50, 28], [50, 70], [50, 112]], 2: [[31, 30], [69, 30], [31, 110], [69, 110]], 3: [[31, 30], [69, 30], [50, 70], [31, 110], [69, 110]], 4: [[31, 30], [69, 30], [31, 70], [69, 70], [31, 110], [69, 110]], 5: [[31, 30], [69, 30], [31, 70], [69, 70], [50, 50], [31, 110], [69, 110]], 6: [[31, 30], [69, 30], [31, 70], [69, 70], [50, 50], [50, 90], [31, 110], [69, 110]], 7: [[31, 26], [69, 26], [31, 55], [69, 55], [50, 70], [31, 85], [69, 85], [31, 114], [69, 114]], 8: [[31, 26], [69, 26], [31, 55], [69, 55], [50, 41], [31, 85], [69, 85], [31, 114], [69, 114], [50, 99]] };
  const pip = (s, x, y, size, flip) => `<g transform="translate(${x} ${y})${flip ? ' rotate(180)' : ''} scale(${size / 48}) translate(-24 -24)"><path d="${SUIT_PATH[s]}"/></g>`;
  function cardSvg(c) {
    if (c < 0) return `<svg viewBox="0 0 100 140"><rect x=".5" y=".5" width="99" height="139" rx="7" fill="#26262b" stroke="#3a3a40"/><rect x="9" y="9" width="82" height="122" fill="none" stroke="#ffd21f" stroke-width="2"/><path d="M50 40 72 70 50 100 28 70Z" fill="#ffd21f"/></svg>`;
    const s = Math.floor(c / 13), r = c % 13, col = s === 1 || s === 2 ? '#c8102e' : '#141414', label = RANKS[r];
    const corner = `<text x="11" y="23" text-anchor="middle" font-family="Big Shoulders, Impact, sans-serif" font-weight="700" font-size="${label === '10' ? 17 : 21}">${label}</text>${pip(s, 11, 34, 13)}`;
    let mid = '';
    if (r <= 8) mid = PIPS[r].map(([x, y]) => pip(s, x, y, 19, y > 70)).join('');
    else if (r === 12) mid = pip(s, 50, 70, 46);
    else mid = `<rect x="23" y="20" width="54" height="100" fill="none" stroke="#b8902f" stroke-width="1.4"/><rect x="26" y="23" width="48" height="94" fill="none" stroke="#2a3f8f" stroke-width=".8"/>${pip(s, 36, 35, 14)}${pip(s, 64, 105, 14, true)}<text x="50" y="87" text-anchor="middle" font-family="Big Shoulders, Impact, sans-serif" font-weight="700" font-size="52">${label}</text>`;
    return `<svg viewBox="0 0 100 140" fill="${col}"><rect x=".5" y=".5" width="99" height="139" rx="8" fill="#fdfcf8" stroke="#c9c6bc"/>${corner}<g transform="rotate(180 50 70)">${corner}</g>${mid}</svg>`;
  }

  const dur = (ms) => { const s = Math.ceil(ms / 1000), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h} h ${String(m).padStart(2, '0')}` : `${m}:${String(s % 60).padStart(2, '0')}`; };
  const delay = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- sons : feutrés, jamais criards */
  function tone(f, d = 0.2, v = 0.06, at = 0, type = 'sine') {
    if (!state.sound) return;
    try {
      actx ||= new (window.AudioContext || window.webkitAudioContext)();
      const t = actx.currentTime + at, o = actx.createOscillator(), g = actx.createGain();
      o.type = type; o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      o.connect(g).connect(actx.destination); o.start(t); o.stop(t + d + 0.02);
    } catch {}
  }
  const bell = (f, at = 0, v = 0.06) => { tone(f, 0.9, v, at); tone(f * 2.01, 0.5, v * 0.3, at); };
  const sfx = {
    click: () => tone(1100, 0.04, 0.025),
    tick: () => tone(1800, 0.018, 0.012),
    stop: () => tone(210, 0.1, 0.07, 0, 'triangle'),
    card: () => tone(420, 0.05, 0.035, 0, 'triangle'),
    err: () => tone(190, 0.14, 0.04, 0, 'triangle'),
    lose: () => tone(196, 0.5, 0.05),
    win: () => { bell(784); bell(1175, 0.11); },
    big: () => [523, 784, 1047, 1568].forEach((f, i) => bell(f, i * 0.2, 0.07)),
    gem: (k = 0) => bell(660 * Math.pow(1.06, k), 0, 0.05),
    boom: () => { tone(82, 0.7, 0.14, 0, 'triangle'); tone(55, 0.9, 0.1, 0.04); },
    coin: () => bell(1320, 0, 0.05),
    chip: () => { tone(2500, 0.03, 0.05, 0, 'triangle'); tone(3300, 0.03, 0.035, 0.035, 'triangle'); },
  };

  /* ---------- grand gain */
  function setLast(v) { const b = document.querySelector('.gm-last b'); if (b) b.textContent = v; }
  function celebrate(payout, bet, label, words = {}) {
    const mult = bet ? payout / bet : 0;
    setLast(payout ? '+' + fmt(payout) : '0');
    if (label || mult >= 10) return bigWin(payout, mult, label);
    if (payout === 0) FX.lose(bet, words.lose);
    else if (payout > bet) FX.win(payout, words.win);
    else if (payout === bet) FX.push(words.push);
  }
  function bigWin(amount, mult, label) {
    sfx.big();
    FX.rain(190);
    FX.shake(1, 620);
    setLast('+' + fmt(amount));
    document.querySelector('#bigwin')?.remove();
    const el = document.createElement('div');
    el.id = 'bigwin';
    el.className = 'bigwin';
    const title = label || (mult >= 100 ? 'Exceptionnel' : mult >= 50 ? 'Magistral' : 'Beau coup');
    el.innerHTML = `<div class="bw-in"><span class="bw-t">${title}</span><i class="bw-l"></i><b class="bw-n" style="font-weight:400">0</b><span class="bw-s">${mult ? '×' + String(Math.round(mult * 100) / 100).replace('.', ',') : 'bahlous'}</span></div>`;
    document.body.appendChild(el);
    const n = el.querySelector('.bw-n'), t0 = performance.now();
    (function step(t) { const k = Math.min(1, (t - t0) / 1900); n.textContent = fmt(amount * (1 - Math.pow(1 - k, 4))); if (k < 1 && el.isConnected) requestAnimationFrame(step); })(t0);
    const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 600); };
    el.onclick = close;
    setTimeout(() => el.isConnected && close(), 3800);
  }

  /* ---------- notifications */
  function popCard(title, sub, cls = '') {
    const el = document.createElement('div');
    el.className = 'pop ' + cls;
    el.innerHTML = `<div><b>${title}</b><small>${sub}</small></div>`;
    $('#pops').appendChild(el);
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 420); }, 4600);
    return el;
  }
  function fire(events = []) {
    events.forEach((e, i) => setTimeout(() => {
      if (e.type === 'level') { sfx.big(); popCard(`Niveau ${e.level}`, `${e.rank} · +${fmt(e.reward)} · mise maximale relevée`, 'gold'); }
      else if (e.type === 'mission') { sfx.coin(); popCard(e.bonus ? 'Journée parfaite' : 'Mission accomplie', `${esc(e.txt)} · +${fmt(e.reward)}`); }
      else if (e.type === 'ach') { if (e.name === 'Cadeau') FX.gift(e.reward); else sfx.win(); popCard(esc(e.name), `${esc(e.d)} · +${fmt(e.reward)}`, 'gold'); }
      else if (e.type === 'set') { sfx.big(); popCard(`Série complète : ${esc(e.name)}`, `+${fmt(e.reward)} bahlous`, 'gold'); }
      else if (e.type === 'tourney') { sfx.big(); popCard(`Tournoi : ${e.place}${e.place === 1 ? 'er' : 'e'}`, `${e.reward ? `+${fmt(e.reward)} bahlous, ` : ''}${e.pts} points`, 'gold'); }
      else if (e.type === 'tourney-week') { sfx.big(); popCard(`${e.place}${e.place === 1 ? 'er' : 'e'} des tournois de la semaine`, `+${fmt(e.reward)} bahlous`, 'gold'); }
      else if (e.type === 'work') { sfx.coin(); popCard('Prime de travail', `${esc(e.txt)} · +${fmt(e.reward)}`, 'gold'); }
      else if (e.type === 'week') { sfx.big(); popCard(`${e.place}${e.place === 1 ? 'er' : 'e'} de la semaine`, `+${fmt(e.reward)} bahlous`, 'gold'); }
    }, i * 600));
  }
  function peek(m) {
    const el = document.createElement('button');
    el.type = 'button';
    el.className = 'msg-toast';
    el.appendChild(avatar(m.from, 'lg'));
    el.insertAdjacentHTML('beforeend', `<div><small>Nouveau message</small><b>${esc(m.from)}</b><p>${esc(m.text.slice(0, 140))}</p></div>`);
    el.onclick = () => { location.hash = '#/chat'; el.remove(); };
    let box = $('#msg-toasts');
    if (!box) { box = Object.assign(document.createElement('div'), { id: 'msg-toasts' }); document.body.appendChild(box); }
    box.prepend(el);
    while (box.children.length > 3) box.lastChild.remove();
    setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 320); }, 6500);
  }

  /* ---------- solde */
  let shown = null, coinAnim = 0, lastCoins = null;
  function paintCoins() {
    const target = Math.max(0, C.me.coins - C.held);
    if (lastCoins !== null && target !== lastCoins) Anim.coinDelta(target - lastCoins);
    lastCoins = target;
    if (shown === null) shown = target;
    const from = shown, t0 = performance.now(), id = ++coinAnim;
    (function step(t) {
      if (id !== coinAnim) return;
      const k = Math.min(1, (t - t0) / 700);
      shown = from + (target - from) * (1 - Math.pow(1 - k, 4));
      const v = fmt(k === 1 ? target : shown);
      document.querySelectorAll('.js-coins').forEach((n) => (n.textContent = v));
      if (k < 1) requestAnimationFrame(step); else shown = target;
    })(t0);
  }
  function release(x) { C.held = Math.max(0, C.held - x); paintCoins(); }
  function setMe(me) { C.me = me; C.meAt = Date.now(); paintCoins(); paintTop(); emit('me', me); }
  const remaining = (v) => Math.max(0, v - (Date.now() - C.meAt));

  async function post(path, body = {}, opts = {}) {
    try {
      const r = await api('POST', '/api/g/' + path, body);
      if (opts.hold) C.held += opts.hold(r) || 0;
      setMe(r.me);
      if (opts.defer) r.later = () => fire(r.events); else fire(r.events);
      return r;
    } catch (e) { toast(e.message, true); sfx.err(); return null; }
  }

  function paintTop() {
    const m = C.me; if (!m) return;
    const pct = Math.round(((m.xp - m.xpCur) / Math.max(1, m.xpNext - m.xpCur)) * 100);
    $('#ct-lvl').innerHTML = `<small><span>${m.rank}</span><span>Niv. ${m.level}</span></small><i class="xp"><b style="width:${pct}%"></b></i>`;
    $('#ct-streak').innerHTML = `Série<b>${m.streak}</b>`;
    $('#ct-golden').hidden = !m.golden && !(m.boostIn > 0);
    $('#ct-golden').textContent = m.golden ? 'Heure dorée' : 'XP doublée';
    $('#rail-rank').textContent = `${m.rank}, niveau ${m.level}`;
    const bonus = m.canDaily || m.wheelFree || remaining(m.chestIn) === 0;
    $('#rail-club-dot').hidden = !bonus; $('#cash-dot').hidden = !bonus;
  }
  function paintTicker() {
    const box = document.querySelector('#ct-ticker');
    if (!box) return;
    if (!C.feed.length) { box.textContent = 'Bienvenue au casino Bahlou'; return; }
    const items = C.feed.slice(0, 12).map((f) => `<span><b>${esc(f.name)}</b> · ${gameName(f.game)} · <em>+${short(f.payout)}</em></span>`).join('');
    box.innerHTML = `<div style="--t:${Math.max(26, C.feed.length * 7)}s">${items}${items}</div>`;
  }

  /* ---------- mise : des jetons, comme à table */
  function betBox(game, onChange) {
    const key = 'bet.' + game;
    const el = document.createElement('div');
    el.className = 'betbox';
    el.innerHTML = `<div class="bb-chips">${CHIP_VALUES.map((v) => `<button type="button" data-v="${v}">${chipHtml(v)}</button>`).join('')}</div><div class="bb-tot"><label>Mise</label><input type="number" inputmode="numeric" min="${C.cfg.minBet}" step="10"></div><div class="bb-ops"><button type="button" data-a="clear">Effacer</button><button type="button" data-a="half">½</button><button type="button" data-a="dbl">×2</button><button type="button" data-a="max">Max</button></div>`;
    const input = el.querySelector('input');
    const cap = () => Math.max(C.cfg.minBet, Math.min(C.me.maxBet, C.me.coins));
    const set = (v) => { const n = Math.max(C.cfg.minBet, Math.min(cap(), Math.floor(v) || C.cfg.minBet)); input.value = n; store.set(key, n); onChange?.(n); };
    input.value = Math.min(store.get(key, 100), cap());
    input.addEventListener('change', () => set(Number(input.value)));
    el.addEventListener('click', (e) => {
      if (input.disabled) return;
      const chip = e.target.closest('[data-v]');
      if (chip) { sfx.chip(); return set(Number(input.value) + Number(chip.dataset.v)); }
      const a = e.target.dataset.a; if (!a) return;
      sfx.click();
      set(a === 'clear' ? C.cfg.minBet : a === 'half' ? Number(input.value) / 2 : a === 'dbl' ? Number(input.value) * 2 : cap());
    });
    return { el, get: () => { const n = Math.floor(Number(input.value)); return Number.isFinite(n) ? n : 0; }, set, lock(b) { el.classList.toggle('locked', b); input.disabled = b; } };
  }

  /* ---------- catalogue */
  const wedge = (cx, cy, r, a0, a1, fill) => { const p = (a) => `${(cx + r * Math.cos(a)).toFixed(1)} ${(cy + r * Math.sin(a)).toFixed(1)}`; return `<path d="M${cx} ${cy}L${p(a0)}A${r} ${r} 0 0 1 ${p(a1)}Z" fill="${fill}"/>`; };
  const ring = (n, fn) => Array.from({ length: n }, (_, i) => fn(i, (i * 2 * Math.PI) / n - Math.PI / 2, ((i + 1) * 2 * Math.PI) / n - Math.PI / 2)).join('');
  const mini = (c, x, y, rot, w = 44) => `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${w / 100})">${cardSvg(c).replace(/<\/?svg[^>]*>/g, (m) => (m.startsWith('</') ? '</g>' : `<g${/fill="[^"]*"/.exec(m) ? ' ' + /fill="[^"]*"/.exec(m)[0] : ''}>`))}</g>`;
  const GAMES = [
    ['roulette', 'Roulette', 'Européenne, un seul zéro', 'felt'], ['blackjack', 'Blackjack', 'Paie 3 pour 2', 'felt'], ['poker', "Texas Hold'em", 'No limit, 6 joueurs', 'felt'],
    ['slots', 'Machine à sous', 'Jackpot progressif', 'carpet'], ['wheel', 'Big Six', 'Un tour offert par jour', 'carpet'], ['scratch', 'Ticket à gratter', 'Trois tickets au choix', 'carpet'],
    ['crash', 'Crash', 'Multiplicateur en direct', 'board'], ['tower', 'Tower', 'Huit étages, quatre niveaux', 'carpet'], ['mines', 'Mines', 'Grille de 25 cases', 'felt'], ['plinko', 'Plinko', 'Trois niveaux de risque', 'wood'], ['duel', 'Pile ou Face', 'Contre un joueur', 'felt'],
  ].map(([id, name, sub, bg]) => ({ id, name, sub, bg }));
  const gameName = (id) => GAMES.find((g) => g.id === id)?.name || id;

  /* ---------- salle de jeux */
  function renderHome(root, ctx) {
    root.innerHTML = `<div class="hm">
      <section class="marquee"><div class="bulbs"></div><div class="mq-in"><div class="mq-name">Casino Bahlou</div><div class="mq-jack"><span>Jackpot progressif</span><div class="led-box" id="jp-n">${led(fmt(C.jackpot))}</div></div></div><div class="ticker" id="ct-ticker"></div><div class="bulbs"></div></section>
      <section class="tiles">${GAMES.map((g) => `<a class="tl" href="#/club/${g.id}"><span class="tl-ico"><svg viewBox="0 0 96 96" aria-hidden="true">${Icons[g.id]}</svg></span><span class="tl-plate"><b>${g.name}</b><small>${g.sub}</small></span></a>`).join('')}</section>
    </div>`;
    paintTicker();
    ctx.on('jackpot', () => { const n = $('#jp-n', root); if (n) n.innerHTML = led(fmt(C.jackpot)); });
  }

  /* ---------- caisse : bonus et missions */
  function renderCashier(root, ctx) {
    root.innerHTML = `<div class="pg"><h2 class="pg-t">Caisse</h2><p class="muted">Bonus, coffre et missions du jour.</p><section id="dailies"></section><h3 class="sec">Missions du jour<small id="ms-b"></small></h3><section class="ms-list" id="ms"></section></div>`;
    const paint = () => {
      const m = C.me, box = $('#dailies', root), chest = remaining(m.chestIn);
      const track = C.cfg.streak.map((r, i) => {
        const done = i < m.streakDay || (i === m.streakDay && !m.canDaily);
        return `<div class="st ${done ? 'done' : ''} ${i === m.streakDay && m.canDaily ? 'now' : ''}">${short(r)}</div>`;
      }).join('');
      const crous = remaining(m.bailoutIn);
      box.innerHTML = `<div class="today">
        <article class="td streak"><b>Série de ${m.streak} jour${m.streak > 1 ? 's' : ''}</b><small>${m.freeze ? `Gels disponibles : ${m.freeze}` : 'Revenir chaque jour fait grandir la récompense.'}</small><div class="st-track">${track}</div>
          <button type="button" class="play" id="d-daily" ${m.canDaily ? '' : 'disabled'}>${m.canDaily ? 'Recevoir' : 'Reçu aujourd\'hui'}</button></article>
        <article class="td"><b>Le Coffre</b><small id="chest-t">${chest ? 'Dans ' + dur(chest) : 'Prêt à être ouvert'}</small>
          <button type="button" class="play" id="d-chest" ${chest ? 'disabled' : ''}>Ouvrir</button></article>
        <article class="td"><b>Big Six</b><small>${m.wheelFree ? 'Un tour vous est offert' : 'Prochain tour demain'}</small>
          <a class="play ${m.wheelFree ? '' : 'off'}" href="#/club/wheel">Tourner</a></article>
      </div>
      ${m.canBailout ? `<div class="crous"><span>La Bourse du CROUS <small>${crous ? ' — dossier en cours, ' + dur(crous) : ' — 1 000 bahlous pour repartir'}</small></span><button type="button" class="play" id="d-crous" ${crous ? 'disabled' : ''}>Toucher</button></div>` : ''}`;
      $('#ms-b', root).textContent = m.missionBonus ? 'Journée parfaite' : 'Les trois accordent un bonus';
      $('#ms', root).innerHTML = m.missions.map((x) => `<div class="ms ${x.done ? 'done' : ''}"><div class="ms-t"><span>${esc(x.txt)}</span><em>${x.done ? 'Accomplie' : '+' + short(x.r)}</em></div><div class="bar"><i style="width:${Math.round((x.p / x.n) * 100)}%"></i></div></div>`).join('');
      $('#d-daily', root).onclick = async () => {
        const r = await post('daily'); if (!r) return;
        sfx.big(); popCard(`Série : ${r.streak} jour${r.streak > 1 ? 's' : ''}`, `+${fmt(r.reward)} bahlous`, 'gold');
      };
      $('#d-chest', root).onclick = async () => {
        const r = await post('chest', {}, { hold: (x) => x.reward, defer: true });
        if (!r) return;
        await delay(450);
        release(r.reward);
        if (r.reward >= 5000) bigWin(r.reward, 0, `Coffre ${r.tier}`);
        else { sfx.win(); popCard(`Coffre ${r.tier.toLowerCase()}`, `+${fmt(r.reward)} bahlous`, 'gold'); }
        r.later();
      };
      const cr = $('#d-crous', root);
      if (cr) cr.onclick = async () => { const r = await post('bailout'); if (r) { sfx.coin(); popCard('Virement du CROUS', '+1 000 bahlous'); } };
    };
    paint();
    ctx.on('me', paint);
    ctx.every(1000, () => {
      const c = remaining(C.me.chestIn), t = $('#chest-t', root);
      if (t && c) t.textContent = 'Dans ' + dur(c);
      else if (t && t.textContent !== 'Prêt à être ouvert') paint();
    });
  }

  function renderShop(root, ctx) {
    const SECT = [['frame', 'Cadres', 'Autour du portrait, partout dans Bahlou'], ['color', 'Encres', 'La couleur du nom dans le Salon'], ['title', 'Titres', 'Affichés à côté du nom'], ['item', 'Services', 'À consommer']];
    const FRAMES = ['f-neon', 'f-aurora', 'f-gold', 'f-fire', 'f-void', 'f-legend'];
    const paint = () => {
      const m = C.me;
      root.innerHTML = `<div class="pg"><h2 class="pg-t">Boutique</h2><p class="muted">Tout s'y gagne, rien ne s'y achète.</p>${SECT.map(([type, title, sub]) => `
        <h3 class="sec">${title}<small>${sub}</small></h3><div class="shop">${C.cfg.shop.filter((x) => x.type === type).map((x) => {
          const own = m.owned.includes(x.id), eq = m[type] === x.id, lock = x.lvl && m.level < x.lvl, poor = m.coins < x.price;
          const stock = x.id === 'freeze' ? ` (${m.freeze}/2)` : '';
          const action = type !== 'item' && own
            ? `<button type="button" class="sh-btn ${eq ? 'on' : ''}" data-eq="${x.id}" data-type="${type}">${eq ? 'Porté' : 'Porter'}</button>`
            : `<button type="button" class="sh-btn" data-buy="${x.id}" ${lock || poor ? 'disabled' : ''}>${lock ? 'Niveau ' + x.lvl : coin + short(x.price)}</button>`;
          return `<article class="sh"><div class="sh-prev" data-prev="${x.id}" data-type="${type}"></div><b>${x.name}${stock}</b>${x.desc ? `<small>${x.desc}</small>` : ''}${action}</article>`;
        }).join('')}</div>`).join('')}</div>`;
      root.querySelectorAll('[data-prev]').forEach((el) => {
        const { prev: id, type } = el.dataset;
        if (type === 'frame') { const a = avatar(state.me, 'lg'); FRAMES.forEach((c) => a.classList.remove(c)); a.classList.add(id); el.appendChild(a); }
        else if (type === 'color') el.innerHTML = `<span class="g-name ${id}">${esc(state.me)}</span>`;
        else if (type === 'title') el.innerHTML = '<span class="u-title">Titre</span>';
        else el.innerHTML = `<span class="sh-ico">${id === 'freeze' ? '∗' : '×2'}</span>`;
      });
      root.querySelectorAll('[data-buy]').forEach((b) => (b.onclick = async () => { const r = await post('buy', { id: b.dataset.buy }); if (r) sfx.coin(); }));
      root.querySelectorAll('[data-eq]').forEach((b) => (b.onclick = async () => { const { eq: id, type } = b.dataset; sfx.click(); await post('equip', { type, id: C.me[type] === id ? null : id }); }));
    };
    paint();
    ctx.on('me', paint);
  }

  async function renderBoard(root, ctx) {
    root.innerHTML = '<div class="pg"><h2 class="pg-t">Classement</h2><div class="tabs" id="bd-tabs"></div><div id="bd"></div></div>';
    let rows = [], tab = store.get('board', 'coins');
    const TABS = { coins: ['Fortune', (r) => r.coins, (r) => fmt(r.coins)], week: ['Cette semaine', (r) => r.weekNet, (r) => (r.weekNet > 0 ? '+' : '') + fmt(r.weekNet)], best: ['Plus beau coup', (r) => r.best.amount, (r) => (r.best.amount ? `${fmt(r.best.amount)}, ×${r.best.mult}` : '—')], level: ['Niveau', (r) => r.level * 1e6 + r.coins, (r) => `${r.rank}, niveau ${r.level}`] };
    const paint = () => {
      $('#bd-tabs', root).innerHTML = Object.entries(TABS).map(([k, [n]]) => `<button type="button" class="${k === tab ? 'on' : ''}" data-t="${k}">${n}</button>`).join('');
      root.querySelectorAll('[data-t]').forEach((b) => (b.onclick = () => { tab = b.dataset.t; store.set('board', tab); sfx.click(); paint(); }));
      const [, key, label] = TABS[tab];
      const sorted = [...rows].sort((a, b) => key(b) - key(a));
      const box = $('#bd', root); box.innerHTML = '';
      const pod = document.createElement('div'); pod.className = 'podium';
      [1, 0, 2].forEach((i) => {
        const r = sorted[i]; if (!r) return;
        const el = document.createElement('div'); el.className = 'pd';
        el.insertAdjacentHTML('beforeend', `<i>${['Premier', 'Deuxième', 'Troisième'][i]}</i>`);
        el.appendChild(avatar(r.name, i === 0 ? 'xl' : 'lg'));
        el.insertAdjacentHTML('beforeend', `<b>${esc(r.name)}</b><small>${label(r)}</small>`);
        pod.appendChild(el);
      });
      box.appendChild(pod);
      sorted.slice(3).forEach((r, i) => {
        const el = document.createElement('div'); el.className = 'bd-row' + (r.name === state.me ? ' me' : '');
        el.insertAdjacentHTML('beforeend', `<span class="bd-n">${i + 4}</span>`);
        el.appendChild(avatar(r.name, 'sm'));
        el.insertAdjacentHTML('beforeend', `<b>${esc(r.name)}</b><em>${label(r)}</em>`);
        box.appendChild(el);
      });
      if (tab === 'week') box.insertAdjacentHTML('beforeend', '<p class="muted bd-note">Chaque lundi, les trois premiers reçoivent 25 000, 10 000 et 5 000 bahlous.</p>');
    };
    const load = async () => { try { rows = (await api('GET', '/api/g/board')).rows; if (ctx.alive) paint(); } catch {} };
    await load();
    ctx.every(8000, load);
  }

  function renderTrophies(root, ctx) {
    const paint = () => {
      const m = C.me, s = m.stats;
      root.innerHTML = `<div class="pg"><h2 class="pg-t">Palmarès</h2>
        <div class="stats">${[['Parties', fmt(s.rounds)], ['Gagnées', fmt(s.wins)], ['Total misé', short(s.wagered)], ['Plus beau coup', m.best.amount ? short(m.best.amount) : '—'], ['Multiplicateur', s.maxMult ? '×' + String(Math.round(s.maxMult * 100) / 100).replace('.', ',') : '—'], ['Mise maximale', short(m.maxBet)]].map(([a, b]) => `<div><small>${a}</small><b>${b}</b></div>`).join('')}</div>
        <h3 class="sec">Distinctions<small>${m.ach.length} sur ${C.cfg.ach.length}</small></h3>
        <div class="achs">${C.cfg.ach.map((a) => `<article class="ac ${m.ach.includes(a.id) ? 'got' : ''}"><div><b>${a.name}</b><small>${a.d}</small></div><em>+${short(a.r)}</em></article>`).join('')}</div></div>`;
    };
    paint();
    ctx.on('me', paint);
  }

  /* ---------- navigation */
  let current = null;
  function route() {
    const h = location.hash.replace(/^#\/?/, '') || 'chat';
    const [page, sub] = h.split('/');
    const inWork = page === 'work';
    const inAdmin = page === 'admin';
    const inClub = page !== 'chat' && !inWork && !inAdmin;
    $('#chat-view').hidden = inClub || inWork || inAdmin;
    $('#club').hidden = !inClub;
    $('#work').hidden = !inWork;
    $('#admin-view').hidden = !inAdmin;
    $('#app').classList.toggle('in-club', inClub || inWork || inAdmin);
    document.documentElement.dataset.page = inAdmin ? 'admin' : inWork ? 'work' : inClub ? 'club' : 'chat';
    document.querySelectorAll('.tabs-main a').forEach((a) => a.classList.toggle('on', a.dataset.tab === (inAdmin ? 'admin' : inWork ? 'work' : inClub ? 'club' : 'chat')));
    Work.stop();
    Admin.stop();
    document.querySelectorAll('.subnav a').forEach((a) => a.classList.toggle('on', a.dataset.nav === page));
    current?.stop(); current = null;
    if (inWork) { Work.open(); return; }
    if (inAdmin) { Admin.open(); return; }
    if (!inClub) { renderMessages('bottom'); markSeen(); return; }
    const body = $('#club-body'), ctx = makeCtx();
    current = ctx;
    body.scrollTop = 0;
    body.className = 'club-body';
    body.replaceChildren();
    if (page === 'club' && sub && games[sub]) {
      body.classList.add('in-game');
      games[sub](body, ctx);
      body.querySelector('.gm-p')?.insertAdjacentHTML('beforeend', '<div class="kv gm-last"><span>Dernier gain</span><b>—</b></div>');
    }
    else if (page === 'cashier') renderCashier(body, ctx);
    else if (page === 'shop') renderShop(body, ctx);
    else if (page === 'board') renderBoard(body, ctx);
    else if (page === 'trophies') renderTrophies(body, ctx);
    else if (pages[page]) pages[page](body, ctx);
    else renderHome(body, ctx);
  }

  function shell(root, id) {
    const g = GAMES.find((x) => x.id === id);
    root.insertAdjacentHTML('beforeend', `<div class="gm gm-${id}"><header class="gm-h"><a class="gm-back" href="#/club">‹ Salle de jeux</a><h2>${g.name}</h2><small>${g.sub}</small></header><div class="gm-b"></div></div>`);
    return root.querySelector('.gm-b');
  }

  /* ---------- démarrage */
  async function load() {
    const s = await api('GET', '/api/g/state');
    Object.assign(C, { cfg: s.config, jackpot: s.jackpot, feed: s.feed, crash: s.crash, duels: s.duels, poker: s.poker, mines: s.mines, bj: s.bj, tower: s.tower, tourney: s.tourney });
    setMe(s.me);
    paintTicker();
    fire(s.events);
  }
  async function init() {
    await load();
    addEventListener('hashchange', route);
    route();
    setInterval(paintTop, 30000);
    checkBuild();
    setInterval(checkBuild, 20000);
    addEventListener('focus', checkBuild);
  }
  /* recharge seule quand une nouvelle version est en ligne, jamais en pleine partie ni en plein message */
  let build = null;
  async function checkBuild() {
    try {
      const { v } = await api('GET', '/api/version');
      if (build === null) build = v;
      else if (v !== build && !Call.active() && !/^#\/admin/.test(location.hash) && !/^#\/club\/./.test(location.hash) && !$('#input').value.trim()) location.reload();
    } catch {}
  }
  function bind(es) {
    const L = (ev, f) => es.addEventListener(ev, (e) => f(JSON.parse(e.data)));
    L('g:me', ({ me, events }) => { setMe(me); fire(events); });
    L('g:jackpot', ({ jackpot }) => { C.jackpot = jackpot; emit('jackpot'); });
    L('g:feed', (f) => { C.feed.unshift(f); C.feed.length = Math.min(C.feed.length, 20); paintTicker(); emit('feed', f); });
    L('g:crash', (v) => { C.crash = v; emit('crash', v); });
    L('g:duels', (d) => { C.duels = d; emit('duels', d); });
    L('g:duel', (r) => { emit('duel', r); if (r.a === state.me && !location.hash.endsWith('/duel')) { const w = r.winner === state.me; popCard(w ? 'Pile ou Face gagné' : 'Pile ou Face perdu', `Contre ${esc(r.b)} · ${w ? '+' + fmt(r.prize) : '−' + fmt(r.bet)}`, w ? 'gold' : ''); } });
    L('g:poker', (v) => { C.poker = v; emit('poker', v); });
    L('g:tourney', (t) => { C.tourney = t; emit('tourney', t); });
  }
  const inChat = () => !$('#chat-view').hidden;
  const badge = (n) => { const b = $('#rail-chat-badge'); if (b) { b.textContent = n > 99 ? '99+' : n; b.hidden = !n; } };

  return { C, games, pages, init, bind, refresh: () => load().catch(() => {}), inChat, badge, peek, shell, betBox, post, release, celebrate, bigWin, sfx, fmt, short, coin, delay, popCard, fire, chipHtml, stackHtml, cardSvg, led, SUIT_PATH, CHIP_VALUES };
})();
