import * as THREE from 'three/webgpu';
import { G } from '../core/game.js';
import { CFG, WEAPONS } from '../config.js';
import { resolve, sightBlocked } from '../core/collision.js';
import { makeCharacter, animate } from './character.js';
import { dropCash } from '../world/interactive.js';

const GUARD_LOOK = { skin: '#b07848', shirt: '#6b7a3c', pants: '#454d2a', cap: '#454d2a', glasses: true, hair: '#2a1a12', hairStyle: 1, belt: '#2a1a12' };
const CONE_COLORS = { patrol: new THREE.Color('#fff6c9'), sus: new THREE.Color('#ffb23f'), alert: new THREE.Color('#ff3b2b') };

function angDiff(a, b) { let d = b - a; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return d; }

export class Guard {
  /**
   * o: { x, z, floor, bld, route: [[x,z],...], facing, kind: 'guard'|'official', look, name, hp, cash, wait }
   */
  constructor(o) {
    this.kind = o.kind || 'guard';
    this.name = o.name || 'Guard';
    this.x = o.x; this.z = o.z;
    this.floor = o.floor || 0; this.bld = o.bld || null;
    this.route = o.route && o.route.length ? o.route : [[o.x, o.z]];
    this.home = { x: o.x, z: o.z, facing: o.facing ?? 0 };
    this.ri = 0; this.wait = 0; this.waitAt = o.wait ?? 1.5;
    this.facing = o.facing ?? 0;
    this.hp = o.hp ?? CFG.guard.hp;
    this.cash = o.cash ?? (10 + Math.floor(Math.random() * 16));
    this.state = 'patrol';
    // Set once the building is hijacked: the guard keeps walking its route but
    // ignores the player instead of freezing in the down/slump pose forever.
    this.stoodDown = false;
    this.meter = 0; this.lost = 0; this.cd = 0; this.windup = 0; this.stun = 0;
    this.last = null; this.phase = Math.random() * 6; this.move = 0; this.t = 0;
    this.stuckT = 0; this.lastX = o.x; this.lastZ = o.z;
    this.pose = null; this.hitFlash = 0;
    this.speedMult = this.kind === 'official' ? 0.8 : 1;

    this.mesh = makeCharacter({ ...GUARD_LOOK, ...(o.look || {}) });
    G.scene.add(this.mesh);

    const fov = (CFG.guard.fov * Math.PI) / 180;
    const geo = new THREE.CircleGeometry(1, 24, -Math.PI / 2 - fov / 2, fov);
    geo.rotateX(-Math.PI / 2);
    this.coneMat = new THREE.MeshBasicMaterial({ color: CONE_COLORS.patrol, transparent: true, opacity: 0.22, depthWrite: false });
    this.cone = new THREE.Mesh(geo, this.coneMat);
    this.cone.position.y = 0.06;
    this.cone.renderOrder = 2;
    this.mesh.add(this.cone);

    this.marker = document.createElement('div');
    this.marker.className = 'marker';
    document.getElementById('markers').appendChild(this.marker);
    G.guards.push(this);
  }

  get y() { return this.floor * CFG.floorHeight; }
  get down() { return this.state === 'down'; }
  get aware() { return this.state === 'alert' || this.meter > 0.5; }

  sameSpace(p) { return p.floor === this.floor && (this.floor === 0 || p.bld === this.bld); }

  viewRange(p) {
    if (this.state === 'alert') return 11;
    return p.crouch ? CFG.guard.viewCrouched : CFG.guard.view;
  }

  canSee(p) {
    if (this.stoodDown || p.hidden || !this.sameSpace(p)) return false;
    const dx = p.x - this.x, dz = p.z - this.z;
    const d = Math.hypot(dx, dz);
    if (d > this.viewRange(p)) return false;
    const fov = this.state === 'alert' ? 2.6 : (CFG.guard.fov * Math.PI) / 180;
    if (d > 0.8 && Math.abs(angDiff(this.facing, Math.atan2(dx, dz))) > fov / 2) return false;
    return !sightBlocked(this.x, this.z, p.x, p.z, this.floor, this.bld);
  }

  alert(p, shout = true) {
    if (this.down || this.stoodDown) return;
    const was = this.state === 'alert';
    this.state = 'alert'; this.meter = 1; this.lost = 0;
    this.last = { x: p.x, z: p.z };
    if (!was && shout) {
      G.emit('alert', this);
      for (const g of G.guards) {
        if (g !== this && !g.down && g.floor === this.floor && g.bld === this.bld && Math.hypot(g.x - this.x, g.z - this.z) < CFG.guard.alertRadius) g.alert(p, false);
      }
    }
  }

