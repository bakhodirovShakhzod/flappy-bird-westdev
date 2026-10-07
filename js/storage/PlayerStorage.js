/**
 * Player repository: one normalised username = one player.
 */
(function () {
  'use strict';

  const WD = window.WD;
  const MAX_ATTEMPTS = WD.GAME_CONFIG.maxAttempts;

  const copy = (player) => (player ? { ...player, scores: player.scores.slice() } : null);

  class PlayerStorage {
    /** @param {WD.storage.GameStorage} storage */
    constructor(storage) {
      this.storage = storage;
    }

    getPlayer(username) {
      return copy(this.storage.state.players[username]);
    }

    exists(username) {
      return Object.prototype.hasOwnProperty.call(this.storage.state.players, username);
    }

    count() {
      return Object.keys(this.storage.state.players).length;
    }

    getAllPlayers() {
      return Object.values(this.storage.state.players).map(copy);
    }

    /** Creates the player, or returns the existing one — never duplicates. */
    createPlayer(username) {
      if (!WD.username.isValidUsername(username)) throw new Error(`Invalid username: ${username}`);
      if (this.exists(username)) return this.getPlayer(username);
      this.storage.update((draft) => {
        draft.players[username] = WD.storage.schema.createPlayerRecord(username, Date.now());
      });
      return this.getPlayer(username);
    }

    getOrCreatePlayer(username) {
      return this.exists(username) ? this.getPlayer(username) : this.createPlayer(username);
    }

    static attemptsLeft(player) {
      return player ? Math.max(0, MAX_ATTEMPTS - player.attemptsUsed) : 0;
    }

    canPlay(username) {
      const player = this.storage.state.players[username];
      return Boolean(player) && player.attemptsUsed < MAX_ATTEMPTS;
    }

    /**
     * Consumes one attempt BEFORE the run starts, so a page refresh can never give it back.
     * @returns {{ ok: boolean, player: object|null, attemptsLeft: number }}
     */
    useAttempt(username) {
      const ok = this.storage.update((draft) => {
        const player = draft.players[username];
        if (!player || player.attemptsUsed >= MAX_ATTEMPTS) return false;
        player.attemptsUsed = Math.min(MAX_ATTEMPTS, player.attemptsUsed + 1);
        player.updatedAt = Date.now();
        return true;
      });
      const player = this.getPlayer(username);
      return { ok, player, attemptsLeft: PlayerStorage.attemptsLeft(player) };
    }

    /**
     * Stores the result of a finished run. bestScore only ever goes up.
     * @returns {{ player: object, previousBest: number, isNewBest: boolean }}
     */
    updateBestScore(username, rawScore) {
      const score = Math.max(0, Math.floor(Number(rawScore) || 0));
      const result = this.storage.update((draft) => {
        const player = draft.players[username];
        if (!player) throw new Error(`Unknown player ${username}`);
        const now = Date.now();
        const previousBest = player.bestScore;
        const isNewBest = score > previousBest;
        player.scores = player.scores.concat(score).slice(-MAX_ATTEMPTS);
        if (isNewBest || player.bestScoreAt == null) {
          player.bestScore = Math.max(previousBest, score);
          player.bestScoreAt = now;
        }
        player.updatedAt = now;
        return { previousBest, isNewBest };
      });
      return { ...result, player: this.getPlayer(username) };
    }

    deletePlayer(username) {
      if (!this.exists(username)) return false;
      this.storage.update((draft) => {
        delete draft.players[username];
        if (draft.session.currentUsername === username) draft.session.currentUsername = null;
      });
      return true;
    }
  }

  WD.storage.PlayerStorage = PlayerStorage;
})();
