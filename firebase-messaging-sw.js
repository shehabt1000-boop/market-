// ==========================================
// 1. إعدادات فايربيز لاستقبال الإشعارات في الخلفية
// ==========================================
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.11.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyANg4wLchZaikXneXr1c3qhRgcOnvPbfoA",
  authDomain: "faculty-of-commerce-2026.firebaseapp.com",
  projectId: "faculty-of-commerce-2026",
  storageBucket: "faculty-of-commerce-2026.firebasestorage.app",
  messagingSenderId: "350727231766",
  appId: "1:350727231766:web:b08a0f335e38bfc2e79837"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[ServiceWorker] رسالة في الخلفية: ', payload);
  const notificationTitle = payload.notification?.title || 'تجارة الزقازيق';
  const notificationOptions = {
    body: payload.notification?.body,
    icon: './icon-192x192.png',
    badge: './icon-192x192.png',
    vibrate:[200, 100, 200],
    // إرفاق الرابط ليتم فتحه عند النقر على الإشعار
    data: { url: payload.data?.url || payload.fcmOptions?.link || './' }
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

// التفاعل عند النقر على الإشعار
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || './';
  event.waitUntil(clients.openWindow(urlToOpen));
});


// ==========================================
// 2. كود الكاش الخاص بك (لتسريع الموقع وعمل الأوفلاين)
// ==========================================
const CACHE_NAME = 'commerce-zagazig-v7-fast';

const APP_SHELL =[
  './',
  './index.html',
  './manifest.json',
  './icon-192x192.png',
  './assets/fonts/cairo-bold.woff2'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // تخطي الطلبات الخارجية
  if (event.request.method !== 'GET' || !url.protocol.startsWith('http') || url.host.includes('firestore') || url.host.includes('cloudinary.com') || url.host.includes('esm.sh')) {
    return; 
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        if (url.origin === self.location.origin) {
          fetch(event.request).then((response) => {
            if (response.ok) caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response));
          }).catch(() => {});
        }
        return cachedResponse;
      }

      return fetch(event.request).then((response) => {
        if (response.ok && url.origin === self.location.origin) {
          const resClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, resClone));
        }
        return response;
      }).catch(() => {
         if (event.request.mode === 'navigate') return caches.match('./index.html');
      });
    })
  );
});