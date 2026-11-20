// 2D collision on the XZ plane. Oriented boxes and circles. No physics engine.
// Rotation convention matches three.js rotation.y.

export const colliders = [];

export function addBox(cx, cz, hx, hz, rot = 0, o = {}) {
  const c = {
    type: 'box', cx, cz, hx, hz, rot, cos: Math.cos(rot), sin: Math.sin(rot),
    floor: 0, bld: null, sight: true, vault: false, h: 3, disabled: false, ...o,
  };
  c.bound = Math.hypot(hx, hz);
  colliders.push(c);
  return c;
}

export function addCircle(cx, cz, r, o = {}) {
  const c = { type: 'circle', cx, cz, r, floor: 0, bld: null, sight: true, vault: false, h: 3, disabled: false, ...o };
  c.bound = r;
  colliders.push(c);
  return c;
}

/** World-space segment as a thin box (walls). */
export function addWall(x1, z1, x2, z2, thick = 0.3, o = {}) {
  const dx = x2 - x1, dz = z2 - z1;
  const len = Math.hypot(dx, dz);
  const rot = Math.atan2(-dz, dx); // local +x along the segment
  return addBox((x1 + x2) / 2, (z1 + z2) / 2, len / 2, thick / 2, rot, o);
}

export function toLocal(c, x, z) {
  const dx = x - c.cx, dz = z - c.cz;
  return [dx * c.cos - dz * c.sin, dx * c.sin + dz * c.cos];
}
export function toWorld(c, lx, lz) {
  return [c.cx + lx * c.cos + lz * c.sin, c.cz - lx * c.sin + lz * c.cos];
}

export function relevant(c, floor, bld) {
  if (c.disabled || c.floor !== floor) return false;
  return floor === 0 || c.bld === bld;
}

/** Push a circle out of all relevant colliders. Returns [x, z]. */
export function resolve(x, z, r, floor, bld, ignoreLow = false) {
  for (let iter = 0; iter < 3; iter++) {
    let moved = false;
    for (const c of colliders) {
      if (!relevant(c, floor, bld)) continue;
      if (ignoreLow && c.h < 1.2) continue;
      const ddx = x - c.cx, ddz = z - c.cz;
      const lim = c.bound + r;
      if (ddx * ddx + ddz * ddz > lim * lim) continue;
      if (c.type === 'circle') {
        const d = Math.hypot(ddx, ddz);
        const pen = c.r + r - d;
        if (pen > 0) {
          const nx = d > 1e-5 ? ddx / d : 1, nz = d > 1e-5 ? ddz / d : 0;
          x += nx * pen; z += nz * pen; moved = true;
        }
      } else {
        const [lx, lz] = toLocal(c, x, z);
        const qx = Math.max(-c.hx, Math.min(c.hx, lx));
        const qz = Math.max(-c.hz, Math.min(c.hz, lz));
        let dx = lx - qx, dz = lz - qz;
        const d = Math.hypot(dx, dz);
        let nlx, nlz;
        if (d > 1e-6) {
          if (d >= r) continue;
          const pen = r - d;
          nlx = lx + (dx / d) * pen; nlz = lz + (dz / d) * pen;
        } else {
          // Center inside the box: exit along the shallowest axis.
          const px = c.hx - Math.abs(lx), pz = c.hz - Math.abs(lz);
          if (px < pz) { nlx = Math.sign(lx || 1) * (c.hx + r); nlz = lz; }
          else { nlx = lx; nlz = Math.sign(lz || 1) * (c.hz + r); }
        }
        [x, z] = toWorld(c, nlx, nlz);
        moved = true;
      }
    }
    if (!moved) break;
  }
  return [x, z];
}

export function overlaps(x, z, r, floor, bld) {
  for (const c of colliders) {
    if (!relevant(c, floor, bld)) continue;
    if (c.type === 'circle') { if (Math.hypot(x - c.cx, z - c.cz) < c.r + r) return true; continue; }
    const [lx, lz] = toLocal(c, x, z);
    const qx = Math.max(-c.hx, Math.min(c.hx, lx)), qz = Math.max(-c.hz, Math.min(c.hz, lz));
    if (Math.hypot(lx - qx, lz - qz) < r) return true;
  }
  return false;
}

/** True if a sight-blocking collider crosses the segment. */
export function sightBlocked(x1, z1, x2, z2, floor, bld) {
  for (const c of colliders) {
    if (!c.sight || !relevant(c, floor, bld)) continue;
    if (c.type === 'circle') {
      if (segCircle(x1, z1, x2, z2, c.cx, c.cz, c.r * 0.8)) return true;
      continue;
    }
    const [ax, az] = toLocal(c, x1, z1);
    const [bx, bz] = toLocal(c, x2, z2);
    if (segBox(ax, az, bx, bz, c.hx, c.hz)) return true;
  }
  return false;
}

function segBox(ax, az, bx, bz, hx, hz) {
  let t0 = 0, t1 = 1;
  const dx = bx - ax, dz = bz - az;
  const p = [-dx, dx, -dz, dz];
  const q = [ax + hx, hx - ax, az + hz, hz - az];
  for (let i = 0; i < 4; i++) {
    if (Math.abs(p[i]) < 1e-9) { if (q[i] < 0) return false; continue; }
    const t = q[i] / p[i];
    if (p[i] < 0) { if (t > t1) return false; if (t > t0) t0 = t; }
    else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return true;
}

function segCircle(x1, z1, x2, z2, cx, cz, r) {
  const dx = x2 - x1, dz = z2 - z1;
  const l2 = dx * dx + dz * dz || 1;
  let t = ((cx - x1) * dx + (cz - z1) * dz) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(x1 + dx * t - cx, z1 + dz * t - cz) < r;
}

/** Nearest vaultable box the point is pressed against. */
export function findVault(x, z, r, floor, bld) {
  let best = null, bestD = 1e9;
  for (const c of colliders) {
    if (!c.vault || !relevant(c, floor, bld) || c.type !== 'box') continue;
    const [lx, lz] = toLocal(c, x, z);
    const qx = Math.max(-c.hx, Math.min(c.hx, lx)), qz = Math.max(-c.hz, Math.min(c.hz, lz));
    const d = Math.hypot(lx - qx, lz - qz);
    if (d < r + 0.55 && d < bestD) { best = c; bestD = d; }
  }
  return best;
}
