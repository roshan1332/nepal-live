/*
 * Nepal Live service worker — makes the site installable and shows a friendly
 * page when there is no connection.
 *
 * Live data (/api/*) is never cached here: every module shows its own
 * "updated X ago" and error state, and a stored number must never pass as live.
 * Pages and scripts always try the network first (so a deploy is picked up at
 * once); the cache is only the fallback when offline.
 */
const VERSION = 'nl-v2';
const SHELL = ['/offline', '/app.css', '/app.js', '/kit.js', '/favicon.svg', '/icon-192.png'];
/* last resort when even the stored offline page is missing (storage full or unavailable) */
const OFFLINE_HTML = '<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
  + '<title>You’re offline · Nepal Live</title><body style="font:16px/1.5 system-ui,sans-serif;margin:0;padding:40px 20px;max-width:560px">'
  + '<h1 style="margin:0 0 8px">You’re offline</h1><p>Nepal Live needs a connection for live news, prices, weather and alerts. '
  + 'We don’t show saved numbers as if they were live.</p><button onclick="location.reload()" style="font:inherit;padding:10px 16px">Try again</button></body>';

/* Store each file on its own and never fail the install over one of them: an
   installed worker is what makes the site installable, and navigation falls
   back to OFFLINE_HTML if the stored page is missing. */
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION)
    .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {}))))
    .catch(() => {})
    .then(() => self.skipWaiting()));
});
const offlinePage = () => caches.match('/offline')
  .catch(() => null)
  .then((r) => r || new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  if (req.mode === 'navigate') {
    e.respondWith(fetch(req).catch(offlinePage));
    return;
  }
  if (/\.(css|js|png|svg|ico)$/.test(url.pathname)) {
    e.respondWith(fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => {}); }
        return res;
      })
      .catch(() => caches.match(req).catch(() => undefined).then((r) => r || Response.error())));
  }
});
