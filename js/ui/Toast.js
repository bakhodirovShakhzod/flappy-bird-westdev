(function () {
  'use strict';

  const WD = window.WD;

  class Toast {
    constructor(el) {
      this.el = el;
      this.timer = null;
    }

    show(message, { type = 'info', duration = WD.UI_CONFIG.toastDuration } = {}) {
      clearTimeout(this.timer);
      this.el.textContent = message;
      this.el.className = `toast${type === 'error' ? ' toast--error' : ''}`;
      this.el.hidden = false;
      WD.dom.replayAnimation(this.el, 'toast');
      this.timer = setTimeout(() => {
        this.el.hidden = true;
      }, duration);
    }

    error(message) {
      this.show(message, { type: 'error', duration: WD.UI_CONFIG.toastDuration * 1.5 });
    }
  }

  WD.ui.Toast = Toast;
})();
