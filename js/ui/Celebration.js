/**
 * Full-screen "NEW CHAMPION!" moment.
 */
(function () {
  'use strict';

  const WD = window.WD;
  const { h, clear } = WD.dom;
  const DURATION_MS = 2400;
  const LETTER_DELAY_MS = 60;

  class Celebration {
    constructor(root) {
      this.root = root;
      this.timer = null;
    }

    /** @returns {Promise<void>} resolves when the animation ends */
    show(username) {
      clearTimeout(this.timer);
      clear(this.root);
      const text = h('p', { class: 'celebration__text t-outline' });
      'NEW CHAMPION!'.split('').forEach((ch, i) => {
        const span = h('span', { text: ch === ' ' ? ' ' : ch });
        span.style.animationDelay = `${i * LETTER_DELAY_MS}ms`;
        text.appendChild(span);
      });
      this.root.append(
        WD.sprites.icon('crown', 12, 'celebration__crown'),
        text,
        h('p', { class: 'celebration__sub t-outline', text: username }),
      );
      this.root.hidden = false;
      WD.dom.replayAnimation(this.root, 'celebration');
      return new Promise((resolve) => {
        this.timer = setTimeout(() => {
          this.root.hidden = true;
          resolve();
        }, DURATION_MS);
      });
    }
  }

  WD.ui.Celebration = Celebration;
})();
