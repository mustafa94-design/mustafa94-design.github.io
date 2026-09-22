/* Minimal offline cache for the Heat Pump Sizing Calculators app.
   Network-first for the page itself, so updates show up immediately
   whenever there's a connection; cache-first for the static assets
   (icons, manifest), which change rarely. Falls back to the cache only
   when there's no signal, so the tool still works offline. */
var CACHE = 'hpcalc-v3';
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
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET') return;
  var url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;  /* let cross-origin (fonts) hit the network normally */

  var isPage = e.request.mode === 'navigate' || url.pathname === '/' || url.pathname.endsWith('/') || url.pathname.endsWith('index.html');

  if (isPage) {
    /* Network-first: always show the latest deployed version when online. */
    e.respondWith(
      fetch(e.request).then(function (resp) {
        if (resp && resp.ok) {
          var copy = resp.clone();
          caches.open(CACHE).then(function (c) { c.put(e.request, copy); }).catch(function () {});
        }
        return resp;
      }).catch(function () { return caches.match(e.request); })
    );
    return;
  }

  /* Cache-first for static assets, refreshed in the background for next time. */
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
