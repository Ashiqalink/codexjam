import { G } from '../core/game.js';
import { CFG } from '../config.js';
import { resolve } from '../core/collision.js';
import { makeCharacter, animate } from './character.js';

const SKINS = ['#c98c5a', '#a8693d', '#e0b089', '#8a5432', '#f0c9a0'];
const SHIRTS = ['#e86a92', '#2f6d94', '#ffd23f', '#7cc46a', '#f2a33a', '#b05bd6', '#f6f1e9', '#d9412b'];
const PANTS = ['#3d6f8f', '#d8c7a5', '#2a1a12', '#6b4226', '#f6f1e9'];

export function randomLook(r = Math.random) {
  const pick = (a) => a[(r() * a.length) | 0];
  return {
    skin: pick(SKINS), shirt: pick(SHIRTS), pants: pick(PANTS),
    hair: pick(['#1b120d', '#3a2418', '#7a4b2a', '#c9c2b8']), hairStyle: (r() * 6) | 0,
    stripe: r() < 0.25 ? pick(SHIRTS) : null, sleeves: r() < 0.7, belly: r() < 0.3 ? r() : 0,
    hat: r() < 0.15 ? pick(['#f6e7c8', '#2a1a12']) : null,
  };
}

/**
 * Non-hostile NPC. mode 'wander' walks between random points inside area {x1,z1,x2,z2};
 * mode 'idle' stands still facing a direction (queues, clerks, vendors).
 */
export class Npc {
  constructor(o) {
    this.x = o.x; this.z = o.z; this.floor = o.floor || 0; this.bld = o.bld || null;
    this.mode = o.mode || 'idle';
    this.area = o.area; this.facing = o.facing ?? 0;
    this.look = o.look || randomLook();
    this.mesh = makeCharacter(this.look);
    this.target = null; this.wait = Math.random() * 3; this.phase = Math.random() * 6; this.move = 0; this.t = Math.random() * 10;
    this.speed = 1.2 + Math.random() * 0.6;
    this.pose = o.pose || null;
    G.scene.add(this.mesh);
    G.npcs.push(this);
    this.render();
  }

  update(dt) {
    this.t += dt;
    if (this.mode === 'wander' && this.area) {
      if (this.wait > 0) { this.wait -= dt; this.move = 0; }
      else {
        if (!this.target) {
          const a = this.area;
          this.target = [a.x1 + Math.random() * (a.x2 - a.x1), a.z1 + Math.random() * (a.z2 - a.z1)];
        }
        const dx = this.target[0] - this.x, dz = this.target[1] - this.z, d = Math.hypot(dx, dz);
        if (d < 0.4) { this.target = null; this.wait = 1 + Math.random() * 4; this.move = 0; }
        else {
          const ox = this.x, oz = this.z;
          [this.x, this.z] = resolve(this.x + (dx / d) * this.speed * dt, this.z + (dz / d) * this.speed * dt, 0.3, this.floor, this.bld);
          if (Math.hypot(this.x - ox, this.z - oz) < this.speed * dt * 0.2) { this.target = null; this.wait = 0.5; }
          let da = Math.atan2(dx, dz) - this.facing;
          while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
          this.facing += da * (1 - Math.exp(-8 * dt));
          this.move = 0.6;
          this.phase += dt * this.speed * 2.2;
        }
      }
    }
    this.render();
  }

  render() {
    const m = this.mesh;
    m.position.set(this.x, this.floor * CFG.floorHeight, this.z);
    m.rotation.y = this.facing;
    animate(m, { move: this.move, phase: this.phase, pose: this.pose, idle: true, t: this.t });
    if (this.bld) { const v = this.bld.view; m.visible = v < 0 ? this.floor === 0 : this.floor <= v; }
  }
}
