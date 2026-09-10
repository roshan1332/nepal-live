/*
 * Nepal Alerts page (/alerts). Data: /api/alerts (BIPAD alerts, DHM river
 * gauges, USGS, GDACS) — see sources.js for the level rules shown below.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var t = NL.i18n.t, esc = NL.esc;

  NL.i18n.add({
    en: {
      kicker: 'Nepal Alerts', h1: 'Important <em>alerts</em>',
      sub: 'Official warnings and live measurements from government and international sources. Nothing here is estimated or invented.',
      activeOnly: 'Active', reportedK: 'Reported', incTitle: 'Incidents reported in the last 72 hours',
      methodK: 'Method', lvlTitle: 'How alert levels are assigned',
      noAlerts: 'No major alerts right now.',
      noAlertsSub: 'We check BIPAD Portal, DHM river gauges, USGS and GDACS every few minutes.',
      noneInCat: 'No alerts of this type in the last 48 hours.',
      activeN: '{n} active', totalActive: 'active alerts', sourcesChecked: 'Sources checked',
      noIncidents: 'No significant incidents reported in the last 72 hours.',
      err: 'Alerts aren’t available right now.',
      rule_emergency: 'Rivers above DHM danger level · M6.5+ earthquakes within 300 km of Kathmandu · GDACS red alerts · US AQI above 300',
      rule_warning: 'DHM flood warnings and rivers above warning level · M6+ earthquakes · GDACS orange alerts · US AQI above 200',
      rule_advisory: 'Heavy-rainfall alerts · road closures from the Department of Roads · M5+ earthquakes · pollution alerts (AQI above 150)',
      rule_info: 'Smaller earthquakes (M4+) and GDACS green alerts — useful to know, no action implied',
      rulesNote: 'Levels are assigned by these fixed rules from each source’s own data. River and rainfall alerts count as active for 12 hours, pollution for 6, road closures until the Department of Roads ends them.'
    },
    ne: {
      kicker: 'नेपाल सतर्कता', h1: 'महत्त्वपूर्ण <em>सतर्कता</em>',
      sub: 'सरकारी तथा अन्तर्राष्ट्रिय स्रोतका आधिकारिक चेतावनी र प्रत्यक्ष मापन। यहाँ केही पनि अनुमान वा बनावटी होइन।',
      activeOnly: 'सक्रिय', all: 'हालैका सबै', reportedK: 'रिपोर्ट गरिएका', incTitle: 'पछिल्लो ७२ घण्टामा रिपोर्ट भएका घटना',
      methodK: 'विधि', lvlTitle: 'सतर्कताको तह कसरी तोकिन्छ',
      noAlerts: 'अहिले कुनै ठूलो सतर्कता छैन।',
      noAlertsSub: 'हामी बिपद पोर्टल, जल तथा मौसम विज्ञान विभागका नदी मापन केन्द्र, USGS र GDACS हरेक केही मिनेटमा जाँच्छौं।',
      noneInCat: 'पछिल्लो ४८ घण्टामा यो प्रकारको सतर्कता छैन।',
      activeN: '{n} सक्रिय', totalActive: 'सक्रिय सतर्कता', sourcesChecked: 'जाँचिएका स्रोत',
      noIncidents: 'पछिल्लो ७२ घण्टामा कुनै ठूलो घटना रिपोर्ट भएको छैन।',
      err: 'सतर्कता अहिले उपलब्ध छैन।',
      rule_emergency: 'खतराको तहमाथि नदी · काठमाडौंबाट ३०० कि.मी. भित्र ६.५+ भूकम्प · GDACS रातो सतर्कता · US AQI ३०० माथि',
      rule_warning: 'बाढी चेतावनी र चेतावनी तहमाथि नदी · ६+ भूकम्प · GDACS सुन्तला सतर्कता · US AQI २०० माथि',
      rule_advisory: 'भारी वर्षा सतर्कता · सडक विभागले बन्द गरेका सडक · ५+ भूकम्प · प्रदूषण सतर्कता (AQI १५० माथि)',
      rule_info: 'साना भूकम्प (४+) र GDACS हरियो सतर्कता — जानकारीका लागि मात्र',
      rulesNote: 'तह प्रत्येक स्रोतकै तथ्यांकबाट यिनै निश्चित नियमले तोकिन्छ। नदी र वर्षाका सतर्कता १२ घण्टा, प्रदूषण ६ घण्टा, सडक बन्द सडक विभागले नहटाएसम्म सक्रिय मानिन्छ।'
    }
  });

  var S = { data: null, cat: 'all', show: 'active', lastOk: null };

  function pool() {
    var items = (S.data && S.data.items) || [];
    return S.show === 'active' ? items.filter(function (a) { return a.active; }) : items;
  }

  function render() {
    if (!S.data) return;
    var d = S.data, c = d.counts;
    $('alert-summary').innerHTML =
      '<div class="as-total"><span class="as-n">' + d.active + '</span><span class="as-l">' + esc(t('totalActive')) + '</span></div>'
      + NL.levels.map(function (l) {
        return '<div class="as-lv lv-' + l + (c[l] ? '' : ' zero') + '">' + NL.levelBadge(l) + '<b>' + c[l] + '</b></div>';
      }).join('');

    var list = pool();
    var cats = {};
    list.forEach(function (a) { cats[a.category] = (cats[a.category] || 0) + 1; });
    if (S.cat !== 'all' && !cats[S.cat]) S.cat = 'all';
    $('alert-cats').innerHTML = ['all'].concat(Object.keys(cats)).map(function (k) {
      return '<button class="pill" type="button" role="tab" data-cat="' + k + '" aria-selected="' + (S.cat === k) + '">'
        + esc(k === 'all' ? t('all') : t('cat_' + k)) + '<span class="n">' + (k === 'all' ? list.length : cats[k]) + '</span></button>';
    }).join('');
    document.querySelectorAll('[data-show]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-show') === S.show)); });

    var shown = S.cat === 'all' ? list : list.filter(function (a) { return a.category === S.cat; });
    $('alert-list').innerHTML = shown.length ? shown.map(function (a) { return NL.alertCard(a); }).join('')
      : NL.emptyState(S.show === 'active' && S.cat === 'all' ? t('noAlerts') : t('noneInCat'), { icon: 'shield', sub: S.show === 'active' && S.cat === 'all' ? t('noAlertsSub') : '' });

    var ne = NL.lang() === 'ne';
    $('incident-list').innerHTML = d.incidents.length ? '<div class="inc-list">' + d.incidents.map(function (x) {
      var title = ne && x.titleNe ? x.titleNe : x.title;
      return '<div class="inc-row"><span class="inc-hz">' + esc(ne && x.hazardNe ? x.hazardNe : x.hazard) + '</span>'
        + '<span class="inc-t"' + NL.langAttr(title) + '>' + esc(title) + '</span>'
        + '<span class="inc-m">' + NL.fresh('reported', x.time) + '</span></div>';
    }).join('') + '</div><p class="src-note">' + esc(t('source')) + ': <a href="https://bipadportal.gov.np/" target="_blank" rel="noopener noreferrer">BIPAD Portal ↗</a></p>'
      : NL.emptyState(t('noIncidents'), { icon: 'shield', compact: true });

    $('levels-legend').innerHTML = NL.levels.map(function (l) {
      return '<div class="lv-row">' + NL.levelBadge(l) + '<p>' + esc(t('rule_' + l)) + '</p></div>';
    }).join('') + '<p class="lv-note">' + esc(t('rulesNote')) + '</p>';
    $('alert-sources').innerHTML = '<h3 class="label">' + esc(t('sourcesChecked')) + '</h3>' + NL.sourceList(d.sources);
  }

  async function load() {
    var btn = $('alerts-refresh');
    btn.classList.add('spinning');
    try {
      S.data = await NL.api('/api/alerts');
      render();
      NL.stamp('stamp-alerts', true);
      NL.feed('alerts', true);
    } catch (e) {
      if (!S.data) {
        $('alert-list').innerHTML = NL.errorState(t('err'), { mod: 'alerts' });
        $('alert-summary').innerHTML = '';
      }
      NL.stamp('stamp-alerts', false);
      NL.feed('alerts', false);
    } finally { btn.classList.remove('spinning'); }
  }

  document.addEventListener('click', function (e) {
    var c = e.target.closest('[data-cat]');
    if (c) { S.cat = c.getAttribute('data-cat'); render(); return; }
    var s = e.target.closest('[data-show]');
    if (s) { S.show = s.getAttribute('data-show'); S.cat = 'all'; render(); }
  });
  $('alerts-refresh').addEventListener('click', load);
  NL.retryHandlers.alerts = load;
  NL.onLang(render);

  $('alert-list').innerHTML = NL.skeleton('rows');
  NL.ticker.autoload();
  NL.renderFooter([
    { name: 'BIPAD Portal (Government of Nepal)', url: 'https://bipadportal.gov.np/' },
    { name: 'DHM — hydrology & meteorology', url: 'https://www.dhm.gov.np/' },
    { name: 'USGS — earthquakes', url: 'https://earthquake.usgs.gov/' },
    { name: 'GDACS — disaster alerts', url: 'https://www.gdacs.org/' },
  ]);
  load();
  setInterval(function () { if (!document.hidden) load(); }, 180e3);
})();
