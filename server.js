/*
 * Nepal Live — server
 * Serves the pages and proxies public APIs (with caching) so the pages work
 * from any origin with zero CORS problems.
 *
 * Run:  node server.js      (default port 3000, override with PORT=...)
 * No npm dependencies required (Node 18+).
 */
const http = require('http');
const https = require('https');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

/* Local secrets: optional KEY=value lines in ./.env (git-ignored, never served).
   Real environment variables — e.g. set in the Render dashboard — win. */
try {
  fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/).forEach((line) => {
    const m = /^\s*([A-Z][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, '$2');
  });
} catch (e) { /* no .env file */ }

/* Works whether the nepse files are in ./nepse/ or flattened at the root
   (happens when files are drag-dropped into GitHub one by one). */
let nepseGet;
try {
  ({ nepseGet } = require('./nepse/nepse-client'));
} catch (e1) {
  try {
    ({ nepseGet } = require('./nepse-client'));
  } catch (e2) {
    nepseGet = async () => { throw new Error('NEPSE client not found'); };
  }
}

const PORT = process.env.PORT || 3000;
const cache = new Map();

/* ---------------- upstream fetch helper ---------------- */
function fetchURL(url, redirects = 0, extra = {}) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NepalLiveDashboard/2.0)',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate',
        ...extra,
      },
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 4) {
        res.resume();
        return resolve(fetchURL(new URL(res.headers.location, url).toString(), redirects + 1, extra));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const buf = Buffer.concat(chunks);
        const enc = res.headers['content-encoding'];
        const done = (b) => resolve({ status: res.statusCode, body: b.toString('utf8') });
        if (enc === 'gzip') zlib.gunzip(buf, (e, b2) => (e ? reject(e) : done(b2)));
        else if (enc === 'deflate') zlib.inflate(buf, (e, b2) => (e
          ? zlib.inflateRaw(buf, (e2, b3) => (e2 ? reject(e2) : done(b3)))
          : done(b2)));
        else done(buf);
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => req.destroy(new Error('upstream timeout')));
  });
}

/* How long past its TTL a cached payload may still be served when the upstream
   is failing. A brief Open-Meteo/USGS/NEPSE hiccup should not blank a card that
   had good data seconds ago; beyond this window we'd rather surface the error
   than show silently stale numbers. */
const STALE_GRACE = 30 * 60e3;

/* Open-Meteo signals failure in a 200 response body, e.g.
   {"error":true,"reason":"Daily API request limit exceeded..."}. Parsing that as
   success would cache the error and serve it to the page, so turn it into a real
   throw: cached() can then fall back to stale data, and the route answers 502 so
   the browser retries Open-Meteo directly on its own quota. */
function openMeteo(body, requiredKey) {
  const j = JSON.parse(body);
  if (j && j.error) throw new Error(j.reason || 'Open-Meteo error');
  if (!j || !j[requiredKey]) throw new Error(`Open-Meteo response missing "${requiredKey}"`);
  return j;
}

/* Concurrent requests for the same key share one upstream call. */
const inflight = new Map();
async function cached(key, ttlMs, producer) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data;
  if (inflight.has(key)) return inflight.get(key);
  const run = (async () => {
    try {
      const data = await producer();
      cache.set(key, { ts: Date.now(), data });
      return data;
    } catch (e) {
      if (hit && Date.now() - hit.ts < ttlMs + STALE_GRACE) {
        const age = Math.round((Date.now() - hit.ts) / 1000);
        console.warn(`[cache] ${key}: upstream failed (${e.message}) — serving ${age}s-old data`);
        return hit.data;
      }
      throw e;
    } finally {
      inflight.delete(key);
    }
  })();
  inflight.set(key, run);
  return run;
}

/* ---------------- RSS parser ----------------
 * splitSource=true  → Google News style "Title - Source" titles
 * splitSource=false → direct site feeds; source = defaultSource   */
/* Feeds label themselves en/ne, but several mix scripts item-by-item
   (Nagarik's "EN" feed is mostly Devanagari). Trust the text, not the label. */
const DEVANAGARI = /[ऀ-ॿ]/;
const isNepali = (s) => DEVANAGARI.test(String(s || ''));

/* First usable image in the item: media:*, an image enclosure, or the first
   <img> inside description/content:encoded. */
const IMG_PATTERNS = [
  /<media:content[^>]*\burl="([^"]+)"[^>]*>/i,
  /<media:thumbnail[^>]*\burl="([^"]+)"/i,
  /<enclosure[^>]*\burl="([^"]+)"[^>]*\btype="image/i,
  /<enclosure[^>]*\btype="image[^>]*\burl="([^"]+)"/i,
  /<img[^>]+src="([^"]+)"/i,
  /<img[^>]+src='([^']+)'/i,
];
function firstImage(block) {
  for (const re of IMG_PATTERNS) {
    const m = block.match(re);
    if (m && /^https?:\/\//i.test(m[1])) {
      /* skip tracking pixels and tiny spacers */
      if (/\b(1x1|pixel|spacer|blank)\b/i.test(m[1])) continue;
      return m[1].replace(/&amp;/g, '&');
    }
  }
  return '';
}
function firstCategory(block) {
  const m = block.match(/<category[^>]*>([\s\S]*?)<\/category>/i);
  if (!m) return '';
  const c = m[1].replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, '').trim();
  /* housekeeping categories some WordPress feeds emit */
  if (!c || /^(cover|home|uncategor)/i.test(c) || c.length > 28) return '';
  return c;
}

const NAMED_ENTITIES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', ndash: '–', mdash: '—',
  rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“', laquo: '«', raquo: '»', middot: '·', bull: '•',
};
function decodeEntities(str) {
  return String(str || '')
    .replace(/&#(\d+);/g, (_, d) => { const c = +d; return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : ''; })
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => { const c = parseInt(h, 16); return c > 0 && c < 0x110000 ? String.fromCodePoint(c) : ''; })
    .replace(/&([a-z]+);/gi, (m, name) => NAMED_ENTITIES[name.toLowerCase()] ?? m);
}

/* A short standfirst for the featured story: the feed's description minus the
   WordPress boilerplate, cut at a word boundary. Dropped when it merely repeats
   the headline (Google News descriptions are just "title · source"). */
function makeSummary(desc, title) {
  let t = String(desc || '')
    .replace(/The post .*? appeared first on .*?\.?$/i, '')
    .replace(/\[(…|&hellip;|\.\.\.)\]/g, '')
    .replace(/(Continue reading|Read more|थप पढ्नुहोस्).*$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!t) return '';
  const head = String(title || '').trim().slice(0, 40).toLowerCase();
  if (head && t.toLowerCase().startsWith(head)) return '';
  if (t.length > 220) t = t.slice(0, 220).replace(/\s+\S*$/, '') + '…';
  return t.length >= 40 ? t : '';
}

