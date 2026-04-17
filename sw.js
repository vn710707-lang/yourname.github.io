// 古錐星命閣 — Service Worker
// 版本號：每次更新網站內容時，把這個數字改掉，舊快取就會自動清除
const CACHE_VERSION = 'xmg-v1';

// 要預先快取的檔案（離線也能使用）
const PRECACHE_FILES = [
  '/',
  '/index.html',
  '/manifest.json'
];

// ── 安裝：預先快取核心檔案 ──────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then(cache => {
        console.log('[SW] 預快取核心檔案');
        return cache.addAll(PRECACHE_FILES);
      })
      .then(() => self.skipWaiting())
  );
});

// ── 啟動：清除舊版快取 ───────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames
          .filter(name => name !== CACHE_VERSION)
          .map(name => {
            console.log('[SW] 清除舊快取:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// ── 攔截請求：Cache First，失敗才走網路 ─────────────────
self.addEventListener('fetch', event => {
  // 只處理 GET 請求
  if (event.request.method !== 'GET') return;

  // Google Fonts 直接走網路（不快取外部字體）
  if (event.request.url.includes('fonts.googleapis.com') ||
      event.request.url.includes('fonts.gstatic.com')) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then(cachedResponse => {
      // 有快取就直接回傳
      if (cachedResponse) {
        // 背景更新快取（Stale While Revalidate）
        fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_VERSION).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
          }
        }).catch(() => {});
        return cachedResponse;
      }

      // 沒有快取，走網路
      return fetch(event.request).then(networkResponse => {
        if (!networkResponse || networkResponse.status !== 200) {
          return networkResponse;
        }
        // 存入快取
        const responseToCache = networkResponse.clone();
        caches.open(CACHE_VERSION).then(cache => {
          cache.put(event.request, responseToCache);
        });
        return networkResponse;
      }).catch(() => {
        // 完全離線時，回傳 index.html
        return caches.match('/index.html');
      });
    })
  );
});

// ── 收到推播通知 ─────────────────────────────────────────
self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  const options = {
    body: data.body || '今日星座運勢已更新，快來看看！',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/' },
    actions: [
      { action: 'view', title: '查看運勢' },
      { action: 'close', title: '稍後再看' }
    ]
  };
  event.waitUntil(
    self.registration.showNotification(
      data.title || '✦ 古錐星命閣',
      options
    )
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  if (event.action === 'view' || !event.action) {
    event.waitUntil(
      clients.openWindow(event.notification.data.url || '/')
    );
  }
});
