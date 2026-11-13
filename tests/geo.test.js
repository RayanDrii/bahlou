'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const createGeo = require('../geo');

function setup(apiKey = 'test-key') {
  let time = 1000000;
  const routes = {}, events = [];
  const geo = createGeo({ routes, apiKey, now: () => time, timers: false,
    readBody: async req => req.body,
    send: (res, status, data) => Object.assign(res, { status, data }),
    broadcast: (event, data, users) => events.push({ event, data, users }),
  });
  async function call(action, user = 'alice', body = {}, method = 'POST') {
    const res = {};
    await routes[`${method} /api/geo/${action}`]({ body }, res, user, new URL('http://local/'));
    return res;
  }
  async function room() {
    const a = await call('create');
    const code = a.data.room.code;
    await call('join', 'bob', { code });
    const cfg = (await call('config', 'alice', {}, 'GET')).data;
    const locations = cfg.candidates.slice(0, 7).map((c, index) => ({ index, panoId: `pano-${index}`, lat: c.lat, lng: c.lng }));
    await call('prepare', 'alice', { locations });
    return code;
  }
  return { call, room, events, tick(ms) { time += ms; geo.sweep(); } };
}

test('distance and score use great-circle distance, including antimeridian', () => {
  assert.equal(createGeo.distanceKm({ lat: 0, lng: 0 }, { lat: 0, lng: 0 }), 0);
  assert.ok(Math.abs(createGeo.distanceKm({ lat: 0, lng: 179 }, { lat: 0, lng: -179 }) - 222.39) < 0.1);
  assert.equal(createGeo.score(0), 5000);
  assert.equal(createGeo.score(2000), 1839);
});

test('every route authenticates; missing key disables game creation', async () => {
  const s = setup('');
  assert.equal((await s.call('config', null, {}, 'GET')).status, 401);
  assert.equal((await s.call('state', null, {}, 'GET')).status, 401);
  for (const a of ['create', 'join', 'prepare', 'start', 'guess', 'next', 'rematch', 'leave']) assert.equal((await s.call(a, null)).status, 401);
  assert.equal((await s.call('config', 'alice', {}, 'GET')).data.configured, false);
  assert.equal((await s.call('create')).status, 503);
});

test('private membership, join normalization, player limits and owner actions', async () => {
  const s = setup();
  const code = (await s.call('create')).data.room.code;
  assert.match(code, /^[A-Z2-9]{6}$/);
  assert.equal((await s.call('state', 'eve', {}, 'GET')).data.room, null);
  assert.equal((await s.call('start')).status, 400);
  assert.equal((await s.call('join', 'bob', { code: code.toLowerCase() })).status, 200);
  assert.equal((await s.call('start', 'bob')).status, 403);
  for (let i = 0; i < 10; i++) assert.equal((await s.call('join', `user${i}`, { code })).status, 200);
  assert.equal((await s.call('join', 'extra', { code })).status, 409);
  assert.equal((await s.call('join', 'extra', { code: {} })).status, 400);
  assert.equal((await s.call('create')).status, 409);
});

test('preparation validates coordinates, panorama identities and host ownership', async () => {
  const s = setup();
  await s.call('create');
  assert.equal((await s.call('prepare', 'bob', { locations: [] })).status, 404);
  assert.equal((await s.call('prepare', 'alice', { locations: [] })).status, 400);
  assert.equal((await s.call('prepare', 'alice', { locations: Array(5).fill({ index: 0, panoId: 'same', lat: 0, lng: 0 }) })).status, 400);
  assert.equal((await s.call('prepare', 'alice', null)).status, 400);
});

test('same start, hidden future locations and other answers, private broadcasts', async () => {
  const s = setup(); await s.room();
  const a = (await s.call('start')).data.room;
  const b = (await s.call('state', 'bob', {}, 'GET')).data.room;
  assert.equal(a.round.panoId, b.round.panoId);
  assert.equal(a.round.deadline, b.round.deadline);
  assert.equal(a.round.total, 5);
  assert.equal(a.round.deadline - 1000000, 90000);
  assert.equal(a.round.lat, undefined);
  assert.equal(a.locations, undefined);
  assert.equal((await s.call('join', 'eve', { code: a.code })).status, 409);
  assert.equal((await s.call('guess', 'alice', { roundId: a.round.id, lat: 10, lng: 20 })).status, 200);
  const other = (await s.call('state', 'bob', {}, 'GET')).data.room;
  assert.equal(other.round.guess, null);
  assert.equal(other.players.find(p => p.name === 'alice').submitted, true);
  assert.ok(!JSON.stringify(other).includes('"lat":10'));
  assert.ok(s.events.every(e => e.users.length === 1 && ['alice', 'bob'].includes(e.users[0])));
});

