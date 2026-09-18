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
`ADMIN_EMAILS` (comma-separated owner emails — only these accounts can open `/stats`),
`TRUST_PROXY=1` (trust `X-Forwarded-*`; on automatically when `RENDER` is set),
`KEEP_AWAKE=0` (turn off the keep-awake self-call — see Deploy; `KEEP_AWAKE_MIN` sets its interval, default 10). `data/` and `.env` are git-ignored —
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
- `search.js` — `/api/search?q=&type=&lang=&cat=&days=&prov=` across places, markets, news, sports, jobs, events,
  government, pages (city names match across scripts: Pokhara ↔ पोखरा). Each source guarded independently. Filters:
  `lang`/`cat` narrow news; `prov` (NP01–NP07) also narrows places, jobs and events (nationwide events stay in);
  `days` = news from the last N days, events in the next N. Filters without words list only the groups they apply to.
- `places.js` — the 7 provinces for the server: districts (loaded from `nepal-map.js`), Nepali district names, capital,
  forecast city, official provincial-government URL (OCMCM sites, each checked to load). `provinceOf(text)` tags a
  headline with the province whose places it names (every news item carries `province`); ambiguous names are skipped.
  Served at `/api/provinces`.
- News topics (`TOPIC_RULES` in server.js): sports, entertainment, technology, business, politics, world, society
  (checked after world), else `nepal`.
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
- `stats.js` — anonymous visit counts for the owner's `/stats` page (`page-stats.js`). app.js sends one beacon per page
  view to `POST /api/hit` (path, referrer host on the entry page, m/t/d device, language, first-today / new flags from
  two dates in the browser's own localStorage — no cookie, no id, no IP stored). Bots, prefetches, unknown paths and
  the owner's own visits are skipped; 120 hits / 10 min per IP. Per-day totals (Nepal date) are kept in memory and
  added to the saved row every minute (read + add + write; failed saves retried). Storage: Supabase table `nl_stats`
  on Render, `data/stats.json` locally (so tests never touch real numbers). `GET /api/admin/stats?days=` answers only
  a logged-in account in `ADMIN_EMAILS` (otherwise 200 `{ access: 'login' | 'owner' }`, no numbers); `/api/me` carries `user.admin` for the account-page link.
  The report also carries the previous equal period (`prev`, for ▲▼ change), a weekday × hour `heat` grid, and `live`
  (page views per minute for the last 30 min — memory only, restarts with the server). `page-stats.js` draws an admin
  console: flag-blue sidebar (a scrolling tab bar ≤920px), KPI cards with sparklines, traffic chart (drawn at the box's
  real size, hover tooltip), right-now panel, top-pages table, sources, donuts, heatmap, CSV export; Today = hourly chart.
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
  badge), drawer, mobile bottom nav (Home, News, Markets, Alerts, More), ticker, global search dialog
  (+ "See all results" → `/search`), footer + sheets, theme/lang, feed status, stamps, skeleton/error/empty states,
  `NL.sport`, `NL.me` (session state, `NL.me.fetch` for account API), `NL.saveBtn(item)` + save/unsave delegation,
  `NL.shareBtn(item)` (share sheet, else copy link), `NL.toast`, service-worker registration and the install bar
  (shown only after `beforeinstallprompt`, 20 s in, never again once dismissed).
- `sw.js` + `/manifest.webmanifest` (MANIFEST in server.js) + `icon-192.png`/`icon-512.png` — installable app. The
  service worker never caches `/api/*` (a stored number must never pass as live); pages and assets are network-first,
  with the `/offline` page (site-pages, noindex) as the fallback.
