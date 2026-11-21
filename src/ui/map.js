// Island map: M key or the MAP button. Pauses the game while open.
import { G } from '../core/game.js';
import { shoreR, LAYOUT } from '../world/island.js';

let open = false;
const el = document.createElement('div');
el.id = 'map'; el.className = 'hidden';
el.innerHTML = '<div class="map-title">ISLA CORRUPTA</div><div id="map-where"></div><canvas width="900" height="900"></canvas><div class="map-legend"><b class="lg open"></b>OPEN <b class="lg locked"></b>LOCKED <b class="lg hij"></b>HIJACKED <b class="lg next"></b>NEXT TARGET &nbsp;&middot;&nbsp; M / ESC to close</div>';
document.body.appendChild(el);
const btn = document.createElement('button');
btn.id = 'map-btn'; btn.textContent = 'MAP (M)';
document.body.appendChild(btn);
btn.addEventListener('click', (e) => { e.stopPropagation(); toggleMap(); btn.blur(); });
el.addEventListener('click', () => toggleMap(false));
addEventListener('keydown', (e) => {
  if (e.code === 'KeyM' && !e.repeat) toggleMap();
  else if (e.code === 'Escape' && open) toggleMap(false);
});

export function toggleMap(v = !open) {
  if (!G.started || G.cine?.active) v = false;
  open = v;
  G.paused = open;
  el.classList.toggle('hidden', !open);
  if (open) draw();
}
export function updateMap() {
  btn.style.display = G.started && !G.cine?.active ? '' : 'none';
  if (open) draw();
}

/** Buildings the player should go to next. */
function targets() {
  const h = G.state.hijacked;
  if (G.state.tutorial.stage < 4) return ['market'];
  if (!(h.dmv && h.sanitation)) return ['dmv', 'sanitation'].filter((k) => !h[k]);
  if (!(h.tax && h.tower)) return ['tax', 'tower'].filter((k) => !h[k]);
  if (!h.palace) return ['palace'];
  return [];
}

