'use strict';
// Ouvre my.epitech dans une fenêtre où l'élève se connecte lui-même, puis lit les réponses que le site
// charge pour lui. Aucun mot de passe, cookie ni jeton n'est lu ou transmis : seulement ces réponses.
const { BrowserWindow } = require('electron');

const WANT = {
  tests: /\/api\/students\/test-results(\?|$)/,
  evaluations: /\/api\/students\/evaluations(\?|$)/,
  alerts: /\/api\/evaluations\/validations\/alerts\/me$/,
  ongoing: /\/api\/units\/instances\/projects\?.*status=ongoing/,
  upcoming: /\/api\/units\/instances\/projects\?.*status=upcoming/,
};
const AUTHED = /\/api\/notifications\/bell\/count$/;   // ne répond 200 qu'une fois connecté
const STAGE1 = ['tests', 'evaluations', 'alerts'];
const STAGE2 = ['ongoing', 'upcoming'];

function syncEpitech({ parent, base = 'https://my.epitech.eu', timeoutMs = 6 * 60 * 1000, show = true }) {
  return new Promise((resolve) => {
    const w = new BrowserWindow({
      width: 1000, height: 760, parent, show, title: 'Connexion à my.epitech', backgroundColor: '#0b0b0b',
      webPreferences: { partition: 'persist:epitech', sandbox: true, contextIsolation: true },
    });
    w.setMenuBarVisibility(false);
    w.on('page-title-updated', (e) => e.preventDefault());
    const wc = w.webContents, data = {}, ids = new Map();
    let stage = 1, authed = false, steers = 0, ended = false, steerTimer = null;

    const end = (res) => {
      if (ended) return;
      ended = true;
      clearTimeout(timer); clearTimeout(steerTimer);
      try { wc.debugger.detach(); } catch {}
      if (!w.isDestroyed()) w.destroy();
      resolve(res);
    };
    const timer = setTimeout(() => end({ ok: false, error: 'La connexion à my.epitech a pris trop de temps.' }), timeoutMs);
    w.on('closed', () => end({ ok: false, error: 'Synchronisation annulée.' }));

    const stageStarted = () => authed || stage > 1 || Object.keys(data).length > 0 || /^https?:/.test(wc.getURL());
    const path = () => { try { const u = new URL(wc.getURL()); return u.origin === new URL(base).origin ? u.pathname : null; } catch { return null; } };
    const steer = () => {
      clearTimeout(steerTimer);
      if (!authed || stage !== 1 || steers >= 3) return;
      steerTimer = setTimeout(() => {
        const p = path();
        if (p !== null && !p.startsWith('/me/academic')) { steers++; wc.loadURL(`${base}/me/academic`); }
      }, 1200);
    };
    const advance = () => {
      if (stage === 1 && STAGE1.every((k) => data[k])) { stage = 2; wc.loadURL(`${base}/projects`); }
      else if (stage === 2 && STAGE2.every((k) => data[k])) end({ ok: true, data });
    };

    wc.on('did-navigate', steer);
    wc.on('did-navigate-in-page', steer);
    wc.debugger.on('message', async (e, method, params) => {
      if (method === 'Network.responseReceived') {
        const { url, status } = params.response;
        if (!url.startsWith(`${base}/api/`) || status !== 200) return;
        if (AUTHED.test(url.split('#')[0]) && !authed) { authed = true; steer(); }
        const key = Object.keys(WANT).find((k) => WANT[k].test(url));
        if (key) ids.set(params.requestId, key);
      } else if (method === 'Network.loadingFinished' && ids.has(params.requestId)) {
        const key = ids.get(params.requestId);
        ids.delete(params.requestId);
        try {
          const { body, base64Encoded } = await wc.debugger.sendCommand('Network.getResponseBody', { requestId: params.requestId });
          data[key] = JSON.parse(base64Encoded ? Buffer.from(body, 'base64').toString('utf8') : body);
          advance();
        } catch {}
      }
    });

    // le débogueur ne répond qu'une fois un premier document chargé
    wc.loadURL('about:blank')
      .then(() => { wc.debugger.attach('1.3'); return wc.debugger.sendCommand('Network.enable', { maxResourceBufferSize: 8e6, maxTotalBufferSize: 32e6 }); })
      .then(() => wc.debugger.sendCommand('Network.setCacheDisabled', { cacheDisabled: true }))
      .then(() => wc.loadURL(`${base}/me/academic`))
      .catch(() => { if (!ended && !stageStarted()) end({ ok: false, error: 'Impossible d’ouvrir my.epitech.' }); });
  });
}

module.exports = { syncEpitech };
