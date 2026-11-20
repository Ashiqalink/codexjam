import * as THREE from 'three/webgpu';

const matCache = new Map();
export function mat(color) {
  if (!matCache.has(color)) matCache.set(color, new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.85 }));
  return matCache.get(color);
}
const BOXG = new THREE.BoxGeometry(1, 1, 1);
function box(parent, w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(BOXG, mat(color));
  m.scale.set(w, h, d);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}

export const HAIR_STYLES = ['Shipwrecked Mess', 'Buzz Cut', 'Mohawk', 'Afro', 'Mullet', 'Bald'];
export const OUTFITS = [
  { name: 'Sailor Stripes', shirt: '#f4f1ea', stripe: '#2e5c9e', pants: '#d9a441', sleeves: true },
  { name: 'Hawaiian', shirt: '#e2553f', stripe: '#ffd23f', pants: '#f4f1ea', sleeves: true },
  { name: 'Cheap Suit', shirt: '#2b3a5c', stripe: null, pants: '#2b3a5c', sleeves: true, tie: '#d9412b' },
  { name: 'Tank Top', shirt: '#ffffff', stripe: null, pants: '#3d6f8f', sleeves: false },
];

/**
 * Box-built character. Root sits at the feet and faces +Z.
 * Parts are pivoted so walk cycles and poses are plain rotations.
 */
export function makeCharacter(look) {
  const L = { skin: '#c98c5a', shirt: '#f4f1ea', pants: '#d9a441', hair: '#3a2418', shoes: '#2a1a12', hairStyle: 0, sleeves: true, belly: 0, ...look };
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const bw = 0.56 + L.belly * 0.2, bd = 0.32 + L.belly * 0.24;

  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group();
    hip.position.set(s * 0.14, 0.8, 0);
    body.add(hip);
    box(hip, 0.21, 0.68, 0.23, L.pants, 0, -0.34, 0);
    box(hip, 0.23, 0.12, 0.32, L.shoes, 0, -0.74, 0.04);
    legs.push(hip);
  }

  // Torso pivots at the hips, so leaning and slumping bend the upper body.
  const torso = new THREE.Group();
  torso.position.set(0, 0.8, 0);
  body.add(torso);
  box(torso, bw, 0.64, bd, L.shirt, 0, 0.32, 0);
  if (L.stripe) for (const y of [0.12, 0.3, 0.48]) box(torso, bw + 0.02, 0.07, bd + 0.02, L.stripe, 0, y, 0);
  if (L.tie) box(torso, 0.09, 0.4, 0.02, L.tie, 0, 0.36, bd / 2 + 0.01);
  if (L.sash) {
    const s = box(torso, 0.12, 0.85, bd + 0.03, L.sash, 0, 0.32, 0);
    s.rotation.z = 0.7;
  }
  if (L.belt) box(torso, bw + 0.03, 0.08, bd + 0.03, L.belt, 0, 0.04, 0);

  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group();
    sh.position.set(s * (bw / 2 + 0.08), 0.6, 0);
    torso.add(sh);
    box(sh, 0.15, 0.58, 0.17, L.sleeves ? L.shirt : L.skin, 0, -0.29, 0);
    if (L.sleeves && L.stripe) box(sh, 0.16, 0.07, 0.18, L.stripe, 0, -0.12, 0);
    box(sh, 0.13, 0.13, 0.15, L.skin, 0, -0.62, 0);
    arms.push(sh);
  }

  const head = new THREE.Group();
  head.position.set(0, 0.66, 0);
  torso.add(head);
  box(head, 0.4, 0.4, 0.38, L.skin, 0, 0.2, 0);
  box(head, 0.06, 0.07, 0.02, '#1b120d', -0.09, 0.22, 0.195);
  box(head, 0.06, 0.07, 0.02, '#1b120d', 0.09, 0.22, 0.195);
  box(head, 0.06, 0.06, 0.05, L.skin, 0, 0.16, 0.21);
  if (L.mustache) box(head, 0.22, 0.05, 0.03, L.mustache, 0, 0.1, 0.2);
  if (L.glasses) { box(head, 0.36, 0.08, 0.03, '#111', 0, 0.23, 0.2); }
  addHair(head, L.hairStyle, L.hair);
  if (L.cap) {
    box(head, 0.43, 0.12, 0.41, L.cap, 0, 0.43, 0);
    box(head, 0.36, 0.04, 0.18, L.cap, 0, 0.38, 0.27);
  }
  if (L.hat) {
    box(head, 0.62, 0.04, 0.6, L.hat, 0, 0.42, 0);
    box(head, 0.4, 0.26, 0.4, L.hat, 0, 0.56, 0);
    box(head, 0.41, 0.06, 0.41, L.hatBand || '#d9412b', 0, 0.47, 0);
  }

  root.userData.parts = { body, torso, head, legs, arms };
  return root;
}

