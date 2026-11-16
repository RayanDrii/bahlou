'use strict';
(function () {
  const THEMES = {
    bahlou: { label: 'Bahlou', colors: null },
    midnight: { label: 'Minuit', colors: ['#0c1221', '#141d30', '#23304a', '#9dbbff'] },
    forest: { label: 'Forêt', colors: ['#101b17', '#192a22', '#2a4034', '#93dbad'] },
    plum: { label: 'Prune', colors: ['#1b1221', '#291c31', '#412c4c', '#d6a9ed'] },
  };
  const hex = value => typeof value === 'string' && /^#[a-f\d]{6}$/i.test(value);
  function normalize(value) {
    const v = value && typeof value === 'object' ? value : {};
    return { theme: Object.hasOwn(THEMES, v.theme) ? v.theme : 'bahlou', accent: hex(v.accent) ? v.accent.toLowerCase() : '',
      wallpaper: typeof v.wallpaper === 'string' && v.wallpaper.length < 560000 && /^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(v.wallpaper) ? v.wallpaper : '' };
  }
  function inkFor(color) {
    const rgb = color.slice(1).match(/../g).map(c => parseInt(c, 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
    return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722 > .179 ? '#111113' : '#ffffff';
  }
  function read(storage, name) { try { return normalize(JSON.parse(storage.getItem('bahlou.appearance.' + name) || '{}')); } catch { return normalize(null); } }
  function write(storage, name, value) { storage.setItem('bahlou.appearance.' + name, JSON.stringify(normalize(value))); }
  if (typeof module !== 'undefined' && module.exports) { module.exports = { normalize, read, write, inkFor }; return; }

  const DECORATIONS = { none: 'Aucune', halo: 'Halo', stars: 'Étoiles', crown: 'Couronne', leaves: 'Feuillage' };
  let saved = normalize(null), draft = null, owner = null, returnFocus = null, busy = false, imageVersion = 0, viewing = null;
  const panel = document.createElement('div'); panel.className = 'modal-wrap ap-wrap'; panel.hidden = true; document.body.append(panel);
  const $a = s => panel.querySelector(s);
  const error = text => { const e = $a('#ap-status'); if (e) e.textContent = text; };
  function apply(value) {
    const v = normalize(value), style = document.documentElement.style;
    for (const key of ['--ink', '--ink-2', '--ink-3', '--acc', '--on-acc', '--gold', '--gold-2', '--personal-wallpaper']) style.removeProperty(key);
    const colors = THEMES[v.theme].colors;
    if (colors) ['--ink', '--ink-2', '--ink-3'].forEach((key, i) => style.setProperty(key, colors[i]));
    const accent = v.accent || colors?.[3];
    if (accent) { style.setProperty('--acc', accent); style.setProperty('--gold', accent); style.setProperty('--gold-2', accent); style.setProperty('--on-acc', inkFor(accent)); }
    document.documentElement.toggleAttribute('data-appearance', !!colors || !!accent || !!v.wallpaper);
    if (v.wallpaper) style.setProperty('--personal-wallpaper', `url("${v.wallpaper}")`);
    document.documentElement.toggleAttribute('data-wallpaper', !!v.wallpaper);
  }
  function init() { owner = state.me; try { saved = read(localStorage, owner); } catch { saved = normalize(null); } apply(saved); }
  function close() {
    if (busy) return;
    imageVersion++; apply(saved); panel.hidden = true; panel.replaceChildren(); viewing = null;
    returnFocus?.focus();
  }
  function showShell(title) {
    returnFocus = document.activeElement; panel.hidden = false;
    panel.innerHTML = `<section class="ap-dialog" role="dialog" aria-modal="true" aria-labelledby="ap-title"><header class="ap-head"><h2 id="ap-title">${title}</h2><button type="button" id="ap-close" aria-label="Fermer la personnalisation">Fermer</button></header><div id="ap-content"></div><p id="ap-status" role="status" aria-live="polite"></p></section>`;
    $a('#ap-close').onclick = close; $a('#ap-close').focus();
  }
  function profileData(name) { return { bio: '', bannerColor: '#ff4a1f', decoration: 'none', banner: null, ...userOf(name).profile }; }
  function makeCard(name, data, previewImage) {
    const card = document.createElement('article'); card.className = 'ap-card';
    const banner = document.createElement('div'); banner.className = 'ap-banner'; banner.style.backgroundColor = data.bannerColor;
    const src = previewImage === null ? '' : previewImage || (data.banner ? `/banners/${encodeURIComponent(name)}.jpg?v=${data.banner}` : '');
    if (src) { const image = new Image(); image.alt = ''; image.src = src; banner.append(image); }
    const body = document.createElement('div'); body.className = 'ap-card-body';
    const portrait = avatar(name, 'xl');
    for (const d of Object.keys(DECORATIONS)) portrait.classList.remove('ap-deco-' + d);
    if (data.decoration !== 'none') portrait.classList.add('ap-deco-' + data.decoration);
    const heading = document.createElement('h3'); heading.textContent = name;
    const bio = document.createElement('p'); bio.className = 'ap-bio'; bio.textContent = data.bio || 'Ce profil n’a pas encore de bio.';
    const status = document.createElement('small'); status.textContent = userOf(name).online ? 'En ligne' : 'Hors ligne';
    body.append(portrait, heading, status, bio); card.append(banner, body); return card;
  }
  function openPublic(name) {
    if (!state.users.some(u => u.name === name)) return;
    if (busy) return;
    apply(saved); imageVersion++; viewing = name; showShell('Profil');
    const content = $a('#ap-content'); content.append(makeCard(name, profileData(name)));
    const button = document.createElement('button'); button.type = 'button'; button.className = 'ap-button';
    button.textContent = name === state.me ? 'Personnaliser mon profil' : 'Écrire en privé';
    button.onclick = () => { close(); if (name === state.me) openEditor(); else openConv(dmId(state.me, name)); };
    content.append(button);
  }
  async function readImage(file, width, height) {
    if (!file) throw Error('Choisis une image.');
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type) || file.size > 12 * 1024 * 1024) throw Error('Choisis une image JPG, PNG, WebP ou GIF de moins de 12 Mo.');
    const url = URL.createObjectURL(file), image = new Image();
    try {
      await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = () => reject(Error('Cette image est illisible.')); image.src = url; });
      const ratio = Math.min(1, width / image.naturalWidth, height / image.naturalHeight);
      const canvas = document.createElement('canvas'); canvas.width = Math.max(1, Math.round(image.naturalWidth * ratio)); canvas.height = Math.max(1, Math.round(image.naturalHeight * ratio));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      let data = canvas.toDataURL('image/jpeg', .8);
      if (data.length > 530000) data = canvas.toDataURL('image/jpeg', .5);
      if (data.length > 530000) throw Error('Cette image reste trop lourde après réduction. Choisis une image plus petite.');
      return data;
    } finally { URL.revokeObjectURL(url); }
  }
  function openEditor() {
    if (busy) return;
    imageVersion++; viewing = null; draft = { ...saved }; let publicDraft = profileData(state.me), bannerImage;
    const session = imageVersion;
    let wallpaperVersion = 0, bannerVersion = 0, wallpaperPending = false, bannerPending = false;
    showShell('À ton image');
    $a('#ap-content').innerHTML = `<p class="ap-intro">Ton espace, ton style. Le thème reste sur cet appareil ; ton profil est visible par les membres de Bahlou.</p><div class="ap-layout"><div><section class="ap-section"><h3>Apparence privée</h3><div class="ap-themes" role="group" aria-label="Thème du site">${Object.entries(THEMES).map(([id, t]) => `<button type="button" data-theme="${id}" class="ap-theme ap-theme-${id}" aria-pressed="${draft.theme === id}">${t.label}</button>`).join('')}</div><label class="ap-color">Couleur d’accent<input type="color" id="ap-accent" value="${draft.accent || THEMES[draft.theme].colors?.[3] || '#ff4a1f'}"></label><label class="ap-upload">Fond du Salon<input id="ap-wallpaper" type="file" accept="image/jpeg,image/png,image/webp,image/gif"></label><p class="ap-hint">L’image reste dans ce navigateur et n’est pas envoyée aux autres.</p><div class="ap-row"><button type="button" id="ap-wallpaper-remove">Retirer le fond</button><button type="button" id="ap-reset">Revenir à Bahlou</button></div><button type="button" id="ap-theme-save" class="ap-button">Enregistrer mon thème</button></section><section class="ap-section"><h3>Profil public</h3><label>Bio <small>190 caractères maximum</small><textarea id="ap-bio" maxlength="190" rows="3"></textarea></label><label class="ap-color">Couleur de bannière<input id="ap-banner-color" type="color" value="${publicDraft.bannerColor}"></label><label class="ap-upload">Image de bannière<input id="ap-banner-file" type="file" accept="image/jpeg,image/png,image/webp,image/gif"></label><button type="button" id="ap-banner-remove">Retirer la bannière</button><label>Décoration d’avatar<select id="ap-decoration">${Object.entries(DECORATIONS).map(([id, text]) => `<option value="${id}">${text}</option>`).join('')}</select></label><p class="ap-hint">Ces décorations sont gratuites. Tes cadres de boutique restent équipés.</p><button type="button" id="ap-profile-save" class="ap-button">Enregistrer mon profil</button></section></div><aside class="ap-preview"><h3>Aperçu public</h3><div id="ap-preview"></div><p class="ap-hint">Voici ce que les autres membres verront.</p></aside></div>`;
    $a('#ap-bio').value = publicDraft.bio; $a('#ap-decoration').value = publicDraft.decoration;
    const publicControls = ['ap-bio', 'ap-banner-color', 'ap-banner-file', 'ap-banner-remove', 'ap-decoration'].map(id => $a('#' + id));
    const syncButtons = () => {
      if (session !== imageVersion || panel.hidden) return;
      $a('#ap-theme-save').disabled = wallpaperPending;
      $a('#ap-profile-save').disabled = busy || bannerPending;
      publicControls.forEach(control => { control.disabled = busy; });
    };
    const preview = () => $a('#ap-preview')?.replaceChildren(makeCard(state.me, publicDraft, bannerImage)); preview();
    const refreshThemes = () => { panel.querySelectorAll('[data-theme]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.theme === draft.theme))); apply(draft); };
    panel.querySelectorAll('[data-theme]').forEach(b => b.onclick = () => { draft.theme = b.dataset.theme; draft.accent = ''; $a('#ap-accent').value = THEMES[draft.theme].colors?.[3] || '#ff4a1f'; refreshThemes(); });
    $a('#ap-accent').oninput = e => { draft.accent = e.target.value; apply(draft); };
    $a('#ap-wallpaper-remove').onclick = () => { wallpaperVersion++; wallpaperPending = false; draft.wallpaper = ''; apply(draft); syncButtons(); };
    $a('#ap-reset').onclick = () => { wallpaperVersion++; wallpaperPending = false; draft = normalize(null); $a('#ap-accent').value = '#ff4a1f'; refreshThemes(); syncButtons(); };
    $a('#ap-theme-save').onclick = () => { if (wallpaperPending) return; try { write(localStorage, owner, draft); saved = normalize(draft); error('Thème enregistré sur ce navigateur.'); } catch { error('Le navigateur ne peut pas enregistrer ce thème. Libère du stockage ou retire le fond.'); } };
    $a('#ap-wallpaper').onchange = async e => {
      const version = ++wallpaperVersion; wallpaperPending = true; syncButtons();
      try { const data = await readImage(e.target.files[0], 1400, 900); if (version !== wallpaperVersion || session !== imageVersion || panel.hidden) return; draft.wallpaper = data; apply(draft); error('Fond prêt. Enregistre ton thème pour le conserver.'); } catch (err) { if (version === wallpaperVersion && session === imageVersion) error(err.message); }
      finally { if (version === wallpaperVersion) { wallpaperPending = false; syncButtons(); } }
    };
    $a('#ap-bio').oninput = e => { publicDraft.bio = e.target.value; preview(); };
    $a('#ap-banner-color').oninput = e => { publicDraft.bannerColor = e.target.value; preview(); };
    $a('#ap-decoration').onchange = e => { publicDraft.decoration = e.target.value; preview(); };
    $a('#ap-banner-remove').onclick = () => { bannerVersion++; bannerPending = false; bannerImage = null; publicDraft.banner = null; preview(); syncButtons(); };
    $a('#ap-banner-file').onchange = async e => {
      const version = ++bannerVersion; bannerPending = true; syncButtons();
      try { const data = await readImage(e.target.files[0], 1200, 500); if (version !== bannerVersion || session !== imageVersion || panel.hidden) return; bannerImage = data; preview(); } catch (err) { if (version === bannerVersion && session === imageVersion) error(err.message); }
      finally { if (version === bannerVersion) { bannerPending = false; syncButtons(); } }
    };
    $a('#ap-profile-save').onclick = async () => {
      if (busy || bannerPending) return; busy = true; syncButtons();
      const button = $a('#ap-profile-save'); button.disabled = true; button.textContent = 'Enregistrement…';
      const payload = { bio: publicDraft.bio, bannerColor: publicDraft.bannerColor, decoration: publicDraft.decoration };
      if (bannerImage !== undefined) payload.banner = bannerImage;
      try { const result = await api('POST', '/api/profile', payload); userOf(state.me).profile = result.profile; publicDraft = { ...result.profile }; bannerImage = undefined; renderPeople(); renderMessages('keep'); preview(); error('Profil public enregistré.'); }
      catch (err) { error(err.message); }
      finally { busy = false; syncButtons(); button.textContent = 'Enregistrer mon profil'; }
    };
  }
  panel.addEventListener('mousedown', e => { if (e.target === panel) close(); });
  panel.addEventListener('keydown', e => {
    if (e.key === 'Escape') { e.stopPropagation(); close(); }
    if (e.key !== 'Tab') return;
    const nodes = [...panel.querySelectorAll('button, input, textarea, select, a[href]')].filter(n => !n.disabled && n.getClientRects().length);
    const first = nodes[0], last = nodes.at(-1);
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
  });
  function openFromEvent(e) {
    const target = e.target.closest('[data-public-profile]');
    if (!target || (e.type === 'keydown' && !['Enter', ' '].includes(e.key))) return;
    e.preventDefault(); e.stopPropagation(); openPublic(target.dataset.publicProfile);
  }
  document.addEventListener('click', openFromEvent);
  document.addEventListener('keydown', openFromEvent);
  function decorate(node, name) { const d = profileData(name).decoration; if (Object.hasOwn(DECORATIONS, d) && d !== 'none') node.classList.add('ap-deco-' + d); }
  window.Appearance = { init, openEditor, openPublic, decorate };
})();
