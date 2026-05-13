const { app, BrowserWindow, ipcMain, net } = require('electron');
const path = require('path');
const nodeCrypto = require('crypto');

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'F&A Higienizações',
    icon: path.join(__dirname, '..', 'public', 'favicon.ico'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.cjs'),
    },
    autoHideMenuBar: true,
  });

  win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
}

// Password hashing via Node.js crypto — guaranteed to work in file:// contexts
// where window.crypto.subtle may be unavailable (isSecureContext = false)
ipcMain.handle('hash-password', (_event, password) => {
  return nodeCrypto.createHash('sha256').update(password, 'utf8').digest('hex');
});

// Proxy HTTP requests through the main process to avoid CORS restrictions
// that apply to file:// origins in the renderer process
ipcMain.handle('gs-fetch', (_event, { url, method, body }) => {
  return new Promise((resolve, reject) => {
    const req = net.request({ method: method || 'GET', url });

    let responseBody = '';
    let statusCode = 0;

    req.on('response', (response) => {
      statusCode = response.statusCode;
      response.on('data', (chunk) => { responseBody += chunk.toString(); });
      response.on('end', () => {
        resolve({ ok: statusCode >= 200 && statusCode < 300, status: statusCode, body: responseBody });
      });
      response.on('error', (err) => reject(new Error(String(err))));
    });

    req.on('error', (err) => reject(new Error(err.message)));

    if (body) {
      req.setHeader('Content-Type', 'text/plain;charset=utf-8');
      req.write(body);
    }

    req.end();
  });
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
