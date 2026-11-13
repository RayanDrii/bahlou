'use strict';
/* Bahlou — onglet Travail. */
const Work = (() => {
  let V = null, timer = null, poll = null, flow = null, syncing = false, waiting = false;
  const root = () => $('#work-body');
  const fr = (o) => new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', ...o });
  const dDate = (x) => fr({ day: '2-digit', month: '2-digit' }).format(new Date(x));
  const dTime = (x) => fr({ hour: '2-digit', minute: '2-digit' }).format(new Date(x));
  const dLong = (k) => fr({ weekday: 'long', day: 'numeric', month: 'long' }).format(new Date(`${k}T12:00:00+01:00`));
  const hh = (n) => String(n).replace('.', ',');
  const SEV = { critique: 'Critique', important: 'Important', a_revoir: 'À revoir' };
  const fail = (e) => toast(e.message || 'Une erreur est survenue.');
  function toast(m) { const t = document.createElement('div'); t.className = 'toast'; t.textContent = m; $('#toasts').appendChild(t); setTimeout(() => t.remove(), 4200); }

  function left(end) {
    const ms = new Date(end) - Date.now();
    if (ms <= 0) return { d: 0, h: 0, m: 0, over: true, ms };
    return { d: Math.floor(ms / 864e5), h: Math.floor(ms / 36e5) % 24, m: Math.floor(ms / 6e4) % 60, ms };
  }
  const cd = (end) => {
    const l = left(end);
    if (l.over) return '<div class="w-cd"><span>Terminé</span></div>';
    return l.d > 0 ? `<div class="w-cd"><b>${l.d}</b><span>j</span><b>${l.h}</b><span>h</span></div>` : `<div class="w-cd"><b>${l.h}</b><span>h</span><b>${l.m}</b><span>min</span></div>`;
  };
  const elapsed = (p) => Math.min(100, Math.max(0, ((Date.now() - new Date(p.start)) / (new Date(p.end) - new Date(p.start))) * 100));

  function projects() {
    const reg = (r) => (r === true ? '<em class="w-ok">Inscrit</em>' : r === false ? '<em class="w-no">Pas inscrit</em>' : '');
    const cards = V.ongoing.map((p) => {
      const l = left(p.end), plan = V.plans[p.id];
      const items = plan ? plan.days.flatMap((d) => d.items).length : 0, done = plan ? Object.keys(plan.done).length : 0;
      return `<article class="w-card ${l.ms < 5 * 864e5 ? 'urgent' : ''}">
        <header><div><h3>${esc(p.name)}</h3><small>${esc(p.unit)}</small></div>${reg(p.registered)}</header>
        <div data-cd="${esc(p.end)}">${cd(p.end)}</div>
        <div class="w-bar"><i style="width:${elapsed(p)}%"></i></div>
        <footer><span>Rendu le ${dDate(p.end)} à ${dTime(p.end)}</span>${p.last ? `<span class="w-warn">Moulinette : ${esc(p.last.flagsText || `${p.last.passed}/${p.last.total}`)}</span>` : ''}</footer>
        <button type="button" class="w-btn" data-plan="${esc(p.id)}">${plan ? `Planning, ${done}/${items}` : 'Créer un planning'}</button>
      </article>`;
    }).join('');
    const events = V.events.map((e) => `<li><span>${dDate(e.at)} à ${dTime(e.at)}</span><b>${esc(e.title)}</b></li>`).join('');
    const next = V.upcoming.slice(0, 6).map((p) => `<li><span>${dDate(p.start)} au ${dDate(p.end)}</span><b>${esc(p.name)}</b><small>${esc(p.unit.replace(/^G1 - /, ''))}</small></li>`).join('');
    return `<section><h2>Projets en cours</h2><div class="w-cards">${cards || '<p class="muted">Aucun projet en cours.</p>'}</div>
      ${V.certs ? `<p class="w-certs">${V.certs.count} ${esc(V.certs.label)} ouvertes jusqu’au ${dDate(V.certs.end)}, en option.</p>` : ''}
      <div class="w-two">${events ? `<div><h4>Soutenances</h4><ul class="w-list">${events}</ul></div>` : ''}<div><h4>À venir</h4><ul class="w-list">${next}</ul></div></div></section>`;
  }

  function level() {
    const a = V.auto, ai = V.ai;
    if (!a && !ai) return '<section><h2>Ton niveau</h2><p class="muted">Aucun résultat pour le moment.</p></section>';
    const src = ai || a, gaps = src.gaps || [];
    const al = V.alerts;
    const alert = al && al.globalAlert === 'red' ? `<div class="w-alert"><b>Alerte crédits</b><span>${al.secureCredits} crédits sécurisés pour ${al.creditsThreshold} requis. ${al.creditsLost.reduce((x, c) => x + c.credits, 0)} crédits perdus : ${al.creditsLost.map((c) => esc(c.title.replace(/^Computer Science Culture - /, ''))).join(', ')}.</span></div>` : '';
    const units = (a?.units || []).map((u) => `<div class="w-unit"><span>${esc(u.name)}</span><div class="w-bar"><i style="width:${u.score}%"></i></div><b>${u.score} %</b></div>`).join('');
    const flags = (a?.flags || []).map((f) => `<li><b>${f.n}</b><span>${esc(f.label)}</span></li>`).join('');
    const strengths = src.strengths || [];
    return `<section><h2>Ton niveau</h2>${alert}
      <div class="w-level">
        <div class="w-score"><b>${src.score}</b><small>sur 100</small><em>${esc(src.label)}</em><span>${src.source === 'ai' ? 'Analyse IA de tes dépôts' : `Moyenne de ${a.finals} rendus à la moulinette`}</span></div>
        <div class="w-units">${units}${flags ? `<ul class="w-flags">${flags}</ul>` : ''}</div>
      </div>
      ${ai?.summary ? `<p class="w-sum">${esc(ai.summary)}</p>` : ''}
      ${ai?.coverage ? `<p class="w-cov">${ai.coverage.files} fichiers lus sur ${ai.coverage.filesTotal}, ${ai.coverage.repos} dépôts sur ${ai.coverage.reposTotal}. Analyse du ${dDate(ai.at)}.</p>` : ''}
    </section>
    <section><h2>Tes lacunes</h2><div class="w-gaps">${gaps.map((g) => `<article class="w-gap ${g.severity}"><em>${SEV[g.severity] || ''}</em><h3>${esc(g.title)}</h3><p>${esc(g.evidence)}</p><p class="w-do">${esc(g.action)}</p></article>`).join('') || '<p class="muted">Rien à signaler.</p>'}</div>
      ${strengths.length ? `<h4>Ce qui marche déjà</h4><p class="w-strong">${strengths.map(esc).join(', ')}</p>` : ''}
      ${ai?.repos?.length ? `<h4>Dépôt par dépôt</h4><ul class="w-repos">${ai.repos.map((r) => `<li><b>${esc(r.name)}</b><span>${esc(r.comment)}</span></li>`).join('')}</ul>` : ''}
    </section>`;
  }

  function mates() {
    const list = V.mates || [], mine = new Set(list.filter((m) => m.user === V.me).map((m) => m.project));
    const open = [...V.ongoing, ...V.upcoming].filter((p) => p.group !== 1);
    const others = list.filter((m) => m.user !== V.me);
    const rows = others.map((m) => `<div class="w-mate" data-u="${esc(m.user)}"><div><b>${esc(m.name)}</b><small>${esc(m.user)}${m.note ? `, ${esc(m.note)}` : ''}</small></div><button type="button" class="w-btn" data-contact="${esc(m.user)}">Contacter</button></div>`).join('');
    const own = list.filter((m) => m.user === V.me).map((m) => `<div class="w-mate"><div><b>${esc(m.name)}</b><small>Ton annonce${m.note ? `, ${esc(m.note)}` : ''}</small></div><button type="button" class="w-btn" data-mate="${esc(m.project)}">Retirer</button></div>`).join('');
    return `<section><h2>Binômes</h2>${open.length ? `<form class="w-mates-form" id="w-mates"><select name="project">${open.filter((p) => !mine.has(p.id)).map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select><input name="note" maxlength="120" placeholder="Ce que tu cherches, tes disponibilités"><button type="submit" class="w-btn gold">Publier</button></form>` : ''}${own}${rows || (own ? '' : '<p class="muted">Personne ne cherche de binôme pour le moment.</p>')}</section>`;
  }

  function aiPanel() {
    const body = V.aiEnabled
      ? `<p>Clé NVIDIA active, modèle <b>${esc(V.aiModel.split('/').pop())}</b>.</p><div class="w-row"><button type="button" class="w-btn" id="w-ai-out">Retirer ma clé</button></div>`
      : `<p>L’analyse et les plannings IA fonctionnent avec ta propre clé NVIDIA, gratuite.</p>
        <ol class="w-steps"><li>Crée ta clé sur le site de NVIDIA.</li><li>Copie-la, elle commence par nvapi-.</li><li>Colle-la ici.</li></ol>
        <div class="w-row"><a class="w-btn gold" href="https://build.nvidia.com/settings/api-keys" target="_blank" rel="noopener">Obtenir une clé gratuite</a></div>
        <form class="w-token" id="w-ai"><label><span>Clé API NVIDIA</span><input type="password" name="key" autocomplete="off" spellcheck="false" placeholder="nvapi-…"></label><button type="submit" class="w-btn">Valider</button></form>
        <p class="muted">Elle est chiffrée sur le serveur Bahlou et ne sert qu’à tes propres analyses.</p>`;
    return `<section><h2>Intelligence artificielle</h2><div class="w-gh">${body}</div></section>`;
  }

  function github() {
    const g = V.github, job = V.job;
    let body;
    if (g) {
      const running = job?.state === 'running';
      body = `<p>Connecté en tant que <b>${esc(g.login)}</b>.</p>
        ${job?.state === 'error' ? `<p class="w-err">${esc(job.error)}</p>` : ''}
        ${running ? `<p class="w-run"><span class="w-spin"></span>${esc(job.progress)}. Ça peut prendre quelques minutes.</p>` : ''}
        <div class="w-row"><button type="button" class="w-btn gold" id="w-analyze" ${running || !V.aiEnabled ? 'disabled' : ''}>Analyser tous mes dépôts</button><button type="button" class="w-btn" id="w-out">Déconnecter</button></div>
        ${V.aiEnabled ? '' : '<p class="muted">Ajoute ta clé NVIDIA ci-dessus pour lancer l’analyse.</p>'}`;
    } else if (flow) {
      body = `<p>Ouvre <a href="${esc(flow.url)}" target="_blank" rel="noopener">${esc(flow.url)}</a> et saisis ce code :</p><p class="w-code">${esc(flow.code)}</p><p class="w-run"><span class="w-spin"></span>En attente de ta validation sur GitHub.</p>`;
    } else {
      body = `<p>L’IA lit le code de tes dépôts pour affiner ton niveau et tes lacunes. Ton accès est chiffré et stocké sur le serveur Bahlou, et le code part chez NVIDIA pour l’analyse.</p>
        ${V.deviceFlow ? '<div class="w-row"><button type="button" class="w-btn gold" id="w-gh">Connecter GitHub</button></div>' : ''}
        <form class="w-token" id="w-token"><label><span>Jeton d’accès personnel, droit « repo »</span><input type="password" name="token" autocomplete="off" spellcheck="false" placeholder="ghp_…"></label><button type="submit" class="w-btn">Valider</button></form>
        <p class="muted">Crée-le sur github.com, Settings, Developer settings, Personal access tokens.</p>`;
    }
    return `<section><h2>GitHub</h2><div class="w-gh">${body}</div></section>`;
  }

  function connectView() {
    const old = !window.bahlou?.syncBrowser;
    const body = waiting
      ? `<h2>Dans ton navigateur</h2><ol class="w-steps"><li>Ouvre my.epitech et connecte-toi si besoin.</li><li>Clique sur ton favori <b>Bahlou</b>.</li><li>Cette page se met à jour toute seule.</li></ol>
        <p class="w-run"><span class="w-spin"></span>En attente de my.epitech.</p>
        <div class="w-row"><button type="button" class="w-btn" id="w-setup">Installer le favori</button><button type="button" class="w-btn" id="w-cancel">Annuler</button></div>`
      : `<h2>Connecte my.epitech</h2><p class="w-lead">Tes projets, tes résultats et ton niveau apparaîtront ici une fois connecté.</p>
        <div class="w-row"><button type="button" class="w-btn gold" id="w-login">Se connecter avec mon navigateur</button></div>
        ${old ? '<p class="muted">Cette connexion demande la dernière version de l’appli Bahlou.</p>' : ''}
        ${window.bahlou?.syncEpitech ? '<button type="button" class="txt-btn" id="w-inapp">Utiliser plutôt une fenêtre Bahlou</button>' : ''}`;
    root().innerHTML = `<header class="w-top"><h1>Travail</h1></header><section class="w-connect"><div class="w-gh">${body}</div></section>`;
    bindConnect();
  }

  function bindConnect() {
    const on = (s, f) => { const e = root().querySelector(s); if (e) e.onclick = f; };
    on('#w-login', () => sync());
    on('#w-setup', () => window.bahlou.syncBrowser({ setup: true }));
    on('#w-cancel', () => window.bahlou.cancelSync());
    on('#w-inapp', () => syncInApp());
  }

  function paint() {
    if (!V.connected || waiting) return connectView();
    const when = `Données my.epitech du ${dDate(V.synced)}${V.rewardTotal ? `, ${V.rewardTotal.toLocaleString('fr-FR')} bahlous de primes` : ''}`;
    root().innerHTML = `<header class="w-top"><h1>Travail</h1><small>${when}</small><button type="button" class="w-btn w-sync" id="w-sync" ${syncing ? 'disabled' : ''}>${syncing ? 'Connecte-toi dans la fenêtre ouverte' : 'Mettre à jour'}</button><button type="button" class="txt-btn" id="w-epi-out">Déconnecter</button></header>${projects()}${mates()}${level()}${aiPanel()}${github()}`;
    bind();
  }

  function bind() {
    const r = root();
    r.querySelectorAll('[data-plan]').forEach((b) => (b.onclick = () => openPlan(b.dataset.plan)));
    const on = (s, f) => { const e = r.querySelector(s); if (e) e.onclick = f; };
    on('#w-sync', () => sync());
    r.querySelectorAll('[data-contact]').forEach((b) => (b.onclick = () => { location.hash = '#/chat'; const i = $('#input'); i.value = `@${b.dataset.contact} `; i.focus(); i.dispatchEvent(new Event('input')); }));
    r.querySelectorAll('[data-mate]').forEach((b) => (b.onclick = async () => { try { await api('POST', '/api/work/mates', { project: b.dataset.mate }); await refresh(); } catch (e) { fail(e); } }));
    const mf = r.querySelector('#w-mates');
    if (mf) mf.onsubmit = async (ev) => { ev.preventDefault(); if (!mf.project.value) return; try { await api('POST', '/api/work/mates', { project: mf.project.value, note: mf.note.value }); await refresh(); } catch (e) { fail(e); } };
    on('#w-epi-out', async () => { try { await api('POST', '/api/work/epitech/disconnect', {}); await refresh(); } catch (e) { fail(e); } });
    on('#w-ai-out', async () => { try { await api('POST', '/api/work/ai/remove', {}); await refresh(); } catch (e) { fail(e); } });
    const keyForm = r.querySelector('#w-ai');
    if (keyForm) keyForm.onsubmit = async (ev) => { ev.preventDefault(); const b = keyForm.querySelector('button'); b.disabled = true; try { await api('POST', '/api/work/ai/key', { key: keyForm.key.value.trim() }); keyForm.reset(); await refresh(); } catch (e) { b.disabled = false; fail(e); } };
    on('#w-analyze', async () => { try { const d = await api('POST', '/api/work/analyze', {}); V.job = d.job; paint(); watch(); } catch (e) { fail(e); } });
    on('#w-out', async () => { try { await api('POST', '/api/work/github/disconnect', {}); await refresh(); } catch (e) { fail(e); } });
    on('#w-gh', async () => { try { flow = await api('POST', '/api/work/github/start', {}); paint(); poll = setTimeout(pollFlow, (flow.interval + 1) * 1000); } catch (e) { fail(e); } });
    const form = r.querySelector('#w-token');
    if (form) form.onsubmit = async (ev) => { ev.preventDefault(); try { await api('POST', '/api/work/github/token', { token: form.token.value.trim() }); form.reset(); await refresh(); } catch (e) { fail(e); } };
  }

  async function send(res) {
    if (!res.ok) { if (!res.cancelled) throw new Error(res.error); return; }
    const d = await api('POST', '/api/work/sync', res.data);
    toast(`${d.results} résultats importés.`);
  }

  async function sync() {
    if (!window.bahlou?.syncBrowser) return window.bahlou?.syncEpitech ? syncInApp() : toast('La connexion demande la dernière version de l’appli Bahlou.');
    waiting = true; paint();
    try { await send(await window.bahlou.syncBrowser()); }
    catch (e) { fail(e); }
    waiting = false; await refresh().catch(fail);
  }

  async function syncInApp() {
    syncing = true; if (V.connected) paint();
    try { await send(await window.bahlou.syncEpitech()); }
    catch (e) { fail(e); }
    syncing = false; await refresh().catch(fail);
  }

  async function pollFlow() {
    if (!flow) return;
    try {
      const d = await api('POST', '/api/work/github/poll', {});
      if (d.pending) { poll = setTimeout(pollFlow, (flow.interval + 1) * 1000); return; }
      flow = null; await refresh();
    } catch (e) { flow = null; fail(e); paint(); }
  }

  function watch() {
    clearTimeout(poll);
    if (V.job?.state !== 'running') return;
    poll = setTimeout(async () => {
      try { const before = V.job?.progress; V = await api('GET', '/api/work'); if (V.job?.state === 'running' && V.job.progress === before) { watch(); return; } paint(); watch(); } catch { watch(); }
    }, 4000);
  }

  /* ---------- planning */
  function closePlan() { $('#w-plan').hidden = true; }
  function openPlan(id) {
    const p = V.ongoing.find((x) => x.id === id);
    let hours = V.plans[id]?.hours || 3;
    const el = $('#w-plan');
    const draw = (busy, first) => {
      const top = el.querySelector('.w-sheet')?.scrollTop || 0;
      const plan = V.plans[id];
      const chips = [1, 2, 3, 4, 6, 8].map((h) => `<button type="button" class="w-chip ${h === hours ? 'on' : ''}" data-h="${h}">${h} h</button>`).join('');
      const items = plan ? plan.days.flatMap((d) => d.items) : [];
      const done = plan ? items.filter((i) => plan.done[i.id]).length : 0;
      el.innerHTML = `<div class="w-sheet ${first ? 'in' : ''}"><button type="button" class="txt-btn w-x">Fermer</button>
        <h2>${esc(p.name)}</h2><small>Rendu le ${dDate(p.end)} à ${dTime(p.end)}</small>
        <div class="w-opts"><span>Temps par jour</span>${chips}</div>
        <div class="w-row"><button type="button" class="w-btn gold" id="w-gen" ${busy ? 'disabled' : ''}>${plan ? 'Refaire le planning' : 'Créer le planning'}</button>
        <button type="button" class="w-btn" id="w-gen-ai" ${busy || !V.aiEnabled ? 'disabled' : ''}>Adapter avec l’IA</button></div>
        ${busy ? '<p class="w-run"><span class="w-spin"></span>Préparation du planning.</p>' : ''}
        ${plan ? `<div class="w-prog"><div class="w-bar"><i style="width:${items.length ? (done / items.length) * 100 : 0}%"></i></div><span>${done} sur ${items.length}</span></div>
        ${plan.tight ? `<p class="w-err">Il manque du temps : ${hh(plan.total)} h de travail pour ${hh(plan.capacity)} h disponibles. Non planifié : ${plan.dropped.map(esc).join(', ')}.</p>` : plan.dropped.length ? `<p class="muted">Bonus non planifié : ${plan.dropped.map(esc).join(', ')}.</p>` : ''}
        <div class="w-days">${plan.days.map((d) => `<div class="w-day"><h4>${dLong(d.date)}</h4>${d.items.map((i) => `<label class="w-item"><input type="checkbox" data-i="${esc(i.id)}" ${plan.done[i.id] ? 'checked' : ''}><div><b>${esc(i.t)}</b><span>${esc(i.d)}</span></div><em>${hh(i.h)} h</em></label>`).join('')}</div>`).join('')}</div>` : ''}
      </div>`;
      el.querySelector('.w-sheet').scrollTop = top;
      el.querySelector('.w-x').onclick = closePlan;
      el.querySelectorAll('[data-h]').forEach((b) => (b.onclick = () => { hours = +b.dataset.h; draw(); }));
      const gen = (ai) => async () => { draw(true); try { const d = await api('POST', '/api/work/plan', { project: id, hours, ai }); V.plans[id] = d.plan; V = await api('GET', '/api/work'); paint(); draw(); } catch (e) { fail(e); draw(); } };
      el.querySelector('#w-gen').onclick = gen(false);
      el.querySelector('#w-gen-ai').onclick = gen(true);
      el.querySelectorAll('[data-i]').forEach((c) => (c.onchange = async () => { try { const d = await api('POST', '/api/work/plan/check', { project: id, item: c.dataset.i, done: c.checked }); V.plans[id].done = d.done; paint(); draw(); } catch (e) { fail(e); } }));
    };
    el.hidden = false;
    el.replaceChildren();
    draw(false, true);
  }

  async function refresh() { V = await api('GET', '/api/work'); paint(); watch(); }
  function tick() { root().querySelectorAll('[data-cd]').forEach((e) => (e.innerHTML = cd(e.dataset.cd))); }

  async function checkReminders() {
    try {
      const { reminders } = await api('GET', '/api/work/reminders');
      const seen = store.get('reminders', {}), today = new Date().toDateString();
      for (const r of reminders) {
        if (seen[r.key] === today) continue;
        seen[r.key] = today;
        Club.popCard(esc(r.title), esc(r.body), r.urgent ? 'gold' : '');
        if (window.Notification?.permission === 'granted') new Notification(r.title, { body: r.body, icon: '/icon.png' });
      }
      store.set('reminders', seen);
      $('#rail-work-dot').hidden = !reminders.some((r) => r.urgent);
    } catch {}
  }

  return {
    checkReminders,
    open() { stop(); root().innerHTML = '<p class="muted w-load">Chargement</p>'; refresh().catch(fail); timer = setInterval(tick, 30000); },
    stop,
  };
  function stop() { clearInterval(timer); clearTimeout(poll); flow = null; if ($('#w-plan')) closePlan(); }
})();
