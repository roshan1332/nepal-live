# Nepal Live — project brief (for continuing in VS Code / Claude)

A real-time Nepal dashboard: gold/silver (official Hamro Patro/FEgod rates per tola & kg),
NEPSE index + top movers, weather, air quality, earthquakes, Nepali news, and live
Football/Cricket fixtures. Built by Roshan Mainali ("Made by Roshan Mainali" credit on every page).

## Run locally
```
node server.js        # http://localhost:3000  (PORT env to change)
```
**Zero npm dependencies** — plain Node `http` server. Do NOT add a package manager / deps.
`SITE_ORIGIN` env overrides the origin used in robots.txt / sitemap.xml (default `https://nepal-live.onrender.com`).

## Files
- `server.js` — static file server + `/api/*` proxy with in-memory caching. Also serves pages,
  `/robots.txt` and a generated `/sitemap.xml`.
- `app.css` — **shared design system**: light/dark tokens, header, nav (+ mobile drawer), cards,
  skeletons, error states, news components, footer. Loaded by all three pages; page-specific
  component CSS stays inline in each page.
- `app.js` — **shared shell**: theme (persisted in `localStorage['nlive-theme']`, system default,
  set pre-paint by an inline snippet in each `<head>`), mobile nav drawer, footer + policy dialogs,
  and the `NL.skeleton` / `NL.errorState` / `NL.emptyState` / `NL.retryHandlers` helpers.
  Everything hangs off `window.NL` — it shares global scope with the page scripts, so it must not
  declare bare top-level names.
- `nepse/nepse-client.js` + `nepse/css.wasm` — NEPSE token flow (prove → prune token via wasm). Loaded leniently (`./nepse/nepse-client` or flattened `./nepse-client`).
- `index.html` — main dashboard (inline `<script>` + `<style>`).
- `football.html`, `cricket.html` — sports pages (share `sport-page.js`).
- `sport-page.js` — shared sports logic + i18n + animations. Two match-card renderers: `matchCardApple` (stacked team
  rows with per-team scores + right-hand status column; loser dims on decided finals) and the older side-by-side
  `matchCard`. Pages pick one with `cardStyle:'apple'` in `initSportPage`; both pages currently opt in.
- `render.yaml`, `package.json` — Render deploy (start: `node server.js`).

## API endpoints (all cached, `Cache-Control: no-store` to browser)
`/api/rates` `/api/gold` `/api/gold-hamropatro` `/api/nepse` `/api/nepse/history` `/api/nepse/top`
`/api/weather` `/api/air` `/api/quakes` `/api/sport` `/api/sport-range` `/api/news-nepal` `/api/news`

## Frontend conventions
- Vanilla JS, per-page inline scripts. Helpers: `$`, `esc`, `fmtNum`, `animateCounts` (counts from cached previous value via `COUNT_CACHE`, keyed by `data-key`).
- i18n: `I18N`/`S_I18N` en/ne dicts, `t()`/`st()`, `data-lang` on `<html>`, persisted in `localStorage['nlive-lang']`. Language toggle animates via `langSwap`.
- Theme: light **and** dark, driven entirely by tokens in `app.css`. Brand colour is Nepal-flag crimson
  (`--brand`); per-page data accent via `<html data-page="football|cricket">`. Legacy token names
  (`--card`, `--muted`, `--glass` …) are kept as aliases so older page rules re-tone for free.
  **Never hard-code a colour in page CSS** — use a token, or light mode breaks.
- Touch targets: `@media (pointer: coarse)` in `app.css` enforces a 44px minimum (with `!important`,
  since page stylesheets load after it).
- Animations are CSS keyframes; respect `prefers-reduced-motion`.
- **Keep all existing class names** — JS templates depend on them. Restyle via CSS only.

## Data notes
- Gold per tola = Hamro Patro official; per kg derived (tola/11.6638*1000). 30-day history from same source.
- NEPSE needs the wasm token flow; only works via the Node server (not static hosting).
- Weather/air from Open-Meteo; quakes USGS; fixtures TheSportsDB; news = Nepali RSS feeds.

## Deploy
Upload the 9 flat files to GitHub → Render auto-deploys. (`nepal-live-flat.zip` = flat; `nepal-live-local.zip` = folder.)

## Known pitfalls
- Client calls `/api/*` relative first, falls back to direct public URLs. NEPSE has no direct fallback.
- Don't reintroduce the removed `markets.html`.
- The dev server here stops between sessions; restart with `node server.js`.
