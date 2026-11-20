import * as THREE from 'three/webgpu';
import { G, addCash } from '../core/game.js';
import { addBox } from '../core/collision.js';
import { mat } from '../entities/character.js';
import { signTexture } from '../core/batch.js';
import { instance } from '../core/assets.js';

const BOXG = new THREE.BoxGeometry(1, 1, 1);
function part(parent, w, h, d, color, x, y, z) {
  const m = new THREE.Mesh(BOXG, mat(color));
  m.scale.set(w, h, d); m.position.set(x, y, z);
  m.castShadow = m.receiveShadow = true;
  parent.add(m);
  return m;
}

export function register(it) {
  it.floor ??= 0; it.bld ??= null; it.r ??= 1.4;
  G.interactables.push(it);
  return it;
}

/**
 * Lootable object: crate, desk, safe or dossier.
 * opts: { kind, cash, secretOf, floor, bld, parent, x, z, y, rot }
 */
export function makeLoot(o) {
  const g = new THREE.Group();
  g.position.set(o.mx ?? o.x, o.y ?? 0, o.mz ?? o.z);
  g.rotation.y = o.rot ?? 0;
  (o.parent || G.scene).add(g);
  let lid = null, door = null, model = null;
  const modelName = { crate: 'crate', desk: 'desk', safe: 'safe', dossier: 'desk' }[o.kind];
  model = instance(modelName);
  if (model) {
    g.add(model);
    const fp = model.userData.size;
    addBox(o.x, o.z, fp.x / 2, fp.z / 2, o.rot ?? 0, { sight: false, h: fp.y, floor: o.floor ?? 0, bld: o.bld ?? null });
    if (o.kind === 'dossier') lid = part(g, 0.5, 0.05, 0.36, '#d9412b', 0.2, fp.y + 0.03, 0.05);
  } else if (o.kind === 'crate') {
    part(g, 0.7, 0.62, 0.7, '#b07a43', 0, 0.31, 0);
    part(g, 0.72, 0.09, 0.72, '#7a5230', 0, 0.06, 0);
    lid = part(g, 0.74, 0.1, 0.74, '#7a5230', 0, 0.66, 0);
    addBox(o.x, o.z, 0.36, 0.36, o.rot ?? 0, { sight: false, h: 0.7, floor: o.floor ?? 0, bld: o.bld ?? null });
  } else if (o.kind === 'desk') {
    part(g, 1.6, 0.08, 0.8, '#8a5a36', 0, 0.78, 0);
    part(g, 0.5, 0.74, 0.74, '#6e4529', -0.5, 0.37, 0);
    part(g, 0.08, 0.74, 0.7, '#6e4529', 0.74, 0.37, 0);
    lid = part(g, 0.46, 0.18, 0.04, '#a9744a', -0.5, 0.6, 0.39);
    part(g, 0.35, 0.03, 0.28, '#f6f1e9', 0.3, 0.83, 0.05);
    addBox(o.x, o.z, 0.8, 0.4, o.rot ?? 0, { sight: false, h: 0.8, floor: o.floor ?? 0, bld: o.bld ?? null });
  } else if (o.kind === 'safe') {
    part(g, 0.9, 1.0, 0.8, '#4a5560', 0, 0.5, 0);
    door = new THREE.Group(); door.position.set(-0.42, 0, 0.41); g.add(door);
    part(door, 0.84, 0.9, 0.06, '#5d6a76', 0.42, 0.5, 0);
    part(door, 0.18, 0.18, 0.06, '#ffd23f', 0.42, 0.55, 0.04);
    addBox(o.x, o.z, 0.45, 0.4, o.rot ?? 0, { sight: false, h: 1, floor: o.floor ?? 0, bld: o.bld ?? null });
  } else if (o.kind === 'dossier') {
    // Dossier sits on the official's desk: a red folder with a stamp.
    part(g, 1.8, 0.08, 0.9, '#5b3a22', 0, 0.8, 0);
    part(g, 0.1, 0.8, 0.8, '#4a2e1a', -0.82, 0.4, 0);
    part(g, 0.1, 0.8, 0.8, '#4a2e1a', 0.82, 0.4, 0);
    lid = part(g, 0.5, 0.05, 0.36, '#d9412b', 0.2, 0.87, 0.05);
    addBox(o.x, o.z, 0.9, 0.45, o.rot ?? 0, { sight: false, h: 0.8, floor: o.floor ?? 0, bld: o.bld ?? null });
  }

  const loot = { done: false, group: g };
  const label = { crate: 'Search crate', desk: 'Rifle through desk', safe: 'Crack safe', dossier: 'Take the folder' }[o.kind];
  register({
    x: o.x, z: o.z, floor: o.floor ?? 0, bld: o.bld ?? null, r: 1.5,
    hold: o.kind === 'safe' ? 1.6 : o.kind === 'dossier' ? 0.8 : 0,
    needsUndetected: true,
    enabled: () => !loot.done,
    label: () => label,
    use: () => {
      loot.done = true;
      G.emit('loot', o.kind);
      if (model && o.kind === 'crate') { model.rotation.set(0.3, 0.4, 1.4); model.position.y = 0.3; }
      if (model && o.kind === 'safe') { const glow = part(g, 0.5, 0.5, 0.05, '#ffd23f', 0, 0.55, 0.5); glow.material = glow.material; }
      if (model && o.kind === 'desk') for (let i = 0; i < 4; i++) { const p = part(g, 0.3, 0.02, 0.22, '#f6f1e9', (Math.random() - 0.5) * 2, 0.02, 0.7 + Math.random() * 0.5); p.rotation.y = Math.random() * 3; }
      if (lid && o.kind === 'crate') { lid.position.set(0.5, 0.05, 0.2); lid.rotation.set(0.2, 0.6, 1.2); }
      if (lid && o.kind === 'desk') lid.position.z = 0.6;
      if (lid && o.kind === 'dossier') lid.visible = false;
      if (door) door.rotation.y = -1.6;
      if (o.cash) { addCash(o.cash); G.hud.toast(`+$${o.cash}`, label === 'Search crate' ? 'Finders keepers.' : 'Nobody saw that.'); }
      if (o.kind === 'crate') G.emit('crateLooted');
      if (o.secretOf) { G.state.secrets[o.secretOf] = true; G.emit('secret', o.secretOf); }
    },
  });
  return loot;
}

