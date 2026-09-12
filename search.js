'use strict';
/*
 * Global search (/api/search?q=&type=). Searches Nepal Live's own live data —
 * news headlines, places, market pages, fixtures, jobs, events, government
 * services and site pages. Each source is searched on its own, so one feed
 * being down marks that group unavailable instead of failing the search.
 */
module.exports = function init({ P, S, SDB, site, PL }) {
  const norm = (s) => String(s || '').normalize('NFKC').toLowerCase();
  const toks = (q) => norm(q).split(/[\s,.;:!?"'()\/|।-]+/).filter((t) => t.length >= 2 || /[ऀ-ॿ]/.test(t)).slice(0, 8);
  /* place names match across scripts: "Pokhara" also finds पोखरा in Nepali headlines, and back */
  const ALIAS = new Map();
  S.CITIES.forEach((c) => { const en = norm(c.en), ne = norm(c.ne); if (en && ne) { ALIAS.set(en, ne); ALIAS.set(ne, en); } });
  const has = (hay, ts) => { const h = norm(hay); return ts.every((t) => h.includes(t) || (ALIAS.has(t) && h.includes(ALIAS.get(t)))); };
  const rank = (arr, ts, titleOf) => arr
    .map((x) => [ts.reduce((a, t) => { const i = norm(titleOf(x)).indexOf(t); return a + (i === 0 ? 3 : i > 0 ? 2 : 0); }, 0), x])
    .sort((a, b) => b[0] - a[0]).map((x) => x[1]);

  const MARKETS = [
    { title: 'NEPSE index', titleNe: 'नेप्से सूचकांक', sub: 'Nepal Stock Exchange — index, turnover, gainers & losers', url: '/money#nepse', kw: 'nepse share stock market index sensitive float नेप्से शेयर' },
    { title: 'Gold price', titleNe: 'सुनको मूल्य', sub: 'Fine gold per tola, with history', url: '/money#metals', kw: 'gold sun tola hallmark सुन' },
    { title: 'Silver price', titleNe: 'चाँदीको मूल्य', sub: 'Silver per tola, with history', url: '/money#metals', kw: 'silver chandi चाँदी' },
    { title: 'Exchange rates', titleNe: 'विनिमय दर', sub: 'Nepal Rastra Bank — USD, INR, EUR, GBP, AUD and more', url: '/money#fx', kw: 'forex exchange rate dollar usd inr eur gbp aud jpy currency विनिमय डलर' },
    { title: 'Fuel prices', titleNe: 'इन्धन मूल्य', sub: 'Nepal Oil Corporation — petrol, diesel, kerosene, LPG', url: '/money#fuel', kw: 'fuel petrol diesel lpg gas kerosene noc इन्धन पेट्रोल डिजेल ग्यास' },
  ];
  const GOV = site.GOV.flatMap((g) => g.items.map((it) => ({ ...it, group: g.en })));
  const PAGES = site.paths().map((p) => ({ p, d: site.PAGES[p] }));

  const sportEvents = () => {
    const out = [];
    const push = (e, sport) => out.push({ e, sport });
    [['Soccer', 'football'], ['Cricket', 'cricket']].forEach(([s, slug]) => {
      const r = SDB.range(s, 1, 3);
      (r.days || []).forEach((d) => (d.events || []).forEach((e) => push(e, slug)));
    });
    (SDB.nepal().fixtures || []).forEach((e) => push(e, 'nepal-sports'));
    const seen = new Set();
    return out.filter(({ e }) => (seen.has(e.idEvent) ? false : seen.add(e.idEvent)));
  };

  /* opts: lang (en|ne) and cat (news topic) narrow news; prov (NP01–NP07) narrows
     news, places, jobs and events (nationwide events stay in); days = news from the
     last N days, events in the next N days. With filters but no words, only the
     groups a filter applies to are listed. */
  async function search(q, only, opts = {}) {
    const ts = toks(q);
    const { lang = '', cat = '', days = 0, prov = '' } = opts;
    const filters = { lang, cat, days, prov };
    const browse = !ts.length;
    if (browse && !(lang || cat || days || prov)) return { q, groups: [], total: 0, filters };
    const cap = (n) => (only ? 50 : n);
    const provName = prov && PL ? (PL.byId.get(prov) || {}).en || '' : '';
    const inProv = (text) => !prov || (PL && PL.provinceOf(text) === prov);
    const today = new Date(Date.now() + 5.75 * 3600e3).toISOString().slice(0, 10);
    const until = days ? new Date(Date.now() + 5.75 * 3600e3 + days * 864e5).toISOString().slice(0, 10) : '';
    const recent = (iso) => { if (!days) return true; const t = Date.parse(iso); return Number.isFinite(t) && Date.now() - t <= days * 864e5; };
    const allowed = ['news'].concat(prov ? ['places', 'jobs', 'events'] : [], days ? ['events'] : []);
    const groups = [];
    const add = async (key, fn) => {
      if (only && only !== key) return;
      if (browse && !allowed.includes(key)) return;
      try { const items = await fn(); if (items.length) groups.push({ key, items }); }
      catch (e) { groups.push({ key, items: [], unavailable: true }); }
    };
    await Promise.all([
      add('places', async () => rank(S.CITIES.filter((c) => has(`${c.en} ${c.ne} ${c.district} ${c.province}`, ts) && (!provName || c.province === provName)), ts, (c) => c.en).slice(0, cap(6))
        .map((c) => ({ type: 'place', id: c.id, title: c.en, titleNe: c.ne, sub: `${c.district} district · ${c.province}`, url: `/weather?city=${c.id}` }))),
      add('markets', async () => MARKETS.filter((m) => has(`${m.title} ${m.titleNe} ${m.sub} ${m.kw}`, ts))
        .map((m) => ({ type: 'page', id: m.url, title: m.title, titleNe: m.titleNe, sub: m.sub, url: m.url }))),
      add('news', async () => {
        const d = await P.newsNepal();
        return rank((d.items || []).filter((i) => has(`${i.title} ${i.summary || ''} ${i.source || ''}`, ts)
            && (!lang || i.lang === lang) && (!cat || (i.topic || 'nepal') === cat) && (!prov || i.province === prov) && recent(i.pubDate)), ts, (i) => i.title)
          .slice(0, cap(browse ? 20 : 8))
          .map((i) => ({ type: 'news', id: i.link, title: i.title, sub: i.source || '', url: i.link, time: i.pubDate || i.time || null, img: i.image || '', external: true,
            lang: i.lang || '', topic: i.topic || 'nepal', province: i.province || '' }));
      }),
      add('sports', async () => rank(sportEvents().filter(({ e, sport }) => has(`${e.strEvent} ${e.strHomeTeam} ${e.strAwayTeam} ${e.strLeague} ${e.strSport || ''} ${sport}`, ts)), ts, (x) => x.e.strEvent || '')
        .slice(0, cap(6)).map(({ e, sport }) => ({
          type: 'match', id: e.idEvent, title: e.strEvent || `${e.strHomeTeam} vs ${e.strAwayTeam}`, url: '/' + sport,
          sub: [e.strLeague, e.dateEvent, e.intHomeScore != null && e.intAwayScore != null && e.intHomeScore !== '' ? `${e.intHomeScore}–${e.intAwayScore}` : ''].filter(Boolean).join(' · '),
        }))),
      add('jobs', async () => {
        const all = await S.jobsAll();
        return rank(all.items.filter((j) => has(`${j.title} ${j.company || ''} ${j.location} ${j.city} ${j.categories.join(' ')} ${j.tags.join(' ')}`, ts)
            && inProv(`${j.location || ''} ${j.city || ''}`)), ts, (j) => j.title)
          .slice(0, cap(6)).map((j) => ({ type: 'job', id: String(j.id), title: j.title, sub: [j.company, j.location].filter(Boolean).join(' · '), url: j.url, img: j.logo, deadline: j.deadline, external: true }));
      }),
      add('events', async () => {
        const d = await S.events();
        return d.items.filter((i) => has(`${i.title} ${i.titleNe || ''} ${i.category} ${i.location || ''}`, ts)
            && (!prov || !i.location || /nationwide/i.test(i.location) || inProv(i.location))
            && (!days || (i.date >= today && i.date <= until))).slice(0, cap(6))
          .map((i) => ({ type: 'event', id: i.id, title: i.title, titleNe: i.titleNe, sub: i.date + (i.location ? ' · ' + i.location : ''), url: '/events', date: i.date }));
      }),
      add('government', async () => rank(GOV.filter((g) => has(`${g.en} ${g.ne} ${g.dEn} ${g.kw} ${g.group}`, ts)), ts, (g) => g.en).slice(0, cap(6))
        .map((g) => ({ type: 'gov', id: g.url, title: g.en, titleNe: g.ne, sub: new URL(g.url).hostname.replace(/^www\./, '') + ' · Official source', url: g.url, external: true }))),
      add('pages', async () => PAGES.filter(({ d }) => has(`${d.kicker} ${d.title} ${d.description}`, ts)).slice(0, cap(5))
        .map(({ p, d }) => ({ type: 'page', id: p, title: d.kicker, sub: d.description.slice(0, 140), url: p }))),
    ]);
    const ORDER = ['places', 'markets', 'news', 'sports', 'jobs', 'events', 'government', 'pages'];
    groups.sort((a, b) => ORDER.indexOf(a.key) - ORDER.indexOf(b.key));
    return { q, groups, total: groups.reduce((a, g) => a + g.items.length, 0), filters };
  }
  return { search };
};
