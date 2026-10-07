/**
 * Tiny DOM helpers. User-provided strings are ALWAYS written with textContent.
 */
(function () {
  'use strict';

  const WD = window.WD;

  /**
   * h('div', { class: 'x', dataset: { a: 1 }, onClick: fn }, ['text', childNode])
   */
  function h(tag, attrs, children) {
    const el = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach((key) => {
        const value = attrs[key];
        if (value == null || value === false) return;
        if (key === 'class') el.className = value;
        else if (key === 'text') el.textContent = value;
        else if (key === 'dataset') Object.assign(el.dataset, value);
        else if (key === 'style') Object.assign(el.style, value);
        else if (key.startsWith('on') && typeof value === 'function') el.addEventListener(key.slice(2).toLowerCase(), value);
        else el.setAttribute(key, value === true ? '' : String(value));
      });
    }
    appendChildren(el, children);
    return el;
  }

  function appendChildren(el, children) {
    if (children == null) return;
    (Array.isArray(children) ? children : [children]).forEach((child) => {
      if (child == null || child === false) return;
      el.appendChild(typeof child === 'string' || typeof child === 'number' ? document.createTextNode(String(child)) : child);
    });
  }

  function clear(el) {
    while (el.firstChild) el.removeChild(el.firstChild);
    return el;
  }

  function $(selector, root) {
    const el = (root || document).querySelector(selector);
    if (!el) throw new Error(`Missing element: ${selector}`);
    return el;
  }

  function debounce(fn, wait) {
    let timer = null;
    const debounced = function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), wait);
    };
    debounced.cancel = () => clearTimeout(timer);
    return debounced;
  }

  /** Restarts a CSS animation class on an element. */
  function replayAnimation(el, className) {
    el.classList.remove(className);
    void el.offsetWidth; // force reflow
    el.classList.add(className);
  }

  function formatRank(rank) {
    return rank ? `#${rank}` : '—';
  }

  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  WD.dom = Object.freeze({ h, clear, $, debounce, replayAnimation, formatRank, wait });
})();
