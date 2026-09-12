/*
 * Nepal Live service worker — makes the site installable and shows a friendly
 * page when there is no connection.
 *
 * Live data (/api/*) is never cached here: every module shows its own
 * "updated X ago" and error state, and a stored number must never pass as live.
 * Pages and scripts always try the network first (so a deploy is picked up at
 * once); the cache is only the fallback when offline.
 */
const VERSION = 'nl-v1';
const SHELL = ['/offline', '/app.css', '/app.js', '/kit.js', '/favicon.svg', '/icon-192.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

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
    e.respondWith(fetch(req).catch(() => caches.match('/offline')));
    return;
  }
  if (/\.(css|js|png|svg|ico)$/.test(url.pathname)) {
    e.respondWith(fetch(req)
      .then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req)));
  }
});
