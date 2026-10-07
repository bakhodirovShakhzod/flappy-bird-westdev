/**
 * requestAnimationFrame loop with a fixed physics timestep and render interpolation.
 * Physics are frame-rate independent: 60 Hz, 120 Hz and 144 Hz screens play identically.
 */
(function () {
  'use strict';

  const WD = window.WD;
  const FPS_SAMPLE_MS = 500;

  class GameLoop {
    /**
     * @param {{ update(dt:number):void, render(alpha:number):void, step:number, maxFrameTime:number }} options
     */
    constructor({ update, render, step, maxFrameTime }) {
      this.update = update;
      this.render = render;
      this.step = step;
      this.maxFrameTime = maxFrameTime;
      this.accumulator = 0;
      this.lastTime = 0;
      this.running = false;
      this.rafId = 0;
      this.fps = 0;
      this.fpsFrames = 0;
      this.fpsTime = 0;
      this.frame = this.frame.bind(this);
    }

    start() {
      if (this.running) return;
      this.running = true;
      this.lastTime = performance.now();
      this.rafId = requestAnimationFrame(this.frame);
    }

    stop() {
      this.running = false;
      cancelAnimationFrame(this.rafId);
    }

    frame(now) {
      if (!this.running) return;
      this.rafId = requestAnimationFrame(this.frame);

      const frameTime = Math.min(this.maxFrameTime, Math.max(0, (now - this.lastTime) / 1000));
      this.lastTime = now;
      this.accumulator += frameTime;

      try {
        while (this.accumulator >= this.step) {
          this.update(this.step);
          this.accumulator -= this.step;
        }
        this.render(this.accumulator / this.step);
      } catch (err) {
        console.error('[loop] frame failed', err);
      }

      this.fpsFrames++;
      this.fpsTime += frameTime * 1000;
      if (this.fpsTime >= FPS_SAMPLE_MS) {
        this.fps = Math.round((this.fpsFrames * 1000) / this.fpsTime);
        this.fpsFrames = 0;
        this.fpsTime = 0;
      }
    }
  }

  WD.game = WD.game || {};
  WD.game.GameLoop = GameLoop;
})();
