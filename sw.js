const CACHE = 'weather-pwa-v1';
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

// התקנה: פרה-קאש לאססטים
self.addEventListener('install', (e)=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));
  self.skipWaiting();
});

// אקטיבציה: ניקוי גרסאות ישנות
self.addEventListener('activate', (e)=>{
  e.waitUntil(
    caches.keys().then(keys=>Promise.all(keys.map(k=>k!==CACHE?caches.delete(k):null)))
  );
  self.clients.claim();
});

// fetch: 
// - לאססטים מקומיים – cache-first
// - ל-API של Open-Meteo – network-first עם נפילה ל-cache אם יש
self.addEventListener('fetch', (e)=>{
  const url = new URL(e.request.url);

  // רק GET
  if (e.request.method !== 'GET') return;

  // אססטים מקומיים
  if (url.origin === self.location.origin){
    e.respondWith(
      caches.match(e.request).then(match => match || fetch(e.request).then(resp=>{
        const copy = resp.clone();
        caches.open(CACHE).then(c=>c.put(e.request, copy));
        return resp;
      }))
    );
    return;
  }

  // Open-Meteo APIs
  if (url.hostname.endsWith('open-meteo.com')){
    e.respondWith(
      fetch(e.request).then(resp=>{
        const copy = resp.clone();
        caches.open(CACHE).then(c=>c.put(e.request, copy));
        return resp;
      }).catch(()=>caches.match(e.request))
    );
  }
});
