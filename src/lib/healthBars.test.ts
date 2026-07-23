import { describe, expect, it } from 'vitest';
import type { HealthBar, Resource } from '../types';
import {
  MAX_RESOURCES,
  MAX_STATUS_EFFECTS,
  SEGMENT_THRESHOLD,
  THIN_SEGMENT_THRESHOLD,
  clampMaxHp,
  clampResources,
  clampStatusEffects,
  getBarColor,
  groupBars,
  healthRatio,
  isLowHp,
} from './healthBars';
import type { StatusEffect } from '../types';

const bar = (over: Partial<HealthBar> = {}): HealthBar => ({
  id: 'x',
  name: 'Prova',
  maxValue: 100,
  currentValue: 50,
  colorMode: 'static',
  staticColor: '#000000',
  gradientColors: { low: '#ff0000', mid: '#00ff00', high: '#0000ff' },
  ...over,
});

describe('getBarColor', () => {
  it('in modalita statica ignora la percentuale', () => {
    expect(getBarColor(bar({ currentValue: 1 }))).toBe('#000000');
    expect(getBarColor(bar({ currentValue: 99 }))).toBe('#000000');
  });

  it('a soglie sceglie il livello per fascia', () => {
    const g = (currentValue: number) => getBarColor(bar({ colorMode: 'gradient', currentValue }));
    expect(g(20)).toBe('#ff0000');
    expect(g(50)).toBe('#00ff00');
    expect(g(90)).toBe('#0000ff');
  });

  it('sfumato attraversa i tre colori con continuita', () => {
    const s = (currentValue: number) => getBarColor(bar({ colorMode: 'smooth', currentValue }));
    expect(s(0)).toBe('#ff0000');
    expect(s(50)).toBe('#00ff00');
    expect(s(100)).toBe('#0000ff');
    // A meta strada fra basso e medio
    expect(s(25)).toBe('#808000');
  });

  it('sfumato non fa salti bruschi, a soglie li conserva', () => {
    const distance = (a: string, b: string) => {
      const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
      const [r1, g1, b1] = parse(a);
      const [r2, g2, b2] = parse(b);
      return Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
    };

    const maxJump = (mode: HealthBar['colorMode']) => {
      let max = 0;
      for (let v = 0; v < 100; v++) {
        max = Math.max(
          max,
          distance(
            getBarColor(bar({ colorMode: mode, currentValue: v })),
            getBarColor(bar({ colorMode: mode, currentValue: v + 1 })),
          ),
        );
      }
      return max;
    };

    expect(maxJump('smooth')).toBeLessThan(25);
    expect(maxJump('gradient')).toBeGreaterThan(200);
  });

  it('accetta anche i colori a tre cifre', () => {
    const short = bar({
      colorMode: 'smooth',
      currentValue: 0,
      gradientColors: { low: '#f00', mid: '#0f0', high: '#00f' },
    });
    expect(getBarColor(short)).toBe('#ff0000');
  });
});

describe('healthRatio', () => {
  it('non divide per zero', () => {
    expect(healthRatio({ currentValue: 5, maxValue: 0 })).toBe(0);
  });
});

describe('clampMaxHp', () => {
  it('limita il massimo, che l input testuale non faceva', () => {
    expect(clampMaxHp(100000)).toBe(999);
    expect(clampMaxHp(0)).toBe(1);
    expect(clampMaxHp(NaN)).toBe(1);
  });
});

describe('isLowHp', () => {
  const low = bar({ maxValue: 100, currentValue: 20 });

  it('scatta sotto un quarto dei punti ferita', () => {
    expect(isLowHp(low)).toBe(true);
    expect(isLowHp({ ...low, currentValue: 25 })).toBe(true);
    expect(isLowHp({ ...low, currentValue: 26 })).toBe(false);
  });

  it('tace a zero, dove c e gia l etichetta DEFUNTO', () => {
    expect(isLowHp({ ...low, currentValue: 0 })).toBe(false);
  });

  it('rispetta l interruttore della singola barra', () => {
    expect(isLowHp({ ...low, lowHpAlert: false })).toBe(false);
    // Assente significa attivo: le barre create prima devono comportarsi
    // come quelle nuove.
    expect(isLowHp({ ...low, lowHpAlert: undefined })).toBe(true);
  });
});

