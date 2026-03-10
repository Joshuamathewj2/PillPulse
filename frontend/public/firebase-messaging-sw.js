importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyChUelIIjEl_UNuVy4r4uxPjxLjgdCoRvw",
    authDomain: "pillpulse-6d013.firebaseapp.com",
    projectId: "pillpulse-6d013",
    storageBucket: "pillpulse-6d013.firebasestorage.app",
    messagingSenderId: "566477049434",
    appId: "1:566477049434:web:6821d91f16cd3f4700d263"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    self.registration.showNotification(payload.notification.title, {
        body: payload.notification.body,
        icon: '/logo.png',
        badge: '/logo.png',
        vibrate: [200, 100, 200],
        actions: [
            { action: 'taken', title: '✅ Taken' },
            { action: 'snooze', title: '⏰ Snooze 15min' }
        ]
    });
});
