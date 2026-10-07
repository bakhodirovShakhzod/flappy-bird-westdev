/**
 * Collision detection: circle (bird) vs axis-aligned rectangles (pipes, ground).
 */
(function () {
  'use strict';

  const WD = window.WD;
  const CFG = WD.GAME_CONFIG;
  const SKY_LIMIT = -1000; // top pipes extend far above the screen

  function circleIntersectsRect(cx, cy, r, rx, ry, rw, rh) {
    const nearestX = Math.max(rx, Math.min(cx, rx + rw));
    const nearestY = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - nearestX;
    const dy = cy - nearestY;
    return dx * dx + dy * dy < r * r;
  }

  /** Collision rectangles of one pipe pair (bodies + wider caps). */
  function pipeRects(pipe, groundY) {
    const capX = pipe.x - CFG.pipeCapOverhang;
    const capW = CFG.pipeWidth + CFG.pipeCapOverhang * 2;
    return [
      [pipe.x, SKY_LIMIT, CFG.pipeWidth, pipe.gapTop - SKY_LIMIT],
      [capX, pipe.gapTop - CFG.pipeCapHeight, capW, CFG.pipeCapHeight],
      [capX, pipe.gapBottom, capW, CFG.pipeCapHeight],
      [pipe.x, pipe.gapBottom, CFG.pipeWidth, groundY - pipe.gapBottom],
    ];
  }

  function hitsPipe(bird, pipes, groundY) {
    for (const pipe of pipes) {
      if (pipe.x - CFG.pipeCapOverhang > bird.x + bird.radius) continue; // broad phase
      if (pipe.x + CFG.pipeWidth + CFG.pipeCapOverhang < bird.x - bird.radius) continue;
      for (const r of pipeRects(pipe, groundY)) {
        if (circleIntersectsRect(bird.x, bird.y, bird.radius, r[0], r[1], r[2], r[3])) return true;
      }
    }
    return false;
  }

  function hitsGround(bird, groundY) {
    return bird.y + bird.radius >= groundY;
  }

  WD.game.Collision = Object.freeze({ circleIntersectsRect, hitsPipe, hitsGround });
})();
