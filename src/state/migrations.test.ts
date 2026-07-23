import { describe, expect, it } from 'vitest';
import {
  migrateStoredState,
  normalizeCampaign,
  parseImportedCampaign,
  serializeState,
} from './migrations';

/**
 * Prima l'import controllava solo `title` e `players` e poi salvava tutto: un
 * file senza `healthBars` faceva esplodere il render successivo, e lo stato
 * corrotto era già in localStorage — l'app non si riapriva più.
 */
describe('normalizeCampaign non lancia mai', () => {
  const junk: unknown[] = [
    null,
    undefined,
    42,
    'stringa',
    [],
    {},
    { title: 'X' },
    { title: 'X', players: null, healthBars: null },
    { title: 'X', players: [null, 3, { name: '' }] },
    { title: 'X', healthBars: [{ nope: 1 }] },
    { title: 'X', rollHistory: [{ diceType: 'nope' }] },
    { title: 'X', theme: 'inesistente', style: 42 },
  ];

  it.each(junk.map((input, i) => [i, input]))(
    'input malformato #%i produce comunque una campagna valida',
    (_index, input) => {
      const state = normalizeCampaign(input);
      expect(Array.isArray(state.players)).toBe(true);
      expect(Array.isArray(state.healthBars)).toBe(true);
      expect(Array.isArray(state.rollHistory)).toBe(true);
      expect(typeof state.title).toBe('string');
    },
  );
});

describe('normalizeCampaign applica i limiti', () => {
  it('taglia un massimo HP fuori scala', () => {
    const state = normalizeCampaign({
      title: 'X',
      healthBars: [{ name: 'Boss', maxValue: 999999, currentValue: -5 }],
    });
    expect(state.healthBars[0].maxValue).toBe(999);
    expect(state.healthBars[0].currentValue).toBe(0);
  });

  it('azzera un giocatore attivo che non esiste piu', () => {
    expect(normalizeCampaign({ title: 'X', activePlayerId: 'fantasma' }).activePlayerId).toBeNull();
  });

  it('scarta i lanci non validi e tiene quelli buoni', () => {
    const state = normalizeCampaign({
      title: 'X',
      rollHistory: [{ diceType: 'nope' }, { diceType: 'd20', result: 20, timestamp: 1 }],
    });
    expect(state.rollHistory).toHaveLength(1);
  });

  it('attiva l allerta sulle barre create prima che esistesse', () => {
    const state = normalizeCampaign({
      title: 'X',
      healthBars: [{ name: 'Vecchia', maxValue: 10, currentValue: 5 }],
    });
    expect(state.healthBars[0].lowHpAlert).toBe(true);
  });

  it('conserva una disattivazione esplicita', () => {
    const state = normalizeCampaign({
      title: 'X',
      healthBars: [{ name: 'Spenta', maxValue: 10, currentValue: 5, lowHpAlert: false }],
    });
    expect(state.healthBars[0].lowHpAlert).toBe(false);
  });

  it('accetta le tre modalita colore e rifiuta le altre', () => {
    const mode = (colorMode: unknown) =>
      normalizeCampaign({ title: 'X', healthBars: [{ name: 'B', colorMode }] }).healthBars[0]
        .colorMode;

    expect(mode('gradient')).toBe('gradient');
    expect(mode('smooth')).toBe('smooth');
    expect(mode('arcobaleno')).toBe('static');
  });
});

/**
 * Le risorse arrivano dalle stesse tre sorgenti della barra che le contiene, e
 * una di queste è il database: il master può avere una versione più recente di
 * un giocatore, o viceversa. Nessun dato malformato deve poter rompere la vista
 * di chi legge.
 */
describe('risorse delle barre', () => {
  const withResources = (resources: unknown) =>
    normalizeCampaign({
      title: 'X',
      healthBars: [{ name: 'Boss', maxValue: 100, currentValue: 100, resources }],
    }).healthBars[0];

  it('conserva quelle valide con valori e colori propri', () => {
    const bar = withResources([
      { id: 'm', name: 'Mana', maxValue: 40, currentValue: 12, colorMode: 'smooth' },
    ]);

    expect(bar.resources).toHaveLength(1);
    expect(bar.resources?.[0]).toMatchObject({
      id: 'm',
      name: 'Mana',
      maxValue: 40,
      currentValue: 12,
      colorMode: 'smooth',
    });
  });

  it('non ne tiene più di due', () => {
    const bar = withResources([
      { name: 'Uno' },
      { name: 'Due' },
      { name: 'Tre' },
      { name: 'Quattro' },
    ]);
    expect(bar.resources).toHaveLength(2);
  });

  it('scarta quelle senza nome o non leggibili, senza lanciare', () => {
    const bar = withResources([null, 42, 'testo', { name: '   ' }, { name: 'Scudo' }]);
    expect(bar.resources).toHaveLength(1);
    expect(bar.resources?.[0].name).toBe('Scudo');
  });

  it('riporta i valori entro i limiti della singola risorsa', () => {
    const bar = withResources([{ name: 'Frenesia', maxValue: 10, currentValue: 999 }]);
    expect(bar.resources?.[0].currentValue).toBe(10);
  });

  it('è visibile ai giocatori salvo esclusione esplicita', () => {
    expect(withResources([{ name: 'Mana' }]).resources?.[0].shared).toBe(true);
    expect(withResources([{ name: 'Mana', shared: false }]).resources?.[0].shared).toBe(false);
  });

  /**
   * Il vincolo di compatibilità: una barra senza risorse deve riserializzarsi
   * identica a com'era prima che le risorse esistessero, altrimenti ogni stanza
   * già aperta cambierebbe forma alla prima scrittura.
   */
  it('resta assente quando non ce ne sono, invece di essere una lista vuota', () => {
    for (const input of [undefined, [], 'niente', {}, [null]]) {
      expect(withResources(input)).not.toHaveProperty('resources');
    }
  });

  it('una barra senza risorse produce lo stesso JSON di una campagna precedente', () => {
    const before = normalizeCampaign({
      title: 'X',
      healthBars: [{ id: 'b', name: 'Goblin', maxValue: 7, currentValue: 7 }],
    });
    const after = normalizeCampaign(JSON.parse(JSON.stringify(before)));
    expect(JSON.stringify(after)).toBe(JSON.stringify(before));
  });
});

