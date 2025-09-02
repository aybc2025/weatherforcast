// sw.js
const VERSION = 'v5';
const STATIC_CACHE = `static-${VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    for (const url of ASSETS) {
      try { await cache.add(url); }
      catch (e) { console.warn('[SW] skip', url, e); }
    }
    self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== STATIC_CACHE).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // אל תיירט בקשות API חיצוניות (כמו open-meteo) – תן לדפדפן לטפל ב-CORS רגיל
  if (url.origin !== location.origin) return;

  // HTML: רשת תחילה, נפילה לקאש
  if (req.destination === 'document') {
    event.respondWith((async () => {
      try {
        const net = await fetch(req);
        const cache = await caches.open(STATIC_CACHE);
        cache.put(req, net.clone());
        return net;
      } catch {
        return (await caches.match(req)) || (await caches.match('./index.html'));
      }
    })());
    return;
  }

  // משאבים מקומיים (CSS/JS/תמונות/אייקונים): cache-first
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const net = await fetch(req);
      const cache = await caches.open(STATIC_CACHE);
      cache.put(req, net.clone());
      return net;
    } catch {
      return cached; // אם יש
    }
  })());
});
