/**
 * Tutte le mutazioni della campagna in un posto solo.
 *
 * Prima erano 20+ handler `setState(prev => ...)` inline in App.tsx, ciascuno
 * con la propria copia dei valori di default (`prev.diceLabels || ['Tiro salvezza', ...]`
 * era ripetuto quattro volte, con la lista riscritta ogni volta).
 *
 * Le azioni di inserimento (`INSERT_PLAYER`, `INSERT_HEALTH_BAR`, `RESTORE_GROUP`)
 * esistono per l'annullamento delle cancellazioni: ripristinano l'elemento
 * esattamente dov'era, senza sovrascrivere le altre modifiche fatte nel
 * frattempo — cosa che invece accadrebbe rimpiazzando l'intero stato.
 */

import type { CampaignState, HealthBar, Player, RollResult } from '../types';
import type { CampaignStyle, CampaignTheme, LogoVariant } from '../theme';
import { MAX_ROLL_HISTORY, normalizeCampaign } from './migrations';
import { DEFAULT_STAT_LABELS } from '../lib/stats';
import { createEmptyCampaign } from './defaults';
import { clampHp, clampMaxHp, clampResources, clampStatusEffects } from '../lib/healthBars';
import { STAT_COUNT, clampStat } from '../lib/stats';
import { newId } from '../lib/ids';

export type CampaignAction =
  | { type: 'REPLACE'; state: CampaignState }
  | { type: 'RESET' }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'SET_SCHEDULE'; day: string; time: string }
  | { type: 'SET_NOTES'; text: string }
  | { type: 'SET_CAMPAIGN_NOTES'; text: string }
  | { type: 'SET_THEME'; theme: CampaignTheme }
  | { type: 'SET_STYLE'; style: CampaignStyle }
  | { type: 'SET_LOGO_VARIANT'; variant: LogoVariant }
  | { type: 'SET_STATS_ENABLED'; enabled: boolean }
  | { type: 'SET_STAT_LABEL'; index: number; label: string }
  | { type: 'SET_DICE_PLUS'; enabled: boolean }
  | { type: 'SET_PLAYERS_CAN_EDIT'; enabled: boolean }
  | { type: 'ADD_PLAYER'; name: string }
  | { type: 'INSERT_PLAYER'; player: Player; index: number }
  | { type: 'REMOVE_PLAYER'; id: string }
  | { type: 'UPDATE_PLAYER'; id: string; changes: Partial<Omit<Player, 'id'>> }
  | { type: 'REORDER_PLAYERS'; from: number; to: number }
  | { type: 'SET_ACTIVE_PLAYER'; id: string | null }
  | { type: 'ROLL'; roll: RollResult }
  | { type: 'TOGGLE_ROLL_VISIBILITY' }
  | { type: 'CLEAR_ROLL_HISTORY' }
  | { type: 'SET_SELECTED_DICE'; dice: string }
  | { type: 'ADD_DICE_LABEL'; label: string }
  | { type: 'RENAME_DICE_LABEL'; from: string; to: string }
  | { type: 'DELETE_DICE_LABEL'; label: string }
  | { type: 'ADD_GROUP'; group: string }
  | { type: 'RENAME_GROUP'; from: string; to: string }
  | { type: 'DELETE_GROUP'; group: string }
  | { type: 'RESTORE_GROUP'; group: string; index: number; barIds: string[] }
  | { type: 'ADD_HEALTH_BAR'; bar: Omit<HealthBar, 'id'> }
  | { type: 'INSERT_HEALTH_BAR'; bar: HealthBar; index: number }
  /** Sposta una barra di un posto su/giù restando dentro il suo gruppo. */
  | { type: 'MOVE_HEALTH_BAR'; id: string; direction: 'up' | 'down' }
  /** Trascina una barra sopra un'altra dello stesso gruppo. */
  | { type: 'REORDER_HEALTH_BAR'; id: string; toId: string }
  | { type: 'UPDATE_HEALTH_BAR'; id: string; changes: Partial<Omit<HealthBar, 'id'>> }
  /**
   * Valore di una singola risorsa. Azione a sé invece di un `UPDATE_HEALTH_BAR`
   * con l'intera lista: il trascinamento ne genera decine al secondo e la
   * cronologia deve poterle riconoscere per fonderle in un solo annullamento.
   */
  | { type: 'SET_RESOURCE_VALUE'; barId: string; resourceId: string; value: number }
  | { type: 'DELETE_HEALTH_BAR'; id: string };

