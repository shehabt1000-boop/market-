// ==========================================
// 1. إعدادات فايربيز
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

// ترك هذه الدالة فارغة أو لحفظ بيانات فقط لأن فايربيز يعرض الإشعار تلقائياً في الخلفية
// إذا قمت بعمل showNotification هنا يدوياً قد يظهر الإشعار مرتين أو يحدث خطأ
messaging.onBackgroundMessage(function(payload) {
  console.log('[ServiceWorker] رسالة في الخلفية: ', payload);
});

// التفاعل عند النقر على الإشعار
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data?.url || event.notification.data?.link || './';
  event.waitUntil(clients.openWindow(urlToOpen));
});

// ==========================================
// 2. كود الكاش السريع (بدون استهلاك باقة الإنترنت)
// ==========================================
const CACHE_NAME = 'commerce-zagazig-v8-optimized'; // تم تغيير الاسم لتحديث الكاش عند المستخدمين

const APP_SHELL =[
  './',
  './index.html',
  './manifest.json',
  './icon-192x192.png'
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

  // 🔴 مهم جداً: تخطي طلبات فايربيز وجوجل تماماً حتى لا تفشل الإشعارات
  if (event.request.method !== 'GET' || 
      !url.protocol.startsWith('http') || 
      url.host.includes('firestore') || 
      url.host.includes('googleapis.com') || // هذا السطر هو الذي كان يعطل إنشاء التوكن
      url.host.includes('firebase') ||
      url.host.includes('cloudinary.com') || 
      url.host.includes('esm.sh')) {
    return; 
  }

  // استراتيجية Cache First (لإنهاء مشكلة البطء)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse; // إرجاع الملف من الكاش فوراً بدون عمل fetch في الخلفية
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