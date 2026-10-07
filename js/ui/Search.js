/**
 * Player search over ALL local players (debounced, case-insensitive, "@alex" or "alex").
 */
(function () {
  'use strict';

  const WD = window.WD;
  const { h, clear, debounce } = WD.dom;

  class Search {
    /**
     * @param {HTMLElement} root
     * @param {WD.storage.LeaderboardStorage} leaderboard
     */
    constructor(root, leaderboard) {
      this.root = root;
      this.leaderboard = leaderboard;
      this.build();
    }

    build() {
      this.input = h('input', {
        class: 'field__input',
        type: 'search',
        placeholder: '@username',
        autocomplete: 'off',
        autocapitalize: 'none',
        spellcheck: 'false',
        maxlength: String(WD.USERNAME_RULES.maxLength + 1),
        'aria-label': 'Search player',
      });
      const button = h('button', { class: 'field__btn', type: 'submit', 'aria-label': 'Search' }, [
        WD.sprites.icon('search', 3, 'search__icon'),
      ]);
      button.querySelector('img').style.filter = 'brightness(0)';

      const form = h('form', { role: 'search', novalidate: true }, [
        h('div', { class: 'field' }, [h('span', { class: 'field__prefix', text: '@', 'aria-hidden': 'true' }), this.input, button]),
      ]);
      this.result = h('div', { class: 'search__result', 'aria-live': 'polite' });

      this.root.append(
        h('h2', { class: 'panel__title search__title' }, [WD.sprites.icon('search', 3), ' SEARCH PLAYER']),
        form,
        this.result,
      );

      const debounced = debounce(() => this.run(false), WD.UI_CONFIG.searchDebounceMs);
      this.input.addEventListener('input', debounced);
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        debounced.cancel();
        this.run(true);
      });
      this.showHint('FIND ANY PLAYER ON THIS LAPTOP');
    }

    /** Re-runs the current query (after scores change). */
    refresh() {
      if (this.input.value.trim()) this.run(false);
    }

    run(explicit) {
      const raw = this.input.value;
      if (!raw.trim()) {
        this.showHint(explicit ? 'ENTER A USERNAME' : 'FIND ANY PLAYER ON THIS LAPTOP');
        return;
      }
      const { query, exact, matches } = this.leaderboard.searchPlayers(raw);
      clear(this.result);
      if (!query) {
        this.showHint('ENTER A USERNAME');
        return;
      }
      if (exact) this.result.appendChild(this.card(exact));
      if (matches.length) {
        const list = h('div', { class: 'search-matches' }, [
          h('p', { class: 'search-matches__label', text: exact ? 'SIMILAR PLAYERS' : 'DID YOU MEAN' }),
        ]);
        matches.forEach((player) => {
          list.appendChild(h('button', {
            class: 'btn btn--ghost btn--small',
            type: 'button',
            text: player.username,
            onClick: () => {
              this.input.value = player.username;
              this.run(true);
            },
          }));
        });
        this.result.appendChild(list);
      }
      if (!exact && !matches.length) {
        this.result.appendChild(h('p', { class: 'search__notfound', text: 'PLAYER NOT FOUND' }));
      }
    }

    card(player) {
      return h('div', { class: 'search-card' }, [
        h('p', { class: 'search-card__found', text: 'PLAYER FOUND' }),
        h('p', { class: 'search-card__name', text: player.username }),
        h('p', { class: 'search-card__cell' }, [h('span', { text: 'BEST' }), h('strong', { text: String(player.bestScore) })]),
        h('p', { class: 'search-card__cell' }, [h('span', { text: 'RANK' }), h('strong', { text: WD.dom.formatRank(player.rank) })]),
      ]);
    }

    showHint(text) {
      clear(this.result);
      this.result.appendChild(h('p', { class: 'search__hint', text }));
    }
  }

  WD.ui.Search = Search;
})();
