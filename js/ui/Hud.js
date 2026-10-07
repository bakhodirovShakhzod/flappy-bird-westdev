/**
 * In-game heads-up display (DOM, pointer-events: none so taps reach the canvas).
 */
(function () {
  'use strict';

  const WD = window.WD;
  const { $, clear, replayAnimation } = WD.dom;

  class Hud {
    constructor(root) {
      this.root = root;
      this.nameEl = $('#hud-name', root);
      this.heartsEl = $('#hud-hearts', root);
      this.scoreEl = $('#hud-score', root);
      this.bestEl = $('#hud-best', root);
      this.recordEl = $('#hud-record', root);
      this.readyEl = $('#hud-ready', root);
      this.fpsEl = $('#hud-fps', root);
      this.fpsTimer = null;
    }

    show({ username, attemptsLeft, bestScore }) {
      this.nameEl.textContent = username;
      clear(this.heartsEl).appendChild(WD.ui.widgets.hearts(attemptsLeft, 2));
      this.bestEl.textContent = bestScore > 0 ? `BEST ${bestScore}` : '';
      this.setScore(0, false);
      this.recordEl.hidden = true;
      this.readyEl.hidden = false;
      this.root.hidden = false;
    }

    hide() {
      this.root.hidden = true;
    }

    setReady(isReady) {
      this.readyEl.hidden = !isReady;
    }

    setScore(score, animate = true) {
      this.scoreEl.textContent = String(score);
      if (animate) replayAnimation(this.scoreEl, 'hud__value--bump');
    }

    showRecord() {
      this.recordEl.hidden = false;
      replayAnimation(this.recordEl, 'hud__record');
    }

    /** Optional FPS meter (toggle from the admin panel or ?fps in the URL). */
    showFps(enabled, getFps) {
      clearInterval(this.fpsTimer);
      this.fpsEl.hidden = !enabled;
      if (!enabled) return;
      this.fpsTimer = setInterval(() => {
        this.fpsEl.textContent = `${getFps()} FPS`;
      }, 500);
    }
  }

  WD.ui.Hud = Hud;
})();
