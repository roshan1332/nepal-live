/*
 * Search page (/search?q=&type=&lang=&cat=&days=&prov=). Data: /api/search —
 * news, places, markets, fixtures, jobs, events, government services and site
 * pages. Language and category narrow news; province also narrows places,
 * jobs and events; date = news from the last N days / events in the next N.
 * Filters live in the URL, so a filtered search can be shared. Every result
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
      noneF: 'Nothing matches these filters right now.', noneFSub: 'Try a wider date range or another province.',
      err: 'Search isn’t available right now.', intro: 'Search live news, places, markets, fixtures, jobs, events and official services — or pick a filter to browse.', tryThese: 'Try',
      count: '{n} results for “{q}”', countF: '{n} results', weather: 'Weather & air', newsAbout: 'News', deadline: 'apply by {d}',
      anyLang: 'Any language', anyCat: 'Any category', anyTime: 'Any time', d1: 'Last 24 hours', d7: 'Last 7 days', d30: 'Last 30 days',
      anyProv: 'All provinces', clearF: 'Clear filters', fNote: 'Language and category filter news. Province also filters places, jobs and events; date means news from the last days and events in the next ones.'
    },
    ne: {
      kicker: 'खोज', h1: '<em>नेपाल लाइभ</em> खोज्नुहोस्', sub: 'समाचार, ठाउँ, बजार, खेलकुद, जागिर, कार्यक्रम र सरकारी सेवा — एकै ठाउँमा।',
      ph: '“पोखरा”, “नेप्से”, “राहदानी”, “दशैं” खोजेर हेर्नुहोस्…', go: 'खोज्नुहोस्', all: 'सबै', more: 'थप',
      g_places: 'ठाउँ', g_markets: 'बजार', g_news: 'समाचार', g_sports: 'खेलकुद', g_jobs: 'जागिर', g_events: 'कार्यक्रम', g_government: 'सरकारी सेवा', g_pages: 'पृष्ठ',
      unavailable: 'यो स्रोत अहिले उपलब्ध छैन।', none: '“{q}” का लागि केही भेटिएन।', noneSub: 'अर्को हिज्जे, ठाउँको नाम वा नेपाली शब्द प्रयोग गरेर हेर्नुहोस्।',
      noneF: 'यी फिल्टरमा अहिले केही भेटिएन।', noneFSub: 'लामो अवधि वा अर्को प्रदेश छानेर हेर्नुहोस्।',
      err: 'खोज अहिले उपलब्ध छैन।', intro: 'ताजा समाचार, ठाउँ, बजार, खेल, जागिर, कार्यक्रम र आधिकारिक सेवा खोज्नुहोस् — वा फिल्टर छानेर हेर्नुहोस्।', tryThese: 'यी खोज्नुहोस्',
      count: '“{q}” का {n} नतिजा', countF: '{n} नतिजा', weather: 'मौसम र हावा', newsAbout: 'समाचार', deadline: '{d} सम्म आवेदन',
      anyLang: 'कुनै पनि भाषा', anyCat: 'कुनै पनि विधा', anyTime: 'जुनसुकै समय', d1: 'पछिल्लो २४ घण्टा', d7: 'पछिल्लो ७ दिन', d30: 'पछिल्लो ३० दिन',
      anyProv: 'सबै प्रदेश', clearF: 'फिल्टर हटाउनुहोस्', fNote: 'भाषा र विधाले समाचार छान्छ। प्रदेशले ठाउँ, जागिर र कार्यक्रम पनि छान्छ; मितिले पछिल्ला दिनका समाचार र आगामी दिनका कार्यक्रम देखाउँछ।'
    }
  });

  var ICONS = { places: 'home', markets: 'grid', news: 'news', sports: 'trophy', jobs: 'building', events: 'calendar', government: 'shield', pages: 'doc' };
  var SAVE_TYPE = { places: 'place', markets: 'page', news: 'news', sports: 'match', jobs: 'job', events: 'event', government: 'gov', pages: 'page' };
  var SUGGEST = { en: ['Pokhara', 'NEPSE', 'Gold', 'Passport', 'Dashain', 'Cricket', 'Bank jobs', 'Earthquake'], ne: ['पोखरा', 'नेप्से', 'सुन', 'राहदानी', 'दशैं', 'क्रिकेट', 'भूकम्प', 'बाढी'] };
  var CATS = ['politics', 'business', 'technology', 'sports', 'society', 'world', 'entertainment', 'nepal'];

  var qs = new URLSearchParams(location.search);
  var pick = function (v, ok) { return ok.indexOf(v) >= 0 ? v : ''; };
  var S = {
    q: (qs.get('q') || '').slice(0, 100), type: qs.get('type') || '', all: null, allKey: '', data: null,
    lang: pick(qs.get('lang') || '', ['en', 'ne']), cat: pick(qs.get('cat') || '', CATS), days: pick(qs.get('days') || '', ['1', '7', '30']),
    prov: pick(qs.get('prov') || '', NL.PROVINCES.map(function (p) { return p.id; }))
  };
  var filtered = function () { return !!(S.lang || S.cat || S.days || S.prov); };
  var fqs = function () {
    return (S.lang ? '&lang=' + S.lang : '') + (S.cat ? '&cat=' + S.cat : '') + (S.days ? '&days=' + S.days : '') + (S.prov ? '&prov=' + S.prov : '');
  };

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
    if (key === 'news' && it.topic && it.topic !== 'nepal') bits.push(NL.topicLabel(it.topic));
    if (key === 'news' && it.province) bits.push(NL.provName(it.province));
    if (it.time) bits.push(NL.ago(Date.parse(it.time)));
    if (it.deadline) bits.push(t('deadline', { d: NL.dfmt.day(Date.parse(it.deadline)) }));
    return '<article class="sr-item">'
      + (it.img ? '<span class="sr-img"><img src="' + esc(it.img) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></span>'
        : '<span class="sr-ic" aria-hidden="true">' + (NL.icon[ICONS[key]] || NL.icon.doc || '') + '</span>')
      + '<div class="sr-b"><a class="sr-t" href="' + esc(it.url) + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + NL.langAttr(title) + '>'
      + highlight(title) + (ext ? ' <span class="sr-ext" aria-hidden="true">↗</span>' : '') + '</a>'
      + '<span class="sr-sub">' + (key === 'news' && it.lang ? NL.langChip(it) + ' ' : '') + esc(bits.filter(Boolean).join(' · ')) + '</span>'
      + (key === 'places' ? '<span class="sr-links"><a href="' + esc(it.url) + '">' + esc(t('weather')) + ' →</a><a href="/search?q=' + encodeURIComponent(it.title) + '&amp;type=news">' + esc(t('newsAbout')) + ' →</a></span>' : '')
      + '</div>'
      + (key === 'news' ? NL.shareBtn({ url: it.url, title: it.title }) : '')
      + NL.saveBtn({ type: SAVE_TYPE[key], id: it.id, title: it.title, url: it.url, sub: it.sub || '', img: it.img || '' })
      + '</article>';
  }
  function suggestHTML() {
    return '<div class="sr-suggest"><span class="muted">' + esc(t('tryThese')) + '</span>'
      + SUGGEST[NL.lang()].map(function (w) { return '<button class="pill" type="button" data-sq="' + esc(w) + '">' + esc(w) + '</button>'; }).join('') + '</div>';
  }
  /* filter controls: labels follow the language, values follow the URL */
  function paintFilters() {
    var opt = function (v, label, on) { return '<option value="' + v + '"' + (on ? ' selected' : '') + '>' + esc(label) + '</option>'; };
    $('sf-cat').innerHTML = opt('', t('anyCat'), !S.cat) + CATS.map(function (c) { return opt(c, NL.topicLabel(c), S.cat === c); }).join('');
    $('sf-prov').innerHTML = opt('', t('anyProv'), !S.prov) + NL.PROVINCES.map(function (p) { return opt(p.id, NL.provName(p.id), S.prov === p.id); }).join('');
    $('sf-lang').value = S.lang; $('sf-days').value = S.days;
    $('sf-clear').hidden = !filtered();
    $('srch-filters').title = t('fNote');
  }
  function render() {
    var q = S.q.trim();
    paintFilters();
    if (!q && !filtered()) {
      $('srch-tabs').innerHTML = '';
      $('srch-out').innerHTML = '<p class="sr-intro">' + esc(t('intro')) + '</p>' + suggestHTML();
      return;
    }
    if (!S.data || !S.all) return;
    var keys = S.all.groups.filter(function (g) { return g.items.length; }).map(function (g) { return g.key; });
    $('srch-tabs').innerHTML = keys.length > 1 ? [''].concat(keys).map(function (k) {
      return '<button class="pill" type="button" role="tab" data-type="' + k + '" aria-selected="' + (S.type === k) + '">' + esc(k ? t('g_' + k) : t('all')) + '</button>';
    }).join('') : '';
    var groups = S.data.groups;
    var total = groups.reduce(function (a, g) { return a + g.items.length; }, 0);
    var note = filtered() ? '<p class="small muted sr-fnote">' + esc(t('fNote')) + '</p>' : '';
    if (!total) {
      $('srch-out').innerHTML = (q ? NL.emptyState(t('none', { q: q }), { icon: 'search', sub: t('noneSub') }) + suggestHTML()
        : NL.emptyState(t('noneF'), { icon: 'search', sub: t('noneFSub'), action: { label: t('clearF'), attr: 'data-fclear' } })) + note
        + groups.filter(function (g) { return g.unavailable; }).map(function (g) { return '<p class="small muted">' + esc(t('g_' + g.key)) + ': ' + esc(t('unavailable')) + '</p>'; }).join('');
      return;
    }
    $('srch-out').innerHTML = '<p class="basis">' + esc(q ? t('count', { n: total, q: q }) : t('countF', { n: total })) + '</p>' + note + groups.map(function (g) {
      var more = !S.type && g.items.length >= 5 && keys.length > 1 ? '<button class="link-more" type="button" data-type="' + g.key + '">' + esc(t('more')) + ' <span>→</span></button>' : '';
      return '<section class="sr-group" aria-label="' + esc(t('g_' + g.key)) + '"><div class="sr-head"><h2 class="sr-h">' + esc(t('g_' + g.key)) + '</h2>' + more + '</div>'
        + (g.unavailable ? '<p class="small muted">' + esc(t('unavailable')) + '</p>' : g.items.map(function (it) { return itemHTML(it, g.key); }).join(''))
        + '</section>';
    }).join('');
  }
  var seq = 0;
  async function run() {
    var q = S.q.trim(), my = ++seq;
    $('srch-q').value = S.q;
    var f = fqs();
    var qpart = (q ? '&q=' + encodeURIComponent(q) : '') + (S.type ? '&type=' + S.type : '') + f;
    history.replaceState(null, '', '/search' + (qpart ? '?' + qpart.slice(1) : ''));
    document.title = q ? q + ' — ' + t('kicker') + ' · Nepal Live' : BASE_TITLE;
    if (!q && !filtered()) { S.all = S.data = null; render(); return; }
    $('srch-out').innerHTML = NL.skeleton('rows');
    try {
      var key = q + '|' + f;
      if (!S.all || S.allKey !== key) { S.all = await NL.api('/api/search?q=' + encodeURIComponent(q) + f); S.allKey = key; }
      var d = S.type ? await NL.api('/api/search?q=' + encodeURIComponent(q) + '&type=' + encodeURIComponent(S.type) + f) : S.all;
      if (my !== seq) return;
      S.data = d;
      render();
      NL.feed('search', true);
    } catch (e) {
      if (my === seq) { $('srch-out').innerHTML = NL.errorState(t('err'), { mod: 'search' }); NL.feed('search', false); }
    }
  }

  $('srch-form').addEventListener('submit', function (e) { e.preventDefault(); S.q = $('srch-q').value.slice(0, 100); S.type = ''; run(); });
  ['lang', 'cat', 'days', 'prov'].forEach(function (k) {
    $('sf-' + k).addEventListener('change', function (e) { S[k] = e.target.value; S.type = ''; run(); });
  });
  var clearFilters = function () { S.lang = S.cat = S.days = S.prov = ''; S.type = ''; run(); };
  $('sf-clear').addEventListener('click', clearFilters);
  document.addEventListener('click', function (e) {
    var el;
    if (e.target.closest('[data-fclear]')) { clearFilters(); return; }
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
