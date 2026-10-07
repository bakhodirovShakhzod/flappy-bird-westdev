/**
 * Read-only leaderboard queries. The ranking is cached per storage revision,
 * so lookups stay instant even with thousands of local players.
 */
(function () {
  'use strict';

  const WD = window.WD;

  class LeaderboardStorage {
    /** @param {WD.storage.GameStorage} storage */
    constructor(storage) {
      this.storage = storage;
      this.cache = null;
      this.cacheRevision = -1;
    }

    getRanking() {
      if (this.cacheRevision !== this.storage.revision) {
        this.cache = WD.ranking.buildRanking(this.storage.state.players);
        this.cacheRevision = this.storage.revision;
      }
      return this.cache;
    }

    getTopPlayers(limit = WD.UI_CONFIG.leaderboardSize) {
      return this.getRanking().list.slice(0, limit).map((p, i) => ({ ...p, rank: i + 1 }));
    }

    /** @returns {number|null} 1-based rank, or null if the player has not finished a game */
    getRank(username) {
      return this.getRanking().rankByUsername.get(username) || null;
    }

    getRankedCount() {
      return this.getRanking().list.length;
    }

    /** Champion = #1 with a positive score. */
    getChampion() {
      const first = this.getRanking().list[0];
      return first && first.bestScore > 0 ? { ...first, rank: 1 } : null;
    }

    /**
     * Case-insensitive search over ALL local players ("@alex", "alex", "ALEX").
     * @returns {{ query: string, exact: object|null, matches: object[] }}
     */
    searchPlayers(rawQuery, limit = WD.UI_CONFIG.searchMaxResults) {
      const query = WD.username.normalizeQuery(rawQuery);
      if (!query) return { query, exact: null, matches: [] };

      const players = this.storage.state.players;
      const withRank = (p) => ({ ...p, rank: this.getRank(p.username) });
      const exactPlayer = players['@' + query];
      const matches = [];

      Object.keys(players).forEach((username) => {
        if (username === '@' + query) return;
        const index = username.indexOf(query);
        if (index > 0) matches.push({ player: players[username], prefix: index === 1 });
      });

      matches.sort((a, b) => {
        if (a.prefix !== b.prefix) return a.prefix ? -1 : 1;
        const ra = this.getRank(a.player.username) || Infinity;
        const rb = this.getRank(b.player.username) || Infinity;
        return ra - rb || (a.player.username < b.player.username ? -1 : 1);
      });

      return {
        query,
        exact: exactPlayer ? withRank(exactPlayer) : null,
        matches: matches.slice(0, limit).map((m) => withRank(m.player)),
      };
    }
  }

  WD.storage.LeaderboardStorage = LeaderboardStorage;
})();
