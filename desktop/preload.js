'use strict';
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('bahlou', {
  getUrl: () => ipcRenderer.invoke('get-url'),
  setUrl: (url) => ipcRenderer.invoke('set-url', url),
  retry: () => ipcRenderer.invoke('retry'),
  changeServer: () => ipcRenderer.invoke('change-server'),
  syncEpitech: () => ipcRenderer.invoke('epitech-sync'),
  syncBrowser: (opt) => ipcRenderer.invoke('epitech-browser', opt),
  cancelSync: () => ipcRenderer.invoke('epitech-cancel'),
});
