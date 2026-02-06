/* Lifelog SW v3 */
const CACHE_NAME = 'lifelog-cache-v3';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(()=>self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k)=> (k===CACHE_NAME)?null:caches.delete(k)))).then(()=>self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request).then((resp)=>{
      const copy = resp.clone();
      caches.open(CACHE_NAME).then((cache)=>cache.put(event.request, copy)).catch(()=>{});
      return resp;
    }).catch(()=>cached))
  );
});
