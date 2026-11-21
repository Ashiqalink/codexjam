import * as THREE from 'three/webgpu';
import { G } from '../core/game.js';
import { CFG } from '../config.js';
import { LAYOUT } from '../world/island.js';
import { STORY } from '../world/buildings.js';
import { dossierIcon } from '../world/interactive.js';
import { signMesh } from '../core/batch.js';
import { overlaps, resolve } from '../core/collision.js';
import { Npc, randomLook } from '../entities/npc.js';

const DAY = { bg: '#7cc6de' };
let rain = null, wreckInfo = null;

export function setupStory(info) {
  wreckInfo = info;
  rain = makeRain();

  const t = G.state.tutorial;
  G.on('crateLooted', () => {
    t.crates++;
    if (t.stage === 0) {
      if (t.crates >= 3) setStage(1); else G.hud.objective(`Search the wreckage for anything valuable (${t.crates}/3 crates).`);
    }
  });
  G.on('vault', () => { if (t.stage <= 1) setStage(2); });
  G.on('takedown', () => { G.state.takedowns = (G.state.takedowns || 0) + 1; G.hud.toast('TAKEDOWN!', 'He was asking for it.', 1.6); });
  G.on('secret', (id) => secretScene(id));
  G.on('blackmail', (b) => blackmailScene(b));
  G.on('hide', (spot) => toggleHide(spot));
  G.on('defeated', () => defeated());
  G.on('finale', () => finale());
}

export function setStage(n) {
  const t = G.state.tutorial;
  t.stage = n;
  const H = G.hud;
  switch (n) {
    case 0: H.objective('Search the wreckage for anything valuable (0/3 crates).'); H.hint('E  interact'); break;
    case 1: H.objective('Climb over the fallen hull plank.'); H.hint('SPACE  climb (at low obstacles)'); break;
    case 2: H.objective('Get past the beach patrol.'); H.hint('C  crouch: shorter vision cones\nSneak up behind + CLICK/F  takedown'); break;
    case 3: H.objective('Follow the noise to the market.'); H.hint('SHIFT  sprint (guards hear it)'); break;
    case 4: H.objective('Dig up dirt on the DMV Director or the Sanitation Chief.'); H.hint(''); break;
  }
}

/** Per-frame tutorial and zone checks. */
export function updateStory() {
  const t = G.state.tutorial, p = G.player;
  if (t.stage === 2 && wreckInfo) {
    const [gx, gz] = wreckInfo.gate;
    if (Math.hypot(p.x - gx, p.z - gz) > 16) setStage(3);
  }
  if (t.stage < 4) {
    const [mx, mz] = LAYOUT.market;
    if (Math.hypot(p.x - mx, p.z - mz) < 17) {
      t.stage = 4; G.hud.hint('');
      refreshObjective();
      G.hud.toast('THE MARKET', 'Spend your dirty money here.', 3);
    }
  }
}

function refreshObjective() {
  const h = G.state.hijacked;
  if (h.palace) G.hud.objective('You are the President. Enjoy the island. Nothing has changed.');
  else if (h.tax && h.tower) G.hud.objective(`The Palace is open. ${STORY.palace.official} keeps his secrets on the top floor.`);
  else if (h.dmv && h.sanitation) {
    if (h.tax) G.hud.objective(`Now State TV. ${STORY.tower.official} runs the Propaganda Tower.`);
    else if (h.tower) G.hud.objective(`Now the Tax Office. ${STORY.tax.official} has never paid for anything.`);
    else G.hud.objective(`Mid-island is open. Blackmail ${STORY.tax.official} (Tax Office) and ${STORY.tower.official} (State TV).`);
  }
  else if (h.dmv) G.hud.objective(`Now the Sanitation Dept. ${STORY.sanitation.official} has secrets too.`);
  else if (h.sanitation) G.hud.objective(`Now the DMV. ${STORY.dmv.official} has secrets too.`);
  else G.hud.objective('Dig up dirt on the DMV Director or the Sanitation Chief.');
}
// ---------------- Lighting moods ----------------
function day() {
  G.scene.background.set(DAY.bg);
  G.hemi.intensity = CFG.hemi; G.hemi.color.set('#bfe3ff'); G.hemi.groundColor.set('#d9b47a');
  G.sun.intensity = CFG.sun; G.fill.intensity = CFG.fill;
}
function night() {
  G.scene.background.set('#0b1a2e');
  G.hemi.intensity = 0.6; G.hemi.color.set('#6f8fb8'); G.hemi.groundColor.set('#1b2a4a');
  G.sun.intensity = 0; G.fill.intensity = 0.25;
}
function wideShadows(on) {
  const s = G.sun.shadow.camera;
  const r = on ? 130 : 30;
  s.left = -r; s.right = r; s.top = r; s.bottom = -r; s.far = on ? 400 : 160;
  s.updateProjectionMatrix();
}

