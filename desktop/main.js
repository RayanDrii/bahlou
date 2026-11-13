'use strict';
const { app, BrowserWindow, Tray, Menu, shell, ipcMain, nativeImage, dialog, net } = require('electron');
const path = require('path');
const fs = require('fs');
const { syncEpitech } = require('./epitech-sync');
const { createBridge, ORIGIN: EPITECH } = require('./epitech-bridge');

// -------------------------------------------------- config (adresse du serveur)
const CONFIG_DIR = path.join(app.getPath('userData'));
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');
function loadConfig() {
  try { return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')); } catch { return {}; }
}
function saveConfig(c) {
  try { fs.mkdirSync(CONFIG_DIR, { recursive: true }); fs.writeFileSync(CONFIG_FILE, JSON.stringify(c, null, 2)); } catch {}
}
let config = loadConfig();

// adresse officielle : rien à saisir, et les anciens liens temporaires sont remplacés tout seuls
const OFFICIAL_URL = 'https://bahlou.spaincentral.cloudapp.azure.com';
function needsOfficial(url) {
  if (!url) return true;
  try { return new URL(url).hostname.endsWith('.trycloudflare.com'); } catch { return true; }
}
if (needsOfficial(config.url)) { config.url = OFFICIAL_URL; saveConfig(config); }

const ICON = path.join(__dirname, 'build', 'icon.png');
let win = null;
let tray = null;
let quitting = false;

// une seule instance
if (!app.requestSingleInstanceLock()) { app.quit(); }
app.on('second-instance', () => { if (win) { win.show(); win.focus(); } });

// -------------------------------------------------- fenêtre
function createWindow() {
  win = new BrowserWindow({
    width: 1180,
    height: 780,
    minWidth: 380,
    minHeight: 560,
    backgroundColor: '#0b0b0b',
    show: false,
    icon: fs.existsSync(ICON) ? ICON : undefined,
    title: 'Bahlou',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      spellcheck: true,
    },
  });

  win.setMenuBarVisibility(false);
  win.once('ready-to-show', () => win.show());
  win.webContents.setVisualZoomLevelLimits(1, 1);
  win.webContents.on('did-fail-load', (e, code, desc, url, isMain) => {
    if (isMain && code !== -3 && config.url) showOffline();
  });

  loadTarget();

  // liens externes → navigateur par défaut
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url) && !isServer(url)) { shell.openExternal(url); return { action: 'deny' }; }
    return { action: 'allow' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (/^https?:\/\//.test(url) && !isServer(url)) { e.preventDefault(); shell.openExternal(url); }
  });

  // badge de non-lus depuis le titre de la page ("(3) Bahlou")
  win.on('page-title-updated', (e, title) => {
    const m = title.match(/^\((\d+)\)/);
    const n = m ? Number(m[1]) : 0;
    if (app.setBadgeCount) app.setBadgeCount(n);
    if (tray) tray.setToolTip(n ? `Bahlou — ${n} non lus` : 'Bahlou');
  });

  // fermer = réduire dans la barre système
  win.on('close', (e) => {
    if (!quitting) { e.preventDefault(); win.hide(); }
  });
}

function isServer(url) {
  try { return config.url && new URL(url).origin === new URL(config.url).origin; } catch { return false; }
}
// on vérifie que le serveur répond avant d'afficher quoi que ce soit : jamais de page d'erreur de navigateur
let retryTimer = null;
async function reachable(url) {
  try {
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 6000);
    const r = await net.fetch(url + '/api/me', { signal: ctl.signal, bypassCustomProtocolHandlers: true });
    clearTimeout(t);
    return r.status < 500;
  } catch { return false; }
}
function showOffline() {
  clearTimeout(retryTimer);
  win.loadFile('offline.html');
  retryTimer = setTimeout(loadTarget, 5000);
}
async function loadTarget() {
  clearTimeout(retryTimer);
  if (!config.url) return win.loadFile('setup.html');
  const page = win.webContents.getURL();
  if (!page.endsWith('offline.html')) await win.loadFile('splash.html');
  const url = config.url;
  if (await reachable(url)) { if (url === config.url) win.loadURL(url); }
  else showOffline();
}
const localOnly = (e) => e.senderFrame.url.startsWith('file:');

