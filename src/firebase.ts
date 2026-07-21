/**
 * Connessione a Firebase per la Versione X (multiplayer).
 *
 * Prima questo file aveva chiavi finte come valori di ripiego
 * (`"AIzaSyDummyKey-InserisciLaTuaVeraKey"`): senza un file `.env` l'app
 * inizializzava comunque un progetto inesistente e falliva più tardi, a
 * runtime, con un errore incomprensibile.
 *
 * Ora l'assenza di configurazione è uno stato esplicito: la modalità X viene
 * disattivata con un messaggio chiaro e la modalità Lite continua a funzionare
 * senza alcuna dipendenza da Firebase.
 *
 * I nomi delle variabili d'ambiente sono quelli già in uso e non cambiano.
 */

import { type FirebaseApp, initializeApp } from 'firebase/app';
import { type Database, getDatabase } from 'firebase/database';

const env = import.meta.env;

const databaseURL =
  env.VITE_FIREBASE_DATABASE_URL ||
  (env.VITE_FIREBASE_PROJECT_ID
    ? `https://${env.VITE_FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`
    : '');

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  databaseURL,
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? '',
};

/** Il Realtime Database richiede almeno la chiave API e l'URL del database. */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.databaseURL);

export const FIREBASE_SETUP_MESSAGE =
  'Multiplayer non configurato. Copia .env.example in .env e inserisci le credenziali del tuo progetto Firebase, poi riavvia il server di sviluppo.';

let app: FirebaseApp | null = null;
let database: Database | null = null;

/**
 * Inizializzazione pigra: nessuna connessione viene aperta finché qualcuno non
 * entra davvero in una stanza. Chi usa solo la modalità Lite non paga nulla.
 */
export function getDb(): Database {
  if (!isFirebaseConfigured) {
    throw new Error(FIREBASE_SETUP_MESSAGE);
  }
  if (!database) {
    app ??= initializeApp(firebaseConfig);
    database = getDatabase(app);
  }
  return database;
}
