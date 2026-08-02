const CACHE_NAME = 'ascendoku-v2';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './robots.txt',
  './sitemap.xml',
  './css/base.css',
  './css/layout.css',
  './css/menu.css',
  './css/game.css',
  './css/modal.css',
  './css/pages.css',
  './css/inapp-overlay.css',
  './css/responsive.css',
  './js/reporting.js',
  './js/referral.js',
  './js/share.js',
  './js/engine.js',
  './js/rng.js',
  './js/inapp-detect.js',
  './js/analyzer.js',
  './js/generator.js',
  './js/grader.js',
  './js/xp.js',
  './js/sound.js',
  './js/storage.js',
  './js/settings.js',
  './js/game.js',
  './js/ui.js',
  './js/nav.js',
  './js/win.js',
  './js/challenge.js',
  './js/menu.js',
  './js/leaderboard.js',
  './js/dev.js',
  './js/puzzle-worker.js',
  './js/init.js',
  './assets/og-image.svg',
  './assets/icon-180.png',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/rank-wood.svg',
  './assets/rank-bronze.svg',
  './assets/rank-silver.svg',
  './assets/rank-gold.svg',
  './assets/rank-platinum.svg',
  './assets/rank-emerald.svg',
  './assets/rank-diamond.svg',
  './assets/rank-elite.svg',
  './assets/rank-legend.svg',
  './assets/rank-grandmaster.svg',
  './assets/rank-mythic.svg'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put('./index.html', copy));
          return response;
        })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request).then((response) => {
        if (response && response.status === 200) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
