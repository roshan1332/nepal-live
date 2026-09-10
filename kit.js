/*
 * Nepal Live — kit: shared client helpers for the section pages and homepage.
 *
 *   NL.i18n   — page dictionaries; translates [data-t] (text), [data-th] (trusted
 *               HTML from our own dictionaries only), [data-tp] (placeholder)
 *   NL.api    — same-origin JSON fetch that throws on HTTP errors
 *   NL.fmt / NL.signed / NL.arrow / NL.dirOf — number formatting
 *   NL.spark  — area sparkline
 *   NL.fresh  — the live-information language: LIVE only for measurements that
 *               are genuinely live; "Updated / Issued / Reported x ago" otherwise
 *   NL.story  — news renderers (featured, row, card, compact)
 *   NL.alertCard, NL.levels — alert rendering shared by homepage, Alerts, Roads
 *
 * Like app.js it hangs everything off window.NL and declares nothing global.
 */
(function () {
  'use strict';
  var NL = window.NL;
  var esc = NL.esc;
  var ne = function () { return NL.lang() === 'ne'; };

  /* ------------------------------------------------------------------ i18n */
  var DICT = { en: {}, ne: {} };
  function t(k, vars) {
    var v = DICT[NL.lang()][k];
    if (v == null) v = DICT.en[k];
    if (v == null) return k;
    if (vars) v = String(v).replace(/\{(\w+)\}/g, function (_, n) { return vars[n] != null ? vars[n] : ''; });
    return v;
  }
  var pendingApply = false;
  NL.i18n = {
    /* page scripts add their strings after kit.js has already painted, so re-apply once they're in */
    add: function (d) {
      ['en', 'ne'].forEach(function (l) { Object.assign(DICT[l], (d && d[l]) || {}); });
      if (!pendingApply) { pendingApply = true; Promise.resolve().then(function () { pendingApply = false; NL.i18n.apply(); }); }
    },
    t: t,
    apply: function (root) {
      root = root || document;
      var has = function (k) { return DICT[NL.lang()][k] != null || DICT.en[k] != null; };
      root.querySelectorAll('[data-t]').forEach(function (el) { var k = el.getAttribute('data-t'); if (has(k)) el.textContent = t(k); });
      root.querySelectorAll('[data-th]').forEach(function (el) {
        var k = el.getAttribute('data-th');
        if (!has(k)) return;
        el.innerHTML = t(k);
        if (el.hasAttribute('aria-label')) el.setAttribute('aria-label', el.textContent);
      });
      root.querySelectorAll('[data-tp]').forEach(function (el) { var k = el.getAttribute('data-tp'); if (has(k)) el.setAttribute('placeholder', t(k)); });
    }
  };
  NL.i18n.add({
    en: {
      refresh: 'Refresh', all: 'All', readOrig: 'Read original', readOrigArticle: 'Read original article',
      ended: 'Ended', unavailable: 'Data currently unavailable.', tryAgain: 'Try again', source: 'Source',
      mayOutdated: 'Over a week old — may be outdated',
      lv_emergency: 'Emergency', lv_warning: 'Warning', lv_advisory: 'Advisory', lv_info: 'Information',
      cat_flood: 'Flood', cat_rain: 'Heavy rainfall', cat_road: 'Road', cat_air: 'Air pollution', cat_earthquake: 'Earthquake',
      cat_storm: 'Storm', cat_fire: 'Fire', cat_drought: 'Drought', cat_landslide: 'Landslide', cat_other: 'Other',
      tp_all: 'All', tp_nepal: 'Nepal', tp_politics: 'Politics', tp_business: 'Business', tp_technology: 'Technology',
      tp_sports: 'Sports', tp_entertainment: 'Entertainment', tp_world: 'World'
    },
    ne: {
      refresh: 'ताजा गर्नुहोस्', all: 'सबै', readOrig: 'मूल समाचार पढ्नुहोस्', readOrigArticle: 'मूल समाचार पढ्नुहोस्',
      ended: 'सकियो', unavailable: 'तथ्यांक अहिले उपलब्ध छैन।', tryAgain: 'फेरि प्रयास गर्नुहोस्', source: 'स्रोत',
      mayOutdated: 'एक हप्ताभन्दा पुरानो — पुरानो हुन सक्छ',
      lv_emergency: 'आपतकालीन', lv_warning: 'चेतावनी', lv_advisory: 'सतर्कता', lv_info: 'जानकारी',
      cat_flood: 'बाढी', cat_rain: 'भारी वर्षा', cat_road: 'सडक', cat_air: 'वायु प्रदूषण', cat_earthquake: 'भूकम्प',
      cat_storm: 'आँधी', cat_fire: 'आगलागी', cat_drought: 'खडेरी', cat_landslide: 'पहिरो', cat_other: 'अन्य',
      tp_all: 'सबै', tp_nepal: 'समाचार', tp_politics: 'राजनीति', tp_business: 'व्यापार', tp_technology: 'प्रविधि',
      tp_sports: 'खेलकुद', tp_entertainment: 'मनोरञ्जन', tp_world: 'विश्व'
    }
  });

  /* Run a page's render on load and again whenever the language changes. */
  NL.page = NL.page || document.documentElement.getAttribute('data-page');
  NL.onLang = function (fn) {
    document.addEventListener('nl:lang', function () { NL.i18n.apply(); fn(); });
  };

  /* ---------------------------------------------------------------- data */
  NL.api = function (path) {
    return fetch(path, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    });
  };

  /* ----------------------------------------------------------- numbers */
  NL.fmt = function (n, d) {
    if (d == null) d = 2;
    return Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
  };
  NL.signed = function (n, d) { return (n > 0 ? '+' : n < 0 ? '−' : '') + NL.fmt(Math.abs(n), d); };
  NL.arrow = function (n) { return n > 0 ? '▲' : n < 0 ? '▼' : '•'; };
  NL.dirOf = function (n) { return n > 0 ? 'up' : n < 0 ? 'down' : 'flat'; };

  var sparkId = 0;
  NL.spark = function (vals, o) {
    o = o || {};
    var w = o.w || 200, h = o.h || 40;
    vals = (vals || []).filter(function (v) { return isFinite(v); });
    if (vals.length < 2) return '';
    var min = Math.min.apply(null, vals), max = Math.max.apply(null, vals);
    var flat = max - min < 1e-12, span = flat ? 1 : max - min, pad = 3;
    var xy = vals.map(function (v, i) { return [i * w / (vals.length - 1), flat ? h / 2 : pad + (1 - (v - min) / span) * (h - 2 * pad)]; });
    var d = xy.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1); }).join(' ');
    var trend = o.dir || (vals[vals.length - 1] >= vals[0] ? 'up' : 'down');
    var col = flat ? 'var(--text-3)' : trend === 'down' ? 'var(--down)' : trend === 'info' ? 'var(--info)' : 'var(--up)';
    var id = 'ks' + (++sparkId);
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none" aria-hidden="true">'
      + '<defs><linearGradient id="' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:' + col + ';stop-opacity:.2"/><stop offset="1" style="stop-color:' + col + ';stop-opacity:0"/></linearGradient></defs>'
      + '<path d="' + d + ' L' + w + ',' + h + ' L0,' + h + ' Z" style="fill:url(#' + id + ')"/>'
      + '<path d="' + d + '" style="fill:none;stroke:' + col + '" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
  };

  /* --------------------------------------------------------- freshness */
  /* kind: 'live' (a measurement that is live right now), 'updated' (a feed we
     fetched), 'issued' (an official alert's issue time), 'reported' (a report). */
  NL.fresh = function (kind, ts) {
    var t0 = Date.parse(ts);
    var stamp = isFinite(t0) ? '<span class="fresh-t" data-fresh="' + (kind === 'live' ? 'measured' : kind) + '" data-ts="' + t0 + '">'
      + esc(NL.freshText(kind === 'live' ? 'measured' : kind, t0)) + '</span>' : '';
    if (kind === 'live') return '<span class="fresh live"><i aria-hidden="true"></i>' + esc(NL.s('live')) + '</span>' + stamp;
    return stamp;
  };

  /* ----------------------------------------------------------- stories */
  var srcName = function (s) { return String(s || 'News').replace(/\s*\((EN|NE)\)\s*$/i, ''); };
  var isNe = function (s) { return /[ऀ-ॿ]/.test(String(s || '')); };
  var langAttr = function (s) { return isNe(s) ? ' lang="ne"' : ''; };
  var topic = function (k) { return t('tp_' + (k || 'nepal')); };
  NL.srcName = srcName;
  NL.langAttr = langAttr;
  NL.topicLabel = topic;

  /* A thumbnail that fails to load takes its frame with it. */
  NL.imgFail = function (img) {
    var card = img.closest('[data-story]');
    var frame = img.parentNode;
    if (frame && frame !== card) frame.remove(); else img.remove();
    if (!card) return;
    card.classList.add(card.classList.contains('row-story') || card.classList.contains('cp-story') ? 'no-img' : 'text-only');
  };
  var img = function (src, eager) {
    return '<img src="' + esc(src) + '" alt="" ' + (eager ? 'fetchpriority="high"' : 'loading="lazy"')
      + ' decoding="async" referrerpolicy="no-referrer" onerror="NL.imgFail(this)">';
  };
  var ts = function (i) { return Date.parse(i.pubDate || i.time) || Date.now(); };
  var meta = function (i, orig) {
    return '<div class="meta"><span class="src">' + esc(srcName(i.source)) + '</span><span class="sep">·</span>'
      + '<span data-ago="' + ts(i) + '">' + esc(NL.ago(ts(i))) + '</span>'
      + (orig ? '<span class="read-orig">' + esc(t('readOrig')) + ' <span>↗</span></span>' : '') + '</div>';
  };
  var link = function (i) { return 'href="' + esc(i.link) + '" target="_blank" rel="noopener noreferrer" data-story'; };
  NL.story = {
    featured: function (f) {
      return '<a class="feature-card' + (f.image ? '' : ' text-only') + '" ' + link(f) + '>'
        + (f.image ? '<div class="f-media">' + img(f.image, true) + '</div>' : '')
        + '<div class="f-body"><span class="cat">' + esc(topic(f.topic)) + '</span>'
        + '<h3 class="f-title"' + langAttr(f.title) + '>' + esc(f.title) + '</h3>'
        + (f.summary ? '<p class="f-sum"' + langAttr(f.summary) + '>' + esc(f.summary) + '</p>' : '')
        + meta(f, true) + '</div></a>';
    },
    row: function (i, idx) {
      return '<a class="row-story' + (i.image ? '' : ' no-img') + '" style="--i:' + (idx || 0) + '" ' + link(i) + '>'
        + '<div><span class="cat">' + esc(topic(i.topic)) + '</span><h3 class="rs-title"' + langAttr(i.title) + '>' + esc(i.title) + '</h3>' + meta(i) + '</div>'
        + (i.image ? '<div class="rs-img">' + img(i.image) + '</div>' : '') + '</a>';
    },
    card: function (i, idx) {
      return '<a class="card-story' + (i.image ? '' : ' text-only') + '" style="--i:' + ((idx || 0) % 9) + '" ' + link(i) + '>'
        + (i.image ? '<div class="cs-img">' + img(i.image) + '</div>' : '')
        + '<div class="cs-body"><span class="cat">' + esc(topic(i.topic)) + '</span>'
        + '<h3 class="cs-title"' + langAttr(i.title) + '>' + esc(i.title) + '</h3>'
        + (!i.image && i.summary ? '<p class="cs-sum"' + langAttr(i.summary) + '>' + esc(i.summary) + '</p>' : '')
        + meta(i) + '</div></a>';
    },
    /* dense list row for the News page: headline, standfirst, publisher, and an
       explicit "Read original article" so it's clear where the link goes */
    compact: function (i, idx) {
      /* the save button sits beside the link, not inside it (no buttons inside <a>) */
      return '<div class="cp-wrap"><a class="cp-story' + (i.image ? '' : ' no-img') + '" style="--i:' + ((idx || 0) % 12) + '" ' + link(i) + '>'
        + '<div class="cp-body"><div class="cp-top"><span class="cat">' + esc(topic(i.topic)) + '</span></div>'
        + '<h3 class="cp-title"' + langAttr(i.title) + '>' + esc(i.title) + '</h3>'
        + (i.summary ? '<p class="cp-sum"' + langAttr(i.summary) + '>' + esc(i.summary) + '</p>' : '')
        + '<div class="meta"><span class="src">' + esc(srcName(i.source)) + '</span><span class="sep">·</span>'
        + '<span data-ago="' + ts(i) + '">' + esc(NL.ago(ts(i))) + '</span>'
        + '<span class="read-orig">' + esc(t('readOrigArticle')) + ' <span>→</span></span></div></div>'
        + (i.image ? '<div class="cp-img">' + img(i.image) + '</div>' : '') + '</a>'
        + NL.saveBtn({ type: 'news', id: i.link, title: i.title, url: i.link, sub: srcName(i.source), img: i.image || '' }) + '</div>';
    }
  };

  /* ------------------------------------------------------------- alerts */
  NL.levels = ['emergency', 'warning', 'advisory', 'info'];
  NL.levelBadge = function (level) {
    return '<span class="lv-badge lv-' + esc(level) + '"><i aria-hidden="true"></i>' + esc(t('lv_' + level)) + '</span>';
  };
  var PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>';
  NL.alertCard = function (a, o) {
    o = o || {};
    var title = ne() && a.titleNe ? a.titleNe : a.title;
    /* a gauge reading only earns LIVE while it is fresh */
    var kind = a.kind === 'live' ? (Date.now() - Date.parse(a.time) < 90 * 60e3 ? 'live' : 'measured')
      : a.kind === 'reported' ? 'reported' : 'issued';
    var endTs = Date.parse(a.ends);
    return '<article class="alert-card lv-' + esc(a.level) + (a.active === false ? ' is-ended' : '') + (o.compact ? ' compact' : '') + '">'
      + '<div class="ac-top">' + NL.levelBadge(a.level) + '<span class="ac-cat">' + esc(t('cat_' + (a.category || 'other'))) + '</span>'
      + (a.active === false ? '<span class="ac-ended">' + esc(t('ended')) + (isFinite(endTs) ? ' · <span data-ago="' + endTs + '">' + esc(NL.ago(endTs)) + '</span>' : '') + '</span>' : '')
      + '</div>'
      + '<h3 class="ac-title"' + langAttr(title) + '>' + esc(title) + '</h3>'
      + (a.description && !o.compact ? '<p class="ac-desc">' + esc(a.description) + '</p>' : '')
      + '<div class="ac-meta">'
      + (a.location ? '<span class="ac-loc">' + PIN + esc(a.location) + '</span>' : '')
      + '<span class="ac-when">' + NL.fresh(kind, a.time) + '</span>'
      + (a.stale ? '<span class="ac-stale">' + esc(t('mayOutdated')) + '</span>' : '')
      + (a.source ? '<a class="ac-src" href="' + esc(a.source.url) + '" target="_blank" rel="noopener noreferrer">' + esc(t('source')) + ': ' + esc(a.source.name) + ' ↗</a>' : '')
      + '</div></article>';
  };

  /* a list of data sources with an ok/failed dot, for page footers */
  NL.sourceList = function (list) {
    return '<ul class="src-ul">' + (list || []).map(function (s) {
      return '<li><span class="src-dot ' + (s.ok === false ? 'bad' : 'ok') + '" aria-hidden="true"></span>'
        + (s.url ? '<a href="' + esc(s.url) + '"' + (/^https?:/.test(s.url) ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + esc(s.name) + (/^https?:/.test(s.url) ? ' ↗' : '') + '</a>' : esc(s.name))
        + (s.ok === false ? ' <span class="src-bad">' + esc(t('unavailable')) + '</span>' : '') + '</li>';
    }).join('') + '</ul>';
  };

  /* ---------------------------------------------------------------- geo */
  NL.KTM = [27.7172, 85.324];
  NL.km = function (lat1, lon1, lat2, lon2) {
    var r = function (d) { return d * Math.PI / 180; };
    var a = Math.pow(Math.sin(r(lat2 - lat1) / 2), 2) + Math.cos(r(lat1)) * Math.cos(r(lat2)) * Math.pow(Math.sin(r(lon2 - lon1) / 2), 2);
    return 2 * 6371 * Math.asin(Math.sqrt(a));
  };

  /* ------------------------------------------------------------- dates */
  var TZ = 'Asia/Kathmandu';
  var dtf = function (opts) { return new Intl.DateTimeFormat(ne() ? 'ne-NP' : 'en-GB', Object.assign({ timeZone: TZ }, opts)); };
  NL.dfmt = {
    day: function (ms) { return dtf({ day: 'numeric', month: 'short' }).format(ms); },
    dayY: function (ms) { return dtf({ day: 'numeric', month: 'short', year: 'numeric' }).format(ms); },
    month: function (ms) { return dtf({ month: 'short', year: 'numeric' }).format(ms); },
    hour: function (ms) { return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(ms); },
    weekday: function (ms) { return dtf({ weekday: 'short' }).format(ms); }
  };

  /* ------------------------------------------------------ weather codes */
  var WMO = {
    en: { 0: ['Clear sky', '☀️'], 1: ['Mainly clear', '🌤️'], 2: ['Partly cloudy', '⛅'], 3: ['Overcast', '☁️'], 45: ['Fog', '🌫️'], 48: ['Icy fog', '🌫️'], 51: ['Light drizzle', '🌦️'], 53: ['Drizzle', '🌦️'], 55: ['Heavy drizzle', '🌧️'], 61: ['Light rain', '🌦️'], 63: ['Rain', '🌧️'], 65: ['Heavy rain', '🌧️'], 66: ['Freezing rain', '🌧️'], 71: ['Light snow', '🌨️'], 73: ['Snow', '🌨️'], 75: ['Heavy snow', '❄️'], 80: ['Rain showers', '🌦️'], 81: ['Showers', '🌧️'], 82: ['Heavy showers', '⛈️'], 85: ['Snow showers', '🌨️'], 95: ['Thunderstorm', '⛈️'], 96: ['Storm + hail', '⛈️'], 99: ['Storm + hail', '⛈️'] },
    ne: { 0: ['सफा आकाश', '☀️'], 1: ['प्रायः सफा', '🌤️'], 2: ['आंशिक बादल', '⛅'], 3: ['बदली', '☁️'], 45: ['कुहिरो', '🌫️'], 48: ['कुहिरो', '🌫️'], 51: ['हल्का झरी', '🌦️'], 53: ['झरी', '🌦️'], 55: ['भारी झरी', '🌧️'], 61: ['हल्का पानी', '🌦️'], 63: ['पानी', '🌧️'], 65: ['भारी पानी', '🌧️'], 66: ['असिना पानी', '🌧️'], 71: ['हल्का हिउँ', '🌨️'], 73: ['हिउँ', '🌨️'], 75: ['भारी हिउँ', '❄️'], 80: ['पानीको झरी', '🌦️'], 81: ['झरी', '🌧️'], 82: ['भारी झरी', '⛈️'], 85: ['हिउँ झरी', '🌨️'], 95: ['आँधीबेहरी', '⛈️'], 96: ['असिनासहित आँधी', '⛈️'], 99: ['असिनासहित आँधी', '⛈️'] }
  };
  NL.wx = function (code) {
    var m = (WMO[NL.lang()] || WMO.en)[code] || WMO.en[code] || ['—', '🌡️'];
    return { desc: m[0], icon: m[1] };
  };

  /* --------------------------------------------------------------- AQI */
  var AQI_BANDS = [
    { max: 50, c: '#2fb36d', en: 'Good', ne: 'राम्रो', tipEn: 'Air quality is satisfactory; little or no risk.', tipNe: 'हावाको गुणस्तर सन्तोषजनक; जोखिम नगण्य।' },
    { max: 100, c: '#e3b008', en: 'Moderate', ne: 'मध्यम', tipEn: 'Acceptable; unusually sensitive people should limit prolonged outdoor exertion.', tipNe: 'स्वीकार्य; अत्यन्त संवेदनशील व्यक्तिले लामो बाहिरी परिश्रम सीमित गर्दा राम्रो।' },
    { max: 150, c: '#ea7a1e', en: 'Unhealthy for sensitive groups', ne: 'संवेदनशील समूहका लागि अस्वस्थ', tipEn: 'Children, older adults and people with heart or lung disease should reduce outdoor activity.', tipNe: 'बालबालिका, वृद्ध र मुटु/फोक्सोका बिरामीले बाहिरी गतिविधि घटाउनुपर्छ।' },
    { max: 200, c: '#e0344e', en: 'Unhealthy', ne: 'अस्वस्थ', tipEn: 'Everyone may feel effects; limit outdoor exertion.', tipNe: 'सबैले असर महसुस गर्न सक्छन्; बाहिरी परिश्रम सीमित गर्नुहोस्।' },
    { max: 300, c: '#9b59b6', en: 'Very unhealthy', ne: 'अत्यन्त अस्वस्थ', tipEn: 'Health alert: avoid outdoor activity and keep windows closed.', tipNe: 'स्वास्थ्य सतर्कता: बाहिरी गतिविधि नगर्नुहोस्, झ्याल बन्द राख्नुहोस्।' },
    { max: Infinity, c: '#7b2d3b', en: 'Hazardous', ne: 'खतरनाक', tipEn: 'Emergency conditions: stay indoors; wear a mask if you must go out.', tipNe: 'आपतकालीन अवस्था: भित्रै बस्नुहोस्; जानै पर्दा मास्क लगाउनुहोस्।' }
  ];
  NL.aqiInfo = function (v) {
    var i = v == null ? 0 : Math.max(0, AQI_BANDS.findIndex(function (b) { return v <= b.max; }));
    var b = AQI_BANDS[i];
    return { idx: i, color: b.c, label: ne() ? b.ne : b.en, tip: ne() ? b.tipNe : b.tipEn };
  };
  NL.aqiScale = function (v) {
    var widths = [50, 50, 50, 50, 100];
    return '<div class="aqi-scale" aria-hidden="true">' + widths.map(function (w, i) {
      return '<span style="flex:' + w + ';background:' + AQI_BANDS[i].c + '"></span>';
    }).join('') + '<i style="left:' + Math.min(100, Math.max(0, (v || 0) / 300 * 100)).toFixed(1) + '%"></i></div>';
  };

  /* ------------------------------------------------------------- charts */
  /* Line chart with hover read-out. pts: [{t: ms, v: number}] oldest → newest. */
  var CH = {}, chId = 0;
  NL.chart = function (pts, o) {
    o = o || {};
    pts = (pts || []).filter(function (p) { return isFinite(p.v) && isFinite(p.t); });
    if (pts.length < 2) return '<div class="chart-empty">' + esc(o.empty || t('unavailable')) + '</div>';
    var W = 600, H = o.h || 180, pad = 10;
    var vs = pts.map(function (p) { return p.v; });
    var min = Math.min.apply(null, vs), max = Math.max.apply(null, vs), span = (max - min) || Math.abs(max) * 0.01 || 1;
    var y = function (v) { return pad + (1 - (v - min) / span) * (H - 2 * pad); };
    var d = pts.map(function (p, i) { return (i ? 'L' : 'M') + (i * W / (pts.length - 1)).toFixed(1) + ',' + y(p.v).toFixed(1); }).join(' ');
    var dir = o.dir || (vs[vs.length - 1] >= vs[0] ? 'up' : 'down');
    var col = o.color || (dir === 'down' ? 'var(--down)' : dir === 'info' ? 'var(--info)' : 'var(--up)');
    var id = 'ch' + (++chId);
    var fmt = o.fmt || function (v) { return NL.fmt(v, 2); };
    var dfmt = o.dfmt || NL.dfmt.dayY;
    CH[id] = { pts: pts, fmt: fmt, dfmt: dfmt, min: min, span: span, H: H, pad: pad };
    return '<div class="chart-box" style="--ch:' + H + 'px">'
      + '<div class="cb-plot" data-chart="' + id + '"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">'
      + '<defs><linearGradient id="g' + id + '" x1="0" y1="0" x2="0" y2="1"><stop offset="0" style="stop-color:' + col + ';stop-opacity:.18"/><stop offset="1" style="stop-color:' + col + ';stop-opacity:0"/></linearGradient></defs>'
      + '<path d="' + d + ' L' + W + ',' + H + ' L0,' + H + ' Z" style="fill:url(#g' + id + ')"/>'
      + '<path d="' + d + '" style="fill:none;stroke:' + col + '" stroke-width="2" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>'
      + '<i class="cb-vline" hidden></i><i class="cb-dot" hidden style="background:' + col + '"></i><div class="cb-tip" hidden></div></div>'
      + '<div class="cb-y"><span>' + esc(fmt(max)) + '</span><span>' + esc(fmt(min)) + '</span></div>'
      + '<div class="cb-x"><span>' + esc(dfmt(pts[0].t)) + '</span><span>' + esc(dfmt(pts[pts.length - 1].t)) + '</span></div></div>';
  };
  function chartMove(e) {
    var plot = e.target && e.target.closest && e.target.closest('.cb-plot');
    if (!plot) return;
    var c = CH[plot.getAttribute('data-chart')];
    if (!c) return;
    var r = plot.getBoundingClientRect();
    var frac = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
    var n = c.pts.length, i = Math.round(frac * (n - 1)), p = c.pts[i];
    var left = i / (n - 1) * 100, top = (c.pad + (1 - (p.v - c.min) / c.span) * (c.H - 2 * c.pad)) / c.H * 100;
    var vl = plot.querySelector('.cb-vline'), dot = plot.querySelector('.cb-dot'), tip = plot.querySelector('.cb-tip');
    vl.hidden = dot.hidden = tip.hidden = false;
    vl.style.left = left + '%';
    dot.style.left = left + '%'; dot.style.top = top + '%';
    tip.innerHTML = '<b>' + esc(c.fmt(p.v)) + '</b><span>' + esc(c.dfmt(p.t)) + '</span>';
    tip.style.left = Math.min(Math.max(left, 14), 86) + '%';
  }
  document.addEventListener('pointermove', chartMove, { passive: true });
  document.addEventListener('pointerdown', chartMove, { passive: true });
  document.addEventListener('pointerout', function (e) {
    var plot = e.target && e.target.closest && e.target.closest('.cb-plot');
    if (plot && !plot.contains(e.relatedTarget)) plot.querySelectorAll('.cb-vline,.cb-dot,.cb-tip').forEach(function (el) { el.hidden = true; });
  });
  /* ranges: [{k: '7D', ok: true}] — a range the source can't support is shown
     disabled with the reason, rather than faked */
  NL.rangeTabs = function (key, ranges, active) {
    return '<div class="range-tabs" role="group">' + ranges.map(function (r) {
      return '<button type="button" data-range-key="' + key + '" data-range="' + r.k + '" aria-pressed="' + (r.k === active) + '"'
        + (r.ok === false ? ' disabled title="' + esc(r.why || '') + '" aria-label="' + esc(r.k + ' — ' + (r.why || '')) + '"' : '') + '>' + r.k + '</button>';
    }).join('') + '</div>';
  };
  NL.changeOver = function (pts) {
    if (!pts || pts.length < 2) return null;
    var a = pts[0].v, b = pts[pts.length - 1].v;
    return { abs: b - a, pct: a ? (b - a) / a * 100 : 0, dir: NL.dirOf(b - a) };
  };

  NL.i18n.apply();
})();
