// Service worker – רשת קודם כשיש רשת (כדי שגרסה חדשה תיכנס לבד), מטמון כשאין.
const CACHE = 'ktifa-v30';
const ASSETS = [
  './', './index.html', './css/style.css',
  './js/app.js', './js/cards-data.js', './js/cards-en.js', './js/illustrations.js', './js/media.js',
  './manifest.webmanifest', './version.json',
  './icons/icon-192.png', './icons/icon-512.png', './icons/icon-maskable-512.png', './icons/apple-touch-icon.png'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  const isFont = url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com');
  const sameOrigin = url.startsWith(self.location.origin);
  // בקשות לשרתים אחרים (API, CDN של ה-SDK) עוברות ישירות לרשת, בלי מטמון
  if (!sameOrigin && !isFont) return;
  if (isFont) {
    e.respondWith(caches.match(e.request).then((cached) => cached || fetch(e.request).then((res) => { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(e.request, copy)); return res; })));
    return;
  }
  // אותו מקור: רשת קודם (עוקף את מטמון ה-HTTP של Pages), ואם אין רשת – מהמטמון
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const ctrl = new AbortController(); const t = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(e.request, { cache: 'no-cache', signal: ctrl.signal });
      clearTimeout(t);
      if (res && res.ok) cache.put(e.request, res.clone());
      return res;
    } catch (err) {
      const cached = await cache.match(e.request, { ignoreSearch: true });
      if (cached) return cached;
      if (e.request.mode === 'navigate') { const idx = await cache.match('./index.html'); if (idx) return idx; }
      throw err;
    }
  })());
});
