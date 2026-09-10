/*
 * Nepal Roads page (/roads). Data: /api/roads — Department of Roads closures
 * via BIPAD, matched to corridors by district, plus road news from publishers.
 * No traffic-speed data exists for Nepal's highways, so none is shown.
 */
(function () {
  'use strict';
  var $ = function (id) { return document.getElementById(id); };
  var t = NL.i18n.t, esc = NL.esc;

  NL.i18n.add({
    en: {
      kicker: 'Nepal Roads', h1: 'Roads & <em>highways</em>',
      sub: 'Closures reported by the Department of Roads and road news from Nepali publishers — with the time of every report.',
      roadsNote: 'Nepal Live shows closures the Department of Roads reports through the government’s BIPAD Portal, plus road news from publishers. There is no public live-traffic feed for Nepal’s highways, so we don’t show traffic speed (slow / heavy) — we won’t guess it.',
      routesK: 'Major routes', corTitle: 'Status by corridor', dorK: 'Department of Roads', cloTitle: 'Active closures',
      recentK: 'Recent', endTitle: 'Closures that ended in the last 72 hours', reportedK: 'Reported', rnTitle: 'Road news from publishers',
      stReported: 'Closure reported', stNone: 'No closures reported',
      corNoteReported: 'The Department of Roads reports a closure in a district this route passes through. It may or may not be on the highway itself — check the location below.',
      corNoteNone: 'No Department of Roads closure is reported in the districts this route passes through.',
      districts: 'Districts', noClosures: 'No active road closures reported by the Department of Roads.',
      noEnded: 'No closures ended in the last 72 hours.', noNews: 'No road-related headlines in the last 48 hours.',
      stale: 'Reported over a week ago and not yet marked cleared — it may be outdated.',
      reason: 'Reason', err: 'Road information isn’t available right now.'
    },
    ne: {
      kicker: 'नेपालका सडक', h1: 'सडक र <em>राजमार्ग</em>',
      sub: 'सडक विभागले रिपोर्ट गरेका अवरोध र नेपाली सञ्चारमाध्यमका सडक समाचार — हरेक रिपोर्टको समयसहित।',
      roadsNote: 'नेपाल लाइभले सडक विभागले सरकारी बिपद पोर्टलमार्फत रिपोर्ट गरेका सडक अवरोध र सञ्चारमाध्यमका सडक समाचार देखाउँछ। नेपालका राजमार्गको प्रत्यक्ष ट्राफिक तथ्यांक सार्वजनिक छैन, त्यसैले हामी ट्राफिकको गति (ढिलो / भीड) देखाउँदैनौं — अनुमान गर्दैनौं।',
      routesK: 'मुख्य मार्ग', corTitle: 'मार्गअनुसार अवस्था', dorK: 'सडक विभाग', cloTitle: 'अहिले बन्द सडक',
      recentK: 'हालै', endTitle: 'पछिल्लो ७२ घण्टामा खुलेका सडक', reportedK: 'रिपोर्ट गरिएका', rnTitle: 'सञ्चारमाध्यमका सडक समाचार',
      stReported: 'अवरोध रिपोर्ट भएको', stNone: 'अवरोध रिपोर्ट भएको छैन',
      corNoteReported: 'यो मार्ग पर्ने जिल्लामा सडक विभागले अवरोध रिपोर्ट गरेको छ। त्यो राजमार्गमै हो वा होइन भन्ने तलको स्थान हेर्नुहोस्।',
      corNoteNone: 'यो मार्ग पर्ने जिल्लाहरूमा सडक विभागले कुनै अवरोध रिपोर्ट गरेको छैन।',
      districts: 'जिल्ला', noClosures: 'सडक विभागले अहिले कुनै सडक बन्द रिपोर्ट गरेको छैन।',
      noEnded: 'पछिल्लो ७२ घण्टामा कुनै अवरोध हटेको छैन।', noNews: 'पछिल्लो ४८ घण्टामा सडकसम्बन्धी समाचार छैन।',
      stale: 'एक हप्ताभन्दा पहिले रिपोर्ट भएको र अझै खुलेको भनिएको छैन — पुरानो हुन सक्छ।',
      reason: 'कारण', err: 'सडकको जानकारी अहिले उपलब्ध छैन।'
    }
  });

  var data = null;

  function card(c) {
    return NL.alertCard(c) + (c.stale ? '<p class="stale-note">' + esc(t('stale')) + '</p>' : '');
  }

  function render() {
    if (!data) return;
    var ne = NL.lang() === 'ne';
    var byId = {};
    data.closures.forEach(function (c) { byId[c.id] = c; });
    $('corridors').innerHTML = data.corridors.map(function (c) {
      var rep = c.status === 'reported';
      var hits = c.closures.map(function (id) { return byId[id]; }).filter(Boolean);
      return '<article class="corridor ' + (rep ? 'is-reported' : 'is-clear') + '">'
        + '<div class="cor-top"><h3>' + esc(ne ? c.ne : c.en) + '</h3>'
        + '<span class="cor-st"><i aria-hidden="true"></i>' + esc(rep ? t('stReported') : t('stNone')) + '</span></div>'
        + '<p class="cor-note">' + esc(rep ? t('corNoteReported') : t('corNoteNone')) + '</p>'
        + (hits.length ? '<ul class="cor-hits">' + hits.map(function (h) {
          return '<li><b' + NL.langAttr(ne && h.titleNe ? h.titleNe : h.location) + '>' + esc(h.location) + '</b>'
            + (h.reason ? ' · ' + esc(h.reason) : '') + ' · ' + NL.fresh('issued', h.time) + '</li>';
        }).join('') + '</ul>' : '')
        + '<div class="cor-d"><span class="label">' + esc(t('districts')) + '</span> ' + c.districts.map(esc).join(' · ') + '</div>'
        + '</article>';
    }).join('');

    $('closures').innerHTML = data.closures.length ? data.closures.map(card).join('')
      : NL.emptyState(t('noClosures'), { icon: 'shield' });
    $('ended').innerHTML = data.ended.length ? data.ended.map(card).join('')
      : NL.emptyState(t('noEnded'), { icon: 'calendar', compact: true });
    $('road-news').innerHTML = data.reported.length ? '<div class="rn-list">' + data.reported.map(function (i, idx) {
      return '<a class="rn-item" style="--i:' + idx + '" href="' + esc(i.link) + '" target="_blank" rel="noopener noreferrer">'
        + '<span class="rn-t"' + NL.langAttr(i.title) + '>' + esc(i.title) + '</span>'
        + '<span class="meta"><span class="src">' + esc(NL.srcName(i.source)) + '</span><span class="sep">·</span>'
        + NL.fresh('reported', i.time) + '<span class="read-orig">' + esc(t('readOrigArticle')) + ' <span>→</span></span></span></a>';
    }).join('') + '</div>' : NL.emptyState(t('noNews'), { icon: 'doc', compact: true });
  }

  async function load() {
    var btn = $('roads-refresh');
    btn.classList.add('spinning');
    try {
      data = await NL.api('/api/roads');
      render();
      NL.stamp('stamp-roads', true);
      NL.feed('roads', true);
    } catch (e) {
      if (!data) $('corridors').innerHTML = NL.errorState(t('err'), { mod: 'roads' });
      NL.stamp('stamp-roads', false);
      NL.feed('roads', false);
    } finally { btn.classList.remove('spinning'); }
  }

  $('roads-refresh').addEventListener('click', load);
  NL.retryHandlers.roads = load;
  NL.onLang(render);
  $('corridors').innerHTML = NL.skeleton('cards');
  NL.ticker.autoload();
  NL.renderFooter([
    { name: 'Department of Roads via BIPAD Portal', url: 'https://bipadportal.gov.np/' },
    { name: 'Department of Roads', url: 'https://dor.gov.np/' },
    { name: 'Nepali news publishers', url: '/news' },
  ]);
  load();
  setInterval(function () { if (!document.hidden) load(); }, 300e3);
})();
