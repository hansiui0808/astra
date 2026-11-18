/* ASTRA — wordmark
 * A pure typographic mark: five serif capitals that rise out of a mask one by one,
 * followed by a small four-point star that turns slowly like a registration mark.
 * Fonts come from CSS (--serif), so the mark follows the page typography.
 */
(function () {
  'use strict';
  const STAR = 'M12 0C12.9 7.6 16.4 11.1 24 12C16.4 12.9 12.9 16.4 12 24C11.1 16.4 7.6 12.9 0 12C7.6 11.1 11.1 7.6 12 0Z';
  function build(o) {
    o = o || {};
    const word = (o.word || 'ASTRA').split('');
    const letters = word.map((c, i) => `<span class="wm-c" style="--i:${i}"><b>${c}</b></span>`).join('');
    const star = o.star === false ? '' : `<svg class="wm-star" viewBox="0 0 24 24" aria-hidden="true"><path d="${STAR}"/></svg>`;
    return `<span class="wm ${o.cls || ''}" role="img" aria-label="${o.label || 'Astra'}">${letters}${star}</span>`;
  }
  window.astraLogo = build;
})();
