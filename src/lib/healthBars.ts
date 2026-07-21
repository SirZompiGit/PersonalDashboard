/**
 * Logica delle barre vita, condivisa fra HealthBarsManager e SharedView.
 * Prima `getBarColor` e il raggruppamento erano copiati identici nei due file.
 */

import type { HealthBar } from '../types';

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

export const DEFAULT_HEALTH_GROUPS = ['Nemici', 'Alleati', 'PG'];

export function clampHp(value: number, max: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(Math.round(value), max));
}

export function clampMaxHp(value: number): number {
  if (!Number.isFinite(value)) return MIN_HP;
  return Math.max(MIN_HP, Math.min(Math.round(value), MAX_HP));
}

export function healthRatio(bar: Pick<HealthBar, 'currentValue' | 'maxValue'>): number {
  return bar.maxValue > 0 ? bar.currentValue / bar.maxValue : 0;
}

/** Colore attivo della barra secondo la modalità e la percentuale di salute. */
export function getBarColor(bar: HealthBar): string {
  if (bar.colorMode === 'static') return bar.staticColor;

  const ratio = healthRatio(bar);
  if (ratio <= 0.33) return bar.gradientColors.low;
  if (ratio <= 0.66) return bar.gradientColors.mid;
  return bar.gradientColors.high;
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
