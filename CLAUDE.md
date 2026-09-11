# Nepal Live — project brief (for continuing in VS Code / Claude)

"Everything happening in Nepal, live." A Nepal-focused live information platform: news from Nepali
newsrooms, Nepal Today highlights, official alerts, roads, money (NEPSE, gold/silver, NRB forex, fuel),
weather + air quality, earthquakes, sports (football, cricket, other sports, Nepal national teams), jobs,
events, the Nepali calendar, a government-services directory, global search, accounts (saved items,
personal alerts, preferences) and an interactive Explore map. Built by Roshan Mainali ("Made by Roshan
Mainali" in every footer — keep it).

## Run locally
```
node server.js        # http://localhost:3000  (PORT env to change)
```
**Zero npm dependencies** — plain Node `http` server. Do NOT add a package manager / deps.
Env (an optional git-ignored `.env` file is read at startup; real env vars win — see `.env.example`):
`SITE_ORIGIN` (robots/sitemap/canonical origin, default `https://nepal-live.onrender.com`),
`SUPABASE_URL` + `SUPABASE_SECRET_KEY` (accounts in Supabase — production; `SUPABASE_SERVICE_ROLE_KEY` also accepted),
`DATA_DIR` (file account store when Supabase isn't set — local dev; `./data` by default, wiped on Render deploys),
`TRUST_PROXY=1` (trust `X-Forwarded-*`; on automatically when `RENDER` is set). `data/` and `.env` are git-ignored —
never commit them, and never put the Supabase secret key in client code.

## Files
Server
- `server.js` — pages, static assets (allow-list `ASSET_RE`), `/api/*` with `cached()` (in-flight dedupe, 30-min
  stale grace), shared producers `P` (rates, forex, gold, nepse*, quakes, newsNepal, sport*), gzip, security
  headers, trailing-slash 301, `/markets`→`/money`, `/profile|/saved`→`/account`, `/login|/signup`→`/account?tab=`,
  robots, sitemap (from `site.paths()`), 404 page. Non-GET on data APIs → 405. Errors carry `e.status` (else 502).
- `sources.js` — alerts (BIPAD, river stations, pollution, USGS, GDACS → 4 levels), roads (DoR closures + corridors +
  road news), fuel (NOC), AQI stations, trending, highlights, multi-city weather/air, `CITIES` (32 verified),
  jobs (merojob), calendar (Hamro Patro BS/AD months, today, upcoming), events (calendar + Nepal fixtures).
- `sportsdb.js` — TheSportsDB behind one rate-limited queue (≈30 req/min); routes answer from cache + `pending`.
- `accounts.js` — accounts/sessions/saved items/prefs/personal alerts (see Accounts below), over a storage backend:
  `store-supabase.js` (Supabase REST/PostgREST via `fetch`, no SDK; tables in `supabase-schema.sql`) or
  `store-file.js` (JSON file). Both expose the same async interface — keep them in step.
- `search.js` — `/api/search?q=&type=` across places, markets, news, sports, jobs, events, government, pages
  (city names match across scripts: Pokhara ↔ पोखरा). Each source guarded independently.
- `metno.js` — MET Norway (api.met.no) second weather source. Open-Meteo's free quota is per IP and Render's
  outbound IP is shared, so when Open-Meteo refuses, `/api/weather` and the multi-city weather answer from MET
  Norway in the same Open-Meteo shape (source labelled "MET Norway"); Open-Meteo is then paused for 30 min.
  Rain probability is null (not published for Nepal — shown "–"); "feels like" (BoM apparent temperature) and
  sunrise/sunset (solar equations) are computed. `WEATHER_FALLBACK_TEST=1` forces the fallback for testing.
- Data status badges: `NL.stamp(el, ok)` renders LIVE / RECENT / UNAVAILABLE. Stamp `data-kind`: `live`
  (default; LIVE while < 20 min old), `daily` (gold, NRB rates, jobs, events — never LIVE), `market` (NEPSE —
  LIVE only Sun–Thu 11:00–15:00 NPT). A failed refresh keeps the data and says "showing data from X ago".
- Error monitoring: server logs every 5xx (`[api] …`); app.js reports front-end errors (max 5 per page view)
  to `POST /api/log` (rate-limited, 2 KB cap) which logs `[client] page — message (file:line)` — Render → Logs.
- `seo-pages.js` — fully server-rendered landing pages for the most-searched live numbers: `/gold-price`, `/nepse`,
  `/exchange-rate`, `/fuel-price`, `/nepali-date`, `/weather/<city>` (the 14 cities with live data). Live value in the
  `<title>`/description, data in plain HTML tables, visible breadcrumbs, related links; `page-static.js` adds the
  ticker/footer. Rendered through `site.renderDef` (def.static = no client i18n on the hero).
- SEO plumbing: `SEO` map in site-pages.js (short titles ≤60 / descriptions ≤155 for section pages), BreadcrumbList
  JSON-LD on every page, share image `og.png` (1200×630), `icon-512.png`, `favicon.svg`, `/favicon.ico`
  (= `favicon-48.png`) served by server.js, optional `GOOGLE_SITE_VERIFICATION` / `BING_SITE_VERIFICATION` env
  vars emit ownership meta tags. Sitemap includes the landing pages. Footer "Today in Nepal" column links them.
- `site-pages.js` — server-rendered section pages (`PAGES` map: title, description, OG/Twitter, canonical, JSON-LD,
  hero, body, `script`, optional `pre` scripts, `noindex`). Also the government directory data `GOV`.
- `nepse-client.js` + `css.wasm` — NEPSE token flow.

Client
- `app.css` — design system + every page's styles (tokens only — never hard-code a colour; tokens like
  `--logo-bg`, `--on-brand` exist for the few fixed needs).
- `app.js` — shared shell on `window.NL`: header (nav, More menu, search, language, theme, account button + unread
  badge), drawer, mobile bottom nav (Home, News, Markets, Sports, Explore, More), ticker, global search dialog
  (+ "See all results" → `/search`), footer + sheets, theme/lang, feed status, stamps, skeleton/error/empty states,
  `NL.sport`, `NL.me` (session state, `NL.me.fetch` for account API), `NL.saveBtn(item)` + save/unsave delegation,
  `NL.toast`.
- `kit.js` — shared page helpers: `NL.i18n` (`[data-t]`, `[data-th]`, `[data-tp]`; `add()` re-applies), `NL.api`,
  formatting, charts, range tabs, freshness labels (`NL.fresh`), story renderers, alert cards, weather codes, AQI.
- `nepal-map.js` — generated province geometry (7 provinces, ~1.5k points), `proj`, `provinceAt(lon,lat)`,
  `provinceOfDistrict`, 77-district map. Regenerate only from the OCHA ADM1 GeoJSON with a DP simplifier.
- `index.html` — homepage (order: hero → live bar → Nepal Today → alerts → latest news → money → weather & AQI →
  roads → sports → jobs → events → trending → government → explore → footer). Reads `localStorage['nlive-city']`.
- `football.html`, `cricket.html` + `sport-page.js`.
- `page-*.js` — one per section page: news, alerts, roads, trending, money, weather, earthquakes, sports,
  nepal-sports, jobs, events, calendar, government, search, account, explore.

## Pages
`/ /news /alerts /roads /trending /money /weather /earthquakes /sports /nepal-sports /football /cricket /jobs
/events /calendar /government /search /explore /account (noindex)`.

## API endpoints
Data: `/api/rates /forex /forex-history /gold /gold-hamropatro /nepse /nepse/top /nepse/status /nepse/history
/weather /air /weather-cities /air-cities /geocode /cities /quakes /alerts /roads /fuel /aqi-stations /trending
/highlights /news-nepal /news /sport /sport-range /sports-other /nepal-sports /jobs /job /calendar /calendar/today
/calendar/upcoming /events /search`.
Accounts: `POST /api/auth/signup|login|logout`, `GET|PATCH|DELETE /api/me`, `POST /api/me/password`,
`GET|POST|DELETE /api/me/saved`, `GET /api/me/notifications`, `POST /api/me/notifications/seen`.

## Accounts (security model)
scrypt password hashes (per-user salt, constant-time compare, dummy hash for unknown emails); 256-bit session
tokens stored only as SHA-256; cookie `nl_sid` HttpOnly + SameSite=Lax (+Secure behind HTTPS), 30-day sliding;
new token on every login; password change signs out other sessions. Mutations must be same-origin
(Origin / Sec-Fetch-Site) **and** JSON — no CORS on these routes. Rate limits per IP and per account; 16 KB body cap;
all fields validated; saved-item links must be same-site paths or http(s). Personal alerts = the official alert
feed filtered by the user's level/types/districts — nothing generated, no emails or push.

## Data-honesty rules (non-negotiable)
Never invent values, news, alerts, traffic, weather, scores, notices or events. Show "Data currently unavailable."
or "Updated X ago" instead. 🔴 LIVE only for genuinely live data; otherwise "Updated/Issued/Reported … ago".
Every module names its source and links to the original. Nepal Live is not the employer (jobs link to merojob),
not the government (directory links say "Official source →"). Holidays for some groups only keep the Nepali
qualifier. Events list only verifiable sources (Hamro Patro calendar, Nepal fixtures); other categories are
explicitly not listed. Disabled chart ranges explain why (no intraday NEPSE; 60 days of metals history).

## Frontend conventions
- Vanilla JS; page scripts are IIFEs using `NL.i18n.add`, `NL.onLang`, `NL.ticker.autoload()`, `NL.renderFooter([...])`,
  `NL.retryHandlers[mod]`, `NL.feed(mod, ok)`, `NL.stamp(id, ok)`.
- Skeleton → content with source + freshness → keep last good data on failure, else error state with retry.
- Devanagari text gets `lang="ne"`. Official names stay accurate in both languages.
- `[hidden]` loses to class `display` rules — add `.x[hidden]{display:none}` when needed.
- Touch targets 44px on coarse pointers; `prefers-reduced-motion` respected; no horizontal page scroll.

## Deploy
Upload the flat files to GitHub → Render auto-deploys (`render.yaml`, start: `node server.js`). Accounts: run
`supabase-schema.sql` once in the Supabase SQL editor, then set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in Render →
Environment. The server logs "[accounts] Supabase connected" on startup (or why it couldn't connect).

## Known pitfalls
- NEPSE needs the wasm token flow via this server. TheSportsDB 429s without the queue in `sportsdb.js`.
- Don't reintroduce `markets.html`.
- `html { scroll-behavior: smooth }` — scripted scrolls in tests need `behavior: 'instant'`.
- The dev server stops between sessions; restart with `node server.js`.
