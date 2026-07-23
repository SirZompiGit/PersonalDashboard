import { describe, expect, it } from 'vitest';
import { DICE_PROFILES, centroid, inradius, parsePoints } from './DiceShape';
import { DICE_TYPES, parseSides } from '../lib/dice';

const geometry = (points: string) => {
  const parsed = parsePoints(points);
  const center = centroid(parsed);
  return { center, radius: inradius(parsed, center) };
};

describe('profili', () => {
  it('ogni dado selezionabile ha la propria sagoma', () => {
    for (const type of DICE_TYPES) {
      expect(DICE_PROFILES[parseSides(type)]).toBeTruthy();
    }
  });

  it('tutti i vertici stanno dentro il riquadro di disegno', () => {
    for (const points of Object.values(DICE_PROFILES)) {
      for (const [x, y] of parsePoints(points)) {
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(100);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(y).toBeLessThanOrEqual(100);
      }
    }
  });
});

/**
 * Centrare il numero a 50,50 funziona solo sulle sagome simmetriche: in un
 * triangolo finirebbe troppo in alto, fuori dalla massa della forma. Lo stesso
 * punto è anche l'origine della rotazione, che altrimenti girava fuori asse.
 */
describe('baricentro', () => {
  it('resta al centro esatto sulle sagome simmetriche', () => {
    for (const sides of [6, 8, 20]) {
      const { center } = geometry(DICE_PROFILES[sides]);
      expect(center.x).toBeCloseTo(50, 1);
      expect(center.y).toBeCloseTo(50, 1);
    }
  });

  it('scende sotto la meta nei triangoli', () => {
    for (const sides of [3, 4]) {
      const { center } = geometry(DICE_PROFILES[sides]);
      expect(center.x).toBeCloseTo(50, 1);
      expect(center.y).toBeGreaterThan(55);
    }
  });
});

/**
 * Il raggio inscritto è lo spazio davvero utilizzabile dal numero. Dimensionare
 * il testo per numero di cifre non bastava: un triangolo ha quasi la metà dello
 * spazio di un quadrato, e il numero ne usciva.
 */
describe('raggio inscritto', () => {
  it('e positivo e plausibile per ogni sagoma', () => {
    for (const points of Object.values(DICE_PROFILES)) {
      const { radius } = geometry(points);
      expect(radius).toBeGreaterThan(10);
      expect(radius).toBeLessThan(50);
    }
  });

  it('nei triangoli e nettamente minore che nel quadrato', () => {
    const square = geometry(DICE_PROFILES[6]).radius;
    const triangle = geometry(DICE_PROFILES[4]).radius;
    expect(triangle).toBeLessThan(square * 0.8);
  });

  it('il riquadro del testo sta dentro il cerchio inscritto', () => {
    // I fattori usati dal componente per limitare il testo.
    const maxWidth = 1.45;
    const maxHeight = 1.15;
    const diagonal = Math.hypot(maxWidth, maxHeight);
    // Deve restare sotto il diametro del cerchio, con un margine dal bordo.
    expect(diagonal).toBeLessThan(2);
  });
});
