// تم تصحيح Const إلى const (حروف صغيرة) لكي يعمل الكود بدون أخطاء
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

// 1. التثبيت (Install) - تخزين الملفات الأساسية لضمان السرعة
self.addEventListener('install', (event) => {
  self.skipWaiting(); // تفعيل فوري للإصدار الجديد
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] تم تخزين الملفات والخطوط بنجاح');
      return cache.addAll(APP_SHELL);
    })
  );
});

// 2. التفعيل (Activate) - تنظيف الكاش القديم لتوفير مساحة في هاتف المستخدم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] جاري مسح كاش قديم:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. معالجة الإشعارات الفورية (Push Notifications) - تعمل والمتصفح مغلق
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

// 4. استراتيجية الجلب (Fetch) - (Stale-While-Revalidate) لسرعة خرافية
self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // معالجة "هدف المشاركة" (Share Target)
  if (request.method === 'POST' && url.pathname.includes('/share-target')) {
    event.respondWith(Response.redirect('./index.html?shared=true', 303));
    return;
  }

  // تجاهل طلبات Firebase الخارجية لكي لا يتم تخزينها بالخطأ
  if (request.method !== 'GET' || url.host.includes('firestore.googleapis.com') || url.host.includes('google.com')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      // جلب النسخة الأحدث من الإنترنت في الخلفية لتحديث الذاكرة
      const fetchPromise = fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseToCache));
        }
        return networkResponse;
      }).catch(() => {
        // إذا فشل الاتصال بالإنترنت وكان المستخدم يطلب صفحة، اعرض الصفحة الرئيسية المحفوظة
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });

      // إذا كان الملف في الذاكرة، اعرضه فوراً (سرعة عالية)، وإلا انتظر تحميله من الإنترنت
      return cachedResponse || fetchPromise;
    })
  );
});

// 5. المزامنة الخلفية (Background Sync)
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notes') {
    console.log('[Service Worker] جاري مزامنة الملاحظات في الخلفية...');
  }
});