- `page-tools.js` — `/tools`: BS↔AD (`/api/calendar`), NPR converter (`/api/forex`), gold & silver (`/api/gold-hamropatro`),
  loan EMI, NEA electricity bill (published tariff, ERC decision 2078/07/08 — matches NEA's own worked examples:
  5 A × 255 units = Rs 2,390; 15 A × 25 units = Rs 187.50), holidays (`/api/calendar/upcoming`), IPO calendar
  (`/api/ipo` — ShareSansar's issue tables, unofficial and labelled so; SEBON publishes PDFs only), emergency numbers.
- `kit.js` also has `NL.PROVINCES`, `NL.provName(id)` and `NL.langChip(story)` ("EN" / "नेपाली").
- `kit.js` — shared page helpers: `NL.i18n` (`[data-t]`, `[data-th]`, `[data-tp]`; `add()` re-applies), `NL.api`,
  formatting, charts, range tabs, freshness labels (`NL.fresh`), story renderers, alert cards, weather codes, AQI.
  `NL.story.compact` (the /news list row) is an `article.cp-item`: chips + headline + standfirst + 150px thumb,
  then a `.cp-foot` with publisher, age, a hover-only "Read original" and the save/share buttons. The headline link
  carries `.stretch`, so the whole row opens the story while the buttons stay outside the link (never nest them in it).
- `nepal-map.js` — generated province geometry (7 provinces, ~1.5k points), `proj`, `provinceAt(lon,lat)`,
  `provinceOfDistrict`, 77-district map. Regenerate only from the OCHA ADM1 GeoJSON with a DP simplifier.
- `index.html` — homepage (order: hero → live bar → Nepal Today [briefing: date in English + Nepali BS, "What matters
  today" (highlight sentences + the weather card's forecast), national alerts; featured + 5 top stories; today's
  numbers] → alerts → your province → latest news → money → weather & AQI → roads → sports → jobs → events →
  trending → government → explore → footer). News cards are `<article>`s with one stretched headline link plus
  language label, Read original, share and save. Filters: language, topic (incl. society), province. "Your province"
  (`localStorage['nlive-prov']`): local news (province-tagged), capital forecast, DoR closures in its districts,
  events (else nationwide, said so), provincial government site. Reads `localStorage['nlive-city']`.
- `football.html`, `cricket.html` + `sport-page.js`.
- `page-*.js` — one per section page: news, alerts, roads, trending, money, weather, earthquakes, sports,
  nepal-sports, jobs, events, calendar, government, search, account, explore.

## Pages
`/ /news /alerts /roads /trending /money /weather /earthquakes /sports /nepal-sports /football /cricket /jobs
/events /calendar /government /tools /search /explore /account (noindex) /offline (noindex) /stats (noindex, owner only)`.

## API endpoints
Data: `/api/rates /forex /forex-history /gold /gold-hamropatro /nepse /nepse/top /nepse/status /nepse/history
/weather /air /weather-cities /air-cities /geocode /cities /quakes /alerts /roads /fuel /aqi-stations /trending
/highlights /news-nepal /news /sport /sport-range /sports-other /nepal-sports /jobs /job /calendar /calendar/today
/calendar/upcoming /events /search /provinces /ipo`. `/api/fuel` answers `{ unavailable: true, error, source }` (200)
when NOC refuses, so pages show their unavailable state without a console error.
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
- No blank space in stretched grid rows: when a card's row height is set by a taller neighbour, let one block take the
  leftover — a list with `flex:1; height:0; min-height:…; overflow-y:auto` (homepage `.fx-rows`, money `.fx-quick`,
  weather `.st-list`), a chart that grows (`#nepse-main .chart-box`, `.wx-hourly`), or rows spread with
  `justify-content:space-between` — and reset it to natural height where the grid goes to one column (≤820px).
  Text-only story cards use a `.cs-cover` panel the photo's shape. Events are an agenda (one row per event).
- Touch targets 44px on coarse pointers; `prefers-reduced-motion` respected; no horizontal page scroll.

## Homepage (v2)
The homepage is a separate visual world from the section pages: `index.html` + `page-home.css` + `page-home.js`,
and it does NOT load `app.css`. `<html data-shell="v2">` makes app.js skip `renderChrome()` (no shared header,
ticker, drawer or bottom nav) while still giving the page NL helpers, theme/language, accounts, the service worker
and the visit beacon — so analytics and the PWA keep working. Identity: crimson `#c8102e` on near-black `#0b0b0d`,
warm white `#f7f4ef` for editorial passages, Inter + Noto Sans Devanagari, tokens at the top of page-home.css.
Sections, all fed by the real APIs (news-nepal, highlights, trending, alerts, provinces) and empty-safe:
~1s intro (once per session, sessionStorage `nl-intro`) → hero lead story → ticker (says BREAKING only when an
emergency-level alert exists, otherwise LIVE) → live numbers (counters) → numbered feed → scroll-pinned province
rail (sticky + transform; a swipe list ≤860px) → drawn Nepal map from `NL.map` with province hover → six fullscreen
category sections → trending takeover → cinematic footer. Motion is two primitives: one IntersectionObserver for
"reveal once" and ONE rAF scroll loop (`drivers[]`) for the rail, the drifting category words and the cursor;
the custom cursor is desktop-and-hover only. Nothing runs without `.js-motion`.
The flag is drawn as SVG (`.flag`), never the 🇳🇵 emoji — Windows renders that as "NP".
The section pages still use the shared shell and app.css; that rollout is unfinished.

## Category fronts
`/news/politics|business|technology|sports|entertainment|world|society` are generated in site-pages.js from the
`TOPIC_FRONTS` table and all run `page-category.js`, which reads the topic from the path and fills one layout from
the shared feed: lead story, headlines, most-covered terms for that category, the publishers carrying it and links to
the neighbouring sections. Hero wording per topic (both languages) is registered by the script under the `kicker`/
`h1`/`sub` i18n keys. The homepage keeps a taste of each category with an "All <category> →" link into these pages.
The category lead (`.feature-card`) is capped and side-by-side, and the NRB currency table scrolls inside itself
with a pinned header — both used to fill a whole screen before the list began. Section-page heroes take the same
staggered arrival as the homepage (see page-skin.css).
Watch out: `[data-t]` sets textContent, so never nest a live counter inside a translated heading — it gets wiped
(that bug emptied the category lists once).

## Logo & section-page skin
The owner's logo lives at `logo.png` (full lockup) and `logo-mark.png` (emblem, white knocked out so it sits on dark
or light). Both are served from the `IMAGES` map in server.js. The emblem is the wordmark on every page — `.wm-logo`
in app.js for section pages, `.brand-logo` in index.html for the homepage — and it is also the favicon
(`favicon-48.png`), the app icons (`icon-192/512.png`) and the share card (`og.png`, 1200×630, rebuilt around the
lockup). Never use the 🇳🇵 emoji: Windows shows it as "NP".
Section pages keep app.css and their existing modules, and load `page-skin.css` after it. That skin re-points the
design tokens at the homepage palette (crimson `#c8102e`, ink `#0b0b0d`, warm white `#f7f4ef`), tightens display
type, darkens the ticker and the footer, and squares off the radii — so the sections match the v2 homepage without
rewriting any page module. Restyle through tokens there first; only touch app.css when a token cannot express it.

