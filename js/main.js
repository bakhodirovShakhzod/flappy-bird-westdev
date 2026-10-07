/**
 * Entry point.
 */
(function () {
  'use strict';

  const WD = window.WD;

  function fatal(err) {
    console.error('[main] boot failed', err);
    try {
      new WD.ui.ErrorScreen(document.getElementById('fatal'), document.getElementById('fatal-panel'))
        .showCrash('The game could not start. Try reloading the page.');
    } catch (inner) {
      document.body.textContent = 'WEST DEV FLAPPY BIRD could not start. Please reload the page.';
    }
  }

  function start() {
    try {
      const app = new WD.App();
      WD.app = app; // handy for debugging in the console
      app.boot().catch(fatal);
    } catch (err) {
      fatal(err);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
