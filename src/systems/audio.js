// Web Audio: one-shots with distance falloff, ambience beds and music that follow the player.
import { G } from '../core/game.js';
import { LAYOUT, shoreR } from '../world/island.js';
import { input } from './input.js';

const FILES = [
  'amb_waves', 'amb_market', 'amb_wind', 'amb_office', 'amb_storm', 'amb_creak',
  'step_sand', 'step_wood', 'step_tile', 'step_grass',
  'npc_hey', 'npc_huh', 'npc_grunt', 'npc_ko', 'npc_vendor',
  'hit_punch', 'hit_chicken', 'hit_baguette', 'hit_chair', 'hit_briefcase', 'swing', 'takedown', 'hurt', 'jump',
  'cash', 'buy', 'loot', 'safe_open', 'secret', 'alert', 'banner', 'ticker', 'dumpster', 'locked', 'stairs', 'lightning',
  'mus_beach', 'mus_stealth', 'mus_title',
];
const HIT = { fists: 'hit_punch', chicken: 'hit_chicken', baguette: 'hit_baguette', chair: 'hit_chair', briefcase: 'hit_briefcase' };

let ctx = null, master, sfxBus, musicBus, ambBus;
const buffers = {};
const loops = {};
let muted = false;
let lastStep = 0, vendorT = 3;

export const audio = {
  async unlock() {
    if (ctx) { ctx.resume(); return; }
    ctx = new AudioContext();
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.35; musicBus.connect(master);
    ambBus = ctx.createGain(); ambBus.gain.value = 0.7; ambBus.connect(master);
    await Promise.all(FILES.map(async (n) => {
      try {
        const r = await fetch(`./assets/audio/${n}.mp3`);
        if (!r.ok) return;
        buffers[n] = await ctx.decodeAudioData(await r.arrayBuffer());
      } catch { /* missing file: stay silent */ }
    }));
    for (const n of ['amb_waves', 'amb_market', 'amb_wind', 'amb_office', 'amb_creak']) loop(n, ambBus);
    for (const n of ['mus_beach', 'mus_stealth', 'mus_title']) loop(n, musicBus);
    setLoop('mus_title', 1, 0.01);
  },

  /** One-shot. o: { vol, rate, x, z, range } — positional sounds fade with distance from the player. */
  play(name, o = {}) {
    if (!ctx || !buffers[name]) return;
    let vol = o.vol ?? 1;
    let pan = 0;
    if (o.x !== undefined && G.player) {
      const dx = o.x - G.player.x, dz = o.z - G.player.z;
      const d = Math.hypot(dx, dz), range = o.range ?? 22;
      if (d > range) return;
      vol *= Math.pow(1 - d / range, 1.5);
      // Pan along the camera's screen-right axis (yaw 35°).
      pan = Math.max(-1, Math.min(1, (dx * 0.82 - dz * 0.57) / 12));
    }
    const src = ctx.createBufferSource();
    src.buffer = buffers[name];
    src.playbackRate.value = o.rate ?? 1;
    const g = ctx.createGain(); g.gain.value = vol;
    const p = ctx.createStereoPanner(); p.pan.value = pan;
    src.connect(g).connect(p).connect(o.bus || sfxBus);
    src.start();
    return src;
  },

  update(dt) {
    if (!ctx) return;
    if (input.pressed('KeyN')) { muted = !muted; master.gain.setTargetAtTime(muted ? 0 : 0.9, ctx.currentTime, 0.05); G.hud?.toast(muted ? 'Sound off' : 'Sound on', 'N to toggle', 1); }
    const p = G.player;
    if (!G.started) return;
    const inside = !!p.bld;
    const intro = G.cine.active && G.cine.cur?.seq.intro;

    // Ambience by location.
    const r = Math.hypot(p.x, p.z), shore = shoreR(Math.atan2(p.z, p.x)) - r;
    const [mx, mz] = LAYOUT.market, [wx, wz] = LAYOUT.wreck;
    const dm = Math.hypot(p.x - mx, p.z - mz), dw = Math.hypot(p.x - wx, p.z - wz);
    setLoop('amb_waves', intro ? 0 : inside ? 0.05 : clamp(1 - shore / 35) * 0.9 + 0.08);
    setLoop('amb_market', inside || intro ? 0 : clamp(1 - (dm - 10) / 35) * 0.9);
    setLoop('amb_wind', inside || intro ? 0 : 0.25);
    setLoop('amb_office', inside ? 0.5 : 0);
    setLoop('amb_creak', inside || intro ? 0 : clamp(1 - dw / 30) * 0.7);

    // Music: title -> beach outdoors, stealth inside or when spotted.
    const spotted = G.guards.some((g) => g.state === 'alert' && g.sameSpace(p));
    const stealth = inside || spotted;
    setLoop('mus_title', intro ? 0 : 0, 1.5);
    setLoop('mus_beach', intro ? 0 : stealth ? 0 : 1, 1.5);
    setLoop('mus_stealth', intro ? 0 : stealth ? 1 : 0, 1.5);

    // Footsteps follow the walk cycle.
    if (!G.cine.active && !p.hidden && !p.jump && p.move > 0.25) {
      const step = Math.floor(p.phase / Math.PI);
      if (step !== lastStep) {
        lastStep = step;
        const surf = inside ? 'step_tile' : shore < 17 || dm < 15 ? 'step_sand' : 'step_grass';
        this.play(surf, { vol: p.crouch ? 0.15 : p.sprinting ? 0.8 : 0.45, rate: 0.9 + Math.random() * 0.25 });
      }
    }

    // Market vendors call out now and then.
    vendorT -= dt;
    if (vendorT <= 0) {
      vendorT = 5 + Math.random() * 6;
      const a = Math.random() * Math.PI * 2;
      this.play('npc_vendor', { x: mx + Math.cos(a) * 10, z: mz + Math.sin(a) * 10, range: 30, vol: 0.6, rate: 0.9 + Math.random() * 0.2 });
    }
  },
};

