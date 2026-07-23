/**
 * Normalizzazione e migrazione dello stato campagna.
 *
 * Prima l'import di un JSON controllava solo la presenza di `title` e `players`
 * e poi faceva `setState(parsed)`. Un file senza `healthBars` faceva esplodere
 * il render successivo — e lo stato corrotto era già stato scritto in
 * localStorage, quindi l'app non si riapriva più.
 *
 * Qui ogni campo viene validato e ricostruito. Queste funzioni non lanciano mai:
 * nel caso peggiore restituiscono una campagna vuota ma valida.
 *
 * IMPORTANTE: la versione dello schema vive nell'involucro salvato in
 * localStorage, NON dentro `CampaignState`. Il payload scritto su Firebase
 * resta identico a quello di oggi, senza campi aggiuntivi.
 */

import type {
  BonusItem,
  CampaignState,
  ColoredBar,
  GradientColors,
  HealthBar,
  InventoryItem,
  Player,
  Resource,
  RollMode,
  RollResult,
  StatusEffect,
} from '../types';
import { newId } from '../lib/ids';
import { DEFAULT_DICE, isDiceType } from '../lib/dice';
import {
  DEFAULT_RESOURCE_COLOR,
  DEFAULT_STATUS_COLOR,
  DEFAULT_ZERO_HP_TEXT,
  MAX_RESOURCES,
  MAX_STATUS_EFFECTS,
  clampHp,
  clampMaxHp,
} from '../lib/healthBars';
import { DEFAULT_STAT, DEFAULT_STAT_LABELS, STAT_COUNT, clampStat } from '../lib/stats';
import { normalizeLogoVariant, normalizeStyle, normalizeTheme } from '../theme';
import { DEFAULT_DICE_LABELS, createEmptyCampaign } from './defaults';

export const SCHEMA_VERSION = 2;

export const MAX_ROLL_HISTORY = 20;

