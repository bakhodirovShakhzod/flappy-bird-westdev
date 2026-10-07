/**
 * Pure ranking helpers.
 * Order: bestScore DESC, then who reached that score first (bestScoreAt ASC).
 */
(function () {
  'use strict';

  const WD = window.WD;

  /** Only players who finished at least one game take part in the ranking. */
  function isRanked(player) {
    return player.attemptsUsed > 0 && player.bestScoreAt != null;
  }

  function compareRanked(a, b) {
    if (b.bestScore !== a.bestScore) return b.bestScore - a.bestScore;
    if (a.bestScoreAt !== b.bestScoreAt) return a.bestScoreAt - b.bestScoreAt;
    if (a.createdAt !== b.createdAt) return a.createdAt - b.createdAt;
    return a.username < b.username ? -1 : a.username > b.username ? 1 : 0;
  }

  /**
   * @param {Object<string, object>} playersMap
   * @returns {{ list: object[], rankByUsername: Map<string, number> }}
   */
  function buildRanking(playersMap) {
    const list = Object.values(playersMap).filter(isRanked).sort(compareRanked);
    const rankByUsername = new Map();
    list.forEach((p, i) => rankByUsername.set(p.username, i + 1));
    return { list, rankByUsername };
  }

  WD.ranking = Object.freeze({ isRanked, compareRanked, buildRanking });
})();
