import { initializeApp } from 'firebase/app';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: "AIzaSyChUelIIjEl_UNuVy4r4uxPjxLjgdCoRvw",
    authDomain: "pillpulse-6d013.firebaseapp.com",
    projectId: "pillpulse-6d013",
    storageBucket: "pillpulse-6d013.firebasestorage.app",
    messagingSenderId: "566477049434",
    appId: "1:566477049434:web:6821d91f16cd3f4700d263"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

import { escalationEngine } from './escalationEngine';

export const requestPermissionAndGetToken = async () => {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return null;

    // Ensure service worker is ready and pass to escalation engine
    if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.ready;
        escalationEngine.setSWRegistration(registration);
    }

    return await getToken(messaging, {
        vapidKey: "BO25PH8Vr3vIMZictymm_kR7R9XQNeF40tVBwdHXU6CDkzMkC-vry-Sk9fkVCvecIEq7dATrWpXR-TUYhCuIGIA"
    });
};

export const onForegroundMessage = (callback) => onMessage(messaging, callback);
export default messaging;
