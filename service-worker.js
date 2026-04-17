const CACHE_NAME = 'commerce-zagazig-v2';

// الملفات الأساسية جداً فقط (هيكل التطبيق) التي سيتم حفظها ليعمل التطبيق أوفلاين
// تأكد من أن أسماء الأيقونات مطابقة لما وضعته في مجلد المشروع
const APP_SHELL =[
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
];

// 1. حدث التثبيت (Install) - تثبيت عامل الخادم وحفظ هيكل التطبيق
self.addEventListener('install', (event) => {
  self.skipWaiting(); // إجبار المتصفح على تفعيل عامل الخادم فوراً
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] تم حفظ ملفات التطبيق الأساسية بنجاح');
      return cache.addAll(APP_SHELL);
    })
  );
});

// 2. حدث التفعيل (Activate) - تنظيف الذاكرة (الكاش) القديمة لمنع اللاج وتراكم الملفات
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

// 3. حدث الجلب (Fetch) - استراتيجية "الشبكة أولاً" مع دعم وضع عدم الاتصال (Offline)
self.addEventListener('fetch', (event) => {
  // تجاهل طلبات رفع الملفات (POST) وتجاهل طلبات قاعدة بيانات Firebase لمنع استهلاك الذاكرة
  if (event.request.method !== 'GET' || event.request.url.includes('firestore.googleapis.com')) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        // إذا كان الاتصال بالإنترنت ناجحاً، قم بتحديث الكاش للملفات الأساسية فقط
        const url = new URL(event.request.url);
        if (APP_SHELL.includes(url.pathname)) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      })
      .catch(async () => {
        // في حالة انقطاع الإنترنت (Offline Fallback)
        console.log('[Service Worker] أنت الآن في وضع عدم الاتصال (Offline).');
        
        // البحث عن الملف المطلوب في الذاكرة
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) {
          return cachedResponse;
        }
        
        // إذا كان المستخدم يطلب صفحة ويب (مثل عمل Refresh) والإنترنت مقطوع، اعرض له التطبيق من الذاكرة
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      })
  );
});