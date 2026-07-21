/**
 * Accesso al Realtime Database.
 *
 * LA FORMA DEI DATI NON CAMBIA. Percorsi, chiavi e tipi sono esattamente quelli
 * già in uso, così le stanze esistenti restano leggibili e scrivibili:
 *
 *   rooms/{pin}
 *     campaign          → CampaignState serializzato
 *     users/{userId}    → { id, name, assignedPlayerId, notes }
 *     participantRolls  → ARRAY di RollResult (non una lista push())
 */

import {
  get,
  onDisconnect,
  onValue,
  ref,
  remove,
  runTransaction,
  set,
  update,
} from 'firebase/database';
import { getDb } from './firebase';
import type { CampaignState, RollResult } from './types';

export interface RoomUser {
  id: string;
  name: string;
  assignedPlayerId: string | null;
  notes: string;
}

export interface RoomState {
  campaign: CampaignState;
  users: Record<string, RoomUser>;
  participantRolls?: RollResult[];
}

/** Quanti lanci dei partecipanti restano in memoria nella stanza. */
const MAX_PARTICIPANT_ROLLS = 10;

/** PIN a 6 cifre, come oggi. */
export const generatePin = (): string =>
  Math.floor(100000 + Math.random() * 900000).toString();

/**
 * Firebase rifiuta i valori `undefined`. La serializzazione li elimina, ed è
 * lo stesso trattamento già applicato prima.
 */
const clean = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

export async function createRoom(initialState: CampaignState): Promise<string> {
  const db = getDb();

  // Limite ai tentativi: la ricorsione infinita precedente non aveva uscita.
  for (let attempt = 0; attempt < 10; attempt++) {
    const pin = generatePin();
    const roomRef = ref(db, `rooms/${pin}`);
    const existing = await get(roomRef);
    if (existing.exists()) continue;

    await set(roomRef, { campaign: clean(initialState), users: {} });
    return pin;
  }

  throw new Error('Impossibile generare un PIN libero. Riprova fra un istante.');
}

export async function roomExists(pin: string): Promise<boolean> {
  const snap = await get(ref(getDb(), `rooms/${pin}`));
  return snap.exists();
}

export async function updateRoomCampaign(pin: string, campaign: CampaignState): Promise<void> {
  await update(ref(getDb(), `rooms/${pin}`), { campaign: clean(campaign) });
}

/**
 * Entra in una stanza.
 *
 * `onDisconnect().remove()` è registrato sul nodo dell'utente: quando la scheda
 * si chiude o la rete cade, è il server a rimuoverlo. Prima non c'era nulla del
 * genere e ogni ricarica di un giocatore lasciava un utente morto nella lista
 * del master, per sempre.
 */
export async function joinRoom(pin: string, userId: string, userName: string): Promise<void> {
  const db = getDb();

  if (!(await get(ref(db, `rooms/${pin}`))).exists()) {
    throw new Error('Stanza non trovata');
  }

  const userRef = ref(db, `rooms/${pin}/users/${userId}`);
  await set(userRef, { id: userId, name: userName, assignedPlayerId: null, notes: '' });
  await onDisconnect(userRef).remove();
}

/** Rinnova la rimozione automatica dopo una riconnessione. */
export async function armUserDisconnect(pin: string, userId: string): Promise<void> {
  await onDisconnect(ref(getDb(), `rooms/${pin}/users/${userId}`)).remove();
}

export async function leaveRoom(pin: string, userId: string): Promise<void> {
  const userRef = ref(getDb(), `rooms/${pin}/users/${userId}`);
  await onDisconnect(userRef).cancel();
  await remove(userRef);
}

export function subscribeToRoom(
  pin: string,
  callback: (data: RoomState | null) => void,
): () => void {
  return onValue(ref(getDb(), `rooms/${pin}`), (snap) => {
    callback(snap.exists() ? (snap.val() as RoomState) : null);
  });
}

/** Osserva lo stato della connessione al database (nodo speciale `.info/connected`). */
export function subscribeToConnection(callback: (online: boolean) => void): () => void {
  return onValue(ref(getDb(), '.info/connected'), (snap) => callback(snap.val() === true));
}

export async function updateUser(
  pin: string,
  userId: string,
  updates: Partial<RoomUser>,
): Promise<void> {
  await update(ref(getDb(), `rooms/${pin}/users/${userId}`), updates);
}

/**
 * Registra il lancio di un partecipante.
 *
 * Prima era un leggi-modifica-scrivi: due giocatori che lanciavano nello stesso
 * momento leggevano lo stesso array e uno dei due lanci spariva. `runTransaction`
 * rende l'operazione atomica lasciando il dato nella stessa forma di array.
 */
export async function pushParticipantRoll(pin: string, roll: RollResult): Promise<void> {
  const rollsRef = ref(getDb(), `rooms/${pin}/participantRolls`);
  const payload = clean(roll);

  await runTransaction(rollsRef, (current: RollResult[] | null) => {
    const list = Array.isArray(current) ? current : [];
    return [payload, ...list].slice(0, MAX_PARTICIPANT_ROLLS);
  });
}

export async function deleteRoom(pin: string): Promise<void> {
  await remove(ref(getDb(), `rooms/${pin}`));
}
