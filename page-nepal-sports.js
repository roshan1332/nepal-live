/*
 * Nepal Sports (/nepal-sports): national-team fixtures (/api/nepal-sports,
 * TheSportsDB) and Nepal sports news — Google News queries plus the sports
 * stories in Nepali publishers' own feeds.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var t = NL.i18n.t, esc = NL.esc;

  NL.i18n.add({
    en: {
      kicker: 'Nepal Sports', h1: 'Nepal <em>sports</em>', sub: 'Nepal’s national teams, Nepali athletes and domestic sport — fixtures and news, separate from the global scoreboard.',
      fixK: 'National teams', fixH: 'Nepal fixtures & results', newsK: 'Headlines', newsH: 'Nepal sports news',
      cricketH: 'Nepal cricket', footballH: 'Nepal football', localH: 'From Nepali publishers',
      upcoming: 'Upcoming', results: 'Recent results', football: 'Football', cricket: 'Cricket',
      noFix: 'No Nepal national-team fixtures in TheSportsDB’s feed right now.',
      noFixSub: 'The feed doesn’t cover every tournament Nepal plays — check the news below for series we can’t list.',
      noNews: 'No stories right now.', err: 'Nepal sports data isn’t available right now.',
      npNote: 'Fixtures: TheSportsDB. News: Google News and Nepali publishers’ own feeds — every story opens on the original publisher’s site.'
    },
    ne: {
      kicker: 'नेपाली खेलकुद', h1: 'नेपाली <em>खेलकुद</em>', sub: 'राष्ट्रिय टोली, नेपाली खेलाडी र घरेलु खेल — विश्व स्कोरबोर्डभन्दा अलग, खेल तालिका र समाचार।',
      fixK: 'राष्ट्रिय टोली', fixH: 'नेपालका खेल र नतिजा', newsK: 'शीर्षक', newsH: 'नेपाली खेलकुद समाचार',
      cricketH: 'नेपाली क्रिकेट', footballH: 'नेपाली फुटबल', localH: 'नेपाली प्रकाशकबाट',
      upcoming: 'आगामी', results: 'हालैका नतिजा', football: 'फुटबल', cricket: 'क्रिकेट',
      noFix: 'TheSportsDB को फिडमा अहिले नेपाली राष्ट्रिय टोलीको खेल छैन।',
      noFixSub: 'नेपालले खेल्ने सबै प्रतियोगिता फिडमा समेटिँदैनन् — तलका समाचार हेर्नुहोस्।',
      noNews: 'अहिले समाचार छैन।', err: 'नेपाली खेलकुदको तथ्यांक अहिले उपलब्ध छैन।',
      npNote: 'खेल तालिका: TheSportsDB। समाचार: गुगल न्यूज र नेपाली प्रकाशकका आफ्नै फिड — हरेक समाचार मूल प्रकाशककै साइटमा खुल्छ।'
    }
  });

  var S = { fix: null, cricket: null, football: null, local: null };

  /* newest first; search results older than 45 days are dropped unless that
     would leave nothing */
  function newsList(items) {
    if (!items || !items.length) return NL.emptyState(t('noNews'), { icon: 'doc', compact: true });
    var ts = function (i) { return Date.parse(i.pubDate) || 0; };
    var sorted = items.slice().sort(function (a, b) { return ts(b) - ts(a); });
    var recent = sorted.filter(function (i) { return Date.now() - ts(i) < 45 * 864e5; });
    items = recent.length ? recent : sorted;
    return '<div class="news-list">' + items.slice(0, 8).map(function (i, idx) {
      var ts = Date.parse(i.pubDate) || Date.now();
      return '<a class="news-item" style="--i:' + idx + '" href="' + esc(i.link) + '" target="_blank" rel="noopener noreferrer"><div class="news-body">'
        + '<div class="t"' + NL.langAttr(i.title) + '>' + esc(i.title) + '</div><div class="m"><span class="src-badge">' + esc(NL.srcName(i.source)) + '</span>'
        + '<span class="sep">·</span><span data-ago="' + ts + '">' + esc(NL.ago(ts)) + '</span></div></div><span class="ro" aria-hidden="true">↗</span></a>';
    }).join('') + '</div>';
  }
  function render() {
    if (S.fix) {
      var c = NL.sport.classify, ms = NL.sport.ms;
      var up = S.fix.fixtures.filter(function (e) { var k = c(e); return k === 'ns' || k === 'live' || k === 'off'; }).sort(function (a, b) { return ms(a) - ms(b); });
      var done = S.fix.fixtures.filter(function (e) { var k = c(e); return k === 'done' || k === 'past'; }).sort(function (a, b) { return ms(b) - ms(a); });
      var lab = function (e) { return Object.assign({}, e, { strLeague: t(e._sport === 'Cricket' ? 'cricket' : 'football') + (e.strLeague ? ' · ' + e.strLeague : '') }); };
      var grid = function (list) { return '<div class="sb-grid">' + list.map(function (e, i) { return NL.sport.card(lab(e), i); }).join('') + '</div>'; };
      $('np-fixtures').innerHTML = (up.length || done.length)
        ? (up.length ? '<h3 class="day-h">' + esc(t('upcoming')) + '</h3>' + grid(up) : '') + (done.length ? '<h3 class="day-h">' + esc(t('results')) + '</h3>' + grid(done) : '')
        : S.fix.pending ? NL.skeleton('list') : NL.emptyState(t('noFix'), { icon: 'trophy', sub: t('noFixSub') });
    }
    if (S.cricket) $('np-cricket').innerHTML = newsList(S.cricket);
    if (S.football) $('np-football').innerHTML = newsList(S.football);
    if (S.local) $('np-local').innerHTML = newsList(S.local);
  }
  async function load() {
    var btn = $('nps-refresh');
    btn.classList.add('spinning');
    var r = await Promise.allSettled([
      NL.api('/api/nepal-sports'), NL.api('/api/news?q=' + encodeURIComponent('Nepal cricket team')),
      NL.api('/api/news?q=' + encodeURIComponent('Nepal national football team')), NL.api('/api/news-nepal'),
    ]);
    if (r[0].status === 'fulfilled') {
      S.fix = r[0].value;
      /* fixtures still being fetched under the feed's rate limit: check back */
      if (S.fix.pending && (S.retry = (S.retry || 0) + 1) <= 8) setTimeout(load, 12000);
    } else if (!S.fix) $('np-fixtures').innerHTML = NL.errorState(t('err'), { mod: 'nps', compact: true });
    if (r[1].status === 'fulfilled') S.cricket = r[1].value.items || [];
    if (r[2].status === 'fulfilled') S.football = r[2].value.items || [];
    if (r[3].status === 'fulfilled') S.local = (r[3].value.items || []).filter(function (i) { return i.topic === 'sports'; });
    render();
    var ok = r.some(function (x) { return x.status === 'fulfilled'; });
    NL.stamp('stamp-nps', ok); NL.feed('nepal-sports', ok);
    btn.classList.remove('spinning');
  }
  $('nps-refresh').addEventListener('click', load);
  NL.retryHandlers.nps = load;
  NL.onLang(render);
  ['np-fixtures', 'np-cricket', 'np-football', 'np-local'].forEach(function (id) { $(id).innerHTML = NL.skeleton(id === 'np-fixtures' ? 'list' : 'rows'); });
  NL.ticker.autoload();
  NL.renderFooter([
    { name: 'TheSportsDB — fixtures', url: 'https://www.thesportsdb.com/' },
    { name: 'Google News — sports headlines', url: 'https://news.google.com/' },
    { name: 'Nepali news publishers', url: '/news' },
  ]);
  load();
  setInterval(function () { if (!document.hidden) load(); }, 300e3);
})();
