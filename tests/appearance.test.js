'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const settings = require('../public/appearance');
test('private themes reject CSS/URL injection and isolate browser accounts', () => {
  const stored = new Map(), storage = { getItem: k => stored.get(k), setItem: (k, v) => stored.set(k, v) };
  const value = settings.normalize({ theme: 'forest', accent: '#74d69c', wallpaper: 'https://tracker.example/image.jpg', admin: true });
  assert.equal(value.wallpaper, ''); assert.equal(value.admin, undefined);
  assert.equal(settings.normalize({ accent: 'red;display:none', theme: 'bad' }).accent, '');
  assert.equal(settings.normalize({ wallpaper: 'data:image/svg+xml;base64,PHN2Zz4=' }).wallpaper, '');
  settings.write(storage, 'alice', value);
  assert.equal(settings.read(storage, 'alice').theme, 'forest');
  assert.equal(settings.read(storage, 'bob').theme, 'bahlou');
  stored.set('bahlou.appearance.alice', '{broken');
  assert.equal(settings.read(storage, 'alice').theme, 'bahlou');
  assert.throws(() => settings.write({ setItem() { throw Error('quota'); } }, 'alice', value), /quota/);
  assert.equal(settings.inkFor('#ffffff'), '#111113');
  assert.equal(settings.inkFor('#000000'), '#ffffff');
});
