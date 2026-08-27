/*
 * Shared logic for the Football Live / Cricket Live pages.
 * Called via initSportPage({ sport, newsWorld, newsLocal }).
 * Includes Nepali/English switching (synced with the dashboard via localStorage).
 */
"use strict";

const TZ = 'Asia/Kathmandu';
const PROXY = location.protocol.startsWith('http');
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- i18n ---------- */
const S_I18N = {
  en: {
    today: 'Today', yesterday: 'Yesterday', tomorrow: 'Tomorrow',
    upcoming: 'UPCOMING', live: 'LIVE',
    updated: 'Updated', failed: 'Failed — retrying', round: 'Round',
    agoS: 's ago', agoM: 'm ago', agoH: 'h ago', agoD: 'd ago',
    noSoccer: 'No football matches scheduled for this day in the feed. Try another day, or check the news below.',
    noCricket: 'No cricket matches scheduled for this day in the feed. Try another day, or check the news below.',
    tagline: 'Matches, scores & news — Nepal Live Sports',
    navDash: '🏠 Dashboard', navFoot: '⚽ Football Live', navCricket: '🏏 Cricket Live',
    matches: "Today's Matches", worldNewsF: 'World Football News', nepalNewsF: 'Nepal Football News',
    worldNewsC: 'World Cricket News', nepalNewsC: 'Nepal Cricket News',
    prev: '‹ Prev', next: 'Next ›',
    footerSoccer: '<b>Sources:</b> TheSportsDB (fixtures & scores) · Google News. Matches auto-refresh every 2 min, news every 5 min. Kick-off times shown in Nepal Time (NPT).',
    footerCricket: '<b>Sources:</b> TheSportsDB (fixtures & scores) · Google News. Matches auto-refresh every 2 min, news every 5 min. Start times shown in Nepal Time (NPT).'
  },
  ne: {
    today: 'आज', yesterday: 'हिजो', tomorrow: 'भोलि',
    upcoming: 'आगामी', live: 'प्रत्यक्ष',
    updated: 'अपडेट', failed: 'असफल — पुनः प्रयास', round: 'चरण',
    agoS: 'सेकेन्ड अघि', agoM: 'मिनेट अघि', agoH: 'घण्टा अघि', agoD: 'दिन अघि',
    noSoccer: 'यो दिनका लागि फिडमा फुटबल खेलहरू छैनन्। अर्को दिन हेर्नुहोस् वा तलका समाचार पढ्नुहोस्।',
    noCricket: 'यो दिनका लागि फिडमा क्रिकेट खेलहरू छैनन्। अर्को दिन हेर्नुहोस् वा तलका समाचार पढ्नुहोस्।',
    tagline: 'खेल, स्कोर र समाचार — नेपाल लाइभ स्पोर्ट्स',
    navDash: '🏠 ड्यासबोर्ड', navFoot: '⚽ फुटबल लाइभ', navCricket: '🏏 क्रिकेट लाइभ',
    matches: 'आजका खेलहरू', worldNewsF: 'विश्व फुटबल समाचार', nepalNewsF: 'नेपाल फुटबल समाचार',
    worldNewsC: 'विश्व क्रिकेट समाचार', nepalNewsC: 'नेपाल क्रिकेट समाचार',
    prev: '‹ अघिल्लो', next: 'अर्को ›',
    footerSoccer: '<b>स्रोतहरू:</b> द स्पोर्ट्स डीबी (खेल तालिका र स्कोर) · गुगल न्यूज। खेल हरेक २ मिनेटमा ताजा हुन्छन्, समाचार हरेक ५ मिनेटमा। सुरु समय नेपाल समय (NPT) मा।',
    footerCricket: '<b>स्रोतहरू:</b> द स्पोर्ट्स डीबी (खेल तालिका र स्कोर) · गुगल न्यूज। खेल हरेक २ मिनेटमा ताजा हुन्छन्, समाचार हरेक ५ मिनेटमा। सुरु समय नेपाल समय (NPT) मा।'
  }
};
let S_LANG = localStorage.getItem('nlive-lang') || 'en';
const st = (k) => (S_I18N[S_LANG] && S_I18N[S_LANG][k]) ?? S_I18N.en[k] ?? k;

