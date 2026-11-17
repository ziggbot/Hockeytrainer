// Service worker: keeps the app shell available offline so rink mode opens without network.
// API data is cached by the app itself (localStorage), never here, so logout fully clears it.
const CACHE = 'ht-shell-v1';
const SHELL = ['/', '/manifest.webmanifest', '/icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// The page sends the URLs of its current JS/CSS bundles so they are cached on first visit.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'cache-urls' && Array.isArray(event.data.urls)) {
    const sameOrigin = event.data.urls.filter((u) => {
      try {
        return new URL(u).origin === self.location.origin;
      } catch {
        return false;
      }
    });
    event.waitUntil(
      caches
        .open(CACHE)
        .then(async (cache) => {
          await cache.addAll(sameOrigin);
          // Drop bundles from earlier deploys so the cache does not grow forever.
          const keep = new Set(sameOrigin);
          for (const req of await cache.keys()) {
            if (new URL(req.url).pathname.startsWith('/assets/') && !keep.has(req.url)) await cache.delete(req);
          }
        })
        .catch(() => undefined),
    );
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Pages: network first (fresh deploys), fall back to the cached shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put('/', copy));
          }
          return res;
        })
        .catch(() => caches.match('/')),
    );
    return;
  }

  // Hashed build assets never change: cache first.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((cache) => cache.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
