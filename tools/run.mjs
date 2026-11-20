// Real-time headless runner: node tools/run.mjs "<query>" <out.png> [waitMs]
// Serves dist/ over a tiny local HTTP server, prints console output, takes a screenshot.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const [query = 'skip', out = 'shots/run.png', waitMs = '4000', extra = ''] = process.argv.slice(2);
// extra: comma list of ms offsets for additional screenshots (out_<ms>.png)
const root = path.resolve('dist');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg' };
const server = http.createServer((req, res) => {
  const p = path.join(root, decodeURIComponent(req.url.split('?')[0]));
  const f = fs.existsSync(p) && fs.statSync(p).isFile() ? p : path.join(root, 'index.html');
  res.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' });
  fs.createReadStream(f).pipe(res);
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-unsafe-webgpu', '--window-size=1600,900'],
  defaultViewport: { width: 1600, height: 900 },
});
const page = await browser.newPage();
let done = false;
page.on('console', (m) => { const t = m.text(); console.log('[page]', t); if (t.startsWith('TEST RESULTS')) done = true; });
page.on('pageerror', (e) => console.log('[pageerror]', e.message));
await page.goto(`http://127.0.0.1:${port}/index.html?${query}`);
const t0 = Date.now();
for (const ms of extra.split(',').filter(Boolean).map(Number)) {
  while (Date.now() - t0 < ms) await new Promise((r) => setTimeout(r, 100));
  const o = out.replace(/\.png$/, '_' + ms + '.png'); await page.screenshot({ path: o }); console.log('saved', o);
}
const deadline = t0 + Number(waitMs);
while (Date.now() < deadline && !(query.includes('test') && done)) await new Promise((r) => setTimeout(r, 250));
await new Promise((r) => setTimeout(r, 500));
fs.mkdirSync(path.dirname(out), { recursive: true });
await page.screenshot({ path: out });
console.log('saved', out);
await browser.close();
server.close();