function makeRain() {
  const n = 400;
  const m = new THREE.InstancedMesh(new THREE.BoxGeometry(0.04, 0.9, 0.04), new THREE.MeshBasicMaterial({ color: '#9fb8d8' }), n);
  m.userData.drops = Array.from({ length: n }, () => [(Math.random() - 0.5) * 40, Math.random() * 20, (Math.random() - 0.5) * 40]);
  m.visible = false;
  m.frustumCulled = false;
  G.scene.add(m);
  return m;
}
function updateRain(dt, cx, cz) {
  const mtx = new THREE.Matrix4();
  rain.userData.drops.forEach((d, i) => {
    d[1] -= dt * 28; if (d[1] < 0) d[1] += 20;
    mtx.makeRotationZ(0.25); mtx.setPosition(cx + d[0], d[1], cz + d[2]);
    rain.setMatrixAt(i, mtx);
  });
  rain.instanceMatrix.needsUpdate = true;
}

// ---------------- Sequences ----------------
export function introSequence() {
  const p = G.player;
  const ship = wreckInfo.ship;
  const [sx, sz] = LAYOUT.spawn;
  let flash = 0, flashes = 0;
  return {
    intro: true,
    shots: [
      {
        focus: () => [ship.position.x, 1.5, ship.position.z], size: 9, dur: 3.2,
        caption: 'The SS Opportunity. Capacity: 200. Lifeboats: 1.',
        enter() { night(); ship.visible = true; rain.visible = true; p.mesh.visible = false; G.emit('storm'); },
        update(t, dt) {
          updateRain(dt, ship.position.x, ship.position.z);
          // Two lightning flashes.
          flash = (t > 0.6 && t < 0.72) || (t > 1.9 && t < 1.98) || (t > 2.06 && t < 2.14) ? 1 : 0;
          if (flash && flashes < (t > 1.8 ? 2 : 1)) { flashes++; G.emit('lightning'); }
          G.hemi.intensity = flash ? 3.2 : 0.6;
          G.scene.background.set(flash ? '#cfd8e8' : '#0b1a2e');
        },
      },
      {
        focus: [sx + (LAYOUT.wreck[0] - sx) * 0.45, 0.3, sz + (LAYOUT.wreck[1] - sz) * 0.45], size: 8.5, dur: 3.2,
        caption: 'You survived. Your luggage did not.',
        enter() { G.emit('stormEnd'); day(); ship.visible = false; rain.visible = false; p.pose = 'facedown'; p.render(); p.mesh.visible = true; },
      },
      {
        focus: [0, 0, 8], size: 80, dur: 3.2,
        caption: `${CFG.islandName}. Population: 41,000. Jobs: 3.`,
        enter() { day(); ship.visible = false; rain.visible = false; wideShadows(true); },
      },
      {
        focus: () => [p.x, 0.8, p.z], size: 3.4, dur: 1.8,
        enter() { wideShadows(false); p.pose = 'sit'; p.facing = Math.atan2(LAYOUT.market[0] - p.x, LAYOUT.market[1] - p.z); p.render(); },
      },
    ],
    end() {
      G.emit('stormEnd');
      day(); wideShadows(false); ship.visible = false; rain.visible = false;
      p.pose = null; p.mesh.visible = true; p.render();
      G.hud.show(true);
      setStage(0);
    },
  };
}

function secretScene(id) {
  const b = G.buildings[id];
  const off = b.official;
  const p = G.player;
  const icon = dossierIcon();
  G.cine.play({
    shots: [
      {
        focus: () => [p.x, p.y + 1.6, p.z], size: 3.4, dur: 2.8,
        caption: STORY[id].secret, style: STORY[id].serious ? 'serious' : undefined,
        enter() { icon.position.set(p.x, p.y + 2.6, p.z); icon.quaternion.copy(G.rig.cam.quaternion); G.scene.add(icon); },
        update(t) { icon.position.y = p.y + 2.6 + Math.min(1, t * 3) * 0.3; },
      },
      {
        focus: () => [off.x, off.y + 1.2, off.z], size: 3.0, dur: 1.6,
        enter() { G.forceView = { bld: b, view: off.floor }; G.scene.remove(icon); if (!off.down) { off.pose = 'shock'; off.facing = Math.atan2(p.x - off.x, p.z - off.z); off.render(); } },
      },
    ],
    end() {
      G.forceView = null;
      G.scene.remove(icon);
      off.pose = null;
      G.hud.objective(`Blackmail ${off.name}. Walk up to him and press E.`);
      G.hud.toast('SECRET FOUND', 'Leverage acquired.', 2);
    },
  });
}