  hear(x, z) {
    if (this.down || this.stoodDown || this.state === 'alert') return;
    this.state = 'sus';
    this.last = { x, z };
    this.meter = Math.max(this.meter, 0.35);
  }

  hit(dmg, fromX, fromZ) {
    if (this.down) return;
    this.hp -= dmg;
    this.hitFlash = 0.15;
    const dx = this.x - fromX, dz = this.z - fromZ, d = Math.hypot(dx, dz) || 1;
    [this.x, this.z] = resolve(this.x + (dx / d) * 0.5, this.z + (dz / d) * 0.5, 0.35, this.floor, this.bld);
    if (this.hp <= 0) this.knockOut();
    else { this.alert(G.player); this.stun = 0.35; this.windup = 0; }
  }

  knockOut() {
    this.state = 'down';
    this.meter = 0;
    const mult = WEAPONS[G.state.weapon]?.cashMult || 1;
    if (this.cash > 0) dropCash(this.x + 0.6, this.z + 0.4, this.y, this.floor, this.bld, this.cash * mult);
    this.cash = 0;
    G.emit('knockout', this);
  }

  moveTo(tx, tz, speed, dt) {
    const dx = tx - this.x, dz = tz - this.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) { this.move = 0; return true; }
    const step = Math.min(d, speed * dt);
    const nx = this.x + (dx / d) * step, nz = this.z + (dz / d) * step;
    [this.x, this.z] = resolve(nx, nz, 0.35, this.floor, this.bld);
    this.turnTo(Math.atan2(dx, dz), dt, 9);
    this.move = Math.min(1, speed / 3);
    return d < 0.3;
  }

  turnTo(a, dt, rate = 6) { this.facing += angDiff(this.facing, a) * (1 - Math.exp(-rate * dt)); }

  update(dt) {
    this.t += dt;
    const p = G.player;
    if (this.hitFlash > 0) this.hitFlash -= dt;
    if (this.down) { this.render(); return; }
    if (this.stoodDown && this.state !== 'patrol') {
      this.state = 'patrol'; this.meter = 0; this.last = null; this.windup = 0;
    }
    if (this.stun > 0) { this.stun -= dt; this.move = 0; this.render(); return; }

    const sees = this.canSee(p);
    const C = CFG.guard;
    if (this.state !== 'alert') {
      if (sees) {
        const d = Math.hypot(p.x - this.x, p.z - this.z);
        const close = 1 + 1.5 * (1 - d / this.viewRange(p));
        this.meter += (dt / (C.detectTime * G.detectMult)) * close;
        this.last = { x: p.x, z: p.z };
        if (this.meter >= 1) this.alert(p);
        else if (this.meter > 0.25 && this.state !== 'sus') { this.state = 'sus'; G.emit('suspicious', this); }
      } else {
        this.meter = Math.max(0, this.meter - dt * 0.35);
      }
      // Sprinting makes noise.
      if (p.noisy && this.sameSpace(p) && !p.hidden && Math.hypot(p.x - this.x, p.z - this.z) < C.hearing) this.hear(p.x, p.z);
    }

    if (this.state === 'patrol') this.patrol(dt);
    else if (this.state === 'sus') {
      this.move = 0;
      if (this.last) {
        this.turnTo(Math.atan2(this.last.x - this.x, this.last.z - this.z), dt, 5);
        if (this.meter > 0.3 && !sees && this.kind !== 'official') this.moveTo(this.last.x, this.last.z, C.patrolSpeed * 0.8, dt);
      }
      if (this.meter <= 0.02) { this.state = 'patrol'; this.meter = 0; }
    } else if (this.state === 'alert') {
      if (sees) { this.last = { x: p.x, z: p.z }; this.lost = 0; }
      else this.lost += dt;
      const dp = Math.hypot(p.x - this.x, p.z - this.z);
      if (sees && dp < C.attackRange + 0.2) {
        this.move = 0;
        this.turnTo(Math.atan2(p.x - this.x, p.z - this.z), dt, 12);
        this.cd -= dt;
        if (this.windup > 0) {
          this.windup -= dt;
          if (this.windup <= 0) {
            if (dp < C.attackRange + 0.35 && this.sameSpace(p)) p.hurt(1, this.x, this.z);
            this.cd = C.attackCooldown;
          }
        } else if (this.cd <= 0) this.windup = 0.35;
      } else if (this.last) {
        this.windup = 0;
        const arrived = this.moveTo(this.last.x, this.last.z, C.chaseSpeed * this.speedMult, dt);
        if (arrived && !sees) { this.move = 0; this.facing += dt * 1.5; }
      }
      if (this.lost > C.loseTime || (!this.sameSpace(p) && this.lost > 2)) {
        this.state = 'patrol'; this.meter = 0; this.last = null;
        G.emit('lost', this);
      }
    }
    this.render();
  }

  patrol(dt) {
    if (this.route.length === 1) {
      const [hx, hz] = this.route[0];
      if (Math.hypot(hx - this.x, hz - this.z) > 0.3) this.moveTo(hx, hz, CFG.guard.patrolSpeed, dt);
      else { this.move = 0; this.turnTo(this.home.facing + Math.sin(this.t * 0.5) * 0.9, dt, 2); }
      return;
    }
    if (this.wait > 0) {
      this.wait -= dt; this.move = 0;
      this.facing += Math.sin(this.t * 1.3) * dt * 0.8;
      return;
    }
    const [tx, tz] = this.route[this.ri];
    const arrived = this.moveTo(tx, tz, CFG.guard.patrolSpeed, dt);
    // If furniture or a wall blocks the leg, move on to the next waypoint
    // instead of pressing into it forever.
    const moved = Math.hypot(this.x - this.lastX, this.z - this.lastZ);
    this.lastX = this.x; this.lastZ = this.z;
    if (arrived) {
      this.stuckT = 0;
      this.ri = (this.ri + 1) % this.route.length;
      this.wait = this.waitAt;
    } else if (moved < 0.02) {
      this.stuckT += dt;
      if (this.stuckT > 1.2) {
        this.stuckT = 0;
        this.ri = (this.ri + 1) % this.route.length;
        this.wait = Math.min(this.waitAt, 0.6);
      }
    } else this.stuckT = 0;
  }

  render() {
    const m = this.mesh;
    m.position.set(this.x, this.y, this.z);
    m.rotation.y = this.facing;
    this.phase += this.move * 0.16 * (this.state === 'alert' ? 1.6 : 1);
    animate(m, { move: this.move, phase: this.phase, pose: this.pose || (this.down ? 'ko' : null), attack: this.windup > 0 ? 1 - this.windup / 0.35 : 0, t: this.t, lookAround: this.state === 'sus' });
    if (this.hitFlash > 0) m.scale.set(1.15, 0.85, 1.15); else m.scale.set(1, 1, 1);

    const vis = this.isVisible();
    m.visible = vis;
    const p = G.player;
    const showCone = vis && !this.down && !this.stoodDown && !G.cine?.active && this.sameSpace(p);
    this.cone.visible = showCone;
    if (showCone) {
      const r = this.viewRange(p);
      this.cone.scale.set(r, 1, r);
      this.coneMat.color.copy(this.state === 'alert' ? CONE_COLORS.alert : this.meter > 0.05 ? CONE_COLORS.sus : CONE_COLORS.patrol);
      this.coneMat.opacity = this.state === 'alert' ? 0.28 : 0.2 + this.meter * 0.15;
    }
  }

  isVisible() {
    if (!this.bld) return true;
    const v = this.bld.view;
    return v < 0 ? this.floor === 0 : this.floor <= v;
  }

  updateMarker(cam, w, h) {
    const show = this.isVisible() && !this.down && !this.stoodDown && !G.cine?.active && (this.state === 'alert' || this.state === 'sus');
    if (!show) { this.marker.style.display = 'none'; return; }
    const v = new THREE.Vector3(this.x, this.y + 2.3, this.z).project(cam);
    this.marker.style.display = 'block';
    this.marker.style.left = ((v.x + 1) / 2) * w + 'px';
    this.marker.style.top = ((1 - v.y) / 2) * h + 'px';
    this.marker.textContent = this.state === 'alert' ? '!' : '?';
    this.marker.className = 'marker ' + (this.state === 'alert' ? 'alert' : 'sus');
  }

  /** Put back on patrol after a player respawn. */
  reset() {
    if (this.down) return;
    this.state = 'patrol'; this.meter = 0; this.last = null; this.windup = 0; this.cd = 0;
    this.x = this.route[0][0]; this.z = this.route[0][1]; this.ri = 0;
    this.stuckT = 0; this.lastX = this.x; this.lastZ = this.z;
  }
}
