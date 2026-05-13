const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Password hashing via Node.js crypto (works in file:// contexts)
  hashPassword: (password) => ipcRenderer.invoke('hash-password', password),
  // HTTP proxy to bypass CORS restrictions for file:// origins
  gsFetch: (options) => ipcRenderer.invoke('gs-fetch', options),
});