/* Canonical topic for the category pills. Feeds' own <category> values are
   free text in two scripts, so topics come from keywords over the category and
   headline (then the summary as a tie-breaker). Order matters: a cricket story
   about India is Sports, not World. */
const TOPIC_RULES = [
  ['sports',
    /\b(sports?|cricket|football|futsal|matches|match|cup|league|tournament|olympics?|athletes?|players?|squad|wickets?|innings|T20|ODI|FIFA|ICC|ACC|ANFA|\d+-run)\b/i,
    /(खेलकुद|क्रिकेट|फुटबल|फुटसल|लिग|प्रतियोगिता|खेलाडी|विश्वकप|विकेट|रनको|रनले|रनमा|टी-२०|टी२०|म्याच)/],
  ['entertainment',
    /\b(film|films|movie|movies|cinema|music|songs?|singers?|actor|actress|celebrit(y|ies)|entertainment|bollywood|kollywood|hollywood|concert|album)\b/i,
    /(मनोरञ्जन|फिल्म|चलचित्र|गीत|संगीत|गायक|गायिका|कलाकार|अभिनेता|अभिनेत्री|नायिका|कन्सर्ट|एल्बम)/],
  ['technology',
    /\b(tech|technology|digital|internet|apps?|software|startups?|cyber|smartphones?|mobile phones?|AI|artificial intelligence|5G|telecom|Ncell|NTC|satellite|robots?|gadgets?|iPhone|Android|TikTok|Facebook)\b/i,
    /(प्रविधि|डिजिटल|इन्टरनेट|सफ्टवेयर|साइबर|स्मार्टफोन|मोबाइल|टेलिकम|एनसेल|टिकटक|फेसबुक|कृत्रिम बौद्धिकता|आईफोन|एप्पल)/],
  ['business',
    /\b(business|economy|economic|markets?|banks?|banking|NEPSE|shares?|stocks?|gold|silver|prices?|trade|budget|investments?|investors?|remittances?|inflation|imports?|exports?|industr(y|ies)|revenue|loans?|interest rates?|fuel|petrol|rupee|forex|GDP|compan(y|ies)|hydropower|tourism|LP gas)\b/i,
    /(अर्थतन्त्र|आर्थिक|अर्थ मन्त्रालय|बजार|बैंक|सेयर|नेप्से|सुनको|सुनचाँदी|सुन चाँदी|चाँदी|मूल्य|भाउ|व्यापार|बजेट|लगानी|रेमिट्यान्स|मुद्रास्फीति|आयात|निर्यात|उद्योग|राजस्व|ऋण|ब्याज|इन्धन|पेट्रोल|कम्पनी|जलविद्युत|पर्यटन|ग्यास)/],
  ['politics',
    /\b(politics|political|politicians?|ministers?|ministry|parliament|elections?|votes?|voting|part(y|ies)|congress|UML|Maoist|government|govt|cabinet|prime minister|president|opposition|lawmakers?|coalition|Oli|Deuba|Prachanda|Balen|supreme court|constitution|protests?)\b/i,
    /(राजनीति|मन्त्री|संसद|निर्वाचन|चुनाव|पार्टी|काँग्रेस|कांग्रेस|एमाले|माओवादी|सरकार|प्रधानमन्त्री|मन्त्रिपरिषद्|राष्ट्रपति|सांसद|गठबन्धन|ओली|देउवा|प्रचण्ड|बालेन|सर्वोच्च|संविधान|आन्दोलन|प्रदेशसभा)/],
  ['world',
    /\b(world|international|global|China|Chinese|India|Indian|Pakistan|Bangladesh|Sri Lanka|America|American|U\.S\.|USA|United States|Trump|Biden|Iran|Israel|Gaza|Russia|Ukraine|Europe|European|UK|Britain|Japan|Korea|UN|United Nations|Philippines|Afghanistan)\b/i,
    /(विश्व|अन्तर्राष्ट्रिय|चीन|चिनियाँ|भारत|भारतीय|पाकिस्तान|बंगलादेश|अमेरिका|ट्रम्प|इरान|इजरायल|रुस|युक्रेन|युरोप|जापान|कोरिया|फिलिपिन्स|संयुक्त राष्ट्र)/],
  /* after World, so a foreign disaster stays World; Nepal's crime, accidents,
     disasters, health and education land here instead of the generic bucket */
  ['society',
    /\b(police|arrest(ed|s)?|crime|murder(ed)?|killed|dies|died|death|dead|injured|accidents?|collision|fire|floods?|flooding|landslides?|disaster|rescued?|missing|hospitals?|health|doctors?|patients?|disease|dengue|cholera|vaccin(e|ation)|education|schools?|students?|teachers?|universit(y|ies)|exams?|women|children|child|youth|migrant workers?|Dalit|festival|temple)\b/i,
    /(प्रहरी|पक्राउ|हत्या|मृत्यु|घाइते|दुर्घटना|आगलागी|बाढी|पहिरो|विपद्|उद्धार|बेपत्ता|अस्पताल|स्वास्थ्य|चिकित्सक|बिरामी|डेंगु|हैजा|खोप|शिक्षा|विद्यालय|विद्यार्थी|शिक्षक|विश्वविद्यालय|परीक्षा|महिला|बालबालिका|युवा|वैदेशिक रोजगार|दलित|जात्रा|मन्दिर)/],
];
function topicOf(title, category, summary) {
  const test = (text) => {
    for (const [id, en, ne] of TOPIC_RULES) if (en.test(text) || ne.test(text)) return id;
    return '';
  };
  return test(`${category || ''} ${title || ''}`) || test(summary || '') || 'nepal';
}

