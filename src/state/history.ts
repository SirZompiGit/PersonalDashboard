/**
 * Cronologia per annulla e ripeti.
 *
 * Avvolge il reducer della campagna senza modificarlo: `campaignReducer` resta
 * una funzione pura sullo stato, e qui sopra si accumulano gli stati passati.
 *
 * Due accortezze rendono la cronologia utilizzabile davvero:
 *
 *  1. **Fusione delle azioni ripetute.** Scrivere negli appunti o trascinare
 *     una barra vita produce decine di azioni al secondo. Senza fusione, un
 *     solo Ctrl+Z tornerebbe indietro di un carattere o di un punto ferita.
 *     Le azioni dello stesso tipo sullo stesso bersaglio, ravvicinate nel
 *     tempo, occupano un'unica voce.
 *
 *  2. **Esclusione delle azioni non annullabili.** Sostituire lo stato da
 *     un'altra scheda non è un gesto dell'utente e non deve entrare in
 *     cronologia, altrimenti Ctrl+Z annullerebbe il lavoro di qualcun altro.
 */

import type { CampaignState } from '../types';
import { type CampaignAction, campaignReducer } from './campaignReducer';

const MAX_HISTORY = 60;

/** Entro questa distanza due azioni affini confluiscono in una sola voce. */
const MERGE_WINDOW = 700;

export interface HistoryState {
  present: CampaignState;
  past: CampaignState[];
  future: CampaignState[];
  /** Firma dell'ultima azione registrata, per decidere se fondere. */
  lastSignature: string | null;
  lastAt: number;
}

export type HistoryAction =
  | { type: 'UNDO' }
  | { type: 'REDO' }
  /** Sostituisce lo stato senza toccare la cronologia (sincronizzazione fra schede). */
  | { type: 'SYNC'; state: CampaignState }
  | CampaignAction;

/**
 * Azioni che rappresentano un cambiamento continuo: molte in rapida
 * successione descrivono un solo gesto dell'utente.
 */
function mergeSignature(action: CampaignAction): string | null {
  switch (action.type) {
    case 'SET_NOTES':
      return 'notes';
    case 'SET_CAMPAIGN_NOTES':
      return 'campaignNotes';
    case 'SET_TITLE':
      return 'title';
    case 'UPDATE_HEALTH_BAR':
      // Solo il trascinamento degli HP è continuo; modificare nome o colori no.
      return Object.keys(action.changes).length === 1 && 'currentValue' in action.changes
        ? `hp:${action.id}`
        : null;
    case 'SET_RESOURCE_VALUE':
      // Anche le risorse si trascinano: un gesto, una voce di cronologia.
      return `res:${action.barId}:${action.resourceId}`;
    default:
      return null;
  }
}

/** Azioni che non devono generare una voce di cronologia. */
function isTransparent(action: HistoryAction): boolean {
  return action.type === 'SYNC' || action.type === 'REPLACE';
}

export function createHistory(present: CampaignState): HistoryState {
  return { present, past: [], future: [], lastSignature: null, lastAt: 0 };
}

export function historyReducer(state: HistoryState, action: HistoryAction): HistoryState {
  if (action.type === 'UNDO') {
    const previous = state.past.at(-1);
    if (!previous) return state;
    return {
      present: previous,
      past: state.past.slice(0, -1),
      future: [state.present, ...state.future].slice(0, MAX_HISTORY),
      lastSignature: null,
      lastAt: 0,
    };
  }

  if (action.type === 'REDO') {
    const next = state.future[0];
    if (!next) return state;
    return {
      present: next,
      past: [...state.past, state.present].slice(-MAX_HISTORY),
      future: state.future.slice(1),
      lastSignature: null,
      lastAt: 0,
    };
  }

  if (action.type === 'SYNC') {
    // Lo stato arriva da un'altra scheda: si adotta senza sporcare la cronologia.
    return { ...state, present: action.state, lastSignature: null, lastAt: 0 };
  }

  const present = campaignReducer(state.present, action);

  // Il reducer restituisce lo stesso oggetto quando l'azione non cambia nulla.
  if (present === state.present) return state;

  if (isTransparent(action)) {
    return { ...state, present, lastSignature: null, lastAt: 0 };
  }

  const now = Date.now();
  const signature = mergeSignature(action);
  const merge =
    signature !== null && signature === state.lastSignature && now - state.lastAt < MERGE_WINDOW;

  return {
    present,
    // Fondendo, la voce già presente resta ed è lo stato *prima* del gesto.
    past: merge ? state.past : [...state.past, state.present].slice(-MAX_HISTORY),
    future: [],
    lastSignature: signature,
    lastAt: now,
  };
}

export const canUndo = (state: HistoryState): boolean => state.past.length > 0;
export const canRedo = (state: HistoryState): boolean => state.future.length > 0;
