# Nepal Live — project brief (for continuing in VS Code / Claude)

"Everything happening in Nepal, live." An editorial news + live-data product: Nepali headlines
(featured / top stories / latest / category rails), gold/silver (official Hamro Patro/FEGOD rates per
tola & kg), NEPSE index + top movers, NRB exchange rates, weather, air quality, earthquakes, and
live Football/Cricket scores. Built by Roshan Mainali ("Made by Roshan Mainali" in every footer).

## Run locally
```
node server.js        # http://localhost:3000  (PORT env to change)
```
**Zero npm dependencies** — plain Node `http` server. Do NOT add a package manager / deps.
`SITE_ORIGIN` env overrides the origin used in robots.txt / sitemap.xml (default `https://nepal-live.onrender.com`).
Web fonts (Inter + Noto Sans Devanagari) load from Google Fonts with `display=swap`; the stack falls back to system fonts.

## Files
- `server.js` — static file server + `/api/*` proxy with in-memory caching (+30 min stale grace).
  Also serves `/robots.txt`, a generated `/sitemap.xml` and `/healthz`. News items carry a server-side `topic`
  (sports/entertainment/technology/business/politics/world/nepal) that drives the category pills.
- `app.css` — **design system**: light/dark tokens, type scale, sticky header, ticker, hero, editorial
  (feature card, row stories, latest grid, rails, pills), snapshot tiles, cards, scoreboards + tabs,
  skeletons, empty/error states, search dialog, sheets, footer, responsive + touch + reduced-motion rules.
- `app.js` — **shared shell**, everything on `window.NL` (shares global scope with page scripts, so it must
  not declare bare top-level names). Renders into page placeholders `#nl-head`, `#nl-ticker`, `#nl-foot`:
  header + nav (+ "More" menu, scrollspy on home), mobile drawer, live ticker (`NL.ticker.set(key, item)`,
  item builders in `NL.tk.*`, `NL.ticker.autoload()` for pages without market modules), global search
  (`NL.search.add({group, items, limit, recent})`, Ctrl/⌘K or `/`), footer + About/Contact/Privacy/Terms sheets,
  theme (`localStorage['nlive-theme']`), language (`NL.setLang`, `localStorage['nlive-lang']`, fires `nl:lang`),
  feed status (`NL.feed(mod, ok)`), ageing stamps (`NL.stamp(el, ok, extra)`, `[data-ago]`), `NL.skeleton(kind)`,
  `NL.errorState` / `NL.emptyState` / `NL.retryHandlers` (any `[data-retry=mod]`), and `NL.sport` — the single
  scoreboard renderer + status classifier used by both the homepage preview and the sports pages.
- `nepse-client.js` + `css.wasm` — NEPSE token flow (prove → prune token via wasm). Loaded leniently (`./nepse/nepse-client` or flattened `./nepse-client`).
- `index.html` — homepage (inline `<style>` for its modules + inline `<script>`). Order: hero → featured + top
  stories (`#news`) → snapshot tiles (`#markets`) → latest news + pills → category rails → sports preview
  (lazy-loaded) → in-depth cards (`#card-nepse|gold|rates|weather|air|quakes|analysis`).
- `football.html`, `cricket.html` — sports pages; share `sport-page.js` (LIVE / UPCOMING / FINISHED tabs,
  day-grouped scoreboards, world + Nepal news columns).

## API endpoints (all cached, `Cache-Control: no-store` to browser)
`/api/rates` `/api/forex` `/api/gold` `/api/gold-hamropatro` `/api/nepse` `/api/nepse/history` `/api/nepse/top`
`/api/weather` `/api/air` `/api/quakes` `/api/sport` `/api/sport-range` `/api/news-nepal` `/api/news`

## Frontend conventions
- Vanilla JS. Page helpers: `$`, `esc` (= `NL.esc`), `fmtNum`, `animateCounts` (glides from the previous value via
  `COUNT_CACHE`, keyed by `data-key`), `spark(values)` for area sparklines, `tile(id, {...})` for snapshot tiles.
- i18n: `I18N` (index) / `S_I18N` (sports) en/ne dicts, `t()` / `st()`; re-render on the `nl:lang` event.
  Devanagari text gets `lang="ne"` so CSS can relax tracking/leading.
- Theme: **never hard-code a colour in page CSS** — use a token (`--text`, `--up`, `--down`, `--live`, `--brand` …).
  Inside SVG use `style="stroke:var(--x)"` (CSS vars don't work in presentation attributes everywhere).
- Every module: skeleton while loading → content with source line + "Updated x min ago" → on failure keep the
  last good data, otherwise an error state with a retry button. One failing feed must never blank the page.
- Background refreshes skip while the tab is hidden and catch up on `visibilitychange`.
- Touch targets: `@media (pointer: coarse)` enforces 44px. Motion respects `prefers-reduced-motion`.

## Data notes
- Gold per tola = Hamro Patro official; per kg derived (tola/11.6638*1000). 30-day history from same source.
- NEPSE needs the wasm token flow; only works via the Node server (not static hosting). Turnover: 1 Arba = 1e9 Rs.
- Forex = Nepal Rastra Bank (official, per-1-unit normalised); open.er-api is fallback + USD/NPR for spot conversion.
- Weather/air from Open-Meteo; quakes USGS; fixtures TheSportsDB (fixtures with a long-past kick-off and no
  status are shown as "No result yet", never as upcoming); news = Nepali RSS feeds (Google News fallback).
- Nepal Live is an aggregator: headlines always link to the original publisher ("Read original ↗").

## Deploy
Upload the flat files to GitHub → Render auto-deploys (`render.yaml`, start: `node server.js`).

## Known pitfalls
- Client calls `/api/*` relative first, falls back to direct public URLs. NEPSE has no direct fallback.
- Don't reintroduce the removed `markets.html`.
- `html { scroll-behavior: smooth }` — scripted scrolls in tests need `behavior: 'instant'`.
- The dev server here stops between sessions; restart with `node server.js`.
