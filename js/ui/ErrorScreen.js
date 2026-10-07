/**
 * Shown instead of a white screen when saved data cannot be read, or on an unexpected crash.
 */
(function () {
  'use strict';

  const WD = window.WD;
  const { h, clear } = WD.dom;

  class ErrorScreen {
    constructor(overlay, panel) {
      this.overlay = overlay;
      this.panel = panel;
    }

    /**
     * @param {{ hasBackup: boolean, restore():void, importFile():void, reset():void }} actions
     */
    showCorrupted(actions) {
      clear(this.panel);
      const buttons = [];
      if (actions.hasBackup) buttons.push(h('button', { class: 'btn btn--primary', type: 'button', text: 'RESTORE BACKUP', onClick: actions.restore }));
      buttons.push(
        h('button', { class: 'btn btn--blue', type: 'button', text: 'IMPORT FILE', onClick: actions.importFile }),
        h('button', { class: 'btn btn--danger', type: 'button', text: 'RESET GAME', onClick: actions.reset }),
      );
      this.panel.append(
        h('h2', { class: 'panel__title t-orange', text: 'CORRUPTED GAME DATA' }),
        h('p', {
          class: 'dialog__text',
          text: actions.hasBackup
            ? 'Saved data could not be read. Restore the automatic backup, import a backup file, or start fresh.'
            : 'Saved data could not be read. Import a backup file or start fresh.',
        }),
        h('div', { class: 'dialog__actions' }, buttons),
      );
      this.overlay.hidden = false;
    }

    showCrash(message) {
      clear(this.panel);
      this.panel.append(
        h('h2', { class: 'panel__title t-orange', text: 'SOMETHING WENT WRONG' }),
        h('p', { class: 'dialog__text', text: message || 'An unexpected error happened. Your scores are saved.' }),
        h('div', { class: 'dialog__actions' }, [
          h('button', { class: 'btn btn--primary', type: 'button', text: 'RELOAD GAME', onClick: () => window.location.reload() }),
        ]),
      );
      this.overlay.hidden = false;
    }

    hide() {
      this.overlay.hidden = true;
    }
  }

  WD.ui.ErrorScreen = ErrorScreen;
})();