interface StoredEnvelope {
  v: number;
  state: unknown;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const asString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;

const asNumber = (value: unknown, fallback = 0): number => {
  const n = typeof value === 'number' ? value : Number.parseFloat(String(value));
  return Number.isFinite(n) ? n : fallback;
};

const asBoolean = (value: unknown, fallback = false): boolean =>
  typeof value === 'boolean' ? value : fallback;

const asArray = (value: unknown): unknown[] => (Array.isArray(value) ? value : []);

/** Colore esadecimale valido, altrimenti il fallback. */
const asColor = (value: unknown, fallback: string): string =>
  typeof value === 'string' && /^#[0-9a-f]{3,8}$/i.test(value.trim())
    ? value.trim()
    : fallback;

/** Lista di stringhe non vuote e senza duplicati. */
function asStringList(value: unknown, fallback: string[]): string[] {
  if (!Array.isArray(value)) return [...fallback];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function normalizeNamedItems(value: unknown): (InventoryItem | BonusItem)[] {
  return asArray(value)
    .filter(isRecord)
    .map((item) => ({
      id: asString(item.id) || newId(),
      name: asString(item.name).slice(0, 200),
    }))
    .filter((item) => item.name.length > 0);
}

/**
 * Le statistiche restano assenti quando il personaggio non ne ha: è ciò che
 * mantiene identico il payload di chi è stato creato prima della meccanica.
 * Quando ci sono, si portano sempre a esattamente sei valori.
 */
function normalizeStats(value: unknown): number[] | undefined {
  if (!Array.isArray(value)) return undefined;
  // Uno slot mancante torna al default, non a zero: un array più corto è
  // malformato, non un personaggio con statistiche azzerate.
  return Array.from({ length: STAT_COUNT }, (_, i) => clampStat(asNumber(value[i], DEFAULT_STAT)));
}

function normalizePlayer(value: unknown): Player | null {
  if (!isRecord(value)) return null;
  const name = asString(value.name).trim();
  if (!name) return null;

  const player: Player = {
    id: asString(value.id) || newId(),
    name: name.slice(0, 60),
    inventory: normalizeNamedItems(value.inventory),
    bonus: normalizeNamedItems(value.bonus),
  };

  const stats = normalizeStats(value.stats);
  if (stats) player.stats = stats;

  return player;
}

function normalizeGradient(value: unknown): GradientColors {
  const source = isRecord(value) ? value : {};
  return {
    low: asColor(source.low, '#ef4444'),
    mid: asColor(source.mid, '#f59e0b'),
    high: asColor(source.high, '#10b981'),
  };
}

const asColorMode = (value: unknown): ColoredBar['colorMode'] =>
  value === 'gradient' || value === 'smooth' ? value : 'static';

/**
 * Una risorsa arriva dalle stesse tre sorgenti della barra che la contiene:
 * localStorage, file importato e database. Un dato corrotto non deve poter
 * rompere la vista di un giocatore, quindi qui non si lancia mai: al peggio la
 * risorsa viene scartata.
 */
function normalizeResource(value: unknown): Resource | null {
  if (!isRecord(value)) return null;
  const name = asString(value.name).trim();
  if (!name) return null;

  const maxValue = clampMaxHp(asNumber(value.maxValue, 1));

  return {
    id: asString(value.id) || newId(),
    name: name.slice(0, 30),
    maxValue,
    currentValue: clampHp(asNumber(value.currentValue, 0), maxValue),
    colorMode: asColorMode(value.colorMode),
    staticColor: asColor(value.staticColor, DEFAULT_RESOURCE_COLOR),
    gradientColors: normalizeGradient(value.gradientColors),
    // Visibile salvo esplicita esclusione, come `lowHpAlert`.
    shared: value.shared !== false,
  };
}

function normalizeStatusEffect(value: unknown): StatusEffect | null {
  if (!isRecord(value)) return null;
  const name = asString(value.name).trim();
  if (!name) return null;

  return {
    id: asString(value.id) || newId(),
    name: name.slice(0, 24),
    color: asColor(value.color, DEFAULT_STATUS_COLOR),
    shared: value.shared !== false,
  };
}

function normalizeHealthBar(value: unknown): HealthBar | null {
  if (!isRecord(value)) return null;
  const name = asString(value.name).trim();
  if (!name) return null;

  // Il limite protegge dal caso in cui l'input testuale accettava qualsiasi
  // numero: la barra disegna un elemento per punto ferita.
  const maxValue = clampMaxHp(asNumber(value.maxValue, 1));
  const zeroHpText = asString(value.zeroHpText).trim();
  const group = asString(value.group).trim();

  const bar: HealthBar = {
    id: asString(value.id) || newId(),
    name: name.slice(0, 60),
    maxValue,
    currentValue: clampHp(asNumber(value.currentValue, 0), maxValue),
    colorMode: asColorMode(value.colorMode),
    staticColor: asColor(value.staticColor, '#10b981'),
    gradientColors: normalizeGradient(value.gradientColors),
    zeroHpText: zeroHpText ? zeroHpText.slice(0, 30) : DEFAULT_ZERO_HP_TEXT,
    // Attiva salvo esplicita disattivazione: le barre create prima non hanno
    // il campo e devono comportarsi come quelle nuove.
    lowHpAlert: value.lowHpAlert !== false,
  };

  // `group` resta assente quando è vuoto: Firebase rifiuta i valori undefined
  // solo dopo la serializzazione, e questa forma è quella già in uso.
  if (group) bar.group = group.slice(0, 40);

  // Stessa regola per le risorse: assenti quando non ce ne sono, così una barra
  // creata prima di questa funzione si riserializza identica a com'era.
  const resources = asArray(value.resources)
    .map(normalizeResource)
    .filter((r): r is Resource => r !== null)
    .slice(0, MAX_RESOURCES);

  if (resources.length > 0) bar.resources = resources;

  const statusEffects = asArray(value.statusEffects)
    .map(normalizeStatusEffect)
    .filter((e): e is StatusEffect => e !== null)
    .slice(0, MAX_STATUS_EFFECTS);

  if (statusEffects.length > 0) bar.statusEffects = statusEffects;

  return bar;
}

function normalizeRoll(value: unknown): RollResult | null {
  if (!isRecord(value)) return null;

  const diceType = asString(value.diceType);
  if (!/^d\d+$/.test(diceType)) return null;

  const result = asNumber(value.result, NaN);
  if (!Number.isFinite(result)) return null;

  const roll: RollResult = {
    diceType,
    result: Math.round(result),
    timestamp: asNumber(value.timestamp, Date.now()),
  };

  const label = asString(value.label).trim();
  if (label) roll.label = label.slice(0, 200);

  // Campi Dado+: additivi, assenti sui lanci normali. `detail` è descrittivo,
  // `mode` va tenuto solo se è uno dei valori noti.
  const detail = asString(value.detail).trim();
  if (detail) roll.detail = detail.slice(0, 200);

  if (value.mode === 'advantage' || value.mode === 'disadvantage' || value.mode === 'sum') {
    roll.mode = value.mode as RollMode;
  }

  return roll;
}

/**
 * Porta qualsiasi input a una campagna valida e completa.
 * Usata sia per localStorage sia per i dati letti dal database — Firebase
 * Realtime Database omette le chiavi con array vuoti, quindi anche una stanza
 * perfettamente sana arriva con campi mancanti.
 */
export function normalizeCampaign(raw: unknown): CampaignState {
  const base = createEmptyCampaign();
  if (!isRecord(raw)) return base;

  const players = asArray(raw.players)
    .map(normalizePlayer)
    .filter((p): p is Player => p !== null);

  const healthGroups = asStringList(raw.healthGroups, base.healthGroups);

  const healthBars = asArray(raw.healthBars)
    .map(normalizeHealthBar)
    .filter((b): b is HealthBar => b !== null);

  const rollHistory = asArray(raw.rollHistory)
    .map(normalizeRoll)
    .filter((r): r is RollResult => r !== null)
    .slice(0, MAX_ROLL_HISTORY);

  const activePlayerId = asString(raw.activePlayerId);
  const selectedDice = asString(raw.selectedDice);

  return {
    title: asString(raw.title, base.title).slice(0, 80) || base.title,
    scheduleDay: asString(raw.scheduleDay).slice(0, 40),
    scheduleTime: asString(raw.scheduleTime).slice(0, 20),
    players,
    healthBars,
    notes: asString(raw.notes),
    campaignNotes: asString(raw.campaignNotes),
    lastRoll: normalizeRoll(raw.lastRoll),
    rollHistory,
    isRollHidden: asBoolean(raw.isRollHidden),
    selectedDice: isDiceType(selectedDice) ? selectedDice : DEFAULT_DICE,
    // Un giocatore cancellato non deve restare "attivo".
    activePlayerId: players.some((p) => p.id === activePlayerId) ? activePlayerId : null,
    theme: normalizeTheme(raw.theme),
    style: normalizeStyle(raw.style),
    logoVariant: normalizeLogoVariant(raw.logoVariant),
    healthGroups,
    diceLabels: asStringList(raw.diceLabels, DEFAULT_DICE_LABELS),
    statsEnabled: asBoolean(raw.statsEnabled),
    statLabels: normalizeStatLabels(raw.statLabels),
    dicePlus: asBoolean(raw.dicePlus),
    playersCanEdit: asBoolean(raw.playersCanEdit),
  };
}

/** Sempre sei etichette: i posti vuoti o mancanti tornano al nome predefinito. */
function normalizeStatLabels(value: unknown): string[] {
  const source = Array.isArray(value) ? value : [];
  return Array.from({ length: STAT_COUNT }, (_, i) => {
    const label = asString(source[i]).trim();
    return label ? label.slice(0, 20) : DEFAULT_STAT_LABELS[i];
  });
}

/**
 * Legge lo stato salvato in localStorage.
 *
 * Riconosce due formati:
 *  - v1 (legacy): la campagna scritta direttamente, senza involucro
 *  - v2: `{ v: 2, state: {...} }`
 *
 * Restituisce `null` se non c'è nulla di utilizzabile, così il chiamante può
 * decidere se mostrare la campagna d'esempio.
 */
export function migrateStoredState(rawJson: string | null): CampaignState | null {
  if (!rawJson) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawJson);
  } catch {
    return null;
  }

