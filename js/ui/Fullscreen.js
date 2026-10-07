/**
 * Fullscreen helpers. Failing to enter fullscreen is never fatal.
 */
(function () {
  'use strict';

  const WD = window.WD;
  const doc = document;
  const root = doc.documentElement;

  const isSupported = () => Boolean(root.requestFullscreen || root.webkitRequestFullscreen);
  const isActive = () => Boolean(doc.fullscreenElement || doc.webkitFullscreenElement);

  async function enter() {
    if (!isSupported() || isActive()) return isActive();
    try {
      if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: 'hide' });
      else root.webkitRequestFullscreen();
    } catch (err) {
      console.info('[fullscreen] request denied — continuing windowed', err && err.message);
    }
    return isActive();
  }

  async function exit() {
    if (!isActive()) return;
    try {
      if (doc.exitFullscreen) await doc.exitFullscreen();
      else doc.webkitExitFullscreen();
    } catch (err) {
      /* ignore */
    }
  }

  function toggle() {
    return isActive() ? exit() : enter();
  }

  function onChange(callback) {
    doc.addEventListener('fullscreenchange', callback);
    doc.addEventListener('webkitfullscreenchange', callback);
  }

  WD.ui.fullscreen = Object.freeze({ isSupported, isActive, enter, exit, toggle, onChange });
})();
