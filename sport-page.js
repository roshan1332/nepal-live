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
    recent: 'Recent', upcomingDays: 'Upcoming', final: 'Final',
    liveNow: 'Live now', finished: 'Finished', scheduled: 'Upcoming',
    venue: 'Venue', noneToday: 'No matches in the feed for the next few days. Check back soon.',
    errMatches: 'Unable to load the match list right now. Please try again.',
    errNews: 'Unable to load news right now. Please try again.',
    lastGood: 'Last good update',
    updated: 'Updated', failed: 'Failed — retrying', round: 'Round',
    agoS: 's ago', agoM: 'm ago', agoH: 'h ago', agoD: 'd ago',
    noSoccer: 'No football matches scheduled for this day in the feed. Try another day, or check the news below.',
    noCricket: 'No cricket matches scheduled for this day in the feed. Try another day, or check the news below.',
    tagline: 'Matches, scores & news — Nepal Live Sports',
    navDash: 'Dashboard', navMk: 'Markets', navFoot: 'Football Live', navCricket: 'Cricket Live',
    matches: "Today's Matches", worldNewsF: 'World Football News', nepalNewsF: 'Nepal Football News',
    worldNewsC: 'World Cricket News', nepalNewsC: 'Nepal Cricket News',
    prev: '‹ Prev', next: 'Next ›',
    credit: 'Made by <b>Roshan Mainali</b>',
    footerSoccer: '<b>Sources:</b> TheSportsDB (fixtures & scores) · Google News. Matches auto-refresh every 2 min, news every 5 min. Kick-off times shown in Nepal Time (NPT).',
    footerCricket: '<b>Sources:</b> TheSportsDB (fixtures & scores) · Google News. Matches auto-refresh every 2 min, news every 5 min. Start times shown in Nepal Time (NPT).'
  },
  ne: {
    today: 'आज', yesterday: 'हिजो', tomorrow: 'भोलि',
    upcoming: 'आगामी', live: 'प्रत्यक्ष',
    recent: 'हालैका', upcomingDays: 'आगामी', final: 'समाप्त',
    liveNow: 'प्रत्यक्ष', finished: 'सकिएका', scheduled: 'आगामी',
    venue: 'मैदान', noneToday: 'आउँदा केही दिनका लागि फिडमा खेल छैनन्। केही बेरमा फेरि हेर्नुहोस्।',
    errMatches: 'खेलको सूची लोड गर्न सकिएन। फेरि प्रयास गर्नुहोस्।',
    errNews: 'समाचार लोड गर्न सकिएन। फेरि प्रयास गर्नुहोस्।',
    lastGood: 'अन्तिम सफल अपडेट',
    updated: 'अपडेट', failed: 'असफल — पुनः प्रयास', round: 'चरण',
    agoS: 'सेकेन्ड अघि', agoM: 'मिनेट अघि', agoH: 'घण्टा अघि', agoD: 'दिन अघि',
    noSoccer: 'यो दिनका लागि फिडमा फुटबल खेलहरू छैनन्। अर्को दिन हेर्नुहोस् वा तलका समाचार पढ्नुहोस्।',
    noCricket: 'यो दिनका लागि फिडमा क्रिकेट खेलहरू छैनन्। अर्को दिन हेर्नुहोस् वा तलका समाचार पढ्नुहोस्।',
    tagline: 'खेल, स्कोर र समाचार — नेपाल लाइभ स्पोर्ट्स',
    navDash: 'ड्यासबोर्ड', navMk: 'बजार', navFoot: 'फुटबल लाइभ', navCricket: 'क्रिकेट लाइभ',
    matches: 'आजका खेलहरू', worldNewsF: 'विश्व फुटबल समाचार', nepalNewsF: 'नेपाल फुटबल समाचार',
    worldNewsC: 'विश्व क्रिकेट समाचार', nepalNewsC: 'नेपाल क्रिकेट समाचार',
    prev: '‹ अघिल्लो', next: 'अर्को ›',
    credit: 'निर्माता: <b>रोशन मैनाली</b>',
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
const S_LAST = {};
function stamp(id, ok = true) {
  if (ok) S_LAST[id.replace('stamp-', '')] = nptTime(new Date(), true);
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

function matchCard(ev, i = 0) {
  const cls = classify(ev);
  const hs = ev.strHomeScore ?? ev.intHomeScore;
  const as = ev.strAwayScore ?? ev.intAwayScore;
  const hasScore = hs != null && as != null && String(hs) !== '' && String(as) !== '';
  const kickoff = ev.strTimestamp ? new Date(ev.strTimestamp.replace(' ', 'T') + 'Z') : null;
  const center = hasScore
    ? `<div class="score">${esc(hs)} – ${esc(as)}</div>`
    : `<div class="score vs">${kickoff ? nptTime(kickoff) : 'vs'}</div>`;
  const badge = (url) => url ? `<img src="${esc(url)}" alt="" loading="lazy" onerror="this.style.display='none'">` : '';
  return `<div class="match ${cls === 'live' ? 'live' : ''}" style="--i:${i}">
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

/* Apple Sports layout: each team gets its own row (badge · name · score) and the
   match status sits in a column on the right. Opt-in via cfg.cardStyle:'apple'. */
function matchCardApple(ev, i = 0) {
  const cls = classify(ev);
  const hs = ev.strHomeScore ?? ev.intHomeScore;
  const as = ev.strAwayScore ?? ev.intAwayScore;
  const hasScore = hs != null && as != null && String(hs) !== '' && String(as) !== '';
  const hn = Number(hs), an = Number(as);
  const decided = hasScore && cls === 'done' && Number.isFinite(hn) && Number.isFinite(an) && hn !== an;
  const kickoff = ev.strTimestamp ? new Date(ev.strTimestamp.replace(' ', 'T') + 'Z') : null;
  const raw = String(ev.strStatus || '').trim();

  const row = (team, badge, score, dim) =>
    `<div class="ap-row${dim ? ' dim' : ''}">
       <span class="ap-badge">${badge ? `<img src="${esc(badge)}" alt="" loading="lazy" onerror="this.style.display='none'">` : ''}</span>
       <span class="ap-name">${esc(team || '—')}</span>
       <span class="ap-score">${hasScore ? esc(score) : ''}</span>
     </div>`;

  let status;
  if (cls === 'live')
    status = `<span class="ap-st hot"><i class="ap-dot"></i>${st('live')}</span>`
      + (raw && raw.toUpperCase() !== 'LIVE' ? `<span class="ap-sub">${esc(raw)}</span>` : '');
  else if (cls === 'done')
    status = `<span class="ap-st">${raw && raw.toUpperCase() !== 'FT' ? esc(raw) : st('final')}</span>`;
  else if (cls === 'off')
    status = `<span class="ap-st">${esc(raw || 'Postponed')}</span>`;
  else
    status = kickoff
      ? `<span class="ap-time">${nptTime(kickoff)}</span><span class="ap-sub">NPT</span>`
      : `<span class="ap-st">${st('upcoming')}</span>`;

  const venue = ev.strVenue ? `<div class="ap-venue">${esc(ev.strVenue)}</div>` : '';
  return `<div class="match ${cls}" style="--i:${i}">
    <div class="ap-league">${esc(ev.strLeague || '')}${ev.strCountry ? ' · ' + esc(ev.strCountry) : ''}</div>
    <div class="ap-main">
      <div class="ap-teams">
        ${row(ev.strHomeTeam, ev.strHomeTeamBadge, hs, decided && hn < an)}
        ${row(ev.strAwayTeam, ev.strAwayTeamBadge, as, decided && an < hn)}
      </div>
      <div class="ap-status">${status}</div>
    </div>
    ${venue}
  </div>`;
}

let cardFn = matchCard;

function daySection(title, inner){
  return `<div class="day-sec"><div class="day-h">${title}</div>${inner}</div>`;
}
function subDay(date, events){
  return `<div class="subday">${nptDay(date)}</div><div class="day-grid">${events.map((ev,i)=>cardFn(ev,i)).join('')}</div>`;
}
/* Matches are grouped by what the viewer cares about first — what is on now,
   then what is coming, then what finished — with day sub-headings inside the
   last two. */
function group(kind, label, count, inner){
  return `<section class="grp ${kind}">
    <div class="grp-h"><span class="lbl">${label}</span><span class="n">${count}</span></div>
    ${inner}
  </section>`;
}
function byDay(events, newestFirst){
  const map = new Map();
  events.forEach((ev) => {
    const d = ev._date || (ev.dateEvent || '');
    if (!map.has(d)) map.set(d, []);
    map.get(d).push(ev);
  });
  const dates = [...map.keys()].sort((a, b) => newestFirst ? b.localeCompare(a) : a.localeCompare(b));
  return dates.map((d) =>
    `<div class="subday">${nptDay(d)}</div><div class="day-grid">${map.get(d).map((ev,i)=>cardFn(ev,i)).join('')}</div>`
  ).join('');
}
function kickoffMs(ev){
  const t = ev.strTimestamp ? Date.parse(ev.strTimestamp.replace(' ', 'T') + 'Z') : NaN;
  return Number.isFinite(t) ? t : Date.parse((ev.dateEvent || '') + 'T00:00:00Z') || 0;
}
function renderMatches(cfg){
  const days = S_CACHE.matches;
  if(!days) return;
  const all = [];
  days.forEach((d) => (d.events || []).forEach((ev) => all.push(Object.assign({ _date: d.date }, ev))));

  const live = all.filter((e) => classify(e) === 'live').sort((a,b)=>kickoffMs(a)-kickoffMs(b));
  const soon = all.filter((e) => { const c = classify(e); return c === 'ns' || c === 'off'; })
                  .sort((a,b)=>kickoffMs(a)-kickoffMs(b));
  const done = all.filter((e) => classify(e) === 'done').sort((a,b)=>kickoffMs(b)-kickoffMs(a));

  let html = '';
  if (live.length) html += group('is-live', st('liveNow'), live.length,
    `<div class="day-grid">${live.map((ev,i)=>cardFn(ev,i)).join('')}</div>`);
  if (soon.length) html += group('is-soon', st('scheduled'), soon.length, byDay(soon, false));
  if (done.length) html += group('is-done', st('finished'), done.length, byDay(done, true));

  $('matches-body').innerHTML = html || NL.emptyState(st('noneToday'));
}

async function loadMatches(cfg){
  try{
    if (!S_CACHE.matches) $('matches-body').innerHTML = NL.skeleton('cards');
    let d;
    try{
      const r = await fetch(`/api/sport-range?s=${cfg.sport}&past=2&future=10`, { cache:'no-store' });
      if(!r.ok) throw new Error('proxy');
      d = await r.json();
    }catch(e){
      const date = kathmanduDateISO(0);
      const r2 = await fetch(`https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${date}&s=${cfg.sport}`, { cache:'no-store' });
      const j2 = await r2.json();
      d = { days: (j2.events && j2.events.length) ? [{ date, events: j2.events }] : [] };
    }
    S_CACHE.matches = d.days || [];
    renderMatches(cfg);
    stamp('stamp-matches', true);
  }catch(e){
    $('matches-body').innerHTML = NL.errorState(st('errMatches'), {
      mod: 'matches',
      stale: S_LAST.matches ? st('lastGood') + ' ' + S_LAST.matches : '',
    });
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
    body.innerHTML = NL.errorState(st('errNews'), {
      mod: 'news' + which,
      stale: S_LAST['news' + which] ? st('lastGood') + ' ' + S_LAST['news' + which] : '',
    });
    return;
  }
  body.innerHTML = `<div class="news-list">` + items.slice(0, 12).map((i, idx) =>
    `<a class="news-item" style="--i:${idx}" href="${esc(i.link)}" target="_blank" rel="noopener noreferrer">
       <div class="news-body">
         <div class="t">${esc(i.title)}</div>
         <div class="m"><span class="src-badge">${esc(i.source || 'News')}</span>
           <span>${timeAgo(Date.parse(i.pubDate) || Date.now())}</span></div>
       </div>
     </a>`).join('') + `</div>`;
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
  if ($('nav-mk')) $('nav-mk').textContent = st('navMk');
  if ($('nav-foot')) $('nav-foot').textContent = st('navFoot');
  if ($('nav-cricket')) $('nav-cricket').textContent = st('navCricket');
  if ($('matches-title')) $('matches-title').textContent = st('matches');
  if ($('news1-title')) $('news1-title').textContent = cfg.sport === 'Cricket' ? st('worldNewsC') : st('worldNewsF');
  if ($('news2-title')) $('news2-title').textContent = cfg.sport === 'Cricket' ? st('nepalNewsC') : st('nepalNewsF');
  if ($('prev-day')) $('prev-day').textContent = st('prev');
  if ($('next-day')) $('next-day').textContent = st('next');
  NL.footerSources = [
    { name: 'TheSportsDB — fixtures, scores & badges', url: 'https://www.thesportsdb.com/' },
    { name: 'Google News — sports headlines', url: 'https://news.google.com/' },
    { name: 'Nepal Live dashboard — gold, NEPSE, weather', url: 'index.html' },
  ];
  NL.renderFooter(NL.footerSources);
}
function setSportLang(cfg, lang) {
  S_LANG = lang;
  localStorage.setItem('nlive-lang', lang);
  document.documentElement.setAttribute('data-lang', lang);
  document.documentElement.setAttribute('lang', lang === 'ne' ? 'ne' : 'en');
  document.querySelectorAll('[data-lang]').forEach((b) =>
    b.classList.toggle('active', b.getAttribute('data-lang') === lang));
  document.dispatchEvent(new CustomEvent('nl:lang', { detail: { lang } }));
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

/* ---------- language switch animation ---------- */
function rippleFrom(btn) {
  const r = btn.getBoundingClientRect();
  const c = document.createElement('div');
  c.className = 'lang-ripple';
  c.style.left = (r.left + r.width / 2) + 'px';
  c.style.top = (r.top + r.height / 2) + 'px';
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 900);
}
function playLangWave() {
  const els = [document.querySelector('header'), document.querySelector('nav.pages'),
               ...document.querySelectorAll('main .card')];
  els.forEach((el, i) => {
    if (!el) return;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = 'langSwap .4s ease-out both';
    el.style.animationDelay = (i * 0.03) + 's';
  });
}
function switchSportLang(cfg, lang, btn) {
  rippleFrom(btn);
  setSportLang(cfg, lang);
  playLangWave();
}

/* ---------- parallax ---------- */
function initParallax() {
  const el = document.querySelector('.brand .ball') || document.querySelector('.brand svg');
  if (!el || !matchMedia('(pointer:fine)').matches || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  let tx = 0, ty = 0, cx = 0, cy = 0;
  addEventListener('mousemove', (e) => {
    tx = (e.clientX / innerWidth - 0.5) * 2;
    ty = (e.clientY / innerHeight - 0.5) * 2;
  }, { passive: true });
  (function loop() {
    cx += (tx - cx) * 0.06; cy += (ty - cy) * 0.06;
    el.style.transform = `translate(${(cx * 7).toFixed(2)}px, ${(cy * 5).toFixed(2)}px) rotate(${(cx * 4).toFixed(2)}deg)`;
    requestAnimationFrame(loop);
  })();
}

/* ---------- init ---------- */
function initSportPage(cfg) {
  cardFn = cfg.cardStyle === 'apple' ? matchCardApple : matchCard;
  NL.retryHandlers = {
    matches: () => loadMatches(cfg),
    news1: () => loadNews(cfg, 1),
    news2: () => loadNews(cfg, 2),
  };
  $('refresh-matches').addEventListener('click', (e) => {
    e.currentTarget.classList.add('spinning');
    loadMatches(cfg).finally(() => e.currentTarget.classList.remove('spinning'));
  });
  $('refresh-news1').addEventListener('click', () => loadNews(cfg, 1));
  $('refresh-news2').addEventListener('click', () => loadNews(cfg, 2));
  /* delegated so the header switch and the one in the mobile menu both work */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]');
    if (b) switchSportLang(cfg, b.getAttribute('data-lang'), b);
  });

  setSportLang(cfg, S_LANG);
  initParallax();
  tickClock();
  setInterval(tickClock, 1000);

  loadMatches(cfg);
  loadNews(cfg, 1);
  loadNews(cfg, 2);
  setInterval(() => loadMatches(cfg), 120e3);
  setInterval(() => { loadNews(cfg, 1); loadNews(cfg, 2); }, 300e3);
}
