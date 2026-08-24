import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBy_XczmTBOAcAuXcTtE75nrxBMjFH6pZc",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mdicare.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mdicare",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mdicare.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "392398177377",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:392398177377:web:7263c0045b6d8cf3361620",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-K7ZZ06RM53"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

export let analytics: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export default app;
