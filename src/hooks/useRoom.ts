/**
 * Ciclo di vita di una stanza multiplayer.
 *
 * Correzioni rispetto a prima:
 *  - `subscribeToRoom` restituiva una funzione di disiscrizione che non veniva
 *    MAI chiamata, in nessuno dei tre punti in cui era usata. Sotto StrictMode
 *    i listener si duplicavano già al primo montaggio.
 *  - La campagna veniva riscritta per intero a ogni tasto premuto. Ora la
 *    scrittura è ritardata.
 *  - `beforeunload` cancellava la stanza: un semplice F5 la distruggeva e
 *    disconnetteva tutti. Ora la stanza si chiude solo su richiesta esplicita,
 *    e la sessione viene ripresa dopo il ricaricamento.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CampaignState } from '../types';
import {
  type RoomState,
  armUserDisconnect,
  createRoom,
  deleteRoom,
  joinRoom,
  leaveRoom,
  subscribeToConnection,
  subscribeToRoom,
  updateRoomCampaign,
} from '../firebaseUtils';
import { FIREBASE_SETUP_MESSAGE, isFirebaseConfigured } from '../firebase';
import { newUserId } from '../lib/ids';
import { sanitizeUserName } from '../lib/participantRolls';

const SESSION_KEY = 'fantasia_room_session';
const CAMPAIGN_PUSH_DELAY = 500;

export type RoomRole = 'master' | 'participant' | 'viewer';
export type RoomStatus = 'idle' | 'connecting' | 'connected' | 'error';

export interface RoomSession {
  role: RoomRole;
  pin: string;
  userId: string | null;
}

function readSession(): RoomSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as RoomSession).pin === 'string' &&
      ['master', 'participant', 'viewer'].includes((parsed as RoomSession).role)
    ) {
      return parsed as RoomSession;
    }
  } catch {
    /* sessione illeggibile: si riparte da zero */
  }
  return null;
}

