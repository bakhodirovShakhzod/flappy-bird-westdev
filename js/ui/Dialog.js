/**
 * Pixel confirm dialog. confirm(...) resolves true/false.
 */
(function () {
  'use strict';

  const WD = window.WD;
  const { h, clear } = WD.dom;

  class Dialog {
    constructor(overlay, panel, sound) {
      this.overlay = overlay;
      this.panel = panel;
      this.sound = sound;
      this.resolve = null;
      this.onKeyDown = this.onKeyDown.bind(this);
    }

    get isOpen() {
      return !this.overlay.hidden;
    }

    /**
     * @param {{ title: string, message: string, confirmLabel?: string, cancelLabel?: string, danger?: boolean }} options
     * @returns {Promise<boolean>}
     */
    confirm({ title, message, confirmLabel = 'OK', cancelLabel = 'CANCEL', danger = false }) {
      if (this.resolve) this.close(false);
      clear(this.panel);
      const cancelBtn = h('button', { class: 'btn btn--ghost', type: 'button', text: cancelLabel, onClick: () => this.close(false) });
      const okBtn = h('button', {
        class: `btn ${danger ? 'btn--danger' : 'btn--primary'}`,
        type: 'button',
        text: confirmLabel,
        onClick: () => this.close(true),
      });
      this.panel.append(
        h('h2', { class: `panel__title ${danger ? 't-orange' : ''}`, text: title }),
        h('p', { class: 'dialog__text', text: message }),
        h('div', { class: 'dialog__actions' }, [cancelBtn, okBtn]),
      );
      this.overlay.hidden = false;
      window.addEventListener('keydown', this.onKeyDown, true);
      cancelBtn.focus();
      return new Promise((resolve) => {
        this.resolve = resolve;
      });
    }

    close(result) {
      this.overlay.hidden = true;
      window.removeEventListener('keydown', this.onKeyDown, true);
      if (this.sound) this.sound.play('button');
      const resolve = this.resolve;
      this.resolve = null;
      if (resolve) resolve(result);
    }

    onKeyDown(event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        this.close(false);
      }
    }
  }

  WD.ui.Dialog = Dialog;
})();
