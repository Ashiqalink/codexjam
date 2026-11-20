import * as THREE from 'three/webgpu';
import { G } from '../core/game.js';
import { CFG, WEAPONS } from '../config.js';
import { resolve, findVault, toLocal, toWorld, overlaps } from '../core/collision.js';
import { clampToIsland, insideIsland } from '../world/island.js';
import { makeCharacter, animate, OUTFITS } from './character.js';
import { input } from '../systems/input.js';
import { instance } from '../core/assets.js';

// How each generated weapon sits in the right hand (hand is at y = -0.62 on the arm pivot).
const GRIP = {
  chicken: { pos: [0, -0.7, 0.12], rot: [Math.PI / 2, 0, 0] },
  baguette: { pos: [0, -0.68, 0.35], rot: [0, Math.PI / 2, 0] },
  chair: { pos: [0, -0.9, 0.2], rot: [0, 0, 0] },
  briefcase: { pos: [0, -0.88, 0.05], rot: [0, Math.PI / 2, 0] },
};

const HAIR_COLORS = ['#3a2418', '#3a2418', '#1b120d', '#2a1a12', '#7a4b2a', '#3a2418'];
const yaw = (CFG.camYaw * Math.PI) / 180;
const FWD = [-Math.sin(yaw), -Math.cos(yaw)];
const RIGHT = [Math.cos(yaw), -Math.sin(yaw)];

function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

export class Player {
  constructor(x, z) {
    this.x = x; this.z = z; this.y = 0;
    this.vx = 0; this.vz = 0;
    this.facing = 0;
    this.floor = 0; this.bld = null;
    this.crouch = false; this.crouchK = 0;
    this.sprinting = false; this.noisy = false;
    this.hidden = false; this.hideSpot = null;
    this.jump = null; this.attackT = 0; this.attackCd = 0;
    this.phase = 0; this.move = 0; this.t = 0;
    this.pose = null; this.hurtT = 0; this.invuln = 0;
    this.frozen = false;
    this.buildMesh();
  }

  buildMesh() {
    if (this.mesh) G.scene.remove(this.mesh);
    const o = OUTFITS[G.state.outfit];
    this.mesh = makeCharacter({ skin: '#c98c5a', shirt: o.shirt, stripe: o.stripe, pants: o.pants, sleeves: o.sleeves, tie: o.tie, hairStyle: G.state.hair, hair: HAIR_COLORS[G.state.hair] });
    G.scene.add(this.mesh);
    this.heldName = null;
    this.render();
  }

  attachWeapon() {
    const arm = this.mesh.userData.parts.arms[1];
    if (this.held) arm.remove(this.held);
    this.held = null;
    this.heldName = G.state.weapon;
    const g = GRIP[G.state.weapon];
    const m = g && instance(G.state.weapon);
    if (!m) return;
    m.position.set(...g.pos); m.rotation.set(...g.rot);
    arm.add(m);
    this.held = m;
  }

  get speedNow() { return this.crouch ? CFG.crouch : this.sprinting ? CFG.sprint : CFG.walk; }

  update(dt) {
    this.t += dt;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.hurtT > 0) this.hurtT -= dt;
    if (this.attackCd > 0) this.attackCd -= dt;
    if (this.attackT > 0) this.attackT = Math.max(0, this.attackT - dt / 0.28);

    if (this.hidden) { this.noisy = false; this.render(); return; }

    // Vault or hop in progress: fixed, deterministic arc.
    if (this.jump) {
      const j = this.jump;
      j.t += dt;
      const k = Math.min(1, j.t / j.dur);
      const e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      if (j.vault) {
        this.x = j.fx + (j.tx - j.fx) * e;
        this.z = j.fz + (j.tz - j.fz) * e;
      } else {
        this.moveStep(dt, 0.85);
      }
      this.y = this.floor * CFG.floorHeight + Math.sin(k * Math.PI) * j.h;
      if (k >= 1) { this.jump = null; this.y = this.floor * CFG.floorHeight; }
      this.render();
      return;
    }

    if (input.pressed('KeyC')) this.crouch = !this.crouch;
    this.sprinting = input.down('ShiftLeft') || input.down('ShiftRight');
    if (this.sprinting && this.crouch) this.crouch = false;

    this.moveStep(dt, 1);

    if (input.pressed('Space')) this.tryJump();
    if (input.attack()) this.tryAttack();

