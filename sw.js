/* GymRookies Service Worker v5 */
var CACHE_NAME = 'gr-v6';
var OFFLINE_ASSETS = [
  './index.html',
  './manifest.json'
];

/* Instalación: cachear assets core */
self.addEventListener('install', function(e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(OFFLINE_ASSETS);
    }).catch(function(err) {
      console.warn('SW install cache error:', err);
    })
  );
});

/* Activación: limpiar caches antiguas */
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

/* Fetch: network-first para Firebase/Firestore, cache-first para assets locales */
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  /* Dejar pasar siempre las peticiones de Firebase/Google */
  if (
    url.includes('googleapis') ||
    url.includes('firestore') ||
    url.includes('firebase') ||
    url.includes('gstatic') ||
    url.includes('fonts.g') ||
    url.includes('identitytoolkit')
  ) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(function(response) {
        /* Si la red responde OK, actualizar caché y devolver */
        if (response && response.status === 200 && e.request.method === 'GET') {
          var clone = response.clone();
          caches.open(CACHE_NAME).then(function(cache) {
            cache.put(e.request, clone);
          });
        }
        return response;
      })
      .catch(function() {
        /* Sin red: intentar desde caché */
        return caches.match(e.request).then(function(cached) {
          return cached || caches.match('./index.html');
        });
      })
  );
});
