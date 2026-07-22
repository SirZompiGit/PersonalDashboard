/**
 * Logica delle barre vita, condivisa fra HealthBarsManager e SharedView.
 * Prima `getBarColor` e il raggruppamento erano copiati identici nei due file.
 */

import type { ColoredBar, HealthBar, Resource } from '../types';

/**
 * Limite massimo dei punti ferita.
 *
 * La barra disegna un elemento per ogni punto: senza limite, digitare 100000
 * generava centomila nodi DOM e bloccava il browser. L'input era `type="text"`,
 * quindi gli attributi `min`/`max` non venivano nemmeno applicati.
 */
export const MAX_HP = 999;
export const MIN_HP = 1;

/**
 * Oltre questa soglia la barra passa a riempimento continuo invece che a
 * segmenti. L'aspetto non cambia: sopra i 60 punti i segmenti erano già
 * renderizzati con `gap-0`, quindi apparivano già come una barra piena.
 */
export const SEGMENT_THRESHOLD = 60;

export const DEFAULT_ZERO_HP_TEXT = 'DEFUNTO';

/**
 * Risorse per barra.
 *
 * Il limite non è tecnico ma di leggibilità: la barra della vita deve restare
 * l'informazione dominante, e tre tracce sottili sotto — o accanto, in verticale
 * — la trasformerebbero in un grafico.
 */
export const MAX_RESOURCES = 2;

export const DEFAULT_RESOURCE_COLOR = '#3b82f6';

/** Soglia sotto la quale scatta l'allerta visiva, se attiva sulla barra. */
export const LOW_HP_THRESHOLD = 0.25;

/**
 * Una barra è in allerta quando è sotto soglia ma non ancora a zero: a zero c'è
 * già l'etichetta "DEFUNTO", e continuare a pulsare sarebbe solo rumore.
 */
export function isLowHp(bar: HealthBar): boolean {
  if (bar.lowHpAlert === false) return false;
  if (bar.currentValue <= 0) return false;
  return healthRatio(bar) <= LOW_HP_THRESHOLD;
}

export const DEFAULT_HEALTH_GROUPS = ['Nemici', 'Alleati', 'PG'];

export function clampHp(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(Math.round(value), max));
}

export function clampMaxHp(value: number): number {
  if (!Number.isFinite(value)) return MIN_HP;
  return Math.max(MIN_HP, Math.min(Math.round(value), MAX_HP));
}

export function healthRatio(bar: Pick<ColoredBar, 'currentValue' | 'maxValue'>): number {
  return bar.maxValue > 0 ? bar.currentValue / bar.maxValue : 0;
}

/**
 * Applica i limiti alla lista delle risorse e restituisce `undefined` quando
 * non ne resta nessuna.
 *
 * L'assenza è voluta: una barra senza risorse deve serializzarsi esattamente
 * come prima che le risorse esistessero, così le stanze e i salvataggi già
 * creati restano identici byte per byte.
 */
export function clampResources(list: Resource[] | undefined): Resource[] | undefined {
  if (!Array.isArray(list) || list.length === 0) return undefined;

  const clamped = list.slice(0, MAX_RESOURCES).map((resource) => {
    const maxValue = clampMaxHp(resource.maxValue);
    return { ...resource, maxValue, currentValue: clampHp(resource.currentValue, maxValue) };
  });

  return clamped.length > 0 ? clamped : undefined;
}

/** Espande #rgb in #rrggbb e restituisce le tre componenti. */
function hexToRgb(hex: string): [number, number, number] {
  let value = hex.replace('#', '').trim();
  if (value.length === 3) {
    value = value[0] + value[0] + value[1] + value[1] + value[2] + value[2];
  }
  const int = Number.parseInt(value.slice(0, 6), 16);
  return Number.isFinite(int)
    ? [(int >> 16) & 255, (int >> 8) & 255, int & 255]
    : [255, 255, 255];
}

const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');

/** Fonde due colori esadecimali. `t` va da 0 (primo) a 1 (secondo). */
function mixHex(from: string, to: string, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const [r1, g1, b1] = hexToRgb(from);
  const [r2, g2, b2] = hexToRgb(to);
  return `#${toHex(r1 + (r2 - r1) * clamped)}${toHex(g1 + (g2 - g1) * clamped)}${toHex(
    b1 + (b2 - b1) * clamped,
  )}`;
}

/**
 * Colore attivo della barra secondo la modalità e la percentuale di salute.
 *
 * Accetta `ColoredBar`, non `HealthBar`: le risorse hanno le stesse tre
 * modalità di colore e passano di qui senza una riga in più.
 */
export function getBarColor(bar: ColoredBar): string {
  if (bar.colorMode === 'static') return bar.staticColor;

  const ratio = healthRatio(bar);
  const { low, mid, high } = bar.gradientColors;

  /**
   * Sfumato: il colore attraversa i tre valori con continuità, invece di
   * scattare da uno all'altro a soglie fisse. La metà bassa interpola
   * basso → medio, quella alta medio → alto.
   */
  if (bar.colorMode === 'smooth') {
    return ratio <= 0.5 ? mixHex(low, mid, ratio / 0.5) : mixHex(mid, high, (ratio - 0.5) / 0.5);
  }

  // A soglie: tre gradini netti.
  if (ratio <= 0.33) return low;
  if (ratio <= 0.66) return mid;
  return high;
}

export interface GroupedBars {
  /** Gruppi non vuoti, nell'ordine definito dall'utente. */
  groups: { name: string; bars: HealthBar[] }[];
  /** Barre senza gruppo, o con un gruppo che non esiste più. */
  ungrouped: HealthBar[];
}

export function groupBars(healthBars: HealthBar[], healthGroups: string[]): GroupedBars {
  const byGroup = new Map<string, HealthBar[]>();
  const ungrouped: HealthBar[] = [];
  const known = new Set(healthGroups);

  for (const bar of healthBars) {
    if (bar.group && known.has(bar.group)) {
      const list = byGroup.get(bar.group);
      if (list) list.push(bar);
      else byGroup.set(bar.group, [bar]);
    } else {
      ungrouped.push(bar);
    }
  }

  const groups = healthGroups
    .map((name) => ({ name, bars: byGroup.get(name) ?? [] }))
    .filter((g) => g.bars.length > 0);

  return { groups, ungrouped };
}
