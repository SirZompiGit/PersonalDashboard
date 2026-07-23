/**
 * FANTASIA — composizione dell'applicazione.
 *
 * Prima questo file contava 1010 righe: venti e più gestori di stato in linea,
 * la gestione di Firebase, l'import/export e ~400 righe di JSX per intestazione
 * e pannello stanza. Ora la logica sta nei reducer e negli hook, la marcatura
 * nei componenti, e qui resta solo l'orchestrazione.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EyeOff, Upload } from 'lucide-react';

import { CampaignHeader } from './components/CampaignHeader';
import { DashboardHeader } from './components/DashboardHeader';
import { DiceRoller } from './components/DiceRoller';
import { HealthBarsManager } from './components/HealthBarsManager';
import { ParticipantView } from './components/ParticipantView';
import { PlayerCards } from './components/PlayerCards';
import { RoomPanel } from './components/RoomPanel';
import { SharedView } from './components/SharedView';
import { ShortcutsPanel } from './components/ShortcutsPanel';
import { WelcomeScreen } from './components/WelcomeScreen';

import { type CampaignBackup, restoreBackup, useCampaignState } from './hooks/useCampaignState';
import { useRoom } from './hooks/useRoom';
import { useToasts } from './hooks/useToasts';
import { useMedia } from './hooks/useMedia';
import { setRoomMedia, subscribeToRoomMedia } from './firebaseUtils';
import { normalizeCampaign, parseImportedCampaign } from './state/migrations';
import { applyTheme } from './theme';
import { setMuted } from './utils/audio';

type LocalMode = 'welcome' | 'lite';

const MODE_KEY = 'fantasia_local_mode';
const MUTED_KEY = 'fantasia_muted';

/** Legge i parametri di apertura come schermo condiviso. */
function readSharedUrl(): { shared: boolean; pin: string | null } {
  if (typeof window === 'undefined') return { shared: false, pin: null };
  const params = new URLSearchParams(window.location.search);
  return { shared: params.get('shared') === 'true', pin: params.get('room') };
}

