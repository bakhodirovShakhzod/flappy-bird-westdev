/**
 * Settings + session (current player, intro seen).
 */
(function () {
  'use strict';

  const WD = window.WD;

  class SettingsStorage {
    /**
     * @param {WD.storage.GameStorage} storage
     * @param {WD.storage.SafeStore} sessionStore sessionStorage wrapper
     */
    constructor(storage, sessionStore) {
      this.storage = storage;
      this.sessionStore = sessionStore;
    }

    isSoundEnabled() {
      return this.storage.state.settings.soundEnabled !== false;
    }

    setSoundEnabled(enabled) {
      this.storage.update((draft) => {
        draft.settings.soundEnabled = Boolean(enabled);
      });
    }

    getCurrentUsername() {
      return this.storage.state.session.currentUsername;
    }

    setCurrentUsername(username) {
      if (this.getCurrentUsername() === username) return;
      this.storage.update((draft) => {
        draft.session.currentUsername = username || null;
      });
    }

    wasIntroSeen() {
      return this.sessionStore.get(WD.STORAGE_KEYS.introSeen) === '1';
    }

    markIntroSeen() {
      try {
        this.sessionStore.set(WD.STORAGE_KEYS.introSeen, '1');
      } catch (err) {
        /* not important */
      }
    }
  }

  WD.storage.SettingsStorage = SettingsStorage;
})();
