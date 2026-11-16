'use strict';
/* Bahlou — Le Menteur : on pose face cachée en annonçant une valeur, le suivant suit ou crie « Menteur ! ». */
const Menteur = (() => {
  const SHORT = '2 3 4 5 6 7 8 9 10 V D R A'.split(' ');
  const NAMES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Valet', 'Dame', 'Roi', 'As'];
  const PLURAL = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'Valets', 'Dames', 'Rois', 'As'];
  const COUNT = ['', 'un', 'double', 'triple', 'carré de'];
  const announce = (n, rank) => `${COUNT[n]} ${NAMES[rank]}`;
  const rankOf = (c) => c % 13;
  const TURN_LABEL = (s) => (s ? `${s} s` : 'Illimité');

  let active = false, generation = 0, room = null, config = null, busy = false, mutation = 0, offset = 0, timer = null, poll = null;
  let selected = new Set(), chosenRank = null, seenReveal = 0, seenLog = 0, revealTimer = null, screen = '';
  const root = () => document.querySelector('#menteur-body');
  const el = (id) => root()?.querySelector('#' + id);
  const request = (action, body) => api(body === undefined ? 'GET' : 'POST', '/api/menteur/' + action, body);
  const host = () => room?.host === state.me;
  const face = (c) => (rankOf(c) >= 9 && rankOf(c) <= 11 ? court(c) : Club.cardSvg(c));

  /* figures dessinées : buste en haut, le même retourné en bas, comme sur un vrai jeu */
  function court(c) {
    const s = Math.floor(c / 13), r = rankOf(c), red = s === 1 || s === 2;
    const main = red ? '#c8102e' : '#1d2f7a', alt = red ? '#1d2f7a' : '#c8102e', gold = '#e9bf5a', skin = '#f3d6b6';
    const hair = r === 10 ? '#8a4a1c' : '#3b2412', ink = '#1a1a1a';
    const suit = `<path d="${Club.SUIT_PATH[s]}" transform="translate(63 23) scale(.25)" fill="${red ? '#c8102e' : '#141414'}"/>`;
    const face = `<rect x="47.5" y="46" width="5" height="6" fill="${skin}"/><circle cx="50" cy="40" r="8" fill="${skin}" stroke="${ink}" stroke-width=".6"/><circle cx="47" cy="39.5" r=".9" fill="${ink}"/><circle cx="53" cy="39.5" r=".9" fill="${ink}"/><path d="M47.5 43.5q2.5 1.6 5 0" fill="none" stroke="#a5523a" stroke-width=".8"/>`;
    const robe = `<path d="M27 70 L30 57 Q50 47 70 57 L73 70Z" fill="${main}" stroke="${ink}" stroke-width=".6"/><path d="M50 50 L50 70" stroke="${gold}" stroke-width="2.2"/><path d="M37 56 Q50 63 63 56 L61 52 Q50 58 39 52Z" fill="#fff" stroke="${ink}" stroke-width=".5"/><circle cx="44" cy="56" r=".9" fill="${ink}"/><circle cx="50" cy="58" r=".9" fill="${ink}"/><circle cx="56" cy="56" r=".9" fill="${ink}"/><path d="M30 62 L40 60 L39 70 L28 70Z" fill="${alt}" opacity=".85"/><path d="M70 62 L60 60 L61 70 L72 70Z" fill="${alt}" opacity=".85"/>`;
    let top;
    if (r === 11) top = `${robe}<path d="M66 70 L68 40" stroke="${gold}" stroke-width="2"/><circle cx="68" cy="38" r="2.6" fill="${gold}" stroke="${ink}" stroke-width=".5"/>${face}<path d="M42.5 42 Q50 57 57.5 42 Q50 48 42.5 42Z" fill="${hair}"/><path d="M41 34 L41 25 L45.5 29.5 L50 22 L54.5 29.5 L59 25 L59 34Z" fill="${gold}" stroke="${ink}" stroke-width=".6"/><circle cx="50" cy="30" r="1.4" fill="${alt}"/>`;
    else if (r === 10) top = `${robe}<path d="M41.5 42 Q39 28 50 29.5 Q61 28 58.5 42 L63 54 Q55 49 56.5 40 Q50 35 43.5 40 Q45 49 37 54Z" fill="${hair}"/>${face.replace(/<rect[^>]*>/, '')}<path d="M43 32 L46 27.5 L50 31 L54 27.5 L57 32Z" fill="${gold}" stroke="${ink}" stroke-width=".5"/><circle cx="35" cy="61" r="3.4" fill="${alt}"/><circle cx="35" cy="61" r="1.3" fill="${gold}"/><path d="M35 64.5 L36 70" stroke="#2f7a3a" stroke-width="1.2"/>`;
    else top = `${robe}<path d="M33 70 L31 33" stroke="#7a5a1c" stroke-width="1.8"/><path d="M31 33 L26 38 L31 41 L36 38Z" fill="#c9c9d0" stroke="${ink}" stroke-width=".5"/>${face}<path d="M42 41 Q42 31 50 30.5 Q58 31 58 41 Q56 36 50 35.5 Q44 36 42 41Z" fill="${hair}"/><path d="M39 33 Q50 21 61 33 Q50 30 39 33Z" fill="${alt}" stroke="${ink}" stroke-width=".5"/><path d="M57 28 Q66 18 70 22 Q63 23 59 30Z" fill="${gold}"/>`;
    const art = `<rect x="23" y="18" width="54" height="104" rx="3" fill="#fbf4df" stroke="${gold}" stroke-width="1.4"/><clipPath id="cc${c}"><rect x="23" y="18" width="54" height="52"/></clipPath><g clip-path="url(#cc${c})">${top}</g><g transform="rotate(180 50 70)" clip-path="url(#cc${c})">${top}</g><path d="M23 70 H77" stroke="${gold}" stroke-width="1"/>${suit}<g transform="rotate(180 50 70)">${suit}</g>`;
    return Club.cardSvg(c).replace(/<rect x="23"[\s\S]*<\/svg>$/, art + '</svg>');
  }
  const back = () => Club.cardSvg(-1);

  function message(text, bad = true) {
    const n = el('mt-msg');
    if (n) { n.textContent = text; n.classList.toggle('bad', bad); }
  }
  function accept(data) {
    if (!active) return;
    if (room && data.room && data.room.code === room.code && data.room.version < room.version) return;
    offset = data.serverNow - Date.now();
    const before = room;
    room = data.room;
    // rien de neuf (rafraîchissement régulier) : on ne touche pas à la table pour ne pas casser un clic en cours
    if (before && room && before.code === room.code && before.version === room.version) { paintClock(); return; }
    if (!room || !before || before.code !== room.code || before.phase !== room.phase) { selected.clear(); chosenRank = null; }
    if (room) selected = new Set([...selected].filter((c) => room.hand.includes(c)));
    if (room && !room.lead) chosenRank = null;
    render(before);
  }
  async function action(name, body = {}) {
    if (busy) return null;
    const token = generation;
    busy = true; mutation++; paintBusy();
    try { const data = await request(name, body); if (active && token === generation) accept(data); return data; }
    catch (e) { if (active && token === generation) message(e.message); return null; }
    finally { if (token === generation) { busy = false; paintBusy(); } }
  }
  function paintBusy() { root()?.querySelectorAll('[data-mt]').forEach((b) => { b.disabled = busy || b.dataset.off === '1'; }); }
  const button = (act, text, css = '', off = false, extra = '') => `<button type="button" class="mt-btn ${css}" data-mt="${act}" data-off="${off ? 1 : 0}" ${off ? 'disabled' : ''} ${extra}>${text}</button>`;

  /* ---------- écrans */
  function render(before) {
    if (!active) return;
    const key = room ? `${room.code}:${room.phase === 'waiting' ? 'w' : 't'}` : 'home';
    if (key !== screen) { screen = key; seenLog = room?.log.length || 0; seenReveal = room?.reveal?.id || 0; }
    if (!room) renderHome();
    else if (room.phase === 'waiting') renderLobby();
    else renderTable(before);
    root().querySelectorAll('[data-mt]').forEach((b) => b.addEventListener('click', onAction));
    paintBusy();
  }
  function renderHome() {
    root().innerHTML = `<section class="mh">
      <div class="mh-hero"><small>Jeu de cartes · 2 à 6 joueurs</small><h1>Le Menteur</h1>
        <p>Pose tes cartes face cachée et annonce ce que tu poses. Le suivant te croit et suit, ou crie « Menteur ! ». Le premier qui n’a plus de cartes gagne.</p></div>
      <ol class="mh-rules">
        <li><b>La dame de cœur commence</b><span>Elle ouvre en posant 1 à 4 cartes et en annonçant une valeur : « double 5 ».</span></li>
        <li><b>Suis ou bluffe</b><span>Le suivant pose d’autres 5, des vrais ou pas, ou retourne les dernières cartes en criant « Menteur ! ».</span></li>
        <li><b>Qui se trompe ramasse</b><span>Menteur démasqué ou accusation ratée : le perdant prend tout le tas. Une famille de quatre est retirée du jeu.</span></li>
      </ol>
      <div class="mh-grid">
        <article class="mh-card"><h2>Contre les robots</h2><p>Une table avec deux robots, tout de suite.</p>${button('solo', 'Jouer maintenant', 'gold')}</article>
        <article class="mh-card"><h2>Avec tes potes</h2><p>Crée une table, partage le code, complète avec des robots si besoin.</p>${button('create', 'Créer une table')}
          <form id="mt-join" class="mh-join"><input id="mt-code" maxlength="6" autocomplete="off" placeholder="CODE" aria-label="Code de la table"><button type="submit" class="mt-btn ghost" data-mt="join">Rejoindre</button></form></article>
      </div>
      <p id="mt-msg" class="mt-msg" role="status"></p></section>`;
    el('mt-join').addEventListener('submit', (e) => { e.preventDefault(); action('join', { code: el('mt-code').value.trim().toUpperCase() }); });
  }
  function renderLobby() {
    const full = room.players.length >= room.max;
    root().innerHTML = `<section class="ml">
      <header class="ml-head"><div><small>Table ${esc(room.code)}</small><h1>Installez-vous</h1></div>${button('leave', 'Quitter', 'ghost')}</header>
      <div class="ml-grid">
        <div>
          <div class="ml-code"><span>Code</span><strong>${esc(room.code)}</strong>${button('copy', 'Copier le lien', 'ghost')}</div>
          <h2>À table <small>${room.players.length} / ${room.max}</small></h2>
          <ul class="ml-seats">${room.players.map((p) => `<li class="${p.bot ? 'bot' : ''}">${p.bot ? '<span class="ml-bot">R</span>' : avatar(p.name, 'sm').outerHTML}<b>${esc(p.name)}</b><em>${p.name === room.host ? 'Hôte' : p.bot ? 'Robot' : 'Prêt'}</em>${host() && p.bot ? button('unbot', '×', 'x', false, `data-name="${esc(p.name)}" aria-label="Retirer ${esc(p.name)}"`) : ''}</li>`).join('')}</ul>
          ${host() ? button('bot', 'Ajouter un robot', 'ghost', full) : ''}
        </div>
        <div class="ml-side">
          <h2>Temps par tour</h2>
          <div class="ml-chips">${config.turns.map((t) => `<button type="button" class="ml-chip ${t === room.settings.turn ? 'on' : ''}" data-mt="turn" data-v="${t}" data-off="${host() ? 0 : 1}" ${host() ? '' : 'disabled'}>${TURN_LABEL(t)}</button>`).join('')}</div>
          <p class="ml-note">Quand le temps est écoulé, un robot joue à ta place pour ce tour.</p>
          ${host() ? button('start', 'Distribuer les cartes', 'gold big', room.players.length < 2) : '<p class="ml-note">L’hôte distribue dès que tout le monde est là.</p>'}
          <p id="mt-msg" class="mt-msg" role="status"></p>
        </div>
      </div></section>`;
  }

  function seatHtml(p) {
    const turn = room.turn === p.name, fan = Math.min(p.count, 7);
    return `<div class="ms ${turn ? 'turn' : ''} ${p.left ? 'away' : ''} ${room.winner === p.name ? 'won' : ''}" data-seat="${esc(p.name)}">
      <div class="ms-fan" style="--n:${fan}">${Array.from({ length: fan }, (_, i) => `<i style="--i:${i}">${back()}</i>`).join('')}</div>
      <div class="ms-id">${p.bot ? '<span class="ml-bot">R</span>' : avatar(p.name, 'sm').outerHTML}<b title="${esc(p.name)}">${esc(p.bot && room.players.length > 6 ? p.name.replace(/^Robot /, '') : p.name)}</b><span class="ms-n">${p.count}</span></div>
      ${turn ? '<i class="ms-clock"><b class="js-clock"></b></i>' : ''}${p.left ? '<small>Parti, un robot joue</small>' : ''}</div>`;
  }
  function logLine(e) {
    const who = (n) => `<b>${esc(n === state.me ? 'Toi' : n)}</b>`;
    if (e.t === 'play') return `${who(e.by)} annonce <em>${announce(e.count, e.rank)}</em>`;
    if (e.t === 'liar') return `${who(e.by)} accuse ${who(e.target)} : ${e.lied ? 'menteur démasqué' : 'il disait vrai'}, ${who(e.loser)} ramasse ${e.taken}`;
    if (e.t === 'family') return `${who(e.by)} complète les ${PLURAL[e.rank]}, la famille sort du jeu`;
    if (e.t === 'timeout') return `${who(e.by)} n’a pas joué à temps`;
    if (e.t === 'left') return `${who(e.by)} a quitté la table`;
    if (e.t === 'win') return `${who(e.by)} n’a plus de cartes et gagne`;
    return '';
  }
  function renderTable(before) {
    const myTurn = room.phase === 'playing' && room.turn === state.me;
    const i = room.players.findIndex((p) => p.name === state.me);
    const many = room.players.length > 6;
    const others = [...room.players.slice(i + 1), ...room.players.slice(0, Math.max(0, i))];
    const stack = Math.min(room.pile, 9);
    const newLog = room.log.length !== (before?.log?.length ?? room.log.length);
    const lastPlay = [...room.log].reverse().find((e) => e.t === 'play');
    root().innerHTML = `<section class="mt ${myTurn ? 'my-turn' : ''}">
      <header class="mt-top"><div class="mt-title"><small>Table ${esc(room.code)}</small><b>Le Menteur</b></div>
        <div class="mt-fam" title="Familles retirées du jeu">${room.removed.length ? room.removed.map((f) => `<span>${SHORT[f.rank]}</span>`).join('') : '<em>Aucune famille sortie</em>'}</div>
        ${button('leave', 'Quitter', 'ghost')}</header>
      <div class="mt-seats ${many ? 'many' : ''}">${others.map(seatHtml).join('')}</div>
      <div class="mt-center">
        <div class="mt-pile ${newLog && lastPlay && room.last ? 'drop' : ''}" style="--n:${stack}">${stack ? Array.from({ length: stack }, (_, k) => `<i style="--k:${k};--r:${((k * 37) % 15) - 7}deg">${back()}</i>`).join('') : '<span class="mt-empty">Tas vide</span>'}</div>
        <div class="mt-call">
          ${room.phase === 'over' ? '' : room.last
            ? `<small>${esc(room.last.by === state.me ? 'Tu as annoncé' : room.last.by + ' annonce')}</small><strong class="${newLog ? 'mt-new' : ''}">${announce(room.last.count, room.last.rank)}</strong><span>${room.pile} carte${room.pile > 1 ? 's' : ''} dans le tas · on joue les ${PLURAL[room.rank]}</span>`
            : `<small>Nouveau tour</small><strong>${esc(room.turn === state.me ? 'À toi d’ouvrir' : room.turn + ' ouvre')}</strong><span>${room.starter && room.log.length <= room.removed.length ? `${esc(room.starter.name)} a la ${room.starter.card === 23 ? 'dame de cœur' : 'dame de pique'}` : 'Choisis une valeur et pose'}</span>`}
        </div>
        <ol class="mt-log">${room.log.slice(-5).map((e) => `<li>${logLine(e)}</li>`).join('')}</ol>
      </div>
      ${room.phase === 'over' ? overHtml() : handHtml(myTurn)}
      <div class="mt-reveal" id="mt-reveal" hidden></div>
    </section>`;
    bindHand();
    paintClock();
    if (room.reveal && room.reveal.id !== seenReveal) { seenReveal = room.reveal.id; showReveal(room.reveal); }
  }
  function handHtml(myTurn) {
    const lead = myTurn && room.lead;
    const canCall = room.phase === 'playing' && room.last && room.last.by !== state.me;
    const status = room.phase !== 'playing' ? '' : !myTurn ? `C’est à <b>${esc(room.turn)}</b> de jouer${canCall ? ` · tu peux quand même accuser <b>${esc(room.last.by)}</b>` : ''}` : lead ? 'Choisis tes cartes, puis la valeur que tu annonces' : `Pose des <b>${PLURAL[room.rank]}</b>, vrais ou faux, ou accuse <b>${esc(room.last.by)}</b>`;
    return `<footer class="mt-me">
      <p class="mt-status">${status}<span class="mt-mine"><b class="js-clock-me"></b></span></p>
      ${lead ? `<div class="mt-ranks" role="radiogroup" aria-label="Valeur annoncée">${SHORT.map((r, k) => `<button type="button" role="radio" aria-checked="${chosenRank === k}" class="${chosenRank === k ? 'on' : ''}" data-rank="${k}">${r}</button>`).join('')}</div>` : ''}
      <div class="mt-hand ${myTurn ? '' : 'idle'}" style="--n:${room.hand.length}">${room.hand.map((c, k) => `<button type="button" class="mt-card ${selected.has(c) ? 'sel' : ''}" data-card="${c}" style="--k:${k}" aria-pressed="${selected.has(c)}" aria-label="${NAMES[rankOf(c)]} de ${['pique', 'cœur', 'carreau', 'trèfle'][Math.floor(c / 13)]}" ${myTurn ? '' : 'tabindex="-1"'}>${face(c)}</button>`).join('')}</div>
      <div class="mt-acts">
        ${canCall ? button('liar', `Menteur${myTurn ? '' : ', ' + esc(room.last.by)} !`, 'red big') : ''}
        ${myTurn ? button('play', '', 'gold big', true, 'id="mt-play"') : ''}
      </div>
      <p id="mt-msg" class="mt-msg" role="status"></p>
    </footer>`;
  }
  function overHtml() {
    const ranked = [...room.players].sort((a, b) => a.count - b.count);
    return `<footer class="mt-over">
      <h2>${room.winner === state.me ? 'Tu as gagné !' : `${esc(room.winner)} gagne`}</h2>
      <ol>${ranked.map((p, k) => `<li class="${p.name === state.me ? 'me' : ''}"><span>${k + 1}</span><b>${esc(p.name)}</b><em>${p.count ? `${p.count} carte${p.count > 1 ? 's' : ''}` : 'Plus de cartes'}</em></li>`).join('')}</ol>
      <div class="mt-acts">${host() ? button('rematch', 'Rejouer', 'gold big') : '<p class="ml-note">L’hôte peut relancer une partie.</p>'}${button('leave', 'Quitter la table', 'ghost')}</div>
      <p id="mt-msg" class="mt-msg" role="status"></p></footer>`;
  }
  function bindHand() {
    root().querySelectorAll('[data-card]').forEach((b) => b.addEventListener('click', () => {
      if (room.turn !== state.me) return;
      const c = Number(b.dataset.card);
      if (selected.has(c)) selected.delete(c); else if (selected.size < 4) selected.add(c);
      // annoncer par défaut la vraie valeur quand toutes les cartes choisies sont pareilles
      const ranks = new Set([...selected].map(rankOf));
      if (room.lead && ranks.size === 1 && (chosenRank === null || !selected.size)) chosenRank = [...ranks][0];
      if (room.lead && !selected.size) chosenRank = null;
      paintSelection();
    }));
    root().querySelectorAll('[data-rank]').forEach((b) => b.addEventListener('click', () => { chosenRank = Number(b.dataset.rank); paintSelection(); }));
    paintSelection();
  }
  function paintSelection() {
    root().querySelectorAll('[data-card]').forEach((b) => { const on = selected.has(Number(b.dataset.card)); b.classList.toggle('sel', on); b.setAttribute('aria-pressed', on); });
    root().querySelectorAll('[data-rank]').forEach((b) => { const on = Number(b.dataset.rank) === chosenRank; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
    const play = el('mt-play');
    if (!play) return;
    const n = selected.size, rank = room.lead ? chosenRank : room.rank, can = n >= 1 && n <= 4 && rank !== null;
    play.textContent = can ? `Poser · ${announce(n, rank)}` : n ? 'Choisis la valeur annoncée' : 'Sélectionne tes cartes';
    play.dataset.off = can ? '0' : '1';
    play.disabled = busy || !can;
  }
  function showReveal(r) {
    const box = el('mt-reveal');
    if (!box) return;
    const mine = r.loser === state.me;
    box.innerHTML = `<div class="mr ${r.lied ? 'lied' : 'true'}">
      <small>${esc(r.caller === state.me ? 'Tu accuses' : r.caller + ' accuse')} ${esc(r.by === state.me ? 'toi' : r.by)}</small>
      <div class="mr-cards">${r.cards.map((c, k) => `<span class="mr-card ${rankOf(c) === r.rank ? 'ok' : 'ko'}" style="--k:${k}"><i class="b">${back()}</i><i class="f">${face(c)}</i></span>`).join('')}</div>
      <strong>${r.lied ? 'Menteur !' : 'Il disait vrai'}</strong>
      <p>${esc(mine ? 'Tu ramasses' : r.loser + ' ramasse')} ${r.taken} carte${r.taken > 1 ? 's' : ''}</p></div>`;
    const involved = r.caller === state.me || r.by === state.me;
    box.classList.toggle('aside', !involved);
    box.hidden = false;
    if (r.lied && r.caller === state.me) window.FX?.win?.(0, 'BIEN VU');
    clearTimeout(revealTimer);
    revealTimer = setTimeout(() => { const b = el('mt-reveal'); if (b) b.hidden = true; }, involved ? 3200 : 2400);
    box.onclick = () => { box.hidden = true; };
  }
  function paintClock() {
    if (!room || room.phase !== 'playing') return;
    const left = room.deadline ? Math.max(0, room.deadline - Date.now() - offset) : null;
    const total = (room.settings.turn || 1) * 1000;
    root()?.querySelectorAll('.js-clock').forEach((b) => { b.style.width = left === null ? '100%' : `${(left / total) * 100}%`; });
    const mine = root()?.querySelector('.js-clock-me');
    if (mine) mine.textContent = room.turn === state.me && left !== null ? `${Math.ceil(left / 1000)} s` : '';
  }

  /* ---------- actions */
  async function onAction(e) {
    const b = e.currentTarget, act = b.dataset.mt;
    if (act === 'join') return;
    if (act === 'copy') {
      const link = `${location.origin}${location.pathname}#/menteur/${room.code}`;
      try { await navigator.clipboard.writeText(link); message('Lien copié. Envoie-le à tes potes.', false); } catch { message('Copie ce lien : ' + link, false); }
    } else if (act === 'solo') action('create', { solo: true });
    else if (act === 'create') action('create');
    else if (act === 'turn') action('settings', { turn: Number(b.dataset.v) });
    else if (act === 'unbot') action('unbot', { name: b.dataset.name });
    else if (act === 'play') { const cards = [...selected]; const r = await action('play', room.lead ? { cards, rank: chosenRank } : { cards }); if (r) { selected.clear(); chosenRank = null; } }
    else if (act === 'liar') { if (room.last) action('liar', { playId: room.last.id }); }
    else action(act);
  }

  async function refresh() {
    if (!active) return;
    const token = generation, m = mutation;
    try { const data = await request('state'); if (active && token === generation && m === mutation) accept(data); } catch {}
  }
  async function open(code) {
    active = true; const token = ++generation; room = null; screen = ''; busy = false; selected.clear(); chosenRank = null;
    root().innerHTML = '<p class="mt-loading" role="status">On sort les cartes…</p>';
    try {
      const [cfg, data] = await Promise.all([request('config'), request('state')]);
      if (!active || token !== generation) return;
      config = cfg; accept(data);
      if (code && !room) await action('join', { code });
      timer = setInterval(paintClock, 250); poll = setInterval(refresh, 6000);
    } catch (e) {
      if (active && token === generation) root().innerHTML = `<section class="mh"><div class="mh-hero"><h1>Table indisponible</h1><p>${esc(e.message)}</p></div></section>`;
    }
  }
  function stop() {
    active = false; generation++; clearInterval(timer); clearInterval(poll); clearTimeout(revealTimer); timer = poll = null; screen = '';
  }
  function bind(es) {
    es.addEventListener('menteur:state', (e) => {
      if (!active || !config) return;
      const data = JSON.parse(e.data);
      if (data.room === null || !room || data.room.code === room.code) accept(data);
    });
  }
  return { open, stop, bind, refresh, card: face };
})();
