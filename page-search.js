/*
 * Search page (/search?q=&type=). Data: /api/search — news, places, markets,
 * fixtures, jobs, events, government services and site pages. Every result
 * links to where the information lives; external ones say so.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var t = NL.i18n.t, esc = NL.esc;
  var BASE_TITLE = document.title;

  NL.i18n.add({
    en: {
      kicker: 'Search', h1: 'Search <em>Nepal Live</em>', sub: 'News, places, markets, sports, jobs, events and government services — in one place.',
      ph: 'Try “Pokhara”, “NEPSE”, “passport”, “Dashain”…', go: 'Search', all: 'All', more: 'More',
      g_places: 'Places', g_markets: 'Markets', g_news: 'News', g_sports: 'Sports', g_jobs: 'Jobs', g_events: 'Events', g_government: 'Government services', g_pages: 'Pages',
      unavailable: 'This source isn’t available right now.', none: 'No results for “{q}”.', noneSub: 'Try another spelling, a place name, or a Nepali word.',
      err: 'Search isn’t available right now.', intro: 'Search live news, places, markets, fixtures, jobs, events and official services.', tryThese: 'Try',
      count: '{n} results for “{q}”', weather: 'Weather & air', newsAbout: 'News', deadline: 'apply by {d}'
    },
    ne: {
      kicker: 'खोज', h1: '<em>नेपाल लाइभ</em> खोज्नुहोस्', sub: 'समाचार, ठाउँ, बजार, खेलकुद, जागिर, कार्यक्रम र सरकारी सेवा — एकै ठाउँमा।',
      ph: '“पोखरा”, “नेप्से”, “राहदानी”, “दशैं” खोजेर हेर्नुहोस्…', go: 'खोज्नुहोस्', all: 'सबै', more: 'थप',
      g_places: 'ठाउँ', g_markets: 'बजार', g_news: 'समाचार', g_sports: 'खेलकुद', g_jobs: 'जागिर', g_events: 'कार्यक्रम', g_government: 'सरकारी सेवा', g_pages: 'पृष्ठ',
      unavailable: 'यो स्रोत अहिले उपलब्ध छैन।', none: '“{q}” का लागि केही भेटिएन।', noneSub: 'अर्को हिज्जे, ठाउँको नाम वा नेपाली शब्द प्रयोग गरेर हेर्नुहोस्।',
      err: 'खोज अहिले उपलब्ध छैन।', intro: 'ताजा समाचार, ठाउँ, बजार, खेल, जागिर, कार्यक्रम र आधिकारिक सेवा खोज्नुहोस्।', tryThese: 'यी खोज्नुहोस्',
      count: '“{q}” का {n} नतिजा', weather: 'मौसम र हावा', newsAbout: 'समाचार', deadline: '{d} सम्म आवेदन'
    }
  });

  var ICONS = { places: 'home', markets: 'grid', news: 'news', sports: 'trophy', jobs: 'building', events: 'calendar', government: 'shield', pages: 'doc' };
  var SAVE_TYPE = { places: 'place', markets: 'page', news: 'news', sports: 'match', jobs: 'job', events: 'event', government: 'gov', pages: 'page' };
  var SUGGEST = { en: ['Pokhara', 'NEPSE', 'Gold', 'Passport', 'Dashain', 'Cricket', 'Bank jobs', 'Earthquake'], ne: ['पोखरा', 'नेप्से', 'सुन', 'राहदानी', 'दशैं', 'क्रिकेट', 'भूकम्प', 'बाढी'] };

  var qs = new URLSearchParams(location.search);
  var S = { q: (qs.get('q') || '').slice(0, 100), type: qs.get('type') || '', all: null, data: null };

  var reEsc = function (s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
  function highlight(text) {
    var out = esc(text);
    S.q.trim().split(/\s+/).filter(function (w) { return w.length >= 2; }).forEach(function (w) {
      out = out.replace(new RegExp('(' + reEsc(esc(w)) + ')', 'gi'), '<mark>$1</mark>');
    });
    return out;
  }
  function itemHTML(it, key) {
    var ne = NL.lang() === 'ne';
    var title = ne && it.titleNe ? it.titleNe : it.title;
    var ext = !!it.external;
    var bits = [it.sub];
    if (it.time) bits.push(NL.ago(Date.parse(it.time)));
    if (it.deadline) bits.push(t('deadline', { d: NL.dfmt.day(Date.parse(it.deadline)) }));
    return '<article class="sr-item">'
      + (it.img ? '<span class="sr-img"><img src="' + esc(it.img) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></span>'
        : '<span class="sr-ic" aria-hidden="true">' + (NL.icon[ICONS[key]] || NL.icon.doc || '') + '</span>')
      + '<div class="sr-b"><a class="sr-t" href="' + esc(it.url) + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + NL.langAttr(title) + '>'
      + highlight(title) + (ext ? ' <span class="sr-ext" aria-hidden="true">↗</span>' : '') + '</a>'
      + '<span class="sr-sub">' + esc(bits.filter(Boolean).join(' · ')) + '</span>'
      + (key === 'places' ? '<span class="sr-links"><a href="' + esc(it.url) + '">' + esc(t('weather')) + ' →</a><a href="/search?q=' + encodeURIComponent(it.title) + '&amp;type=news">' + esc(t('newsAbout')) + ' →</a></span>' : '')
      + '</div>'
      + NL.saveBtn({ type: SAVE_TYPE[key], id: it.id, title: it.title, url: it.url, sub: it.sub || '', img: it.img || '' })
      + '</article>';
  }
  function suggestHTML() {
    return '<div class="sr-suggest"><span class="muted">' + esc(t('tryThese')) + '</span>'
      + SUGGEST[NL.lang()].map(function (w) { return '<button class="pill" type="button" data-sq="' + esc(w) + '">' + esc(w) + '</button>'; }).join('') + '</div>';
  }
  function render() {
    var q = S.q.trim();
    if (!q) {
      $('srch-tabs').innerHTML = '';
      $('srch-out').innerHTML = '<p class="sr-intro">' + esc(t('intro')) + '</p>' + suggestHTML();
      return;
    }
    if (!S.data || !S.all) return;
    var keys = S.all.groups.filter(function (g) { return g.items.length; }).map(function (g) { return g.key; });
    $('srch-tabs').innerHTML = keys.length ? [''].concat(keys).map(function (k) {
      return '<button class="pill" type="button" role="tab" data-type="' + k + '" aria-selected="' + (S.type === k) + '">' + esc(k ? t('g_' + k) : t('all')) + '</button>';
    }).join('') : '';
    var groups = S.data.groups;
    var total = groups.reduce(function (a, g) { return a + g.items.length; }, 0);
    if (!total) {
      $('srch-out').innerHTML = NL.emptyState(t('none', { q: q }), { icon: 'search', sub: t('noneSub') }) + suggestHTML()
        + groups.filter(function (g) { return g.unavailable; }).map(function (g) { return '<p class="small muted">' + esc(t('g_' + g.key)) + ': ' + esc(t('unavailable')) + '</p>'; }).join('');
      return;
    }
    $('srch-out').innerHTML = '<p class="basis">' + esc(t('count', { n: total, q: q })) + '</p>' + groups.map(function (g) {
      var more = !S.type && g.items.length >= 5 ? '<button class="link-more" type="button" data-type="' + g.key + '">' + esc(t('more')) + ' <span>→</span></button>' : '';
      return '<section class="sr-group" aria-label="' + esc(t('g_' + g.key)) + '"><div class="sr-head"><h2 class="sr-h">' + esc(t('g_' + g.key)) + '</h2>' + more + '</div>'
        + (g.unavailable ? '<p class="small muted">' + esc(t('unavailable')) + '</p>' : g.items.map(function (it) { return itemHTML(it, g.key); }).join(''))
        + '</section>';
    }).join('');
  }
  var seq = 0;
  async function run() {
    var q = S.q.trim(), my = ++seq;
    $('srch-q').value = S.q;
    history.replaceState(null, '', '/search' + (q ? '?q=' + encodeURIComponent(q) + (S.type ? '&type=' + S.type : '') : ''));
    document.title = q ? q + ' — ' + t('kicker') + ' · Nepal Live' : BASE_TITLE;
    if (!q) { S.all = S.data = null; render(); return; }
    $('srch-out').innerHTML = NL.skeleton('rows');
    try {
      if (!S.all || S.all.q !== q) S.all = await NL.api('/api/search?q=' + encodeURIComponent(q));
      var d = S.type ? await NL.api('/api/search?q=' + encodeURIComponent(q) + '&type=' + encodeURIComponent(S.type)) : S.all;
      if (my !== seq) return;
      S.data = d;
      render();
      NL.feed('search', true);
    } catch (e) {
      if (my === seq) { $('srch-out').innerHTML = NL.errorState(t('err'), { mod: 'search' }); NL.feed('search', false); }
    }
  }

  $('srch-form').addEventListener('submit', function (e) { e.preventDefault(); S.q = $('srch-q').value.slice(0, 100); S.type = ''; run(); });
  document.addEventListener('click', function (e) {
    var el;
    if ((el = e.target.closest('[data-type]'))) { S.type = el.getAttribute('data-type'); run(); window.scrollTo({ top: 0 }); return; }
    if ((el = e.target.closest('[data-sq]'))) { S.q = el.getAttribute('data-sq'); S.type = ''; run(); }
  });
  NL.retryHandlers.search = run;
  NL.onLang(render);
  NL.ticker.autoload();
  NL.renderFooter([]);
  run();
  if (!S.q) $('srch-q').focus();
})();
