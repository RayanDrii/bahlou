'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { once } = require('node:events');

test('public profiles validate input, remain account-owned and preserve admin boundaries', async t => {
  const dir = await mkdtemp(path.join(tmpdir(), 'bahlou-profile-'));
  const reserve = net.createServer(); reserve.listen(0, '127.0.0.1'); await once(reserve, 'listening');
  const port = reserve.address().port; await new Promise(r => reserve.close(r));
  const child = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), env: { ...process.env, HOST: '127.0.0.1', PORT: String(port), DATA_DIR: dir, INVITE_CODE: 'profile-fixture', BAHLOU_ADMIN: 'boss' }, stdio: 'ignore' });
  const exited = once(child, 'exit');
  t.after(async () => { child.kill('SIGTERM'); await exited; await rm(dir, { recursive: true, force: true }); });
  const origin = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) { try { await fetch(origin + '/api/me'); break; } catch { await new Promise(r => setTimeout(r, 25)); } }
  async function call(route, cookie = '', body) {
    const r = await fetch(origin + route, { method: body === undefined ? 'GET' : 'POST', headers: { cookie, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: r.status, data: await r.json(), cookie: r.headers.get('set-cookie')?.split(';')[0] };
  }
  const register = async username => (await call('/api/register', '', { username, password: 'fixture-password', invite: 'profile-fixture' })).cookie;
  const alice = await register('alice'), bob = await register('bob'), armin = await register('armin.tocu'), boss = await register('boss');
  assert.equal((await call('/api/profile', '', {})).status, 401);
  assert.equal((await call('/api/profile', alice, { bio: '<b>Mon profil</b>', bannerColor: '#6f9bff', decoration: 'stars', user: 'bob', admin: true })).status, 200);
  let users = (await call('/api/state', bob)).data.users;
  assert.equal(users.find(u => u.name === 'alice').profile.bio, '<b>Mon profil</b>');
  assert.equal(users.find(u => u.name === 'bob').profile.bio, '');
  assert.equal((await call('/api/state', alice)).data.admin, false);
  for (const payload of [{ bio: 'x'.repeat(191) }, { bio: {} }, { bannerColor: 'red;display:none' }, { decoration: 'frame-gold' }, { banner: 'data:image/svg+xml;base64,PHN2Zz4=' }, null]) assert.equal((await call('/api/profile', alice, payload)).status, 400);
  assert.equal((await call('/api/state', armin)).data.admin, true, 'cofounder has server admin access');
  assert.equal((await call('/api/admin', armin)).status, 200);
  assert.equal((await call('/api/admin', boss)).status, 200, 'configured admin retains access');
  assert.equal((await call('/api/admin', alice)).status, 403);
  assert.equal((await call('/api/admin/ban', boss, { name: 'armin.tocu', banned: true })).status, 400);
  const jpeg = 'data:image/jpeg;base64,/9j/2Q==';
  assert.equal((await call('/api/profile', alice, { banner: jpeg })).status, 200);
  users = (await call('/api/state', bob)).data.users;
  const profile = users.find(u => u.name === 'alice').profile;
  assert.ok(profile.banner);
  const image = await fetch(origin + '/banners/alice.jpg?v=' + profile.banner, { headers: { cookie: bob } });
  assert.equal(image.status, 200); assert.equal(image.headers.get('content-type'), 'image/jpeg');
  assert.equal((await fetch(origin + '/banners/alice.jpg')).status, 404);
  assert.equal((await call('/api/profile', alice, { banner: null })).status, 200);
  assert.equal((await fetch(origin + '/banners/alice.jpg', { headers: { cookie: bob } })).status, 404);
  users = (await call('/api/state', bob)).data.users;
  assert.ok(users.every(u => !('theme' in u) && !('hash' in u) && !('salt' in u)));
  const takeover = await call('/api/admin/impersonate', boss, { name: 'armin.tocu' });
  assert.equal((await call('/api/admin', takeover.cookie)).status, 403, 'impersonation does not grant admin privileges');
});
