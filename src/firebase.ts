import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

// ATTENZIONE: Inserisci qui i dati del tuo progetto Firebase per far funzionare la Versione X!
const env = (import.meta as any).env;

const firebaseConfig = {

  apiKey: "AIzaSyDBVlObR6xVB6T-6pjUqftn03xICyMbaOw",

  authDomain: "fantasia-dashboard.firebaseapp.com",

  databaseURL: "https://fantasia-dashboard-default-rtdb.firebaseio.com",

  projectId: "fantasia-dashboard",

  storageBucket: "fantasia-dashboard.firebasestorage.app",

  messagingSenderId: "563070641410",

  appId: "1:563070641410:web:4ad79ecfa8f15431e38e1b"

};


const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
