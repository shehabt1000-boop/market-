const CACHE_NAME = 'commerce-zagazig-v6-pro';

// APP_SHELL: الملفات الأساسية التي تجعل التطبيق يعمل أوفلاين فوراً
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png',
  './assets/fonts/cairo-regular.woff2',
  './assets/fonts/cairo-bold.woff2',
  './assets/fonts/cairo-black.woff2',
  './assets/fontawesome/css/all.min.css',
  './assets/fontawesome/webfonts/fa-solid-900.woff2',
  './assets/fontawesome/webfonts/fa-brands-400.woff2'
];

// 1. التثبيت (Install)
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] تم تخزين الملفات والخطوط بنجاح');
      return cache.addAll(APP_SHELL);
    })
  );
});

// 2. التفعيل (Activate) - تنظيف الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. معالجة الإشعارات الفورية (Push Notifications)
// هذا الجزء يضمن وصول الإشعار حتى لو كان المتصفح مغلقاً
self.addEventListener('push', (event) => {
  let payload = {
    title: 'تطبيق تجارة الزقازيق',
    body: 'لديك تحديث جديد في المنصة',
    icon: './icon-192x192.png',
    url: './index.html'
  };

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload.body = event.data.text();
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon,
    badge: './icon-192x192.png',
    vibrate: [200, 100, 200],
    data: { url: payload.url },
    actions: [
      { action: 'open', title: 'عرض الآن' },
      { action: 'close', title: 'تجاهل' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// التعامل مع النقر على الإشعارات
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'close') return;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // إذا كان التطبيق مفتوحاً، نركز عليه، وإلا نفتح نافذة جديدة
      for (let client of windowClients) {
        if (client.url.includes(event.notification.data.url) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});

// 4. استراتيجية الجلب (Fetch) - Stale-While-Revalidate
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // معالجة "هدف المشاركة" (Share Target)
  if (request.method === 'POST' && url.pathname.includes('/share-target')) {
    event.respondWith(Response.redirect('./index.html?shared=true', 303));
    return;
  }

  // تجاهل طلبات Firebase الخارجية
  if (request.method !== 'GET' || url.host.includes('firestore.googleapis.com')) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        }
        return networkResponse;
      }).catch(() => {
        if (request.mode === 'navigate') return caches.match('./index.html');
      });

      return cachedResponse || fetchPromise;
    })
  );
});

// 5. المزامنة الخلفية (Background Sync)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notes') {
    console.log('[SW] جاري مزامنة الملاحظات في الخلفية...');
    // هنا يتم وضع كود استدعاء API لإرسال الملاحظات المحفوظة محلياً للسيرفر
  }
});