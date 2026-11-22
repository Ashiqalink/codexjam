import * as THREE from 'three/webgpu';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler();
const _s = new THREE.Vector3();
const _p = new THREE.Vector3();

export const sharedMat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.85, metalness: 0 });

/**
 * Collects many primitives with per-vertex colors and merges them into one mesh.
 * Static scenery uses this so the island is a handful of draw calls.
 */
export class Batch {
  constructor() { this.parts = []; }

  /** pos [x,y,z], rot [x,y,z] radians, scale [x,y,z] or number */
  add(geo, color, pos = [0, 0, 0], rot = [0, 0, 0], scale = 1) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    for (const k of Object.keys(g.attributes)) if (k !== 'position') g.deleteAttribute(k);
    const sc = typeof scale === 'number' ? [scale, scale, scale] : scale;
    _m.compose(_p.set(...pos), _q.setFromEuler(_e.set(rot[0], rot[1], rot[2])), _s.set(...sc));
    g.applyMatrix4(_m);
    const c = new THREE.Color(color);
    const n = g.attributes.position.count;
    const col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.parts.push(g);
    return this;
  }

  /** Box helper: center x,z; bottom at y. */
  box(x, y, z, w, h, d, color, rotY = 0) {
    return this.add(BOX, color, [x, y + h / 2, z], [0, rotY, 0], [w, h, d]);
  }

  build({ cast = true, receive = true, material = sharedMat } = {}) {
    if (!this.parts.length) return new THREE.Group();
    const geo = mergeGeometries(this.parts, false);
    geo.computeVertexNormals();
    geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = cast;
    mesh.receiveShadow = receive;
    this.parts.length = 0;
    return mesh;
  }
}

export const BOX = new THREE.BoxGeometry(1, 1, 1);

/** Standalone (non-batched) mesh with flat color. */
export function solid(geo, color, opts = {}) {
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85, ...opts }));
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

export function rng(seed) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Canvas texture sign with chunky text. */
export function signTexture(text, { bg = '#fff4d6', fg = '#2a1a12', w = 512, h = 128, font = 'bold 64px Arial Black, Impact, sans-serif', border = '#2a1a12' } = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.lineWidth = 12; g.strokeStyle = border; g.strokeRect(6, 6, w - 12, h - 12);
  g.fillStyle = fg; g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
  let size = parseInt(font.match(/(\d+)px/)[1], 10);
  while (g.measureText(text).width > w - 40 && size > 12) { size -= 4; g.font = font.replace(/\d+px/, size + 'px'); }
  g.fillText(text, w / 2, h / 2 + 4);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

export function signMesh(text, width, height, opts) {
  const tex = signTexture(text, opts);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, height), new THREE.MeshBasicMaterial({ map: tex }));
  return m;
}
