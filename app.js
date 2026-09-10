/*
 * Nepal Live — shared shell.
 *
 * Renders the chrome every page shares — sticky header, live ticker, mobile
 * drawer, global search, footer and policy sheets — and provides the UI-state
 * helpers the page scripts use (skeletons, error/empty states, relative
 * "Updated 2 min ago" stamps, feed status).
 *
 * Everything hangs off window.NL. Nothing else is declared at the top level:
 * this file shares global scope with each page's inline script and with
 * sport-page.js, and a bare `const` here would collide with theirs.
 *
 * Pages provide placeholders: <header class="nl-head" id="nl-head">,
 * <div class="nl-ticker" id="nl-ticker">, <footer class="nl-foot" id="nl-foot">,
 * and set <html data-page="home|football|cricket">.
 *
 * Set CONTACT_EMAIL below to publish a contact address; while it is empty the
 * contact sheet simply names the maintainer.
 */
(function () {
  "use strict";

  var CONTACT_EMAIL = '';                 /* e.g. 'hello@nepallive.app' */
  var MAINTAINER = 'Roshan Mainali';
  var TZ = 'Asia/Kathmandu';

  var NL = window.NL = window.NL || {};
  var root = document.documentElement;
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  NL.esc = esc;
  var store = {
    get: function (k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  NL.lang = function () { return store.get('nlive-lang') === 'ne' ? 'ne' : 'en'; };
  NL.page = root.getAttribute('data-page') || 'home';
  var HOME = NL.page === 'home';
  /* in-page anchors on the homepage, cross-page links elsewhere */
  var home = function (hash) { return (HOME ? '' : 'index.html') + hash; };
  var reduceMotion = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var noop = function () {};

  /* ---------------------------------------------------------------- strings */
  var STR = {
    en: {
      news: 'News', markets: 'Markets', football: 'Football', cricket: 'Cricket', more: 'More',
      weather: 'Weather', air: 'Air quality', quakes: 'Earthquakes', pulse: 'Market Pulse', fx: 'Exchange rates',
      gold: 'Gold & silver', nepse: 'NEPSE', sports: 'Sports',
      search: 'Search', searchPh: 'Search news, markets, teams…', menu: 'Menu', close: 'Close',
      live: 'LIVE', partial: 'PARTIAL', connecting: 'CONNECTING', npt: 'NPT',
      langOther: 'नेपाली', langOtherLabel: 'Switch to Nepali',
      dark: 'Dark mode', light: 'Light mode', toDark: 'Switch to dark mode', toLight: 'Switch to light mode',
      updated: 'Updated', justNow: 'just now', minAgo: 'min ago', hAgo: 'h ago', dAgo: 'd ago', failed: 'Update failed — retrying',
      tagline: 'Live information for Nepal.',
      explore: 'Explore', company: 'Nepal Live', sources: 'Data sources', lastUpd: 'Last updated', waiting: 'waiting for first update',
      about: 'About', contact: 'Contact', privacy: 'Privacy', terms: 'Terms', disclaimer: 'Disclaimer',
      jumpTo: 'Jump to', latest: 'Latest headlines', noResults: 'No results for', tryThese: 'Try',
      kNav: 'navigate', kOpen: 'open', kClose: 'close', results: 'results',
      retry: 'Try again', rights: 'All rights to third-party content remain with its owners.',
      nptNote: 'All times Nepal Time (NPT, UTC+5:45)', madeBy: 'Made by',
      skip: 'Skip to main content', tickerLabel: 'Live market ticker',
      kathmandu: 'Kathmandu',
      secNewsKw: 'headlines stories samachar', secMarketsKw: 'market prices rates snapshot',
      aboutTitle: 'About Nepal Live'
    },
    ne: {
      news: 'समाचार', markets: 'बजार', football: 'फुटबल', cricket: 'क्रिकेट', more: 'थप',
      weather: 'मौसम', air: 'हावाको गुणस्तर', quakes: 'भूकम्प', pulse: 'बजार विश्लेषण', fx: 'विनिमय दर',
      gold: 'सुन–चाँदी', nepse: 'नेप्से', sports: 'खेलकुद',
      search: 'खोज्नुहोस्', searchPh: 'समाचार, बजार, टिम खोज्नुहोस्…', menu: 'मेनु', close: 'बन्द',
      live: 'प्रत्यक्ष', partial: 'आंशिक', connecting: 'जडान हुँदै', npt: 'NPT',
      langOther: 'English', langOtherLabel: 'Switch to English',
      dark: 'अँध्यारो मोड', light: 'उज्यालो मोड', toDark: 'अँध्यारो मोडमा बदल्नुहोस्', toLight: 'उज्यालो मोडमा बदल्नुहोस्',
      updated: 'अपडेट', justNow: 'भर्खरै', minAgo: 'मिनेट अघि', hAgo: 'घण्टा अघि', dAgo: 'दिन अघि', failed: 'अपडेट असफल — पुनः प्रयास हुँदै',
      tagline: 'नेपालका लागि प्रत्यक्ष जानकारी।',
      explore: 'हेर्नुहोस्', company: 'नेपाल लाइभ', sources: 'तथ्यांक स्रोत', lastUpd: 'अन्तिम अपडेट', waiting: 'पहिलो अपडेट पर्खँदै',
      about: 'हाम्रो बारेमा', contact: 'सम्पर्क', privacy: 'गोपनीयता', terms: 'सर्तहरू', disclaimer: 'अस्वीकरण',
      jumpTo: 'सिधै जानुहोस्', latest: 'ताजा शीर्षक', noResults: 'कुनै नतिजा भेटिएन:', tryThese: 'यी खोज्नुहोस्',
      kNav: 'चयन', kOpen: 'खोल्नुहोस्', kClose: 'बन्द', results: 'नतिजा',
      retry: 'फेरि प्रयास गर्नुहोस्', rights: 'बाह्य सामग्रीको अधिकार सम्बन्धित मालिकमै रहन्छ।',
      nptNote: 'सबै समय नेपाली समय (NPT, UTC+5:45) मा', madeBy: 'निर्माता',
      skip: 'मुख्य सामग्रीमा जानुहोस्', tickerLabel: 'प्रत्यक्ष बजार टिकर',
      kathmandu: 'काठमाडौं',
      secNewsKw: 'headlines stories samachar', secMarketsKw: 'market prices rates snapshot',
      aboutTitle: 'नेपाल लाइभको बारेमा'
    }
  };
  var s = function (k) {
    var L = STR[NL.lang()];
    return L && L[k] != null ? L[k] : STR.en[k];
  };
  NL.s = s;

  /* ------------------------------------------------------------------ icons */
  var svg = function (body, extra) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"'
      + (extra || '') + '>' + body + '</svg>';
  };
  var ICON = {
    search: svg('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>'),
    menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    x: svg('<path d="M6 6l12 12M18 6L6 18"/>'),
    moon: svg('<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11z"/>', ' class="i-moon"'),
    sun: svg('<circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6l1.4 1.4M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4"/>', ' class="i-sun"'),
    chev: svg('<path d="M6 9l6 6 6-6"/>'),
    arrow: svg('<path d="M5 12h14M13 6l6 6-6 6"/>'),
    doc: svg('<path d="M5 4h10l4 4v12H5z"/><path d="M9 12h6M9 16h6M9 8h3"/>'),
    chart: svg('<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>'),
    coin: svg('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3.5"/>'),
    fx: svg('<path d="M17 3l4 4-4 4"/><path d="M21 7H7"/><path d="M7 21l-4-4 4-4"/><path d="M3 17h14"/>'),
    sun2: svg('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
    wind: svg('<path d="M9.6 4.6A2 2 0 1 1 11 8H2"/><path d="M12.6 19.4A2 2 0 1 0 14 16H2"/><path d="M17.7 7.7A2.5 2.5 0 1 1 19.5 12H2"/>'),
    quake: svg('<path d="M2 12h4l3-8 4 16 3-8h6"/>'),
    ball: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7.6l4.2 3-1.6 4.9H9.4L7.8 10.6z"/><path d="M12 7.6V3.2M16.2 10.6l4-1.3M14.6 15.5l2.5 3.4M9.4 15.5l-2.5 3.4M7.8 10.6l-4-1.3"/>'),
    bat: svg('<path d="M14.5 3.5l6 6-9 9a2 2 0 0 1-2.8 0l-3.2-3.2a2 2 0 0 1 0-2.8z"/><path d="M4 20l2.5-2.5"/><circle cx="18.5" cy="18.5" r="2"/>'),
    compass: svg('<circle cx="12" cy="12" r="9"/><path d="M15.5 8.5l-2 5-5 2 2-5z"/>'),
    info: svg('<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>'),
    shield: svg('<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/>'),
    building: svg('<path d="M4 21V5l8-2v18M12 9h8v12M8 8h.01M8 12h.01M8 16h.01M16 13h.01M16 17h.01"/>'),
    alert: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5M12 16.3h.01"/>'),
    calendar: svg('<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M8 3v4M16 3v4M3.5 10h17"/>'),
    inbox: svg('<path d="M3 13l3-8h12l3 8v6H3z"/><path d="M3 13h5l1.5 2.5h5L16 13h5"/>'),
    refresh: svg('<path d="M20 11a8 8 0 1 0-2.3 5.7"/><path d="M20 4v7h-7"/>')
  };
  NL.icon = ICON;

  var FLAG = '<svg class="wm-flag" viewBox="0 0 30 38" aria-hidden="true"><path d="M2.5 2.5L27 17.2H11.4L27 35.5H2.5z"/></svg>';
  var wordmark = function (tag) {
    return '<' + (tag || 'a') + ' class="wordmark" href="index.html" aria-label="Nepal Live — home">'
      + FLAG + '<span class="wm-text">NEPAL <b>LIVE</b></span><span class="wm-dot" aria-hidden="true"></span></' + (tag || 'a') + '>';
  };

  /* ------------------------------------------------------------ time utils */
  var fmtClock = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  var fmtHM = new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
  NL.nptHM = function (d) { return fmtHM.format(d || new Date()); };
  NL.ago = function (ts) {
    var sec = Math.max(0, (Date.now() - ts) / 1000);
    if (!isFinite(sec)) return '';
    if (sec < 45) return s('justNow');
    if (sec < 3600) return Math.max(1, Math.round(sec / 60)) + ' ' + s('minAgo');
    if (sec < 86400) return Math.round(sec / 3600) + ' ' + s('hAgo');
    return Math.round(sec / 86400) + ' ' + s('dAgo');
  };
  var fmtN = function (n, d) {
    return Number(n).toLocaleString('en-IN', { minimumFractionDigits: d, maximumFractionDigits: d });
  };

  /* ------------------------------------------------------------------ theme */
  var THEME_KEY = 'nlive-theme';
  NL.theme = {
    stored: function () { return store.get(THEME_KEY) || ''; },
    system: function () {
      return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },
    current: function () { return root.getAttribute('data-theme') || this.system(); },
    apply: function (mode) {
      var m = mode === 'dark' || mode === 'light' ? mode : this.system();
      root.setAttribute('data-theme', m);
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', m === 'dark' ? '#0e1014' : '#f7f6f3');
      var label = m === 'dark' ? s('toLight') : s('toDark');
      document.querySelectorAll('[data-theme-toggle]').forEach(function (b) {
        b.setAttribute('aria-label', label);
        b.setAttribute('title', label);
        var txt = b.querySelector('.tt');
        if (txt) txt.textContent = m === 'dark' ? s('light') : s('dark');
      });
      document.dispatchEvent(new CustomEvent('nl:theme', { detail: { theme: m } }));
    },
    set: function (mode) { store.set(THEME_KEY, mode); this.apply(mode); },
    toggle: function () { this.set(this.current() === 'dark' ? 'light' : 'dark'); }
  };

  /* --------------------------------------------------------------- language */
  NL.setLang = function (lang) {
    lang = lang === 'ne' ? 'ne' : 'en';
    store.set('nlive-lang', lang);
    root.setAttribute('data-lang', lang);
    root.setAttribute('lang', lang === 'ne' ? 'ne' : 'en');
    renderChrome();
    NL.theme.apply(NL.theme.stored());
    if (NL.footerSources) NL.renderFooter(NL.footerSources);
    NL.ticker.relabel();
    refreshStamps();
    document.dispatchEvent(new CustomEvent('nl:lang', { detail: { lang: lang } }));
  };

  /* ----------------------------------------------------------------- header */
  var NAV = function () {
    return [
      ['news', home('#news'), s('news')],
      ['markets', home('#markets'), s('markets')],
      ['football', 'football.html', s('football')],
      ['cricket', 'cricket.html', s('cricket')]
    ];
  };
  var MORE = function () {
    return [
      [home('#card-weather'), ICON.sun2, s('weather')],
      [home('#card-air'), ICON.wind, s('air')],
      [home('#card-quakes'), ICON.quake, s('quakes')],
      [home('#card-rates'), ICON.fx, s('fx')],
      [home('#card-analysis'), ICON.compass, s('pulse')]
    ];
  };
  var kbdHint = /Mac|iPhone|iPad/.test(navigator.platform || '') ? '⌘K' : 'Ctrl K';

  function headerHTML() {
    var active = NL.page;
    return '<div class="wrap nl-head-in">'
      + wordmark()
      + '<nav class="nl-nav" aria-label="Primary">'
      + NAV().map(function (n) {
          var on = n[0] === active;
          return '<a href="' + n[1] + '" data-nav="' + n[0] + '"' + (on ? ' class="active" aria-current="page"' : '') + '>' + esc(n[2]) + '</a>';
        }).join('')
      + '<div class="more"><button type="button" aria-expanded="false" aria-haspopup="true">' + esc(s('more')) + ICON.chev + '</button>'
      + '<div class="more-menu" role="menu">'
      + MORE().map(function (m) { return '<a role="menuitem" href="' + m[0] + '">' + m[1] + esc(m[2]) + '</a>'; }).join('')
      + '<hr><button type="button" role="menuitem" data-sheet="about">' + ICON.info + esc(s('about')) + '</button>'
      + '<button type="button" role="menuitem" data-sheet="privacy">' + ICON.shield + esc(s('privacy')) + '</button>'
      + '</div></div>'
      + '</nav>'
      + '<div class="head-tools">'
      + '<button class="search-trigger" type="button" data-search aria-label="' + esc(s('search')) + '">' + ICON.search
      + '<span>' + esc(s('searchPh')) + '</span><kbd>' + kbdHint + '</kbd></button>'
      + '<button class="icon-btn search-icon-btn" type="button" data-search aria-label="' + esc(s('search')) + '">' + ICON.search + '</button>'
      + '<button class="lang-btn desk" type="button" data-lang-toggle aria-label="' + esc(s('langOtherLabel')) + '">' + esc(s('langOther')) + '</button>'
      + '<button class="icon-btn desk" id="theme-btn" type="button" data-theme-toggle>' + ICON.moon + ICON.sun + '</button>'
      + '<button class="icon-btn nav-toggle" id="nav-btn" type="button" aria-label="' + esc(s('menu')) + '" aria-expanded="false" aria-controls="nl-drawer">' + ICON.menu + '</button>'
      + '</div></div>';
  }

  function drawerHTML() {
    var links = NAV().concat([
      ['weather', home('#card-weather'), s('weather')],
      ['air', home('#card-air'), s('air')],
      ['quakes', home('#card-quakes'), s('quakes')]
    ]);
    return '<div class="drawer-top">' + wordmark()
      + '<button class="icon-btn" type="button" data-drawer-close aria-label="' + esc(s('close')) + '">' + ICON.x + '</button></div>'
      + '<nav class="drawer-links" aria-label="Primary">'
      + links.map(function (n) {
          return '<a href="' + n[1] + '"' + (n[0] === NL.page ? ' class="active" aria-current="page"' : '') + '>' + esc(n[2]) + '<span aria-hidden="true">→</span></a>';
        }).join('')
      + '</nav>'
      + '<div class="drawer-row">'
      + '<button class="btn" type="button" data-lang-toggle>' + esc(s('langOther')) + '</button>'
      + '<button class="btn" type="button" data-theme-toggle>' + ICON.moon + ICON.sun + '<span class="tt"></span></button>'
      + '</div>'
      + '<div class="drawer-small">'
      + ['about', 'contact', 'privacy', 'terms'].map(function (k) {
          return '<button type="button" data-sheet="' + k + '">' + esc(s(k)) + '</button>';
        }).join('')
      + '</div>';
  }

  function tickerHTML() {
    return '<div class="wrap tk-in">'
      + '<div class="tk-label"><span class="tk-dot" aria-hidden="true"></span><span class="tk-status">' + esc(s('connecting')) + '</span>'
      + '<span class="tk-clock" id="tk-clock">--:--<span class="sec">:--</span></span><span class="tk-npt">NPT</span></div>'
      + '<div class="tk-view"><div class="tk-track is-static" id="tk-track">'
      + '<span class="tk-grp">' + [1, 2, 3, 4, 5].map(function () { return '<span class="sk tk-sk"></span>'; }).join('') + '</span>'
      + '</div></div></div>';
  }

  var drawer, scrim, searchDlg;
  function renderChrome() {
    var head = document.getElementById('nl-head');
    if (head) head.innerHTML = headerHTML();
    var tk = document.getElementById('nl-ticker');
    if (tk) {
      if (!tk.firstChild) tk.innerHTML = tickerHTML();
      tk.setAttribute('aria-label', s('tickerLabel'));
      paintStatus();
    }
    if (!drawer) {
      drawer = document.createElement('div');
      drawer.className = 'nl-drawer';
      drawer.id = 'nl-drawer';
      drawer.setAttribute('aria-label', s('menu'));
      document.body.appendChild(drawer);
      scrim = document.createElement('div');
      scrim.className = 'nav-scrim';
      document.body.appendChild(scrim);
      scrim.addEventListener('click', function () { openDrawer(false); });
    }
    drawer.innerHTML = drawerHTML();
    var skip = document.querySelector('.skip-link');
    if (skip) skip.textContent = s('skip');
    if (searchDlg) {
      searchDlg.querySelector('.s-input').placeholder = s('searchPh');
      searchDlg.querySelector('.s-foot').innerHTML = searchFoot();
    }
    tickClock();
    if (HOME) spy();
  }

  function openDrawer(yes) {
    if (!drawer) return;
    var btn = document.getElementById('nav-btn');
    drawer.classList.toggle('open', yes);
    scrim.classList.toggle('open', yes);
    document.body.classList.toggle('nav-open', yes);
    if (btn) btn.setAttribute('aria-expanded', yes ? 'true' : 'false');
    if (yes) { var a = drawer.querySelector('.drawer-links a'); if (a) setTimeout(function () { a.focus(); }, 60); }
    else if (btn && drawer.contains(document.activeElement)) btn.focus();
  }

  /* scrollspy: on the homepage the News / Markets tabs follow the reader */
  var spyObs;
  function spy() {
    if (!('IntersectionObserver' in window)) return;
    if (spyObs) spyObs.disconnect();
    var secs = ['news', 'markets'].map(function (id) { return document.getElementById(id); }).filter(Boolean);
    if (!secs.length) return;
    var vis = {};
    spyObs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { vis[e.target.id] = e.isIntersecting; });
      var cur = vis.markets ? 'markets' : vis.news ? 'news' : '';
      document.querySelectorAll('.nl-nav > a').forEach(function (a) {
        a.classList.toggle('active', a.getAttribute('data-nav') === cur);
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    secs.forEach(function (el) { spyObs.observe(el); });
  }

  /* ------------------------------------------------------------------ clock */
  function tickClock() {
    var el = document.getElementById('tk-clock');
    if (!el) return;
    var t = fmtClock.format(new Date());
    el.innerHTML = t.slice(0, 5) + '<span class="sec">' + t.slice(5) + '</span>';
  }

  /* ----------------------------------------------------------------- ticker */
  var TK_ORDER = ['nepse', 'gold', 'silver', 'usd', 'eur', 'inr', 'weather', 'aqi'];
  var tkItems = {}, tkSig = '', tkQueued = false;
  var tkInner = function (it) {
    return '<span class="tk-k">' + esc(it.k) + '</span>'
      + (it.sw ? '<i class="tk-sw" style="background:' + esc(it.sw) + '"></i>' : '')
      + '<span class="tk-v">' + esc(it.v) + '</span>'
      + (it.d ? '<span class="tk-d ' + (it.dir || 'flat') + '">' + esc(it.d) + '</span>' : '');
  };
  var tkItem = function (key, it, dup) {
    return '<a class="tk-item" href="' + esc(it.href || '#') + '" data-tk="' + key + '"'
      + (dup ? ' tabindex="-1"' : '') + (it.title ? ' title="' + esc(it.title) + '"' : '') + '>' + tkInner(it) + '</a>';
  };
  function renderTicker() {
    tkQueued = false;
    var track = document.getElementById('tk-track');
    if (!track) return;
    var keys = TK_ORDER.filter(function (k) { return tkItems[k]; });
    if (!keys.length) return;
    var sig = keys.join(',');
    if (sig === tkSig) {
      /* same items: update values in place so the marquee does not restart */
      keys.forEach(function (k) {
        var html = tkInner(tkItems[k]);
        track.querySelectorAll('[data-tk="' + k + '"]').forEach(function (el) {
          if (el.innerHTML === html) return;
          el.innerHTML = html;
          el.classList.remove('tk-flash'); void el.offsetWidth; el.classList.add('tk-flash');
        });
      });
      return;
    }
    tkSig = sig;
    var grp = function (dup) { return keys.map(function (k) { return tkItem(k, tkItems[k], dup); }).join(''); };
    track.innerHTML = '<span class="tk-grp">' + grp(false) + '</span><span class="tk-grp tk-dup" aria-hidden="true">' + grp(true) + '</span>';
    requestAnimationFrame(sizeTicker);
  }
  function sizeTicker() {
    var track = document.getElementById('tk-track');
    if (!track) return;
    var view = track.parentElement, g = track.querySelector('.tk-grp');
    if (!g) return;
    var w = g.offsetWidth;
    var marquee = !reduceMotion && innerWidth > 820 && w > view.clientWidth - 8;
    track.classList.toggle('is-static', !marquee);
    /* ~34 px/s: calm enough to read every value as it passes */
    track.style.setProperty('--tk-dur', Math.max(28, Math.round(w / 34)) + 's');
  }
  NL.ticker = {
    set: function (key, it) {
      if (!it) return;
      tkItems[key] = it;
      if (!tkQueued) { tkQueued = true; requestAnimationFrame(renderTicker); }
    },
    relabel: function () { tkSig = ''; if (Object.keys(tkItems).length) renderTicker(); }
  };

  /* Ticker item builders — shared by the homepage modules and by autoload() on
     the sports pages, so a number looks the same wherever it appears. */
  var arrow = function (x) { return x > 0 ? '▲' : x < 0 ? '▼' : '•'; };
  var dirOf = function (x) { return x > 0 ? 'up' : x < 0 ? 'down' : 'flat'; };
  var ne = function () { return NL.lang() === 'ne'; };
  NL.tk = {
    nepse: function (idx) {
      return { k: ne() ? 'नेप्से' : 'NEPSE', v: fmtN(idx.currentValue, 2),
        d: arrow(idx.change) + ' ' + fmtN(Math.abs(idx.perChange), 2) + '%', dir: dirOf(idx.change),
        href: home('#card-nepse'), title: 'NEPSE Index' };
    },
    metal: function (key, price, prev) {
      var chg = prev != null ? price - prev : null;
      var pct = chg != null && prev ? chg / prev * 100 : null;
      var label = key === 'gold' ? (ne() ? 'सुन' : 'GOLD') : (ne() ? 'चाँदी' : 'SILVER');
      return { k: label, v: 'Rs ' + fmtN(price, 0),
        d: pct == null ? (ne() ? '/तोला' : '/tola') : arrow(chg) + ' ' + fmtN(Math.abs(pct), 2) + '%', dir: pct == null ? 'flat' : dirOf(chg),
        href: home('#card-gold'), title: (key === 'gold' ? 'Gold (hallmark)' : 'Silver') + ' per tola · Hamro Patro / FEGOD' };
    },
    fx: function (code, value, change, pct) {
      var dp = value < 10 ? 3 : 2;
      return { k: code, v: 'Rs ' + fmtN(value, dp),
        d: change == null ? '' : (Number(change.toFixed(dp)) === 0 ? '• 0.00%' : arrow(change) + ' ' + fmtN(Math.abs(pct), 2) + '%'),
        dir: change == null ? 'flat' : dirOf(Number(change.toFixed(dp))),
        href: home('#card-rates'), title: code + '/NPR · Nepal Rastra Bank' };
    },
    weather: function (temp, city) {
      return { k: city || s('kathmandu'), v: Math.round(temp) + '°C', href: home('#card-weather') };
    },
    aqi: function (v, label, color) {
      return { k: 'AQI', v: String(Math.round(v)), d: label, sw: color, dir: 'flat', href: home('#card-air'), title: 'US AQI · Open-Meteo' };
    }
  };

  /* The sports pages have no market modules of their own, so the ticker fetches
     its handful of numbers itself (all server-cached; no extra upstream load). */
  NL.ticker.autoload = function () {
    var get = function (u) {
      return fetch(u, { cache: 'no-store' }).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); });
    };
    var AQI = [[50, '#2fb36d', 'Good', 'राम्रो'], [100, '#e3b008', 'Moderate', 'मध्यम'], [150, '#ea7a1e', 'Sensitive', 'संवेदनशील'],
      [200, '#e0344e', 'Unhealthy', 'अस्वस्थ'], [300, '#9b59b6', 'Very unhealthy', 'अत्यन्त अस्वस्थ'], [1e9, '#7b2d3b', 'Hazardous', 'खतरनाक']];
    function run() {
      get('/api/nepse').then(function (d) {
        var i = (d.indices || []).filter(function (x) { return x.index === 'NEPSE Index'; })[0];
        if (i) NL.ticker.set('nepse', NL.tk.nepse(i));
      }).catch(noop);
      get('/api/gold-hamropatro').then(function (d) {
        (d.items || []).forEach(function (it) {
          var sym = String(it.symbol || it.name).toUpperCase();
          var key = sym.indexOf('HALMARK') >= 0 ? 'gold' : sym.indexOf('SILVER') >= 0 ? 'silver' : '';
          var tola = (it.prices || []).filter(function (p) { return /tola/i.test(p.unit); })[0];
          if (key && tola) NL.ticker.set(key, NL.tk.metal(key, tola.price, tola.prevPrice));
        });
      }).catch(noop);
      get('/api/forex').then(function (d) {
        var last = d.days[d.days.length - 1], prev = d.days[d.days.length - 2];
        ['USD', 'EUR', 'INR'].forEach(function (c) {
          var r = last.rates[c]; if (!r) return;
          var b = prev && prev.rates[c] ? prev.rates[c].mid : null;
          NL.ticker.set(c.toLowerCase(), NL.tk.fx(c, r.mid, b == null ? null : r.mid - b, b ? (r.mid - b) / b * 100 : 0));
        });
      }).catch(noop);
      get('/api/weather').then(function (d) { NL.ticker.set('weather', NL.tk.weather(d.current.temperature_2m)); }).catch(noop);
      get('/api/air').then(function (d) {
        var v = d.current.us_aqi; if (v == null) return;
        var b = AQI.filter(function (x) { return v <= x[0]; })[0];
        NL.ticker.set('aqi', NL.tk.aqi(v, ne() ? b[3] : b[2], b[1]));
      }).catch(noop);
    }
    run();
    setInterval(function () { if (!document.hidden) run(); }, 180e3);
  };

  /* ------------------------------------------------------------ feed status */
  var feeds = {};
  NL.lastUpdated = 0;
  NL.feed = function (mod, ok) {
    feeds[mod] = ok;
    if (ok) NL.lastUpdated = Date.now();
    paintStatus();
    paintFootUpdated();
  };
  function paintStatus() {
    var label = document.querySelector('.tk-label');
    if (!label) return;
    var vals = Object.keys(feeds).map(function (k) { return feeds[k]; });
    var allOk = vals.length && vals.every(Boolean);
    var anyBad = vals.some(function (v) { return v === false; });
    label.classList.toggle('is-live', !!allOk);
    label.classList.toggle('is-degraded', !allOk && anyBad);
    var st = label.querySelector('.tk-status');
    if (st) st.textContent = allOk ? s('live') : anyBad ? s('partial') : s('connecting');
  }
  function paintFootUpdated() {
    var el = document.getElementById('foot-upd');
    if (!el) return;
    el.textContent = NL.lastUpdated ? NL.nptHM(new Date(NL.lastUpdated)) + ' NPT · ' + NL.ago(NL.lastUpdated) : s('waiting');
  }

  /* --------------------------------------------------------- update stamps */
  /* Stamps read "Updated 2 min ago" and keep ageing on their own; the exact
     NPT time sits in the tooltip. */
  NL.stamp = function (el, ok, extra) {
    if (typeof el === 'string') el = document.getElementById(el);
    if (!el) return;
    if (ok) {
      el.setAttribute('data-ts', String(Date.now()));
      el.setAttribute('data-extra', extra || '');
      el.title = s('updated') + ' ' + NL.nptHM() + ' NPT';
    } else el.removeAttribute('data-ts');
    el.classList.toggle('err', !ok);
    paintStamp(el);
  };
  function paintStamp(el) {
    var ts = +el.getAttribute('data-ts');
    if (!ts) { if (el.classList.contains('err')) el.textContent = s('failed'); return; }
    var extra = el.getAttribute('data-extra');
    el.textContent = s('updated') + ' ' + NL.ago(ts) + (extra ? ' · ' + extra : '');
  }
  function refreshStamps() {
    document.querySelectorAll('.stamp[data-ts], .stamp.err').forEach(paintStamp);
    document.querySelectorAll('[data-ago]').forEach(function (el) {
      el.textContent = NL.ago(+el.getAttribute('data-ago'));
    });
    paintFootUpdated();
  }
  NL.refreshStamps = refreshStamps;

  /* ------------------------------------------------------------ UI states */
  /* Skeletons mirror the shape of the content they stand in for, so nothing
     jumps when a slow feed lands. */
  var rep = function (n, h) { var o = ''; for (var i = 0; i < n; i++) o += h; return o; };
  NL.skeleton = function (kind) {
    var rows = {
      value: '<div class="sk sk-num"></div><div class="sk sk-line"></div><div class="sk sk-line sm"></div>',
      block: '<div class="sk sk-num"></div><div class="sk sk-block"></div><div class="sk sk-line sm"></div>',
      rows: rep(5, '<div class="sk sk-line"></div>') + '<div class="sk sk-line sm"></div>',
      tiles: '<div class="sk-row"><div class="sk sk-block"></div><div class="sk sk-block"></div></div><div class="sk sk-line"></div><div class="sk sk-line sm"></div>',
      cards: rep(2, '<div class="sk-row">' + rep(3, '<div class="sk sk-block"></div>') + '</div>'),
      feature: '<div class="sk sk-img"></div><div class="sk sk-kicker"></div><div class="sk sk-title lg"></div><div class="sk sk-title lg" style="width:70%"></div><div class="sk sk-line"></div><div class="sk sk-meta"></div>',
      stories: rep(5, '<div class="sk-story"><div><div class="sk sk-kicker" style="margin-top:0"></div><div class="sk sk-line"></div><div class="sk sk-line" style="width:80%"></div><div class="sk sk-meta"></div></div><div class="sk sk-img sq"></div></div>'),
      grid: '<div class="latest-grid">' + rep(6, '<div><div class="sk sk-img" style="aspect-ratio:16/10"></div><div class="sk sk-kicker"></div><div class="sk sk-line"></div><div class="sk sk-line" style="width:75%"></div><div class="sk sk-meta"></div></div>') + '</div>',
      tile: '<div class="sk sk-line sm" style="width:40%"></div><div class="sk sk-num"></div><div class="sk sk-line sm"></div><div class="sk sk-block" style="height:34px;margin-top:auto"></div>',
      scores: '<div class="sb-grid">' + rep(6, '<div class="sb sk-sb"><div class="sk sk-line sm"></div><div class="sk-row"><div class="sk sk-circle"></div><div class="sk sk-num" style="width:64px;margin:6px auto"></div><div class="sk sk-circle"></div></div><div class="sk sk-line sm" style="width:55%"></div></div>') + '</div>',
      list: rep(4, '<div class="sb sk-sb"><div class="sk sk-line sm"></div><div class="sk-row"><div class="sk sk-circle"></div><div class="sk sk-num" style="width:64px;margin:6px auto"></div><div class="sk sk-circle"></div></div></div>')
    };
    return '<div class="skeleton" aria-busy="true" aria-hidden="true">' + (rows[kind] || rows.rows) + '</div>';
  };

  /* A failed feed shows what happened, when we last had data, and a way to retry
     — never a broken-looking value, and never the whole page. */
  NL.errorState = function (msg, opts) {
    opts = opts || {};
    var stale = opts.stale ? '<div class="state-sub">' + esc(opts.stale) + '</div>' : '';
    return '<div class="state is-error' + (opts.compact ? ' compact' : '') + '" role="status">'
      + '<span class="state-i" aria-hidden="true">' + ICON.alert + '</span>'
      + '<div class="state-msg">' + esc(msg) + '</div>' + stale
      + (opts.mod ? '<button class="retry" type="button" data-retry="' + esc(opts.mod) + '">' + ICON.refresh + esc(s('retry')) + '</button>' : '')
      + '</div>';
  };
  NL.emptyState = function (msg, opts) {
    opts = opts || {};
    return '<div class="state' + (opts.compact ? ' compact' : '') + '" role="status">'
      + '<span class="state-i" aria-hidden="true">' + (ICON[opts.icon] || ICON.inbox) + '</span>'
      + '<div class="state-msg">' + esc(msg) + '</div>'
      + (opts.sub ? '<div class="state-sub">' + esc(opts.sub) + '</div>' : '')
      + (opts.action ? '<button class="retry ghost" type="button" ' + opts.action.attr + '>' + esc(opts.action.label) + '</button>' : '')
      + '</div>';
  };

  /* Wrap a render so one bad payload cannot take down the rest of the page. */
  NL.guard = function (name, fn) {
    return function () {
      try { return fn.apply(this, arguments); }
      catch (e) { console.error('[nepal-live] ' + name + ' failed:', e); }
    };
  };

  /* Delegated retry: any [data-retry="mod"] button calls NL.retryHandlers[mod]. */
  NL.retryHandlers = {};

  /* Brief highlight on a card reached through a link or search result. */
  NL.flash = function (el) {
    if (!el) return;
    el.classList.remove('target-flash'); void el.offsetWidth; el.classList.add('target-flash');
  };

  /* ---------------------------------------------------------------- sports */
  /* One scoreboard renderer shared by the homepage preview and the sports
     pages. TheSportsDB statuses are free text, so they are normalised first. */
  var SP = {
    en: { live: 'Live', ft: 'FT', final: 'Final', ns: 'Upcoming', past: 'No result yet', off: 'Postponed',
      today: 'Today', tomorrow: 'Tomorrow', yesterday: 'Yesterday', round: 'Round', started: 'Kick-off' },
    ne: { live: 'प्रत्यक्ष', ft: 'समाप्त', final: 'समाप्त', ns: 'आगामी', past: 'नतिजा आएको छैन', off: 'स्थगित',
      today: 'आज', tomorrow: 'भोलि', yesterday: 'हिजो', round: 'चरण', started: 'सुरु' }
  };
  var sp = function (k) { return (SP[NL.lang()] || SP.en)[k]; };
  var LIVE_SET = ['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE', 'IN PLAY', 'INPLAY', '1ST INNINGS', '2ND INNINGS',
    '3RD INNINGS', '4TH INNINGS', 'STUMPS', 'TEA', 'LUNCH', 'DRINKS', 'SUPER OVER', 'INNINGS BREAK'];
  var DONE_SET = ['FT', 'AET', 'PEN', 'FINISHED', 'COMPLETE', 'COMPLETED', 'MATCH FINISHED', 'ENDED', 'RESULT', 'AOT'];
  var OFF_SET = ['PPD', 'CANC', 'ABD', 'POSTPONED', 'CANCELLED', 'ABANDONED', 'NO RESULT', 'SUSP', 'INT'];
  var fmtDayISO = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });
  var nptISO = function (offsetDays) {
    var p = fmtDayISO.format(new Date()).split('-').map(Number);
    return new Date(Date.UTC(p[0], p[1] - 1, p[2] + (offsetDays || 0))).toISOString().slice(0, 10);
  };
  var kickoff = function (ev) {
    if (!ev.strTimestamp) return null;
    var d = new Date(String(ev.strTimestamp).replace(' ', 'T').replace(/(\+00:00|Z)?$/, 'Z'));
    return isNaN(d) ? null : d;
  };
  var scoreOf = function (ev, side) {
    var v = side === 'h' ? (ev.intHomeScore != null ? ev.intHomeScore : ev.strHomeScore) : (ev.intAwayScore != null ? ev.intAwayScore : ev.strAwayScore);
    return v == null || String(v).trim() === '' ? null : String(v).trim();
  };
  NL.sport = {
    nptISO: nptISO,
    kickoff: kickoff,
    /* 'live' | 'done' | 'off' | 'ns' | 'past' (kick-off long gone, feed never
       reported a result — shown honestly instead of as "upcoming") */
    classify: function (ev) {
      var st = String(ev.strStatus || '').trim().toUpperCase();
      if (LIVE_SET.indexOf(st) >= 0) return 'live';
      if (DONE_SET.indexOf(st) >= 0) return 'done';
      if (OFF_SET.indexOf(st) >= 0 || String(ev.strPostponed).toLowerCase() === 'yes') return 'off';
      var ko = kickoff(ev);
      var hasScore = scoreOf(ev, 'h') != null && scoreOf(ev, 'a') != null;
      if (ko && Date.now() - ko > 3 * 3600e3) return hasScore ? 'done' : 'past';
      return 'ns';
    },
    ms: function (ev) {
      var k = kickoff(ev);
      return k ? +k : Date.parse((ev.dateEvent || '') + 'T00:00:00Z') || 0;
    },
    dayLabel: function (iso) {
      if (iso === nptISO(0)) return sp('today');
      if (iso === nptISO(1)) return sp('tomorrow');
      if (iso === nptISO(-1)) return sp('yesterday');
      return new Intl.DateTimeFormat(NL.lang() === 'ne' ? 'ne-NP' : 'en-GB', { timeZone: 'UTC', weekday: 'short', day: 'numeric', month: 'short' })
        .format(new Date(iso + 'T00:00:00Z'));
    },
    nptDate: function (ev) {
      var k = kickoff(ev);
      return k ? fmtDayISO.format(k) : (ev.dateEvent || '');
    },
    card: function (ev, i, opts) {
      opts = opts || {};
      var cls = NL.sport.classify(ev);
      var hs = scoreOf(ev, 'h'), as = scoreOf(ev, 'a');
      var hasScore = hs != null && as != null && cls !== 'ns';
      var hn = parseFloat(hs), an = parseFloat(as);
      var decided = hasScore && cls === 'done' && isFinite(hn) && isFinite(an) && hn !== an;
      var ko = kickoff(ev);
      var raw = String(ev.strStatus || '').trim();
      var prog = String(ev.strProgress || '').trim();
      var ini = function (n) {
        return String(n || '?').replace(/[^A-Za-z0-9 ]/g, '').split(/\s+/).filter(Boolean).slice(0, 2)
          .map(function (w) { return w[0]; }).join('').toUpperCase() || '?';
      };
      var logo = function (url, name) {
        var i2 = esc(ini(name));
        return '<span class="sb-logo">' + (url
          ? '<img src="' + esc(url) + '/tiny" data-full="' + esc(url) + '" alt="" loading="lazy" decoding="async" width="42" height="42" data-ini="' + i2 + '"'
            + ' onerror="if(this.dataset.full&&this.src!==this.dataset.full){this.src=this.dataset.full;this.dataset.full=\'\'}else{this.outerHTML=\'<span class=ini>\'+this.dataset.ini+\'</span>\'}">'
          : '<span class="ini">' + i2 + '</span>') + '</span>';
      };
      var team = function (name, badge, lose) {
        return '<div class="sb-team' + (lose ? ' lose' : '') + '">' + logo(badge, name)
          + '<span class="sb-name">' + esc(name || '—') + '</span></div>';
      };
      var state, center;
      var time = ko ? NL.nptHM(ko) : '';
      if (cls === 'live') state = '<span class="sb-state live"><i></i>' + esc(sp('live')) + '</span>';
      else if (cls === 'done') state = '<span class="sb-state done">' + esc(raw && raw.toUpperCase() !== 'FT' ? raw : sp('ft')) + '</span>';
      else if (cls === 'off') state = '<span class="sb-state">' + esc(sp('off')) + '</span>';
      else if (cls === 'past') state = '<span class="sb-state">' + esc(sp('past')) + '</span>';
      else state = '<span class="sb-state">' + esc(sp('ns')) + '</span>';
      /* grouped lists already carry a day heading, so cards there skip the day */
      var dayTxt = opts.noDay ? '' : NL.sport.dayLabel(NL.sport.nptDate(ev));
      if (hasScore) {
        var long = String(hs).length + String(as).length > 4;
        center = '<div class="sb-score' + (long ? ' long' : '') + '"><span' + (decided && hn < an ? ' class="lose"' : '') + '>' + esc(hs) + '</span>'
          + '<span class="dash">–</span><span' + (decided && an < hn ? ' class="lose"' : '') + '>' + esc(as) + '</span></div>'
          + '<div class="sb-when' + (cls === 'live' ? ' hot' : '') + '">' + esc(cls === 'live' ? (prog ? prog + (/^\d+$/.test(prog) ? '′' : '') : raw || sp('live')) : dayTxt || (time ? time + ' NPT' : '')) + '</div>';
      } else {
        center = '<div class="sb-time">' + (time || '—') + '</div>'
          + '<div class="sb-when' + (cls === 'live' ? ' hot' : '') + '">' + esc(cls === 'live' ? (raw || sp('live')) : (dayTxt ? dayTxt + (time ? ' · NPT' : '') : 'NPT')) + '</div>';
      }
      var foot = [];
      if (ev.strResult && cls !== 'ns') foot.push('<span class="res">' + esc(String(ev.strResult).replace(/<[^>]+>/g, ' ').trim().slice(0, 120)) + '</span>');
      else if (ev.strVenue) foot.push(ICON.building + '<span>' + esc(ev.strVenue) + '</span>');
      if (!foot.length && ev.intRound && ev.intRound !== '0') foot.push('<span>' + esc(sp('round')) + ' ' + esc(ev.intRound) + '</span>');
      return '<article class="sb' + (cls === 'live' ? ' is-live' : '') + '" style="--i:' + (i || 0) + '">'
        + '<div class="sb-top"><span class="sb-comp">'
        + (ev.strLeagueBadge ? '<img src="' + esc(ev.strLeagueBadge) + '/tiny" alt="" loading="lazy" decoding="async" onerror="this.remove()">' : '')
        + '<span>' + esc(ev.strLeague || '') + (ev.strCountry && !opts.compact ? ' · ' + esc(ev.strCountry) : '') + '</span></span>' + state + '</div>'
        + '<div class="sb-main">' + team(ev.strHomeTeam, ev.strHomeTeamBadge, decided && hn < an)
        + '<div class="sb-center">' + center + '</div>'
        + team(ev.strAwayTeam, ev.strAwayTeamBadge, decided && an < hn) + '</div>'
        + (foot.length && !opts.noFoot ? '<div class="sb-foot">' + foot.join('') + '</div>' : '')
        + '</article>';
    }
  };

  /* ----------------------------------------------------------------- search */
  var SECTIONS = function () {
    var ne2 = ne();
    return [
      { title: s('news'), sub: ne2 ? 'नेपाली समाचार कक्षका ताजा शीर्षक' : 'Latest headlines from Nepali newsrooms', href: home('#news'), icon: 'doc', kw: 'news headlines samachar समाचार latest' },
      { title: s('markets'), sub: ne2 ? 'नेप्से, सुन, विनिमय दर' : 'NEPSE, gold, silver, exchange rates', href: home('#markets'), icon: 'chart', kw: 'markets prices बजार' },
      { title: 'NEPSE', sub: ne2 ? 'सूचकांक, कारोबार र शीर्ष कम्पनी' : 'Index, turnover, top gainers & losers', href: home('#card-nepse'), icon: 'chart', kw: 'nepse share stock index company नेप्से सेयर' },
      { title: s('gold'), sub: ne2 ? 'प्रति तोला आधिकारिक दर' : 'Official rate per tola & kg', href: home('#card-gold'), icon: 'coin', kw: 'gold silver sun chandi tola सुन चाँदी' },
      { title: s('fx'), sub: ne2 ? 'नेपाल राष्ट्र बैंक दर र रूपान्तरण' : 'NRB rates & converter · USD INR EUR', href: home('#card-rates'), icon: 'fx', kw: 'forex exchange usd dollar inr euro rupee converter डलर' },
      { title: s('weather'), sub: ne2 ? 'काठमाडौं र अन्य सहर' : 'Kathmandu & other cities · 7-day', href: home('#card-weather'), icon: 'sun2', kw: 'weather forecast rain temperature मौसम kathmandu pokhara' },
      { title: s('air'), sub: 'US AQI · PM2.5', href: home('#card-air'), icon: 'wind', kw: 'aqi air pollution pm2.5 हावा प्रदूषण' },
      { title: s('quakes'), sub: ne2 ? 'पछिल्लो ७ दिन · USGS' : 'Last 7 days near Nepal · USGS', href: home('#card-quakes'), icon: 'quake', kw: 'earthquake quake seismic भूकम्प' },
      { title: s('pulse'), sub: ne2 ? 'सुन र नेप्से किन चलिरहेको छ' : 'Why gold and NEPSE are moving', href: home('#card-analysis'), icon: 'compass', kw: 'analysis pulse why market विश्लेषण' },
      { title: ne2 ? 'फुटबल लाइभ' : 'Football Live', sub: ne2 ? 'प्रत्यक्ष स्कोर र तालिका' : 'Live scores, fixtures & results', href: 'football.html', icon: 'ball', kw: 'football soccer scores league फुटबल' },
      { title: ne2 ? 'क्रिकेट लाइभ' : 'Cricket Live', sub: ne2 ? 'प्रत्यक्ष स्कोर र तालिका' : 'Live scores, fixtures & results', href: 'cricket.html', icon: 'bat', kw: 'cricket scores t20 odi क्रिकेट' },
      { title: s('about'), sub: s('tagline'), sheet: 'about', icon: 'info', kw: 'about sources contact' },
      { title: s('privacy'), sub: '', sheet: 'privacy', icon: 'shield', kw: 'privacy terms' }
    ];
  };
  var providers = [];
  NL.search = {
    /* p = { group: 'News' | fn → label, items: fn → [{title, sub, href, icon, img, val, dir, kw, external}], recent: n } */
    add: function (p) { providers.push(p); },
    open: function (q) { openSearch(q); }
  };
  var CHIPS = { en: ['NEPSE', 'Gold', 'USD', 'Weather', 'Politics', 'Cricket'], ne: ['नेप्से', 'सुन', 'USD', 'मौसम', 'राजनीति', 'क्रिकेट'] };
  var sel = -1, results = [];

  function searchFoot() {
    return '<span><kbd>↑</kbd><kbd>↓</kbd> ' + esc(s('kNav')) + '</span><span><kbd>↵</kbd> ' + esc(s('kOpen'))
      + '</span><span><kbd>esc</kbd> ' + esc(s('kClose')) + '</span><span class="s-count" id="s-count"></span>';
  }
  function ensureSearch() {
    if (searchDlg) return searchDlg;
    searchDlg = document.createElement('dialog');
    searchDlg.className = 'search';
    searchDlg.id = 'nl-search';
    searchDlg.setAttribute('aria-label', s('search'));
    searchDlg.innerHTML = '<div class="s-bar">' + ICON.search
      + '<input class="s-input" type="search" autocomplete="off" spellcheck="false" role="combobox" aria-expanded="true" aria-controls="s-body" aria-autocomplete="list" placeholder="' + esc(s('searchPh')) + '">'
      + '<button class="s-clear" type="button" aria-label="Clear">' + ICON.x + '</button>'
      + '<button class="s-close" type="button">esc</button></div>'
      + '<div class="s-body" id="s-body" role="listbox"></div>'
      + '<div class="s-foot">' + searchFoot() + '</div>';
    document.body.appendChild(searchDlg);
    var input = searchDlg.querySelector('.s-input');
    var clear = searchDlg.querySelector('.s-clear');
    input.addEventListener('input', function () { clear.classList.toggle('show', !!input.value); renderResults(input.value); });
    clear.addEventListener('click', function () { input.value = ''; clear.classList.remove('show'); renderResults(''); input.focus(); });
    searchDlg.querySelector('.s-close').addEventListener('click', function () { searchDlg.close(); });
    searchDlg.addEventListener('click', function (e) {
      if (e.target === searchDlg) { searchDlg.close(); return; }
      var chip = e.target.closest('[data-q]');
      if (chip) { input.value = chip.getAttribute('data-q'); clear.classList.add('show'); renderResults(input.value); input.focus(); return; }
      var it = e.target.closest('.s-item');
      if (it) activate(it, e);
    });
    searchDlg.addEventListener('mousemove', function (e) {
      var it = e.target.closest('.s-item');
      if (it) select(+it.getAttribute('data-i'), false);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); select(Math.min(results.length - 1, sel + 1), true); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); select(Math.max(0, sel - 1), true); }
      else if (e.key === 'Enter') {
        var el = searchDlg.querySelector('.s-item[aria-selected="true"]');
        if (el) { e.preventDefault(); el.click(); }
      }
    });
    searchDlg.addEventListener('close', function () {
      var t = searchDlg._opener;
      if (t && document.contains(t)) t.focus();
    });
    return searchDlg;
  }
  function openSearch(q) {
    var d = ensureSearch();
    d._opener = document.activeElement;
    var input = d.querySelector('.s-input');
    input.value = q || '';
    d.querySelector('.s-clear').classList.toggle('show', !!input.value);
    renderResults(input.value);
    if (!d.open) d.showModal();
    input.focus();
    input.select();
  }
  function activate(el, e) {
    var sheet = el.getAttribute('data-sheet-open');
    var href = el.getAttribute('href') || '';
    if (sheet) { e.preventDefault(); searchDlg.close(); openSheet(sheet); return; }
    if (href.charAt(0) === '#') {
      e.preventDefault();
      searchDlg.close();
      var target = document.getElementById(href.slice(1));
      if (target) {
        target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        history.replaceState(null, '', href);
        NL.flash(target.classList.contains('card') || target.classList.contains('tile') ? target : null);
      }
      return;
    }
    if (el.target !== '_blank') searchDlg.close();
  }
  function select(i, scroll) {
    if (!searchDlg) return;
    sel = i;
    var input = searchDlg.querySelector('.s-input');
    searchDlg.querySelectorAll('.s-item').forEach(function (el) {
      var on = +el.getAttribute('data-i') === i;
      el.setAttribute('aria-selected', on ? 'true' : 'false');
      if (on) { input.setAttribute('aria-activedescendant', el.id); if (scroll) el.scrollIntoView({ block: 'nearest' }); }
    });
  }
  var norm = function (x) { return String(x || '').toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, ''); };
  var reEsc = function (x) { return x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); };
  function highlight(text, toks) {
    var out = esc(text);
    if (!toks.length) return out;
    var re = new RegExp('(' + toks.map(function (t) { return reEsc(esc(t)); }).join('|') + ')', 'gi');
    return out.replace(re, '<mark>$1</mark>');
  }
  function itemHTML(it, i, toks) {
    var attrs = it.sheet
      ? ' href="#" data-sheet-open="' + esc(it.sheet) + '"'
      : ' href="' + esc(it.href || '#') + '"' + (it.external ? ' target="_blank" rel="noopener noreferrer"' : '');
    return '<a class="s-item" role="option" id="s-opt-' + i + '" data-i="' + i + '" aria-selected="false"' + attrs + '>'
      + '<span class="s-ic">' + (it.img ? '<img src="' + esc(it.img) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">' : '') + (ICON[it.icon] || ICON.doc) + '</span>'
      + '<span class="s-txt"><span class="s-title"' + (/[ऀ-ॿ]/.test(it.title) ? ' lang="ne"' : '') + '>' + highlight(it.title, toks) + '</span>'
      + (it.sub ? '<span class="s-sub">' + esc(it.sub) + '</span>' : '') + '</span>'
      + (it.val ? '<span class="s-val' + (it.dir ? ' ' + it.dir + '-t' : '') + '">' + esc(it.val) + '</span>' : '')
      + (it.external ? '<span class="s-ext" aria-hidden="true">↗</span>' : '')
      + '</a>';
  }
  function renderResults(q) {
    var body = searchDlg.querySelector('#s-body');
    var toks = norm(q).trim().split(/\s+/).filter(Boolean);
    var groups = [];
    var all = [{ group: s('jumpTo'), items: SECTIONS, limit: 6, alwaysEmpty: true }].concat(providers);
    all.forEach(function (p) {
      var items;
      try { items = p.items() || []; } catch (e) { items = []; }
      var label = typeof p.group === 'function' ? p.group() : p.group;
      if (!toks.length) {
        var n = p.alwaysEmpty ? p.limit : p.recent || 0;
        if (n) groups.push({ label: p.alwaysEmpty ? label : (p.recentLabel ? p.recentLabel() : s('latest')), items: items.slice(0, n) });
        return;
      }
      var scored = [];
      items.forEach(function (it) {
        var title = norm(it.title), hay = title + ' ' + norm(it.sub) + ' ' + norm(it.kw);
        if (!toks.every(function (t) { return hay.indexOf(t) >= 0; })) return;
        var sc = toks.reduce(function (a, t) { return a + (title.indexOf(t) === 0 ? 3 : title.indexOf(t) > 0 ? 2 : 1); }, 0);
        scored.push([sc, it]);
      });
      scored.sort(function (a, b) { return b[0] - a[0]; });
      if (scored.length) groups.push({ label: label, items: scored.slice(0, p.limit || 6).map(function (x) { return x[1]; }) });
    });
    results = [];
    var html = '';
    if (!toks.length) {
      html += '<div class="s-chips" aria-label="' + esc(s('tryThese')) + '">'
        + CHIPS[NL.lang()].map(function (c) { return '<button type="button" data-q="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div>';
    }
    groups.forEach(function (g) {
      html += '<div class="s-group">' + esc(g.label) + '</div>';
      g.items.forEach(function (it) { html += itemHTML(it, results.length, toks); results.push(it); });
    });
    if (toks.length && !results.length) {
      html = '<div class="s-empty">' + ICON.search + '<p>' + esc(s('noResults')) + ' <b>“' + esc(q.trim()) + '”</b></p>'
        + '<div class="s-chips">' + CHIPS[NL.lang()].map(function (c) { return '<button type="button" data-q="' + esc(c) + '">' + esc(c) + '</button>'; }).join('') + '</div></div>';
    }
    body.innerHTML = html;
    var cnt = searchDlg.querySelector('#s-count');
    if (cnt) cnt.textContent = toks.length ? results.length + ' ' + s('results') : '';
    sel = -1;
    if (results.length) select(0, false);
  }

  /* ------------------------------------------------------------------ footer */
  var FOOT = {
    en: {
      aboutBody:
        '<p>Nepal Live brings Nepal’s most-checked information together in one place — headlines from Nepali newsrooms, '
        + 'gold and silver rates, NEPSE, exchange rates, Kathmandu weather and air quality, recent earthquakes, and live '
        + 'football and cricket scores.</p>'
        + '<h4>How it works</h4><p>Every figure is fetched from a public source, cached briefly by our server and shown with '
        + 'the time it was last updated. Headlines link straight to the publisher — Nepal Live is an aggregator and does '
        + 'not write, edit or rehost the news.</p><h4>Times</h4><p>All times are Nepal Time (NPT, UTC+5:45).</p>',
      disclaimerShort:
        '<b>Nepal Live aggregates publicly available data — it does not publish original news or set any rate.</b> '
        + 'Figures come from the third-party sources listed above and may be delayed, incomplete or briefly unavailable. '
        + 'Headlines link to the original publisher, who owns that content. Nothing here is financial advice; '
        + 'confirm any rate with your bank, broker or dealer before acting on it.',
      contactBody: 'Questions, a broken feed, or a source you would like added?',
      noEmail: 'Contact details are not published yet — reach the maintainer, ' + MAINTAINER + ', through the site you found this on.',
      privacyBody:
        '<h4>What we collect</h4><p>Nothing. Nepal Live has no accounts, no sign-in, no analytics scripts, '
        + 'no advertising and no tracking cookies.</p>'
        + '<h4>What stays on your device</h4><p>Two small preferences are kept in your browser’s local storage — '
        + 'your language choice (English or नेपाली) and your light/dark theme. They never leave your device '
        + 'and are not readable by us. Clearing your browser data removes them.</p>'
        + '<h4>Requests to other services</h4><p>Live figures are fetched by the Nepal Live server, not by your browser, '
        + 'so the upstream providers do not see your IP address. News thumbnails, team badges and web fonts are the '
        + 'exception: those load directly from the publisher’s, league’s or Google Fonts’ servers, which will see a normal request.</p>'
        + '<h4>Server logs</h4><p>The hosting provider keeps standard short-lived request logs for reliability. '
        + 'We do not build profiles from them.</p>',
      termsBody:
        '<h4>Use of the site</h4><p>Nepal Live is provided free, as-is, for personal information. You may read, share '
        + 'and link to it freely.</p>'
        + '<h4>No warranty</h4><p>Live data is supplied by third parties. We cannot guarantee that any figure is '
        + 'accurate, current or available, and the service may change or stop at any time.</p>'
        + '<h4>Not advice</h4><p>Rates, index values and prices shown here are for information only and are not '
        + 'financial, investment or trading advice. Verify with an authorised institution before acting.</p>'
        + '<h4>Content ownership</h4><p>Headlines, article links, team badges and league names belong to their '
        + 'respective owners. Nepal Live displays short excerpts and links back to the original source; it does not '
        + 'republish full articles or claim authorship.</p>'
        + '<h4>Contact</h4><p>If you own content shown here and would like it removed, get in touch and we will act promptly.</p>'
    },
    ne: {
      aboutBody:
        '<p>नेपाल लाइभले नेपालमा सबैभन्दा धेरै खोजिने जानकारी एकै ठाउँमा ल्याउँछ — नेपाली समाचार कक्षका शीर्षक, '
        + 'सुन–चाँदीको भाउ, नेप्से, विनिमय दर, काठमाडौंको मौसम र वायु गुणस्तर, भूकम्प, र फुटबल–क्रिकेटको प्रत्यक्ष स्कोर।</p>'
        + '<h4>यसरी काम गर्छ</h4><p>हरेक अंक सार्वजनिक स्रोतबाट ल्याइन्छ र अन्तिम अपडेट समयसहित देखाइन्छ। '
        + 'शीर्षकहरूले सिधै प्रकाशकको पृष्ठमा लैजान्छन् — नेपाल लाइभ समाचार संकलक हो, समाचार लेख्दैन।</p>'
        + '<h4>समय</h4><p>सबै समय नेपाली समय (NPT, UTC+5:45) मा।</p>',
      disclaimerShort:
        '<b>नेपाल लाइभले सार्वजनिक रूपमा उपलब्ध तथ्यांक संकलन गर्छ — यो मौलिक समाचार प्रकाशक होइन, न त कुनै दर तोक्छ।</b> '
        + 'माथि उल्लेखित बाह्य स्रोतबाट आउने अंकहरू ढिलो, अपूर्ण वा केही समय अनुपलब्ध हुन सक्छन्। '
        + 'शीर्षकहरूले मूल प्रकाशकको पृष्ठमा लैजान्छन्। यहाँको कुनै पनि कुरा वित्तीय सल्लाह होइन; '
        + 'निर्णय गर्नुअघि आफ्नो बैंक वा व्यापारीसँग पुष्टि गर्नुहोस्।',
      contactBody: 'प्रश्न, नचलेको फिड, वा थप्नुपर्ने स्रोत छ?',
      noEmail: 'सम्पर्क ठेगाना अझै प्रकाशित छैन।',
      privacyBody:
        '<h4>हामी के संकलन गर्छौं</h4><p>केही पनि होइन। नेपाल लाइभमा खाता, साइन-इन, एनालिटिक्स, '
        + 'विज्ञापन वा ट्र्याकिङ कुकी छैनन्।</p>'
        + '<h4>तपाईंकै यन्त्रमा रहने</h4><p>दुई सानो प्राथमिकता मात्र ब्राउजरको लोकल स्टोरेजमा रहन्छ — '
        + 'भाषा (English वा नेपाली) र थिम (उज्यालो/अँध्यारो)। ती तपाईंको यन्त्रबाट कतै जाँदैनन्।</p>'
        + '<h4>अन्य सेवाहरूमा अनुरोध</h4><p>तथ्यांक नेपाल लाइभको सर्भरले ल्याउँछ, तपाईंको ब्राउजरले होइन। '
        + 'तर समाचारका तस्बिर, टिमका ब्याज र फन्ट सम्बन्धित सर्भरबाटै लोड हुन्छन्।</p>'
        + '<h4>सर्भर लग</h4><p>होस्टिङ प्रदायकले भरपर्दोपनका लागि छोटो समयको सामान्य लग राख्छ।</p>',
      termsBody:
        '<h4>प्रयोग</h4><p>नेपाल लाइभ निःशुल्क, जस्ताको तस्तै, व्यक्तिगत जानकारीका लागि उपलब्ध छ।</p>'
        + '<h4>कुनै ग्यारेन्टी छैन</h4><p>तथ्यांक बाह्य पक्षले उपलब्ध गराउँछन्। कुनै पनि अंक सही, ताजा वा '
        + 'उपलब्ध हुने ग्यारेन्टी गर्न सकिँदैन।</p>'
        + '<h4>सल्लाह होइन</h4><p>यहाँका दर र मूल्य जानकारीका लागि मात्र हुन्, वित्तीय सल्लाह होइनन्।</p>'
        + '<h4>सामग्रीको स्वामित्व</h4><p>शीर्षक, लिंक, टिम ब्याज र लिगका नाम सम्बन्धित मालिकका हुन्। '
        + 'नेपाल लाइभले छोटो अंश देखाएर मूल स्रोतमै लैजान्छ।</p>'
    }
  };
  var F = function () { return FOOT[NL.lang()] || FOOT.en; };

  /* Each page passes the source lines that actually apply to it. */
  NL.renderFooter = function (sources) {
    NL.footerSources = sources;
    var el = document.getElementById('nl-foot');
    if (!el) return;
    var year = new Date().getFullYear();
    var link = function (href, label) { return '<li><a href="' + href + '">' + esc(label) + '</a></li>'; };
    var sheet = function (k) { return '<li><button type="button" data-sheet="' + k + '">' + esc(s(k)) + '</button></li>'; };
    el.innerHTML = '<div class="wrap foot-in">'
      + '<div class="foot-grid">'
      + '<div class="foot-brand">' + wordmark()
      + '<p class="foot-tag">' + esc(s('tagline')) + '</p>'
      + '<p class="foot-upd"><span class="tk-dot" aria-hidden="true"></span>' + esc(s('lastUpd')) + ' <b id="foot-upd">' + esc(s('waiting')) + '</b></p></div>'
      + '<div class="foot-col"><h4>' + esc(s('explore')) + '</h4><ul>'
      + link(home('#news'), s('news')) + link(home('#markets'), s('markets'))
      + link('football.html', s('football')) + link('cricket.html', s('cricket')) + '</ul></div>'
      + '<div class="foot-col"><h4>' + esc(s('company')) + '</h4><ul>'
      + sheet('about') + sheet('contact') + sheet('privacy') + sheet('terms') + '</ul></div>'
      + '<div class="foot-col"><h4>' + esc(s('sources')) + '</h4><ul>'
      + (sources || []).map(function (x) {
          return '<li><a class="ext" href="' + esc(x.url) + '" target="_blank" rel="noopener noreferrer">' + esc(x.name) + ' <span aria-hidden="true">↗</span></a></li>';
        }).join('')
      + '</ul></div>'
      + '</div>'
      + '<div class="foot-disclaimer"><b>' + esc(s('disclaimer')) + '. </b>' + F().disclaimerShort + '</div>'
      + '<div class="foot-bottom">'
      + '<span>© ' + year + ' Nepal Live · ' + esc(s('madeBy')) + ' <b>' + esc(MAINTAINER) + '</b></span>'
      + '<span>' + esc(s('nptNote')) + '</span>'
      + '</div></div>';
    paintFootUpdated();
  };

  function openSheet(k) {
    var host = document.getElementById('nl-sheets');
    if (!host) {
      host = document.createElement('div');
      host.id = 'nl-sheets';
      document.body.appendChild(host);
    }
    var f = F();
    var bodies = {
      about: f.aboutBody,
      contact: '<p>' + esc(f.contactBody) + '</p><p>' + (CONTACT_EMAIL
        ? '<a href="mailto:' + esc(CONTACT_EMAIL) + '">' + esc(CONTACT_EMAIL) + '</a>'
        : esc(f.noEmail)) + '</p>',
      privacy: f.privacyBody,
      terms: f.termsBody
    };
    var title = k === 'about' ? s('aboutTitle') : s(k);
    host.innerHTML = '<dialog class="sheet" id="sheet-' + k + '" aria-labelledby="sheet-h-' + k + '">'
      + '<div class="sheet-head"><h3 id="sheet-h-' + k + '">' + esc(title) + '</h3>'
      + '<button class="icon-btn" type="button" data-close aria-label="' + esc(s('close')) + '">' + ICON.x + '</button></div>'
      + '<div class="sheet-body">' + bodies[k] + '</div></dialog>';
    var d = host.firstChild;
    d.addEventListener('click', function (e) { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
    if (d.showModal) d.showModal();
  }
  NL.openSheet = openSheet;

  /* ------------------------------------------------------------- delegation */
  document.addEventListener('click', function (e) {
    var t = e.target;
    var b = t.closest('[data-retry]');
    if (b) {
      var fn = NL.retryHandlers[b.getAttribute('data-retry')];
      if (typeof fn === 'function') {
        b.disabled = true;
        b.classList.add('busy');
        Promise.resolve(fn()).finally(function () { b.disabled = false; b.classList.remove('busy'); });
      }
      return;
    }
    if (t.closest('[data-search]')) { openSearch(''); return; }
    if (t.closest('[data-lang-toggle]')) { NL.setLang(NL.lang() === 'ne' ? 'en' : 'ne'); return; }
    if (t.closest('[data-theme-toggle]')) { NL.theme.toggle(); return; }
    if (t.closest('#nav-btn')) { openDrawer(!drawer.classList.contains('open')); return; }
    if (t.closest('[data-drawer-close]')) { openDrawer(false); return; }
    var sh = t.closest('[data-sheet]');
    if (sh) { e.preventDefault(); closeMore(); openDrawer(false); openSheet(sh.getAttribute('data-sheet')); return; }

    var more = t.closest('.more');
    if (more && t.closest('.more > button')) {
      var open = !more.classList.contains('open');
      more.classList.toggle('open', open);
      more.querySelector('button').setAttribute('aria-expanded', open ? 'true' : 'false');
      return;
    }
    if (!t.closest('.more-menu')) closeMore();

    /* in-page anchors: close menus, and highlight the card we land on */
    var a = t.closest('a[href^="#"], a[href^="index.html#"]');
    if (a) {
      closeMore();
      if (drawer && drawer.contains(a)) openDrawer(false);
      var href = a.getAttribute('href');
      var hash = href.slice(href.indexOf('#'));
      if (HOME && hash.length > 1) {
        var target = document.getElementById(hash.slice(1));
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
          history.replaceState(null, '', hash);
          if (target.classList.contains('card')) NL.flash(target);
        }
      }
    } else if (drawer && t.closest('.nl-drawer a')) openDrawer(false);
  });
  function closeMore() {
    document.querySelectorAll('.more.open').forEach(function (m) {
      m.classList.remove('open');
      m.querySelector('button').setAttribute('aria-expanded', 'false');
    });
  }
  document.addEventListener('keydown', function (e) {
    var typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target && e.target.tagName) || '') || (e.target && e.target.isContentEditable);
    if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) { e.preventDefault(); openSearch(''); return; }
    if (e.key === '/' && !typing && !(searchDlg && searchDlg.open)) { e.preventDefault(); openSearch(''); return; }
    if (e.key === 'Escape') { closeMore(); if (drawer && drawer.classList.contains('open')) openDrawer(false); }
  });

  /* ------------------------------------------------------------------- init */
  function init() {
    renderChrome();
    NL.theme.apply(NL.theme.stored());
    if (window.matchMedia) {
      var mq = matchMedia('(prefers-color-scheme: dark)');
      var onChange = function () { if (!NL.theme.stored()) NL.theme.apply(''); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }
    setInterval(tickClock, 1000);
    setInterval(refreshStamps, 30e3);

    var head = document.getElementById('nl-head');
    var onScroll = function () { if (head) head.classList.toggle('is-scrolled', scrollY > 8); };
    addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    var rt;
    addEventListener('resize', function () {
      if (innerWidth > 820) openDrawer(false);
      clearTimeout(rt); rt = setTimeout(sizeTicker, 150);
    }, { passive: true });
    document.addEventListener('visibilitychange', function () { if (!document.hidden) refreshStamps(); });
  }

  /* app.js loads at the end of <body>, so the placeholders already exist:
     render the chrome now rather than waiting for DOMContentLoaded. */
  init();
})();
