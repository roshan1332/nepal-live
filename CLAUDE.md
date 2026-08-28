# Nepal Live — project brief (for continuing in VS Code / Claude)

A real-time Nepal dashboard: gold/silver (official Hamro Patro/FEgod rates per tola & kg),
NEPSE index + top movers, weather, air quality, earthquakes, Nepali news, and live
Football/Cricket fixtures. Built by Roshan Mainali ("Made by Roshan Mainali" credit on every page).

## Run locally
```
node server.js        # http://localhost:3000  (PORT env to change)
```
**Zero npm dependencies** — plain Node `http` server. Do NOT add a package manager / deps.

## Files
- `server.js` — static file server + `/api/*` proxy with in-memory caching. Also serves pages.
- `nepse/nepse-client.js` + `nepse/css.wasm` — NEPSE token flow (prove → prune token via wasm). Loaded leniently (`./nepse/nepse-client` or flattened `./nepse-client`).
- `index.html` — main dashboard (inline `<script>` + `<style>`).
- `football.html`, `cricket.html` — sports pages (share `sport-page.js`).
- `sport-page.js` — shared sports logic + i18n + animations.
- `render.yaml`, `package.json` — Render deploy (start: `node server.js`).

## API endpoints (all cached, `Cache-Control: no-store` to browser)
`/api/rates` `/api/gold` `/api/gold-hamropatro` `/api/nepse` `/api/nepse/history` `/api/nepse/top`
`/api/weather` `/api/air` `/api/quakes` `/api/sport` `/api/sport-range` `/api/news-nepal` `/api/news`

## Frontend conventions
- Vanilla JS, per-page inline scripts. Helpers: `$`, `esc`, `fmtNum`, `animateCounts` (counts from cached previous value via `COUNT_CACHE`, keyed by `data-key`).
- i18n: `I18N`/`S_I18N` en/ne dicts, `t()`/`st()`, `data-lang` on `<html>`, persisted in `localStorage['nlive-lang']`. Language toggle animates via `langSwap`.
- Theme: gold/plum dark. CSS vars in `:root` (`--accent:#f0b429`, `--glass`, `--radius`, `--font-display`). Serif headings.
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
