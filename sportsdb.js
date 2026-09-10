/*
 * Nepal Live — TheSportsDB access within its rate limit.
 *
 * The free API allows roughly 30 requests a minute and answers 429 beyond
 * that, so every request goes through one queue spaced ~2.2 s apart, the most
 * useful days first (today, yesterday, tomorrow, then further out). Routes read
 * whatever is cached and never wait on the queue; each response says how many
 * days are still pending, so pages can show "loading" instead of a false
 * "no matches".
 */
'use strict';

const BASE = 'https://www.thesportsdb.com/api/v1/json/3/';
const GAP = 2200;
const OTHER = ['Basketball', 'Ice_Hockey', 'Baseball', 'Rugby', 'Volleyball'];
const NEPAL_FOOTBALL_TEAM = 140146;

module.exports = function init(fetchURL) {
  const store = new Map();     // key -> { ts, data }
  const waiting = new Map();   // key -> { path, prio }
  let running = false;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  async function pump() {
    if (running) return;
    running = true;
    try {
      while (waiting.size) {
        let best = null;
        for (const entry of waiting) if (!best || entry[1].prio > best[1].prio) best = entry;
        const [key, job] = best;
        waiting.delete(key);
        try {
          const r = await fetchURL(BASE + job.path);
          if (r.status === 429) {           // over budget: back off, then retry this one first
            waiting.set(key, { ...job, prio: job.prio + 1000 });
            await sleep(15000);
            continue;
          }
          if (r.status >= 400) throw new Error('HTTP ' + r.status);
          store.set(key, { ts: Date.now(), data: JSON.parse(r.body) });
        } catch (e) {
          console.warn(`[sportsdb] ${job.path}: ${e.message}`);
        }
        await sleep(GAP);
      }
    } finally {
      running = false;
    }
  }

  /* Cached data for key (possibly stale) or undefined; queues a refresh when
     the entry is missing or older than ttl. */
  function want(key, path, ttl, prio) {
    const hit = store.get(key);
    if (!hit || Date.now() - hit.ts >= ttl) {
      const w = waiting.get(key);
      if (!w) { waiting.set(key, { path, prio }); pump(); } else if (prio > w.prio) w.prio = prio;
    }
    return hit ? hit.data : undefined;
  }

  const iso = (off) => new Date(Date.now() + off * 864e5).toISOString().slice(0, 10);
  /* recent days change (live scores); far-off fixtures rarely do */
  const ttlFor = (off) => (off === 0 || off === -1 ? 180e3 : off === 1 ? 600e3 : 3600e3);
  const prioFor = (off, weight) => weight * 100 - Math.abs(off) * 10 - (off < 0 ? 5 : 0);

  function day(sport, off, weight) {
    const date = iso(off);
    return { date, data: want(`day:${sport}:${date}`, `eventsday.php?d=${date}&s=${sport}`, ttlFor(off), prioFor(off, weight)) };
  }

  function range(sport, past = 2, future = 10) {
    const days = [];
    let pending = 0;
    for (let off = -past; off <= future; off++) {
      const d = day(sport, off, 3);
      if (d.data === undefined) pending++;
      else if (d.data.events && d.data.events.length) days.push({ date: d.date, events: d.data.events });
    }
    return { days, pending, fetchedAt: new Date().toISOString() };
  }

  function single(sport, date) {
    const off = Math.round((Date.parse(date) - Date.parse(iso(0))) / 864e5);
    const d = want(`day:${sport}:${date}`, `eventsday.php?d=${date}&s=${sport}`, ttlFor(off), prioFor(off, 3));
    return d === undefined ? { events: null, pending: 1 } : d;
  }

  function other() {
    const byDate = {};
    let pending = 0;
    OTHER.forEach((s) => [-1, 0, 1].forEach((off) => {
      const d = day(s, off, 1);
      if (d.data === undefined) { pending++; return; }
      (byDate[d.date] = byDate[d.date] || []).push(...(d.data.events || []).map((e) => ({ ...e, _sport: s })));
    }));
    return { days: Object.keys(byDate).sort().map((k) => ({ date: k, events: byDate[k] })), sports: OTHER, pending, fetchedAt: new Date().toISOString() };
  }

  /* Nepal's national teams: fixtures in the football/cricket feeds with a Nepal
     side, plus the national football team's own recent and next matches. */
  function nepal() {
    const isNp = (e) => /\bNepal\b/i.test(`${e.strHomeTeam} ${e.strAwayTeam}`);
    const all = [];
    let pending = 0;
    [['Soccer'], ['Cricket']].forEach(([sp]) => {
      const r = range(sp);
      pending += r.pending;
      r.days.forEach((d) => d.events.filter(isNp).forEach((e) => all.push({ ...e, _sport: sp })));
    });
    ['eventslast', 'eventsnext'].forEach((ep) => {
      const d = want(`team:${ep}:${NEPAL_FOOTBALL_TEAM}`, `${ep}.php?id=${NEPAL_FOOTBALL_TEAM}`, 3600e3, 60);
      if (d === undefined) { pending++; return; }
      (d.events || d.results || []).forEach((e) => all.push({ ...e, _sport: 'Soccer' }));
    });
    const seen = new Set();
    return {
      fixtures: all.filter((e) => (seen.has(e.idEvent) ? false : seen.add(e.idEvent))),
      pending, fetchedAt: new Date().toISOString(),
      sources: [{ name: 'TheSportsDB', url: 'https://www.thesportsdb.com/' }],
    };
  }

  /* warm the days people look at first */
  function prime() { range('Soccer', 1, 1); range('Cricket', 1, 1); }

  return { range, single, other, nepal, prime };
};
