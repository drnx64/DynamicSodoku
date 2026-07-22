const CACHE = 'sodoku-v1';
const ASSETS = [
  '/DynamicSodoku/',
  '/DynamicSodoku/index.html',
  '/DynamicSodoku/manifest.json',
  '/DynamicSodoku/css/base.css',
  '/DynamicSodoku/css/pages.css',
  '/DynamicSodoku/css/game.css',
  '/DynamicSodoku/css/modal.css',
  '/DynamicSodoku/css/menu.css',
  '/DynamicSodoku/css/leaderboard.css',
  '/DynamicSodoku/css/layout.css',
  '/DynamicSodoku/css/responsive.css',
  '/DynamicSodoku/js/reporting.js',
  '/DynamicSodoku/js/engine.js',
  '/DynamicSodoku/js/rng.js',
  '/DynamicSodoku/js/generator.js',
  '/DynamicSodoku/js/grader.js',
  '/DynamicSodoku/js/xp.js',
  '/DynamicSodoku/js/sound.js',
  '/DynamicSodoku/js/storage.js',
  '/DynamicSodoku/js/settings.js',
  '/DynamicSodoku/js/game.js',
  '/DynamicSodoku/js/ui.js',
  '/DynamicSodoku/js/nav.js',
  '/DynamicSodoku/js/win.js',
  '/DynamicSodoku/js/menu.js',
  '/DynamicSodoku/js/leaderboard.js',
  '/DynamicSodoku/js/init.js',
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
