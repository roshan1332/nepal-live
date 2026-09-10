/*
 * Nepal News page (/news). Data: /api/news-nepal (Nepali publishers' own RSS
 * feeds) and /api/trending for "most covered". Filters live in the URL
 * (?topic=&lang=&src=&q=) so any filtered view is shareable.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var t = NL.i18n.t, esc = NL.esc;
  var TOPICS = ['all', 'nepal', 'politics', 'business', 'technology', 'sports', 'entertainment', 'world'];
  var PAGE = 24;

  NL.i18n.add({
    en: {
      kicker: 'News', h1: 'Nepal <em>news</em>',
      sub: 'Headlines from Nepali newsrooms, updated through the day. Every story opens on the original publisher’s site.',
      filterPh: 'Filter headlines…', allSources: 'All publishers', mostCovered: 'Most covered right now', publishers: 'Publishers',
      latestTitle: 'Latest headlines', showMore: 'Show more stories', noMatch: 'No headlines match these filters.',
      clear: 'Clear filters', err: 'News isn’t available right now.', headlinesN: '{n} headlines',
      aggNote: 'Nepal Live aggregates headlines from Nepali publishers. Every story opens on the original publisher’s site — we don’t rehost or edit their journalism.',
      coveredNone: 'Not enough overlapping coverage yet to call anything “most covered”.'
    },
    ne: {
      kicker: 'समाचार', h1: 'नेपालका <em>समाचार</em>',
      sub: 'नेपाली समाचार कक्षका शीर्षक, दिनभरि ताजा। हरेक समाचार मूल प्रकाशककै साइटमा खुल्छ।',
      filterPh: 'शीर्षक खोज्नुहोस्…', allSources: 'सबै प्रकाशक', mostCovered: 'अहिले सबैभन्दा बढी कभर भएका', publishers: 'प्रकाशक',
      latestTitle: 'ताजा शीर्षक', showMore: 'थप समाचार', noMatch: 'यी फिल्टरमा कुनै समाचार भेटिएन।',
      clear: 'फिल्टर हटाउनुहोस्', err: 'समाचार अहिले उपलब्ध छैन।', headlinesN: '{n} शीर्षक',
      aggNote: 'नेपाल लाइभले नेपाली प्रकाशकका शीर्षक संकलन गर्छ। हरेक समाचार मूल प्रकाशककै साइटमा खुल्छ — हामी उनीहरूको पत्रकारिता पुनः प्रकाशन वा सम्पादन गर्दैनौं।',
      coveredNone: 'कुनै विषयलाई “सबैभन्दा बढी कभर” भन्न पुग्ने साझा कभरेज अझै छैन।'
    }
  });

  var qs = new URLSearchParams(location.search);
  var S = {
    items: null, trend: null,
    topic: TOPICS.indexOf(qs.get('topic')) > 0 ? qs.get('topic') : 'all',
    lang: ['en', 'ne'].indexOf(qs.get('lang')) >= 0 ? qs.get('lang') : 'all',
    src: qs.get('src') || '', q: qs.get('q') || '', shown: PAGE
  };
  $('news-q').value = S.q;

  function syncURL() {
    var p = new URLSearchParams();
    if (S.topic !== 'all') p.set('topic', S.topic);
    if (S.lang !== 'all') p.set('lang', S.lang);
    if (S.src) p.set('src', S.src);
    if (S.q) p.set('q', S.q);
    history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p : ''));
  }

  function base() {
    var q = S.q.trim().toLowerCase();
    return (S.items || []).filter(function (i) {
      return (S.lang === 'all' || i.lang === S.lang) && (!S.src || i.source === S.src)
        && (!q || (i.title + ' ' + (i.summary || '')).toLowerCase().indexOf(q) >= 0);
    });
  }

  function render() {
    if (!S.items) return;
    var list = base();
    var counts = {};
    list.forEach(function (i) { counts[i.topic || 'nepal'] = (counts[i.topic || 'nepal'] || 0) + 1; });
    $('pills').innerHTML = TOPICS.filter(function (k) { return k === 'all' || counts[k] || S.topic === k; }).map(function (k) {
      return '<button class="pill" type="button" role="tab" data-topic="' + k + '" aria-selected="' + (S.topic === k) + '">'
        + esc(NL.topicLabel(k)) + '<span class="n">' + (k === 'all' ? list.length : (counts[k] || 0)) + '</span></button>';
    }).join('');
    document.querySelectorAll('[data-filter]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-filter') === S.lang)); });

    var shown = S.topic === 'all' ? list : list.filter(function (i) { return (i.topic || 'nepal') === S.topic; });
    $('news-list').innerHTML = shown.length
      ? '<div class="cp-list">' + shown.slice(0, S.shown).map(NL.story.compact).join('') + '</div>'
      : NL.emptyState(t('noMatch'), { icon: 'doc', action: { label: t('clear'), attr: 'data-clear' } });
    $('news-more').innerHTML = shown.length > S.shown
      ? '<button class="btn" type="button" data-more>' + esc(t('showMore')) + ' <span class="muted">' + (shown.length - S.shown) + '</span></button>' : '';

    var pubs = {};
    (S.items || []).forEach(function (i) { pubs[i.source] = (pubs[i.source] || 0) + 1; });
    var sel = $('news-src');
    sel.innerHTML = '<option value="">' + esc(t('allSources')) + '</option>' + Object.keys(pubs).sort().map(function (p) {
      return '<option value="' + esc(p) + '"' + (p === S.src ? ' selected' : '') + '>' + esc(NL.srcName(p)) + '</option>';
    }).join('');
    $('news-pubs').innerHTML = '<ul class="pub-list">' + Object.keys(pubs).sort(function (a, b) { return pubs[b] - pubs[a]; }).map(function (p) {
      return '<li><button type="button" data-src="' + esc(p) + '" aria-pressed="' + (p === S.src) + '">' + esc(NL.srcName(p))
        + '</button><span class="n">' + pubs[p] + '</span></li>';
    }).join('') + '</ul>';

    var tr = S.trend;
    $('news-covered').innerHTML = tr && tr.topics.length ? '<ol class="covered">' + tr.topics.slice(0, 6).map(function (x) {
      var s = x.stories[0];
      return '<li><a href="' + esc(s.link) + '" target="_blank" rel="noopener noreferrer"><span class="cv-term"' + NL.langAttr(x.term) + '>' + esc(x.term) + '</span>'
        + '<span class="cv-t"' + NL.langAttr(s.title) + '>' + esc(s.title) + '</span>'
        + '<span class="cv-m">' + esc(t('headlinesN', { n: x.headlines })) + ' · ' + esc(NL.srcName(s.source)) + '</span></a></li>';
    }).join('') + '</ol><a class="link-more" href="/trending">' + esc(NL.s('trending')) + ' <span>→</span></a>'
      : '<p class="muted small">' + esc(t('coveredNone')) + '</p>';
    syncURL();
  }

  async function load() {
    var btn = $('news-refresh');
    btn.classList.add('spinning');
    try {
      var r = await Promise.allSettled([NL.api('/api/news-nepal'), NL.api('/api/trending')]);
      if (r[0].status !== 'fulfilled') throw r[0].reason;
      S.items = r[0].value.items || [];
      if (r[1].status === 'fulfilled') S.trend = r[1].value;
      render();
      NL.stamp('stamp-news', true);
      NL.feed('news', true);
    } catch (e) {
      if (!S.items) $('news-list').innerHTML = NL.errorState(t('err'), { mod: 'news' });
      NL.stamp('stamp-news', false);
      NL.feed('news', false);
    } finally { btn.classList.remove('spinning'); }
  }

  document.addEventListener('click', function (e) {
    var el;
    if ((el = e.target.closest('[data-topic]'))) { S.topic = el.getAttribute('data-topic'); S.shown = PAGE; render(); return; }
    if ((el = e.target.closest('[data-filter]'))) { S.lang = el.getAttribute('data-filter'); S.shown = PAGE; render(); return; }
    if ((el = e.target.closest('[data-src]'))) { var v = el.getAttribute('data-src'); S.src = S.src === v ? '' : v; S.shown = PAGE; render(); return; }
    if (e.target.closest('[data-more]')) { S.shown += PAGE; render(); return; }
    if (e.target.closest('[data-clear]')) { S.topic = 'all'; S.lang = 'all'; S.src = ''; S.q = ''; $('news-q').value = ''; render(); }
  });
  $('news-src').addEventListener('change', function (e) { S.src = e.target.value; S.shown = PAGE; render(); });
  var qt;
  $('news-q').addEventListener('input', function (e) { clearTimeout(qt); qt = setTimeout(function () { S.q = e.target.value; S.shown = PAGE; render(); }, 150); });
  $('news-refresh').addEventListener('click', load);
  NL.retryHandlers.news = load;
  NL.onLang(render);

  NL.search.add({ group: function () { return NL.s('news'); }, limit: 8, recent: 5,
    items: function () { return (S.items || []).map(function (i) { return { title: i.title, sub: NL.srcName(i.source) + ' · ' + NL.ago(Date.parse(i.pubDate) || Date.now()), href: i.link, external: true, img: i.image, icon: 'doc', kw: i.topic }; }); } });

  $('news-list').innerHTML = NL.skeleton('stories');
  NL.ticker.autoload();
  NL.renderFooter([
    { name: 'OnlineKhabar', url: 'https://www.onlinekhabar.com/' }, { name: 'Setopati', url: 'https://www.setopati.com/' },
    { name: 'Khabarhub', url: 'https://english.khabarhub.com/' }, { name: 'Nagarik News', url: 'https://nagariknews.nagariknetwork.com/' },
    { name: 'The Himalayan Times', url: 'https://thehimalayantimes.com/' }, { name: 'Ratopati', url: 'https://www.ratopati.com/' },
  ]);
  load();
  setInterval(function () { if (!document.hidden) load(); }, 300e3);
})();
