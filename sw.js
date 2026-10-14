// LingoLite service worker: precache everything on install, then serve cache-first (works offline).
// Bump CACHE when any file changes so clients pick up the new version.
var CACHE = 'lingolite-v1';
var SHELL = [
  './',
  'index.html',
  'style.css',
  'app.js',
  'manifest.webmanifest',
  'data/words.json',
  'icons/app.svg',
  'icons/app-192.png',
  'icons/app-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(SHELL).then(function () {
        return fetch('data/words.json').then(function (r) { return r.json(); });
      }).then(function (data) {
        var pics = data.words.map(function (w) { return w.icon; });
        Object.keys(data.category_labels).forEach(function (c) { pics.push(data.category_labels[c].icon); });
        return cache.addAll(pics.filter(function (p, i) { return pics.indexOf(p) === i; }));
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      return hit || fetch(req).then(function (res) {
        if (res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      });
    })
  );
});
