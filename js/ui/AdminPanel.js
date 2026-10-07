/**
 * Hidden organiser panel: export / import / delete player / reset everything.
 * Open with Ctrl+Shift+A, or tap the WD logo 5 times quickly (touch devices).
 */
(function () {
  'use strict';

  const WD = window.WD;
  const { h, clear } = WD.dom;
  const { stat } = WD.ui.widgets;

  class AdminPanel {
    /**
     * @param {object} deps { overlay, panel, fileInput, storage, players, backup, dialog, toast, sound, onDataChanged, onToggleFps, isFpsOn }
     */
    constructor(deps) {
      Object.assign(this, deps);
      this.onKeyDown = this.onKeyDown.bind(this);
      this.fileInput.addEventListener('change', () => this.handleImportFile());
    }

    /** Attaches the secret openers. `canOpen` prevents opening mid-game. */
    bindTriggers(logoEl, canOpen) {
      window.addEventListener('keydown', (event) => {
        if (event.ctrlKey && event.shiftKey && event.code === 'KeyA' && canOpen()) {
          event.preventDefault();
          this.open();
        }
      });
      let taps = [];
      logoEl.addEventListener('click', () => {
        const now = Date.now();
        taps = taps.filter((t) => now - t < WD.UI_CONFIG.adminTapWindowMs).concat(now);
        if (taps.length >= WD.UI_CONFIG.adminTapCount && canOpen()) {
          taps = [];
          this.open();
        }
      });
    }

    open() {
      this.render();
      this.overlay.hidden = false;
      window.addEventListener('keydown', this.onKeyDown);
    }

    close() {
      this.overlay.hidden = true;
      window.removeEventListener('keydown', this.onKeyDown);
    }

    onKeyDown(event) {
      if (event.key === 'Escape' && !this.dialog.isOpen) this.close();
    }

    render() {
      clear(this.panel);
      const all = this.players.getAllPlayers();
      const games = all.reduce((sum, p) => sum + p.attemptsUsed, 0);
      const storageLabel = this.storage.persistent ? 'LOCAL' : 'MEMORY!';

      const deleteInput = h('input', {
        class: 'field__input', type: 'text', placeholder: 'username', autocomplete: 'off', autocapitalize: 'none', spellcheck: 'false',
      });

      this.panel.append(
        h('h2', { class: 'panel__title' }, [WD.sprites.icon('gear', 3), ' ADMIN PANEL']),
        h('div', { class: 'admin__stats' }, [
          stat('PLAYERS', all.length),
          stat('GAMES', games),
          stat('STORAGE', storageLabel),
        ]),

        this.section('BACKUP', [
          h('div', { class: 'admin__row' }, [
            this.btn('btn--primary', 'EXPORT DATA', () => this.handleExport()),
            this.btn('btn--blue', 'IMPORT DATA', () => this.fileInput.click()),
          ]),
          h('p', { class: 'admin__note', text: `Export saves ${WD.BACKUP_FILE_NAME}. Import replaces all players with the file contents (current data is kept as an automatic backup).` }),
        ]),

        this.section('DELETE ONE PLAYER (TYPOS)', [
          h('div', { class: 'admin__row' }, [
            h('label', { class: 'field' }, [h('span', { class: 'field__prefix', text: '@' }), deleteInput]),
            this.btn('btn--danger', 'DELETE', () => this.handleDeletePlayer(deleteInput.value)),
          ]),
        ]),

        this.section('DEBUG', [
          h('div', { class: 'admin__row' }, [
            this.btn('btn--ghost', this.isFpsOn() ? 'HIDE FPS' : 'SHOW FPS', () => {
              this.onToggleFps();
              this.render();
            }),
          ]),
        ]),

        this.section('DANGER ZONE', [
          h('div', { class: 'admin__row' }, [
            this.btn('btn--danger', 'RESET ALL DATA', () => this.handleReset()),
            this.storage.hasUndoSnapshot() ? this.btn('btn--ghost', 'UNDO LAST RESET / IMPORT', () => this.handleUndo()) : null,
          ]),
        ]),

        h('div', { class: 'dialog__actions', style: { marginTop: '28px' } }, [this.btn('btn--ghost', 'CLOSE', () => this.close())]),
      );
    }

    section(title, children) {
      return h('section', { class: 'admin__section' }, [h('h3', { text: title }), ...children]);
    }

    btn(variant, label, onClick) {
      return h('button', {
        class: `btn ${variant}`,
        type: 'button',
        text: label,
        onClick: () => {
          this.sound.play('button');
          onClick();
        },
      });
    }

    handleExport() {
      try {
        const count = this.backup.exportToFile();
        this.toast.show(`EXPORTED ${count} PLAYERS`);
      } catch (err) {
        console.error(err);
        this.toast.error('EXPORT FAILED');
      }
    }

    async handleImportFile() {
      const file = this.fileInput.files && this.fileInput.files[0];
      this.fileInput.value = '';
      if (!file) return;
      try {
        const { data, playerCount } = await this.backup.readFile(file);
        const ok = await this.dialog.confirm({
          title: 'IMPORT DATA?',
          message: `Replace ALL current players with ${playerCount} players from "${file.name}"?`,
          confirmLabel: 'IMPORT',
          danger: true,
        });
        if (!ok) return;
        this.backup.applyImport(data);
        this.toast.show(`IMPORTED ${playerCount} PLAYERS`);
        this.onDataChanged();
        if (!this.overlay.hidden) this.render();
      } catch (err) {
        console.error(err);
        this.toast.error(`IMPORT FAILED: ${err.message || 'UNKNOWN ERROR'}`);
      }
    }

    async handleDeletePlayer(raw) {
      const result = WD.username.normalizeUsername(raw);
      if (!result.ok || !this.players.exists(result.username)) {
        this.toast.error('PLAYER NOT FOUND');
        return;
      }
      const ok = await this.dialog.confirm({
        title: 'DELETE PLAYER?',
        message: `${result.username} and their scores will be removed.`,
        confirmLabel: 'DELETE',
        danger: true,
      });
      if (!ok) return;
      this.players.deletePlayer(result.username);
      this.toast.show(`${result.username} DELETED`);
      this.onDataChanged();
      this.render();
    }

    async handleReset() {
      const ok = await this.dialog.confirm({
        title: 'ARE YOU SURE?',
        message: 'This will delete all players and scores.',
        cancelLabel: 'CANCEL',
        confirmLabel: 'DELETE EVERYTHING',
        danger: true,
      });
      if (!ok) return;
      this.storage.resetAll();
      this.toast.show('ALL DATA DELETED');
      this.onDataChanged();
      this.render();
    }

    async handleUndo() {
      const ok = await this.dialog.confirm({
        title: 'UNDO RESET / IMPORT?',
        message: 'Data from before the last reset or import comes back. Anything played since then is replaced.',
        confirmLabel: 'RESTORE',
        danger: true,
      });
      if (!ok) return;
      if (this.storage.restoreUndoSnapshot()) this.toast.show('PREVIOUS DATA RESTORED');
      else this.toast.error('NOTHING TO RESTORE');
      this.onDataChanged();
      this.render();
    }

    /** Lets other screens (e.g. corrupted-data screen) reuse the import flow. */
    requestImport() {
      this.fileInput.click();
    }
  }

  WD.ui.AdminPanel = AdminPanel;
})();
