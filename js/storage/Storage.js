/**
 * Storage layer core.
 *
 *  - SafeStore      : exception-safe wrapper around localStorage / sessionStorage
 *                     (falls back to memory when the browser blocks storage)
 *  - schema         : versioned schema, migrations, sanitising of untrusted data
 *  - GameStorage    : the single source of truth. The ONLY place that touches
 *                     localStorage for game data.
 */
(function () {
  'use strict';

  const WD = window.WD;
  const MAX_ATTEMPTS = WD.GAME_CONFIG.maxAttempts;

  class CorruptedDataError extends Error {
    constructor(message) {
      super(message);
      this.name = 'CorruptedDataError';
    }
  }

  class StorageWriteError extends Error {
    constructor(message, cause) {
      super(message);
      this.name = 'StorageWriteError';
      this.cause = cause;
    }
  }

  /* ------------------------------------------------------------------ */
  /* SafeStore                                                           */
  /* ------------------------------------------------------------------ */

  class SafeStore {
    constructor(getBackend) {
      this.memory = new Map();
      this.backend = null;
      try {
        const backend = getBackend();
        const probe = '__westdev_probe__';
        backend.setItem(probe, probe);
        backend.removeItem(probe);
        this.backend = backend;
      } catch (err) {
        console.warn('[storage] Browser storage unavailable, using memory only.', err);
      }
    }

    get persistent() {
      return this.backend !== null;
    }

    get(key) {
      try {
        return this.backend ? this.backend.getItem(key) : this.memory.get(key) ?? null;
      } catch (err) {
        console.warn('[storage] read failed', err);
        return null;
      }
    }

    set(key, value) {
      if (!this.backend) {
        this.memory.set(key, value);
        return;
      }
      try {
        this.backend.setItem(key, value);
      } catch (err) {
        throw new StorageWriteError('Could not write to browser storage (is it full?)', err);
      }
    }

    remove(key) {
      try {
        if (this.backend) this.backend.removeItem(key);
        else this.memory.delete(key);
      } catch (err) {
        console.warn('[storage] remove failed', err);
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Schema                                                              */
  /* ------------------------------------------------------------------ */

  const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
  const toInt = (v, fallback) => (Number.isFinite(Number(v)) ? Math.floor(Number(v)) : fallback);
  const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

  function createEmptyState() {
    return {
      version: WD.STORAGE_VERSION,
      players: {},
      settings: { soundEnabled: true },
      session: { currentUsername: null },
    };
  }

  function createPlayerRecord(username, now) {
    return {
      username,
      bestScore: 0,
      bestScoreAt: null, // when the current best was first reached — used for tie-breaks
      attemptsUsed: 0,
      scores: [],
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * Turns an untrusted player object into a valid record, or null if unusable.
   * Guarantees 0 <= attemptsUsed <= maxAttempts and a non-negative integer score.
   */
  function sanitizePlayer(key, raw) {
    if (!isPlainObject(raw)) return null;
    const username = typeof raw.username === 'string' ? raw.username : key;
    if (!WD.username.isValidUsername(username)) return null;

    const now = Date.now();
    const createdAt = toInt(raw.createdAt, now);
    const scores = Array.isArray(raw.scores)
      ? raw.scores.map((s) => toInt(s, -1)).filter((s) => s >= 0).slice(-MAX_ATTEMPTS)
      : [];
    const bestScore = Math.max(0, toInt(raw.bestScore, 0), ...scores);
    const attemptsUsed = clamp(toInt(raw.attemptsUsed, 0), 0, MAX_ATTEMPTS);
    let bestScoreAt = raw.bestScoreAt == null ? null : toInt(raw.bestScoreAt, null);
    // Hand-made / external data without the field at all: fall back to updatedAt.
    if (raw.bestScoreAt === undefined && attemptsUsed > 0) bestScoreAt = toInt(raw.updatedAt, createdAt);

    return {
      username,
      bestScore,
      bestScoreAt,
      attemptsUsed,
      scores,
      createdAt,
      updatedAt: toInt(raw.updatedAt, createdAt),
    };
  }

  /** Version migrations: MIGRATIONS[n] upgrades a version-n object to n+1. */
  const MIGRATIONS = {
    0: (raw) => ({ ...raw, version: 1 }), // pre-versioned data
  };

  function migrate(raw) {
    let data = raw;
    let version = toInt(data.version, 0);
    if (version > WD.STORAGE_VERSION) {
      throw new CorruptedDataError(`Data was created by a newer version (v${version}).`);
    }
    while (version < WD.STORAGE_VERSION) {
      const step = MIGRATIONS[version];
      if (!step) throw new CorruptedDataError(`No migration from v${version}.`);
      data = step(data);
      version = toInt(data.version, version + 1);
    }
    return data;
  }

  /**
   * @returns {{ state: object, repairs: number }}
   * @throws CorruptedDataError when the structure is unusable
   */
  function sanitizeState(raw) {
    if (!isPlainObject(raw)) throw new CorruptedDataError('Root is not an object.');
    const data = migrate(raw);
    if (data.players != null && !isPlainObject(data.players)) {
      throw new CorruptedDataError('"players" is not an object.');
    }

    const state = createEmptyState();
    let repairs = 0;

    Object.keys(data.players || {}).forEach((key) => {
      const player = sanitizePlayer(key, data.players[key]);
      if (!player) {
        repairs++;
        return;
      }
      const existing = state.players[player.username];
      // Duplicates after normalisation: keep the better one.
      if (!existing || player.bestScore > existing.bestScore) state.players[player.username] = player;
      else repairs++;
    });

    if (isPlainObject(data.settings)) {
      state.settings.soundEnabled = data.settings.soundEnabled !== false;
    }
    if (isPlainObject(data.session) && state.players[data.session.currentUsername]) {
      state.session.currentUsername = data.session.currentUsername;
    }
    return { state, repairs };
  }

  /* ------------------------------------------------------------------ */
  /* GameStorage                                                         */
  /* ------------------------------------------------------------------ */

  class GameStorage {
    constructor(store, keys) {
      this.store = store;
      this.keys = keys;
      this.state = createEmptyState();
      this.revision = 0;
      this.listeners = new Set();
      this.loadError = null;
    }

    get persistent() {
      return this.store.persistent;
    }

    /**
     * @returns {'new'|'ok'|'repaired'|'corrupted'}
     */
    load() {
      const raw = this.store.get(this.keys.data);
      if (raw == null) {
        this.state = createEmptyState();
        this.bump();
        return 'new';
      }
      try {
        const { state, repairs } = sanitizeState(JSON.parse(raw));
        this.state = state;
        this.bump();
        if (repairs > 0) this.writeState(state);
        else this.writeMirror(raw);
        return repairs > 0 ? 'repaired' : 'ok';
      } catch (err) {
        console.error('[storage] corrupted data', err);
        this.loadError = err;
        // Keep the unreadable payload so it can be inspected / repaired by hand later.
        try {
          this.store.set(this.keys.corrupted, raw);
        } catch (writeErr) {
          /* storage full — nothing more we can do */
        }
        return 'corrupted';
      }
    }

    /** Re-reads storage after another tab changed it. */
    reload() {
      const raw = this.store.get(this.keys.data);
      if (raw == null) return;
      try {
        this.state = sanitizeState(JSON.parse(raw)).state;
        this.bump();
      } catch (err) {
        console.warn('[storage] ignored invalid external change', err);
      }
    }

    /**
     * Applies a mutation atomically: works on a copy, validates, persists, then commits.
     * @template T
     * @param {(draft: object) => T} mutator
     * @returns {T}
     */
    update(mutator) {
      const draft = JSON.parse(JSON.stringify(this.state));
      const result = mutator(draft);
      const { state } = sanitizeState(draft);
      this.writeState(state);
      this.state = state;
      this.bump();
      return result;
    }

    /** Replaces everything (import). The previous data is kept as an undo snapshot. */
    replaceAll(rawData) {
      const { state } = sanitizeState(rawData);
      state.settings = { ...this.state.settings };
      state.session = { currentUsername: null };
      this.commitDestructive(state);
      return Object.keys(state.players).length;
    }

    /** Deletes all players. Settings survive; the old data is kept as an undo snapshot. */
    resetAll() {
      const state = createEmptyState();
      state.settings = { ...this.state.settings };
      this.commitDestructive(state);
    }

    /** Rolling mirror of the latest good save — used to recover from corruption. */
    getBackupState() {
      return this.readStateKey(this.keys.backup);
    }

    restoreBackup() {
      return this.restoreFromKey(this.keys.backup);
    }

    /** Snapshot taken right before the last reset / import. */
    hasUndoSnapshot() {
      return this.readStateKey(this.keys.undo) !== null;
    }

    restoreUndoSnapshot() {
      return this.restoreFromKey(this.keys.undo);
    }

    /** Plain copy for export. */
    snapshot() {
      return JSON.parse(JSON.stringify(this.state));
    }

    subscribe(listener) {
      this.listeners.add(listener);
      return () => this.listeners.delete(listener);
    }

    /* internal */

    writeState(state) {
      const json = JSON.stringify(state);
      this.store.set(this.keys.data, json);
      this.writeMirror(json);
    }

    /** Best effort: a full disk must never block the primary save. */
    writeMirror(json) {
      try {
        this.store.set(this.keys.backup, json);
      } catch (err) {
        console.warn('[storage] backup write failed', err);
      }
    }

    commitDestructive(nextState) {
      // While corrupted, the mirror still holds the last good data — keep THAT as the undo point.
      const undo = this.loadError == null ? JSON.stringify(this.state) : this.store.get(this.keys.backup);
      if (undo != null) {
        try {
          this.store.set(this.keys.undo, undo);
        } catch (err) {
          console.warn('[storage] undo snapshot failed', err);
        }
      }
      this.writeState(nextState);
      this.state = nextState;
      this.loadError = null;
      this.bump();
    }

    readStateKey(key) {
      const raw = this.store.get(key);
      if (raw == null) return null;
      try {
        return sanitizeState(JSON.parse(raw)).state;
      } catch (err) {
        return null;
      }
    }

    restoreFromKey(key) {
      const state = this.readStateKey(key);
      if (!state) return false;
      this.writeState(state);
      this.state = state;
      this.loadError = null;
      this.bump();
      return true;
    }

    bump() {
      this.revision++;
      this.listeners.forEach((fn) => {
        try {
          fn(this.state);
        } catch (err) {
          console.error('[storage] listener failed', err);
        }
      });
    }
  }

  WD.storage = WD.storage || {};
  Object.assign(WD.storage, {
    SafeStore,
    GameStorage,
    CorruptedDataError,
    StorageWriteError,
    schema: Object.freeze({ createEmptyState, createPlayerRecord, sanitizeState, sanitizePlayer }),
  });
})();
