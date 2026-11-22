import * as THREE from 'three/webgpu';
import { G } from '../core/game.js';
import { CFG } from '../config.js';
import { Batch, signMesh, signTexture } from '../core/batch.js';
import { addBox } from '../core/collision.js';
import { Guard } from '../entities/guard.js';
import { Npc } from '../entities/npc.js';
import { makeLoot, register } from './interactive.js';
import { dumpsterMesh } from './props.js';
import { instance } from '../core/assets.js';

const FH = CFG.floorHeight;
const OUTER_H = FH - 0.2;
const INNER_H = 3.0;
const T = 0.3; // wall thickness

/**
 * Dollhouse building. Each floor is its own group so floors above the player can be hidden.
 * The south and east outer walls face the camera, so they swap to a low stub when the player is on that floor.
 */
export class Building {
  constructor(def) {
    Object.assign(this, def);
    this.view = -2;
    this.group = new THREE.Group();
    this.group.position.set(def.x, 0, def.z);
    G.scene.add(this.group);
    this.floorGroups = [];
    this.front = [];
    this.pads = [];
    this.bannerK = 0;
    G.buildings[def.id] = this;

    const hw = def.w / 2, hd = def.d / 2;
    for (let f = 0; f < def.floors; f++) {
      const fg = new THREE.Group();
      fg.position.y = f * FH;
      this.group.add(fg);
      this.floorGroups.push(fg);
      const back = new Batch(), full = new Batch(), stub = new Batch(), inner = new Batch();
      const ctx = this.ctx(f, inner);
      this._b = { back, full, stub, inner };

      // Floor slab, with a hole above any stair that rises from the floor below.
      const hole = (def.stairs || []).find((s) => s.from === f - 1);
      const floorCol = (def.floorColors || ['#d8cfc0'])[f % (def.floorColors?.length || 1)];
      if (f === 0) inner.box(0, 0, 0, def.w - 0.1, 0.04, def.d - 0.1, floorCol);
      else this.slab(inner, floorCol, hole);
      // Outer walls.
      this.wallSeg(f, back, -hw, -hd, hw, -hd, def.wall, OUTER_H, []);
      this.wallSeg(f, back, -hw, -hd, -hw, hd, def.wall, OUTER_H, []);
      const doors = f === 0 && def.door ? [[def.door.x, def.door.w]] : [];
      this.wallSeg(f, full, -hw, hd, hw, hd, def.wall, OUTER_H, doors);
      this.wallSeg(null, stub, -hw, hd, hw, hd, def.wall, 0.5, doors);
      this.wallSeg(f, full, hw, -hd, hw, hd, def.wall, OUTER_H, []);
      this.wallSeg(null, stub, hw, -hd, hw, hd, def.wall, 0.5, []);
      // Trim band at the top of each floor and windows on the camera-facing sides.
      full.box(0, OUTER_H - 0.35, hd + 0.2, def.w + 0.1, 0.35, 0.12, def.trim);
      full.box(hw + 0.2, OUTER_H - 0.35, 0, 0.12, 0.35, def.d + 0.1, def.trim);
      for (let x = -hw + 2; x <= hw - 2; x += 3) {
        if (doors.some(([c, w]) => Math.abs(x - c) < w / 2 + 1)) continue;
        full.box(x, 1.3, hd + 0.19, 1.4, 1.3, 0.08, def.windowColor || '#3d6f8f');
        full.box(x, 1.2, hd + 0.25, 1.6, 0.12, 0.2, def.trim);
      }
      for (let z = -hd + 2; z <= hd - 2; z += 3) {
        full.box(hw + 0.19, 1.3, z, 0.08, 1.3, 1.4, def.windowColor || '#3d6f8f');
        full.box(hw + 0.25, 1.2, z, 0.2, 0.12, 1.6, def.trim);
      }
      if (f === 0 && def.door) {
        full.box(def.door.x, OUTER_H - 1.0, hd + 0.3, def.door.w + 0.8, 0.25, 0.5, def.trim);
        const sign = signMesh(def.sign, Math.min(def.w * 0.5, 7), 1.0, def.signStyle);
        sign.position.set(def.door.x, OUTER_H - 0.4, hd + 0.33);
        this.signMesh = sign;
      }

      for (const s of def.stairs || []) if (s.from === f) this.buildStairs(f, inner, s);
      if (def.build) def.build.call(this, f, ctx);

      const meshes = { back: back.build(), full: full.build(), stub: stub.build(), inner: inner.build() };
      fg.add(meshes.back, meshes.full, meshes.stub, meshes.inner);
      if (this.signMesh && f === 0) meshes.full.add(this.signMesh);
      this.front.push(meshes);
    }

    // Roof, rooftop detail and the campaign banner (rolled up until hijacked).
    this.roof = new THREE.Group();
    this.roof.position.y = def.floors * FH;
    this.group.add(this.roof);
    const rb = new Batch();
    rb.box(0, -0.2, 0, def.w + 0.4, 0.4, def.d + 0.4, def.roofColor || def.trim);
    rb.box(0, 0.2, hd + 0.05, def.w + 0.4, 0.4, 0.3, def.trim);
    rb.box(0, 0.2, -hd - 0.05, def.w + 0.4, 0.4, 0.3, def.trim);
    rb.box(hw + 0.05, 0.2, 0, 0.3, 0.4, def.d + 0.4, def.trim);
    rb.box(-hw - 0.05, 0.2, 0, 0.3, 0.4, def.d + 0.4, def.trim);
    if (def.roofDeco) def.roofDeco(rb);
    else { rb.box(-hw * 0.4, 0.2, -hd * 0.3, 1.6, 1.0, 1.2, '#b8b8b0'); rb.box(hw * 0.3, 0.2, -hd * 0.5, 1.0, 0.8, 1.0, '#a0a098'); }
    this.roof.add(rb.build());
    if (def.exteriorDeco) { const db = new Batch(); def.exteriorDeco(db); this.group.add(db.build()); }

    const bw = Math.min(def.w * 0.45, 7);
    this.banner = new THREE.Mesh(new THREE.PlaneGeometry(bw, 2.6), new THREE.MeshBasicMaterial({ map: signTexture('VOTE THE NOBODY!', { bg: '#d9412b', fg: '#ffd23f', border: '#ffd23f', w: 512, h: 192, font: 'bold 80px Arial Black, Impact' }) }));
    this.banner.geometry.translate(0, -1.3, 0);
    this.banner.position.set(def.bannerX ?? (def.door ? (def.door.x <= 0 ? def.w / 4 : -def.w / 4) : 0), 0.2, hd + 0.36);
    this.banner.scale.y = 0.001;
    this.banner.visible = false;
    this.roof.add(this.banner);

    // Door lock: a closed door panel plus a collider while locked.
    if (def.door) {
      const dx = def.x + def.door.x, dz = def.z + hd;
      this.doorCol = addBox(dx, dz, def.door.w / 2, T / 2, 0, { h: 3 });
      this.doorMesh = new THREE.Mesh(new THREE.BoxGeometry(def.door.w, 2.6, 0.12), new THREE.MeshStandardMaterial({ color: def.doorColor || '#6b4226', flatShading: true }));
      this.doorMesh.position.set(def.door.x, 1.3, hd);
      this.doorMesh.castShadow = true;
      this.floorGroups[0].add(this.doorMesh);
      register({
        x: dx, z: dz + 1.1, r: 1.8, floor: 0,
        enabled: () => !!this.lockText(),
        locked: () => this.lockText(),
        label: () => '',
      });
    }
    this.setView(-1);
  }

