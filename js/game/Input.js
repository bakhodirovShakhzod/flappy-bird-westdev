/**
 * Flap input: SPACE / ArrowUp / W, left mouse button, touch tap.
 * One physical press = exactly one flap (key repeat ignored).
 */
(function () {
  'use strict';

  const WD = window.WD;
  const FLAP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW']);

  class Input {
    /**
     * @param {HTMLElement} surface element that receives taps/clicks
     * @param {() => boolean} isActive whether flap input is currently wanted
     * @param {() => void} onFlap
     */
    constructor(surface, isActive, onFlap) {
      this.surface = surface;
      this.isActive = isActive;
      this.onFlap = onFlap;
      this.onKeyDown = this.onKeyDown.bind(this);
      this.onPointerDown = this.onPointerDown.bind(this);
      window.addEventListener('keydown', this.onKeyDown);
      surface.addEventListener('pointerdown', this.onPointerDown);
      surface.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    onKeyDown(event) {
      if (!FLAP_KEYS.has(event.code) || !this.isActive()) return;
      const target = event.target;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      event.preventDefault(); // no page scroll, no focused-button activation
      if (event.repeat) return;
      this.onFlap();
    }

    onPointerDown(event) {
      if (!this.isActive()) return;
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      event.preventDefault();
      this.onFlap();
    }
  }

  WD.game.Input = Input;
})();
