import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
import sharp from 'sharp';

const W = 1260;
const H = 1000;
const bg = 'data:image/png;base64,' + fs.readFileSync('docs/img/market.png').toString('base64');

const html = `<!doctype html><html><head><meta charset="utf-8"><style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: #000; }
  .bg { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; object-position: 55% 52%; transform: scale(1.34); }
  .shade { position: absolute; inset: 0; background:
      radial-gradient(circle at 50% 44%, rgba(255,210,63,.22) 0%, rgba(42,26,18,.18) 38%, rgba(10,6,4,.74) 100%),
      linear-gradient(180deg, rgba(10,6,4,.45), rgba(10,6,4,0) 28%, rgba(10,6,4,0) 62%, rgba(10,6,4,.6)); }
  .frame { position: absolute; inset: 18px; border: 8px solid #ffd23f; border-radius: 6px; box-shadow: inset 0 0 0 5px #2a1a12; }
  .kicker { position: absolute; top: 62px; left: 0; right: 0; text-align: center;
      font: 900 34px "Arial Black", Impact, sans-serif; letter-spacing: .34em; color: #fff4d6;
      text-shadow: 0 4px 0 #2a1a12; }
  .title { position: absolute; top: 47%; left: 0; right: 0; transform: translateY(-50%) rotate(-3deg);
      font: 900 148px/.9 "Arial Black", Impact, sans-serif; text-align: center; color: #ffd23f;
      text-shadow: 0 12px 0 #d9412b, 0 20px 0 #2a1a12; letter-spacing: -0.02em; }
  .title small { display: block; font-size: 116px; letter-spacing: .02em; }
  .stamp { position: absolute; left: 50%; bottom: 74px; transform: translateX(-50%) rotate(1.5deg);
      background: #fff4d6; color: #2a1a12; border: 6px solid #2a1a12; border-radius: 10px;
      padding: 14px 30px 16px; font: 900 27px "Arial Black", Impact, sans-serif; white-space: nowrap;
      box-shadow: 8px 9px 0 rgba(0,0,0,.55); }
  .jam { position: absolute; right: 40px; top: 40px; transform: rotate(6deg);
      background: #d9412b; color: #fff4d6; border: 5px solid #2a1a12; border-radius: 8px;
      padding: 8px 16px; font: 900 20px "Arial Black", Impact, sans-serif; letter-spacing: .06em;
      box-shadow: 5px 6px 0 rgba(0,0,0,.5); }
</style></head><body>
  <img class="bg" src="${bg}">
  <div class="shade"></div>
  <div class="frame"></div>
  <div class="kicker">ISLA CORRUPTA</div>
  <div class="title">COUP D'ÉTAT,<small>BABY!</small></div>
  <div class="jam">12-HOUR JAM</div>
  <div class="stamp">SHIPWRECKED. BROKE. RUNNING FOR PRESIDENT.</div>
</body></html>`;

const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: 'new',
  args: ['--hide-scrollbars', '--force-device-scale-factor=2'],
  defaultViewport: { width: W, height: H, deviceScaleFactor: 2 },
});
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
await new Promise((r) => setTimeout(r, 600));
const tmp = 'C:/Users/ashiq/AppData/Local/Temp/opencode/cover-render.png';
await page.screenshot({ path: tmp });
await browser.close();

await sharp(tmp).resize(W, H).png().toFile('release/itch-cover-title-1260.png');
await sharp(tmp).resize(630, 500).png({ quality: 95 }).toFile('release/itch-cover-title-630.png');
console.log('cover rendered');