  if (!isRecord(parsed)) return null;

  // Formato v2: involucro con versione.
  if (typeof parsed.v === 'number' && 'state' in parsed) {
    return normalizeCampaign((parsed as unknown as StoredEnvelope).state);
  }

  // Formato v1: campagna nuda. Riconosciuta dalla presenza di `title`.
  if ('title' in parsed) {
    return normalizeCampaign(parsed);
  }

  return null;
}

/** Serializza la campagna nell'involucro versionato salvato in localStorage. */
export function serializeState(state: CampaignState): string {
  return JSON.stringify({ v: SCHEMA_VERSION, state } satisfies StoredEnvelope);
}

export interface ImportResult {
  ok: boolean;
  state?: CampaignState;
  error?: string;
}

/**
 * Valida un file di campagna importato.
 * Il file esportato è la campagna nuda, quindi si accetta anche l'involucro
 * versionato nel caso venga esportato in futuro.
 */
export function parseImportedCampaign(text: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Il file non è un JSON valido.' };
  }

  if (!isRecord(parsed)) {
    return { ok: false, error: 'Il file non contiene una campagna.' };
  }

  const source =
    typeof parsed.v === 'number' && 'state' in parsed ? parsed.state : parsed;

  if (!isRecord(source) || !('title' in source)) {
    return {
      ok: false,
      error: "Formato non riconosciuto: manca il titolo della campagna.",
    };
  }

  return { ok: true, state: normalizeCampaign(source) };
}