/** Cash bundle dropped by knocked-out guards. Walk over it to collect. */
export function dropCash(x, z, y, floor, bld, amount) {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  part(g, 0.4, 0.12, 0.24, '#5cb85c', 0, 0.06, 0);
  part(g, 0.41, 0.13, 0.06, '#f6f1e9', 0, 0.06, 0);
  G.scene.add(g);
  G.pickups.push({ g, x, z, floor, bld, amount, t: 0 });
}

export function updatePickups(dt) {
  const p = G.player;
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const k = G.pickups[i];
    k.t += dt;
    k.g.rotation.y += dt * 2;
    k.g.position.y = k.floor * 4 + 0.3 + Math.sin(k.t * 4) * 0.08;
    k.g.visible = isFloorVisible(k.floor, k.bld);
    if (k.floor === p.floor && Math.hypot(p.x - k.x, p.z - k.z) < 0.9) {
      addCash(k.amount);
      G.emit('pickup');
      G.hud.toast(`+$${k.amount}`, 'Unemployment benefits.');
      G.scene.remove(k.g);
      G.pickups.splice(i, 1);
    }
  }
}

export function isFloorVisible(floor, bld) {
  if (!bld) return true;
  return bld.view < 0 ? floor === 0 || true : floor <= bld.view;
}

/** Floating "TOP SECRET" folder used in the secret-found shot. */
export function dossierIcon() {
  const tex = signTexture('TOP SECRET', { bg: '#e8c48a', fg: '#d9412b', border: '#d9412b', w: 512, h: 256, font: 'bold 96px Arial Black, Impact' });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.8), new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide }));
  return m;
}
