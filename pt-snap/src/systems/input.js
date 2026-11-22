// Keyboard and mouse state with per-frame "pressed" edges.
const down = new Set();
const pressed = new Set();
let mouseClick = false;
let anyKey = false;

addEventListener('keydown', (e) => {
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
  if (!e.repeat) { pressed.add(e.code); anyKey = true; }
  down.add(e.code);
});
addEventListener('keyup', (e) => down.delete(e.code));
addEventListener('blur', () => down.clear());
addEventListener('mousedown', (e) => { if (e.button === 0) mouseClick = true; anyKey = true; });
addEventListener('contextmenu', (e) => e.preventDefault());

export const input = {
  down: (c) => down.has(c),
  pressed: (c) => pressed.has(c),
  attack: () => mouseClick || pressed.has('KeyF'),
  any: () => anyKey,
  endFrame() { pressed.clear(); mouseClick = false; anyKey = false; },
  // Debug/automation hooks.
  _press(c) { pressed.add(c); down.add(c); anyKey = true; },
  _release(c) { down.delete(c); },
};
