import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';

const cleanEnv = (val: string | undefined, fallback: string): string => {
  if (!val) return fallback;
  const trimmed = val.trim().replace(/^["']|["']$/g, '');
  return trimmed || fallback;
};

const firebaseConfig = {
  apiKey: cleanEnv(import.meta.env.VITE_FIREBASE_API_KEY, "AIzaSyBy_XczmTBOAcAuXcTtE75nrxBMjFH6pZc"),
  authDomain: cleanEnv(import.meta.env.VITE_FIREBASE_AUTH_DOMAIN, "mdicare.firebaseapp.com"),
  projectId: cleanEnv(import.meta.env.VITE_FIREBASE_PROJECT_ID, "mdicare"),
  storageBucket: cleanEnv(import.meta.env.VITE_FIREBASE_STORAGE_BUCKET, "mdicare.firebasestorage.app"),
  messagingSenderId: cleanEnv(import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID, "392398177377"),
  appId: cleanEnv(import.meta.env.VITE_FIREBASE_APP_ID, "1:392398177377:web:7263c0045b6d8cf3361620"),
  measurementId: cleanEnv(import.meta.env.VITE_FIREBASE_MEASUREMENT_ID, "G-K7ZZ06RM53")
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
