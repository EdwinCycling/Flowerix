self.addEventListener('install', (event) => {
  event.waitUntil(caches.open('flowerix-v1').then((cache) => cache.addAll(['/','/index.html'])));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request).catch(() => caches.match('/index.html'));
    })
  );
});
