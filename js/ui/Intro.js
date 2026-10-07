/**
 * Short splash: "WEST DEV PRESENTS" -> bird flies across -> "FLAPPY BIRD". ~2 seconds, skippable.
 */
(function () {
  'use strict';

  const WD = window.WD;
  const BAR_BLOCKS = 18;
  const OUT_DURATION = 300;

  class Intro {
    constructor(root, sound) {
      this.root = root;
      this.sound = sound;
      root.querySelectorAll('.intro__bar').forEach((bar) => {
        for (let i = 0; i < BAR_BLOCKS; i++) {
          const block = WD.dom.h('span');
          block.style.animationDelay = `${i * 25}ms`;
          bar.appendChild(block);
        }
      });
    }

    /** @returns {Promise<void>} resolves when the intro is gone */
    play() {
      return new Promise((resolve) => {
        const bird = WD.ui.widgets.mountBird(this.root.querySelector('#intro-bird'), 5);
        this.root.hidden = false;
        let finished = false;

        const finish = () => {
          if (finished) return;
          finished = true;
          clearTimeout(timer);
          this.root.removeEventListener('pointerdown', finish);
          window.removeEventListener('keydown', finish);
          this.root.classList.add('intro--out');
          setTimeout(() => {
            bird.stop();
            this.root.hidden = true;
            this.root.classList.remove('intro--out');
            resolve();
          }, OUT_DURATION);
        };

        const timer = setTimeout(finish, WD.UI_CONFIG.introDuration);
        this.root.addEventListener('pointerdown', finish);
        window.addEventListener('keydown', finish);
      });
    }
  }

  WD.ui.Intro = Intro;
})();
