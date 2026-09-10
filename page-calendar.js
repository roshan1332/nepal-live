/*
 * Nepal Calendar (/calendar?mode=bs|ad&y=&m=). Data: /api/calendar and
 * /api/calendar/today (Hamro Patro). BS mode shows a Bikram Sambat month with
 * AD dates small; AD mode the reverse. Today is computed in Nepal Time.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var t = NL.i18n.t, esc = NL.esc;
  var NE_DIGITS = '०१२३४५६७८९';
  var neNum = function (n) { return String(n).replace(/\d/g, function (d) { return NE_DIGITS[d]; }); };
  var BS_NE = ['बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कात्तिक', 'मंसिर', 'पुस', 'माघ', 'फागुन', 'चैत'];
  var BS_EN = ['Baisakh', 'Jestha', 'Asar', 'Shrawan', 'Bhadra', 'Ashwin', 'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'];
  var WD_EN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], WD_NE = ['आइत', 'सोम', 'मंगल', 'बुध', 'बिही', 'शुक्र', 'शनि'];

  NL.i18n.add({
    en: {
      kicker: 'Nepal Calendar', h1: 'Nepali <em>calendar</em>', sub: 'Bikram Sambat and Gregorian dates side by side, with public holidays and festivals.',
      todayBtn: 'Today', calmK: 'This month', calmH: 'Holidays & events', today: 'Today', holiday: 'Public holiday', holidayLtd: 'Holiday for some groups only', tithi: 'Tithi',
      calNote: 'Calendar data: Hamro Patro. Public holidays are decided by the Government of Nepal and can change — the Ministry of Home Affairs (moha.gov.np) publishes the official list.',
      noEvents: 'No holidays or events listed this month.', err: 'The calendar isn’t available right now.', more: 'Read on Hamro Patro'
    },
    ne: {
      kicker: 'नेपाली पात्रो', h1: 'नेपाली <em>पात्रो</em>', sub: 'विक्रम संवत् र ईस्वी संवत् सँगसँगै, सार्वजनिक बिदा र चाडपर्वसहित।',
      todayBtn: 'आज', calmK: 'यो महिना', calmH: 'बिदा र कार्यक्रम', today: 'आज', holiday: 'सार्वजनिक बिदा', holidayLtd: 'केही समूहलाई मात्र बिदा', tithi: 'तिथि',
      calNote: 'पात्रो तथ्यांक: हाम्रोपात्रो। सार्वजनिक बिदा नेपाल सरकारले तोक्छ र परिवर्तन हुन सक्छ — गृह मन्त्रालय (moha.gov.np) ले आधिकारिक सूची प्रकाशन गर्छ।',
      noEvents: 'यो महिना कुनै बिदा वा कार्यक्रम सूचीकृत छैन।', err: 'पात्रो अहिले उपलब्ध छैन।', more: 'हाम्रोपात्रोमा पढ्नुहोस्'
    }
  });

  NL.i18n.apply();

  var q = new URLSearchParams(location.search);
  var S = { mode: q.get('mode') === 'ad' ? 'ad' : 'bs', y: parseInt(q.get('y'), 10) || null, m: parseInt(q.get('m'), 10) || null, data: null, today: null, sel: null };
  var ne = function () { return NL.lang() === 'ne'; };
  var bsLabel = function (bs, npDay) { return ne() ? (npDay || neNum(bs[2])) + ' ' + BS_NE[bs[1] - 1] + ' ' + neNum(bs[0]) : bs[2] + ' ' + BS_EN[bs[1] - 1] + ' ' + bs[0]; };
  var adLabel = function (ad) { return new Intl.DateTimeFormat(ne() ? 'ne-NP' : 'en-GB', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(ad + 'T00:00:00Z')); };

  /* one event line; a holiday for some groups only keeps its Nepali title, which carries that qualifier */
  function evLine(e) {
    var tag = e.holiday ? ' · <b>' + esc(t(e.restricted ? 'holidayLtd' : 'holiday')) + '</b>' : '';
    var q = !ne() && e.restricted && e.np ? ' <span class="muted" lang="ne">(' + esc(e.np) + ')</span>' : '';
    return '<span' + (ne() ? ' lang="ne"' : '') + '>' + esc(ne() ? e.np || e.en : e.en || e.np) + tag + q + '</span>';
  }
  /* day-level holiday label, only when no event line already carries it */
  var dayHol = function (c) { return c.holiday && !c.events.some(function (e) { return e.holiday; }); };
  function renderToday() {
    var d = S.today && S.today.day;
    if (!d) return;
    $('cal-today').innerHTML = '<div class="ct-main"><span class="label">' + esc(t('today')) + '</span>'
      + '<span class="ct-bs"' + (ne() ? ' lang="ne"' : '') + '>' + esc(bsLabel(d.bs, d.bsNp)) + '</span>'
      + '<span class="ct-ad">' + esc(adLabel(d.ad)) + '</span></div>'
      + '<div class="ct-side">' + (d.tithi ? '<span><b>' + esc(t('tithi')) + '</b> <span lang="ne">' + esc(d.tithi) + '</span></span>' : '')
      + (dayHol(d) ? '<span class="ct-hol">' + esc(t('holiday')) + '</span>' : '')
      + d.events.map(evLine).join('') + '</div>';
  }
  function cells() {
    var d = S.data;
    if (d.mode === 'bs') return d.days;
    var lead = d.days.length ? d.days[0].dow : 0, out = [];
    for (var i = 0; i < lead; i++) out.push(null);
    return out.concat(d.days);
  }
  function render() {
    renderToday();
    document.querySelectorAll('[data-mode]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-mode') === S.mode)); });
    var d = S.data; if (!d) return;
    var today = d.today;
    $('cal-title').innerHTML = d.mode === 'bs'
      ? '<span' + (ne() ? ' lang="ne"' : '') + '>' + esc(ne() ? (d.nameNp || BS_NE[d.monthBs - 1]) + ' ' + neNum(d.yearBs) : (d.nameEn || BS_EN[d.monthBs - 1]) + ' ' + d.yearBs) + '</span>'
        + '<small>' + esc(adSpan(d)) + '</small>'
      : esc(new Intl.DateTimeFormat(ne() ? 'ne-NP' : 'en-GB', { timeZone: 'UTC', month: 'long', year: 'numeric' }).format(new Date(Date.UTC(d.year, d.month - 1, 1))))
        + '<small' + (ne() ? ' lang="ne"' : '') + '>' + esc(bsSpan(d)) + '</small>';
    var wd = ne() ? WD_NE : WD_EN;
    $('cal-grid').innerHTML = wd.map(function (w, i) { return '<div class="cg-h' + (i === 6 ? ' sat' : '') + '" role="columnheader">' + esc(w) + '</div>'; }).join('')
      + cells().map(function (c) {
        if (!c) return '<div class="cg-c empty"></div>';
        var primary = d.mode === 'bs' ? (ne() ? (c.bsNp || neNum(c.bs[2])) : c.bs[2]) : +c.ad.slice(8);
        var secondary = d.mode === 'bs' ? +c.ad.slice(8) : (ne() ? (c.bsNp || neNum(c.bs[2])) : c.bs[2]);
        var ev = c.events[0];
        var cls = 'cg-c' + (c.inMonth === false ? ' out' : '') + (c.holiday ? ' hol' : '') + (c.weekend || c.dow === 6 ? ' sat' : '') + (c.ad === today ? ' today' : '') + (S.sel === c.ad ? ' sel' : '');
        return '<button type="button" role="gridcell" class="' + cls + '" data-day="' + c.ad + '" aria-label="' + esc(adLabel(c.ad) + ' — ' + bsLabel(c.bs, c.bsNp) + (ev ? ' — ' + (ev.en || ev.np) : '')) + '">'
          + '<span class="cg-p">' + primary + '</span><span class="cg-s">' + secondary + '</span>'
          + (ev ? '<span class="cg-e"' + (ne() ? ' lang="ne"' : '') + '>' + esc(ne() ? ev.np || ev.en : ev.en || ev.np) + '</span>' : '')
          + (c.events.length ? '<i class="cg-dot" aria-hidden="true"></i>' : '') + '</button>';
      }).join('');

    var evDays = d.days.filter(function (c) { return c.inMonth !== false && (c.events.length || c.holiday); });
    $('cal-events').innerHTML = evDays.length ? '<ul class="cal-list">' + evDays.map(function (c) {
      return '<li class="' + (c.holiday ? 'hol' : '') + '"><span class="cl-d"><b>' + esc(bsLabel(c.bs, c.bsNp)) + '</b><span>' + esc(adLabel(c.ad)) + '</span></span>'
        + '<span class="cl-e">' + c.events.map(evLine).join('')
        + (dayHol(c) ? '<span><b>' + esc(t('holiday')) + '</b></span>' : '') + '</span></li>';
    }).join('') + '</ul>' : NL.emptyState(t('noEvents'), { icon: 'calendar', compact: true });
    renderDay();
    history.replaceState(null, '', location.pathname + '?mode=' + S.mode + '&y=' + S.y + '&m=' + S.m);
  }
  function adSpan(d) {
    var ins = d.days.filter(function (c) { return c.inMonth; });
    if (!ins.length) return '';
    var f = function (ad) { return new Intl.DateTimeFormat(ne() ? 'ne-NP' : 'en-GB', { timeZone: 'UTC', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(ad + 'T00:00:00Z')); };
    return f(ins[0].ad) + ' – ' + f(ins[ins.length - 1].ad);
  }
  function bsSpan(d) {
    if (!d.days.length) return '';
    var a = d.days[0], b = d.days[d.days.length - 1];
    return bsLabel(a.bs, a.bsNp) + ' – ' + bsLabel(b.bs, b.bsNp);
  }
  function renderDay() {
    var box = $('cal-day');
    var c = S.sel && S.data && S.data.days.find(function (x) { return x.ad === S.sel; });
    if (!c) { box.hidden = true; return; }
    box.hidden = false;
    box.innerHTML = '<h3' + (ne() ? ' lang="ne"' : '') + '>' + esc(bsLabel(c.bs, c.bsNp)) + '</h3><p class="muted">' + esc(adLabel(c.ad)) + (c.tithi ? ' · ' + esc(t('tithi')) + ': <span lang="ne">' + esc(c.tithi) + '</span>' : '') + '</p>'
      + (dayHol(c) ? '<p class="ct-hol">' + esc(t('holiday')) + '</p>' : '')
      + c.events.map(function (e) { return '<p>' + evLine(e) + '</p>'; }).join('')
      + (c.link ? '<a class="link-more" href="' + esc(c.link) + '" target="_blank" rel="noopener noreferrer">' + esc(t('more')) + ' <span>↗</span></a>' : '');
  }
  async function load() {
    $('cal-grid').innerHTML = NL.skeleton('cards');
    try {
      if (!S.today) S.today = await NL.api('/api/calendar/today');
      if (!S.y || !S.m) {
        var d0 = S.today.day;
        if (S.mode === 'bs') { S.y = d0.bs[0]; S.m = d0.bs[1]; } else { S.y = +d0.ad.slice(0, 4); S.m = +d0.ad.slice(5, 7); }
      }
      S.data = await NL.api('/api/calendar?mode=' + S.mode + '&y=' + S.y + '&m=' + S.m);
      render();
      NL.feed('calendar', true);
    } catch (e) {
      $('cal-grid').innerHTML = NL.errorState(t('err'), { mod: 'calendar' });
      NL.feed('calendar', false);
    }
  }
  function shift(n) {
    var m = S.m + n, y = S.y;
    while (m < 1) { m += 12; y--; } while (m > 12) { m -= 12; y++; }
    S.y = y; S.m = m; S.sel = null; load();
  }
  $('cal-prev').addEventListener('click', function () { shift(-1); });
  $('cal-next').addEventListener('click', function () { shift(1); });
  $('cal-now').addEventListener('click', function () { S.y = S.m = null; S.sel = S.today && S.today.today; load(); });
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-mode]');
    if (b) {
      var mode = b.getAttribute('data-mode');
      if (mode === S.mode) return;
      /* keep the same place in time when switching: go to the month containing the 15th of what's shown */
      var mid = S.data && (S.data.days.filter(function (c) { return c.inMonth !== false; })[14] || S.data.days[0]);
      S.mode = mode;
      if (mid) { if (mode === 'ad') { S.y = +mid.ad.slice(0, 4); S.m = +mid.ad.slice(5, 7); } else { S.y = mid.bs[0]; S.m = mid.bs[1]; } } else { S.y = S.m = null; }
      load();
      return;
    }
    var d = e.target.closest('[data-day]');
    if (d) { S.sel = S.sel === d.getAttribute('data-day') ? null : d.getAttribute('data-day'); render(); }
  });
  NL.retryHandlers.calendar = load;
  NL.onLang(render);
  NL.ticker.autoload();
  NL.renderFooter([{ name: 'Hamro Patro — calendar', url: 'https://www.hamropatro.com/calendar' }, { name: 'Ministry of Home Affairs — public holidays', url: 'https://moha.gov.np/' }]);
  load();
})();
