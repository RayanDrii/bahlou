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
  assert.equal((await request('/api/state', zoe)).data.takeovers, undefined, 'le joueur n’est pas prévenu');
  assert.match(JSON.stringify((await request('/api/admin', boss)).data.log), /Prise de main sur le compte de zoe/);
});

test('un admin donne des bahlous sans plafond', async t => {
  const { request, register } = await launch(t);
  const boss = await register('boss'); await register('zoe');
  assert.equal((await request('/api/admin/coins', boss, { to: 'zoe', amount: 1_000_000_000_000 })).status, 200);
  const zoe = (await request('/api/admin', boss)).data.players.find(p => p.name === 'zoe');
  assert.ok(zoe.coins >= 1_000_000_000_000);
  assert.equal((await request('/api/admin/coins', boss, { to: 'zoe', amount: 1e300 })).status, 400, 'au-delà de la précision des nombres');
});

test('groupes : création, messages réservés aux membres, renommer, ajouter, retirer, quitter', async t => {
  const { request, register } = await launch(t);
  const ana = await register('ana'), ben = await register('ben'), cam = await register('cam'), dan = await register('dan');
  assert.equal((await request('/api/groups', ana, { name: '', members: ['ben'] })).status, 400);
  assert.equal((await request('/api/groups', ana, { name: 'Potes', members: [] })).status, 400);
  const g = (await request('/api/groups', ana, { name: '  Les   potes ', members: ['ben', 'cam', 'inconnu', 'ana'] })).data.group;
  assert.equal(g.name, 'Les potes');
  assert.deepEqual(g.members, ['ana', 'ben', 'cam']);
  assert.equal(g.owner, 'ana');
  assert.equal((await request('/api/messages', ben, { conv: g.id, text: 'salut le groupe' })).status, 200);
  assert.equal((await request('/api/messages', dan, { conv: g.id, text: 'je m’incruste' })).status, 403, 'un non-membre ne peut pas écrire');
  assert.equal((await request(`/api/messages?conv=${g.id}`, dan)).status, 403, 'ni lire');
  const read = (await request(`/api/messages?conv=${g.id}`, cam)).data.messages;
  assert.ok(read.some(m => m.text === 'salut le groupe'));
  assert.ok(read.some(m => m.sys && /créé le groupe/.test(m.text)));
  assert.equal((await request('/api/state', cam)).data.groups[0].id, g.id);
  assert.equal((await request('/api/state', dan)).data.groups.length, 0);
  assert.equal((await request('/api/groups/update', ben, { id: g.id, name: 'Team 21h' })).data.group.name, 'Team 21h');
  assert.deepEqual((await request('/api/groups/update', ben, { id: g.id, add: ['dan'] })).data.group.members, ['ana', 'ben', 'cam', 'dan']);
  assert.equal((await request('/api/groups/update', ben, { id: g.id, remove: 'cam' })).status, 403, 'seul le créateur retire');
  assert.deepEqual((await request('/api/groups/update', ana, { id: g.id, remove: 'cam' })).data.group.members, ['ana', 'ben', 'dan']);
  assert.equal((await request(`/api/messages?conv=${g.id}`, cam)).status, 403, 'retiré : plus d’accès');
  assert.equal((await request('/api/groups/leave', ana, { id: g.id })).status, 200);
  assert.equal((await request('/api/state', ben)).data.groups[0].owner, 'ben', 'le créateur parti, un autre membre reprend');
});