/* ---------- date/time helpers ---------- */
function kathmanduDateISO(offsetDays = 0) {
  const ymd = new Intl.DateTimeFormat('en-CA', {
    timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date()); // YYYY-MM-DD in NPT
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + offsetDays)).toISOString().slice(0, 10);
}
function nptTime(date, withSec = false) {
  return new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', minute: '2-digit',
    ...(withSec ? { second: '2-digit' } : {}), hour12: false }).format(date);
}
function nptDay(dateStr) {
  const today = kathmanduDateISO(0);
  if (dateStr === today) return st('today');
  if (dateStr === kathmanduDateISO(-1)) return st('yesterday');
  if (dateStr === kathmanduDateISO(1)) return st('tomorrow');
  return new Intl.DateTimeFormat(S_LANG === 'ne' ? 'ne-NP' : 'en-GB',
    { timeZone: TZ, weekday: 'short', day: 'numeric', month: 'short' })
    .format(new Date(dateStr + 'T00:00:00Z'));
}
function timeAgo(ts) {
  const s = Math.max(0, (Date.now() - ts) / 1000);
  if (s < 90) return Math.round(s) + ' ' + st('agoS');
  if (s < 5400) return Math.round(s / 60) + ' ' + st('agoM');
  if (s < 172800) return Math.round(s / 3600) + ' ' + st('agoH');
  return Math.round(s / 86400) + ' ' + st('agoD');
}
function stamp(id, ok = true) {
  const el = $(id);
  if (!el) return;
  el.textContent = ok ? st('updated') + ' ' + nptTime(new Date(), true) : st('failed');
  el.classList.toggle('err', !ok);
}

/* ---------- status normalization ---------- */
const LIVE_SET = new Set(['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE', 'IN PLAY', 'INPLAY',
  '1ST INNINGS', '2ND INNINGS', '3RD INNINGS', '4TH INNINGS', 'STUMPS', 'TEA', 'LUNCH', 'DRINKS', 'SUPER OVER']);
const DONE_SET = new Set(['FT', 'AET', 'PEN', 'FINISHED', 'COMPLETE', 'COMPLETED', 'MATCH FINISHED', 'ENDED', 'RESULT']);
const OFF_SET = new Set(['PPD', 'CANC', 'ABD', 'POSTPONED', 'CANCELLED', 'ABANDONED', 'NO RESULT']);

function classify(ev) {
  const s = String(ev.strStatus || '').trim().toUpperCase();
  if (LIVE_SET.has(s)) return 'live';
  if (DONE_SET.has(s)) return 'done';
  if (OFF_SET.has(s)) return 'off';
  return 'ns';
}
function statusChip(ev) {
  const c = classify(ev);
  const raw = String(ev.strStatus || '').trim();
  if (c === 'live') return `<span class="chip live">● ${st('live')}${raw && !['LIVE'].includes(raw.toUpperCase()) ? ' · ' + esc(raw) : ''}</span>`;
  if (c === 'done') return `<span class="chip ft">${esc(raw || 'FT')}</span>`;
  if (c === 'off') return `<span class="chip ft">${esc(raw || 'POSTPONED')}</span>`;
  return `<span class="chip ns">${st('upcoming')}</span>`;
}

/* ---------- matches ---------- */
let dayOffset = 0;
const S_CACHE = { matches: null, news1: null, news2: null };

function matchCard(ev) {
  const cls = classify(ev);
  const hs = ev.strHomeScore ?? ev.intHomeScore;
  const as = ev.strAwayScore ?? ev.intAwayScore;
  const hasScore = hs != null && as != null && String(hs) !== '' && String(as) !== '';
  const kickoff = ev.strTimestamp ? new Date(ev.strTimestamp.replace(' ', 'T') + 'Z') : null;
  const center = hasScore
    ? `<div class="score">${esc(hs)} – ${esc(as)}</div>`
    : `<div class="score vs">${kickoff ? nptTime(kickoff) : 'vs'}</div>`;
  const badge = (url) => url ? `<img src="${esc(url)}" alt="" loading="lazy" onerror="this.style.display='none'">` : '';
  return `<div class="match ${cls === 'live' ? 'live' : ''}">
    <div class="match-top">
      <span class="league">${esc(ev.strLeague || '')}${ev.strCountry ? ' · ' + esc(ev.strCountry) : ''}</span>
      ${statusChip(ev)}
    </div>
    <div class="teams">
      <div class="team">${badge(ev.strHomeTeamBadge)}<div class="nm">${esc(ev.strHomeTeam || '—')}</div></div>
      ${center}
      <div class="team">${badge(ev.strAwayTeamBadge)}<div class="nm">${esc(ev.strAwayTeam || '—')}</div></div>
    </div>
    <div class="match-bot">
      <span>${kickoff ? '🕐 ' + nptTime(kickoff) + ' NPT' : ''}</span>
      <span>${ev.intRound ? st('round') + ' ' + esc(ev.intRound) : ''}</span>
    </div>
  </div>`;
}

function renderMatches(cfg) {
  const date = kathmanduDateISO(dayOffset);
  $('day-label').textContent = nptDay(date) + ' · ' + date;
  const events = S_CACHE.matches;
  if (!events) return;
  if (!events.length) {
    $('matches-body').innerHTML = `<div class="loading">😴 ${st(cfg.sport === 'Cricket' ? 'noCricket' : 'noSoccer')}</div>`;
    return;
  }
  $('matches-body').innerHTML =
    `<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:12px">`
    + events.map(matchCard).join('') + `</div>`;
}