function blackmailScene(b) {
  const id = b.id, s = STORY[id], off = b.official;
  const wasKO = off.down;
  G.state.hijacked[id] = true;
  G.state.clout = Math.min(100, G.state.clout + s.clout);
  // The building stands down: staff now report to you.
  for (const g of G.guards) if (g.bld === b && !g.down) { g.state = 'down'; g.pose = 'slump'; }
  off.state = 'down'; off.pose = 'slump';
  const sign = signMesh('VOTE THE NOBODY', 1.1, 0.5, { bg: '#d9412b', fg: '#ffd23f', border: '#ffd23f' });
  sign.position.set(0, 1.15, 0.5);
  off.mesh.add(sign);
  const p = G.player;
  off.facing = Math.atan2(p.x - off.x, p.z - off.z);
  off.render();

  const topY = b.floors * CFG.floorHeight;
  G.cine.play({
    shots: [
      { focus: () => [off.x, off.y + 1.2, off.z], size: 3.2, dur: 2.6, caption: wasKO ? s.endorseKO : s.endorse, style: s.serious ? 'serious' : undefined, enter() { G.forceView = { bld: b, view: off.floor }; } },
      {
        focus: [b.x + 2, topY - 2, b.z + b.d / 2], size: Math.max(b.w, b.d) * 0.6, dur: 3.0,
        caption: `Clout: ${G.state.clout}%`,
        enter() { G.forceView = { bld: b, view: -1 }; b.banner.visible = true; b.banner.scale.y = 0.001; G.emit('bannerRaise'); },
        update(t) { const k = Math.min(1, t / 1.4); b.banner.scale.y = Math.max(0.001, 1 - Math.pow(1 - k, 3)); },
      },
    ],
    end() {
      G.forceView = null;
      b.banner.visible = true; b.banner.scale.y = 1;
      G.emit('clout');
      G.hud.ticker(s.lie);
      G.emit('tickerShown');
      G.hud.toast(`${b.name.toUpperCase()} HIJACKED`, s.perk, 4);
      refreshObjective();
      if (G.beachTierDone) G.emit('beachTierDone');
      if (id === 'palace') finale();
    },
  });
}

function toggleHide(spot) {
  const p = G.player;
  if (!p.hidden) {
    p.hidden = true; p.hideSpot = spot; p.x = spot.x; p.z = spot.z; p.vx = p.vz = 0; p.crouch = false;
    G.hud.toast('Hidden.', 'It smells like a campaign promise.', 1.4);
  } else {
    p.hidden = false;
    // Step out on whichever side is free.
    let placed = false;
    for (const [ox, oz] of [[0, 1.5], [1.6, 0], [-1.6, 0], [0, -1.5]]) {
      const x = spot.x + ox, z = spot.z + oz;
      if (!overlaps(x, z, CFG.playerRadius, 0, null)) { p.x = x; p.z = z; placed = true; break; }
    }
    if (!placed) [p.x, p.z] = resolve(spot.x, spot.z + 1.5, CFG.playerRadius, 0, null);
    p.hideSpot = null;
  }
}

function defeated() {
  const fade = document.getElementById('fade');
  fade.classList.add('on');
  G.player.frozen = true;
  setTimeout(() => {
    const [sx, sz] = LAYOUT.spawn;
    const p = G.player;
    p.hidden = false; p.jump = null; p.crouch = false;
    p.setFloor(0, sx + 1.5, sz + 1.5, null);
    G.state.hearts = CFG.hearts;
    G.state.cash = Math.floor(G.state.cash / 2);
    for (const g of G.guards) g.reset();
    G.emit('cash'); G.emit('hearts');
    G.rig.snap(p.x, 0, p.z);
    p.frozen = false;
    fade.classList.remove('on');
    G.hud.toast('You woke up on the beach.', 'Your wallet is lighter. Someone helped themselves.', 3.5);
  }, 900);
}

