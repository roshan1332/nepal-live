/*
 * Shared logic for the Football Live / Cricket Live pages.
 * Called via initSportPage({ sport, newsWorld, newsLocal }).
 * Scoreboards come from NL.sport (app.js) so the homepage preview and these
 * pages render matches identically. Language follows the shell (NL.setLang).
 */
"use strict";

const PROXY = location.protocol.startsWith('http');
const $ = (id) => document.getElementById(id);
const esc = NL.esc;

/* ---------- i18n ---------- */
const S_I18N = {
  en: {
    kicker: 'Nepal Live Sports',
    titleSoccer: 'Football <em>Live</em>', titleCricket: 'Cricket <em>Live</em>',
    subSoccer: 'Live scores, fixtures and results from leagues worldwide — kick-off times in Nepal Time.',
    subCricket: 'Live scores, fixtures and results from international and domestic cricket — start times in Nepal Time.',
    tabLive: 'Live', tabSoon: 'Upcoming', tabDone: 'Finished', refresh: 'Refresh',
    noLive: 'No live matches right now', nextUp: 'Next up', seeUpcoming: 'See upcoming matches',
    noSoon: 'No upcoming matches in the feed for the next 10 days.', noDone: 'No results from the last two days.',
    noneAny: 'No matches in the feed for the next few days. Check back soon.',
    errMatches: 'Match data isn’t available right now.', errNews: 'News isn’t available right now.',
    lastGood: 'Last good update',
    worldNewsSoccer: 'World football', nepalNewsSoccer: 'Nepal football',
    worldNewsCricket: 'World cricket', nepalNewsCricket: 'Nepal cricket',
    newsKicker: 'Headlines', newsTitle: 'News', aggNote: 'Headlines are aggregated from Google News and open on the original publisher’s site. Match data: TheSportsDB.',
    matches: 'Matches', gNews: 'News', morePending: 'loading more days…'
  },
  ne: {
    kicker: 'नेपाल लाइभ खेलकुद',
    titleSoccer: 'फुटबल <em>लाइभ</em>', titleCricket: 'क्रिकेट <em>लाइभ</em>',
    subSoccer: 'विश्वभरका लिगका प्रत्यक्ष स्कोर, तालिका र नतिजा — सुरु समय नेपाली समयमा।',
    subCricket: 'अन्तर्राष्ट्रिय र घरेलु क्रिकेटका प्रत्यक्ष स्कोर, तालिका र नतिजा — सुरु समय नेपाली समयमा।',
    tabLive: 'प्रत्यक्ष', tabSoon: 'आगामी', tabDone: 'सकिएका', refresh: 'ताजा गर्नुहोस्',
    noLive: 'अहिले कुनै खेल प्रत्यक्ष छैन', nextUp: 'अर्को खेल', seeUpcoming: 'आगामी खेल हेर्नुहोस्',
    noSoon: 'आउँदा १० दिनका लागि फिडमा खेल छैनन्।', noDone: 'पछिल्ला दुई दिनका नतिजा छैनन्।',
    noneAny: 'आउँदा केही दिनका लागि फिडमा खेल छैनन्। केही बेरमा फेरि हेर्नुहोस्।',
    errMatches: 'खेलको तथ्यांक अहिले उपलब्ध छैन।', errNews: 'समाचार अहिले उपलब्ध छैन।',
    lastGood: 'अन्तिम सफल अपडेट',
    worldNewsSoccer: 'विश्व फुटबल', nepalNewsSoccer: 'नेपाल फुटबल',
    worldNewsCricket: 'विश्व क्रिकेट', nepalNewsCricket: 'नेपाल क्रिकेट',
    newsKicker: 'शीर्षक', newsTitle: 'समाचार', aggNote: 'शीर्षकहरू गुगल न्यूजबाट संकलित हुन् र मूल प्रकाशकको साइटमा खुल्छन्। खेल तथ्यांक: TheSportsDB।',
    matches: 'खेलहरू', gNews: 'समाचार', morePending: 'थप दिन लोड हुँदै…'
  }
};
const st = (k) => (S_I18N[NL.lang()] && S_I18N[NL.lang()][k]) ?? S_I18N.en[k] ?? k;
const S_CACHE = { matches: null, news1: null, news2: null };
const S_LAST = {};
let activeTab = null;          /* null until the visitor picks one */
let CFG = null;
let S_PENDING = 0, S_RETRY = 0; /* days the server is still fetching (rate-limited feed) */

