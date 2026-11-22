import * as THREE from 'three/webgpu';
import { Batch, BOX, rng } from '../core/batch.js';
import { addBox } from '../core/collision.js';
import { PALETTE as P } from '../config.js';
import * as pr from './props.js';

// ---------------- Island shape ----------------
export function shoreR(theta) {
  return 100 + 6 * Math.sin(3 * theta + 0.5) + 4 * Math.sin(5 * theta + 1.3) + 2.5 * Math.sin(9 * theta + 2);
}
/** Point at compass-ish angle (deg, atan2(z,x) convention; 90 = south, -90 = north), `inset` units inland. */
export function shorePoint(deg, inset) {
  const t = (deg * Math.PI) / 180;
  const r = shoreR(t) - inset;
  return [Math.cos(t) * r, Math.sin(t) * r];
}
export function insideIsland(x, z, margin = 1.2) {
  return Math.hypot(x, z) < shoreR(Math.atan2(z, x)) - margin;
}
export function clampToIsland(x, z, margin = 1.2) {
  const t = Math.atan2(z, x);
  const lim = shoreR(t) - margin;
  const d = Math.hypot(x, z);
  if (d <= lim) return [x, z];
  return [(x / d) * lim, (z / d) * lim];
}

// ---------------- Layout (DESIGN.md section 3) ----------------
const wreckAt = shorePoint(130, -6);
const spawnAt = shorePoint(132, 7);
export const LAYOUT = {
  wreck: wreckAt,
  spawn: spawnAt,
  market: shorePoint(103, 30),
  sanitation: shorePoint(158, 34),
  dmv: shorePoint(66, 34),
  bar: shorePoint(40, 9),
  village: [0, 8],
  tax: [-46, -14],
  tower: [46, -16],
  palace: [0, -62],
  lighthouse: shorePoint(-138, 9),
  cove: shorePoint(-5, 7),
};

function shapeFrom(fn, steps = 160) {
  const s = new THREE.Shape();
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2;
    const r = fn(t);
    const x = Math.cos(t) * r, z = Math.sin(t) * r;
    if (i === 0) s.moveTo(x, -z); else s.lineTo(x, -z);
  }
  return s;
}
function flat(shape, color, y, receive = true) {
  const g = new THREE.ShapeGeometry(shape, 1);
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.95 }));
  m.position.y = y;
  m.receiveShadow = receive;
  return m;
}

// Areas kept free of random scatter.
const reserved = [];
function reserve(x, z, r) { reserved.push([x, z, r]); }
function isFree(x, z, r = 1) {
  for (const [rx, rz, rr] of reserved) if (Math.hypot(x - rx, z - rz) < rr + r) return false;
  return true;
}

function road(b, pts, w = 3.2) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [x1, z1] = pts[i], [x2, z2] = pts[i + 1];
    const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
    const rot = Math.atan2(-dz, dx);
    b.add(BOX, P.road, [(x1 + x2) / 2, 0.03, (z1 + z2) / 2], [0, rot, 0], [len + w * 0.6, 0.04, w]);
    b.add(pr.CYL12, P.road, [x2, 0.03, z2], [0, 0, 0], [w / 2 + 0.3, 0.04, w / 2 + 0.3]);
    // keep scatter off the road
    for (let k = 0; k <= len; k += 4) reserve(x1 + (dx * k) / len, z1 + (dz * k) / len, w / 2 + 0.8);
  }
}