export default function App() {
  const sharedUrl = useMemo(readSharedUrl, []);

  const {
    state,
    dispatch,
    saveStatus,
    saveError,
    backups,
    refreshBackups,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useCampaignState();
  const room = useRoom(state, !sharedUrl.shared);
  const { notify } = useToasts();

  // Governato qui e non nell'intestazione: così le immagini si applicano anche
  // nella finestra dello schermo condiviso e nella vista dei giocatori, dove
  // l'intestazione non viene renderizzata.
  const mediaControls = useMedia();

  const [localMode, setLocalMode] = useState<LocalMode>(() => {
    try {
      return sessionStorage.getItem(MODE_KEY) === 'lite' ? 'lite' : 'welcome';
    } catch {
      return 'welcome';
    }
  });
  const [previewShared, setPreviewShared] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem(MUTED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dropActive, setDropActive] = useState(false);

  /** Stato sempre aggiornato per i gestori registrati una volta sola. */
  const stateRef = useRef(state);
  stateRef.current = state;

  /**
   * Campagna letta dalla stanza. Firebase omette le chiavi con array vuoti,
   * quindi va sempre normalizzata prima dell'uso.
   */
  const roomCampaign = useMemo(
    () => (room.roomState ? normalizeCampaign(room.roomState.campaign) : null),
    [room.roomState],
  );

  /**
   * Il master comanda sul proprio tema; chi osserva una stanza — giocatore o
   * finestra di proiezione — adotta quello del master, altrimenti ognuno
   * vedrebbe la sessione con colori e design diversi.
   */
  const displayed = room.session?.role === 'master' || !roomCampaign ? state : roomCampaign;

  // Il tema è un attributo su <html>: le classi `bg-theme-*` dei componenti
  // si ricolorano da sole, con una dissolvenza.
  useEffect(
    () => applyTheme(displayed.theme, displayed.style),
    [displayed.theme, displayed.style],
  );

  /**
   * Il master trasmette le proprie immagini alla stanza.
   * Viaggiano su `roomMedia/{pin}`, un ramo separato dalla campagna: dentro
   * `rooms/{pin}` sarebbero state rispedite a tutti i giocatori a ogni singola
   * modifica degli appunti.
   */
  const { local: localMedia, applyRemote } = mediaControls;
  const roomRole = room.session?.role;
  const roomPin = room.session?.pin;

  useEffect(() => {
    if (roomRole !== 'master' || !roomPin) return;
    setRoomMedia(roomPin, localMedia).catch((e) =>
      console.warn('[fantasia] immagini non trasmesse alla stanza:', e),
    );
  }, [roomRole, roomPin, localMedia]);

  /** Giocatori e finestra di proiezione adottano le immagini del master. */
  useEffect(() => {
    if (!roomPin || roomRole === 'master') {
      applyRemote(null);
      return;
    }

    const unsubscribe = subscribeToRoomMedia(roomPin, applyRemote);
    return () => {
      unsubscribe();
      applyRemote(null);
    };
  }, [roomPin, roomRole, applyRemote]);

  useEffect(() => {
    setMuted(isMuted);
    try {
      localStorage.setItem(MUTED_KEY, String(isMuted));
    } catch {
      /* preferenza non essenziale */
    }
  }, [isMuted]);

  useEffect(() => {
    try {
      sessionStorage.setItem(MODE_KEY, localMode);
    } catch {
      /* preferenza non essenziale */
    }
  }, [localMode]);

  // Apertura come schermo condiviso di una stanza.
  const { watchAsViewer } = room;
  useEffect(() => {
    if (sharedUrl.shared && sharedUrl.pin) watchAsViewer(sharedUrl.pin);
  }, [sharedUrl, watchAsViewer]);

  /**
   * Quando il master chiude la stanza, i giocatori vengono riportati alla
   * schermata iniziale invece di restare bloccati su un avviso senza uscita.
   * La finestra dello schermo condiviso è esclusa: è una proiezione, e
   * rimandarla alla scelta della modalità non avrebbe senso.
   */
  const { roomClosed, exitRoom } = room;
  const participantKicked = roomClosed && room.session?.role === 'participant';
  useEffect(() => {
    if (!participantKicked) return;
    notify('Il master ha chiuso la stanza.', { kind: 'info' });
    exitRoom();
  }, [participantKicked, exitRoom, notify]);

  const handleExport = useCallback(() => {
    try {
      const slug =
        state.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/gi, '_')
          .replace(/^_|_$/g, '')
          .slice(0, 30) || 'campagna';

      // La data nel nome evita che ogni esportazione sovrascriva la precedente
      // nella cartella Download: si ottiene una cronologia senza fare nulla.
      const now = new Date();
      const stamp = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0'),
      ].join('-');
      const time = [
        String(now.getHours()).padStart(2, '0'),
        String(now.getMinutes()).padStart(2, '0'),
      ].join('');

      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `fantasia_${slug}_${stamp}_${time}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      notify('Campagna esportata.', { kind: 'success' });
    } catch (error) {
      console.error('[fantasia] esportazione fallita:', error);
      notify('Esportazione non riuscita.', { kind: 'error' });
    }
  }, [state, notify]);

  const importFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = parseImportedCampaign(String(reader.result ?? ''));
        if (!result.ok || !result.state) {
          notify(result.error ?? 'File non valido.', { kind: 'error' });
          return;
        }
        const previous = stateRef.current;
        dispatch({ type: 'REPLACE', state: result.state });
        notify('Campagna caricata.', {
          kind: 'success',
          action: {
            label: 'Annulla',
            run: () => dispatch({ type: 'REPLACE', state: previous }),
          },
        });
      };
      reader.onerror = () => notify('Impossibile leggere il file.', { kind: 'error' });
      reader.readAsText(file);
    },
    [dispatch, notify],
  );

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // L'input viene svuotato subito, così lo stesso file si può ricaricare.
    event.target.value = '';
    if (file) importFile(file);
  };

  const handleRestoreBackup = (backup: CampaignBackup) => {
    const recovered = restoreBackup(backup);
    if (!recovered) {
      notify('Backup illeggibile.', { kind: 'error' });
      return;
    }
    const previous = state;
    dispatch({ type: 'REPLACE', state: recovered });
    notify('Backup ripristinato.', {
      kind: 'success',
      action: { label: 'Annulla', run: () => dispatch({ type: 'REPLACE', state: previous }) },
    });
  };

  const handleReset = () => {
    const previous = state;
    dispatch({ type: 'RESET' });
    notify('Campagna azzerata.', {
      action: { label: 'Annulla', run: () => dispatch({ type: 'REPLACE', state: previous }) },
    });
  };

  const openSharedWindow = () => {
    const width = 1280;
    const height = 800;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    const pin = room.session?.role === 'master' ? room.session.pin : null;

    window.open(
      `${window.location.origin}${window.location.pathname}?shared=true${pin ? `&room=${pin}` : ''}`,
      'FantasiaSharedView',
      `width=${width},height=${height},top=${top},left=${left},resizable=yes,scrollbars=yes`,
    );
  };

  /**
   * Scorciatoie globali.
   *
   * L'annulla non si limita alle cancellazioni: copre qualsiasi modifica.
   * Il caso che risolve davvero è il più banale — un click distratto su una
   * barra vita che cambia gli HP e prima non aveva alcun ritorno.
   */
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      const key = event.key.toLowerCase();

      if (key === 's') {
        event.preventDefault();
        handleExport();
        return;
      }

      if (key === 'z') {
        // Nei campi di testo Ctrl+Z resta quello del browser: annullare
        // l'intera campagna mentre si scrive una nota sarebbe sconcertante.
        const target = event.target as HTMLElement | null;
        if (
          target?.isContentEditable ||
          ['INPUT', 'TEXTAREA'].includes(target?.tagName ?? '')
        ) {
          return;
        }
        event.preventDefault();
        if (event.shiftKey) redo();
        else undo();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleExport, undo, redo]);

  /**
   * Import trascinando il file sulla pagina.
   * `dragover` va annullato su tutta la finestra, altrimenti il browser apre
   * il JSON al posto nostro.
   */
  useEffect(() => {
    let depth = 0;

    const onDragEnter = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      depth += 1;
      setDropActive(true);
    };

    const onDragOver = (event: DragEvent) => {
      if (!event.dataTransfer?.types.includes('Files')) return;
      event.preventDefault();
    };

    // `dragleave` scatta anche passando fra elementi figli: si conta la
    // profondità per non far lampeggiare l'indicatore.
    const onDragLeave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDropActive(false);
    };

    const onDrop = (event: DragEvent) => {
      const file = event.dataTransfer?.files?.[0];
      if (!file) return;
      event.preventDefault();
      depth = 0;
      setDropActive(false);

      if (!/\.json$/i.test(file.name) && file.type !== 'application/json') {
        notify('Trascina un file JSON di campagna.', { kind: 'error' });
        return;
      }
      importFile(file);
    };

    window.addEventListener('dragenter', onDragEnter);
    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);

    return () => {
      window.removeEventListener('dragenter', onDragEnter);
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    };
  }, [importFile, notify]);

  // Esc esce dall'anteprima condivisa: è il gesto che si prova per primo.
  useEffect(() => {
    if (!previewShared) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !document.fullscreenElement) setPreviewShared(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [previewShared]);

  // --- Schermo condiviso aperto da URL -------------------------------------

  if (sharedUrl.shared) {
    if (!sharedUrl.pin) {
      // Modalità Lite: legge la stessa campagna locale, sincronizzata fra schede.
      return <SharedView state={state} isLite sceneImage={mediaControls.media.scene} />;
    }

    if (room.roomClosed) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bento-bg p-6 text-center text-slate-400">
          <p className="font-display text-lg font-bold uppercase tracking-wider text-slate-200">
            Stanza chiusa
          </p>
          <p className="text-sm">Il master ha terminato la sessione.</p>
        </div>
      );
    }

    if (!room.roomState || !roomCampaign) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bento-bg p-6 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-theme-500 border-t-transparent" />
          <p>Caricamento schermo condiviso...</p>
        </div>
      );
    }

    return (
      <SharedView
        state={roomCampaign}
        roomUsers={room.roomState.users}
        participantRolls={room.roomState.participantRolls}
        sceneImage={mediaControls.media.scene}
      />
    );
  }

  // --- Giocatore collegato a una stanza ------------------------------------

  if (room.session?.role === 'participant' && room.session.userId) {
    // L'effetto qui sopra sta già riportando il giocatore alla scelta della
    // modalità: questa schermata dura una frazione di secondo.
    if (room.roomClosed) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-bento-bg p-6 text-center text-slate-400">
          <p className="font-display text-lg font-bold uppercase tracking-wider text-slate-200">
            Stanza chiusa
          </p>
          <p className="text-sm">Il master ha terminato la sessione.</p>
        </div>
      );
    }

    if (!room.roomState) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bento-bg p-6 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-theme-500 border-t-transparent" />
          <p>Connessione alla stanza...</p>
        </div>
      );
    }

    return (
      <ParticipantView
        roomId={room.session.pin}
        userId={room.session.userId}
        roomState={room.roomState}
        online={room.online}
        onExit={room.exitRoom}
        sceneImage={mediaControls.media.scene}
      />
    );
  }

  // --- Scelta della modalità ------------------------------------------------

  const isMaster = room.session?.role === 'master';

  if (localMode === 'welcome' && !isMaster) {
    return (
      <WelcomeScreen
        style={displayed.style}
        logoVariant={displayed.logoVariant}
        isConnecting={room.status === 'connecting'}
        multiplayerAvailable={room.available}
        error={room.error}
        onDismissError={room.clearError}
        onSelectLite={() => setLocalMode('lite')}
        onCreateRoom={() => room.openAsMaster(state)}
        onJoinRoom={(pin, name) => room.joinAsParticipant(pin, name)}
      />
    );
  }

  // --- Anteprima dello schermo condiviso ------------------------------------

  if (previewShared) {
    return (
      <div className="relative">
        <div className="fixed top-3 right-3 z-50">
          <button
            type="button"
            onClick={() => setPreviewShared(false)}
            className="flex cursor-pointer items-center gap-2 rounded-full border border-bento-border bg-bento-void/90 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-amber-400 shadow-overlay backdrop-blur-md transition-transform duration-200 hover:scale-105 active:scale-95"
          >
            <EyeOff className="h-3.5 w-3.5 text-amber-500" />
            <span className="hidden sm:inline">Chiudi Schermo Condiviso</span>
            <span className="sm:hidden">Chiudi</span>
          </button>
        </div>

        <SharedView
          state={state}
          isLite={!isMaster}
          roomUsers={room.roomState?.users}
          participantRolls={room.roomState?.participantRolls}
          sceneImage={mediaControls.media.scene}
        />
      </div>
    );
  }

  // --- Dashboard del master -------------------------------------------------

  return (
    // `app-surface` marca il contenitore radice: i design che disegnano una
    // texture sul fondo della pagina lo rendono trasparente per lasciarla vedere.
    <div className="app-surface relative flex min-h-screen flex-col overflow-x-hidden bg-bento-bg p-3 font-sans text-slate-100 sm:p-5 lg:p-8">
      {/* Aura superiore. Prima era invisibile: `bg-gradient-radial` non è mai
          esistita come classe Tailwind e la regola non generava nulla. */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-[500px] bg-radial from-theme-600/10 to-transparent" />

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept="application/json,.json"
        className="hidden"
      />

      {dropActive && (
        <div className="pointer-events-none fixed inset-0 z-[9998] flex items-center justify-center bg-bento-void/80 backdrop-blur-sm animate-fade-in">
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-theme-500 bg-bento-panel px-8 py-6 shadow-overlay">
            <Upload className="h-8 w-8 text-theme-500" />
            <p className="font-display text-base font-bold uppercase tracking-wider text-slate-100">
              Rilascia per importare
            </p>
            <p className="text-xs text-slate-500">File JSON di campagna</p>
          </div>
        </div>
      )}

      <DashboardHeader
        theme={state.theme}
        onThemeChange={(theme) => dispatch({ type: 'SET_THEME', theme })}
        style={state.style}
        onStyleChange={(style) => dispatch({ type: 'SET_STYLE', style })}
        logoVariant={state.logoVariant}
        onLogoVariantChange={(variant) => dispatch({ type: 'SET_LOGO_VARIANT', variant })}
        isMuted={isMuted}
        onMutedChange={setIsMuted}
        onImport={() => fileInputRef.current?.click()}
        onExport={handleExport}
        onOpenSharedWindow={openSharedWindow}
        onPreviewShared={() => setPreviewShared(true)}
        onReset={handleReset}
        saveStatus={saveStatus}
        saveError={saveError}
        backups={backups}
        onRestoreBackup={(backup) => {
          handleRestoreBackup(backup);
          refreshBackups();
        }}
        roomOpen={isMaster}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        mediaControls={mediaControls}
        sharingMedia={isMaster}
        statsEnabled={state.statsEnabled}
        onStatsEnabledChange={(enabled) => dispatch({ type: 'SET_STATS_ENABLED', enabled })}
        statLabels={state.statLabels}
        onStatLabelChange={(index, label) => dispatch({ type: 'SET_STAT_LABEL', index, label })}
        d2Labels={state.d2Labels}
        onD2LabelChange={(index, label) => dispatch({ type: 'SET_D2_LABEL', index, label })}
        onBackToWelcome={() => {
          // Con una stanza aperta si chiude prima: altrimenti resterebbe viva
          // sul database, con i giocatori collegati a un master che non c'è più.
          if (isMaster) room.closeRoom();
          setPreviewShared(false);
          setLocalMode('welcome');
        }}
      />

      {isMaster && room.session && (
        <RoomPanel
          pin={room.session.pin}
          users={room.roomState?.users ?? {}}
          participantRolls={room.roomState?.participantRolls ?? []}
          players={state.players}
          online={room.online}
          onCloseRoom={() => {
            room.closeRoom();
            setLocalMode('lite');
          }}
        />
      )}

      <main className="relative z-10 mx-auto w-full max-w-7xl flex-grow space-y-5 lg:space-y-6">
        <CampaignHeader
          title={state.title}
          scheduleDay={state.scheduleDay}
          scheduleTime={state.scheduleTime}
          players={state.players}
          notes={state.notes}
          campaignNotes={state.campaignNotes}
          activePlayerId={state.activePlayerId}
          dispatch={dispatch}
        />

        {/* `items-start`: ogni colonna prende la propria altezza. Prima era
            `items-stretch` e il lancio dei dadi si allungava per pareggiare la
            lista delle barre, riempiendosi di vuoto. */}
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12 lg:gap-6">
          <div className="lg:col-span-7">
            <HealthBarsManager
              healthBars={state.healthBars}
              healthGroups={state.healthGroups}
              dispatch={dispatch}
            />
          </div>

          <div className="lg:col-span-5">
            <DiceRoller
              lastRoll={state.lastRoll}
              rollHistory={state.rollHistory}
              isRollHidden={state.isRollHidden}
              selectedDice={state.selectedDice}
              theme={state.theme}
              diceLabels={state.diceLabels}
              d2Labels={state.d2Labels}
              enableShortcuts
              onRoll={(diceType, result, label) =>
                dispatch({
                  type: 'ROLL',
                  roll: { diceType, result, timestamp: Date.now(), label },
                })
              }
              onToggleRollVisibility={() => dispatch({ type: 'TOGGLE_ROLL_VISIBILITY' })}
              onClearHistory={() => dispatch({ type: 'CLEAR_ROLL_HISTORY' })}
              onSelectedDiceChange={(dice) => dispatch({ type: 'SET_SELECTED_DICE', dice })}
              onAddDiceLabel={(label) => dispatch({ type: 'ADD_DICE_LABEL', label })}
              onRenameDiceLabel={(from, to) => dispatch({ type: 'RENAME_DICE_LABEL', from, to })}
              onDeleteDiceLabel={(label) => dispatch({ type: 'DELETE_DICE_LABEL', label })}
            />
          </div>
        </div>

        <PlayerCards
          players={state.players}
          activePlayerId={state.activePlayerId}
          dispatch={dispatch}
          statsEnabled={state.statsEnabled}
          statLabels={state.statLabels}
        />
      </main>

      <footer className="relative z-10 mx-auto mt-10 flex w-full max-w-7xl flex-col items-center gap-2 border-t border-bento-border pt-5 text-center text-xs text-slate-600">
        <p className="font-mono">
          Fantasia • Plancia di comando per sessioni di gioco di ruolo
        </p>
        <button
          type="button"
          onClick={() => setShortcutsOpen(true)}
          className="font-mono text-[11px] text-slate-600 underline-offset-2 transition-colors duration-200 hover:text-theme-400 hover:underline"
        >
          Scorciatoie da tastiera (?)
        </button>
      </footer>

      <ShortcutsPanel open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </div>
  );
}
