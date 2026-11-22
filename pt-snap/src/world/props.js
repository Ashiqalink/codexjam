import * as THREE from 'three/webgpu';
import { BOX } from '../core/batch.js';
import { addBox, addCircle } from '../core/collision.js';
import { PALETTE as P } from '../config.js';
import { place, footprint } from '../core/instancer.js';

const CYL6 = new THREE.CylinderGeometry(1, 1, 1, 6);
const CYL8 = new THREE.CylinderGeometry(1, 1, 1, 8);
const CYL12 = new THREE.CylinderGeometry(1, 1, 1, 12);
const CONE4 = new THREE.ConeGeometry(1, 1, 4);
const CONE8 = new THREE.ConeGeometry(1, 1, 8);
const DODE = new THREE.DodecahedronGeometry(1, 0);
const ICO = new THREE.IcosahedronGeometry(1, 0);
const SPH = new THREE.SphereGeometry(1, 6, 4);
const LEAF = new THREE.BoxGeometry(1, 1, 1).translate(0.5, 0, 0);

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _e = new THREE.Euler();

/** Local transform helper: place parts relative to an origin and Y rotation. */
export class Xf {
  constructor(b, ox, oz, rot = 0, oy = 0) { this.b = b; this.ox = ox; this.oz = oz; this.oy = oy; this.rot = rot; this.c = Math.cos(rot); this.s = Math.sin(rot); }
  w(lx, lz) { return [this.ox + lx * this.c + lz * this.s, this.oz - lx * this.s + lz * this.c]; }
  add(geo, color, [lx, ly, lz], [rx, ry, rz] = [0, 0, 0], scale = 1) {
    const [x, z] = this.w(lx, lz);
    _q.setFromEuler(_e.set(0, this.rot, 0));
    _q2.setFromEuler(_e.set(rx, ry, rz));
    _q.multiply(_q2);
    _e.setFromQuaternion(_q);
    this.b.add(geo, color, [x, ly + this.oy, z], [_e.x, _e.y, _e.z], scale);
    return this;
  }
  box(lx, ly, lz, w, h, d, color, ry = 0) { return this.add(BOX, color, [lx, ly + h / 2, lz], [0, ry, 0], [w, h, d]); }
}

// ---------------- Nature ----------------

export function palm(b, x, z, rnd, h = 3.2 + rnd() * 1.2, collide = true) {
  if (place('palm', x, 0, z, rnd() * Math.PI * 2, h / 4.2)) { if (collide) addCircle(x, z, 0.3, { sight: false, h: 3 }); return; }
  const lean = (rnd() - 0.5) * 0.5;
  const dir = rnd() * Math.PI * 2;
  const t = new Xf(b, x, z, dir);
  const segs = 5;
  let px = 0, py = 0;
  for (let i = 0; i < segs; i++) {
    const sh = h / segs;
    t.add(CYL6, i % 2 ? P.trunk : '#9b6f4a', [px, py + sh / 2, 0], [0, 0, -lean * 0.6], [0.17 - i * 0.012, sh, 0.17 - i * 0.012]);
    px += Math.sin(lean) * sh * 0.6; py += sh;
  }
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rnd() * 0.3;
    t.add(LEAF, i % 2 ? P.leafDark : P.leaf, [px, py, 0], [0, a, -0.45 - rnd() * 0.25], [1.7, 0.06, 0.45]);
  }
  t.add(SPH, '#6b4a2a', [px, py - 0.1, 0.1], [0, 0, 0], 0.16);
  t.add(SPH, '#6b4a2a', [px + 0.12, py - 0.12, -0.08], [0, 0, 0], 0.15);
  if (collide) addCircle(x, z, 0.3, { sight: false, h: 3 });
}

export function rock(b, x, z, s, rnd, collide = true) {
  if (place('rock', x, -s * 0.1, z, rnd() * 6.28, s * 1.05)) { if (collide && s > 0.4) addCircle(x, z, s * 0.85, { sight: s > 1.0, h: s }); return; }
  b.add(DODE, rnd() < 0.5 ? P.rock : '#7f807b', [x, s * 0.35, z], [rnd() * 3, rnd() * 3, 0], [s, s * 0.75, s]);
  if (collide && s > 0.4) addCircle(x, z, s * 0.85, { sight: s > 1.0, h: s });
}

export function bush(b, x, z, s, rnd) {
  if (place('bush', x, 0, z, rnd() * 6.28, s * 1.3)) { if (s > 0.6) addCircle(x, z, s * 0.8, { sight: false, h: s }); return; }
  const c = rnd() < 0.5 ? '#4caf50' : '#5cbf5a';
  b.add(ICO, c, [x, s * 0.5, z], [rnd(), rnd(), 0], [s, s * 0.8, s]);
  b.add(ICO, '#3e9a46', [x + s * 0.5, s * 0.35, z + s * 0.2], [rnd(), rnd(), 0], [s * 0.6, s * 0.5, s * 0.6]);
  if (s > 0.6) addCircle(x, z, s * 0.8, { sight: false, h: s });
}

