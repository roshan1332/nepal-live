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
      allOf: 'All {c}', stories: '{n} stories', headlines: '{n} headlines', sources: '{n} sources', noStories: 'No stories tagged here yet.',
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
      allOf: 'सबै {c}', stories: '{n} समाचार', headlines: '{n} शीर्षक', sources: '{n} स्रोत', noStories: 'यहाँका समाचार अहिले छैनन्।',
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
    if (S.prov.length) paintMap();
    $('srch-list').innerHTML = S.news.slice(0, 5).map(function (i) {
      return '<li><a ' + out(i) + '>' + esc(i.title) + '</a></li>';
    }).join('');
  }).catch(function () {
    $('lat-list').innerHTML = '<p class="state">' + esc(t('unavailable')) + '</p>';
  });

  get('/api/provinces').then(function (d) {
    S.prov = d.provinces || [];
    if (S.news.length) paintMap();
  }).catch(function () { $('map-sec').remove(); });

  get('/api/highlights').then(paintPulse).catch(function () { $('pulse').remove(); });
  get('/api/trending').then(paintTrend).catch(function () { $('trend').remove(); });
  get('/api/alerts').then(function (d) { S.alerts = d; if (S.news.length) paintTicker(); }).catch(function () {});

  onScroll();
})();
