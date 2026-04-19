// قم بتغيير رقم الإصدار عند عمل أي تحديث كبير في الموقع
const CACHE_NAME = 'commerce-zagazig-v4';

// الملفات الأساسية التي سيتم تخزينها فور فتح الموقع
const APP_SHELL =[
  './',
  './index.html',
  './manifest.json',
  './icon-192x192.png',
  './icon-512x512.png'
];

// 1. التثبيت (Install) - تحميل الملفات الأساسية
self.addEventListener('install', (event) => {
  self.skipWaiting(); // تفعيل التحديث فوراً
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] تم حفظ ملفات التطبيق الأساسية بنجاح');
      return cache.addAll(APP_SHELL);
    })
  );
});

// 2. التفعيل (Activate) - مسح الكاش القديم لتوفير المساحة
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[Service Worker] تم مسح الذاكرة القديمة:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// 3. الجلب (Fetch) - استراتيجية (Stale-While-Revalidate) للسرعة الصاروخية
self.addEventListener('fetch', (event) => {
  const request = event.request;

  // تجاهل طلبات قواعد البيانات (Firebase) لأن لها نظام تخزين خاص بها قمنا بتفعيله
  if (request.method !== 'GET' || request.url.includes('firestore.googleapis.com') || request.url.includes('google.com')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      
      // إذا كان الملف موجوداً في الذاكرة، اعرضه فوراً للمستخدم (سرعة فائقة)
      if (cachedResponse) {
        // في الخلفية: قم بجلب النسخة الأحدث من الإنترنت لتحديث الذاكرة للمرة القادمة
        event.waitUntil(
          fetch(request).then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, networkResponse.clone());
              });
            }
          }).catch(() => { /* تجاهل الخطأ إذا كان أوفلاين */ })
        );
        return cachedResponse;
      }

      // إذا لم يكن الملف في الذاكرة، اجلبه من الإنترنت
      return fetch(request).then((networkResponse) => {
        // احفظ نسخة منه في الذاكرة لتسريع فتحه في المرات القادمة
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // إذا فشل الإنترنت تماماً وكان المستخدم يحاول فتح صفحة، وجهه للصفحة الرئيسية المحفوظة
        if (request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});