import * as THREE from 'three/webgpu';
import { CFG } from '../config.js';

/**
 * Fixed-angle orthographic camera. Gameplay and cinematics only change focus and size,
 * so every shot is a precise, held frame from the same iso angle.
 */
export class Rig {
  constructor() {
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 600);
    const p = THREE.MathUtils.degToRad(CFG.camPitch), y = THREE.MathUtils.degToRad(CFG.camYaw);
    this.dir = new THREE.Vector3(Math.sin(y) * Math.cos(p), Math.sin(p), Math.cos(y) * Math.cos(p));
    this.focus = new THREE.Vector3();
    this.size = CFG.gameplaySize;
    this.follow = true;
    this.apply();
  }

  snap(x, y, z, size) { this.focus.set(x, y, z); if (size) this.size = size; this.apply(); }

  track(x, y, z, size, dt) {
    const k = 1 - Math.exp(-7 * dt);
    this.focus.x += (x - this.focus.x) * k;
    this.focus.z += (z - this.focus.z) * k;
    this.focus.y += (y - this.focus.y) * (1 - Math.exp(-12 * dt));
    this.size += (size - this.size) * (1 - Math.exp(-4 * dt));
    this.apply();
  }

  apply() {
    const a = innerWidth / innerHeight;
    const c = this.cam;
    c.left = -this.size * a; c.right = this.size * a; c.top = this.size; c.bottom = -this.size;
    c.position.copy(this.focus).addScaledVector(this.dir, CFG.camDist);
    c.lookAt(this.focus);
    c.updateProjectionMatrix();
  }
}