function insertAt<T>(list: T[], item: T, index: number): T[] {
  const out = [...list];
  out.splice(Math.max(0, Math.min(index, out.length)), 0, item);
  return out;
}

function swap<T>(list: T[], i: number, j: number): T[] {
  const out = [...list];
  [out[i], out[j]] = [out[j], out[i]];
  return out;
}

/**
 * Gruppo "effettivo" di una barra: un gruppo che non esiste più nella lista
 * conta come Senza Gruppo, esattamente come lo raggruppa la vista. Serve perché
 * il riordino resti coerente con le sezioni mostrate a schermo.
 */
function effectiveGroup(bar: HealthBar, healthGroups: string[]): string {
  return bar.group && healthGroups.includes(bar.group) ? bar.group : '';
}

function sameGroup(a: HealthBar, b: HealthBar, healthGroups: string[]): boolean {
  return effectiveGroup(a, healthGroups) === effectiveGroup(b, healthGroups);
}

/** Indice della barra vicina, nello stesso gruppo effettivo, verso la direzione. */
function adjacentInGroup(
  bars: HealthBar[],
  from: number,
  direction: 'up' | 'down',
  healthGroups: string[],
): number {
  const step = direction === 'up' ? -1 : 1;
  const group = effectiveGroup(bars[from], healthGroups);
  for (let i = from + step; i >= 0 && i < bars.length; i += step) {
    if (effectiveGroup(bars[i], healthGroups) === group) return i;
  }
  return -1;
}

/**
 * Applica i limiti coerentemente: gli HP correnti non superano mai il massimo,
 * e lo stesso vale per ogni risorsa.
 *
 * Quando non resta nessuna risorsa la chiave viene tolta del tutto, non
 * lasciata a `undefined`: è ciò che permette di svuotare la lista dal form, e
 * mantiene identico il payload delle barre che non ne hanno.
 */
function applyBarChanges(bar: HealthBar, changes: Partial<Omit<HealthBar, 'id'>>): HealthBar {
  const merged = { ...bar, ...changes };
  const maxValue = clampMaxHp(merged.maxValue);
  const resources = clampResources(merged.resources);
  const statusEffects = clampStatusEffects(merged.statusEffects);

  const next: HealthBar = {
    ...merged,
    maxValue,
    currentValue: clampHp(merged.currentValue, maxValue),
  };

  if (resources) next.resources = resources;
  else delete next.resources;

  if (statusEffects) next.statusEffects = statusEffects;
  else delete next.statusEffects;

  return next;
}

/** Le statistiche di un Player restano assenti quando non impostate. */
function applyPlayerChanges(
  player: Player,
  changes: Partial<Omit<Player, 'id'>>,
): Player {
  const next = { ...player, ...changes };
  if ('stats' in changes) {
    if (changes.stats) next.stats = changes.stats.map(clampStat);
    else delete next.stats;
  }
  return next;
}

