import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ATTENZIONE: Inserisci qui i dati del tuo progetto Firebase per far funzionare la Versione X!
const env = (import.meta as any).env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY || "AIzaSyDummyKey-InserisciLaTuaVeraKey",
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || "tuo-progetto.firebaseapp.com",
  projectId: env.VITE_FIREBASE_PROJECT_ID || "tuo-progetto",
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || "tuo-progetto.appspot.com",
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: env.VITE_FIREBASE_APP_ID || "1:123456789:web:abcdef12345"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
