'use strict';
/*
 * Anonymous visit counts for the owner's /stats page.
 *
 * Nothing personal is kept: no cookies, no IP addresses, no user ids. The
 * browser sends one small beacon per page view — the page, where the visit came
 * from, phone/tablet/computer, language, and whether this browser has already
 * been here today / before (known only from dates it keeps in its own
 * localStorage). The server adds these to per-day totals.
 *
 * Counts wait in memory and are added to the day's saved row about once a
 * minute (read, add, write), so a restart loses at most a minute and a failed
 * save is retried. Storage: the Supabase table nl_stats on the live site, or
 * data/stats.json for local runs, so testing never touches the real numbers.
 */
const fs = require('fs');
const path = require('path');

const NPT = 5.75 * 3600e3;
const nptDay = (ms = Date.now()) => new Date(ms + NPT).toISOString().slice(0, 10);
const nptHour = (ms = Date.now()) => new Date(ms + NPT).getUTCHours();
const blank = (day) => ({ day, v: 0, u: 0, n: 0, r: 0, pages: {}, src: {}, dev: {}, lang: {}, hours: Array(24).fill(0) });
const MAX_KEYS = 300; /* per day and per table, so odd URLs can't grow a row without limit */

/* where a visit came from, by the referring site's host */
const SOURCES = [
  [/(^|\.)google\.[a-z.]+$/, 'google'], [/(^|\.)bing\.com$/, 'bing'],
  [/(^|\.)(duckduckgo\.com|yahoo\.com|yandex\.[a-z]+|baidu\.com|ecosia\.org|brave\.com)$/, 'other-search'],
  [/(^|\.)(facebook\.com|fb\.com|fb\.me|messenger\.com)$/, 'facebook'], [/(^|\.)instagram\.com$/, 'instagram'],
  [/(^|\.)(t\.co|twitter\.com|x\.com)$/, 'x'], [/(^|\.)(youtube\.com|youtu\.be)$/, 'youtube'], [/(^|\.)tiktok\.com$/, 'tiktok'],
  [/(^|\.)reddit\.com$/, 'reddit'], [/(^|\.)(whatsapp\.com|wa\.me)$/, 'whatsapp'], [/(^|\.)viber\.com$/, 'viber'],
  [/(^|\.)linkedin\.com$/, 'linkedin'],
];
function sourceOf(host) {
  const h = String(host || '').toLowerCase().replace(/^www\./, '').slice(0, 120);
  if (!h) return 'direct';
  for (const [re, k] of SOURCES) if (re.test(h)) return k;
  return 'other-sites';
}