/* ---------- matches ---------- */
function allEvents() {
  const all = [];
  (S_CACHE.matches || []).forEach((d) => (d.events || []).forEach((ev) => all.push(ev)));
  return all;
}
function buckets() {
  const all = allEvents();
  const by = (fn) => all.filter((e) => fn(NL.sport.classify(e)));
  return {
    live: by((c) => c === 'live').sort((a, b) => NL.sport.ms(a) - NL.sport.ms(b)),
    soon: by((c) => c === 'ns' || c === 'off').sort((a, b) => NL.sport.ms(a) - NL.sport.ms(b)),
    done: by((c) => c === 'done' || c === 'past').sort((a, b) => NL.sport.ms(b) - NL.sport.ms(a)),
  };
}
function byDay(events) {
  const map = new Map();
  events.forEach((ev) => {
    const d = NL.sport.nptDate(ev);
    if (!map.has(d)) map.set(d, []);
    map.get(d).push(ev);
  });
  let i = 0;
  return [...map.entries()].map(([d, evs]) =>
    `<h3 class="day-h">${esc(NL.sport.dayLabel(d))}</h3><div class="sb-grid">${evs.map((ev) => NL.sport.card(ev, i++, { noDay: true })).join('')}</div>`
  ).join('');
}
function renderTabs(b) {
  const tabs = [['live', st('tabLive')], ['soon', st('tabSoon')], ['done', st('tabDone')]];
  $('sp-tabs').innerHTML = tabs.map(([k, label]) => {
    const n = b[k].length;
    const on = k === activeTab;
    return `<button class="tab${k === 'live' && n ? ' is-live' : ''}" role="tab" type="button" id="tab-${k}" data-tab="${k}"
      aria-selected="${on}" aria-controls="matches-body" tabindex="${on ? 0 : -1}">
      ${k === 'live' && n ? '<i class="live-i" aria-hidden="true"></i>' : ''}${esc(label)}<span class="n">${n}</span></button>`;
  }).join('');
}
function renderMatches() {
  if (!S_CACHE.matches) return;
  const b = buckets();
  if (!activeTab) activeTab = b.live.length ? 'live' : b.soon.length ? 'soon' : 'done';
  renderTabs(b);
  const body = $('matches-body');
  body.setAttribute('aria-labelledby', 'tab-' + activeTab);
  const list = b[activeTab];
  if (!b.live.length && !b.soon.length && !b.done.length) {
    body.innerHTML = S_PENDING ? NL.skeleton('scores') : NL.emptyState(st('noneAny'), { icon: 'calendar' });
    return;
  }
  if (!list.length && S_PENDING) { body.innerHTML = NL.skeleton('scores'); return; }
  if (!list.length) {
    if (activeTab === 'live') {
      const next = b.soon.find((e) => NL.sport.classify(e) === 'ns');
      const sub = next ? `${st('nextUp')}: ${next.strHomeTeam} – ${next.strAwayTeam} · ${NL.sport.dayLabel(NL.sport.nptDate(next))}`
        + (NL.sport.kickoff(next) ? ' ' + NL.nptHM(NL.sport.kickoff(next)) + ' NPT' : '') : '';
      body.innerHTML = NL.emptyState(st('noLive'), { icon: 'calendar', sub,
        action: b.soon.length ? { label: st('seeUpcoming'), attr: 'data-tab="soon"' } : null });
    } else body.innerHTML = NL.emptyState(activeTab === 'soon' ? st('noSoon') : st('noDone'), { icon: 'calendar' });
    return;
  }
  body.innerHTML = activeTab === 'live'
    ? `<div class="sb-grid">${list.map((ev, i) => NL.sport.card(ev, i)).join('')}</div>`
    : byDay(list);
}

