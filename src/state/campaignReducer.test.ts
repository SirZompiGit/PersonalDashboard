import { describe, expect, it } from 'vitest';
import { campaignReducer } from './campaignReducer';
import { createSeedCampaign } from './defaults';
import { MAX_ROLL_HISTORY } from './migrations';

const seed = () => createSeedCampaign();

describe('giocatori', () => {
  it('rimuovendo il giocatore di turno azzera anche il turno', () => {
    const state = seed();
    const target = state.players[1];

    const withTurn = campaignReducer(state, { type: 'SET_ACTIVE_PLAYER', id: target.id });
    const removed = campaignReducer(withTurn, { type: 'REMOVE_PLAYER', id: target.id });

    expect(removed.players).toHaveLength(2);
    expect(removed.activePlayerId).toBeNull();
  });

  it('annullando la rimozione lo rimette nella posizione originale', () => {
    const state = seed();
    const player = state.players[1];

    const removed = campaignReducer(state, { type: 'REMOVE_PLAYER', id: player.id });
    const restored = campaignReducer(removed, { type: 'INSERT_PLAYER', player, index: 1 });

    expect(restored.players).toHaveLength(3);
    expect(restored.players[1].id).toBe(player.id);
  });

  it('ignora un riordino fuori intervallo invece di corrompere la lista', () => {
    const state = seed();
    expect(campaignReducer(state, { type: 'REORDER_PLAYERS', from: 0, to: 99 })).toBe(state);
  });
});

describe('barre della vita', () => {
  it('non lascia gli HP correnti sopra il massimo', () => {
    const state = seed();
    const id = state.healthBars[0].id;

    const over = campaignReducer(state, {
      type: 'UPDATE_HEALTH_BAR',
      id,
      changes: { currentValue: 5000 },
    });
    expect(over.healthBars[0].currentValue).toBe(over.healthBars[0].maxValue);

    const shrunk = campaignReducer(state, {
      type: 'UPDATE_HEALTH_BAR',
      id,
      changes: { maxValue: 10 },
    });
    expect(shrunk.healthBars[0].currentValue).toBeLessThanOrEqual(10);
  });

  it('annullando la cancellazione la rimette dov era', () => {
    const state = seed();
    const bar = state.healthBars[0];

    const deleted = campaignReducer(state, { type: 'DELETE_HEALTH_BAR', id: bar.id });
    const restored = campaignReducer(deleted, { type: 'INSERT_HEALTH_BAR', bar, index: 0 });

    expect(restored.healthBars[0].id).toBe(bar.id);
  });
});

describe('gruppi', () => {
  it('rinominando un gruppo aggiorna anche le barre che vi appartengono', () => {
    const state = seed();
    const renamed = campaignReducer(state, { type: 'RENAME_GROUP', from: 'Nemici', to: 'Orde' });
    expect(renamed.healthBars.filter((b) => b.group === 'Orde')).toHaveLength(2);
  });

  it('eliminando un gruppo scollega le barre, e annullare le riassegna', () => {
    const state = seed();
    const barIds = state.healthBars.filter((b) => b.group === 'Nemici').map((b) => b.id);

    const deleted = campaignReducer(state, { type: 'DELETE_GROUP', group: 'Nemici' });
    expect(deleted.healthGroups).not.toContain('Nemici');
    expect(deleted.healthBars.every((b) => b.group !== 'Nemici')).toBe(true);

    const restored = campaignReducer(deleted, {
      type: 'RESTORE_GROUP',
      group: 'Nemici',
      index: 0,
      barIds,
    });
    expect(restored.healthGroups[0]).toBe('Nemici');
    expect(barIds.every((id) => restored.healthBars.find((b) => b.id === id)?.group === 'Nemici'))
      .toBe(true);
  });
});

describe('storico dei lanci', () => {
  it('tiene solo gli ultimi, con il piu recente in testa', () => {
    let state = seed();
    for (let i = 0; i < MAX_ROLL_HISTORY + 5; i++) {
      state = campaignReducer(state, {
        type: 'ROLL',
        roll: { diceType: 'd20', result: (i % 20) + 1, timestamp: i },
      });
    }

    expect(state.rollHistory).toHaveLength(MAX_ROLL_HISTORY);
    expect(state.rollHistory[0].timestamp).toBe(MAX_ROLL_HISTORY + 4);
    expect(state.lastRoll?.timestamp).toBe(MAX_ROLL_HISTORY + 4);
  });
});

