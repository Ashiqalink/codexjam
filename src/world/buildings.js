import * as THREE from 'three/webgpu';
import { G } from '../core/game.js';
import { Building, makeDumpster } from './building.js';
import { LAYOUT } from './island.js';
import { CYL12, CONE8, CYL8, ICO, DODE } from './props.js';
import { randomLook } from '../entities/npc.js';
import { rng } from '../core/batch.js';

const OFFICIAL_LOOKS = {
  dmv: { skin: '#e0b089', shirt: '#8a8f6a', pants: '#5a5d44', tie: '#2f6d94', hair: '#c9c2b8', hairStyle: 1, belly: 0.6, glasses: true, mustache: '#c9c2b8' },
  sanitation: { skin: '#a8693d', shirt: '#e2732b', pants: '#3d4426', hair: '#1b120d', hairStyle: 5, belly: 0.9, cap: '#e2732b', mustache: '#1b120d' },
};

/** Story data per building. Names and secrets are placeholders (DESIGN.md: OPEN). */
export const STORY = {
  dmv: {
    official: 'Director Lentón',
    secret: 'He sold 400 driving licences to a goat.',
    endorse: 'Director Lentón endorses you. Warmly.',
    endorseKO: 'He woke up already endorsing you.',
    lie: 'The DMV has not been hijacked. That banner has always been there. Since 1802.',
    clout: 20,
    perk: 'PERK: Guards take twice as long to spot you.',
  },
  sanitation: {
    official: 'Chief Basura',
    secret: "He dumps the island's trash in the President's pool.",
    endorse: 'Chief Basura endorses you. Loudly. Against his will.',
    endorseKO: 'He woke up already endorsing you.',
    lie: 'Reports of a stranger in a dumpster are false. That was the Minister, relaxing.',
    clout: 15,
    perk: 'PERK: Hide in dumpsters (E).',
  },
};

const lockedMid = (closedText) => () => {
  if (!G.beachTierDone) return closedText;
  return 'Under construction. Opens in the next build.';
};

