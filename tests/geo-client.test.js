'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../public/geo.js'), 'utf8');
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
const flush = () => new Promise(resolve => setImmediate(resolve));
class Element {
  constructor(attrs = '') {
    this.dataset = {}; this.listeners = {}; this.classList = { toggle() {} };
    for (const [, key, value] of attrs.matchAll(/data-([\w-]+)="([^"]*)"/g)) this.dataset[key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
  }
  set innerHTML(html) {
    this.html = html; this.nodes = new Map(); this.actions = [];
    for (const [, attrs] of html.matchAll(/<[\w-]+\s([^>]+)>/g)) {
      const node = new Element(attrs), id = /\bid="([^"]*)"/.exec(attrs)?.[1];
      if (id) this.nodes.set(id, node);
      if (node.dataset.geoAction) this.actions.push(node);
    }
  }
  get innerHTML() { return this.html; }
  querySelector(selector) { return this.nodes?.get(selector.slice(1)) || null; }
  querySelectorAll() { return this.actions || []; }
  addEventListener(name, fn) { this.listeners[name] = fn; }
  setAttribute() {}
}
function setup() {
  const root = new Element(), requests = [], pendingPrepare = deferred(), pendingRefresh = deferred();
  let stateRequests = 0;
  const waiting = { code: 'ABC234', host: 'alice', phase: 'waiting', version: 1, players: [{ name: 'alice', score: 0 }, { name: 'bob', score: 0 }], round: null, result: null, history: [], preparedCount: 0 };
  const google = { maps: { importLibrary: async () => ({}), StreetViewSource: { OUTDOOR: 'outdoor' }, StreetViewService: class {
    async getPanorama({ location }) { return { data: { location: { pano: `pano-${location.index}`, latLng: { toJSON: () => ({ lat: location.lat, lng: location.lng }) } } } }; }
  } } };
  const context = vm.createContext({ document: { querySelector: () => root }, google, window: { google }, state: { me: 'alice' }, URL, URLSearchParams, Date, Math, Promise,
    setTimeout: () => 1, clearTimeout() {}, setInterval: () => 1, clearInterval() {},
    api: async (_method, url) => {
      requests.push(url);
      if (url.endsWith('/config')) return { configured: true, apiKey: 'fixture', candidates: Array.from({ length: 8 }, (_, i) => ({ lat: i, lng: i })) };
      if (url.endsWith('/state')) return ++stateRequests === 1 ? { room: waiting, serverNow: Date.now() } : pendingRefresh.promise;
      if (url.endsWith('/prepare')) return pendingPrepare.promise;
      if (url.endsWith('/leave')) return { room: null, serverNow: Date.now() };
      return { room: waiting, serverNow: Date.now() };
    },
  });
  vm.runInContext(source + '\nthis.controller = Geo;', context);
  return { root, requests, pendingPrepare, pendingRefresh, waiting, geo: context.controller,
    async click(action) { const b = root.actions.find(b => b.dataset.geoAction === action); assert.ok(b, action); await b.listeners.click({ currentTarget: b }); await flush(); } };
}

test('client: navigation during pending panorama preparation never starts a round', async () => {
  const s = setup(); await s.geo.open(); await s.click('start');
  for (let i = 0; i < 10 && !s.requests.includes('/api/geo/prepare'); i++) await flush();
  assert.ok(s.requests.includes('/api/geo/prepare'));
  s.geo.stop(); s.pendingPrepare.resolve({ room: s.waiting, serverNow: Date.now() });
  await flush(); await flush();
  assert.ok(!s.requests.includes('/api/geo/start'), 'Leaving Geo must cancel the pending start');
});

test('client: pending state refresh cannot resurrect a room after leaving', async () => {
  const s = setup(); await s.geo.open();
  const refresh = s.geo.refresh(); await s.click('leave');
  assert.match(s.root.innerHTML, /Le monde vous attend/);
  s.pendingRefresh.resolve({ room: s.waiting, serverNow: Date.now() }); await refresh;
  assert.match(s.root.innerHTML, /Le monde vous attend/);
  assert.doesNotMatch(s.root.innerHTML, /On part où/);
});