function writeSession(session: RoomSession | null): void {
  try {
    if (session) sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch {
    /* la sessione è solo una comodità: se non si può salvare, pazienza */
  }
}

export interface UseRoomResult {
  session: RoomSession | null;
  roomState: RoomState | null;
  status: RoomStatus;
  error: string | null;
  /** Stato della connessione al database, per l'indicatore in interfaccia. */
  online: boolean;
  /** True se la stanza è stata chiusa dal master mentre eravamo dentro. */
  roomClosed: boolean;
  available: boolean;
  openAsMaster: (campaign: CampaignState) => Promise<void>;
  joinAsParticipant: (pin: string, displayName: string) => Promise<void>;
  watchAsViewer: (pin: string) => void;
  closeRoom: () => Promise<void>;
  exitRoom: () => Promise<void>;
  clearError: () => void;
}

/**
 * @param campaign  Campagna locale del master, trasmessa alla stanza.
 * @param autoResume Riprende la sessione salvata dopo un ricaricamento.
 */
export function useRoom(campaign: CampaignState, autoResume = true): UseRoomResult {
  const [session, setSession] = useState<RoomSession | null>(() =>
    autoResume && isFirebaseConfigured ? readSession() : null,
  );
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [status, setStatus] = useState<RoomStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [online, setOnline] = useState(true);
  const [roomClosed, setRoomClosed] = useState(false);

  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastPushedRef = useRef<string | null>(null);

  const applySession = useCallback((next: RoomSession | null) => {
    writeSession(next);
    setSession(next);
    setRoomState(null);
    setRoomClosed(false);
    lastPushedRef.current = null;
  }, []);

  // Sottoscrizione alla stanza. Il cleanup chiude davvero il listener.
  useEffect(() => {
    if (!session || !isFirebaseConfigured) {
      setStatus('idle');
      return;
    }

    setStatus('connecting');
    let cancelled = false;

    const unsubscribe = subscribeToRoom(session.pin, (data) => {
      if (cancelled) return;

      if (!data) {
        // La stanza non c'è più: il master l'ha chiusa.
        setRoomClosed(true);
        setStatus('error');
        setRoomState(null);
        return;
      }

      setRoomState(data);
      setStatus('connected');
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [session]);

  // Indicatore di connessione.
  useEffect(() => {
    if (!session || !isFirebaseConfigured) return;
    const unsubscribe = subscribeToConnection(setOnline);
    return () => unsubscribe();
  }, [session]);

  // Dopo una riconnessione la rimozione automatica dell'utente va riarmata:
  // Firebase la consuma quando la connessione cade.
  useEffect(() => {
    if (!online || session?.role !== 'participant' || !session.userId) return;
    armUserDisconnect(session.pin, session.userId).catch((e) =>
      console.warn('[fantasia] onDisconnect non riarmato:', e),
    );
  }, [online, session]);

  // Il master trasmette la campagna, con ritardo.
  useEffect(() => {
    if (session?.role !== 'master') return;

    const json = JSON.stringify(campaign);
    if (json === lastPushedRef.current) return;
    lastPushedRef.current = json;

    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      updateRoomCampaign(session.pin, campaign).catch((e) => {
        console.error('[fantasia] aggiornamento campagna fallito:', e);
        setError('Aggiornamento della stanza non riuscito. Controlla la connessione.');
      });
    }, CAMPAIGN_PUSH_DELAY);

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
  }, [campaign, session]);

  const openAsMaster = useCallback(
    async (initial: CampaignState) => {
      if (!isFirebaseConfigured) {
        setError(FIREBASE_SETUP_MESSAGE);
        return;
      }
      setStatus('connecting');
      setError(null);
      try {
        const pin = await createRoom(initial);
        lastPushedRef.current = JSON.stringify(initial);
        applySession({ role: 'master', pin, userId: null });
      } catch (e) {
        console.error('[fantasia] creazione stanza fallita:', e);
        setStatus('error');
        setError(
          'Creazione della stanza non riuscita. Verifica le credenziali Firebase e la connessione.',
        );
      }
    },
    [applySession],
  );

  const joinAsParticipant = useCallback(
    async (pin: string, displayName: string) => {
      if (!isFirebaseConfigured) {
        setError(FIREBASE_SETUP_MESSAGE);
        return;
      }
      const cleanPin = pin.trim();
      if (!/^\d{6}$/.test(cleanPin)) {
        setError('Il PIN deve essere composto da 6 cifre.');
        return;
      }

      setStatus('connecting');
      setError(null);
      try {
        const userId = newUserId();
        const name = sanitizeUserName(displayName).slice(0, 24) || 'Giocatore';
        await joinRoom(cleanPin, userId, name);
        applySession({ role: 'participant', pin: cleanPin, userId });
      } catch (e) {
        console.error('[fantasia] ingresso nella stanza fallito:', e);
        setStatus('error');
        setError(
          e instanceof Error && e.message === 'Stanza non trovata'
            ? 'Nessuna stanza con questo PIN. Controlla il numero e riprova.'
            : 'Connessione alla stanza non riuscita. Controlla la rete e le credenziali Firebase.',
        );
      }
    },
    [applySession],
  );

  const watchAsViewer = useCallback(
    (pin: string) => {
      if (!isFirebaseConfigured) {
        setError(FIREBASE_SETUP_MESSAGE);
        return;
      }
      applySession({ role: 'viewer', pin, userId: null });
    },
    [applySession],
  );

  /** Chiusura esplicita da parte del master: la stanza viene eliminata. */
  const closeRoom = useCallback(async () => {
    if (session?.role !== 'master') return;
    try {
      await deleteRoom(session.pin);
    } catch (e) {
      console.error('[fantasia] chiusura stanza fallita:', e);
    }
    applySession(null);
    setStatus('idle');
  }, [session, applySession]);

  /** Uscita di un partecipante o di uno spettatore. La stanza resta viva. */
  const exitRoom = useCallback(async () => {
    if (session?.role === 'participant' && session.userId) {
      try {
        await leaveRoom(session.pin, session.userId);
      } catch (e) {
        console.error('[fantasia] uscita dalla stanza fallita:', e);
      }
    }
    applySession(null);
    setStatus('idle');
  }, [session, applySession]);

  const clearError = useCallback(() => setError(null), []);

  return {
    session,
    roomState,
    status,
    error,
    online,
    roomClosed,
    available: isFirebaseConfigured,
    openAsMaster,
    joinAsParticipant,
    watchAsViewer,
    closeRoom,
    exitRoom,
    clearError,
  };
}
