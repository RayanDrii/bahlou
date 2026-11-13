'use strict';
/* Bahlou — animations de l'interface : changements de page, cartes qui suivent la souris, gains qui s'envolent. */
const Anim = (() => {
  const calm = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const WORD = { chat: 'Salon', club: 'Casino', cards: 'Caisses', words: 'Mots', geo: 'Geo', work: 'Travail', admin: 'Admin' };
  const BOX = { chat: '#chat-view', club: '#club', work: '#work', admin: '#admin-view', words: '#words-view', geo: '#geo-view' };
  const root = document.documentElement;
  const lite = () => root.classList.contains('lite');

  /* mode fluide : automatique si le PC dessine sans carte graphique ou tombe sous 30 images par seconde */
  function setLite(on) {
    root.classList.toggle('lite', on);
    const label = document.querySelector('#lite-label');
    if (label) label.textContent = on ? 'Mode fluide activé' : 'Mode fluide coupé';
  }
  function softwareGpu() {
    try {
      const gl = document.createElement('canvas').getContext('webgl');
      if (!gl) return true;
      const info = gl.getExtension('WEBGL_debug_renderer_info');
      const name = info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : '';
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /swiftshader|llvmpipe|softpipe|software|basic render/i.test(name);
    } catch { return false; }
  }
  const choice = store.get('lite', null);
  setLite(choice === true || (choice === null && softwareGpu()));
  let slow = 0;
  function sample() {
    if (lite() || store.get('lite', null) !== null || document.visibilityState !== 'visible') return;
    let frames = 0, prev = performance.now(), paused = false;
    const t0 = prev;
    (function step(t) {
      if (t - prev > 400) paused = true;
      prev = t; frames++;
      if (t - t0 < 2000) return requestAnimationFrame(step);
      if (paused || document.visibilityState !== 'visible') return;
      slow = frames / 2 < 30 ? slow + 1 : 0;
      if (slow >= 2) setLite(true);
    })(t0);
  }
  document.querySelector('#lite-toggle')?.addEventListener('click', () => { const on = !lite(); store.set('lite', on); setLite(on); });
  addEventListener('load', () => { setTimeout(sample, 1500); setTimeout(sample, 4000); });

  function where() {
    const [page, sub] = (location.hash.replace(/^#\/?/, '') || 'chat').split('/');
    const section = ['chat', 'work', 'admin', 'words', 'geo'].includes(page) ? page : 'club';
    return { section, tab: page === 'cards' ? 'cards' : section, game: page === 'club' && sub ? sub : '' };
  }
  function enter(section) {
    const el = document.querySelector(BOX[section]);
    if (!el) return;
    el.classList.remove('enter');
    void el.offsetWidth;
    el.classList.add('enter');
    clearTimeout(el.anT);
    el.anT = setTimeout(() => el.classList.remove('enter'), 1800);
  }
  function wipe(word) {
    if (calm || lite()) return;
    document.querySelector('.an-wipe')?.remove();
    const w = document.createElement('div');
    w.className = 'an-wipe';
    w.innerHTML = '<i></i><i></i><i></i><b></b>';
    w.lastChild.textContent = word;
    w.style.setProperty('--w', `${Math.min(25, 165 / Math.max(1, word.length))}vw`);
    document.body.appendChild(w);
    setTimeout(() => w.remove(), 760);
  }

  let last = where();
  addEventListener('hashchange', () => {
    const now = where(), changed = now.tab !== last.tab, intoGame = !!now.game && now.game !== last.game;
    last = now;
    enter(now.section);
    setTimeout(sample, 1600);
    if (changed && !intoGame) wipe(WORD[now.tab]);
    else if (intoGame) setTimeout(() => wipe(document.querySelector('.gm-h h2')?.textContent || 'Jeux'), 0);
  });
  addEventListener('load', () => enter(last.section));

  /* cartes qui penchent vers la souris */
  if (!calm && matchMedia('(hover: hover)').matches) {
    let cur = null, ev = null, raf = 0;
    const flat = (el) => ['--rx', '--ry'].forEach((k) => el.style.removeProperty(k));
    const apply = () => {
      raf = 0;
      if (lite()) return;
      const t = ev.target.closest?.('.tl, .tc:not(.locked)') || null;
      if (cur && cur !== t) flat(cur);
      cur = t;
      if (!t) return;
      const r = t.getBoundingClientRect(), x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
      t.style.setProperty('--rx', `${(0.5 - y) * 13}deg`);
      t.style.setProperty('--ry', `${(x - 0.5) * 15}deg`);
      t.style.setProperty('--mx', `${x * 100}%`);
      t.style.setProperty('--my', `${y * 100}%`);
    };
    document.addEventListener('pointermove', (e) => { ev = e; raf ||= requestAnimationFrame(apply); }, { passive: true });
  }

  /* gain ou perte qui s'envole du solde */
  let sum = 0, flush = 0;
  function coinDelta(d) {
    sum += d;
    if (flush) return;
    flush = setTimeout(() => {
      const n = sum;
      sum = 0; flush = 0;
      const bal = document.querySelector('.balance');
      if (!n || !bal || !bal.offsetParent) return;
      const cls = n > 0 ? 'an-up' : 'an-down';
      bal.classList.remove('an-up', 'an-down');
      void bal.offsetWidth;
      bal.classList.add(cls);
      if (calm) return;
      const r = bal.getBoundingClientRect();
      const el = Object.assign(document.createElement('div'), { className: `an-delta ${cls}`, textContent: `${n > 0 ? '+' : '−'}${Math.abs(n).toLocaleString('fr-FR')}` });
      el.style.right = `${innerWidth - r.right + 14}px`;
      el.style.top = `${r.bottom + 4}px`;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 1150);
    }, 90);
  }
  return { coinDelta };
})();
