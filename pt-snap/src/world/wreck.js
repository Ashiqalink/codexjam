import * as THREE from 'three/webgpu';
import { G } from '../core/game.js';
import { Batch, BOX } from '../core/batch.js';
import { addBox } from '../core/collision.js';
import { LAYOUT, insideIsland } from './island.js';
import { Xf, rock, palm, crate, plank, barrel, bush, CYL8, CYL6 } from './props.js';
import { makeLoot } from './interactive.js';
import { Guard } from '../entities/guard.js';
import { place } from '../core/instancer.js';
import { instance } from '../core/assets.js';

/** Hull built from boxes; `broken` drops the stern and tears the deck. */
function hull(b, x, z, rot, tilt, broken) {
  const t = new Xf(b, x, z, rot);
  const r = [0, 0, tilt];
  t.add(BOX, '#9c3b2e', [0, 0.4, 0], r, [3.2, 2.2, 14]);
  t.add(BOX, '#f2efe6', [0, 1.6, 0], r, [3.25, 0.4, 14.05]);
  t.add(BOX, '#b88a5a', [0, 1.85, 0], r, [2.9, 0.12, 13.6]);
  t.add(BOX, '#e8e2d0', [0, 2.8, -3], r, [2.4, 1.8, 3]);
  t.add(BOX, '#9c3b2e', [0, 3.8, -3], r, [2.6, 0.2, 3.2]);
  t.add(BOX, '#2a1a12', [1.0, 2.8, -3], r, [0.5, 0.5, 2.6]);
  t.add(CYL6, '#6e4a2c', [0.4, 5.2, 1.5], [0, 0, tilt + (broken ? 0.4 : 0)], [0.13, 6, 0.13]);
  t.add(BOX, '#f6f1e9', [1.2, 5.5, 1.5], [0, 0, tilt + (broken ? 0.4 : 0)], [0.05, 3, 2.2]);
  t.add(BOX, '#9c3b2e', [0, 0.4, 7.4], [0.3, 0.8, tilt], [2.6, 1.8, 2.2]);
  if (broken) {
    t.add(BOX, '#7d2f25', [1.5, -0.2, 10.5], [0.5, 0.4, 0.9], [2.6, 1.6, 3.2]);
    t.add(BOX, '#b88a5a', [0.8, 1.6, 5.5], [0.4, 0.2, tilt], [2.0, 0.12, 1.4]);
  }
}

export function buildWreck(scene) {
  const b = new Batch();
  const [wx, wz] = LAYOUT.wreck;
  const [sx, sz] = LAYOUT.spawn;
  const [mx, mz] = LAYOUT.market;

  // The SS Opportunity, run aground and broken.
  const outward = Math.atan2(wx - sx, wz - sz);
  if (!place('shipwreck', wx, -0.9, wz, outward + 1.2, 1, [0.12, -0.3])) hull(b, wx, wz, outward + 1.2, -0.5, true);

  // Exit faces the market. Rocks ring the landing spot; a fallen hull plank fills the gap.
  const dx = mx - sx, dz = mz - sz, dl = Math.hypot(dx, dz);
  const dir = [dx / dl, dz / dl];
  const perp = [-dir[1], dir[0]];
  const R = 9.5;
  const dirA = Math.atan2(dir[1], dir[0]);
  const rnd = mulberry(7);
  for (let a = 0; a < Math.PI * 2; a += 0.13) {
    let da = a - dirA; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
    if (Math.abs(da) < 0.23) continue;
    const x = sx + Math.cos(a) * R, z = sz + Math.sin(a) * R;
    if (!insideIsland(x, z, -4)) continue;
    rock(b, x, z, 0.75 + rnd() * 0.35, rnd);
  }
  const gx = sx + dir[0] * R, gz = sz + dir[1] * R;
  const gateRot = Math.atan2(-perp[1], perp[0]);
  const gt = new Xf(b, gx, gz, gateRot);
  gt.box(0, 0, 0, 4.6, 0.85, 0.55, '#9c3b2e');
  gt.box(0, 0.85, 0, 4.7, 0.12, 0.6, '#f2efe6');
  gt.add(BOX, '#b88a5a', [1.2, 0.95, 0.1], [0, 0.2, 0.1], [1.6, 0.08, 0.5]);
  addBox(gx, gz, 2.3, 0.28, gateRot, { vault: true, sight: false, h: 0.9 });

  // Debris inside the landing spot.
  const at = (u, v) => [sx + dir[0] * u + perp[0] * v, sz + dir[1] * u + perp[1] * v];
  for (const [u, v, r] of [[1, 3, 0.4], [-2.5, -1.5, 1.2], [3, -3.5, 2], [-1, -4, 0.3]]) plank(b, ...at(u, v), r);
  barrel(b, ...at(-3.5, 2.5), false);
  crate(b, ...at(-4.5, -3), 0.8, 0.5);
  b.box(...[at(1.6, -1.2)].flatMap(([x, z]) => [x, 0, z]), 0.8, 0.22, 0.55, '#2f6d94', 0.4);
  for (const [u, v, c] of [[2.2, -1.8, '#e86a92'], [2.5, -0.6, '#ffffff'], [1.0, -2.2, '#f2c14e']]) {
    const [x, z] = at(u, v); b.box(x, 0, z, 0.45, 0.04, 0.35, c, u);
  }
  palm(b, ...at(-2, 5.5), rnd);
  palm(b, ...at(1.5, 6), rnd);

  // Three crates with the starting cash (tutorial step 1).
  makeLoot({ kind: 'crate', cash: 15, ...xz(at(2.5, 2)), rot: 0.4 });
  makeLoot({ kind: 'crate', cash: 15, ...xz(at(-3, 0.5)), rot: 1.1 });
  makeLoot({ kind: 'crate', cash: 10, ...xz(at(0.5, -5)), rot: 0.2 });

  // Beyond the plank: cover for the crouch lesson, then the beach patrol.
  const out = (u, v) => [gx + dir[0] * u + perp[0] * v, gz + dir[1] * u + perp[1] * v];
  bush(b, ...out(3, -2.2), 0.9, rnd);
  bush(b, ...out(3.5, 2.5), 0.8, rnd);
  crate(b, ...out(6, 0.8), 0.8, 0.3);
  crate(b, ...out(6.4, 1.6), 0.6, 1.0);
  bush(b, ...out(9.5, -1.5), 1.0, rnd);
  const p1 = out(8, -7), p2 = out(8, 7);
  const guard = new Guard({ x: p1[0], z: p1[1], route: [p1, p2], wait: 2.2, name: 'Beach Patrol', cash: 12 });
  guard.facing = Math.atan2(p2[0] - p1[0], p2[1] - p1[1]);

  scene.add(b.build());

  // Intro-only: the intact ship out at sea in the storm.
  let ship = instance('shipwreck');
  if (!ship) { const sb = new Batch(); hull(sb, 0, 0, 0, 0, false); ship = sb.build(); }
  ship.position.set(wx + (wx - sx) * 1.5, -0.2, wz + (wz - sz) * 1.5);
  ship.rotation.set(0, outward + 1.3, THREE.MathUtils.degToRad(-20));
  ship.visible = false;
  scene.add(ship);

  return { ship, gate: [gx, gz], dir, guard, exitPoint: out(14, 0) };
}

function xz([x, z]) { return { x, z }; }
function mulberry(seed) { return function () { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
