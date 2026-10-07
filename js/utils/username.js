/**
 * Telegram username normalisation and validation.
 * "  @Shakhzod " -> "@shakhzod"
 */
(function () {
  'use strict';

  const WD = window.WD;
  const RULES = WD.USERNAME_RULES;

  const ERRORS = Object.freeze({
    empty: 'ENTER YOUR TELEGRAM USERNAME',
    spaces: 'NO SPACES ALLOWED',
    chars: 'ONLY a-z, 0-9 AND _',
    start: 'MUST START WITH A LETTER',
    short: `MIN ${RULES.minLength} CHARACTERS`,
    long: `MAX ${RULES.maxLength} CHARACTERS`,
  });

  /** Strips whitespace and leading "@", lowercases. Does not validate. */
  function toHandle(input) {
    return String(input == null ? '' : input).trim().replace(/^@+/, '').toLowerCase();
  }

  /**
   * @param {string} input raw user input
   * @returns {{ ok: true, username: string } | { ok: false, error: string }}
   */
  function normalizeUsername(input) {
    const handle = toHandle(input);
    if (!handle) return { ok: false, error: ERRORS.empty };
    if (/\s/.test(handle)) return { ok: false, error: ERRORS.spaces };
    if (!/^[a-z0-9_]+$/.test(handle)) return { ok: false, error: ERRORS.chars };
    if (!RULES.pattern.test(handle)) return { ok: false, error: ERRORS.start };
    if (handle.length < RULES.minLength) return { ok: false, error: ERRORS.short };
    if (handle.length > RULES.maxLength) return { ok: false, error: ERRORS.long };
    return { ok: true, username: '@' + handle };
  }

  /** Normalises a search query: lowercase, no "@", only allowed characters. */
  function normalizeQuery(input) {
    return toHandle(input).replace(/[^a-z0-9_]/g, '').slice(0, RULES.maxLength);
  }

  function isValidUsername(value) {
    const result = normalizeUsername(value);
    return result.ok && result.username === value;
  }

  WD.username = Object.freeze({ normalizeUsername, normalizeQuery, isValidUsername, ERRORS });
})();
