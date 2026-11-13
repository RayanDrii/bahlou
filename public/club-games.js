'use strict';
/* Le casino — les onze jeux. Le serveur tire tout, ici on met en scène. */
(() => {
  const { C, games, shell, betBox, post, release, celebrate, bigWin, sfx, fmt, short, coin, delay, chipHtml, stackHtml, cardSvg, led, CHIP_VALUES } = Club;
  const q = (s, r) => r.querySelector(s);
  const dec = (n) => String(n).replace('.', ',');
  const onResize = (ctx, f) => { addEventListener('resize', f); ctx.add(() => removeEventListener('resize', f)); };
  const fit = (cv) => { const r = cv.getBoundingClientRect(), d = devicePixelRatio || 1; cv.width = Math.max(1, r.width * d); cv.height = Math.max(1, r.height * d); return d; };
  const cardHtml = (c, cls = '', d = 0) => `<div class="pc ${cls}"${d ? ` style="animation-delay:${d}ms"` : ''}>${cardSvg(c)}</div>`;
  const sel = (id, items) => `<div class="chips-sel" id="${id}">${items.map(([k, v]) => `<button type="button" data-o="${k}">${v}</button>`).join('')}</div>`;
  const pick = (root, id, val) => root.querySelectorAll(`#${id} [data-o]`).forEach((x) => x.classList.toggle('on', x.dataset.o === String(val)));

  const GEM = '<svg viewBox="0 0 48 48"><path fill="#4aa8ff" d="M13 7h22l11 13-22 23L2 20Z"/><path fill="#b5e0ff" d="M18 7h12l4 13H14Z"/></svg>';
  const BOMB = '<svg viewBox="0 0 48 48" fill="currentColor"><circle cx="21" cy="29" r="15"/><path d="M29 15l6-8 5 4-6 8Z"/><path d="M42 1l2 5 5 2-5 2-2 5-2-5-5-2 5-2Z" fill="#e9bf5a"/></svg>';
  const COINS = '<svg viewBox="0 0 48 48"><circle cx="24" cy="24" r="19" fill="#e9bf5a"/><circle cx="24" cy="24" r="12" fill="none" stroke="#070f0c" stroke-width="3"/></svg>';

  /* ------------------------------------------------------------ Roulette */
  const ROU_ORDER = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  const ROU_RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
  const rouTone = (n) => (n === 0 ? 'ze' : ROU_RED.has(n) ? 're' : 'no');
  games.roulette = (root, ctx) => {
    const b = shell(root, 'roulette');
    const cells = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 12; c++) { const n = 3 * c + 3 - r; cells.push(`<button type="button" data-k="n${n}" class="${rouTone(n)}" style="grid-row:${r + 1};grid-column:${c + 2}">${n}</button>`); }
    const OUT = [['manque', '1 à 18'], ['pair', 'Pair'], ['ivoire', '<span class="dia" style="background:#c8102e"></span>'], ['noir', '<span class="dia" style="background:#111"></span>'], ['impair', 'Impair'], ['passe', '19 à 36']];
    b.innerHTML = `<div class="ro-stage felt-table"><div class="ro-w"><canvas id="ro-c"></canvas></div>
      <div class="ro-right"><div class="ro-board"><div class="ro-last" id="ro-l"></div><div class="ro-hist" id="ro-h"></div></div>
      <div class="ro-t" id="ro-t"><button type="button" data-k="n0" class="ze" style="grid-column:1">0</button>${cells.join('')}
      ${[2, 1, 0].map((c, r) => `<button type="button" class="co" data-k="c${c}" style="grid-row:${r + 1};grid-column:14">2 : 1</button>`).join('')}
      <span class="sp"></span><span class="sp2"></span>
      ${['1re douzaine', '2e douzaine', '3e douzaine'].map((t, i) => `<button type="button" class="wl wide" data-k="d${i}" style="grid-row:4">${t}</button>`).join('')}
      ${OUT.map(([k, t]) => `<button type="button" class="wl half" data-k="${k}" style="grid-row:5">${t}</button>`).join('')}</div></div></div>
      <aside class="gm-p"><div class="ro-chips" id="ro-ch">${CHIP_VALUES.map((v) => `<button type="button" data-v="${v}">${chipHtml(v)}</button>`).join('')}</div>
      <div class="kv"><span>Mise totale</span><b id="ro-tot">0</b></div>
      <div class="ro-tools"><button type="button" data-t="undo">Annuler</button><button type="button" data-t="clear">Effacer</button><button type="button" data-t="dbl">Doubler</button><button type="button" data-t="again">Rejouer</button></div>
      <button type="button" class="play" id="ro-go" disabled>Lancer la bille</button></aside>`;
    const table = q('#ro-t', b), go = q('#ro-go', b), tot = q('#ro-tot', b);
    let chip = store.get('ro.chip', 100), bets = new Map(), stack = [], last = store.get('ro.last', []), hist = store.get('ro.hist', []), spinning = false, pending = null;
    ctx.add(() => { if (pending) { release(pending.payout); pending.later(); } });
    const total = () => [...bets.values()].reduce((a, v) => a + v, 0);
    const topChip = (v) => [...CHIP_VALUES].reverse().find((c) => v >= c) || 10;
    function paintBets() {
      table.querySelectorAll('.chip').forEach((n) => n.remove());
      for (const [k, v] of bets) q(`[data-k="${k}"]`, table).insertAdjacentHTML('beforeend', `<span class="chip c${topChip(v)}"><b>${short(v)}</b></span>`);
      tot.textContent = fmt(total());
      go.disabled = spinning || !bets.size;
    }
    const paintChips = () => b.querySelectorAll('#ro-ch [data-v]').forEach((x) => x.classList.toggle('on', +x.dataset.v === chip));
    const paintHist = () => (q('#ro-h', b).innerHTML = hist.slice(0, 14).map((n) => `<span class="${rouTone(n)}">${n}</span>`).join(''));
    q('#ro-ch', b).onclick = (e) => { const x = e.target.closest('[data-v]'); if (x) { chip = +x.dataset.v; store.set('ro.chip', chip); sfx.chip(); paintChips(); } };
    const cap = () => C.me.coins;
    table.onclick = (e) => {
      const k = e.target.closest('[data-k]')?.dataset.k;
      if (!k || spinning) return;
      if (total() + chip > cap()) return toast('Plafond de mise atteint', true);
      bets.set(k, (bets.get(k) || 0) + chip); stack.push([k, chip]); sfx.chip(); paintBets();
    };
    table.oncontextmenu = (e) => {
      e.preventDefault();
      const k = e.target.closest('[data-k]')?.dataset.k;
      if (!k || spinning || !bets.has(k)) return;
      bets.delete(k); stack = stack.filter(([x]) => x !== k); paintBets();
    };
    q('.ro-tools', b).onclick = (e) => {
      const t = e.target.dataset.t; if (!t || spinning) return;
      sfx.chip();
      if (t === 'undo') { const s = stack.pop(); if (s) { const v = bets.get(s[0]) - s[1]; v > 0 ? bets.set(s[0], v) : bets.delete(s[0]); } }
      else if (t === 'clear') { bets.clear(); stack = []; }
      else if (t === 'dbl') { if (total() * 2 > cap()) return toast('Plafond de mise atteint', true); for (const [k, v] of bets) { bets.set(k, v * 2); stack.push([k, v]); } }
      else if (t === 'again' && last.length) { if (last.reduce((a, [, v]) => a + v, 0) > cap()) return toast('Solde insuffisant', true); bets = new Map(last); stack = last.map(([k, v]) => [k, v]); }
      paintBets();
    };

    /* cuvette fixe + cylindre rotatif, pré-rendus pour rester fluides */
    const cv = q('#ro-c', b), x = cv.getContext('2d');
    let bowl = null, rotor = null, S = 0;
    const N = 37, A = (Math.PI * 2) / N;
    const layer = () => { const o = document.createElement('canvas'); o.width = o.height = S; const g = o.getContext('2d'); g.translate(S / 2, S / 2); return [o, g]; };
    function prerender() {
      const d = fit(cv); S = Math.floor(Math.min(cv.width, cv.height));
      if (S < 8) return;
      const R = S / 2;
      const disc = (g, r, fill) => { g.beginPath(); g.arc(0, 0, r, 0, 7); g.fillStyle = fill; g.fill(); };
      const circ = (g, r, c, w) => { g.beginPath(); g.arc(0, 0, r, 0, 7); g.strokeStyle = c; g.lineWidth = w * d; g.stroke(); };
      const [bo, bg] = layer();
      disc(bg, R * 0.995, '#e9bf5a'); disc(bg, R * 0.965, '#0c1411');
      disc(bg, R * 0.885, '#070f0c'); circ(bg, R * 0.92, '#e9bf5a', 1.5);
      bowl = bo;
      const [ro, g] = layer();
      const rOut = R * 0.765, rBand = R * 0.665, rIn = R * 0.555;
      ROU_ORDER.forEach((n, i) => {
        const a0 = -Math.PI / 2 + (i - 0.5) * A, a1 = a0 + A, col = n === 0 ? '#0f9d58' : ROU_RED.has(n) ? '#c8102e' : '#0e0e11';
        g.beginPath(); g.arc(0, 0, rOut, a0, a1); g.arc(0, 0, rIn, a1, a0, true); g.closePath(); g.fillStyle = col; g.fill();
        g.strokeStyle = '#c9a24b'; g.lineWidth = 1.2 * d; g.beginPath(); g.moveTo(Math.cos(a0) * rIn, Math.sin(a0) * rIn); g.lineTo(Math.cos(a0) * rOut, Math.sin(a0) * rOut); g.stroke();
        g.save(); g.rotate(a0 + A / 2 + Math.PI / 2);
        g.fillStyle = '#fff'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.font = `700 ${R * 0.07}px 'Big Shoulders', Impact, sans-serif`; g.fillText(n, 0, -(rOut + rBand) / 2); g.restore();
      });
      disc(g, rIn, '#0a1410'); circ(g, rOut, '#e9bf5a', 1.6); circ(g, rIn, '#e9bf5a', 1.6);
      g.strokeStyle = '#c9a24b'; g.lineCap = 'butt'; g.lineWidth = R * 0.03;
      for (let i = 0; i < 4; i++) { g.save(); g.rotate((i * Math.PI) / 2); g.beginPath(); g.moveTo(0, -rIn * 0.12); g.lineTo(0, -rIn * 0.7); g.stroke(); g.restore(); }
      disc(g, R * 0.085, '#e9bf5a');
      rotor = ro;
    }
    prerender(); onResize(ctx, prerender);
    let wa = Math.random() * 6, ba = 0, spin = null, ballOn = false, glued = 0, br = 0, lastT = performance.now(), lastSeg = -1;
    const easeOut = (k, p) => 1 - Math.pow(1 - k, p);
    ctx.loop((now) => {
      const dt = Math.min(50, now - lastT); lastT = now;
      if (!rotor) return;
      const R = S / 2, rim = R * 0.83, rest = R * 0.612;
      if (spin) {
        const k = Math.max(0, Math.min(1, (now - spin.t0) / spin.T));
        wa = spin.w0 + spin.W * easeOut(k, 3);
        ba = spin.bEnd + spin.B * (1 - easeOut(k, 3.4));
        const u = Math.max(0, (k - 0.62) / 0.38);
        br = rest + (rim - rest) * Math.pow(1 - u, 2.2) + (u > 0 ? Math.abs(Math.sin(u * Math.PI * 4)) * (1 - u) * R * 0.05 : 0);
        const seg = Math.floor((ba - wa) / A);
        if (seg !== lastSeg && u > 0) { lastSeg = seg; sfx.tick(); }
        if (k >= 1) { glued = spin.pocket; spin.done(); spin = null; }
      } else {
        wa += dt * 0.00016;
        if (ballOn) ba = wa + glued * A - Math.PI / 2;
      }
      x.clearRect(0, 0, cv.width, cv.height);
      x.save(); x.translate(cv.width / 2, cv.height / 2);
      x.drawImage(bowl, -R, -R);
      x.save(); x.rotate(wa); x.drawImage(rotor, -R, -R); x.restore();
      if (ballOn) {
        const bx = Math.cos(ba) * br, by = Math.sin(ba) * br, r = R * 0.027;
        x.beginPath(); x.arc(bx, by, r, 0, 7); x.fillStyle = '#f2efe6'; x.fill();
      }
      x.restore();
    });
    go.onclick = async () => {
      if (spinning || !bets.size) return;
      spinning = true; go.disabled = true;
      const list = [...bets.entries()];
      const r = await post('roulette', { bets: list.map(([k, a]) => ({ k, a })) }, { hold: (z) => z.payout, defer: true });
      if (!r) { spinning = false; paintBets(); return; }
      pending = r;
      last = list; store.set('ro.last', last);
      table.querySelectorAll('.win').forEach((n) => n.classList.remove('win'));
      q('#ro-l', b).textContent = ''; q('#ro-l', b).className = 'ro-last';
      const pocket = ROU_ORDER.indexOf(r.number);
      const W = Math.PI * 2 * 2.5 + Math.random() * 2;
      const wEnd = wa + W;
      ballOn = true; br = (S / 2) * 0.83; lastSeg = -1;
      await new Promise((done) => { spin = { t0: performance.now(), T: 6400, w0: wa, W, bEnd: wEnd + pocket * A - Math.PI / 2, B: Math.PI * 2 * 9, pocket, done }; });
      if (!ctx.alive) return;
      sfx.stop();
      pending = null;
      release(r.payout); r.later();
      hist.unshift(r.number); hist = hist.slice(0, 20); store.set('ro.hist', hist); paintHist();
      q('#ro-l', b).textContent = r.number; q('#ro-l', b).className = 'ro-last ' + rouTone(r.number);
      q(`[data-k="n${r.number}"]`, table).classList.add('win');
      celebrate(r.payout, r.bet);
      if (r.payout) FX.coinsAt(q(`[data-k="n${r.number}"]`, table));
      await delay(1900);
      if (!ctx.alive) return;
      bets.clear(); stack = []; spinning = false; paintBets();
    };
    q('#ro-l', b).textContent = hist.length ? hist[0] : '';
    if (hist.length) q('#ro-l', b).className = 'ro-last ' + rouTone(hist[0]);
    paintChips(); paintBets(); paintHist();
  };

  /* ------------------------------------------------------------ Blackjack */
  games.blackjack = (root, ctx) => {
    const b = shell(root, 'blackjack');
    b.innerHTML = `<div class="bj-stage felt-table"><svg class="bj-print" viewBox="0 0 1000 560" preserveAspectRatio="xMidYMid meet"><defs><path id="bj-a1" d="M90 150 Q500 470 910 150"/><path id="bj-a2" d="M150 118 Q500 410 850 118"/></defs>
        <text font-family="Big Shoulders, Impact, sans-serif" font-weight="700" font-size="42" fill="#c9a24b" letter-spacing="3"><textPath href="#bj-a1" startOffset="50%" text-anchor="middle">LE BLACKJACK PAIE 3 CONTRE 2</textPath></text>
        <text font-family="Archivo, sans-serif" font-weight="500" font-size="19" fill="#c9a24b" letter-spacing="2.5"><textPath href="#bj-a2" startOffset="50%" text-anchor="middle">LE CROUPIER TIRE JUSQU'À 16 ET RESTE À 17</textPath></text></svg>
      <div class="bj-side"><div class="bj-h" id="bj-d"></div><span class="bj-tag" id="bj-dt" hidden></span></div><div class="bj-mid"><div class="bj-msg" id="bj-m"></div></div><div class="bj-side"><span class="bj-tag" id="bj-pt" hidden></span><div class="bj-h" id="bj-p"></div></div><div class="bj-bet" id="bj-bt"></div></div>
      <aside class="gm-p"><div id="bj-b"></div><div class="bj-act" id="bj-a" style="display:flex;gap:8px"></div></aside>`;
    const bet = betBox('blackjack'); q('#bj-b', b).replaceWith(bet.el);
    const D = q('#bj-d', b), P = q('#bj-p', b), M = q('#bj-m', b), A = q('#bj-a', b), BT = q('#bj-bt', b);
    let game = C.bj, dn = 0, pn = 0, busy = false, shown = [];
    const LABEL = { blackjack: 'Blackjack', win: 'Gagné', push: 'Égalité', lose: 'Perdu', bust: 'Dépassé' };
    function drawHand(el, cards, known, step = 150) {
      el.innerHTML = cards.map((c, i) => cardHtml(c, i >= known ? 'deal' : '', i >= known ? (i - known) * step : 0)).join('');
      for (let i = known; i < cards.length; i++) setTimeout(sfx.card, (i - known) * step);
    }
    function paintActions() {
      A.innerHTML = game
        ? `<button type="button" class="play" data-a="hit">Carte</button><button type="button" class="play alt" data-a="stand">Rester</button><button type="button" class="play alt" data-a="double" ${game.canDouble && C.me.coins >= game.handBet ? '' : 'disabled'}>Doubler</button><button type="button" class="play alt" data-a="split" ${game.canSplit && C.me.coins >= game.handBet ? '' : 'disabled'}>Séparer</button>`
        : '<button type="button" class="play" data-a="deal">Distribuer</button>';
      bet.lock(!!game);
    }
    function paintGame(g) {
      const pt = q('#bj-pt', b), dt = q('#bj-dt', b);
      const split = g.hands.length > 1;
      pt.hidden = split; dt.hidden = false; pt.textContent = g.total; dt.textContent = g.dealerTotal;
      BT.innerHTML = stackHtml(g.bet);
      if (split) {
        const WORD = { win: 'Gagné', blackjack: 'Blackjack', push: 'Égalité', lose: 'Perdu', bust: 'Dépassé' };
        P.className = 'bj-splits';
        P.innerHTML = g.hands.map((h, i) => `<div class="bj-one ${i === g.cur && !h.result ? 'cur' : ''}"><span class="bj-tag ${h.result || ''}">${h.result ? WORD[h.result] : h.total}</span><div class="bj-cards">${h.cards.map((c, k) => cardHtml(c, k >= (shown[i] || 0) ? 'deal' : '', 0)).join('')}</div></div>`).join('');
        g.hands.forEach((h, i) => { if (h.cards.length > (shown[i] || 0)) sfx.card(); shown[i] = h.cards.length; });
      } else {
        P.className = 'bj-h';
        drawHand(P, g.player, pn); pn = g.player.length;
      }
      drawHand(D, g.dealer, g.dealer[1] === -1 ? dn : Math.min(dn, 1), 520); dn = g.dealer.length;
    }
    async function act(a) {
      if (busy) return;
      busy = true;
      if (a === 'deal') { dn = 0; pn = 0; shown = []; M.textContent = ''; M.className = 'bj-msg'; sfx.chip(); }
      const path = { deal: 'bj/start', hit: 'bj/hit', stand: 'bj/stand', double: 'bj/double', split: 'bj/split' }[a];
      const r = await post(path, a === 'deal' ? { bet: bet.get() } : {}, { hold: (x) => x.payout || 0, defer: true });
      if (!r) { busy = false; return; }
      if (r.over) {
        game = null; C.bj = null;
        paintGame(r.game); paintActions();
        A.querySelectorAll('button').forEach((x) => (x.disabled = true));
        await delay(Math.max(700, (r.game.dealer.length - 1) * 520 + 300));
        release(r.payout || 0); r.later();
        if (ctx.alive) {
          M.textContent = LABEL[r.result]; M.className = 'bj-msg show ' + (r.payout > r.game.bet ? 'won' : '');
          celebrate(r.payout, r.game.bet, undefined, { win: r.result === 'blackjack' ? 'BLACKJACK' : undefined, lose: r.result === 'bust' ? 'SAUTÉ' : undefined, push: 'ÉGALITÉ' });
          if (r.result === 'bust') FX.fling(P.querySelectorAll('.pc'));
          paintActions();
        }
      } else { game = r.game; C.bj = game; paintGame(game); paintActions(); r.later(); }
      busy = false;
    }
    A.onclick = (e) => { const a = e.target.dataset.a; if (a) act(a); };
    paintActions();
    if (game) paintGame(game);
  };

  /* ------------------------------------------------------------ Hold'em */
  games.poker = (root, ctx) => {
    const b = shell(root, 'poker');
    b.innerHTML = `<div class="po-stage"><div class="po-table" id="po-t"><div class="po-felt"><div class="po-board" id="po-b"></div><div class="po-pot" id="po-p"></div><div class="po-msg" id="po-m"></div><div class="po-brand">BAHLOU</div></div><div id="po-s"></div></div><div class="po-act" id="po-a"></div></div>`;
    const seatsEl = q('#po-s', b), board = q('#po-b', b), pot = q('#po-p', b), msg = q('#po-m', b), actEl = q('#po-a', b);
    let lastBoard = 0, lastHand = 0, actKey = '', sawTurn = false, fxHand = C.poker.phase === 'done' ? C.poker.hand : -1, inTourney = false;
    const you = () => C.poker.seats.findIndex((s) => s && s.name === state.me);
    function paint() {
      const v = C.poker, me = you();
      let tb = q('#po-tb', b);
      if (!tb) { actEl.insertAdjacentHTML('beforebegin', '<div class="po-tb" id="po-tb" hidden></div>'); tb = q('#po-tb', b); }
      tb.hidden = !v.tourney;
      if (v.tourney) tb.innerHTML = `<span>Tournoi, niveau ${v.tourney.level}</span><span>Blindes ${v.tourney.sb}/${v.tourney.bb}</span><span>${v.tourney.alive.length} en jeu</span>`;
      if (v.hand !== lastHand) { lastHand = v.hand; lastBoard = 0; }
      if (v.board.length > lastBoard) sfx.card();
      board.innerHTML = v.board.map((c, i) => cardHtml(c, i >= lastBoard ? 'deal' : '', i >= lastBoard ? (i - lastBoard) * 170 : 0)).join('');
      lastBoard = v.board.length;
      pot.innerHTML = v.pot ? `${stackHtml(v.pot, 5)}${fmt(v.pot)}` : '';
      if (v.phase === 'done' && v.result) {
        const w = v.result.winners[0];
        msg.innerHTML = w ? `<b>${esc(w.name)}</b> remporte ${fmt(w.amount)}${w.hand ? `, ${w.hand.toLowerCase()}` : ''}` : '';
        msg.className = 'po-msg show';
      } else { msg.className = 'po-msg'; msg.textContent = v.phase === 'idle' ? (me >= 0 ? 'La partie va commencer' : 'Prenez place pour ouvrir la table') : ''; if (v.phase === 'idle') msg.classList.add('show'); }
      seatsEl.replaceChildren();
      v.seats.forEach((s, i) => {
        const d = me >= 0 ? (i - me + 6) % 6 : i;
        const el = document.createElement('div');
        el.className = `seat p${d}`;
        if (!s) { el.classList.add('free'); el.innerHTML = '<span>Place libre</span>'; seatsEl.appendChild(el); return; }
        const winner = v.phase === 'done' && v.result?.winners.some((w) => w.name === s.name);
        if (s.folded) el.classList.add('folded');
        if (v.cur === i) el.classList.add('cur');
        if (winner) el.classList.add('winner');
        if (s.hole) el.insertAdjacentHTML('beforeend', `<div class="seat-c">${s.hole.map((c) => cardHtml(c)).join('')}</div>`);
        el.appendChild(avatar(s.name, 'lg'));
        const hand = v.phase === 'done' && v.result?.hands?.[s.name];
        el.insertAdjacentHTML('beforeend', `<div class="seat-i"><b>${esc(s.name)}</b><span>${s.allin ? 'Tapis' : fmt(s.stack)}</span>${hand ? `<em>${hand}</em>` : ''}</div>`);
        if (v.btn === i && v.phase !== 'idle') el.insertAdjacentHTML('beforeend', '<i class="seat-d">D</i>');
        if (s.street > 0) el.insertAdjacentHTML('beforeend', `<div class="seat-b">${chipHtml(s.street >= 500 ? 500 : s.street >= 100 ? 100 : 50)}${short(s.street)}</div>`);
        if (v.cur === i && v.left > 0) el.insertAdjacentHTML('beforeend', `<div class="seat-tm"><i style="animation-duration:${v.left}ms"></i></div>`);
        seatsEl.appendChild(el);
      });
      if (v.phase === 'done' && v.result && v.hand !== fxHand) {
        fxHand = v.hand;
        FX.coinsAt(seatsEl.querySelector('.seat.winner'), 30);
        const w = v.result.winners.find((x) => x.name === state.me);
        if (w) FX.win(w.amount, 'POT GAGNÉ');
        else if (me >= 0 && !v.seats[me].folded) FX.lose(0);
      }
      const stillIn = !!v.tourney?.alive.includes(state.me);
      if (inTourney && v.tourney && !stillIn) FX.lose(0, 'ÉLIMINÉ');
      inTourney = stillIn;
      paintActions();
    }
    function paintActions() {
      const v = C.poker, me = you(), s = me >= 0 ? v.seats[me] : null;
      if (v.tourney && !s) { if (actKey !== 'tw') { actKey = 'tw'; actEl.innerHTML = '<div class="po-wait"><span class="muted">Tournoi en cours, tu regardes la table.</span></div>'; } return; }
      if (!s) {
        const key = 'sit' + C.me.coins; if (actKey === key) return; actKey = key;
        const max = C.me.coins, can = max >= v.minBuyin;
        const start = Math.min(max, Math.max(v.minBuyin, 5000));
        actEl.innerHTML = can ? `<div class="po-buy"><div><small>Cave</small><b id="po-bv">${fmt(start)}</b></div><input type="range" id="po-bi" min="${v.minBuyin}" max="${max}" step="100" value="${start}"><button type="button" class="play" id="po-sit">Prendre place</button></div>` : `<div class="po-buy"><p>La table demande ${fmt(v.minBuyin)} bahlous au minimum.</p></div>`;
        const rg = q('#po-bi', actEl); if (!rg) return;
        rg.oninput = () => (q('#po-bv', actEl).textContent = fmt(+rg.value));
        q('#po-sit', actEl).onclick = () => post('poker/sit', { buyin: +rg.value }).then((r) => r && sfx.chip());
        return;
      }
      const myTurn = v.cur === me && !s.folded;
      const key = myTurn ? `t${v.hand}-${v.phase}-${v.bet}-${v.minRaise}-${s.stack}` : `w${v.phase === 'idle'}-${s.folded}-${s.leaving}`;
      if (key === actKey) return; actKey = key;
      if (myTurn && !sawTurn) sfx.gem(6);
      sawTurn = myTurn;
      if (!myTurn) {
        actEl.innerHTML = `<div class="po-wait"><span>${s.leaving ? (v.tourney ? 'Absent, couché automatiquement' : 'Vous quittez la table après cette main') : v.phase === 'idle' ? 'En attente de la prochaine main' : s.folded ? 'Couché' : ''}</span>${v.tourney && s.leaving ? '<button type="button" class="sh-btn" id="po-bk">Revenir</button>' : s.leaving ? '' : `<button type="button" class="sh-btn" id="po-l">${v.tourney ? 'Se mettre absent' : 'Quitter la table'}</button>`}</div>`;
        if (q('#po-l', actEl)) q('#po-l', actEl).onclick = () => post('poker/leave');
        if (q('#po-bk', actEl)) q('#po-bk', actEl).onclick = () => post('poker/back');
        return;
      }
      const toCall = v.bet - s.street, maxTo = s.street + s.stack, minTo = Math.min(maxTo, v.bet + v.minRaise);
      const canRaise = maxTo > v.bet;
      actEl.innerHTML = `<div class="po-btns"><button type="button" class="play alt" data-p="fold">Se coucher</button>
        <button type="button" class="play alt" data-p="${toCall > 0 ? 'call' : 'check'}">${toCall > 0 ? `Suivre ${fmt(Math.min(toCall, s.stack))}` : 'Parole'}</button>
        ${canRaise ? `<button type="button" class="play" data-p="raise">Relancer <span id="po-rv">${fmt(minTo)}</span></button>` : ''}</div>
        ${canRaise ? `<div class="po-sl"><button type="button" data-f="0.5">Demi-pot</button><button type="button" data-f="1">Pot</button><button type="button" data-f="9">Tapis</button><input type="range" id="po-r" min="${minTo}" max="${maxTo}" step="5" value="${minTo}"></div>` : ''}`;
      const rg = q('#po-r', actEl);
      if (rg) {
        const out = q('#po-rv', actEl);
        rg.oninput = () => (out.textContent = fmt(+rg.value));
        actEl.querySelectorAll('[data-f]').forEach((x) => (x.onclick = () => { const f = +x.dataset.f; rg.value = f === 9 ? maxTo : Math.max(minTo, Math.min(maxTo, v.bet + Math.floor((v.pot + toCall) * f))); rg.oninput(); sfx.chip(); }));
      }
      actEl.querySelectorAll('[data-p]').forEach((x) => (x.onclick = () => { const t = x.dataset.p; sfx.chip(); actKey = ''; post('poker/act', { type: t, amount: t === 'raise' ? +rg.value : undefined }); }));
    }
    ctx.on('poker', paint);
    ctx.on('me', () => { if (you() < 0) paintActions(); });
    paint();
  };

  /* ------------------------------------------------------------ Machine à sous */
  games.slots = (root, ctx) => {
    const b = shell(root, 'slots');
    const sprite = `<svg width="0" height="0" style="position:absolute"><defs>
      <symbol id="y0" viewBox="0 0 48 48"><path d="M26 6c-6 6-10 13-12 20M26 6c3 7 6 14 7 22" stroke="#f2efe6" stroke-width="3" fill="none"/><path d="M26 7c5-5 12-5 16-2-4 5-11 6-16 2Z" fill="#f2efe6"/><circle cx="14" cy="34" r="10" fill="#c8102e"/><circle cx="34" cy="36" r="10" fill="#c8102e"/></symbol>
      <symbol id="y1" viewBox="0 0 48 48"><ellipse cx="24" cy="25" rx="20" ry="14" fill="#e9bf5a" transform="rotate(-18 24 25)"/></symbol>
      <symbol id="y2" viewBox="0 0 48 48"><rect x="2" y="13" width="44" height="22" fill="#f2efe6"/><text x="24" y="31" text-anchor="middle" font-family="Big Shoulders,Impact,sans-serif" font-weight="900" font-size="19" fill="#070f0c">BAR</text></symbol>
      <symbol id="y3" viewBox="0 0 48 48"><path d="M24 5c-9 0-13 8-13 18 0 7-3 10-6 13h38c-3-3-6-6-6-13 0-10-4-18-13-18Z" fill="#e9bf5a"/><path d="M19 39h10a5 5 0 0 1-10 0Z" fill="#f2efe6"/></symbol>
      <symbol id="y4" viewBox="0 0 48 48"><path d="M7 5h34v8L24 44H12l17-30H7Z" fill="#c8102e"/></symbol>
      <symbol id="y5" viewBox="0 0 48 48"><path fill="#4aa8ff" d="M13 7h22l11 13-22 24L2 20Z"/><path fill="#b5e0ff" d="M18 7h12l4 13H14Z"/></symbol>
      <symbol id="y6" viewBox="0 0 48 48"><rect x="1" y="10" width="46" height="28" fill="#e9bf5a"/><text x="24" y="31" text-anchor="middle" font-family="Big Shoulders,Impact,sans-serif" font-weight="900" font-size="19" fill="#070f0c">WILD</text></symbol>
      <symbol id="y7" viewBox="0 0 48 48"><path fill="#e9bf5a" d="M24 3l6.3 13.7 15 1.7-11.1 10.1 3 14.8L24 35.8 10.8 43.3l3-14.8L2.7 18.4l15-1.7Z"/></symbol>
    </defs></svg>`;
    const icon = (s) => `<svg><use href="#y${s}"/></svg>`;
    b.innerHTML = `<div class="sl-stage">${sprite}<div class="cab"><div class="cab-top"><div class="cab-title">Triple 7</div><div class="led-box" id="sl-j">${led(fmt(C.jackpot))}</div></div><div class="sl-free" id="sl-f" hidden></div><div class="sl-box" id="sl"></div><div class="sl-res" id="sl-r">Trois étoiles : huit tours offerts, gains doublés. WILD remplace tout.</div><div class="lever" id="sl-l"></div></div></div>
      <aside class="gm-p"><div id="sl-b"></div><button type="button" class="play" id="sl-go">Lancer</button><label class="chk"><input type="checkbox" id="sl-a"><span></span>Automatique</label></aside>`;
    const bet = betBox('slots'); q('#sl-b', b).replaceWith(bet.el);
    const box = q('#sl', b), res = q('#sl-r', b), go = q('#sl-go', b), autoC = q('#sl-a', b), free = q('#sl-f', b), lever = q('#sl-l', b);
    const rnd = () => Math.floor(Math.random() * 6);
    let current = Array.from({ length: 5 }, () => [rnd(), rnd(), rnd()]);
    const reelHtml = (syms) => syms.map((s) => `<div class="sl-c">${icon(s)}</div>`).join('');
    box.innerHTML = current.map((g) => `<div class="sl-reel"><div class="sl-strip">${reelHtml(g)}</div></div>`).join('');
    const strips = [...box.querySelectorAll('.sl-strip')];
    ctx.on('jackpot', () => { q('#sl-j', b).innerHTML = led(fmt(C.jackpot)); });
    async function roll(grid) {
      let scat = 0, extra = 0;
      const stops = strips.map((st, i) => {
        const filler = Array.from({ length: 18 + i * 5 }, rnd);
        const syms = [...grid[i], ...filler, ...current[i]];
        st.style.transition = 'none';
        st.innerHTML = reelHtml(syms);
        st.style.transform = `translateY(calc(var(--sh) * -${syms.length - 3}))`;
        st.getBoundingClientRect();
        const before = scat;
        scat += grid[i].filter((s) => s === 7).length;
        if (before >= 2 && i >= 2) extra += 900;
        const ms = 1050 + i * 240 + extra;
        st.style.transition = `transform ${ms}ms cubic-bezier(.16,.8,.2,1)`;
        st.style.transform = 'translateY(0)';
        return delay(ms).then(() => { sfx.stop(); st.innerHTML = reelHtml(grid[i]); });
      });
      await Promise.all(stops);
      current = grid;
    }
    const showWins = (wins) => wins.forEach((w) => C.cfg.slotLines[w.line].slice(0, w.n).forEach((row, reel) => strips[reel].children[row]?.classList.add('hit')));
    let busy = false;
    async function spin() {
      if (busy) return;
      busy = true; go.disabled = true; bet.lock(true); res.textContent = ''; res.className = 'sl-res';
      lever.classList.add('pull'); setTimeout(() => lever.classList.remove('pull'), 320);
      const amount = bet.get();
      const r = await post('slots', { bet: amount }, { hold: (x) => x.payout, defer: true });
      if (!r) { busy = false; go.disabled = false; bet.lock(false); autoC.checked = false; return; }
      let held = r.payout;
      await roll(r.first.grid);
      showWins(r.first.wins);
      if (r.first.total) { sfx.win(); release(r.first.total); held -= r.first.total; res.textContent = `+${fmt(r.first.total)}`; res.classList.add('won'); }
      if (r.free.length && ctx.alive) {
        sfx.big();
        await delay(1200);
        let sum = 0;
        for (let i = 0; i < r.free.length && ctx.alive; i++) {
          free.hidden = false; free.textContent = `Tours offerts ${i + 1} sur ${r.free.length}`;
          const s = r.free[i];
          await roll(s.grid); showWins(s.wins);
          if (s.total) { sfx.win(); release(s.total); held -= s.total; sum += s.total; res.textContent = `+${fmt(sum)}`; res.classList.add('won'); }
          await delay(s.total ? 800 : 320);
        }
        free.hidden = true;
      }
      if (held > 0) release(held);
      r.later();
      if (!ctx.alive) return;
      if (r.jackpot) bigWin(r.jackpot, 0, 'Jackpot');
      else if (r.payout >= amount * 10) bigWin(r.payout, r.payout / amount);
      else {
        document.querySelector('.gm-last b').textContent = r.payout ? '+' + fmt(r.payout) : '0';
        if (r.payout > amount) { FX.win(r.payout, undefined, autoC.checked ? 1800 : 350); FX.coinsAt(box, 44); }
        else if (!r.payout) { FX.rattle(box); FX.lose(amount, undefined, autoC.checked ? 2600 : 500); }
      }
      busy = false; go.disabled = false; bet.lock(false);
      if (autoC.checked) {
        if (C.me.coins < amount) { autoC.checked = false; return; }
        ctx.later(r.payout >= amount * 10 ? 3800 : 600, () => autoC.checked && spin());
      }
    }
    go.onclick = spin;
    lever.onclick = spin;
    autoC.onchange = () => { if (autoC.checked && !busy) spin(); };
    const key = (e) => { if (e.code === 'Space' && !/INPUT|TEXTAREA/.test(document.activeElement.tagName)) { e.preventDefault(); spin(); } };
    addEventListener('keydown', key);
    ctx.add(() => removeEventListener('keydown', key));
  };

  /* ------------------------------------------------------------ Big Six */
  const WH_COL = ['#c8102e', '#e9bf5a', '#0e7a52', '#f2efe6', '#0c1411', '#c8102e'];
  const WH_INK = new Set(['#e9bf5a', '#f2efe6']);
  function buildWheel(segs, label, fill) {
    const n = segs.length, R = 200, Rs = 174, a = 360 / n, pt = (deg, r) => { const t = ((deg - 90) * Math.PI) / 180; return `${(R + r * Math.cos(t)).toFixed(2)} ${(R + r * Math.sin(t)).toFixed(2)}`; };
    let s = `<circle cx="200" cy="200" r="200" fill="#e9bf5a"/><circle cx="200" cy="200" r="190" fill="#070f0c"/>`;
    segs.forEach((v, i) => {
      const a0 = i * a - a / 2, a1 = a0 + a, c = fill(v, i);
      s += `<path d="M${R} ${R}L${pt(a0, Rs)}A${Rs} ${Rs} 0 0 1 ${pt(a1, Rs)}Z" fill="${c}" stroke="#070f0c" stroke-width="3"/>`;
      s += `<text transform="rotate(${i * a} ${R} ${R})" x="${R}" y="${n > 16 ? 58 : 66}" text-anchor="middle" font-family="Big Shoulders, Impact, sans-serif" font-weight="800" font-size="${n > 16 ? 20 : 25}" fill="${WH_INK.has(c) ? '#070f0c' : '#f2efe6'}">${label(v)}</text>`;
    });
    return `<svg viewBox="0 0 400 400">${s}<circle cx="200" cy="200" r="52" fill="#070f0c" stroke="#e9bf5a" stroke-width="5"/></svg>`;
  }
  games.wheel = (root, ctx) => {
    const b = shell(root, 'wheel');
    b.innerHTML = `<div class="wh-stage"><div class="wh-wrap"><div class="wh-pin"></div><div class="wh" id="wh"></div></div><div class="wh-hub" id="wh-hub"></div></div>
      <aside class="gm-p"><div class="chips-sel" id="wh-t"><button type="button" data-m="free">Tour offert</button><button type="button" data-m="paid">Avec mise</button></div><div id="wh-p" style="display:flex;align-items:center;gap:20px;flex-wrap:wrap"></div></aside>`;
    let mode = C.me.wheelFree ? 'free' : 'paid', spinning = false, angle = 0, pending = null;
    const wh = q('#wh', b), hub = q('#wh-hub', b), panel = q('#wh-p', b);
    const bet = betBox('wheel');
    ctx.add(() => { if (pending) { release(pending.payout); pending.later(); } });
    const paint = () => {
      b.querySelectorAll('[data-m]').forEach((x) => x.classList.toggle('on', x.dataset.m === mode));
      if (mode === 'free') {
        wh.innerHTML = buildWheel(C.cfg.freeWheel, (v) => short(v), (v, i) => WH_COL[i % 6]);
        panel.innerHTML = `<button type="button" class="play" id="wh-go" ${C.me.wheelFree ? '' : 'disabled'}>${C.me.wheelFree ? 'Tourner' : 'Prochain tour demain'}</button>`;
      } else {
        const col = { 0: '#0c1411', 1.5: '#f2efe6', 2: '#0e7a52', 3: '#c8102e', 5: '#e9bf5a' };
        wh.innerHTML = buildWheel(C.cfg.wheel, (v) => (v ? '×' + dec(v) : ''), (v) => col[v]);
        panel.innerHTML = '<div id="wh-b"></div><button type="button" class="play" id="wh-go">Lancer la roue</button>';
        q('#wh-b', panel).replaceWith(bet.el);
      }
      wh.style.transition = 'none'; wh.style.transform = `rotate(${angle % 360}deg)`;
      q('#wh-go', panel).onclick = spin;
    };
    q('#wh-t', b).onclick = (e) => { const m = e.target.dataset.m; if (m && !spinning) { mode = m; sfx.click(); hub.textContent = ''; paint(); } };
    let tickA = 30, lastSeg = 0;
    ctx.loop(() => {
      if (!spinning) return;
      const m = new DOMMatrix(getComputedStyle(wh).transform), deg = (Math.atan2(m.b, m.a) * 180) / Math.PI;
      const seg = Math.floor(((deg + 360) % 360) / tickA);
      if (seg !== lastSeg) { lastSeg = seg; sfx.tick(); }
    });
    async function spin() {
      if (spinning) return;
      spinning = true;
      const btn = q('#wh-go', panel); btn.disabled = true; hub.textContent = '';
      const free = mode === 'free', amount = free ? 0 : bet.get();
      const r = await post('wheel', free ? { free: true } : { bet: amount }, { hold: (x) => x.payout, defer: true });
      if (!r) { spinning = false; btn.disabled = false; return; }
      pending = r;
      const n = free ? C.cfg.freeWheel.length : C.cfg.wheel.length, a = 360 / n;
      const target = 360 - r.index * a + (Math.random() - 0.5) * a * 0.76;
      angle = angle - (angle % 360) + 360 * 6 + target;
      tickA = a;
      wh.getBoundingClientRect();
      wh.style.transition = 'transform 6.4s cubic-bezier(.16,.84,.14,1)';
      wh.style.transform = `rotate(${angle}deg)`;
      await delay(6500);
      if (!ctx.alive) return;
      pending = null; spinning = false;
      release(r.payout); r.later();
      hub.textContent = r.payout ? '+' + short(r.payout) : '';
      if (free) { sfx.win(); if (r.payout >= 2500) bigWin(r.payout, 0, 'Big Six'); mode = 'paid'; ctx.later(1800, paint); }
      else { celebrate(r.payout, amount); q('#wh-go', panel).disabled = false; }
    }
    paint();
  };

  /* ------------------------------------------------------------ Ticket à gratter */
  games.scratch = (root, ctx) => {
    const b = shell(root, 'scratch');
    const WIN_RATE = '1 ticket sur 3,2 gagnant';
    const T = {
      bronze: { name: 'Petit Pactole', rule: 'Trouve 3 montants identiques.', foil: ['#e2e5e8', '#9aa0a6'], flake: ['#d7dade', '#a8aeb4', '#fff'] },
      argent: { name: "Numéros d'Or", rule: "Si l'un de tes numéros sort, tu gagnes le montant indiqué dessous.", foil: ['#e2e5e8', '#8f97a3'], flake: ['#d7dade', '#a8aeb4', '#fff'] },
      or: { name: 'Grand Magot', rule: 'Trouve 3 montants identiques, puis gratte la case bonus pour multiplier ton gain.', foil: ['#fff0b8', '#c9962f'], flake: ['#ffe9a0', '#e9bf5a', '#fff'] },
    };
    const lot = (id) => fmt(C.cfg.scratch[id] * 200);
    b.innerHTML = `<div class="sc-stage"><aside class="sc-rack">${Object.entries(T).map(([id, t]) => `<button type="button" class="tk-mini tk-${id}" data-t="${id}"><b>${esc(t.name)}</b><small>Gros lot ${lot(id)}</small><em>${coin}${fmt(C.cfg.scratch[id])}</em></button>`).join('')}</aside><div class="sc-table" id="sc"><div class="sc-empty">Choisis ton ticket</div></div></div>
      <aside class="gm-p"><button type="button" class="play" id="sc-again" disabled>Encore un ticket</button><button type="button" class="play alt" id="sc-all" disabled>Tout gratter</button><div class="sc-hint">Gratte à la souris, case par case</div></aside>`;
    const table = q('#sc', b), all = q('#sc-all', b), again = q('#sc-again', b);
    let live = null, tier = null;

    function zoneHtml(r) {
      const amount = (v) => short(v * r.bet);
      const grid = (vals) => `<div class="tk-g">${vals.map((v) => `<div class="tk-c" data-c data-v="${v}"><b>${amount(v)}</b></div>`).join('')}</div>`;
      if (r.kind === 'numbers') return `<div class="tk-lab">Numéros gagnants</div><div class="tk-win">${r.winning.map((n) => `<div class="tk-c tk-round" data-c><b>${n}</b></div>`).join('')}</div><div class="tk-lab">Tes numéros</div><div class="tk-nums">${r.cells.map((c) => `<div class="tk-c" data-c data-n="${c.n}"><b>${c.n}</b><small>${amount(c.v)}</small></div>`).join('')}</div>`;
      if (r.kind === 'bonus') return `${grid(r.grid)}<div class="tk-bonus"><span>Case bonus</span><div class="tk-c tk-m" data-c data-m><b>×${r.mult}</b></div></div>`;
      return grid(r.grid);
    }
    function winners(r) {
      const zone = q('.tk-zone', table);
      if (!r.prize) return [];
      if (r.kind === 'numbers') return [...zone.querySelectorAll('[data-n]')].filter((c) => r.winning.includes(+c.dataset.n)).concat([...zone.querySelectorAll('.tk-round')]);
      const three = [...zone.querySelectorAll(`[data-v="${r.kind === 'bonus' ? r.base : r.prize}"]`)];
      return r.kind === 'bonus' ? three.concat(zone.querySelector('[data-m]')) : three;
    }
    function finish() {
      if (!live || live.done) return;
      live.done = true;
      const r = live.r, t = q('.tk', table), res = q('.tk-res', table);
      live.canvas.style.pointerEvents = 'none';
      all.disabled = true; again.disabled = false;
      release(r.payout); r.later();
      winners(r).forEach((c) => c.classList.add('hit'));
      if (r.prize) { res.textContent = `Gagné : ${fmt(r.payout)}`; res.classList.add('won'); FX.coinsAt(t, 44); }
      else { res.textContent = 'Pas de chance'; FX.rattle(t); }
      celebrate(r.payout, r.bet, undefined, { push: 'REMBOURSÉ' });
    }
    ctx.add(() => { if (live && !live.done) { release(live.r.payout); live.r.later(); } });

    function paintFoil(cv, x, rects, foil, d) {
      for (const c of rects) {
        const g = x.createLinearGradient(c.x, c.y, c.x + c.w, c.y + c.h); g.addColorStop(0, foil[0]); g.addColorStop(1, foil[1]);
        x.fillStyle = g; x.beginPath(); x.roundRect(c.x, c.y, c.w, c.h, 5 * d); x.fill();
        x.save(); x.beginPath(); x.roundRect(c.x, c.y, c.w, c.h, 5 * d); x.clip();
        x.strokeStyle = 'rgba(255,255,255,.28)'; x.lineWidth = 1.2 * d;
        for (let k = -c.h; k < c.w; k += 9 * d) { x.beginPath(); x.moveTo(c.x + k, c.y + c.h); x.lineTo(c.x + k + c.h, c.y); x.stroke(); }
        x.restore();
        x.fillStyle = 'rgba(30,30,34,.5)'; x.textAlign = 'center'; x.textBaseline = 'middle';
        x.font = `900 ${Math.min(c.h * 0.42, 24 * d)}px 'Big Shoulders', Impact, sans-serif`; x.fillText('B', c.x + c.w / 2, c.y + c.h / 2);
      }
    }
    async function buy(id) {
      if (live && !live.done) return toast('Termine ce ticket', true);
      const r = await post('scratch', { tier: id }, { hold: (x) => x.payout, defer: true });
      if (!r) return;
      if (!ctx.alive) { release(r.payout); r.later(); return; }
      tier = id; again.disabled = true; all.disabled = false; sfx.card();
      const t = T[id];
      table.innerHTML = `<article class="tk tk-${id}"><header class="tk-top"><small>Jeu à gratter Bahlou</small><h3>${esc(t.name)}</h3><div class="tk-lot"><span>Gros lot</span><b>${lot(id)}</b></div></header><div class="tk-zone">${zoneHtml(r)}<canvas></canvas></div><p class="tk-rule">${esc(t.rule)}</p><div class="tk-res">&nbsp;</div><footer class="tk-foot"><span>N° ${String(Math.floor(Math.random() * 1e6)).padStart(6, '0')}</span><span>${WIN_RATE}</span><i></i></footer></article>`;
      const zone = q('.tk-zone', table), cv = q('canvas', zone), d = devicePixelRatio || 1;
      cv.width = Math.max(1, zone.clientWidth * d); cv.height = Math.max(1, zone.clientHeight * d);
      const x = cv.getContext('2d', { willReadFrequently: true }), zr = zone.getBoundingClientRect();
      const rects = [...zone.querySelectorAll('[data-c]')].map((el) => { const c = el.getBoundingClientRect(); return { el, x: (c.left - zr.left) * d, y: (c.top - zr.top) * d, w: c.width * d, h: c.height * d, open: false }; });
      paintFoil(cv, x, rects, t.foil, d);
      q('.tk', table).classList.add('in');
      x.globalCompositeOperation = 'destination-out'; x.fillStyle = '#000';
      live = { r, canvas: cv, done: false };
      const open = (c) => {
        if (c.open) return;
        c.open = true;
        x.fillRect(c.x - 1, c.y - 1, c.w + 2, c.h + 2);
        c.el.classList.add('on');
        sfx.tick();
        if (rects.every((k) => k.open)) ctx.later(320, finish);
      };
      const check = () => {
        for (const c of rects) {
          if (c.open) continue;
          const data = x.getImageData(c.x, c.y, Math.max(1, c.w), Math.max(1, c.h)).data;
          let clear = 0, total = 0;
          for (let i = 3; i < data.length; i += 64) { total++; if (data[i] < 40) clear++; }
          if (clear / total > 0.5) open(c);
        }
      };
      const brush = (x0, y0, x1, y1) => {
        const dist = Math.hypot(x1 - x0, y1 - y0), steps = Math.max(1, Math.round(dist / (5 * d)));
        for (let i = 0; i <= steps; i++) {
          const k = i / steps, px = x0 + (x1 - x0) * k, py = y0 + (y1 - y0) * k;
          for (let j = 0; j < 3; j++) { x.beginPath(); x.arc(px + (Math.random() - 0.5) * 12 * d, py + (Math.random() - 0.5) * 12 * d, (9 + Math.random() * 8) * d, 0, 7); x.fill(); }
        }
      };
      let down = false, px = 0, py = 0, n = 0;
      const pos = (e) => { const rr = cv.getBoundingClientRect(); return [(e.clientX - rr.left) * (cv.width / rr.width), (e.clientY - rr.top) * (cv.height / rr.height)]; };
      cv.onpointerdown = (e) => { if (live.done) return; down = true; cv.setPointerCapture(e.pointerId); [px, py] = pos(e); brush(px, py, px, py); };
      cv.onpointerup = cv.onpointercancel = () => { down = false; check(); };
      cv.onpointermove = (e) => {
        if (!down || live.done) return;
        const [nx, ny] = pos(e), moved = Math.hypot(nx - px, ny - py);
        if (moved < 2 * d) return;
        brush(px, py, nx, ny); px = nx; py = ny; n++;
        FX.scrape(moved / d);
        if (n % 2 === 0) FX.burst(e.clientX, e.clientY, { n: 5, colors: t.flake, speed: 5, size: 2.4, life: 22, grav: 0.34, kind: 'shard' });
        if (n % 5 === 0) check();
      };
      all.onclick = async () => {
        if (!live || live.done) return;
        all.disabled = true; cv.style.pointerEvents = 'none';
        for (const c of rects) {
          if (c.open) continue;
          const zb = zone.getBoundingClientRect();
          FX.burst(zb.left + (c.x + c.w / 2) / d, zb.top + (c.y + c.h / 2) / d, { n: 16, colors: t.flake, speed: 5, size: 2.6, life: 24, grav: 0.3, kind: 'shard' });
          FX.scrape(40);
          open(c);
          await delay(c.el.matches('[data-m]') ? 420 : 110);
          if (!ctx.alive) return;
        }
      };
    }
    b.querySelectorAll('[data-t]').forEach((btn) => (btn.onclick = () => buy(btn.dataset.t)));
    again.onclick = () => { if (tier) buy(tier); };
  };

  /* ------------------------------------------------------------ Crash */
  games.crash = (root, ctx) => {
    const b = shell(root, 'crash');
    b.innerHTML = `<div class="cr-stage"><div class="cr-screen"><div class="cr-hist" id="cr-h"></div><canvas id="cr-c"></canvas><div class="cr-big" id="cr-m"></div></div><div class="cr-pl" id="cr-pl"></div></div>
      <aside class="gm-p"><div id="cr-bet"></div><div class="field-mini"><label class="lbl">Auto à ×</label><input id="cr-auto" type="number" step="0.1" min="1.01" placeholder="aucun"></div><button type="button" class="play" id="cr-go"></button></aside>`;
    const bet = betBox('crash'); q('#cr-bet', b).replaceWith(bet.el);
    const cv = q('#cr-c', b), x = cv.getContext('2d'), big = q('#cr-m', b), btn = q('#cr-go', b), auto = q('#cr-auto', b);
    auto.value = store.get('crash.auto', '');
    auto.onchange = () => store.set('crash.auto', auto.value);
    let t0 = 0, untilAt = 0, lastPhase = null, endPoint = 1, lastLed = '';
    const setBig = (cls, top, value, bottom) => {
      const key = cls + '|' + top + '|' + value + '|' + bottom;
      if (key === lastLed) return; lastLed = key;
      big.className = 'cr-big ' + cls;
      big.innerHTML = (top ? `<small>${top}</small>` : '') + (value ? led(value) : '') + (bottom ? `<small>${bottom}</small>` : '');
    };
    fit(cv); onResize(ctx, () => fit(cv));
    const mine = () => C.crash.bets.find((p) => p.name === state.me);
    function paintPanel() {
      const v = C.crash, m = mine();
      q('#cr-h', b).innerHTML = v.hist.slice(0, 16).map((h) => `<span class="${h >= 10 ? 'hot' : h >= 2 ? 'ok' : 'low'}">${dec(h.toFixed(2))}</span>`).join('');
      const list = [...v.bets].sort((p1, p2) => p2.bet - p1.bet);
      const pl = q('#cr-pl', b);
      pl.innerHTML = '<span class="lbl">Joueurs</span>';
      for (const p of list) {
        const r = document.createElement('div');
        r.className = 'cr-r' + (p.cash ? ' won' : v.phase === 'end' ? ' lost' : '');
        r.appendChild(avatar(p.name, 'xs'));
        r.insertAdjacentHTML('beforeend', `<span>${esc(p.name)}</span><em>${p.cash ? `+${short(p.win)}` : short(p.bet)}</em>`);
        pl.appendChild(r);
      }
      btn.className = 'play';
      if (v.phase === 'bet') { btn.disabled = !!m; btn.textContent = m ? 'Mise placée' : 'Miser'; bet.lock(!!m); }
      else if (v.phase === 'run') {
        bet.lock(false);
        if (m && !m.cash) { btn.disabled = false; btn.classList.add('cash'); } else { btn.disabled = true; btn.textContent = m && m.cash ? `Encaissé à ×${dec(m.cash)}` : 'En vol'; }
      } else { bet.lock(false); btn.disabled = true; btn.textContent = v.phase === 'end' ? 'Vol suivant' : 'En attente'; }
    }
    function sync(v) {
      if (v.phase === 'run' && lastPhase !== 'run') t0 = performance.now() - v.elapsed;
      if (v.phase === 'bet') untilAt = performance.now() + v.left;
      if (v.phase === 'end' && lastPhase === 'run') {
        const m = mine(), lost = m && !m.cash;
        FX.explode(q('.cr-screen', b), lost ? 1.4 : .8);
        if (lost) FX.lose(m.bet, 'CRASH');
      }
      if (v.phase === 'end') endPoint = v.point;
      lastPhase = v.phase;
      q('.cr-screen', b).classList.toggle('flying', v.phase === 'run');
      paintPanel();
    }
    btn.onclick = async () => {
      const v = C.crash;
      if (v.phase === 'bet') { sfx.chip(); await post('crash/bet', { bet: bet.get(), auto: Number(auto.value) || 0 }); }
      else if (v.phase === 'run') { const r = await post('crash/cash'); if (r) celebrate(r.payout, r.payout / r.at, undefined, { win: 'ENCAISSÉ' }); }
    };
    ctx.on('crash', sync);
    ctx.on('me', () => { if (C.crash.phase === 'run') paintPanel(); });
    sync(C.crash);
    ctx.loop((now) => {
      const W = cv.width, H = cv.height, d = devicePixelRatio || 1, v = C.crash;
      x.clearRect(0, 0, W, H);
      const run = v.phase === 'run', ended = v.phase === 'end';
      const t = run ? now - t0 : 0;
      const m = run ? Math.exp(C.cfg.K * t) : ended ? endPoint : 1;
      const pad = 42 * d, pw = W - pad * 2, ph = H - pad * 1.4;
      const tEnd = run ? t : ended ? Math.log(endPoint) / C.cfg.K : 0;
      const tMax = Math.max(9000, tEnd * 1.1), mMax = Math.max(2, Math.exp(C.cfg.K * tEnd) * 1.16);
      const px = (tt) => pad + (tt / tMax) * pw, py = (mm) => H - pad * 0.7 - ((mm - 1) / (mMax - 1)) * ph;
      x.strokeStyle = '#12563f'; x.lineWidth = d; x.fillStyle = '#e8d9a8'; x.font = `500 ${12 * d}px Archivo, sans-serif`;
      const stepM = mMax < 3 ? 0.5 : mMax < 8 ? 1 : mMax < 30 ? 5 : mMax < 120 ? 20 : 100;
      for (let g = 1; g < mMax; g += stepM) { const y = py(g); x.beginPath(); x.moveTo(pad, y); x.lineTo(W - pad, y); x.stroke(); x.fillText(dec(g), 10 * d, y + 4 * d); }
      if (tEnd > 0) {
        x.beginPath();
        const N = 90; let hx = 0, hy = 0;
        for (let i = 0; i <= N; i++) { const tt = (tEnd * i) / N; hx = px(tt); hy = py(Math.exp(C.cfg.K * tt)); i ? x.lineTo(hx, hy) : x.moveTo(hx, hy); }
        const col = ended ? '#e8352b' : '#e9bf5a';
        x.lineWidth = 4 * d; x.lineJoin = 'round'; x.strokeStyle = col; x.stroke();
        x.beginPath(); x.arc(hx, hy, 6 * d, 0, 7); x.fillStyle = '#f2efe6'; x.fill();
      }
      if (run) {
        setBig(m >= 2 ? 'hot' : '', '', dec(m.toFixed(2)), '');
        const my = mine();
        if (my && !my.cash) btn.textContent = `Encaisser ${fmt(my.bet * m)}`;
      } else if (ended) setBig('crashed', '', dec(endPoint.toFixed(2)), 'Fin du vol');
      else if (v.phase === 'bet') setBig('', 'Décollage dans', dec(Math.max(0, (untilAt - now) / 1000).toFixed(1)), '');
      else setBig('', 'En attente', '', '');
    });
  };

  /* ------------------------------------------------------------ Tower */
  games.tower = (root, ctx) => {
    const b = shell(root, 'tower');
    const LABEL = [['facile', 'Facile'], ['moyen', 'Moyen'], ['difficile', 'Difficile'], ['extreme', 'Extrême']];
    b.innerHTML = `<div class="to-stage" id="to"></div><aside class="gm-p"><div id="to-b"></div><div>${'<span class="lbl">Difficulté</span>'}${sel('to-c', LABEL)}</div>
      <div class="kv"><span>Suivant</span><b id="to-n">—</b></div><div class="kv gold"><span>Gain actuel</span><b id="to-g">—</b></div>
      <button type="button" class="play" id="to-go"></button><button type="button" class="play alt" id="to-r" disabled>Au hasard</button></aside>`;
    const bet = betBox('tower'); q('#to-b', b).replaceWith(bet.el);
    const st = q('#to', b), go = q('#to-go', b), rnd = q('#to-r', b);
    const F = C.cfg.tower.floors;
    let game = C.tower, diff = store.get('tower.d', 'moyen'), busy = false, reveal = null;
    function paint() {
      pick(b, 'to-c', diff);
      const d = game ? game.diff : reveal ? reveal.game.diff : diff;
      const doors = C.cfg.tower.diff[d][0], mult = C.cfg.tower.mult[d];
      const cur = game ? game.floor : -1, picks = (game || reveal?.game)?.picks || [], traps = reveal?.game.traps;
      st.classList.toggle('over', !!reveal);
      st.innerHTML = '';
      for (let f = F - 1; f >= 0; f--) {
        const row = document.createElement('div');
        row.className = 'to-row' + (f === cur ? ' live' : f < picks.length ? ' past' : '');
        let cells = '';
        for (let k = 0; k < doors; k++) {
          const picked = picks[f] === k, trapped = traps?.[f]?.includes(k), boom = reveal?.trapped === k && f === picks.length;
          let cls = '', inner = '';
          if (picked) { cls = 'open'; inner = COINS; }
          else if (boom) { cls = 'boom'; inner = BOMB; }
          else if (trapped) { cls = 'trap'; inner = BOMB; }
          cells += `<button type="button" data-f="${f}" data-k="${k}" class="${cls}" ${f === cur && !picked ? '' : 'disabled'}>${inner}</button>`;
        }
        row.innerHTML = `<span>×${dec(mult[f])}</span><div class="to-ds" style="grid-template-columns:repeat(${doors},1fr)">${cells}</div>`;
        st.appendChild(row);
      }
      q('#to-n', b).textContent = game?.next ? '×' + dec(game.next) : '—';
      q('#to-g', b).textContent = game?.floor ? fmt(game.bet * game.mult) : '—';
      const cashable = game && game.floor > 0;
      go.className = 'play' + (game ? ' cash' : '');
      go.disabled = !!game && !cashable;
      go.textContent = game ? (cashable ? 'Encaisser' : 'Choisir') : reveal ? 'Rejouer' : 'Jouer';
      rnd.disabled = !game; bet.lock(!!game);
    }
    q('#to-c', b).onclick = (e) => { const d = e.target.dataset.o; if (d && !game) { diff = d; store.set('tower.d', d); reveal = null; sfx.click(); paint(); } };
    async function door(k) {
      if (!game || busy) return;
      busy = true;
      sfx.click();
      const waiting = st.querySelector(`.to-row.live button[data-k="${k}"]`);
      waiting?.classList.add('fx-wait');
      const r = await post('tower/pick', { door: k }, { defer: true });
      busy = false;
      if (!r) { waiting?.classList.remove('fx-wait'); return; }
      if (r.trapped !== undefined) {
        game = null; C.tower = null; reveal = r; paint(); r.later();
        FX.collapse(st, st.querySelector('button.boom'));
        ctx.later(820, () => celebrate(0, r.game.bet, undefined, { lose: 'EFFONDRÉ' }));
      }
      else if (r.top) { game = null; C.tower = null; reveal = r; paint(); celebrate(r.payout, r.game.bet); r.later(); }
      else { FX.sparkle(st.querySelector('.to-row.live button[data-k="' + k + '"]'), ['#ffe27a', '#f2b518', '#fff']); game = r.game; C.tower = game; sfx.gem(game.floor); paint(); r.later(); }
    }
    st.onclick = (e) => { const x = e.target.closest('button[data-k]'); if (x && !x.disabled) door(+x.dataset.k); };
    rnd.onclick = () => { if (game) door(Math.floor(Math.random() * game.doors)); };
    go.onclick = async () => {
      if (busy) return; busy = true;
      if (!game) {
        const r = await post('tower/start', { bet: bet.get(), diff });
        if (r) { sfx.chip(); game = r.game; C.tower = game; reveal = null; paint(); }
      } else if (game.floor) {
        const r = await post('tower/cash', {}, { defer: true });
        if (r) { game = null; C.tower = null; reveal = r; paint(); celebrate(r.payout, r.game.bet); r.later(); }
      }
      busy = false;
    };
    paint();
  };

  /* ------------------------------------------------------------ Mines */
  games.mines = (root, ctx) => {
    const b = shell(root, 'mines');
    const COUNTS = [1, 3, 5, 10, 15, 24].map((n) => [n, n]);
    b.innerHTML = `<div class="mi-stage felt-table"><div class="mi-g" id="mi">${Array.from({ length: 25 }, (_, i) => `<button type="button" data-i="${i}" disabled></button>`).join('')}</div></div>
      <aside class="gm-p"><div id="mi-b"></div><div><span class="lbl">Mines</span>${sel('mi-c', COUNTS)}</div>
      <div class="kv"><span>Suivant</span><b id="mi-n">—</b></div><div class="kv gold"><span>Gain actuel</span><b id="mi-g">—</b></div><button type="button" class="play" id="mi-go"></button></aside>`;
    const bet = betBox('mines'); q('#mi-b', b).replaceWith(bet.el);
    const grid = [...b.querySelectorAll('[data-i]')], go = q('#mi-go', b), nx = q('#mi-n', b), gn = q('#mi-g', b);
    let game = C.mines, count = store.get('mines.n', 3), busy = false;
    const paintChips = () => pick(b, 'mi-c', count);
    q('#mi-c', b).onclick = (e) => { const n = +e.target.dataset.o; if (n && !game) { count = n; store.set('mines.n', n); sfx.click(); paintChips(); } };
    function paint() {
      if (game) {
        grid.forEach((c, i) => { const on = game.rev.includes(i); c.className = on ? 'open' : ''; c.innerHTML = on ? GEM : ''; c.disabled = on; });
        const cashable = game.rev.length > 0;
        nx.textContent = game.next ? '×' + dec(game.next) : '—';
        gn.textContent = cashable ? fmt(game.bet * game.mult) : '—';
        go.classList.add('cash'); go.disabled = !cashable;
        go.textContent = cashable ? 'Encaisser' : 'Choisir';
        bet.lock(true);
      } else { go.classList.remove('cash'); go.disabled = false; go.textContent = 'Jouer'; bet.lock(false); grid.forEach((c) => (c.disabled = true)); }
    }
    function end(r) {
      const rv = r.game; game = null; C.mines = null;
      grid.forEach((c, i) => {
        const isMine = rv.field.includes(i);
        if (rv.rev.includes(i)) return;
        c.className = isMine ? (i === r.boom ? 'boom' : 'mine') : 'dim';
        c.innerHTML = isMine ? BOMB : GEM;
        c.disabled = true;
      });
      go.classList.remove('cash'); go.disabled = false; go.textContent = 'Rejouer'; bet.lock(false); nx.textContent = '—'; gn.textContent = r.payout ? fmt(r.payout) : '—';
    }
    grid.forEach((c) => (c.onclick = async () => {
      if (!game || busy) return;
      busy = true;
      sfx.click(); c.classList.add('fx-wait');
      const r = await post('mines/reveal', { i: +c.dataset.i }, { defer: true });
      busy = false;
      if (!r) { c.classList.remove('fx-wait'); return; }
      if (r.boom !== undefined) {
        end(r); r.later();
        FX.explode(grid[r.boom], 1.3); FX.blast(grid, grid[r.boom]);
        ctx.later(520, () => celebrate(0, r.game.bet, undefined, { lose: 'BOOM' }));
      }
      else if (r.cleared) { end(r); r.later(); celebrate(r.payout, r.game.bet); }
      else { game = r.game; C.mines = game; sfx.gem(game.rev.length); paint(); FX.sparkle(c); r.later(); }
    }));
    go.onclick = async () => {
      if (busy) return;
      busy = true;
      if (!game) {
        const r = await post('mines/start', { bet: bet.get(), mines: count });
        if (r) { sfx.chip(); game = r.game; C.mines = game; paint(); }
      } else if (game.rev.length) {
        const r = await post('mines/cash', {}, { defer: true });
        if (r) { end(r); celebrate(r.payout, r.game.bet); r.later(); }
      }
      busy = false;
    };
    paintChips(); paint();
  };

  /* ------------------------------------------------------------ Plinko */
  games.plinko = (root, ctx) => {
    const b = shell(root, 'plinko');
    b.innerHTML = `<div class="pl-stage"><canvas id="pl"></canvas></div>
      <aside class="gm-p"><div id="pl-b"></div><div><span class="lbl">Risque</span>${sel('pl-r', [['low', 'Faible'], ['mid', 'Moyen'], ['high', 'Élevé']])}</div><button type="button" class="play" id="pl-go">Lâcher une bille</button><div class="pl-log" id="pl-l"></div></aside>`;
    const bet = betBox('plinko'); q('#pl-b', b).replaceWith(bet.el);
    const cv = q('#pl', b), x = cv.getContext('2d'), log = q('#pl-l', b);
    let risk = store.get('plinko.r', 'mid'), balls = [], glow = new Array(13).fill(0);
    const paintR = () => pick(b, 'pl-r', risk);
    q('#pl-r', b).onclick = (e) => { const r = e.target.dataset.o; if (r) { risk = r; store.set('plinko.r', r); sfx.click(); paintR(); } };
    fit(cv); onResize(ctx, () => fit(cv));
    const ROWS = C.cfg.plinkoRows, STEP = 140;
    ctx.add(() => balls.forEach((a) => { if (!a.done) { a.done = true; release(a.payout); a.later(); } }));
    q('#pl-go', b).onclick = async () => {
      const amount = bet.get();
      const r = await post('plinko', { bet: amount, risk }, { hold: (z) => z.payout, defer: true });
      if (!r) return;
      if (!ctx.alive) { release(r.payout); r.later(); return; }
      sfx.chip();
      balls.push({ path: r.path, slot: r.slot, mult: r.mult, payout: r.payout, bet: amount, t0: performance.now(), later: r.later, done: false, last: -1 });
    };
    ctx.loop((now) => {
      const W = cv.width, H = cv.height, d = devicePixelRatio || 1;
      x.clearRect(0, 0, W, H);
      const gap = Math.min(W / (ROWS + 3), (H - 62 * d) / (ROWS + 1.6)), cx = W / 2, top = 22 * d, rowH = gap;
      const bucketY = top + ROWS * rowH + gap * 0.25;
      for (let r = 0; r < ROWS; r++) for (let j = 0; j < r + 3; j++) { const px = cx + (j - (r + 2) / 2) * gap, py = top + r * rowH; x.fillStyle = '#e8d9a8'; x.beginPath(); x.arc(px, py, 3 * d, 0, 7); x.fill(); }
      const table = C.cfg.plinko[risk];
      x.textAlign = 'center'; x.textBaseline = 'middle';
      table.forEach((m, i) => {
        const dist = Math.abs(i - 6) / 6, bx = cx + (i - 6) * gap, w = gap - 3 * d, h = 30 * d, k = glow[i];
        x.fillStyle = dist > 0.7 ? '#e9bf5a' : dist > 0.4 ? '#c8102e' : dist > 0.1 ? '#0e7a52' : '#0c1411';
        x.fillRect(bx - w / 2, bucketY + k * 5 * d, w, h);
        if (k > 0) { x.fillStyle = `rgba(255,255,255,${k * 0.7})`; x.fillRect(bx - w / 2, bucketY + k * 5 * d, w, h); }
        x.fillStyle = dist > 0.7 ? '#070f0c' : '#f2efe6'; x.font = `700 ${Math.max(9, Math.min(13, gap / (3 * d))) * d}px Archivo, sans-serif`;
        x.fillText(m >= 10 ? Math.round(m) : dec(m), bx, bucketY + h / 2 + k * 5 * d);
        glow[i] = Math.max(0, k - 0.02);
      });
      for (const a of balls) {
        const t = Math.max(0, now - a.t0) / STEP, k = Math.min(ROWS, Math.floor(t)), f = Math.min(1, t - k);
        let sum = 0; for (let i = 0; i < k; i++) sum += a.path[i];
        const px0 = cx + (sum - k / 2) * gap, py0 = top + k * rowH - gap * 0.42;
        const px1 = k < ROWS ? cx + (sum + a.path[k] - (k + 1) / 2) * gap : px0;
        const py1 = top + (k + 1) * rowH - gap * 0.42;
        const bx = px0 + (px1 - px0) * f, by = py0 + (py1 - py0) * f * f - Math.sin(f * Math.PI) * gap * 0.16, r = 6.5 * d;
        if (k > a.last && k < ROWS && k > 0) { a.last = k; sfx.tick(); }
        x.fillStyle = '#e9bf5a'; x.beginPath(); x.arc(bx, by, r, 0, 7); x.fill();
        if (t >= ROWS + 0.4 && !a.done) {
          a.done = true; glow[a.slot] = 1; release(a.payout); a.later();
          const rc = cv.getBoundingClientRect(), sc = rc.width / W, sx = rc.left + (cx + (a.slot - 6) * gap) * sc, sy = rc.top + bucketY * sc;
          if (a.mult >= 10) bigWin(a.payout, a.mult);
          else if (a.mult > 1) { sfx.coin(); FX.spray(sx, sy, 26); FX.win(a.payout, undefined, 1800); }
          else { sfx.stop(); FX.burst(sx, sy, { n: 26, colors: ['#ff2a1a', '#7c0a05', '#ff8a6a'], speed: 9, size: 4, life: 32, grav: .25 }); if (a.mult <= .5) FX.lose(a.bet - a.payout, undefined, 2600); }
          document.querySelector('.gm-last b').textContent = '+' + fmt(a.payout);
          log.insertAdjacentHTML('afterbegin', `<span class="${a.mult >= 1 ? 'ok' : ''}">${dec(a.mult)}</span>`);
          while (log.children.length > 8) log.lastChild.remove();
        }
      }
      balls = balls.filter((a) => !a.done);
    });
    paintR();
  };

  /* ------------------------------------------------------------ Pile ou Face */
  games.duel = (root, ctx) => {
    const b = shell(root, 'duel');
    b.innerHTML = `<div class="du-stage felt-table"><div class="coin3d" id="du-c"><div class="f pile">P</div><div class="f face">F</div></div><div class="du-res" id="du-r"></div><div class="du-list" id="du-l"></div></div>
      <aside class="gm-p"><div id="du-b"></div><div><span class="lbl">Votre côté</span>${sel('du-s', [['pile', 'Pile'], ['face', 'Face']])}</div>
      <button type="button" class="play" id="du-new">Défier les joueurs</button><button type="button" class="play alt" id="du-h">Contre la maison</button></aside>`;
    const bet = betBox('duel'); q('#du-b', b).replaceWith(bet.el);
    const coinEl = q('#du-c', b), res = q('#du-r', b), list = q('#du-l', b);
    let side = store.get('duel.s', 'pile'), turns = 0;
    const paintS = () => pick(b, 'du-s', side);
    q('#du-s', b).onclick = (e) => { const s = e.target.dataset.o; if (s) { side = s; store.set('duel.s', s); sfx.click(); paintS(); } };
    async function flip(result) {
      res.textContent = '';
      turns += 5;
      coinEl.style.transform = `rotateY(${turns * 360 + (result === 'face' ? 180 : 0)}deg)`;
      await delay(1750);
      sfx.stop();
    }
    function paintList() {
      list.innerHTML = C.duels.length ? '<span class="lbl">Défis ouverts</span>' : '<div class="feed-empty">Aucun défi ouvert</div>';
      for (const d of C.duels) {
        const r = document.createElement('div');
        r.className = 'du-row';
        r.appendChild(avatar(d.from, 'sm'));
        const mine = d.from === state.me;
        r.insertAdjacentHTML('beforeend', `<div><b>${esc(d.from)}</b><small>joue ${d.side}</small></div><em>${coin}${short(d.bet)}</em><button type="button" class="sh-btn">${mine ? 'Annuler' : 'Accepter'}</button>`);
        r.querySelector('button').onclick = async () => {
          if (mine) return post('duel/cancel', { id: d.id });
          const x = await post('duel/join', { id: d.id }, { hold: (z) => (z.result.winner === state.me ? z.result.prize : 0), defer: true });
          if (!x) return;
          await flip(x.result.flip);
          const w = x.result.winner === state.me;
          release(w ? x.result.prize : 0); x.later();
          if (!ctx.alive) return;
          res.innerHTML = w ? `<span class="won">+${fmt(x.result.prize)}</span>` : `${esc(d.from)} l'emporte`;
          celebrate(w ? x.result.prize : 0, d.bet);
        };
        list.appendChild(r);
      }
    }
    q('#du-new', b).onclick = async () => { if (await post('duel/create', { bet: bet.get(), side })) sfx.chip(); };
    let busy = false;
    q('#du-h', b).onclick = async () => {
      if (busy) return; busy = true;
      const amount = bet.get();
      const r = await post('duel/house', { bet: amount, side }, { hold: (x) => x.payout, defer: true });
      if (!r) { busy = false; return; }
      await flip(r.flip);
      release(r.payout); r.later(); busy = false;
      if (!ctx.alive) return;
      res.innerHTML = r.payout ? `<span class="won">+${fmt(r.payout)}</span>` : (r.flip === 'pile' ? 'Pile' : 'Face');
      celebrate(r.payout, amount);
    };
    ctx.on('duels', paintList);
    ctx.on('duel', async (r) => {
      if (r.a !== state.me) return;
      await flip(r.flip);
      if (!ctx.alive) return;
      const w = r.winner === state.me;
      res.innerHTML = w ? `<span class="won">+${fmt(r.prize)}</span>` : `${esc(r.b)} l'emporte`;
      celebrate(w ? r.prize : 0, r.bet);
    });
    paintS(); paintList();
  };
})();
