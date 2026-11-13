'use strict';
/* Bahlou — onglet Mots : un mot de 5 lettres en 6 essais, un mot du jour commun et des parties libres. */
const Words = (() => {
  let S = null, mode = 'daily', cur = '', busy = false, timer = null, revealRow = -1;
  const KB = ['AZERTYUIOP', 'QSDFGHJKLM', '<WXCVBN>'];
  const root = () => $('#words-body');
  const game = () => (mode === 'free' ? S.free : S.daily);
  const LABEL = { g: 'bien placée', y: 'mal placée', x: 'absente' };

  function letters() {
    const m = {}, rank = { x: 1, y: 2, g: 3 };
    for (const g of game()?.guesses || []) for (let i = 0; i < S.len; i++) { const c = g.w[i], s = g.s[i]; if (!m[c] || rank[s] > rank[m[c]]) m[c] = s; }
    return m;
  }
  function msg(text, cls = '') { const el = $('#wd-msg', root()); if (el) { el.textContent = text; el.className = 'wd-msg ' + cls; } }

  function paintGrid() {
    const g = game(), rows = [], guesses = g?.guesses || [];
    for (let r = 0; r < S.tries; r++) {
      const done = guesses[r], typing = !done && r === guesses.length && !(g?.done);
      const cells = Array.from({ length: S.len }, (_, i) => {
        if (done) return `<div class="wd-t ${r === revealRow ? 'wait' : done.s[i]}" style="--i:${i}" aria-label="${done.w[i]}, ${LABEL[done.s[i]]}">${done.w[i]}</div>`;
        const ch = typing ? cur[i] || '' : '';
        return `<div class="wd-t ${ch ? 'full' : ''}">${ch}</div>`;
      }).join('');
      rows.push(`<div class="wd-row ${typing ? 'cur' : ''}" data-r="${r}">${cells}</div>`);
    }
    $('#wd-grid', root()).innerHTML = rows.join('');
  }
  function paintKeys() {
    const st = letters();
    $('#wd-kb', root()).innerHTML = KB.map((row) => `<div>${[...row].map((k) => k === '<' ? '<button type="button" class="wide" data-k="Enter">Valider</button>' : k === '>' ? '<button type="button" class="wide" data-k="Backspace" aria-label="Effacer">⌫</button>' : `<button type="button" class="${st[k] || ''}" data-k="${k}">${k}</button>`).join('')}</div>`).join('');
  }
  function paintSide() {
    const s = S.stats, pct = s.played ? Math.round((s.won / s.played) * 100) : 0, max = Math.max(1, ...s.dist);
    $('#wd-side', root()).innerHTML = `<h2>Aujourd'hui</h2>
      <ol class="wd-board">${S.board.map((b, i) => `<li><span class="wd-rank">${i + 1}</span><span class="wd-av" data-u="${esc(b.name)}"></span><b>${esc(b.name)}</b><em class="${b.won ? '' : 'lost'}">${b.won ? `${b.tries}/${S.tries}` : 'raté'}</em></li>`).join('') || '<li class="muted">Personne n\'a encore joué le mot du jour.</li>'}</ol>
      <h2>Tes stats</h2>
      <div class="wd-stats">${[['Joués', s.played], ['Réussite', pct + ' %'], ['Série', s.streak], ['Record', s.best]].map(([k, v]) => `<div><b>${v}</b><small>${k}</small></div>`).join('')}</div>
      <div class="wd-dist">${s.dist.map((n, i) => `<div><span>${i + 1}</span><i style="--w:${Math.max(6, (n / max) * 100)}%">${n}</i></div>`).join('')}</div>
      <h2>Gains du mot du jour</h2>
      <p class="wd-gain">${S.rewards.map((r, i) => `<span><b>${i + 1}</b> essai${i ? 's' : ''} · ${r.toLocaleString('fr-FR')}</span>`).join('')}</p>`;
    $('#wd-side', root()).querySelectorAll('[data-u]').forEach((el) => el.replaceWith(avatar(el.dataset.u, 'xs')));
  }
  function paintStatus() {
    const g = game(), act = $('#wd-act', root());
    root().querySelectorAll('[data-m]').forEach((b) => b.classList.toggle('on', b.dataset.m === mode));
    act.innerHTML = '';
    if (mode === 'free' && (!g || g.done)) act.innerHTML = '<button type="button" class="w-btn gold" id="wd-new">Nouvelle partie</button>';
    if (g?.done) msg(g.won ? `Trouvé en ${g.guesses.length} essai${g.guesses.length > 1 ? 's' : ''} !` : `Raté, le mot était ${g.word}.`, g.won ? 'won' : 'lost');
    else if (mode === 'daily') msg('Le même mot pour tout le monde, un nouveau chaque jour à minuit.');
    else if (g) msg('Partie libre : sans gain, pour s\'entraîner.');
    else msg('Lance une partie libre pour t\'entraîner autant que tu veux.');
    const n = $('#wd-new', root());
    if (n) n.onclick = async () => { try { S = await api('POST', '/api/words/new'); cur = ''; paint(); } catch (e) { toast(e.message, true); } };
  }
  function paint() { paintGrid(); paintKeys(); paintSide(); paintStatus(); }

  function shake(text) {
    msg(text, 'bad');
    const row = $('.wd-row.cur', root());
    if (row) { row.classList.remove('shake'); void row.offsetWidth; row.classList.add('shake'); }
  }
  async function submit() {
    const g = game();
    if (busy || !g || g.done) return;
    if (cur.length < S.len) return shake('Il manque des lettres.');
    busy = true;
    try {
      const before = g.guesses.length;
      S = await api('POST', '/api/words/guess', { mode, word: cur });
      cur = '';
      revealRow = before;
      paintGrid();
      const row = $(`.wd-row[data-r="${before}"]`, root());
      [...row.children].forEach((t, i) => setTimeout(() => { t.classList.add('flip'); setTimeout(() => { t.classList.remove('wait'); t.classList.add(game().guesses[before].s[i]); Club.sfx.tick(); }, 210); }, i * 260));
      await new Promise((r) => setTimeout(r, S.len * 260 + 300));
      revealRow = -1;
      paintKeys(); paintSide(); paintStatus();
      const now = game();
      if (now.done && now.won) { row.classList.add('win'); FX.win(0, 'BRAVO'); }
      else if (now.done) FX.lose(0, 'RATÉ');
    } catch (e) { shake(e.message); }
    busy = false;
  }
  function press(k) {
    const g = game();
    if (!g || g.done || busy) return;
    if (k === 'Enter') return submit();
    if (k === 'Backspace') { cur = cur.slice(0, -1); paintGrid(); return; }
    if (/^[A-Z]$/.test(k) && cur.length < S.len) {
      cur += k;
      paintGrid();
      const t = $('.wd-row.cur', root())?.children[cur.length - 1];
      if (t) t.classList.add('pop');
    }
  }
  function onKey(e) {
    if ($('#words-view').hidden || e.ctrlKey || e.metaKey || e.altKey) return;
    if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '')) return;
    if (e.key === 'Enter' || e.key === 'Backspace') { e.preventDefault(); return press(e.key); }
    const k = e.key.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
    if (/^[A-Z]$/.test(k)) { e.preventDefault(); press(k); }
  }

  async function load() {
    S = await api('GET', '/api/words');
    if (!busy) paint();
  }
  function stop() { clearInterval(timer); timer = null; removeEventListener('keydown', onKey); }
  async function open() {
    stop();
    root().innerHTML = `<header class="w-top"><h1>Mots</h1><small>Devine le mot de 5 lettres en 6 essais</small></header>
      <div class="wd">
        <section class="wd-play">
          <div class="wd-modes"><button type="button" data-m="daily">Mot du jour</button><button type="button" data-m="free">Partie libre</button><span id="wd-act"></span></div>
          <div class="wd-grid" id="wd-grid"></div>
          <p class="wd-msg" id="wd-msg"></p>
          <div class="wd-kb" id="wd-kb"></div>
          <p class="wd-legend"><span class="g">A</span> bien placée <span class="y">A</span> mal placée <span class="x">A</span> absente</p>
        </section>
        <aside class="wd-side" id="wd-side"></aside>
      </div>`;
    root().querySelector('.wd-modes').onclick = (e) => { const m = e.target.dataset.m; if (m && m !== mode) { mode = m; cur = ''; paint(); } };
    $('#wd-kb', root()).onclick = (e) => { const k = e.target.closest('[data-k]')?.dataset.k; if (k) press(k); };
    addEventListener('keydown', onKey);
    try { await load(); } catch (e) { toast(e.message, true); }
    timer = setInterval(() => load().catch(() => {}), 30000);
  }
  return { open, stop };
})();
