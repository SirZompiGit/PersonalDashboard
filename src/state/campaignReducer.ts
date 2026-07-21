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
import type { CampaignTheme } from '../theme';
import { MAX_ROLL_HISTORY, normalizeCampaign } from './migrations';
import { createEmptyCampaign } from './defaults';
import { clampHp, clampMaxHp } from '../lib/healthBars';
import { newId } from '../lib/ids';

export type CampaignAction =
  | { type: 'REPLACE'; state: CampaignState }
  | { type: 'RESET' }
  | { type: 'SET_TITLE'; title: string }
  | { type: 'SET_SCHEDULE'; day: string; time: string }
  | { type: 'SET_NOTES'; text: string }
  | { type: 'SET_CAMPAIGN_NOTES'; text: string }
  | { type: 'SET_THEME'; theme: CampaignTheme }
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
  | { type: 'UPDATE_HEALTH_BAR'; id: string; changes: Partial<Omit<HealthBar, 'id'>> }
  | { type: 'DELETE_HEALTH_BAR'; id: string };

function insertAt<T>(list: T[], item: T, index: number): T[] {
  const out = [...list];
  out.splice(Math.max(0, Math.min(index, out.length)), 0, item);
  return out;
}

/** Applica i limiti coerentemente: gli HP correnti non superano mai il massimo. */
function applyBarChanges(bar: HealthBar, changes: Partial<Omit<HealthBar, 'id'>>): HealthBar {
  const merged = { ...bar, ...changes };
  const maxValue = clampMaxHp(merged.maxValue);
  return { ...merged, maxValue, currentValue: clampHp(merged.currentValue, maxValue) };
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
          p.id === action.id ? { ...p, ...action.changes } : p,
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
      const bar: HealthBar = {
        ...action.bar,
        id: newId(),
        maxValue,
        currentValue: clampHp(action.bar.currentValue, maxValue),
      };
      return { ...state, healthBars: [...state.healthBars, bar] };
    }

    case 'INSERT_HEALTH_BAR':
      return { ...state, healthBars: insertAt(state.healthBars, action.bar, action.index) };

    case 'UPDATE_HEALTH_BAR':
      return {
        ...state,
        healthBars: state.healthBars.map((bar) =>
          bar.id === action.id ? applyBarChanges(bar, action.changes) : bar,
        ),
      };

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
