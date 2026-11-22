// Island map: M key or the MAP button. Drawn on a 2D canvas from live game state.
import { G } from '../core/game.js';
import { shoreR, LAYOUT } from '../world/island.js';

let open = false;
const el = document.createElement('div');
el.id = 'map'; el.className = 'hidden';
el.innerHTML = '<div class="map-title">ISLA CORRUPTA <span>Island campaign map · M to close</span></div><canvas width="760" height="760"></canvas><div class="map-key"><span><i class="you"></i>You</span><span><i class="open"></i>Open office</span><span><i class="locked"></i>Locked office</span><span><i class="hijacked"></i>Hijacked office</span><span>Follow the roads: Beach → Market → Village → Palace</span></div>';
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

  // Road network makes the game's route legible at a glance.
  const roads = [
    [LAYOUT.spawn, [LAYOUT.market[0] - 10, LAYOUT.market[1] + 2], LAYOUT.market],
    [LAYOUT.market, [LAYOUT.market[0] + 18, LAYOUT.market[1] - 6], [LAYOUT.dmv[0] - 4, LAYOUT.dmv[1] + 12]],
    [LAYOUT.market, [LAYOUT.market[0] - 20, LAYOUT.market[1] - 8], [LAYOUT.sanitation[0] + 10, LAYOUT.sanitation[1] + 12]],
    [LAYOUT.market, [LAYOUT.market[0] + 2, LAYOUT.market[1] - 22], [LAYOUT.village[0], LAYOUT.village[1] + 14]],
    [[LAYOUT.village[0] - 12, LAYOUT.village[1]], [LAYOUT.tax[0] + 4, LAYOUT.tax[1] + 12]],
    [[LAYOUT.village[0] + 12, LAYOUT.village[1]], [LAYOUT.tower[0] - 4, LAYOUT.tower[1] + 12]],
    [[LAYOUT.village[0], LAYOUT.village[1] - 12], [0, -30], LAYOUT.palace],
    [[LAYOUT.dmv[0] + 6, LAYOUT.dmv[1] + 6], [LAYOUT.bar[0] - 6, LAYOUT.bar[1] - 4]],
  ];
  x.lineCap = 'round'; x.lineJoin = 'round';
  for (const route of roads) {
    x.beginPath();
    route.forEach(([wx, wz], i) => { const [px, pz] = P(wx, wz); i ? x.lineTo(px, pz) : x.moveTo(px, pz); });
    x.strokeStyle = '#c99459'; x.lineWidth = 11; x.stroke();
    x.strokeStyle = '#f7db9a'; x.lineWidth = 3; x.stroke();
  }

  x.textAlign = 'center'; x.font = 'bold 14px Arial Black, Impact, sans-serif';
  const pin = (wx, wz, col, label, sub, dx = 0, dy = -15) => {
    const [px, pz] = P(wx, wz);
    x.fillStyle = col; x.strokeStyle = '#2a1a12'; x.lineWidth = 3;
    x.beginPath(); x.arc(px, pz, 9, 0, Math.PI * 2); x.fill(); x.stroke();
    x.fillStyle = '#2a1a12'; x.fillText(label, px + dx, pz + dy);
    if (sub) { x.font = 'bold 11px Arial'; x.fillText(sub, px + dx, pz + dy + 17); x.font = 'bold 14px Arial Black, Impact, sans-serif'; }
  };
  const landmark = (wx, wz, label, dx = 0, dy = -15) => {
    const [px, pz] = P(wx, wz);
    x.fillStyle = '#fff4d6'; x.strokeStyle = '#2a1a12'; x.lineWidth = 2;
    x.beginPath(); x.rect(px - 4, pz - 4, 8, 8); x.fill(); x.stroke();
    x.fillStyle = '#2a1a12'; x.font = 'bold 12px Arial Black, Impact, sans-serif'; x.fillText(label, px + dx, pz + dy);
    x.font = 'bold 14px Arial Black, Impact, sans-serif';
  };
  pin(...LAYOUT.market, '#ffd23f', 'MARKET', 'GEAR + GOSSIP', 0, -18);
  pin(...LAYOUT.wreck, '#9c8a7a', 'WRECK', 'START', -12, 28);
  landmark(...LAYOUT.village, 'VILLAGE', 0, -16);
  landmark(...LAYOUT.bar, 'BEACH BAR', 16, -10);
  landmark(...LAYOUT.lighthouse, 'LIGHTHOUSE', -4, 22);
  landmark(...LAYOUT.cove, 'HIDDEN COVE', 0, 23);
  for (const b of Object.values(G.buildings)) {
    const h = G.state.hijacked[b.id], locked = !!b.lockText?.();
    const label = b.id === 'sanitation' ? 'SANITATION' : b.id === 'tower' ? 'STATE TV' : b.name.toUpperCase();
    pin(b.x, b.z, h ? '#d9412b' : locked ? '#7c8c8f' : '#3fb85c', label, h ? 'HIJACKED' : locked ? 'LOCKED' : 'OPEN');
  }
  const p = G.player; if (!p) return;
  const [px, pz] = P(p.x, p.z);
  x.save(); x.translate(px, pz); x.rotate(-p.facing + Math.PI);
  x.fillStyle = '#fff'; x.strokeStyle = '#d9412b'; x.lineWidth = 3;
  x.beginPath(); x.moveTo(0, -11); x.lineTo(8, 8); x.lineTo(-8, 8); x.closePath(); x.fill(); x.stroke();
  x.restore();
  x.fillStyle = '#2a1a12'; x.fillText('YOU', px, pz + 26);
}