async function loadMatches(cfg) {
  const btn = $('refresh-matches');
  if (btn) btn.classList.add('spinning');
  try {
    if (!S_CACHE.matches) $('matches-body').innerHTML = NL.skeleton('scores');
    let d;
    try {
      const r = await fetch(`/api/sport-range?s=${cfg.sport}&past=2&future=10`, { cache: 'no-store' });
      if (!r.ok) throw new Error('proxy');
      d = await r.json();
    } catch (e) {
      const date = NL.sport.nptISO(0);
      const r2 = await fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${date}&s=${cfg.sport}`, { cache: 'no-store' });
      const j2 = await r2.json();
      d = { days: (j2.events && j2.events.length) ? [{ date, events: j2.events }] : [] };
    }
    S_CACHE.matches = d.days || [];
    S_LAST.matches = NL.nptHM();
    S_PENDING = d.pending || 0;
    /* the server fills in the remaining days over the next minute; check back */
    if (S_PENDING && ++S_RETRY <= 8) setTimeout(() => loadMatches(cfg), 12000);
    if (!S_PENDING) S_RETRY = 0;
    renderMatches();
    NL.stamp('stamp-matches', true, S_PENDING ? st('morePending') : '');
    NL.feed('matches', true);
  } catch (e) {
    if (!S_CACHE.matches) {
      $('sp-tabs').innerHTML = '';
      $('matches-body').innerHTML = NL.errorState(st('errMatches'), {
        mod: 'matches', stale: S_LAST.matches ? st('lastGood') + ' ' + S_LAST.matches + ' NPT' : '',
      });
    }
    NL.stamp('stamp-matches', false);
    NL.feed('matches', false);
  } finally {
    if (btn) btn.classList.remove('spinning');
  }
}

/* ---------- news ---------- */
async function fetchNews(q) {
  const direct = 'https://api.rss2json.com/v1/api.json?rss_url='
    + encodeURIComponent(`https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=en-US&gl=US&ceid=US:en`);
  try {
    let items = [];
    if (PROXY) {
      try {
        const r = await fetch('/api/news?q=' + encodeURIComponent(q), { cache: 'no-store' });
        if (r.ok) items = (await r.json()).items || [];
      } catch (e) { /* fall through */ }
    }
    if (!items.length) {
      const r2 = await fetch(direct, { cache: 'no-store' });
      const d2 = await r2.json();
      items = (d2.items || []).map(i => {
        let title = i.title || '', source = '';
        const dash = title.lastIndexOf(' - ');
        if (dash > 0) { source = title.slice(dash + 3); title = title.slice(0, dash); }
        return { title, source, link: i.link, pubDate: i.pubDate };
      });
    }
    return items;
  } catch (e) { return []; }
}

function renderNews(which) {
  const items = which === 1 ? S_CACHE.news1 : S_CACHE.news2;
  const body = $(`news${which}-body`);
  if (!items) return;
  if (!items.length) {
    body.innerHTML = NL.errorState(st('errNews'), {
      mod: 'news' + which, compact: true,
      stale: S_LAST['news' + which] ? st('lastGood') + ' ' + S_LAST['news' + which] + ' NPT' : '',
    });
    return;
  }
  body.innerHTML = `<div class="news-list">` + items.slice(0, 10).map((i, idx) => {
    const ts = Date.parse(i.pubDate) || Date.now();
    return `<a class="news-item" style="--i:${idx}" href="${esc(i.link)}" target="_blank" rel="noopener noreferrer">
       <div class="news-body">
         <div class="t">${esc(i.title)}</div>
         <div class="m"><span class="src-badge">${esc(i.source || 'News')}</span><span class="sep">·</span>
           <span data-ago="${ts}">${NL.ago(ts)}</span></div>
       </div><span class="ro" aria-hidden="true">↗</span>
     </a>`;
  }).join('') + `</div>`;
}

async function loadNews(cfg, which) {
  const q = which === 1 ? cfg.newsWorld : cfg.newsLocal;
  const items = await fetchNews(q);
  /* keep the last good list rather than replacing it with an error */
  if (items.length || !(which === 1 ? S_CACHE.news1 : S_CACHE.news2)) {
    if (which === 1) S_CACHE.news1 = items; else S_CACHE.news2 = items;
  }
  if (items.length) S_LAST['news' + which] = NL.nptHM();
  renderNews(which);
  NL.stamp(`stamp-news${which}`, !!items.length);
}

/* ---------- language ---------- */
function applySportI18n(cfg) {
  const k = cfg.sport === 'Cricket' ? 'Cricket' : 'Soccer';
  $('sp-kicker').textContent = st('kicker');
  $('sp-title').innerHTML = st('title' + k);
  $('sp-sub').textContent = st('sub' + k);
  $('refresh-label').textContent = st('refresh');
  $('news1-title').textContent = st('worldNews' + k);
  $('news2-title').textContent = st('nepalNews' + k);
  $('news-kicker').textContent = st('newsKicker');
  $('news-title').textContent = st('newsTitle');
  $('agg-text').textContent = st('aggNote');
  NL.renderFooter([
    { name: 'TheSportsDB — fixtures, scores & badges', url: 'https://www.thesportsdb.com/' },
    { name: 'Google News — sports headlines', url: 'https://news.google.com/' },
  ]);
}

/* ---------- search ---------- */
function registerSearch(cfg) {
  const page = cfg.sport === 'Cricket' ? 'cricket.html' : 'football.html';
  NL.search.add({
    group: () => st('matches'), limit: 6,
    items: () => allEvents().map((ev) => {
      const ko = NL.sport.kickoff(ev);
      const cls = NL.sport.classify(ev);
      return {
        title: `${ev.strHomeTeam} vs ${ev.strAwayTeam}`,
        sub: `${ev.strLeague || ''} · ${NL.sport.dayLabel(NL.sport.nptDate(ev))}${ko ? ' ' + NL.nptHM(ko) + ' NPT' : ''}`,
        href: page + '#matches', icon: cfg.sport === 'Cricket' ? 'bat' : 'ball',
        img: ev.strHomeTeamBadge ? ev.strHomeTeamBadge + '/tiny' : '',
        val: cls === 'live' || cls === 'done' ? `${ev.intHomeScore ?? ''}–${ev.intAwayScore ?? ''}` : '',
        kw: `${ev.strCountry || ''} ${ev.strVenue || ''}`,
      };
    }),
  });
  NL.search.add({
    group: () => st('gNews'), limit: 6, recent: 4,
    items: () => [...(S_CACHE.news1 || []), ...(S_CACHE.news2 || [])].map((i) => ({
      title: i.title, sub: `${i.source || 'News'} · ${NL.ago(Date.parse(i.pubDate) || Date.now())}`,
      href: i.link, external: true, icon: 'doc',
    })),
  });
}

/* ---------- init ---------- */
function initSportPage(cfg) {
  CFG = cfg;
  NL.retryHandlers.matches = () => loadMatches(cfg);
  NL.retryHandlers.news1 = () => loadNews(cfg, 1);
  NL.retryHandlers.news2 = () => loadNews(cfg, 2);
  $('refresh-matches').addEventListener('click', () => loadMatches(cfg));
  $('refresh-news1').addEventListener('click', () => loadNews(cfg, 1));
  $('refresh-news2').addEventListener('click', () => loadNews(cfg, 2));

  /* tabs: click, and arrow keys along the tablist */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b) return;
    activeTab = b.getAttribute('data-tab');
    renderMatches();
    const t = $('tab-' + activeTab);
    if (t && b.classList.contains('tab')) t.focus();
  });
  $('sp-tabs').addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const order = ['live', 'soon', 'done'];
    const i = order.indexOf(activeTab);
    activeTab = order[(i + (e.key === 'ArrowRight' ? 1 : 2)) % 3];
    renderMatches();
    $('tab-' + activeTab).focus();
  });
  document.addEventListener('nl:lang', () => {
    applySportI18n(cfg); renderMatches(); renderNews(1); renderNews(2);
  });

  applySportI18n(cfg);
  registerSearch(cfg);
  $('news1-body').innerHTML = NL.skeleton('rows');
  $('news2-body').innerHTML = NL.skeleton('rows');
  NL.ticker.autoload();

  loadMatches(cfg);
  loadNews(cfg, 1);
  loadNews(cfg, 2);
  /* skip background refreshes while the tab is hidden; catch up on return */
  setInterval(() => { if (!document.hidden) loadMatches(cfg); }, 120e3);
  setInterval(() => { if (!document.hidden) { loadNews(cfg, 1); loadNews(cfg, 2); } }, 300e3);
  let hiddenAt = 0;
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { hiddenAt = Date.now(); return; }
    if (hiddenAt && Date.now() - hiddenAt > 120e3) loadMatches(cfg);
  });
}
