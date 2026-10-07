/**
 * Player panel on the start screen: Telegram login  <->  player profile.
 */
(function () {
  'use strict';

  const WD = window.WD;
  const { h, clear } = WD.dom;
  const { hearts, stat, rankValue } = WD.ui.widgets;
  const { PlayerStorage } = WD.storage;

  class StartScreen {
    /**
     * @param {HTMLElement} root
     * @param {object} deps
     * @param {WD.storage.PlayerStorage} deps.players
     * @param {WD.storage.LeaderboardStorage} deps.leaderboard
     * @param {object} deps.actions { login(username), start(), logout(), viewLeaderboard() }
     */
    constructor(root, { players, leaderboard, actions, sound }) {
      this.root = root;
      this.players = players;
      this.leaderboard = leaderboard;
      this.actions = actions;
      this.sound = sound;
      this.username = null;
      this.input = null;
    }

    render(username) {
      this.username = username;
      clear(this.root);
      if (username && this.players.exists(username)) this.renderProfile(this.players.getPlayer(username));
      else this.renderLogin();
    }

    focusInput() {
      if (this.input && window.matchMedia('(pointer: fine)').matches) this.input.focus({ preventScroll: true });
    }

    /* ------------------------------ login ------------------------------ */

    renderLogin() {
      const hint = h('p', { class: 'form-hint', text: 'TELEGRAM USERNAME, e.g. @westdev' });
      const field = h('label', { class: 'field' });
      const input = h('input', {
        class: 'field__input',
        type: 'text',
        name: 'telegram',
        placeholder: 'username',
        autocomplete: 'off',
        autocapitalize: 'none',
        autocorrect: 'off',
        spellcheck: 'false',
        enterkeyhint: 'go',
        maxlength: String(WD.USERNAME_RULES.maxLength + 1),
        'aria-label': 'Telegram username',
      });
      field.append(h('span', { class: 'field__prefix', text: '@', 'aria-hidden': 'true' }), input);

      const setHint = (text, isError) => {
        hint.textContent = text;
        hint.classList.toggle('form-hint--error', Boolean(isError));
        field.classList.toggle('field--invalid', Boolean(isError));
        if (isError) WD.dom.replayAnimation(hint, 'form-hint--error');
      };

      input.addEventListener('input', () => {
        const raw = input.value;
        if (!raw.trim()) return setHint('TELEGRAM USERNAME, e.g. @westdev', false);
        const result = WD.username.normalizeUsername(raw);
        if (!result.ok) {
          // Only complain live about characters that can never be valid.
          const charProblem = result.error === WD.username.ERRORS.chars || result.error === WD.username.ERRORS.spaces;
          return setHint(charProblem ? result.error : 'KEEP TYPING…', charProblem);
        }
        const existing = this.players.getPlayer(result.username);
        if (existing) {
          const left = PlayerStorage.attemptsLeft(existing);
          setHint(`WELCOME BACK ${result.username} — ${left} ${left === 1 ? 'ATTEMPT' : 'ATTEMPTS'} LEFT`, false);
        } else {
          setHint(`YOU WILL PLAY AS ${result.username}`, false);
        }
      });

      const form = h('form', { novalidate: true }, [
        field,
        hint,
        h('button', { class: 'btn btn--primary btn--big btn--block', type: 'submit' }, ['CONTINUE ', '▶']),
      ]);
      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const result = WD.username.normalizeUsername(input.value);
        if (!result.ok) {
          this.sound.play('error');
          setHint(result.error, true);
          input.focus();
          return;
        }
        this.sound.play('button');
        this.actions.login(result.username);
      });

      this.root.append(
        h('h2', { class: 'player-panel__label' }, [WD.sprites.icon('user', 3), ' ENTER YOUR TELEGRAM']),
        form,
        h('div', { class: 'profile__stats' }, [
          stat('ATTEMPTS', hearts(WD.GAME_CONFIG.maxAttempts, 4), 'stat--wide'),
        ]),
        h('p', { class: 'form-hint', text: `EVERY PLAYER GETS ${WD.GAME_CONFIG.maxAttempts} ATTEMPTS. BEST SCORE COUNTS!` }),
      );
      this.input = input;
    }

    /* ----------------------------- profile ----------------------------- */

    renderProfile(player) {
      this.input = null;
      const left = PlayerStorage.attemptsLeft(player);
      const rank = this.leaderboard.getRank(player.username);
      const canPlay = left > 0;

      const startBtn = h('button', {
        class: 'btn btn--primary btn--big btn--block btn--start',
        type: 'button',
        disabled: !canPlay,
        onClick: () => this.actions.start(),
      }, ['▶ START GAME']);

      const children = [
        h('p', { class: 'stat__label', text: 'PLAYER' }),
        h('h2', { class: 'profile__name' }, [player.username]),
        h('div', { class: 'profile__stats' }, [
          stat('BEST SCORE', player.bestScore),
          stat('RANK', rankValue(rank)),
          stat('ATTEMPTS', hearts(left, 4), 'stat--wide'),
        ]),
      ];

      if (canPlay) {
        children.push(h('div', { class: 'profile__actions' }, [startBtn]));
      } else {
        children.push(
          h('div', { class: 'profile__out' }, [
            h('p', { text: 'NO ATTEMPTS LEFT' }),
            h('p', { text: `You've used all ${WD.GAME_CONFIG.maxAttempts} attempts.` }),
          ]),
          h('div', { class: 'profile__actions' }, [
            h('button', { class: 'btn btn--blue btn--block', type: 'button', onClick: () => this.actions.viewLeaderboard() }, [
              WD.sprites.icon('trophy', 2), ' VIEW LEADERBOARD',
            ]),
          ]),
        );
      }

      children.push(
        h('button', {
          class: `btn ${canPlay ? 'btn--ghost btn--small' : 'btn--primary'} btn--block profile__switch`,
          type: 'button',
          onClick: () => {
            this.sound.play('button');
            this.actions.logout();
          },
        }, [canPlay ? 'NOT YOU? SWITCH PLAYER' : '▶ NEXT PLAYER']),
      );

      this.root.append(...children);
    }
  }

  WD.ui.StartScreen = StartScreen;
})();
