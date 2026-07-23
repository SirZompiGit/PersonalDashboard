/**
 * Statistiche dei personaggi.
 *
 * Sei valori fissi come numero, coi nomi rinominabili a livello di campagna.
 * I nomi vivono su `CampaignState.statLabels`, i valori su `Player.stats` —
 * quest'ultimo assente finché non viene toccato, così i personaggi salvati
 * prima della meccanica si serializzano identici.
 */

/** Quante statistiche esistono. Fisso: cambia solo la loro etichetta. */
export const STAT_COUNT = 6;

/** Nomi predefiniti, le sei classiche. Rinominabili dal master. */
export const DEFAULT_STAT_LABELS = [
  'Forza',
  'Destrezza',
  'Costituzione',
  'Intelligenza',
  'Saggezza',
  'Carisma',
];

/** Valore neutro di partenza, e valore mostrato per gli slot mai impostati. */
export const DEFAULT_STAT = 10;

export const MIN_STAT = 0;
export const MAX_STAT = 99;

export function clampStat(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_STAT;
  return Math.max(MIN_STAT, Math.min(Math.round(value), MAX_STAT));
}

/**
 * Sigla di una statistica per gli spazi stretti (colonna della condivisione).
 * Le prime tre lettere in maiuscolo: "Forza" → "FOR".
 */
export function statAbbr(label: string): string {
  return label.trim().slice(0, 3).toUpperCase() || '—';
}

/**
 * Porta i valori a una lista di sei numeri, riempiendo i mancanti col default.
 * Usata solo per la visualizzazione e la modifica: `undefined` sul modello
 * resta `undefined`, così l'assenza si conserva nel salvataggio.
 */
export function readStats(stats: number[] | undefined): number[] {
  return Array.from({ length: STAT_COUNT }, (_, i) => clampStat(stats?.[i] ?? DEFAULT_STAT));
}