export function campaignReducer(state: CampaignState, action: CampaignAction): CampaignState {
  switch (action.type) {
    case 'REPLACE':
      return action.state;

    case 'RESET':
      return createEmptyCampaign();

    case 'SET_TITLE': {
      const title = action.title.trim();
      return title ? { ...state, title } : state;
    }

    case 'SET_SCHEDULE':
      return { ...state, scheduleDay: action.day.trim(), scheduleTime: action.time.trim() };

    case 'SET_NOTES':
      return { ...state, notes: action.text };

    case 'SET_CAMPAIGN_NOTES':
      return { ...state, campaignNotes: action.text };

    case 'SET_THEME':
      return { ...state, theme: action.theme };

    case 'SET_STYLE':
      return { ...state, style: action.style };

    case 'SET_LOGO_VARIANT':
      return { ...state, logoVariant: action.variant };

    case 'SET_STATS_ENABLED':
      return { ...state, statsEnabled: action.enabled };

    case 'SET_STAT_LABEL': {
      if (action.index < 0 || action.index >= STAT_COUNT) return state;
      const label = action.label.trim().slice(0, 20) || DEFAULT_STAT_LABELS[action.index];
      if (state.statLabels[action.index] === label) return state;
      const statLabels = [...state.statLabels];
      statLabels[action.index] = label;
      return { ...state, statLabels };
    }

    case 'SET_DICE_PLUS':
      return { ...state, dicePlus: action.enabled };

    case 'SET_PLAYERS_CAN_EDIT':
      return { ...state, playersCanEdit: action.enabled };

    case 'ADD_PLAYER': {
      const name = action.name.trim();
      if (!name) return state;
      const player: Player = { id: newId(), name, inventory: [], bonus: [] };
      return { ...state, players: [...state.players, player] };
    }

    case 'INSERT_PLAYER':
      return { ...state, players: insertAt(state.players, action.player, action.index) };

    case 'REMOVE_PLAYER':
      return {
        ...state,
        players: state.players.filter((p) => p.id !== action.id),
        // Il giocatore rimosso non può restare quello di turno.
        activePlayerId: state.activePlayerId === action.id ? null : state.activePlayerId,
      };

    case 'UPDATE_PLAYER':
      return {
        ...state,
        players: state.players.map((p) =>
          p.id === action.id ? applyPlayerChanges(p, action.changes) : p,
        ),
      };

    case 'REORDER_PLAYERS': {
      const { from, to } = action;
      if (
        from === to ||
        from < 0 ||
        to < 0 ||
        from >= state.players.length ||
        to >= state.players.length
      ) {
        return state;
      }
      const players = [...state.players];
      const [moved] = players.splice(from, 1);
      players.splice(to, 0, moved);
      return { ...state, players };
    }

    case 'SET_ACTIVE_PLAYER':
      return { ...state, activePlayerId: action.id };

    case 'ROLL':
      return {
        ...state,
        lastRoll: action.roll,
        rollHistory: [action.roll, ...state.rollHistory].slice(0, MAX_ROLL_HISTORY),
      };

    case 'TOGGLE_ROLL_VISIBILITY':
      return { ...state, isRollHidden: !state.isRollHidden };

    case 'CLEAR_ROLL_HISTORY':
      return { ...state, rollHistory: [], lastRoll: null };

    case 'SET_SELECTED_DICE':
      return { ...state, selectedDice: action.dice };

    case 'ADD_DICE_LABEL': {
      const label = action.label.trim();
      if (!label || state.diceLabels.includes(label)) return state;
      return { ...state, diceLabels: [...state.diceLabels, label] };
    }

    case 'RENAME_DICE_LABEL': {
      const to = action.to.trim();
      if (!to || to === action.from) return state;
      return {
        ...state,
        diceLabels: state.diceLabels.map((l) => (l === action.from ? to : l)),
        lastRoll:
          state.lastRoll && state.lastRoll.label === action.from
            ? { ...state.lastRoll, label: to }
            : state.lastRoll,
      };
    }

    case 'DELETE_DICE_LABEL':
      return {
        ...state,
        diceLabels: state.diceLabels.filter((l) => l !== action.label),
        lastRoll:
          state.lastRoll && state.lastRoll.label === action.label
            ? { ...state.lastRoll, label: undefined }
            : state.lastRoll,
      };

    case 'ADD_GROUP': {
      const group = action.group.trim();
      if (!group || state.healthGroups.includes(group)) return state;
      return { ...state, healthGroups: [...state.healthGroups, group] };
    }

    case 'RENAME_GROUP': {
      const to = action.to.trim();
      if (!to || to === action.from) return state;
      return {
        ...state,
        healthGroups: state.healthGroups.map((g) => (g === action.from ? to : g)),
        healthBars: state.healthBars.map((bar) =>
          bar.group === action.from ? { ...bar, group: to } : bar,
        ),
      };
    }

    case 'DELETE_GROUP':
      return {
        ...state,
        healthGroups: state.healthGroups.filter((g) => g !== action.group),
        healthBars: state.healthBars.map((bar) => {
          if (bar.group !== action.group) return bar;
          const { group: _removed, ...rest } = bar;
          return rest;
        }),
      };

    case 'RESTORE_GROUP': {
      if (state.healthGroups.includes(action.group)) return state;
      const barIds = new Set(action.barIds);
      return {
        ...state,
        healthGroups: insertAt(state.healthGroups, action.group, action.index),
        healthBars: state.healthBars.map((bar) =>
          barIds.has(bar.id) ? { ...bar, group: action.group } : bar,
        ),
      };
    }

    case 'ADD_HEALTH_BAR': {
      const maxValue = clampMaxHp(action.bar.maxValue);
      const resources = clampResources(action.bar.resources);
      const statusEffects = clampStatusEffects(action.bar.statusEffects);
      const bar: HealthBar = {
        ...action.bar,
        id: newId(),
        maxValue,
        currentValue: clampHp(action.bar.currentValue, maxValue),
      };

      if (resources) bar.resources = resources;
      else delete bar.resources;

      if (statusEffects) bar.statusEffects = statusEffects;
      else delete bar.statusEffects;

      return { ...state, healthBars: [...state.healthBars, bar] };
    }

    case 'INSERT_HEALTH_BAR':
      return { ...state, healthBars: insertAt(state.healthBars, action.bar, action.index) };

    case 'MOVE_HEALTH_BAR': {
      const from = state.healthBars.findIndex((b) => b.id === action.id);
      if (from === -1) return state;
      // Il vicino più prossimo nello stesso gruppo, nella direzione scelta: così
      // il riordino non attraversa mai i confini di un gruppo.
      const to = adjacentInGroup(state.healthBars, from, action.direction, state.healthGroups);
      if (to === -1) return state;
      return { ...state, healthBars: swap(state.healthBars, from, to) };
    }

    case 'REORDER_HEALTH_BAR': {
      const from = state.healthBars.findIndex((b) => b.id === action.id);
      const to = state.healthBars.findIndex((b) => b.id === action.toId);
      if (from === -1 || to === -1 || from === to) return state;
      // Solo dentro lo stesso gruppo: un drop su un'altra fascia viene ignorato.
      if (!sameGroup(state.healthBars[from], state.healthBars[to], state.healthGroups)) {
        return state;
      }
      const bars = [...state.healthBars];
      const [moved] = bars.splice(from, 1);
      bars.splice(bars.findIndex((b) => b.id === action.toId), 0, moved);
      return { ...state, healthBars: bars };
    }

    case 'UPDATE_HEALTH_BAR':
      return {
        ...state,
        healthBars: state.healthBars.map((bar) =>
          bar.id === action.id ? applyBarChanges(bar, action.changes) : bar,
        ),
      };

    case 'SET_RESOURCE_VALUE': {
      // Restituire lo stesso oggetto quando nulla cambia non è un'ottimizzazione:
      // è ciò su cui la cronologia si basa per non registrare una voce inutile
      // a ogni movimento del puntatore che non sposta il valore.
      let touched = false;

      const healthBars = state.healthBars.map((bar) => {
        if (bar.id !== action.barId || !bar.resources) return bar;

        let barTouched = false;
        const resources = bar.resources.map((resource) => {
          if (resource.id !== action.resourceId) return resource;
          const currentValue = clampHp(action.value, resource.maxValue);
          if (currentValue === resource.currentValue) return resource;
          barTouched = true;
          return { ...resource, currentValue };
        });

        if (!barTouched) return bar;
        touched = true;
        return { ...bar, resources };
      });

      return touched ? { ...state, healthBars } : state;
    }

    case 'DELETE_HEALTH_BAR':
      return { ...state, healthBars: state.healthBars.filter((bar) => bar.id !== action.id) };

    default:
      return state;
  }
}

/** Stato iniziale: campagna salvata se c'è, altrimenti quella d'esempio. */
export function initCampaign(saved: CampaignState | null, seed: CampaignState): CampaignState {
  return saved ? normalizeCampaign(saved) : seed;
}
