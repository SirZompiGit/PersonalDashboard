/**
 * Vista del giocatore collegato a una stanza.
 *
 * Interventi principali:
 *  - La vista condivisa era annidata in un contenitore con `min-h-[800px]` e
 *    scorrimento proprio: su un telefono da 667px di altezza era ingestibile.
 *    Ora scorre la pagina, una volta sola.
 *  - L'identità nei lanci passa da `lib/participantRolls` invece di essere
 *    costruita a mano con concatenazioni di stringhe.
 *  - Gli appunti privati non vengono più scritti sul database a ogni tasto.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { RoomState } from '../firebaseUtils';
import { pushParticipantRoll, updateUser } from '../firebaseUtils';
import { Check, LogOut, User, WifiOff } from 'lucide-react';
import { SharedView } from './SharedView';
import { DiceRoller } from './DiceRoller';
import { IconButton } from './ui/IconButton';
import { normalizeCampaign } from '../state/migrations';
import { DEFAULT_DICE } from '../lib/dice';
import { decodeRollLabel, encodeRollLabel, isOwnRoll } from '../lib/participantRolls';

const NOTES_SAVE_DELAY = 600;

interface ParticipantViewProps {
  roomId: string;
  userId: string;
  roomState: RoomState;
  online: boolean;
  onExit: () => void;
  /** Immagine di scena ricevuta dal master. */
  sceneImage?: string | null;
}

