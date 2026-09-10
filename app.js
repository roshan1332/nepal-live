/*
 * Nepal Live — shared shell (theme, mobile nav, footer, UI state helpers).
 *
 * Everything hangs off window.NL. Nothing else is declared at the top level:
 * this file shares global scope with each page's inline script and with
 * sport-page.js, and a bare `const` here would collide with theirs.
 *
 * Set CONTACT_EMAIL below to publish a contact address in the footer; while it
 * is empty the footer simply names the maintainer.
 */
(function () {
  "use strict";

  var CONTACT_EMAIL = '';                 /* e.g. 'hello@nepallive.app' */
  var MAINTAINER = 'Roshan Mainali';

  var NL = window.NL = window.NL || {};
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  NL.esc = esc;
  NL.lang = function () { return localStorage.getItem('nlive-lang') === 'ne' ? 'ne' : 'en'; };

  /* ------------------------------------------------------------------ theme */
  var THEME_KEY = 'nlive-theme';
  NL.theme = {
    /* '' means "follow the system" */
    stored: function () { try { return localStorage.getItem(THEME_KEY) || ''; } catch (e) { return ''; } },
    system: function () {
      return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    },
    current: function () { return document.documentElement.getAttribute('data-theme') || this.system(); },
    apply: function (mode) {
      var m = mode === 'dark' || mode === 'light' ? mode : this.system();
      document.documentElement.setAttribute('data-theme', m);
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', m === 'dark' ? '#000000' : '#f2f2f7');
      var btn = document.getElementById('theme-btn');
      if (btn) {
        var ne = NL.lang() === 'ne';
        var label = m === 'dark'
          ? (ne ? 'उज्यालो मोडमा बदल्नुहोस्' : 'Switch to light mode')
          : (ne ? 'अँध्यारो मोडमा बदल्नुहोस्' : 'Switch to dark mode');
        btn.setAttribute('aria-label', label);
        btn.setAttribute('title', label);
      }
      document.dispatchEvent(new CustomEvent('nl:theme', { detail: { theme: m } }));
    },
    set: function (mode) {
      try { localStorage.setItem(THEME_KEY, mode); } catch (e) {}
      this.apply(mode);
    },
    toggle: function () { this.set(this.current() === 'dark' ? 'light' : 'dark'); }
  };

  /* --------------------------------------------------------------- mobile nav */
  function initNav() {
    var nav = document.querySelector('.site-nav');
    var btn = document.getElementById('nav-btn');
    if (!nav || !btn) return;

    var scrim = document.querySelector('.nav-scrim');
    if (!scrim) {
      scrim = document.createElement('div');
      scrim.className = 'nav-scrim';
      document.body.appendChild(scrim);
    }
    var open = function (yes) {
      nav.classList.toggle('open', yes);
      scrim.classList.toggle('open', yes);
      document.body.classList.toggle('nav-open', yes);
      btn.setAttribute('aria-expanded', yes ? 'true' : 'false');
      if (yes) { var a = nav.querySelector('a'); if (a) a.focus(); }
    };
    btn.addEventListener('click', function () { open(!nav.classList.contains('open')); });
    scrim.addEventListener('click', function () { open(false); });
    nav.addEventListener('click', function (e) { if (e.target.closest('a')) open(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') open(false); });
    addEventListener('resize', function () { if (innerWidth > 720) open(false); }, { passive: true });
  }

  /* ------------------------------------------------------------ UI state bits */
  /* Skeletons keep the card's height stable while data is in flight, so the
     page does not jump when a slow feed lands. */
  NL.skeleton = function (kind) {
    var rows = {
      value: '<div class="sk sk-line lg"></div><div class="sk sk-line"></div><div class="sk sk-line sm"></div>',
      block: '<div class="sk sk-line lg"></div><div class="sk sk-block"></div><div class="sk sk-line sm"></div>',
      rows: '<div class="sk sk-line"></div><div class="sk sk-line"></div><div class="sk sk-line"></div>'
          + '<div class="sk sk-line"></div><div class="sk sk-line sm"></div>',
      tiles: '<div class="sk-row"><div class="sk sk-block"></div><div class="sk sk-block"></div></div>'
           + '<div class="sk sk-line"></div><div class="sk sk-line sm"></div>',
      cards: '<div class="sk-row"><div class="sk sk-block"></div><div class="sk sk-block"></div><div class="sk sk-block"></div></div>'
           + '<div class="sk-row"><div class="sk sk-block"></div><div class="sk sk-block"></div><div class="sk sk-block"></div></div>'
    };
    return '<div class="skeleton" aria-hidden="true">' + (rows[kind] || rows.rows) + '</div>';
  };

  /* A failed feed shows what happened, when we last had data, and a way to retry
     — never a broken-looking value. */
  NL.errorState = function (msg, opts) {
    opts = opts || {};
    var ne = NL.lang() === 'ne';
    var retry = ne ? 'फेरि प्रयास गर्नुहोस्' : 'Try again';
    var stale = opts.stale ? '<div class="stamp">' + esc(opts.stale) + '</div>' : '';
    return '<div class="state is-error" role="status">'
      + '<span class="state-i" aria-hidden="true">⚠️</span>'
      + '<div class="state-msg">' + esc(msg) + '</div>' + stale
      + (opts.mod ? '<button class="retry" type="button" data-retry="' + esc(opts.mod) + '">' + retry + '</button>' : '')
      + '</div>';
  };

  NL.emptyState = function (msg) {
    return '<div class="state" role="status">'
      + '<span class="state-i" aria-hidden="true">🗓️</span>'
      + '<div class="state-msg">' + esc(msg) + '</div></div>';
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
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-retry]');
    if (!b) return;
    var mod = b.getAttribute('data-retry');
    var fn = NL.retryHandlers[mod];
    if (typeof fn === 'function') { b.disabled = true; Promise.resolve(fn()).finally(function () { b.disabled = false; }); }
  });

  /* ------------------------------------------------------------------ footer */
  var FOOT = {
    en: {
      about: 'About', aboutBody:
        'Nepal Live is a free dashboard that brings Nepal’s most-checked numbers together on one page — '
        + 'gold and silver rates, NEPSE, exchange rates, Kathmandu weather and air quality, recent earthquakes, '
        + 'headlines from Nepali newsrooms, and live football and cricket scores. Times are Nepal Time (NPT, UTC+5:45).',
      sources: 'Data sources', links: 'Site', contact: 'Contact',
      privacy: 'Privacy', terms: 'Terms', disclaimer: 'Disclaimer',
      dash: 'Dashboard', foot: 'Football Live', cric: 'Cricket Live',
      disclaimerShort:
        '<b>Nepal Live aggregates publicly available data — it does not publish original news or set any rate.</b> '
        + 'Figures come from the third-party sources listed above and may be delayed, incomplete or briefly unavailable. '
        + 'Headlines link to the original publisher, who owns that content. Nothing here is financial advice; '
        + 'confirm any rate with your bank, broker or dealer before acting on it.',
      madeBy: 'Made by', builtIn: 'Built for Nepal',
      contactBody: 'Questions, a broken feed, or a source you would like added?',
      noEmail: 'Contact details are not published yet — reach the maintainer through the site you found this on.',
      privacyBody:
        '<h4>What we collect</h4><p>Nothing. Nepal Live has no accounts, no sign-in, no analytics scripts, '
        + 'no advertising and no tracking cookies.</p>'
        + '<h4>What stays on your device</h4><p>Two small preferences are kept in your browser’s local storage — '
        + 'your language choice (English or नेपाली) and your light/dark theme. They never leave your device '
        + 'and are not readable by us. Clearing your browser data removes them.</p>'
        + '<h4>Requests to other services</h4><p>Live figures are fetched by the Nepal Live server, not by your browser, '
        + 'so the upstream providers do not see your IP address. News thumbnails and team badges are the exception: '
        + 'those images load directly from the publisher’s or league’s servers, which will see a normal image request.</p>'
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
      about: 'हाम्रो बारेमा', aboutBody:
        'नेपाल लाइभ एउटा निःशुल्क ड्यासबोर्ड हो — नेपालमा सबैभन्दा धेरै खोजिने तथ्यांकहरू एकै ठाउँमा: '
        + 'सुन–चाँदीको भाउ, नेप्से, विनिमय दर, काठमाडौंको मौसम र वायु गुणस्तर, भूकम्प, नेपाली समाचार, '
        + 'र फुटबल–क्रिकेटको प्रत्यक्ष स्कोर। सबै समय नेपाली समय (NPT, UTC+5:45) मा।',
      sources: 'तथ्यांक स्रोत', links: 'साइट', contact: 'सम्पर्क',
      privacy: 'गोपनीयता', terms: 'सर्तहरू', disclaimer: 'अस्वीकरण',
      dash: 'ड्यासबोर्ड', foot: 'फुटबल लाइभ', cric: 'क्रिकेट लाइभ',
      disclaimerShort:
        '<b>नेपाल लाइभले सार्वजनिक रूपमा उपलब्ध तथ्यांक संकलन गर्छ — यो मौलिक समाचार प्रकाशक होइन, न त कुनै दर तोक्छ।</b> '
        + 'माथि उल्लेखित बाह्य स्रोतबाट आउने अंकहरू ढिलो, अपूर्ण वा केही समय अनुपलब्ध हुन सक्छन्। '
        + 'शीर्षकहरूले मूल प्रकाशकको पृष्ठमा लैजान्छन्। यहाँको कुनै पनि कुरा वित्तीय सल्लाह होइन; '
        + 'निर्णय गर्नुअघि आफ्नो बैंक वा व्यापारीसँग पुष्टि गर्नुहोस्।',
      madeBy: 'निर्माता', builtIn: 'नेपालका लागि',
      contactBody: 'प्रश्न, नचलेको फिड, वा थप्नुपर्ने स्रोत छ?',
      noEmail: 'सम्पर्क ठेगाना अझै प्रकाशित छैन।',
      privacyBody:
        '<h4>हामी के संकलन गर्छौं</h4><p>केही पनि होइन। नेपाल लाइभमा खाता, साइन-इन, एनालिटिक्स, '
        + 'विज्ञापन वा ट्र्याकिङ कुकी छैनन्।</p>'
        + '<h4>तपाईंकै यन्त्रमा रहने</h4><p>दुई सानो प्राथमिकता मात्र ब्राउजरको लोकल स्टोरेजमा रहन्छ — '
        + 'भाषा (English वा नेपाली) र थिम (उज्यालो/अँध्यारो)। ती तपाईंको यन्त्रबाट कतै जाँदैनन्।</p>'
        + '<h4>अन्य सेवाहरूमा अनुरोध</h4><p>तथ्यांक नेपाल लाइभको सर्भरले ल्याउँछ, तपाईंको ब्राउजरले होइन। '
        + 'तर समाचारका तस्बिर र टिमका ब्याज सम्बन्धित प्रकाशक/लिगकै सर्भरबाट लोड हुन्छन्।</p>'
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

  /* Each page passes the source lines that actually apply to it. */
  NL.renderFooter = function (sources) {
    var el = document.querySelector('.site-foot');
    if (!el) return;
    var ne = NL.lang() === 'ne';
    var t = ne ? FOOT.ne : FOOT.en;
    var contact = CONTACT_EMAIL
      ? '<a href="mailto:' + esc(CONTACT_EMAIL) + '">' + esc(CONTACT_EMAIL) + '</a>'
      : '<span>' + esc(t.noEmail) + '</span>';

    el.innerHTML =
      '<div class="foot-grid">'
      + '<div><h4>' + esc(t.about) + '</h4><p>' + esc(t.aboutBody) + '</p></div>'
      + '<div><h4>' + esc(t.sources) + '</h4><ul>'
        + (sources || []).map(function (s) {
            return '<li><a href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer">' + esc(s.name) + ' ↗</a></li>';
          }).join('')
      + '</ul></div>'
      + '<div><h4>' + esc(t.links) + '</h4><ul>'
        + '<li><a href="index.html">' + esc(t.dash) + '</a></li>'
        + '<li><a href="football.html">' + esc(t.foot) + '</a></li>'
        + '<li><a href="cricket.html">' + esc(t.cric) + '</a></li>'
        + '<li><a href="#" data-sheet="privacy">' + esc(t.privacy) + '</a></li>'
        + '<li><a href="#" data-sheet="terms">' + esc(t.terms) + '</a></li>'
      + '</ul></div>'
      + '</div>'
      + '<div class="foot-disclaimer"><b>' + esc(t.disclaimer) + '. </b>' + t.disclaimerShort + '</div>'
      + '<div class="foot-bottom">'
        + '<span>' + esc(t.madeBy) + ' <b>' + esc(MAINTAINER) + '</b> · ' + esc(t.builtIn) + ' 🇳🇵</span>'
        + '<span>' + esc(t.contact) + ': ' + contact + '</span>'
      + '</div>';

    ensureSheets(t);
  };

  function ensureSheets(t) {
    var host = document.getElementById('nl-sheets');
    if (!host) {
      host = document.createElement('div');
      host.id = 'nl-sheets';
      document.body.appendChild(host);
    }
    var close = NL.lang() === 'ne' ? 'बन्द' : 'Close';
    host.innerHTML =
      ['privacy', 'terms'].map(function (k) {
        return '<dialog class="sheet" id="sheet-' + k + '">'
          + '<div class="sheet-head"><h3>' + esc(t[k]) + '</h3>'
          + '<button class="rbtn" type="button" data-close="' + k + '" aria-label="' + esc(close) + '">✕</button></div>'
          + '<div class="sheet-body">' + t[k + 'Body'] + '</div></dialog>';
      }).join('');
  }

  document.addEventListener('click', function (e) {
    var open = e.target.closest('[data-sheet]');
    if (open) {
      e.preventDefault();
      var d = document.getElementById('sheet-' + open.getAttribute('data-sheet'));
      if (d && d.showModal) d.showModal();
      return;
    }
    var shut = e.target.closest('[data-close]');
    if (shut) {
      var dd = document.getElementById('sheet-' + shut.getAttribute('data-close'));
      if (dd && dd.close) dd.close();
    }
  });

  /* --------------------------------------------------------------------- init */
  function init() {
    NL.theme.apply(NL.theme.stored());
    var btn = document.getElementById('theme-btn');
    if (btn) btn.addEventListener('click', function () { NL.theme.toggle(); });

    /* follow the system only while the visitor has expressed no preference */
    if (window.matchMedia) {
      var mq = matchMedia('(prefers-color-scheme: dark)');
      var onChange = function () { if (!NL.theme.stored()) NL.theme.apply(''); };
      if (mq.addEventListener) mq.addEventListener('change', onChange);
      else if (mq.addListener) mq.addListener(onChange);
    }

    initNav();
    document.addEventListener('nl:lang', function () {
      NL.theme.apply(NL.theme.stored());
      if (NL.footerSources) NL.renderFooter(NL.footerSources);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