export function flowers(b, x, z, rnd) {
  const cols = ['#e94f64', '#ffd23f', '#f6f1e9', '#b05bd6'];
  for (let i = 0; i < 5; i++) {
    const fx = x + (rnd() - 0.5) * 1.2, fz = z + (rnd() - 0.5) * 1.2;
    b.box(fx, 0, fz, 0.05, 0.3, 0.05, '#3e9a46');
    b.box(fx, 0.3, fz, 0.16, 0.1, 0.16, cols[(rnd() * cols.length) | 0]);
  }
}

// ---------------- Debris and small props ----------------

export function crate(b, x, z, s = 0.7, rot = 0, collide = true) {
  const t = new Xf(b, x, z, rot);
  t.box(0, 0, 0, s, s, s, P.wood);
  t.box(0, s * 0.42, 0, s * 1.03, s * 0.14, s * 1.03, P.woodDark);
  t.box(0, s * 0.05, 0, s * 1.03, s * 0.12, s * 1.03, P.woodDark);
  if (collide) addBox(x, z, s / 2, s / 2, rot, { sight: false, h: s });
}

export function plank(b, x, z, rot, len = 1.4) {
  b.box(x, 0, z, len, 0.08, 0.22, '#a07448', rot);
}

export function barrel(b, x, z, upright = true) {
  if (upright) {
    b.add(CYL8, '#6b4226', [x, 0.4, z], [0, 0, 0], [0.3, 0.8, 0.3]);
    b.add(CYL8, '#4a2e1a', [x, 0.55, z], [0, 0, 0], [0.31, 0.06, 0.31]);
    addCircle(x, z, 0.32, { sight: false, h: 0.8 });
  } else {
    b.add(CYL8, '#6b4226', [x, 0.28, z], [Math.PI / 2, 0, 0.6], [0.28, 0.75, 0.28]);
  }
}

export function lamp(b, x, z) {
  b.box(x, 0, z, 0.12, 3, 0.12, '#3b3b3b');
  b.box(x, 3, z, 0.4, 0.25, 0.4, '#ffe9a8');
  addCircle(x, z, 0.15, { sight: false });
}

export function bench(b, x, z, rot) {
  const t = new Xf(b, x, z, rot);
  t.box(0, 0.4, 0, 1.6, 0.1, 0.45, P.wood);
  t.box(-0.65, 0, 0, 0.1, 0.4, 0.4, P.woodDark);
  t.box(0.65, 0, 0, 0.1, 0.4, 0.4, P.woodDark);
  addBox(x, z, 0.8, 0.25, rot, { sight: false, h: 0.5 });
}

// ---------------- Buildings (non-interactive) ----------------

export function house(b, x, z, rot, rnd, o = {}) {
  if (!o.prim && rnd() < 0.6) {
    const sc = 0.85 + rnd() * 0.3;
    if (place('house', x, 0, z, rot, sc)) { const fp = footprint('house', sc); addBox(x, z, fp.hx * 0.9, fp.hz * 0.9, rot, { h: fp.h }); return { w: fp.hx * 2, d: fp.hz * 2 }; }
  }
  const w = o.w ?? 4 + rnd() * 2, d = o.d ?? 3.5 + rnd() * 1.5, h = o.h ?? 2.6 + rnd() * 0.6;
  const walls = o.wall ?? ['#f6e7c8', '#f2b5a0', '#a8d8e0', '#f7d77a', '#cfe3b0', '#f0c6dd'][(rnd() * 6) | 0];
  const roof = o.roof ?? ['#c2543d', '#2f6d94', '#d98b3a', '#7a4b3a'][(rnd() * 4) | 0];
  const t = new Xf(b, x, z, rot);
  t.box(0, 0, 0, w, h, d, walls);
  t.box(0, 0, 0, w + 0.1, 0.25, d + 0.1, '#d8c7a5');
  t.add(CONE4, roof, [0, h + 0.75, 0], [0, Math.PI / 4, 0], [(w / 2 + 0.35) * Math.SQRT2, 1.5, (d / 2 + 0.35) * Math.SQRT2]);
  t.box(w * 0.15, 0, d / 2 + 0.02, 0.8, 1.7, 0.08, '#6b4226');
  t.box(-w * 0.25, 1.2, d / 2 + 0.03, 0.8, 0.7, 0.06, '#3d6f8f');
  t.box(-w * 0.25, 1.1, d / 2 + 0.12, 1.0, 0.08, 0.2, '#f6f1e9');
  t.box(w / 2 + 0.03, 1.2, 0, 0.06, 0.7, 0.8, '#3d6f8f');
  if (rnd() < 0.5) t.box(-w * 0.3, h + 0.4, -d * 0.15, 0.4, 1.0, 0.4, '#9c8a7a');
  addBox(x, z, w / 2, d / 2, rot, { h });
  return { w, d };
}

