import { describe, expect, it } from 'vitest';
import {
  DEFAULT_STAT,
  DEFAULT_STAT_LABELS,
  MAX_STAT,
  STAT_COUNT,
  clampStat,
  readStats,
  statAbbr,
} from './stats';

describe('statistiche', () => {
  it('sono sei, con sei nomi predefiniti', () => {
    expect(STAT_COUNT).toBe(6);
    expect(DEFAULT_STAT_LABELS).toHaveLength(6);
  });

  it('clampStat resta nei limiti e ripara i valori assurdi', () => {
    expect(clampStat(14)).toBe(14);
    expect(clampStat(-5)).toBe(0);
    expect(clampStat(9999)).toBe(MAX_STAT);
    expect(clampStat(NaN)).toBe(DEFAULT_STAT);
    expect(clampStat(12.7)).toBe(13);
  });

  it('readStats riempie sempre sei valori, i mancanti col default', () => {
    expect(readStats(undefined)).toEqual(Array(6).fill(DEFAULT_STAT));
    expect(readStats([16, 12])).toEqual([16, 12, 10, 10, 10, 10]);
    // Anche i valori fuori scala vengono riportati dentro.
    expect(readStats([999, -3, 8, 8, 8, 8])).toEqual([MAX_STAT, 0, 8, 8, 8, 8]);
  });

  it('statAbbr prende le prime tre lettere in maiuscolo', () => {
    expect(statAbbr('Forza')).toBe('FOR');
    expect(statAbbr('Destrezza')).toBe('DES');
    expect(statAbbr('')).toBe('—');
  });
});
