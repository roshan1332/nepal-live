/*
 * Nepal Events (/events). Data: /api/events — Hamro Patro calendar (festivals,
 * public holidays, national/international days) and Nepal national-team
 * fixtures. Calendar items are nationwide; only fixtures have a venue.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var t = NL.i18n.t, esc = NL.esc;
  var CITIES = ['Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Chitwan', 'Other'];

  NL.i18n.add({
    en: {
      kicker: 'Nepal Events', h1: 'What’s <em>on</em>', sub: 'Festivals, public holidays, national days and Nepal’s national-team fixtures — from sources we can verify.',
      wToday: 'Today', wWeek: 'This week', wMonth: 'This month', wAll: 'Next 60 days', all: 'All', allCities: 'All cities',
      cat_holiday: 'Holidays', cat_festival: 'Festivals & religious days', cat_day: 'National & international days', cat_sports: 'Sports',
      nationwide: 'Nationwide', allDay: 'All day', publicHoliday: 'Public holiday', holidayLtd: 'Holiday for some groups only', details: 'Details', match: 'Match details',
      none: 'Nothing listed for this period.', noneCity: 'No events with a venue in {c} for this period — nationwide days are shown when “All cities” is selected.',
      err: 'Events aren’t available right now.', src: 'Source: {s}',
      evNote: 'We list what we can verify: festivals, public holidays and national/international days from the Hamro Patro calendar, and Nepal national-team fixtures from TheSportsDB. There is no reliable public feed yet for concerts, exhibitions, tech events, conferences, job fairs or community events, so we don’t list them rather than guess.'
    },
    ne: {
      kicker: 'नेपालका कार्यक्रम', h1: 'के <em>छ</em>?', sub: 'चाडपर्व, सार्वजनिक बिदा, राष्ट्रिय दिवस र राष्ट्रिय टोलीका खेल — पुष्टि गर्न सकिने स्रोतबाट।',
      wToday: 'आज', wWeek: 'यो हप्ता', wMonth: 'यो महिना', wAll: 'आगामी ६० दिन', all: 'सबै', allCities: 'सबै सहर',
      cat_holiday: 'बिदा', cat_festival: 'चाडपर्व र धार्मिक दिन', cat_day: 'राष्ट्रिय र अन्तर्राष्ट्रिय दिवस', cat_sports: 'खेलकुद',
      nationwide: 'देशभर', allDay: 'दिनभर', publicHoliday: 'सार्वजनिक बिदा', holidayLtd: 'केही समूहलाई मात्र बिदा', details: 'विवरण', match: 'खेलको विवरण',
      none: 'यस अवधिमा केही सूचीकृत छैन।', noneCity: 'यस अवधिमा {c} मा स्थान भएका कार्यक्रम छैनन् — देशभरका दिवस “सबै सहर” छान्दा देखिन्छन्।',
      err: 'कार्यक्रम अहिले उपलब्ध छैन।', src: 'स्रोत: {s}',
      evNote: 'हामी पुष्टि गर्न सकिने कुरा मात्र राख्छौं: हाम्रोपात्रो पात्रोका चाडपर्व, सार्वजनिक बिदा र दिवस, र TheSportsDB का राष्ट्रिय टोलीका खेल। कन्सर्ट, प्रदर्शनी, प्रविधि कार्यक्रम, सम्मेलन, रोजगार मेला वा सामुदायिक कार्यक्रमको भरपर्दो सार्वजनिक स्रोत अझै छैन, त्यसैले अनुमान गरेर राख्दैनौं।'
    }
  });
  NL.i18n.apply();
  var BS_MONTHS_NE = ['बैशाख', 'जेठ', 'असार', 'साउन', 'भदौ', 'असोज', 'कात्तिक', 'मंसिर', 'पुस', 'माघ', 'फागुन', 'चैत'];
  var S = { data: null, when: 'month', city: '', cat: '' };

  function inWhen(it) {
    var today = S.data.today, d = it.date;
    if (S.when === 'today') return d === today;
    var lim = { week: 7, month: 31, all: 61 }[S.when];
    return d >= today && d < new Date(Date.parse(today) + lim * 864e5).toISOString().slice(0, 10);
  }
  function render() {
    if (!S.data) return;
    document.querySelectorAll('[data-when]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-when') === S.when)); });
    $('ev-city').innerHTML = [''].concat(CITIES).map(function (c) {
      return '<button class="pill" type="button" data-city="' + c + '" aria-pressed="' + (S.city === c) + '">' + esc(c ? c : t('allCities')) + '</button>';
    }).join('');
    var pool = S.data.items.filter(inWhen);
    var cats = {};
    pool.forEach(function (i) { cats[i.category] = (cats[i.category] || 0) + 1; });
    if (S.cat && !cats[S.cat]) S.cat = '';
    $('ev-cat').innerHTML = [''].concat(['holiday', 'festival', 'day', 'sports'].filter(function (k) { return cats[k]; })).map(function (k) {
      return '<button class="pill" type="button" role="tab" data-ecat="' + k + '" aria-selected="' + (S.cat === k) + '">' + esc(k ? t('cat_' + k) : t('all'))
        + '<span class="n">' + (k ? cats[k] : pool.length) + '</span></button>';
    }).join('');
    var list = pool.filter(function (i) { return (!S.cat || i.category === S.cat) && (!S.city || i.city === S.city); });
    if (!list.length) { $('ev-list').innerHTML = NL.emptyState(S.city ? t('noneCity', { c: S.city }) : t('none'), { icon: 'calendar' }); return; }
    var ne = NL.lang() === 'ne', groups = {}, order = [];
    list.forEach(function (i) { if (!groups[i.date]) { groups[i.date] = []; order.push(i.date); } groups[i.date].push(i); });
    $('ev-list').innerHTML = order.map(function (d) {
      var ms = Date.parse(d + 'T12:00:00+05:45'), first = groups[d][0];
      var bs = first.dateBs ? (ne ? (first.bsNp || first.dateBs[2]) + ' ' + BS_MONTHS_NE[first.dateBs[1] - 1] : first.dateBs[2] + ' ' + (first.monthNameEn || '')) : '';
      return '<section class="ev-day"><div class="ev-date"><span class="ev-dnum">' + new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kathmandu', day: 'numeric' }).format(ms) + '</span>'
        + '<span class="ev-dmon">' + esc(NL.dfmt.month(ms)) + '</span><span class="ev-dwd">' + esc(NL.dfmt.weekday(ms)) + '</span>' + (bs ? '<span class="ev-dbs">' + esc(bs) + '</span>' : '') + '</div>'
        + '<div class="ev-items">' + groups[d].map(function (i) {
          var title = ne && i.titleNe ? i.titleNe : i.title;
          var when = i.allDay ? t('allDay') : (i.time ? NL.nptHM(new Date(i.time)) + ' NPT' : '');
          return '<article class="ev-card ev-' + i.category + '">' + (i.image ? '<div class="ev-img"><img src="' + esc(i.image) + '" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer" onerror="this.parentNode.remove()"></div>' : '')
            + '<div class="ev-body"><span class="cat">' + esc(t('cat_' + i.category)) + '</span>'
            + '<h3' + NL.langAttr(title) + '>' + esc(title) + '</h3>'
            /* the "for some groups only" qualifier is often only in the Nepali title — show it rather than translate it */
            + (i.restricted && !ne && i.titleNe ? '<p class="ev-meta" lang="ne">' + esc(i.titleNe) + '</p>' : '')
            + '<p class="ev-meta">' + esc(when) + ' · ' + esc(i.location || t('nationwide')) + (i.league ? ' · ' + esc(i.league) : '') + (i.category === 'holiday' ? ' · <b>' + esc(t(i.restricted ? 'holidayLtd' : 'publicHoliday')) + '</b>' : '') + '</p>'
            + '<p class="ev-src">' + esc(t('src', { s: i.source.name })) + ' · <a href="' + esc(i.link) + '" target="_blank" rel="noopener noreferrer">' + esc(i.category === 'sports' ? t('match') : t('details')) + ' ↗</a></p>'
            + '</div>' + NL.saveBtn({ type: i.category === 'sports' ? 'match' : 'event', id: i.id, title: i.title, url: i.link, sub: i.date + ' · ' + t('cat_' + i.category), img: i.image || '' })
            + '</article>';
        }).join('') + '</div></section>';
    }).join('');
  }
  var retries = 0, retryT;
  async function load() {
    var btn = $('events-refresh');
    btn.classList.add('spinning');
    clearTimeout(retryT);
    try {
      S.data = await NL.api('/api/events');
      render();
      /* national-team fixtures still being fetched upstream: check again shortly */
      if (S.data.pending && retries < 4) { retries++; retryT = setTimeout(load, 25000); }
      NL.stamp('stamp-events', true); NL.feed('events', true);
    } catch (e) {
      if (!S.data) $('ev-list').innerHTML = NL.errorState(t('err'), { mod: 'events' });
      NL.stamp('stamp-events', false); NL.feed('events', false);
    } finally { btn.classList.remove('spinning'); }
  }
  document.addEventListener('click', function (e) {
    var el;
    if ((el = e.target.closest('[data-when]'))) { S.when = el.getAttribute('data-when'); render(); return; }
    if ((el = e.target.closest('[data-city]'))) { S.city = el.getAttribute('data-city'); render(); return; }
    if ((el = e.target.closest('[data-ecat]'))) { S.cat = el.getAttribute('data-ecat'); render(); }
  });
  $('events-refresh').addEventListener('click', load);
  NL.retryHandlers.events = load;
  NL.onLang(render);
  NL.search.add({ group: function () { return NL.s('events'); }, limit: 6,
    items: function () { return ((S.data && S.data.items) || []).map(function (i) { return { title: (NL.lang() === 'ne' && i.titleNe) || i.title, sub: i.date + ' · ' + t('cat_' + i.category), href: '/events', icon: 'calendar', kw: (i.titleNe || '') + ' ' + i.category }; }); } });
  $('ev-list').innerHTML = NL.skeleton('rows');
  NL.ticker.autoload();
  NL.renderFooter([{ name: 'Hamro Patro — calendar', url: 'https://www.hamropatro.com/calendar' }, { name: 'TheSportsDB — fixtures', url: 'https://www.thesportsdb.com/' }]);
  load();
})();
