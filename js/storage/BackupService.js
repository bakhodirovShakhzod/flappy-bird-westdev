/**
 * Export / import of the whole local database as a JSON file.
 */
(function () {
  'use strict';

  const WD = window.WD;
  const MAX_IMPORT_BYTES = 10 * 1024 * 1024;

  class BackupService {
    /** @param {WD.storage.GameStorage} storage */
    constructor(storage) {
      this.storage = storage;
    }

    buildExport() {
      const { version, players } = this.storage.snapshot();
      return { version, app: 'west-dev-flappy-bird', exportedAt: new Date().toISOString(), players };
    }

    /** Triggers a download of west-dev-flappy-backup.json */
    exportToFile() {
      const json = JSON.stringify(this.buildExport(), null, 2);
      const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
      const link = WD.dom.h('a', { href: url, download: WD.BACKUP_FILE_NAME });
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return Object.keys(this.storage.state.players).length;
    }

    /**
     * Reads and validates a backup file. Does NOT apply it.
     * @returns {Promise<{ data: object, playerCount: number }>}
     */
    async readFile(file) {
      if (!file) throw new Error('NO FILE SELECTED');
      if (file.size > MAX_IMPORT_BYTES) throw new Error('FILE IS TOO LARGE');
      let parsed;
      try {
        parsed = JSON.parse(await file.text());
      } catch (err) {
        throw new Error('FILE IS NOT VALID JSON');
      }
      let state;
      try {
        state = WD.storage.schema.sanitizeState(parsed).state;
      } catch (err) {
        throw new Error('NOT A WEST DEV BACKUP');
      }
      return { data: state, playerCount: Object.keys(state.players).length };
    }

    applyImport(data) {
      return this.storage.replaceAll(data);
    }
  }

  WD.storage.BackupService = BackupService;
})();
