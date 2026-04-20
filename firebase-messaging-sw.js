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
  console.log('رسالة خلفية:', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: './icon-192x192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});