    this.render();
  }

  moveStep(dt, control) {
    let ix = 0, iz = 0;
    if (!this.frozen) {
      const f = (input.down('KeyW') || input.down('ArrowUp') ? 1 : 0) - (input.down('KeyS') || input.down('ArrowDown') ? 1 : 0);
      const r = (input.down('KeyD') || input.down('ArrowRight') ? 1 : 0) - (input.down('KeyA') || input.down('ArrowLeft') ? 1 : 0);
      ix = FWD[0] * f + RIGHT[0] * r;
      iz = FWD[1] * f + RIGHT[1] * r;
      const l = Math.hypot(ix, iz);
      if (l > 1e-3) { ix /= l; iz /= l; }
    }
    const sp = this.speedNow;
    const tx = ix * sp, tz = iz * sp;
    // Fast accel, slightly faster decel: responsive without feeling twitchy.
    const rate = (ix || iz) ? 18 : 24;
    const k = 1 - Math.exp(-rate * dt * control);
    this.vx += (tx - this.vx) * k;
    this.vz += (tz - this.vz) * k;

    let nx = this.x + this.vx * dt, nz = this.z + this.vz * dt;
    [nx, nz] = resolve(nx, nz, CFG.playerRadius, this.floor, this.bld);
    if (this.floor === 0 && !this.bld) [nx, nz] = clampToIsland(nx, nz);
    // Kill velocity into walls so sliding feels clean.
    const ax = (nx - this.x) / Math.max(dt, 1e-4), az = (nz - this.z) / Math.max(dt, 1e-4);
    this.vx = ax; this.vz = az;
    this.x = nx; this.z = nz;

    const spd = Math.hypot(this.vx, this.vz);
    this.move = Math.min(1, spd / CFG.walk);
    if (spd > 0.3 && (ix || iz)) {
      const a = Math.atan2(ix, iz);
      this.facing += angDiff(this.facing, a) * (1 - Math.exp(-CFG.turnRate * dt));
    }
    this.noisy = this.sprinting && spd > 3;
    this.phase += dt * spd * 2.2;
    this.updateBuilding();
  }

  updateBuilding() {
    if (this.floor > 0) return;
    this.bld = null;
    for (const b of Object.values(G.buildings)) if (b.contains(this.x, this.z)) { this.bld = b; break; }
  }

  tryJump() {
    const c = findVault(this.x, this.z, CFG.playerRadius, this.floor, this.bld);
    if (c) {
      const [lx, lz] = toLocal(c, this.x, this.z);
      let tlx = lx, tlz = lz;
      const m = CFG.playerRadius + 0.35;
      if (c.hx < c.hz) { tlx = -Math.sign(lx || 1) * (c.hx + m); tlz = Math.max(-c.hz + 0.3, Math.min(c.hz - 0.3, lz)); }
      else { tlz = -Math.sign(lz || 1) * (c.hz + m); tlx = Math.max(-c.hx + 0.3, Math.min(c.hx - 0.3, lx)); }
      const [tx, tz] = toWorld(c, tlx, tlz);
      if (!overlaps(tx, tz, CFG.playerRadius * 0.9, this.floor, this.bld) && (this.floor > 0 || insideIsland(tx, tz))) {
        this.jump = { vault: true, t: 0, dur: 0.5, fx: this.x, fz: this.z, tx, tz, h: c.h + 0.35 };
        this.facing = Math.atan2(tx - this.x, tz - this.z);
        this.crouch = false;
        G.emit('vault', c);
        return;
      }
    }
    this.jump = { vault: false, t: 0, dur: 0.38, h: 0.45 };
  }

  tryAttack() {
    if (this.attackCd > 0) return;
    const w = WEAPONS[G.state.weapon];
    this.attackT = 1; this.attackCd = w.cooldown;
    const fx = Math.sin(this.facing), fz = Math.cos(this.facing);
    let best = null, bestD = 1e9;
    for (const g of G.guards) {
      if (g.down || !g.sameSpace(this)) continue;
      const dx = g.x - this.x, dz = g.z - this.z, d = Math.hypot(dx, dz);
      // Takedown: close behind an unaware guard.
      if (d < CFG.takedownRange && !g.aware) {
        const gf = [Math.sin(g.facing), Math.cos(g.facing)];
        if ((gf[0] * -dx + gf[1] * -dz) / (d || 1) < -0.2) { g.knockOut(); G.emit('takedown', g); return; }
      }
      if (d < w.reach + 0.35 && (fx * dx + fz * dz) / (d || 1) > 0.35 && d < bestD) { best = g; bestD = d; }
    }
    if (best) { best.hit(w.dmg, this.x, this.z); G.emit('hit', best); }
    else G.emit('swing');
  }

  hurt(n, fromX, fromZ) {
    if (this.invuln > 0 || G.cine?.active) return;
    G.state.hearts -= n;
    this.invuln = 0.8; this.hurtT = 0.25;
    const dx = this.x - fromX, dz = this.z - fromZ, d = Math.hypot(dx, dz) || 1;
    this.vx += (dx / d) * 6; this.vz += (dz / d) * 6;
    G.emit('hurt');
    if (G.state.hearts <= 0) G.emit('defeated');
  }

  setFloor(floor, x, z, bld) {
    this.floor = floor; this.x = x; this.z = z; this.vx = this.vz = 0;
    this.y = floor * CFG.floorHeight;
    if (bld !== undefined) this.bld = bld;
    if (floor === 0) this.updateBuilding();
  }

  render() {
    const m = this.mesh;
    if (this.heldName !== G.state.weapon) this.attachWeapon();
    this.crouchK += ((this.crouch ? 1 : 0) - this.crouchK) * 0.25;
    if (!this.jump) this.y = this.floor * CFG.floorHeight;
    m.position.set(this.x, this.y, this.z);
    m.rotation.y = this.facing;
    m.visible = !this.hidden;
    animate(m, { move: this.jump ? 0.3 : this.move, phase: this.phase, crouch: this.crouchK, attack: this.attackT > 0 ? 1 - this.attackT : 0, pose: this.pose, t: this.t });
    if (this.hurtT > 0) m.scale.set(1.12, 0.88, 1.12); else m.scale.set(1, 1, 1);
  }
}

export const tmpV = new THREE.Vector3();
