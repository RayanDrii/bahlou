'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { once } = require('node:events');

async function launch(t, apiKey) {
  const tmp = await mkdtemp(path.join(tmpdir(), 'bahlou-geo-test-'));
  const reserve = net.createServer(); reserve.listen(0, '127.0.0.1'); await once(reserve, 'listening');
  const port = reserve.address().port; await new Promise(resolve => reserve.close(resolve));
  const child = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DATA_DIR: tmp, INVITE_CODE: 'geo-test-invite', GOOGLE_MAPS_API_KEY: apiKey }, stdio: ['ignore', 'pipe', 'pipe'] });
  const exited = once(child, 'exit');
  t.after(async () => { child.kill('SIGTERM'); await exited; await rm(tmp, { recursive: true, force: true }); });
  let log = ''; child.stdout.on('data', b => { log += b; }); child.stderr.on('data', b => { log += b; });
  const origin = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    try { await fetch(origin + '/api/me'); break; } catch { if (child.exitCode !== null) throw new Error(log); await new Promise(r => setTimeout(r, 25)); }
  }
  const request = async (route, cookie = '', body) => {
    const res = await fetch(origin + route, { method: body === undefined ? 'GET' : 'POST', headers: { cookie, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, data: await res.json(), cookie: res.headers.get('set-cookie')?.split(';')[0] };
  };
  const register = async username => (await request('/api/register', '', { username, password: 'fixture-password', invite: 'geo-test-invite' })).cookie;
  return { origin, request, register };
}

test('HTTP: integrated navigation, authenticated rooms and a complete two-player game', async t => {
  const { origin, request, register } = await launch(t, 'fixture-google-key');
  assert.equal((await request('/api/geo/config')).status, 401);
  const a = await register('alice'), b = await register('bob'), eve = await register('eve');
  assert.ok(a && b);
  const html = await (await fetch(origin)).text();
  assert.match(html, /href="#\/geo"/); assert.match(html, /id="geo-view"/);
  for (const asset of ['/geo.js', '/geo.css']) assert.equal((await fetch(origin + asset)).status, 200);
  const config = (await request('/api/geo/config', a)).data;
  assert.equal(config.configured, true);
  let r = (await request('/api/geo/create', a, {})).data.room;
  assert.ok(r?.code);
  assert.equal((await request('/api/geo/state', eve)).data.room, null);
  await request('/api/geo/join', b, { code: r.code });
  assert.equal((await request('/api/geo/start', b, {})).status, 403);
  const locations = config.candidates.slice(0, 6).map((p, index) => ({ ...p, index, panoId: `test-${index}` }));
  assert.equal((await request('/api/geo/prepare', a, { locations })).status, 200);
  r = (await request('/api/geo/start', a, {})).data.room;
  for (let i = 0; i < 5; i++) {
    const roundId = r.round.id;
    await request('/api/geo/guess', a, { roundId, lat: 10, lng: 20 });
    const bob = (await request('/api/geo/state', b)).data.room;
    assert.equal(bob.round.guess, null);
    r = (await request('/api/geo/guess', b, { roundId, lat: 10, lng: 20 })).data.room;
    assert.equal(r.history.length, i + 1);
    if (i < 4) r = (await request('/api/geo/next', a, { roundId })).data.room;
  }
  assert.equal(r.phase, 'finished');
  assert.equal(r.players[0].score, r.players[1].score);
  r = (await request('/api/geo/rematch', a, { roundId: r.round.id })).data.room;
  assert.equal(r.phase, 'waiting'); assert.equal(r.players[0].score, 0);
  assert.equal((await request('/api/geo/leave', a, {})).data.room, null);
  assert.equal((await request('/api/geo/state', b)).data.room.host, 'bob');
  assert.equal((await request('/api/g/state', a)).status, 200, 'Existing games still work');
});

test('HTTP: no Google key yields explicit configuration and no playable room', async t => {
  const { request, register } = await launch(t, '');
  const cookie = await register('tester');
  assert.equal((await request('/api/geo/config', cookie)).data.configured, false);
  assert.equal((await request('/api/geo/create', cookie, {})).status, 503);
});
