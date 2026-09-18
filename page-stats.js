/*
 * Owner's analytics console (/stats, noindex). Data: /api/admin/stats?days=N —
 * numbers only for accounts in ADMIN_EMAILS (anyone else gets { access }).
 * Counts come from the site's own anonymous beacon (stats.js): no cookies, no
 * IP addresses. Layout: admin sidebar + dashboard (KPIs with change vs the
 * previous period, traffic chart, last 30 minutes, pages, sources, audience,
 * weekday × hour heatmap), CSV export.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var t = NL.i18n.t, esc = NL.esc, IC = NL.icon;

  NL.i18n.add({
    en: {
      kicker: 'Admin', h1: 'Site <em>analytics</em>', sub: 'Private visit numbers for the site owner.',
      brand: 'Admin', consoleT: 'Analytics',
      navOverview: 'Overview', navLive: 'Right now', navTraffic: 'Traffic', navPages: 'Top pages', navSources: 'Sources', navAudience: 'Audience', navTimes: 'Busiest times',
      title: 'Analytics overview', subT: 'Last {n} days · Nepal Time', subToday: 'Today so far · Nepal Time', localTag: 'Local test copy — not the live site',
      today: 'Today', d7: '7 days', d30: '30 days', d90: '90 days', refresh: 'Refresh', exportCsv: 'Export CSV', updated: 'Updated {t} NPT',
      kVisitors: 'Visitors', kViews: 'Page views', kPpv: 'Pages per visitor', kNew: 'New visitors', newShare: '{p}% of visitors',
      vsPrev: 'vs previous {n} days', vsYday: 'vs yesterday', noPrev: 'No earlier data yet',
      liveH: 'Right now', liveViews: 'page views in the last 30 minutes', liveTop: 'Active pages', liveNone: 'No one is browsing right now.',
      minAgo: '30 min ago', now: 'now', liveSince: 'Counting since the server started at {t} NPT.',
      todayV: 'Visitors today', todayP: 'Page views today',
      trafficH: 'Traffic', trafficHToday: 'Page views by hour', visitors: 'Visitors', views: 'Page views',
      pagesH: 'Top pages', thPage: 'Page', thViews: 'Views', thShare: 'Share',
      srcH: 'Traffic sources', devH: 'Devices', langH: 'Language', nrH: 'New vs returning', newL: 'New', retL: 'Returning', totalL: 'total',
      timesH: 'Busiest times', timesSub: 'Page views by weekday and hour (Nepal Time)', less: 'Less', more: 'More',
      dev_m: 'Phone', dev_t: 'Tablet', dev_d: 'Computer', lang_en: 'English', lang_ne: 'नेपाली',
      src_direct: 'Direct (typed, bookmark or app)', 'src_other-search': 'Other search engines', 'src_other-sites': 'Other websites', otherL: 'Other',
      noData: 'No visits counted in this period yet — numbers appear as people use the site.', empty: 'Nothing yet',
      signedIn: 'Signed in as', privacy: 'No cookies · no IP addresses',
      lockH: 'Admin area', login: 'Log in with the owner account to see site analytics.', loginBtn: 'Log in',
      owner: 'This page is only for the site owner.', ownerSub: 'Your account doesn’t have admin access.',
      err: 'Analytics can’t be loaded right now.',
      note: 'Counted by Nepal Live itself: one anonymous signal per page view. No cookies, IP addresses or names are stored — each browser counts once a day as a visitor, using only a date it keeps. Search-engine robots and your own visits (while logged in) are not counted. Counting started {d}.'
    },
    ne: {
      kicker: 'एडमिन', h1: 'साइट <em>एनालिटिक्स</em>', sub: 'साइट मालिकका लागि गोप्य भ्रमण संख्या।',
      brand: 'एडमिन', consoleT: 'एनालिटिक्स',
      navOverview: 'सारांश', navLive: 'अहिले', navTraffic: 'ट्राफिक', navPages: 'शीर्ष पृष्ठ', navSources: 'स्रोत', navAudience: 'दर्शक', navTimes: 'व्यस्त समय',
      title: 'एनालिटिक्स सारांश', subT: 'पछिल्ला {n} दिन · नेपाल समय', subToday: 'आज अहिलेसम्म · नेपाल समय', localTag: 'स्थानीय परीक्षण प्रति — लाइभ साइट होइन',
      today: 'आज', d7: '७ दिन', d30: '३० दिन', d90: '९० दिन', refresh: 'रिफ्रेस', exportCsv: 'CSV डाउनलोड', updated: '{t} NPT मा अपडेट',
      kVisitors: 'आगन्तुक', kViews: 'पेज भ्यु', kPpv: 'प्रति आगन्तुक पृष्ठ', kNew: 'नयाँ आगन्तुक', newShare: 'आगन्तुकको {p}%',
      vsPrev: 'अघिल्ला {n} दिनको तुलनामा', vsYday: 'हिजोको तुलनामा', noPrev: 'अघिल्लो तथ्यांक छैन',
      liveH: 'अहिले', liveViews: 'पछिल्ला ३० मिनेटका पेज भ्यु', liveTop: 'सक्रिय पृष्ठ', liveNone: 'अहिले कोही ब्राउज गरिरहेका छैनन्।',
      minAgo: '३० मिनेटअघि', now: 'अहिले', liveSince: 'सर्भर {t} NPT मा सुरु भएदेखि गनिएको।',
      todayV: 'आजका आगन्तुक', todayP: 'आजका पेज भ्यु',
      trafficH: 'ट्राफिक', trafficHToday: 'घण्टाअनुसार पेज भ्यु', visitors: 'आगन्तुक', views: 'पेज भ्यु',
      pagesH: 'शीर्ष पृष्ठ', thPage: 'पृष्ठ', thViews: 'भ्यु', thShare: 'हिस्सा',
      srcH: 'ट्राफिकका स्रोत', devH: 'उपकरण', langH: 'भाषा', nrH: 'नयाँ र फर्केर आएका', newL: 'नयाँ', retL: 'फर्केर आएका', totalL: 'जम्मा',
      timesH: 'व्यस्त समय', timesSub: 'बार र घण्टाअनुसार पेज भ्यु (नेपाल समय)', less: 'कम', more: 'धेरै',
      dev_m: 'फोन', dev_t: 'ट्याब्लेट', dev_d: 'कम्प्युटर', lang_en: 'English', lang_ne: 'नेपाली',
      src_direct: 'सिधै (टाइप, बुकमार्क वा एप)', 'src_other-search': 'अन्य सर्च इन्जिन', 'src_other-sites': 'अन्य वेबसाइट', otherL: 'अन्य',
      noData: 'यस अवधिमा अहिलेसम्म भ्रमण गनिएको छैन — मानिसहरूले साइट प्रयोग गर्दै जाँदा संख्या देखिन्छ।', empty: 'अहिलेसम्म केही छैन',
      signedIn: 'लग इन:', privacy: 'कुकी छैन · आईपी ठेगाना छैन',
      lockH: 'एडमिन क्षेत्र', login: 'साइट एनालिटिक्स हेर्न मालिकको खाताबाट लग इन गर्नुहोस्।', loginBtn: 'लग इन',
      owner: 'यो पृष्ठ साइटका मालिकका लागि मात्र हो।', ownerSub: 'तपाईंको खातामा एडमिन पहुँच छैन।',
      err: 'एनालिटिक्स अहिले लोड हुन सकेन।',
      note: 'नेपाल लाइभ आफैंले गनेको: हरेक पेज भ्युमा एउटा बेनामी संकेत। कुकी, आईपी ठेगाना वा नाम राखिँदैन — हरेक ब्राउजर दिनमा एक पटक आगन्तुकका रूपमा गनिन्छ, त्यसले राख्ने मिति मात्र प्रयोग गरेर। सर्च इन्जिनका रोबोट र लग इन भएका बेला तपाईंकै भ्रमण गनिँदैन। गणना सुरु: {d}।'
    }
  });

  var SRC = {
    google: 'Google', bing: 'Bing', facebook: 'Facebook', instagram: 'Instagram', x: 'X (Twitter)', youtube: 'YouTube',
    tiktok: 'TikTok', reddit: 'Reddit', whatsapp: 'WhatsApp', viber: 'Viber', linkedin: 'LinkedIn'
  };
  var PAGES = { '/': 'Home', '/news': 'News', '/money': 'Markets', '/weather': 'Weather', '/alerts': 'Alerts', '/sports': 'Sports', '/tools': 'Tools',
    '/jobs': 'Jobs', '/events': 'Events', '/explore': 'Explore', '/search': 'Search', '/account': 'Account', '/calendar': 'Calendar',
    '/government': 'Government', '/roads': 'Roads', '/trending': 'Trending', '/earthquakes': 'Earthquakes', '/nepal-sports': 'Nepal sports',
    '/football': 'Football', '/cricket': 'Cricket', '/gold-price': 'Gold price today', '/nepse': 'NEPSE today', '/exchange-rate': 'Exchange rates today',
    '/fuel-price': 'Fuel prices today', '/nepali-date': 'Nepali date today', '/stats': 'Site analytics' };
  /* series colours — theme tokens only */
  var PAL = ['var(--link)', 'var(--flag-red)', 'var(--gold)', 'var(--up)', 'var(--info)', 'var(--text-3)'];
  var WD = { en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], ne: ['आइत', 'सोम', 'मंगल', 'बुध', 'बिहि', 'शुक्र', 'शनि'] };
  var NAV = [['sec-overview', 'grid', 'navOverview'], ['sec-live', 'bell', 'navLive'], ['sec-traffic', 'chart', 'navTraffic'],
    ['sec-pages', 'doc', 'navPages'], ['sec-sources', 'compass', 'navSources'], ['sec-audience', 'user', 'navAudience'], ['sec-times', 'calendar', 'navTimes']];

  var root = $('st-root');
  var S = { days: 30, d: null };
  var fmt = function (n) { return Number(n || 0).toLocaleString('en-IN'); };
  var pad2 = function (h) { return (h < 10 ? '0' : '') + h; };
  var pct = function (a, b) { return b ? Math.round(a / b * 100) : 0; };
  var dayLabel = function (day) { return NL.dfmt.day(Date.parse(day + 'T12:00:00+05:45')); };
  function pageName(p) {
    var wx = /^\/weather\/([a-z]+)$/.exec(p);
    return PAGES[p] || (wx ? 'Weather · ' + wx[1].charAt(0).toUpperCase() + wx[1].slice(1) : p);
  }
  function srcName(k) {
    if (SRC[k]) return SRC[k];
    if (k === 'direct' || k === 'other-search' || k === 'other-sites') return t('src_' + k);
    return k === '(other)' ? t('otherL') : k;
  }
  function niceStep(x) {
    if (x <= 1) return 1;
    var m = Math.pow(10, Math.floor(Math.log10(x)));
    return ([1, 2, 5, 10].filter(function (f) { return f * m >= x; })[0]) * m;
  }

  /* ------------------------------------------------------------ pieces */
  function delta(cur, prev) {
    if (!prev) return '<span class="adm-dl flat">' + esc(t('noPrev')) + '</span>';
    var p = Math.round((cur - prev) / prev * 100);
    var cls = p > 0 ? 'up' : p < 0 ? 'down' : 'flat';
    return '<span class="adm-dl ' + cls + '">' + (p > 0 ? '▲ ' : p < 0 ? '▼ ' : '') + Math.abs(p) + '%</span> '
      + esc(S.days === 1 ? t('vsYday') : t('vsPrev', { n: S.days }));
  }
  function spark(vals) {
    if (!vals || vals.length < 2) return '<div class="adm-kpi-pad"></div>';
    var max = Math.max.apply(null, vals) || 1, n = vals.length;
    var pts = vals.map(function (v, i) { return (i / (n - 1) * 100).toFixed(2) + ',' + (27 - v / max * 23).toFixed(2); });
    return '<svg class="adm-spark" viewBox="0 0 100 28" preserveAspectRatio="none" aria-hidden="true">'
      + '<path class="a" d="M0,28 L' + pts.join(' L') + ' L100,28Z"/><path class="l" d="M' + pts.join(' L') + '"/></svg>';
  }
  /* a number that counts up on first draw (see NL.countUp; still under reduced motion) */
  function num(v, dec) {
    return '<span class="adm-n" data-num="' + v + '" data-dec="' + (dec || 0) + '">' + (dec ? v.toFixed(dec) : fmt(v)) + '</span>';
  }
  function kpi(icon, label, value, dl, vals) {
    return '<div class="adm-kpi"><div class="adm-kpi-h"><span class="adm-ico">' + IC[icon] + '</span><span>' + esc(label) + '</span></div>'
      + '<div class="adm-kpi-v">' + value + '</div><div class="adm-kpi-d">' + dl + '</div>' + spark(vals) + '</div>';
  }
  function card(id, title, body, extra) {
    return '<section class="adm-card"' + (id ? ' id="' + id + '"' : '') + '><div class="adm-card-h"><h2>' + esc(title) + '</h2>' + (extra || '') + '</div>' + body + '</section>';
  }
  function side(viewer) {
    return '<aside class="adm-side"><div class="adm-brand"><span class="adm-badge">' + esc(t('brand')) + '</span><b>' + esc(t('consoleT')) + '</b></div>'
      + '<nav class="adm-nav" aria-label="' + esc(t('consoleT')) + '">'
      + NAV.map(function (n, i) { return '<a href="#' + n[0] + '"' + (i ? '' : ' class="on"') + '>' + IC[n[1]] + '<span>' + esc(t(n[2])) + '</span></a>'; }).join('')
      + '</nav><div class="adm-side-foot">' + (viewer ? '<span>' + esc(t('signedIn')) + '</span><b>' + esc(viewer) + '</b>' : '')
      + '<span class="adm-priv">' + IC.shield + esc(t('privacy')) + '</span></div></aside>';
  }
  function topBar(d) {
    return '<header class="adm-top" id="sec-overview"><div><span class="adm-crumb">Nepal Live · ' + esc(t('brand')) + '</span>'
      + '<h1 class="adm-title">' + esc(t('title')) + '</h1>'
      + '<p class="adm-subt">' + esc(S.days === 1 ? t('subToday') : t('subT', { n: S.days })) + (d.store === 'file' ? ' · <b>' + esc(t('localTag')) + '</b>' : '') + '</p></div>'
      + '<div class="adm-tools"><div class="seg" role="group" aria-label="Period">'
      + [1, 7, 30, 90].map(function (v) { return '<button type="button" data-days="' + v + '" aria-pressed="' + (v === S.days) + '">' + esc(t(v === 1 ? 'today' : 'd' + v)) + '</button>'; }).join('')
      + '</div><button class="btn adm-btn" type="button" data-refresh>' + IC.refresh + '<span>' + esc(t('refresh')) + '</span></button>'
      + '<button class="btn adm-btn" type="button" data-export>' + IC.download + '<span>' + esc(t('exportCsv')) + '</span></button></div>'
      + '<p class="adm-upd">' + esc(t('updated', { t: NL.nptHM(new Date(d.generatedAt)) })) + '</p></header>';
  }
  function livePanel(d) {
    var L = d.live || { v: 0, mins: [], pages: [], since: 0 };
    var mx = Math.max.apply(null, [1].concat(L.mins));
    var young = Date.now() - L.since < 30 * 60e3;
    return '<section class="adm-card adm-live" id="sec-live"><div class="adm-card-h"><h2><span class="adm-pulse" aria-hidden="true"></span>' + esc(t('liveH')) + '</h2></div>'
      + '<div><div class="adm-live-n">' + fmt(L.v) + '</div><div class="adm-live-s">' + esc(t('liveViews')) + '</div></div>'
      + '<div><div class="adm-mins" aria-hidden="true">' + L.mins.map(function (v) { return '<span style="height:' + Math.max(4, v / mx * 100) + '%"></span>'; }).join('') + '</div>'
      + '<div class="adm-mins-x"><span>' + esc(t('minAgo')) + '</span><span>' + esc(t('now')) + '</span></div></div>'
      + (L.pages.length
        ? '<div><h3 class="adm-sub">' + esc(t('liveTop')) + '</h3><ul class="adm-live-pages">' + L.pages.map(function (p) { return '<li><span>' + esc(pageName(p[0])) + '</span><b>' + fmt(p[1]) + '</b></li>'; }).join('') + '</ul></div>'
        : '<p class="adm-live-none">' + esc(t('liveNone')) + '</p>')
      + '<div class="adm-today"><div><span>' + esc(t('todayV')) + '</span><b>' + fmt(d.today.u) + '</b></div><div><span>' + esc(t('todayP')) + '</span><b>' + fmt(d.today.v) + '</b></div></div>'
      + (young ? '<p class="adm-fine">' + esc(t('liveSince', { t: NL.nptHM(new Date(L.since)) })) + '</p>' : '')
      + '</section>';
  }
  function pagesTable(list) {
    if (!list.length) return '<p class="adm-empty">' + esc(t('empty')) + '</p>';
    var total = list.reduce(function (a, x) { return a + x[1]; }, 0);
    return '<div class="adm-table-wrap"><table class="adm-table"><thead><tr><th>#</th><th>' + esc(t('thPage')) + '</th><th class="num">' + esc(t('thViews')) + '</th><th class="num">' + esc(t('thShare')) + '</th></tr></thead><tbody>'
      + list.slice(0, 10).map(function (x, i) {
        var p = pct(x[1], total);
        return '<tr><td class="rk">' + (i + 1) + '</td><td><a href="' + esc(x[0]) + '">' + esc(pageName(x[0])) + '</a><small>' + esc(x[0]) + '</small></td>'
          + '<td class="num">' + fmt(x[1]) + '</td><td class="num"><div class="adm-share"><span class="bar"><span style="width:' + Math.max(2, p) + '%"></span></span>' + p + '%</div></td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  function srcRows(list) {
    if (!list.length) return '<p class="adm-empty">' + esc(t('empty')) + '</p>';
    var total = list.reduce(function (a, x) { return a + x[1]; }, 0);
    return '<ul class="adm-list">' + list.map(function (x, i) {
      var p = pct(x[1], total), c = PAL[i % PAL.length];
      return '<li><i style="background:' + c + '"></i><span class="nm">' + esc(srcName(x[0])) + '</span><span class="n">' + fmt(x[1]) + ' <small>' + p + '%</small></span>'
        + '<span class="bar"><span style="width:' + Math.max(2, p) + '%;background:' + c + '"></span></span></li>';
    }).join('') + '</ul>';
  }
  function donut(items, centre) {
    items = items.filter(function (x) { return x[1] > 0; });
    var total = items.reduce(function (a, x) { return a + x[1]; }, 0);
    if (!total) return '<p class="adm-empty">' + esc(t('empty')) + '</p>';
    var off = 25, segs = '';
    items.forEach(function (x, i) {
      var p = x[1] / total * 100;
      segs += '<circle r="15.915" cx="21" cy="21" fill="none" stroke-width="5" style="stroke:' + PAL[i % PAL.length] + '" stroke-dasharray="' + p.toFixed(3) + ' ' + (100 - p).toFixed(3) + '" stroke-dashoffset="' + off.toFixed(3) + '"/>';
      off -= p;
    });
    return '<div class="adm-donut"><svg viewBox="0 0 42 42" role="img" aria-label="' + esc(items.map(function (x) { return x[0] + ' ' + pct(x[1], total) + '%'; }).join(', ')) + '">'
      + '<circle class="track" r="15.915" cx="21" cy="21" fill="none" stroke-width="5"/>' + segs
      + '<text x="21" y="21.5" class="dn">' + fmt(total) + '</text><text x="21" y="26.5" class="dc">' + esc(centre) + '</text></svg>'
      + '<ul class="adm-legend">' + items.map(function (x, i) {
        return '<li><i style="background:' + PAL[i % PAL.length] + '"></i><span>' + esc(x[0]) + '</span><b>' + pct(x[1], total) + '%</b></li>';
      }).join('') + '</ul></div>';
  }
  function heatmap(heat) {
    var max = 1;
    heat.forEach(function (r) { r.forEach(function (v) { if (v > max) max = v; }); });
    var wd = WD[NL.lang() === 'ne' ? 'ne' : 'en'], h, html = '<div class="adm-heat-wrap"><div class="adm-heat"><span></span>';
    for (h = 0; h < 24; h++) html += '<span class="hx">' + (h % 3 ? '' : pad2(h)) + '</span>';
    heat.forEach(function (row, r) {
      html += '<span class="hy">' + esc(wd[r]) + '</span>';
      row.forEach(function (v, hh) { html += '<span class="hc" style="--k:' + Math.round(v / max * 100) + '%" title="' + esc(wd[r] + ' ' + pad2(hh) + ':00 — ' + fmt(v)) + '"></span>'; });
    });
    html += '</div></div><div class="adm-heat-leg"><span>' + esc(t('less')) + '</span>'
      + [0, 25, 50, 75, 100].map(function (k) { return '<span class="hc" style="--k:' + k + '%"></span>'; }).join('') + '<span>' + esc(t('more')) + '</span></div>';
    return html;
  }
  function lockCard(a) {
    return '<div class="adm-lockcard"><span class="adm-ico">' + IC.shield + '</span><span class="adm-badge">' + esc(t('brand')) + '</span>'
      + '<h1>' + esc(t('lockH')) + '</h1><p>' + esc(t(a === 'login' ? 'login' : 'owner')) + '</p>'
      + (a === 'login' ? '<button class="btn btn-primary" type="button" data-login>' + esc(t('loginBtn')) + '</button>' : '<p class="small muted">' + esc(t('ownerSub')) + '</p>')
      + '</div>';
  }

  /* ------------------------------------------------------ traffic chart */
  /* drawn at the box's real width (crisp text on phones), redrawn on resize */
  function drawChart() {
    var box = $('adm-chart');
    if (!box || !S.d || !S.d.days) return;
    var hourly = S.days === 1;
    var pts = hourly
      ? S.d.hours.map(function (v, h) { return { label: pad2(h) + ':00', v: v, u: null }; })
      : S.d.days.map(function (x) { return { label: dayLabel(x.day), v: x.v, u: x.u }; });
    /* measure the empty box: it stretches to the row (beside the "right now" panel), so the chart fills the card */
    box.innerHTML = '';
    var n = pts.length, W = Math.max(260, box.clientWidth), H = Math.max(W < 520 ? 210 : 250, box.clientHeight);
    var L = 40, R = 12, T = 12, B = 28, cw = W - L - R, ch = H - T - B, hi = 1;
    pts.forEach(function (p) { hi = Math.max(hi, p.v, p.u || 0); });
    var step = niceStep(hi / 4), max = step * 4;
    var X = function (i) { return L + (n === 1 ? cw / 2 : i * cw / (n - 1)); };
    var Y = function (v) { return T + ch * (1 - v / max); };
    var s = '', k, j;
    for (k = 0; k <= 4; k++) {
      var gy = Y(step * k);
      s += '<line class="g" x1="' + L + '" x2="' + (W - R) + '" y1="' + gy.toFixed(1) + '" y2="' + gy.toFixed(1) + '"/><text class="yl" x="' + (L - 8) + '" y="' + (gy + 4).toFixed(1) + '">' + fmt(step * k) + '</text>';
    }
    var line = function (key) { return pts.map(function (p, i) { return (i ? 'L' : 'M') + X(i).toFixed(1) + ',' + Y(p[key] || 0).toFixed(1); }).join(''); };
    var area = function (key) { return line(key) + 'L' + X(n - 1).toFixed(1) + ',' + Y(0).toFixed(1) + 'L' + X(0).toFixed(1) + ',' + Y(0).toFixed(1) + 'Z'; };
    s += '<path class="av" d="' + area('v') + '"/><path class="lv" d="' + line('v') + '"/>';
    if (!hourly) s += '<path class="au" d="' + area('u') + '"/><path class="lu" d="' + line('u') + '"/>';
    if (n <= 10) pts.forEach(function (p, i) { s += '<circle class="pv" r="3" cx="' + X(i).toFixed(1) + '" cy="' + Y(p.v).toFixed(1) + '"/>' + (hourly ? '' : '<circle class="pu" r="3" cx="' + X(i).toFixed(1) + '" cy="' + Y(p.u).toFixed(1) + '"/>'); });
    var cnt = Math.min(n, W < 520 ? 3 : hourly ? 7 : 5), seen = {};
    for (j = 0; j < cnt; j++) {
      var i = cnt === 1 ? 0 : Math.round(j * (n - 1) / (cnt - 1));
      if (seen[i]) continue;
      seen[i] = 1;
      s += '<text class="xl" x="' + X(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="' + (n === 1 ? 'middle' : i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle') + '">' + esc(pts[i].label) + '</text>';
    }
    s += '<line class="hl" id="adm-hl" y1="' + T + '" y2="' + (T + ch) + '" x1="-99" x2="-99"/><circle class="dv" id="adm-dv" r="5" cx="-99" cy="-99"/>'
      + (hourly ? '' : '<circle class="du" id="adm-du" r="5" cx="-99" cy="-99"/>');
    box.innerHTML = '<svg width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" role="img" aria-label="' + esc(t(hourly ? 'trafficHToday' : 'trafficH')) + '">' + s + '</svg>'
      + '<div class="adm-tip" id="adm-tip" hidden></div>';
    var svg = box.firstChild, tip = $('adm-tip');
    var set = function (id, x, y) { var el = $(id); if (el) { if (el.tagName === 'line') { el.setAttribute('x1', x); el.setAttribute('x2', x); } else { el.setAttribute('cx', x); el.setAttribute('cy', y); } } };
    box.onpointermove = function (e) {
      var r = svg.getBoundingClientRect();
      var i = n === 1 ? 0 : Math.max(0, Math.min(n - 1, Math.round((e.clientX - r.left - L) / cw * (n - 1))));
      var p = pts[i], x = X(i).toFixed(1);
      set('adm-hl', x); set('adm-dv', x, Y(p.v).toFixed(1));
      if (!hourly) set('adm-du', x, Y(p.u).toFixed(1));
      tip.innerHTML = '<b>' + esc(p.label) + '</b>' + (hourly ? '' : '<span><i class="lu"></i>' + esc(t('visitors')) + ' ' + fmt(p.u) + '</span>')
        + '<span><i class="lv"></i>' + esc(t('views')) + ' ' + fmt(p.v) + '</span>';
      tip.hidden = false;
      tip.style.left = Math.min(W - 70, Math.max(70, X(i))) + 'px';
    };
    box.onpointerleave = function () { tip.hidden = true; set('adm-hl', -99); set('adm-dv', -99, -99); set('adm-du', -99, -99); };
  }

  /* ------------------------------------------------------------ render */
  function render() {
    var d = S.d;
    if (!d) return;
    if (d.access) { root.className = 'adm adm-lock'; root.innerHTML = lockCard(d.access); return; }
    root.className = 'adm';
    var tt = d.totals, pv = d.prev || { v: 0, u: 0, n: 0, r: 0 }, days = d.days, hourly = S.days === 1;
    var ppv = tt.u ? tt.v / tt.u : 0, pppv = pv.u ? pv.v / pv.u : 0;
    var col = function (key) { return hourly ? [] : days.map(function (x) { return x[key] || 0; }); };
    var since = d.since ? NL.dfmt.dayY(Date.parse(d.since + 'T12:00:00+05:45')) : '—';
    var byCount = function (a, b) { return b[1] - a[1]; };
    var dev = ['m', 't', 'd'].map(function (k) { return [t('dev_' + k), d.dev[k] || 0]; }).sort(byCount);
    var lang = ['ne', 'en'].map(function (k) { return [t('lang_' + k), d.lang[k] || 0]; }).sort(byCount);
    root.innerHTML = side(d.viewer) + '<div class="adm-main">' + topBar(d)
      + (tt.v ? '' : '<p class="adm-banner">' + esc(t('noData')) + '</p>')
      + '<div class="adm-kpis">'
      + kpi('user', t('kVisitors'), num(tt.u), delta(tt.u, pv.u), col('u'))
      + kpi('doc', t('kViews'), num(tt.v), delta(tt.v, pv.v), hourly ? d.hours : col('v'))
      + kpi('grid', t('kPpv'), num(ppv, 1), delta(ppv, pppv), hourly ? [] : days.map(function (x) { return x.u ? x.v / x.u : 0; }))
      + kpi('compass', t('kNew'), num(tt.n) + ' <small>' + esc(t('newShare', { p: pct(tt.n, tt.n + tt.r) })) + '</small>', delta(tt.n, pv.n), col('n'))
      + '</div>'
      + '<div class="adm-row">'
      + card('sec-traffic', t(hourly ? 'trafficHToday' : 'trafficH'), '<div class="adm-chart" id="adm-chart"></div>',
        '<div class="adm-legend-top">' + (hourly ? '' : '<span><i class="lu"></i>' + esc(t('visitors')) + '</span>') + '<span><i class="lv"></i>' + esc(t('views')) + '</span></div>')
      + livePanel(d) + '</div>'
      /* the tall pages table beside sources + new-vs-returning stacked, so neither side leaves a blank block */
      + '<div class="adm-row even">' + card('sec-pages', t('pagesH'), pagesTable(d.pages))
      + '<div class="adm-stack">' + card('sec-sources', t('srcH'), srcRows(d.src)) + card('', t('nrH'), donut([[t('newL'), tt.n], [t('retL'), tt.r]], t('kVisitors'))) + '</div></div>'
      + '<div class="adm-row even" id="sec-audience">' + card('', t('devH'), donut(dev, t('totalL'))) + card('', t('langH'), donut(lang, t('totalL'))) + '</div>'
      + card('sec-times', t('timesH'), heatmap(d.heat || []), '<small>' + esc(t('timesSub')) + '</small>')
      + '<p class="adm-note">' + esc(t('note', { d: since })) + '</p></div>';
    drawChart();
    /* count the headline numbers up once, not on every 30-second refresh */
    if (!S.counted && NL.countUp) {
      S.counted = true;
      root.querySelectorAll('.adm-n').forEach(function (el) {
        var to = +el.getAttribute('data-num'), dec = +el.getAttribute('data-dec') || 0;
        NL.countUp(el, to, function (v) { return dec ? v.toFixed(dec) : fmt(Math.round(v)); }, 0);
      });
    }
  }

  function load() {
    var btn = root.querySelector('[data-refresh]');
    if (btn) btn.classList.add('is-busy');
    return NL.api('/api/admin/stats?days=' + S.days).then(function (d) {
      S.d = d;
      render();
      NL.feed('stats', true);
    }).catch(function () {
      if (btn) btn.classList.remove('is-busy');
      if (!S.d) { root.className = 'adm adm-lock'; root.innerHTML = NL.errorState(t('err'), { mod: 'stats' }); }
      NL.feed('stats', false);
    });
  }
  function exportCsv() {
    var d = S.d, rows;
    if (!d || !d.days) return;
    rows = S.days === 1
      ? [['hour_npt', 'page_views']].concat(d.hours.map(function (v, h) { return [pad2(h) + ':00', v]; }))
      : [['date', 'visitors', 'page_views', 'new_visitors']].concat(d.days.map(function (x) { return [x.day, x.u, x.v, x.n || 0]; }));
    var url = URL.createObjectURL(new Blob([rows.map(function (r) { return r.join(','); }).join('\n') + '\n'], { type: 'text/csv' }));
    var a = document.createElement('a');
    a.href = url;
    a.download = 'nepal-live-visits-' + (S.days === 1 ? 'today' : S.days + 'd') + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-days]');
    if (b) { S.days = +b.getAttribute('data-days'); load(); return; }
    if (e.target.closest('[data-refresh]')) { load(); return; }
    if (e.target.closest('[data-export]')) { exportCsv(); return; }
    if (e.target.closest('[data-login]')) { location.href = '/account?tab=login&next=' + encodeURIComponent('/stats'); return; }
    var a = e.target.closest('.adm-nav a');
    if (a) root.querySelectorAll('.adm-nav a').forEach(function (x) { x.classList.toggle('on', x === a); });
  });
  var rT;
  window.addEventListener('resize', function () { clearTimeout(rT); rT = setTimeout(drawChart, 150); });
  NL.retryHandlers.stats = load;
  NL.onLang(render);
  NL.renderFooter([]);
  root.innerHTML = NL.skeleton('cards');
  load();
  /* keep the numbers (and "right now") current while the page is open */
  setInterval(function () { if (!document.hidden && S.d && !S.d.access) load(); }, 30e3);
})();
