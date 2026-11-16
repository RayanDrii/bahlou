'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
class Element {
  constructor() { this.children = []; this.dataset = {}; this.classList = { remove() {}, add() {} }; this.style = {}; this.value = ''; this.disabled = false; }
  set innerHTML(html) {
    this.nodes = new Map(); this.themes = [];
    for (const [, attrs] of html.matchAll(/<[\w-]+\s([^>]+)>/g)) {
      const n = new Element(), id = /\bid="([^"]+)"/.exec(attrs)?.[1], theme = /data-theme="([^"]+)"/.exec(attrs)?.[1];
      if (id) this.nodes.set(id, n);
      if (theme) { n.dataset.theme = theme; this.themes.push(n); }
    }
  }
  querySelector(s) { return this.nodes?.get(s.slice(1)) || [...(this.nodes?.values() || [])].map(n => n.querySelector(s)).find(Boolean) || null; }
  querySelectorAll(s) { return [...(s === '[data-theme]' ? this.themes || [] : this.nodes?.values() || []), ...[...(this.nodes?.values() || [])].flatMap(n => n.querySelectorAll(s))]; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  addEventListener() {} setAttribute() {} focus() {}
}
function fixture() {
  const body = new Element(), styles = new Map(), images = [], posts = [];
  let resolvePost;
  const pendingPost = new Promise(r => { resolvePost = r; });
  const user = { online: true, profile: { bio: '', bannerColor: '#ff4a1f', decoration: 'none', banner: null } };
  const context = vm.createContext({ window: {}, document: { body, addEventListener() {}, activeElement: null, createElement: tag => tag === 'canvas' ? { getContext: () => ({ drawImage() {} }), toDataURL: () => 'data:image/jpeg;base64,/9j/2Q==' } : new Element(), documentElement: { style: { setProperty: (k, v) => styles.set(k, v), removeProperty: k => styles.delete(k) }, toggleAttribute() {} } },
    localStorage: { getItem: () => null, setItem() {} }, state: { me: 'alice', users: [{ name: 'alice' }] }, userOf: () => user, avatar: () => new Element(), renderPeople() {}, renderMessages() {},
    URL: { createObjectURL: () => 'blob:fixture', revokeObjectURL() {} }, Image: class extends Element { constructor() { super(); this.naturalWidth = 100; this.naturalHeight = 100; } set src(v) { if (v.startsWith('blob:')) images.push(() => this.onload()); } },
    api: (_m, _url, payload) => { posts.push(payload); return pendingPost; },
  });
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../public/appearance.js'), 'utf8'), context);
  context.window.Appearance.init(); context.window.Appearance.openEditor();
  const panel = body.children[0];
  const get = id => panel.querySelector('#' + id);
  return { get, styles, images, posts, resolvePost, user, changeImage(id) { return get(id).onchange({ target: { files: [{ type: 'image/png', size: 100 }] } }); } };
}
test('client: banner save waits for image processing, without silently dropping the image', async () => {
  const f = fixture(), read = f.changeImage('ap-banner-file');
  assert.equal(f.get('ap-profile-save').disabled, true);
  f.images.shift()(); await read;
  assert.equal(f.get('ap-profile-save').disabled, false);
  const saved = f.get('ap-profile-save').onclick();
  assert.equal(f.posts[0].banner, 'data:image/jpeg;base64,/9j/2Q==');
  f.resolvePost({ profile: f.user.profile }); await saved;
});
test('client: removing or resetting a background cancels a pending image read', async () => {
  for (const action of ['ap-wallpaper-remove', 'ap-reset']) {
    const f = fixture(), read = f.changeImage('ap-wallpaper');
    f.get(action).onclick(); f.images.shift()(); await read;
    assert.equal(f.styles.has('--personal-wallpaper'), false, action);
  }
});
test('client: public form cannot be edited while its saved snapshot is in flight', async () => {
  const f = fixture(), saved = f.get('ap-profile-save').onclick();
  assert.equal(f.get('ap-bio').disabled, true);
  assert.equal(f.get('ap-decoration').disabled, true);
  f.resolvePost({ profile: f.user.profile }); await saved;
  assert.equal(f.get('ap-bio').disabled, false);
});
