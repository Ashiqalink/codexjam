// Background playtest for the mid/late buildings. node tools/playtest.mjs  -> shots/pt_report.txt
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import puppeteer from 'puppeteer-core';
const root = path.resolve('dist-pt');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.glb': 'model/gltf-binary', '.mp3': 'audio/mpeg' };
const server = http.createServer((q, s) => { const p = path.join(root, decodeURIComponent(q.url.split('?')[0])); const f = fs.existsSync(p) && fs.statSync(p).isFile() ? p : path.join(root, 'index.html'); s.writeHead(200, { 'content-type': types[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(s); });
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const port = server.address().port;
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: 'new', args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--window-size=1280,720'], defaultViewport: { width: 1280, height: 720 } });
const out = [];
const log = (s) => { out.push(s); console.log(s); fs.writeFileSync('shots/pt_report.txt', out.join('\n')); };
const waitGame = (page, s) => page.evaluate((s) => new Promise((r) => { const t0 = __G.time; const f = () => (__G.time - t0 >= s ? r() : requestAnimationFrame(f)); f(); }), s);

for (const id of ['tax', 'tower', 'palace']) {
  const page = await browser.newPage();
  page.on('pageerror', (e) => log(`[${id}] PAGEERROR ${e.message}`));
  await page.goto(`http://127.0.0.1:${port}/?skip&at=${id}&unlock`, { waitUntil: 'load' });
  await page.waitForFunction(() => window.__G?.player && window.__G.time > 0.5, { timeout: 120000 });
  // Static checks: locks, landings, flood-fill reachability per floor.
  const r = await page.evaluate((id) => {
    const G = __G, b = G.buildings[id], ov = __col.overlaps, R = 0.35, res = [];
    res.push(`lock: ${b.lockText() ? 'LOCKED ' + b.lockText() : 'open'}`);
    for (const p of b.pads) {
      if (ov(p.lx, p.lz, R, p.to, b)) res.push(`BUG landing inside collider: floor ${p.to} at local (${(p.lx - b.x).toFixed(1)}, ${(p.lz - b.z).toFixed(1)})`);
      if (ov(p.x, p.z, R, p.floor, b)) res.push(`BUG pad inside collider: floor ${p.floor} at local (${(p.x - b.x).toFixed(1)}, ${(p.z - b.z).toFixed(1)})`);
    }
    const step = 0.4, hw = b.w / 2 - 0.4, hd = b.d / 2 - 0.4;
    const reach = [];
    for (let f = 0; f < b.floors; f++) {
      const seen = new Set(), q = [];
      const key = (i, j) => i + ',' + j;
      const toW = (i, j) => [b.x - hw + i * step, b.z - hd + j * step];
      const ni = Math.floor((2 * hw) / step), nj = Math.floor((2 * hd) / step);
      const starts = f === 0 ? [[b.x + (b.door?.x || 0), b.z + b.d / 2 - 1.2]] : b.pads.filter((p) => p.to === f).map((p) => [p.lx, p.lz]);
      for (const [sx, sz] of starts) { const i = Math.round((sx - (b.x - hw)) / step), j = Math.round((sz - (b.z - hd)) / step); q.push([i, j]); seen.add(key(i, j)); }
      while (q.length) { const [i, j] = q.pop(); for (const [di, dj] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const a = i + di, c = j + dj; if (a < 0 || c < 0 || a > ni || c > nj || seen.has(key(a, c))) continue; const [x, z] = toW(a, c); if (ov(x, z, R, f, b)) continue; seen.add(key(a, c)); q.push([a, c]); } }
      reach[f] = (x, z) => { for (let a = -3; a <= 3; a++) for (let c = -3; c <= 3; c++) { const i = Math.round((x - (b.x - hw)) / step) + a, j = Math.round((z - (b.z - hd)) / step) + c; if (seen.has(key(i, j))) return true; } return false; };
      res.push(`floor ${f}: reachable cells ${seen.size}`);
    }
    for (const it of G.interactables) if (it.bld === b) {
      const ok = reach[it.floor]?.(it.x, it.z);
      if (!ok) res.push(`BUG unreachable interactable "${it.label?.() || '?'}" floor ${it.floor} local (${(it.x - b.x).toFixed(1)}, ${(it.z - b.z).toFixed(1)})`);
    }
    for (const g of G.guards) if (g.bld === b) for (const [x, z] of g.route) if (!reach[g.floor](x, z)) res.push(`BUG guard waypoint unreachable floor ${g.floor} local (${(x - b.x).toFixed(1)}, ${(z - b.z).toFixed(1)})`);
    // Freeze the player far away so guards just patrol.
    G.player.frozen = true; G.player.hidden = true;
    window.__gs = G.guards.filter((g) => g.bld === b).map((g) => ({ g, x: g.x, z: g.z, dist: 0, wps: new Set() }));
    return res;
  }, id);
  for (const s of r) log(`[${id}] ${s}`);
  // Dynamic: let guards patrol 20 game-seconds, track distance and waypoints reached.
  await page.evaluate(() => { window.__trk = setInterval(() => { for (const s of __gs) { const d = Math.hypot(s.g.x - s.x, s.g.z - s.z); s.dist += d; s.x = s.g.x; s.z = s.g.z; s.wps.add(s.g.ri); } }, 50); });
  await waitGame(page, 20);
  const gr = await page.evaluate((id) => { clearInterval(__trk); const b = __G.buildings[id]; return __gs.map((s) => `guard floor ${s.g.floor} start local (${(s.g.route[0][0] - b.x).toFixed(1)}, ${(s.g.route[0][1] - b.z).toFixed(1)}): moved ${s.dist.toFixed(1)}, waypoints ${s.wps.size}/${s.g.route.length}, state ${s.g.state}`); }, id);
  for (const s of gr) log(`[${id}] ${s.includes('moved 0.') || / waypoints 1\/[2-9]/.test(s) ? 'BUG? ' : ''}${s}`);
  // Screenshots per floor.
  for (let f = 0; f < 3; f++) {
    const ok = await page.evaluate((id, f) => { const b = __G.buildings[id]; if (f >= b.floors) return false; const pad = b.pads.find((p) => p.to === f); const p = __G.player; p.hidden = false; if (f === 0) p.setFloor(0, b.x, b.z, b); else p.setFloor(f, pad.lx, pad.lz, b); __G.rig.snap(b.x, f * 4, b.z, Math.max(b.w, b.d) * 0.62); return true; }, id, f);
    if (!ok) break;
    await waitGame(page, 0.3);
    await page.screenshot({ path: `shots/pt_${id}_${f}.png` });
  }
  // Blackmail flow.
  const bm = await page.evaluate((id) => { const G = __G, b = G.buildings[id]; G.player.frozen = false; G.state.secrets[id] = true; G.emit('blackmail', b); for (const s of G.cine.cur?.seq.shots || []) s.dur = 0.2; return 'ok'; }, id);
  await waitGame(page, id === 'palace' ? 1.5 : 1);
  if (id === 'palace') {
    await page.evaluate(() => { const c = __G.cine; if (c.cur) for (const s of c.cur.seq.shots) s.dur = 0.2; });
    await page.waitForFunction(() => !document.getElementById('endcard').classList.contains('hidden'), { timeout: 240000 }).catch(() => log('[palace] BUG end card never shown'));
    await page.screenshot({ path: 'shots/pt_endcard.png' });
  }
  const st = await page.evaluate((id) => `hijacked=${!!__G.state.hijacked[id]} clout=${__G.state.clout} won=${!!__G.state.won}`, id);
  log(`[${id}] blackmail: ${st}`);
  await page.close();
}
log('DONE');
await browser.close(); server.close();