export function shack(b, x, z, rot, rnd) {
  const t = new Xf(b, x, z, rot);
  const w = 3, d = 2.6;
  t.box(0, 0, 0, w, 2.2, d, '#b98a5a');
  for (let i = -1; i <= 1; i++) t.box(i * 0.95, 0, d / 2 + 0.01, 0.06, 2.2, 0.04, '#8a6040');
  t.add(BOX, '#7c8c8f', [0, 2.45, 0], [0.18, 0, 0], [w + 0.6, 0.12, d + 0.8]);
  t.box(0.6, 0, d / 2 + 0.02, 0.7, 1.6, 0.06, '#5e3b22');
  addBox(x, z, w / 2, d / 2, rot, { h: 2.2 });
}

export function church(b, x, z, rot) {
  if (place('church', x, 0, z, rot)) { const fp = footprint('church'); addBox(x, z, fp.hx * 0.85, fp.hz * 0.85, rot, { h: fp.h }); return; }
  const t = new Xf(b, x, z, rot);
  t.box(0, 0, 0, 6, 4, 9, '#f6f1e9');
  t.add(CONE4, '#c2543d', [0, 4.9, 0], [0, Math.PI / 4, 0], [3.4 * Math.SQRT2, 1.8, 4.9 * Math.SQRT2]);
  t.box(0, 0, 4.5, 2.4, 7.5, 2.4, '#f6f1e9');
  t.add(CONE4, '#c2543d', [0, 8.6, 4.5], [0, Math.PI / 4, 0], [1.6 * Math.SQRT2, 2.2, 1.6 * Math.SQRT2]);
  t.box(0, 9.7, 4.5, 0.12, 1.0, 0.12, '#ffd23f');
  t.box(0, 10.2, 4.5, 0.6, 0.12, 0.12, '#ffd23f');
  t.box(0, 0, 5.72, 1.2, 2.2, 0.06, '#6b4226');
  t.add(CYL12, '#3d6f8f', [0, 5.4, 5.71], [Math.PI / 2, 0, 0], [0.5, 0.05, 0.5]);
  addBox(x, z, 3, 4.5, rot, { h: 4 });
  const [tx, tz] = t.w(0, 4.5);
  addBox(tx, tz, 1.2, 1.2, rot, { h: 7 });
}

export function waterTower(b, x, z) {
  if (place('watertower', x, 0, z, 0.4)) { addBox(x, z, 1.1, 1.1, 0.4, { sight: false, h: 5 }); return; }
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.box(x + dx, 0, z + dz, 0.18, 5, 0.18, '#7a5230');
  b.add(CYL12, '#c9d6d8', [x, 6.2, z], [0, 0, 0], [1.7, 2.4, 1.7]);
  b.add(CONE8, '#9aa9ab', [x, 7.9, z], [0, 0, 0], [1.8, 1, 1.8]);
  b.box(x, 5, z, 2.6, 0.12, 2.6, '#7a5230');
  addBox(x, z, 1.1, 1.1, 0, { sight: false, h: 5 });
}

export function lighthouse(b, x, z) {
  if (place('lighthouse', x, 0, z, 0)) { const fp = footprint('lighthouse'); addCircle(x, z, Math.min(fp.hx, fp.hz) * 0.8, { h: 9 }); return; }
  for (let i = 0; i < 6; i++) b.add(CYL12, i % 2 ? '#d9412b' : '#f6f1e9', [x, 0.75 + i * 1.5, z], [0, 0, 0], [1.4 - i * 0.12, 1.5, 1.4 - i * 0.12]);
  b.add(CYL12, '#2a1a12', [x, 9.1, z], [0, 0, 0], [1.0, 0.2, 1.0]);
  b.add(CYL8, '#ffe9a8', [x, 9.8, z], [0, 0, 0], [0.6, 1.2, 0.6]);
  b.add(CONE8, '#d9412b', [x, 10.9, z], [0, 0, 0], [0.8, 1, 0.8]);
  b.box(x, 0, z + 1.38, 0.7, 1.6, 0.1, '#6b4226');
  addCircle(x, z, 1.4, { h: 9 });
}

