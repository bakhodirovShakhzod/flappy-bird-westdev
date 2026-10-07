/**
 * Game Over / Final Result panel.
 */
(function () {
  'use strict';

  const WD = window.WD;
  const CFG = WD.GAME_CONFIG;
  const { h, clear } = WD.dom;
  const { hearts, stat } = WD.ui.widgets;
  const COUNT_UP_MS = 700;
  const BADGE_STAGGER_MS = 160;

  class GameOver {
    constructor(overlay, panel, sound) {
      this.overlay = overlay;
      this.panel = panel;
      this.sound = sound;
      this.unlockTimer = null;
      this.countFrame = 0;
      this.primaryAction = null;
      this.locked = true;
      this.onKeyDown = this.onKeyDown.bind(this);
    }

    get isOpen() {
      return !this.overlay.hidden;
    }

    /**
     * @param {object} result  see App.buildRunResult()
     * @param {{ playAgain():void, menu():void, viewLeaderboard():void }} actions
     */
    show(result, actions) {
      clear(this.panel);
      const isFinal = result.attemptsLeft === 0;

      const scoreValue = h('span', { class: 'stat__value', text: '0' });
      const bestValue = h('span', { class: 'stat__value', text: String(result.previousBest) });

      this.panel.append(
        h('h2', { class: `gameover__title t-outline ${isFinal ? 'gameover__title--final' : ''}`, text: isFinal ? 'FINAL RESULT' : 'GAME OVER' }),
        h('p', { class: 'gameover__player', text: result.username }),
        h('div', { class: 'gameover__scores' }, [
          stat(isFinal ? 'LAST SCORE' : 'SCORE', scoreValue),
          stat(isFinal ? 'BEST SCORE' : 'BEST', bestValue),
        ]),
      );

      const badges = h('div', { class: 'gameover__badges' });
      this.panel.appendChild(badges);
      this.buildBadges(result).forEach((badge, i) => {
        badge.style.animationDelay = `${COUNT_UP_MS + i * BADGE_STAGGER_MS}ms`;
        badges.appendChild(badge);
      });

      if (result.champion && !result.isNewChampion) {
        this.panel.appendChild(h('p', { class: 'gameover__champ' }, [
          'CURRENT CHAMPION  ',
          h('strong', { text: `${result.champion.username} — ${result.champion.bestScore}` }),
        ]));
      }

      const buttons = [];
      if (isFinal) {
        this.panel.appendChild(h('p', { class: 'gameover__noattempts', text: 'NO ATTEMPTS LEFT' }));
        buttons.push(this.button('btn--blue btn--big', [WD.sprites.icon('trophy', 3), ' VIEW LEADERBOARD'], actions.viewLeaderboard));
      } else {
        this.panel.appendChild(h('div', { class: 'gameover__attempts' }, [
          h('span', { text: 'ATTEMPTS LEFT' }), hearts(result.attemptsLeft, 3),
        ]));
        buttons.push(
          this.button('btn--primary btn--big', ['▶ PLAY AGAIN'], actions.playAgain),
          this.button('btn--ghost btn--big', ['MAIN MENU'], actions.menu),
        );
      }
      this.primaryAction = buttons[0].onActivate;
      const lockNote = h('p', { class: 'gameover__lock', text: 'GET READY…' });
      this.panel.append(h('div', { class: 'gameover__actions' }, buttons), lockNote);

      // Anti-mashing lock: buttons ignore input for a moment.
      this.locked = true;
      buttons.forEach((b) => { b.disabled = true; });
      clearTimeout(this.unlockTimer);
      this.unlockTimer = setTimeout(() => {
        this.locked = false;
        buttons.forEach((b) => { b.disabled = false; });
        lockNote.textContent = isFinal ? '' : 'PRESS ENTER TO PLAY AGAIN';
      }, CFG.gameOverInputLock);

      this.overlay.hidden = false;
      WD.dom.replayAnimation(this.panel, 'gameover__panel--shake');
      window.addEventListener('keydown', this.onKeyDown);

      this.countUp(scoreValue, result.score, () => {
        bestValue.textContent = String(result.bestScore);
        if (result.isNewBest) WD.dom.replayAnimation(bestValue, 'champion__score--bump');
      });
    }

    buildBadges(result) {
      const badges = [];
      if (result.isNewBest && result.score > 0) {
        badges.push(h('span', { class: 'badge badge--record' }, [WD.sprites.icon('star', 2), ' NEW HIGH SCORE ', WD.sprites.icon('star', 2)]));
      }
      if (result.isNewChampion) {
        badges.push(h('span', { class: 'badge badge--champion' }, [WD.sprites.icon('crown', 3), ' NEW CHAMPION!']));
      } else if (result.madeTop10) {
        badges.push(h('span', { class: 'badge badge--top10' }, [WD.sprites.icon('trophy', 2), ' YOU MADE THE TOP 10!']));
      }
      if (result.rank) {
        const label = result.attemptsLeft === 0 ? 'GLOBAL RANK' : 'YOUR RANK';
        badges.push(h('span', { class: 'badge badge--rank', text: `${label} #${result.rank} OF ${result.totalRanked}` }));
      }
      return badges;
    }

    button(variant, content, handler) {
      const onActivate = () => {
        if (this.locked) return;
        this.sound.play('button');
        this.hide();
        handler();
      };
      const btn = h('button', { class: `btn ${variant}`, type: 'button', onClick: onActivate }, content);
      btn.onActivate = onActivate;
      return btn;
    }

    countUp(el, target, done) {
      cancelAnimationFrame(this.countFrame);
      const start = performance.now();
      const tick = (now) => {
        const t = Math.min(1, (now - start) / COUNT_UP_MS);
        el.textContent = String(Math.round(target * t));
        if (t < 1) this.countFrame = requestAnimationFrame(tick);
        else done();
      };
      if (target === 0) {
        el.textContent = '0';
        done();
      } else {
        this.countFrame = requestAnimationFrame(tick);
      }
    }

    onKeyDown(event) {
      if (event.key !== 'Enter' || this.locked || !this.primaryAction) return;
      event.preventDefault();
      this.primaryAction();
    }

    hide() {
      clearTimeout(this.unlockTimer);
      cancelAnimationFrame(this.countFrame);
      window.removeEventListener('keydown', this.onKeyDown);
      this.overlay.hidden = true;
      this.primaryAction = null;
    }
  }

  WD.ui.GameOver = GameOver;
})();
