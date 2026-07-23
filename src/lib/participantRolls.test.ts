import { describe, expect, it } from 'vitest';
import type { RollResult } from '../types';
import { decodeRollLabel, encodeRollLabel, isOwnRoll, latestPerRoller } from './participantRolls';

/**
 * Il formato dell'etichetta è quello del database e NON deve cambiare: le
 * stanze esistenti devono restare leggibili senza migrazioni.
 */
describe('formato sul database', () => {
  it('resta esattamente userId|nome|etichetta', () => {
    expect(encodeRollLabel('user_abc123', 'Marco', 'Tiro salvezza')).toBe(
      'user_abc123|Marco|Tiro salvezza',
    );
  });

  it('omette l etichetta quando non c e', () => {
    expect(encodeRollLabel('user_a', 'Marco')).toBe('user_a|Marco');
  });

  it('fa il giro completo senza perdite', () => {
    const decoded = decodeRollLabel(encodeRollLabel('user_a', 'Marco', 'Danno'));
    expect(decoded).toEqual({ userId: 'user_a', userName: 'Marco', label: 'Danno' });
  });
});

describe('robustezza del formato', () => {
  it('un nome con | non rompe piu l attribuzione', () => {
    const decoded = decodeRollLabel(encodeRollLabel('user_x', 'Ma|rco', 'Attacco'));
    expect(decoded.userId).toBe('user_x');
    expect(decoded.label).toBe('Attacco');
  });

  it('conserva le barre verticali dentro l etichetta', () => {
    expect(decodeRollLabel('user_a|Nome|Danno|extra').label).toBe('Danno|extra');
  });

  it('legge le etichette semplici delle stanze piu vecchie', () => {
    expect(decodeRollLabel('Percezione')).toEqual({
      userId: null,
      userName: null,
      label: 'Percezione',
    });
  });

  it('gestisce l assenza di etichetta', () => {
    expect(decodeRollLabel(undefined).label).toBe('');
    expect(decodeRollLabel(null).label).toBe('');
  });
});

describe('selezione dei lanci', () => {
  const rolls: RollResult[] = [
    { diceType: 'd20', result: 5, timestamp: 3, label: 'user_a|A|x' },
    { diceType: 'd20', result: 9, timestamp: 2, label: 'user_b|B|y' },
    { diceType: 'd20', result: 1, timestamp: 1, label: 'user_a|A|z' },
  ];

  it('tiene un solo lancio per giocatore, il piu recente', () => {
    const latest = latestPerRoller(rolls);
    expect(latest).toHaveLength(2);
    expect(latest[0].timestamp).toBe(3);
  });

  it('riconosce i lanci propri', () => {
    expect(isOwnRoll(rolls[0], 'user_a')).toBe(true);
    expect(isOwnRoll(rolls[1], 'user_a')).toBe(false);
  });
});
