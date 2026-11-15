'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const createMenteur = require('../menteur');

// cartes : couleur * 13 + valeur (0 = 2 … 3 = 5 … 10 = dame, 12 = as)
const card = (rank, suit = 0) => suit * 13 + rank;

function setup() {
  let time = 1_000_000, seed = 1;
  const routes = {}, events = [];
  const m = createMenteur({ routes, now: () => time, timers: false,
    randomInt: n => { seed = (seed * 16807) % 2147483647; return seed % n; },
    random: () => { seed = (seed * 16807) % 2147483647; return (seed % 1000) / 1000; },
    readBody: async req => req.body,
    send: (res, status, data) => Object.assign(res, { status, data }),
    broadcast: (event, data, users) => events.push({ event, data, users }),
  });
  async function call(action, user = 'alice', body = {}, method = 'POST') {
    const res = {};
    await routes[`${method} /api/menteur/${action}`]({ body }, res, user);
    return res;
  }
  // une table à trois humains dont on fixe les mains, alice commence
  async function table(hands, turn = 0) {
    const { data } = await call('create');
    const code = data.room.code;
    await call('join', 'bob', { code }); await call('join', 'carl', { code });
    await call('start');
    const r = m.rooms.get(code);
    r.players.forEach((p, i) => { p.hand = [...hands[i]]; });
    Object.assign(r, { turn, lead: true, rank: null, pile: [], last: null, removed: [] });
    return r;
  }
  return { m, call, table, events, advance(ms) { time += ms; m.tick(); } };
}

test('la dame de cœur commence, et les familles de quatre sont retirées dès la donne', async () => {
  for (let i = 0; i < 20; i++) {
    const s = setup();
    const { data } = await s.call('create');
    await s.call('join', 'bob', { code: data.room.code });
    await s.call('start');
    const r = s.m.rooms.get(data.room.code);
    const holder = r.players.find(p => p.hand.includes(card(10, 1)));
    if (holder) assert.equal(r.players[r.turn], holder);
    for (const p of r.players) {
      const count = new Array(13).fill(0);
      p.hand.forEach(c => count[c % 13]++);
      assert.ok(count.every(n => n < 4), 'aucune main ne garde une famille complète');
    }
    const kept = r.players.reduce((t, p) => t + p.hand.length, 0);
    assert.equal(kept + r.removed.length * 4, 52);
  }
});

test('un joueur honnête accusé à tort : l’accusateur ramasse le tas', async () => {
  const s = setup();
  const r = await s.table([[card(3), card(3, 1), card(7)], [card(5), card(9)], [card(2), card(4)]]);
  assert.equal((await s.call('play', 'alice', { cards: [card(3), card(3, 1)], rank: 3 })).status, 200);
  const bobView = (await s.call('state', 'bob', {}, 'GET')).data.room;
  assert.deepEqual(bobView.last, { by: 'alice', count: 2, rank: 3 });
  assert.equal(bobView.pile, 2);
  assert.ok(!JSON.stringify(bobView).includes('"cards"'), 'les cartes posées restent cachées');
  await s.call('liar', 'bob');
  assert.equal(r.reveal.lied, false);
  assert.equal(r.reveal.loser, 'bob');
  assert.equal(r.players[1].hand.length, 4);
  assert.equal(r.players[r.turn].name, 'alice', 'celui qui avait raison ouvre');
  assert.equal(r.lead, true);
});

test('un menteur démasqué ramasse le tas, et l’accusateur ouvre', async () => {
  const s = setup();
  const r = await s.table([[card(3), card(8)], [card(5), card(9)], [card(2), card(4), card(6)]]);
  await s.call('play', 'alice', { cards: [card(3)], rank: 3 });
  await s.call('play', 'bob', { cards: [card(9)], rank: 12 });
  assert.equal(r.rank, 3, 'on suit forcément la valeur annoncée');
  await s.call('liar', 'carl');
  assert.equal(r.reveal.lied, true);
  assert.equal(r.reveal.loser, 'bob');
  assert.equal(r.reveal.taken, 2);
  assert.equal(r.players[1].hand.length, 3);
  assert.equal(r.players[r.turn].name, 'carl');
});

test('les coups interdits sont refusés', async () => {
  const s = setup();
  await s.table([[card(3), card(8)], [card(5), card(9)], [card(2), card(4)]]);
  assert.equal((await s.call('play', 'bob', { cards: [card(5)], rank: 5 })).status, 409);
  assert.equal((await s.call('play', 'alice', { cards: [card(5)], rank: 5 })).status, 400);
  assert.equal((await s.call('play', 'alice', { cards: [card(3)] })).status, 400, 'il faut annoncer une valeur pour ouvrir');
  assert.equal((await s.call('play', 'alice', { cards: [card(3), card(3)], rank: 3 })).status, 400);
  assert.equal((await s.call('liar', 'alice')).status, 409, 'rien à contester en ouvrant');
});

test('vider sa main : gagné si le suivant joue ou accuse à tort, sinon on ramasse', async () => {
  let s = setup();
  let r = await s.table([[card(3)], [card(5), card(9)], [card(2), card(4)]]);
  await s.call('play', 'alice', { cards: [card(3)], rank: 3 });
  await s.call('play', 'bob', { cards: [card(5)] });
  assert.equal(r.phase, 'over');
  assert.equal(r.winner, 'alice');

  s = setup();
  r = await s.table([[card(3)], [card(5), card(9)], [card(2), card(4)]]);
  await s.call('play', 'alice', { cards: [card(3)], rank: 3 });
  await s.call('liar', 'bob');
  assert.equal(r.winner, 'alice');

  s = setup();
  r = await s.table([[card(8)], [card(5), card(9)], [card(2), card(4)]]);
  await s.call('play', 'alice', { cards: [card(8)], rank: 3 });
  await s.call('liar', 'bob');
  assert.equal(r.phase, 'playing');
  assert.deepEqual(r.players[0].hand, [card(8)]);
});

test('ramasser une famille complète la retire du jeu', async () => {
  const s = setup();
  const r = await s.table([[card(6, 0), card(6, 1), card(2)], [card(6, 2), card(6, 3), card(9)], [card(2, 1), card(4)]]);
  await s.call('play', 'alice', { cards: [card(6, 0), card(6, 1)], rank: 6 });
  await s.call('liar', 'bob');
  assert.deepEqual(r.players[1].hand, [card(9)]);
  assert.deepEqual(r.removed.at(-1), { by: 'bob', rank: 6 });
});

test('les robots et le temps écoulé font avancer la partie jusqu’au bout', async () => {
  const s = setup();
  const { data } = await s.call('create', 'alice', { solo: true });
  const r = s.m.rooms.get(data.room.code);
  assert.equal(r.players.length, 3);
  assert.equal(r.phase, 'playing');
  for (let i = 0; i < 3000 && r.phase === 'playing'; i++) s.advance(46_000);
  assert.equal(r.phase, 'over');
  assert.ok(r.winner);
  assert.equal((await s.call('rematch')).status, 200);
  assert.equal(r.phase, 'playing');
});

test('quitter en pleine partie laisse un robot jouer à sa place', async () => {
  const s = setup();
  const r = await s.table([[card(3), card(8)], [card(5), card(9)], [card(2), card(4)]]);
  await s.call('leave', 'alice');
  assert.equal(r.players[0].left, true);
  assert.equal(r.host, 'bob');
  s.advance(3000);
  assert.equal(r.players[0].hand.length < 2 || r.pile.length > 0, true);
  assert.equal((await s.call('state', 'alice', {}, 'GET')).data.room, null);
});
