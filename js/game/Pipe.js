/**
 * Pipes: spawning (distance based, so spacing never depends on FPS), movement and drawing.
 */
(function () {
  'use strict';

  const WD = window.WD;
  const CFG = WD.GAME_CONFIG;
  const P = WD.PALETTE;
  const OFFSCREEN_MARGIN = 8;

  // Column shading, left -> right (pixel-art cylinder look).
  const BODY_COLUMNS = [P.ink, P.lime, P.lime, P.green, P.lime, P.green, P.green, P.green, P.green,
    P.green, P.green, P.green, P.green, P.green, P.green, P.green, P.green, P.green, P.green,
    P.teal, P.green, P.teal, P.teal, P.teal, P.teal, P.ink];

  function buildColumnTile(width) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    for (let x = 0; x < width; x++) {
      const i = Math.floor((x / width) * BODY_COLUMNS.length);
      ctx.fillStyle = BODY_COLUMNS[Math.min(BODY_COLUMNS.length - 1, i)];
      ctx.fillRect(x, 0, 1, 1);
    }
    return canvas;
  }

  class Pipe {
    constructor(x, gapTop, gap) {
      this.x = x;
      this.prevX = x;
      this.gapTop = gapTop;
      this.gap = gap;
      this.passed = false;
    }

    get gapBottom() {
      return this.gapTop + this.gap;
    }
  }

  class PipeManager {
    constructor() {
      this.bodyTile = buildColumnTile(CFG.pipeWidth);
      this.capTile = buildColumnTile(CFG.pipeWidth + CFG.pipeCapOverhang * 2);
      this.pipes = [];
      this.reset(CFG.minWorldWidth, CFG.worldHeight - CFG.groundHeight);
    }

    /**
     * @param {number} worldWidth
     * @param {number} groundY
     * @param {number|null} firstX if given, pipes are pre-placed from here to the right edge,
     *   so the first pipe arrives after the same delay on every screen width.
     */
    reset(worldWidth, groundY, firstX = null) {
      this.pipes = [];
      this.worldWidth = worldWidth;
      this.groundY = groundY;
      this.lastGapCenter = groundY / 2;
      this.distanceToSpawn = 0;
      if (firstX == null) return;

      const spawnX = worldWidth + OFFSCREEN_MARGIN;
      let x = firstX;
      while (x < spawnX) {
        this.spawn(CFG.pipeGap, x);
        x += CFG.pipeSpacing;
      }
      this.distanceToSpawn = x - spawnX;
    }

    setWorldWidth(width) {
      this.worldWidth = width;
    }

    /**
     * @param {number} dt
     * @param {number} speed px/s
     * @param {number} gap current gap size
     */
    update(dt, speed, gap) {
      const dx = speed * dt;
      for (const pipe of this.pipes) {
        pipe.prevX = pipe.x;
        pipe.x -= dx;
      }
      while (this.pipes.length && this.pipes[0].x + CFG.pipeWidth + OFFSCREEN_MARGIN < 0) this.pipes.shift();

      this.distanceToSpawn -= dx;
      if (this.distanceToSpawn <= 0) {
        this.spawn(gap);
        this.distanceToSpawn += CFG.pipeSpacing;
      }
    }

    /** Freezes interpolation (used when the world stops on death). */
    freeze() {
      for (const pipe of this.pipes) pipe.prevX = pipe.x;
    }

    spawn(gap, x = this.worldWidth + OFFSCREEN_MARGIN) {
      const half = gap / 2;
      const minCenter = CFG.pipeMinTopHeight + half;
      const maxCenter = this.groundY - CFG.pipeMinTopHeight - half;
      const low = Math.max(minCenter, this.lastGapCenter - CFG.pipeMaxGapShift);
      const high = Math.min(maxCenter, this.lastGapCenter + CFG.pipeMaxGapShift);
      const center = Math.round(low + Math.random() * (high - low));
      this.lastGapCenter = center;
      this.pipes.push(new Pipe(x, center - half, gap));
    }

    /** Pipes that the bird has just passed (each pipe counted once). */
    collectPassed(birdX) {
      let passed = 0;
      for (const pipe of this.pipes) {
        if (!pipe.passed && pipe.x + CFG.pipeWidth / 2 < birdX) {
          pipe.passed = true;
          passed++;
        }
      }
      return passed;
    }

    draw(ctx, alpha) {
      const capW = CFG.pipeWidth + CFG.pipeCapOverhang * 2;
      const capH = CFG.pipeCapHeight;
      for (const pipe of this.pipes) {
        const x = Math.round(pipe.prevX + (pipe.x - pipe.prevX) * alpha);
        const capX = x - CFG.pipeCapOverhang;
        const top = Math.round(pipe.gapTop);
        const bottom = Math.round(pipe.gapBottom);

        // top pipe
        ctx.drawImage(this.bodyTile, x, 0, CFG.pipeWidth, Math.max(0, top - capH));
        this.drawCap(ctx, capX, top - capH, capW, capH);
        // bottom pipe
        ctx.drawImage(this.bodyTile, x, bottom + capH, CFG.pipeWidth, Math.max(0, this.groundY - bottom - capH));
        this.drawCap(ctx, capX, bottom, capW, capH);
      }
    }

    drawCap(ctx, x, y, w, h) {
      ctx.drawImage(this.capTile, x, y, w, h);
      ctx.fillStyle = P.ink;
      ctx.fillRect(x, y, w, 1);
      ctx.fillRect(x, y + h - 1, w, 1);
      ctx.fillStyle = P.lime;
      ctx.fillRect(x + 1, y + 1, w - 2, 1);
    }
  }

  WD.game.Pipe = Pipe;
  WD.game.PipeManager = PipeManager;
})();
