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
el.addEventListener('mousemove', (e) => {
  const cv = el.querySelector('canvas'), nx = e.clientX / innerWidth - 0.5, ny = e.clientY / innerHeight - 0.5;
  cv.style.transform = `perspective(1100px) rotateX(${22 - ny * 10}deg) rotateY(${nx * 14}deg) scale(0.92)`;
});
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

function seeded(s) { return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }

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
  const shore = (k, dy = 0) => {
    x.beginPath();
    for (let i = 0; i <= 120; i++) { const a = (i / 120) * Math.PI * 2, r = shoreR(a) * k; const [px, pz] = P(Math.cos(a) * r, Math.sin(a) * r); i ? x.lineTo(px, pz + dy) : x.moveTo(px, pz + dy); }
    x.closePath();
  };
  const rng = seeded(11);
  // Ripples and a sailboat so the sea reads as water, not empty paper.
  x.strokeStyle = '#ffffff'; x.lineWidth = 2.5; x.lineCap = 'round'; x.globalAlpha = 0.75;
  for (let i = 0; i < 70; i++) {
    const a = rng() * Math.PI * 2, r = shoreR(a) * (1.1 + rng() * 0.4) + 6, ph = rng() * 6.28;
    const [wx, wy] = P(Math.cos(a) * r, Math.sin(a) * r);
    if (wx < 30 || wy < 30 || wx > W - 30 || wy > W - 30) continue;
    const sw = Math.sin(t * 1.6 + ph); x.globalAlpha = 0.45 + 0.35 * sw; const ox = Math.cos(t * 0.7 + ph) * 4;
    x.beginPath(); x.moveTo(wx - 12 + ox, wy); x.quadraticCurveTo(wx - 6 + ox, wy - 6 * sw, wx + ox, wy); x.quadraticCurveTo(wx + 6 + ox, wy + 6 * sw, wx + 12 + ox, wy); x.stroke();
  }
  x.globalAlpha = 1;
  const boat = (bx, by0, ph = 0) => {
    const by = by0 + Math.sin(t * 1.8 + ph) * 3; bx += Math.sin(t * 0.5 + ph) * 4;
    x.fillStyle = 'rgba(20,60,80,0.25)'; x.beginPath(); x.ellipse(bx + 3, by + 13, 17, 4, 0, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#7a4b3a'; x.strokeStyle = '#2a1a12'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(bx - 14, by); x.lineTo(bx + 14, by); x.lineTo(bx + 8, by + 8); x.lineTo(bx - 8, by + 8); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#fff4d6'; x.beginPath(); x.moveTo(bx, by - 2); x.lineTo(bx, by - 26); x.lineTo(bx + 14, by - 2); x.closePath(); x.fill(); x.stroke();
  };
  boat(W * 0.14, W * 0.88); boat(W * 0.86, W * 0.12, 2);
  shore(1.04, 22); x.fillStyle = 'rgba(15,55,75,0.30)'; x.fill();
  for (let d = 16; d > 0; d -= 2) { shore(1, d); x.fillStyle = d > 8 ? '#a9864f' : '#c9a468'; x.fill(); }
  shore(1, 16); x.lineWidth = 3; x.strokeStyle = '#2a1a12'; x.stroke();
  shore(1.04); x.fillStyle = '#e9f4f5'; x.fill();
  shore(1); x.fillStyle = '#efd9a6'; x.fill(); x.lineWidth = 4; x.strokeStyle = '#2a1a12'; x.stroke();
  shore(0.84, 3); x.fillStyle = '#7fae66'; x.fill();
  shore(0.84); x.fillStyle = '#a8d48a'; x.fill();

  // Scenery: palms and rocks on the beach, bushes inland, kept clear of the places that matter.
  const keep = [...Object.values(LAYOUT).filter((v) => Array.isArray(v)).map((v) => [v[0], v[1], 16]), [LAYOUT.village[0], LAYOUT.village[1], 42], [LAYOUT.market[0], LAYOUT.market[1], 18], [LAYOUT.palace[0], LAYOUT.palace[1], 20]];
  const free = (wx, wz) => keep.every(([kx, kz, kr]) => Math.hypot(wx - kx, wz - kz) > kr);
  const sc = seeded(5);
  for (let i = 0; i < 420; i++) {
    const a = sc() * Math.PI * 2, f = 0.3 + sc() * 0.7, r = shoreR(a) * f;
    const wx = Math.cos(a) * r, wz = Math.sin(a) * r;
    if (!free(wx, wz)) continue;
    const [px, pz] = P(wx, wz);
    if (f > 0.9) { // beach rock
      x.fillStyle = '#9a9b95'; x.strokeStyle = '#2a1a12'; x.lineWidth = 1.5;
      x.beginPath(); x.ellipse(px, pz, 5, 3.6, a, 0, Math.PI * 2); x.fill(); x.stroke();
    } else if (f > 0.8) { // palm: trunk dot plus fronds
      x.strokeStyle = '#2f7d3a'; x.lineWidth = 3; x.lineCap = 'round';
      for (let k = 0; k < 6; k++) { const fa = (k / 6) * Math.PI * 2 + a; x.beginPath(); x.moveTo(px, pz); x.lineTo(px + Math.cos(fa) * 9, pz + Math.sin(fa) * 9); x.stroke(); }
      x.fillStyle = '#7a4b3a'; x.beginPath(); x.arc(px, pz, 2.5, 0, Math.PI * 2); x.fill();
    } else if (i % 3 === 0) { // bush
      x.fillStyle = '#6fb064'; x.strokeStyle = '#4a8a47'; x.lineWidth = 1.5;
      x.beginPath(); x.arc(px, pz, 6 + sc() * 3, 0, Math.PI * 2); x.fill(); x.stroke();
    } else if (i % 3 === 1) { // flowers
      x.fillStyle = ['#e86a92', '#f2c14e', '#ffffff'][(sc() * 3) | 0];
      x.beginPath(); x.arc(px, pz, 2.2, 0, Math.PI * 2); x.arc(px + 5, pz + 2, 2.2, 0, Math.PI * 2); x.fill();
    }
  }
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
  const civic = (b, state) => {
    const [px, pz] = P(b.x, b.z);
    const color = state === 'HIJACKED' || state === 'NEXT TARGET' ? '#d9412b' : state === 'LOCKED' ? '#737b83' : '#3f9e4f';
    const dark = state === 'LOCKED' ? '#5a6168' : state === 'OPEN' ? '#2c7a3a' : '#a82f1e';
    const s = 14, id = b.id;
    const next = state === 'NEXT TARGET';
    const captionColor = next ? '#d9412b' : '#5a4a3a';
    const [bw, bh, dp] = { palace: [84, 34, 24], tower: [30, 66, 16], dmv: [64, 28, 18], sanitation: [68, 26, 18], tax: [60, 30, 18] }[id] || [56, 28, 18];
    const dx = dp * 0.7, dy = -dp * 0.55;
    const base = pz + 16, top = base - bh, left = px - bw / 2, right = px + bw / 2;
    const ink = '#2a1a12', wall = '#f7edd7', wallSide = '#d2c299';
    const quad = (pts, fill, line = ink) => { x.beginPath(); pts.forEach(([a, c], i) => i ? x.lineTo(a, c) : x.moveTo(a, c)); x.closePath(); x.fillStyle = fill; x.fill(); x.strokeStyle = line; x.lineWidth = 2; x.lineJoin = 'round'; x.stroke(); };

    // Ground shadow, then the target ring for the next objective.
    quad([[left + 6, base + 2], [right + 6, base + 2], [right + dx + 16, base + dy + 8], [left + dx + 16, base + dy + 8]], 'rgba(30,20,10,0.28)', 'rgba(0,0,0,0)');
    if (next) {
      const pu = (t * 0.9) % 1;
      x.save(); x.strokeStyle = color; x.globalAlpha = 1 - pu; x.lineWidth = 3;
      x.beginPath(); x.arc(px, pz, bw * 0.55 + pu * 26, 0, Math.PI * 2); x.stroke();
      x.globalAlpha = 1; x.lineWidth = 2; x.setLineDash([5, 4]); x.lineDashOffset = -t * 12;
      x.beginPath(); x.arc(px, pz, bw * 0.55 + 4, 0, Math.PI * 2); x.stroke(); x.restore();
    }

    // Walls and flat roof, drawn as an oblique block.
    quad([[right, top], [right + dx, top + dy], [right + dx, base + dy], [right, base]], wallSide);
    quad([[left, top], [left + dx, top + dy], [right + dx, top + dy], [right, top]], color);
    quad([[left, top], [right, top], [right, base], [left, base]], wall);
    x.fillStyle = dark; x.fillRect(left + 1, top + 1, bw - 2, 5);

    let peak = top + dy; // highest point, used to place the name label
    const cols = (n, y0, y1, x0 = left + 6, x1 = right - 6) => {
      for (let i = 0; i < n; i++) { const cx = x0 + (x1 - x0) * (n === 1 ? 0.5 : i / (n - 1)); x.fillStyle = '#fffaf0'; x.fillRect(cx - 2, y0, 4, y1 - y0); x.strokeStyle = ink; x.lineWidth = 1.2; x.strokeRect(cx - 2, y0, 4, y1 - y0); }
    };
    const win = (cx, cy, w = 6, h = 7) => { x.fillStyle = '#8fc7dd'; x.fillRect(cx - w / 2, cy, w, h); x.strokeStyle = ink; x.lineWidth = 1.2; x.strokeRect(cx - w / 2, cy, w, h); };
    const door = (cx, w = 10, h = 12) => { x.fillStyle = '#7a4b3a'; x.fillRect(cx - w / 2, base - h, w, h); x.strokeStyle = ink; x.lineWidth = 1.2; x.strokeRect(cx - w / 2, base - h, w, h); };

    if (id === 'palace') {
      // Wide hall with a colonnade, front steps, a gold dome and a flag.
      cols(2, top + 7, base - 2, left + 6, left + 14); cols(2, top + 7, base - 2, right - 14, right - 6);
      quad([[px - 20, base], [px + 20, base], [px + 26, base + 7], [px - 26, base + 7]], '#e4d8b8');
      door(px, 12, 14);
      const dc = [px + dx * 0.5, top + dy * 0.5];
      x.fillStyle = '#c9a43a'; x.strokeStyle = ink; x.lineWidth = 2;
      x.beginPath(); x.arc(dc[0], dc[1], 17, Math.PI, 0); x.closePath(); x.fill(); x.stroke();
      x.fillStyle = 'rgba(255,255,255,0.35)'; x.beginPath(); x.arc(dc[0] - 5, dc[1] - 6, 6, Math.PI, Math.PI * 1.6); x.fill();
      x.beginPath(); x.moveTo(dc[0], dc[1] - 17); x.lineTo(dc[0], dc[1] - 30); x.stroke();
      x.fillStyle = '#d9412b'; x.beginPath(); x.moveTo(dc[0], dc[1] - 30); x.lineTo(dc[0] + 12, dc[1] - 26); x.lineTo(dc[0], dc[1] - 22); x.closePath(); x.fill(); x.stroke();
      peak = dc[1] - 30;
    } else if (id === 'tower') {
      // Tall slim mast building with antenna and signal arcs.
      for (let i = 0; i < 4; i++) win(px, top + 10 + i * 12, 5, 6);
      door(px, 8, 10);
      x.strokeStyle = ink; x.lineWidth = 2.5; x.beginPath(); x.moveTo(px + dx * 0.5, top + dy * 0.5); x.lineTo(px + dx * 0.5, top - 26); x.stroke();
      x.fillStyle = '#ffd23f'; x.beginPath(); x.arc(px + dx * 0.5, top - 28, 4, 0, Math.PI * 2); x.fill(); x.lineWidth = 1.5; x.stroke();
      x.strokeStyle = color; x.lineWidth = 2;
      for (const r of [9, 15]) { x.beginPath(); x.arc(px + dx * 0.5, top - 28, r, -0.9, 0.9); x.stroke(); x.beginPath(); x.arc(px + dx * 0.5, top - 28, r, Math.PI - 0.9, Math.PI + 0.9); x.stroke(); }
      peak = top - 44;
    } else if (id === 'tax') {
      // Classical treasury: triangular pediment over a row of columns.
      quad([[left - 3, top], [px, top - 16], [right + 3, top]], '#f2e6c4');
      x.fillStyle = color; x.beginPath(); x.arc(px, top - 6, 3, 0, Math.PI * 2); x.fill();
      cols(4, top + 8, base - 1, left + 8, right - 8);
      quad([[left - 3, base], [right + 3, base], [right + 6, base + 5], [left - 6, base + 5]], '#e4d8b8');
      peak = top - 16;
    } else if (id === 'dmv') {
      // Counter office with a striped awning and ticket windows.
      for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? '#fff4d6' : color; x.fillRect(left + 4 + i * ((bw - 8) / 8), top + 8, (bw - 8) / 8, 7); }
      x.strokeStyle = ink; x.lineWidth = 1.2; x.strokeRect(left + 4, top + 8, bw - 8, 7);
      win(left + 13, base - 12); win(right - 13, base - 12); door(px);
    } else if (id === 'sanitation') {
      // Depot: sawtooth roof, garage door and a smokestack.
      for (let i = 0; i < 3; i++) { const x0 = left + 4 + i * ((bw - 8) / 3), w3 = (bw - 8) / 3; quad([[x0, top], [x0, top - 9], [x0 + w3, top]], '#cfd6d9'); }
      quad([[right - 14, top], [right - 14, top - 18], [right - 8, top - 18], [right - 8, top]], '#8c6b5a');
      x.fillStyle = '#d6dadc'; x.fillRect(left + 8, base - 16, 22, 16); x.strokeStyle = ink; x.lineWidth = 1.2; x.strokeRect(left + 8, base - 16, 22, 16);
      for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(left + 8, base - 16 + i * 4); x.lineTo(left + 30, base - 16 + i * 4); x.stroke(); }
      win(right - 12, base - 14); peak = top - 18;
    }

    // Emblem badge on the facade: the old icon, scaled down.
    const ey = id === 'tower' ? top + 22 : top + bh * 0.45;
    if (id !== 'tower') { x.fillStyle = 'rgba(255,250,235,0.95)'; x.beginPath(); x.arc(px, ey, 10, 0, Math.PI * 2); x.fill(); x.strokeStyle = color; x.lineWidth = 2; x.stroke(); }
    x.save(); x.translate(px, ey); x.scale(id === 'tower' ? 0 : 0.5, id === 'tower' ? 0 : 0.5); x.translate(-px, -pz);
    const stroke = (draw, width = 2.5) => { x.save(); x.translate(px, pz); x.strokeStyle = color; x.lineWidth = width; x.lineCap = 'round'; x.lineJoin = 'round'; draw(); x.restore(); };
    if (id === 'dmv') {
      stroke(() => { x.beginPath(); x.arc(0, 0, s * 0.9, 0, Math.PI * 2); x.stroke(); x.beginPath(); x.moveTo(-6, -4); x.lineTo(6, -4); x.moveTo(-6, 4); x.lineTo(4, 4); x.stroke(); }, 3);
    } else if (id === 'sanitation') {
      for (let i = 0; i < 3; i++) {
        x.save(); x.translate(px, pz); x.rotate((i * Math.PI * 2) / 3);
        x.fillStyle = color; x.beginPath(); x.moveTo(0, -s); x.lineTo(s * 0.42, -2); x.lineTo(s * 0.08, -2); x.lineTo(s * 0.08, s * 0.64); x.lineTo(-s * 0.25, s * 0.2); x.lineTo(-s * 0.25, -2); x.closePath(); x.fill();
        x.restore();
      }
    } else if (id === 'tax') {
      stroke(() => {
        x.beginPath(); x.moveTo(0, -s); x.lineTo(0, s * 0.78); x.moveTo(-s, -s * 0.48); x.lineTo(s, -s * 0.48); x.moveTo(-s * 0.72, s * 0.78); x.lineTo(s * 0.72, s * 0.78); x.stroke();
        for (const side of [-1, 1]) { x.beginPath(); x.moveTo(side * s * 0.68, -s * 0.46); x.lineTo(side * s * 0.88, s * 0.25); x.lineTo(side * s * 0.46, s * 0.25); x.closePath(); x.stroke(); }
      }, 3);
    } else if (id === 'palace') {
      stroke(() => { x.beginPath(); x.moveTo(-s * 0.8, s * 0.6); x.lineTo(-s * 0.8, -s * 0.2); x.lineTo(0, -s * 0.9); x.lineTo(s * 0.8, -s * 0.2); x.lineTo(s * 0.8, s * 0.6); x.closePath(); x.stroke(); }, 3);
    }
    x.restore();

    label(b.name.toUpperCase(), px, peak - 8, 14);
    label(state, px, base + 20, 10, captionColor);
  };
  // Small gabled houses with a door, window and chimney; kind 'none' only places the label.
  const roof = (wx, wz, ww, wd, color, name = '', sub = '', kind = 'house') => {
    const [px, pz] = P(wx, wz), bw = ww * S, bd = wd * S;
    const ink = '#2a1a12';
    const poly = (pts, fill) => { x.beginPath(); pts.forEach(([a, c], i) => i ? x.lineTo(a, c) : x.moveTo(a, c)); x.closePath(); x.fillStyle = fill; x.fill(); x.strokeStyle = ink; x.lineWidth = 1.8; x.lineJoin = 'round'; x.stroke(); };
    let peak = kind === 'none' || kind === 'below' ? pz - 34 : pz - bd / 2;
    if (kind === 'house') {
      const wh = 8 + bd * 0.28, base = pz + bd / 3, top = base - wh, dd = bd * 0.5, dx = dd * 0.75, dy = -dd * 0.6, r = bw * 0.3 + 4;
      const l = px - bw / 2, rr = px + bw / 2;
      poly([[l + 5, base + 1], [rr + 5, base + 1], [rr + dx + 8, base + dy + 5], [l + dx + 8, base + dy + 5]], 'rgba(30,50,20,0.28)');
      poly([[rr, top], [rr + dx, top + dy], [rr + dx, base + dy], [rr, base]], '#cdbf98');
      poly([[l, top], [l + dx, top + dy], [px + dx, top - r + dy], [px, top - r]], shade(color, -0.12));
      poly([[px, top - r], [px + dx, top - r + dy], [rr + dx + 2, top + dy], [rr + 2, top]], shade(color, -0.28));
      poly([[l, base], [l, top], [px, top - r], [rr, top], [rr, base]], '#f7edd7');
      poly([[l - 2, top], [px, top - r - 2], [rr + 2, top], [rr - 3, top], [px, top - r + 4], [l + 3, top]], color);
      x.fillStyle = '#7a4b3a'; x.fillRect(px - 3, base - 9, 6, 9); x.strokeRect(px - 3, base - 9, 6, 9);
      if (bw > 20) { x.fillStyle = '#8fc7dd'; x.fillRect(l + 3, base - 12, 5, 5); x.strokeRect(l + 3, base - 12, 5, 5); x.fillRect(rr - 8, base - 12, 5, 5); x.strokeRect(rr - 8, base - 12, 5, 5); }
      poly([[rr - 6, top - r * 0.2], [rr - 6, top - r - 1], [rr - 2, top - r - 1], [rr - 2, top - r * 0.2]], '#8c6b5a');
      peak = top - r - 2;
    }
    if (name) label(name, px - (kind === 'below' ? 30 : 0), kind === 'below' ? pz + 38 : peak - 8, 14);
    if (sub) label(sub, px, pz + bd / 2 + 17, 11, sub === 'NEXT TARGET' ? '#d9412b' : '#5a4a3a');
  };
  const shade = (hex, k) => {
    const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v + 255 * k)));
    return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
  };
  const homes = [
    [-22, 17, 4.2, 3.6, '#c2543d'], [-8, 25, 5.8, 4.1, '#2f6d94'], [11, 22, 4.6, 5.2, '#d98b3a'],
    [25, 13, 6.1, 3.8, '#7a4b3a'], [28, -3, 4.1, 4.8, '#c2543d'], [15, -17, 5.4, 3.5, '#2f6d94'],
    [-8, -22, 4.7, 4.3, '#d98b3a'], [-25, -10, 5.9, 3.7, '#7a4b3a'], [-29, 4, 4.4, 5.1, '#c2543d'],
  ];
  for (const [hx, hz, hw, hd, color] of homes) roof(LAYOUT.village[0] + hx, LAYOUT.village[1] + hz, hw, hd, color);
  roof(...LAYOUT.wreck, 8, 4, '#9c8a7a', 'WRECK', '', 'below');
  roof(...LAYOUT.bar, 5, 3.5, '#2f6d94', 'BEACH BAR');
  roof(...LAYOUT.lighthouse, 3, 3, '#fff4d6', 'LIGHTHOUSE', '', 'none');
  roof(...LAYOUT.cove, 4, 2.5, '#7c8c8f', 'COVE');
  const [vpx, vpz] = P(...LAYOUT.village); label('VILLAGE', vpx, vpz + 40, 15);
  // Market square: cobbled plaza ringed by striped stalls, a well and a banner.
  {
    const [mx, mz] = P(...LAYOUT.market), ink = '#2a1a12';
    const pw = 100, ph = 74;
    x.fillStyle = 'rgba(30,50,20,0.25)'; x.fillRect(mx - pw / 2 + 6, mz - ph / 2 + 8, pw, ph);
    x.fillStyle = '#e8d3a0'; x.fillRect(mx - pw / 2, mz - ph / 2, pw, ph);
    x.strokeStyle = '#cdb67f'; x.lineWidth = 1;
    for (let gx = mx - pw / 2 + 8; gx < mx + pw / 2; gx += 10) for (let gz = mz - ph / 2 + 8; gz < mz + ph / 2; gz += 10) { x.beginPath(); x.arc(gx + ((gz / 10) % 2 ? 5 : 0), gz, 2, 0, Math.PI * 2); x.stroke(); }
    x.strokeStyle = ink; x.lineWidth = 2.5; x.strokeRect(mx - pw / 2, mz - ph / 2, pw, ph);
    const awn = ['#d9412b', '#2f6d94', '#ffd23f'];
    const stall = (sx, sy, i) => {
      x.fillStyle = 'rgba(30,20,10,0.25)'; x.fillRect(sx - 12 + 4, sy - 2 + 4, 26, 18);
      x.fillStyle = '#a8794b'; x.fillRect(sx - 12, sy + 4, 24, 11); x.strokeStyle = ink; x.lineWidth = 1.5; x.strokeRect(sx - 12, sy + 4, 24, 11);
      for (let k = 0; k < 4; k++) { x.fillStyle = ['#e86a92', '#f2c14e', '#6fb064', '#d9412b'][(k + i) % 4]; x.beginPath(); x.arc(sx - 8 + k * 5.3, sy + 8, 2.2, 0, Math.PI * 2); x.fill(); }
      x.lineWidth = 1.5;
      for (let k = 0; k < 6; k++) { x.fillStyle = k % 2 ? '#fff4d6' : awn[i % 3]; x.fillRect(sx - 14 + k * 4.7, sy - 8, 4.7, 11); x.beginPath(); x.arc(sx - 14 + k * 4.7 + 2.35, sy + 3, 2.35, 0, Math.PI); x.fill(); }
      x.strokeRect(sx - 14, sy - 8, 28, 11);
    };
    let n = 0;
    for (const sy of [mz - ph / 2 + 16, mz + ph / 2 - 20]) for (const sx of [mx - 31, mx, mx + 31]) stall(sx, sy, n++);
    x.fillStyle = '#9aa7ab'; x.beginPath(); x.arc(mx, mz, 6, 0, Math.PI * 2); x.fill(); x.stroke();
    x.fillStyle = '#5fb4d6'; x.beginPath(); x.arc(mx, mz, 3.2, 0, Math.PI * 2); x.fill();
    x.fillStyle = '#ffd23f'; x.fillRect(mx - 44, mz - 2, 6, 3); x.fillRect(mx + 38, mz - 2, 6, 3);
    label('MARKET', mx, mz - ph / 2 - 10, 14);
  }
  for (const b of Object.values(G.buildings)) {
    const h = G.state.hijacked[b.id], locked = !!b.lockText?.();
    const state = tg.includes(b.id) ? 'NEXT TARGET' : h ? 'HIJACKED' : locked ? 'LOCKED' : 'OPEN';
    civic(b, state);
  }

  // Landmarks that sum up the island: the landing, the wreck, the lighthouse beam, the market awning and the bar pier.
  {
    const [lx, lz] = P(...LAYOUT.spawn);
    x.strokeStyle = '#d9412b'; x.lineWidth = 4; x.lineCap = 'round';
    x.beginPath(); x.moveTo(lx - 7, lz - 7); x.lineTo(lx + 7, lz + 7); x.moveTo(lx + 7, lz - 7); x.lineTo(lx - 7, lz + 7); x.stroke();
    label('LANDING', lx + 6, lz - 30, 12, '#d9412b');

    const [wx, wz] = P(...LAYOUT.wreck);
    x.save(); x.translate(wx, wz - 2); x.rotate(-0.25); x.fillStyle = '#7a4b3a'; x.strokeStyle = '#2a1a12'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(-26, -6); x.lineTo(26, -6); x.lineTo(16, 8); x.lineTo(-16, 8); x.closePath(); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(-3, -6); x.lineTo(-3, -24); x.stroke(); x.fillStyle = '#fff4d6'; x.beginPath(); x.moveTo(-3, -24); x.lineTo(10, -17); x.lineTo(-3, -12); x.closePath(); x.fill(); x.stroke();
    x.restore();

    const [bx, bz] = P(...LAYOUT.lighthouse);
    const g = x.createRadialGradient(bx, bz, 4, bx, bz, 90);
    g.addColorStop(0, 'rgba(255,244,166,0.75)'); g.addColorStop(1, 'rgba(255,244,166,0)');
    const aim = t * 1.2;
    x.fillStyle = g; x.beginPath(); x.moveTo(bx, bz); x.arc(bx, bz, 90, aim - 0.35, aim + 0.35); x.closePath(); x.fill();
    x.fillStyle = '#d9412b'; x.strokeStyle = '#2a1a12'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(bx - 6, bz + 10); x.lineTo(bx - 3, bz - 10); x.lineTo(bx + 3, bz - 10); x.lineTo(bx + 6, bz + 10); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#ffd23f'; x.beginPath(); x.arc(bx, bz - 13, 4, 0, Math.PI * 2); x.fill(); x.stroke();

    const [rx, rz] = P(...LAYOUT.bar);
    x.fillStyle = '#c78f50'; x.strokeStyle = '#2a1a12'; x.lineWidth = 2;
    const out = Math.atan2(rz - W / 2, rx - W / 2);
    x.save(); x.translate(rx, rz); x.rotate(out); x.fillRect(22, -4, 30, 8); x.strokeRect(22, -4, 30, 8); x.restore();
  }

  // Cloud shadows drifting over the island.
  x.fillStyle = 'rgba(40,70,90,0.13)';
  for (let i = 0; i < 4; i++) {
    const cx = ((t * (9 + i * 3) + i * 260) % (W + 300)) - 150, cy = 140 + i * 210;
    x.beginPath(); x.ellipse(cx, cy, 90, 34, 0, 0, Math.PI * 2); x.ellipse(cx + 50, cy + 12, 60, 26, 0, 0, Math.PI * 2); x.fill();
  }

  // Compass rose and scale bar fill the empty corners.
  {
    const cx = W - 70, cy = W - 70;
    x.save(); x.translate(cx, cy); x.strokeStyle = '#2a1a12'; x.lineWidth = 2; x.fillStyle = '#fff4d6';
    x.beginPath(); x.arc(0, 0, 40, 0, Math.PI * 2); x.fill(); x.stroke();
    x.fillStyle = '#d9412b'; x.beginPath(); x.moveTo(0, -36); x.lineTo(8, 0); x.lineTo(-8, 0); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#2a1a12'; x.beginPath(); x.moveTo(0, 36); x.lineTo(8, 0); x.lineTo(-8, 0); x.closePath(); x.fill();
    x.restore(); label('N', cx, cy - 46, 16);
    const len = 50 * S; const sx0 = 40, sy0 = W - 40;
    x.fillStyle = '#2a1a12'; x.fillRect(sx0, sy0, len, 6); x.fillStyle = '#fff4d6'; x.fillRect(sx0 + len / 2, sy0, len / 2, 6); x.strokeStyle = '#2a1a12'; x.lineWidth = 2; x.strokeRect(sx0, sy0, len, 6);
    label('50 m', sx0 + len / 2, sy0 - 8, 12);
  }

  const p = G.player; if (!p) return;
  const [px, pz] = P(p.x, p.z);
  x.fillStyle = 'rgba(30,20,10,0.3)'; x.beginPath(); x.ellipse(px + 4, pz + 16, 11, 4, 0, 0, Math.PI * 2); x.fill();
  x.save(); x.translate(px, pz - 4); x.rotate(-p.facing + Math.PI);
  x.fillStyle = '#fff'; x.strokeStyle = '#d9412b'; x.lineWidth = 4;
  x.beginPath(); x.moveTo(0, -16); x.lineTo(11, 11); x.lineTo(0, 5); x.lineTo(-11, 11); x.closePath(); x.fill(); x.stroke();
  x.restore();
  label('YOU', px + 34, pz + 6, 16, '#d9412b');
  document.getElementById('map-where').textContent = p.bld ? `You are in: ${p.bld.name}, floor ${p.floor}` : 'You are: outdoors';
}