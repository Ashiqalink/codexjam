// Desktop shell for Coup d'État, Baby!
// Serves dist/ over a custom app:// scheme (module scripts + GLB fetch need a real
// origin) and opens a 1920x1080 window.
const { app, BrowserWindow, Menu, protocol, net, screen } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const ROOT = path.join(__dirname, '..', 'dist');
const SMOKE_OUT = (process.argv.find((a) => a.startsWith('--smoke-out=')) || '').split('=')[1];
const SMOKE = Boolean(SMOKE_OUT);

protocol.registerSchemesAsPrivileged([{
  scheme: 'app',
  privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true, corsEnabled: true },
}]);

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.css': 'text/css', '.json': 'application/json', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
  '.wav': 'audio/wav', '.glb': 'model/gltf-binary', '.gltf': 'model/gltf+json',
  '.woff2': 'font/woff2', '.ico': 'image/x-icon',
};

function serve(req) {
  let rel = decodeURIComponent(new URL(req.url).pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  const file = path.join(ROOT, rel);
  if (!file.startsWith(ROOT) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    return new Response('Not found', { status: 404 });
  }
  const type = MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
  return new Response(fs.readFileSync(file), { headers: { 'content-type': type } });
}

function windowSize() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const scale = Math.min(1, width / 1920, height / 1080);
  return { width: Math.round(1920 * scale), height: Math.round(1080 * scale), fits: scale === 1 };
}

function createWindow() {
  const { width, height, fits } = windowSize();
  const win = new BrowserWindow({
    width, height, useContentSize: true, minWidth: 960, minHeight: 540,
    backgroundColor: '#000000', show: false, autoHideMenuBar: true,
    title: "Coup d'État, Baby!",
    webPreferences: { backgroundThrottling: false, contextIsolation: true, nodeIntegration: false },
  });

  win.once('ready-to-show', () => {
    // Designed for 1920x1080: use the full screen when the display is smaller.
    if (!fits) win.maximize();
    win.show();
  });
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    if (input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen());
      event.preventDefault();
    } else if (input.key === 'Escape' && win.isFullScreen()) {
      win.setFullScreen(false);
      event.preventDefault();
    }
  });

  win.loadURL('app://game/index.html');
  return win;
}

async function smoke(win) {
  fs.mkdirSync(SMOKE_OUT, { recursive: true });
  const errors = [];
  win.webContents.on('console-message', (_e, level, message) => {
    if (level >= 2) errors.push(message);
  });
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  await new Promise((r) => win.webContents.once('did-finish-load', r));
  await wait(6000);
  await win.webContents.capturePage().then((img) => fs.writeFileSync(path.join(SMOKE_OUT, '1-title.png'), img.toPNG()));
  await win.webContents.executeJavaScript("document.getElementById('title').click()");
  await wait(1200);
  await win.webContents.capturePage().then((img) => fs.writeFileSync(path.join(SMOKE_OUT, '2-howto.png'), img.toPNG()));
  await win.webContents.executeJavaScript("document.getElementById('howto').click()");
  await wait(9000);
  await win.webContents.capturePage().then((img) => fs.writeFileSync(path.join(SMOKE_OUT, '3-intro.png'), img.toPNG()));
  console.log('SMOKE:errors=' + JSON.stringify(errors.slice(0, 12)));
  console.log('SMOKE:size=' + JSON.stringify(win.getContentSize()));
  app.exit(errors.length ? 1 : 0);
}

app.whenReady().then(() => {
  protocol.handle('app', serve);
  Menu.setApplicationMenu(null);
  const win = createWindow();
  if (SMOKE) smoke(win).catch((e) => { console.error('SMOKE:failed', e); app.exit(1); });
});

app.on('window-all-closed', () => app.quit());