  lockText() { return this.locked ? this.locked() : null; }

  ctx(f, inner) {
    const self = this;
    const wx = (lx) => self.x + lx, wz = (lz) => self.z + lz;
    return {
      f, b: inner, wx, wz,
      wall(x1, z1, x2, z2, o = {}) { self.wallSeg(f, inner, x1, z1, x2, z2, o.color || self.interior, o.h || INNER_H, o.doors || [], o.sight ?? true); },
      box(x, z, w, d, h, color, o = {}) {
        if (!o.hidden) inner.box(x, o.y || 0, z, w, h, d, color, o.rot || 0);
        if (o.collide !== false) addBox(wx(x), wz(z), w / 2, d / 2, o.rot || 0, { floor: f, bld: self, sight: o.sight ?? h > 1.5, h });
      },
      loot(x, z, o) { return makeLoot({ ...o, x: wx(x), z: wz(z), mx: x, mz: z, floor: f, bld: self, parent: self.floorGroups[f] }); },
      guard(route, o = {}) {
        const r = route.map(([x, z]) => [wx(x), wz(z)]);
        return new Guard({ ...o, x: r[0][0], z: r[0][1], route: r, floor: f, bld: self });
      },
      official(route, o) {
        const g = this.guard(route, { kind: 'official', hp: 2, cash: 40, wait: 3.5, ...o });
        self.official = g;
        self.officialFloor = f;
        register({
          get x() { return g.x; }, get z() { return g.z; }, floor: f, bld: self, r: 1.6,
          enabled: () => !G.state.hijacked[self.id],
          locked: () => (G.state.secrets[self.id] ? (g.state === 'alert' ? 'He is too busy yelling for help.' : null) : `${g.name} won't talk. Find his secret first.`),
          label: () => (g.down ? `Wake ${g.name} and blackmail him` : `Blackmail ${g.name}`),
          use: () => G.emit('blackmail', self),
        });
        return g;
      },
      /** Generated model placed on this floor. Returns false if the asset is missing. */
      model(name, x, z, rot = 0, scale = 1, collide = true) {
        const m = instance(name);
        if (!m) return false;
        m.position.set(x, 0, z); m.rotation.y = rot; m.scale.setScalar(scale);
        self.floorGroups[f].add(m);
        const s = m.userData.size;
        if (collide) addBox(wx(x), wz(z), (s.x / 2) * scale, (s.z / 2) * scale, rot, { floor: f, bld: self, sight: s.y * scale > 1.5, h: s.y * scale });
        return true;
      },
      npc(x, z, facing, o = {}) { return new Npc({ ...o, x: wx(x), z: wz(z), floor: f, bld: self, facing }); },
      sign(text, x, y, z, w, h, rotY = 0, style) {
        const s = signMesh(text, w, h, style);
        s.position.set(x, y, z); s.rotation.y = rotY;
        self.floorGroups[f].add(s);
        return s;
      },
    };
  }