export function buildBuildings(worldBatch) {
  const L = LAYOUT;
  const r = rng(42);

  // ---------------- DMV (Tier 1, floor 0 only) ----------------
  const dmv = new Building({
    id: 'dmv', name: 'DMV', sign: 'D.M.V.', x: L.dmv[0], z: L.dmv[1], w: 24, d: 16, floors: 1,
    wall: '#e8dcc0', trim: '#7d8f69', interior: '#f1ead8', roofColor: '#9aa58a', floorColors: ['#cfc6b0'],
    door: { x: -4, w: 2.4 }, signStyle: { bg: '#7d8f69', fg: '#fff4d6', border: '#fff4d6' },
    build(f, c) {
      // Counter splits the lobby from the back office. Low, so guards see over it.
      c.box(-4.3, -2, 15.4, 0.7, 1.1, '#a9744a', { sight: false });
      for (const x of [-9, -5, -1]) c.box(x, -2, 0.08, 0.6, 0.7, '#cfe9f2', { y: 1.1, collide: false });
      // Partition to the director's office and storage.
      c.wall(6, -8, 6, 8, { doors: [[-3.3, 1.6], [4.8, 1.6]] });
      c.wall(6, 2, 12, 2);
      // Back office: filing cabinets, desks, a safe.
      for (let x = -11; x <= -6; x += 1.2) c.box(x, -7.5, 1, 0.6, 1.8, '#7c8c8f');
      c.loot(-11, -6.2, { kind: 'safe', cash: 80, rot: Math.PI / 2 });
      c.loot(-3.5, -6, { kind: 'desk', cash: 25 });
      c.loot(1.5, -6, { kind: 'desk', cash: 20 });
      // Lobby: queue posts, benches, ticket machine, plant.
      for (let z = 1.2; z <= 6; z += 1.2) { c.box(-7.2, z, 0.12, 0.12, 0.9, '#c9a227', { collide: false }); c.box(-4.8, z, 0.12, 0.12, 0.9, '#c9a227', { collide: false }); }
      for (const x of [-7.2, -4.8]) c.box(x, 3.6, 0.04, 4.8, 0.04, '#d9412b', { y: 0.82, collide: false });
      for (const z of [3, 5]) c.box(1.5, z, 3.2, 0.6, 0.5, '#2f6d94', { sight: false });
      c.box(-1.5, 7.3, 0.7, 0.5, 1.4, '#d9412b');
      c.box(4.8, 7.3, 0.6, 0.6, 0.6, '#7a5230');
      c.box(4.8, 7.3, 0.9, 0.9, 0.9, '#3fb85c', { y: 0.6, collide: false });
      c.sign('NOW SERVING: 0003', -6, 2.3, -7.8, 4.5, 0.8, 0, { bg: '#1b2a4a', fg: '#ffd23f', border: '#ffd23f' });
      c.sign('YOUR NUMBER: 9412', -6, 1.4, -7.8, 4.5, 0.8, 0, { bg: '#fff4d6', fg: '#d9412b' });
      // The queue that never moves, and the clerks who never look up.
      for (let i = 0; i < 5; i++) c.npc(-6, 1.6 + i * 0.95, Math.PI, { look: randomLook(r) });
      for (const x of [-9, -5, -1]) c.npc(x, -3.1, 0, { look: { ...randomLook(r), shirt: '#f6f1e9', tie: '#7d8f69' }, pose: 'slump' });
      // Storage room.
      for (let x = 7; x <= 11; x += 1.3) c.box(x, 7.4, 1.0, 0.7, 2.0, '#9c8a7a');
      c.loot(9.5, 4.5, { kind: 'desk', cash: 30 });
      // Director's office.
      c.loot(9.3, -5.2, { kind: 'dossier', secretOf: 'dmv' });
      c.box(11.4, -7.4, 0.6, 0.6, 1.0, '#3fb85c');
      c.sign('EMPLOYEE OF THE DECADE', 9, 2.4, -7.8, 3.6, 0.7, 0, { bg: '#ffd23f', fg: '#2a1a12' });
      c.official([[9.3, -6.9], [11, 0.6]], { name: STORY.dmv.official, look: OFFICIAL_LOOKS.dmv, facing: 0 });
      // Guards.
      c.guard([[-10.5, 6.6], [4.5, 6.6], [4.5, 0.4], [-10.5, 0.4]], { facing: Math.PI / 2 });
      c.guard([[-10, -4.4], [4.6, -4.4]], { facing: Math.PI / 2, wait: 2.5 });
    },
  });
  dmv.locked = () => null;
  makeDumpster(worldBatch, dmv.x + 14, dmv.z + 3, Math.PI / 2);
  makeDumpster(worldBatch, dmv.x - 14, dmv.z - 4, Math.PI / 2);

  // ---------------- Sanitation Dept. (Tier 2, floors 0 and 1) ----------------
  const san = new Building({
    id: 'sanitation', name: 'Sanitation Dept.', sign: 'SANITATION DEPT.', x: L.sanitation[0], z: L.sanitation[1], w: 20, d: 20, floors: 2,
    wall: '#c9d6c2', trim: '#3f7d4a', interior: '#e6ecdf', roofColor: '#7c8c7a', floorColors: ['#9da59a', '#d8d2c2'],
    door: { x: 0, w: 3.2 }, doorColor: '#3f7d4a', signStyle: { bg: '#3f7d4a', fg: '#fff4d6', border: '#fff4d6' },
    stairs: [{ from: 0, x: -8, z: -2 }],
    build(f, c) {
      // Shared template: the north-east room. Floor 0 = compactor, floor 1 = the Chief's office.
      c.wall(3, -10, 3, -3);
      c.wall(3, -3, 10, -3, { doors: [[6.5, 1.6]] });
      if (f === 0) {
        // Depot: garbage truck, bags, lockers.
        if (!c.model('truck', 0.5, 2.1, Math.PI / 2)) {
          c.box(0.5, 1.5, 2.4, 5.2, 2.2, '#f6f1e9');
          c.box(0.5, 4.6, 2.4, 1.4, 2.6, '#3f7d4a');
          c.box(0.5, -0.5, 2.5, 1.2, 1.0, '#2a1a12', { y: 1.4, collide: false });
        }
        // Trash bag pile (one invisible collider under it).
        for (let i = 0; i < 16; i++) c.b.add(DODE, ['#2a2a2a', '#3e4a3a', '#4a4f5a'][i % 3], [5.8 + (i % 4) * 0.9 + (i % 2) * 0.2, 0.35 + (i > 11 ? 0.5 : 0), 2.8 + Math.floor((i % 12) / 4) * 1.0], [i, i * 2, 0], [0.55, 0.45, 0.55]);
        c.box(7.1, 3.9, 3.4, 3.0, 0.9, '#2a2a2a', { hidden: true, sight: false });
        for (let z = 1; z <= 7; z += 1.2) c.box(-9.4, z, 0.6, 1.0, 1.9, '#7c8c8f');
        c.loot(-5, 8.2, { kind: 'desk', cash: 20 });
        // Compactor room.
        c.box(6.5, -7.8, 4, 3, 2.4, '#7c8c8f');
        c.box(6.5, -7.8, 3.6, 2.6, 0.2, '#d9412b', { y: 2.4, collide: false });
        c.loot(9.2, -4.4, { kind: 'safe', cash: 70, rot: -Math.PI / 2 });
        c.guard([[-5, 6.5], [3.8, 6.5], [3.8, -2], [-5, -2]], { facing: Math.PI / 2 });
        c.guard([[-1, -8.5], [-1, -4]], { facing: Math.PI, wait: 2.5 });
      } else {
        // Offices: same shell, desks where the truck was.
        for (const [x, z, cash] of [[-4, 2, 0], [0, 2, 25], [-4, 5.5, 0], [0, 5.5, 0], [-4, 9, 20], [0, 9, 0]]) {
          if (cash) c.loot(x, z, { kind: 'desk', cash });
          else if (!c.model('desk', x, z)) c.box(x, z, 1.6, 0.8, 0.8, '#8a5a36', { sight: false });
        }
        for (let z = 0; z <= 6; z += 1.2) c.box(9.4, z, 0.6, 1.0, 1.9, '#7c8c8f');
        c.box(5, 8.5, 2, 1, 1.0, '#3fb85c', { sight: false });
        // Chief's office.
        c.loot(6.5, -7.4, { kind: 'dossier', secretOf: 'sanitation' });
        c.box(9.3, -9.3, 0.8, 0.8, 1.2, '#3fb85c');
        c.sign('CLEANEST CHIEF 1999', 6.5, 2.4, -9.8, 3.6, 0.7, 0, { bg: '#ffd23f', fg: '#2a1a12' });
        c.official([[6.5, -9], [9, -4.5]], { name: STORY.sanitation.official, look: OFFICIAL_LOOKS.sanitation, facing: 0 });
        c.guard([[-6, 7.5], [7.5, 7.5], [7.5, 0.5], [-6, 0.5]], { facing: Math.PI / 2 });
        c.guard([[-5.5, -8.5], [1.5, -8.5], [1.5, -4.5], [-5.5, -4.5]], { facing: Math.PI / 2, wait: 1.8 });
      }
    },
  });
  san.locked = () => null;
  makeDumpster(worldBatch, san.x + 12, san.z + 6, 0.2);
  makeDumpster(worldBatch, san.x + 4, san.z + 12.5, 0);
  makeDumpster(worldBatch, san.x - 4, san.z + 12.5, 0);

  // ---------------- Tax Office (exterior only for now) ----------------
  const tax = new Building({
    id: 'tax', name: 'Tax Office', sign: 'TAX OFFICE', x: L.tax[0], z: L.tax[1], w: 22, d: 18, floors: 2,
    wall: '#b9c4d6', trim: '#2f4d74', interior: '#e3e8ef', roofColor: '#7e8aa0',
    door: { x: 0, w: 2.4 }, signStyle: { bg: '#2f4d74', fg: '#ffd23f', border: '#ffd23f' },
    exteriorDeco(b) { for (const x of [-3, 3]) b.add(CYL12, '#e3e8ef', [x, 1.9, 9.6], [0, 0, 0], [0.35, 3.8, 0.35]); },
  });
  tax.locked = lockedMid('CLOSED FOR LUNCH (SINCE 1994)');

  // ---------------- Propaganda Tower (exterior only for now) ----------------
  const tower = new Building({
    id: 'tower', name: 'Propaganda Tower', sign: 'STATE TV', x: L.tower[0], z: L.tower[1], w: 14, d: 14, floors: 3,
    wall: '#e4d3e8', trim: '#7a3f8a', interior: '#efe6f2', roofColor: '#8f7a96',
    door: { x: 0, w: 2.4 }, signStyle: { bg: '#7a3f8a', fg: '#fff4d6', border: '#fff4d6' },
    roofDeco(b) {
      for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) b.add(CYL8, '#9c9c9c', [x * 1.2, 4, z * 1.2], [x * 0.08, 0, -z * 0.08], [0.12, 8, 0.12]);
      b.add(CYL8, '#d9412b', [0, 8.5, 0], [0, 0, 0], [0.25, 1, 0.25]);
      b.add(ICO, '#d9412b', [0, 9.2, 0], [0, 0, 0], 0.35);
      b.add(CYL12, '#f6f1e9', [3.5, 1.4, 2.5], [0.6, 0, 0], [1.4, 0.2, 1.4]);
    },
  });
  tower.locked = lockedMid('OFF AIR. PLEASE STAND BY.');

  // ---------------- Presidential Palace (exterior only for now) ----------------
  const palace = new Building({
    id: 'palace', name: 'Presidential Palace', sign: 'PALACIO PRESIDENCIAL', x: L.palace[0], z: L.palace[1], w: 30, d: 22, floors: 3,
    wall: '#f2c6cf', trim: '#f6f1e9', interior: '#fbeef1', roofColor: '#f6f1e9', windowColor: '#2f6d94',
    door: { x: 0, w: 3.2 }, doorColor: '#c9a227', signStyle: { bg: '#c9a227', fg: '#fff4d6', border: '#fff4d6' },
    roofDeco(b) {
      b.add(CYL12, '#f6f1e9', [0, 1.2, 0], [0, 0, 0], [5, 2.4, 5]);
      b.add(new THREE.SphereGeometry(1, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#e2b93b', [0, 2.4, 0], [0, 0, 0], [4.6, 4.2, 4.6]);
      b.add(CYL8, '#e2b93b', [0, 7, 0], [0, 0, 0], [0.15, 1.6, 0.15]);
      b.box(0.6, 7.2, 0, 1.2, 0.8, 0.05, '#d9412b');
    },
    exteriorDeco(b) {
      for (let x = -12; x <= 12; x += 3) if (Math.abs(x) > 2) b.add(CYL12, '#f6f1e9', [x, 3.9, 11.6], [0, 0, 0], [0.4, 7.8, 0.4]);
      b.box(0, 7.8, 11.6, 27, 0.5, 1.2, '#f6f1e9');
      for (let i = 0; i < 3; i++) b.box(0, i * 0.15, 12.5 + i * 0.6, 8 - i * 0.8, 0.15, 1.2, '#e8e0d8');
    },
  });
  palace.locked = () => (G.state.clout >= 80 ? 'The President is in a meeting. (Next build.)' : 'BY APPOINTMENT ONLY. (80% clout required.)');

  for (const b of Object.values(G.buildings)) b.finishRails();
  return { dmv, san, tax, tower, palace };
}