function addHair(head, style, c) {
  switch (style) {
    case 0: // shipwrecked mess
      box(head, 0.42, 0.12, 0.4, c, 0, 0.44, -0.01);
      box(head, 0.14, 0.1, 0.12, c, -0.1, 0.52, 0.06);
      box(head, 0.12, 0.08, 0.14, c, 0.12, 0.5, -0.08);
      box(head, 0.42, 0.18, 0.08, c, 0, 0.3, -0.19);
      break;
    case 1: box(head, 0.41, 0.05, 0.39, c, 0, 0.42, 0); break;
    case 2: box(head, 0.1, 0.24, 0.38, c, 0, 0.5, 0); break;
    case 3: box(head, 0.62, 0.42, 0.58, c, 0, 0.46, -0.04); break;
    case 4:
      box(head, 0.42, 0.1, 0.4, c, 0, 0.44, 0);
      box(head, 0.42, 0.42, 0.1, c, 0, 0.2, -0.22);
      break;
    case 5: default: break;
  }
}

/**
 * Pose and animate. s: { move 0..1, phase, crouch 0..1, attack 0..1, pose }
 */
export function animate(ch, s) {
  const { body, torso, head, legs, arms } = ch.userData.parts;
  body.position.set(0, 0, 0);
  body.rotation.set(0, 0, 0);
  body.scale.set(1, 1, 1);
  torso.rotation.set(0, 0, 0);
  head.rotation.set(0, 0, 0);
  for (const l of legs) l.rotation.set(0, 0, 0);
  for (const a of arms) a.rotation.set(0, 0, 0);

  const pose = s.pose || 'stand';
  if (pose === 'facedown') {
    body.rotation.x = Math.PI / 2; body.position.y = 0.18; body.position.z = -0.8;
    arms[0].rotation.z = -1.3; arms[1].rotation.z = 1.3;
    return;
  }
  if (pose === 'ko') {
    body.rotation.x = -Math.PI / 2; body.position.y = 0.18; body.position.z = 0.8;
    arms[0].rotation.z = -1.1; arms[1].rotation.z = 1.1;
    legs[0].rotation.z = -0.2; legs[1].rotation.z = 0.2;
    return;
  }
  if (pose === 'sit') {
    body.position.y = -0.62;
    legs[0].rotation.x = -1.5; legs[1].rotation.x = -1.4;
    torso.rotation.x = -0.15;
    arms[0].rotation.x = 0.5; arms[1].rotation.x = 0.5;
    head.rotation.x = -0.25;
    return;
  }
  if (pose === 'slump') {
    torso.rotation.x = 0.12;
    head.rotation.x = 0.12;
    arms[0].rotation.x = -0.9; arms[1].rotation.x = -0.9;
    arms[0].rotation.z = 0.25; arms[1].rotation.z = -0.25;
    return;
  }
  if (pose === 'shock') {
    body.scale.set(1.12, 0.86, 1.12);
    arms[0].rotation.z = -2.4; arms[1].rotation.z = 2.4;
    head.rotation.x = -0.2;
    return;
  }
  if (pose === 'cheer') {
    arms[0].rotation.z = -2.7; arms[1].rotation.z = 2.7;
    body.position.y = Math.abs(Math.sin((s.phase || 0) * 2)) * 0.15;
    return;
  }

  const m = s.move || 0;
  const ph = s.phase || 0;
  const sw = Math.sin(ph) * 0.75 * m;
  legs[0].rotation.x = sw; legs[1].rotation.x = -sw;
  arms[0].rotation.x = -sw * 0.8; arms[1].rotation.x = sw * 0.8;
  body.position.y = Math.abs(Math.cos(ph)) * 0.06 * m;
  torso.rotation.x = m * 0.08;

  const c = s.crouch || 0;
  if (c > 0) {
    body.position.y -= 0.32 * c;
    legs[0].rotation.x += -0.9 * c; legs[1].rotation.x += -0.9 * c;
    // Knees bend: counter-rotate by shifting body forward a bit.
    body.position.z = -0.1 * c;
    torso.rotation.x += 0.55 * c;
    head.rotation.x -= 0.4 * c;
    arms[0].rotation.x -= 0.4 * c; arms[1].rotation.x -= 0.4 * c;
  }

  const a = s.attack || 0;
  if (a > 0) {
    // Wind up then swing the right arm across.
    const k = a < 0.35 ? a / 0.35 : 1 - (a - 0.35) / 0.65;
    arms[1].rotation.x = -2.2 * k;
    arms[1].rotation.z = 0.4 * k;
    torso.rotation.y = -0.5 * k;
  }

  if (s.lookAround) head.rotation.y = Math.sin((s.t || 0) * 1.6) * 0.8;
  if (s.idle) torso.rotation.x += Math.sin((s.t || 0) * 2) * 0.02;
}
