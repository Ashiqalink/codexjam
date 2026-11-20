import { G } from '../core/game.js';
import { input } from './input.js';

let holding = null, holdT = 0;

function near(it, p) {
  if (it.floor !== p.floor) return false;
  if (p.floor > 0 && it.bld !== p.bld) return false;
  return Math.hypot(it.x - p.x, it.z - p.z) < it.r;
}

export function playerSpotted() {
  const p = G.player;
  return G.guards.some((g) => g.state === 'alert' && g.sameSpace(p));
}

export function updateInteract(dt) {
  const p = G.player;
  if (G.hud.shop) { G.hud.prompt(null); return; }

  let best = null, bestD = 1e9;
  if (p.hidden) best = G.interactables.find((it) => it.hideSpot === p.hideSpot) || null;
  else {
    for (const it of G.interactables) {
      if (it.enabled && !it.enabled()) continue;
      if (!near(it, p)) continue;
      const d = Math.hypot(it.x - p.x, it.z - p.z);
      if (d < bestD) { best = it; bestD = d; }
    }
  }

  let locked = best?.locked?.();
  if (!locked && best?.needsUndetected && playerSpotted()) locked = "Can't do that while you're spotted.";
  G.hud.prompt(best ? { ...best, label: best.label, hold: best.hold, locked: () => locked } : null);

  if (best && locked && input.pressed('KeyE')) G.emit('lockedDoor');
  if (!best || locked) { holding = null; holdT = 0; G.hud.hold(0); return; }

  if (best.hold) {
    if (input.down('KeyE') && (holding === best || input.pressed('KeyE'))) {
      holding = best; holdT += dt;
      G.hud.hold(holdT / best.hold);
      if (holdT >= best.hold) { holding = null; holdT = 0; G.hud.hold(0); best.use(); }
    } else { holding = null; holdT = 0; G.hud.hold(0); }
  } else if (input.pressed('KeyE')) best.use();
}
