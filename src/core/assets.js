import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Generated GLB assets (Hyper3D). Each entry is normalized on load:
 * scaled so its largest horizontal side (or height) matches `size`, pivot at bottom centre.
 * If a file is missing, the game keeps its primitive stand-in.
 */
export const MANIFEST = {
  shipwreck: { size: 16, fit: 'length' },
  palm: { size: 4.4, fit: 'height' },
  stall: { size: 3.3, fit: 'length' },
  stall_weapons: { size: 3.4, fit: 'length' },
  stall_barber: { size: 3.4, fit: 'length' },
  stall_tailor: { size: 3.4, fit: 'length' },
  stall_coconut: { size: 3.4, fit: 'length' },
  stall_fish: { size: 3.4, fit: 'length' },
  stall_fruit: { size: 3.4, fit: 'length' },
  stall_cloth: { size: 3.4, fit: 'length' },
  dumpster: { size: 1.7, fit: 'length' },
  crate: { size: 0.75 },
  safe: { size: 1.05, fit: 'height' },
  desk: { size: 1.7, fit: 'length' },
  truck: { size: 5.4, fit: 'length' },
  church: { size: 10 },
  boat: { size: 3.6, fit: 'length' },
  watertower: { size: 8.5, fit: 'height' },
  house: { size: 5, fit: 'length' },
  lighthouse: { size: 11, fit: 'height' },
  chicken: { size: 0.7 },
  chair: { size: 0.95, fit: 'height' },
  baguette: { size: 1.1 },
  bush: { size: 1.5 },
  rock: { size: 1.6 },
  briefcase: { size: 0.6, fit: 'length' },
};

const loader = new GLTFLoader();
const cache = {};

export async function loadAssets(names = Object.keys(MANIFEST)) {
  await Promise.all(names.map(async (n) => {
    try {
      const gltf = await loader.loadAsync(`./assets/models/${n}.glb`);
      cache[n] = normalize(gltf.scene, MANIFEST[n]);
    } catch (e) {
      console.warn('asset missing, using stand-in:', n, e.message);
    }
  }));
  return cache;
}

export function has(n) { return !!cache[n]; }

/** Fresh instance (shares geometry and materials). */
export function instance(n) {
  const src = cache[n];
  if (!src) return null;
  const o = src.clone(true);
  return o;
}

function normalize(root, spec = {}) {
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  let ref;
  if (spec.fit === 'height') ref = size.y;
  else if (spec.fit === 'length') ref = Math.max(size.x, size.z);
  else ref = Math.max(size.x, size.y, size.z);
  const s = (spec.size || 1) / (ref || 1);
  const inner = new THREE.Group();
  root.position.set(-center.x, -box.min.y, -center.z);
  inner.add(root);
  inner.scale.setScalar(s);
  if (spec.rotY) inner.rotation.y = spec.rotY;
  const outer = new THREE.Group();
  outer.add(inner);
  outer.traverse((m) => {
    if (m.isMesh) {
      m.castShadow = true;
      m.receiveShadow = true;
      // Match the flat-shaded look of the primitives.
      if (m.material) {
        const old = Array.isArray(m.material) ? m.material[0] : m.material;
        const map = old.map || old.emissiveMap || null;
        const mat = new THREE.MeshStandardMaterial({ map, color: map ? 0xffffff : old.color, roughness: 0.85, metalness: 0, flatShading: spec.flat !== false });
        if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
        m.material = mat;
      }
    }
  });
  size.multiplyScalar(s);
  outer.userData.size = { x: size.x, y: size.y, z: size.z };
  return outer;
}
