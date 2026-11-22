import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { createServer } from 'vite';
const snap = path.resolve('pt-snap');
const server = await createServer({ root: snap, base: './', publicDir: path.resolve('public'), envDir: snap, logLevel: 'error', server: { port: 5199, strictPort: true, hmr: false, watch: null, host: '127.0.0.1' } });
await server.listen();
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-unsafe-webgpu'], defaultViewport: { width: 1600, height: 900 } });
const page = await browser.newPage();
page.on('console', (m) => console.log('[c]', m.text().slice(0, 200)));
await page.goto('http://127.0.0.1:5199/index.html?skip&at=tax&unlock');
await page.waitForFunction(() => window.__G && window.__G.time > 0.5);
await page.evaluate(() => { const G = window.__G, b = G.buildings.tax; G.state.hearts = 999; const pad = b.pads[1]; G.player.setFloor(pad.floor, pad.x, pad.z, b); });
for (let i = 0; i < 6; i++) {
  await new Promise((r) => setTimeout(r, 3000));
  console.log(await page.evaluate(() => { const G = window.__G, p = G.player; return JSON.stringify({ t: G.time, floor: p.floor, x: p.x, z: p.z, cine: !!G.cine?.active, frozen: p.frozen, hud: document.title }); }));
}
await browser.close(); await server.close();
