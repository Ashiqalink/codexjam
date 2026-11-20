// Shared game context. One instance, imported everywhere.
export const G = {
  scene: null,
  renderer: null,
  rig: null,
  sun: null,
  hemi: null,
  player: null,
  guards: [],
  npcs: [],
  buildings: {},
  interactables: [],
  pickups: [],
  updaters: [], // per-frame callbacks for ambient animation
  time: 0,
  forceView: null, // { bld, view } during cinematics
  cine: null,
  hud: null,
  debug: new URLSearchParams(location.search),

  state: {
    cash: 0,
    clout: 0,
    hearts: 3,
    weapon: 'fists',
    owned: { fists: true },
    hijacked: {},
    secrets: {},
    hair: 0,
    outfit: 0,
    tutorial: { crates: 0, stage: 0 },
  },

  listeners: {},
  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); },
  emit(ev, ...a) { for (const fn of this.listeners[ev] || []) fn(...a); },

  // Perks derive from hijacks, so they can never get out of sync.
  get detectMult() { return this.state.hijacked.dmv ? 2 : 1; },
  get canHide() { return !!this.state.hijacked.sanitation; },
  get priceMult() { return this.state.hijacked.tax ? 0.5 : 1; },
  get beachTierDone() { return !!(this.state.hijacked.dmv && this.state.hijacked.sanitation); },
};

export function addCash(n) {
  G.state.cash = Math.max(0, Math.round(G.state.cash + n));
  G.emit('cash');
}
