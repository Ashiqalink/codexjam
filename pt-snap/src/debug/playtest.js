// Playtest helpers for the Tax Office, Propaganda Tower and Palace. Loaded from tools/playtest.mjs
// through a dynamic import in the page (dev server on a snapshot of src/). Not imported by the game.
import { G } from '../core/game.js';
import { CFG } from '../config.js';
import { input } from '../systems/input.js';
import { overlaps } from '../core/collision.js';

const R = CFG.playerRadius;
const yaw = (CFG.camYaw * Math.PI) / 180;
const FWD = [-Math.sin(yaw), -Math.cos(yaw)];
const RIGHT = [Math.cos(yaw), -Math.sin(yaw)];
const STEP = 0.3;
const wait = (s) => new Promise((r) => { const t0 = G.time; const f = () => (G.time - t0 >= s ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
const frames = (n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
const f2 = (v) => Math.round(v * 100) / 100;
const loc = (b, x, z) => `[${f2(x - b.x)},${f2(z - b.z)}]`;

function rep() {
  const r = { pass: [], fail: [], info: [] };
  r.ok = (c, pass, fail) => (c ? r.pass.push(pass) : r.fail.push(fail || pass));
  return r;
}

// ---- grid flood fill ----
const grids = new Map();
function grid(b, f) {
  const key = b.id + ':' + f;
  if (grids.has(key)) return grids.get(key);
  const nx = Math.floor((b.w - 0.4) / STEP) + 1, nz = Math.floor((b.d - 0.4) / STEP) + 1;
  const x0 = b.x - b.w / 2 + 0.2, z0 = b.z - b.d / 2 + 0.2;
  const blocked = new Uint8Array(nx * nz);
  for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) blocked[j * nx + i] = overlaps(x0 + i * STEP, z0 + j * STEP, R, f, b) ? 1 : 0;
  const g = { nx, nz, x0, z0, blocked, cx: (i) => x0 + i * STEP, cz: (j) => z0 + j * STEP };
  grids.set(key, g);
  return g;
}
function nearestFree(g, x, z, maxD = 1.5) {
  let best = -1, bd = maxD;
  for (let i = 0; i < g.nx; i++) for (let j = 0; j < g.nz; j++) {
    if (g.blocked[j * g.nx + i]) continue;
    const d = Math.hypot(g.cx(i) - x, g.cz(j) - z);
    if (d < bd) { bd = d; best = j * g.nx + i; }
  }
  return best;
}
function flood(g, start) {
  const seen = new Uint8Array(g.nx * g.nz), parent = new Int32Array(g.nx * g.nz).fill(-1);
  if (start < 0) return { seen, parent };
  const q = [start]; seen[start] = 1;
  for (let h = 0; h < q.length; h++) {
    const c = q[h], ci = c % g.nx, cj = (c / g.nx) | 0;
    for (let di = -1; di <= 1; di++) for (let dj = -1; dj <= 1; dj++) {
      if (!di && !dj) continue;
      const i = ci + di, j = cj + dj;
      if (i < 0 || j < 0 || i >= g.nx || j >= g.nz) continue;
      const n = j * g.nx + i;
      if (seen[n] || g.blocked[n]) continue;
      if (di && dj && (g.blocked[cj * g.nx + i] || g.blocked[j * g.nx + ci])) continue;
      seen[n] = 1; parent[n] = c; q.push(n);
    }
  }
  return { seen, parent };
}
function nearestSeen(g, seen, x, z, maxD) {
  let best = -1, bd = maxD;
  for (let i = 0; i < g.nx; i++) for (let j = 0; j < g.nz; j++) {
    const n = j * g.nx + i;
    if (!seen[n]) continue;
    const d = Math.hypot(g.cx(i) - x, g.cz(j) - z);
    if (d < bd) { bd = d; best = n; }
  }
  return best;
}
const cellXZ = (g, n) => [g.cx(n % g.nx), g.cz((n / g.nx) | 0)];
function pathTo(g, parent, n) {
  const p = [];
  for (let c = n; c >= 0; c = parent[c]) p.push(cellXZ(g, c));
  return p.reverse();
}

/** Where the player enters floor f: front door (floor 0) or the landing of each stair arriving there. */
function starts(b, f) {
  const s = [];
  if (f === 0) s.push({ name: 'door', x: b.x + (b.door?.x || 0), z: b.z + b.d / 2 - 1.5 });
  for (const pad of b.pads) if (pad.to === f) s.push({ name: `landing from floor ${pad.floor}`, x: pad.lx, z: pad.lz });
  return s;
}
function reachFrom(b, f) {
  const g = grid(b, f), ss = starts(b, f);
  const first = nearestFree(g, ss[0].x, ss[0].z);
  const res = flood(g, first);
  return { g, ...res, starts: ss, first };
}

// ---- input driving ----
const KEYS = ['KeyW', 'KeyS', 'KeyA', 'KeyD'];
function setKeys(fwd, right) {
  const want = { KeyW: fwd > 0, KeyS: fwd < 0, KeyD: right > 0, KeyA: right < 0 };
  for (const k of KEYS) { if (want[k]) input._press(k); else input._release(k); }
}
async function walkTo(tx, tz, maxT, stop = 0.3) {
  const p = G.player, t0 = G.time;
  while (G.time - t0 < maxT) {
    const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
    if (d < stop) break;
    let best = [0, 0], bs = -2;
    for (const f of [-1, 0, 1]) for (const r of [-1, 0, 1]) {
      if (!f && !r) continue;
      let ix = FWD[0] * f + RIGHT[0] * r, iz = FWD[1] * f + RIGHT[1] * r;
      const l = Math.hypot(ix, iz); ix /= l; iz /= l;
      const s = (ix * dx + iz * dz) / d;
      if (s > bs) { bs = s; best = [f, r]; }
    }
    setKeys(best[0], best[1]);
    await frames(1);
  }
  setKeys(0, 0);
  await frames(2);
  return Math.hypot(tx - p.x, tz - p.z);
}
async function walkPath(path, maxT) {
  const t0 = G.time;
  for (let i = 3; i < path.length + 3; i += 3) {
    const [x, z] = path[Math.min(i, path.length - 1)];
    await walkTo(x, z, Math.max(0.5, maxT - (G.time - t0)), 0.35);
    if (G.time - t0 > maxT) break;
  }
}

function speedCine() {
  const c = G.cine?.cur;
  if (c && !c.__fast) { c.__fast = true; for (const s of c.seq.shots) s.dur *= 0.04; }
}
async function drain(maxWallMs = 90000, until) {
  const t0 = performance.now();
  while ((G.cine?.active || (until && !until())) && performance.now() - t0 < maxWallMs) { speedCine(); await frames(2); }
}

function bGuards(b) { return G.guards.filter((g) => g.bld === b); }
function freeze(b) { for (const g of bGuards(b)) { g.update = () => {}; g.state = 'patrol'; g.meter = 0; } }
function thaw(b) { for (const g of bGuards(b)) { delete g.update; g.state = 'patrol'; g.meter = 0; } }
function prep() { G.state.hearts = 999; G.player.frozen = false; G.player.invuln = 99; }

// ---------------------------------------------------------------- exports
export async function door(bid) {
  const r = rep(), b = G.buildings[bid], p = G.player;
  prep();
  r.ok(b.lockText() === null, 'lockText() is null with unlock', `lockText() = ${JSON.stringify(b.lockText())}`);
  await frames(3);
  r.ok(b.doorCol.disabled === true, 'door collider disabled when unlocked', 'door collider still enabled while unlocked');
  const dx = b.x + b.door.x;
  p.setFloor(0, dx, b.z + b.d / 2 + 3, null);
  await frames(3);
  const left = await walkTo(dx, b.z + b.d / 2 - 2.5, 8, 0.4);
  r.ok(p.bld === b && p.z < b.z + b.d / 2 - 1.5, `walked in through the front door (end ${loc(b, p.x, p.z)})`, `could not walk in through front door: ended ${loc(b, p.x, p.z)}, bld=${p.bld?.id}, ${f2(left)} short`);
  return r;
}

export async function stairs(bid) {
  const r = rep(), b = G.buildings[bid], p = G.player;
  prep();
  for (const pad of b.pads) {
    const tag = `pad floor ${pad.floor}->${pad.to} at ${loc(b, pad.x, pad.z)}`;
    p.setFloor(pad.floor, pad.x, pad.z, b);
    await wait(0.5);
    const hit = p.floor === pad.to;
    r.ok(hit, `${tag} moves player`, `${tag} did NOT move player (floor ${p.floor})`);
    if (!hit) continue;
    const dl = Math.hypot(p.x - pad.lx, p.z - pad.lz);
    r.ok(dl < 0.5, `${tag} lands at ${loc(b, pad.lx, pad.lz)}`, `${tag} landed at ${loc(b, p.x, p.z)}, expected ${loc(b, pad.lx, pad.lz)}`);
    r.ok(!overlaps(pad.lx, pad.lz, R, pad.to, b), `${tag}: landing is free`, `${tag}: landing ${loc(b, pad.lx, pad.lz)} is INSIDE a collider on floor ${pad.to}`);
    await wait(1.0);
    r.ok(p.floor === pad.to, `${tag}: no bounce back`, `${tag}: player bounced to floor ${p.floor} right after landing`);
  }
  // Connectivity: every pad is reachable on foot from where the player enters its floor.
  for (let f = 0; f < b.floors; f++) {
    const rc = reachFrom(b, f);
    for (const pad of b.pads.filter((q) => q.floor === f)) {
      const n = nearestSeen(rc.g, rc.seen, pad.x, pad.z, 0.75);
      r.ok(n >= 0, `floor ${f}: pad at ${loc(b, pad.x, pad.z)} reachable on foot from ${rc.starts[0].name}`, `floor ${f}: pad at ${loc(b, pad.x, pad.z)} NOT reachable on foot from ${rc.starts[0].name}`);
    }
    for (const s of rc.starts.slice(1)) {
      const n = nearestSeen(rc.g, rc.seen, s.x, s.z, 0.5);
      r.ok(n >= 0, `floor ${f}: ${s.name} connected to ${rc.starts[0].name}`, `floor ${f}: ${s.name} at ${loc(b, s.x, s.z)} is cut off from ${rc.starts[0].name}`);
    }
  }
  // Real walk: door -> first ground-floor pad.
  const p0 = b.pads.find((q) => q.floor === 0);
  const rc = reachFrom(b, 0);
  const n = nearestSeen(rc.g, rc.seen, p0.x, p0.z, 0.6);
  if (n >= 0) {
    const [sx, sz] = cellXZ(rc.g, rc.first);
    p.setFloor(0, sx, sz, b); await frames(3);
    await walkPath(pathTo(rc.g, rc.parent, n), 25);
    await wait(0.6);
    r.ok(p.floor === 1, 'walked door -> ground stairs and climbed', `walking along flood path from door to stairs did not climb (floor ${p.floor}, at ${loc(b, p.x, p.z)})`);
  }
  return r;
}

export async function guards(bid, secs = 40) {
  const r = rep(), b = G.buildings[bid], p = G.player;
  prep();
  thaw(b);
  p.setFloor(0, -70, 20, null); // far away so nobody sees the player
  const gs = bGuards(b);
  for (const g of gs) g.reset();
  await frames(2);
  const st = gs.map((g) => ({ g, last: [g.x, g.z], idle: 0, moved: 0, riSeen: new Set([g.ri]), maxIdle: 0, wps: g.route.map(() => 1e9) }));
  const t0 = G.time; let tPrev = t0;
  while (G.time - t0 < secs) {
    await frames(1);
    const dt = G.time - tPrev; tPrev = G.time;
    for (const s of st) {
      const g = s.g, d = Math.hypot(g.x - s.last[0], g.z - s.last[1]);
      s.moved += d;
      if (d < 0.01 && g.wait <= 0 && g.state === 'patrol' && g.route.length > 1) { s.idle += dt; s.maxIdle = Math.max(s.maxIdle, s.idle); } else s.idle = 0;
      s.last = [g.x, g.z]; s.riSeen.add(g.ri);
      g.route.forEach(([x, z], i) => { s.wps[i] = Math.min(s.wps[i], Math.hypot(g.x - x, g.z - z)); });
    }
  }
  for (const s of st) {
    const g = s.g, tag = `${g.kind} "${g.name}" floor ${g.floor} route ${JSON.stringify(g.route.map(([x, z]) => [f2(x - b.x), f2(z - b.z)]))}`;
    const all = s.wps.every((d) => d < 0.6);
    const blockedWps = g.route.map(([x, z], i) => [i, x, z]).filter(([, x, z]) => overlaps(x, z, 0.35, g.floor, b));
    const missing = s.wps.map((d, i) => [d, i]).filter(([d]) => d >= 0.6).map(([d, i]) => `wp${i}(${f2(d)}m away)`);
    if (g.route.length === 1) { r.ok(s.moved < 100, `${tag}: single-point guard`); continue; }
    r.ok(s.moved > 5 && s.maxIdle < 3, `${tag}: moved ${f2(s.moved)}m, max idle ${f2(s.maxIdle)}s`, `${tag}: STUCK-ish: moved ${f2(s.moved)}m in ${secs}s, max idle ${f2(s.maxIdle)}s, now at ${loc(b, g.x, g.z)}`);
    r.ok(all, `${tag}: reached all waypoints`, `${tag}: did not reach ${missing.join(', ')} within ${secs}s`);
    if (blockedWps.length) r.fail.push(`${tag}: waypoint(s) inside colliders: ${blockedWps.map(([i, x, z]) => `wp${i}${loc(b, x, z)}`).join(', ')}`);
    // Straight legs between waypoints should be free (guards walk straight lines).
    for (let i = 0; i < g.route.length; i++) {
      const [ax, az] = g.route[i], [bx, bz] = g.route[(i + 1) % g.route.length];
      if (g.route.length === 2 && i === 1) break;
      const n = Math.ceil(Math.hypot(bx - ax, bz - az) / 0.2);
      for (let k = 0; k <= n; k++) {
        const x = ax + ((bx - ax) * k) / n, z = az + ((bz - az) * k) / n;
        if (overlaps(x, z, 0.3, g.floor, b)) { r.fail.push(`${tag}: leg wp${i}->wp${(i + 1) % g.route.length} blocked at ${loc(b, x, z)}`); break; }
      }
    }
  }
  for (const g of gs) g.reset();
  return r;
}

export async function reach(bid) {
  const r = rep(), b = G.buildings[bid], p = G.player;
  prep();
  freeze(b);
  const its = G.interactables.filter((it) => it.bld === b);
  for (let f = 0; f < b.floors; f++) {
    const rc = reachFrom(b, f);
    for (const it of its.filter((q) => q.floor === f)) {
      if (it.label?.() === '') continue; // door lock prompt
      const label = it.label?.() ?? '?';
      const n = nearestSeen(rc.g, rc.seen, it.x, it.z, it.r - 0.05);
      const tag = `floor ${f} "${label}" at ${loc(b, it.x, it.z)}`;
      if (n < 0) { r.fail.push(`${tag}: NOT reachable (no walkable cell within ${it.r}m)`); continue; }
      const kind = { 'Rifle through desk': 'desk', 'Crack safe': 'safe', 'Take the folder': 'dossier' }[label];
      if (!kind) { r.pass.push(`${tag}: reachable`); continue; }
      // Actually use it.
      const [cx, cz] = cellXZ(rc.g, n);
      p.setFloor(f, cx, cz, b); await frames(3);
      const cash0 = G.state.cash, sec0 = Object.keys(G.state.secrets).length;
      if (it.hold) { input._press('KeyE'); await wait(it.hold + 0.5); input._release('KeyE'); }
      else { input._press('KeyE'); await frames(2); input._release('KeyE'); await frames(2); }
      await drain(30000);
      const gained = G.state.cash - cash0;
      if (kind === 'dossier') r.ok(G.state.secrets[b.id] === true, `${tag}: reachable, gives secret`, `${tag}: reachable but E did not give secret (it.enabled=${it.enabled()}, locked=${it.locked?.()}, standing ${loc(b, cx, cz)})`);
      else r.ok(gained > 0, `${tag}: reachable, +$${gained}`, `${tag}: reachable but gave no cash (standing ${loc(b, cx, cz)}, locked=${it.locked?.()})`);
    }
  }
  // Official: reachable at both route points.
  const off = b.official;
  const rc = reachFrom(b, b.officialFloor);
  off.route.forEach(([x, z], i) => {
    const n = nearestSeen(rc.g, rc.seen, x, z, 1.5);
    r.ok(n >= 0, `official "${off.name}" route wp${i} ${loc(b, x, z)} reachable`, `official "${off.name}" route wp${i} ${loc(b, x, z)} NOT reachable by the player`);
  });
  thaw(b);
  return r;
}

export async function blackmail(bid) {
  const r = rep(), b = G.buildings[bid], p = G.player, off = b.official;
  prep();
  freeze(b);
  const s = G.state;
  s.hijacked[bid] = false;
  const clout0 = s.clout;
  s.secrets[bid] = true;
  const rc = reachFrom(b, b.officialFloor);
  // Cell near the official, not closer to another interactable.
  let best = -1, bs = -1e9;
  for (let n = 0; n < rc.seen.length; n++) {
    if (!rc.seen[n]) continue;
    const [x, z] = cellXZ(rc.g, n), d = Math.hypot(x - off.x, z - off.z);
    if (d > 1.4) continue;
    let other = 1e9;
    for (const it of G.interactables) if (it.bld === b && it.floor === b.officialFloor && it.label?.() !== '' && !/lackmail/.test(it.label?.() || '')) other = Math.min(other, Math.hypot(x - it.x, z - it.z));
    const sc = Math.min(other, 3) - d;
    if (sc > bs) { bs = sc; best = n; }
  }
  r.ok(best >= 0, 'standing spot found near official', 'no reachable spot within 1.4m of the official');
  if (best >= 0) {
    const [x, z] = cellXZ(rc.g, best);
    p.setFloor(b.officialFloor, x, z, b); await frames(3);
    const prompt = G.interactables.find((it) => it.bld === b && /lackmail/.test(it.label?.() || ''));
    r.info.push(`prompt: ${prompt?.label?.()} locked=${prompt?.locked?.()} enabled=${prompt?.enabled?.()}`);
    input._press('KeyE'); await frames(2); input._release('KeyE');
    await frames(3);
    r.ok(G.cine.active || s.hijacked[bid], 'pressing E near official starts blackmail', 'pressing E near official did not start the blackmail scene');
  }
  if (!s.hijacked[bid]) G.emit('blackmail', b);
  const wasReal = s.hijacked[bid];
  await drain(120000, bid === 'palace' ? () => !document.getElementById('endcard').classList.contains('hidden') : null);
  r.ok(s.hijacked[bid] === true, `hijacked.${bid} set`, `hijacked.${bid} not set`);
  r.ok(s.clout > clout0 || bid === 'palace', `clout ${clout0} -> ${s.clout}`, `clout did not increase (${clout0} -> ${s.clout})`);
  r.ok(b.banner.visible && b.banner.scale.y === 1, 'banner raised', 'banner not raised at the end');
  if (bid === 'palace') {
    const el = document.getElementById('endcard');
    const vis = !el.classList.contains('hidden') && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden';
    r.ok(vis, '#endcard visible after finale', '#endcard NOT visible after finale');
    r.ok(s.won === true, 'state.won set', 'state.won not set');
    r.info.push('endcard text: ' + el.innerText.replace(/\s+/g, ' ').slice(0, 300));
  }
  r.info.push(`state: hijacked=${JSON.stringify(s.hijacked)} clout=${s.clout} cash=${s.cash}`);
  return r;
}

/** Position the player centrally on floor f with a wide camera, ready for a screenshot. */
export async function shotSetup(bid, f) {
  const b = G.buildings[bid], p = G.player;
  prep();
  const rc = reachFrom(b, f);
  const n = nearestSeen(rc.g, rc.seen, b.x, b.z, 6);
  const [x, z] = cellXZ(rc.g, n >= 0 ? n : rc.first);
  p.setFloor(f, x, z, b);
  CFG.interiorSize = Math.max(b.w, b.d) * 0.75;
  G.rig.snap(p.x, p.y, p.z, CFG.interiorSize);
  await wait(0.7);
  return { x: f2(x - b.x), z: f2(z - b.z) };
}

