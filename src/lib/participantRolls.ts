/**
 * Attribuzione dei lanci dei partecipanti.
 *
 * Il formato sul database resta ESATTAMENTE quello attuale — l'etichetta del
 * lancio è la stringa `userId|userName|label` — perché le stanze esistenti
 * devono restare leggibili e scrivibili senza migrazioni.
 *
 * Quello che cambia è che prima questa stringa veniva ricostruita e ri-parsata
 * a mano in tre punti diversi (App, SharedView, ParticipantView) con logiche
 * leggermente diverse. Qui c'è un solo encoder e un solo decoder, e il nome
 * viene ripulito dal carattere separatore in scrittura: era l'unico caso in cui
 * il formato si rompeva davvero.
 */

import type { RollResult } from '../types';

const SEPARATOR = '|';

/**
 * Rimuove il separatore dai nomi. `userId` non lo contiene mai (è `user_xxx`) e
 * l'etichetta viene ricomposta con join, quindi il nome era l'unico punto
 * in cui un `|` scritto dall'utente rompeva l'attribuzione.
 */
export function sanitizeUserName(name: string): string {
  return name.split(SEPARATOR).join('/').trim();
}

/** Costruisce l'etichetta nel formato atteso dal database. */
export function encodeRollLabel(userId: string, userName: string, label?: string): string {
  const parts = [userId, sanitizeUserName(userName)];
  if (label && label.trim()) parts.push(label.trim());
  return parts.join(SEPARATOR);
}

export interface DecodedRoll {
  /** Identificativo di chi ha lanciato, se presente nell'etichetta. */
  userId: string | null;
  /** Nome scritto nell'etichetta al momento del lancio. */
  userName: string | null;
  /** Etichetta vera del lancio (es. "Tiro salvezza"), senza i metadati. */
  label: string;
}

/**
 * Legge un'etichetta nel formato del database.
 * Tollera anche le etichette semplici, senza metadati, già presenti in stanze
 * create in precedenza.
 */
export function decodeRollLabel(raw: string | undefined | null): DecodedRoll {
  if (!raw) return { userId: null, userName: null, label: '' };

  const parts = raw.split(SEPARATOR);

  if (parts.length >= 2) {
    return {
      userId: parts[0] || null,
      userName: parts[1] || null,
      label: parts.slice(2).join(SEPARATOR),
    };
  }

  return { userId: null, userName: null, label: parts[0] ?? '' };
}

/** True se il lancio appartiene all'utente indicato. */
export function isOwnRoll(roll: RollResult, userId: string): boolean {
  return decodeRollLabel(roll.label).userId === userId;
}

/**
 * Nome da mostrare per un lancio: preferisce il personaggio assegnato, poi il
 * nome attuale dell'utente, e solo come ultima risorsa il nome congelato
 * nell'etichetta (utile se l'utente si è nel frattempo disconnesso).
 */
export function resolveRollerName(
  decoded: DecodedRoll,
  lookup: (userId: string) => string | null,
): string {
  if (decoded.userId) {
    const resolved = lookup(decoded.userId);
    if (resolved) return resolved;
  }
  return decoded.userName ?? 'Sconosciuto';
}

/** Tiene solo il lancio più recente per ogni giocatore, preservando l'ordine. */
export function latestPerRoller(rolls: RollResult[]): RollResult[] {
  const seen = new Set<string>();
  const out: RollResult[] = [];

  for (const roll of rolls) {
    const key = decodeRollLabel(roll.label).userId ?? 'unknown';
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(roll);
  }

  return out;
}