export function buildIsland(scene) {
  // Ground layers: deep water, shallows, foam, wet sand, sand, grass.
  const water = new THREE.Mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshStandardMaterial({ color: P.deep, roughness: 0.4 }));
  water.rotation.x = -Math.PI / 2; water.position.y = -0.3; water.receiveShadow = true;
  scene.add(water);
  scene.add(flat(shapeFrom((t) => shoreR(t) + 10), P.shallow, -0.2));
  scene.add(flat(shapeFrom((t) => shoreR(t) + 0.7), P.foam, -0.09));
  scene.add(flat(shapeFrom((t) => shoreR(t)), P.wet, -0.06));
  scene.add(flat(shapeFrom((t) => shoreR(t) - 2), P.sand, -0.03));
  scene.add(flat(shapeFrom((t) => shoreR(t) - 17 + 3 * Math.sin(7 * t)), P.grass, 0.0));

  const rnd = rng(1337);
  const b = new Batch();
  const L = LAYOUT;

  // Reserve the hand-placed zones.
  reserve(...L.spawn, 12); reserve(...L.wreck, 14);
  reserve(...L.market, 18); reserve(...L.sanitation, 15); reserve(...L.dmv, 15);
  reserve(...L.tax, 14); reserve(...L.tower, 13); reserve(...L.palace, 26);
  reserve(...L.village, 22); reserve(...L.bar, 8); reserve(...L.lighthouse, 5); reserve(...L.cove, 8);

  // Roads.
  const mk = L.market;
  road(b, [shorePoint(130, 18), [mk[0] - 10, mk[1] + 2], mk]);
  road(b, [mk, [mk[0] + 18, mk[1] - 6], [L.dmv[0] - 4, L.dmv[1] + 12]]);
  road(b, [mk, [mk[0] - 20, mk[1] - 8], [L.sanitation[0] + 10, L.sanitation[1] + 12]]);
  road(b, [mk, [mk[0] + 2, mk[1] - 22], [L.village[0], L.village[1] + 14]]);
  road(b, [[L.village[0] - 12, L.village[1]], [L.tax[0] + 4, L.tax[1] + 12]]);
  road(b, [[L.village[0] + 12, L.village[1]], [L.tower[0] - 4, L.tower[1] + 12]]);
  road(b, [[L.village[0], L.village[1] - 12], [0, -30]], 4);
  road(b, [[L.dmv[0] + 6, L.dmv[1] + 6], [L.bar[0] - 6, L.bar[1] - 4]]);

  // Village: houses, church, water tower, plaza.
  const v = L.village;
  pr.church(b, v[0] - 14, v[1] - 6, 0.2);
  pr.waterTower(b, v[0] + 15, v[1] - 9);
  const houseSpots = [[-10, 9, 0.1], [-4, 14, -0.15], [6, 12, 0.3], [12, 6, -0.4], [16, 14, 0.2], [-16, 12, 0.5], [9, -4, 1.6], [-7, -14, -0.2], [20, -2, 1.2], [-20, 2, -1.3]];
  for (const [hx, hz, r] of houseSpots) pr.house(b, v[0] + hx, v[1] + hz, r, rnd);
  for (let i = 0; i < 5; i++) pr.flowers(b, v[0] - 8 + i * 4, v[1] + 3, rnd);
  pr.bench(b, v[0] + 3, v[1] + 2, 0);
  pr.bench(b, v[0] - 3, v[1] + 2, 0);
  pr.lamp(b, v[0], v[1] + 4);
  // Fountain
  b.add(new THREE.CylinderGeometry(1, 1, 1, 12), '#d8c7a5', [v[0], 0.3, v[1] - 2], [0, 0, 0], [2.2, 0.6, 2.2]);
  b.add(new THREE.CylinderGeometry(1, 1, 1, 12), P.shallow, [v[0], 0.62, v[1] - 2], [0, 0, 0], [1.9, 0.05, 1.9]);
  b.add(new THREE.CylinderGeometry(1, 1, 1, 8), '#d8c7a5', [v[0], 1, v[1] - 2], [0, 0, 0], [0.3, 1.4, 0.3]);
  addBox(v[0], v[1] - 2, 2.1, 2.1, 0, { sight: false, h: 0.6, vault: false });

  // Shacks along the beach between zones.
  for (const [deg, r] of [[85, 0.2], [118, -0.3], [145, 0.5], [50, -0.6], [25, 0.9], [175, -1.2]]) {
    const [sx, sz] = shorePoint(deg, 20);
    if (isFree(sx, sz, 3)) { pr.shack(b, sx, sz, r + Math.PI / 2 - (deg * Math.PI) / 180, rnd); reserve(sx, sz, 3); }
  }

  // Beach bar and pier (optional area, decoration for now).
  const [bx, bz] = L.bar;
  pr.shack(b, bx, bz, -0.6, rnd);
  pr.bench(b, bx + 2.5, bz + 2.5, -0.6);
  for (let i = 0; i < 3; i++) {
    b.add(new THREE.CylinderGeometry(1, 1, 1, 8), '#b98a5a', [bx - 3 + i * 1.4, 0.4, bz + 3.2], [0, 0, 0], [0.25, 0.8, 0.25]);
  }
  const p1 = shorePoint(36, 2), p2 = shorePoint(36, -16);
  pr.pier(b, ...p1, ...p2);
  const pb = shorePoint(33, -12);
  pr.boat(b, pb[0], pb[1], 0.4, '#d9412b');

  // Lighthouse.
  pr.lighthouse(b, ...L.lighthouse);
  for (let i = 0; i < 6; i++) pr.rock(b, L.lighthouse[0] + (rnd() - 0.5) * 8, L.lighthouse[1] + (rnd() - 0.5) * 8, 0.5 + rnd(), rnd);

  // Hidden cove: rocks and a small second wreck.
  const cv = L.cove;
  for (let i = 0; i < 10; i++) {
    const a = rnd() * Math.PI * 2, rr = 5 + rnd() * 3;
    pr.rock(b, cv[0] + Math.cos(a) * rr, cv[1] + Math.sin(a) * rr, 0.8 + rnd() * 1.2, rnd);
  }
  pr.boat(b, cv[0] + 4, cv[1] + 1, 1.2, '#7c8c8f');

  // Scatter nature over the free land.
  let palms = 0;
  for (let i = 0; i < 2600 && palms < 230; i++) {
    const a = rnd() * Math.PI * 2;
    const r = Math.sqrt(rnd()) * 100;
    const x = Math.cos(a) * r, z = Math.sin(a) * r;
    if (!insideIsland(x, z, 4) || !isFree(x, z, 1.5)) continue;
    const coast = shoreR(a) - r < 18;
    const roll = rnd();
    if (roll < (coast ? 0.55 : 0.3)) { pr.palm(b, x, z, rnd); palms++; reserve(x, z, 1.4); }
    else if (roll < 0.62) { pr.bush(b, x, z, 0.5 + rnd() * 0.6, rnd); reserve(x, z, 1.2); }
    else if (roll < 0.74) { pr.rock(b, x, z, 0.3 + rnd() * 1.1, rnd); reserve(x, z, 1.5); }
    else if (!coast && roll < 0.84) pr.flowers(b, x, z, rnd);
  }

  scene.add(b.build());
}
