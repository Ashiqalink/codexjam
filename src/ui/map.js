// Island map: M key or the MAP button. Drawn on a 2D canvas from live game state.
import { G } from '../core/game.js';
import { shoreR, LAYOUT } from '../world/island.js';

let open = false;
const el = document.createElement('div');
el.id = 'map'; el.className = 'hidden';
el.innerHTML = '<div class="map-title">ISLA CORRUPTA <span>(M to close)</span></div><canvas width="640" height="640"></canvas>';
document.body.appendChild(el);
const btn = document.createElement('button');
btn.id = 'map-btn'; btn.textContent = 'MAP (M)';
document.body.appendChild(btn);
btn.addEventListener('click', () => toggleMap());
addEventListener('keydown', (e) => { if (e.code === 'KeyM' && !e.repeat) toggleMap(); });

export function toggleMap(v = !open) {
  if (G.cine?.active) v = false;
  open = v;
  el.classList.toggle('hidden', !open);
  if (open) draw();
}
export function updateMap() { if (open) draw(); }

function draw() {
  const cv = el.querySelector('canvas'), x = cv.getContext('2d');
  const W = cv.width, S = W / 300; // world span ~300 units
  const P = (wx, wz) => [W / 2 + wx * S, W / 2 + wz * S];
  x.fillStyle = '#4fa3c7'; x.fillRect(0, 0, W, W);
  x.beginPath();
  for (let i = 0; i <= 96; i++) { const t = (i / 96) * Math.PI * 2, r = shoreR(t); const [px, pz] = P(Math.cos(t) * r, Math.sin(t) * r); i ? x.lineTo(px, pz) : x.moveTo(px, pz); }
  x.fillStyle = '#e9c98f'; x.fill(); x.lineWidth = 3; x.strokeStyle = '#fff4d6'; x.stroke();
  x.textAlign = 'center'; x.font = 'bold 14px Arial Black, Impact, sans-serif';
  const pin = (wx, wz, col, label, sub) => {
    const [px, pz] = P(wx, wz);
    x.fillStyle = col; x.strokeStyle = '#2a1a12'; x.lineWidth = 3;
    x.beginPath(); x.arc(px, pz, 9, 0, Math.PI * 2); x.fill(); x.stroke();
    x.fillStyle = '#2a1a12'; x.fillText(label, px, pz - 15);
    if (sub) { x.font = 'bold 11px Arial'; x.fillText(sub, px, pz + 24); x.font = 'bold 14px Arial Black, Impact, sans-serif'; }
  };
  pin(...LAYOUT.market, '#ffd23f', 'MARKET');
  pin(...LAYOUT.wreck, '#9c8a7a', 'WRECK');
  for (const b of Object.values(G.buildings)) {
    const h = G.state.hijacked[b.id], locked = !!b.lockText?.();
    pin(b.x, b.z, h ? '#d9412b' : locked ? '#7c8c8f' : '#3fb85c', b.name.toUpperCase(), h ? 'HIJACKED' : locked ? 'LOCKED' : 'OPEN');
  }
  const p = G.player; if (!p) return;
  const [px, pz] = P(p.x, p.z);
  x.save(); x.translate(px, pz); x.rotate(-p.facing + Math.PI);
  x.fillStyle = '#fff'; x.strokeStyle = '#d9412b'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(0, -11); x.lineTo(8, 8); x.lineTo(-8, 8); x.closePath(); x.fill(); x.stroke();
  x.restore();
  x.fillStyle = '#2a1a12'; x.fillText('YOU', px, pz + 26);
}