async function loadMatches(cfg) {
  const date = kathmanduDateISO(dayOffset);
  $('day-label').textContent = nptDay(date) + ' · ' + date;
  const direct = `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${date}&s=${cfg.sport}`;
  try {
    let d;
    try {
      const r = await fetch(`/api/sport?s=${cfg.sport}&d=${date}`, { cache: 'no-store' });
      if (!r.ok) throw new Error('proxy');
      d = await r.json();
    } catch (e) {
      const r2 = await fetch(direct, { cache: 'no-store' });
      d = await r2.json();
    }
    let events = d.events || [];
    const order = { live: 0, ns: 1, off: 2, done: 3 };
    events = events.slice().sort((a, b) =>
      order[classify(a)] - order[classify(b)]
      || String(a.strTimestamp || '').localeCompare(String(b.strTimestamp || '')));
    S_CACHE.matches = events;
    renderMatches(cfg);
    stamp('stamp-matches', true);
  } catch (e) {
    $('matches-body').innerHTML = `<div class="error-msg">⚠️ ${st('failed')}…</div>`;
    stamp('stamp-matches', false);
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
    body.innerHTML = `<div class="error-msg">⚠️ ${st('failed')}…</div>`;
    return;
  }
  body.innerHTML = items.slice(0, 10).map(i =>
    `<a class="news-item" href="${esc(i.link)}" target="_blank" rel="noopener">
       <div class="t">${esc(i.title)}</div>
       <div class="m"><b>${esc(i.source || 'News')}</b> · ${timeAgo(Date.parse(i.pubDate) || Date.now())}</div>
     </a>`).join('');
}

async function loadNews(cfg, which) {
  const q = which === 1 ? cfg.newsWorld : cfg.newsLocal;
  const items = await fetchNews(q);
  if (which === 1) S_CACHE.news1 = items; else S_CACHE.news2 = items;
  renderNews(which);
  stamp(`stamp-news${which}`, !!items.length);
}

/* ---------- language ---------- */
function applySportI18n(cfg) {
  if ($('sp-tagline')) $('sp-tagline').textContent = st('tagline');
  if ($('nav-dash')) $('nav-dash').textContent = st('navDash');
  if ($('nav-foot')) $('nav-foot').textContent = st('navFoot');
  if ($('nav-cricket')) $('nav-cricket').textContent = st('navCricket');
  if ($('matches-title')) $('matches-title').textContent = st('matches');
  if ($('news1-title')) $('news1-title').textContent = cfg.sport === 'Cricket' ? st('worldNewsC') : st('worldNewsF');
  if ($('news2-title')) $('news2-title').textContent = cfg.sport === 'Cricket' ? st('nepalNewsC') : st('nepalNewsF');
  if ($('prev-day')) $('prev-day').textContent = st('prev');
  if ($('next-day')) $('next-day').textContent = st('next');
  if ($('sp-footer')) $('sp-footer').innerHTML = cfg.sport === 'Cricket' ? st('footerCricket') : st('footerSoccer');
}
function setSportLang(cfg, lang) {
  S_LANG = lang;
  localStorage.setItem('nlive-lang', lang);
  document.documentElement.setAttribute('data-lang', lang);
  document.documentElement.setAttribute('lang', lang === 'ne' ? 'ne' : 'en');
  const be = $('lang-en'), bn = $('lang-ne');
  if (be) be.classList.toggle('active', lang === 'en');
  if (bn) bn.classList.toggle('active', lang === 'ne');
  applySportI18n(cfg);
  renderMatches(cfg);
  renderNews(1); renderNews(2);
}

/* ---------- clock ---------- */
function tickClock() {
  const now = new Date();
  const t = nptTime(now, true);
  const c = $('clock');
  if (c) c.innerHTML = `${t.slice(0, 5)}<span class="sec">${t.slice(5)}</span>`;
  const d = $('date-en');
  if (d) d.textContent = new Intl.DateTimeFormat(S_LANG === 'ne' ? 'ne-NP' : 'en-GB', {
    timeZone: TZ, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
}

/* ---------- init ---------- */
function initSportPage(cfg) {
  $('prev-day').addEventListener('click', () => { if (dayOffset > -14) { dayOffset--; loadMatches(cfg); } });
  $('next-day').addEventListener('click', () => { if (dayOffset < 14) { dayOffset++; loadMatches(cfg); } });
  $('refresh-matches').addEventListener('click', (e) => {
    e.currentTarget.classList.add('spinning');
    loadMatches(cfg).finally(() => e.currentTarget.classList.remove('spinning'));
  });
  $('refresh-news1').addEventListener('click', () => loadNews(cfg, 1));
  $('refresh-news2').addEventListener('click', () => loadNews(cfg, 2));
  if ($('lang-en')) $('lang-en').addEventListener('click', () => setSportLang(cfg, 'en'));
  if ($('lang-ne')) $('lang-ne').addEventListener('click', () => setSportLang(cfg, 'ne'));

  setSportLang(cfg, S_LANG);
  tickClock();
  setInterval(tickClock, 1000);

  loadMatches(cfg);
  loadNews(cfg, 1);
  loadNews(cfg, 2);
  setInterval(() => loadMatches(cfg), 120e3);
  setInterval(() => { loadNews(cfg, 1); loadNews(cfg, 2); }, 300e3);
}