let maxR = 0;
function draw() {
  const cv = el.querySelector('canvas'), x = cv.getContext('2d');
  const W = cv.width;
  if (!maxR) for (let i = 0; i < 96; i++) maxR = Math.max(maxR, shoreR((i / 96) * Math.PI * 2));
  const S = (W * 0.46) / maxR;
  const P = (wx, wz) => [W / 2 + wx * S, W / 2 + wz * S];
  const t = G.time;

  // Flat printed sea keeps focus on the settlement plan.
  x.fillStyle = '#9fd3e0'; x.fillRect(0, 0, W, W);
  const shore = (k) => {
    x.beginPath();
    for (let i = 0; i <= 120; i++) { const a = (i / 120) * Math.PI * 2, r = shoreR(a) * k; const [px, pz] = P(Math.cos(a) * r, Math.sin(a) * r); i ? x.lineTo(px, pz) : x.moveTo(px, pz); }
    x.closePath();
  };
  shore(1.04); x.fillStyle = '#e9f4f5'; x.fill();
  shore(1); x.fillStyle = '#efd9a6'; x.fill(); x.lineWidth = 4; x.strokeStyle = '#2a1a12'; x.stroke();
  shore(0.84); x.fillStyle = '#a8d48a'; x.fill();

  // Wide filled roads replace the old dotted route and map-line overlay.
  const road = (points, width = 7) => {
    const left = [], right = [];
    for (let i = 0; i < points.length; i++) {
      const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
      const dx = b[0] - a[0], dz = b[1] - a[1], len = Math.hypot(dx, dz) || 1;
      const ox = -dz / len * width / 2, oz = dx / len * width / 2;
      left.push([points[i][0] + ox, points[i][1] + oz]);
      right.unshift([points[i][0] - ox, points[i][1] - oz]);
    }
    x.beginPath();
    [...left, ...right].forEach(([wx, wz], i) => { const [px, pz] = P(wx, wz); i ? x.lineTo(px, pz) : x.moveTo(px, pz); });
    x.closePath(); x.fillStyle = '#c78f50'; x.fill();
  };
  const mk = LAYOUT.market, vv = LAYOUT.village;
  road([LAYOUT.spawn, [mk[0] - 10, mk[1] + 2], mk]);
  road([mk, [mk[0] + 18, mk[1] - 6], [LAYOUT.dmv[0] - 4, LAYOUT.dmv[1] + 12]]);
  road([mk, [mk[0] - 20, mk[1] - 8], [LAYOUT.sanitation[0] + 10, LAYOUT.sanitation[1] + 12]]);
  road([mk, [mk[0] + 2, mk[1] - 22], [vv[0], vv[1] + 14]]);
  road([[vv[0] - 12, vv[1]], [LAYOUT.tax[0] + 4, LAYOUT.tax[1] + 12]]);
  road([[vv[0] + 12, vv[1]], [LAYOUT.tower[0] - 4, LAYOUT.tower[1] + 12]]);
  road([[vv[0], vv[1] - 12], [0, -30], LAYOUT.palace], 8);
  road([[LAYOUT.dmv[0] + 6, LAYOUT.dmv[1] + 6], [LAYOUT.bar[0] - 6, LAYOUT.bar[1] - 4]]);

  x.textAlign = 'center';
  const label = (txt, px, pz, size, col = '#2a1a12') => {
    x.font = `900 ${size}px "Arial Black", Impact, sans-serif`;
    x.lineWidth = 5; x.strokeStyle = '#fff4d6'; x.strokeText(txt, px, pz);
    x.fillStyle = col; x.fillText(txt, px, pz);
  };
  const tg = targets();
  const roof = (wx, wz, ww, wd, color, name = '', sub = '') => {
    const [px, pz] = P(wx, wz), bw = ww * S, bd = wd * S;
    x.fillStyle = '#f7edd7'; x.fillRect(px - bw / 2, pz - bd / 2, bw, bd);
    x.fillStyle = color;
    x.beginPath();
    x.moveTo(px - bw / 2 - 2, pz - bd / 2 + 5); x.lineTo(px, pz - bd / 2 - 5);
    x.lineTo(px + bw / 2 + 2, pz - bd / 2 + 5); x.lineTo(px + bw / 2 - 2, pz - bd / 2 + 10);
    x.lineTo(px - bw / 2 + 2, pz - bd / 2 + 10); x.closePath(); x.fill();
    x.strokeStyle = '#2a1a12'; x.lineWidth = 2; x.strokeRect(px - bw / 2, pz - bd / 2, bw, bd);
    if (name) label(name, px, pz - bd / 2 - 12, 14);
    if (sub) label(sub, px, pz + bd / 2 + 17, 11, sub === 'NEXT TARGET' ? '#d9412b' : '#5a4a3a');
  };
  const homes = [
    [-22, 17, 4.2, 3.6, '#c2543d'], [-8, 25, 5.8, 4.1, '#2f6d94'], [11, 22, 4.6, 5.2, '#d98b3a'],
    [25, 13, 6.1, 3.8, '#7a4b3a'], [28, -3, 4.1, 4.8, '#c2543d'], [15, -17, 5.4, 3.5, '#2f6d94'],
    [-8, -22, 4.7, 4.3, '#d98b3a'], [-25, -10, 5.9, 3.7, '#7a4b3a'], [-29, 4, 4.4, 5.1, '#c2543d'],
  ];
  for (const [hx, hz, hw, hd, color] of homes) roof(LAYOUT.village[0] + hx, LAYOUT.village[1] + hz, hw, hd, color);
  roof(...LAYOUT.wreck, 8, 4, '#9c8a7a', 'WRECK');
  roof(...LAYOUT.bar, 5, 3.5, '#2f6d94', 'BEACH BAR');
  roof(...LAYOUT.lighthouse, 3, 3, '#fff4d6', 'LIGHTHOUSE');
  roof(...LAYOUT.cove, 4, 2.5, '#7c8c8f', 'COVE');
  const [vpx, vpz] = P(...LAYOUT.village); label('VILLAGE', vpx, vpz + 40, 15);
  roof(...LAYOUT.market, 11, 9, '#ffd23f', 'MARKET');
  for (const b of Object.values(G.buildings)) {
    const h = G.state.hijacked[b.id], locked = !!b.lockText?.();
    const state = tg.includes(b.id) ? 'NEXT TARGET' : h ? 'HIJACKED' : locked ? 'LOCKED' : 'OPEN';
    roof(b.x, b.z, b.w, b.d, h ? '#d9412b' : locked ? '#9aa0a6' : b.id === 'palace' ? '#e2b93b' : '#3fb85c', b.name.toUpperCase(), state);
  }

  const p = G.player; if (!p) return;
  const [px, pz] = P(p.x, p.z);
  x.save(); x.translate(px, pz); x.rotate(-p.facing + Math.PI);
  x.fillStyle = '#fff'; x.strokeStyle = '#d9412b'; x.lineWidth = 4;
  x.beginPath(); x.moveTo(0, -16); x.lineTo(11, 11); x.lineTo(0, 5); x.lineTo(-11, 11); x.closePath(); x.fill(); x.stroke();
  x.restore();
  label('YOU', px, pz + 32, 16, '#d9412b');
  document.getElementById('map-where').textContent = p.bld ? `You are in: ${p.bld.name}, floor ${p.floor}` : 'You are: outdoors';
}
