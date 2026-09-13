/*
 * Owner's visit numbers (/stats, noindex). Data: /api/admin/stats?days=N —
 * answered only for accounts listed in ADMIN_EMAILS. Counts come from the
 * site's own anonymous beacon (see stats.js): no cookies, no IP addresses.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var t = NL.i18n.t, esc = NL.esc;

  NL.i18n.add({
    en: {
      kicker: 'Owner only', h1: 'Site <em>visits</em>', sub: 'How many people use Nepal Live — counted by the site itself, without cookies or personal data.',
      d7: '7 days', d30: '30 days', d90: '90 days',
      login: 'Log in with the owner account to see visit numbers.', loginBtn: 'Log in', owner: 'This page is only for the site owner.',
      ownerSub: 'Visit numbers are private.', err: 'Visit numbers can’t be loaded right now.',
      todayV: 'Visitors today', todayP: 'Page views today', perV: 'Visitors · {n} days', perP: 'Page views · {n} days',
      avg: 'Average visitors a day', newRet: 'New visitors', newRetSub: '{r} returning',
      chartH: 'Visitors and page views by day', visitors: 'Visitors', views: 'Page views',
      pagesH: 'Most-viewed pages', srcH: 'Where visitors came from', devH: 'Devices', langH: 'Language', hoursH: 'Busiest hours (Nepal Time)',
      dev_m: 'Phone', dev_t: 'Tablet', dev_d: 'Computer', lang_en: 'English', lang_ne: 'नेपाली',
      none: 'No visits counted in this period yet.', noneSub: 'Numbers appear as people use the site.',
      note: 'Counted by Nepal Live itself: one anonymous signal per page view. No cookies, IP addresses or names are stored — each browser counts once a day as a visitor, using only a date it keeps. Search-engine robots and your own visits (while logged in) are not counted. Counting started {d}.',
      noteLocal: 'This is a local test copy — these numbers are from this computer, not the live site.',
      updated: 'Updated {t}'
    },
    ne: {
      kicker: 'मालिकका लागि मात्र', h1: 'साइट <em>भ्रमण</em>', sub: 'नेपाल लाइभ कति जनाले प्रयोग गर्छन् — कुकी वा व्यक्तिगत विवरणबिना साइटले आफैं गनेको।',
      d7: '७ दिन', d30: '३० दिन', d90: '९० दिन',
      login: 'भ्रमण संख्या हेर्न मालिकको खाताबाट लग इन गर्नुहोस्।', loginBtn: 'लग इन', owner: 'यो पृष्ठ साइटका मालिकका लागि मात्र हो।',
      ownerSub: 'भ्रमण संख्या गोप्य हुन्छ।', err: 'भ्रमण संख्या अहिले लोड हुन सकेन।',
      todayV: 'आजका आगन्तुक', todayP: 'आजका पेज भ्यु', perV: 'आगन्तुक · {n} दिन', perP: 'पेज भ्यु · {n} दिन',
      avg: 'दैनिक औसत आगन्तुक', newRet: 'नयाँ आगन्तुक', newRetSub: '{r} फर्केर आएका',
      chartH: 'दिनअनुसार आगन्तुक र पेज भ्यु', visitors: 'आगन्तुक', views: 'पेज भ्यु',
      pagesH: 'धेरै हेरिएका पृष्ठ', srcH: 'आगन्तुक कहाँबाट आए', devH: 'उपकरण', langH: 'भाषा', hoursH: 'व्यस्त समय (नेपाल समय)',
      dev_m: 'फोन', dev_t: 'ट्याब्लेट', dev_d: 'कम्प्युटर', lang_en: 'English', lang_ne: 'नेपाली',
      none: 'यस अवधिमा अहिलेसम्म भ्रमण गनिएको छैन।', noneSub: 'मानिसहरूले साइट प्रयोग गर्दै जाँदा संख्या देखिन्छ।',
      note: 'नेपाल लाइभ आफैंले गनेको: हरेक पेज भ्युमा एउटा बेनामी संकेत। कुकी, आईपी ठेगाना वा नाम राखिँदैन — हरेक ब्राउजर दिनमा एक पटक आगन्तुकका रूपमा गनिन्छ, त्यसले राख्ने मिति मात्र प्रयोग गरेर। सर्च इन्जिनका रोबोट र लग इन भएका बेला तपाईंकै भ्रमण गनिँदैन। गणना सुरु: {d}।',
      noteLocal: 'यो स्थानीय परीक्षण प्रति हो — यी संख्या यही कम्प्युटरका हुन्, लाइभ साइटका होइनन्।',
      updated: '{t} मा अपडेट'
    }
  });

  var SRC = {
    google: 'Google', bing: 'Bing', 'other-search': 'Other search engines', facebook: 'Facebook', instagram: 'Instagram', x: 'X (Twitter)',
    youtube: 'YouTube', tiktok: 'TikTok', reddit: 'Reddit', whatsapp: 'WhatsApp', viber: 'Viber', linkedin: 'LinkedIn',
    direct: 'Direct (typed, bookmark or app)', 'other-sites': 'Other websites'
  };
  var PAGES = { '/': 'Home', '/news': 'News', '/money': 'Markets', '/weather': 'Weather', '/alerts': 'Alerts', '/sports': 'Sports', '/tools': 'Tools',
    '/jobs': 'Jobs', '/events': 'Events', '/explore': 'Explore', '/search': 'Search', '/account': 'Account', '/calendar': 'Calendar',
    '/government': 'Government', '/roads': 'Roads', '/trending': 'Trending', '/earthquakes': 'Earthquakes', '/nepal-sports': 'Nepal sports',
    '/football': 'Football', '/cricket': 'Cricket', '/gold-price': 'Gold price today', '/nepse': 'NEPSE today', '/exchange-rate': 'Exchange rates today',
    '/fuel-price': 'Fuel prices today', '/nepali-date': 'Nepali date today', '/stats': 'Site visits' };
  var S = { days: 30, d: null, timer: null };
  var fmt = function (n) { return Number(n || 0).toLocaleString('en-IN'); };

  function kpi(k, v, sub) {
    return '<div class="st-kpi"><div class="k">' + esc(k) + '</div><div class="v">' + v + '</div>' + (sub ? '<div class="s">' + esc(sub) + '</div>' : '') + '</div>';
  }
  /* daily bars: page views (light) behind visitors (solid) */
  function chart(days) {
    var W = 720, H = 190, n = days.length, max = Math.max(1, Math.max.apply(null, days.map(function (d) { return d.v; })));
    var bw = W / n, gap = Math.min(4, bw * .25);
    var bars = days.map(function (d, i) {
      var x = (i * bw + gap / 2).toFixed(1), w = Math.max(1, bw - gap).toFixed(1);
      var hv = (d.v / max * (H - 6)), hu = (d.u / max * (H - 6));
      return '<g><title>' + esc(NL.dfmt.day(Date.parse(d.day + 'T12:00:00+05:45')) + ': ' + fmt(d.u) + ' ' + t('visitors') + ', ' + fmt(d.v) + ' ' + t('views')) + '</title>'
        + '<rect class="bv" x="' + x + '" y="' + (H - hv).toFixed(1) + '" width="' + w + '" height="' + hv.toFixed(1) + '" rx="2"/>'
        + '<rect class="bu" x="' + x + '" y="' + (H - hu).toFixed(1) + '" width="' + w + '" height="' + hu.toFixed(1) + '" rx="2"/></g>';
    }).join('');
    var lbl = function (d) { return esc(NL.dfmt.day(Date.parse(d.day + 'T12:00:00+05:45'))); };
    return '<div class="st-legend"><span><i class="bu"></i>' + esc(t('visitors')) + '</span><span><i class="bv"></i>' + esc(t('views')) + '</span><span class="muted">max ' + fmt(max) + '</span></div>'
      + '<svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" role="img" aria-label="' + esc(t('chartH')) + '">' + bars + '</svg>'
      + '<div class="st-axis"><span>' + lbl(days[0]) + '</span><span>' + lbl(days[Math.floor(n / 2)]) + '</span><span>' + lbl(days[n - 1]) + '</span></div>';
  }
  function rows(list, label) {
    var total = list.reduce(function (a, x) { return a + x[1]; }, 0) || 1;
    return list.length ? '<ul class="st-rows">' + list.map(function (x) {
      var pct = Math.round(x[1] / total * 100);
      return '<li><span class="nm">' + label(x[0]) + '</span><span class="n">' + fmt(x[1]) + ' <small class="muted">' + pct + '%</small></span>'
        + '<span class="bar"><span style="width:' + Math.max(2, pct) + '%"></span></span></li>';
    }).join('') + '</ul>' : '<p class="muted small">—</p>';
  }
  var obj2list = function (o) { return Object.keys(o || {}).map(function (k) { return [k, o[k]]; }).sort(function (a, b) { return b[1] - a[1]; }); };
  function card(title, body, wide) {
    return '<section class="card' + (wide ? ' st-wide' : '') + '"><div class="card-head"><h2>' + esc(title) + '</h2></div><div class="card-body">' + body + '</div></section>';
  }

  function render() {
    var root = $('st-root'), d = S.d;
    document.querySelectorAll('[data-days]').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-days') === S.days)); });
    if (!d) return;
    if (d.access === 'login') {
      root.innerHTML = NL.emptyState(t('login'), { icon: 'user', action: { label: t('loginBtn'), attr: 'data-login' } });
      return;
    }
    if (d.access === 'owner') { root.innerHTML = NL.emptyState(t('owner'), { icon: 'shield', sub: t('ownerSub') }); return; }
    var tt = d.totals, n = d.days.length;
    /* average over the days counting has run in this period, not days before it began */
    var counted = d.since ? d.days.filter(function (x) { return x.day >= d.since; }).length : n;
    var hmax = Math.max(1, Math.max.apply(null, d.hours));
    var since = d.since ? NL.dfmt.dayY(Date.parse(d.since + 'T12:00:00+05:45')) : '—';
    root.innerHTML = '<div class="st-kpis">'
      + kpi(t('todayV'), fmt(d.today.u)) + kpi(t('todayP'), fmt(d.today.v))
      + kpi(t('perV', { n: n }), fmt(tt.u)) + kpi(t('perP', { n: n }), fmt(tt.v))
      + kpi(t('avg'), fmt(Math.round(tt.u / Math.max(1, counted)))) + kpi(t('newRet'), fmt(tt.n), t('newRetSub', { r: fmt(tt.r) }))
      + '</div>'
      + (tt.v ? '<section class="card st-chart"><div class="card-head"><h2>' + esc(t('chartH')) + '</h2><span class="stamp">' + esc(t('updated', { t: NL.nptHM(new Date(d.generatedAt)) })) + '</span></div><div class="card-body">' + chart(d.days) + '</div></section>'
        + '<div class="st-cols">'
        + card(t('pagesH'), rows(d.pages, function (p) {
          var wx = /^\/weather\/([a-z]+)$/.exec(p);
          var name = PAGES[p] || (wx ? 'Weather · ' + wx[1].charAt(0).toUpperCase() + wx[1].slice(1) : '');
          return name ? esc(name) + ' <small>' + esc(p) + '</small>' : esc(p);
        }))
        + card(t('srcH'), rows(d.src, function (k) { return esc(SRC[k] || k); }))
        + card(t('devH'), rows(obj2list(d.dev), function (k) { return esc(t('dev_' + k) || k); }))
        + card(t('langH'), rows(obj2list(d.lang), function (k) { return esc(t('lang_' + k) || k); }))
        + card(t('hoursH'), '<div class="st-hours">' + d.hours.map(function (v, h) { return '<span style="height:' + Math.max(2, v / hmax * 100) + '%" title="' + h + ':00 — ' + fmt(v) + '"></span>'; }).join('')
          + '</div><div class="st-hours-x"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span></div>')
        + '</div>'
        : NL.emptyState(t('none'), { icon: 'chart', sub: t('noneSub') }))
      + '<p class="st-note">' + esc(t('note', { d: since })) + (d.store === 'file' ? ' <b>' + esc(t('noteLocal')) + '</b>' : '') + '</p>';
  }
  async function load() {
    try {
      /* { access: 'login' | 'owner' } when this browser may not see the numbers */
      S.d = await NL.api('/api/admin/stats?days=' + S.days);
      render();
      NL.feed('stats', true);
    } catch (e) {
      if (!S.d) $('st-root').innerHTML = NL.errorState(t('err'), { mod: 'stats' });
      NL.feed('stats', false);
    }
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-days]');
    if (b) { S.days = +b.getAttribute('data-days'); S.d = null; $('st-root').innerHTML = NL.skeleton('cards'); load(); return; }
    if (e.target.closest('[data-login]')) location.href = '/account?tab=login&next=' + encodeURIComponent('/stats');
  });
  NL.retryHandlers.stats = load;
  NL.onLang(render);
  NL.renderFooter([]);
  $('st-root').innerHTML = NL.skeleton('cards');
  load();
  /* keep the numbers current while the page is open */
  setInterval(function () { if (!document.hidden && S.d && !S.d.access) load(); }, 60e3);
})();