function parseRSS(xml, defaultSource = '', splitSource = true, limit = 14) {
  const items = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml)) && items.length < limit) {
    const block = m[1];
    const get = (tag) => {
      const mm = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`));
      if (!mm) return '';
      /* decode first: some feeds entity-encode their HTML, so tags only
         become strippable once &lt;p&gt; is back to <p> */
      return decodeEntities(decodeEntities(mm[1].replace(/<!\[CDATA\[|\]\]>/g, '')))
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };
    const raw = get('title');
    if (!raw) continue;
    let title = raw;
    let source = defaultSource;
    if (splitSource) {
      const dash = raw.lastIndexOf(' - ');
      if (dash > 0 && raw.slice(dash + 3).length <= 40) { title = raw.slice(0, dash); source = raw.slice(dash + 3); }
    }
    const pubDate = get('pubDate');
    if (!title) continue;
    const category = firstCategory(block);
    const summary = makeSummary(get('description') || get('content:encoded'), title);
    items.push({
      title, source, link: get('link'), pubDate,
      image: firstImage(block),
      category,
      summary,
      topic: topicOf(title, category, summary),
    });
  }
  return { items, fetchedAt: new Date().toISOString() };
}

/* Nepali news websites (native RSS feeds) */
const NEPAL_FEEDS = [
  { name: 'OnlineKhabar (EN)', lang: 'en', url: 'https://english.onlinekhabar.com/feed' },
  { name: 'OnlineKhabar', lang: 'ne', url: 'https://www.onlinekhabar.com/feed' },
  { name: 'Khabarhub (EN)', lang: 'en', url: 'https://english.khabarhub.com/feed/' },
  { name: 'Nagarik News (EN)', lang: 'en', url: 'https://nagariknews.nagariknetwork.com/feed' },
  { name: 'Setopati', lang: 'ne', url: 'https://www.setopati.com/feed' },
  { name: 'The Himalayan Times', lang: 'en', url: 'https://thehimalayantimes.com/rssFeed/15' },
  { name: 'Ratopati', lang: 'ne', url: 'https://www.ratopati.com/feed' },
];

/* ---------------- Hamro Patro gold/silver parser ---------------- */
function parseHamroGold(html) {
  const chunks = [...html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)].map(m => m[1]);
  const blob = chunks.map(c => JSON.parse('"' + c + '"')).join('');
  const key = '"enSegment":';
  const i = blob.indexOf(key);
  if (i < 0) throw new Error('gold segment not found');
  const start = i + key.length;
  let depth = 0, end = -1;
  for (let j = start; j < blob.length; j++) {
    if (blob[j] === '{') depth++;
    else if (blob[j] === '}') { depth--; if (depth === 0) { end = j + 1; break; } }
  }
  if (end < 0) throw new Error('unbalanced segment');
  const seg = JSON.parse(blob.slice(start, end));
  const items = (seg.items || []).map(it => ({
    name: it.name, symbol: it.symbol,
    prices: (it.prices || []).map(p => ({
      unit: p.name,
      date: p.price.date,
      price: p.price.price,
      prevPrice: p.history && p.history[1] ? p.history[1].price : null,
      history: (p.history || []).slice(0, 31).map(h => h.price).reverse(), // oldest -> newest
      /* the full series Hamro Patro publishes (≈60 days), with dates, for charts */
      series: (p.history || []).map(h => ({ date: h.date, price: h.price })).reverse(),
    })),
  }));
  return { date: seg.date, items };
}

const num = (v, dflt) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : dflt;
};

const SDB = require('./sportsdb')(fetchURL);
/* second weather source: Open-Meteo's free quota is per IP, and Render's
   outbound IP is shared, so when it refuses, forecasts come from MET Norway.
   WEATHER_FALLBACK_TEST=1 forces the fallback (for testing). */
const MET = require('./metno')({ fetchURL });
let omPausedUntil = 0;
const weatherFallback = () => process.env.WEATHER_FALLBACK_TEST === '1' || Date.now() < omPausedUntil;
const pauseOpenMeteo = (e) => { if (/limit|quota|429/i.test(String(e && e.message))) omPausedUntil = Date.now() + 30 * 60e3; };

/* ---------------- shared producers ----------------
   One function per upstream, so routes and the aggregate endpoints
   (highlights, alerts, roads …) reuse the same cache entries. */
const P = {
  rates: () => cached('rates', 300e3, async () => JSON.parse((await fetchURL('https://open.er-api.com/v6/latest/USD')).body)),

  /* official Nepal Rastra Bank forex — recent days, normalised to per-1-unit NPR.
     NRB quotes some currencies per 10/100 units (JPY, INR, KRW), so divide it out
     here and let the page treat every currency the same. */
  forex: () => cached('forex', 900e3, async () => {
    const day = 86400e3;
    const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
    /* +1 day on the upper bound: Nepal (UTC+5:45) can already be on the next date */
    const url = 'https://www.nrb.org.np/api/forex/v1/rates'
      + `?from=${iso(Date.now() - 20 * day)}&to=${iso(Date.now() + day)}&per_page=100&page=1`;
    const j = await nrbJSON(url);
    const days = normForex(j);
    if (!days.length) throw new Error('no NRB rates in range');
    return { source: 'Nepal Rastra Bank', days };
  }),

  gold: () => cached('gold', 60e3, async () => {
    const [xau, xag] = await Promise.all([
      fetchURL('https://api.gold-api.com/price/XAU'),
      fetchURL('https://api.gold-api.com/price/XAG'),
    ]);
    const gold = JSON.parse(xau.body);
    const silver = JSON.parse(xag.body);
    return {
      gold: { usdPerOz: gold.price, updatedAt: gold.updatedAt },
      silver: { usdPerOz: silver.price, updatedAt: silver.updatedAt },
      fetchedAt: new Date().toISOString(),
    };
  }),

  goldHP: () => cached('gold-hp', 600e3, async () => {
    const r = await fetchURL('https://www.hamropatro.com/gold');
    const parsed = parseHamroGold(r.body);
    return { source: 'hamropatro', ...parsed, fetchedAt: new Date().toISOString() };
  }),

  nepse: () => cached('nepse', 60e3, async () => {
    const [indices, summary] = await Promise.all([
      nepseGet('nots/nepse-index'),
      nepseGet('nots/market-summary'),
    ]);
    return { indices, summary, fetchedAt: new Date().toISOString() };
  }),
  nepseTop: () => cached('nepse-top', 60e3, async () => {
    const [gainers, losers, turnover] = await Promise.all([
      nepseGet('nots/top-ten/top-gainer?all=false'),
      nepseGet('nots/top-ten/top-loser?all=false'),
      nepseGet('nots/top-ten/turnover?all=false'),
    ]);
    return { gainers, losers, turnover, fetchedAt: new Date().toISOString() };
  }),
  nepseHistory: (size) => cached(`nepse-hist-${size}`, 600e3, async () => {
    const h = await nepseGet(`nots/index/history/58?size=${size}`);
    return { content: h.content || h, fetchedAt: new Date().toISOString() };
  }),
  /* the exchange's own open/closed flag, rather than guessing from the clock */
  nepseStatus: () => cached('nepse-status', 60e3, async () => {
    const s = await nepseGet('nots/nepse-data/market-open');
    return { isOpen: s.isOpen, asOf: s.asOf, fetchedAt: new Date().toISOString() };
  }),

  quakes: ({ days = 7, minmag = 3.5, limit = 12 } = {}) => cached(`quakes:${days}:${minmag}:${limit}`, 120e3, async () => {
    const now = new Date();
    const since = new Date(now.getTime() - days * 86400e3);
    const fmt = (d) => encodeURIComponent(d.toISOString().slice(0, 19));
    const url = 'https://earthquake.usgs.gov/fdsnws/event/1/query'
      + `?format=geojson&starttime=${fmt(since)}&endtime=${fmt(now)}`
      + `&latitude=27.9&longitude=84.1&maxradiuskm=800&minmagnitude=${minmag}`
      + `&orderby=time&limit=${limit}`;
    const r = await fetchURL(url);
    return JSON.parse(r.body);
  }),

  /* Latest news aggregated directly from Nepali news websites */
  newsNepal: () => cached('news-nepal', 300e3, async () => {
    const results = await Promise.allSettled(
      NEPAL_FEEDS.map(async (f) => {
        const r = await fetchURL(f.url);
        return parseRSS(r.body, f.name, false, 20).items
          .map((it) => ({ ...it, source: f.name, lang: isNepali(it.title) ? 'ne' : 'en',
            /* the province whose places the story names (for the province filter) */
            province: PL.provinceOf(`${it.title} ${it.summary || ''}`) }));
      })
    );
    let items = [];
    results.forEach((res) => { if (res.status === 'fulfilled') items = items.concat(res.value); });
    if (!items.length) throw new Error('no news feed answered');
    // newest first
    items.sort((a, b) => (Date.parse(b.pubDate) || 0) - (Date.parse(a.pubDate) || 0));
    /* the same story can arrive through two feeds */
    const seen = new Set();
    items = items.filter((it) => {
      const k = it.link || it.title;
      if (seen.has(k)) return false;
      seen.add(k); return true;
    });
    return { items: items.slice(0, 140), fetchedAt: new Date().toISOString() };
  }),

  /* TheSportsDB, through the rate-limited queue in sportsdb.js: routes answer
     from cache immediately and report days still pending */
  sportRange: (sport, past = 2, future = 10) => Promise.resolve(SDB.range(sport, past, future)),
  sportsOther: () => Promise.resolve(SDB.other()),
  nepalSports: () => Promise.resolve(SDB.nepal()),
};
SDB.prime();

/* NRB's API intermittently drops or errors a request; one retry after a short
   pause clears nearly all of those without hammering it. */
async function nrbJSON(url) {
  for (let attempt = 0; ; attempt++) {
    try {
      const r = await fetchURL(url);
      if (r.status >= 400) throw new Error('NRB HTTP ' + r.status);
      return JSON.parse(r.body);
    } catch (e) {
      if (attempt >= 1) throw e;
      await new Promise((ok) => setTimeout(ok, 800));
    }
  }
}

function normForex(j) {
  return (((j.data || {}).payload) || []).map((d) => {
    const rates = {};
    (d.rates || []).forEach((x) => {
      const cur = x.currency || {};
      const unit = Number(cur.unit) || 1;
      const buy = Number(x.buy), sell = Number(x.sell);
      if (!cur.iso3 || !isFinite(buy) || !isFinite(sell)) return;
      rates[cur.iso3] = { buy: buy / unit, sell: sell / unit, mid: (buy + sell) / 2 / unit, unit };
    });
    return { date: d.date, rates };
  }).filter((d) => Object.keys(d.rates).length)
    .sort((a, b) => a.date.localeCompare(b.date));
}

const S = require('./sources')({ fetchURL, cached, P, MET, weatherFallback, pauseOpenMeteo });
/* the 7 provinces: districts, capitals, official sites; tags headlines by the places they name */
const PL = require('./places')({ CITIES: S.CITIES });
const site = require('./site-pages');

/* ---------------- response helpers ---------------- */
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN',
};
/* gzip text responses when the browser accepts it (pages and scripts are the
   bulk of every first visit) */
function reply(req, res, status, body, headers) {
  let buf = Buffer.isBuffer(body) ? body : Buffer.from(typeof body === 'string' ? body : JSON.stringify(body), 'utf8');
  const h = { ...headers, Vary: 'Accept-Encoding' };
  if (buf.length > 1024 && /\bgzip\b/.test(req.headers['accept-encoding'] || '')) {
    buf = zlib.gzipSync(buf, { level: 6 });
    h['Content-Encoding'] = 'gzip';
  }
  h['Content-Length'] = buf.length;
  res.writeHead(status, h);
  res.end(req.method === 'HEAD' ? undefined : buf);
}
function send(req, res, status, body, isHTML = false) {
  reply(req, res, status, body, {
    'Content-Type': isHTML ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
    ...(isHTML ? SECURITY_HEADERS : {}),
  });
}

/* static files: pages, plus an allow-list of client assets (never server code) */
const PAGE_FILES = {
  '/': 'index.html', '/index.html': 'index.html',
  '/football': 'football.html', '/football.html': 'football.html',
  '/cricket': 'cricket.html', '/cricket.html': 'cricket.html',
};
const ASSET_RE = /^\/(app|kit|sport-page|nepal-map|page-[a-z-]+)\.(js|css)$/;
const TYPES = { js: 'application/javascript; charset=utf-8', css: 'text/css; charset=utf-8' };
const staticCache = new Map();
function readStatic(file) {
  const full = path.join(__dirname, file);
  const st = fs.statSync(full);
  const hit = staticCache.get(file);
  if (hit && hit.mtime === st.mtimeMs) return hit.buf;
  const buf = fs.readFileSync(full);
  staticCache.set(file, { mtime: st.mtimeMs, buf });
  return buf;
}

const SITE_ORIGIN = process.env.SITE_ORIGIN || 'https://nepal-live.onrender.com';

/* ---------------- accounts & search ---------------- */
/* Accounts are stored in Supabase when SUPABASE_URL and its secret key are set
   (production); otherwise in a JSON file under DATA_DIR (local development —
   on Render's free tier that file is wiped on every deploy, and the account
   page says so). */
const SUPA_URL = process.env.SUPABASE_URL;
const SUPA_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORE = SUPA_URL && SUPA_KEY
  ? require('./store-supabase')({ url: SUPA_URL, key: SUPA_KEY })
  : require('./store-file')(process.env.DATA_DIR || path.join(__dirname, 'data'));
if (STORE.ping) {
  STORE.ping().then(() => console.log('[accounts] Supabase connected'))
    .catch((e) => console.error('[accounts] Supabase check failed — run supabase-schema.sql and check SUPABASE_URL / SUPABASE_SECRET_KEY:', e.detail || e.message));
} else console.log('[accounts] using local file store' + (process.env.DATA_DIR ? '' : ' (./data — not persistent on Render)'));
const ACC = require('./accounts')({
  store: STORE, durable: STORE.kind === 'supabase' || !!process.env.DATA_DIR,
  alerts: () => S.alerts(), cities: S.CITIES,
  /* owner accounts (comma-separated emails) — they alone can open /stats */
  admins: String(process.env.ADMIN_EMAILS || '').split(','),
});
const SEARCH = require('./search')({ P, S, SDB, site, PL });
/* server-rendered landing pages for the most-searched live numbers */
const SEOP = require('./seo-pages')({ P, S, site });

/* share image, app icon and favicons (crawlable, unlike a data: URI) */
const IMAGES = {
  '/og.png': ['og.png', 'image/png'], '/icon-512.png': ['icon-512.png', 'image/png'], '/icon-192.png': ['icon-192.png', 'image/png'],
  '/favicon.ico': ['favicon-48.png', 'image/png'], '/favicon.svg': ['favicon.svg', 'image/svg+xml'],
  '/logo.png': ['logo.png', 'image/png'], '/logo-mark.png': ['logo-mark.png', 'image/png'],
};
const MANIFEST = {
  name: 'Nepal Live', short_name: 'Nepal Live', id: '/', start_url: '/?source=app', scope: '/', display: 'standalone',
  description: 'News, markets, weather, alerts, sports and useful tools for Nepal — in one place.',
  lang: 'en', dir: 'ltr', background_color: '#f6f3ec', theme_color: '#f6f3ec', categories: ['news', 'weather', 'finance'],
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
  ],
  shortcuts: [
    { name: 'News', url: '/news', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
    { name: 'Markets', url: '/money', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
    { name: 'Alerts', url: '/alerts', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
    { name: 'Tools', url: '/tools', icons: [{ src: '/icon-192.png', sizes: '192x192' }] },
  ],
};
/* Search Console / Bing ownership tags for the static homepage and sports pages */
const VERIFY_META = [
  process.env.GOOGLE_SITE_VERIFICATION && '<meta name="google-site-verification" content="' + process.env.GOOGLE_SITE_VERIFICATION.replace(/[^\w-]/g, '') + '">',
  process.env.BING_SITE_VERIFICATION && '<meta name="msvalidate.01" content="' + process.env.BING_SITE_VERIFICATION.replace(/[^\w-]/g, '') + '">',
].filter(Boolean).join('\n');
/* Front-end error reports from app.js, for Render → Logs: small, rate-limited,
   never echoed back. Message, page and line only — nothing personal. */
const logHits = new Map();
function clientLog(req, res) {
  const done = (code) => { res.writeHead(code, { 'Cache-Control': 'no-store' }); res.end(); };
  if (req.method !== 'POST') return done(405);
  const ip = String((process.env.RENDER && req.headers['x-forwarded-for']) || req.socket.remoteAddress || '').split(',')[0].trim();
  const now = Date.now(), hits = (logHits.get(ip) || []).filter((t) => now - t < 600e3);
  if (hits.length >= 30) return done(429);
  hits.push(now);
  logHits.set(ip, hits);
  if (logHits.size > 5000) logHits.clear();
  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 2048) req.destroy(); });
  req.on('end', () => {
    try {
      const j = JSON.parse(body);
      const clean = (v, n) => String(v == null ? '' : v).replace(/[\x00-\x1f]/g, ' ').slice(0, n);
      console.error('[client] ' + clean(j.page, 80) + ' — ' + clean(j.msg, 300) + ' (' + clean(j.src, 120) + ':' + (+j.line || 0) + ')');
    } catch (e) { /* not JSON: ignore */ }
    done(204);
  });
}
/* Visit counts for the owner's /stats page (stats.js). The live site keeps them
   in Supabase (table nl_stats); local runs use data/stats.json, so testing
   never touches the real numbers. Only ADMIN_EMAILS accounts can read them. */
const STATS = require('./stats')({
  supabase: process.env.RENDER && SUPA_URL && SUPA_KEY ? { url: SUPA_URL, key: SUPA_KEY } : null,
  dir: process.env.DATA_DIR || path.join(__dirname, 'data'),
});
console.log('[stats] counting visits in ' + (STATS.kind === 'supabase' ? 'Supabase (nl_stats)' : 'data/stats.json'));
const BOT_UA = /bot|crawl|spider|slurp|headless|lighthouse|preview|facebookexternalhit|curl|wget|python|node-fetch|axios|monitor|uptime/i;
const hitIps = new Map();
/* only real pages are counted (a mistyped URL shows the 404 page and isn't) */
function countable(p) {
  p = String(p || '').toLowerCase().slice(0, 80).replace(/\.html$/, '').replace(/\/+$/, '') || '/';
  if (p === '/index') p = '/';
  return PAGE_FILES[p] || (site.PAGES[p] && p !== '/offline') || SEOP.has(p) ? p : null;
}
function statsHit(req, res) {
  const done = (code) => { res.writeHead(code, { 'Cache-Control': 'no-store' }); res.end(); };
  if (req.method !== 'POST') return done(405);
  if (BOT_UA.test(req.headers['user-agent'] || '') || req.headers['sec-purpose'] || req.headers.purpose) return done(204);
  const ip = String((process.env.RENDER && req.headers['x-forwarded-for']) || req.socket.remoteAddress || '').split(',')[0].trim();
  const now = Date.now(), hits = (hitIps.get(ip) || []).filter((t) => now - t < 600e3);
  if (hits.length >= 120) return done(429);
  hits.push(now);
  hitIps.set(ip, hits);
  if (hitIps.size > 5000) hitIps.clear();
  let body = '';
  req.on('data', (c) => { body += c; if (body.length > 1024) req.destroy(); });
  req.on('end', () => {
    try {
      const j = JSON.parse(body);
      const p = countable(j.path);
      if (p) {
        STATS.hit({
          path: p, ref: typeof j.ref === 'string' && /^[a-z0-9.-]{1,120}$/i.test(j.ref) ? j.ref : '',
          entry: j.entry === true, first: j.first === true, fresh: j.fresh === true,
          dev: ['m', 't', 'd'].includes(j.dev) ? j.dev : 'd', lang: j.lang === 'ne' ? 'ne' : 'en',
        });
      }
    } catch (e) { /* not JSON: ignore */ }
    done(204);
  });
}
async function adminStats(req, res, u) {
  if (req.method !== 'GET') return send(req, res, 405, { error: 'method not allowed' });
  /* "not allowed" answers 200 with no numbers (like /api/me for a guest), so the
     page shows its message without a failed request in the browser console */
  const user = await ACC.currentUser(req);
  if (!user) return send(req, res, 200, { access: 'login' });
  if (!ACC.isAdmin(user)) return send(req, res, 200, { access: 'owner' });
  return send(req, res, 200, { ...(await STATS.report(+u.searchParams.get('days') || 30)), viewer: user.email });
}
const withVerify = (buf) => (VERIFY_META ? Buffer.from(buf.toString('utf8').replace('</head>', VERIFY_META + '\n</head>')) : buf);
const isAccountRoute = (p) => p.startsWith('/api/auth/') || p === '/api/me' || p.startsWith('/api/me/');

const ROBOTS = [
  'User-agent: *',
  'Allow: /',
  'Disallow: /api/',
  '',
  `Sitemap: ${SITE_ORIGIN}/sitemap.xml`,
  '',
].join('\n');

function sitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: '/', priority: '1.0', freq: 'hourly' },
    ...site.paths().map((p) => ({ loc: p, priority: site.PAGES[p].priority || '0.7', freq: site.PAGES[p].changefreq || 'daily' })),
    ...SEOP.paths().map((p) => ({ loc: p, priority: p.startsWith('/weather/') ? '0.7' : '0.9', freq: p === '/nepali-date' ? 'daily' : 'hourly' })),
    { loc: '/football', priority: '0.8', freq: 'hourly' },
    { loc: '/cricket', priority: '0.8', freq: 'hourly' },
  ];
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + urls.map((u) => `  <url><loc>${SITE_ORIGIN}${u.loc}</loc><lastmod>${today}</lastmod>`
        + `<changefreq>${u.freq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')
    + '\n</urlset>\n';
}

/* ---------------- API routes ---------------- */
const API = {
  /* currency exchange rates (base USD) */
  '/api/rates': () => P.rates(),
  '/api/forex': () => P.forex(),
  /* gold & silver spot (gold-api.com, free, real-time) */
  '/api/gold': () => P.gold(),
  /* Nepal's official daily gold/silver rates — Hamro Patro (FEGOD rates) */
  '/api/gold-hamropatro': () => P.goldHP(),
  /* NEPSE index + market summary (official site API via token flow) */
  '/api/nepse': () => P.nepse(),
  /* optional parts of the NEPSE card: when NEPSE drops these, answer "unavailable"
     as data so the page leaves them out without a browser console error */
  '/api/nepse/top': () => P.nepseTop().catch((e) => ({ unavailable: true, error: String((e && e.message) || e) })),
  '/api/nepse/status': () => P.nepseStatus(),
  /* NEPSE index history (for the chart) */
  '/api/nepse/history': (u) => P.nepseHistory(Math.min(250, Math.max(10, parseInt(u.searchParams.get('size') || '90', 10) || 90)))
    .catch((e) => ({ unavailable: true, error: String((e && e.message) || e) })),

  /* weather — Open-Meteo */
  '/api/weather': (u) => {
    const lat = num(u.searchParams.get('lat'), 27.7172);
    const lon = num(u.searchParams.get('lon'), 85.324);
    /* 15-min TTL, not 5: Open-Meteo's free tier is a daily quota and on Render's
       shared outbound IP it is easy to exhaust. Forecast data barely moves in
       that window, so this cuts upstream calls ~3x for no visible staleness. */
    return cached(`weather:${lat}:${lon}`, 900e3, async () => {
      const url = 'https://api.open-meteo.com/v1/forecast'
        + `?latitude=${lat}&longitude=${lon}`
        + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m'
        + '&hourly=temperature_2m,weather_code,precipitation_probability'
        + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset'
        + '&timezone=Asia%2FKathmandu&forecast_days=7';
      if (weatherFallback()) return MET.forecast(lat, lon);
      try {
        return openMeteo((await fetchURL(url)).body, 'current');
      } catch (e) {
        pauseOpenMeteo(e);
        console.warn('[weather] Open-Meteo failed (' + e.message + ') — using MET Norway');
        return MET.forecast(lat, lon);
      }
    });
  },

  /* air quality — Open-Meteo */
  '/api/air': (u) => {
    const lat = num(u.searchParams.get('lat'), 27.7172);
    const lon = num(u.searchParams.get('lon'), 85.324);
    return cached(`air:${lat}:${lon}`, 900e3, async () => {
      /* current = concentrations plus the per-pollutant US AQI sub-indices (so the
         dominant pollutant is upstream's, not ours); hourly us_aqi across
         yesterday..tomorrow feeds the ±12 h trend line. */
      const url = 'https://air-quality-api.open-meteo.com/v1/air-quality'
        + `?latitude=${lat}&longitude=${lon}`
        + '&current=pm2_5,pm10,us_aqi,us_aqi_pm2_5,us_aqi_pm10,us_aqi_ozone,'
        + 'us_aqi_nitrogen_dioxide,us_aqi_sulphur_dioxide,us_aqi_carbon_monoxide,'
        + 'ozone,nitrogen_dioxide,sulphur_dioxide,carbon_monoxide'
        + '&hourly=us_aqi&past_days=1&forecast_days=2'
        + '&timezone=Asia%2FKathmandu';
      return openMeteo((await fetchURL(url)).body, 'current');
    });
  },

  /* earthquakes near Nepal — USGS (defaults match the original card) */
  '/api/quakes': (u) => P.quakes({
    days: Math.min(30, Math.max(1, parseInt(u.searchParams.get('days') || '7', 10) || 7)),
    minmag: Math.min(6, Math.max(2.5, num(u.searchParams.get('minmag'), 3.5))),
    limit: Math.min(100, Math.max(5, parseInt(u.searchParams.get('limit') || '12', 10) || 12)),
  }),

  /* live sport matches — TheSportsDB (today's events for a sport) */
  '/api/sport': (u) => {
    const sport = u.searchParams.get('s') === 'Cricket' ? 'Cricket' : 'Soccer';
    const d = (u.searchParams.get('d') || '').match(/^\d{4}-\d{2}-\d{2}$/)
      ? u.searchParams.get('d')
      : new Date().toISOString().slice(0, 10);
    return Promise.resolve(SDB.single(sport, d));
  },

  /* Sport fixtures across a date range (past results + today + upcoming) */
  '/api/sport-range': (u) => {
    const sport = u.searchParams.get('s') === 'Cricket' ? 'Cricket' : 'Soccer';
    const past = Math.min(7, parseInt(u.searchParams.get('past') || '2', 10) || 2);
    const future = Math.min(14, parseInt(u.searchParams.get('future') || '10', 10) || 10);
    return P.sportRange(sport, past, future);
  },
  '/api/sports-other': () => P.sportsOther(),
  '/api/nepal-sports': () => P.nepalSports(),

  /* Latest news aggregated directly from Nepali news websites */
  '/api/news-nepal': async (u) => {
    const langFilter = u.searchParams.get('lang'); // optional: en | ne
    const data = await P.newsNepal();
    return langFilter ? { ...data, items: data.items.filter((i) => i.lang === langFilter) } : data;
  },

  /* news — Google News RSS, topic via ?q= */
  '/api/news': (u) => {
    const q = (u.searchParams.get('q') || 'Nepal').slice(0, 120);
    return cached('news:' + q.toLowerCase(), 300e3, async () => {
      const url = 'https://news.google.com/rss/search?q=' + encodeURIComponent(q) + '&hl=en-US&gl=US&ceid=US:en';
      return parseRSS((await fetchURL(url)).body);
    });
  },

  /* newer sections (sources.js) */
  '/api/alerts': () => S.alerts(),
  '/api/roads': () => S.roads(),
  /* NOC blocks some hosting networks. Answer "unavailable" as data (with the
     reason and the source) rather than a 5xx, so the pages show their
     "unavailable" state without a browser console error. */
  '/api/fuel': () => S.fuel().catch((e) => ({
    unavailable: true, error: String((e && e.message) || e),
    source: { name: 'Nepal Oil Corporation', url: 'https://noc.org.np/retailprice' },
  })),
  '/api/aqi-stations': () => S.aqiStations(),
  '/api/trending': () => S.trending(),
  '/api/highlights': () => S.highlights(),
  '/api/weather-cities': () => S.weatherCities(),
  '/api/air-cities': () => S.airCities(),
  '/api/cities': async () => ({ cities: S.CITIES }),

  /* jobs (merojob), calendar (Hamro Patro), events */
  '/api/jobs': (u) => S.jobs({
    q: (u.searchParams.get('q') || '').slice(0, 80), cat: u.searchParams.get('cat') || '', loc: (u.searchParams.get('loc') || '').slice(0, 30),
    type: (u.searchParams.get('type') || '').slice(0, 30), sort: u.searchParams.get('sort') || '', page: u.searchParams.get('page') || '1',
  }),
  '/api/job': (u) => S.job(u.searchParams.get('id') || ''),
  '/api/calendar': (u) => {
    const mode = u.searchParams.get('mode') === 'ad' ? 'ad' : 'bs';
    const y = parseInt(u.searchParams.get('y'), 10), m = parseInt(u.searchParams.get('m'), 10);
    const ok = (v, lo, hi) => Number.isFinite(v) && v >= lo && v <= hi;
    if (mode === 'ad') {
      if (!ok(y, 2013, 2043) || !ok(m, 1, 12)) { const t = new Date(); return S.calendarAd(t.getUTCFullYear(), t.getUTCMonth() + 1); }
      return S.calendarAd(y, m);
    }
    if (!ok(y, 2070, 2100) || !ok(m, 1, 12)) return S.calendarToday().then((t) => S.calendarBs(t.day.bs[0], t.day.bs[1]));
    return S.calendarBs(y, m);
  },
  '/api/calendar/today': () => S.calendarToday(),
  '/api/calendar/upcoming': (u) => S.calendarUpcoming(Math.min(90, Math.max(7, parseInt(u.searchParams.get('days') || '60', 10) || 60))),
  '/api/events': () => S.events(),

  /* global search across news, places, markets, sports, jobs, events, government */
  '/api/search': (u) => {
    const sp = (k, n) => (u.searchParams.get(k) || '').slice(0, n);
    return SEARCH.search(sp('q', 100), sp('type', 20), {
      lang: ['en', 'ne'].includes(sp('lang', 2)) ? sp('lang', 2) : '', cat: sp('cat', 20).replace(/[^a-z]/g, ''),
      days: Math.min(60, Math.max(0, parseInt(sp('days', 3), 10) || 0)), prov: /^NP0[1-7]$/.test(sp('prov', 4)) ? sp('prov', 4) : '',
    });
  },
  /* the 7 provinces: districts (English + Nepali), capital, forecast city, official site */
  '/api/provinces': async () => ({ provinces: PL.PROVINCES }),
  /* open and upcoming share issues (ShareSansar's issue tables) */
  '/api/ipo': () => S.ipo(),

  /* NRB daily rates over up to ~13 months (the API pages 100 days at a time),
     reduced to mid rates for the charts */
  '/api/forex-history': (u) => {
    const days = Math.min(400, Math.max(7, parseInt(u.searchParams.get('days') || '365', 10) || 365));
    return cached(`forex-hist-${days}`, 6 * 3600e3, async () => {
      const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
      const url = (page) => 'https://www.nrb.org.np/api/forex/v1/rates'
        + `?from=${iso(Date.now() - days * 864e5)}&to=${iso(Date.now() + 864e5)}&per_page=100&page=${page}`;
      const first = await nrbJSON(url(1));
      const pages = Math.min(6, ((first.pagination || {}).pages) || 1);
      /* sequential: NRB is happier with one request at a time */
      const rest = [];
      for (let pg = 2; pg <= pages; pg++) rest.push(await nrbJSON(url(pg)));
      const payload = [first, ...rest].flatMap((j) => ((j.data || {}).payload) || []);
      const series = normForex({ data: { payload } }).map((d) => {
        const mids = {};
        Object.keys(d.rates).forEach((c) => { mids[c] = +d.rates[c].mid.toFixed(4); });
        return { date: d.date, mid: mids };
      });
      if (!series.length) throw new Error('no NRB history');
      return { source: 'Nepal Rastra Bank', days: series, fetchedAt: new Date().toISOString() };
    });
  },

  /* city search, limited to Nepal */
  '/api/geocode': (u) => {
    const q = (u.searchParams.get('q') || '').trim().slice(0, 60);
    if (q.length < 2) return Promise.resolve({ results: [] });
    return cached('geo:' + q.toLowerCase(), 86400e3, async () => {
      const j = JSON.parse((await fetchURL('https://geocoding-api.open-meteo.com/v1/search?count=8&language=en&country_code=NP&name='
        + encodeURIComponent(q))).body);
      /* the upstream filter is loose; keep only places that are actually in Nepal */
      return { results: (j.results || []).filter((r) => r.country_code === 'NP')
        .map((r) => ({ name: r.name, lat: r.latitude, lon: r.longitude, admin1: r.admin1 || '', admin2: r.admin2 || '', population: r.population || 0 })) };
    });
  },
};

/* ---------------- server ---------------- */
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost');
    let p = u.pathname;

    /* /news/ → /news (one canonical URL per page) */
    if (p.length > 1 && p.endsWith('/')) {
      res.writeHead(301, { Location: p.replace(/\/+$/, '') + u.search });
      return res.end();
    }

    /* /markets is the same page as /money; one canonical URL */
    if (p === '/markets') { res.writeHead(301, { Location: '/money' + u.search }); return res.end(); }
    /* account aliases */
    if (p === '/profile' || p === '/saved') { res.writeHead(301, { Location: '/account' }); return res.end(); }
    if (p === '/login' || p === '/signup') { res.writeHead(301, { Location: '/account?tab=' + p.slice(1) }); return res.end(); }

    if (PAGE_FILES[p]) {
      return reply(req, res, 200, withVerify(readStatic(PAGE_FILES[p])), { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...SECURITY_HEADERS });
    }
    if (SEOP.has(p)) {
      return reply(req, res, 200, await SEOP.render(p, SITE_ORIGIN), { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...SECURITY_HEADERS });
    }
    /* installable app: manifest + service worker (served from the root so its scope is the whole site) */
    if (p === '/manifest.webmanifest') {
      return reply(req, res, 200, JSON.stringify(MANIFEST), { 'Content-Type': 'application/manifest+json; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
    }
    if (p === '/sw.js') {
      return reply(req, res, 200, readStatic('sw.js'), { 'Content-Type': TYPES.js, 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/' });
    }
    if (IMAGES[p] && fs.existsSync(path.join(__dirname, IMAGES[p][0]))) {
      res.writeHead(200, { 'Content-Type': IMAGES[p][1], 'Cache-Control': 'public, max-age=86400' });
      return res.end(req.method === 'HEAD' ? undefined : readStatic(IMAGES[p][0]));
    }
    if (site.PAGES[p]) {
      return reply(req, res, 200, site.render(p, SITE_ORIGIN), { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...SECURITY_HEADERS });
    }
    const asset = ASSET_RE.exec(p);
    if (asset && fs.existsSync(path.join(__dirname, p.slice(1)))) {
      /* short max-age: long enough to help repeat views, short enough that a
         Render deploy is picked up without a hard refresh */
      return reply(req, res, 200, readStatic(p.slice(1)), { 'Content-Type': TYPES[asset[2]], 'Cache-Control': 'public, max-age=600' });
    }
    if (p === '/robots.txt') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
      return res.end(ROBOTS);
    }
    if (p === '/sitemap.xml') {
      res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
      return res.end(sitemap());
    }
    if (p === '/healthz') return send(req, res, 200, { ok: true });

    if (p === '/api/log') return clientLog(req, res);
    if (p === '/api/hit') return statsHit(req, res);
    if (p === '/api/admin/stats') return await adminStats(req, res, u);
    if (isAccountRoute(p)) return ACC.handle(req, res, p, u);

    const route = API[p];
    if (route) {
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(req, res, 405, { error: 'method not allowed' });
      return send(req, res, 200, await route(u));
    }

    if (p.startsWith('/api/')) return send(req, res, 404, { error: 'not found' });
    return reply(req, res, 404, site.render(p, SITE_ORIGIN, { notFound: true }), { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', ...SECURITY_HEADERS });
  } catch (e) {
    const status = (e && e.status) || 502;
    if (status >= 500) console.error('[api] ' + req.method + ' ' + req.url + ' → ' + status + ' ' + String((e && e.message) || e));
    return send(req, res, status, { error: String((e && e.message) || e) });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Nepal Live dashboard running at http://0.0.0.0:${PORT}`);
  keepAwake();
  warmCaches();
});

/* Keep the homepage's data warm. cached() refreshes only when someone asks after
   a TTL has passed, and that visitor waits for the upstream call. Asking for the
   same routes (same query strings, so the same cache keys) every few minutes
   means visitors get an answer from memory. Each upstream is still called at
   most once per TTL — a warm call inside the TTL is a cache hit. On by default on
   Render; WARM=1 turns it on locally, WARM=0 off. */
const WARM_ROUTES = [
  '/api/news-nepal', '/api/highlights', '/api/alerts', '/api/roads', '/api/trending',
  '/api/nepse', '/api/nepse/top', '/api/nepse/status', '/api/nepse/history?size=90',
  '/api/gold', '/api/gold-hamropatro', '/api/forex', '/api/rates',
  '/api/weather', '/api/air', '/api/quakes', '/api/quakes?days=7&minmag=4&limit=1',
  '/api/jobs', '/api/events', '/api/calendar/today', '/api/fuel',
  '/api/sport-range?s=Soccer&past=2&future=10', '/api/sport-range?s=Cricket&past=2&future=10',
];
function warmCaches() {
  const on = process.env.WARM === '1' || (process.env.RENDER && process.env.WARM !== '0');
  if (!on) return;
  const every = Math.max(1, Number(process.env.WARM_MIN) || 4) * 60e3;
  let runs = 0;
  const run = async () => {
    const t0 = Date.now(), failed = [];
    runs++;
    /* one at a time: gentle on the sources and on the free instance */
    for (const r of WARM_ROUTES) {
      const u = new URL(r, 'http://localhost');
      const fn = API[u.pathname];
      if (!fn) continue;
      try { await fn(u); } catch (e) { failed.push(u.pathname); }
    }
    /* the first run always reports; after that only failures do */
    if (failed.length || runs === 1) console[failed.length ? 'warn' : 'log'](`[warm] ${WARM_ROUTES.length - failed.length}/${WARM_ROUTES.length} ok in ${Date.now() - t0} ms${failed.length ? '; failed: ' + failed.join(', ') : ''}`);
  };
  console.log(`[warm] refreshing ${WARM_ROUTES.length} homepage routes every ${every / 60e3} min`);
  setTimeout(run, 5e3);
  setInterval(run, every);
}

/* Render's free plan stops the service after 15 minutes without outside
   traffic, and the next visitor waits ~30-50 s while it starts again. On
   Render (which sets RENDER_EXTERNAL_URL) the server calls its own public
   address every 10 minutes so it never looks idle. Render's internal health
   checks don't count as traffic, so this has to go through the public URL.
   KEEP_AWAKE=0 turns it off (e.g. on a paid plan, which never sleeps). */
function keepAwake() {
  const base = process.env.RENDER_EXTERNAL_URL;
  if (!base || process.env.KEEP_AWAKE === '0') return;
  const every = Math.max(1, Number(process.env.KEEP_AWAKE_MIN) || 10) * 60e3;
  const url = base.replace(/\/+$/, '') + '/healthz';
  let failing = false;
  console.log(`[keep-awake] calling ${url} every ${every / 60e3} min`);
  setInterval(() => {
    fetchURL(url).then((r) => {
      if (r.status !== 200) throw new Error('HTTP ' + r.status);
      if (failing) console.log('[keep-awake] ok again');
      failing = false;
    }).catch((e) => {
      if (!failing) console.error('[keep-awake] failed: ' + String((e && e.message) || e));
      failing = true;
    });
  }, every);
}