## Motion (animations)
`app.css` "motion system" section + the block at the end of `app.js`. Tokens `--m-fast/--m-mid/--m-slow` with ease-out
`--m-ease`; transform/opacity only (never layout), 180-360ms, delays capped. `.js-motion` is set by the inline head
script before first paint — never under `prefers-reduced-motion` — and dropped again after 4s if app.js never sets
`data-motion-ready`, so content is never left hidden. Scroll reveals: the motion block tags section-sized blocks (`SEL`)
with `data-reveal`, one level only (never nested), shows each once via IntersectionObserver, re-scans on DOM changes,
and fades without sliding above the fold. `NL.countUp(el, to, fmt, from)` and `NL.flashValue(el, dir)`: live numbers
wash green up / red down (homepage tiles, ticker, admin KPIs). Charts draw once — `pathLength="1"` on `.cb-line` plus
`.ch-draw`, with `data-ch-done` on the card so refreshes stay still. Back-to-top `.to-top` appears past 700px.
Cross-document view transitions sit inside a `prefers-reduced-motion: no-preference` query.
Adding motion: extend the shared layer (a token + a class), never per-page keyframes, and compare CLS with a
reduced-motion run of the same page before and after.

## Deploy
Upload the flat files to GitHub → Render auto-deploys (`render.yaml`, start: `node server.js`). Accounts: run
`supabase-schema.sql` once in the Supabase SQL editor, then set `SUPABASE_URL` and `SUPABASE_SECRET_KEY` in Render →
Environment. The server logs "[accounts] Supabase connected" on startup (or why it couldn't connect).
Visits page: the `nl_stats` table is in `supabase-schema.sql`; set `ADMIN_EMAILS` (the owner's login email) in Render →
Environment, then log in and open `/stats` (also linked from the account page).
Keep-awake: Render's free plan sleeps after 15 min without outside traffic (first visit then takes ~30-50 s). On
Render (`RENDER_EXTERNAL_URL` is set automatically) the server calls its own public `/healthz` every 10 min so it
never idles; it logs only when that fails. One always-on free service uses ~744 of the 750 free instance hours a
month, so a second free Render service in the same workspace would run out. Set `KEEP_AWAKE=0` on a paid plan.
Cache warming: on Render (or `WARM=1`) the server requests the homepage's routes (`WARM_ROUTES`, same query strings
so the same cache keys) every 4 min (`WARM_MIN`), one at a time, so visitors get answers from memory; each upstream is
still called at most once per TTL. The first run logs `[warm] n/n ok`; later runs log only failures. `WARM=0` turns it off.

## Known pitfalls
- NEPSE needs the wasm token flow via this server. TheSportsDB 429s without the queue in `sportsdb.js`.
- Don't reintroduce `markets.html`.
- `html { scroll-behavior: smooth }` — scripted scrolls in tests need `behavior: 'instant'`.
- The dev server stops between sessions; restart with `node server.js`.
