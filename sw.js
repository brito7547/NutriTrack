// NutriTrack Service Worker v3 — cache bust
const CACHE_NAME = 'nutritrack-v5';

// On install, skip waiting immediately — don't pre-cache
self.addEventListener('install', () => self.skipWaiting());

// On activate, delete ALL old caches and claim clients
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network first, fall back to cache
self.addEventListener('fetch', e => {
  if (!e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    fetch(e.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
  
