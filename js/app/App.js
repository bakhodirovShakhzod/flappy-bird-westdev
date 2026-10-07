/**
 * Application controller: wires storage, game and UI together and owns the player flow.
 *
 * INTRO -> MENU (leaderboard, login/profile) -> START (attempt consumed, fullscreen)
 *       -> PLAY -> GAME OVER (save, best, rank, champion) -> PLAY AGAIN / MENU
 */
(function () {
  'use strict';

  const WD = window.WD;
  const { $ } = WD.dom;
  const { PlayerStorage } = WD.storage;
  const FONT_TIMEOUT_MS = 1500;

  class App {
    constructor() {
      const S = WD.storage;
      this.storage = new S.GameStorage(new S.SafeStore(() => window.localStorage), WD.STORAGE_KEYS);
      this.players = new S.PlayerStorage(this.storage);
      this.leaderboard = new S.LeaderboardStorage(this.storage);
      this.settings = new S.SettingsStorage(this.storage, new S.SafeStore(() => window.sessionStorage));
      this.backup = new S.BackupService(this.storage);

      this.activeUsername = null; // player of the current run
      this.menuRefreshQueued = false;
      this.fpsEnabled = /[?&]fps\b/.test(window.location.search);
    }

    /* ================================================================== */
    /* Boot                                                                */
    /* ================================================================== */

    async boot() {
      const status = this.storage.load();
      await this.waitForFont();

      this.sound = new WD.SoundManager(this.settings.isSoundEnabled());
      this.createUi();
      this.createGame();
      this.bindGlobalEvents();
      this.game.start();

      if (status === 'corrupted') {
        this.showCorrupted();
        return;
      }
      if (!this.storage.persistent) this.toast.error('BROWSER STORAGE IS BLOCKED — SCORES WILL NOT BE SAVED');
      else if (status === 'repaired') this.toast.show('SOME DAMAGED RECORDS WERE REPAIRED');

      await this.enterMenuFlow();
    }

    async waitForFont() {
      if (!document.fonts || !document.fonts.load) return;
      try {
        await Promise.race([
          document.fonts.load('16px "West Pixel"'),
          WD.dom.wait(FONT_TIMEOUT_MS),
        ]);
      } catch (err) {
        console.warn('[app] pixel font not loaded, using fallback', err);
      }
    }

    createUi() {
      const ui = WD.ui;
      this.toast = new ui.Toast($('#toast'));
      this.dialog = new ui.Dialog($('#dialog'), $('#dialog-panel'), this.sound);
      this.errorScreen = new ui.ErrorScreen($('#fatal'), $('#fatal-panel'));
      this.intro = new ui.Intro($('#intro'), this.sound);
      this.menuEl = $('#menu');
      this.hud = new ui.Hud($('#hud'));
      this.gameOver = new ui.GameOver($('#gameover'), $('#gameover-panel'), this.sound);
      this.celebration = new ui.Celebration($('#celebration'));

      this.startScreen = new ui.StartScreen($('#player-panel'), {
        players: this.players,
        leaderboard: this.leaderboard,
        sound: this.sound,
        actions: {
          login: (username) => this.login(username),
          logout: () => this.logout(),
          start: () => this.startGame(),
          viewLeaderboard: () => this.boardView.scrollIntoView(),
        },
      });
      this.boardView = new ui.Leaderboard($('#leaderboard'), $('#champion'), this.leaderboard);
      this.search = new ui.Search($('#search'), this.leaderboard);

      this.admin = new ui.AdminPanel({
        overlay: $('#admin'),
        panel: $('#admin-panel'),
        fileInput: $('#import-file'),
        storage: this.storage,
        players: this.players,
        backup: this.backup,
        dialog: this.dialog,
        toast: this.toast,
        sound: this.sound,
        onDataChanged: () => this.onDataReplaced(),
        onToggleFps: () => this.toggleFps(),
        isFpsOn: () => this.fpsEnabled,
      });
      this.admin.bindTriggers($('#brand-logo'), () => !this.menuEl.hidden || !$('#fatal').hidden);

      WD.ui.widgets.mountBird($('#brand-bird'), 5);
      this.setupSystemButtons();
    }

    createGame() {
      const MODE = WD.game.Game.MODE;
      this.game = new WD.game.Game($('#game-canvas'), {
        sound: this.sound,
        events: {
          onModeChange: (mode) => this.hud.setReady(mode === MODE.READY),
          onScore: (score) => this.hud.setScore(score),
          onNewRecord: () => this.hud.showRecord(),
          onRunEnd: (score) => this.onRunEnd(score),
        },
      });
      this.hud.showFps(this.fpsEnabled, () => this.game.fps);
    }

    bindGlobalEvents() {
      // Refresh / close tab mid-run: the consumed attempt stays consumed, the score is saved.
      const saveUnfinished = () => this.saveUnfinishedRun();
      window.addEventListener('pagehide', saveUnfinished);
      window.addEventListener('beforeunload', saveUnfinished);

      // Another tab changed the data.
      window.addEventListener('storage', (event) => {
        if (event.key !== WD.STORAGE_KEYS.data) return;
        this.storage.reload();
        this.queueMenuRefresh();
      });

      this.storage.subscribe(() => this.queueMenuRefresh());

      // Enter on the profile = START GAME
      window.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' || this.menuEl.hidden || this.dialog.isOpen || !$('#admin').hidden) return;
        const tag = event.target && event.target.tagName;
        if (tag === 'INPUT' || tag === 'BUTTON') return;
        const username = this.settings.getCurrentUsername();
        if (username && this.players.canPlay(username)) {
          event.preventDefault();
          this.startGame();
        }
      });

      window.addEventListener('error', (event) => this.reportError(event.error || event.message));
      window.addEventListener('unhandledrejection', (event) => this.reportError(event.reason));
    }

    reportError(err) {
      console.error('[app] unexpected error', err);
      if (this.toast) this.toast.error('UNEXPECTED ERROR — SCORES ARE SAFE');
    }

    setupSystemButtons() {
      const soundBtn = $('#sound-toggle');
      const fullBtn = $('#fullscreen-toggle');

      const renderSound = () => {
        const on = this.sound.enabled;
        WD.dom.clear(soundBtn).append(WD.sprites.icon(on ? 'soundOn' : 'soundOff', 2), on ? ' SOUND ON' : ' SOUND OFF');
        soundBtn.setAttribute('aria-pressed', String(on));
      };
      soundBtn.addEventListener('click', () => {
        const enabled = !this.sound.enabled;
        this.sound.setEnabled(enabled);
        this.safeWrite(() => this.settings.setSoundEnabled(enabled));
        this.sound.play('button');
        renderSound();
      });

      const renderFull = () => {
        const active = WD.ui.fullscreen.isActive();
        WD.dom.clear(fullBtn).append(WD.sprites.icon('fullscreen', 2), active ? ' EXIT FULLSCREEN' : ' FULLSCREEN');
      };
      fullBtn.hidden = !WD.ui.fullscreen.isSupported();
      fullBtn.addEventListener('click', () => {
        this.sound.play('button');
        WD.ui.fullscreen.toggle();
      });
      WD.ui.fullscreen.onChange(renderFull);

      renderSound();
      renderFull();
    }

    /* ================================================================== */
    /* Menu                                                                */
    /* ================================================================== */

    async enterMenuFlow() {
      if (!this.settings.wasIntroSeen()) {
        this.settings.markIntroSeen();
        await this.intro.play();
      }
      this.showMenu();
    }

    showMenu({ flash = null, scrollToBoard = false } = {}) {
      this.gameOver.hide();
      this.hud.hide();
      this.game.toAttract();
      this.activeUsername = null;
      this.menuEl.hidden = false;
      const username = this.settings.getCurrentUsername();
      this.startScreen.render(username);
      this.boardView.render({ me: username, flash });
      this.search.refresh();
      if (scrollToBoard) this.boardView.scrollIntoView();
      else this.startScreen.focusInput();
    }

    /** Coalesces data-change refreshes into one per frame (leaderboard + search only). */
    queueMenuRefresh() {
      if (this.menuRefreshQueued || !this.menuEl || this.menuEl.hidden) return;
      this.menuRefreshQueued = true;
      requestAnimationFrame(() => {
        this.menuRefreshQueued = false;
        if (this.menuEl.hidden) return;
        this.boardView.render({ me: this.settings.getCurrentUsername() });
        this.search.refresh();
      });
    }

    login(username) {
      const ok = this.safeWrite(() => {
        this.players.getOrCreatePlayer(username);
        this.settings.setCurrentUsername(username);
      });
      if (!ok) return;
      this.startScreen.render(username);
      this.boardView.render({ me: username, flash: username });
    }

    logout() {
      this.safeWrite(() => this.settings.setCurrentUsername(null));
      this.startScreen.render(null);
      this.boardView.render({ me: null });
      this.startScreen.focusInput();
    }

    /* ================================================================== */
    /* Game flow                                                           */
    /* ================================================================== */

    startGame() {
      const username = this.settings.getCurrentUsername();
      if (!username || !this.players.canPlay(username)) {
        this.sound.play('error');
        this.toast.error('NO ATTEMPTS LEFT');
        this.showMenu();
        return;
      }
      this.sound.unlock();

      let attempt = null;
      const saved = this.safeWrite(() => {
        attempt = this.players.useAttempt(username); // consumed BEFORE playing
      });
      if (!saved || !attempt.ok) {
        this.showMenu();
        return;
      }

      WD.ui.fullscreen.enter(); // within the click gesture; failure is fine
      if (document.activeElement && document.activeElement.blur) document.activeElement.blur();

      this.activeUsername = username;
      this.menuEl.hidden = true;
      this.gameOver.hide();
      this.hud.show({ username, attemptsLeft: attempt.attemptsLeft, bestScore: attempt.player.bestScore });
      this.game.startRun({ bestScore: attempt.player.bestScore });
      this.sound.play('button');
    }

    saveUnfinishedRun() {
      const score = this.game ? this.game.abandonRun() : null;
      if (score == null || !this.activeUsername) return;
      try {
        this.players.updateBestScore(this.activeUsername, score);
      } catch (err) {
        console.error('[app] could not save unfinished run', err);
      }
    }

    async onRunEnd(score) {
      const username = this.activeUsername;
      if (!username) return;

      let result;
      try {
        result = this.recordRun(username, score);
      } catch (err) {
        console.error(err);
        this.toast.error('COULD NOT SAVE SCORE — STORAGE FULL?');
        this.showMenu();
        return;
      }

      this.hud.hide();
      if (result.isNewChampion) {
        this.sound.play('champion');
        this.game.particles.recordStars(this.game.width / 2, this.game.height / 3);
        await this.celebration.show(username);
      } else if (result.isNewBest && result.score > 0) {
        this.sound.play('newRecord');
        this.game.particles.recordStars(this.game.bird.x, this.game.groundY - 20);
      }

      this.gameOver.show(result, {
        playAgain: () => this.startGame(),
        menu: () => this.showMenu({ flash: username }),
        viewLeaderboard: () => this.showMenu({ flash: username, scrollToBoard: true }),
      });
    }

    /** Saves the score and gathers everything the Game Over panel needs. */
    recordRun(username, score) {
      const top = WD.UI_CONFIG.leaderboardSize;
      const rankBefore = this.leaderboard.getRank(username);
      const championBefore = this.leaderboard.getChampion();

      const { player, previousBest, isNewBest } = this.players.updateBestScore(username, score);

      const rank = this.leaderboard.getRank(username);
      const champion = this.leaderboard.getChampion();
      return {
        username,
        score,
        previousBest,
        bestScore: player.bestScore,
        isNewBest,
        rank,
        totalRanked: this.leaderboard.getRankedCount(),
        champion,
        isNewChampion: Boolean(champion) && champion.username === username
          && (!championBefore || championBefore.username !== username),
        madeTop10: Boolean(rank) && rank <= top && (!rankBefore || rankBefore > top),
        attemptsLeft: PlayerStorage.attemptsLeft(player),
      };
    }

    /* ================================================================== */
    /* Data / errors                                                       */
    /* ================================================================== */

    /** Runs a storage write; shows a friendly message instead of crashing. */
    safeWrite(fn) {
      try {
        fn();
        return true;
      } catch (err) {
        console.error('[app] storage write failed', err);
        this.sound.play('error');
        this.toast.error(err instanceof WD.storage.StorageWriteError ? 'CANNOT SAVE — BROWSER STORAGE IS FULL' : 'SOMETHING WENT WRONG');
        return false;
      }
    }

    showCorrupted() {
      this.errorScreen.showCorrupted({
        hasBackup: Boolean(this.storage.getBackupState()),
        restore: () => {
          if (this.storage.restoreBackup()) {
            this.toast.show('BACKUP RESTORED');
            this.leaveCorrupted();
          } else {
            this.toast.error('BACKUP IS ALSO DAMAGED');
          }
        },
        importFile: () => this.admin.requestImport(),
        reset: async () => {
          const ok = await this.dialog.confirm({
            title: 'RESET GAME?',
            message: 'All saved players and scores on this laptop will be deleted.',
            confirmLabel: 'DELETE EVERYTHING',
            danger: true,
          });
          if (!ok) return;
          this.storage.resetAll();
          this.leaveCorrupted();
        },
      });
    }

    leaveCorrupted() {
      this.errorScreen.hide();
      this.enterMenuFlow();
    }

    /** After import / reset / delete from the admin panel. */
    onDataReplaced() {
      if (!$('#fatal').hidden && this.storage.loadError == null) {
        this.leaveCorrupted();
        return;
      }
      if (!this.menuEl.hidden) this.showMenu();
    }

    toggleFps() {
      this.fpsEnabled = !this.fpsEnabled;
      this.hud.showFps(this.fpsEnabled, () => this.game.fps);
    }
  }

  WD.App = App;
})();
