// sw.js
const VERSION = 'v6';
const STATIC_CACHE = `static-${VERSION}`;

const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  // שים לב: אל תוסיף כאן קבצים שלא קיימים בפועל.
  // אם יש לך 192/512 – בטוח במסלולים האלה – בטל הערות:
  // './icons/icon-192.png',
  // './icons/icon-512.png',
];

// ===== Install: מוסיף כל קובץ בנפרד כדי שלא ייפול על אחד בעייתי =====
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

// ===== Activate: מנקה קאש ישנים =====
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== STATIC_CACHE).map(k => caches.delete(k)));
    self.clients.claim();
  })());
});

// ===== Fetch: מטפל רק במשאבים מקומיים =====
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // לא נוגעים בכל מה שלא מאותו origin (כולל Google Fonts / CDNs)
  if (url.origin !== location.origin) return;

  // HTML: רשת תחילה, נפילה לקאש
  if (req.destination === 'document' || req.mode === 'navigate') {
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

  // CSS/JS/אייקונים מקומיים: cache-first
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const net = await fetch(req);
      const cache = await caches.open(STATIC_CACHE);
      cache.put(req, net.clone());
      return net;
    } catch {
      return cached || Response.error();
    }
  })());
});
