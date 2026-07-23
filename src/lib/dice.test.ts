import { describe, expect, it } from 'vitest';
import { DICE_TYPES, isCritical, isFumble, parseSides, rollDie } from './dice';

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
