'use strict';
/* Bahlou — collection de cartes, caisses et tournoi de poker. */
(() => {
  const { C, pages, post, fmt, short, sfx, popCard, delay } = Club;

  const rarName = (r) => C.cfg.rarity[r].name;
  function tile(card, n, big) {
    if (n === 0) return `<article class="tc locked"><i>?</i><b>${esc(card.name)}</b></article>`;
    return `<article class="tc r-${card.rar} ${big ? 'big' : ''}"><small>${rarName(card.rar)}</small><div class="tc-art"><span style="--n:${Math.max(3, card.art.length)}">${esc(card.art)}</span></div><b>${esc(card.name)}</b><em>${esc(card.txt)}</em>${n > 1 ? `<u>×${n}</u>` : ''}</article>`;
  }

  /* ---------- caisses et collection */
  pages.cards = (root, ctx) => {
    const byId = new Map(C.cfg.cards.map((c) => [c.id, c]));
    let opening = false;
    const paint = () => {
      const m = C.me, own = m.cards || {};
      const have = C.cfg.cards.filter((c) => own[c.id] > 0).length;
      const dups = C.cfg.cards.reduce((t, c) => t + Math.max(0, (own[c.id] || 0) - 1) * C.cfg.rarity[c.rar].sell, 0);
      root.innerHTML = `<div class="pg"><h2 class="pg-t">Caisses</h2><p class="muted">Ouvre des caisses, revends tes doubles et complète la collection.</p>
        <div class="cs-row">${C.cfg.cases.map((b) => `<article class="cs-box cs-${b.id}"><b>${esc(b.name)}</b><div class="cs-odds">${Object.entries(b.odds).map(([r, w]) => `<span class="o-${r}">${rarName(r)} ${(w / 10).toLocaleString('fr-FR')} %</span>`).join('')}</div><button type="button" class="play" data-open="${b.id}" ${m.coins < b.price ? 'disabled' : ''}>Ouvrir, ${short(b.price)}</button></article>`).join('')}</div>
        <h3 class="sec">Collection<small>${have} cartes sur ${C.cfg.cards.length}, chaque série complète rapporte gros</small></h3>${dups ? `<div class="cs-dups"><span>Tes doubles valent <b>${fmt(dups)}</b> bahlous.</span><button type="button" class="sh-btn" id="sell-all">Tout revendre</button></div>` : ''}
        ${C.cfg.sets.map((s) => { const list = C.cfg.cards.filter((c) => c.set === s.id), done = m.setsDone?.includes(s.id), n = list.filter((c) => own[c.id] > 0).length;
          return `<h3 class="sec">${esc(s.name)}<small>${done ? 'Série complète' : `${n} sur ${list.length}, +${short(s.reward)} à la fin`}</small></h3><div class="tc-grid">${list.map((c) => `<div class="tc-w">${tile(c, own[c.id] || 0)}${own[c.id] > 1 ? `<button type="button" class="sh-btn" data-sell="${c.id}">Revendre, ${short(C.cfg.rarity[c.rar].sell)}</button>` : ''}</div>`).join('')}</div>`; }).join('')}
      </div><div class="cs-over" id="cs-over" hidden></div>`;
      root.querySelectorAll('[data-open]').forEach((x) => (x.onclick = () => open(x.dataset.open)));
      root.querySelectorAll('[data-sell]').forEach((x) => (x.onclick = async () => { const r = await post('case/sell', { id: x.dataset.sell }); if (r) { sfx.coin(); paint(); } }));
      const all = root.querySelector('#sell-all');
      if (all) all.onclick = async () => { const r = await post('case/sell-all'); if (r) { sfx.coin(); popCard('Doubles revendus', `+${fmt(r.gain)} bahlous`); paint(); } };
    };
    async function open(id) {
      if (opening) return;
      opening = true;
      const r = await post('case/open', { id }, { defer: true });
      if (!r) { opening = false; return; }
      const over = root.querySelector('#cs-over');
      const W = 158;
      over.innerHTML = `<div class="cs-win"><i class="cs-pin"></i><div class="cs-strip" id="cs-strip">${r.reel.map((c) => `<div class="cs-it">${tile(byId.get(c), 1)}</div>`).join('')}</div></div>`;
      over.hidden = false;
      const strip = over.querySelector('#cs-strip');
      const box = over.querySelector('.cs-win').clientWidth;
      await delay(40);
      const offset = r.at * W + W / 2 - box / 2 + (Math.random() * 90 - 45);
      strip.style.transition = 'transform 4.6s cubic-bezier(.12,.75,.1,1)';
      strip.style.transform = `translateX(${-offset}px)`;
      let last = 0;
      const beat = setInterval(() => {
        const x = -new DOMMatrixReadOnly(getComputedStyle(strip).transform).m41;
        if (Math.floor(x / W) !== last) { last = Math.floor(x / W); sfx.click(); }
      }, 40);
      await delay(4700);
      clearInterval(beat);
      if (!ctx.alive) { opening = false; r.later(); return; }
      const card = byId.get(r.card);
      over.innerHTML = `<div class="cs-res r-${card.rar}"><small>${r.dup ? 'Doublon' : 'Nouvelle carte'}</small>${tile(card, 1, true)}<div class="cs-act"><button type="button" class="play" id="cs-again">Rouvrir</button><button type="button" class="play alt" id="cs-close">Fermer</button></div></div>`;
      if (card.rar === 'l' || card.rar === 'e') sfx.big(); else sfx.win();
      FX.rarity(over.querySelector('.tc'), card.rar);
      r.later();
      opening = false;
      over.querySelector('#cs-close').onclick = paint;
      over.querySelector('#cs-again').onclick = () => { over.hidden = true; open(id); };
    }
    paint();
    ctx.on('me', () => { if (!opening && root.querySelector('#cs-over')?.hidden) paint(); });
  };

  /* ---------- tournoi */
  pages.tourney = (root, ctx) => {
    const paint = () => {
      const t = C.tourney, me = state.me, inside = t.entrants.includes(me);
      const pool = t.buyin * Math.max(t.entrants.length, 2) + t.house;
      const pts = Object.entries(t.points).sort((a, b) => b[1] - a[1]);
      const action = t.on
        ? `<a class="play tr-go" href="#/club/poker">${inside ? 'Rejoindre la table' : 'Regarder la table'}</a>`
        : t.pending ? '<p class="muted">Le tournoi démarre à la fin de la main en cours.</p>'
        : inside ? `<button type="button" class="play" id="tr-start" ${t.entrants.length < 2 ? 'disabled' : ''}>Lancer maintenant</button><button type="button" class="play alt" id="tr-out">Se désinscrire</button>`
        : `<button type="button" class="play" id="tr-in" ${C.me.coins < t.buyin || t.entrants.length >= t.max ? 'disabled' : ''}>S’inscrire, ${fmt(t.buyin)}</button>`;
      root.innerHTML = `<div class="pg"><h2 class="pg-t">Tournoi</h2><p class="muted">Texas Hold’em, élimination directe. Rendez-vous chaque dimanche à 21 h, ou dès que les inscrits le décident.</p>
        <section class="tr-hero"><div><small>Cagnotte</small><b>${fmt(pool)}</b></div><div><small>Jetons de départ</small><b>${fmt(t.chips)}</b></div><div><small>Blindes</small><b>${t.on ? `${t.sb}/${t.bb}` : '25/50'}</b></div><div><small>${t.on ? 'En jeu' : 'Inscrits'}</small><b>${t.on ? t.alive.length : `${t.entrants.length}/${t.max}`}</b></div></section>
        <div class="tr-act">${action}</div>
        <h3 class="sec">Inscrits<small>Les blindes montent toutes les 4 minutes</small></h3>
        <div class="tr-list">${t.entrants.length ? t.entrants.map((n) => `<span class="tr-p" data-n="${esc(n)}"><b>${esc(n)}</b></span>`).join('') : '<p class="muted">Personne pour l’instant.</p>'}</div>
        <h3 class="sec">Classement de la semaine<small>Le podium est récompensé lundi</small></h3>
        ${pts.length ? pts.map(([n, p], i) => `<div class="bd-row ${n === me ? 'me' : ''}"><span class="bd-n">${i + 1}</span><b>${esc(n)}</b><em>${p} pts</em></div>`).join('') : '<p class="muted">Aucun tournoi joué cette semaine.</p>'}
        ${t.last ? `<p class="muted tr-last">Dernier vainqueur : <b>${esc(t.last.name)}</b>, ${fmt(t.last.pool)} en jeu.</p>` : ''}</div>`;
      root.querySelectorAll('.tr-p').forEach((el) => el.prepend(avatar(el.dataset.n, 'sm')));
      const on = (s, f) => { const e = root.querySelector(s); if (e) e.onclick = f; };
      on('#tr-in', async () => { if (await post('tourney/join')) sfx.chip(); });
      on('#tr-out', async () => { await post('tourney/leave'); });
      on('#tr-start', async () => { if (await post('tourney/start')) location.hash = '#/club/poker'; });
    };
    paint();
    ctx.on('tourney', paint);
    ctx.on('me', paint);
  };
})();
