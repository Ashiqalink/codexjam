import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
const server = await createServer({ root: path.resolve('.'), logLevel: 'error', server: { port: 5198, strictPort: true, hmr: false, watch: null, host: '127.0.0.1' } });
await server.listen();
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], defaultViewport: { width: 1600, height: 900 } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
for (const n of [0, 1, 2, 3]) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('[err]', n, e.message));
  await page.goto('http://127.0.0.1:5198/index.html?shot=' + n);
  await page.waitForFunction(() => window.__G && window.__G.time > 0.5, { timeout: 90000 });
  await sleep(6000);
  await page.screenshot({ path: `shots/intro_${n}.png` });
  console.log('shot', n);
  await page.close();
}
await browser.close(); await server.close();
