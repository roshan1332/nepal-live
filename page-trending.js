/*
 * Trending in Nepal (/trending). Data: /api/trending — topics counted from real
 * headlines (≥3 headlines from ≥2 publishers). Counts are headlines, never views.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var t = NL.i18n.t, esc = NL.esc;
  var CATS = ['nepal', 'politics', 'business', 'sports', 'technology', 'entertainment', 'world'];

  NL.i18n.add({
    en: {
      kicker: 'Trending now', h1: 'Trending in <em>Nepal</em>',
      sub: 'Topics that appear in the most headlines across Nepali publishers — counted, not guessed.',
      basis: 'Based on {h} headlines from {s} publishers in the last {hrs} hours.',
      hp: '{h} headlines · {s} publishers', none: 'No topic is covered widely enough to call it trending right now.',
      err: 'Trending topics aren’t available right now.', byCat: 'Headlines by category',
      trendMethod: 'Method: a topic is listed when it appears in at least 3 headlines from at least 2 different publishers in the period. Counts are headlines, not views or searches.'
    },
    ne: {
      kicker: 'अहिले चर्चामा', h1: 'नेपालमा <em>चर्चामा</em>',
      sub: 'नेपाली प्रकाशकका सबैभन्दा धेरै शीर्षकमा आएका विषय — गनेर, अनुमान गरेर होइन।',
      basis: 'पछिल्लो {hrs} घण्टामा {s} प्रकाशकका {h} शीर्षकका आधारमा।',
      hp: '{h} शीर्षक · {s} प्रकाशक', none: 'अहिले चर्चामा भन्न पुग्ने गरी कुनै विषय व्यापक रूपमा कभर भएको छैन।',
      err: 'चर्चाका विषय अहिले उपलब्ध छैनन्।', byCat: 'विधाअनुसार शीर्षक',
      trendMethod: 'विधि: कुनै विषय कम्तीमा २ फरक प्रकाशकका कम्तीमा ३ शीर्षकमा आएमा मात्र सूचीमा राखिन्छ। संख्या शीर्षकको हो, हेराइ वा खोजीको होइन।'
    }
  });

  var data = null, cat = 'all';

  function render() {
    if (!data) return;
    var b = data.basis;
    $('trend-basis').textContent = t('basis', { h: b.headlines, s: b.sources, hrs: b.hours });
    var total = CATS.reduce(function (s, k) { return s + (data.byCategory[k] || 0); }, 0) || 1;
    $('trend-cats').innerHTML = '<div class="tcat-bar" role="img" aria-label="' + esc(t('byCat')) + '">'
      + CATS.filter(function (k) { return data.byCategory[k]; }).map(function (k) {
        return '<span class="tcat tc-' + k + '" style="flex:' + data.byCategory[k] + '" title="' + esc(NL.topicLabel(k)) + ': ' + data.byCategory[k] + '"></span>';
      }).join('') + '</div><ul class="tcat-legend">' + CATS.filter(function (k) { return data.byCategory[k]; }).map(function (k) {
        return '<li><i class="tc-' + k + '"></i>' + esc(NL.topicLabel(k)) + ' <b>' + data.byCategory[k] + '</b> <span class="muted">' + Math.round(data.byCategory[k] / total * 100) + '%</span></li>';
      }).join('') + '</ul>';

    var cats = {};
    data.topics.forEach(function (x) { cats[x.category] = (cats[x.category] || 0) + 1; });
    if (cat !== 'all' && !cats[cat]) cat = 'all';
    $('trend-filter').innerHTML = ['all'].concat(CATS.filter(function (k) { return cats[k]; })).map(function (k) {
      return '<button class="pill" type="button" role="tab" data-tcat="' + k + '" aria-selected="' + (cat === k) + '">' + esc(NL.topicLabel(k))
        + '<span class="n">' + (k === 'all' ? data.topics.length : cats[k]) + '</span></button>';
    }).join('');

    var list = data.topics.filter(function (x) { return cat === 'all' || x.category === cat; });
    $('trend-list').innerHTML = list.length ? list.map(function (x, i) {
      var img = (x.stories.find(function (s) { return s.image; }) || {}).image;
      return '<article class="trend-card" style="--i:' + i + '">'
        + '<div class="tc-head"><span class="tc-rank">' + (data.topics.indexOf(x) + 1) + '</span>'
        + '<div class="tc-h"><span class="cat">' + esc(NL.topicLabel(x.category)) + '</span>'
        + '<h2 class="tc-term"' + NL.langAttr(x.term) + '>' + esc(x.term) + '</h2>'
        + '<span class="tc-meta">' + esc(t('hp', { h: x.headlines, s: x.sources })) + '</span></div>'
        + (img ? '<div class="tc-img"><img src="' + esc(img) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></div>' : '')
        + '</div><ul class="tc-stories">' + x.stories.slice(0, 3).map(function (s) {
          return '<li><a href="' + esc(s.link) + '" target="_blank" rel="noopener noreferrer"><span' + NL.langAttr(s.title) + '>' + esc(s.title) + '</span>'
            + '<span class="meta"><span class="src">' + esc(NL.srcName(s.source)) + '</span><span class="sep">·</span>' + NL.fresh('reported', s.time) + '</span></a></li>';
        }).join('') + '</ul></article>';
    }).join('') : NL.emptyState(t('none'), { icon: 'chart' });
  }

  async function load() {
    var btn = $('trending-refresh');
    btn.classList.add('spinning');
    try {
      data = await NL.api('/api/trending');
      render();
      NL.stamp('stamp-trending', true);
      NL.feed('trending', true);
    } catch (e) {
      if (!data) $('trend-list').innerHTML = NL.errorState(t('err'), { mod: 'trending' });
      NL.stamp('stamp-trending', false);
      NL.feed('trending', false);
    } finally { btn.classList.remove('spinning'); }
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest('[data-tcat]');
    if (el) { cat = el.getAttribute('data-tcat'); render(); }
  });
  $('trending-refresh').addEventListener('click', load);
  NL.retryHandlers.trending = load;
  NL.onLang(render);
  $('trend-list').innerHTML = NL.skeleton('cards');
  NL.ticker.autoload();
  NL.renderFooter([{ name: 'Nepali news publishers (RSS feeds)', url: '/news' }]);
  load();
  setInterval(function () { if (!document.hidden) load(); }, 300e3);
})();
