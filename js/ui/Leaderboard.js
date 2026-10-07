/**
 * Champion banner + TOP 10 with entrance, bounce and FLIP position-change animations.
 */
(function () {
  'use strict';

  const WD = window.WD;
  const { h, clear, replayAnimation } = WD.dom;
  const ROW_STAGGER_MS = 70;
  const MOVE_DURATION_MS = 520;

  class Leaderboard {
    /**
     * @param {HTMLElement} boardRoot
     * @param {HTMLElement} championRoot
     * @param {WD.storage.LeaderboardStorage} leaderboard
     */
    constructor(boardRoot, championRoot, leaderboard) {
      this.root = boardRoot;
      this.championRoot = championRoot;
      this.leaderboard = leaderboard;
      this.rows = new Map(); // username -> { el, score, rank }
      this.lastChampion = undefined;

      this.root.append(
        h('h2', { class: 'panel__title leaderboard__title' }, [WD.sprites.icon('trophy', 3), ' TOP 10 ', WD.sprites.icon('trophy', 3)]),
      );
      this.list = h('ol', { class: 'leaderboard__list' });
      this.footer = h('p', { class: 'leaderboard__footer' });
      this.root.append(this.list, this.footer);
    }

    /**
     * @param {{ me?: string|null, flash?: string|null }} options
     */
    render({ me = null, flash = null } = {}) {
      this.renderChampion();
      const top = this.leaderboard.getTopPlayers();

      if (!top.length) {
        this.rows.clear();
        clear(this.list);
        this.list.append(
          h('li', { class: 'leaderboard__empty' }, [
            h('p', { text: 'NO PLAYERS YET' }),
            h('p', { text: 'BE THE FIRST CHAMPION!' }),
          ]),
        );
        this.footer.textContent = '';
        return;
      }

      // FLIP — First: remember where existing rows are (only meaningful while visible).
      const visible = this.root.offsetParent !== null;
      const before = new Map();
      if (visible) this.rows.forEach((row, username) => before.set(username, row.el.getBoundingClientRect().top));

      const isInitial = this.rows.size === 0;
      const nextRows = new Map();
      clear(this.list);

      top.forEach((player, index) => {
        const previous = this.rows.get(player.username);
        const el = previous ? previous.el : h('li', { class: 'lb-row' });
        this.fillRow(el, player, me);
        this.list.appendChild(el);

        if (!previous) {
          el.style.animationDelay = isInitial ? `${index * ROW_STAGGER_MS}ms` : '0ms';
          replayAnimation(el, 'lb-row--enter');
        } else if (previous.score !== player.bestScore) {
          replayAnimation(el.querySelector('.lb-row__score'), 'lb-row__score--bump');
        }
        if (flash && player.username === flash) replayAnimation(el, 'lb-row--flash');
        nextRows.set(player.username, { el, score: player.bestScore, rank: player.rank });
      });
      this.rows = nextRows;

      // FLIP — Last/Invert/Play: animate rows that changed position.
      nextRows.forEach((row, username) => {
        if (!before.has(username)) return;
        const delta = before.get(username) - row.el.getBoundingClientRect().top;
        if (Math.abs(delta) < 1 || !row.el.animate) return;
        row.el.animate(
          [{ transform: `translateY(${delta}px)` }, { transform: 'translateY(0)' }],
          { duration: MOVE_DURATION_MS, easing: 'steps(8, end)' },
        );
      });

      const total = this.leaderboard.getRankedCount();
      const meRank = me ? this.leaderboard.getRank(me) : null;
      if (meRank && meRank > top.length) this.footer.textContent = `${me} IS #${meRank} OF ${total}`;
      else this.footer.textContent = total > top.length ? `${total} PLAYERS COMPETING` : '';
    }

    fillRow(el, player, me) {
      el.className = `lb-row${player.rank <= 3 ? ` lb-row--${player.rank}` : ''}${player.username === me ? ' lb-row--me' : ''}`;
      clear(el);
      const medal = WD.ui.widgets.medalIcon(player.rank, 3);
      el.append(
        h('span', { class: 'lb-row__rank' }, [medal || String(player.rank)]),
        h('span', { class: 'lb-row__name', text: player.username }),
        h('span', { class: 'lb-row__score', text: String(player.bestScore) }),
      );
    }

    renderChampion() {
      const champion = this.leaderboard.getChampion();
      const root = this.championRoot;
      clear(root);

      if (!champion) {
        root.className = 'champion champion--empty';
        root.append(
          WD.sprites.icon('crown', 5, 'champion__crown'),
          h('div', null, [
            h('p', { class: 'champion__label', text: 'CURRENT CHAMPION' }),
            h('p', { class: 'champion__name', text: 'YOUR NAME HERE?' }),
          ]),
        );
        this.lastChampion = null;
        return;
      }

      const changed = this.lastChampion !== undefined
        && (!this.lastChampion || this.lastChampion.username !== champion.username);
      const improved = this.lastChampion && this.lastChampion.username === champion.username
        && this.lastChampion.bestScore !== champion.bestScore;

      root.className = 'champion';
      const score = h('p', { class: 'champion__score', text: String(champion.bestScore) });
      root.append(
        WD.sprites.icon('crown', 5, 'champion__crown'),
        h('div', { style: { minWidth: '0' } }, [
          h('p', { class: 'champion__label', text: changed ? 'NEW CHAMPION!' : 'CURRENT CHAMPION' }),
          h('p', { class: 'champion__name', text: champion.username }),
        ]),
        score,
      );
      if (changed) replayAnimation(root, 'champion--new');
      if (changed || improved) replayAnimation(score, 'champion__score--bump');
      this.lastChampion = { username: champion.username, bestScore: champion.bestScore };
    }

    scrollIntoView() {
      this.root.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }

  WD.ui.Leaderboard = Leaderboard;
})();
