/* =====================================================================
 * Nepal Live — homepage (v2)
 *
 * Every section is built from the site's own live feeds: /api/news-nepal,
 * /api/highlights, /api/trending, /api/alerts and /api/provinces. Nothing
 * here invents a headline or a number — when a feed is empty the section
 * says so and steps aside.
 *
 * Motion is hand-rolled on two primitives: an IntersectionObserver that
 * reveals a block once, and a single rAF loop that reads the scroll
 * position for the pinned rail, the drifting category words and the
 * cursor. Everything animates transform/opacity only, and none of it runs
 * when the visitor asked for reduced motion (no .js-motion class).
 * ===================================================================== */
(function () {
  'use strict';
  var NL = window.NL;
  if (!NL) return;
  var $ = function (id) { return document.getElementById(id); };
  var esc = NL.esc;
  var root = document.documentElement;
  var motion = root.classList.contains('js-motion');

  /* ------------------------------------------------------------- words */
  NL.i18n.add({
    en: {
      heroDek: 'Nepali headlines, markets, weather, alerts and sport — gathered from the newsrooms and institutions that publish them.',
      readStory: 'READ STORY', scroll: 'SCROLL', searchKick: 'SEARCH NEPAL LIVE', popular: 'Popular',
      recentStories: 'Latest stories', toClose: 'to close', ebLatest: 'THE FEED', hLatest: 'Latest from <em>Nepal</em>',
      allNews: 'All news', ebProvinces: 'ACROSS THE COUNTRY', hProvinces: 'Nepal, <em>province by province</em>',
      ebMap: 'SEVEN PROVINCES', hMap: 'Where the <em>news</em> is',
      mapDek: 'Every headline is matched to the places it names. Hover a province to see what is happening there now.',
      openMap: 'Open the full map', ebTrend: 'MOST COVERED RIGHT NOW', hTrend: 'What Nepal is <em>talking about</em>',
      footSay: 'Stay connected with Nepal.', madeBy: 'Made by', nptNote: 'All times Nepal Time (NPT, UTC+5:45)',
      navLatest: 'Latest', navNepal: 'Nepal', navPolitics: 'Politics', navBusiness: 'Business', navTech: 'Tech',
      navSports: 'Sports', navEnt: 'Entertainment', navWorld: 'World',
      allOf: 'All {c}', stories: '{n} stories', headlines: '{n} headlines',
      ebToday: 'NEPAL TODAY', hToday: 'Today in <em>Nepal</em>', topStories: 'Top stories', alertsNow: 'Official alerts',
      ebNow: 'LIVE ACROSS NEPAL', hNow: 'Nepal, <em>right now</em>', viewAll: 'View all', refresh: 'Refresh',
      lastUpd: 'Updated {t}', updAt: '{t} NPT', noUpdate: 'No update available right now', noAlerts: 'No official alerts active right now.',
      retry: 'Try again', allLive: 'Live data connected', someDown: 'Some sources unavailable',
      st_ok: 'Connected', st_part: 'Some sources unavailable', st_bad: 'Unavailable', st_wait: 'Connecting…',
      worldFixtures: 'Worldwide fixtures', f_news: 'News', f_markets: 'Markets', f_weather: 'Weather', f_sports: 'Sport', f_alerts: 'Alerts',
      sNepse: 'NEPSE {v} ({p}%)', sGold: 'gold Rs {v}/tola', sUsd: 'dollar Rs {v}', sAqi: 'air {v} at {s}', sAlerts: '{n} active alerts',
      mWeather: 'Weather', mAqi: 'Air quality', mNepse: 'NEPSE index', mGold: 'Gold & silver', mFx: 'Exchange rates',
      mQuake: 'Earthquakes', mRoads: 'Roads & highways', mSports: 'Football & cricket', mJobs: 'Jobs', mEvents: 'Events & festivals',
      mGov: 'Government services', high: 'High', low: 'Low', humidity: 'Humidity', wind: 'Wind', worstNow: 'worst air right now',
      closed: 'Market closed', open: 'Market open', tola: 'tola', fineGold: 'Fine gold (hallmark)', silver: 'Silver / tola',
      rateFor: 'Rate for', when: 'When', depth: 'Depth', dayHigh: 'Day high', dayLow: 'Day low', sellingRate: 'selling', usgsPage: 'USGS report', closures: 'closures reported',
      noQuake: 'No recent earthquake data.', quakeRule: 'USGS lists no magnitude 2.5+ quake near Nepal in the last 30 days.', nepalTeams: 'Nepal national teams', noRoads: 'No road closures reported right now.', noFixtures: 'No fixtures listed right now.',
      noJobs: 'No job listings right now.', noEvents: 'Nothing listed for the days ahead.', openJobs: '{n} open vacancies',
      govSub: 'Official portals for the services people look up most.',
      g_passport: 'Passport', g_licence: 'Driving licence', g_pan: 'PAN', g_citizenship: 'Citizenship', g_loksewa: 'Lok Sewa', g_emergency: 'Emergency numbers', sources: '{n} sources', noStories: 'No stories tagged here yet.',
      hoverProv: 'Hover a province on the map.', tapProv: 'Tap a province on the map.', capital: 'Capital', readMore: 'Read',
      unavailable: 'This feed is unavailable right now.', live: 'LIVE', breaking: 'BREAKING',
      secNews: 'News', secMoney: 'Markets', secWeather: 'Weather', secAlerts: 'Alerts', secSports: 'Sports',
      secTools: 'Tools', secJobs: 'Jobs', secEvents: 'Events', secExplore: 'Explore', secCalendar: 'Calendar',
      secGov: 'Government', secSearch: 'Search', secAccount: 'Account', colSections: 'SECTIONS', colNepal: 'TODAY IN NEPAL',
      colMore: 'MORE', goldToday: 'Gold price today', nepseToday: 'NEPSE today', fxToday: 'Dollar rate today',
      fuelToday: 'Petrol price today', dateToday: 'Nepali date today'
    },
    ne: {
      heroDek: 'नेपाली समाचार, बजार, मौसम, सतर्कता र खेलकुद — प्रकाशित गर्ने न्यूजरूम र निकायबाट सिधै।',
      readStory: 'समाचार पढ्नुहोस्', scroll: 'स्क्रोल', searchKick: 'नेपाल लाइभ खोज्नुहोस्', popular: 'लोकप्रिय',
      recentStories: 'पछिल्ला समाचार', toClose: 'बन्द गर्न', ebLatest: 'ताजा समाचार', hLatest: 'नेपालका <em>पछिल्ला</em> खबर',
      allNews: 'सबै समाचार', ebProvinces: 'देशभरबाट', hProvinces: '<em>प्रदेश अनुसार</em> नेपाल',
      ebMap: 'सात प्रदेश', hMap: '<em>समाचार</em> कहाँ छ',
      mapDek: 'हरेक समाचारलाई उल्लेख गरिएको ठाउँसँग जोडिएको छ। प्रदेशमा हेर्नुहोस् — त्यहाँ के भइरहेको छ।',
      openMap: 'पूरा नक्सा हेर्नुहोस्', ebTrend: 'अहिले सबैभन्दा चर्चामा', hTrend: 'नेपाल <em>केबारे</em> कुरा गर्दैछ',
      footSay: 'नेपालसँग जोडिइरहनुहोस्।', madeBy: 'बनाउने', nptNote: 'सबै समय नेपाल समय (NPT, UTC+5:45)',
      navLatest: 'ताजा', navNepal: 'नेपाल', navPolitics: 'राजनीति', navBusiness: 'बजार', navTech: 'प्रविधि',
      navSports: 'खेलकुद', navEnt: 'मनोरञ्जन', navWorld: 'विश्व',
      allOf: 'सबै {c}', stories: '{n} समाचार', headlines: '{n} शीर्षक',
      ebToday: 'आजको नेपाल', hToday: 'आज <em>नेपालमा</em>', topStories: 'मुख्य समाचार', alertsNow: 'आधिकारिक सतर्कता',
      ebNow: 'देशभर प्रत्यक्ष', hNow: 'नेपाल, <em>अहिले</em>', viewAll: 'सबै हेर्नुहोस्', refresh: 'ताजा गर्नुहोस्',
      lastUpd: '{t} मा अपडेट', updAt: '{t} NPT', noUpdate: 'अहिले अपडेट उपलब्ध छैन', noAlerts: 'अहिले कुनै आधिकारिक सतर्कता छैन।',
      retry: 'फेरि प्रयास', allLive: 'प्रत्यक्ष डेटा जोडिएको', someDown: 'केही स्रोत उपलब्ध छैनन्',
      st_ok: 'जोडिएको', st_part: 'केही स्रोत उपलब्ध छैनन्', st_bad: 'उपलब्ध छैन', st_wait: 'जोडिँदै…',
      worldFixtures: 'विश्वका खेल', f_news: 'समाचार', f_markets: 'बजार', f_weather: 'मौसम', f_sports: 'खेल', f_alerts: 'सतर्कता',
      sNepse: 'नेप्से {v} ({p}%)', sGold: 'सुन रु {v}/तोला', sUsd: 'डलर रु {v}', sAqi: '{s} मा वायु {v}', sAlerts: '{n} सक्रिय सतर्कता',
      mWeather: 'मौसम', mAqi: 'वायु गुणस्तर', mNepse: 'नेप्से सूचक', mGold: 'सुन र चाँदी', mFx: 'विनिमय दर',
      mQuake: 'भूकम्प', mRoads: 'सडक', mSports: 'फुटबल र क्रिकेट', mJobs: 'जागिर', mEvents: 'कार्यक्रम र चाडपर्व',
      mGov: 'सरकारी सेवा', high: 'अधिकतम', low: 'न्यूनतम', humidity: 'आर्द्रता', wind: 'हावा', worstNow: 'अहिलेको सबैभन्दा प्रदूषित',
      closed: 'बजार बन्द', open: 'बजार खुला', tola: 'तोला', fineGold: 'छापावाल सुन', silver: 'चाँदी / तोला',
      rateFor: 'मिति', when: 'कहिले', depth: 'गहिराइ', dayHigh: 'दिनको उच्च', dayLow: 'दिनको न्यून', sellingRate: 'बिक्री दर', usgsPage: 'USGS विवरण', closures: 'सडक अवरोध',
      noQuake: 'हालै भूकम्पको तथ्यांक छैन।', quakeRule: 'पछिल्ला ३० दिनमा नेपाल वरिपरि २.५+ म्याग्निच्युडको भूकम्प USGS मा छैन।', nepalTeams: 'नेपाली राष्ट्रिय टोली', noRoads: 'अहिले कुनै सडक अवरोध रिपोर्ट भएको छैन।', noFixtures: 'अहिले कुनै खेल सूचीबद्ध छैन।',
      noJobs: 'अहिले जागिरको सूची छैन।', noEvents: 'आउँदा दिनका लागि केही सूचीबद्ध छैन।', openJobs: '{n} खुला पद',
      govSub: 'सबैभन्दा धेरै खोजिने सेवाका आधिकारिक पोर्टल।',
      g_passport: 'राहदानी', g_licence: 'सवारी लाइसेन्स', g_pan: 'प्यान', g_citizenship: 'नागरिकता', g_loksewa: 'लोक सेवा', g_emergency: 'आपतकालीन नम्बर', sources: '{n} स्रोत', noStories: 'यहाँका समाचार अहिले छैनन्।',
      hoverProv: 'नक्सामा प्रदेश छान्नुहोस्।', tapProv: 'नक्सामा प्रदेश थिच्नुहोस्।', capital: 'सदरमुकाम', readMore: 'पढ्नुहोस्',
      unavailable: 'यो फिड अहिले उपलब्ध छैन।', live: 'प्रत्यक्ष', breaking: 'ब्रेकिङ',
      secNews: 'समाचार', secMoney: 'बजार', secWeather: 'मौसम', secAlerts: 'सतर्कता', secSports: 'खेलकुद',
      secTools: 'उपकरण', secJobs: 'जागिर', secEvents: 'कार्यक्रम', secExplore: 'अन्वेषण', secCalendar: 'पात्रो',
      secGov: 'सरकारी सेवा', secSearch: 'खोज', secAccount: 'खाता', colSections: 'खण्ड', colNepal: 'आजको नेपाल',
      colMore: 'थप', goldToday: 'आजको सुनको भाउ', nepseToday: 'आजको नेप्से', fxToday: 'आजको डलर दर',
      fuelToday: 'आजको पेट्रोल मूल्य', dateToday: 'आजको नेपाली मिति'
    }
  });
  var t = NL.i18n.t;
  var ne = function () { return NL.lang() === 'ne'; };

  /* ------------------------------------------------------------ motion */
  /* one observer for every "arrive once" reveal on the page */
  var io = window.IntersectionObserver ? new IntersectionObserver(function (es) {
    es.forEach(function (e) {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-in');
      io.unobserve(e.target);
    });
  }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 }) : null;
  function rv(el, kind, delay) {
    if (!el) return el;
    if (motion && io) {
      if (kind) el.setAttribute('data-rv', kind === 'img' ? '' : kind);
      else el.setAttribute('data-rv', '');
      if (kind === 'img') el.classList.add('rv-img');
      if (delay) el.setAttribute('data-rv-d', String(Math.min(5, delay)));
      io.observe(el);
    } else el.classList.add('is-in');
    return el;
  }
  function watch(el) { if (el && io) io.observe(el); else if (el) el.classList.add('is-in'); }

  /* one scroll loop drives the pinned rail, the drifting words and the bar */
  var drivers = [];
  var ticking = false;
  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(function () {
      ticking = false;
      var h = innerHeight;
      for (var i = 0; i < drivers.length; i++) drivers[i](h);
      nav.classList.toggle('is-stuck', scrollY > h * 0.72);
    });
  }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', onScroll, { passive: true });

  /* ------------------------------------------------------------- bits */
  var img = function (src, cls, eager) {
    return '<img src="' + esc(src) + '" alt="" class="' + (cls || '') + '" ' + (eager ? 'fetchpriority="high"' : 'loading="lazy"')
      + ' decoding="async" referrerpolicy="no-referrer" onerror="this.closest(\'.rv-img, .lat-media, .cat-media, .rail-media\')?.remove()">';
  };
  var out = function (i) { return 'href="' + esc(i.link) + '" target="_blank" rel="noopener noreferrer"'; };
  var when = function (i) { return Date.parse(i.pubDate || i.time) || Date.now(); };
  var srcOf = function (i) { return NL.srcName ? NL.srcName(i.source) : String(i.source || '').replace(/\s*\(EN\)$/, ''); };
  var catOf = function (i) { return NL.topicLabel ? NL.topicLabel(i.topic || 'nepal') : (i.topic || 'nepal'); };
  var num = function (n, d) { return Number(n).toLocaleString('en-IN', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }); };

  var S = { news: [], prov: [], alerts: null };

  /* the intro is decoration — take it out of the document once it has played */
  if (root.classList.contains("intro-on")) setTimeout(function () {
    var el = $("intro");
    if (el) el.remove();
    root.classList.remove("intro-on");
  }, 1700);

  /* --------------------------------------------------------------- nav */
  var nav = $('nav');
  /* the categories are their own pages now; the homepage only shows a taste */
  var NAV = [['/news', 'navLatest'], ['#rail-sec', 'navNepal'], ['/news/politics', 'navPolitics'], ['/news/business', 'navBusiness'],
    ['/news/technology', 'navTech'], ['/news/sports', 'navSports'], ['/news/entertainment', 'navEnt'], ['/news/world', 'navWorld']];
  var SECTIONS = [['/news', 'secNews'], ['/money', 'secMoney'], ['/weather', 'secWeather'], ['/alerts', 'secAlerts'],
    ['/sports', 'secSports'], ['/tools', 'secTools'], ['/jobs', 'secJobs'], ['/events', 'secEvents']];
  var TODAY = [['/gold-price', 'goldToday'], ['/nepse', 'nepseToday'], ['/exchange-rate', 'fxToday'],
    ['/fuel-price', 'fuelToday'], ['/nepali-date', 'dateToday']];
  var MORE = [['/explore', 'secExplore'], ['/calendar', 'secCalendar'], ['/government', 'secGov'], ['/search', 'secSearch'], ['/account', 'secAccount']];

  function paintNav() {
    $('nav-links').innerHTML = NAV.map(function (n) { return '<a href="' + n[0] + '">' + esc(t(n[1])) + '</a>'; }).join('');
    $('sheet-nav').innerHTML = NAV.map(function (n) { return '<a href="' + n[0] + '">' + esc(t(n[1])) + '<span aria-hidden="true">→</span></a>'; }).join('')
      + SECTIONS.map(function (n) { return '<a href="' + n[0] + '">' + esc(t(n[1])) + '<span aria-hidden="true">→</span></a>'; }).join('');
    $('sheet-foot').innerHTML = '<button type="button" data-lang-toggle>' + (ne() ? 'English' : 'नेपाली') + '</button>'
      + '<button type="button" data-theme-toggle>' + (root.getAttribute('data-theme') === 'dark' ? '☾ / ☀' : '☀ / ☾') + '</button>'
      + '<a href="/account">' + esc(t('secAccount')) + '</a>';
    $('btn-lang').textContent = ne() ? 'English' : 'नेपाली';
    $('foot-cols').innerHTML = [
      ['colSections', SECTIONS], ['colNepal', TODAY], ['colMore', MORE]
    ].map(function (c) {
      return '<div class="foot-col"><h3>' + esc(t(c[0])) + '</h3>'
        + c[1].map(function (l) { return '<a href="' + l[0] + '">' + esc(t(l[1])) + '</a>'; }).join('') + '</div>';
    }).join('');
  }

  /* theme and language reuse the shell's own handlers */
  $('btn-lang').setAttribute('data-lang-toggle', '');
  $('btn-theme').setAttribute('data-theme-toggle', '');
  $('btn-menu').addEventListener('click', function () {
    var sheet = $('sheet'), open = this.getAttribute('aria-expanded') === 'true';
    this.setAttribute('aria-expanded', String(!open));
    if (!open) { sheet.hidden = false; requestAnimationFrame(function () { sheet.classList.add('is-open'); }); }
    else { sheet.classList.remove('is-open'); setTimeout(function () { sheet.hidden = true; }, 400); }
    document.body.style.overflow = open ? '' : 'hidden';
  });
  $('sheet').addEventListener('click', function (e) { if (e.target.closest('a')) $('btn-menu').click(); });

  /* ------------------------------------------------------------ search */
  var srch = $('srch');
  function openSearch(yes) {
    if (yes) {
      srch.hidden = false;
      requestAnimationFrame(function () { srch.classList.add('is-open'); $('srch-q').focus(); });
      document.body.style.overflow = 'hidden';
    } else {
      srch.classList.remove('is-open');
      document.body.style.overflow = '';
      setTimeout(function () { srch.hidden = true; }, 500);
    }
  }
  $('btn-search').addEventListener('click', function () { openSearch(true); });
  addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !srch.hidden) openSearch(false);
    if ((e.key === '/' || (e.key === 'k' && (e.metaKey || e.ctrlKey))) && srch.hidden && !/input|textarea/i.test(e.target.tagName)) {
      e.preventDefault(); openSearch(true);
    }
  });
  $('srch-chips').innerHTML = ['Pokhara', 'NEPSE', 'Everest', 'Kathmandu', 'Passport', 'Dashain', 'Load-shedding']
    .map(function (q) { return '<a href="/search?q=' + encodeURIComponent(q) + '">' + esc(q) + '</a>'; }).join('');

  /* ------------------------------------------------------------- clock */
  function clock() {
    var el = $('hero-clock');
    if (!el) return;
    var d = new Date();
    el.textContent = (NL.dfmt ? NL.dfmt.dayY(d) : d.toDateString()) + ' · ' + (NL.nptHM ? NL.nptHM(d) : '') + ' NPT';
  }
  clock();
  setInterval(clock, 30e3);
  $('yr').textContent = new Date().getFullYear();

  /* -------------------------------------------------------------- hero */
  function paintHero() {
    var lead = S.news.filter(function (i) { return i.image; })[0] || S.news[0];
    if (!lead) return;
    var media = $('hero-media'), title = $('hero-title'), cat = $('hero-cat');
    media.insertAdjacentHTML('afterbegin', img(lead.image, '', true));
    var im = media.querySelector('img');
    if (im) {
      var show = function () { im.classList.add('is-in'); };
      if (im.complete) show(); else im.addEventListener('load', show, { once: true });
      im.addEventListener('error', function () { media.classList.add('no-img'); }, { once: true });
    }
    cat.textContent = catOf(lead);
    /* headline split into lines, each masked and lifted in */
    title.innerHTML = '<span class="ln"><i>' + esc(lead.title) + '</i></span>';
    if (ne() || /[ऀ-ॿ]/.test(lead.title)) title.setAttribute('lang', 'ne'); else title.removeAttribute('lang');
    $('hero-dek').textContent = lead.summary ? String(lead.summary).slice(0, 190) : t('heroDek');
    var cta = $('hero-cta');
    cta.setAttribute('href', lead.link);
    cta.setAttribute('target', '_blank');
    cta.setAttribute('rel', 'noopener noreferrer');
    $('hero-src').textContent = srcOf(lead) + ' · ' + NL.ago(when(lead));
    requestAnimationFrame(function () {
      title.classList.add('is-in');
      cat.classList.add('is-in');
    });
  }
  /* desktop only: the hero image drifts a little with the pointer */
  if (motion && matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var hx = 0, hy = 0, cx = 0, cy = 0, hRun = false;
    addEventListener('mousemove', function (e) {
      if (scrollY > innerHeight) return;
      hx = (e.clientX / innerWidth - .5) * 18;
      hy = (e.clientY / innerHeight - .5) * 12;
      if (!hRun) { hRun = true; requestAnimationFrame(driftHero); }
    }, { passive: true });
    var driftHero = function () {
      cx += (hx - cx) * .07; cy += (hy - cy) * .07;
      var im = $('hero-media').querySelector('img');
      if (im) im.style.translate = cx.toFixed(2) + 'px ' + cy.toFixed(2) + 'px';
      if (Math.abs(hx - cx) > .1 || Math.abs(hy - cy) > .1) requestAnimationFrame(driftHero);
      else hRun = false;
    };
  }

  /* ------------------------------------------------------------ ticker */
  function paintTicker() {
    var items = S.news.slice(0, 14);
    if (!items.length) return;
    /* the red word is earned: only an emergency-level official alert gets it */
    var severe = S.alerts && (S.alerts.items || []).some(function (a) { return a.level === 'emergency'; });
    var tag = $('tick-tag');
    tag.innerHTML = '<i></i>' + esc(severe ? t('breaking') : t('live'));
    var one = items.map(function (i) {
      return '<a class="tick-item" ' + out(i) + '><b>' + esc(srcOf(i)) + '</b> ' + esc(i.title) + '</a>';
    }).join('');
    $('tick-track').innerHTML = one + one; /* doubled so the loop is seamless */
    var w = $('tick-track').scrollWidth / 2;
    $('tick-track').style.setProperty('--tick-dur', Math.max(40, Math.round(w / 55)) + 's');
  }

  /* ------------------------------------------------- live numbers */
  var PULSE_LABEL = {
    nepse: ['NEPSE', 'नेप्से'], gold: ['GOLD / TOLA', 'सुन / तोला'], silver: ['SILVER / TOLA', 'चाँदी / तोला'],
    fx: ['USD / NPR', 'अमेरिकी डलर'], usd: ['USD / NPR', 'अमेरिकी डलर'], weather: ['KATHMANDU', 'काठमाडौँ'],
    air: ['AIR QUALITY', 'वायु गुणस्तर'], aqi: ['AIR QUALITY', 'वायु गुणस्तर'], fuel: ['PETROL / L', 'पेट्रोल / लि'],
    quake: ['LATEST QUAKE', 'पछिल्लो भूकम्प'], alerts: ['ACTIVE ALERTS', 'सक्रिय सतर्कता']
  };
  /* each highlight type carries its own shape, so each gets its own reading */
  function pulseRow(i) {
    var L = function (en, np) { return ne() ? np : en; };
    switch (i.type) {
      case 'nepse': return { k: L('NEPSE', 'नेप्से'), v: i.value, dec: 2, ch: i.change, pct: i.pct, href: '/nepse' };
      case 'gold': return { k: L('GOLD / TOLA', 'सुन / तोला'), v: i.price, pre: 'Rs ', ch: i.change, href: '/gold-price' };
      case 'usd': return { k: L('USD / NPR', 'अमेरिकी डलर'), v: i.value, dec: 2, pre: 'Rs ', ch: i.change, href: '/exchange-rate' };
      case 'aqi': return { k: L('AIR · ' + (i.station || ''), 'वायु · ' + (i.station || '')), v: i.aqi, href: '/weather' };
      case 'fuel': return { k: L('PETROL / L', 'पेट्रोल / लि'), v: i.petrol, pre: 'Rs ', ch: i.change, href: '/fuel-price' };
      case 'alerts': return { k: L('ACTIVE ALERTS', 'सक्रिय सतर्कता'), v: i.active, note: (i.top && (ne() ? i.top.titleNe : i.top.title)) || '', href: '/alerts' };
      case 'roads': return { k: L('ROAD CLOSURES', 'सडक अवरोध'), v: i.closures, note: i.top || '', href: '/roads' };
      default: return null;
    }
  }
  function paintPulse(d) {
    var rows = (d && d.items || []).map(pulseRow).filter(function (r) { return r && isFinite(r.v); }).slice(0, 5);
    if (!rows.length) { $('pulse').remove(); return; }
    $('pulse').innerHTML = rows.map(function (r) {
      var dir = r.ch > 0 ? 'up' : r.ch < 0 ? 'down' : '';
      var sub = isFinite(r.ch) && r.ch !== 0
        ? (r.ch > 0 ? '▲ ' : '▼ ') + num(Math.abs(r.ch), r.dec) + (isFinite(r.pct) ? ' (' + num(Math.abs(r.pct), 2) + '%)' : '')
        : (r.note || '');
      return '<a class="pulse-item" href="' + esc(r.href) + '">'
        + '<div class="pulse-k">' + esc(r.k) + '</div>'
        + '<div class="pulse-v" data-to="' + r.v + '" data-dec="' + (r.dec || 0) + '" data-pre="' + esc(r.pre || '') + '">'
        + esc((r.pre || '') + num(r.v, r.dec)) + '</div>'
        + '<div class="pulse-d ' + dir + '">' + esc(sub) + '</div></a>';
    }).join('');
  }

  /* -------------------------------------------------------- the feed */
  function paintLatest() {
    var items = S.news.slice(0, 7);
    var wrap = $('lat-list');
    if (!items.length) { wrap.innerHTML = '<p class="state">' + esc(t('unavailable')) + '</p>'; return; }
    wrap.innerHTML = items.map(function (i, n) {
      var lead = n === 0;
      return '<article class="lat-item' + (lead ? ' lead' : '') + '">'
        + '<div class="lat-n">' + (n + 1 < 10 ? '0' : '') + (n + 1) + '</div>'
        + (i.image ? '<a class="lat-media rv-img" ' + out(i) + '>' + img(i.image, '', lead) + '</a>' : '')
        + '<div class="lat-body">'
        + '<div class="lat-cat">' + esc(catOf(i)) + '</div>'
        + '<h3 class="lat-t"><a ' + out(i) + '>' + esc(i.title) + '</a></h3>'
        + (i.summary ? '<p class="lat-s">' + esc(i.summary) + '</p>' : '')
        + '<div class="lat-m"><b>' + esc(srcOf(i)) + '</b><span>·</span><span>' + esc(NL.ago(when(i))) + '</span></div>'
        + '</div></article>';
    }).join('');
    wrap.querySelectorAll('.lat-item').forEach(function (el, n) { rv(el, '', n % 4); });
    wrap.querySelectorAll('.lat-media').forEach(function (el) { rv(el, 'img'); });
  }

  /* ------------------------------------------- pinned horizontal rail */
  function paintRail() {
    var byProv = S.news.filter(function (i) { return i.province && i.image; });
    var items = (byProv.length >= 6 ? byProv : S.news.filter(function (i) { return i.image; })).slice(0, 10);
    var track = $('rail-track');
    if (!items.length) { $('rail-sec').remove(); return; }
    var pname = function (id) { return id && NL.provName ? NL.provName(id) : ''; };
    track.innerHTML = items.map(function (i) {
      return '<a class="rail-card" ' + out(i) + '>'
        + '<div class="rail-media">' + img(i.image) + (i.province ? '<span class="rail-prov">' + esc(pname(i.province)) + '</span>' : '') + '</div>'
        + '<div class="rail-b"><div class="rail-cat">' + esc(catOf(i)) + '</div>'
        + '<h3 class="rail-t">' + esc(i.title) + '</h3>'
        + '<div class="rail-m"><span>' + esc(srcOf(i)) + '</span>'
        + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M4 12h15M12 5l7 7-7 7"/></svg>'
        + '</div></div></a>';
    }).join('');

    /* the section is made tall enough to scroll the track sideways while it
       is pinned; on narrow screens it is a normal swipe list instead */
    var sec = $('rail-sec'), bar = $('rail-bar-i');
    function layout() {
      if (innerWidth <= 860 || !motion) { sec.style.height = ''; track.style.transform = ''; return; }
      var span = Math.max(0, track.scrollWidth - innerWidth + 40);
      sec.style.height = (innerHeight + span) + 'px';
      drive(span);
    }
    var span = 0;
    function drive(s) { span = s; }
    drivers.push(function (vh) {
      if (innerWidth <= 860 || !motion || !span) return;
      var top = sec.getBoundingClientRect().top;
      var p = Math.min(1, Math.max(0, -top / (sec.offsetHeight - vh)));
      track.style.transform = 'translate3d(' + (-p * span).toFixed(1) + 'px,0,0)';
      if (bar) bar.style.transform = 'scaleX(' + (0.12 + p * 0.88).toFixed(3) + ')';
    });
    layout();
    addEventListener('resize', layout, { passive: true });
    setTimeout(layout, 600); /* images can change the track width */
  }

  /* --------------------------------------------------------------- map */
  function paintMap() {
    var M = NL.map, wrap = $('map-wrap'), pop = $('map-pop');
    if (!M || !S.prov.length) { $('map-sec').remove(); return; }
    var counts = {};
    S.news.forEach(function (i) { if (i.province) counts[i.province] = (counts[i.province] || 0) + 1; });
    var svg = '<svg viewBox="0 0 ' + M.W + ' ' + M.H + '" role="img" aria-label="Map of Nepal">';
    svg += M.provinces.map(function (p) {
      return '<path class="mp-prov" d="' + M.path(p) + '" data-p="' + esc(p.id) + '" pathLength="1"><title>' + esc(NL.provName(p.id)) + '</title></path>';
    }).join('');
    S.prov.forEach(function (p) {
      if (!p.city) return;
      var q = M.proj(p.city.lon, p.city.lat);
      svg += '<circle class="mp-dot-h" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="5"/>'
        + '<circle class="mp-dot" cx="' + q[0].toFixed(1) + '" cy="' + q[1].toFixed(1) + '" r="3.4" data-p="' + esc(p.id) + '"/>';
    });
    wrap.innerHTML = svg + '</svg>';

    function show(id) {
      var p = S.prov.filter(function (x) { return x.id === id; })[0];
      if (!p) return;
      var top = S.news.filter(function (i) { return i.province === id; })[0];
      pop.innerHTML = '<div class="mp-name">' + esc(ne() ? p.ne : p.en) + '</div>'
        + '<div class="mp-sub">' + esc(t('capital')) + ': ' + esc(ne() ? p.capital.ne : p.capital.en)
        + ' · ' + esc(t('stories', { n: counts[id] || 0 })) + '</div>'
        + (top ? '<a class="mp-head" ' + out(top) + '>' + esc(top.title) + '</a>' : '<p class="mp-hint">' + esc(t('noStories')) + '</p>');
      wrap.querySelectorAll('.mp-prov').forEach(function (el) { el.classList.toggle('on', el.getAttribute('data-p') === id); });
    }
    var touch = !matchMedia('(hover: hover)').matches;
    function clear() {
      pop.innerHTML = '<p class="mp-hint">' + esc(t(touch ? 'tapProv' : 'hoverProv')) + '</p>';
      wrap.querySelectorAll('.mp-prov').forEach(function (el) { el.classList.remove('on'); });
    }
    /* a finger has no hover, so the panel opens on the province with the most
       stories rather than sitting empty until something is tapped */
    var busiest = Object.keys(counts).sort(function (a, b) { return counts[b] - counts[a]; })[0];
    if (touch && busiest) show(busiest); else clear();
    wrap.addEventListener('mouseover', function (e) { var p = e.target.closest('[data-p]'); if (p) show(p.getAttribute('data-p')); });
    wrap.addEventListener('click', function (e) { var p = e.target.closest('[data-p]'); if (p) show(p.getAttribute('data-p')); });
    if (!touch) wrap.addEventListener('mouseleave', clear);
    watch($('map-sec'));
  }

  /* ------------------------------------------ fullscreen categories */
  var CATS = [['politics', 'POLITICS', 'राजनीति'], ['business', 'BUSINESS', 'बजार'], ['technology', 'TECHNOLOGY', 'प्रविधि'],
    ['sports', 'SPORTS', 'खेलकुद'], ['entertainment', 'ENTERTAINMENT', 'मनोरञ्जन'], ['world', 'WORLD', 'विश्व']];
  function paintCats() {
    var host = $('cats');
    host.innerHTML = CATS.map(function (c, n) {
      var items = S.news.filter(function (i) { return (i.topic || 'nepal') === c[0]; }).slice(0, 5);
      if (!items.length) return '';
      var lead = items[0], rest = items.slice(1, 4);
      var dark = n % 2 === 1;
      return '<section class="cat-sec' + (dark ? ' dark' : ' solid') + '" id="cat-' + c[0] + '" aria-labelledby="cw-' + c[0] + '">'
        + '<h2 class="cat-word" id="cw-' + c[0] + '">' + esc(ne() ? c[2] : c[1]) + '</h2>'
        + '<div class="cat-in"><a class="cat-all" href="/news/' + c[0] + '">' + esc(t('allOf', { c: ne() ? c[2] : c[1] })) + ' <span>→</span></a>'
        + '<div class="cat-lead">'
        + (lead.image ? '<a class="cat-media rv-img" ' + out(lead) + '>' + img(lead.image) + '</a>' : '')
        + '<div><div class="cat-m">' + esc(srcOf(lead)) + ' · ' + esc(NL.ago(when(lead))) + '</div>'
        + '<h3 class="cat-t"><a ' + out(lead) + '>' + esc(lead.title) + '</a></h3></div></div>'
        + (rest.length ? '<div class="cat-grid">' + rest.map(function (i) {
          return '<a class="cat-card" ' + out(i) + '>'
            + (i.image ? '<div class="cat-media rv-img">' + img(i.image) + '</div>' : '')
            + '<h3 class="cat-t">' + esc(i.title) + '</h3>'
            + '<div class="cat-m"><span>' + esc(srcOf(i)) + '</span><span>·</span><span>' + esc(NL.ago(when(i))) + '</span></div></a>';
        }).join('') + '</div>' : '')
        + '</div></section>';
    }).join('');

    host.querySelectorAll('.cat-lead, .cat-card').forEach(function (el, n) { rv(el, '', n % 4); });
    host.querySelectorAll('.rv-img').forEach(function (el) { rv(el, 'img'); });
  }

  /* ---------------------------------------------------------- trending */
  function paintTrend(d) {
    var topics = (d && d.topics || []).slice(0, 7);
    var list = $('trend-list'), bg = $('trend-bg');
    if (!topics.length) { $('trend').remove(); return; }
    list.innerHTML = topics.map(function (tp, n) {
      var st = (tp.stories || [])[0] || {};
      return '<li class="trend-item" data-bg="' + esc((tp.stories || []).map(function (s) { return s.image; }).filter(Boolean)[0] || '') + '">'
        + '<span class="trend-n">' + (n + 1 < 10 ? '0' : '') + (n + 1) + '</span>'
        + '<div><a class="trend-t" ' + (st.link ? out(st) : 'href="/trending"') + '>' + esc(tp.term) + '</a>'
        + (st.title ? '<p class="trend-s">' + esc(st.title) + '</p>' : '') + '</div>'
        + '<span class="trend-c">' + esc(t('headlines', { n: tp.headlines || 0 })) + ' · ' + esc(t('sources', { n: tp.sources || 0 })) + '</span></li>';
    }).join('');
    /* hovering a line brings its story photo up behind the whole section */
    list.addEventListener('mouseover', function (e) {
      var it = e.target.closest('.trend-item');
      if (!it) return;
      list.classList.add('hovering');
      var src = it.getAttribute('data-bg');
      if (src) { bg.style.backgroundImage = 'url("' + src.replace(/"/g, '') + '")'; bg.classList.add('is-on'); }
      else bg.classList.remove('is-on');
    });
    list.addEventListener('mouseleave', function () { list.classList.remove('hovering'); bg.classList.remove('is-on'); });
    list.querySelectorAll('.trend-item').forEach(function (el, n) { rv(el, '', n % 5); });
  }


  /* ==================== Nepal Today + the live modules ====================
   * Every module owns four states — loading, content, empty, error — and
   * always names its source and the time it was updated. Each one fetches
   * on its own, only when it comes into view, so a slow or failed feed can
   * never take the page (or another module) down with it.
   * ===================================================================== */
  var NE_D = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];
  var neNum = function (n) { return String(n).replace(/\d/g, function (d) { return NE_D[+d]; }); };
  var NE_DOW = ['आइतबार', 'सोमबार', 'मङ्गलबार', 'बुधबार', 'बिहीबार', 'शुक्रबार', 'शनिबार'];
  var hm = function (ms) { return NL.nptHM ? NL.nptHM(new Date(ms)) : ''; };

  /* ------------------------------ feed status ------------------------------ */
  var FEED_KEYS = ['news', 'markets', 'weather', 'sports', 'alerts'];
  var FEEDS = {};
  FEED_KEYS.forEach(function (k) { FEEDS[k] = { ok: 0, bad: 0 }; });
  var lastOk = 0;
  function setFeed(k, ok) {
    if (!k || !FEEDS[k]) return;
    FEEDS[k][ok ? 'ok' : 'bad']++;
    if (ok) lastOk = Date.now();
    paintFeeds();
  }
  var feedState = function (k) {
    var f = FEEDS[k];
    return f.bad && f.ok ? 'part' : f.bad ? 'bad' : f.ok ? 'ok' : 'wait';
  };
  function paintFeeds() {
    var el = $('feeds');
    if (!el) return;
    var any = FEED_KEYS.some(function (k) { return feedState(k) === 'bad' || feedState(k) === 'part'; });
    var done = FEED_KEYS.some(function (k) { return feedState(k) !== 'wait'; });
    el.innerHTML = FEED_KEYS.map(function (k) {
      var st = feedState(k);
      return '<span class="feed ' + st + (st === 'ok' ? ' beat' : '') + '" title="' + esc(t('st_' + st)) + '"><i></i>' + esc(t('f_' + k)) + '</span>';
    }).join('')
      + (done ? '<span class="feed head">' + esc(any ? t('someDown') : t('allLive')) + '</span>' : '')
      + (lastOk ? '<span class="feed">' + esc(t('lastUpd', { t: hm(lastOk) })) + '</span>' : '')
      + '<button class="feed" type="button" data-refresh-all>' + esc(t('refresh')) + '</button>';
  }

  /* ------------------------------- briefing ------------------------------- */
  function paintBriefDate(cal) {
    var el = $('brief-date');
    if (!el) return;
    var en = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kathmandu', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());
    var np = '';
    var day = cal && cal.day;
    if (day && day.bs) {
      var mn = day.monthNameNp || day.monthNameNe || day.monthName || '';
      np = neNum(day.bs[0]) + (mn ? ' ' + mn : '') + ' ' + (day.bsNp || neNum(day.bs[2])) + ', ' + NE_DOW[day.dow || 0];
      if (day.tithi) np += ' · ' + day.tithi;
    }
    el.innerHTML = esc(en) + (np ? '<b lang="ne">' + esc(np) + '</b>' : '');
  }
  /* the summary is assembled from the numbers themselves — never written ahead */
  function paintBriefSum(h) {
    var el = $('brief-sum');
    if (!el) return;
    var bits = [];
    (h && h.items || []).forEach(function (i) {
      if (i.type === 'nepse' && isFinite(i.value)) bits.push(t('sNepse', { v: num(i.value, 2), p: (i.pct > 0 ? '+' : '') + num(i.pct, 2) }));
      if (i.type === 'gold' && isFinite(i.price)) bits.push(t('sGold', { v: num(i.price) }));
      if (i.type === 'usd' && isFinite(i.value)) bits.push(t('sUsd', { v: num(i.value, 2) }));
      if (i.type === 'aqi' && isFinite(i.aqi)) bits.push(t('sAqi', { s: i.station || '', v: i.aqi }));
      if (i.type === 'alerts' && isFinite(i.active)) bits.push(t('sAlerts', { n: i.active }));
    });
    el.textContent = bits.length ? bits.join(' · ') : t('noUpdate');
  }
  function paintBriefTop() {
    var el = $('brief-top');
    if (!el) return;
    var items = S.news.slice(0, 5);
    if (!items.length) { el.innerHTML = '<li class="mod-state">' + esc(t('noUpdate')) + '</li>'; return; }
    el.innerHTML = items.map(function (i, n) {
      return '<li><a ' + out(i) + '><span class="n">' + (n + 1 < 10 ? '0' : '') + (n + 1) + '</span>'
        + '<span><span class="h"' + NL.langAttr(i.title) + '>' + esc(i.title) + '</span>'
        + '<span class="m">' + esc(srcOf(i)) + ' · ' + esc(NL.ago(when(i))) + '</span></span></a></li>';
    }).join('');
  }
  function paintBriefAlerts(d) {
    var el = $('brief-alerts');
    if (!el) return;
    if (!d) { el.innerHTML = '<p class="mod-state">' + esc(t('noUpdate')) + '</p>'; return; }
    var items = (d.items || []).slice(0, 3);
    var counts = d.counts || {};
    var chips = ['emergency', 'warning', 'advisory', 'info'].filter(function (k) { return counts[k]; })
      .map(function (k) { return '<span class="lv-' + k + '"><i></i>' + counts[k] + ' ' + esc(t('lv_' + k)) + '</span>'; }).join('');
    if (!items.length) {
      el.innerHTML = '<p class="mod-state">' + esc(t('noAlerts')) + '</p>';
      return;
    }
    el.innerHTML = (chips ? '<div class="brief-count">' + chips + '</div>' : '')
      + items.map(function (a) {
        return '<div class="al-row lv-' + esc(a.level) + '"><i></i><div><div class="t"' + (ne() && a.titleNe ? ' lang="ne"' : '') + '>'
          + esc(ne() && a.titleNe ? a.titleNe : a.title) + '</div>'
          + '<div class="m">' + esc([a.district || a.location || '', a.time ? NL.ago(Date.parse(a.time)) : ''].filter(Boolean).join(' · ')) + '</div></div></div>';
      }).join('')
      + '<a class="mod-all" href="/alerts">' + esc(t('viewAll')) + ' <span>→</span></a>';
  }

  /* -------------------------------- modules -------------------------------- */
  function skel() { return '<div class="mod-sk"><i></i><i></i><i></i><i></i></div>'; }
  function shell(m) {
    return '<section class="mod" id="mod-' + m.key + '" aria-labelledby="mh-' + m.key + '">'
      + '<div class="mod-h"><h3 id="mh-' + m.key + '">' + esc(t(m.title)) + '</h3>'
      + (m.href ? '<a class="mod-all" href="' + m.href + '">' + esc(t('viewAll')) + ' <span>→</span></a>' : '') + '</div>'
      + '<div class="mod-b" id="mb-' + m.key + '">' + skel() + '</div>'
      + '<div class="mod-f" id="mf-' + m.key + '"></div></section>';
  }
  function foot(key, src, ms) {
    var f = $('mf-' + key);
    if (!f) return;
    f.innerHTML = (src ? (src.url ? '<a href="' + esc(src.url) + '" target="_blank" rel="noopener noreferrer">' + esc(src.name) + ' ↗</a>' : esc(src.name)) : '')
      + (ms ? '<span class="when">' + esc(t('updAt', { t: hm(ms) })) + '</span>' : '');
  }
  function put(m, html, ms) {
    var b = $('mb-' + m.key);
    if (b) b.innerHTML = html;
    foot(m.key, m.src, ms || Date.now());
    setFeed(m.feed, true);
  }
  function none(m, msg) {
    var b = $('mb-' + m.key);
    if (b) b.innerHTML = '<p class="mod-state">' + esc(msg || t('noUpdate')) + '</p>';
    foot(m.key, m.src, 0);
  }
  function oops(m) {
    var b = $('mb-' + m.key);
    if (b) {
      b.innerHTML = '<div class="mod-state">' + esc(t('noUpdate'))
        + '<button class="retry" type="button" data-remod="' + m.key + '">' + esc(t('retry')) + '</button></div>';
    }
    foot(m.key, m.src, 0);
    setFeed(m.feed, false);
  }

  var WX_CITIES = [
    ['Kathmandu', 'काठमाडौँ', 27.7172, 85.324], ['Pokhara', 'पोखरा', 28.2096, 83.9856],
    ['Biratnagar', 'विराटनगर', 26.4525, 87.2718], ['Birgunj', 'वीरगन्ज', 27.0104, 84.877],
    ['Butwal', 'बुटवल', 27.7006, 83.4484], ['Nepalgunj', 'नेपालगन्ज', 28.05, 81.6167],
    ['Dhangadhi', 'धनगढी', 28.7, 80.6], ['Janakpur', 'जनकपुर', 26.7288, 85.9266]
  ];
  var wxCity = 0;

  var MODS = [
    {
      key: 'weather', title: 'mWeather', href: '/weather', feed: 'weather',
      src: { name: 'Open-Meteo', url: 'https://open-meteo.com/' },
      load: function (m) {
        var c = WX_CITIES[wxCity];
        return get('/api/weather?lat=' + c[2] + '&lon=' + c[3]).then(function (d) {
          var cur = d && d.current;
          if (!cur || cur.temperature_2m == null) return none(m);
          var w = NL.wx(cur.weather_code);
          var day = d.daily || {};
          var hi = day.temperature_2m_max && day.temperature_2m_max[0], lo = day.temperature_2m_min && day.temperature_2m_min[0];
          put(m, '<div class="mod-top"><select class="mod-sel" id="wx-city" aria-label="' + esc(t('mWeather')) + '">'
            + WX_CITIES.map(function (x, i) { return '<option value="' + i + '"' + (i === wxCity ? ' selected' : '') + '>' + esc(ne() ? x[1] : x[0]) + '</option>'; }).join('')
            + '</select></div>'
            + '<div class="mod-v">' + Math.round(cur.temperature_2m) + '°<small> ' + esc(w.icon) + '</small></div>'
            + '<div class="mod-sub">' + esc(w.desc) + '</div>'
            + '<dl class="mod-kv">'
            + (isFinite(hi) ? '<div><dt>' + esc(t('high')) + '</dt><dd>' + Math.round(hi) + '°</dd></div>' : '')
            + (isFinite(lo) ? '<div><dt>' + esc(t('low')) + '</dt><dd>' + Math.round(lo) + '°</dd></div>' : '')
            + '<div><dt>' + esc(t('humidity')) + '</dt><dd>' + Math.round(cur.relative_humidity_2m) + '%</dd></div>'
            + '<div><dt>' + esc(t('wind')) + '</dt><dd>' + Math.round(cur.wind_speed_10m) + ' km/h</dd></div>'
            + '</dl>', Date.parse(cur.time) || Date.now());
        }).catch(function () { oops(m); });
      }
    },
    {
      key: 'aqi', title: 'mAqi', href: '/weather#air', feed: 'weather',
      src: { name: 'Department of Environment', url: 'https://pollution.gov.np/' },
      load: function (m) {
        return get('/api/aqi-stations').then(function (d) {
          var st = (d && d.stations || []).filter(function (s) { return isFinite(s.aqi); });
          if (!st.length) return none(m);
          /* the Kathmandu valley station if it is reporting, else the worst air in the country */
          var ktm = st.filter(function (s) { return /kathmandu|ratnapark|bhaktapur|lalitpur|kirtipur|pulchowk/i.test(s.name); })[0];
          var s = ktm || st.slice().sort(function (a, b) { return b.aqi - a.aqi; })[0];
          var info = NL.aqiInfo(s.aqi);
          put(m, '<div class="mod-v" style="color:' + info.color + '">' + s.aqi + '<small> US AQI</small></div>'
            + '<div class="mod-sub"><b>' + esc(info.label) + '</b> · ' + esc(s.name) + (ktm ? '' : ' — ' + esc(t('worstNow'))) + '</div>'
            + NL.aqiScale(s.aqi)
            + '<p class="mod-sub">' + esc(info.tip) + '</p>', Date.parse(s.time) || (d && Date.parse(d.fetchedAt)));
        }).catch(function () { oops(m); });
      }
    },
    {
      key: 'nepse', title: 'mNepse', href: '/nepse', feed: 'markets',
      src: { name: 'Nepal Stock Exchange', url: 'https://www.nepalstock.com/' },
      load: function (m) {
        return get('/api/nepse').then(function (d) {
          var list = (d && d.indices) || [];
          var row = list.filter(function (x) { return /^nepse/i.test(x.index || ''); })[0] || list[0];
          if (!row) return none(m);
          var v = +(row.currentValue != null ? row.currentValue : row.close);
          var ch = +row.change, pct = +row.perChange;
          if (!isFinite(v)) return none(m);
          var dir = ch > 0 ? 'up' : ch < 0 ? 'down' : '';
          var body = '<div class="mod-v">' + num(v, 2) + '</div>'
            + '<div class="mod-sub ' + dir + '">' + (ch > 0 ? '▲ ' : ch < 0 ? '▼ ' : '') + num(Math.abs(ch || 0), 2)
            + (isFinite(pct) ? ' (' + num(Math.abs(pct), 2) + '%)' : '') + '</div>'
            + '<dl class="mod-kv">'
            + (isFinite(row.high) ? '<div><dt>' + esc(t('dayHigh')) + '</dt><dd>' + num(row.high, 2) + '</dd></div>' : '')
            + (isFinite(row.low) ? '<div><dt>' + esc(t('dayLow')) + '</dt><dd>' + num(row.low, 2) + '</dd></div>' : '')
            + '</dl>';
          put(m, body, Date.parse((row.generatedTime || '') + '+05:45') || Date.now());
          /* the chart is a bonus: it only appears when the history feed answers */
          get('/api/nepse/history?size=60').then(function (h) {
            var raw = (h && (h.points || h.items || h.history)) || (Array.isArray(h) ? h : []);
            var pts = (raw || []).map(function (p) {
              return { t: Date.parse(p.date || p.t || p.time || p.businessDate), v: +(p.close != null ? p.close : (p.value != null ? p.value : p.v)) };
            }).filter(function (p) { return isFinite(p.t) && isFinite(p.v); });
            if (pts.length > 4 && $('mb-nepse')) $('mb-nepse').insertAdjacentHTML('beforeend', NL.chart(pts, { h: 62, dir: ch < 0 ? 'down' : 'up' }));
          }).catch(function () { /* the number alone is still useful */ });
        }).catch(function () { oops(m); });
      }
    },
    {
      key: 'gold', title: 'mGold', href: '/gold-price', feed: 'markets',
      src: { name: 'Hamro Patro / FEGOD', url: 'https://www.hamropatro.com/gold' },
      load: function (m) {
        return get('/api/gold-hamropatro').then(function (d) {
          var items = (d && d.items) || [];
          var pick = function (re) {
            var it = items.filter(function (x) { return re.test(x.name || x.symbol || ''); })[0];
            if (!it) return null;
            var p = (it.prices || []).filter(function (x) { return /tola/i.test(x.unit || ''); })[0] || (it.prices || [])[0];
            return p && isFinite(+p.price) ? { price: +p.price, prev: +p.prevPrice } : null;
          };
          var gold = pick(/fine|hallmark/i) || pick(/gold/i), sil = pick(/silver/i);
          var gv = gold && gold.price, sv = sil && sil.price;
          var gch = gold && isFinite(gold.prev) ? gv - gold.prev : NaN;
          if (!isFinite(gv)) return none(m);
          put(m, '<div class="mod-v">Rs ' + num(gv) + '<small> / ' + esc(t('tola')) + '</small></div>'
            + '<div class="mod-sub' + (gch > 0 ? ' up' : gch < 0 ? ' down' : '') + '">' + esc(t('fineGold'))
            + (isFinite(gch) && gch !== 0 ? ' · ' + (gch > 0 ? '▲ ' : '▼ ') + num(Math.abs(gch)) : '') + '</div>'
            + (isFinite(sv) ? '<dl class="mod-kv"><div><dt>' + esc(t('silver')) + '</dt><dd>Rs ' + num(sv) + '</dd></div>'
              + (d.date ? '<div><dt>' + esc(t('rateFor')) + '</dt><dd>' + esc(NL.dfmt.day(Date.parse(d.date + 'T12:00:00+05:45'))) + '</dd></div>' : '') + '</dl>' : ''),
            Date.parse(d.fetchedAt || d.date) || Date.now());
        }).catch(function () { oops(m); });
      }
    },
    {
      key: 'fx', title: 'mFx', href: '/exchange-rate', feed: 'markets',
      src: { name: 'Nepal Rastra Bank', url: 'https://www.nrb.org.np/forex/' },
      load: function (m) {
        return get('/api/forex').then(function (d) {
          var days = (d && d.days) || [];
          var day = days[days.length - 1];
          var rates = day && day.rates;
          if (!rates) return none(m);
          var NAMES = { USD: 'US dollar', EUR: 'Euro', GBP: 'British pound', INR: 'Indian rupee' };
          var rows = ['USD', 'EUR', 'GBP', 'INR'].map(function (c) { return rates[c] ? { c: c, r: rates[c] } : null; }).filter(Boolean);
          if (!rows.length) return none(m);
          put(m, '<ul class="mod-list">' + rows.map(function (x) {
            var unit = +(x.r.unit || 1), sell = +(x.r.sell != null ? x.r.sell : x.r.mid);
            return '<li><div class="row"><div class="t">' + esc(x.c) + (unit > 1 ? ' × ' + unit : '') + ' · Rs ' + num(sell, unit > 1 ? 3 : 2) + '</div>'
              + '<div class="m">' + esc(NAMES[x.c] || '') + ' · ' + esc(t('sellingRate')) + '</div></div></li>';
          }).join('') + '</ul>', Date.parse((day.date || '') + 'T12:00:00+05:45') || Date.now());
        }).catch(function () { oops(m); });
      }
    },
    {
      key: 'quake', title: 'mQuake', href: '/earthquakes', feed: 'alerts',
      src: { name: 'USGS', url: 'https://earthquake.usgs.gov/' },
      load: function (m) {
        return get('/api/quakes').then(function (d) {
          var f = (d && d.features || []).slice().sort(function (a, b) { return b.properties.time - a.properties.time; })[0];
          if (!f) return none(m, t('noQuake') + ' ' + t('quakeRule'));
          var p = f.properties, depth = f.geometry && f.geometry.coordinates && f.geometry.coordinates[2];
          put(m, '<div class="mod-v">M ' + num(p.mag, 1) + '</div>'
            + '<div class="mod-sub">' + esc(p.place || '') + '</div>'
            + '<dl class="mod-kv"><div><dt>' + esc(t('when')) + '</dt><dd>' + esc(NL.ago(p.time)) + '</dd></div>'
            + (isFinite(depth) ? '<div><dt>' + esc(t('depth')) + '</dt><dd>' + Math.round(depth) + ' km</dd></div>' : '') + '</dl>'
            + (p.url ? '<div class="mod-chips"><a href="' + esc(p.url) + '" target="_blank" rel="noopener noreferrer">' + esc(t('usgsPage')) + ' ↗</a></div>' : ''),
            p.time);
        }).catch(function () { oops(m); });
      }
    },
    {
      key: 'roads', title: 'mRoads', href: '/roads', feed: 'alerts',
      src: { name: 'Department of Roads via BIPAD', url: 'https://bipadportal.gov.np/' },
      load: function (m) {
        return get('/api/roads').then(function (d) {
          var cl = (d && d.closures) || [];
          if (!cl.length) return none(m, t('noRoads'));
          put(m, '<div class="mod-v">' + cl.length + '<small> ' + esc(t('closures')) + '</small></div>'
            + '<ul class="mod-list">' + cl.slice(0, 3).map(function (c) {
              return '<li><div class="row"><div class="t">' + esc(ne() && c.titleNe ? c.titleNe : c.title) + '</div>'
                + '<div class="m">' + esc([c.district || c.location || '', c.time ? NL.ago(Date.parse(c.time)) : ''].filter(Boolean).join(' · ')) + '</div></div></li>';
            }).join('') + '</ul>', Date.parse(d.fetchedAt) || Date.now());
        }).catch(function () { oops(m); });
      }
    },
    {
      key: 'sports', title: 'mSports', href: '/sports', feed: 'sports',
      src: { name: 'TheSportsDB', url: 'https://www.thesportsdb.com/' },
      load: function (m) {
        var show = function (ev, ms, nepal) {
          if (!ev.length) return none(m, t('noFixtures'));
          put(m, '<p class="mod-sub">' + esc(nepal ? t('nepalTeams') : t('worldFixtures')) + '</p><ul class="mod-list">' + ev.map(function (e) {
            var ts = Date.parse((e.strTimestamp || '').replace(' ', 'T') + (/(Z|[+-]\d\d:?\d\d)$/.test(e.strTimestamp || '') ? '' : 'Z'));
            return '<li><div class="row"><div class="t">' + esc(e.strEvent) + '</div>'
              + '<div class="m">' + esc([e.strLeague || '', isFinite(ts) ? NL.dfmt.day(ts) + ' · ' + NL.dfmt.hour(ts) : ''].filter(Boolean).join(' · ')) + '</div></div></li>';
          }).join('') + '</ul>', ms || Date.now());
        };
        /* Nepal's national fixtures matter here; world football is the fallback */
        return get('/api/nepal-sports').then(function (d) {
          var np = (d && d.fixtures || []).filter(function (e) { return e.strEvent; }).slice(0, 4);
          if (np.length) return show(np, Date.parse(d.fetchedAt), true);
          return get('/api/sport').then(function (g) {
            show((g && g.events || []).filter(function (e) { return e.strEvent; }).slice(0, 4), Date.now(), false);
          });
        }).catch(function () { oops(m); });
      }
    },
    {
      key: 'jobs', title: 'mJobs', href: '/jobs', feed: 'news',
      src: { name: 'merojob', url: 'https://merojob.com/' },
      load: function (m) {
        return get('/api/jobs').then(function (d) {
          var it = (d && d.items || []).slice(0, 3);
          if (!it.length) return none(m, t('noJobs'));
          put(m, '<ul class="mod-list">' + it.map(function (j) {
            return '<li><a href="' + esc(j.url || j.link || '/jobs') + '" target="_blank" rel="noopener noreferrer">'
              + '<div class="t">' + esc(j.title) + '</div>'
              + '<div class="m">' + esc([j.company || '', j.location || ''].filter(Boolean).join(' · ')) + '</div></a></li>';
          }).join('') + '</ul>'
            + (d.total ? '<p class="mod-sub">' + esc(t('openJobs', { n: d.total })) + '</p>' : ''), Date.parse(d.fetchedAt) || Date.now());
        }).catch(function () { oops(m); });
      }
    },
    {
      key: 'events', title: 'mEvents', href: '/events', feed: 'news',
      src: { name: 'Hamro Patro', url: 'https://www.hamropatro.com/calendar' },
      load: function (m) {
        return get('/api/events').then(function (d) {
          var it = (d && d.items || []).slice(0, 4);
          if (!it.length) return none(m, t('noEvents'));
          put(m, '<ul class="mod-list">' + it.map(function (e) {
            var ms = Date.parse((e.date || '') + 'T12:00:00+05:45');
            return '<li><div class="row"><div class="t">' + esc(ne() && e.titleNe ? e.titleNe : e.title) + '</div>'
              + '<div class="m">' + esc([isFinite(ms) ? NL.dfmt.day(ms) : e.date, e.category || ''].filter(Boolean).join(' · ')) + '</div></div></li>';
          }).join('') + '</ul>', Date.parse(d.fetchedAt) || Date.now());
        }).catch(function () { oops(m); });
      }
    },
    {
      key: 'gov', title: 'mGov', href: '/government', feed: null,
      src: { name: 'Official government portals' },
      load: function (m) {
        var links = [['passport', '/government#passport'], ['licence', '/government#transport'], ['pan', '/government#tax'],
          ['citizenship', '/government#citizenship'], ['loksewa', '/government#loksewa'], ['emergency', '/tools#emergency']];
        put(m, '<p class="mod-sub">' + esc(t('govSub')) + '</p><div class="mod-chips">'
          + links.map(function (l) { return '<a href="' + l[1] + '">' + esc(t('g_' + l[0])) + '</a>'; }).join('') + '</div>', 0);
        foot(m.key, m.src, 0);
      }
    }
  ];

  function runMod(m) { try { m.load(m); } catch (e) { oops(m); } }
  function initDash() {
    var grid = $('dash-grid');
    if (!grid) return;
    grid.innerHTML = MODS.map(shell).join('');
    paintFeeds();
    /* each module waits until it is nearly in view, so the first screen stays light */
    if (window.IntersectionObserver && motion) {
      var mo = new IntersectionObserver(function (es) {
        es.forEach(function (e) {
          if (!e.isIntersecting) return;
          mo.unobserve(e.target);
          var m = MODS.filter(function (x) { return 'mod-' + x.key === e.target.id; })[0];
          if (m) runMod(m);
        });
      }, { rootMargin: '300px 0px' });
      MODS.forEach(function (m) { var el = $('mod-' + m.key); if (el) mo.observe(el); });
    } else MODS.forEach(runMod);
  }
  document.addEventListener('click', function (e) {
    var r = e.target.closest('[data-remod]');
    if (r) {
      var m = MODS.filter(function (x) { return x.key === r.getAttribute('data-remod'); })[0];
      if (m) { $('mb-' + m.key).innerHTML = skel(); runMod(m); }
      return;
    }
    if (e.target.closest('[data-refresh-all]')) MODS.forEach(function (m) { $('mb-' + m.key).innerHTML = skel(); runMod(m); });
  });
  document.addEventListener('change', function (e) {
    if (e.target.id !== 'wx-city') return;
    wxCity = +e.target.value || 0;
    var m = MODS[0];
    $('mb-' + m.key).innerHTML = skel();
    runMod(m);
  });

  /* --------------------------------------------------------------- go */
  function get(path) {
    return fetch(path, { headers: { Accept: 'application/json' } }).then(function (r) {
      if (!r.ok) throw new Error(path + ' ' + r.status);
      return r.json();
    });
  }
  /* placeholders shaped like the content that replaces them */
  function skeletons() {
    var rows = '';
    for (var i = 0; i < 4; i++) {
      rows += '<article class="lat-item' + (i ? '' : ' lead') + '" aria-hidden="true">'
        + '<div class="lat-n sk-n"></div>'
        + '<div class="lat-media sk"></div>'
        + '<div class="lat-body"><div class="sk sk-line" style="width:90px"></div>'
        + '<div class="sk sk-line lg"></div><div class="sk sk-line lg" style="width:64%"></div>'
        + '<div class="sk sk-line" style="width:180px;margin-top:6px"></div></div></article>';
    }
    $('lat-list').innerHTML = rows;
    var cards = '';
    for (var j = 0; j < 4; j++) {
      cards += '<div class="rail-card" aria-hidden="true"><div class="rail-media sk"></div>'
        + '<div class="rail-b"><div class="sk sk-line" style="width:70px"></div>'
        + '<div class="sk sk-line lg"></div><div class="sk sk-line lg" style="width:70%"></div></div></div>';
    }
    $('rail-track').innerHTML = cards;
  }
  skeletons();
  paintNav();
  watch($('foot'));
  document.addEventListener('nl:lang', function () {
    paintNav();
    NL.i18n.apply();
    if (S.news.length) { paintHero(); paintTicker(); paintLatest(); paintRail(); paintCats(); }
  });

  get('/api/news-nepal').then(function (d) {
    S.news = (d.items || []).filter(function (i) { return i && i.title && i.link; });
    paintHero();
    paintTicker();
    paintLatest();
    paintRail();
    paintCats();
    paintBriefTop();
    setFeed('news', true);
    if (S.prov.length) paintMap();
    $('srch-list').innerHTML = S.news.slice(0, 5).map(function (i) {
      return '<li><a ' + out(i) + '>' + esc(i.title) + '</a></li>';
    }).join('');
  }).catch(function () {
    $('lat-list').innerHTML = '<p class="state">' + esc(t('unavailable')) + '</p>';
    paintBriefTop();
    setFeed('news', false);
  });

  get('/api/provinces').then(function (d) {
    S.prov = d.provinces || [];
    if (S.news.length) paintMap();
  }).catch(function () { $('map-sec').remove(); });

  get('/api/highlights').then(function (d) { paintPulse(d); paintBriefSum(d); setFeed('markets', true); })
    .catch(function () { $('pulse').remove(); paintBriefSum(null); setFeed('markets', false); });
  get('/api/calendar/today').then(paintBriefDate).catch(function () { paintBriefDate(null); });
  get('/api/trending').then(paintTrend).catch(function () { $('trend').remove(); });
  get('/api/alerts').then(function (d) {
    S.alerts = d;
    paintBriefAlerts(d);
    setFeed('alerts', true);
    if (S.news.length) paintTicker();
  }).catch(function () { paintBriefAlerts(null); setFeed('alerts', false); });
  initDash();

  onScroll();
})();
