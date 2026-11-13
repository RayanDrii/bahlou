'use strict';
/* Bahlou — onglet Admin (le serveur vérifie les droits à chaque action). */
const Admin = (() => {
  let D = null, timer = null, query = '';
  const root = () => $('#admin-body');
  const num = (n) => Number(n).toLocaleString('fr-FR');
  const when = (t) => new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(t));
  const fail = (e) => toast(e.message || 'Une erreur est survenue.', true);
  const call = async (url, body, okMsg) => {
    try { const r = await api('POST', url, body); if (okMsg) toast(okMsg); await refresh(); return r; }
    catch (e) { fail(e); return null; }
  };
  function armed(btn, label, fn) {
    if (btn.dataset.armed) return fn();
    btn.dataset.armed = '1';
    const old = btn.textContent;
    btn.textContent = label;
    setTimeout(() => { if (btn.isConnected) { delete btn.dataset.armed; btn.textContent = old; } }, 3000);
  }
  function copy(text, btn) {
    navigator.clipboard.writeText(text).then(() => { btn.textContent = 'Copié'; }).catch(() => toast(text));
  }

  const KIND = { frame: 'Cadre', color: 'Couleur', title: 'Titre' };
  function row(p) {
    return `<article class="a-p ${p.banned ? 'off' : ''}" data-p="${esc(p.name)}">
      <div class="a-who"><span class="a-av"></span><div><b>${esc(p.name)}</b><small>${p.banned ? 'Suspendu' : p.online ? 'En ligne' : 'Hors ligne'} · Niv. ${p.level}${p.admin ? ' · Admin' : ''}</small></div></div>
      <div class="a-coins">${num(p.coins)}</div>
      <div class="a-act"><input type="number" class="a-n" placeholder="Montant" min="1" aria-label="Montant pour ${esc(p.name)}"><button type="button" class="w-btn" data-a="plus">Donner</button><button type="button" class="w-btn" data-a="minus">Retirer</button><button type="button" class="w-btn" data-a="pass">Mot de passe</button>${p.admin ? '' : `<button type="button" class="w-btn ${p.banned ? '' : 'danger'}" data-a="ban">${p.banned ? 'Réactiver' : 'Suspendre'}</button>`}</div>
      ${p.cosmetics.length ? `<div class="a-items">${p.cosmetics.map((c) => `<span class="a-item ${c.on ? 'on' : ''}"><small>${KIND[c.type] || ''}</small>${esc(c.name)}<button type="button" data-rm="${esc(c.id)}" aria-label="Retirer ${esc(c.name)} à ${esc(p.name)}">Retirer</button></span>`).join('')}</div>` : ''}
    </article>`;
  }
  function paintList() {
    const box = root().querySelector('#a-list');
    if (!box) return;
    const q = query.toLowerCase();
    const list = D.players.filter((p) => p.name.includes(q));
    box.innerHTML = list.map(row).join('') || '<p class="muted">Aucun joueur.</p>';
    box.querySelectorAll('[data-p]').forEach((el) => {
      const name = el.dataset.p;
      el.querySelector('.a-av').replaceWith(avatar(name, 'sm', true));
      const amount = () => { const v = Math.floor(Number(el.querySelector('.a-n').value)); if (!(v > 0)) { toast('Indique un montant.', true); return 0; } return v; };
      el.querySelector('[data-a=plus]').onclick = () => { const v = amount(); if (v) call('/api/admin/coins', { to: name, amount: v }, `+${num(v)} pour ${name}`); };
      el.querySelector('[data-a=minus]').onclick = () => { const v = amount(); if (v) call('/api/admin/coins', { to: name, amount: -v }, `-${num(v)} pour ${name}`); };
      el.querySelector('[data-a=pass]').onclick = (e) => armed(e.target, 'Confirmer', async () => {
        const r = await call('/api/admin/password', { name });
        if (r) showSecret(name, r.password);
      });
      el.querySelectorAll('[data-rm]').forEach((btn) => (btn.onclick = () => armed(btn, 'Confirmer', () => call('/api/admin/cosmetic', { name, id: btn.dataset.rm }, 'Objet retiré.'))));
      const ban = el.querySelector('[data-a=ban]');
      if (ban) ban.onclick = () => {
        const p = D.players.find((x) => x.name === name);
        if (p.banned) call('/api/admin/ban', { name, banned: false }, `${name} réactivé`);
        else armed(ban, 'Confirmer', () => call('/api/admin/ban', { name, banned: true }, `${name} suspendu`));
      };
    });
  }
  function showSecret(name, password) {
    const box = root().querySelector('#a-secret');
    box.hidden = false;
    box.innerHTML = `<span>Nouveau mot de passe de <b>${esc(name)}</b>, affiché une seule fois :</span><code>${esc(password)}</code><button type="button" class="w-btn gold">Copier</button><button type="button" class="txt-btn">Fermer</button>`;
    box.querySelector('.gold').onclick = (e) => copy(password, e.target);
    box.querySelector('.txt-btn').onclick = () => { box.hidden = true; box.innerHTML = ''; };
  }

  function paint() {
    const s = D.stats;
    const link = D.publicUrl ? `${D.publicUrl}/telecharger.html` : '';
    root().innerHTML = `<header class="w-top"><h1>Admin</h1></header>
      <section class="a-stats">${[['En ligne', s.online], ['Comptes', s.accounts], ['Bahlous en circulation', num(s.coins)], ['Jackpot', num(s.jackpot)], ['Messages', num(s.messages)]].map(([k, v]) => `<div><small>${k}</small><b>${v}</b></div>`).join('')}</section>
      <div class="a-secret" id="a-secret" hidden></div>
      <section><h2>Distribuer</h2><form class="a-form" id="a-gift"><select name="to"><option value="@online">Tous les joueurs en ligne</option><option value="@all">Tous les comptes</option>${D.players.map((p) => `<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('')}</select><input type="number" name="amount" min="1" required placeholder="Montant"><button type="submit" class="w-btn gold">Envoyer</button></form></section>
      <section><h2>Joueurs</h2><input class="a-search" id="a-search" placeholder="Rechercher un joueur" value="${esc(query)}"><div id="a-list"></div></section>
      <section><h2>Annonce au Salon</h2><form class="a-form" id="a-say"><input name="text" maxlength="500" required placeholder="Message visible par tout le monde"><button type="submit" class="w-btn gold">Publier</button></form></section>
      <section><h2>Annonce plein écran</h2><form class="a-form" id="a-alert"><input name="text" maxlength="300" required placeholder="S'affiche en grand sur l'écran de tout le monde"><button type="submit" class="w-btn gold">Afficher partout</button></form></section>
      <section><h2>Accès</h2><div class="a-line"><small>Code d'invitation</small><code>${esc(D.invite)}</code><button type="button" class="w-btn" id="a-copy-i">Copier</button><button type="button" class="w-btn" id="a-new-i">Changer</button></div>
        <div class="a-line"><small>Lien pour tes potes</small><code>${link ? esc(link) : 'Tunnel jamais lancé'}</code>${link ? '<button type="button" class="w-btn" id="a-copy-l">Copier</button>' : ''}</div></section>
      <section><h2>Journal</h2><ul class="w-list">${D.log.map((l) => `<li><span>${when(l.ts)}</span><b class="a-log">${esc(l.action)}</b></li>`).join('') || '<li><span>Aucune action pour le moment.</span></li>'}</ul></section>`;
    paintList();
    const r = root();
    r.querySelector('#a-search').oninput = (e) => { query = e.target.value; paintList(); };
    r.querySelector('#a-gift').onsubmit = (e) => { e.preventDefault(); const f = e.target; call('/api/admin/coins', { to: f.to.value, amount: Number(f.amount.value) }, 'Bahlous envoyés.'); };
    r.querySelector('#a-alert').onsubmit = async (e) => { e.preventDefault(); const f = e.target; if (await call('/api/admin/alert', { text: f.text.value }, 'Annonce affichée sur tous les écrans.')) f.reset(); };
    r.querySelector('#a-say').onsubmit = (e) => { e.preventDefault(); call('/api/admin/announce', { text: e.target.text.value }, 'Annonce publiée.'); };
    r.querySelector('#a-copy-i').onclick = (e) => copy(D.invite, e.target);
    r.querySelector('#a-new-i').onclick = (e) => armed(e.target, 'Confirmer', () => call('/api/admin/invite', {}, 'Nouveau code créé.'));
    r.querySelector('#a-copy-l')?.addEventListener('click', (e) => copy(link, e.target));
  }

  async function refresh() {
    const secret = root().querySelector('#a-secret');
    const keep = secret && !secret.hidden ? secret.innerHTML : null;
    D = await api('GET', '/api/admin');
    paint();
    if (keep) { const box = root().querySelector('#a-secret'); box.hidden = false; box.innerHTML = keep; box.querySelector('.txt-btn').onclick = () => { box.hidden = true; box.innerHTML = ''; }; }
  }
  function live() {
    if (root().contains(document.activeElement) && document.activeElement.matches('input, select')) return;
    if (root().querySelector('[data-armed]')) return;
    api('GET', '/api/admin').then((d) => { D = d; paintList(); const b = root().querySelectorAll('.a-stats b'); if (b.length) { b[0].textContent = d.stats.online; b[1].textContent = d.stats.accounts; b[2].textContent = num(d.stats.coins); b[3].textContent = num(d.stats.jackpot); b[4].textContent = num(d.stats.messages); } }).catch(() => {});
  }
  function stop() { clearInterval(timer); }
  return {
    stop,
    open() { stop(); root().innerHTML = '<p class="muted w-load">Chargement</p>'; refresh().catch(() => { location.hash = '#/chat'; }); timer = setInterval(live, 6000); },
  };
})();
