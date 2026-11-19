// YoriMichi 서비스 워커
// 페이지와 API는 항상 네트워크에서 받아옴 (캐시로 옛 화면이 뜨지 않게).
// 인터넷이 끊겼을 때만 오프라인 안내 화면을 보여줌.
const CACHE = 'yorimichi-offline-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll([OFFLINE_URL, '/images/icons/icon-192.png'])));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return; // 페이지 이동만 처리, 나머지는 브라우저 기본 동작
  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL))
  );
});
