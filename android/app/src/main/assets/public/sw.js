// Service Worker for VoiceChat & Community PWA
const CACHE_NAME = 'voicechat-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Let standard API & socket.io requests go to network directly
  if (event.request.url.includes('/api/') || event.request.url.includes('/socket.io/')) {
    return;
  }
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