test('invalid, duplicate and stale guesses are refused; result scores once', async () => {
  const s = setup(); await s.room();
  const { round } = (await s.call('start')).data.room;
  for (const lat of [NaN, Infinity, 91, '1', null]) assert.equal((await s.call('guess', 'alice', { roundId: round.id, lat, lng: 0 })).status, 400);
  assert.equal((await s.call('guess', 'alice', { roundId: 'old', lat: 0, lng: 0 })).status, 409);
  await s.call('guess', 'alice', { roundId: round.id, lat: 0, lng: 0 });
  assert.equal((await s.call('guess', 'alice', { roundId: round.id, lat: 0, lng: 0 })).status, 409);
  const done = (await s.call('guess', 'bob', { roundId: round.id, lat: 1, lng: 1 })).data.room;
  assert.equal(done.phase, 'results');
  assert.equal(done.result.answers.length, 2);
  assert.equal(done.history.length, 1);
  assert.ok(done.result.answers.every(a => a.points === createGeo.score(a.distanceKm)));
  const next = (await s.call('next', 'alice', { roundId: round.id })).data.room;
  assert.equal(next.round.number, 2);
  assert.equal((await s.call('next', 'alice', { roundId: round.id })).status, 409);
  assert.equal((await s.call('guess', 'bob', { roundId: round.id, lat: 0, lng: 0 })).status, 409);
});

test('deadline works without traffic, including late requests, and preserves reconnection state', async () => {
  const s = setup(); await s.room(); const { round } = (await s.call('start')).data.room;
  await s.call('guess', 'alice', { roundId: round.id, lat: 0, lng: 0 });
  const reconnect = (await s.call('join', 'alice', { code: (await s.call('state', 'alice', {}, 'GET')).data.room.code })).data.room;
  assert.deepEqual(reconnect.round.guess, { lat: 0, lng: 0 });
  s.tick(90000);
  assert.equal((await s.call('guess', 'bob', { roundId: round.id, lat: 0, lng: 0 })).status, 409);
  const state = (await s.call('state', 'bob', {}, 'GET')).data.room;
  assert.equal(state.phase, 'results');
  assert.equal(state.result.answers.find(a => a.name === 'bob').points, 0);
  assert.equal(state.history.length, 1);
});

test('five rounds finish, rematch resets and old rematch cannot reset a new game', async () => {
  const s = setup(); await s.room(); let r = (await s.call('start')).data.room;
  for (let i = 0; i < 5; i++) {
    s.tick(90000); r = (await s.call('state', 'alice', {}, 'GET')).data.room;
    if (i < 4) r = (await s.call('next', 'alice', { roundId: r.round.id })).data.room;
  }
  assert.equal(r.phase, 'finished'); assert.equal(r.history.length, 5);
  assert.equal((await s.call('rematch', 'bob', { roundId: r.round.id })).status, 403);
  assert.equal((await s.call('rematch', 'alice', { roundId: r.round.id })).data.room.phase, 'waiting');
  assert.equal((await s.call('rematch', 'alice', { roundId: r.round.id })).status, 409);
});

test('host transfer, active departure and empty rooms clean up membership', async () => {
  const s = setup(); const code = await s.room();
  await s.call('start'); await s.call('leave');
  const b = (await s.call('state', 'bob', {}, 'GET')).data.room;
  assert.equal(b.host, 'bob');
  assert.equal((await s.call('join', 'alice', { code })).status, 409);
  await s.call('leave', 'bob');
  assert.equal((await s.call('join', 'eve', { code })).status, 404);
  assert.equal((await s.call('state', 'alice', {}, 'GET')).data.room, null);
});

test('idle rooms expire and repeated creation is bounded', async () => {
  const s = setup(); const code = (await s.call('create')).data.room.code;
  s.tick(3600001);
  assert.equal((await s.call('join', 'bob', { code })).status, 404);
  assert.equal((await s.call('state', 'alice', {}, 'GET')).data.room, null);
  for (let i = 0; i < 5; i++) { assert.equal((await s.call('create')).status, 200); await s.call('leave'); }
  assert.equal((await s.call('create')).status, 429);
});
