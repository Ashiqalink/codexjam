import * as THREE from 'three/webgpu';
import { G } from './core/game.js';
import { CFG } from './config.js';
import { Rig } from './core/rig.js';
import { Batch } from './core/batch.js';
import { buildIsland, LAYOUT, shorePoint } from './world/island.js';
import { buildWreck } from './world/wreck.js';
import { buildBuildings } from './world/buildings.js';
import { buildMarket } from './world/market.js';
import { updatePickups } from './world/interactive.js';
import { Player } from './entities/player.js';
import { Hud } from './ui/hud.js';
import { Cinema } from './systems/cinema.js';
import { input } from './systems/input.js';
import { updateInteract } from './systems/interact.js';
import { setupStory, updateStory, introSequence, setStage } from './systems/story.js';
import { loadAssets } from './core/assets.js';
import { buildInstances } from './core/instancer.js';
import { audio, hookAudio, titleMusic } from './systems/audio.js';

const errEl = document.getElementById('err');
const showErr = (m) => { errEl.textContent += m + '\n'; console.error(m); };
addEventListener('error', (e) => showErr(e.message + ' @ ' + (e.filename || '').split('/').pop() + ':' + e.lineno));
addEventListener('unhandledrejection', (e) => showErr('Promise: ' + (e.reason?.stack || e.reason)));

async function boot() {
  const renderer = new THREE.WebGPURenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  document.getElementById('app').appendChild(renderer.domElement);
  await renderer.init();
  G.renderer = renderer;
  console.log('backend:', renderer.backend?.isWebGPUBackend ? 'WebGPU' : 'WebGL2 fallback');

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#7cc6de');
  G.scene = scene;

  G.hemi = new THREE.HemisphereLight('#cdeeff', '#e9c98f', 1.35);
  scene.add(G.hemi);
  const sun = new THREE.DirectionalLight('#ffe3b8', 3.0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 160 });
  scene.add(sun, sun.target);
  G.sun = sun;

  G.rig = new Rig();
  G.hud = new Hud();
  G.cine = new Cinema();

  // Generated models first; anything missing falls back to primitives.
  await loadAssets();

  // World.
  buildIsland(scene);
  const wreck = buildWreck(scene);
  const outdoor = new Batch();
  buildBuildings(outdoor);
  buildMarket(scene);
  scene.add(outdoor.build());
  buildInstances(scene);
  hookAudio();
  const unlock = () => { audio.unlock().then(() => titleMusic(!G.started)); };
  addEventListener('pointerdown', unlock, { once: true });
  addEventListener('keydown', unlock, { once: true });

  const [sx, sz] = LAYOUT.spawn;
  G.player = new Player(sx, sz);
  setupStory(wreck);
  G.hud.refresh();

  debugStart(wreck);

  let last = performance.now();
  let stairCd = 0;
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    G.time += dt;
    const p = G.player;

    if (G.cine.active) {
      G.cine.update(dt);
      for (const n of G.npcs) n.update(dt);
    } else if (G.started) {
      p.update(dt);
      stairCd -= dt;
      for (const b of Object.values(G.buildings)) if (b.update(dt, stairCd)) { stairCd = 0.4; G.rig.snap(p.x, p.y, p.z); }
      for (const g of G.guards) g.update(dt);
      for (const n of G.npcs) n.update(dt);
      updatePickups(dt);
      updateInteract(dt);
      updateStory();
      G.rig.track(p.x, p.y, p.z, p.bld ? CFG.interiorSize : CFG.gameplaySize, dt);
    }
    G.hud.update(dt);
    audio.update(dt);

    for (const b of Object.values(G.buildings)) {
      if (G.forceView && G.forceView.bld === b) b.setView(G.forceView.view);
      else b.setView(p.bld === b ? p.floor : -1);
    }
    if (!G.cine.active) for (const g of G.guards) g.render();

    // Sun follows the camera focus so shadows stay crisp near the action.
    const f = G.rig.focus;
    sun.position.set(f.x - 24, f.y + 34, f.z + 18);
    sun.target.position.copy(f);

    G.hud.markers(G.rig.cam);
    renderer.render(scene, G.rig.cam);
    input.endFrame();
  });

  addEventListener('resize', () => { renderer.setSize(innerWidth, innerHeight); G.rig.apply(); });
  window.__G = G;
  if (G.debug.has('test')) import('./debug/tests.js').then((m) => m.runTests()).catch((e) => showErr(e.stack));
}

