'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const { mkdtemp, rm } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const net = require('node:net');
const { once } = require('node:events');

async function launch(t) {
  const tmp = await mkdtemp(path.join(tmpdir(), 'bahlou-admin-test-'));
  const reserve = net.createServer(); reserve.listen(0, '127.0.0.1'); await once(reserve, 'listening');
  const port = reserve.address().port; await new Promise(resolve => reserve.close(resolve));
  const child = spawn(process.execPath, ['server.js'], { cwd: path.join(__dirname, '..'), env: { ...process.env, PORT: String(port), HOST: '127.0.0.1', DATA_DIR: tmp, INVITE_CODE: 'admin-test-invite', BAHLOU_ADMIN: 'boss' }, stdio: ['ignore', 'pipe', 'pipe'] });
  const exited = once(child, 'exit');
  t.after(async () => { child.kill('SIGTERM'); await exited; await rm(tmp, { recursive: true, force: true }); });
  const origin = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) { try { await fetch(origin + '/api/me'); break; } catch { await new Promise(r => setTimeout(r, 25)); } }
  const request = async (route, cookie = '', body) => {
    const res = await fetch(origin + route, { method: body === undefined ? 'GET' : 'POST', headers: { cookie, 'content-type': 'application/json' }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, data: await res.json(), cookie: res.headers.get('set-cookie')?.split(';')[0] };
  };
  const register = async username => (await request('/api/register', '', { username, password: 'fixture-password', invite: 'admin-test-invite' })).cookie;
  return { request, register };
}

test('un admin prend la main sur un compte, sans l’onglet Travail ni ses droits, puis revient au sien', async t => {
  const { request, register } = await launch(t);
  const boss = await register('boss'), zoe = await register('zoe');
  assert.equal((await request('/api/admin/impersonate', zoe, { name: 'boss' })).status, 403, 'un joueur ne peut pas');
  assert.equal((await request('/api/admin/impersonate', boss, { name: 'boss' })).status, 400);
  const take = await request('/api/admin/impersonate', boss, { name: 'zoe' });
  assert.equal(take.status, 200);
  const as = take.cookie;
  const state = (await request('/api/state', as)).data;
  assert.equal(state.me, 'zoe');
  assert.equal(state.impersonatedBy, 'boss');
  assert.equal(state.admin, false);
  assert.equal((await request('/api/messages', as, { conv: 'c:general', text: 'test' })).status, 200);
  assert.equal((await request('/api/work', as)).status, 403, 'le Travail reste privé');
  assert.equal((await request('/api/admin', as)).status, 403);
  const back = await request('/api/logout', as, {});
  assert.equal(back.data.back, 'boss');
  assert.equal(back.cookie, boss, 'le cookie de l’admin revient');
  assert.equal((await request('/api/state', boss)).data.me, 'boss');
  assert.equal((await request('/api/state', as)).status, 401, 'la session de prise de main est fermée');
  const seen = (await request('/api/state', zoe)).data;
  assert.equal(seen.takeovers.length, 1);
  assert.equal(seen.takeovers[0].by, 'boss');
  await request('/api/takeovers/seen', zoe, {});
  assert.equal((await request('/api/state', zoe)).data.takeovers, null);
  assert.match(JSON.stringify((await request('/api/admin', boss)).data.log), /Prise de main sur le compte de zoe/);
});
