import type { CampaignStyle, CampaignTheme, LogoVariant } from './theme';

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
  /**
   * Le sei statistiche, nell'ordine di `statLabels`. Campo additivo e assente
   * finché non viene toccato: un personaggio senza statistiche si serializza
   * esattamente come prima che la meccanica esistesse. In visualizzazione i
   * valori mancanti valgono `DEFAULT_STAT`.
   */
  stats?: number[];
}

export interface GradientColors {
  /** 0–33% */
  low: string;
  /** 34–66% */
  mid: string;
  /** 67–100% */
  high: string;
}

/**
 * Quanto basta per disegnare e colorare una barra: è la parte comune fra la
 * barra della vita e le risorse agganciate ad essa, ed è anche l'unico
 * argomento di cui `getBarColor` ha bisogno.
 */
export interface ColoredBar {
  currentValue: number;
  maxValue: number;
  /**
   * `static`   — un colore fisso
   * `gradient` — tre colori a soglie nette (≤33%, ≤66%, oltre)
   * `smooth`   — gli stessi tre colori, ma attraversati con continuità
   */
  colorMode: 'static' | 'gradient' | 'smooth';
  staticColor: string;
  gradientColors: GradientColors;
}

/**
 * Barra secondaria agganciata a una barra della vita: mana, scudo, frenesia,
 * slot incantesimo. Ha valori e colori propri, ma non gruppo, testo a 0 HP né
 * allerta — quelli descrivono la salute, non una risorsa.
 */
export interface Resource extends ColoredBar {
  id: string;
  name: string;
  /**
   * Visibile ai giocatori nella vista condivisa. Permette di tenersi nascosta
   * la frenesia di un mostro mostrandone però lo scudo.
   */
  shared: boolean;
}

/**
 * Effetto di stato applicato a una barra: Avvelenato, Stordito, Furioso.
 * Solo un'etichetta con un colore — non ha valori né modalità colore, a
 * differenza delle risorse.
 */
export interface StatusEffect {
  id: string;
  name: string;
  color: string;
  /**
   * Visibile ai giocatori nella vista condivisa. Permette di tenere segreto
   * un effetto ("Furioso") mostrandone altri ("Avvelenato").
   */
  shared: boolean;
}

export interface HealthBar extends ColoredBar {
  id: string;
  name: string;
  /** Gruppo di appartenenza. Assente = "Senza Gruppo". */
  group?: string;
  /** Testo mostrato a 0 HP. */
  zeroHpText?: string;
  /**
   * Allerta visiva sotto il 25% dei punti ferita.
   * Campo additivo: assente sulle barre create prima, dove viene attivato di
   * default dalla normalizzazione.
   */
  lowHpAlert?: boolean;
  /**
   * Risorse associate, al massimo due. Campo additivo e assente quando la lista
   * è vuota: le barre senza risorse producono lo stesso identico payload di
   * prima, quindi le stanze già esistenti non cambiano di una virgola.
   */
  resources?: Resource[];
  /**
   * Effetti di stato, al massimo cinque. Additivo e assente quando vuoto, come
   * `resources`.
   */
  statusEffects?: StatusEffect[];
}

/**
 * Modalità di un lancio Dado+.
 * `advantage`/`disadvantage` tengono una faccia sola (il critico resta valido);
 * `sum` somma più dadi (nessun critico). Assente = tiro singolo normale.
 */
export type RollMode = 'advantage' | 'disadvantage' | 'sum';

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
  /**
   * Dettaglio leggibile di un lancio Dado+ (es. "4 + 2 + 5", "Vantaggio 15 / 8").
   * Campo additivo e assente sui lanci normali.
   */
  detail?: string;
  /**
   * Modalità del lancio. Assente = tiro singolo. Serve a sopprimere il critico
   * sulle somme, dove non ha senso.
   */
  mode?: RollMode;
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
  /**
   * Variante di design (forme e densità), indipendente dal colore.
   * Campo additivo: le campagne salvate prima non ce l'hanno e ricadono su
   * 'bento' tramite la normalizzazione, quindi il database resta compatibile.
   */
  style: CampaignStyle;
  /** Variante del marchio. Campo additivo, come `style`. */
  logoVariant: LogoVariant;
  healthGroups: string[];
  diceLabels: string[];
  /**
   * Meccaniche opzionali. Tutti campi additivi: assenti quando al valore di
   * default, così le campagne salvate prima si serializzano identiche.
   */
  /** Statistiche dei personaggi attive. */
  statsEnabled: boolean;
  /** Nomi delle sei statistiche, rinominabili a livello di campagna. */
  statLabels: string[];
  /** Dado+: etichette, vantaggio/svantaggio, dadi multipli. */
  dicePlus: boolean;
  /** Controllo globale: i giocatori collegati possono modificarsi la scheda. */
  playersCanEdit: boolean;
}
