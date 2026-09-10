/*
 * Nepal Government directory (/government). The directory itself is rendered
 * on the server (official names and links); this script only filters it,
 * switches its English/Nepali labels, and lists upcoming public holidays.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var t = NL.i18n.t, esc = NL.esc;

  NL.i18n.add({
    en: {
      kicker: 'Nepal Government', h1: 'Government & <em>public services</em>', sub: 'Where to go for passports, licences, tax, ID and more — every link opens the official government source.',
      govNote: 'Nepal Live is an information and navigation layer, not a government office. Rules, fees and forms change — always confirm on the official source before applying.',
      govPh: 'Find a service — passport, PAN, licence…', emH: 'Emergency numbers', emPolice: 'Police', emFire: 'Fire brigade', emAmb: 'Ambulance', emTraffic: 'Traffic police', emTourist: 'Tourist police',
      holH: 'Upcoming public holidays', calLink: 'Full calendar', warnH: 'Public warnings', warnP: 'Official disaster, flood and road-closure alerts are on our Alerts page.', alertsLink: 'Nepal Alerts',
      govNone: 'No service matches that search.', noHol: 'No public holidays in the next 60 days.', holErr: 'Holiday dates aren’t available right now.', holSrc: 'Dates: Hamro Patro calendar · official list: moha.gov.np', holidayLtd: 'some groups only'
    },
    ne: {
      kicker: 'नेपाल सरकार', h1: 'सरकारी र <em>सार्वजनिक सेवा</em>', sub: 'राहदानी, लाइसेन्स, कर, परिचयपत्र आदिका लागि कहाँ जाने — हरेक लिंकले आधिकारिक सरकारी स्रोत खोल्छ।',
      govNote: 'नेपाल लाइभ जानकारी र मार्गदर्शनको माध्यम मात्र हो, सरकारी कार्यालय होइन। नियम, शुल्क र फारम परिवर्तन हुन्छन् — आवेदनअघि आधिकारिक स्रोतमा पुष्टि गर्नुहोस्।',
      govPh: 'सेवा खोज्नुहोस् — राहदानी, प्यान, लाइसेन्स…', emH: 'आपतकालीन नम्बर', emPolice: 'प्रहरी', emFire: 'दमकल', emAmb: 'एम्बुलेन्स', emTraffic: 'ट्राफिक प्रहरी', emTourist: 'पर्यटक प्रहरी',
      holH: 'आगामी सार्वजनिक बिदा', calLink: 'पूरा पात्रो', warnH: 'सार्वजनिक चेतावनी', warnP: 'आधिकारिक विपद्, बाढी र सडक अवरोधका सतर्कता हाम्रो सतर्कता पृष्ठमा छन्।', alertsLink: 'नेपाल सतर्कता',
      govNone: 'त्यो खोजीसँग मिल्ने सेवा भेटिएन।', noHol: 'आगामी ६० दिनमा सार्वजनिक बिदा छैन।', holErr: 'बिदाका मिति अहिले उपलब्ध छैनन्।', holSrc: 'मिति: हाम्रोपात्रो · आधिकारिक सूची: moha.gov.np', holidayLtd: 'केही समूहलाई मात्र'
    }
  });

  NL.i18n.apply();

  var hol = null;
  function applyLang() {
    var ne = NL.lang() === 'ne';
    document.querySelectorAll('[data-en]').forEach(function (el) { el.textContent = ne ? el.getAttribute('data-ne') : el.getAttribute('data-en'); });
    renderHol();
  }
  function renderHol() {
    if (!hol) return;
    var ne = NL.lang() === 'ne';
    var list = hol.items.filter(function (d) { return d.holiday; }).slice(0, 6);
    $('gov-holidays').innerHTML = list.length ? '<ul class="hol-list">' + list.map(function (d) {
      var ms = Date.parse(d.ad + 'T12:00:00+05:45');
      var name = d.events.filter(function (e) { return e.holiday; })[0] || d.events[0];
      return '<li><span class="hl-date">' + esc(NL.dfmt.day(ms)) + '<small>' + esc(NL.dfmt.weekday(ms)) + '</small></span><span' + (ne ? ' lang="ne"' : '') + '>'
        + esc(name ? (ne ? name.np || name.en : name.en || name.np) : '')
        + (name && name.restricted ? ' <small class="muted">· ' + esc(t('holidayLtd')) + (!ne && name.np ? ' — <span lang="ne">' + esc(name.np) + '</span>' : '') + '</small>' : '') + '</span></li>';
    }).join('') + '</ul><p class="src-note">' + esc(t('holSrc')) + '</p>' : '<p class="small muted">' + esc(t('noHol')) + '</p>';
  }
  function filter() {
    var q = $('gov-q').value.trim().toLowerCase(), any = false;
    document.querySelectorAll('[data-gov-group]').forEach(function (g) {
      var vis = 0;
      g.querySelectorAll('.gov-card').forEach(function (c) { var on = !q || c.getAttribute('data-kw').indexOf(q) >= 0; c.hidden = !on; if (on) vis++; });
      g.hidden = !vis; if (vis) any = true;
    });
    $('gov-empty').hidden = any;
  }
  /* bookmark each official source (saved under its English name, as the office uses it) */
  document.querySelectorAll('.gov-card').forEach(function (c) {
    var a = c.querySelector('.gov-src'), h = c.querySelector('h3 [data-en]');
    c.insertAdjacentHTML('beforeend', NL.saveBtn({ type: 'gov', id: a.href, title: h.getAttribute('data-en'), url: a.href, sub: c.querySelector('.gov-dom').textContent }));
  });
  $('gov-q').addEventListener('input', filter);
  NL.onLang(applyLang);
  NL.search.add({ group: function () { return NL.s('government'); }, limit: 6,
    items: function () {
      return [].map.call(document.querySelectorAll('.gov-card'), function (c) {
        var a = c.querySelector('.gov-src'), h = c.querySelector('h3');
        return { title: h.textContent, sub: c.querySelector('.gov-dom').textContent, href: a.href, external: true, icon: 'building', kw: c.getAttribute('data-kw') };
      });
    } });
  $('gov-holidays').innerHTML = NL.skeleton('rows');
  NL.api('/api/calendar/upcoming?days=60').then(function (d) { hol = d; renderHol(); NL.feed('calendar', true); })
    .catch(function () { $('gov-holidays').innerHTML = '<p class="small muted">' + esc(t('holErr')) + '</p>'; NL.feed('calendar', false); });
  applyLang();
  NL.ticker.autoload();
  NL.renderFooter([{ name: 'Nepal Government Updates Portal', url: 'https://nepal.gov.np/' }, { name: 'Hamro Patro — calendar', url: 'https://www.hamropatro.com/calendar' }]);
})();
