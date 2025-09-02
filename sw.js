// sw.js
const VERSION = 'v4';
const STATIC_CACHE = `static-${VERSION}`;
const RUNTIME_CACHE = 'runtime-v1';

// רק קבצים מקומיים וודאיים (בלי גוגל-פונטים וכד')
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',   // אם יש
  './icons/icon-512.png'    // אם יש
];

// התקנה: מוסיפים כל קובץ בנפרד (כדי לא ליפול אם אחד נכשל)
self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await Promise.all(ASSETS.map(async (url) => {
      try {
        await cache.add(url);
      } catch (e) {
        // לא מפילים את כל ההתקנה על קובץ אחד שנכשל
        console.warn('[SW] skip caching', url, e);
      }
    }));
    self.skipWaiting();
  })());
});

// ניקוי גרסאות ישנות
self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter(k => k !== STATIC_CACHE && k !== RUNTIME_CACHE)
        .map(k => caches.delete(k))
    );
    self.clients.claim();
  })());
});

// אסטרטגיות אחזור:
// 1) למשאבים מקומיים – cache-first, נופלים לרשת אם אין.
// 2) למשאבים חיצוניים (כמו גוגל-פונטים) – network-first עם נפילה לקאש ריצה.
//    מאפשר גם תגובה "opaque" (no-cors) בלי להפיל את ה-SW.
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // דף HTML ראשי – נסה רשת קודם כדי לקבל עדכונים, נפל לקאש אם אופליין
  if (url.origin === location.origin && url.pathname.endsWith('.html') || url.pathname === '/' ) {
    event.respondWith((async () => {
      try {
        const net = await fetch(req);
        const cache = await caches.open(STATIC_CACHE);
        cache.put(req, net.clone());
        return net;
      } catch {
        const cached = await caches.match(req);
        return cached || caches.match('./index.html');
      }
    })());
    return;
  }

  // משאבים מקומיים אחרים (CSS/JS/אייקונים) – cache-first
  if (url.origin === location.origin) {
    event.respondWith((async () => {
      const cached = await caches.match(req);
      if (cached) return cached;
      try {
        const net = await fetch(req);
        const cache = await caches.open(STATIC_CACHE);
        cache.put(req, net.clone());
        return net;
      } catch {
        return cached; // אולי כבר בקאש בשם אחר
      }
    })());
    return;
  }

  // משאבים חיצוניים (פונטים, CDN וכד') – network-first, נופל ל-runtime cache
  event.respondWith((async () => {
    const cache = await caches.open(RUNTIME_CACHE);
    try {
      // no-cors כדי לא להיכשל על תגובות opaque
      const net = await fetch(req, { mode: 'no-cors' });
      // אפשר לשמור גם opaque
      cache.put(req, net.clone());
      return net;
    } catch {
      const cached = await cache.match(req);
      return cached || Response.error();
    }
  })());
});
