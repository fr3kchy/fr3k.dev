
const CACHE = 'blackwave-flasher-v1';
const SHELL = ['./', './index.html', './app.js', './app.css', './manifest.json'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(()=>{}));
  self.skipWaiting();
});
self.addEventListener('activate', e => { self.clients.claim(); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  // Network-first for manifest.json; cache-first for the rest.
  if (u.pathname.endsWith('/manifest.json')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(r => r || fetch(e.request).catch(() => r)));
});
