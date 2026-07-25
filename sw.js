const CACHE = 'sodoku-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/css/base.css',
  '/css/pages.css',
  '/css/game.css',
  '/css/modal.css',
  '/css/menu.css',
  '/css/leaderboard.css',
  '/css/layout.css',
  '/css/responsive.css',
  '/js/reporting.js',
  '/js/engine.js',
  '/js/rng.js',
  '/js/generator.js',
  '/js/grader.js',
  '/js/xp.js',
  '/js/sound.js',
  '/js/storage.js',
  '/js/settings.js',
  '/js/game.js',
  '/js/ui.js',
  '/js/nav.js',
  '/js/win.js',
  '/js/menu.js',
  '/js/leaderboard.js',
  '/js/init.js',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetched = fetch(event.request).then(res => {
        if (res.ok) caches.open(CACHE).then(cache => cache.put(event.request, res.clone()));
        return res;
      }).catch(() => cached);
      return cached || fetched;
    })
  );
});
