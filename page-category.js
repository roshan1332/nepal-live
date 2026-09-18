/*
 * Category pages (/news/politics, /news/business, …).
 *
 * One module serves every topic: it reads the topic from the URL, filters the
 * same /api/news-nepal feed the rest of the site uses, and lays it out as a
 * section front — a lead story, the day's headlines, what is most covered in
 * this category, which publishers are carrying it, and the neighbouring
 * sections. Nothing is invented: an empty category says so.
 */
(function () {
  'use strict';
  var NL = window.NL;
  if (!NL) return;
  var $ = function (id) { return document.getElementById(id); };
  var esc = NL.esc;

  NL.i18n.add({
    en: {
      storiesToday: '{n} stories', pubs: '{n} publishers', updated: 'Updated {t}',
      lead: 'Leading this hour', more: 'Show more stories', all: 'All', mostCovered: 'Most covered',
      publishers: 'Publishers', otherSections: 'Other sections', backAll: 'All Nepal news',
      empty: 'No stories in this section right now.',
      emptySub: 'Nepali newsrooms file all day — this page fills as they publish. Meanwhile, try all news.',
      unavailable: 'Headlines are unavailable right now.', filterPh: 'Filter headlines…',
      inThis: 'In this section', headlines: '{n} headlines'
    },
    ne: {
      storiesToday: '{n} समाचार', pubs: '{n} प्रकाशक', updated: '{t} मा अपडेट',
      lead: 'यस घडीको मुख्य', more: 'थप समाचार', all: 'सबै', mostCovered: 'सबैभन्दा चर्चामा',
      publishers: 'प्रकाशक', otherSections: 'अन्य खण्ड', backAll: 'सबै नेपाली समाचार',
      empty: 'यस खण्डमा अहिले समाचार छैन।',
      emptySub: 'नेपाली न्यूजरूमहरूले दिनभर समाचार पठाउँछन् — प्रकाशित हुँदै जाँदा यो पृष्ठ भरिन्छ। अहिले सबै समाचार हेर्नुहोस्।',
      unavailable: 'समाचार अहिले उपलब्ध छैन।', filterPh: 'शीर्षक खोज्नुहोस्…',
      inThis: 'यस खण्डमा', headlines: '{n} शीर्षक'
    }
  });
  var t = NL.i18n.t;
  var ne = function () { return NL.lang() === 'ne'; };

  var TOPICS = ['politics', 'business', 'technology', 'sports', 'entertainment', 'world', 'society'];
  var topic = (location.pathname.split('/').filter(Boolean)[1] || 'politics').toLowerCase();
  if (TOPICS.indexOf(topic) < 0) topic = 'politics';

  /* the hero text for this topic, so the page speaks Nepali too */
  var HERO = {
    politics: ['Politics', 'Nepal <em>politics</em>', 'Parliament, the parties and the provinces — as Nepal’s newsrooms report it, updated through the day.',
      'राजनीति', 'नेपाली <em>राजनीति</em>', 'संसद्, दल र प्रदेश — नेपाली न्यूजरूमहरूले दिनभर पठाएका समाचार।'],
    business: ['Business', 'Nepal <em>business</em>', 'The economy as it is reported: banking, trade, remittances, tourism and the companies behind them.',
      'बजार', 'नेपाली <em>अर्थतन्त्र</em>', 'बैंकिङ, व्यापार, रेमिटेन्स, पर्यटन र कम्पनीहरू — प्रकाशित समाचारका आधारमा।'],
    technology: ['Technology', 'Nepal <em>technology</em>', 'Telecoms, digital payments, startups and science — the technology stories Nepali newsrooms are filing.',
      'प्रविधि', 'नेपाली <em>प्रविधि</em>', 'दूरसञ्चार, डिजिटल भुक्तानी, स्टार्टअप र विज्ञान — नेपाली न्यूजरूमका समाचार।'],
    sports: ['Sports', 'Nepal <em>sport</em>', 'The sports desk, as Nepali newsrooms report it. Live scores and fixtures live on the Sports page.',
      'खेलकुद', 'नेपाली <em>खेलकुद</em>', 'नेपाली न्यूजरूमका खेल समाचार। प्रत्यक्ष स्कोर र तालिका खेलकुद पृष्ठमा छन्।'],
    entertainment: ['Entertainment', 'Nepal <em>entertainment</em>', 'Film, music, television and the arts — reported by Nepal’s own newsrooms.',
      'मनोरञ्जन', 'नेपाली <em>मनोरञ्जन</em>', 'चलचित्र, संगीत, टेलिभिजन र कला — नेपाली न्यूजरूमबाट।'],
    world: ['World', '<em>World</em> news', 'What is happening beyond Nepal, as Nepal’s own newsrooms report it.',
      'विश्व', '<em>विश्व</em> समाचार', 'नेपालबाहिर के भइरहेको छ — नेपाली न्यूजरूमहरूकै रिपोर्टिङमा।'],
    society: ['Society', 'Nepal <em>society</em>', 'Health, education, migration and daily life across the seven provinces.',
      'समाज', 'नेपाली <em>समाज</em>', 'स्वास्थ्य, शिक्षा, आप्रवासन र सात प्रदेशको दैनिक जीवन।']
  };
  (function () {
    var h = HERO[topic];
    if (!h) return;
    NL.i18n.add({ en: { kicker: h[0], h1: h[1], sub: h[2] }, ne: { kicker: h[3], h1: h[4], sub: h[5] } });
  })();

  var S = { items: [], lang: 'all', q: '', shown: 12 };

  function base() {
    return S.items.filter(function (i) {
      if ((i.topic || 'nepal') !== topic) return false;
      if (S.lang !== 'all' && (i.lang || 'ne') !== S.lang) return false;
      if (S.q && (i.title + ' ' + (i.summary || '')).toLowerCase().indexOf(S.q) < 0) return false;
      return true;
    });
  }

  function render() {
    var list = base();
    var wrap = $('cat-list'), leadBox = $('cat-lead');
    if (!list.length) {
      leadBox.innerHTML = '';
      wrap.innerHTML = NL.emptyState(t('empty'), {
        icon: 'doc', sub: t('emptySub'), action: { label: t('backAll'), attr: 'data-all' }
      });
      $('cat-more').innerHTML = '';
      return;
    }
    /* the lead: newest story that has a picture, else simply the newest */
    var lead = list.filter(function (i) { return i.image; })[0] || list[0];
    var rest = list.filter(function (i) { return i !== lead; });
    leadBox.innerHTML = '<p class="label" data-t="lead">' + esc(t('lead')) + '</p>' + NL.story.featured(lead);
    wrap.innerHTML = '<div class="cp-list">' + rest.slice(0, S.shown).map(NL.story.compact).join('') + '</div>';
    $('cat-more').innerHTML = rest.length > S.shown
      ? '<button class="btn" type="button" data-more>' + esc(t('more')) + ' <span class="muted">' + (rest.length - S.shown) + '</span></button>' : '';
    $('cat-count').textContent = t('storiesToday', { n: list.length });
  }

  function side() {
    var mine = S.items.filter(function (i) { return (i.topic || 'nepal') === topic; });
    /* publishers carrying this category, busiest first */
    var pubs = {};
    mine.forEach(function (i) { pubs[i.source] = (pubs[i.source] || 0) + 1; });
    var names = Object.keys(pubs).sort(function (a, b) { return pubs[b] - pubs[a]; });
    $('cat-pubs').innerHTML = names.length
      ? '<ul class="pub-list">' + names.map(function (p) {
        return '<li><button type="button" data-pub="' + esc(p) + '">' + esc(NL.srcName(p)) + '</button><span class="n">' + pubs[p] + '</span></li>';
      }).join('') + '</ul>'
      : '<p class="muted small">—</p>';
    $('cat-pubcount').textContent = t('pubs', { n: names.length });
    /* the other sections, so a reader can keep moving */
    $('cat-other').innerHTML = '<ul class="pub-list">' + TOPICS.filter(function (k) { return k !== topic; }).map(function (k) {
      var n = S.items.filter(function (i) { return (i.topic || 'nepal') === k; }).length;
      return '<li><a href="/news/' + k + '">' + esc(NL.topicLabel(k)) + '</a><span class="n">' + n + '</span></li>';
    }).join('') + '<li><a href="/news">' + esc(t('backAll')) + '</a></li></ul>';
  }

  function covered(d) {
    var topics = (d && d.topics || []).filter(function (x) { return x.category === topic; }).slice(0, 5);
    $('cat-covered').innerHTML = topics.length
      ? '<ol class="covered">' + topics.map(function (x) {
        var st = (x.stories || [])[0] || {};
        return '<li><a href="' + esc(st.link || '/trending') + '"' + (st.link ? ' target="_blank" rel="noopener noreferrer"' : '') + '>'
          + '<span class="cv-term"' + NL.langAttr(x.term) + '>' + esc(x.term) + '</span>'
          + '<span class="cv-t"' + NL.langAttr(st.title || '') + '>' + esc(st.title || '') + '</span>'
          + '<span class="cv-m">' + esc(t('headlines', { n: x.headlines || 0 })) + (st.source ? ' · ' + esc(NL.srcName(st.source)) : '') + '</span></a></li>';
      }).join('') + '</ol>'
      : '<p class="muted small">—</p>';
  }

  function load() {
    return NL.api('/api/news-nepal').then(function (d) {
      S.items = (d.items || []).filter(function (i) { return i && i.title && i.link; });
      render();
      side();
      NL.stamp('stamp-cat', true);
    }).catch(function () {
      $('cat-list').innerHTML = NL.errorState(t('unavailable'), { mod: 'cat' });
      NL.stamp('stamp-cat', false);
    });
  }
  NL.retryHandlers.cat = load;

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-filter]');
    if (b) {
      S.lang = b.getAttribute('data-filter');
      S.shown = 12;
      document.querySelectorAll('[data-filter]').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      render();
      return;
    }
    if (e.target.closest('[data-more]')) { S.shown += 12; render(); return; }
    if (e.target.closest('[data-all]')) { location.href = '/news'; return; }
    var p = e.target.closest('[data-pub]');
    if (p) { location.href = '/news?src=' + encodeURIComponent(p.getAttribute('data-pub')); }
  });
  var qi = $('cat-q');
  if (qi) qi.addEventListener('input', function () { S.q = this.value.trim().toLowerCase(); S.shown = 12; render(); });

  NL.onLang(function () { render(); side(); });
  $('cat-list').innerHTML = NL.skeleton('stories');
  load();
  NL.api('/api/trending').then(covered).catch(function () { $('cat-covered').innerHTML = '<p class="muted small">—</p>'; });
  setInterval(load, 5 * 60e3);
  NL.ticker.autoload();
  NL.renderFooter([
    { name: 'OnlineKhabar', url: 'https://www.onlinekhabar.com/' },
    { name: 'Setopati', url: 'https://www.setopati.com/' },
    { name: 'Ratopati', url: 'https://www.ratopati.com/' },
    { name: 'Nagarik News', url: 'https://nagariknews.nagariknetwork.com/' },
    { name: 'The Himalayan Times', url: 'https://thehimalayantimes.com/' },
    { name: 'Khabarhub', url: 'https://english.khabarhub.com/' }
  ]);
})();
