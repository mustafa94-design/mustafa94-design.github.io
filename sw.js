/* Minimal offline cache for the Heat Pump Sizing Calculators app.
   Cache-first for same-origin requests, so the tool keeps working
   (and stays installable) with no signal on the job site. */
var CACHE = 'hpcalc-v2';
var ASSETS = ['./', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-512-maskable.png'];

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(CACHE).then(function (c) { return c.addAll(ASSETS); }).catch(function () {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;  /* let cross-origin (fonts) hit the network normally */
  e.respondWith(
    caches.match(e.request).then(function (cached) {
      var network = fetch(e.request).then(function (resp) {
        if (resp && resp.ok) {
          var copy = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); }).catch(function () {});
        }
        return resp;
      }).catch(function () { return cached; });
      return cached || network;
    })
  );
});