describe('effetti di stato', () => {
  const withEffects = (statusEffects: unknown) =>
    normalizeCampaign({
      title: 'X',
      healthBars: [{ name: 'Goblin', maxValue: 10, currentValue: 10, statusEffects }],
    }).healthBars[0];

  it('conserva quelli validi con nome e colore', () => {
    const bar = withEffects([{ id: 'p', name: 'Avvelenato', color: '#22c55e' }]);
    expect(bar.statusEffects).toHaveLength(1);
    expect(bar.statusEffects?.[0]).toMatchObject({ name: 'Avvelenato', color: '#22c55e' });
  });

  it('non ne tiene più di cinque e scarta i malformati', () => {
    const bar = withEffects([
      null,
      { name: '' },
      { name: 'A' },
      { name: 'B' },
      { name: 'C' },
      { name: 'D' },
      { name: 'E' },
      { name: 'F' },
    ]);
    expect(bar.statusEffects).toHaveLength(5);
  });

  it('resta assente quando non ce ne sono', () => {
    for (const input of [undefined, [], 'niente', [null]]) {
      expect(withEffects(input)).not.toHaveProperty('statusEffects');
    }
  });
});

describe('statistiche del personaggio', () => {
  const withStats = (stats: unknown) =>
    normalizeCampaign({
      title: 'X',
      players: [{ id: 'p1', name: 'Eroe', stats }],
    }).players[0];

  it('porta sempre a sei valori, riportati nei limiti', () => {
    const player = withStats([16, 999, -3]);
    expect(player.stats).toEqual([16, 99, 0, 10, 10, 10]);
  });

  it('resta assente quando il personaggio non ne ha', () => {
    for (const input of [undefined, 'niente', {}]) {
      expect(withStats(input)).not.toHaveProperty('stats');
    }
  });
});

describe('statistiche di campagna', () => {
  it('partono spente e con sei etichette predefinite', () => {
    const state = normalizeCampaign({ title: 'X' });
    expect(state.statsEnabled).toBe(false);
    expect(state.statLabels).toHaveLength(6);
    expect(state.statLabels[0]).toBe('Forza');
  });

  it('rispetta i valori salvati e i nomi rinominati', () => {
    const state = normalizeCampaign({
      title: 'X',
      statsEnabled: true,
      statLabels: ['Vigore', '', 'Tempra'],
    });
    expect(state.statsEnabled).toBe(true);
    // Il vuoto torna al predefinito, i mancanti pure.
    expect(state.statLabels).toEqual([
      'Vigore',
      'Destrezza',
      'Tempra',
      'Intelligenza',
      'Saggezza',
      'Carisma',
    ]);
  });
});

describe('formati salvati', () => {
  it('legge il formato senza involucro delle versioni precedenti', () => {
    const legacy = JSON.stringify({
      title: 'Campagna storica',
      players: [{ id: 'p1', name: 'Kaelen', inventory: [], bonus: [] }],
      theme: 'emerald',
      healthGroups: ['Nemici'],
    });

    const state = migrateStoredState(legacy);
    expect(state?.title).toBe('Campagna storica');
    expect(state?.theme).toBe('emerald');
    expect(state?.healthGroups[0]).toBe('Nemici');
    // Il design non esisteva ancora: ricade sul predefinito senza perdite.
    expect(state?.style).toBe('grimorio');
  });

  it('fa il giro completo con l involucro versionato', () => {
    const original = normalizeCampaign({ title: 'Mia campagna' });
    const restored = migrateStoredState(serializeState(original));
    expect(restored?.title).toBe('Mia campagna');
    expect(JSON.parse(serializeState(original)).v).toBe(2);
  });

  it('restituisce null su dati illeggibili invece di lanciare', () => {
    expect(migrateStoredState('{rotto')).toBeNull();
    expect(migrateStoredState(null)).toBeNull();
    expect(migrateStoredState('[]')).toBeNull();
  });
});

describe('parseImportedCampaign', () => {
  it('accetta un file valido', () => {
    expect(parseImportedCampaign('{"title":"Ok","players":[]}').ok).toBe(true);
  });

  it('rifiuta con un messaggio leggibile', () => {
    expect(parseImportedCampaign('non json').error).toBeTruthy();
    expect(parseImportedCampaign('{"players":[]}').ok).toBe(false);
  });
});