// ---------------- Finale: the election, then the twist ----------------
function finale() {
  const p = G.player, pal = G.buildings.palace, ship = wreckInfo.ship;
  const fx = pal.x, fz = pal.z + pal.d / 2 + 2.2;
  const [sx, sz] = LAYOUT.spawn;
  let crowd = [], nobody = null, flash = 0;
  G.state.clout = 100;
  G.emit('clout');
  G.cine.play({
    shots: [
      {
        focus: [fx, 2, fz + 4], size: 16, dur: 3.4,
        caption: 'ELECTION DAY. Candidates: 1. Turnout: 102%.',
        enter() {
          day();
          p.setFloor(0, fx, fz, null); p.facing = 0; p.pose = 'cheer'; p.render();
          for (let i = 0; i < 18; i++) {
            const a = (i / 18) * Math.PI - Math.PI, r = 6 + (i % 3) * 1.6;
            const n = new Npc({ x: fx + Math.cos(a) * r, z: fz + 2 - Math.sin(a) * r * 0.6, facing: Math.PI, look: randomLook(), pose: 'cheer' });
            n.facing = Math.atan2(fx - n.x, fz - n.z); n.render();
            crowd.push(n);
          }
        },
      },
      { focus: () => [p.x, 1.2, p.z], size: 4, dur: 3.0, caption: 'PRESIDENT NOBODY. 102% OF THE VOTE.' },
      { focus: () => [p.x, 1.2, p.z], size: 4.4, dur: 3.2, style: 'serious', caption: 'The Director. The Chief. The Minister. The Anchor. Everyone kept their job.' },
      { focus: [fx, 3, fz - 4], size: 15, dur: 3.2, style: 'serious', caption: 'No secret was ever made public. You need them now.' },
      {
        focus: () => [ship.position.x, 1.5, ship.position.z], size: 9, dur: 3.0, style: 'serious',
        caption: 'Six months later. Another storm.',
        enter() { night(); ship.visible = true; rain.visible = true; G.emit('storm'); },
        update(t, dt) {
          updateRain(dt, ship.position.x, ship.position.z);
          const f = (t > 0.8 && t < 0.92) || (t > 1.9 && t < 2.0) ? 1 : 0;
          if (f && !flash) G.emit('lightning');
          flash = f;
          G.hemi.intensity = f ? 3.2 : 0.6;
          G.scene.background.set(f ? '#cfd8e8' : '#0b1a2e');
        },
      },
      {
        focus: [sx + 1, 0.3, sz + 1], size: 6, dur: 3.0, style: 'serious',
        caption: 'Another nobody washes up.',
        enter() {
          G.emit('stormEnd'); day(); ship.visible = false; rain.visible = false;
          nobody = new Npc({ x: sx + 1, z: sz + 1, facing: 0, look: randomLook(), pose: 'facedown' });
        },
      },
      {
        focus: [sx + 1, 0.8, sz + 1], size: 3.6, dur: 3.4, style: 'serious',
        caption: 'He looks inland. Your face is on every wall.',
        enter() { nobody.pose = 'sit'; nobody.facing = Math.atan2(pal.x - nobody.x, pal.z - nobody.z); nobody.render(); },
      },
    ],
    end() {
      G.emit('stormEnd'); day(); ship.visible = false; rain.visible = false;
      for (const n of crowd) { n.pose = null; n.mode = 'wander'; n.area = { x1: fx - 14, z1: fz, x2: fx + 14, z2: fz + 12 }; }
      if (nobody) { nobody.pose = 'sit'; nobody.render(); }
      p.pose = null; p.render();
      G.state.won = true;
      refreshObjective();
      endCard();
    },
  });
}

function endCard() {
  const s = G.state;
  const el = document.getElementById('endcard');
  document.getElementById('end-stats').textContent =
    `Cash: $${s.cash}   �   Offices hijacked: ${Object.keys(s.hijacked).length}/5   �   Takedowns: ${s.takedowns || 0}   �   Vote: 102%`;
  el.classList.remove('hidden');
  G.player.frozen = true;
  const close = (e) => {
    if (e.type === 'keydown' && e.key !== 'Enter') return;
    el.classList.add('hidden'); G.player.frozen = false;
    removeEventListener('keydown', close); el.removeEventListener('click', close);
  };
  setTimeout(() => { addEventListener('keydown', close); el.addEventListener('click', close); }, 800);
}