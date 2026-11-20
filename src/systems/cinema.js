import { G } from '../core/game.js';
import { input } from './input.js';

const $ = (id) => document.getElementById(id);

/**
 * Plays short shot lists. Each shot is a hard cut to a held frame:
 *   { focus: [x,y,z] | () => [x,y,z], size, dur, caption, style: 'comedy'|'serious', enter(), update(t,dt) }
 * A sequence may have end(), which must leave the world in its final state (also runs on skip).
 */
export class Cinema {
  constructor() { this.active = false; this.queue = []; }

  play(seq) {
    return new Promise((resolve) => {
      this.queue.push({ seq, resolve });
      if (!this.active) this.next();
    });
  }

  next() {
    const item = this.queue.shift();
    if (!item) return;
    this.cur = item; this.i = -1; this.t = 0; this.total = 0; this.skip = false;
    this.active = true;
    document.body.classList.add('cine');
    $('skip').classList.remove('hidden');
    G.hud.prompt(null);
    this.shot(0);
  }

  shot(i) {
    const shots = this.cur.seq.shots;
    this.i = i; this.t = 0;
    const s = shots[i];
    s.enter?.();
    const f = typeof s.focus === 'function' ? s.focus() : s.focus;
    G.rig.snap(f[0], f[1], f[2], s.size);
    const cap = $('caption');
    cap.textContent = s.caption || '';
    cap.className = s.style === 'serious' ? 'serious' : '';
    G.renderer.domElement.classList.toggle('serious', s.style === 'serious');
  }

  update(dt) {
    if (!this.active) return;
    this.t += dt; this.total += dt;
    const shots = this.cur.seq.shots;
    const s = shots[this.i];
    s.update?.(this.t, dt);
    if (input.any() && this.total > 0.4) this.skip = true;
    if (this.skip || this.t >= s.dur) {
      if (!this.skip && this.i + 1 < shots.length) { this.shot(this.i + 1); return; }
      this.finish();
    }
  }

  finish() {
    const { seq, resolve } = this.cur;
    seq.end?.();
    $('caption').textContent = '';
    G.renderer.domElement.classList.remove('serious');
    this.active = false;
    this.cur = null;
    if (this.queue.length) { this.next(); resolve(); return; }
    document.body.classList.remove('cine');
    $('skip').classList.add('hidden');
    resolve();
  }
}