/**
 * URL options for testing:
 *   ?skip                 skip title and intro
 *   ?at=market|dmv|sanitation|village|palace|tax|tower|wreck|bar
 *   ?floor=1              (with ?at=<building>) start upstairs
 *   ?shot=0..3            hold one intro shot
 *   ?size=N               camera size override
 */
function debugStart(wreck) {
  const d = G.debug;
  const title = document.getElementById('title');
  const start = () => {
    title.classList.add('hidden');
    G.started = true;
  };

  if (d.has('viewer')) {
    // ?viewer=<asset>: show one generated asset on sand, in the gameplay camera.
    title.classList.add('hidden');
    const name = d.get('viewer');
    import('./core/assets.js').then(async (A) => {
      if (name === 'all') {
        await A.loadAssets();
        const names = Object.keys(A.MANIFEST);
        names.forEach((n, i) => {
          const o = A.instance(n); if (!o) return;
          const col = i % 6, row = Math.floor(i / 6);
          o.position.set(-60 + col * 12, 0, 20 + row * 12);
          G.scene.add(o);
        });
        G.player.setFloor(0, -70, 20, null);
        G.rig.snap(-30, 0, 32, Number(d.get('size')) || 26);
        return;
      }
      await A.loadAssets([name]);
      const o = A.instance(name);
      if (!o) { showErr('asset not found: ' + name); return; }
      const [x, z] = [0, 40];
      o.position.set(x, 0, z);
      G.scene.add(o);
      const s = o.userData.size;
      G.player.setFloor(0, x + s.x / 2 + 1.5, z + 1, null);
      G.rig.snap(x, s.y / 2, z, Number(d.get('size')) || Math.max(s.x, s.y, s.z) * 0.7);
      console.log('viewer size', [s.x, s.y, s.z].map((v) => v.toFixed(2)).join(' x '));
    });
    return;
  }

  if (d.has('shot')) {
    title.classList.add('hidden');
    G.started = true;
    const seq = introSequence();
    const n = Number(d.get('shot'));
    G.cine.play(seq);
    G.cine.shot(n);
    G.cine.update = function (dt) { this.t += dt; seq.shots[this.i].update?.(this.t, dt); };
    return;
  }

  if (d.has('skip') || d.has('at')) {
    start();
    G.hud.show(true);
    setStage(0);
    const at = d.get('at');
    const p = G.player;
    const b = at && G.buildings[at];
    if (b) {
      const fl = Number(d.get('floor') || 0);
      if (fl > 0) {
        const pad = b.pads.find((q) => q.to === fl);
        p.setFloor(fl, pad.lx, pad.lz, b);
      } else p.setFloor(0, b.x + (b.door?.x || 0), b.z + b.d / 2 - 1.5, b);
    } else if (at && LAYOUT[at]) {
      const [x, z] = LAYOUT[at];
      p.setFloor(0, x + 2, z + (at === 'market' ? 4 : 3), null);
    }
    if (at === 'market' || at === 'village') setStage(4);
    if (d.has('cash')) G.state.cash = Number(d.get('cash'));
    if (d.has('unlock')) { for (const k of ['dmv', 'sanitation', 'tax', 'tower']) G.state.hijacked[k] = true; G.state.clout = 80; }
    G.hud.refresh();
    G.rig.snap(p.x, p.y, p.z, Number(d.get('size')) || (p.bld ? CFG.interiorSize : CFG.gameplaySize));
    if (d.has('size')) { CFG.gameplaySize = CFG.interiorSize = Number(d.get('size')); }
    // ?demo=secret|blackmail plays that scene for the building in ?at, holding each shot longer.
    if (d.has('demo') && b) {
      const off = b.official;
      p.setFloor(b.officialFloor, off.x, off.z + 2.7, b);
      setTimeout(() => {
        if (d.get('demo') === 'finale') G.emit('finale');
        else if (d.get('demo') === 'secret') { G.state.secrets[b.id] = true; G.emit('secret', b.id); }
        else { G.state.secrets[b.id] = true; G.emit('blackmail', b); }
        const sh = G.cine.cur?.seq.shots;
        if (sh) for (const s of sh) s.dur *= Number(d.get('slow') || 4);
      }, 500);
    }
    return;
  }

  // Normal start: click the title, then the intro plays.
  G.rig.snap(...LAYOUT.spawn.flatMap((v, i) => (i === 0 ? [v, 0] : [v])));
  title.addEventListener('click', () => {
    start();
    G.cine.play(introSequence());
  }, { once: true });
}

boot().catch((e) => showErr(e.stack || String(e)));
