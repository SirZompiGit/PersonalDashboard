/**
 * FANTASIA — composizione dell'applicazione.
 *
 * Prima questo file contava 1010 righe: venti e più gestori di stato in linea,
 * la gestione di Firebase, l'import/export e ~400 righe di JSX per intestazione
 * e pannello stanza. Ora la logica sta nei reducer e negli hook, la marcatura
 * nei componenti, e qui resta solo l'orchestrazione.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { EyeOff } from 'lucide-react';

import { CampaignHeader } from './components/CampaignHeader';
import { DashboardHeader } from './components/DashboardHeader';
import { DiceRoller } from './components/DiceRoller';
import { HealthBarsManager } from './components/HealthBarsManager';
import { ParticipantView } from './components/ParticipantView';
import { PlayerCards } from './components/PlayerCards';
import { RoomPanel } from './components/RoomPanel';
import { SharedView } from './components/SharedView';
import { WelcomeScreen } from './components/WelcomeScreen';

import { type CampaignBackup, restoreBackup, useCampaignState } from './hooks/useCampaignState';
import { useRoom } from './hooks/useRoom';
import { useToasts } from './hooks/useToasts';
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

  const { state, dispatch, saveStatus, saveError, backups, refreshBackups } = useCampaignState();
  const room = useRoom(state, !sharedUrl.shared);
  const { notify } = useToasts();

  const [localMode, setLocalMode] = useState<LocalMode>(() => {
    try {
      return sessionStorage.getItem(MODE_KEY) === 'lite' ? 'lite' : 'welcome';
    } catch {
      return 'welcome';
    }
  });
  const [previewShared, setPreviewShared] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    try {
      return localStorage.getItem(MUTED_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Il tema è un attributo su <html>: le classi `bg-theme-*` dei componenti
  // si ricolorano da sole, con una dissolvenza.
  useEffect(() => applyTheme(state.theme), [state.theme]);

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

  const handleExport = useCallback(() => {
    try {
      const slug =
        state.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/gi, '_')
          .replace(/^_|_$/g, '')
          .slice(0, 30) || 'campagna';

      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `fantasia_${slug}.json`;
      anchor.click();
      URL.revokeObjectURL(url);
      notify('Campagna esportata.', { kind: 'success' });
    } catch (error) {
      console.error('[fantasia] esportazione fallita:', error);
      notify('Esportazione non riuscita.', { kind: 'error' });
    }
  }, [state, notify]);

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // L'input viene svuotato subito, così lo stesso file si può ricaricare.
    event.target.value = '';
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      // Ogni campo viene validato: prima bastava un JSON senza `healthBars`
      // per rendere l'app irrecuperabile al ricaricamento successivo.
      const result = parseImportedCampaign(String(reader.result ?? ''));
      if (!result.ok || !result.state) {
        notify(result.error ?? 'File non valido.', { kind: 'error' });
        return;
      }
      const previous = state;
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

  // Ctrl/Cmd+S esporta invece di aprire il salvataggio del browser.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        handleExport();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleExport]);

  // --- Schermo condiviso aperto da URL -------------------------------------

  if (sharedUrl.shared) {
    if (!sharedUrl.pin) {
      // Modalità Lite: legge la stessa campagna locale, sincronizzata fra schede.
      return <SharedView state={state} isLite />;
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

    if (!room.roomState) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bento-bg p-6 text-slate-400">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-theme-500 border-t-transparent" />
          <p>Caricamento schermo condiviso...</p>
        </div>
      );
    }

    return (
      <SharedView
        state={normalizeCampaign(room.roomState.campaign)}
        roomUsers={room.roomState.users}
        participantRolls={room.roomState.participantRolls}
      />
    );
  }

  // --- Giocatore collegato a una stanza ------------------------------------

  if (room.session?.role === 'participant' && room.session.userId) {
    if (room.roomClosed) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bento-bg p-6 text-center text-slate-400">
          <p className="font-display text-lg font-bold uppercase tracking-wider text-slate-200">
            Stanza chiusa
          </p>
          <p className="text-sm">Il master ha terminato la sessione.</p>
          <button
            type="button"
            onClick={room.exitRoom}
            className="rounded-lg border border-theme-500 bg-theme-600 px-4 py-2 text-xs font-bold uppercase tracking-wider text-white transition-colors duration-200 hover:bg-theme-500"
          >
            Torna alla scelta
          </button>
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
      />
    );
  }

  // --- Scelta della modalità ------------------------------------------------

  const isMaster = room.session?.role === 'master';

  if (localMode === 'welcome' && !isMaster) {
    return (
      <WelcomeScreen
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
        />
      </div>
    );
  }

  // --- Dashboard del master -------------------------------------------------

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden bg-bento-bg p-3 font-sans text-slate-100 sm:p-5 lg:p-8">
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

      <DashboardHeader
        theme={state.theme}
        onThemeChange={(theme) => dispatch({ type: 'SET_THEME', theme })}
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

        <div className="grid grid-cols-1 items-stretch gap-5 lg:grid-cols-12 lg:gap-6">
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
        />
      </main>

      <footer className="relative z-10 mx-auto mt-10 w-full max-w-7xl border-t border-bento-border pt-5 text-center text-xs text-slate-600">
        <p className="font-mono">
          Fantasia • Plancia di comando per sessioni di gioco di ruolo
        </p>
      </footer>
    </div>
  );
}