describe('azioni senza effetto', () => {
  it('restituiscono lo stesso oggetto, cosi non sporcano la cronologia', () => {
    const state = seed();
    expect(campaignReducer(state, { type: 'SET_TITLE', title: '   ' })).toBe(state);
    expect(campaignReducer(state, { type: 'ADD_PLAYER', name: '  ' })).toBe(state);
    expect(campaignReducer(state, { type: 'ADD_GROUP', group: 'Nemici' })).toBe(state);
  });
});

describe('risorse delle barre', () => {
  /** Barra con due risorse, come la creerebbe il form. */
  const withResources = () => {
    const state = campaignReducer(seed(), {
      type: 'ADD_HEALTH_BAR',
      bar: {
        name: 'Arcimago',
        maxValue: 60,
        currentValue: 60,
        colorMode: 'static',
        staticColor: '#10b981',
        gradientColors: { low: '#ef4444', mid: '#f59e0b', high: '#10b981' },
        resources: [
          {
            id: 'mana',
            name: 'Mana',
            maxValue: 40,
            currentValue: 40,
            colorMode: 'static',
            staticColor: '#3b82f6',
            gradientColors: { low: '#ef4444', mid: '#f59e0b', high: '#10b981' },
            shared: true,
          },
          {
            id: 'frenesia',
            name: 'Frenesia',
            maxValue: 6,
            currentValue: 0,
            colorMode: 'static',
            staticColor: '#a855f7',
            gradientColors: { low: '#ef4444', mid: '#f59e0b', high: '#10b981' },
            shared: false,
          },
        ],
      },
    });

    return { state, bar: state.healthBars.at(-1)! };
  };

  it('le conserva alla creazione', () => {
    const { bar } = withResources();
    expect(bar.resources?.map((r) => r.name)).toEqual(['Mana', 'Frenesia']);
  });

  it('cambia solo la risorsa indicata', () => {
    const { state, bar } = withResources();
    const next = campaignReducer(state, {
      type: 'SET_RESOURCE_VALUE',
      barId: bar.id,
      resourceId: 'mana',
      value: 12,
    });

    const updated = next.healthBars.find((b) => b.id === bar.id)!;
    expect(updated.resources?.[0].currentValue).toBe(12);
    expect(updated.resources?.[1].currentValue).toBe(0);
    // Gli HP non si toccano: sono un'altra barra.
    expect(updated.currentValue).toBe(60);
  });

  it('applica il massimo della risorsa, non quello della barra', () => {
    const { state, bar } = withResources();
    const next = campaignReducer(state, {
      type: 'SET_RESOURCE_VALUE',
      barId: bar.id,
      resourceId: 'frenesia',
      value: 50,
    });

    expect(next.healthBars.find((b) => b.id === bar.id)!.resources?.[1].currentValue).toBe(6);
  });

  it('non registra nulla quando il valore non cambia', () => {
    const { state, bar } = withResources();

    for (const action of [
      { resourceId: 'mana', value: 40 },
      { resourceId: 'inesistente', value: 3 },
    ]) {
      expect(
        campaignReducer(state, { type: 'SET_RESOURCE_VALUE', barId: bar.id, ...action }),
      ).toBe(state);
    }

    expect(
      campaignReducer(state, {
        type: 'SET_RESOURCE_VALUE',
        barId: 'barra-inesistente',
        resourceId: 'mana',
        value: 3,
      }),
    ).toBe(state);
  });

  it('svuotando la lista toglie la chiave, invece di lasciarla indefinita', () => {
    const { state, bar } = withResources();
    const next = campaignReducer(state, {
      type: 'UPDATE_HEALTH_BAR',
      id: bar.id,
      changes: { resources: undefined },
    });

    expect(next.healthBars.find((b) => b.id === bar.id)!).not.toHaveProperty('resources');
  });
});
