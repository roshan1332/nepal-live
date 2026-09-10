/*
 * Nepal Earthquake Monitor (/earthquakes). Data: /api/quakes — the USGS
 * catalogue within 800 km of central Nepal, M2.5+, last 30 days. Filters are
 * applied here; values are shown exactly as USGS reports them.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var t = NL.i18n.t, esc = NL.esc, fmt = NL.fmt;

  NL.i18n.add({
    en: {
      kicker: 'Earthquake Monitor', h1: 'Earthquakes <em>near Nepal</em>',
      sub: 'Every event in the USGS catalogue within 800 km of central Nepal — magnitude, depth, time and distance, exactly as reported.',
      plotH: 'Magnitude over time', tlK: 'Timeline', tlH: 'Every recorded event',
      eqNote: 'Source: USGS Earthquake Hazards Program (magnitude 2.5 and above within 800 km of central Nepal). Small local events may be listed only by Nepal’s National Seismological Centre (seismonepal.gov.np). Magnitudes and locations can be revised by the source after an event.',
      events: 'Events', strongest: 'Strongest', nearest: 'Nearest to Kathmandu', latest: 'Latest', depth: '{d} km deep', fromKtm: '{d} km from Kathmandu',
      significant: 'Significant', felt: 'Felt reports: {n} (USGS “Did You Feel It?”)', usgs: 'USGS event page',
      none: 'No M{m}+ earthquakes within 800 km in the last {p}.', p1: '24 hours', p7: '7 days', p30: '30 days',
      err: 'Earthquake data isn’t available right now.', sigNote: 'Significant = magnitude 5.0 or above.'
    },
    ne: {
      kicker: 'भूकम्प निगरानी', h1: 'नेपाल नजिकका <em>भूकम्प</em>',
      sub: 'मध्य नेपालबाट ८०० कि.मी. भित्र USGS सूचीमा परेका सबै भूकम्प — म्याग्निच्युड, गहिराइ, समय र दूरी, जस्ताको तस्तै।',
      plotH: 'समयअनुसार म्याग्निच्युड', tlK: 'समयरेखा', tlH: 'रेकर्ड भएका सबै भूकम्प',
      eqNote: 'स्रोत: USGS (मध्य नेपालबाट ८०० कि.मी. भित्र २.५ र सोभन्दा ठूला)। साना स्थानीय भूकम्प राष्ट्रिय भूकम्प मापन केन्द्र (seismonepal.gov.np) ले मात्र सूचीमा राखेको हुन सक्छ। घटनापछि स्रोतले म्याग्निच्युड र स्थान संशोधन गर्न सक्छ।',
      events: 'घटना', strongest: 'सबैभन्दा ठूलो', nearest: 'काठमाडौंको सबैभन्दा नजिक', latest: 'पछिल्लो', depth: '{d} कि.मी. गहिराइ', fromKtm: 'काठमाडौंबाट {d} कि.मी.',
      significant: 'उल्लेखनीय', felt: 'महसुस रिपोर्ट: {n} (USGS)', usgs: 'USGS पृष्ठ',
      none: 'पछिल्लो {p} मा ८०० कि.मी. भित्र M{m}+ भूकम्प छैन।', p1: '२४ घण्टा', p7: '७ दिन', p30: '३० दिन',
      err: 'भूकम्पको तथ्यांक अहिले उपलब्ध छैन।', sigNote: 'उल्लेखनीय = ५.० वा सोभन्दा ठूलो।'
    }
  });

  var S = { feats: null, days: 7, mag: 2.5 };
  var magColor = function (m) { return m >= 6 ? '#b3263f' : m >= 5 ? '#e0344e' : m >= 4 ? '#ea7a1e' : m >= 3 ? '#d39e00' : '#8a8f98'; };
  var dayKey = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit' });

  function rows() {
    var since = Date.now() - S.days * 864e5;
    return (S.feats || []).map(function (f) {
      var p = f.properties || {}, c = (f.geometry || {}).coordinates || [];
      return { id: f.id, mag: p.mag, place: p.place || '', time: p.time, url: p.url, felt: p.felt, depth: c[2], lat: c[1], lon: c[0],
        km: c.length ? Math.round(NL.km(NL.KTM[0], NL.KTM[1], c[1], c[0])) : null };
    }).filter(function (q) { return q.time >= since && q.mag >= S.mag; });
  }

  function render() {
    if (!S.feats) return;
    document.querySelectorAll('[data-days]').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-days') === S.days)); });
    document.querySelectorAll('[data-mag]').forEach(function (b) { b.setAttribute('aria-pressed', String(+b.getAttribute('data-mag') === S.mag)); });
    var list = rows();
    var pLabel = t('p' + S.days);
    if (!list.length) {
      $('eq-summary').innerHTML = '';
      $('eq-plot').innerHTML = '';
      $('eq-list').innerHTML = NL.emptyState(t('none', { m: S.mag, p: pLabel }), { icon: 'quake' });
      return;
    }
    var strong = list.reduce(function (a, b) { return b.mag > a.mag ? b : a; });
    var near = list.filter(function (q) { return q.km != null; }).reduce(function (a, b) { return !a || b.km < a.km ? b : a; }, null);
    var latest = list[0];
    var box = function (k, v, sub) { return '<div class="eq-box"><span class="label">' + esc(t(k)) + '</span><span class="eq-v">' + v + '</span><span class="eq-s">' + sub + '</span></div>'; };
    $('eq-summary').innerHTML = box('events', list.length, esc(pLabel))
      + box('strongest', '<span style="color:' + magColor(strong.mag) + '">M' + fmt(strong.mag, 1) + '</span>', esc(strong.place))
      + (near ? box('nearest', near.km + ' km', 'M' + fmt(near.mag, 1) + ' · ' + esc(near.place)) : '')
      + box('latest', 'M' + fmt(latest.mag, 1), '<span data-ago="' + latest.time + '">' + esc(NL.ago(latest.time)) + '</span> · ' + esc(latest.place));

    /* magnitude-vs-time dot plot: position and size come straight from the data */
    var W = 600, H = 180, t0 = Date.now() - S.days * 864e5, t1 = Date.now();
    var mMin = 2.5, mMax = Math.max(6, Math.ceil(strong.mag));
    var X = function (tm) { return (tm - t0) / (t1 - t0) * W; };
    var Y = function (m) { return H - 12 - (m - mMin) / (mMax - mMin) * (H - 24); };
    var grid = [];
    for (var m = 3; m <= mMax; m++) grid.push('<line x1="0" x2="' + W + '" y1="' + Y(m).toFixed(1) + '" y2="' + Y(m).toFixed(1) + '" class="eq-grid"/>');
    /* dots are HTML so they stay round however the plot stretches */
    var dots = list.slice().reverse().map(function (q) {
      var d = (2 + (q.mag - 2) * 2.2) * 2;
      return '<i class="eq-dot" style="left:' + (X(q.time) / W * 100).toFixed(2) + '%;top:' + (Y(q.mag) / H * 100).toFixed(2) + '%;width:' + d.toFixed(1) + 'px;height:' + d.toFixed(1)
        + 'px;background:' + magColor(q.mag) + '" title="M' + fmt(q.mag, 1) + ' · ' + esc(q.place) + ' · ' + NL.dfmt.dayY(q.time) + ' ' + NL.dfmt.hour(q.time) + ' NPT"></i>';
    }).join('');
    $('eq-plot').innerHTML = '<div class="eq-plot" role="img" aria-label="' + esc(t('plotH')) + '"><svg viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="none" aria-hidden="true">' + grid.join('') + '</svg><div class="eq-dots">' + dots + '</div>'
      + '<div class="eq-ylab">' + (function () { var o = ''; for (var m2 = mMax; m2 >= 3; m2--) o += '<span style="top:' + (Y(m2) / H * 100).toFixed(1) + '%">M' + m2 + '</span>'; return o; })() + '</div></div>'
      + '<div class="cb-x"><span>' + esc(NL.dfmt.dayY(t0)) + '</span><span>' + esc(NL.dfmt.dayY(t1)) + '</span></div>'
      + '<p class="chart-cap">' + esc(t('sigNote')) + '</p>';

    var groups = {};
    list.forEach(function (q) { var k = dayKey.format(q.time); (groups[k] = groups[k] || []).push(q); });
    $('eq-list').innerHTML = Object.keys(groups).map(function (k) {
      return '<h3 class="day-h">' + esc(NL.dfmt.dayY(Date.parse(k + 'T12:00:00+05:45'))) + '</h3><div class="eq-rows">' + groups[k].map(function (q) {
        var sig = q.mag >= 5;
        return '<article class="eq-row' + (sig ? ' is-sig' : '') + '"><span class="mag" style="--c:' + magColor(q.mag) + '">' + fmt(q.mag, 1) + '</span>'
          + '<div class="eq-info"><div class="eq-place">' + esc(q.place) + (sig ? ' <span class="lv-badge lv-warning"><i></i>' + esc(t('significant')) + '</span>' : '') + '</div>'
          + '<div class="eq-meta">' + NL.dfmt.hour(q.time) + ' NPT · <span data-ago="' + q.time + '">' + esc(NL.ago(q.time)) + '</span>'
          + (q.depth != null ? ' · ' + esc(t('depth', { d: Math.round(q.depth) })) : '') + (q.km != null ? ' · ' + esc(t('fromKtm', { d: q.km })) : '') + '</div>'
          + (q.felt ? '<div class="eq-meta">' + esc(t('felt', { n: q.felt })) + '</div>' : '') + '</div>'
          + '<a class="q-link" href="' + esc(q.url) + '" target="_blank" rel="noopener noreferrer">' + esc(t('usgs')) + ' ↗</a></article>';
      }).join('') + '</div>';
    }).join('');
  }

  async function load() {
    var btn = $('eq-refresh');
    btn.classList.add('spinning');
    try {
      var d = await NL.api('/api/quakes?days=30&minmag=2.5&limit=100');
      S.feats = d.features || [];
      render();
      NL.stamp('stamp-eq', true); NL.feed('quakes', true);
    } catch (e) {
      if (!S.feats) $('eq-list').innerHTML = NL.errorState(t('err'), { mod: 'quakes' });
      NL.stamp('stamp-eq', false); NL.feed('quakes', false);
    } finally { btn.classList.remove('spinning'); }
  }

  document.addEventListener('click', function (e) {
    var d = e.target.closest('[data-days]'); if (d) { S.days = +d.getAttribute('data-days'); render(); return; }
    var m = e.target.closest('[data-mag]'); if (m) { S.mag = +m.getAttribute('data-mag'); render(); }
  });
  $('eq-refresh').addEventListener('click', load);
  NL.retryHandlers.quakes = load;
  NL.onLang(render);
  $('eq-list').innerHTML = NL.skeleton('rows');
  NL.ticker.autoload();
  NL.renderFooter([
    { name: 'USGS Earthquake Hazards Program', url: 'https://earthquake.usgs.gov/' },
    { name: 'National Seismological Centre, Nepal', url: 'http://seismonepal.gov.np/' },
  ]);
  load();
  setInterval(function () { if (!document.hidden) load(); }, 120e3);
})();