// -------------------------------------------------- écran de configuration
ipcMain.handle('get-url', (e) => (localOnly(e) ? config.url || '' : ''));
ipcMain.handle('retry', (e) => { if (localOnly(e)) loadTarget(); });
ipcMain.handle('change-server', (e) => {
  if (!localOnly(e)) return;
  clearTimeout(retryTimer);
  config.url = null; saveConfig(config); win.loadFile('setup.html'); rebuildMenu();
});
ipcMain.handle('set-url', (e, raw) => {
  if (!localOnly(e)) return { ok: false, error: 'Refusé' };
  let url = String(raw || '').trim().replace(/\/+$/, '');
  if (!url) return { ok: false, error: 'Adresse vide' };
  if (!/^https?:\/\//.test(url)) url = 'https://' + url;
  try { new URL(url); } catch { return { ok: false, error: 'Adresse invalide' }; }
  config.url = url;
  saveConfig(config);
  loadTarget();
  rebuildMenu();
  return { ok: true };
});

// -------------------------------------------------- synchro my.epitech (demandée par la page du serveur)
let syncing = null;
ipcMain.handle('epitech-sync', (e) => {
  if (!isServer(e.senderFrame.url)) return { ok: false, error: 'Refusé' };
  if (!syncing) syncing = syncEpitech({ parent: win }).finally(() => { syncing = null; });
  return syncing;
});

// connexion par le navigateur par défaut (favori Bahlou)
if (!config.favoriKey) { config.favoriKey = require('crypto').randomBytes(18).toString('hex'); saveConfig(config); }
const bridge = createBridge({ secret: config.favoriKey });
let browserSync = null;
ipcMain.handle('epitech-browser', (e, opt) => {
  if (!isServer(e.senderFrame.url)) return { ok: false, error: 'Refusé' };
  const landing = !!opt?.setup || !config.favori;
  if (!browserSync) {
    browserSync = bridge.start().then((res) => {
      browserSync = null;
      if (res.ok) { config.favori = true; saveConfig(config); win.show(); win.focus(); }
      return res;
    });
  }
  shell.openExternal(landing ? bridge.url : `${EPITECH}/dashboard`);
  return browserSync;
});
ipcMain.handle('epitech-cancel', (e) => { if (isServer(e.senderFrame.url)) bridge.cancel(); });

// -------------------------------------------------- barre système
function createTray() {
  const img = fs.existsSync(ICON) ? nativeImage.createFromPath(ICON) : nativeImage.createEmpty();
  tray = new Tray(img.isEmpty() ? img : img.resize({ width: 22, height: 22 }));
  tray.setToolTip('Bahlou');
  tray.on('click', () => { if (win.isVisible() && win.isFocused()) win.hide(); else { win.show(); win.focus(); } });
  rebuildTrayMenu();
}
function rebuildTrayMenu() {
  if (!tray) return;
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Ouvrir Bahlou', click: () => { win.show(); win.focus(); } },
    { label: 'Recharger', click: () => win.reload() },
    { type: 'separator' },
    { label: 'Changer de serveur…', click: changeServer },
    { type: 'separator' },
    { label: 'Quitter', click: () => { quitting = true; app.quit(); } },
  ]));
}

async function changeServer() {
  const { response } = await dialog.showMessageBox(win, {
    type: 'question',
    buttons: ['Annuler', 'Changer'],
    defaultId: 1,
    cancelId: 0,
    title: 'Changer de serveur',
    message: 'Revenir à l\'écran de connexion pour saisir une nouvelle adresse de serveur ?',
    detail: config.url ? `Adresse actuelle : ${config.url}` : undefined,
  });
  if (response === 1) { clearTimeout(retryTimer); config.url = null; saveConfig(config); win.show(); win.loadFile('setup.html'); rebuildMenu(); }
}

// -------------------------------------------------- menu application
function rebuildMenu() {
  const template = [
    {
      label: 'Fichier',
      submenu: [
        { label: 'Recharger', accelerator: 'CmdOrCtrl+R', click: () => win.reload() },
        { label: 'Changer de serveur…', click: changeServer },
        { type: 'separator' },
        { label: 'Masquer dans la barre', accelerator: 'CmdOrCtrl+W', click: () => win.hide() },
        { label: 'Quitter', accelerator: 'CmdOrCtrl+Q', click: () => { quitting = true; app.quit(); } },
      ],
    },
    {
      label: 'Édition',
      submenu: [
        { role: 'undo', label: 'Annuler' }, { role: 'redo', label: 'Rétablir' }, { type: 'separator' },
        { role: 'cut', label: 'Couper' }, { role: 'copy', label: 'Copier' }, { role: 'paste', label: 'Coller' },
        { role: 'selectAll', label: 'Tout sélectionner' },
      ],
    },
    {
      label: 'Affichage',
      submenu: [
        { role: 'resetZoom', label: 'Zoom normal' }, { role: 'zoomIn', label: 'Zoom avant' }, { role: 'zoomOut', label: 'Zoom arrière' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Plein écran' },
        { label: 'Outils de développement', accelerator: 'CmdOrCtrl+Shift+I', click: () => win.webContents.toggleDevTools() },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// -------------------------------------------------- cycle de vie
app.whenReady().then(() => {
  createWindow();
  createTray();
  rebuildMenu();
  app.on('activate', () => { if (!BrowserWindow.getAllWindows().length) createWindow(); else { win.show(); } });
});
app.on('before-quit', () => { quitting = true; });
app.on('window-all-closed', () => {}); // on garde l'appli dans la barre système
