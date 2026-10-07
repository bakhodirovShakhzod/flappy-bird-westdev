/**
 * Canvas particle system with an object pool (no DOM nodes, no GC churn).
 * Kinds: 'pixel' (square), 'text' (floating label), 'star' (pixel star sprite).
 */
(function () {
  'use strict';

  const WD = window.WD;
  const P = WD.PALETTE;
  const CFG = WD.GAME_CONFIG;
  const FONT = '8px "West Pixel", monospace';
  const rand = (min, max) => min + Math.random() * (max - min);

  class ParticleSystem {
    constructor(maxParticles = CFG.maxParticles) {
      this.max = maxParticles;
      this.active = [];
      this.pool = [];
      this.starSprite = WD.sprites.getIconCanvas('star');
    }

    spawn(props) {
      if (this.active.length >= this.max) return null;
      const p = this.pool.pop() || {};
      p.kind = 'pixel';
      p.x = 0; p.y = 0; p.vx = 0; p.vy = 0;
      p.gravity = 0; p.drag = 0; p.size = 1;
      p.color = P.white; p.text = ''; p.life = 1;
      Object.assign(p, props);
      p.maxLife = p.life;
      this.active.push(p);
      return p;
    }

    clear() {
      while (this.active.length) this.pool.push(this.active.pop());
    }

    update(dt) {
      for (let i = this.active.length - 1; i >= 0; i--) {
        const p = this.active[i];
        p.life -= dt;
        if (p.life <= 0) {
          this.pool.push(p);
          this.active[i] = this.active[this.active.length - 1];
          this.active.pop();
          continue;
        }
        if (p.drag) {
          const k = Math.max(0, 1 - p.drag * dt);
          p.vx *= k;
          p.vy *= k;
        }
        p.vy += p.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.font = FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      for (const p of this.active) {
        const t = p.life / p.maxLife;
        // Pixel-art "fade": blink out during the last 25% of life instead of alpha blending.
        if (t < 0.25 && Math.floor(p.life * 30) % 2 === 0) continue;
        const x = Math.round(p.x);
        const y = Math.round(p.y);
        if (p.kind === 'text') {
          ctx.fillStyle = P.ink;
          ctx.fillText(p.text, x + 1, y + 1);
          ctx.fillStyle = p.color;
          ctx.fillText(p.text, x, y);
        } else if (p.kind === 'star') {
          ctx.drawImage(this.starSprite, x - (this.starSprite.width >> 1), y - (this.starSprite.height >> 1));
        } else {
          ctx.fillStyle = p.color;
          ctx.fillRect(x, y, p.size, p.size);
        }
      }
      ctx.restore();
    }

    /* ---------- presets ---------- */

    jumpPuff(x, y) {
      for (let i = 0; i < 4; i++) {
        this.spawn({ x: x - 4, y: y + rand(-2, 4), vx: rand(-55, -25), vy: rand(10, 40), size: 1 + (i % 2), color: i % 2 ? P.white : P.silver, life: rand(0.25, 0.4), drag: 4 });
      }
    }

    scorePop(x, y) {
      this.spawn({ kind: 'text', text: '+1', x, y, vy: -32, life: 0.7, color: P.yellow, drag: 1.5 });
      for (let i = 0; i < 5; i++) {
        this.spawn({ x, y, vx: rand(-40, 40), vy: rand(-60, -20), gravity: 120, color: i % 2 ? P.yellow : P.white, size: 1, life: rand(0.3, 0.5) });
      }
    }

    hitBurst(x, y) {
      const colors = [P.white, P.yellow, P.orange, P.red];
      for (let i = 0; i < 26; i++) {
        const angle = rand(0, Math.PI * 2);
        const speed = rand(40, 150);
        this.spawn({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, gravity: 260, drag: 1.2, color: colors[i % colors.length], size: i % 3 === 0 ? 2 : 1, life: rand(0.4, 0.9) });
      }
      for (let i = 0; i < 3; i++) {
        this.spawn({ kind: 'text', text: '*', x: x + rand(-8, 8), y: y + rand(-8, 4), vx: rand(-30, 30), vy: rand(-60, -30), gravity: 150, color: P.white, life: 0.6 });
      }
    }

    recordStars(x, y) {
      for (let i = 0; i < 10; i++) {
        const angle = (i / 10) * Math.PI * 2;
        this.spawn({ kind: 'star', x, y, vx: Math.cos(angle) * 90, vy: Math.sin(angle) * 90 - 20, gravity: 80, drag: 2, life: rand(0.8, 1.2) });
      }
      this.spawn({ kind: 'text', text: 'NEW RECORD!', x, y: y - 14, vy: -18, life: 1.3, color: P.yellow, drag: 1 });
    }

    dust(x, y) {
      for (let i = 0; i < 10; i++) {
        this.spawn({ x: x + rand(-6, 6), y, vx: rand(-50, 50), vy: rand(-50, -10), gravity: 200, color: i % 2 ? '#d9a066' : P.white, size: 1, life: rand(0.3, 0.6) });
      }
    }
  }

  WD.game.ParticleSystem = ParticleSystem;
})();
