// Service worker. Owns only caches prefixed "weather-app-" (github.io origin is shared with other apps).
const PREFIX = 'weather-app-';
const VERSION = 'v7';
const CACHE = PREFIX + VERSION;
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './fonts/heebo-hebrew-400-normal.woff2',
  './fonts/heebo-hebrew-600-normal.woff2',
  './fonts/heebo-hebrew-800-normal.woff2',
  './fonts/heebo-latin-400-normal.woff2',
  './fonts/heebo-latin-600-normal.woff2',
  './fonts/heebo-latin-800-normal.woff2',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
  './icons/icon-192.png',
  './icons/icon-512-maskable.png',
  './icons/icon-512.png',
  './src/api.js',
  './src/config.js',
  './src/dom.js',
  './src/icons.js',
  './src/load.js',
  './src/main.js',
  './src/places.js',
  './src/pwa.js',
  './src/state.js',
  './src/storage.js',
  './src/theme.js',
  './src/time.js',
  './src/ui/charts.js',
  './src/ui/favorites.js',
  './src/ui/home.js',
  './src/ui/nav.js',
  './src/ui/search.js',
  './src/ui/sections.js',
  './src/ui/settings.js',
  './src/ui/sheet.js',
  './src/ui/toast.js',
  './src/units.js',
  './src/wmo.js',
  './styles/base.css',
  './styles/components.css',
  './styles/fonts.css',
  './styles/tokens.css',
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(ASSETS.map(url => cache.add(url).catch(e => console.warn('[sw] skip', url, e))));
  })());
});

self.addEventListener('message', e => { if (e.data === 'SKIP_WAITING') self.skipWaiting(); });

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

const STATIC = /\/(fonts|icons)\//;

self.addEventListener('fetch', event => {
  const req = event.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const cacheFirst = STATIC.test(url.pathname);
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (cacheFirst) {
      const hit = await cache.match(req);
      if (hit) return hit;
    }
    try {
      const net = await fetch(req);
      if (net.ok) cache.put(req, net.clone());
      return net;
    } catch {
      return (await cache.match(req)) || (req.mode === 'navigate' ? await cache.match('./index.html') : Response.error());
    }
  })());
});
