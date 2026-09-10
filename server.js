/*
 * Nepal Live — real-time dashboard server
 * Serves the dashboard pages and proxies public APIs (with caching) so the
 * pages work from any origin with zero CORS problems.
 *
 * Run:  node server.js      (default port 3000, override with PORT=...)
 * No npm dependencies required (Node 18+).
 */
const http = require('http');
const https = require('https');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

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
function fetchURL(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; NepalLiveDashboard/2.0)',
        'Accept': '*/*',
        'Accept-Encoding': 'gzip, deflate',
      },
    }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location && redirects < 4) {
        res.resume();
        return resolve(fetchURL(new URL(res.headers.location, url).toString(), redirects + 1));
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

async function cached(key, ttlMs, producer) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < ttlMs) return hit.data;
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
  }
}

/* ---------------- RSS parser ----------------
 * splitSource=true  → Google News style "Title - Source" titles
 * splitSource=false → direct site feeds; source = defaultSource   */
/* Feeds label themselves en/ne, but several mix scripts item-by-item
   (Nagarik's "EN" feed is mostly Devanagari). Trust the text, not the label. */
const DEVANAGARI = /[\u0900-\u097F]/;
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
    })),
  }));
  return { date: seg.date, items };
}

/* ---------------- response helper ---------------- */
function send(res, status, body, isHTML = false) {
  res.writeHead(status, {
    'Content-Type': isHTML ? 'text/html; charset=utf-8' : 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Cache-Control': 'no-store',
  });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

const num = (v, dflt) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : dflt;
};

const PAGES = new Set(['index.html', 'football.html', 'cricket.html']);
const ASSETS = new Map([
  ['sport-page.js', 'application/javascript'],
  ['app.js', 'application/javascript'],
  ['app.css', 'text/css'],
]);

const SITE_ORIGIN = process.env.SITE_ORIGIN || 'https://nepal-live.onrender.com';

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
    { loc: '/football.html', priority: '0.8', freq: 'hourly' },
    { loc: '/cricket.html', priority: '0.8', freq: 'hourly' },
  ];
  return '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
    + urls.map((u) => `  <url><loc>${SITE_ORIGIN}${u.loc}</loc><lastmod>${today}</lastmod>`
        + `<changefreq>${u.freq}</changefreq><priority>${u.priority}</priority></url>`).join('\n')
    + '\n</urlset>\n';
}