  /** Axis-aligned wall from (x1,z1) to (x2,z2) in local coords, with door gaps [[center, width]]. */
  wallSeg(f, batch, x1, z1, x2, z2, color, h, doors, sight = true) {
    const horiz = Math.abs(z2 - z1) < 1e-6;
    const a0 = horiz ? Math.min(x1, x2) : Math.min(z1, z2);
    const a1 = horiz ? Math.max(x1, x2) : Math.max(z1, z2);
    const fixed = horiz ? z1 : x1;
    const gaps = doors.map(([c, w]) => [c - w / 2, c + w / 2]).sort((p, q) => p[0] - q[0]);
    let s = a0 - T / 2;
    const segs = [];
    for (const [g0, g1] of gaps) { if (g0 > s) segs.push([s, g0]); s = Math.max(s, g1); }
    if (a1 + T / 2 > s) segs.push([s, a1 + T / 2]);
    for (const [s0, s1] of segs) {
      const len = s1 - s0, mid = (s0 + s1) / 2;
      const [cx, cz, w, d] = horiz ? [mid, fixed, len, T] : [fixed, mid, T, len];
      batch.box(cx, 0, cz, w, h, d, color);
      if (f !== null) addBox(this.x + cx, this.z + cz, w / 2, d / 2, 0, { floor: f, bld: this, sight, h });
    }
    // Door lintels on interior doors keep the cutaway readable.
    if (h === INNER_H) for (const [g0, g1] of gaps) {
      const mid = (g0 + g1) / 2, len = g1 - g0;
      const [cx, cz, w, d] = horiz ? [mid, fixed, len, T] : [fixed, mid, T, len];
      batch.box(cx, 2.4, cz, w, h - 2.4, d, color);
    }
  }

  slab(b, color, hole) {
    const hw = this.w / 2, hd = this.d / 2, y = -0.2, th = 0.2;
    if (!hole) { b.box(0, y, 0, this.w, th, this.d, color); return; }
    const x1 = hole.x - 0.95, x2 = hole.x + 0.95, z1 = hole.z - 5.05, z2 = hole.z + 0.15;
    b.box(0, y, (-hd + z1) / 2, this.w, th, z1 + hd, color);
    b.box(0, y, (z2 + hd) / 2, this.w, th, hd - z2, color);
    b.box((-hw + x1) / 2, y, (z1 + z2) / 2, x1 + hw, th, z2 - z1, color);
    b.box((x2 + hw) / 2, y, (z1 + z2) / 2, hw - x2, th, z2 - z1, color);
  }

