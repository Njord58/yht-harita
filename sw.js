const CACHE_NAME = 'yht-harita-v1';

const APP_SHELL = [
  './',
  './index.html',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = req.url;

  // Sayfanın kendisi: önce internet dene, olmazsa önbellekten ver
  if(req.mode === 'navigate' || url.endsWith('/index.html') || url.endsWith('/')){
    event.respondWith(
      fetch(req).then(res=>{
        const clone = res.clone();
        caches.open(CACHE_NAME).then(c => c.put(req, clone));
        return res;
      }).catch(()=> caches.match(req).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  // Harita karoları, geocoding ve leaflet dosyaları: önce önbellek (hızlı + internetsiz çalışır),
  // arka planda güncelle. Daha önce hiç görülmemiş kareler internetsizken boş kalır.
  if(url.includes('arcgisonline.com') || url.includes('nominatim.openstreetmap.org') || url.includes('cdnjs.cloudflare.com')){
    event.respondWith(
      caches.match(req).then(cached=>{
        const network = fetch(req).then(res=>{
          if(res && res.status === 200){
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(req, clone));
          }
          return res;
        }).catch(()=> cached);
        return cached || network;
      })
    );
  }
});
