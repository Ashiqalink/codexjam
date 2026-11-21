import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
const server = await createServer({ root: path.resolve('.'), logLevel: 'error', server: { port: 5198, strictPort: true, hmr: false, watch: null, host: '127.0.0.1' } });
await server.listen();
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'], defaultViewport: { width: 1600, height: 900 } });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const jobs = [['beach', 'skip', false]];
for (const [name, q, map] of jobs) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => console.log('[err]', name, e.message));
  await page.goto('http://127.0.0.1:5198/index.html?' + q);
  await page.waitForFunction(() => window.__G && window.__G.time > 0.5, { timeout: 90000 });
  await sleep(4000);
  if (map) { await page.keyboard.press('KeyM'); await sleep(1500); await page.mouse.move(800, 380); await sleep(600); }
  await page.screenshot({ path: `docs/img/new_${name}.png` });
  console.log('shot', name);
  await page.close();
}
await browser.close(); await server.close();

