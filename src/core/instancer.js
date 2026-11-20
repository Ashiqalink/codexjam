import * as THREE from 'three/webgpu';
import { has, instance } from './assets.js';

// Collects placements of generated assets and draws each as InstancedMesh (one draw call per part).
const placements = {};
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _s = new THREE.Vector3(), _p = new THREE.Vector3();

export function place(name, x, y, z, rotY = 0, scale = 1, tilt = [0, 0]) {
  if (!has(name)) return false;
  (placements[name] ||= []).push(_m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(tilt[0], rotY, tilt[1])), _s.set(scale, scale, scale)).clone());
  return true;
}

export function buildInstances(scene) {
  for (const [name, mats] of Object.entries(placements)) {
    const src = instance(name);
    src.updateMatrixWorld(true);
    src.traverse((m) => {
      if (!m.isMesh) return;
      const im = new THREE.InstancedMesh(m.geometry, m.material, mats.length);
      for (let i = 0; i < mats.length; i++) im.setMatrixAt(i, _m.multiplyMatrices(mats[i], m.matrixWorld));
      im.castShadow = true;
      im.receiveShadow = true;
      im.computeBoundingSphere();
      scene.add(im);
    });
  }
}

/** Footprint half-extents of an asset after normalization, for colliders. */
export function footprint(name, scale = 1) {
  const o = instance(name);
  if (!o) return null;
  const s = o.userData.size;
  return { hx: (s.x / 2) * scale, hz: (s.z / 2) * scale, h: s.y * scale };
}
