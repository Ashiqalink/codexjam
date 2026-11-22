// Scripted checks, run with ?test. Results go to console and to the on-screen error panel.
import { G } from '../core/game.js';
import { input } from '../systems/input.js';
import { LAYOUT } from '../world/island.js';

// Wait in game time, so slow software rendering does not change results.
const wait = (s) => new Promise((r) => { const t0 = G.time; const f = () => (G.time - t0 >= s ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });
const frames = (n) => new Promise((r) => { let k = 0; const f = () => (++k >= n ? r() : requestAnimationFrame(f)); requestAnimationFrame(f); });

export async function runTests() {
  const out = [];
  const ok = (name, cond, info = '') => { out.push(`${cond ? 'PASS' : 'FAIL'} ${name} ${info}`); };
  const p = G.player;
  const tapE = async () => { input._press('KeyE'); await frames(2); input._release('KeyE'); await frames(1); };

  // 1. Movement: holding W moves the player and walls stop him.
  const x0 = p.x, z0 = p.z;
  input._press('KeyW'); await wait(0.6); input._release('KeyW'); await frames(10);
  ok('move: W moves player', Math.hypot(p.x - x0, p.z - z0) > 1.5, `(moved ${Math.hypot(p.x - x0, p.z - z0).toFixed(2)})`);

  // 2. Crate loot.
  const crate = G.interactables.find((it) => it.label?.() === 'Search crate' && it.enabled());
  p.setFloor(0, crate.x + 0.9, crate.z, null); await frames(3);
  const c0 = G.state.cash; await tapE();
  ok('loot: crate gives cash', G.state.cash > c0, `($${c0} -> $${G.state.cash})`);
  while (G.cine.active) await frames(5);

  // 3. Vault over the hull plank.
  const gate = (await import('../core/collision.js')).colliders.find((c) => c.vault);
  const [sx, sz] = LAYOUT.spawn;
  const dx = gate.cx - sx, dz = gate.cz - sz, d = Math.hypot(dx, dz);
  p.setFloor(0, gate.cx - (dx / d) * 0.75, gate.cz - (dz / d) * 0.75, null); await frames(3);
  input._press('Space'); await frames(2); input._release('Space'); await wait(0.8);
  const side = (p.x - gate.cx) * dx + (p.z - gate.cz) * dz;
  ok('vault: crosses the plank', side > 0, `(side ${side.toFixed(2)})`);

  // 4. Detection: stand in front of the beach guard.
  const bg = G.guards.find((g) => g.name === 'Beach Patrol');
  bg.state = 'patrol'; bg.meter = 0; bg.wait = 99;
  const fx = Math.sin(bg.facing), fz = Math.cos(bg.facing);
  p.crouch = false;
  p.setFloor(0, bg.x + fx * 4, bg.z + fz * 4, null);
  await wait(1.6);
  ok('detect: guard spots player in cone', bg.state === 'alert' || bg.meter > 0.8, `(state ${bg.state}, meter ${bg.meter.toFixed(2)})`);

  // 5. Cross-floor block: a guard on floor 1 never sees a player on floor 0 below him.
  const san = G.buildings.sanitation;
  const up = G.guards.find((g) => g.bld === san && g.floor === 1 && g.kind === 'guard');
  p.setFloor(0, up.x + Math.sin(up.facing) * 2, up.z + Math.cos(up.facing) * 2, san);
  ok('floors: guard on floor 1 cannot see floor 0', !up.canSee(p));

  // 6. Takedown from behind.
  bg.state = 'patrol'; bg.meter = 0; bg.wait = 99; bg.stun = 0;
  p.setFloor(0, bg.x - Math.sin(bg.facing) * 1.0, bg.z - Math.cos(bg.facing) * 1.0, null);
  p.facing = bg.facing;
  bg.update(0.001);
  bg.meter = 0; bg.state = 'patrol';
  p.attackCd = 0; p.tryAttack(); await frames(2);
  ok('takedown: behind unaware guard knocks out', bg.down);
  await wait(0.2);
  const drop = G.pickups[G.pickups.length - 1];
  if (drop) { const c1 = G.state.cash; p.setFloor(0, drop.x, drop.z, null); await frames(5); ok('cash: guard drop collected', G.state.cash > c1); }

  // 7. Stairs: stepping on the pad moves to floor 1.
  const pad = san.pads.find((q) => q.floor === 0);
  p.setFloor(0, pad.x, pad.z + 1.2, san); await frames(2);
  input._press('KeyW'); input._press('KeyD'); await wait(0.5); input._release('KeyW'); input._release('KeyD'); await frames(5);
  ok('stairs: pad sends player to floor 1', p.floor === 1, `(floor ${p.floor})`);
  ok('cutaway: floor 1 visible, roof hidden', san.view === 1 && !san.roof.visible && san.floorGroups[1].visible);

  // 8. Secret then blackmail.
  const dmv = G.buildings.dmv;
  p.setFloor(0, dmv.x + 9.3, dmv.z - 4.2, dmv);
  for (const g of G.guards) if (g.bld === dmv) { g.stun = 99; }
  await frames(3);
  await tapE();
  input._press('KeyE'); await wait(1.2); input._release('KeyE'); await frames(2);
  ok('secret: dossier found', !!G.state.secrets.dmv);
  while (G.cine.active) { input._press('Escape'); await frames(30); }
  const off = dmv.official;
  p.setFloor(0, off.x, off.z + 1.0, dmv); await frames(3);
  await tapE();
  ok('blackmail: DMV hijacked', !!G.state.hijacked.dmv, `(clout ${G.state.clout}%)`);
  ok('perk: detection doubled', G.detectMult === 2);
  while (G.cine.active) { input._press('Escape'); await frames(30); }
  ok('banner: unrolled after cinematic', dmv.banner.visible && dmv.banner.scale.y === 1);

  // 9. Locks: Tax Office is locked before the beach tier is done.
  ok('locks: tax office locked', !!G.buildings.tax.lockText() && !G.buildings.tax.doorCol.disabled);

  // 10. Shop: buying the chicken.
  G.state.cash = 100;
  const shopIt = G.interactables.find((it) => it.label?.().startsWith('Browse'));
  p.setFloor(0, shopIt.x, shopIt.z, null); await frames(3);
  await tapE();
  input._press('Digit1'); await frames(2); input._release('Digit1');
  ok('shop: bought rubber chicken', G.state.weapon === 'chicken' && G.state.cash === 80, `(cash ${G.state.cash})`);
  input._press('Escape'); await frames(3);

  const text = out.join('\n');
  console.log('TEST RESULTS\n' + text);
  document.getElementById('err').style.color = '#fff';
  document.getElementById('err').style.background = 'rgba(0,0,0,.7)';
  document.getElementById('err').textContent = text;
}
