/**
 * Stato della campagna: reducer + persistenza + sincronizzazione fra schede.
 *
 * Due cose cambiano rispetto a prima.
 *
 * 1. La guardia anti-eco. Prima c'era un flag booleano (`isExternalUpdateRef`)
 *    alzato prima di `setState` e abbassato nell'effetto di salvataggio: bastava
 *    che due aggiornamenti finissero nello stesso batch di React perché il flag
 *    proteggesse solo il primo. Ora si confronta la serializzazione con l'ultima
 *    conosciuta: è idempotente e non dipende dall'ordine degli effetti.
 *
 * 2. La scrittura è ritardata. Prima ogni singolo tasto premuto in un'area di
 *    testo serializzava l'intero stato e lo trasmetteva su BroadcastChannel.
 */

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import type { CampaignState } from '../types';
import { type CampaignAction, campaignReducer } from '../state/campaignReducer';
import { createSeedCampaign } from '../state/defaults';
import { migrateStoredState, serializeState } from '../state/migrations';

const STORAGE_KEY = 'fantasia_campaign_master_state';
const BACKUP_KEY = 'fantasia_campaign_backups';
const CHANNEL_NAME = 'fantasia_campaign_channel';

const PERSIST_DELAY = 400;
const BACKUP_INTERVAL = 2 * 60 * 1000;
const MAX_BACKUPS = 3;

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

interface ChannelMessage {
  __fantasia: 'state';
  json: string;
}

export interface CampaignBackup {
  savedAt: number;
  title: string;
  json: string;
}

function readStoredState(): CampaignState | null {
  try {
    return migrateStoredState(localStorage.getItem(STORAGE_KEY));
  } catch (error) {
    console.warn('[fantasia] stato salvato illeggibile:', error);
    return null;
  }
}

export function readBackups(): CampaignBackup[] {
  try {
    const raw = localStorage.getItem(BACKUP_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (b): b is CampaignBackup =>
        typeof b === 'object' &&
        b !== null &&
        typeof (b as CampaignBackup).json === 'string' &&
        typeof (b as CampaignBackup).savedAt === 'number',
    );
  } catch {
    return [];
  }
}

export function restoreBackup(backup: CampaignBackup): CampaignState | null {
  return migrateStoredState(backup.json);
}

export interface UseCampaignStateResult {
  state: CampaignState;
  dispatch: React.Dispatch<CampaignAction>;
  saveStatus: SaveStatus;
  /** Messaggio leggibile quando il salvataggio fallisce (tipicamente quota esaurita). */
  saveError: string | null;
  backups: CampaignBackup[];
  refreshBackups: () => void;
}

export function useCampaignState(): UseCampaignStateResult {
  const [state, dispatch] = useReducer(
    campaignReducer,
    undefined,
    () => readStoredState() ?? createSeedCampaign(),
  );

  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [backups, setBackups] = useState<CampaignBackup[]>(() => readBackups());

  /** Ultima serializzazione già scritta o già ricevuta: taglia gli echi. */
  const lastSyncedRef = useRef<string | null>(null);
  const channelRef = useRef<BroadcastChannel | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastBackupRef = useRef(0);
  /** Scrittura in attesa del ritardo: va salvata subito se la pagina sparisce. */
  const pendingRef = useRef<string | null>(null);

  const refreshBackups = useCallback(() => setBackups(readBackups()), []);

  /** Applica uno stato arrivato da un'altra scheda senza rimandarlo indietro. */
  const applyExternal = useCallback((json: string) => {
    if (json === lastSyncedRef.current) return;
    const incoming = migrateStoredState(json);
    if (!incoming) return;
    lastSyncedRef.current = serializeState(incoming);
    dispatch({ type: 'REPLACE', state: incoming });
  }, []);

  // Ascolto delle altre schede: BroadcastChannel per la reattività, evento
  // `storage` come rete di sicurezza dove il canale non è disponibile.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY && event.newValue) applyExternal(event.newValue);
    };
    window.addEventListener('storage', onStorage);

    let channel: BroadcastChannel | null = null;
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = channel;
      channel.onmessage = (event: MessageEvent<ChannelMessage>) => {
        if (event.data?.__fantasia === 'state') applyExternal(event.data.json);
      };
    } catch (error) {
      console.warn('[fantasia] BroadcastChannel non disponibile:', error);
    }

    return () => {
      window.removeEventListener('storage', onStorage);
      channel?.close();
      channelRef.current = null;
    };
  }, [applyExternal]);

  // Salvataggio ritardato + trasmissione alle altre schede.
  useEffect(() => {
    const json = serializeState(state);
    if (json === lastSyncedRef.current) return;

    lastSyncedRef.current = json;
    pendingRef.current = json;
    setSaveStatus('saving');

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, json);
        pendingRef.current = null;

        // Backup rotanti: rete di sicurezza contro import corrotti e reset.
        const now = Date.now();
        if (now - lastBackupRef.current > BACKUP_INTERVAL) {
          lastBackupRef.current = now;
          try {
            const next = [{ savedAt: now, title: state.title, json }, ...readBackups()].slice(
              0,
              MAX_BACKUPS,
            );
            localStorage.setItem(BACKUP_KEY, JSON.stringify(next));
            setBackups(next);
          } catch {
            // Un backup mancato non deve mai impedire il salvataggio principale.
          }
        }

        setSaveStatus('saved');
        setSaveError(null);
        channelRef.current?.postMessage({ __fantasia: 'state', json } satisfies ChannelMessage);
      } catch (error) {
        setSaveStatus('error');
        const quotaExceeded =
          error instanceof DOMException &&
          (error.name === 'QuotaExceededError' || error.code === 22);
        setSaveError(
          quotaExceeded
            ? 'Spazio di archiviazione del browser esaurito: le modifiche non vengono più salvate. Esporta la campagna e libera spazio.'
            : 'Impossibile salvare la campagna in questo browser.',
        );
        console.error('[fantasia] salvataggio fallito:', error);
      }
    }, PERSIST_DELAY);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state]);

  /**
   * Il salvataggio è ritardato di 400 ms: se la scheda viene chiusa entro quel
   * lasso, l'ultima modifica andrebbe persa. `pagehide` e `visibilitychange`
   * sono gli unici eventi affidabili per scrivere prima che la pagina sparisca
   * — su mobile una scheda può essere terminata senza mai emettere `unload`.
   */
  useEffect(() => {
    const flush = () => {
      const pending = pendingRef.current;
      if (!pending) return;
      try {
        localStorage.setItem(STORAGE_KEY, pending);
        pendingRef.current = null;
      } catch (error) {
        console.error('[fantasia] salvataggio finale fallito:', error);
      }
    };

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flush();
    };

    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      flush();
    };
  }, []);

  return useMemo(
    () => ({ state, dispatch, saveStatus, saveError, backups, refreshBackups }),
    [state, saveStatus, saveError, backups, refreshBackups],
  );
}
