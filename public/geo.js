'use strict';
/* Bahlou Geo : Street View en plein écran, une mini-carte pour deviner. Google Maps n'est chargé qu'en entrant dans une partie. */
const Geo = (() => {
  let active = false, generation = 0, config = null, room = null, screen = '', timer = null, poll = null;
  let clockOffset = 0, busy = false, ready = false, mutation = 0, mapsPromise = null, map = null, panorama = null, selection = null;
  let pins = [], lines = [], mapListener = null, refreshPending = false, preparing = null, failed = null, prepared = 0, soloStart = false, anim = 0, keyHandler = null;
  const root = () => document.querySelector('#geo-body');
  const el = id => root()?.querySelector('#' + id);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(n).toLocaleString('fr-FR');
  const km = d => (d < 1 ? `${fmt(d * 1000)} m` : `${d < 10 ? d.toFixed(1).replace('.', ',') : fmt(d)} km`);
  const host = () => room?.host === state.me;
  const me = () => room?.players.find(p => p.name === state.me);
  const request = (action, body) => api(body === undefined ? 'GET' : 'POST', '/api/geo/' + action, body);
  const TIME_LABEL = s => (s ? `${s} s` : 'Illimité');

  function message(text, bad = true) {
    const node = el('geo-message');
    if (node) { node.textContent = text; node.classList.toggle('bad', bad); node.setAttribute('role', bad ? 'alert' : 'status'); }
  }
  function accept(data) {
    if (!active) return;
    if (room && data.room?.code === room.code && data.room.version < room.version) return;
    clockOffset = data.serverNow - Date.now();
    room = data.room;
    render();
    if (data.message) message(data.message);
  }
  async function action(name, body = {}) {
    if (busy) return null;
    const token = generation;
    mutation++; busy = true; setBusy(); message('', false);
    try { const data = await request(name, body); if (active && token === generation) accept(data); return data; }
    catch (e) { if (active && token === generation) { message(e.message); refresh(); } return null; }
    finally { if (token === generation) { busy = false; setBusy(); } }
  }
  function setBusy() {
    root()?.querySelectorAll('[data-geo-action]').forEach(b => { b.disabled = busy || b.dataset.locked === 'true'; });
    const join = el('geo-join-button'); if (join) join.disabled = busy || !config?.configured;
  }
  function button(action, text, locked = false, css = '') {
    return `<button type="button" class="geo-button ${css}" data-geo-action="${action}" data-locked="${locked}" ${locked ? 'disabled' : ''}>${text}</button>`;
  }
  function disposeMaps() {
    mapListener?.remove(); mapListener = null;
    pins.forEach(p => { p.map = null; }); pins = [];
    lines.forEach(l => l.setMap(null)); lines = [];
    if (panorama) { google.maps.event.clearInstanceListeners(panorama); panorama.setVisible(false); }
    if (map) google.maps.event.clearInstanceListeners(map);
    panorama = null; map = null; selection = null;
  }

  /* ---------- écrans */
  function render() {
    if (!active) return;
    const key = room ? `${room.code}:${room.phase}:${room.round?.id || ''}:${room.host}` : 'home';
    if (screen !== key) {
      disposeMaps(); screen = key;
      document.querySelector('#geo-view')?.classList.toggle('playing', room?.phase === 'playing');
      if (!room) renderHome();
      else if (room.phase === 'waiting') renderLobby();
      else if (room.phase === 'playing') renderGame();
      else if (room.phase === 'results') renderResults();
      else renderFinal();
      root().querySelectorAll('[data-geo-action]').forEach(b => b.addEventListener('click', onAction));
    }
    paintPlayers(); updateClock(); setBusy();
    if (room?.phase === 'waiting') paintLobby();
    if (room?.phase === 'playing') paintPlaying();
  }
  function renderHome() {
    root().innerHTML = `<section class="gh">
      <div class="gh-hero"><small>Bahlou Geo</small><h1>Où es-tu ?</h1><p>Tu es lâché quelque part sur Terre. Explore les rues, repère les panneaux, la végétation, le sens de circulation. Puis place ton point sur la carte.</p></div>
      <div class="gh-cards">
        <article class="gh-card"><h2>Jouer seul</h2><p>Une partie rapide pour t'entraîner, à ton rythme.</p>${button('solo', 'Partir maintenant', !config?.configured)}</article>
        <article class="gh-card"><h2>Avec tes potes</h2><p>Crée un salon, partage le lien, et que le meilleur explorateur gagne.</p>${button('create', 'Créer un salon', !config?.configured)}
          <form id="geo-join" class="gh-join"><input id="geo-code" maxlength="6" autocomplete="off" placeholder="CODE" aria-label="Code du salon"><button id="geo-join-button" class="geo-button secondary" type="submit">Rejoindre</button></form></article>
      </div>
      ${config?.configured ? '' : '<p class="geo-config">Street View attend sa configuration : l’hébergeur doit ajouter une clé Google Maps.</p>'}
      <p id="geo-message" class="geo-message" role="status"></p></section>`;
    el('geo-join').addEventListener('submit', e => { e.preventDefault(); action('join', { code: el('geo-code').value.trim().toUpperCase() }); });
  }
  function chips(name, options, current, label, locked) {
    return `<div class="gl-set"><span>${label}</span><div class="gl-chips">${options.map(([v, t]) => `<button type="button" class="gl-chip ${String(v) === String(current) ? 'on' : ''}" data-set="${name}" data-value="${escape(v)}" ${locked ? 'disabled' : ''}>${escape(t)}</button>`).join('')}</div></div>`;
  }
  function renderLobby() {
    const s = room.settings, locked = !host();
    root().innerHTML = `<section class="gl">
      <header class="gl-head"><div><small>Salon ${escape(room.code)}</small><h1>Préparez le voyage</h1></div>${button('leave', 'Quitter', false, 'quiet')}</header>
      <div class="gl-grid">
        <div>
          <div class="gl-invite"><span>Code</span><strong>${escape(room.code)}</strong>${button('copy', 'Copier le lien', false, 'secondary')}</div>
          <h2>Explorateurs</h2><div id="geo-players" class="geo-players"></div>
        </div>
        <div class="gl-settings">
          <h2>Réglages${locked ? ' <small>choisis par l’hôte</small>' : ''}</h2>
          ${chips('mode', config.modes.map(m => [m.id, m.label]), s.mode, 'Zone', locked)}
          ${chips('rounds', config.rounds.map(n => [n, String(n)]), s.rounds, 'Manches', locked)}
          ${chips('seconds', config.times.map(n => [n, TIME_LABEL(n)]), s.seconds, 'Temps par manche', locked)}
          ${chips('move', [[true, 'Autorisé'], [false, 'Interdit']], s.move, 'Se déplacer', locked)}
          <p id="geo-ready" class="gl-ready"></p>
          ${host() ? button('reseed', 'Chercher d’autres lieux', false, 'quiet') : ''}
          ${host() ? button('start', 'Lancer la partie', true, 'big') : '<p class="gl-wait">L’hôte lance la partie dès que tout le monde est là.</p>'}
          <p id="geo-message" class="geo-message" role="status"></p>
        </div>
      </div></section>`;
    root().querySelectorAll('[data-set]').forEach(b => b.addEventListener('click', () => {
      const v = b.dataset.value, key = b.dataset.set;
      action('settings', { [key]: key === 'mode' ? v : key === 'move' ? v === 'true' : Number(v) });
    }));
  }
  function paintLobby() {
    const ok = room.preparedCount >= room.settings.rounds;
    const ready = el('geo-ready');
    if (ready) ready.textContent = ok ? `${room.preparedCount} lieux trouvés, prêt à partir.` : host() ? (preparing ? `Recherche de lieux… ${prepared} / ${room.settings.rounds}` : 'Recherche de lieux…') : 'L’hôte cherche les lieux de la partie…';
    const start = root().querySelector('[data-geo-action=start]'); if (start) { start.dataset.locked = String(!ok); setBusy(); }
    root().querySelectorAll('[data-set]').forEach(b => b.classList.toggle('on', String(room.settings[b.dataset.set]) === b.dataset.value));
    if (host()) ensurePrepared();
    if (soloStart && host() && ok && !busy) { soloStart = false; action('start'); }
  }
  function renderGame() {
    root().innerHTML = `<section class="gx">
      <div id="geo-panorama" class="gx-pano"></div>
      <p id="geo-pano-status" class="gx-status">Chargement de Street View…</p>
      <div class="gx-top">
        <div class="gx-row">${button('leave', 'Quitter', false, 'gx-chip')}<span class="gx-chip">Manche ${room.round.number} / ${room.round.total}</span><span class="gx-chip dim">${escape(room.modeLabel)}</span></div>
        <div class="gx-row"><span class="gx-chip gx-clock" id="geo-clock"></span><span class="gx-chip gx-score" id="geo-score"></span></div>
      </div>
      <div id="geo-players" class="gx-players"></div>
      <button type="button" class="gx-back" data-geo-action="return" title="Revenir au point de départ">Retour au départ</button>
      <div class="gx-hint" id="geo-hint" hidden></div>
      <div class="gx-guess" id="geo-guess">
        <div class="gx-map-tools"><button type="button" class="gx-size" data-size="small" title="Petite carte">−</button><button type="button" class="gx-size" data-size="big" title="Grande carte">+</button></div>
        <div id="geo-map" class="gx-map"></div>
        <div class="gx-actions">${button('hint', 'Indice', false, 'gx-btn-alt')}<button type="button" id="geo-confirm" class="geo-button gx-btn" data-geo-action="guess" data-locked="true" disabled>Place ton point</button></div>
      </div>
      <button type="button" class="gx-open" id="geo-open">Carte</button>
      <p id="geo-message" class="geo-message gx-msg" role="status"></p></section>`;
    const guess = el('geo-guess');
    root().querySelectorAll('.gx-size').forEach(b => b.addEventListener('click', () => { guess.classList.toggle('big', b.dataset.size === 'big'); guess.classList.toggle('small', b.dataset.size === 'small'); }));
    el('geo-open').addEventListener('click', () => guess.classList.toggle('open'));
    loadGame();
  }
  function paintPlaying() {
    const guess = room.round.guess, confirm = el('geo-confirm');
    if (confirm) {
      confirm.dataset.locked = String(!selection || !!guess);
      confirm.textContent = guess ? 'Réponse envoyée' : selection ? 'Deviner' : 'Place ton point';
    }
    const hintBtn = root().querySelector('[data-geo-action=hint]');
    if (hintBtn) { hintBtn.dataset.locked = String(!!room.round.hint || !!guess); hintBtn.textContent = room.round.hint ? 'Indice utilisé' : 'Indice'; }
    const hint = el('geo-hint');
    if (hint) { hint.hidden = !room.round.hint; hint.innerHTML = room.round.hint ? `<small>Indice</small><b>${escape(room.round.hint)}</b><span>Points ×${String(config.hintFactor).replace('.', ',')}</span>` : ''; }
    const sc = el('geo-score'); if (sc) sc.textContent = `${fmt(me()?.score || 0)} pts`;
    if (guess) root().querySelector('.gx')?.classList.add('sent');
    setBusy();
  }
  function renderResults() {
    const res = room.result, mine = res.answers.find(a => a.name === state.me);
    const order = [...res.answers].sort((a, b) => b.points - a.points);
    root().innerHTML = `<section class="gr">
      <div id="geo-map" class="gr-map"></div>
      <aside class="gr-panel">
        <small>Manche ${res.number} / ${room.round.total} · C’était</small>
        <h1>${escape(res.location.zone)}</h1>
        <div class="gr-km"><b id="gr-km">${mine?.guess ? '0' : '—'}</b><span>${mine?.guess ? 'de distance' : 'pas de réponse'}</span></div>
        <div class="gr-bar"><i id="gr-bar"></i></div>
        <p class="gr-pts"><b id="gr-pts">+0</b> points${mine?.hinted ? ' <em>indice utilisé</em>' : ''}</p>
        <ol class="gr-list">${order.map((a, i) => `<li class="${a.name === state.me ? 'me' : ''}"><span>${i + 1}</span><b>${escape(a.name)}</b><em>${a.distanceKm === null ? '—' : km(a.distanceKm)}</em><strong>+${fmt(a.points)}</strong></li>`).join('')}</ol>
        <h2>Classement</h2><div id="geo-players" class="geo-players compact"></div>
        ${host() ? button('next', 'Manche suivante', false, 'big') : '<p class="gl-wait">L’hôte lance la manche suivante.</p>'}
        <p id="geo-message" class="geo-message" role="status"></p>
      </aside></section>`;
    countUp(mine);
    loadResults([res], mine);
  }
  function renderFinal() {
    const ranked = [...room.players].sort((a, b) => b.score - a.score);
    const max = room.round.total * 5000;
    root().innerHTML = `<section class="gf">
      <header class="gf-head"><small>${escape(room.modeLabel)} · ${room.round.total} manches</small><h1>${escape(ranked[0].name)} gagne !</h1></header>
      <div class="gf-grid">
        <div id="geo-map" class="gf-map"></div>
        <aside>
          <ol class="gf-podium">${ranked.map((p, i) => `<li class="${p.name === state.me ? 'me' : ''}"><span>${i + 1}</span><b>${escape(p.name)}</b><strong>${fmt(p.score)}</strong><i style="--w:${Math.max(2, (p.score / max) * 100)}%"></i></li>`).join('')}</ol>
          <ol class="gf-rounds">${room.history.map(h => { const a = h.answers.find(x => x.name === state.me); return `<li><span>${h.number}</span><b>${escape(h.location.zone)}</b><em>${a?.distanceKm == null ? '—' : km(a.distanceKm)}</em><strong>+${fmt(a?.points || 0)}</strong></li>`; }).join('')}</ol>
          <div class="gf-actions">${host() ? button('rematch', 'Rejouer', false, 'big') : '<p class="gl-wait">L’hôte peut relancer une partie.</p>'}${button('leave', 'Quitter', false, 'quiet')}</div>
          <p id="geo-message" class="geo-message" role="status"></p>
        </aside>
      </div></section>`;
    const mine = state.me;
    loadResults(room.history, null, mine);
  }
  function paintPlayers() {
    const list = el('geo-players'); if (!list || !room) return;
    if (room.phase === 'playing') {
      list.innerHTML = room.players.filter(p => !p.left).map(p => `<span class="${p.submitted ? 'done' : ''}" title="${p.submitted ? 'a répondu' : 'cherche encore'}">${escape(p.name)}</span>`).join('');
      return;
    }
    const sorted = room.phase === 'waiting' ? room.players : [...room.players].sort((a, b) => b.score - a.score);
    list.innerHTML = sorted.map((p, i) => `<div class="geo-player ${p.name === state.me ? 'is-me' : ''}"><span class="geo-place">${room.phase === 'waiting' ? '' : i + 1}</span><b>${escape(p.name)}${p.name === state.me ? ' <small>toi</small>' : ''}</b><span>${p.left ? 'Parti' : room.phase === 'waiting' ? (p.name === room.host ? 'Hôte' : 'Prêt') : fmt(p.score) + ' pts'}</span></div>`).join('');
  }
  function updateClock() {
    const node = el('geo-clock'); if (!node || room?.phase !== 'playing') return;
    if (!room.round.deadline) { node.textContent = '∞'; return; }
    const seconds = Math.max(0, Math.ceil((room.round.deadline - Date.now() - clockOffset) / 1000));
    node.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    node.classList.toggle('urgent', seconds <= 10);
    if (!seconds) { const b = el('geo-confirm'); if (b) { b.dataset.locked = 'true'; setBusy(); } }
  }
  function countUp(mine) {
    const kmEl = el('gr-km'), ptsEl = el('gr-pts'), bar = el('gr-bar');
    cancelAnimationFrame(anim);
    if (!mine) return;
    const t0 = performance.now(), dur = 1200;
    const step = t => {
      const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3);
      if (mine.distanceKm !== null && kmEl) kmEl.textContent = km(mine.distanceKm * e);
      if (ptsEl) ptsEl.textContent = '+' + fmt(mine.points * e);
      if (bar) bar.style.width = `${(mine.points / 5000) * 100 * e}%`;
      if (k < 1 && active && kmEl?.isConnected) anim = requestAnimationFrame(step);
    };
    anim = requestAnimationFrame(step);
    if (mine.points >= 4000) window.FX?.win(0, 'EN PLEIN DEDANS');
  }

  /* ---------- Google Maps */
  function loadMaps() {
    if (mapsPromise) return mapsPromise;
    mapsPromise = new Promise((resolve, reject) => {
      if (!config?.apiKey) { reject(new Error('La clé Google Maps n’est pas configurée.')); return; }
      let script = null;
      const timeout = setTimeout(() => fail('Google Maps ne répond pas. Vérifie ta connexion puis réessaie.'), 20_000);
      const fail = text => { clearTimeout(timeout); if (script) script.remove(); mapsPromise = null; reject(new Error(text)); };
      window.gm_authFailure = () => { fail('Google Maps refuse la clé. Demande à l’hébergeur de vérifier la clé, le domaine autorisé et la facturation.'); if (active) message('Google Maps refuse la clé. L’hébergeur doit vérifier sa configuration.'); };
      window.bahlouGeoMapsReady = async () => {
        try { await Promise.all(['maps', 'streetView', 'marker', 'geometry'].map(lib => google.maps.importLibrary(lib))); clearTimeout(timeout); resolve(google.maps); }
        catch { fail('Impossible de charger les composants Google Maps. Réessaie.'); }
      };
      if (window.google?.maps?.importLibrary) { window.bahlouGeoMapsReady(); return; }
      script = document.createElement('script');
      const url = new URL('https://maps.googleapis.com/maps/api/js');
      url.search = new URLSearchParams({ key: config.apiKey, v: 'weekly', loading: 'async', callback: 'bahlouGeoMapsReady', language: 'fr' });
      script.src = url.href; script.async = true; script.onerror = () => fail('Google Maps est inaccessible. Vérifie ta connexion ou ton bloqueur de contenu.'); document.head.append(script);
    });
    return mapsPromise;
  }
  function makeMap(node, extra = {}) {
    return new google.maps.Map(node, { center: { lat: 25, lng: 5 }, zoom: 1, minZoom: 1, mapId: 'DEMO_MAP_ID', streetViewControl: false, mapTypeControl: false, fullscreenControl: false, clickableIcons: false, gestureHandling: 'greedy', draggableCursor: 'crosshair', ...extra });
  }
  function pin(position, text, kind = '') {
    const label = document.createElement('span'); label.className = 'geo-pin ' + kind; label.textContent = text;
    const p = new google.maps.marker.AdvancedMarkerElement({ map, position, content: label, title: text }); pins.push(p); return p;
  }
  function selectPoint(point) {
    if (room?.phase !== 'playing' || room.round.guess || (room.round.deadline && Date.now() + clockOffset >= room.round.deadline)) return;
    selection = point;
    pins.forEach(p => { p.map = null; }); pins = []; pin(point, 'Toi', 'me');
    paintPlaying();
  }
  async function loadGame() {
    const token = generation, key = screen;
    try {
      await loadMaps(); if (!active || generation !== token || screen !== key) return;
      disposeMaps();
      map = makeMap(el('geo-map'));
      mapListener = map.addListener('click', e => { if (e.latLng) selectPoint(e.latLng.toJSON()); });
      const move = room.settings.move;
      panorama = new google.maps.StreetViewPanorama(el('geo-panorama'), {
        pano: room.round.panoId, pov: { heading: Math.random() * 360, pitch: 0 }, zoom: 0,
        addressControl: false, showRoadLabels: false, fullscreenControl: false, motionTracking: false, motionTrackingControl: false, enableCloseButton: false,
        linksControl: move, clickToGo: move, panControl: true, zoomControl: true, imageDateControl: false,
      });
      panorama.addListener('status_changed', () => {
        if (!active || key !== screen) return;
        el('geo-pano-status').textContent = panorama.getStatus() === google.maps.StreetViewStatus.OK ? '' : 'Ce panorama est indisponible.';
      });
      if (room.round.guess) { selection = room.round.guess; pin(selection, 'Toi', 'me'); }
      paintPlaying();
    } catch (e) { if (active && generation === token && screen === key) { el('geo-pano-status').textContent = 'Street View indisponible'; message(e.message); } }
  }
  async function loadResults(rounds, mine, focus) {
    const token = generation, key = screen;
    try {
      await loadMaps(); if (!active || generation !== token || screen !== key) return;
      disposeMaps(); map = makeMap(el('geo-map'), { draggableCursor: null });
      const bounds = new google.maps.LatLngBounds();
      for (const r of rounds) {
        pin(r.location, rounds.length > 1 ? String(r.number) : 'Ici', 'correct'); bounds.extend(r.location);
        for (const a of r.answers) if (a.guess && (rounds.length === 1 || a.name === focus)) {
          if (rounds.length === 1) pin(a.guess, a.name, a.name === state.me ? 'me' : '');
          bounds.extend(a.guess);
          const line = new google.maps.Polyline({ map, path: [a.guess, a.guess], geodesic: true, strokeColor: a.name === state.me ? '#ffd21f' : '#f2efe6', strokeWeight: a.name === state.me ? 3 : 2, strokeOpacity: .85 });
          lines.push(line);
          const from = new google.maps.LatLng(a.guess), to = new google.maps.LatLng(r.location), t0 = performance.now();
          const grow = t => { const k = Math.min(1, (t - t0) / 1100); line.setPath([from, google.maps.geometry.spherical.interpolate(from, to, 1 - Math.pow(1 - k, 3))]); if (k < 1 && active && screen === key) requestAnimationFrame(grow); };
          requestAnimationFrame(grow);
        }
      }
      map.fitBounds(bounds, 60);
      google.maps.event.addListenerOnce(map, 'idle', () => { if (map && map.getZoom() > 12) map.setZoom(12); });
    } catch (e) { if (active && generation === token && screen === key) message(e.message); }
  }

  /* ---------- préparation des lieux (hôte, en arrière-plan) */
  async function ensurePrepared() {
    const seeds = room?.seeds;
    if (!seeds || room.preparedCount >= room.settings.rounds || preparing === seeds.version || failed === seeds.version) return;
    preparing = seeds.version; prepared = 0;
    const token = generation, version = seeds.version, want = room.settings.rounds + 2;
    try {
      await loadMaps();
      const service = new google.maps.StreetViewService(), found = [], ids = new Set();
      const queue = seeds.points.map((p, index) => ({ ...p, index }));
      const still = () => active && token === generation && room?.seeds?.version === version && room.phase === 'waiting';
      const worker = async () => {
        while (queue.length && found.length < want && still()) {
          const c = queue.shift();
          try {
            const result = await Promise.race([service.getPanorama({ location: { lat: c.lat, lng: c.lng }, radius: config.seedRadiusKm * 1000, source: google.maps.StreetViewSource.OUTDOOR, preference: google.maps.StreetViewPreference.NEAREST }), new Promise((_, reject) => setTimeout(() => reject(new Error('lent')), 6000))]);
            const loc = result.data.location;
            if (!ids.has(loc.pano) && (result.data.links?.length || 0) > 0) { ids.add(loc.pano); found.push({ index: c.index, panoId: loc.pano, ...loc.latLng.toJSON() }); prepared = found.length; paintLobby(); }
          } catch { /* pas d'image ici : on tente le point suivant */ }
        }
      };
      await Promise.all(Array.from({ length: 6 }, worker));
      if (!still()) { if (preparing === version) preparing = null; return; }
      if (found.length < room.settings.rounds) { preparing = null; failed = version; paintLobby(); message('Pas assez de lieux trouvés. Clique sur « Chercher d’autres lieux ».'); return; }
      const data = await request('prepare', { seedVersion: version, locations: found.slice(0, want) });
      if (active && token === generation) accept(data);
    } catch (e) { if (preparing === version) { preparing = null; failed = version; } if (active && token === generation) { paintLobby(); message(e.message); } }
  }

  /* ---------- actions */
  async function onAction(e) {
    const name = e.currentTarget.dataset.geoAction;
    if (name === 'copy') {
      const link = `${location.origin}${location.pathname}#/geo/${room.code}`;
      try { await navigator.clipboard.writeText(link); message('Lien copié. Envoie-le à tes potes.', false); }
      catch { message('Copie ce lien : ' + link, false); }
    } else if (name === 'solo') { soloStart = true; await action('create'); }
    else if (name === 'guess') { if (selection) action('guess', { roundId: room.round.id, ...selection }); }
    else if (name === 'hint') action('hint', { roundId: room.round.id });
    else if (name === 'next' || name === 'rematch') action(name, { roundId: room.round.id });
    else if (name === 'return') { panorama?.setPano(room.round.panoId); panorama?.setPov({ heading: 0, pitch: 0 }); }
    else if (name === 'reseed') { failed = null; action('settings', { reseed: true }); }
    else if (name === 'leave') { soloStart = false; preparing = null; action('leave'); }
    else action(name);
  }
  function onKey(e) {
    if (!active || room?.phase !== 'playing' || /INPUT|TEXTAREA/.test(document.activeElement?.tagName || '')) return;
    if ((e.key === ' ' || e.key === 'Enter') && selection && !room.round.guess) { e.preventDefault(); action('guess', { roundId: room.round.id, ...selection }); }
  }
  async function refresh() {
    if (!active || refreshPending) return;
    const token = generation, beforeMutation = mutation; refreshPending = true;
    try { const data = await request('state'); if (active && token === generation && mutation === beforeMutation) accept(data); }
    catch (e) { if (active && token === generation && mutation === beforeMutation) message(e.message); }
    finally { if (token === generation) refreshPending = false; }
  }
  async function open(code) {
    active = true; ready = false; const token = ++generation; screen = ''; room = null; busy = false; preparing = null;
    root().innerHTML = '<p class="geo-loading" role="status">Ouverture de Geo…</p>';
    keyHandler = onKey; addEventListener('keydown', keyHandler);
    try {
      const [cfg, data] = await Promise.all([request('config'), request('state')]);
      if (!active || token !== generation) return;
      config = cfg; ready = true; accept(data);
      if (code && !room) await action('join', { code });
      else if (code && room?.code !== code.toUpperCase()) message('Tu es déjà dans un autre salon. Quitte-le avant de rejoindre ce lien.');
      timer = setInterval(updateClock, 250); poll = setInterval(refresh, 5000);
    } catch (e) {
      if (active && token === generation) { root().innerHTML = '<section class="gh"><div class="gh-hero"><h1>Geo est indisponible.</h1></div><p id="geo-message" class="geo-message" role="alert"></p></section>'; message(e.message); }
    }
  }
  function stop() {
    active = false; ready = false; generation++; cancelAnimationFrame(anim); clearInterval(timer); clearInterval(poll); timer = null; poll = null;
    if (keyHandler) removeEventListener('keydown', keyHandler); keyHandler = null;
    document.querySelector('#geo-view')?.classList.toggle('playing', false);
    refreshPending = false; preparing = null; soloStart = false; disposeMaps(); screen = '';
  }
  function bind(es) {
    es.addEventListener('geo:state', e => {
      if (!active || !ready) return;
      const data = JSON.parse(e.data);
      if (data.room === null || !room || data.room.code === room.code) accept(data);
    });
  }
  return { open, stop, bind, refresh };
})();
