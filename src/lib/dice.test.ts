import { describe, expect, it } from 'vitest';
import {
  DICE_TYPES,
  MAX_DICE_COUNT,
  isCritical,
  isFumble,
  parseSides,
  rollAdvantage,
  rollDie,
  rollDisadvantage,
  rollMultiple,
  rollSingle,
  scoresCrit,
} from './dice';

describe('parseSides', () => {
  it('legge il numero di facce', () => {
    expect(parseSides('d20')).toBe(20);
    expect(parseSides('d3')).toBe(3);
  });

  it('restituisce 0 su input non validi invece di NaN', () => {
    expect(parseSides('xyz')).toBe(0);
    expect(parseSides('')).toBe(0);
    expect(parseSides(null)).toBe(0);
    expect(parseSides(undefined)).toBe(0);
  });
});

describe('esiti', () => {
  it('riconosce il critico solo sul massimo del dado giusto', () => {
    expect(isCritical(20, 'd20')).toBe(true);
    expect(isCritical(20, 'd100')).toBe(false);
    expect(isCritical(6, 'd6')).toBe(true);
  });

  it('riconosce il fallimento sull uno naturale', () => {
    expect(isFumble(1, 'd20')).toBe(true);
    expect(isFumble(2, 'd20')).toBe(false);
  });
});

describe('d2', () => {
  it('è tra i dadi selezionabili e vale due facce', () => {
    expect(DICE_TYPES).toContain('d2');
    expect(parseSides('d2')).toBe(2);
  });

  it('esce solo 1 o 2', () => {
    for (let i = 0; i < 200; i++) {
      expect([1, 2]).toContain(rollDie('d2'));
    }
  });
});

describe('Dado+', () => {
  it('il tiro singolo non porta né modalità né dettaglio', () => {
    const roll = rollSingle('d20');
    expect(roll.mode).toBeUndefined();
    expect(roll.detail).toBeUndefined();
    expect(roll.result).toBeGreaterThanOrEqual(1);
  });

  it('il vantaggio tiene il più alto dei due', () => {
    for (let i = 0; i < 200; i++) {
      const roll = rollAdvantage('d20');
      expect(roll.mode).toBe('advantage');
      const [a, b] = roll.detail!.split(' / ').map(Number);
      expect(roll.result).toBe(Math.max(a, b));
      expect(a).toBeGreaterThanOrEqual(b);
    }
  });

  it('lo svantaggio tiene il più basso dei due', () => {
    for (let i = 0; i < 200; i++) {
      const roll = rollDisadvantage('d20');
      expect(roll.mode).toBe('disadvantage');
      const [a, b] = roll.detail!.split(' / ').map(Number);
      expect(roll.result).toBe(Math.min(a, b));
      expect(a).toBeLessThanOrEqual(b);
    }
  });

  it('i dadi multipli sommano e restano nell intervallo', () => {
    for (let i = 0; i < 200; i++) {
      const roll = rollMultiple('d6', 3);
      expect(roll.mode).toBe('sum');
      const dice = roll.detail!.split(' + ').map(Number);
      expect(dice).toHaveLength(3);
      expect(roll.result).toBe(dice.reduce((s, v) => s + v, 0));
      expect(roll.result).toBeGreaterThanOrEqual(3);
      expect(roll.result).toBeLessThanOrEqual(18);
    }
  });

  it('un solo dado multiplo è un tiro singolo, senza modalità', () => {
    const roll = rollMultiple('d20', 1);
    expect(roll.mode).toBeUndefined();
  });

  it('limita il numero di dadi', () => {
    const roll = rollMultiple('d6', 999);
    expect(roll.detail!.split(' + ')).toHaveLength(MAX_DICE_COUNT);
  });

  it('la somma non fa critico, il tiro a faccia singola sì', () => {
    expect(scoresCrit('sum')).toBe(false);
    expect(scoresCrit('advantage')).toBe(true);
    expect(scoresCrit('disadvantage')).toBe(true);
    expect(scoresCrit(undefined)).toBe(true);
  });
});

describe('rollDie', () => {
  it('resta sempre entro le facce del dado', () => {
    for (const type of DICE_TYPES) {
      const sides = parseSides(type);
      for (let i = 0; i < 500; i++) {
        const value = rollDie(type);
        expect(value).toBeGreaterThanOrEqual(1);
        expect(value).toBeLessThanOrEqual(sides);
      }
    }
  });

  it('copre tutte le facce e le distribuisce in modo uniforme', () => {
    const counts = new Map<number, number>();
    const rolls = 24000;

    for (let i = 0; i < rolls; i++) {
      const value = rollDie('d6');
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }

    expect([...counts.keys()].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6]);

    // Il generatore rifiuta la coda non divisibile: senza quel accorgimento i
    // valori bassi uscirebbero leggermente piu spesso.
    const values = [...counts.values()];
    const spread = (Math.max(...values) - Math.min(...values)) / (rolls / 6);
    expect(spread).toBeLessThan(0.2);
  });
});