function loop(name, bus) {
  if (!buffers[name]) return;
  const src = ctx.createBufferSource();
  src.buffer = buffers[name]; src.loop = true;
  const g = ctx.createGain(); g.gain.value = 0;
  src.connect(g).connect(bus);
  src.start(0, Math.random() * buffers[name].duration);
  loops[name] = g;
}
function setLoop(name, v, tc = 0.4) {
  const g = loops[name];
  if (g) g.gain.setTargetAtTime(v, ctx.currentTime, tc);
}
const clamp = (v) => Math.max(0, Math.min(1, v));

/** Title music while the title card is up. */
export function titleMusic(on) { if (ctx) setLoop('mus_title', on ? 1 : 0, 0.3); }

/** Wire game events to sounds. */
export function hookAudio() {
  const at = (o) => ({ x: o.x, z: o.z });
  G.on('alert', (g) => { audio.play('npc_hey', { ...at(g), vol: 1 }); audio.play('alert', { vol: 0.7 }); });
  G.on('suspicious', (g) => audio.play('npc_huh', { ...at(g), vol: 0.8 }));
  G.on('hit', (g) => { audio.play(HIT[G.state.weapon] || 'hit_punch', { ...at(g) }); audio.play('npc_grunt', { ...at(g), vol: 0.7, rate: 0.95 + Math.random() * 0.1 }); });
  G.on('knockout', (g) => audio.play('npc_ko', { ...at(g), vol: 0.8 }));
  G.on('takedown', (g) => audio.play('takedown', { ...at(g) }));
  G.on('swing', () => audio.play(G.state.weapon === 'chicken' ? 'hit_chicken' : 'swing', { vol: G.state.weapon === 'chicken' ? 0.5 : 0.6 }));
  G.on('hurt', () => audio.play('hurt'));
  G.on('vault', () => audio.play('jump', { vol: 0.7 }));
  G.on('pickup', () => audio.play('cash'));
  G.on('buy', () => audio.play('buy'));
  G.on('loot', (kind) => audio.play(kind === 'safe' ? 'safe_open' : 'loot'));
  G.on('secret', () => audio.play('secret'));
  G.on('bannerRaise', () => audio.play('banner'));
  G.on('tickerShown', () => audio.play('ticker', { vol: 0.6 }));
  G.on('hide', () => audio.play('dumpster'));
  G.on('stairs', () => audio.play('stairs', { vol: 0.6 }));
  G.on('lightning', () => audio.play('lightning'));
  let storm = null;
  G.on('storm', () => { storm = audio.play('amb_storm', { vol: 0.9, bus: ambBus }); });
  G.on('stormEnd', () => { try { storm?.stop(); } catch {} storm = null; });
  G.on('lockedDoor', () => audio.play('locked'));
}
