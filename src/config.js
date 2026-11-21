// Tunables in one place. Values marked PROPOSED in DESIGN.md.
export const CFG = {
  islandName: 'Isla Corrupta', // OPEN: placeholder name
  floorHeight: 4,
  wallHeight: 3.6,

  // Lighting (override with ?hemi=&sun=&fill= for tuning).
  hemi: 0.95,
  sun: 3.6,
  fill: 0.6,

  camPitch: 45,
  camYaw: 35,
  camDist: 120,
  gameplaySize: 9,
  interiorSize: 8,

  walk: 4.5,
  sprint: 7,
  crouch: 2.5,
  accel: 40, // units/s^2 equivalent smoothing rate
  turnRate: 16,
  playerRadius: 0.35,
  hearts: 3,

  guard: {
    view: 7,
    viewCrouched: 4,
    fov: 90,
    detectTime: 1.5,
    patrolSpeed: 1.8,
    chaseSpeed: 4.2,
    hearing: 5,
    loseTime: 8,
    attackRange: 1.15,
    attackCooldown: 1.2,
    alertRadius: 10,
    hp: 3,
  },
  takedownRange: 1.5,
};

// Weapons: PROPOSED stats from DESIGN.md section 8.
export const WEAPONS = {
  fists: { name: 'Bare Fists', price: 0, dmg: 1, reach: 1.3, cooldown: 0.45, cashMult: 1, desc: '' },
  chicken: { name: 'Rubber Chicken', price: 20, dmg: 1.5, reach: 1.4, cooldown: 0.3, cashMult: 1, desc: 'Fast. Squeaks. 2 hits.' },
  baguette: { name: 'Stale Baguette', price: 35, dmg: 1.5, reach: 2.0, cooldown: 0.45, cashMult: 1, desc: 'Long reach. 2 hits.' },
  chair: { name: 'Folding Chair', price: 60, dmg: 3, reach: 1.5, cooldown: 0.9, cashMult: 1, desc: 'Slow. 1 hit.' },
  briefcase: { name: 'Golden Briefcase', price: 120, dmg: 2, reach: 1.4, cooldown: 0.6, cashMult: 2, desc: 'Guards drop double cash.' },
};

export const PALETTE = {
  sky: '#7cc6de',
  deep: '#2a9ec7',
  shallow: '#5cc6d8',
  foam: '#f4fbff',
  wet: '#c9a66b',
  sand: '#f0d29a',
  grass: '#8fcf6c',
  grassDark: '#78bb5c',
  road: '#e2c48b',
  wood: '#b07a43',
  woodDark: '#7a5230',
  rock: '#8e8f8a',
  leaf: '#3fb85c',
  leafDark: '#2f9e4f',
  trunk: '#8a6040',
};
