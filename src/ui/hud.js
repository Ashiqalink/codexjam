import * as THREE from 'three/webgpu';
import { G } from '../core/game.js';
import { WEAPONS, CFG } from '../config.js';
import { input } from '../systems/input.js';

const $ = (id) => document.getElementById(id);

export class Hud {
  constructor() {
    this.el = $('hud');
    this.toastT = 0; this.tickerT = 0;
    this.shop = null;
    this.sweat = document.createElement('div');
    this.sweat.className = 'sweat';
    this.sweat.innerHTML = '<div class="drop"><div class="fill"></div></div>';
    $('markers').appendChild(this.sweat);
    G.on('cash', () => this.refresh());
    G.on('weapon', () => this.refresh());
    G.on('hearts', () => this.refresh());
    G.on('hurt', () => this.refresh());
    G.on('clout', () => this.refresh());
  }

  show(v) { this.el.classList.toggle('hidden', !v); }

  refresh() {
    const s = G.state;
    $('cash').textContent = `$${s.cash}`;
    $('clout-fill').style.width = `${s.clout}%`;
    $('clout-num').textContent = `${s.clout}%`;
    $('weapon-name').textContent = WEAPONS[s.weapon].name;
    $('hearts').innerHTML = Array.from({ length: CFG.hearts }, (_, i) => `<span class="h ${i < s.hearts ? '' : 'off'}">♥</span>`).join('');
  }

  objective(text) { $('objective-text').textContent = text; }
  hint(text) { const h = $('hint'); h.textContent = text || ''; h.classList.toggle('hidden', !text); }

  toast(text, sub = '', secs = 2.2) {
    const t = $('toast');
    t.innerHTML = `${text}${sub ? `<small>${sub}</small>` : ''}`;
    t.classList.remove('hidden');
    this.toastT = secs;
  }

  ticker(text) {
    const t = $('ticker');
    $('ticker-text').textContent = text;
    t.classList.remove('hidden', 'run');
    void t.offsetWidth;
    t.classList.add('run');
    this.tickerT = 14;
  }

  prompt(it) {
    const p = $('prompt');
    if (!it) { p.classList.add('hidden'); return; }
    const locked = it.locked?.();
    p.classList.remove('hidden');
    p.classList.toggle('locked', !!locked);
    p.innerHTML = locked ? locked : `<span class="key">E</span>${it.label()}${it.hold ? ' (hold)' : ''}`;
  }

  hold(k) {
    const h = $('hold');
    if (k <= 0) { h.classList.add('hidden'); return; }
    h.classList.remove('hidden');
    $('hold-fill').style.width = `${Math.min(1, k) * 100}%`;
  }

  openShop(title, items) {
    this.shop = { title, items, msg: '', fresh: true };
    G.player.frozen = true;
    this.drawShop();
    $('shop').classList.remove('hidden');
  }

  drawShop() {
    const s = this.shop;
    $('shop-title').textContent = s.title;
    $('shop-items').innerHTML = s.items.map((it, i) => `
      <div class="shop-item ${it.equipped ? 'owned' : ''}">
        <div>${i + 1}. ${it.name}${it.desc ? `<small>${it.desc}</small>` : ''}</div>
        <div class="price">${it.equipped ? 'CURRENT' : it.owned ? 'OWNED' : '$' + it.price}</div>
      </div>`).join('') + (s.msg ? `<div class="shop-item"><div>${s.msg}</div></div>` : '');
  }

  closeShop() {
    this.shop = null;
    G.player.frozen = false;
    $('shop').classList.add('hidden');
  }

  update(dt) {
    if (this.toastT > 0 && (this.toastT -= dt) <= 0) $('toast').classList.add('hidden');
    if (this.tickerT > 0 && (this.tickerT -= dt) <= 0) $('ticker').classList.add('hidden');

    if (this.shop && this.shop.fresh) { this.shop.fresh = false; }
    else if (this.shop) {
      for (let i = 0; i < this.shop.items.length && i < 9; i++) {
        if (input.pressed('Digit' + (i + 1))) {
          const it = this.shop.items[i];
          this.shop.msg = it.buy() || '';
          // Rebuild the list so owned/equipped flags update.
          const fresh = this.shop.items.map((x) => x);
          this.shop.items = fresh;
          this.refreshShopFlags();
          this.drawShop();
        }
      }
      if (input.pressed('Escape') || input.pressed('KeyE')) this.closeShop();
    }
  }

  refreshShopFlags() {
    const s = G.state;
    const t = this.shop.title;
    this.shop.items.forEach((it, i) => {
      if (t === 'BARBER') it.owned = it.equipped = s.hair === i;
      else if (t === 'TAILOR') it.owned = it.equipped = s.outfit === i;
      else {
        const k = Object.keys(WEAPONS).filter((k) => k !== 'fists')[i];
        it.owned = !!s.owned[k]; it.equipped = s.weapon === k;
      }
    });
  }

  markers(cam) {
    const w = innerWidth, h = innerHeight;
    const p = G.player;
    let m = 0;
    for (const g of G.guards) { g.updateMarker(cam, w, h); if (!g.down && g.sameSpace(p) && g.state !== 'alert') m = Math.max(m, g.meter); }
    const alert = G.guards.some((g) => g.state === 'alert' && g.sameSpace(p));
    if ((m > 0.02 || alert) && !G.cine?.active && !p.hidden) {
      const v = new THREE.Vector3(p.x, p.y + 2.3, p.z).project(cam);
      this.sweat.style.display = 'block';
      this.sweat.style.left = ((v.x + 1) / 2) * w + 22 + 'px';
      this.sweat.style.top = ((1 - v.y) / 2) * h + 'px';
      this.sweat.querySelector('.fill').style.height = `${alert ? 100 : m * 100}%`;
      this.sweat.querySelector('.fill').style.background = alert ? '#d9412b' : '#59b7e8';
    } else this.sweat.style.display = 'none';
  }
}
