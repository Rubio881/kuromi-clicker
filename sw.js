/* =====================================================================
   Kuromi Clicker — service worker
   Caches every game file so the app works offline.
   ➜ Bump CACHE_VERSION whenever you change any game file, so players
     get the "New version — tap to refresh" banner.
   ===================================================================== */
const CACHE_VERSION = 'kuromi-v7';
const FONT_CACHE = 'kuromi-fonts';

const CORE = [
  './',
  './index.html',
  './style.css',
  './data.js',
  './icons.js',
  './game.js',
  './manifest.webmanifest',
  './assets/kuromi.png',
  './app-icons/icon-192.png',
  './app-icons/icon-512.png',
  './app-icons/icon-maskable-512.png',
  './app-icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  // cache: 'reload' skips the HTTP cache so a new version never precaches stale files
  event.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(CORE.map(u => new Request(u, { cache: 'reload' })))));
  // No skipWaiting() here: the page shows an update banner and the player chooses when to refresh.
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith('kuromi-v') && key !== CACHE_VERSION) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('message', event => {
  if (event.data === 'SKIP_WAITING') self.skipWaiting();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Game files: cache first, then network (optional images get cached the first time they load).
  if (url.origin === self.location.origin) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      const hit = await cache.match(req, { ignoreSearch: true });
      if (hit) return hit;
      try {
        const res = await fetch(req);
        if (res.ok) cache.put(req, res.clone());
        return res;
      } catch (err) {
        if (req.mode === 'navigate') return (await cache.match('./index.html')) || Response.error();
        return Response.error(); // e.g. a missing optional icon while offline → the game shows an emoji
      }
    })());
    return;
  }

  // Google Fonts: stale-while-revalidate, kept across game versions.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith((async () => {
      const cache = await caches.open(FONT_CACHE);
      const hit = await cache.match(req);
      const refresh = fetch(req).then(res => { if (res.ok || res.type === 'opaque') cache.put(req, res.clone()); return res; }).catch(() => null);
      return hit || (await refresh) || Response.error();
    })());
  }
});