  /** Stairs rise north from (s.x, s.z) on floor s.from to the floor above. Deterministic pads, no slopes. */
  buildStairs(f, b, s) {
    const { x, z } = s;
    for (let i = 0; i < 10; i++) b.box(x, 0, z - 0.25 - i * 0.5, 1.6, (i + 1) * 0.4, 0.5, i % 2 ? '#9c8a7a' : '#ad9b8a');
    b.box(x - 0.85, 0, z - 2.5, 0.1, 4, 5, '#7a6a5a');
    addBox(this.x + x, this.z + z - 2.5, 0.85, 2.5, 0, { floor: f, bld: this, sight: false, h: 1 });
    b.box(x, 0.02, z + 0.7, 1.2, 0.03, 0.9, '#ffd23f');
    // Upstairs railing around the opening (north end open).
    const up = f + 1;
    addBox(this.x + x - 0.95, this.z + z - 2.5, 0.08, 2.6, 0, { floor: up, bld: this, sight: false, h: 1 });
    addBox(this.x + x + 0.95, this.z + z - 2.5, 0.08, 2.6, 0, { floor: up, bld: this, sight: false, h: 1 });
    addBox(this.x + x, this.z + z + 0.15, 1.0, 0.08, 0, { floor: up, bld: this, sight: false, h: 1 });
    this.pads.push({ floor: f, x: this.x + x, z: this.z + z + 0.7, to: up, lx: this.x + x, lz: this.z + z - 6.6 });
    this.pads.push({ floor: up, x: this.x + x, z: this.z + z - 5.6, to: f, lx: this.x + x, lz: this.z + z + 1.9 });
    this.railsTodo = (this.railsTodo || []).concat([{ f: up, x, z }]);
  }

  finishRails() {
    // Called after all floors exist: draw upstairs railings into those floors.
    for (const r of this.railsTodo || []) {
      const b = new Batch();
      b.box(r.x - 0.95, 0, r.z - 2.5, 0.12, 1.0, 5.2, '#7a6a5a');
      b.box(r.x + 0.95, 0, r.z - 2.5, 0.12, 1.0, 5.2, '#7a6a5a');
      b.box(r.x, 0, r.z + 0.15, 2.0, 1.0, 0.12, '#7a6a5a');
      b.box(r.x, 0.02, r.z - 5.6, 1.2, 0.03, 0.9, '#ffd23f');
      this.floorGroups[r.f]?.add(b.build());
    }
  }

  contains(x, z) { return Math.abs(x - this.x) <= this.w / 2 && Math.abs(z - this.z) <= this.d / 2; }

  /** -1 = exterior. Otherwise the floor the player is on. */
  setView(v) {
    if (v === this.view) return;
    this.view = v;
    for (let f = 0; f < this.floors; f++) {
      this.floorGroups[f].visible = v < 0 || f <= v;
      const cut = v === f;
      this.front[f].full.visible = !cut;
      this.front[f].stub.visible = cut;
    }
    this.roof.visible = v < 0;
    if (this.doorMesh) this.doorMesh.visible = !!this.lockText();
  }

  update(dt, cooldown) {
    if (this.doorCol) {
      const locked = !!this.lockText();
      this.doorCol.disabled = !locked;
      if (this.doorMesh) this.doorMesh.visible = locked;
    }
    const p = G.player;
    if (p.bld !== this || cooldown > 0 || p.jump) return false;
    for (const pad of this.pads) {
      if (pad.floor !== p.floor) continue;
      if (Math.hypot(p.x - pad.x, p.z - pad.z) < 0.8) {
        p.setFloor(pad.to, pad.lx, pad.lz, this);
        G.emit('stairs', this, pad.to);
        return true;
      }
    }
    return false;
  }
}

/** Outdoor dumpster (world coords, floor 0). Hiding needs the Sanitation perk. */
export function makeDumpster(batch, x, z, rot) {
  dumpsterMesh(batch, x, z, rot);
  const floor = 0, bld = null;
  const spot = { x, z, floor, bld };
  register({
    x, z, floor, bld, r: 1.7,
    enabled: () => true,
    locked: () => (G.canHide ? null : 'Smells like opportunity. (Needs the Sanitation perk.)'),
    label: () => (G.player.hidden ? 'Climb out' : 'Hide in dumpster'),
    hideSpot: spot,
    use: () => G.emit('hide', spot),
  });
}