const resource = (over: Partial<Resource> = {}): Resource => ({
  id: 'r',
  name: 'Mana',
  maxValue: 50,
  currentValue: 25,
  colorMode: 'static',
  staticColor: '#3b82f6',
  gradientColors: { low: '#ff0000', mid: '#00ff00', high: '#0000ff' },
  shared: true,
  ...over,
});

/**
 * Le risorse hanno le stesse tre modalità di colore della barra della vita, e
 * ci passano attraverso la stessa funzione: se un giorno smettesse di accettare
 * la loro forma, mana e scudo diventerebbero grigi in silenzio.
 */
describe('getBarColor sulle risorse', () => {
  it('vale anche per una risorsa, che non è una HealthBar', () => {
    expect(getBarColor(resource({ colorMode: 'static' }))).toBe('#3b82f6');
    expect(getBarColor(resource({ colorMode: 'gradient', currentValue: 5 }))).toBe('#ff0000');
    expect(getBarColor(resource({ colorMode: 'smooth', currentValue: 50 }))).toBe('#0000ff');
  });
});

describe('soglia dei segmenti', () => {
  /**
   * Su una traccia da dieci pixel cinquanta tacche diventano una zebratura in
   * cui non si distingue il pieno dal vuoto: le risorse devono passare al
   * riempimento continuo molto prima della barra della vita.
   */
  it('è molto più bassa sulle tracce sottili', () => {
    expect(THIN_SEGMENT_THRESHOLD).toBeLessThan(SEGMENT_THRESHOLD);
    // Slot incantesimo, cariche d'ira e pile di scudo restano contabili.
    expect(THIN_SEGMENT_THRESHOLD).toBeGreaterThanOrEqual(9);
  });
});

describe('clampResources', () => {
  it('non ne accetta più di due', () => {
    const list = clampResources([
      resource({ id: 'a' }),
      resource({ id: 'b' }),
      resource({ id: 'c' }),
    ]);
    expect(list).toHaveLength(MAX_RESOURCES);
    expect(list?.map((r) => r.id)).toEqual(['a', 'b']);
  });

  it('riporta i valori entro i limiti della risorsa', () => {
    const [only] = clampResources([resource({ currentValue: 999, maxValue: 30 })]) ?? [];
    expect(only.currentValue).toBe(30);

    const [huge] = clampResources([resource({ maxValue: 100000 })]) ?? [];
    expect(huge.maxValue).toBe(999);
  });

  /**
   * L'assenza non è un dettaglio: una barra senza risorse deve serializzarsi
   * esattamente come prima che le risorse esistessero, altrimenti ogni campagna
   * già salvata cambierebbe forma al primo caricamento.
   */
  it('sparisce del tutto invece di restare una lista vuota', () => {
    expect(clampResources([])).toBeUndefined();
    expect(clampResources(undefined)).toBeUndefined();
  });
});

describe('clampStatusEffects', () => {
  const effect = (over: Partial<StatusEffect> = {}): StatusEffect => ({
    id: 'e',
    name: 'Avvelenato',
    color: '#a855f7',
    shared: true,
    ...over,
  });

  it('non ne tiene più di cinque', () => {
    const list = clampStatusEffects(Array.from({ length: 8 }, (_, i) => effect({ id: `e${i}` })));
    expect(list).toHaveLength(MAX_STATUS_EFFECTS);
  });

  it('sparisce del tutto quando non ce ne sono', () => {
    expect(clampStatusEffects([])).toBeUndefined();
    expect(clampStatusEffects(undefined)).toBeUndefined();
  });
});

describe('groupBars', () => {
  it('esclude i gruppi vuoti e rispetta l ordine scelto', () => {
    const { groups, ungrouped } = groupBars(
      [
        bar({ id: 'a', group: 'Nemici' }),
        bar({ id: 'b', group: 'Sparito' }),
        bar({ id: 'c' }),
        bar({ id: 'd', group: 'Alleati' }),
      ],
      ['Nemici', 'Alleati', 'Vuoto'],
    );

    expect(groups.map((g) => g.name)).toEqual(['Nemici', 'Alleati']);
    // Chi ha un gruppo che non esiste piu finisce fra le non raggruppate.
    expect(ungrouped).toHaveLength(2);
  });
});
