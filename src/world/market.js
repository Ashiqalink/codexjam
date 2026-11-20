import * as THREE from 'three/webgpu';
import { G, addCash } from '../core/game.js';
import { Batch, rng, signMesh } from '../core/batch.js';
import { WEAPONS } from '../config.js';
import { LAYOUT } from './island.js';
import { stall, palm, lamp, bench, barrel, crate, Xf, CYL12 } from './props.js';
import { register } from './interactive.js';
import { Npc, randomLook } from '../entities/npc.js';
import { HAIR_STYLES, OUTFITS } from '../entities/character.js';
import { makeDumpster } from './building.js';

/** Beach market: noisy, crowded, where the money goes. Buyables are PROPOSED in DESIGN.md. */
export function buildMarket(scene) {
  const [cx, cz] = LAYOUT.market;
  const b = new Batch();
  const rnd = rng(99);

  // Paved plaza.
  b.add(CYL12, '#e9d3a6', [cx, 0.02, cz], [0, 0, 0], [15, 0.04, 15]);
  b.add(CYL12, '#dcc08c', [cx, 0.03, cz], [0, 0, 0], [5, 0.04, 5]);

  // Ring of stalls facing the centre.
  const awnings = [['#d9412b', '#fff4d6'], ['#2f6d94', '#fff4d6'], ['#3f9e4f', '#ffd23f'], ['#f2a33a', '#fff4d6'], ['#b05bd6', '#fff4d6'], ['#d9412b', '#ffd23f'], ['#2f6d94', '#ffd23f'], ['#e86a92', '#fff4d6']];
  const goods = ['fruit', 'fish', 'cloth', 'fruit', 'cloth', 'fish', 'fruit', 'fruit'];
  const spots = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const x = cx + Math.cos(a) * 10.5, z = cz + Math.sin(a) * 10.5;
    const rot = Math.atan2(cx - x, cz - z);
    spots.push({ x, z, rot, a });
    if (i === 2 || i === 5 || i === 6 || i === 7) continue; // special shops below
    stall(b, x, z, rot, awnings[i], goods[i], rnd);
    vendorAt(x, z, rot, rnd);
  }

  // Weapon stall.
  const ws = spots[2];
  stall(b, ws.x, ws.z, ws.rot, ['#2a1a12', '#ffd23f'], 'none', rnd, false);
  const wt = new Xf(b, ws.x, ws.z, ws.rot);
  wt.box(-0.9, 1.0, 0.5, 0.5, 0.12, 0.2, '#ffd23f');      // chicken
  wt.box(0.0, 1.0, 0.5, 1.0, 0.1, 0.12, '#d9a441');        // baguette
  wt.box(0.9, 1.0, 0.5, 0.5, 0.5, 0.06, '#9c9c9c');        // chair
  vendorAt(ws.x, ws.z, ws.rot, rnd, { shirt: '#2a1a12', glasses: true, hat: '#2a1a12' });
  shopSign(ws, 'NOT GUNS');
  register({ ...front(ws), r: 2.2, label: () => 'Browse: melee "goods"', use: () => openWeapons() });

  // Barber.
  const bs = spots[5];
  stall(b, bs.x, bs.z, bs.rot, ['#d9412b', '#fff4d6'], 'none', rnd, false);
  const bt = new Xf(b, bs.x, bs.z, bs.rot);
  for (let i = 0; i < 6; i++) bt.box(1.7, i * 0.4, 0.9, 0.2, 0.4, 0.2, i % 2 ? '#d9412b' : '#f6f1e9');
  bt.box(0, 0, 1.8, 0.8, 0.5, 0.8, '#2f6d94');
  vendorAt(bs.x, bs.z, bs.rot, rnd, { shirt: '#f6f1e9', mustache: '#1b120d', hairStyle: 4 });
  shopSign(bs, 'BARBER');
  register({ ...front(bs), r: 2.2, label: () => 'Get a haircut', use: () => openBarber() });

  // Tailor.
  const ts = spots[6];
  stall(b, ts.x, ts.z, ts.rot, ['#b05bd6', '#fff4d6'], 'cloth', rnd, false);
  vendorAt(ts.x, ts.z, ts.rot, rnd, { shirt: '#b05bd6', tie: '#ffd23f' });
  shopSign(ts, 'TAILOR');
  register({ ...front(ts), r: 2.2, label: () => 'Change outfit', use: () => openTailor() });

  // Coconut stand (heals).
  const cs = spots[7];
  stall(b, cs.x, cs.z, cs.rot, ['#3f9e4f', '#fff4d6'], 'fruit', rnd, false);
  vendorAt(cs.x, cs.z, cs.rot, rnd, { shirt: '#3f9e4f' });
  shopSign(cs, 'COCONUTS');
  register({ ...front(cs), r: 2.2, label: () => 'Buy coconut water ($5, +1 heart)', use: () => buyCoconut() });

  // Clutter.
  for (let i = 0; i < 6; i++) {
    const a = rnd() * Math.PI * 2, r = 4 + rnd() * 3;
    if (rnd() < 0.5) crate(b, cx + Math.cos(a) * r, cz + Math.sin(a) * r, 0.6, rnd());
    else barrel(b, cx + Math.cos(a) * r, cz + Math.sin(a) * r);
  }
  lamp(b, cx + 3, cz);
  lamp(b, cx - 3, cz);
  bench(b, cx, cz + 4, 0);
  for (const a of [0.9, 2.6, 4.2, 5.6]) palm(b, cx + Math.cos(a) * 16, cz + Math.sin(a) * 16, rnd);
  makeDumpster(b, cx + 15, cz - 6, 0.9);

  scene.add(b.build());

  // Crowd.
  for (let i = 0; i < 12; i++) {
    const a = rnd() * Math.PI * 2, r = rnd() * 7;
    new Npc({ x: cx + Math.cos(a) * r, z: cz + Math.sin(a) * r, mode: 'wander', area: { x1: cx - 8, x2: cx + 8, z1: cz - 8, z2: cz + 8 }, look: randomLook(rnd) });
  }
  // Village strollers.
  const [vx, vz] = LAYOUT.village;
  for (let i = 0; i < 6; i++) new Npc({ x: vx + (rnd() - 0.5) * 10, z: vz + (rnd() - 0.5) * 6, mode: 'wander', area: { x1: vx - 9, x2: vx + 9, z1: vz - 1, z2: vz + 5 }, look: randomLook(rnd) });

  function vendorAt(x, z, rot, r, extra = {}) {
    const back = -1.3;
    new Npc({ x: x + Math.sin(rot) * back, z: z + Math.cos(rot) * back, facing: rot, look: { ...randomLook(r), ...extra } });
  }
  function front(s) { return { x: s.x + Math.sin(s.rot) * 1.6, z: s.z + Math.cos(s.rot) * 1.6 }; }
  function shopSign(s, text) {
    const m = signMesh(text, 2.6, 0.7, { bg: '#ffd23f', fg: '#2a1a12' });
    m.position.set(s.x + Math.sin(s.rot) * 1.3, 3.1, s.z + Math.cos(s.rot) * 1.3);
    m.rotation.y = s.rot;
    scene.add(m);
  }
}

