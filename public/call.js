'use strict';
/* Bahlou — appel vocal du Salon : un appel commun, en pair à pair. */
const Call = (() => {
  let members = [], cid = null, stream = null, ice = [], muted = false, deaf = false;
  let beat = null, meter = null, actx = null, joining = false, ringTimer = null, ringStop = null, ringNote = null;
  const peers = new Map();    // cid du pair -> { name, cidPeer, pc, audio, queue, initiator, status }
  const levels = new Map();   // pseudo -> { an, buf, last }

  const active = () => !!cid;
  const inChat = () => !$('#chat-view').hidden;
  const newCid = () => Array.from(crypto.getRandomValues(new Uint8Array(10)), (b) => b.toString(36).padStart(2, '0')).join('').slice(0, 20);
  const others = () => members.filter((m) => m.name !== state.me);
  const signal = (p, data) => api('POST', '/api/call/signal', { cid, to: p.name, toCid: p.cidPeer, data }).catch(() => {});
  const ctx = () => { actx ||= new AudioContext(); if (actx.state === 'suspended') actx.resume().catch(() => {}); return actx; };

  /* ---------- niveau sonore : qui parle */
  function watch(name, media) {
    try {
      const an = ctx().createAnalyser();
      an.fftSize = 512;
      ctx().createMediaStreamSource(media).connect(an);
      levels.set(name, { an, buf: new Uint8Array(an.fftSize), last: 0 });
    } catch {}
  }
  function tick() {
    const now = Date.now();
    for (const [name, l] of levels) {
      l.an.getByteTimeDomainData(l.buf);
      let sum = 0;
      for (const v of l.buf) sum += (v - 128) ** 2;
      if (Math.sqrt(sum / l.buf.length) > 3.2 && !(name === state.me && (muted || deaf))) l.last = now;
      document.querySelectorAll(`[data-call-name="${CSS.escape(name)}"]`).forEach((el) => el.classList.toggle('speaking', now - l.last < 300));
    }
  }

  /* ---------- connexions */
  function connect(member, initiator) {
    const pc = new RTCPeerConnection({ iceServers: ice });
    const p = { name: member.name, cidPeer: member.cid, pc, audio: null, queue: [], initiator, status: 'wait' };
    peers.set(member.cid, p);
    stream.getTracks().forEach((t) => pc.addTrack(t, stream));
    pc.onicecandidate = (e) => { if (e.candidate) signal(p, { ice: e.candidate }); };
    pc.ontrack = (e) => {
      if (p.audio) return;
      p.audio = new Audio();
      p.audio.srcObject = e.streams[0];
      p.audio.muted = deaf;
      p.audio.play().catch(() => {});
      watch(p.name, e.streams[0]);
    };
    pc.onconnectionstatechange = () => {
      const s = pc.connectionState;
      p.status = s === 'connected' ? 'ok' : s === 'failed' ? 'fail' : p.status;
      if (s === 'failed' && p.initiator && !p.retried) { p.retried = true; offer(p, true); }
      paint();
    };
    if (initiator) offer(p, false);
    return p;
  }
  async function offer(p, iceRestart) {
    try {
      const o = await p.pc.createOffer({ iceRestart });
      await p.pc.setLocalDescription(o);
      signal(p, { sdp: p.pc.localDescription });
    } catch {}
  }
  function dropPeer(key) {
    const p = peers.get(key);
    if (!p) return;
    p.pc.close();
    if (p.audio) { p.audio.srcObject = null; p.audio = null; }
    levels.delete(p.name);
    peers.delete(key);
  }
  async function onSignal({ from, fromCid, toCid, data }) {
    if (!cid || toCid !== cid) return;
    let p = peers.get(fromCid);
    if (!p) {
      if (data.sdp?.type !== 'offer') return;
      p = connect({ name: from, cid: fromCid }, false);
    }
    try {
      if (data.sdp) {
        await p.pc.setRemoteDescription(data.sdp);
        for (const c of p.queue.splice(0)) await p.pc.addIceCandidate(c);
        if (data.sdp.type === 'offer') {
          await p.pc.setLocalDescription(await p.pc.createAnswer());
          signal(p, { sdp: p.pc.localDescription });
        }
      } else if (data.ice) {
        if (p.pc.remoteDescription) await p.pc.addIceCandidate(data.ice);
        else p.queue.push(data.ice);
      }
    } catch {}
  }

  /* ---------- rejoindre, quitter */
  async function join() {
    if (cid || joining) return;
    if (!navigator.mediaDevices?.getUserMedia) return toast('L’appel demande une connexion sécurisée (https).', true);
    joining = true; stopRing(); paint();
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }, video: false });
    } catch {
      joining = false; paint();
      return toast('Micro refusé ou introuvable.', true);
    }
    const id = newCid();
    try {
      const r = await api('POST', '/api/call/join', { cid: id, muted, deaf });
      cid = id; members = r.members; ice = r.iceServers;
      applyTracks();
      watch(state.me, stream);
      others().forEach((m) => connect(m, true));
      beat = setInterval(heartbeat, 8000);
      meter = setInterval(tick, 120);
    } catch (e) {
      stream.getTracks().forEach((t) => t.stop()); stream = null;
      toast(e.message, true);
    }
    joining = false; paint();
  }
  function cleanup() {
    clearInterval(beat); clearInterval(meter);
    [...peers.keys()].forEach(dropPeer);
    levels.clear();
    stream?.getTracks().forEach((t) => t.stop());
    stream = null; cid = null; muted = false; deaf = false;
  }
  function leave() {
    if (!cid) return;
    api('POST', '/api/call/leave', { cid }).catch(() => {});
    members = members.filter((m) => m.name !== state.me);
    cleanup(); paint();
  }
  async function heartbeat() {
    try { await api('POST', '/api/call/state', { cid }); }
    catch (e) {
      if (e.status !== 410 || !cid) return;
      try { const r = await api('POST', '/api/call/join', { cid, muted, deaf }); members = r.members; paint(); } catch {}
    }
  }
  function applyTracks() { stream?.getAudioTracks().forEach((t) => { t.enabled = !muted && !deaf; }); }
  function pushState() { applyTracks(); paint(); if (cid) api('POST', '/api/call/state', { cid, muted, deaf }).catch(() => {}); }
  function toggleMute() { if (deaf) { deaf = false; muted = false; setDeaf(); } else muted = !muted; pushState(); }
  function setDeaf() { for (const p of peers.values()) if (p.audio) p.audio.muted = deaf; }
  function toggleDeaf() { deaf = !deaf; setDeaf(); pushState(); }

  /* ---------- sonnerie */
  function stopRing() { clearInterval(ringTimer); clearTimeout(ringStop); ringTimer = null; $('#call-ring').hidden = true; try { ringNote?.close(); } catch {} ringNote = null; }
  function note(f, at) {
    const a = ctx(), o = a.createOscillator(), g = a.createGain(), t = a.currentTime + at;
    o.frequency.value = f; o.connect(g); g.connect(a.destination);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.2, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    o.start(t); o.stop(t + 0.32);
  }
  function ring(from) {
    const box = $('#call-ring');
    box.innerHTML = `<div class="ring-card"><div class="ring-av"></div><small>Appel entrant</small><b>${esc(from)}</b><div class="ring-btns"><button type="button" class="c-join">Rejoindre</button><button type="button" class="c-no">Ignorer</button></div></div>`;
    box.querySelector('.ring-av').appendChild(avatar(from, 'lg'));
    box.querySelector('.c-join').onclick = () => { stopRing(); location.hash = '#/chat'; join(); };
    box.querySelector('.c-no').onclick = stopRing;
    box.hidden = false;
    const beep = () => { if (state.sound) { try { [[660, 0], [880, .16], [660, .42], [880, .58], [1046, .74]].forEach(([f, at]) => note(f, at)); } catch {} } };
    beep();
    ringTimer = setInterval(beep, 1900);
    ringStop = setTimeout(stopRing, 30000);
    if ((document.hidden || !document.hasFocus()) && window.Notification?.permission === 'granted') {
      ringNote = new Notification(`${from} t'appelle`, { body: 'Appel vocal sur Bahlou', icon: '/icon.png', tag: 'bahlou-call', requireInteraction: true });
      ringNote.onclick = () => { window.focus(); ringNote?.close(); };
    }
  }

  /* ---------- affichage */
  function tile(m) {
    const me = m.name === state.me, p = [...peers.values()].find((x) => x.name === m.name);
    const el = document.createElement('div');
    el.className = 'c-tile';
    el.dataset.callName = m.name;
    el.appendChild(avatar(m.name, 'xl'));
    const status = m.deaf ? 'Sourdine' : m.muted ? 'Micro coupé' : active() && !me && p?.status === 'fail' ? 'Connexion impossible' : active() && !me && p?.status === 'wait' ? 'Connexion…' : '';
    el.insertAdjacentHTML('beforeend', `<b>${esc(m.name)}</b><small class="${p?.status === 'fail' ? 'bad' : ''}">${status || '&nbsp;'}</small>`);
    return el;
  }
  function controls(short) {
    return `<button type="button" class="c-mic ${muted || deaf ? 'off' : ''}">${short ? 'Micro' : muted || deaf ? 'Activer le micro' : 'Couper le micro'}</button>${short ? '' : `<button type="button" class="c-deaf ${deaf ? 'off' : ''}">${deaf ? 'Réactiver le son' : 'Sourdine'}</button>`}<button type="button" class="c-out">${short ? 'Quitter' : 'Raccrocher'}</button>`;
  }
  function bind(box) {
    const on = (s, f) => { const e = box.querySelector(s); if (e) e.onclick = f; };
    on('.c-mic', toggleMute); on('.c-deaf', toggleDeaf); on('.c-out', leave); on('.c-in', join);
  }
  function paint() {
    const n = members.length, btn = $('#call-btn'), panel = $('#call'), rail = $('#call-rail');
    btn.hidden = active();
    btn.disabled = joining;
    btn.textContent = joining ? 'Micro…' : n ? `Rejoindre (${n})` : 'Appeler';
    panel.hidden = !n;
    if (n) {
      const body = $('#call-body');
      body.replaceChildren();
      const row = document.createElement('div');
      row.className = 'c-tiles';
      members.forEach((m) => row.appendChild(tile(m)));
      body.appendChild(row);
      body.insertAdjacentHTML('beforeend', `<div class="c-ctl">${active() ? controls(false) : `<button type="button" class="c-in" ${joining ? 'disabled' : ''}>Rejoindre l’appel</button>`}</div>`);
      bind(body);
    }
    rail.hidden = !active() || inChat();
    if (!rail.hidden) { rail.innerHTML = `<a href="#/chat">En appel</a>${controls(true)}`; bind(rail); }
  }

  function onState(v) {
    const before = members.length;
    members = v.members;
    if (cid) {
      const live = new Set(members.map((m) => m.cid));
      [...peers.keys()].filter((k) => !live.has(k)).forEach(dropPeer);
    }
    if (!before && members.length && !cid && members[0].name !== state.me) ring(members[0].name);
    if (!members.length || members.some((m) => m.name === state.me)) stopRing();
    paint();
  }

  addEventListener('hashchange', () => setTimeout(paint));
  addEventListener('pagehide', () => {
    if (cid) fetch('/api/call/leave', { method: 'POST', keepalive: true, credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ cid }) });
  });

  return {
    active, join, leave,
    init() { $('#call-btn').onclick = join; paint(); },
    refresh() { api('GET', '/api/call').then((v) => { members = v.members; paint(); }).catch(() => {}); },
    bind(es) {
      es.addEventListener('call', (e) => onState(JSON.parse(e.data)));
      es.addEventListener('call:signal', (e) => onSignal(JSON.parse(e.data)));
      es.addEventListener('call:kick', (e) => { const d = JSON.parse(e.data); if (d.cid === cid) { cleanup(); paint(); toast('Appel repris sur un autre appareil.'); } });
      this.refresh();
    },
    debug: () => [...peers.values()].map((p) => ({ name: p.name, state: p.pc.connectionState, status: p.status, audio: !!p.audio, pc: p.pc })),
  };
})();
