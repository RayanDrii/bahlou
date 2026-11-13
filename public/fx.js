'use strict';
/* Bahlou — effets des jeux : gros PERDU, explosions, pièces, secousses. Rien ici ne change un résultat. */
const FX = (() => {
  const quiet = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let cv = null, g = null, parts = [], raf = 0, ac = null, lastBanner = 0;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const lite = () => document.documentElement.classList.contains('lite');

  function canvas() {
    if (cv) return;
    cv = Object.assign(document.createElement('canvas'), { id: 'fx-canvas' });
    document.body.appendChild(cv);
    g = cv.getContext('2d');
    const fit = () => { cv.width = innerWidth; cv.height = innerHeight; };
    addEventListener('resize', fit); fit();
  }
  function frame() {
    g.clearRect(0, 0, cv.width, cv.height);
    for (const p of parts) {
      p.vy += p.g; p.vx *= p.drag; p.vy *= p.drag; p.x += p.vx; p.y += p.vy; p.rot += p.spin; p.life--;
      const a = Math.min(1, p.life / p.fade);
      g.globalAlpha = a; g.fillStyle = p.c;
      if (p.kind === 'coin') { g.save(); g.translate(p.x, p.y); g.scale(Math.abs(Math.cos(p.rot)), 1); g.beginPath(); g.arc(0, 0, p.s, 0, 7); g.fill(); g.fillStyle = 'rgba(120,70,0,.55)'; g.beginPath(); g.arc(0, 0, p.s * .55, 0, 7); g.fill(); g.restore(); }
      else if (p.kind === 'ring') { p.s += p.grow; g.strokeStyle = p.c; g.lineWidth = Math.max(1, p.w * a); g.beginPath(); g.arc(p.x, p.y, p.s, 0, 7); g.stroke(); }
      else if (p.kind === 'smoke') { p.s += .5; g.beginPath(); g.arc(p.x, p.y, p.s, 0, 7); g.fill(); }
      else if (p.kind === 'shard') { g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillRect(-p.s, -p.s * .35, p.s * 2, p.s * .7); g.restore(); }
      else { g.beginPath(); g.arc(p.x, p.y, p.s, 0, 7); g.fill(); }
    }
    g.globalAlpha = 1;
    parts = parts.filter((p) => p.life > 0 && p.y < cv.height + 80);
    raf = parts.length ? requestAnimationFrame(frame) : (g.clearRect(0, 0, cv.width, cv.height), 0);
  }
  function add(list) {
    if (quiet) return;
    canvas();
    if (lite()) list = list.filter((_, i) => i % 3 === 0);
    parts.push(...list);
    if (parts.length > 520) parts.splice(0, parts.length - 520);
    if (!raf) raf = requestAnimationFrame(frame);
  }
  const P = (o) => ({ vx: 0, vy: 0, g: 0, drag: .985, rot: rnd(0, 6), spin: rnd(-.3, .3), s: 4, life: 60, fade: 22, c: '#fff', kind: 'dot', ...o });
  function center(el) { const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2]; }

  /* ---------- son */
  function audio() { if (!state.sound) return null; try { ac ||= new AudioContext(); if (ac.state === 'suspended') ac.resume(); return ac; } catch { return null; } }
  function noise(dur, vol, cutoff) {
    const a = audio(); if (!a) return;
    const b = a.createBuffer(1, a.sampleRate * dur, a.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2.2);
    const s = a.createBufferSource(), f = a.createBiquadFilter(), v = a.createGain();
    s.buffer = b; f.type = 'lowpass'; f.frequency.value = cutoff; v.gain.value = vol;
    s.connect(f); f.connect(v); v.connect(a.destination); s.start();
  }
  function slide(f0, f1, dur, vol, type = 'sawtooth', at = 0) {
    const a = audio(); if (!a) return;
    const o = a.createOscillator(), v = a.createGain(), t = a.currentTime + at;
    o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    v.gain.setValueAtTime(vol, t); v.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(v); v.connect(a.destination); o.start(t); o.stop(t + dur);
  }
  let lastScrape = 0;
  function scrape(speed) { const now = Date.now(); if (now - lastScrape < 55) return; lastScrape = now; noise(.07, Math.min(.16, .05 + speed * .004), 2600 + Math.min(3800, speed * 90)); }
  const sndBoom = () => { noise(1.1, .55, 900); slide(120, 32, .9, .34, 'triangle'); };
  const sndLose = () => { slide(330, 62, .75, .13); slide(247, 46, .85, .1, 'square', .05); noise(.4, .22, 420); };
  const sndWin = () => [523, 659, 784, 1047, 1319].forEach((f, i) => slide(f, f * 1.01, .24, .1, 'triangle', i * .075));
  const sndCrumble = () => { for (let i = 0; i < 6; i++) setTimeout(() => noise(.28, .3, 520), i * 110); slide(90, 30, 1.2, .24, 'triangle'); };

  /* ---------- écran */
  function shake(power = 1, ms = 520) {
    if (quiet || lite()) return;
    const el = document.querySelector('#app');
    if (!el) return;
    el.style.setProperty('--fx-p', power);
    el.style.setProperty('--fx-t', `${ms}ms`);
    el.classList.remove('fx-shake');
    void el.offsetWidth;
    el.classList.add('fx-shake');
    setTimeout(() => el.classList.remove('fx-shake'), ms + 30);
  }
  function flash(cls, ms = 420) {
    const f = Object.assign(document.createElement('div'), { className: `fx-flash ${cls}` });
    f.style.animationDuration = `${ms}ms`;
    document.body.appendChild(f);
    setTimeout(() => f.remove(), ms + 40);
  }
  function banner(text, cls, sub, ms = 1250) {
    document.querySelectorAll('.fx-banner').forEach((x) => x.remove());
    const b = document.createElement('div');
    b.className = `fx-banner ${cls}`;
    b.style.setProperty('--fx-ms', `${ms}ms`);
    b.style.setProperty('--fx-sz', `${Math.min(26, 190 / text.length)}vw`);
    b.innerHTML = `<div class="fx-in"><b>${esc(text)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}</div>`;
    document.body.appendChild(b);
    setTimeout(() => b.remove(), ms);
  }
  const money = (n) => Number(n).toLocaleString('fr-FR');

  /* ---------- particules */
  function burst(x, y, opts = {}) {
    const { n = 40, colors = ['#ffd21f', '#fff'], speed = 9, kind = 'dot', size = 4, life = 50, grav = .18 } = opts;
    add(Array.from({ length: n }, () => { const a = rnd(0, 6.28), v = rnd(speed * .25, speed); return P({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: grav, s: rnd(size * .5, size * 1.4), c: colors[Math.floor(Math.random() * colors.length)], life: rnd(life * .6, life * 1.3), kind }); }));
  }
  function coins(x, y, n = 46) {
    add(Array.from({ length: n }, () => { const a = rnd(-2.7, -.45), v = rnd(6, 19); return P({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: .42, drag: .995, s: rnd(6, 11), c: Math.random() < .3 ? '#ffe98a' : '#f2b518', life: rnd(70, 120), spin: rnd(.1, .35), kind: 'coin' }); }));
  }
  function rain(n = 130) {
    canvas();
    add(Array.from({ length: n }, () => P({ x: rnd(0, cv.width), y: rnd(-500, -20), vy: rnd(3, 9), vx: rnd(-1, 1), g: .15, drag: .998, s: rnd(6, 12), c: Math.random() < .3 ? '#ffe98a' : '#f2b518', life: 220, fade: 30, spin: rnd(.1, .3), kind: 'coin' })));
  }
  function explosion(x, y, power = 1) {
    add([P({ x, y, kind: 'ring', s: 8, grow: 13 * power, w: 16, c: '#fff1c2', life: 24, fade: 24, drag: 1 }), P({ x, y, kind: 'ring', s: 2, grow: 8 * power, w: 22, c: '#ff7a1f', life: 32, fade: 32, drag: 1 })]);
    burst(x, y, { n: 70 * power, colors: ['#fff3b0', '#ffd21f', '#ff8a1f', '#ff3b1f'], speed: 19 * power, size: 7, life: 34, grav: .12 });
    burst(x, y, { n: 26 * power, colors: ['#26262b', '#111113', '#5a5a60'], speed: 15 * power, size: 7, life: 60, grav: .34, kind: 'shard' });
    add(Array.from({ length: 22 }, () => P({ x: x + rnd(-24, 24), y: y + rnd(-24, 24), vx: rnd(-1.8, 1.8), vy: rnd(-3.2, -.6), s: rnd(10, 22), c: 'rgba(70,70,75,.5)', life: rnd(50, 90), fade: 50, kind: 'smoke' })));
  }

  /* ---------- scénarios */
  function lose(amount, text = 'PERDU', gap = 500) {
    const now = Date.now();
    if (now - lastBanner < gap) return;
    lastBanner = now;
    sndLose();
    shake(.8, 460);
    flash('red', 560);
    banner(text, 'lose', amount ? `-${money(amount)} bahlous` : '');
    canvas(); burst(cv.width / 2, cv.height / 2, { n: 60, colors: ['#ff2a1a', '#7c0a05', '#ff6a4a'], speed: 17, size: 6, life: 42, grav: .34, kind: 'shard' });
  }
  function win(amount, text = 'GAGNÉ', gap = 350) {
    const now = Date.now();
    if (now - lastBanner < gap) return;
    lastBanner = now;
    sndWin();
    flash('gold', 420);
    banner(text, 'win', amount ? `+${money(amount)} bahlous` : '');
    canvas(); coins(cv.width / 2, cv.height * .62, 60);
  }
  function push(text = 'ÉGALITÉ') { banner(text, 'push', '', 900); }
  function gift(amount) { sndWin(); flash('gold', 500); banner('CADEAU', 'win', `+${money(amount)} bahlous`, 1900); canvas(); rain(150); coins(cv.width / 2, cv.height * .62, 70); }
  function explode(el, power = 1) {
    if (!el) return;
    const [x, y] = center(el);
    sndBoom(); flash('white', 240); shake(1.5 * power, 700); explosion(x, y, power);
  }
  function collapse(stage, trigger) {
    if (trigger) explode(trigger, 1.1);
    sndCrumble();
    if (quiet) return;
    const rows = [...stage.children];
    stage.classList.add('fx-collapsing');
    rows.forEach((row, i) => {
      row.style.setProperty('--fx-x', `${rnd(-160, 160)}px`);
      row.style.setProperty('--fx-r', `${rnd(-32, 32)}deg`);
      row.style.setProperty('--fx-d', `${(rows.length - i) * 55 + rnd(0, 50)}ms`);
      row.classList.add('fx-fall');
      row.querySelectorAll('button').forEach((d) => { d.style.setProperty('--fx-x', `${rnd(-150, 150)}px`); d.style.setProperty('--fx-r', `${rnd(-90, 90)}deg`); d.classList.add('fx-door'); });
    });
    const r = stage.getBoundingClientRect();
    setTimeout(() => {
      shake(2, 760);
      for (let i = 0; i < 7; i++) setTimeout(() => add(Array.from({ length: 16 }, () => P({ x: rnd(r.left, r.right), y: r.bottom - rnd(0, 26), vx: rnd(-3, 3), vy: rnd(-5, -.5), s: rnd(12, 28), c: 'rgba(120,120,128,.42)', life: rnd(50, 95), fade: 55, kind: 'smoke' }))), i * 90);
      burst(r.left + r.width / 2, r.bottom - 12, { n: 90, colors: ['#3a3a40', '#26262b', '#f2efe6'], speed: 16, size: 8, life: 56, grav: .42, kind: 'shard' });
    }, 560);
    setTimeout(() => { stage.classList.remove('fx-collapsing'); rows.forEach((row) => { row.classList.remove('fx-fall'); row.querySelectorAll('button').forEach((d) => d.classList.remove('fx-door')); row.style.animation = 'fx-rise .45s ease both'; }); }, 2100);
  }
  function sparkle(el, colors = ['#e2f6ff', '#55b9ee', '#fff']) { if (!el) return; const [x, y] = center(el); burst(x, y, { n: 26, colors, speed: 8, size: 4, life: 30, grav: .06 }); }
  function coinsAt(el, n = 34) { if (!el) return; const [x, y] = center(el); coins(x, y, n); }
  function rattle(el) { if (!el || quiet) return; el.classList.remove('fx-rattle'); void el.offsetWidth; el.classList.add('fx-rattle'); setTimeout(() => el.classList.remove('fx-rattle'), 620); }
  function blast(els, from) {
    if (quiet || !from) return;
    const [ox, oy] = center(from);
    [...els].forEach((c) => {
      if (c === from) return;
      const [x, y] = center(c), dx = x - ox, dy = y - oy, dist = Math.hypot(dx, dy) || 1, kick = Math.max(10, 58 - dist * .1);
      c.style.setProperty('--fx-x', `${dx / dist * kick}px`);
      c.style.setProperty('--fx-y', `${dy / dist * kick}px`);
      c.style.setProperty('--fx-r', `${rnd(-16, 16)}deg`);
      c.style.setProperty('--fx-d', `${dist * .45}ms`);
      c.classList.remove('fx-blast'); void c.offsetWidth; c.classList.add('fx-blast');
    });
  }
  function spray(x, y, n = 24) { coins(x, y, n); }
  function fling(els) { if (quiet) return; [...els].forEach((c, i) => { c.style.setProperty('--fx-x', `${rnd(-260, 260)}px`); c.style.setProperty('--fx-r', `${rnd(-140, 140)}deg`); c.style.setProperty('--fx-d', `${i * 40}ms`); c.classList.add('fx-fling'); }); }
  function rarity(el, rar) {
    if (!el) return;
    const [x, y] = center(el);
    const colors = rar === 'l' ? ['#ffe27a', '#e88a12', '#fff'] : rar === 'e' ? ['#d59bff', '#7a2fc0', '#fff'] : rar === 'r' ? ['#7fb2ff', '#2f62c9', '#fff'] : ['#d9d6cd', '#a9a69c'];
    burst(x, y, { n: rar === 'l' ? 180 : rar === 'e' ? 110 : 44, colors, speed: rar === 'l' ? 24 : 15, size: 6, life: 58, grav: .14 });
    if (rar === 'l') { flash('gold', 600); shake(1, 600); rain(120); }
  }

  return { scrape, lose, win, push, gift, explode, collapse, blast, burst, spray, sparkle, coinsAt, rattle, fling, rain, rarity, shake };
})();