export function ParticipantView({
  roomId,
  userId,
  roomState,
  online,
  onExit,
  sceneImage,
}: ParticipantViewProps) {
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [selectedDice, setSelectedDice] = useState<string>(DEFAULT_DICE);
  const [notesDraft, setNotesDraft] = useState<string | null>(null);

  const notesTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Firebase omette le chiavi con array vuoti: senza normalizzazione anche una
  // stanza perfettamente sana arriva con `players` o `healthBars` mancanti.
  const campaign = useMemo(
    () => normalizeCampaign(roomState.campaign),
    [roomState.campaign],
  );

  const user = roomState.users?.[userId];

  const myRolls = useMemo(() => {
    const rolls = roomState.participantRolls ?? [];
    return rolls
      .filter((roll) => isOwnRoll(roll, userId))
      .map((roll) => ({ ...roll, label: decodeRollLabel(roll.label).label || undefined }));
  }, [roomState.participantRolls, userId]);

  useEffect(
    () => () => {
      if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    },
    [],
  );

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bento-bg p-4 text-center text-slate-400">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-theme-500 border-t-transparent" />
        <p>Accesso in corso...</p>
        <button
          type="button"
          onClick={onExit}
          className="mt-2 rounded-lg border border-bento-border bg-bento-button px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 transition-colors duration-200 hover:bg-bento-border"
        >
          Torna indietro
        </button>
      </div>
    );
  }

  const assignedPlayer = campaign.players.find((p) => p.id === user.assignedPlayerId);

  const saveName = () => {
    if (tempName.trim()) {
      updateUser(roomId, userId, { name: tempName.trim().slice(0, 24) }).catch(console.error);
    }
    setEditingName(false);
  };

  /** Gli appunti si scrivono sul database dopo una pausa, non a ogni tasto. */
  const handleNotesChange = (value: string) => {
    setNotesDraft(value);
    if (notesTimerRef.current) clearTimeout(notesTimerRef.current);
    notesTimerRef.current = setTimeout(() => {
      updateUser(roomId, userId, { notes: value }).catch(console.error);
    }, NOTES_SAVE_DELAY);
  };

  return (
    // Nessuna spaziatura qui: la vista condivisa ha già la propria e il
    // pannello che contiene tutto. Sommandole, il contenuto veniva schiacciato
    // al centro da tre cornici annidate.
    <div className="app-surface flex min-h-screen flex-col bg-bento-bg font-sans text-slate-400">
      <header className="m-3 flex shrink-0 flex-col gap-3 rounded-xl border border-bento-border bg-bento-panel p-3 shadow-panel sm:m-5 sm:mb-0 sm:flex-row sm:items-center sm:justify-between sm:p-4 lg:mx-8 lg:mt-8">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800 font-mono font-bold text-slate-300">
            {user.name.charAt(0).toUpperCase()}
          </span>

          <div className="flex min-w-0 flex-col">
            <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
              Connesso come
            </span>
            {editingName ? (
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={tempName}
                  onChange={(event) => setTempName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') saveName();
                    if (event.key === 'Escape') setEditingName(false);
                  }}
                  autoFocus
                  maxLength={24}
                  aria-label="Il tuo nome"
                  className="w-36 rounded border border-bento-border bg-bento-item px-2 py-1 text-sm text-slate-200 focus:border-theme-500 focus:outline-none"
                />
                <IconButton label="Salva nome" tone="positive" onClick={saveName}>
                  <Check className="h-4 w-4" />
                </IconButton>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setTempName(user.name);
                  setEditingName(true);
                }}
                className="group flex items-center gap-1.5 text-left"
              >
                <span className="truncate text-sm font-bold text-white">{user.name}</span>
                <User className="h-3.5 w-3.5 shrink-0 text-slate-500 transition-colors duration-200 group-hover:text-theme-400" />
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          {!online && (
            <span className="flex items-center gap-1.5 rounded-lg border border-amber-500/30 bg-amber-950/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-amber-400">
              <WifiOff className="h-3 w-3" /> Offline
            </span>
          )}

          <div className="flex flex-col items-end">
            <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500">
              Personaggio
            </span>
            <span
              className={`text-sm font-bold ${
                assignedPlayer ? 'text-emerald-400' : 'text-slate-600'
              }`}
            >
              {assignedPlayer ? assignedPlayer.name : 'Spettatore'}
            </span>
          </div>

          <span className="h-8 w-px bg-slate-700" />

          {/* Etichettato, non solo icona: è la via d'uscita e deve vedersi. */}
          <button
            type="button"
            onClick={onExit}
            aria-label="Esci dalla stanza e torna alla schermata iniziale"
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-950/20 px-3 py-2 text-xs font-semibold text-red-400 transition-colors duration-200 hover:bg-red-500/20 hover:text-red-300"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Esci</span>
          </button>
        </div>
      </header>

      {/* La vista condivisa si estende per intero: la cornice che la
          racchiudeva le rubava spazio ai lati senza aggiungere nulla. */}
      <div className="flex-1">
        <SharedView
          state={campaign}
          participantRolls={roomState.participantRolls}
          roomUsers={roomState.users}
          sceneImage={sceneImage}
          personalNotesSlot={
            assignedPlayer ? (
              <textarea
                value={notesDraft ?? user.notes ?? ''}
                onChange={(event) => handleNotesChange(event.target.value)}
                placeholder="Scrivi qui i tuoi appunti privati... (si salvano da soli)"
                aria-label="Appunti personali"
                className="min-h-[6rem] w-full flex-1 resize-none rounded-lg border border-bento-border bg-bento-item p-3 text-sm text-slate-300 transition-colors duration-200 focus:border-theme-500 focus:outline-none scrollbar-thin"
              />
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 py-4 text-center opacity-60">
                <span className="font-mono text-xs uppercase tracking-widest text-slate-500">
                  Appunti non disponibili
                </span>
                <span className="text-[10px] text-slate-600">
                  Attendi che il master ti assegni un personaggio
                </span>
              </div>
            )
          }
          diceRollerSlot={
            assignedPlayer ? (
              <DiceRoller
                selectedDice={selectedDice}
                onSelectedDiceChange={setSelectedDice}
                lastRoll={myRolls[0] ?? null}
                theme={campaign.theme}
                diceLabels={campaign.diceLabels}
                hideHistory
                onRoll={(diceType, result, label) => {
                  pushParticipantRoll(roomId, {
                    diceType,
                    result,
                    timestamp: Date.now(),
                    label: encodeRollLabel(userId, user.name, label),
                  }).catch(console.error);
                }}
              />
            ) : (
              <div className="flex h-28 flex-col items-center justify-center gap-1 p-4 text-center opacity-60">
                <span className="font-mono text-xs uppercase tracking-widest text-slate-500">
                  Dadi non disponibili
                </span>
                <span className="text-[10px] text-slate-600">
                  Il master deve assegnarti un personaggio
                </span>
              </div>
            )
          }
        />
      </div>
    </div>
  );
}
