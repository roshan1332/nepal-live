/*
 * Shell for the server-rendered landing pages (/gold-price, /nepse,
 * /exchange-rate, /fuel-price, /nepali-date, /weather/<city>). The content is
 * already in the HTML; this only adds the live ticker and the footer.
 */
(function () {
  'use strict';
  var el = document.getElementById('ssr-sources'), src = [];
  try { src = JSON.parse((el && el.getAttribute('data-sources')) || '[]'); } catch (e) { /* no sources listed */ }
  NL.ticker.autoload();
  NL.renderFooter(src);
  NL.feed('page', true);
})();
