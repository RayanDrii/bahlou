'use strict';
/* Bahlou Geo: Maps is loaded only when a player enters a configured game. */
const Geo = (() => {
  let active = false, generation = 0, config = null, room = null, screen = '', timer = null, poll = null;
  let clockOffset = 0, busy = false, ready = false, mutation = 0, mapsPromise = null, map = null, panorama = null, selection = null;
  let pins = [], lines = [], mapListener = null, refreshPending = false;
  const root = () => document.querySelector('#geo-body');
  const el = id => root()?.querySelector('#' + id);
  const escape = value => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmt = n => Math.round(n).toLocaleString('fr-FR');
  const host = () => room?.host === state.me;
  const request = (action, body) => api(body === undefined ? 'GET' : 'POST', '/api/geo/' + action, body);
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
    if (busy) return;
    const token = generation;
    mutation++; busy = true; setBusy(); message('', false);
    try { const data = await request(name, body); if (active && token === generation) accept(data); }
    catch (e) { if (active && token === generation) { message(e.message); refresh(); } }
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
  function header(title, text) {
    return `<header class="geo-header"><div><h1>${title}</h1><p>${text}</p></div><a class="geo-back" href="#/chat">Retour au Salon</a></header>`;
  }
  function render() {
    if (!active) return;
    const key = room ? `${room.code}:${room.phase}:${room.round?.id || ''}:${room.host}` : 'home';
    if (screen !== key) {
      disposeMaps(); screen = key;
      if (!room) renderHome();
      else if (room.phase === 'waiting') renderLobby();
      else if (room.phase === 'playing') renderGame();
      else renderResults();
      root().querySelectorAll('[data-geo-action]').forEach(b => b.addEventListener('click', onAction));
    }
    paintPlayers(); updateClock(); setBusy();
    if (room?.phase === 'waiting') {
      const ready = el('geo-ready'); if (ready) ready.textContent = room.preparedCount >= 5 ? `${room.preparedCount} panoramas prêts` : 'Les panoramas seront préparés au lancement.';
      const start = el('geo-start'); if (start) { start.dataset.locked = String(room.players.filter(p => !p.left).length < 2); setBusy(); }
    }
    const confirm = el('geo-confirm');
    if (confirm && room?.phase === 'playing') {
      const guess = room.round.guess;
      if (guess) { selection = guess; placePin(guess); }
      confirm.dataset.locked = String(!selection || !!guess); confirm.textContent = guess ? 'Réponse confirmée' : 'Confirmer ma position';
      el('geo-answer-status').textContent = guess ? 'Ta réponse est enregistrée. Les autres joueurs cherchent encore.' : 'Place ton point sur la carte, puis confirme.';
      setBusy();
    }
  }
  function renderHome() {
    root().innerHTML = header('Le monde vous attend.', 'Reconnais les rues. Place ton point. Défie tes amis.') + `
      <div class="geo-home"><section class="geo-intro"><svg class="geo-globe" viewBox="0 0 240 240" aria-hidden="true"><circle cx="120" cy="120" r="105"/><ellipse cx="120" cy="120" rx="48" ry="105"/><ellipse cx="120" cy="120" rx="105" ry="42"/><path d="M15 120h210M120 15v210"/><circle class="geo-globe-dot" cx="161" cy="72" r="8"/></svg><h2>Un même lieu.<br>À chacun son instinct.</h2><p>5 manches de 90 secondes dans Street View. Plus ton point est proche, plus tu marques.</p><p class="geo-footnote">2 à 12 amis · Jusqu’à 5 000 points par manche</p></section>
      <section class="geo-entry"><h2>Partir ensemble</h2><p>Crée un salon privé et partage le lien avec tes amis.</p>${button('create', 'Créer un salon', !config?.configured)}<div class="geo-divider">Tu as déjà un code ?</div><form id="geo-join"><label for="geo-code">Code du salon</label><div class="geo-join-row"><input id="geo-code" name="code" placeholder="ABC234" maxlength="6" minlength="6" pattern="[A-Za-z2-9]{6}" required autocomplete="off" autocapitalize="characters" spellcheck="false"><button class="geo-button secondary" id="geo-join-button" ${config?.configured ? '' : 'disabled'}>Rejoindre</button></div></form>
      ${config?.configured ? '' : '<p class="geo-config">Street View attend sa configuration. L’hébergeur doit ajouter une clé Google Maps pour ouvrir les salons.</p>'}<p class="geo-footnote">Les salons sont temporaires et expirent après une heure d’inactivité.</p></section></div><p id="geo-message" class="geo-message" role="status" aria-live="polite"></p>`;
    el('geo-join').addEventListener('submit', e => { e.preventDefault(); action('join', { code: el('geo-code').value.trim().toUpperCase() }); });
  }
  function renderLobby() {
    root().innerHTML = header('On part où ?', `Salon ${escape(room.code)} · Partage le lien et rassemble tes amis.`) + `
      <div class="geo-lobby"><section><div class="geo-invite"><span>Code du salon</span><strong>${escape(room.code)}</strong>${button('copy', 'Copier le lien', false, 'secondary')}</div><h2>Les explorateurs</h2><div id="geo-players" class="geo-players"></div></section>
      <section class="geo-rules"><h2>Le prochain départ</h2><dl><div><dt>Manches</dt><dd>5</dd></div><div><dt>Temps par lieu</dt><dd>90 secondes</dd></div><div><dt>Terrain de jeu</dt><dd>Le monde</dd></div></dl><p id="geo-ready"></p>${host() ? '<button type="button" id="geo-start" class="geo-button" data-geo-action="start">Préparer et lancer</button><p class="geo-footnote">Le départ est possible dès que vous êtes deux.</p>' : `<p>Le départ sera donné par <b>${escape(room.host)}</b>.</p>`}${button('leave', 'Quitter le salon', false, 'quiet')}</section></div><p id="geo-message" class="geo-message" role="status" aria-live="polite"></p>`;
  }
  function renderGame() {
    root().innerHTML = `<header class="geo-round-head"><div><h1>Quelque part sur Terre.</h1><p>Manche ${room.round.number} / 5 · Salon ${escape(room.code)}</p></div><div class="geo-clock" id="geo-clock" aria-label="Temps restant">1:30</div>${button('leave', 'Quitter', false, 'quiet')}</header>
      <div class="geo-play"><section class="geo-panorama-wrap" aria-label="Explorer le lieu"><div class="geo-panorama" id="geo-panorama"></div><p class="geo-map-loading" id="geo-pano-status">Chargement de Street View…</p><button type="button" class="geo-button secondary geo-return" data-geo-action="return">Revenir au départ</button></section>
      <section class="geo-guess"><h2>Ton point de chute</h2><div id="geo-map" class="geo-map" aria-label="Carte pour placer ta réponse"></div><p id="geo-answer-status"></p><details class="geo-coordinates"><summary>Saisir des coordonnées</summary><form id="geo-point-form"><label>Latitude<input name="lat" type="number" min="-90" max="90" step="any" required></label><label>Longitude<input name="lng" type="number" min="-180" max="180" step="any" required></label><button class="geo-button secondary">Placer</button></form></details><button type="button" class="geo-button" id="geo-confirm" data-geo-action="guess" data-locked="true" disabled>Confirmer ma position</button><div id="geo-players" class="geo-players compact"></div></section></div><p id="geo-message" class="geo-message" role="status" aria-live="polite"></p>${button('retry', 'Réessayer le chargement', false, 'quiet')}`;
    el('geo-point-form').addEventListener('submit', e => {
      e.preventDefault();
      if (room.round.guess || !map) return;
      const f = e.currentTarget;
      selectPoint({ lat: Number(f.elements.lat.value), lng: Number(f.elements.lng.value) });
    });
    loadGame();
  }
  function renderResults() {
    const final = room.phase === 'finished';
    const ranked = [...room.players].sort((a, b) => b.score - a.score);
    const winner = ranked.filter(p => p.score === ranked[0].score).map(p => escape(p.name)).join(' & ');
    root().innerHTML = header(final ? 'Le voyage est terminé.' : 'Alors, c’était où ?', final ? `${winner} en tête · ${fmt(ranked[0].score)} points` : `Manche ${room.round.number} / 5 · Comparez vos intuitions.`) + `
      <div class="geo-results"><section><div id="geo-map" class="geo-result-map" aria-label="Carte des résultats"></div><p class="geo-footnote">Le repère vert indique le lieu de départ. Les traits relient chaque proposition au lieu.</p></section><section><h2>${final ? 'Classement final' : 'Le classement'}</h2><div id="geo-players" class="geo-players"></div><h3>Cette manche</h3><ol class="geo-answer-list">${[...room.result.answers].sort((a, b) => b.points - a.points).map(a => `<li><b>${escape(a.name)}</b><span>${a.guess ? fmt(a.distanceKm) + ' km' : 'Sans réponse'}</span><strong>+${fmt(a.points)}</strong></li>`).join('')}</ol>${host() ? button(final ? 'rematch' : 'next', final ? 'Rejouer ensemble' : 'Manche suivante') : `<p>En attente de ${escape(room.host)} pour la suite.</p>`}${button('leave', 'Quitter le salon', false, 'quiet')}</section></div><p id="geo-message" class="geo-message" role="status" aria-live="polite"></p>${button('retry', 'Réessayer la carte', false, 'quiet')}`;
    loadResults();
  }
  function paintPlayers() {
    const list = el('geo-players'); if (!list || !room) return;
    const sorted = room.phase === 'waiting' ? room.players : [...room.players].sort((a, b) => b.score - a.score);
    list.innerHTML = sorted.map((p, i) => `<div class="geo-player ${p.name === state.me ? 'is-me' : ''}"><span class="geo-place">${room.phase === 'waiting' ? '' : sorted.findIndex(x => x.score === p.score) + 1}</span><b>${escape(p.name)}${p.name === state.me ? ' <small>toi</small>' : ''}</b><span>${p.left ? 'Parti' : room.phase === 'waiting' ? (p.name === room.host ? 'Hôte' : 'Prêt') : room.phase === 'playing' ? (p.submitted ? 'A répondu' : 'Cherche…') : fmt(p.score) + ' pts'}</span></div>`).join('');
  }
  function updateClock() {
    const node = el('geo-clock'); if (!node || room?.phase !== 'playing') return;
    const seconds = Math.max(0, Math.ceil((room.round.deadline - Date.now() - clockOffset) / 1000));
    node.textContent = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
    node.classList.toggle('urgent', seconds <= 15);
    if (!seconds) { const b = el('geo-confirm'); if (b) { b.dataset.locked = 'true'; setBusy(); } }
  }
  function loadMaps() {
    if (mapsPromise) return mapsPromise;
    mapsPromise = new Promise((resolve, reject) => {
      if (!config?.apiKey) { reject(new Error('La clé Google Maps n’est pas configurée.')); return; }
      let script = null;
      const timeout = setTimeout(() => fail('Google Maps ne répond pas. Vérifie ta connexion puis réessaie.'), 20_000);
      const fail = text => { clearTimeout(timeout); if (script) script.remove(); mapsPromise = null; reject(new Error(text)); };
      window.gm_authFailure = () => { fail('Google Maps refuse la clé. Demande à l’hébergeur de vérifier la clé, le domaine autorisé et la facturation.'); if (active) message('Google Maps refuse la clé. L’hébergeur doit vérifier sa configuration.'); };
      window.bahlouGeoMapsReady = async () => {
        try { await Promise.all(['maps', 'streetView', 'marker'].map(lib => google.maps.importLibrary(lib))); clearTimeout(timeout); resolve(google.maps); }
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
  function makeMap(node) {
    return new google.maps.Map(node, { center: { lat: 22, lng: 0 }, zoom: 1, minZoom: 1, mapId: 'DEMO_MAP_ID', streetViewControl: false, mapTypeControl: false, fullscreenControl: true, clickableIcons: false, gestureHandling: 'greedy' });
  }
  function pin(position, text, correct = false) {
    const label = document.createElement('span'); label.className = 'geo-pin' + (correct ? ' correct' : ''); label.textContent = text;
    const p = new google.maps.marker.AdvancedMarkerElement({ map, position, content: label, title: text }); pins.push(p); return p;
  }
  function placePin(point) {
    if (!map) return;
    pins.forEach(p => { p.map = null; }); pins = []; pin(point, 'Toi');
  }
  function selectPoint(point) {
    if (room?.phase !== 'playing' || room.round.guess || Date.now() + clockOffset >= room.round.deadline) return;
    selection = point; placePin(point);
    el('geo-confirm').dataset.locked = 'false'; el('geo-answer-status').textContent = 'Position choisie. Confirme pour enregistrer ta réponse.'; setBusy();
  }
  async function loadGame() {
    const token = generation, key = screen;
    try {
      await loadMaps(); if (!active || generation !== token || screen !== key) return;
      disposeMaps();
      map = makeMap(el('geo-map'));
      mapListener = map.addListener('click', e => { if (e.latLng) selectPoint(e.latLng.toJSON()); });
      panorama = new google.maps.StreetViewPanorama(el('geo-panorama'), { pano: room.round.panoId, pov: { heading: 0, pitch: 0 }, zoom: 0, addressControl: false, showRoadLabels: false, fullscreenControl: false, motionTracking: false, motionTrackingControl: false, enableCloseButton: false });
      panorama.addListener('status_changed', () => {
        if (!active || key !== screen) return;
        el('geo-pano-status').textContent = panorama.getStatus() === google.maps.StreetViewStatus.OK ? '' : 'Ce panorama est indisponible. Réessaie le chargement.';
      });
      if (room.round.guess) { selection = room.round.guess; placePin(selection); }
    } catch (e) { if (active && generation === token && screen === key) { el('geo-pano-status').textContent = 'Street View indisponible'; message(e.message); } }
  }
  async function loadResults() {
    const token = generation, key = screen;
    try {
      await loadMaps(); if (!active || generation !== token || screen !== key) return;
      disposeMaps(); map = makeMap(el('geo-map'));
      const result = room.result, bounds = new google.maps.LatLngBounds();
      pin(result.location, 'Départ', true); bounds.extend(result.location);
      for (const a of result.answers) if (a.guess) {
        pin(a.guess, a.name); bounds.extend(a.guess);
        lines.push(new google.maps.Polyline({ map, path: [a.guess, result.location], geodesic: true, strokeColor: '#ffb547', strokeWeight: 2, strokeOpacity: .75 }));
      }
      map.fitBounds(bounds, 45);
      google.maps.event.addListenerOnce(map, 'idle', () => { if (map && map.getZoom() > 12) map.setZoom(12); });
    } catch (e) { if (active && generation === token && screen === key) message(e.message); }
  }
  async function prepareAndStart() {
    if (busy) return;
    const token = generation, code = room.code;
    busy = true; setBusy();
    try {
      await loadMaps();
      if (!active || token !== generation || room?.code !== code || !host() || room.phase !== 'waiting') return;
      const service = new google.maps.StreetViewService(), locations = [];
      const candidates = config.candidates.map((p, index) => ({ ...p, index })).sort(() => Math.random() - .5);
      for (const c of candidates) {
        if (!active || token !== generation || room?.code !== code || !host() || room.phase !== 'waiting') return;
        message(`Recherche des panoramas… ${locations.length} / 8`, false);
        try {
          const result = await Promise.race([service.getPanorama({ location: c, radius: 1500, source: google.maps.StreetViewSource.OUTDOOR }), new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000))]);
          const loc = result.data.location, point = loc.latLng.toJSON();
          if (!locations.some(p => p.panoId === loc.pano)) locations.push({ index: c.index, panoId: loc.pano, ...point });
        } catch { /* Missing imagery: try the next candidate, up to the bounded list. */ }
        if (locations.length >= 8) break;
      }
      if (!active || token !== generation || room?.code !== code || !host() || room.phase !== 'waiting') return;
      if (locations.length < 5) throw new Error('Moins de 5 panoramas disponibles. Vérifie Google Maps puis réessaie.');
      await request('prepare', { locations });
      if (!active || token !== generation || room?.code !== code || !host() || room.phase !== 'waiting') return;
      const data = await request('start', {});
      if (active && token === generation) accept(data);
    } catch (e) { if (active && token === generation) message(e.message); }
    finally { if (token === generation) { busy = false; setBusy(); } }
  }
  async function onAction(e) {
    const name = e.currentTarget.dataset.geoAction;
    if (name === 'copy') {
      const link = `${location.origin}${location.pathname}#/geo/${room.code}`;
      try { await navigator.clipboard.writeText(link); message('Lien copié. Envoie-le à tes amis.', false); }
      catch { message('Copie ce lien : ' + link, false); }
    } else if (name === 'start') prepareAndStart();
    else if (name === 'guess') { if (selection) action('guess', { roundId: room.round.id, ...selection }); }
    else if (name === 'next' || name === 'rematch') action(name, { roundId: room.round.id });
    else if (name === 'return') { panorama?.setPano(room.round.panoId); panorama?.setPov({ heading: 0, pitch: 0 }); }
    else if (name === 'retry') { disposeMaps(); if (room.phase === 'playing') loadGame(); else loadResults(); }
    else action(name);
  }
  async function refresh() {
    if (!active || refreshPending) return;
    const token = generation, beforeMutation = mutation; refreshPending = true;
    try { const data = await request('state'); if (active && token === generation && mutation === beforeMutation) accept(data); }
    catch (e) { if (active && token === generation && mutation === beforeMutation) message(e.message); }
    finally { if (token === generation) refreshPending = false; }
  }
  async function open(code) {
    active = true; ready = false; const token = ++generation; screen = ''; room = null; busy = false;
    root().innerHTML = '<p class="geo-loading" role="status">Ouverture de Geo…</p>';
    try {
      const [cfg, data] = await Promise.all([request('config'), request('state')]);
      if (!active || token !== generation) return;
      config = cfg; ready = true; accept(data);
      if (code && !room) await action('join', { code });
      else if (code && room?.code !== code.toUpperCase()) message('Tu es déjà dans un autre salon. Quitte-le avant de rejoindre ce lien.');
      timer = setInterval(updateClock, 250); poll = setInterval(refresh, 5000);
    } catch (e) {
      if (active && token === generation) { root().innerHTML = header('Geo est indisponible.', 'Réessaie dans un instant.') + '<p id="geo-message" class="geo-message" role="alert"></p><a class="geo-button" href="#/chat">Retour au Salon</a>'; message(e.message); }
    }
  }
  function stop() {
    active = false; ready = false; generation++; clearInterval(timer); clearInterval(poll); timer = null; poll = null;
    refreshPending = false; disposeMaps(); screen = '';
  }
  function bind(es) { es.addEventListener('geo:state', e => {
    if (!active || !ready) return;
    const data = JSON.parse(e.data);
    if (data.room === null || (room && data.room.code === room.code)) accept(data);
  }); }
  return { open, stop, bind, refresh };
})();