// ---------------- Shops ----------------
function price(p) { return Math.round(p * G.priceMult); }

function openWeapons() {
  const items = Object.entries(WEAPONS).filter(([k]) => k !== 'fists').map(([k, w]) => ({
    name: w.name, desc: w.desc, price: price(w.price), owned: !!G.state.owned[k], equipped: G.state.weapon === k,
    buy() {
      if (G.state.owned[k]) { G.state.weapon = k; G.emit('weapon'); return 'Equipped.'; }
      if (G.state.cash < price(w.price)) return 'Not enough cash.';
      addCash(-price(w.price)); G.emit('buy'); G.state.owned[k] = true; G.state.weapon = k; G.emit('weapon');
      return `Bought the ${w.name}.`;
    },
  }));
  G.hud.openShop('MELEE "GOODS"', items);
}

function openBarber() {
  const items = HAIR_STYLES.map((name, i) => ({
    name, desc: i === 5 ? 'Aerodynamic.' : '', price: 10, owned: G.state.hair === i, equipped: G.state.hair === i,
    buy() {
      if (G.state.hair === i) return 'You already look like that.';
      if (G.state.cash < 10) return 'Not enough cash.';
      addCash(-10); G.emit('buy'); G.state.hair = i; G.player.buildMesh(); return 'Fresh.';
    },
  }));
  G.hud.openShop('BARBER', items);
}

function openTailor() {
  const items = OUTFITS.map((o, i) => ({
    name: o.name, desc: '', price: 15, owned: G.state.outfit === i, equipped: G.state.outfit === i,
    buy() {
      if (G.state.outfit === i) return 'Already wearing it.';
      if (G.state.cash < 15) return 'Not enough cash.';
      addCash(-15); G.emit('buy'); G.state.outfit = i; G.player.buildMesh(); return 'Dressed for success.';
    },
  }));
  G.hud.openShop('TAILOR', items);
}

function buyCoconut() {
  if (G.state.hearts >= 3) { G.hud.toast('You are fine.', 'Hydrated enough.'); return; }
  if (G.state.cash < 5) { G.hud.toast('Not enough cash.'); return; }
  addCash(-5); G.emit('buy'); G.state.hearts++; G.emit('hearts'); G.hud.toast('+1 heart', 'Refreshing.');
}