export function stall(b, x, z, rot, awning = ['#d9412b', '#fff4d6'], goods = 'fruit', rnd = Math.random, useModel = true) {
  if (useModel && place('stall', x, 0, z, rot)) { const fp = footprint('stall'); addBox(x, z, fp.hx * 0.85, fp.hz * 0.6, rot, { sight: false, h: 1.2 }); return; }
  const t = new Xf(b, x, z, rot);
  const w = 3, d = 2;
  for (const [px, pz] of [[-1.4, -0.9], [1.4, -0.9], [-1.4, 0.9], [1.4, 0.9]]) t.box(px, 0, pz, 0.12, 2.4, 0.12, P.woodDark);
  t.box(0, 0, 0.55, w, 0.95, 0.7, P.wood);
  t.box(0, 0.95, 0.55, w + 0.1, 0.08, 0.8, '#d8b07a');
  for (let i = 0; i < 6; i++) t.add(BOX, awning[i % 2], [-1.25 + i * 0.5, 2.55, 0.15], [0.3, 0, 0], [0.5, 0.08, 2.5]);
  const gc = goods === 'fish' ? ['#9fb4c0', '#7d97a6'] : goods === 'cloth' ? ['#e86a92', '#2f6d94', '#ffd23f'] : ['#f2a33a', '#e94f64', '#ffd23f', '#7cc46a'];
  for (let i = 0; i < 9; i++) {
    const gx = -1.2 + (i % 5) * 0.6 + (rnd() - 0.5) * 0.1, gz = 0.4 + Math.floor(i / 5) * 0.3;
    if (goods === 'fish') t.add(BOX, gc[i % 2], [gx, 1.07, gz], [0, rnd(), 0], [0.45, 0.1, 0.16]);
    else t.add(SPH, gc[i % gc.length], [gx, 1.12, gz], [0, 0, 0], 0.13);
  }
  t.box(0, 0, -0.6, w - 0.2, 0.6, 0.6, P.woodDark);
  addBox(...t.w(0, 0.55), w / 2, 0.4, rot, { sight: false, h: 1 });
  addBox(...t.w(0, -0.6), (w - 0.2) / 2, 0.3, rot, { sight: false, h: 0.6 });
}

export function boat(b, x, z, rot, color = '#2f6d94') {
  if (place('boat', x, -0.25, z, rot)) return;
  const t = new Xf(b, x, z, rot, -0.15);
  t.box(0, 0, 0, 1.4, 0.5, 3.4, color);
  t.box(0, 0.5, 0, 1.5, 0.1, 3.5, '#f6f1e9');
  t.add(CONE4, color, [0, 0.25, 2.1], [Math.PI / 2, Math.PI / 4, 0], [0.98, 0.9, 0.36]);
  t.box(0, 0.5, -0.4, 1.2, 0.08, 0.4, P.wood);
}

export function pier(b, x1, z1, x2, z2) {
  const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz), rot = Math.atan2(dx, dz);
  const t = new Xf(b, x1, z1, rot);
  t.box(0, 0.25, len / 2, 2.4, 0.15, len, '#b98a5a');
  for (let i = 0; i <= len; i += 2.5) {
    t.box(-1.1, -0.6, i, 0.22, 1.0, 0.22, P.woodDark);
    t.box(1.1, -0.6, i, 0.22, 1.0, 0.22, P.woodDark);
  }
}

export function fence(b, x1, z1, x2, z2, color = '#f6f1e9') {
  const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz), rot = Math.atan2(-dz, dx);
  const t = new Xf(b, (x1 + x2) / 2, (z1 + z2) / 2, rot);
  t.box(0, 0.6, 0, len, 0.1, 0.08, color);
  t.box(0, 0.25, 0, len, 0.1, 0.08, color);
  for (let i = -len / 2; i <= len / 2 + 0.01; i += 1.2) t.box(i, 0, 0, 0.12, 0.9, 0.12, color);
}

export function dumpsterMesh(b, x, z, rot) {
  if (place('dumpster', x, 0, z, rot)) { const fp = footprint('dumpster'); addBox(x, z, fp.hx, fp.hz, rot, { sight: true, h: 1.2 }); return; }
  const t = new Xf(b, x, z, rot);
  t.box(0, 0.1, 0, 1.8, 1.1, 1.1, '#3f7d4a');
  t.add(BOX, '#2f5e38', [0, 1.28, -0.1], [-0.12, 0, 0], [1.9, 0.1, 1.2]);
  t.box(-0.7, 0, -0.45, 0.12, 0.15, 0.12, '#222');
  t.box(0.7, 0, 0.45, 0.12, 0.15, 0.12, '#222');
  addBox(x, z, 0.9, 0.55, rot, { sight: true, h: 1.2 });
}

export { CYL6, CYL8, CYL12, CONE4, CONE8, DODE, ICO, SPH };
