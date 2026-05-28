/**
 * Vektr Prism — Electron Preload Script
 * 
 * Secure bridge between renderer and main process
 */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('vektrAPI', {
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),
    getPlatform: () => ipcRenderer.invoke('get-platform'),
    restartServer: () => ipcRenderer.invoke('restart-server'),
    openExternal: (url) => ipcRenderer.invoke('open-external', url),
    showItemInFolder: (filePath) => ipcRenderer.invoke('show-item-in-folder', filePath),
});