module.exports = function init({ supabase, dir, flushMs = 60e3 }) {
  /* ------------------------------------------------------------ storage */
  let store;
  if (supabase) {
    const base = String(supabase.url).replace(/\/+$/, '') + '/rest/v1/nl_stats';
    const H = { apikey: supabase.key, 'Content-Type': 'application/json', Accept: 'application/json' };
    if (/^eyJ/.test(supabase.key)) H.Authorization = 'Bearer ' + supabase.key;
    const call = async (method, qs, body, prefer) => {
      const r = await fetch(base + qs, {
        method, headers: prefer ? { ...H, Prefer: prefer } : H,
        body: body === undefined ? undefined : JSON.stringify(body), signal: AbortSignal.timeout(8000),
      });
      const text = await r.text();
      if (!r.ok) throw new Error(`nl_stats ${r.status} ${text.slice(0, 200)}`);
      return text ? JSON.parse(text) : null;
    };
    store = {
      kind: 'supabase',
      async get(day) { const rows = await call('GET', `?day=eq.${day}&select=data&limit=1`); return rows && rows[0] ? rows[0].data : null; },
      async put(day, data) { await call('POST', '?on_conflict=day', { day, data, updated_at: new Date().toISOString() }, 'resolution=merge-duplicates,return=minimal'); },
      async range(from) { return ((await call('GET', `?day=gte.${from}&select=data&order=day.asc`)) || []).map((x) => x.data); },
      async first() { const rows = await call('GET', '?select=day&order=day.asc&limit=1'); return rows && rows[0] ? rows[0].day : null; },
    };
  } else {
    const file = path.join(dir, 'stats.json');
    const read = () => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return {}; } };
    store = {
      kind: 'file',
      async get(day) { return read()[day] || null; },
      async put(day, data) {
        const db = read();
        db[day] = data;
        fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(file + '.tmp', JSON.stringify(db));
        fs.renameSync(file + '.tmp', file);
      },
      async range(from) { const db = read(); return Object.keys(db).filter((d) => d >= from).sort().map((d) => db[d]); },
      async first() { return Object.keys(read()).sort()[0] || null; },
    };
  }

  /* --------------------------------------------------------------- sums */
  const bump = (o, k, n = 1) => {
    if (o[k] === undefined && Object.keys(o).length >= MAX_KEYS) k = '(other)';
    o[k] = (o[k] || 0) + n;
  };
  const norm = (d, day) => {
    const x = Object.assign(blank(day || (d && d.day)), d || {});
    ['pages', 'src', 'dev', 'lang'].forEach((k) => { if (!x[k] || typeof x[k] !== 'object') x[k] = {}; });
    if (!Array.isArray(x.hours) || x.hours.length !== 24) x.hours = Array(24).fill(0);
    return x;
  };
  const addInto = (t, d) => {
    ['v', 'u', 'n', 'r'].forEach((k) => { t[k] += d[k] || 0; });
    ['pages', 'src', 'dev', 'lang'].forEach((k) => Object.entries(d[k] || {}).forEach(([key, n]) => bump(t[k], key, n)));
    (d.hours || []).forEach((n, i) => { t.hours[i] += n || 0; });
    return t;
  };

  /* ------------------------------------------------ counting and saving */
  let pending = null;       /* today's counts not yet saved */
  const backlog = [];       /* earlier batches whose save failed */
  let saving = null;
  const recent = [];        /* { t, p } of the last 30 minutes, for the "right now" panel (memory only) */
  const started = Date.now();

  function hit(h) {
    const day = nptDay();
    if (pending && pending.day !== day) { backlog.push(pending); pending = null; save(); }
    if (!pending) pending = blank(day);
    const d = pending;
    d.v++;
    bump(d.pages, h.path);
    if (h.first) { d.u++; if (h.fresh) d.n++; else d.r++; }
    if (h.entry) bump(d.src, sourceOf(h.ref));
    bump(d.dev, h.dev);
    bump(d.lang, h.lang);
    d.hours[nptHour()]++;
    const now = Date.now();
    recent.push({ t: now, p: h.path });
    while (recent.length && (recent[0].t < now - 30 * 60e3 || recent.length > 5000)) recent.shift();
  }

  function save() {
    if (saving) return saving;
    if (pending && pending.v) { backlog.push(pending); pending = null; }
    if (!backlog.length) return Promise.resolve();
    saving = (async () => {
      while (backlog.length) {
        const batch = backlog[0];
        try {
          const saved = norm(await store.get(batch.day), batch.day);
          await store.put(batch.day, addInto(saved, batch));
          backlog.shift();
        } catch (e) {
          console.error('[stats] save failed, will retry:', e.message);
          break;
        }
      }
    })().finally(() => { saving = null; });
    return saving;
  }
  setInterval(save, flushMs).unref();
  process.once('SIGTERM', () => { save().finally(() => process.exit(0)); setTimeout(() => process.exit(0), 5000).unref(); });

  /* ------------------------------------------------------------- report */
  async function report(days) {
    days = Math.min(366, Math.max(1, days | 0 || 30));
    await save();
    /* this period and the one before it (for the "vs previous" change) in one read */
    const from = nptDay(Date.now() - (2 * days - 1) * 864e5);
    const [rows, since] = await Promise.all([store.range(from), store.first().catch(() => null)]);
    const byDay = new Map(rows.map((r) => [r.day, norm(r)]));
    /* anything still unsaved (a failed save) is shown too */
    backlog.concat(pending ? [pending] : []).forEach((b) => { if (b.day >= from) byDay.set(b.day, addInto(byDay.get(b.day) || blank(b.day), b)); });
    const span = (a, b) => { const out = []; for (let i = a; i >= b; i--) { const d = nptDay(Date.now() - i * 864e5); out.push(byDay.get(d) || blank(d)); } return out; };
    const list = span(days - 1, 0), prev = span(2 * days - 1, days);
    const tot = list.reduce((t, d) => addInto(t, d), blank('total'));
    const ptot = prev.reduce((t, d) => addInto(t, d), blank('prev'));
    const top = (o, n) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, n);
    const today = list[list.length - 1];
    /* page views by weekday (0 = Sunday) and Nepal hour */
    const heat = Array.from({ length: 7 }, () => Array(24).fill(0));
    list.forEach((d) => { const wd = new Date(d.day + 'T12:00:00Z').getUTCDay(); d.hours.forEach((n, h) => { heat[wd][h] += n || 0; }); });
    /* the last 30 minutes, per minute (kept in memory only, so it restarts with the server) */
    const now = Date.now(), cut = now - 30 * 60e3, mins = Array(30).fill(0), lp = {};
    recent.forEach((x) => { if (x.t < cut) return; mins[Math.min(29, Math.floor((x.t - cut) / 60e3))]++; lp[x.p] = (lp[x.p] || 0) + 1; });
    return {
      days: list.map((d) => ({ day: d.day, v: d.v, u: d.u, n: d.n })),
      totals: { v: tot.v, u: tot.u, n: tot.n, r: tot.r },
      prev: { v: ptot.v, u: ptot.u, n: ptot.n, r: ptot.r },
      today: { v: today.v, u: today.u },
      pages: top(tot.pages, 20), src: top(tot.src, 14), dev: tot.dev, lang: tot.lang, hours: tot.hours, heat,
      live: { v: mins.reduce((a, b) => a + b, 0), mins, pages: top(lp, 5), since: started },
      since, store: store.kind, generatedAt: new Date().toISOString(),
    };
  }

  return { hit, save, report, sourceOf, kind: store.kind };
};
