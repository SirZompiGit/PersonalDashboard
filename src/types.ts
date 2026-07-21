import type { CampaignTheme } from './theme';

export interface InventoryItem {
  id: string;
  name: string;
}

export interface BonusItem {
  id: string;
  name: string;
}

export interface Player {
  id: string;
  name: string;
  inventory: InventoryItem[];
  bonus: BonusItem[];
}

export interface GradientColors {
  /** 0–33% */
  low: string;
  /** 34–66% */
  mid: string;
  /** 67–100% */
  high: string;
}

export interface HealthBar {
  id: string;
  name: string;
  currentValue: number;
  maxValue: number;
  colorMode: 'static' | 'gradient';
  staticColor: string;
  gradientColors: GradientColors;
  /** Gruppo di appartenenza. Assente = "Senza Gruppo". */
  group?: string;
  /** Testo mostrato a 0 HP. */
  zeroHpText?: string;
}

export interface RollResult {
  diceType: string;
  result: number;
  timestamp: number;
  /**
   * Per i lanci del master è l'etichetta scelta (es. "Tiro salvezza").
   * Per i lanci dei partecipanti è `userId|userName|label`: formato del
   * database, invariato. Si legge e si scrive solo tramite `lib/participantRolls`.
   */
  label?: string;
}

/**
 * Stato completo di una campagna.
 *
 * È anche il payload scritto in `rooms/{pin}/campaign`: la forma è quella
 * attuale e non va cambiata, perché le stanze già esistenti devono restare
 * leggibili e scrivibili.
 *
 * Dopo `normalizeCampaign` tutti i campi sono presenti, così i componenti non
 * devono più difendersi con `|| []` a ogni accesso. Nota che Firebase Realtime
 * Database omette le chiavi con array vuoti: la normalizzazione al momento
 * della lettura è ciò che rende sicuro il resto del codice.
 */
export interface CampaignState {
  title: string;
  scheduleDay: string;
  scheduleTime: string;
  players: Player[];
  healthBars: HealthBar[];
  /** Appunti privati del master. Mai mostrati nella vista condivisa. */
  notes: string;
  /** Appunti pubblici, proiettati nella vista condivisa. */
  campaignNotes: string;
  lastRoll: RollResult | null;
  rollHistory: RollResult[];
  isRollHidden: boolean;
  selectedDice: string;
  activePlayerId: string | null;
  theme: CampaignTheme;
  healthGroups: string[];
  diceLabels: string[];
}
