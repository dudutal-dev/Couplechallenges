// Service worker – עבודה ללא רשת אחרי הפתיחה הראשונה
const CACHE = 'ktifa-v3';
const ASSETS = [
  './', './index.html', './css/style.css',
  './js/app.js', './js/cards-data.js', './js/illustrations.js', './js/media.js',
  './manifest.webmanifest',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((cached) => {
      const network = fetch(e.request).then((res) => {
        const u = e.request.url;
        if (res && (res.ok || res.type === 'opaque') && (u.startsWith(self.location.origin) || u.includes('fonts.googleapis.com') || u.includes('fonts.gstatic.com'))) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