/* ---------------- routes ---------------- */
const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost');
    const p = u.pathname;

    /* static pages */
    if (p === '/' || PAGES.has(p.slice(1))) {
      const file = p === '/' ? 'index.html' : p.slice(1);
      return send(res, 200, fs.readFileSync(path.join(__dirname, file), 'utf8'), true);
    }
    if (ASSETS.has(p.slice(1))) {
      /* short max-age: long enough to help repeat views, short enough that a
         Render deploy is picked up without a hard refresh */
      res.writeHead(200, {
        'Content-Type': `${ASSETS.get(p.slice(1))}; charset=utf-8`,
        'Cache-Control': 'public, max-age=600',
      });
      return res.end(fs.readFileSync(path.join(__dirname, p.slice(1)), 'utf8'));
    }
    if (p === '/robots.txt') {
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
      return res.end(ROBOTS);
    }
    if (p === '/sitemap.xml') {
      res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' });
      return res.end(sitemap());
    }
    if (p === '/healthz') return send(res, 200, { ok: true });

    /* currency exchange rates (base USD) */
    if (p === '/api/rates') {
      const data = await cached('rates', 300e3, async () => {
        const r = await fetchURL('https://open.er-api.com/v6/latest/USD');
        return JSON.parse(r.body);
      });
      return send(res, 200, data);
    }

    /* official Nepal Rastra Bank forex — recent days, normalised to per-1-unit NPR.
       NRB quotes some currencies per 10/100 units (JPY, INR, KRW), so divide it out
       here and let the page treat every currency the same. */
    if (p === '/api/forex') {
      const data = await cached('forex', 900e3, async () => {
        const day = 86400e3;
        const iso = (ms) => new Date(ms).toISOString().slice(0, 10);
        /* +1 day on the upper bound: Nepal (UTC+5:45) can already be on the next date */
        const url = 'https://www.nrb.org.np/api/forex/v1/rates'
          + `?from=${iso(Date.now() - 20 * day)}&to=${iso(Date.now() + day)}&per_page=100&page=1`;
        const j = JSON.parse((await fetchURL(url)).body);
        const days = (((j.data || {}).payload) || []).map((d) => {
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
        if (!days.length) throw new Error('no NRB rates in range');
        return { source: 'Nepal Rastra Bank', days };
      });
      return send(res, 200, data);
    }

    /* gold & silver spot (gold-api.com, free, real-time) */
    if (p === '/api/gold') {
      const data = await cached('gold', 60e3, async () => {
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
      });
      return send(res, 200, data);
    }

    /* Nepal's official daily gold/silver rates — Hamro Patro (FEGOD rates) */
    if (p === '/api/gold-hamropatro') {
      const data = await cached('gold-hp', 600e3, async () => {
        const r = await fetchURL('https://www.hamropatro.com/gold');
        const parsed = parseHamroGold(r.body);
        return { source: 'hamropatro', ...parsed, fetchedAt: new Date().toISOString() };
      });
      return send(res, 200, data);
    }

    /* NEPSE index + market summary (official site API via token flow) */
    if (p === '/api/nepse') {
      const data = await cached('nepse', 60e3, async () => {
        const [indices, summary] = await Promise.all([
          nepseGet('nots/nepse-index'),
          nepseGet('nots/market-summary'),
        ]);
        return { indices, summary, fetchedAt: new Date().toISOString() };
      });
      return send(res, 200, data);
    }

    /* NEPSE top gainers / losers / turnover */
    if (p === '/api/nepse/top') {
      const data = await cached('nepse-top', 60e3, async () => {
        const [gainers, losers, turnover] = await Promise.all([
          nepseGet('nots/top-ten/top-gainer?all=false'),
          nepseGet('nots/top-ten/top-loser?all=false'),
          nepseGet('nots/top-ten/turnover?all=false'),
        ]);
        return { gainers, losers, turnover, fetchedAt: new Date().toISOString() };
      });
      return send(res, 200, data);
    }

    /* NEPSE index history (for the chart) */
    if (p === '/api/nepse/history') {
      const size = Math.min(250, Math.max(10, parseInt(u.searchParams.get('size') || '90', 10) || 90));
      const data = await cached(`nepse-hist-${size}`, 600e3, async () => {
        const h = await nepseGet(`nots/index/history/58?size=${size}`);
        return { content: h.content || h, fetchedAt: new Date().toISOString() };
      });
      return send(res, 200, data);
    }

    /* weather — Open-Meteo */
    if (p === '/api/weather') {
      const lat = num(u.searchParams.get('lat'), 27.7172);
      const lon = num(u.searchParams.get('lon'), 85.324);
      /* 15-min TTL, not 5: Open-Meteo's free tier is a daily quota and on Render's
         shared outbound IP it is easy to exhaust. Forecast data barely moves in
         that window, so this cuts upstream calls ~3x for no visible staleness. */
      const data = await cached(`weather:${lat}:${lon}`, 900e3, async () => {
        const url = 'https://api.open-meteo.com/v1/forecast'
          + `?latitude=${lat}&longitude=${lon}`
          + '&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m'
          + '&hourly=temperature_2m,weather_code,precipitation_probability'
          + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max'
          + '&timezone=Asia%2FKathmandu&forecast_days=7';
        const r = await fetchURL(url);
        return openMeteo(r.body, 'current');
      });
      return send(res, 200, data);
    }

    /* air quality — Open-Meteo */
    if (p === '/api/air') {
      const lat = num(u.searchParams.get('lat'), 27.7172);
      const lon = num(u.searchParams.get('lon'), 85.324);
      const data = await cached(`air:${lat}:${lon}`, 900e3, async () => {
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
        const r = await fetchURL(url);
        return openMeteo(r.body, 'current');
      });
      return send(res, 200, data);
    }

    /* earthquakes near Nepal — USGS */
    if (p === '/api/quakes') {
      const data = await cached('quakes', 120e3, async () => {
        const now = new Date();
        const weekAgo = new Date(now.getTime() - 7 * 86400e3);
        const fmt = (d) => encodeURIComponent(d.toISOString().slice(0, 19));
        const url = 'https://earthquake.usgs.gov/fdsnws/event/1/query'
          + `?format=geojson&starttime=${fmt(weekAgo)}&endtime=${fmt(now)}`
          + '&latitude=27.9&longitude=84.1&maxradiuskm=800&minmagnitude=3.5'
          + '&orderby=time&limit=12';
        const r = await fetchURL(url);
        return JSON.parse(r.body);
      });
      return send(res, 200, data);
    }

    /* live sport matches — TheSportsDB (today's events for a sport) */
    if (p === '/api/sport') {
      const sport = u.searchParams.get('s') === 'Cricket' ? 'Cricket' : 'Soccer';
      const d = (u.searchParams.get('d') || '').match(/^\d{4}-\d{2}-\d{2}$/)
        ? u.searchParams.get('d')
        : new Date().toISOString().slice(0, 10);
      const data = await cached(`sport:${sport}:${d}`, 120e3, async () => {
        const url = `https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${d}&s=${sport}`;
        const r = await fetchURL(url);
        return JSON.parse(r.body);
      });
      return send(res, 200, data);
    }

    /* Sport fixtures across a date range (past results + today + upcoming) */
    if (p === '/api/sport-range') {
      const sport = u.searchParams.get('s') === 'Cricket' ? 'Cricket' : 'Soccer';
      const past = Math.min(7, parseInt(u.searchParams.get('past') || '2', 10) || 2);
      const future = Math.min(14, parseInt(u.searchParams.get('future') || '10', 10) || 10);
      const data = await cached(`sport-range:${sport}:${past}:${future}`, 180e3, async () => {
        const todayMs = Date.now();
        const offsets = [];
        for (let off = -past; off <= future; off++) offsets.push(off);
        const results = await Promise.allSettled(offsets.map(async (off) => {
          const date = new Date(todayMs + off * 864e5).toISOString().slice(0, 10);
          const r = await fetchURL(`https://www.thesportsdb.com/api/v1/json/3/eventsday.php?d=${date}&s=${sport}`);
          const j = JSON.parse(r.body);
          return { date, events: j.events || [] };
        }));
        const days = [];
        results.forEach((res) => { if (res.status === 'fulfilled' && res.value.events.length) days.push(res.value); });
        days.sort((a, b) => a.date.localeCompare(b.date));
        return { days, fetchedAt: new Date().toISOString() };
      });
      return send(res, 200, data);
    }

    /* Latest news aggregated directly from Nepali news websites */
    if (p === '/api/news-nepal') {
      const langFilter = u.searchParams.get('lang'); // optional: en | ne
      const data = await cached('news-nepal', 300e3, async () => {
        const results = await Promise.allSettled(
          NEPAL_FEEDS.map(async (f) => {
            const r = await fetchURL(f.url);
            return parseRSS(r.body, f.name, false, 20).items
              .map((it) => ({ ...it, source: f.name, lang: isNepali(it.title) ? 'ne' : 'en' }));
          })
        );
        let items = [];
        results.forEach((res) => { if (res.status === 'fulfilled') items = items.concat(res.value); });
        // newest first
        items.sort((a, b) => (Date.parse(b.pubDate) || 0) - (Date.parse(a.pubDate) || 0));
        /* the same story can arrive through two feeds */
        const seen = new Set();
        items = items.filter((it) => {
          const k = it.link || it.title;
          if (seen.has(k)) return false;
          seen.add(k); return true;
        });
        return { items: items.slice(0, 64), fetchedAt: new Date().toISOString() };
      });
      const filtered = langFilter
        ? { ...data, items: data.items.filter((i) => i.lang === langFilter) }
        : data;
      return send(res, 200, filtered);
    }

    /* news — Google News RSS, topic via ?q= */
    if (p === '/api/news') {
      const q = (u.searchParams.get('q') || 'Nepal').slice(0, 120);
      const key = 'news:' + q.toLowerCase();
      const data = await cached(key, 300e3, async () => {
        const url = 'https://news.google.com/rss/search?q=' + encodeURIComponent(q) + '&hl=en-US&gl=US&ceid=US:en';
        const r = await fetchURL(url);
        return parseRSS(r.body);
      });
      return send(res, 200, data);
    }

    return send(res, 404, { error: 'not found' });
  } catch (e) {
    return send(res, 502, { error: String((e && e.message) || e) });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Nepal Live dashboard running at http://0.0.0.0:${PORT}`);
});
